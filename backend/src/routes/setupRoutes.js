const express = require('express');
const { body } = require('express-validator');
const setupController = require('../controllers/setupController');
const { nameRule, emailRule, passwordRule } = require('../utils/validators');

const router = express.Router();

router.get('/status', setupController.getSetupStatus);

router.post(
  '/',
  [
    body('setupKey').trim().notEmpty().withMessage('Setup key is required'),
    nameRule('fullName', 'Full name'),
    emailRule(),
    passwordRule(),
  ],
  setupController.runSetup
);

module.exports = router;
