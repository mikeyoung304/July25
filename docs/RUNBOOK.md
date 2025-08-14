# Rebuild 6.0 Runbook

## Pre-deploy Voice Checks

Before deploying voice features, run these checks:

1. **Verify OpenAI API key is set**: `echo $OPENAI_API_KEY | head -c 10`
2. **Check realtime model config**: `echo $OPENAI_REALTIME_MODEL` (defaults to gpt-4o-realtime-preview-2024-10-01)
3. **Start the server**: `npm run dev:server`
4. **Run handshake test**: `npm run voice:smoke`
   - Expected: `{ "ok": true, "model": "...", "handshakeMs": ..., "note": "realtime:v1" }`
   - If fails: Check API key, network, and model availability
5. **Verify headers**: The handshake will fail with hint if OpenAI-Beta header is missing
6. **Check logs**: Server should show `[voice] realtime model: <model>` at startup

## Common Issues

### Handshake fails with 502
- Check OPENAI_API_KEY is valid
- Verify network connectivity to api.openai.com
- Check if model is available in your OpenAI account

### Missing OpenAI-Beta header
- The handshake endpoint will provide hint: "Missing OpenAI-Beta: realtime=v1"
- This indicates a regression in the adapter code

### Model not found
- Set OPENAI_REALTIME_MODEL to a valid model snapshot
- Default: gpt-4o-realtime-preview-2024-10-01
- Check OpenAI docs for latest available models

## Emergency Fallback

If voice system fails:
1. Set `AI_DEGRADED_MODE=true` in environment
2. This disables AI features but keeps core ordering functional
3. Monitor logs for recovery attempts