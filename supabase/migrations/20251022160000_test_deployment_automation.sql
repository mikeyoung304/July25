-- Test Deployment Automation (Tier 3)
-- Purpose: Verify migrations auto-deploy on push to main
-- Safe: Only adds a comment, no schema changes

COMMENT ON TABLE restaurants IS 'Deployment automation test - Phase 2.3 Tier 3';

-- Track this migration
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251022160000', 'test_deployment_automation')
ON CONFLICT DO NOTHING;
