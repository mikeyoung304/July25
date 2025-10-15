# KDS Order Flow (Operations)

## Overview
Kitchen Display System (KDS) shows live orders and status changes in real time via WebSockets.

## Steps in service
1. Orders placed from Server UI appear in KDS within ~1s (P95).
2. Tap to advance status; changes propagate to other stations.
3. Filters and views can be customized per station.

## Reliability (current code)
- Single WebSocket connection guard per client.
- Stable effect dependencies with explicit cleanup to prevent duplicate subscriptions.
- Reconnect logic uses try/finally to avoid stuck flags.

## Troubleshooting quick checks
- Refresh page; guards should recover.
- In dev, check `window.__dbgWS` counters (connectCount, subCount).
- If updates lag: check network, server logs, or auth token expiry.

For deeper incidents, see TROUBLESHOOTING.
