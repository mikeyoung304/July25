#!/bin/bash
# Staging Smoke Test for Phase 2 OpenAI Cutover
# Run this after deploying to staging

set -euo pipefail

# Configuration - Update these for your staging environment
export API_BASE="${STAGING_API_BASE:-https://staging-api.growfresh.com}"
export RESTAURANT_ID="11111111-1111-1111-1111-111111111111"

echo "🔍 Testing Phase 2 OpenAI Integration on Staging"
echo "API Base: $API_BASE"
echo ""

# 1. Provider Health Check
echo "1️⃣ Provider Health Check:"
curl -sS "$API_BASE/api/v1/ai/provider-health" | jq .
echo ""

# 2. Parse Order - Happy Path
echo "2️⃣ Parse Order (Happy Path - Known Items):"
curl -sS -X POST "$API_BASE/api/v1/ai/parse-order" \
  -H "Content-Type: application/json" \
  -H "X-Restaurant-ID: $RESTAURANT_ID" \
  -d '{"text":"two margherita, one pepperoni no cheese"}' | jq .
echo ""

# 3. Parse Order - 422 Unknown Item
echo "3️⃣ Parse Order (422 - Unknown Item):"
curl -sS -i -X POST "$API_BASE/api/v1/ai/parse-order" \
  -H "Content-Type: application/json" \
  -H "X-Restaurant-ID: $RESTAURANT_ID" \
  -d '{"text":"two ghost burgers"}' | sed -n '1,12p'
echo ""

echo "✅ Staging smoke tests complete!"
echo ""
echo "📊 Next: Monitor these metrics for 30-60 minutes:"
echo "  - ai_errors_total{route=~\"parse-order|transcribe|chat\"} → should stay near zero"
echo "  - ai_duration_seconds p95 → should be stable vs pre-merge"
echo "  - 429 responses → rate limiting should not trip under normal load"
echo "  - x-ai-degraded header → should be absent in normal operations"