-- ROLLBACK: 20260101_atomic_pin_attempt_increment.sql
-- WARNING: Rolling back this migration will cause pinAuth.ts to fail
-- Ensure code is also rolled back before applying this

DROP FUNCTION IF EXISTS increment_pin_attempts(UUID, UUID, INTEGER, INTEGER);
