const pool = require('../config/db');

// Columns safe to send to the client (never password_hash), plus the user's hostel.
const PUBLIC_COLUMNS = `
  u.id, u.full_name, u.email, u.role, u.phone, u.is_active, u.is_verified,
  u.must_change_password, u.created_at, u.hostel_id,
  h.name AS hostel_name, h.code AS hostel_code, h.status AS hostel_status`;

// `db` can be a transaction client; defaults to the shared pool.
async function createUser(
  { fullName, email, passwordHash, role, phone, hostelId, isVerified = false, mustChangePassword = false },
  db = pool
) {
  const result = await db.query(
    `INSERT INTO users
       (full_name, email, password_hash, role, phone, hostel_id, is_verified, must_change_password)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [fullName, email, passwordHash, role, phone || null, hostelId || null, isVerified, mustChangePassword]
  );
  return result.rows[0];
}

// Includes password_hash: only for login / password checks, never sent to the client.
async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT u.*, h.name AS hostel_name, h.code AS hostel_code, h.status AS hostel_status
     FROM users u
     LEFT JOIN hostels h ON h.id = u.hostel_id
     WHERE LOWER(u.email) = LOWER($1)`,
    [email]
  );
  return result.rows[0];
}

async function findUserById(id) {
  const result = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM users u
     LEFT JOIN hostels h ON h.id = u.hostel_id
     WHERE u.id = $1`,
    [id]
  );
  return result.rows[0];
}

async function updateUserProfile(id, { fullName, phone }) {
  await pool.query(
    'UPDATE users SET full_name = $1, phone = $2, updated_at = NOW() WHERE id = $3',
    [fullName, phone, id]
  );
  return findUserById(id);
}

// Setting a new password also clears the "must change temporary password" flag.
async function updateUserPassword(id, passwordHash) {
  await pool.query(
    `UPDATE users SET password_hash = $1, must_change_password = FALSE, updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, id]
  );
}

async function markUserVerified(id) {
  await pool.query('UPDATE users SET is_verified = TRUE, updated_at = NOW() WHERE id = $1', [id]);
}

// ---------------------------------------------------------
// Hostel-scoped queries: a hostel only ever sees its own users.
// ---------------------------------------------------------
async function countUsersByRole(hostelId) {
  const result = await pool.query(
    'SELECT role, COUNT(*)::int AS count FROM users WHERE hostel_id = $1 GROUP BY role',
    [hostelId]
  );
  return result.rows;
}

// `roles` (optional) limits the list, e.g. a Warden only sees ['staff'].
async function listUsers(hostelId, roles = null) {
  const result = await pool.query(
    `SELECT id, full_name, email, role, phone, is_active, must_change_password, created_at
     FROM users
     WHERE hostel_id = $1 AND ($2::user_role[] IS NULL OR role = ANY($2::user_role[]))
     ORDER BY created_at DESC`,
    [hostelId, roles]
  );
  return result.rows;
}

// Returns undefined when the user is not in this hostel, so it is treated as "not found".
async function setUserActive(id, isActive, hostelId) {
  const result = await pool.query(
    `UPDATE users SET is_active = $1, updated_at = NOW()
     WHERE id = $2 AND hostel_id = $3
     RETURNING id, full_name, email, role, phone, is_active, created_at`,
    [isActive, id, hostelId]
  );
  return result.rows[0];
}

async function superAdminExists() {
  const result = await pool.query("SELECT 1 FROM users WHERE role = 'super_admin' LIMIT 1");
  return result.rowCount > 0;
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  updateUserProfile,
  updateUserPassword,
  markUserVerified,
  countUsersByRole,
  listUsers,
  setUserActive,
  superAdminExists,
};
