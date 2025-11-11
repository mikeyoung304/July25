-- Migration: Add Security Audit Logs Table
-- Date: 2025-11-11
-- Phase: P0.9 Phase 2B - WebSocket Multi-Tenancy Security
-- Description: Create table for logging cross-restaurant access attempts and security violations

-- ============================================================================
-- PART 1: Create security_audit_logs table
-- ============================================================================

-- Create table for security violation audit trail
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  user_id TEXT NOT NULL,
  authenticated_restaurant_id TEXT NOT NULL,
  attempted_restaurant_id TEXT NOT NULL,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PART 2: Add indexes for efficient querying
-- ============================================================================

-- Index for user-based queries (find all violations by user)
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id
ON security_audit_logs(user_id);

-- Index for time-based queries (recent violations)
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at
ON security_audit_logs(created_at DESC);

-- Index for severity-based queries (critical violations)
CREATE INDEX IF NOT EXISTS idx_security_audit_severity
ON security_audit_logs(severity);

-- Index for event type queries (specific violation types)
CREATE INDEX IF NOT EXISTS idx_security_audit_event_type
ON security_audit_logs(event_type);

-- Composite index for restaurant + time queries (violations per restaurant over time)
CREATE INDEX IF NOT EXISTS idx_security_audit_restaurant_time
ON security_audit_logs(authenticated_restaurant_id, created_at DESC);

-- ============================================================================
-- PART 3: Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on security_audit_logs table
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can access security audit logs
-- This prevents regular users from viewing or tampering with security logs
CREATE POLICY security_audit_service_only ON security_audit_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- PART 4: Documentation
-- ============================================================================

COMMENT ON TABLE security_audit_logs IS
'P0.9 Phase 2B: Security audit trail for cross-restaurant access attempts, multi-tenancy violations, and other critical security events. Logs are immutable and restricted to service role access.';

COMMENT ON COLUMN security_audit_logs.event_type IS
'Type of security violation (e.g., CROSS_RESTAURANT_ACCESS, MISSING_RESTAURANT_ID, INVALID_JWT)';

COMMENT ON COLUMN security_audit_logs.severity IS
'Severity level: INFO (informational), WARNING (potential issue), ERROR (confirmed violation), CRITICAL (active attack or breach)';

COMMENT ON COLUMN security_audit_logs.authenticated_restaurant_id IS
'Restaurant ID from user JWT authentication token';

COMMENT ON COLUMN security_audit_logs.attempted_restaurant_id IS
'Restaurant ID the user attempted to access (different from authenticated restaurant)';
