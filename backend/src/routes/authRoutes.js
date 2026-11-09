const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
  nameRule,
  emailRule,
  passwordRule,
  phoneRule,
  hostelCodeRule,
} = require('../utils/validators');

const router = express.Router();

const codeRule = body('code')
  .trim()
  .matches(/^\d{6}$/)
  .withMessage('The code must be 6 digits');

// Public sign-up: Residents only, joining a hostel with its code.
router.post(
  '/register',
  [
    nameRule('fullName', 'Full name'),
    emailRule(),
    phoneRule(),
    passwordRule(),
    hostelCodeRule(),
    body('role')
      .optional()
      .isIn(['resident'])
      .withMessage(
        'Only residents can sign up. Staff, Warden and Admin accounts are created by the hostel administration.'
      ),
  ],
  authController.register
);

router.post('/login', [emailRule(), passwordRule()], authController.login);

router.post('/verify-email', [emailRule(), codeRule], authController.verifyEmail);
router.post('/resend-verification', [emailRule()], authController.resendVerification);
router.post('/forgot-password', [emailRule()], authController.forgotPassword);
router.post(
  '/reset-password',
  [emailRule(), codeRule, passwordRule('newPassword', 'New password')],
  authController.resetPassword
);

router.get('/me', protect, authController.getMe);
router.put('/me', protect, [nameRule('fullName', 'Full name'), phoneRule()], authController.updateProfile);
router.put(
  '/me/password',
  protect,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    passwordRule('newPassword', 'New password'),
  ],
  authController.changePassword
);

module.exports = router;
