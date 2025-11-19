# Database Migration Checklist

**Last Updated:** 2025-11-19

## Pre-Migration Checklist

### Planning Phase
- [ ] Migration purpose clearly defined
- [ ] Rollback strategy documented
- [ ] Data backup completed
- [ ] Testing environment prepared
- [ ] Stakeholders notified
- [ ] Maintenance window scheduled

### Technical Review
- [ ] Migration script reviewed by 2+ developers
- [ ] Performance impact assessed (EXPLAIN ANALYZE)
- [ ] Index strategy optimized
- [ ] Lock requirements understood
- [ ] Data integrity checks planned
- [ ] Migration tested on staging

## Migration File Setup

### File Naming
```
migrations/YYYYMMDD_HHMMSS_description.sql
Example: migrations/20251119_143000_add_user_preferences.sql
```

### Required Sections
- [ ] Forward migration (CREATE/ALTER)
- [ ] Data migration (if needed)
- [ ] Constraint additions
- [ ] Index creation
- [ ] RLS policy updates

### Rollback Script
```
migrations/YYYYMMDD_HHMMSS_rollback_description.sql
Example: migrations/20251119_143000_rollback_add_user_preferences.sql
```

## Testing Requirements

### Local Testing
```bash
# Dry run
supabase db push --dry-run

# Apply to local
supabase db push

# Test rollback
psql $DATABASE_URL -f migrations/XXXXX_rollback.sql

# Verify schema
supabase db diff
```

### Staging Testing
- [ ] Migration applied successfully
- [ ] Application functionality verified
- [ ] Performance metrics acceptable
- [ ] Rollback tested and verified
- [ ] No data corruption
- [ ] API endpoints working

## Deployment Checklist

### Pre-Deployment
- [ ] Recent backup verified
- [ ] Team notified
- [ ] Monitoring alerts configured
- [ ] Rollback script ready
- [ ] Connection pool settings reviewed
- [ ] Feature flags configured (if applicable)

### During Deployment
- [ ] Application in maintenance mode (if required)
- [ ] Migration running
- [ ] Progress monitored
- [ ] No excessive locks
- [ ] No timeout issues
- [ ] Error logs clean

### Post-Deployment
- [ ] Migration completed successfully
- [ ] Application restarted/reconnected
- [ ] Functionality smoke tested
- [ ] Performance metrics normal
- [ ] No error spike in logs
- [ ] Customer impact assessed

## Verification Steps

### Data Integrity
```sql
-- Record counts
SELECT COUNT(*) FROM affected_table;

-- Constraint validation
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'table_name'::regclass;

-- Index verification
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'table_name';
```

### Application Testing
- [ ] CRUD operations working
- [ ] API responses correct
- [ ] WebSocket connections stable
- [ ] Background jobs running
- [ ] Reports generating correctly

### Performance Verification
- [ ] Query latency acceptable
- [ ] Database CPU normal
- [ ] Connection count stable
- [ ] No deadlocks detected
- [ ] Cache hit ratio good

## Rollback Procedure

### Decision Criteria
Rollback if:
- [ ] Migration fails to complete
- [ ] Data corruption detected
- [ ] Application errors spike
- [ ] Performance severely degraded
- [ ] Customer impact unacceptable

### Rollback Steps
1. **Stop Application** (if necessary)
   ```bash
   # Set maintenance mode
   ```

2. **Run Rollback Script**
   ```bash
   psql $DATABASE_URL -f migrations/XXXXX_rollback.sql
   ```

3. **Verify Rollback**
   ```sql
   -- Check schema state
   \d affected_table
   ```

4. **Restart Application**
   ```bash
   # Remove maintenance mode
   ```

5. **Monitor Closely**
   - Check error logs
   - Verify functionality
   - Monitor performance

## Post-Migration Tasks

### Documentation
- [ ] Migration notes added to changelog
- [ ] Schema documentation updated
- [ ] API documentation updated (if needed)
- [ ] Runbook updated with new procedures

### Cleanup
- [ ] Temporary tables dropped
- [ ] Old columns removed (after safety period)
- [ ] Unused indexes dropped
- [ ] Migration scripts archived

### Monitoring
- [ ] New metrics configured
- [ ] Alerts tuned
- [ ] Dashboard updated
- [ ] Performance baseline established

## Common Issues & Solutions

### Issue: Migration Timeout
**Solution:**
```sql
-- Increase statement timeout
SET statement_timeout = '30min';

-- Run in batches
UPDATE table SET column = value
WHERE id IN (SELECT id FROM table LIMIT 10000);
```

### Issue: Lock Conflicts
**Solution:**
```sql
-- Use CONCURRENTLY for indexes
CREATE INDEX CONCURRENTLY idx_name ON table(column);

-- Set lock timeout
SET lock_timeout = '5s';
```

### Issue: Rollback Fails
**Solution:**
1. Check for dependent objects
2. Manually reverse changes
3. Restore from backup (last resort)

## Sign-offs

### Pre-Deployment
- [ ] Developer: _____________ Date: _______
- [ ] Reviewer: _____________ Date: _______
- [ ] DBA/Ops: _____________ Date: _______

### Post-Deployment
- [ ] Migration Success: _____________ Date: _______
- [ ] Testing Complete: _____________ Date: _______
- [ ] Sign-off: _____________ Date: _______

---

**Template Version:** 1.0.0
**Next Review:** 2026-01-01