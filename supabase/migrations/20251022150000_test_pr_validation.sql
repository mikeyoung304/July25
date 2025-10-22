-- Test PR Validation Workflow
-- Safe test migration for CI/CD Phase 2 validation
-- Part of: Tier 2 testing
--
-- This migration is safe and non-destructive:
-- - Only adds a COMMENT (metadata)
-- - Does not modify any tables, columns, or data
-- - Will be cleaned up after testing (PR will not be merged)

COMMENT ON TABLE restaurants IS 'PR validation test - Phase 2';

-- Track this migration
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251022150000', 'test_pr_validation')
ON CONFLICT DO NOTHING;
