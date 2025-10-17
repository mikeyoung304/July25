# Voice Ordering Manual Repro — Checklist

## A. Environment & URLs
- ✅ App URL used (local or staging):
- ✅ Backend API/WebSocket base URL:
- ✅ Browser (name+version), OS:
- ✅ HTTPS? (yes/no). If local, was "insecure origins treated as secure" enabled?

## B. Permissions
- ✅ Mic permission prompt appeared? (yes/no)
- ✅ Final mic permission state: granted / denied / prompt

## C. Client Console (copy exact lines)
- Errors (stack traces), Warnings, and relevant Infos during:
  1) Page load
  2) Click "Connect"/start
  3) Speaking
  4) Disconnect/reconnect events
(Paste logs here…)

## D. Network → WebSocket
- WS URL actually used:
- Request headers show JWT/bearer? (y/n)
- First 10 frames (type + brief contents):
- Heartbeat interval observed (ms):

## E. Server/Render Logs
- Timestamp window:
- Connection accepted? room/join?
- Any auth errors / 401s / CORS?
- Disconnect reason?

## F. .env (REDACTED)
- VOICE_PROVIDER=
- WS / API endpoints:
- Any flags related to voice/debug:

## G. What happened vs expected
- Observed:
- Expected:
- Repro frequency:
