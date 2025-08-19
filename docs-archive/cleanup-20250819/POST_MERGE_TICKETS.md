# Post-Merge Follow-Up Tickets

## Phase 2 OpenAI Cutover - Action Items

### 🔴 Priority 1 - Immediate (This Week)

#### 1. Cost Controls & Usage Monitoring
**Title**: Add OpenAI usage logging per restaurant with budget alerts
**Description**: 
- Log OpenAI API usage per restaurant_id
- Track tokens consumed, costs incurred
- Simple budget alerts when approaching limits
- Daily/weekly cost reports

#### 2. Monitoring Dashboard
**Title**: Create Grafana dashboard for AI metrics
**Description**:
- Visualize ai_requests_total, ai_errors_total, ai_duration_seconds
- Alert on p95 latency spikes (>5s)
- Alert on error rate increases (>5%)
- Track degraded mode activations

### 🟡 Priority 2 - Soon (Next Sprint)

#### 3. Incident Runbook
**Title**: Create 1-page runbook for AI service incidents
**Description**:
- Handling OpenAI timeouts
- Rate limiting responses
- Activating degraded mode
- API key rotation procedure
- Rollback procedures

#### 4. Secret Scanning Enhancement
**Title**: Add gitleaks to CI pipeline alongside CI guards
**Description**:
- Wire gitleaks or GitHub secret scanning
- Complement existing scripts/ci-guards.sh
- Prevent accidental key commits
- Add pre-commit hooks

### 🟢 Priority 3 - Nice to Have (Backlog)

#### 5. Test Migration
**Title**: Migrate remaining Jest tests to Vitest
**Description**:
- Complete test framework unification
- Reduce lint noise in CI
- Update test documentation
- Remove Jest dependencies

#### 6. Performance Optimization
**Title**: Add response caching for frequent queries
**Description**:
- Cache "what's on the menu" responses
- Cache common order patterns
- Reduce OpenAI API calls
- Implement cache invalidation on menu updates

### 📋 Rollback Plan (Keep Handy)

**If OpenAI service degrades:**
1. **Temporary mitigation**: Set `AI_DEGRADED_MODE=true` (server environment only)
   - Keeps endpoints available with typed responses
   - Returns graceful errors to clients
   - Allows investigation without breaking contracts

2. **Full rollback** (if needed):
   ```bash
   git checkout v1.0.0  # Previous stable tag
   npm run deploy:prod
   ```
   - Frontend contracts unchanged, minimal impact
   - Restore BuildPanel config if absolutely necessary

### 🎯 Success Metrics to Track

- **Error Rate**: <1% for AI endpoints
- **P95 Latency**: <3s for parse-order, <5s for transcribe
- **Availability**: >99.5% for provider-health
- **Cost**: Within budget per restaurant
- **User Satisfaction**: Voice order success rate >90%

### 📊 Monitoring Commands

```bash
# Check error rates (Prometheus)
sum(rate(ai_errors_total[5m])) by (route)

# Check p95 latency
histogram_quantile(0.95, rate(ai_duration_seconds_bucket[5m])) by (route)

# Check degraded mode activations
ai_degraded_mode_total

# Check rate limiting
sum(rate(ai_rate_limited_total[5m]))
```

---

**Created**: 2025-01-12
**Phase 2 Merge**: PR #7
**Version**: v1.1.0