const express = require('express');
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/authMiddleware');
const userModel = require('../models/userModel');
const userController = require('../controllers/userController');
const { nameRule, emailRule, phoneRule } = require('../utils/validators');

const router = express.Router();

// Users & Roles page: Admin sees everyone, Warden sees Staff only
router.get('/', protect, authorize('admin', 'warden'), userController.listUsers);

// Add user: Admin adds Admin/Warden/Staff, Warden adds Staff (checked in the controller)
router.post(
  '/',
  protect,
  authorize('admin', 'warden'),
  [
    nameRule('fullName', 'Full name'),
    emailRule(),
    phoneRule(),
    body('role').isIn(['admin', 'warden', 'staff']).withMessage('Role must be Admin, Warden or Staff'),
  ],
  userController.addUser
);

// Activate / deactivate: Admin only
router.patch('/:id/status', protect, authorize('admin'), userController.setUserStatus);

// Admin only: Activity Log page
router.get('/activity', protect, authorize('admin'), userController.getActivityLog);

// Demonstrates RBAC: only admins and wardens can reach this endpoint.
router.get('/admin-area', protect, authorize('admin', 'warden'), (req, res) => {
  res.json({ message: `Welcome ${req.user.role}. This is a role-restricted area.` });
});

// Admin and Warden only, counted within their own hostel.
router.get('/stats', protect, authorize('admin', 'warden'), async (req, res) => {
  try {
    const rows = await userModel.countUsersByRole(req.user.hostelId);
    const counts = { admin: 0, warden: 0, staff: 0, resident: 0 };
    rows.forEach((row) => {
      counts[row.role] = row.count;
    });
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    res.json({ total, counts });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ message: 'Server error while fetching stats' });
  }
});

module.exports = router;
