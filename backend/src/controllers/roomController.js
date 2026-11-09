const { validationResult } = require('express-validator');
const roomModel = require('../models/roomModel');
const auditModel = require('../models/auditModel');

// =========================================================
// HOSTEL & ROOM MANAGEMENT (Module 2)
// Admin sets up branches, floors, rooms, beds, room types and rent.
// Admin and Warden view everything and update room / bed status.
// =========================================================

const STATUS_NAMES = {
  available: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
  maintenance: 'Under Maintenance',
};

// Sends the first validation error, or returns false when the input is fine.
function invalid(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ errors: errors.array() });
  return true;
}

// Same name / number twice in one place.
function duplicate(res, err, message) {
  if (err.code === '23505') {
    res.status(409).json({ message });
    return true;
  }
  return false;
}

function serverError(res, label, err) {
  console.error(`${label} error:`, err);
  return res.status(500).json({ message: `Server error while ${label.toLowerCase()}` });
}

// =========================================================
// STRUCTURE: branches > floors > rooms > beds
// =========================================================
async function getStructure(req, res) {
  try {
    const { branches, floors, rooms, beds } = await roomModel.getStructure(req.user.hostelId);

    // Nest the flat lists so the page can draw branch > floor > room > bed.
    const tree = branches.map((b) => ({
      ...b,
      floors: floors
        .filter((f) => f.branch_id === b.id)
        .map((f) => ({
          ...f,
          rooms: rooms
            .filter((r) => r.floor_id === f.id)
            .map((r) => ({ ...r, beds: beds.filter((bd) => bd.room_id === r.id) })),
        })),
    }));

    return res.json({ branches: tree });
  } catch (err) {
    return serverError(res, 'Loading rooms', err);
  }
}

// =========================================================
// BRANCHES (Admin)
// =========================================================
async function createBranch(req, res) {
  if (invalid(req, res)) return;
  const { name, address, city, wardenId } = req.body;

  try {
    if (wardenId && !(await roomModel.isHostelWarden(wardenId, req.user.hostelId))) {
      return res.status(400).json({ message: 'Please pick a warden from your hostel' });
    }

    const branch = await roomModel.createBranch({
      hostelId: req.user.hostelId,
      name,
      address,
      city,
      wardenId,
    });
    await auditModel.logAction(req.user.id, 'BRANCH_CREATED', `Branch "${name}"`);
    return res.status(201).json({ message: `Branch "${name}" was added.`, branch });
  } catch (err) {
    if (duplicate(res, err, 'A branch with this name already exists')) return;
    return serverError(res, 'Adding the branch', err);
  }
}

async function updateBranch(req, res) {
  if (invalid(req, res)) return;
  const id = Number(req.params.id);
  const { name, address, city, wardenId } = req.body;

  try {
    if (wardenId && !(await roomModel.isHostelWarden(wardenId, req.user.hostelId))) {
      return res.status(400).json({ message: 'Please pick a warden from your hostel' });
    }

    const branch = await roomModel.updateBranch(id, req.user.hostelId, {
      name,
      address,
      city,
      wardenId,
    });
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    await auditModel.logAction(req.user.id, 'BRANCH_UPDATED', `Branch "${name}"`);
    return res.json({ message: `Branch "${name}" was updated.`, branch });
  } catch (err) {
    if (duplicate(res, err, 'A branch with this name already exists')) return;
    return serverError(res, 'Updating the branch', err);
  }
}

async function deleteBranch(req, res) {
  const id = Number(req.params.id);

  try {
    const branch = await roomModel.findBranch(id, req.user.hostelId);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }
    if ((await roomModel.countBusyBeds('branch', id)) > 0) {
      return res.status(409).json({
        message: 'This branch has occupied beds. Move the residents out before deleting it.',
      });
    }

    await roomModel.deleteBranch(id, req.user.hostelId);
    await auditModel.logAction(req.user.id, 'BRANCH_DELETED', `Branch "${branch.name}"`);
    return res.json({ message: `Branch "${branch.name}" was deleted.` });
  } catch (err) {
    return serverError(res, 'Deleting the branch', err);
  }
}

