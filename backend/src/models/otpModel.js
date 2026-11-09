const crypto = require('crypto');
const pool = require('../config/db');

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

function hashCode(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// Seconds the user must still wait before another code can be sent (0 = can send now).
async function getCooldownRemaining(userId, purpose) {
  const result = await pool.query(
    `SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) AS age
     FROM email_otps
     WHERE user_id = $1 AND purpose = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, purpose]
  );
  if (!result.rows[0]) return 0;
  const age = Number(result.rows[0].age);
  return Math.max(0, Math.ceil(RESEND_COOLDOWN_SECONDS - age));
}

// Creates a new 6-digit code; any older unused code for the same purpose stops working.
async function createOtp(userId, purpose) {
  const code = crypto.randomInt(0, 1000000).toString().padStart(6, '0');

  await pool.query(
    `UPDATE email_otps SET used_at = NOW()
     WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
    [userId, purpose]
  );

  await pool.query(
    `INSERT INTO email_otps (user_id, purpose, code_hash, expires_at)
     VALUES ($1, $2, $3, NOW() + ($4 || ' minutes')::interval)`,
    [userId, purpose, hashCode(code), OTP_EXPIRY_MINUTES]
  );

  return code;
}

// Returns 'ok' | 'invalid' | 'expired' | 'too_many_attempts'
async function verifyOtp(userId, purpose, code) {
  const result = await pool.query(
    `SELECT id, code_hash, attempts, expires_at < NOW() AS is_expired
     FROM email_otps
     WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, purpose]
  );

  const otp = result.rows[0];
  if (!otp) return 'invalid';
  if (otp.is_expired) return 'expired';
  if (otp.attempts >= MAX_ATTEMPTS) return 'too_many_attempts';

  const givenHash = Buffer.from(hashCode(code));
  const storedHash = Buffer.from(otp.code_hash);
  const matches =
    givenHash.length === storedHash.length && crypto.timingSafeEqual(givenHash, storedHash);

  if (!matches) {
    await pool.query('UPDATE email_otps SET attempts = attempts + 1 WHERE id = $1', [otp.id]);
    return 'invalid';
  }

  await pool.query('UPDATE email_otps SET used_at = NOW() WHERE id = $1', [otp.id]);
  return 'ok';
}

module.exports = {
  OTP_EXPIRY_MINUTES,
  createOtp,
  verifyOtp,
  getCooldownRemaining,
};
