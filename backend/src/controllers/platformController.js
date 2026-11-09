const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const pool = require('../config/db');
const hostelModel = require('../models/hostelModel');
const userModel = require('../models/userModel');
const auditModel = require('../models/auditModel');
const { sendWelcomeEmail } = require('../utils/mailer');
const generateTempPassword = require('../utils/tempPassword');

const HOSTEL_STATUSES = ['trial', 'active', 'suspended'];

const STATUS_ACTIONS = {
  trial: 'HOSTEL_TRIAL',
  active: 'HOSTEL_ACTIVATED',
  suspended: 'HOSTEL_SUSPENDED',
};

// Hostel code from the name's initials, e.g. "Imperial Girls Hostel" -> IGH-4821
async function generateHostelCode(name) {
  const words = name.toUpperCase().replace(/[^A-Z ]/g, '').split(' ').filter(Boolean);
  let prefix = words.length >= 2 ? words.map((w) => w[0]).join('') : (words[0] || 'HST').slice(0, 3);
  prefix = prefix.slice(0, 6).padEnd(2, 'X');

  for (;;) {
    const code = `${prefix}-${crypto.randomInt(1000, 10000)}`;
    if (!(await hostelModel.codeExists(code))) return code;
  }
}

// =========================================================
// LIST HOSTELS + PLATFORM STATS
// =========================================================
async function listHostels(req, res) {
  try {
    const hostels = await hostelModel.listHostels();
    const stats = {
      total: hostels.length,
      active: hostels.filter((h) => h.status === 'active').length,
      trial: hostels.filter((h) => h.status === 'trial').length,
      suspended: hostels.filter((h) => h.status === 'suspended').length,
      users: hostels.reduce((sum, h) => sum + h.user_count, 0),
    };
    return res.json({ hostels, stats });
  } catch (err) {
    console.error('ListHostels error:', err);
    return res.status(500).json({ message: 'Server error while fetching hostels' });
  }
}

// =========================================================
// ADD HOSTEL + OWNER ACCOUNT
// =========================================================
async function createHostel(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { hostelName, city, ownerName, ownerEmail, ownerPhone } = req.body;

  let code;
  let tempPassword;
  let passwordHash;
  let client;
  try {
    const existing = await userModel.findUserByEmail(ownerEmail);
    if (existing) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    code = await generateHostelCode(hostelName);
    tempPassword = generateTempPassword();
    passwordHash = await bcrypt.hash(tempPassword, 10);
    client = await pool.connect();
  } catch (err) {
    console.error('CreateHostel error:', err);
    return res.status(500).json({ message: 'Server error while creating the hostel' });
  }

  // Hostel and owner are created together, or not at all.
  let hostel;
  let owner;
  try {
    await client.query('BEGIN');

    hostel = await hostelModel.createHostel(client, { name: hostelName, city, code });
    owner = await userModel.createUser(
      {
        fullName: ownerName,
        email: ownerEmail,
        passwordHash,
        role: 'admin',
        phone: ownerPhone,
        hostelId: hostel.id,
        isVerified: true, // the SmartStay team verified the owner when onboarding them
        mustChangePassword: true,
      },
      client
    );
    await auditModel.logAction(
      req.user.id,
      'HOSTEL_CREATED',
      `${hostelName} (${code}) created by SmartStay; owner ${ownerName} (${ownerEmail})`,
      hostel.id,
      client
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    console.error('CreateHostel error:', err);
    return res.status(500).json({ message: 'Server error while creating the hostel' });
  } finally {
    client.release();
  }

  let emailSent = true;
  try {
    await sendWelcomeEmail({
      to: ownerEmail,
      name: ownerName,
      role: 'admin',
      isOwner: true,
      hostelName,
      hostelCode: code,
      tempPassword,
      loginUrl: process.env.APP_URL || 'http://localhost:5173',
    });
  } catch (mailErr) {
    console.error('Welcome email error:', mailErr);
    emailSent = false;
  }

  return res.status(201).json({
    message: emailSent
      ? `${hostelName} was created. Login details were emailed to ${ownerEmail}.`
      : `${hostelName} was created, but the email could not be sent. Share the temporary password with the owner.`,
    hostel,
    owner: { id: owner.id, full_name: ownerName, email: ownerEmail },
    emailSent,
    // Only shown when the email failed, so the owner can still log in.
    tempPassword: emailSent ? undefined : tempPassword,
  });
}

// =========================================================
// CHANGE HOSTEL STATUS (trial / active / suspended)
// =========================================================
async function setHostelStatus(req, res) {
  const id = Number(req.params.id);
  const { status } = req.body;

  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Invalid hostel id' });
  }
  if (!HOSTEL_STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Status must be trial, active or suspended' });
  }

  try {
    const hostel = await hostelModel.setHostelStatus(id, status);
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found' });
    }

    await auditModel.logAction(
      req.user.id,
      STATUS_ACTIONS[status],
      `Status set to ${status} by SmartStay`,
      hostel.id
    );

    return res.json({ hostel });
  } catch (err) {
    console.error('SetHostelStatus error:', err);
    return res.status(500).json({ message: 'Server error while updating the hostel' });
  }
}

module.exports = { listHostels, createHostel, setHostelStatus };
