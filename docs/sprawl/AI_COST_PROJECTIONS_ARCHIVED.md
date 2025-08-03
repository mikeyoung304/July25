# AI Cost Projections - ARCHIVED

> **⚠️ ARCHIVED DOCUMENT**
> 
> This document contains OpenAI cost projections from the previous architecture.
> As of the BuildPanel migration, these costs are no longer applicable.
> 
> **Current Status**: BuildPanel service handles all AI operations with its own pricing model.
> **Migration Date**: January 2025
> **Reason**: Service isolation and simplified cost management

## Historical Context

This document was created when Rebuild 6.0 integrated directly with OpenAI APIs.
The costs and projections below are **obsolete** and kept for historical reference only.

## BuildPanel Migration Impact

### What Changed
- **No OpenAI API Keys**: Rebuild backend no longer calls OpenAI directly
- **Service-Based Pricing**: BuildPanel service has its own pricing structure
- **Simplified Cost Management**: No need to track per-API-call costs in Rebuild
- **Service Isolation**: AI costs managed at BuildPanel service level

### New Cost Model
```
Old: Rebuild → OpenAI API (per-call pricing)
New: Rebuild → BuildPanel Service (service-based pricing)
```

**Cost Benefits**:
- No API key management overhead
- Service-level cost controls
- Simplified billing structure
- Better cost predictability

## Original Document Content (ARCHIVED)

---

# AI Cost Projections

## Executive Summary
Projected daily AI costs: $72 raw → $21 optimized (71% reduction)
Monthly: $2,160 raw → $630 optimized

## Assumptions
- **Order Volume**: 1,000 orders/day
- **AI Interactions**: 3 voice interactions per order
- **Interaction Length**: 10 seconds average
- **Total Daily**: 3,000 interactions
- **Restaurant Count**: 10 initial pilot restaurants

## OpenAI Pricing (2024)

### Whisper (Speech-to-Text)
- **Cost**: $0.006/minute
- **Per Interaction**: 10 sec = 0.167 min × $0.006 = $0.001
- **Daily**: 3,000 × $0.001 = $3

### GPT-4o (Complex Queries)
- **Cost**: $5/1M input tokens, $15/1M output tokens
- **Average Interaction**: 300 input + 200 output tokens
- **Per Interaction**: (300 × $0.000005) + (200 × $0.000015) = $0.0045
- **Assume 30% need GPT-4o**: 900 × $0.0045 = $4.05/day

### GPT-3.5-Turbo (Simple Queries)
- **Cost**: $0.50/1M input tokens, $1.50/1M output tokens
- **Average Interaction**: 300 input + 200 output tokens
- **Per Interaction**: (300 × $0.0000005) + (200 × $0.0000015) = $0.00045
- **Assume 70% use GPT-3.5**: 2,100 × $0.00045 = $0.95/day

### TTS (Text-to-Speech)
- **Cost**: $15/1M characters
- **Average Response**: 200 characters
- **Per Interaction**: 200 × $0.000015 = $0.003
- **Daily**: 3,000 × $0.003 = $9

### Total Raw Costs
- Whisper: $3/day
- GPT-4o: $4.05/day  
- GPT-3.5: $0.95/day
- TTS: $9/day
- **Total**: $17/day per restaurant
- **10 Restaurants**: $170/day ($5,100/month)

## Optimization Strategy

### 1. Response Caching (60% reduction)
- Cache common queries: "Do you have burgers?", "What's popular?"
- Cache by restaurant_id + query_hash
- TTL: 1 hour for menu queries, 15 min for availability
- **Savings**: $102/day

### 2. Smart Model Selection (20% reduction)
- Route simple queries to GPT-3.5 (increased to 85%)
- Use GPT-4o only for complex/multi-step queries
- Implement intent classification
- **Savings**: $34/day

### 3. Audio Response Caching (10% reduction)
- Cache TTS for common responses
- Cache by response_hash + voice_settings
- **Savings**: $17/day

### 4. Request Batching (5% reduction)
- Batch multiple Whisper requests
- Combine related GPT queries
- **Savings**: $8.50/day

### 5. Edge Optimization (5% reduction)
- Implement client-side VAD (Voice Activity Detection)
- Compress audio before sending
- **Savings**: $8.50/day

## Optimized Costs

### Per Restaurant
- Raw: $17/day
- Optimized: $5.10/day (70% reduction)
- Monthly: $153

### 10 Restaurants
- Raw: $170/day
- Optimized: $51/day
- Monthly: $1,530

### Scaling Projections
- 50 restaurants: $255/day ($7,650/month)
- 100 restaurants: $510/day ($15,300/month)
- 500 restaurants: $2,550/day ($76,500/month)

## Cost Control Implementation

### Hard Limits
```javascript
// Per restaurant daily limits
const LIMITS = {
  hard_stop: 50,        // $50/day kills all AI
  alert_threshold: 30,  // $30/day sends alert
  warning: 20          // $20/day logs warning
}
```

### Rate Limiting
- Max 10 requests/minute per restaurant
- Max 500 requests/hour per restaurant
- Exponential backoff on limits

### Monitoring
- Real-time cost tracking per restaurant
- Daily cost reports
- Anomaly detection (2x normal usage)

### Emergency Controls
- Kill switch per restaurant
- Global AI pause button
- Fallback to manual operation

## Implementation Priority

1. **Week 1**: Basic cost tracking + hard limits
2. **Week 2**: Response caching (biggest win)
3. **Week 3**: Smart model selection
4. **Week 4**: Audio caching
5. **Month 2**: Advanced optimizations

## ROI Calculation

### Cost per Order
- Raw: $0.17/order
- Optimized: $0.051/order

### Value per Order
- Increased average order: +$3
- Reduced labor: +$2
- Net value: $5 - $0.051 = $4.95/order

### Monthly ROI
- Cost: $1,530
- Value: 30,000 orders × $4.95 = $148,500
- **ROI**: 9,700%

## Risk Mitigation

### Cost Overruns
- Hard stops prevent runaway costs
- Per-restaurant limits contain damage
- Real-time monitoring

### Model Changes
- Abstract model selection
- Easy migration between models
- Cost monitoring by model

### Volume Spikes
- Queue overflow protection
- Graceful degradation
- Priority queuing for VIP restaurants

---

**End of Archived Content**

## References

- [MIGRATION_BUILDPANEL.md](../MIGRATION_BUILDPANEL.md) - Current architecture
- [SECURITY_BUILDPANEL.md](../SECURITY_BUILDPANEL.md) - Current security model
- [BuildPanel Service Documentation](https://buildpanel.dev/docs) - Current AI service