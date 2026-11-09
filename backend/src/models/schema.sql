-- ============================================================================
-- SmartStay Database Schema (FYP-I)
-- Multi-hostel platform: each subscribing hostel's data is kept separate.
-- Covers all four FYP-I modules from the proposal:
--   1. Authentication & Access Management
--   2. Hostel & Room Management
--   3. Resident & Payment Management
--   4. Resident Portal
-- Run this once against a fresh `smartstay` database to create everything.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. PLATFORM: HOSTELS (multi-hostel SaaS)
-- ---------------------------------------------------------------------------

CREATE TYPE hostel_status AS ENUM ('trial', 'active', 'suspended');

-- One row per subscribing hostel (customer). Each hostel's data is kept separate.
CREATE TABLE IF NOT EXISTS hostels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    city VARCHAR(100),
    code VARCHAR(20) NOT NULL UNIQUE,      -- given to residents to join, e.g. IGH-4821
    status hostel_status NOT NULL DEFAULT 'trial',
    trial_ends_at DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 1. AUTHENTICATION & ACCESS MANAGEMENT
-- ---------------------------------------------------------------------------

-- super_admin = the SmartStay team, which onboards hostels (no hostel of its own).
CREATE TYPE user_role AS ENUM ('admin', 'warden', 'staff', 'resident', 'super_admin');

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    hostel_id INTEGER REFERENCES hostels(id) ON DELETE RESTRICT,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL, -- unique case-insensitively, see uniq_users_email_lower
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'resident',
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE, -- set for accounts created with a temporary password
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_user_hostel CHECK (
        (role = 'super_admin' AND hostel_id IS NULL) OR
        (role <> 'super_admin' AND hostel_id IS NOT NULL)
    )
);

-- Who changed what, and when (FYP-I feature: Activity & Audit Log)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    hostel_id INTEGER REFERENCES hostels(id) ON DELETE RESTRICT, -- NULL = platform-level action
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- One-time 6-digit codes for Email Verification and Password Reset.
-- Only a SHA-256 hash of the code is stored.
CREATE TYPE otp_purpose AS ENUM ('verify_email', 'reset_password');

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

-- ---------------------------------------------------------------------------
-- 2. HOSTEL & ROOM MANAGEMENT
-- ---------------------------------------------------------------------------

CREATE TYPE space_status AS ENUM ('available', 'occupied', 'reserved', 'maintenance');

-- A physical location of a hostel. Each hostel is "a single hostel or a small
-- multi-branch operator" (proposal Section 6).
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    hostel_id INTEGER NOT NULL REFERENCES hostels(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255),
    city VARCHAR(100),
    warden_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uniq_branch_name_per_hostel UNIQUE (hostel_id, name)
);

CREATE TABLE IF NOT EXISTS floors (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    floor_number INTEGER NOT NULL,
    label VARCHAR(50),
    UNIQUE (branch_id, floor_number)
);

-- Catalogue of room configurations (AC/Non-AC, sharing type) separate from
-- physical rooms, so rent can be configured once per type (proposal 11.1:
-- "Rent Package Setup - AC/Non-AC, sharing type, monthly rate").
CREATE TABLE IF NOT EXISTS room_types (
    id SERIAL PRIMARY KEY,
    hostel_id INTEGER NOT NULL REFERENCES hostels(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    is_ac BOOLEAN NOT NULL DEFAULT FALSE,
    sharing_capacity INTEGER NOT NULL CHECK (sharing_capacity > 0),
    description TEXT,
    facilities TEXT[] NOT NULL DEFAULT '{}',  -- e.g. {WiFi, Attached Bathroom}
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uniq_room_type_name_per_hostel UNIQUE (hostel_id, name)
);

-- Rent history: one row per change, newest effective_from = current rate.
CREATE TABLE IF NOT EXISTS rent_packages (
    id SERIAL PRIMARY KEY,
    room_type_id INTEGER NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    monthly_rate NUMERIC(10, 2) NOT NULL CHECK (monthly_rate >= 0),
    security_deposit NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (security_deposit >= 0),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    floor_id INTEGER NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    room_number VARCHAR(20) NOT NULL,
    room_type_id INTEGER REFERENCES room_types(id) ON DELETE SET NULL,
    status space_status NOT NULL DEFAULT 'available',
    UNIQUE (floor_id, room_number)
);

CREATE TABLE IF NOT EXISTS beds (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    bed_label VARCHAR(10) NOT NULL,
    status space_status NOT NULL DEFAULT 'available',
    UNIQUE (room_id, bed_label)
);

-- ---------------------------------------------------------------------------
-- 3. RESIDENT & PAYMENT MANAGEMENT
-- ---------------------------------------------------------------------------

CREATE TYPE resident_status AS ENUM ('active', 'checked_out');

-- A resident's hostel-specific profile, separate from `users` so that staff
-- can hold operational data (CNIC, guardian info, current bed) without it
-- living on the login/auth table.
CREATE TABLE IF NOT EXISTS residents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    cnic VARCHAR(20) UNIQUE,
    guardian_name VARCHAR(150),
    guardian_contact VARCHAR(20),
    emergency_contact VARCHAR(20),
    bed_id INTEGER REFERENCES beds(id) ON DELETE SET NULL,
    check_in_date DATE,
    check_out_date DATE,
    status resident_status NOT NULL DEFAULT 'active',
    document_urls TEXT[],
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TYPE payment_type AS ENUM ('rent', 'security_deposit', 'fine', 'refund');
CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'overdue');

