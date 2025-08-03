# BuildPanel Deployment Checklist

## Pre-Deployment Requirements

### ✅ BuildPanel Service Setup
- [ ] BuildPanel service deployed and accessible
- [ ] BuildPanel service running on designated port (default: 3003)
- [ ] BuildPanel health endpoint responding: `GET /health`
- [ ] BuildPanel API endpoints accessible: `GET /api/menu`, `POST /api/voice-chat`
- [ ] Network connectivity between Rebuild backend and BuildPanel verified

### ✅ Environment Configuration
- [ ] `USE_BUILDPANEL=true` set in environment
- [ ] `BUILDPANEL_URL` configured (production URL or localhost:3003)
- [ ] Environment variables validated in all deployment environments
- [ ] No legacy `OPENAI_API_KEY` references remaining

### ✅ Health Check Integration
- [ ] Backend health endpoint includes BuildPanel status: `/health/status`
- [ ] Kubernetes readiness probe includes BuildPanel connectivity
- [ ] Monitoring dashboard includes BuildPanel service metrics
- [ ] Alert rules configured for BuildPanel service outages

## Deployment Steps

### 1. Service Deployment Order
```bash
# 1. Deploy BuildPanel service first
deploy buildpanel-service

# 2. Verify BuildPanel is healthy
curl https://buildpanel.your-domain.com/health

# 3. Deploy Rebuild backend with BuildPanel integration
deploy rebuild-backend

# 4. Verify integration
curl https://api.your-domain.com/health/status
```

### 2. Integration Verification
- [ ] BuildPanel service accessible from backend
- [ ] Health checks passing: `GET /health/status`
- [ ] AI endpoints functional through backend proxy
- [ ] Voice processing working end-to-end
- [ ] Menu data accessible through BuildPanel

### 3. Monitoring Setup
- [ ] BuildPanel service metrics being collected
- [ ] Health check alerts configured
- [ ] Log aggregation including BuildPanel service logs
- [ ] Performance monitoring for BuildPanel response times

## Post-Deployment Validation

### ✅ Functional Testing
```bash
# Test BuildPanel connectivity
curl https://api.your-domain.com/health/status | jq '.services.buildpanel'

# Test AI chat functionality
curl -X POST https://api.your-domain.com/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "X-Restaurant-ID: restaurant-uuid" \
  -d '{"message": "Hello"}'

# Test voice processing (with audio file)
curl -X POST https://api.your-domain.com/api/v1/orders/voice \
  -H "X-Restaurant-ID: restaurant-uuid" \
  -F "audio=@test-audio.webm"
```

### ✅ Performance Verification
- [ ] BuildPanel response times < 30 seconds for voice processing
- [ ] BuildPanel response times < 5 seconds for chat
- [ ] No timeout errors in BuildPanel communication
- [ ] Acceptable throughput under expected load

### ✅ Error Handling
- [ ] Graceful degradation when BuildPanel unavailable
- [ ] Proper error messages to users
- [ ] Alerts firing when BuildPanel fails
- [ ] Automatic recovery when BuildPanel comes back online

## Rollback Plan

### Immediate Actions (if BuildPanel fails)
1. **Disable AI Features**: Set `USE_BUILDPANEL=false` to disable AI functionality
2. **Verify Core Functions**: Ensure non-AI features work normally
3. **Alert Teams**: Notify operations and development teams
4. **Investigate**: Check BuildPanel service logs and connectivity

### Recovery Steps
1. **Fix BuildPanel Service**: Restart or redeploy BuildPanel
2. **Verify Connectivity**: Test BuildPanel health and API endpoints
3. **Re-enable Integration**: Set `USE_BUILDPANEL=true`
4. **Test End-to-End**: Verify voice ordering and chat functionality
5. **Monitor**: Watch for any recurring issues

## Monitoring & Alerts

### Critical Alerts (Page immediately)
- BuildPanel service completely unreachable > 5 minutes
- BuildPanel error rate > 50% for 2 minutes
- Voice processing completely failing > 3 minutes

