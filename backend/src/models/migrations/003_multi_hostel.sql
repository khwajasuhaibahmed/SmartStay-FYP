-- ============================================================================
-- Migration 003: Multi-hostel platform (SaaS) + Super Admin
-- Each hostel's data is kept separate. The SmartStay team (Super Admin)
-- onboards hostels; every hostel user belongs to exactly one hostel.
-- ============================================================================

-- New role for the SmartStay team. (Must run outside a transaction block.)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';

BEGIN;

CREATE TYPE hostel_status AS ENUM ('trial', 'active', 'suspended');

-- One row per subscribing hostel (customer).
CREATE TABLE IF NOT EXISTS hostels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    city VARCHAR(100),
    code VARCHAR(20) NOT NULL UNIQUE,      -- given to residents to join, e.g. IGH-4821
    status hostel_status NOT NULL DEFAULT 'trial',
    trial_ends_at DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Every hostel user belongs to one hostel; the Super Admin belongs to none.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS hostel_id INTEGER REFERENCES hostels(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Hostel-owned records (all empty today, so NOT NULL is safe).
ALTER TABLE branches ADD COLUMN IF NOT EXISTS hostel_id INTEGER NOT NULL REFERENCES hostels(id) ON DELETE RESTRICT;
ALTER TABLE room_types ADD COLUMN IF NOT EXISTS hostel_id INTEGER NOT NULL REFERENCES hostels(id) ON DELETE RESTRICT;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS hostel_id INTEGER NOT NULL REFERENCES hostels(id) ON DELETE RESTRICT;

-- Activity log entries belong to a hostel (NULL = platform-level action).
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS hostel_id INTEGER REFERENCES hostels(id) ON DELETE RESTRICT;

-- Move every existing account into a demo hostel so all demo logins keep working.
INSERT INTO hostels (name, city, code, status)
VALUES ('SmartStay Demo Hostel', 'Karachi', 'DEMO-1001', 'active');

UPDATE users SET hostel_id = (SELECT id FROM hostels WHERE code = 'DEMO-1001');

-- The SmartStay team account becomes the platform Super Admin.
UPDATE users
SET role = 'super_admin', hostel_id = NULL
WHERE LOWER(email) = 'smartstay4hostel@gmail.com';

UPDATE audit_logs a SET hostel_id = u.hostel_id FROM users u WHERE u.id = a.user_id;

-- Rules: Super Admin has no hostel; everyone else must have one.
ALTER TABLE users ADD CONSTRAINT chk_user_hostel CHECK (
    (role = 'super_admin' AND hostel_id IS NULL) OR
    (role <> 'super_admin' AND hostel_id IS NOT NULL)
);

-- Branch names are unique within a hostel.
ALTER TABLE branches ADD CONSTRAINT uniq_branch_name_per_hostel UNIQUE (hostel_id, name);

CREATE INDEX IF NOT EXISTS idx_users_hostel ON users (hostel_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_hostel ON audit_logs (hostel_id);
CREATE INDEX IF NOT EXISTS idx_branches_hostel ON branches (hostel_id);

COMMIT;
