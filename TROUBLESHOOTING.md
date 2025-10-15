# Troubleshooting

## KDS shows infinite spinner or duplicate updates

**Symptoms:** KDS stuck on "Loading…"; duplicate order events; CPU spike.

**Root causes (historical):**
- Double WebSocket initialization
- Unstable useEffect dependencies; missing cleanup
- Reconnect flag not resetting on error

**Fix (current code):**
- Single-connection guard (`isConnecting` + `connectionPromise`)
- Stable effect deps; cleanup unsubscribes before disconnect
- Reconnect scheduled with try/finally to always reset flag

**What to do now:**
1. Refresh the page; it should recover (guards are in place).
2. If it persists, check WS counters in dev tools (`window.__dbgWS`) and server logs for reconnect storms.
3. Open an issue with timestamps and the last 200 lines of client/server logs.