### Warning Alerts (Notify during business hours)
- BuildPanel response time > 30 seconds
- BuildPanel error rate > 10% for 5 minutes
- Intermittent BuildPanel connectivity issues

### Dashboard Metrics
- BuildPanel service uptime
- BuildPanel response time percentiles (p50, p95, p99)
- BuildPanel error rate
- Voice processing success rate
- Chat processing success rate

## Security Considerations

### ✅ Access Control
- [ ] BuildPanel service not directly accessible from internet
- [ ] All BuildPanel communication through authenticated backend
- [ ] Restaurant context properly validated in all requests
- [ ] No sensitive data logged in BuildPanel communications

### ✅ Data Protection
- [ ] Voice data properly encrypted in transit
- [ ] No persistent storage of sensitive audio data
- [ ] Customer information properly masked in logs
- [ ] Compliance with data protection regulations

## Scaling Considerations

### Horizontal Scaling
- [ ] BuildPanel service can handle expected concurrent users
- [ ] Load balancing configured for BuildPanel if multiple instances
- [ ] Backend can handle BuildPanel response times under load

### Vertical Scaling Triggers
- BuildPanel response time > 30s consistently
- BuildPanel error rate increasing under load
- Voice processing queue backing up

## Maintenance Windows

### Planned Maintenance
1. **Schedule during low-usage hours**
2. **Notify users of AI feature unavailability**
3. **Set `USE_BUILDPANEL=false` during maintenance**
4. **Verify BuildPanel service after maintenance**
5. **Re-enable with `USE_BUILDPANEL=true`**

### Emergency Maintenance
1. **Immediately disable AI features**: `USE_BUILDPANEL=false`
2. **Investigate and fix BuildPanel issues**
3. **Test thoroughly before re-enabling**
4. **Monitor closely after re-enabling**

## Documentation Updates

### ✅ Required Documentation
- [ ] Architecture diagrams updated with BuildPanel service
- [ ] Runbooks include BuildPanel troubleshooting
- [ ] Development setup includes BuildPanel requirements
- [ ] API documentation reflects BuildPanel integration

### ✅ Team Knowledge
- [ ] Operations team trained on BuildPanel monitoring
- [ ] Development team understands BuildPanel integration
- [ ] Support team knows how to handle AI feature issues
- [ ] Escalation procedures include BuildPanel considerations

## Support & Troubleshooting

### Common Issues

#### BuildPanel Service Unreachable
```bash
# Check service status
curl https://buildpanel.your-domain.com/health

# Check network connectivity
ping buildpanel.your-domain.com

# Check backend logs
kubectl logs -f deployment/rebuild-backend | grep BuildPanel
```

#### Voice Processing Slow
```bash
# Check BuildPanel performance
./scripts/buildpanel-health-check.sh

# Monitor response times
curl -w "@curl-format.txt" https://buildpanel.your-domain.com/health
```

#### Chat Features Not Working
```bash
# Test BuildPanel chat endpoint directly
curl -X POST https://buildpanel.your-domain.com/api/chatbot \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "context": {"restaurantId": "test"}}'
```

### Escalation Procedures
1. **Level 1**: Operations team handles service restarts
2. **Level 2**: Development team investigates integration issues
3. **Level 3**: BuildPanel service provider for service-specific issues

## Success Criteria

### ✅ Deployment Successful When:
- [ ] All health checks passing
- [ ] Voice ordering working end-to-end
- [ ] Chat functionality operational
- [ ] No increase in error rates
- [ ] Monitoring and alerts functional
- [ ] Performance within acceptable limits

### ✅ Ready for Production Traffic When:
- [ ] Load testing passed with BuildPanel integration
- [ ] Failover scenarios tested and working
- [ ] Support team ready to handle issues
- [ ] Monitoring dashboards configured and accessible
- [ ] Rollback procedures validated

---

**Last Updated**: January 2025  
**Maintained By**: DevOps Team  
**Version**: 1.0.0