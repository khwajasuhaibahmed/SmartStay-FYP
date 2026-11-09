const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const userModel = require('../models/userModel');
const hostelModel = require('../models/hostelModel');
const auditModel = require('../models/auditModel');
const generateToken = require('../utils/generateToken');
const otpModel = require('../models/otpModel');
const { sendOtpEmail } = require('../utils/mailer');

// Public sign-up creates Resident accounts only.
// Staff, Warden and Admin accounts are created by the hostel administration.
const SELF_SIGNUP_ROLE = 'resident';

const OTP_ERRORS = {
  invalid: 'Incorrect code. Please check the code and try again.',
  expired: 'This code has expired. Please request a new one.',
  too_many_attempts: 'Too many wrong attempts. Please request a new code.',
};

const SUSPENDED_MESSAGE =
  "This hostel's SmartStay account is suspended. Please contact the hostel administration.";

// What the client is allowed to see about a user (never the password hash).
function toSafeUser(user) {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    is_verified: user.is_verified,
    must_change_password: user.must_change_password,
    created_at: user.created_at,
    hostel_id: user.hostel_id,
    hostel_name: user.hostel_name,
    hostel_code: user.hostel_code,
    hostel_status: user.hostel_status,
  };
}

// Users of a suspended hostel cannot use the system (the Super Admin has no hostel).
const isHostelSuspended = (user) => user.role !== 'super_admin' && user.hostel_status === 'suspended';

// Sends a new code unless one was sent in the last 60 seconds.
// Returns the seconds still to wait (0 means a code was sent now).
async function sendCode(user, purpose) {
  const wait = await otpModel.getCooldownRemaining(user.id, purpose);
  if (wait > 0) return wait;

  const code = await otpModel.createOtp(user.id, purpose);
  await sendOtpEmail({
    to: user.email,
    name: user.full_name,
    code,
    purpose,
    expiryMinutes: otpModel.OTP_EXPIRY_MINUTES,
  });
  return 0;
}

async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { fullName, email, password, phone, hostelCode } = req.body;
  const finalRole = SELF_SIGNUP_ROLE;

  try {
    // The hostel code links the resident to their hostel.
    const hostel = await hostelModel.findHostelByCode(hostelCode);
    if (!hostel) {
      return res.status(400).json({ message: 'No hostel found with this code. Please check it with your warden.' });
    }
    if (hostel.status === 'suspended') {
      return res.status(403).json({ message: SUSPENDED_MESSAGE });
    }

    const existing = await userModel.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await userModel.createUser({
      fullName,
      email,
      passwordHash,
      role: finalRole,
      phone,
      hostelId: hostel.id,
    });
    const user = { id: created.id, email, full_name: fullName };

    await auditModel.logAction(user.id, 'REGISTER', `New ${finalRole} account created`);

    // No token yet: the user must verify their email before logging in.
    let emailSent = true;
    try {
      await sendCode(user, 'verify_email');
    } catch (mailErr) {
      console.error('Verification email error:', mailErr);
      emailSent = false;
    }

    return res.status(201).json({
      message: emailSent
        ? 'Account created. We sent a 6-digit code to your email.'
        : 'Account created, but the email could not be sent. Please press "Resend code".',
      email: user.email,
      requiresVerification: true,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error while registering user' });
  }
}

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.is_active) {
      return res
        .status(403)
        .json({ message: 'This account has been deactivated. Please contact the administrator.' });
    }

    if (isHostelSuspended(user)) {
      return res.status(403).json({ message: SUSPENDED_MESSAGE });
    }

    if (!user.is_verified) {
      // Send a fresh code (if allowed) and tell the client to open the verify screen.
      try {
        await sendCode(user, 'verify_email');
      } catch (mailErr) {
        console.error('Verification email error:', mailErr);
      }
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email first. We sent a code to your inbox.',
        email: user.email,
      });
    }

    await auditModel.logAction(user.id, 'LOGIN', null);

    const token = generateToken(user);
    return res.json({ user: toSafeUser(user), token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error while logging in' });
  }
}

async function getMe(req, res) {
  try {
    const user = await userModel.findUserById(req.user.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Account not found or deactivated' });
    }
    if (isHostelSuspended(user)) {
      return res.status(401).json({ message: SUSPENDED_MESSAGE });
    }
    return res.json({ user });
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ message: 'Server error while fetching profile' });
  }
}

