---
owner: Mike Young
status: green
last_verified_date: 2025-09-15
last_verified_commit: feature/payment-integration-voice-customer
version: v0.2
---

# Actual Deployment Configuration

## Build Commands

Per `package.json`:
- **Production Build**: `npm run build` → Runs server build with 4GB memory
- **Client Build**: `npm run build:client` → Vite build in client/dist
- **Server Build**: `npm run build:server` → TypeScript compile to server/dist
- **Start Production**: `npm start` → Runs `cd server && npm start`

## Deployment Targets

### Client (Frontend)
- **Build Output**: `client/dist/`
- **Dev Server**: http://localhost:5173
- **Production Host**: Not specified (likely Vercel/Netlify based on Vite config)
- **Entry Point**: `client/index.html`

### Server (Backend)
- **Build Output**: `server/dist/`
- **Dev Server**: http://localhost:3001
- **Production Host**: Likely Render (build:render script present)
- **Entry Point**: `server/dist/server.js`
- **Process Manager**: Not specified (PM2/systemd likely)

## Required Environment Variables

From `server/.env.example` (names only):
- `NODE_ENV`
- `PORT`
- `HOST`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_JWT_SECRET`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `KIOSK_JWT_SECRET`
- `OPENAI_API_KEY`
- `SQUARE_ACCESS_TOKEN` (detected: sandbox environment)
- `SQUARE_ENVIRONMENT` (detected: sandbox)
- `SQUARE_LOCATION_ID` (detected: configured)
- `FRONTEND_URL`
- `CORS_ALLOWED_ORIGINS`
- `DEFAULT_RESTAURANT_ID`

## Health Check Endpoints

Per server routes inspection:
- **Main Health**: `GET /health` (returns server status)
- **AI Health**: `GET /api/v1/ai/health` (checks AI services)
- **Voice Handshake**: `GET /api/v1/ai/voice/handshake` (WebRTC readiness)

## Memory Requirements

- **Build**: 4GB max (`NODE_OPTIONS='--max-old-space-size=4096'`)
- **Runtime**: Not specified (default Node.js limits)
- **Optimized**: Down from 12GB to 4GB per CLAUDE.md

## Port Configuration

- **Backend**: 3001 (unified, no more 3002/AI_GATEWAY)
- **Frontend Dev**: 5173 (Vite default)
- **WebSocket**: Same as backend (3001)