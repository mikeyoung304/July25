# 🚀 Grow Fresh - Unified Backend Architecture

## Quick Start (From Root)

```bash
npm install        # Installs everything (root + client + server)
npm run dev        # Starts both server and client
```

That's it! Everything runs from one command.

## What's Running

- **Server** (port 3001) - Unified backend with:
  - REST API: `http://localhost:3001/api/v1`
  - Voice AI: `http://localhost:3001/api/v1/ai`
  - WebSocket: `ws://localhost:3001`
  
- **Client** (port 5173) - React frontend

## Project Structure

```
rebuild-6.0/
├── client/          # All frontend code
│   ├── src/
│   ├── public/
│   └── package.json
├── server/          # Unified backend (API + AI + WebSocket)
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── ai/      # AI functionality integrated
│   └── package.json
└── package.json     # Root orchestration
```

## Development Commands

### From root directory:
- `npm run dev` - Start everything
- `npm run build` - Build both client and server
- `npm run test` - Run all tests

### From server directory:
- `npm run upload:menu` - Upload menu to AI service
- `npm run check:integration` - Verify all systems

## Architecture Benefits

1. **One Backend** - No microservices complexity
2. **Unified Port** - Everything on 3001 (except frontend)
3. **Simplified Deployment** - One server to deploy
4. **Easier Development** - No port juggling

---

Per Luis's architecture decision: "Everything in one backend"