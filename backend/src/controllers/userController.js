const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const userModel = require('../models/userModel');
const auditModel = require('../models/auditModel');
const hostelModel = require('../models/hostelModel');
const { sendWelcomeEmail } = require('../utils/mailer');
const generateTempPassword = require('../utils/tempPassword');

// Which roles each role may create with "Add user".
// Residents are not added here: they sign up with the hostel code
// (or are created by the Warden during onboarding, Module 3).
const CAN_CREATE = {
  admin: ['admin', 'warden', 'staff'],
  warden: ['staff'],
};

const ROLE_NAMES = { admin: 'Admin', warden: 'Warden', staff: 'Staff' };

// Admin sees everyone in the hostel; a Warden sees only the Staff.
async function listUsers(req, res) {
  try {
    const roles = req.user.role === 'warden' ? ['staff'] : null;
    const users = await userModel.listUsers(req.user.hostelId, roles);
    return res.json({ users });
  } catch (err) {
    console.error('ListUsers error:', err);
    return res.status(500).json({ message: 'Server error while fetching users' });
  }
}

// =========================================================
// ADD USER (Admin: Admin/Warden/Staff · Warden: Staff)
// =========================================================
async function addUser(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { fullName, email, phone, role } = req.body;

  if (!(CAN_CREATE[req.user.role] || []).includes(role)) {
    return res.status(403).json({
      message:
        req.user.role === 'warden'
          ? 'Wardens can only add Staff accounts.'
          : 'You are not allowed to create this type of account.',
    });
  }

  try {
    if (await userModel.findUserByEmail(email)) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const hostel = await hostelModel.findHostelById(req.user.hostelId);
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // New account joins the creator's own hostel and must change the temporary password.
    const created = await userModel.createUser({
      fullName,
      email,
      passwordHash,
      role,
      phone,
      hostelId: req.user.hostelId,
      isVerified: true, // receiving the temporary password by email proves the address
      mustChangePassword: true,
    });

    await auditModel.logAction(
      req.user.id,
      'USER_CREATED',
      `${fullName} (${email}) added as ${ROLE_NAMES[role]}`
    );

    let emailSent = true;
    try {
      await sendWelcomeEmail({
        to: email,
        name: fullName,
        role,
        hostelName: hostel.name,
        hostelCode: hostel.code,
        tempPassword,
        loginUrl: process.env.APP_URL || 'http://localhost:5173',
      });
    } catch (mailErr) {
      console.error('Welcome email error:', mailErr);
      emailSent = false;
    }

    const user = (await userModel.listUsers(req.user.hostelId)).find((u) => u.id === created.id);

    return res.status(201).json({
      message: emailSent
        ? `${fullName} was added as ${ROLE_NAMES[role]}. Login details were emailed to ${email}.`
        : `${fullName} was added as ${ROLE_NAMES[role]}, but the email could not be sent. Share the temporary password with them.`,
      user,
      emailSent,
      // Only shown when the email failed, so the new user can still log in.
      tempPassword: emailSent ? undefined : tempPassword,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    console.error('AddUser error:', err);
    return res.status(500).json({ message: 'Server error while adding the user' });
  }
}

async function setUserStatus(req, res) {
  const id = Number(req.params.id);
  const { isActive } = req.body;

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ message: 'isActive must be true or false' });
  }
  if (id === req.user.id) {
    return res.status(400).json({ message: 'You cannot deactivate your own account' });
  }

  try {
    // Only users of the Admin's own hostel can be changed.
    const user = await userModel.setUserActive(id, isActive, req.user.hostelId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await auditModel.logAction(
      req.user.id,
      isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      `${user.full_name} (${user.email})`
    );

    return res.json({ user });
  } catch (err) {
    console.error('SetUserStatus error:', err);
    return res.status(500).json({ message: 'Server error while updating user status' });
  }
}

async function getActivityLog(req, res) {
  try {
    const logs = await auditModel.getRecentLogs(req.user.hostelId, 100);
    return res.json({ logs });
  } catch (err) {
    console.error('ActivityLog error:', err);
    return res.status(500).json({ message: 'Server error while fetching activity log' });
  }
}

module.exports = { listUsers, addUser, setUserStatus, getActivityLog };