// =========================================================
// FLOORS (Admin)
// =========================================================
async function createFloor(req, res) {
  if (invalid(req, res)) return;
  const { branchId, floorNumber, label } = req.body;

  try {
    const branch = await roomModel.findBranch(branchId, req.user.hostelId);
    if (!branch) {
      return res.status(404).json({ message: 'Branch not found' });
    }

    const floor = await roomModel.createFloor({ branchId, floorNumber, label });
    await auditModel.logAction(
      req.user.id,
      'FLOOR_CREATED',
      `Floor ${floorNumber}${label ? ` (${label})` : ''} in ${branch.name}`
    );
    return res.status(201).json({ message: `Floor ${floorNumber} was added.`, floor });
  } catch (err) {
    if (duplicate(res, err, 'This floor number already exists in the branch')) return;
    return serverError(res, 'Adding the floor', err);
  }
}

async function deleteFloor(req, res) {
  const id = Number(req.params.id);

  try {
    const floor = await roomModel.findFloor(id, req.user.hostelId);
    if (!floor) {
      return res.status(404).json({ message: 'Floor not found' });
    }
    if ((await roomModel.countBusyBeds('floor', id)) > 0) {
      return res.status(409).json({
        message: 'This floor has occupied beds. Move the residents out before deleting it.',
      });
    }

    await roomModel.deleteFloor(id);
    await auditModel.logAction(req.user.id, 'FLOOR_DELETED', `Floor ${floor.floor_number}`);
    return res.json({ message: `Floor ${floor.floor_number} was deleted.` });
  } catch (err) {
    return serverError(res, 'Deleting the floor', err);
  }
}

// =========================================================
// ROOMS (Admin; status: Admin + Warden)
// =========================================================
async function createRoom(req, res) {
  if (invalid(req, res)) return;
  const { floorId, roomNumber, roomTypeId } = req.body;

  try {
    const floor = await roomModel.findFloor(floorId, req.user.hostelId);
    if (!floor) {
      return res.status(404).json({ message: 'Floor not found' });
    }
    const type = await roomModel.findRoomType(roomTypeId, req.user.hostelId);
    if (!type) {
      return res.status(400).json({ message: 'Please pick a room type' });
    }

    // One bed per sharing place, labelled A, B, C, ...
    const room = await roomModel.createRoomWithBeds({
      floorId,
      roomNumber,
      roomTypeId,
      bedCount: type.sharing_capacity,
    });
    await auditModel.logAction(
      req.user.id,
      'ROOM_CREATED',
      `Room ${roomNumber} (${type.name}, ${type.sharing_capacity} beds)`
    );
    return res.status(201).json({
      message: `Room ${roomNumber} was added with ${type.sharing_capacity} bed${type.sharing_capacity === 1 ? '' : 's'}.`,
      room,
    });
  } catch (err) {
    if (duplicate(res, err, 'This room number already exists on the floor')) return;
    return serverError(res, 'Adding the room', err);
  }
}

