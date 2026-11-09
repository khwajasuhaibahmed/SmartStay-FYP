const jwt = require('jsonwebtoken');

// Verifies the JWT sent in the Authorization header and attaches the
// decoded user payload (id, role, email) to req.user for downstream handlers.
function protect(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized, invalid or expired token' });
  }
}

// Usage: authorize('admin', 'warden') - restricts a route to the given roles.
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role permissions' });
    }
    next();
  };
}

module.exports = { protect, authorize };
