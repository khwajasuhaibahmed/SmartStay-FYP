const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const userModel = require('../models/userModel');
const auditModel = require('../models/auditModel');
const generateToken = require('../utils/generateToken');

// =========================================================
// FIRST-TIME SETUP
// Creates the very first Super Admin (the SmartStay team).
// Works only while no Super Admin exists, and only with the
// SETUP_KEY from the server's .env file.
// =========================================================

function keysMatch(given, expected) {
  const a = Buffer.from(String(given));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function getSetupStatus(req, res) {
  try {
    const needsSetup = !(await userModel.superAdminExists());
    return res.json({ needsSetup });
  } catch (err) {
    console.error('SetupStatus error:', err);
    return res.status(500).json({ message: 'Server error while checking setup' });
  }
}

async function runSetup(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { setupKey, fullName, email, password } = req.body;

  if (!process.env.SETUP_KEY) {
    return res.status(503).json({ message: 'Setup is not enabled on this server (SETUP_KEY is missing).' });
  }

  try {
    if (await userModel.superAdminExists()) {
      return res.status(403).json({ message: 'Setup has already been completed. Please log in.' });
    }
    if (!keysMatch(setupKey, process.env.SETUP_KEY)) {
      return res.status(401).json({ message: 'The setup key is incorrect.' });
    }
    if (await userModel.findUserByEmail(email)) {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await userModel.createUser({
      fullName,
      email,
      passwordHash,
      role: 'super_admin',
      isVerified: true,
    });

    await auditModel.logAction(created.id, 'SETUP_COMPLETED', 'First Super Admin created');

    const user = await userModel.findUserById(created.id);
    const token = generateToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    console.error('RunSetup error:', err);
    return res.status(500).json({ message: 'Server error while completing setup' });
  }
}

module.exports = { getSetupStatus, runSetup };