-- Financial and complaint history uses ON DELETE RESTRICT: residents/users are
-- deactivated (users.is_active = FALSE), never deleted, once they have records.
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    resident_id INTEGER NOT NULL REFERENCES residents(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    type payment_type NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    due_date DATE,
    paid_date DATE,
    receipt_number VARCHAR(50) UNIQUE,
    recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Deposit settlement at check-out (proposal 11.1: "Check-in / Check-out
-- Management with Deposit Settlement").
CREATE TABLE IF NOT EXISTS deposit_settlements (
    id SERIAL PRIMARY KEY,
    resident_id INTEGER NOT NULL REFERENCES residents(id) ON DELETE RESTRICT,
    deposit_amount NUMERIC(10, 2) NOT NULL,
    deductions NUMERIC(10, 2) NOT NULL DEFAULT 0,
    refunded_amount NUMERIC(10, 2) NOT NULL,
    settled_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    settled_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 4. RESIDENT PORTAL
-- ---------------------------------------------------------------------------

CREATE TYPE complaint_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved');

CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    resident_id INTEGER NOT NULL REFERENCES residents(id) ON DELETE RESTRICT,
    category VARCHAR(100),
    priority complaint_priority NOT NULL DEFAULT 'medium',
    description TEXT NOT NULL,
    status ticket_status NOT NULL DEFAULT 'open',
    assigned_staff_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    resident_id INTEGER REFERENCES residents(id) ON DELETE SET NULL,
    issue_description TEXT NOT NULL,
    status ticket_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notices (
    id SERIAL PRIMARY KEY,
    hostel_id INTEGER NOT NULL REFERENCES hostels(id) ON DELETE RESTRICT,
    title VARCHAR(150) NOT NULL,
    body TEXT NOT NULL,
    branch_id INTEGER REFERENCES branches(id) ON DELETE CASCADE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Collected in FYP-I, used to train the roommate-compatibility model in
-- FYP-II (proposal 11.1 / 11.2).
CREATE TABLE IF NOT EXISTS roommate_preferences (
    id SERIAL PRIMARY KEY,
    resident_id INTEGER NOT NULL UNIQUE REFERENCES residents(id) ON DELETE CASCADE,
    sleep_schedule VARCHAR(20),
    cleanliness_level SMALLINT CHECK (cleanliness_level BETWEEN 1 AND 5),
    noise_tolerance SMALLINT CHECK (noise_tolerance BETWEEN 1 AND 5),
    study_habits VARCHAR(100),
    social_habits VARCHAR(100),
    smokes BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT
);

CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS room_change_requests (
    id SERIAL PRIMARY KEY,
    resident_id INTEGER NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
    current_bed_id INTEGER REFERENCES beds(id) ON DELETE SET NULL,
    requested_room_type_id INTEGER REFERENCES room_types(id) ON DELETE SET NULL,
    reason TEXT,
    status request_status NOT NULL DEFAULT 'pending',
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- Indexes for the lookups the app actually performs
-- ---------------------------------------------------------------------------

-- Same email in different capitalisation counts as the same account.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_users_email_lower ON users (LOWER(email));

-- A bed can belong to only one ACTIVE resident at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_resident_bed
    ON residents (bed_id)
    WHERE status = 'active' AND bed_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_otps_user_purpose ON email_otps (user_id, purpose);
CREATE INDEX IF NOT EXISTS idx_users_hostel ON users (hostel_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_hostel ON audit_logs (hostel_id);
CREATE INDEX IF NOT EXISTS idx_branches_hostel ON branches (hostel_id);
CREATE INDEX IF NOT EXISTS idx_floors_branch ON floors(branch_id);
CREATE INDEX IF NOT EXISTS idx_rooms_floor ON rooms(floor_id);
CREATE INDEX IF NOT EXISTS idx_beds_room ON beds(room_id);
CREATE INDEX IF NOT EXISTS idx_room_types_hostel ON room_types (hostel_id);
CREATE INDEX IF NOT EXISTS idx_rent_packages_type ON rent_packages (room_type_id, effective_from DESC);
CREATE INDEX IF NOT EXISTS idx_residents_user ON residents(user_id);
CREATE INDEX IF NOT EXISTS idx_residents_bed ON residents(bed_id);
CREATE INDEX IF NOT EXISTS idx_payments_resident ON payments(resident_id);
CREATE INDEX IF NOT EXISTS idx_complaints_resident ON complaints(resident_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_room ON maintenance_requests(room_id);
