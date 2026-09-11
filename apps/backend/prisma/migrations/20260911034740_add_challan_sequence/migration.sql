-- Dedicated sequence for human-readable challan numbers (e.g. CH-2026-000123).
-- A Postgres sequence guarantees uniqueness under concurrent inserts without
-- needing an application-level lock, unlike "SELECT COUNT(*)+1".
CREATE SEQUENCE IF NOT EXISTS challan_number_seq START 1;