async function updateRoom(req, res) {
  if (invalid(req, res)) return;
  const id = Number(req.params.id);
  const { roomNumber, roomTypeId } = req.body;

  try {
    const room = await roomModel.findRoom(id, req.user.hostelId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    const type = await roomModel.findRoomType(roomTypeId, req.user.hostelId);
    if (!type) {
      return res.status(400).json({ message: 'Please pick a room type' });
    }
    if (room.bed_count > type.sharing_capacity) {
      return res.status(400).json({
        message: `Room ${room.room_number} has ${room.bed_count} beds, but "${type.name}" holds only ${type.sharing_capacity}. Remove beds first.`,
      });
    }

    const updated = await roomModel.updateRoom(id, { roomNumber, roomTypeId });
    await auditModel.logAction(req.user.id, 'ROOM_UPDATED', `Room ${roomNumber} (${type.name})`);
    return res.json({ message: `Room ${roomNumber} was updated.`, room: updated });
  } catch (err) {
    if (duplicate(res, err, 'This room number already exists on the floor')) return;
    return serverError(res, 'Updating the room', err);
  }
}

async function deleteRoom(req, res) {
  const id = Number(req.params.id);

  try {
    const room = await roomModel.findRoom(id, req.user.hostelId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if ((await roomModel.countBusyBeds('room', id)) > 0) {
      return res.status(409).json({
        message: 'This room has occupied beds. Move the residents out before deleting it.',
      });
    }

    await roomModel.deleteRoom(id);
    await auditModel.logAction(req.user.id, 'ROOM_DELETED', `Room ${room.room_number}`);
    return res.json({ message: `Room ${room.room_number} was deleted.` });
  } catch (err) {
    return serverError(res, 'Deleting the room', err);
  }
}

async function setRoomStatus(req, res) {
  if (invalid(req, res)) return;
  const id = Number(req.params.id);
  const { status } = req.body;

  try {
    const room = await roomModel.findRoom(id, req.user.hostelId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const updated = await roomModel.setRoomStatus(id, status);
    await auditModel.logAction(
      req.user.id,
      'ROOM_STATUS',
      `Room ${room.room_number}: ${STATUS_NAMES[room.status]} → ${STATUS_NAMES[status]}`
    );
    return res.json({ room: updated });
  } catch (err) {
    return serverError(res, 'Updating the room status', err);
  }
}

// =========================================================
// BEDS (Admin; status: Admin + Warden)
// =========================================================
async function addBed(req, res) {
  const roomId = Number(req.params.id);

  try {
    const room = await roomModel.findRoom(roomId, req.user.hostelId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    const type = await roomModel.findRoomType(room.room_type_id, req.user.hostelId);
    if (type && room.bed_count >= type.sharing_capacity) {
      return res.status(400).json({
        message: `"${type.name}" holds ${type.sharing_capacity} bed${type.sharing_capacity === 1 ? '' : 's'}. Pick a bigger room type to add more.`,
      });
    }

    const bed = await roomModel.addBed(roomId);
    await auditModel.logAction(
      req.user.id,
      'BED_ADDED',
      `Bed ${bed.bed_label} in room ${room.room_number}`
    );
    return res.status(201).json({ bed });
  } catch (err) {
    return serverError(res, 'Adding the bed', err);
  }
}

async function deleteBed(req, res) {
  const id = Number(req.params.id);

  try {
    const bed = await roomModel.findBed(id, req.user.hostelId);
    if (!bed) {
      return res.status(404).json({ message: 'Bed not found' });
    }
    if ((await roomModel.countBusyBeds('bed', id)) > 0) {
      return res.status(409).json({ message: 'This bed is occupied and cannot be removed.' });
    }

    await roomModel.deleteBed(id);
    await auditModel.logAction(
      req.user.id,
      'BED_DELETED',
      `Bed ${bed.bed_label} in room ${bed.room_number}`
    );
    return res.json({ message: `Bed ${bed.bed_label} was removed.` });
  } catch (err) {
    return serverError(res, 'Removing the bed', err);
  }
}

async function setBedStatus(req, res) {
  if (invalid(req, res)) return;
  const id = Number(req.params.id);
  const { status } = req.body;

  try {
    const bed = await roomModel.findBed(id, req.user.hostelId);
    if (!bed) {
      return res.status(404).json({ message: 'Bed not found' });
    }

    const updated = await roomModel.setBedStatus(id, status);
    await auditModel.logAction(
      req.user.id,
      'BED_STATUS',
      `Room ${bed.room_number} bed ${bed.bed_label}: ${STATUS_NAMES[bed.status]} → ${STATUS_NAMES[status]}`
    );
    return res.json({ bed: updated });
  } catch (err) {
    return serverError(res, 'Updating the bed status', err);
  }
}

// =========================================================
// ROOM TYPES & RENT PACKAGES (Admin; list: Admin + Warden)
// =========================================================
async function listRoomTypes(req, res) {
  try {
    const roomTypes = await roomModel.listRoomTypes(req.user.hostelId);
    return res.json({ roomTypes });
  } catch (err) {
    return serverError(res, 'Loading room types', err);
  }
}

async function createRoomType(req, res) {
  if (invalid(req, res)) return;
  const { name, isAc, sharingCapacity, description, monthlyRate } = req.body;
  const facilities = req.body.facilities || [];
  const securityDeposit = req.body.securityDeposit ?? 0;

  try {
    const roomType = await roomModel.createRoomType({
      hostelId: req.user.hostelId,
      name,
      isAc,
      sharingCapacity,
      facilities,
      description,
      monthlyRate,
      securityDeposit,
    });
    await auditModel.logAction(
      req.user.id,
      'ROOM_TYPE_CREATED',
      `"${name}" (${isAc ? 'AC' : 'Non-AC'}, ${sharingCapacity}-sharing) at Rs ${monthlyRate}/month`
    );
    return res.status(201).json({ message: `Room type "${name}" was added.`, roomType });
  } catch (err) {
    if (duplicate(res, err, 'A room type with this name already exists')) return;
    return serverError(res, 'Adding the room type', err);
  }
}

async function updateRoomType(req, res) {
  if (invalid(req, res)) return;
  const id = Number(req.params.id);
  const { name, isAc, sharingCapacity, description, monthlyRate } = req.body;
  const facilities = req.body.facilities || [];
  const securityDeposit = req.body.securityDeposit ?? 0;

  try {
    const current = (await roomModel.listRoomTypes(req.user.hostelId)).find((t) => t.id === id);
    if (!current) {
      return res.status(404).json({ message: 'Room type not found' });
    }
    const maxBeds = await roomModel.maxBedsForType(id);
    if (sharingCapacity < maxBeds) {
      return res.status(400).json({
        message: `A room of this type already has ${maxBeds} beds. Sharing cannot be less than ${maxBeds}.`,
      });
    }

    const roomType = await roomModel.updateRoomType(id, {
      name,
      isAc,
      sharingCapacity,
      facilities,
      description,
    });
    await auditModel.logAction(req.user.id, 'ROOM_TYPE_UPDATED', `"${name}"`);

    // A new rent is saved as a new package so the old rate stays in history.
    if (
      Number(current.monthly_rate) !== monthlyRate ||
      Number(current.security_deposit) !== securityDeposit
    ) {
      await roomModel.addRentPackage({ roomTypeId: id, monthlyRate, securityDeposit });
      await auditModel.logAction(
        req.user.id,
        'RENT_UPDATED',
        `"${name}": Rs ${Number(current.monthly_rate || 0)} → Rs ${monthlyRate}/month`
      );
    }

    return res.json({ message: `Room type "${name}" was updated.`, roomType });
  } catch (err) {
    if (duplicate(res, err, 'A room type with this name already exists')) return;
    return serverError(res, 'Updating the room type', err);
  }
}

async function getRentHistory(req, res) {
  const id = Number(req.params.id);

  try {
    const type = await roomModel.findRoomType(id, req.user.hostelId);
    if (!type) {
      return res.status(404).json({ message: 'Room type not found' });
    }
    const history = await roomModel.getRentHistory(id);
    return res.json({ history });
  } catch (err) {
    return serverError(res, 'Loading rent history', err);
  }
}

async function deleteRoomType(req, res) {
  const id = Number(req.params.id);

  try {
    const current = (await roomModel.listRoomTypes(req.user.hostelId)).find((t) => t.id === id);
    if (!current) {
      return res.status(404).json({ message: 'Room type not found' });
    }
    if (current.room_count > 0) {
      return res.status(409).json({
        message: `${current.room_count} room${current.room_count === 1 ? ' uses' : 's use'} this type. Change those rooms first.`,
      });
    }

    await roomModel.deleteRoomType(id);
    await auditModel.logAction(req.user.id, 'ROOM_TYPE_DELETED', `"${current.name}"`);
    return res.json({ message: `Room type "${current.name}" was deleted.` });
  } catch (err) {
    return serverError(res, 'Deleting the room type', err);
  }
}

// =========================================================
// FLOOR-WISE AVAILABILITY (Admin + Warden)
// =========================================================
async function getAvailability(req, res) {
  try {
    const floors = await roomModel.getAvailability(req.user.hostelId);
    return res.json({ floors });
  } catch (err) {
    return serverError(res, 'Loading availability', err);
  }
}

module.exports = {
  getStructure,
  createBranch,
  updateBranch,
  deleteBranch,
  createFloor,
  deleteFloor,
  createRoom,
  updateRoom,
  deleteRoom,
  setRoomStatus,
  addBed,
  deleteBed,
  setBedStatus,
  listRoomTypes,
  createRoomType,
  updateRoomType,
  getRentHistory,
  deleteRoomType,
  getAvailability,
};
