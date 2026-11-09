const express = require('express');
const { body } = require('express-validator');
const { protect, authorize } = require('../middleware/authMiddleware');
const roomController = require('../controllers/roomController');
const {
  ROOM_NUMBER_PATTERN,
  placeNameRule,
  cityRule,
  idRule,
  statusRule,
  roomTypeRules,
} = require('../utils/validators');

const router = express.Router();

// Everyone here must be logged in as Admin or Warden of a hostel.
router.use(protect, authorize('admin', 'warden'));

// Every :id in these URLs must be a whole number.
router.param('id', (req, res, next, id) => {
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  next();
});

const adminOnly = authorize('admin');

const branchRules = [
  placeNameRule('name', 'Branch name'),
  body('address')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Address must be at most 255 characters'),
  cityRule(),
  body('wardenId').optional({ values: 'falsy' }).isInt({ min: 1 }).toInt(),
];

const roomRules = [
  body('roomNumber')
    .trim()
    .notEmpty()
    .withMessage('Room number is required')
    .bail()
    .matches(ROOM_NUMBER_PATTERN)
    .withMessage('Room number can contain only letters, digits and - (e.g. 101 or G-04)')
    .bail()
    .isLength({ max: 20 })
    .withMessage('Room number must be at most 20 characters'),
  idRule('roomTypeId', 'room type'),
];

// =========================================================
// VIEW (Admin + Warden)
// =========================================================
router.get('/structure', roomController.getStructure);
router.get('/availability', roomController.getAvailability);
router.get('/room-types', roomController.listRoomTypes);
router.get('/room-types/:id/rent-history', roomController.getRentHistory);

// =========================================================
// STATUS TRACKING (Admin + Warden)
// =========================================================
router.patch('/rooms/:id/status', [statusRule()], roomController.setRoomStatus);
router.patch('/beds/:id/status', [statusRule()], roomController.setBedStatus);

// =========================================================
// SETUP (Admin only)
// =========================================================
router.post('/branches', adminOnly, branchRules, roomController.createBranch);
router.put('/branches/:id', adminOnly, branchRules, roomController.updateBranch);
router.delete('/branches/:id', adminOnly, roomController.deleteBranch);

router.post(
  '/floors',
  adminOnly,
  [
    idRule('branchId', 'branch'),
    body('floorNumber')
      .isInt({ min: -2, max: 100 })
      .withMessage('Floor number must be between -2 and 100 (0 = Ground)')
      .toInt(),
    body('label')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ max: 50 })
      .withMessage('Floor label must be at most 50 characters'),
  ],
  roomController.createFloor
);
router.delete('/floors/:id', adminOnly, roomController.deleteFloor);

router.post('/rooms', adminOnly, [idRule('floorId', 'floor'), ...roomRules], roomController.createRoom);
router.put('/rooms/:id', adminOnly, roomRules, roomController.updateRoom);
router.delete('/rooms/:id', adminOnly, roomController.deleteRoom);

router.post('/rooms/:id/beds', adminOnly, roomController.addBed);
router.delete('/beds/:id', adminOnly, roomController.deleteBed);

router.post('/room-types', adminOnly, roomTypeRules(), roomController.createRoomType);
router.put('/room-types/:id', adminOnly, roomTypeRules(), roomController.updateRoomType);
router.delete('/room-types/:id', adminOnly, roomController.deleteRoomType);

module.exports = router;
