-- ============================================================================
-- Migration 004: Hostel & Room Management (Module 2)
-- Room types get a facilities list; names and labels are unique where they
-- must be; rent packages keep their history (latest effective date = current).
-- ============================================================================

BEGIN;

-- Facilities offered with a room type, e.g. {WiFi, Attached Bathroom}
ALTER TABLE room_types
    ADD COLUMN IF NOT EXISTS facilities TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

-- A hostel cannot have two room types with the same name.
ALTER TABLE room_types
    ADD CONSTRAINT uniq_room_type_name_per_hostel UNIQUE (hostel_id, name);

-- Rent history: one row per change, newest effective_from = current rate.
ALTER TABLE rent_packages
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();

ALTER TABLE rent_packages
    ADD CONSTRAINT chk_security_deposit CHECK (security_deposit >= 0);

CREATE INDEX IF NOT EXISTS idx_room_types_hostel ON room_types (hostel_id);
CREATE INDEX IF NOT EXISTS idx_rent_packages_type ON rent_packages (room_type_id, effective_from DESC);

COMMIT;
