const { body } = require('express-validator');

// =========================================================
// SHARED INPUT RULES (server side)
// Same rules are checked in the web and mobile forms.
// =========================================================

// Names: must start with a letter; only letters and spaces.
const NAME_PATTERN = /^[A-Za-z][A-Za-z ]*$/;

// Pakistani mobile number, e.g. 0300-1234567 or 03001234567
const PHONE_PATTERN = /^03\d{2}-?\d{7}$/;

// Hostel join code, e.g. IGH-4821
const HOSTEL_CODE_PATTERN = /^[A-Z]{2,6}-\d{4}$/;

const nameRule = (field = 'fullName', label = 'Name') =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${label} is required`)
    .bail()
    .matches(NAME_PATTERN)
    .withMessage(`${label} must start with a letter and contain only letters and spaces`)
    .bail()
    .isLength({ min: 2, max: 100 })
    .withMessage(`${label} must be between 2 and 100 characters`);

const emailRule = (field = 'email') =>
  body(field)
    .trim()
    .toLowerCase()
    .notEmpty()
    .withMessage('Email is required')
    .bail()
    .contains('@')
    .withMessage('Email must contain the @ sign (e.g. name@gmail.com)')
    .bail()
    .isEmail()
    .withMessage('Please enter a valid email address (e.g. name@gmail.com)');

const passwordRule = (field = 'password', label = 'Password') =>
  body(field)
    .isLength({ min: 6 })
    .withMessage(`${label} must be at least 6 characters`)
    .bail()
    .isLength({ max: 72 })
    .withMessage(`${label} must be at most 72 characters`);

const phoneRule = (field = 'phone') =>
  body(field)
    .optional({ values: 'falsy' })
    .trim()
    .matches(PHONE_PATTERN)
    .withMessage('Phone must look like 0300-1234567');

const hostelCodeRule = (field = 'hostelCode') =>
  body(field)
    .trim()
    .toUpperCase()
    .notEmpty()
    .withMessage('Hostel code is required. Ask your warden for it.')
    .bail()
    .matches(HOSTEL_CODE_PATTERN)
    .withMessage('Hostel code must look like IGH-4821');

// =========================================================
// HOSTEL & ROOM RULES (Module 2)
// =========================================================

// Branch / room type names: start with a letter; letters, digits, spaces, - . '
const PLACE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9 .'-]*$/;

// Room numbers, e.g. 101, G-04, A12
const ROOM_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*$/;

const SPACE_STATUSES = ['available', 'occupied', 'reserved', 'maintenance'];

// Facilities a room type can offer (same list in the web form).
const FACILITIES = [
  'WiFi',
  'Attached Bathroom',
  'Study Table',
  'Wardrobe',
  'Geyser',
  'Balcony',
  'Laundry',
  'Meals Included',
];

const placeNameRule = (field, label) =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${label} is required`)
    .bail()
    .matches(PLACE_NAME_PATTERN)
    .withMessage(`${label} must start with a letter`)
    .bail()
    .isLength({ min: 2, max: 100 })
    .withMessage(`${label} must be between 2 and 100 characters`);

const cityRule = (field = 'city') =>
  body(field)
    .optional({ values: 'falsy' })
    .trim()
    .matches(NAME_PATTERN)
    .withMessage('City can contain only letters and spaces');

const idRule = (field, label) =>
  body(field).isInt({ min: 1 }).withMessage(`Please pick a ${label}`).toInt();

const statusRule = () =>
  body('status')
    .isIn(SPACE_STATUSES)
    .withMessage('Status must be Available, Occupied, Reserved or Under Maintenance');

const roomTypeRules = () => [
  placeNameRule('name', 'Room type name'),
  body('isAc').isBoolean().withMessage('Choose AC or Non-AC').toBoolean(),
  body('sharingCapacity')
    .isInt({ min: 1, max: 12 })
    .withMessage('Sharing must be between 1 and 12 persons')
    .toInt(),
  body('facilities')
    .optional()
    .isArray()
    .withMessage('Facilities must be a list')
    .bail()
    .custom((list) => list.every((f) => FACILITIES.includes(f)))
    .withMessage('Unknown facility'),
  body('description')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
  body('monthlyRate')
    .isFloat({ min: 0, max: 10000000 })
    .withMessage('Monthly rent must be a number, 0 or more')
    .toFloat(),
  body('securityDeposit')
    .optional({ values: 'null' })
    .isFloat({ min: 0, max: 10000000 })
    .withMessage('Security deposit must be a number, 0 or more')
    .toFloat(),
];

module.exports = {
  nameRule,
  emailRule,
  passwordRule,
  phoneRule,
  hostelCodeRule,
  ROOM_NUMBER_PATTERN,
  FACILITIES,
  placeNameRule,
  cityRule,
  idRule,
  statusRule,
  roomTypeRules,
};
