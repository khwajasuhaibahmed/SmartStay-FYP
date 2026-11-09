const pool = require('../config/db');

const FREE_TRIAL_DAYS = 30;

async function findHostelById(id) {
  const result = await pool.query('SELECT * FROM hostels WHERE id = $1', [id]);
  return result.rows[0];
}

async function findHostelByCode(code) {
  const result = await pool.query('SELECT * FROM hostels WHERE UPPER(code) = UPPER($1)', [code]);
  return result.rows[0];
}

async function codeExists(code) {
  const result = await pool.query('SELECT 1 FROM hostels WHERE code = $1', [code]);
  return result.rowCount > 0;
}

// Hostels with their owner and user counts, for the Super Admin panel.
async function listHostels() {
  const result = await pool.query(
    `SELECT h.*,
            COUNT(u.id)::int AS user_count,
            COUNT(u.id) FILTER (WHERE u.role = 'resident')::int AS resident_count,
            (SELECT o.full_name FROM users o
              WHERE o.hostel_id = h.id AND o.role = 'admin'
              ORDER BY o.created_at LIMIT 1) AS owner_name,
            (SELECT o.email FROM users o
              WHERE o.hostel_id = h.id AND o.role = 'admin'
              ORDER BY o.created_at LIMIT 1) AS owner_email
     FROM hostels h
     LEFT JOIN users u ON u.hostel_id = h.id
     GROUP BY h.id
     ORDER BY h.created_at DESC`
  );
  return result.rows;
}

// Uses the given client so it can run inside a transaction with the owner's account.
async function createHostel(client, { name, city, code }) {
  const result = await client.query(
    `INSERT INTO hostels (name, city, code, status, trial_ends_at)
     VALUES ($1, $2, $3, 'trial', CURRENT_DATE + $4::int)
     RETURNING *`,
    [name, city || null, code, FREE_TRIAL_DAYS]
  );
  return result.rows[0];
}

async function setHostelStatus(id, status) {
  const result = await pool.query('UPDATE hostels SET status = $1 WHERE id = $2 RETURNING *', [
    status,
    id,
  ]);
  return result.rows[0];
}

module.exports = {
  FREE_TRIAL_DAYS,
  findHostelById,
  findHostelByCode,
  codeExists,
  listHostels,
  createHostel,
  setHostelStatus,
};
