const pool = require('../config/db');

// =========================================================
// HOSTEL & ROOM MANAGEMENT (Module 2)
// Every query is limited to one hostel. Floors, rooms and beds do not
// store hostel_id, so they are checked through their branch.
// =========================================================

// A bed is "busy" when someone lives in it: it cannot be deleted.
const BUSY_BED = `(bd.status = 'occupied' OR EXISTS (
  SELECT 1 FROM residents res WHERE res.bed_id = bd.id AND res.status = 'active'))`;

// ---------------------------------------------------------
// STRUCTURE (everything the Branches & Rooms page needs)
// ---------------------------------------------------------
async function getStructure(hostelId) {
  const branches = await pool.query(
    `SELECT b.id, b.name, b.address, b.city, b.warden_id, w.full_name AS warden_name
     FROM branches b
     LEFT JOIN users w ON w.id = b.warden_id
     WHERE b.hostel_id = $1
     ORDER BY b.created_at, b.id`,
    [hostelId]
  );

  const floors = await pool.query(
    `SELECT f.id, f.branch_id, f.floor_number, f.label
     FROM floors f
     JOIN branches b ON b.id = f.branch_id
     WHERE b.hostel_id = $1
     ORDER BY f.floor_number`,
    [hostelId]
  );

  const rooms = await pool.query(
    `SELECT r.id, r.floor_id, r.room_number, r.status, r.room_type_id,
            t.name AS room_type_name, t.is_ac, t.sharing_capacity
     FROM rooms r
     JOIN floors f ON f.id = r.floor_id
     JOIN branches b ON b.id = f.branch_id
     LEFT JOIN room_types t ON t.id = r.room_type_id
     WHERE b.hostel_id = $1
     ORDER BY r.room_number`,
    [hostelId]
  );

  const beds = await pool.query(
    `SELECT bd.id, bd.room_id, bd.bed_label, bd.status
     FROM beds bd
     JOIN rooms r ON r.id = bd.room_id
     JOIN floors f ON f.id = r.floor_id
     JOIN branches b ON b.id = f.branch_id
     WHERE b.hostel_id = $1
     ORDER BY bd.bed_label`,
    [hostelId]
  );

  return { branches: branches.rows, floors: floors.rows, rooms: rooms.rows, beds: beds.rows };
}

// ---------------------------------------------------------
// BRANCHES
// ---------------------------------------------------------
async function findBranch(id, hostelId) {
  const result = await pool.query('SELECT * FROM branches WHERE id = $1 AND hostel_id = $2', [
    id,
    hostelId,
  ]);
  return result.rows[0];
}

async function createBranch({ hostelId, name, address, city, wardenId }) {
  const result = await pool.query(
    `INSERT INTO branches (hostel_id, name, address, city, warden_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [hostelId, name, address || null, city || null, wardenId || null]
  );
  return result.rows[0];
}

async function updateBranch(id, hostelId, { name, address, city, wardenId }) {
  const result = await pool.query(
    `UPDATE branches SET name = $1, address = $2, city = $3, warden_id = $4
     WHERE id = $5 AND hostel_id = $6
     RETURNING *`,
    [name, address || null, city || null, wardenId || null, id, hostelId]
  );
  return result.rows[0];
}

async function deleteBranch(id, hostelId) {
  await pool.query('DELETE FROM branches WHERE id = $1 AND hostel_id = $2', [id, hostelId]);
}

// Is this user a warden of the same hostel? (for assigning a branch warden)
async function isHostelWarden(userId, hostelId) {
  const result = await pool.query(
    `SELECT 1 FROM users WHERE id = $1 AND hostel_id = $2 AND role = 'warden' AND is_active = TRUE`,
    [userId, hostelId]
  );
  return result.rowCount > 0;
}

// ---------------------------------------------------------
// FLOORS
// ---------------------------------------------------------
async function findFloor(id, hostelId) {
  const result = await pool.query(
    `SELECT f.* FROM floors f
     JOIN branches b ON b.id = f.branch_id
     WHERE f.id = $1 AND b.hostel_id = $2`,
    [id, hostelId]
  );
  return result.rows[0];
}

async function createFloor({ branchId, floorNumber, label }) {
  const result = await pool.query(
    `INSERT INTO floors (branch_id, floor_number, label)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [branchId, floorNumber, label || null]
  );
  return result.rows[0];
}

async function deleteFloor(id) {
  await pool.query('DELETE FROM floors WHERE id = $1', [id]);
}

