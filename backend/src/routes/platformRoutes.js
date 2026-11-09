const express = require('express');
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/authMiddleware');
const platformController = require('../controllers/platformController');
const { nameRule, emailRule, phoneRule } = require('../utils/validators');

const router = express.Router();

// Every platform route is for the SmartStay team (Super Admin) only.
router.use(protect, authorize('super_admin'));

router.get('/hostels', platformController.listHostels);

router.post(
  '/hostels',
  [
    body('hostelName')
      .trim()
      .notEmpty()
      .withMessage('Hostel name is required')
      .bail()
      .matches(/^[A-Za-z][A-Za-z0-9 &'.-]*$/)
      .withMessage('Hostel name must start with a letter')
      .bail()
      .isLength({ min: 3, max: 150 })
      .withMessage('Hostel name must be between 3 and 150 characters'),
    body('city')
      .optional({ values: 'falsy' })
      .trim()
      .matches(/^[A-Za-z][A-Za-z ]*$/)
      .withMessage('City must contain only letters and spaces'),
    nameRule('ownerName', "Owner's name"),
    emailRule('ownerEmail'),
    phoneRule('ownerPhone'),
  ],
  platformController.createHostel
);

router.patch('/hostels/:id/status', platformController.setHostelStatus);

module.exports = router;
