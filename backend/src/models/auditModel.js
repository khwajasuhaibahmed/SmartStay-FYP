const pool = require('../config/db');

// The entry is tagged with the acting user's hostel automatically.
// Pass hostelId to tag a different hostel (e.g. Super Admin creating a hostel).
async function logAction(userId, action, details, hostelId = null, db = pool) {
  await db.query(
    `INSERT INTO audit_logs (user_id, action, details, hostel_id)
     VALUES ($1, $2, $3, COALESCE($4, (SELECT hostel_id FROM users WHERE id = $1)))`,
    [userId, action, details || null, hostelId]
  );
}

// Only this hostel's activity.
async function getRecentLogs(hostelId, limit = 100) {
  const result = await pool.query(
    `SELECT a.id, a.action, a.details, a.created_at,
            u.full_name, u.email, u.role
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.hostel_id = $1
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT $2`,
    [hostelId, limit]
  );
  return result.rows;
}

module.exports = { logAction, getRecentLogs };