// ---------------------------------------------------------
// ROOMS
// ---------------------------------------------------------
async function findRoom(id, hostelId) {
  const result = await pool.query(
    `SELECT r.*, (SELECT COUNT(*)::int FROM beds WHERE room_id = r.id) AS bed_count
     FROM rooms r
     JOIN floors f ON f.id = r.floor_id
     JOIN branches b ON b.id = f.branch_id
     WHERE r.id = $1 AND b.hostel_id = $2`,
    [id, hostelId]
  );
  return result.rows[0];
}

// A new room gets one bed per sharing place (A, B, C, ...), in one transaction.
async function createRoomWithBeds({ floorId, roomNumber, roomTypeId, bedCount }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const room = await client.query(
      `INSERT INTO rooms (floor_id, room_number, room_type_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [floorId, roomNumber, roomTypeId]
    );
    for (let i = 0; i < bedCount; i += 1) {
      await client.query('INSERT INTO beds (room_id, bed_label) VALUES ($1, $2)', [
        room.rows[0].id,
        String.fromCharCode(65 + i),
      ]);
    }
    await client.query('COMMIT');
    return room.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateRoom(id, { roomNumber, roomTypeId }) {
  const result = await pool.query(
    'UPDATE rooms SET room_number = $1, room_type_id = $2 WHERE id = $3 RETURNING *',
    [roomNumber, roomTypeId, id]
  );
  return result.rows[0];
}

async function deleteRoom(id) {
  await pool.query('DELETE FROM rooms WHERE id = $1', [id]);
}

// Under maintenance: the room's free beds go under maintenance too.
// Back to available: those beds become available again.
async function setRoomStatus(id, status) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const room = await client.query('UPDATE rooms SET status = $1 WHERE id = $2 RETURNING *', [
      status,
      id,
    ]);
    if (status === 'maintenance') {
      await client.query(
        `UPDATE beds SET status = 'maintenance' WHERE room_id = $1 AND status = 'available'`,
        [id]
      );
    } else if (status === 'available') {
      await client.query(
        `UPDATE beds SET status = 'available' WHERE room_id = $1 AND status = 'maintenance'`,
        [id]
      );
    }
    await client.query('COMMIT');
    return room.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------
// BEDS
// ---------------------------------------------------------
async function findBed(id, hostelId) {
  const result = await pool.query(
    `SELECT bd.*, r.room_number FROM beds bd
     JOIN rooms r ON r.id = bd.room_id
     JOIN floors f ON f.id = r.floor_id
     JOIN branches b ON b.id = f.branch_id
     WHERE bd.id = $1 AND b.hostel_id = $2`,
    [id, hostelId]
  );
  return result.rows[0];
}

// Next free letter in the room (A, B, C, ...).
async function addBed(roomId) {
  const used = await pool.query('SELECT bed_label FROM beds WHERE room_id = $1', [roomId]);
  const labels = used.rows.map((r) => r.bed_label);
  let code = 65;
  while (labels.includes(String.fromCharCode(code))) code += 1;

  const result = await pool.query(
    'INSERT INTO beds (room_id, bed_label) VALUES ($1, $2) RETURNING *',
    [roomId, String.fromCharCode(code)]
  );
  return result.rows[0];
}

async function deleteBed(id) {
  await pool.query('DELETE FROM beds WHERE id = $1', [id]);
}

async function setBedStatus(id, status) {
  const result = await pool.query('UPDATE beds SET status = $1 WHERE id = $2 RETURNING *', [
    status,
    id,
  ]);
  return result.rows[0];
}

// How many beds someone lives in, inside a branch / floor / room / bed.
async function countBusyBeds(level, id) {
  const where = {
    branch: 'f.branch_id = $1',
    floor: 'r.floor_id = $1',
    room: 'bd.room_id = $1',
    bed: 'bd.id = $1',
  }[level];
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM beds bd
     JOIN rooms r ON r.id = bd.room_id
     JOIN floors f ON f.id = r.floor_id
     WHERE ${where} AND ${BUSY_BED}`,
    [id]
  );
  return result.rows[0].count;
}

// ---------------------------------------------------------
// ROOM TYPES & RENT PACKAGES
// ---------------------------------------------------------
async function listRoomTypes(hostelId) {
  const result = await pool.query(
    `SELECT t.*, rp.monthly_rate, rp.security_deposit, rp.effective_from,
            (SELECT COUNT(*)::int FROM rooms WHERE room_type_id = t.id) AS room_count
     FROM room_types t
     LEFT JOIN LATERAL (
       SELECT monthly_rate, security_deposit, effective_from FROM rent_packages
       WHERE room_type_id = t.id AND effective_from <= CURRENT_DATE
       ORDER BY effective_from DESC, id DESC LIMIT 1
     ) rp ON TRUE
     WHERE t.hostel_id = $1
     ORDER BY t.created_at, t.id`,
    [hostelId]
  );
  return result.rows;
}

