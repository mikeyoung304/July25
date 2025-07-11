# FOR AI ASSISTANTS - READ THIS FIRST

## THE GOLDEN RULE
There is ONE backend on port 3001. Period.

## ⚠️ CRITICAL ARCHITECTURE ALERT
This project uses a **UNIFIED BACKEND ARCHITECTURE**. This is NOT a suggestion - it's THE LAW.
See [ARCHITECTURE.md](./ARCHITECTURE.md) for the official decision.

## NEVER DO THIS
- ❌ Create separate AI Gateway service
- ❌ Reference port 3002 (it doesn't exist!)
- ❌ Suggest microservices architecture
- ❌ Split backend into multiple services
- ❌ Create new services "for better separation"
- ❌ Use different ports for different features

## ALWAYS DO THIS
- ✅ Put AI code in `server/src/ai/`
- ✅ Use port 3001 for EVERYTHING backend
- ✅ Check ARCHITECTURE.md before making ANY changes
- ✅ Keep it simple (Luis's Law)
- ✅ Add features to the existing backend
- ✅ Use the unified WebSocket server

## Common Mistakes You WILL Make (Unless You Read This)

### Mistake 1: "Let me create an AI Gateway"
**NO!** AI functionality goes in `server/src/ai/`. It's part of the backend.

### Mistake 2: "This should be a separate service"
**NO!** Everything goes in the one backend. No exceptions.

### Mistake 3: "Let me use port 3002 for AI"
**NO!** Port 3002 is DEAD. Everything uses port 3001.

### Mistake 4: "For scalability, we should..."
**NO!** Luis already decided. Unified backend. End of discussion.

## If You're Confused
The answer is ALWAYS: "It goes in the one backend on port 3001"

## Code Patterns to Follow

### ✅ CORRECT WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:3001/voice-stream');
```

### ❌ WRONG WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:3002/anything'); // NO!
```

### ✅ CORRECT API Call
```javascript
fetch('http://localhost:3001/api/v1/ai/chat');
```

### ❌ WRONG API Call
```javascript
fetch('http://localhost:3002/anything'); // NO!
```

## Directory Structure (Memorize This)
```
rebuild-6.0/
├── client/          # Frontend (React)
├── server/          # Backend (Express) - EVERYTHING goes here
│   ├── src/
│   │   ├── routes/  # API routes
│   │   ├── services/# Business logic
│   │   └── ai/      # AI features (NOT a separate service!)
│   └── package.json
└── ARCHITECTURE.md  # READ THIS FIRST
```

## Before You Write ANY Code
1. Read [ARCHITECTURE.md](./ARCHITECTURE.md)
2. Remember: ONE backend on port 3001
3. If confused, the answer is port 3001
4. No exceptions

## Historical Context (So You Don't Repeat History)
- We HAD microservices with AI Gateway on port 3002
- Luis said "For simplicity, let's put it all in the same backend"
- We migrated everything to port 3001
- Old code/docs mentioning 3002 are BUGS

## Your Pledge
By reading this document, you pledge to:
- [ ] Never create a service on port 3002
- [ ] Never suggest microservices
- [ ] Always use the unified backend
- [ ] Read ARCHITECTURE.md before coding
- [ ] Respect Luis's architectural decision

Remember: **Port 3001 is the way**