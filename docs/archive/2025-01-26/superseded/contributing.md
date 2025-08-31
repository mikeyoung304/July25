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

## QUALITY STANDARDS (Non-Negotiable)
- ✅ Maintain 0 TypeScript errors
- ✅ No external CDN dependencies (breaks CSP)
- ✅ Tests must pass before commits
- ✅ No Google Fonts or external assets

### Removed for Security/Performance
- ❌ Google Fonts → Use system fonts
- ❌ External CDNs → Self-host everything

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

## 🔒 OPENAI SECURITY REQUIREMENTS

### CRITICAL: OpenAI Service Integration Only

**NEVER** integrate AI services directly in the frontend. All AI processing goes through OpenAI service via the backend.

### ❌ FORBIDDEN in Client Code
```javascript
// NEVER DO THIS IN FRONTEND
import { OpenAIClient } from 'buildpanel-sdk';  // SECURITY VIOLATION!
const buildPanel = new OpenAIClient({ 
  apiKey: process.env.VITE_OPENAI_KEY  // EXPOSED TO BROWSER!
}); 
// Direct frontend calls to OpenAI service
fetch('http://localhost:3003/api/voice-chat'); // BYPASSES AUTHENTICATION!
```

### ✅ CORRECT Pattern
```javascript
// Frontend: Use backend API (unchanged)
const response = await fetch('/api/v1/ai/transcribe', {
  headers: { 'Authorization': `Bearer ${token}` },
  body: audioFormData
});

// Backend: OpenAI integration is safe here
import { OpenAIService } from './services/buildpanel.service';
const buildPanel = new OpenAIService();
const result = await buildPanel.processVoice(audioBuffer, restaurantId);
```

### Security Checklist
- [ ] NO direct OpenAI client imports in client/ directory
- [ ] NO OpenAI service URLs exposed to frontend
- [ ] ALL AI requests go through authenticated backend endpoints (/api/v1/ai/*)
- [ ] Backend validates auth tokens before OpenAI proxy calls
- [ ] Rate limiting on AI endpoints
- [ ] Restaurant context included in all OpenAI service calls
- [ ] OpenAI service runs isolated on port 3003
- [ ] No direct frontend-to-OpenAI communication

### If You See This Pattern, It's a BUG
- OpenAI client packages in client/package.json
- Direct OpenAI service calls from React components
- Frontend code making requests to port 3003
- Unauthenticated AI endpoints
- OpenAI service URLs in frontend environment variables

See [SECURITY_OPENAI.md](./docs/SECURITY_OPENAI.md) for full details.

## Your Pledge
By reading this document, you pledge to:
- [ ] Never create a service on port 3002
- [ ] Never suggest microservices
- [ ] Always use the unified backend on port 3001
- [ ] Read ARCHITECTURE.md before coding
- [ ] Respect Luis's architectural decision
- [ ] Keep OpenAI service isolated on port 3003
- [ ] Never expose OpenAI service directly to the browser
- [ ] Always proxy AI requests through the unified backend

Remember: **Port 3001 is the way** and **OpenAI (port 3003) handles the AI via backend proxy**