async function findRoomType(id, hostelId) {
  const result = await pool.query('SELECT * FROM room_types WHERE id = $1 AND hostel_id = $2', [
    id,
    hostelId,
  ]);
  return result.rows[0];
}

// The room type and its first rent package are saved together.
async function createRoomType({ hostelId, name, isAc, sharingCapacity, facilities, description, monthlyRate, securityDeposit }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const type = await client.query(
      `INSERT INTO room_types (hostel_id, name, is_ac, sharing_capacity, facilities, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [hostelId, name, isAc, sharingCapacity, facilities, description || null]
    );
    await client.query(
      `INSERT INTO rent_packages (room_type_id, monthly_rate, security_deposit)
       VALUES ($1, $2, $3)`,
      [type.rows[0].id, monthlyRate, securityDeposit]
    );
    await client.query('COMMIT');
    return type.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateRoomType(id, { name, isAc, sharingCapacity, facilities, description }) {
  const result = await pool.query(
    `UPDATE room_types
     SET name = $1, is_ac = $2, sharing_capacity = $3, facilities = $4, description = $5
     WHERE id = $6
     RETURNING *`,
    [name, isAc, sharingCapacity, facilities, description || null, id]
  );
  return result.rows[0];
}

// A rent change adds a new package; older ones stay as history.
async function addRentPackage({ roomTypeId, monthlyRate, securityDeposit }) {
  const result = await pool.query(
    `INSERT INTO rent_packages (room_type_id, monthly_rate, security_deposit)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [roomTypeId, monthlyRate, securityDeposit]
  );
  return result.rows[0];
}

async function getRentHistory(roomTypeId) {
  const result = await pool.query(
    `SELECT monthly_rate, security_deposit, effective_from, created_at
     FROM rent_packages WHERE room_type_id = $1
     ORDER BY effective_from DESC, id DESC`,
    [roomTypeId]
  );
  return result.rows;
}

async function deleteRoomType(id) {
  await pool.query('DELETE FROM room_types WHERE id = $1', [id]);
}

// The most beds any room of this type has (a type's capacity cannot go below it).
async function maxBedsForType(roomTypeId) {
  const result = await pool.query(
    `SELECT COALESCE(MAX(c), 0)::int AS max FROM (
       SELECT COUNT(bd.id) AS c FROM rooms r
       LEFT JOIN beds bd ON bd.room_id = r.id
       WHERE r.room_type_id = $1 GROUP BY r.id
     ) x`,
    [roomTypeId]
  );
  return result.rows[0].max;
}

// ---------------------------------------------------------
// FLOOR-WISE AVAILABILITY
// ---------------------------------------------------------
async function getAvailability(hostelId) {
  const result = await pool.query(
    `SELECT b.id AS branch_id, b.name AS branch_name,
            f.id AS floor_id, f.floor_number, f.label AS floor_label,
            COUNT(DISTINCT r.id)::int AS rooms,
            COUNT(bd.id)::int AS beds,
            COUNT(bd.id) FILTER (WHERE bd.status = 'available')::int AS available,
            COUNT(bd.id) FILTER (WHERE bd.status = 'occupied')::int AS occupied,
            COUNT(bd.id) FILTER (WHERE bd.status = 'reserved')::int AS reserved,
            COUNT(bd.id) FILTER (WHERE bd.status = 'maintenance')::int AS maintenance
     FROM branches b
     JOIN floors f ON f.branch_id = b.id
     LEFT JOIN rooms r ON r.floor_id = f.id
     LEFT JOIN beds bd ON bd.room_id = r.id
     WHERE b.hostel_id = $1
     GROUP BY b.id, f.id
     ORDER BY b.created_at, b.id, f.floor_number`,
    [hostelId]
  );
  return result.rows;
}

module.exports = {
  getStructure,
  findBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  isHostelWarden,
  findFloor,
  createFloor,
  deleteFloor,
  findRoom,
  createRoomWithBeds,
  updateRoom,
  deleteRoom,
  setRoomStatus,
  findBed,
  addBed,
  deleteBed,
  setBedStatus,
  countBusyBeds,
  listRoomTypes,
  findRoomType,
  createRoomType,
  updateRoomType,
  addRentPackage,
  getRentHistory,
  deleteRoomType,
  maxBedsForType,
  getAvailability,
};
