const jwt = require('jsonwebtoken');

// The token carries the user's hostel so every request can be limited to that hostel.
function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, hostelId: user.hostel_id || null },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

module.exports = generateToken;
