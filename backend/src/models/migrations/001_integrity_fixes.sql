-- ============================================================================
-- Migration 001: Data integrity fixes
-- For databases created from the original schema.sql. Fresh installs that use
-- the updated schema.sql already include these changes.
-- ============================================================================

BEGIN;

-- 1. A bed can belong to only one ACTIVE resident at a time.
--    Checked-out residents keep their old bed_id as history.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_resident_bed
    ON residents (bed_id)
    WHERE status = 'active' AND bed_id IS NOT NULL;

-- 2. Deleting a user/resident must not silently delete financial or complaint
--    history. Accounts are deactivated (users.is_active = FALSE) instead.
ALTER TABLE residents
    DROP CONSTRAINT residents_user_id_fkey,
    ADD CONSTRAINT residents_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE payments
    DROP CONSTRAINT payments_resident_id_fkey,
    ADD CONSTRAINT payments_resident_id_fkey
        FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE RESTRICT;

ALTER TABLE deposit_settlements
    DROP CONSTRAINT deposit_settlements_resident_id_fkey,
    ADD CONSTRAINT deposit_settlements_resident_id_fkey
        FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE RESTRICT;

ALTER TABLE complaints
    DROP CONSTRAINT complaints_resident_id_fkey,
    ADD CONSTRAINT complaints_resident_id_fkey
        FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE RESTRICT;

-- 3. Emails are unique regardless of capitalisation.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
DROP INDEX IF EXISTS idx_users_email;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_users_email_lower ON users (LOWER(email));

-- 4. Bring the live database in line with schema.sql.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
