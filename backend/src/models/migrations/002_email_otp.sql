-- ============================================================================
-- Migration 002: Email verification + password reset codes (OTP)
-- ============================================================================

BEGIN;

CREATE TYPE otp_purpose AS ENUM ('verify_email', 'reset_password');

-- One-time 6-digit codes sent by email. Only a hash of the code is stored.
CREATE TABLE IF NOT EXISTS email_otps (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose otp_purpose NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    attempts SMALLINT NOT NULL DEFAULT 0,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otps_user_purpose ON email_otps (user_id, purpose);

-- Accounts that existed before email verification was added are trusted.
UPDATE users SET is_verified = TRUE WHERE is_verified = FALSE;

COMMIT;