async function updateProfile(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { fullName, phone } = req.body;
  try {
    const user = await userModel.updateUserProfile(req.user.id, {
      fullName,
      phone: phone || null,
    });
    await auditModel.logAction(req.user.id, 'PROFILE_UPDATE', null);
    return res.json({ user });
  } catch (err) {
    console.error('UpdateProfile error:', err);
    return res.status(500).json({ message: 'Server error while updating profile' });
  }
}

async function changePassword(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;

  try {
    const user = await userModel.findUserByEmail(req.user.email);
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from the current one' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await userModel.updateUserPassword(user.id, newHash);
    await auditModel.logAction(user.id, 'PASSWORD_CHANGE', null);

    // Returns the updated user so the app knows the temporary password is gone.
    const updated = await userModel.findUserById(user.id);
    return res.json({ message: 'Password updated successfully', user: updated });
  } catch (err) {
    console.error('ChangePassword error:', err);
    return res.status(500).json({ message: 'Server error while changing password' });
  }
}

// =========================================================
// EMAIL VERIFICATION
// =========================================================
async function verifyEmail(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, code } = req.body;

  try {
    const user = await userModel.findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: OTP_ERRORS.invalid });
    }
    if (user.is_verified) {
      return res.status(400).json({ message: 'This email is already verified. Please log in.' });
    }

    const result = await otpModel.verifyOtp(user.id, 'verify_email', code);
    if (result !== 'ok') {
      return res.status(400).json({ message: OTP_ERRORS[result] });
    }

    await userModel.markUserVerified(user.id);
    await auditModel.logAction(user.id, 'EMAIL_VERIFIED', null);

    if (!user.is_active) {
      return res.status(403).json({
        message: 'Email verified, but this account has been deactivated. Please contact the administrator.',
      });
    }

    if (isHostelSuspended(user)) {
      return res.status(403).json({ message: SUSPENDED_MESSAGE });
    }

    // Verified: log the user straight in.
    await auditModel.logAction(user.id, 'LOGIN', null);
    const token = generateToken(user);
    return res.json({ user: toSafeUser(user), token });
  } catch (err) {
    console.error('VerifyEmail error:', err);
    return res.status(500).json({ message: 'Server error while verifying email' });
  }
}

async function resendVerification(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const genericMessage = 'If this email needs verification, a new code has been sent.';

  try {
    const user = await userModel.findUserByEmail(req.body.email);
    if (!user || user.is_verified) {
      return res.json({ message: genericMessage });
    }

    const wait = await sendCode(user, 'verify_email');
    if (wait > 0) {
      return res.status(429).json({ message: `Please wait ${wait} seconds before requesting a new code.`, wait });
    }
    return res.json({ message: genericMessage });
  } catch (err) {
    console.error('ResendVerification error:', err);
    return res.status(500).json({ message: 'Could not send the code. Please try again.' });
  }
}

// =========================================================
// FORGOT / RESET PASSWORD
// =========================================================
async function forgotPassword(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Same reply whether or not the email exists, so accounts can't be discovered.
  const genericMessage = 'If an account exists for this email, a reset code has been sent.';

  try {
    const user = await userModel.findUserByEmail(req.body.email);
    if (user && user.is_active) {
      await sendCode(user, 'reset_password');
    }
    return res.json({ message: genericMessage });
  } catch (err) {
    console.error('ForgotPassword error:', err);
    return res.status(500).json({ message: 'Could not send the reset code. Please try again.' });
  }
}

async function resetPassword(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, code, newPassword } = req.body;

  try {
    const user = await userModel.findUserByEmail(email);
    if (!user || !user.is_active) {
      return res.status(400).json({ message: OTP_ERRORS.invalid });
    }

    const result = await otpModel.verifyOtp(user.id, 'reset_password', code);
    if (result !== 'ok') {
      return res.status(400).json({ message: OTP_ERRORS[result] });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await userModel.updateUserPassword(user.id, newHash);

    // Receiving the code proves the user owns this email.
    if (!user.is_verified) {
      await userModel.markUserVerified(user.id);
    }

    await auditModel.logAction(user.id, 'PASSWORD_RESET', 'Reset via email code');

    return res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('ResetPassword error:', err);
    return res.status(500).json({ message: 'Server error while resetting password' });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
};
