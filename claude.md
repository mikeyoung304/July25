> **Project Briefing: Rebuild 6.0**
> - **Mission**: Evolve a modular Restaurant OS with unified backend architecture
> - **Architecture**: See `ARCHITECTURE.md` for Luis's unified backend decision
> - **Full Project Docs**: Refer to `README.md` for setup and features

---

### **1. 🏛️ Unified Backend Architecture**

- **CRITICAL**: This project uses a UNIFIED BACKEND on port 3001
- **NO MICROSERVICES**: Everything (API + AI + WebSocket) in one Express.js server
- **Directory Structure**: 
  - Frontend in `client/` directory
  - Backend in `server/` directory (includes AI functionality)
  - Shared types in `shared/` directory
- **Service Layer Pattern**: 
  - Frontend services → Express.js API (port 3001)
  - Backend handles all operations including AI/voice
  - NO separate AI Gateway (port 3002 doesn't exist)

- **Key Architecture Points**:
  - One backend service handles everything
  - AI functionality integrated in `server/src/ai/`
  - WebSocket runs on same port (3001)
  - Shared types module for client/server consistency
  - See `ARCHITECTURE.md` for rationale

- **PRIORITY: Multi-Tenancy**: The `RestaurantContext` provides `restaurant_id` for all API calls

### **2. ✅ Quality Gates & Core Commands**

- **`npm run dev`**: Start everything (from root directory)
- **`npm test`**: **MANDATORY** before every commit
- **`npm run lint:fix`**: Ensure code style consistency
- **`npm run typecheck`**: All code must pass TypeScript checks

### **3. 🎯 Current Mission & Session Log**

- **Current State**: Unified backend architecture fully implemented
- **Session Log (Most Recent - January 2025)**:
    - ✅ **Phase 1**: Documentation cleanup (61→20 files)
    - ✅ **Phase 2**: Shared types module & service consolidation
    - ✅ **Phase 3**: Component unification (OrderCard, Voice components)
    - ✅ **Environment Fix**: Resolved OpenAI API key loading
- **Next Steps**:
    1. **Phase 4**: Test Infrastructure improvement
    2. **Phase 5**: Technical Debt Resolution  
    3. **Phase 6**: Performance & Monitoring

### **4. 🚨 Critical Directives (DO NOT)**

- **DO NOT** create separate AI Gateway or suggest port 3002
- **DO NOT** propose microservices architecture
- **DO NOT** modify unified backend architecture without updating ARCHITECTURE.md
- **DO NOT** create complex startup scripts - use `npm run dev`

### **5. 🧠 MCP Servers**

**Available MCP Servers:**
- **`filesystem`**: File operations within `/Users/mikeyoung/CODING`
- **`sequential-thinking`**: Complex analysis and reasoning  
- **`memory`**: Context persistence
- **`git`**: Repository operations

Configuration in `.mcp.json` following [official MCP documentation](https://docs.anthropic.com/en/docs/claude-code/mcp).

### **6. 🔗 Unified API Structure**

**IMPORTANT**: ONE backend service handles everything

#### API Endpoints (all on port 3001):

**Standard API** (`/api/v1/*`):
- Orders, Menu, Tables, etc.

**AI API** (`/api/v1/ai/*`):
- Voice transcription
- Order parsing
- Menu upload

**WebSocket** (`ws://localhost:3001`):
- Real-time updates
- Voice streaming

#### No Separate Services:
- ❌ NO AI Gateway on 3002
- ❌ NO microservices
- ❌ NO service orchestration needed

### **7. 📚 Key Documentation**

1. **ARCHITECTURE.md** - Source of truth for architecture decisions
2. **README.md** - Quick start and overview
3. **CONTRIBUTING_AI.md** - Common pitfalls to avoid
4. **server/README.md** - Backend implementation details

### **8. 🔧 Development Workflow**

```bash
# From root directory
npm install          # Install everything
npm run dev          # Start client + server
npm test             # Run all tests

# From server directory
npm run upload:menu  # Upload menu to AI service
npm run check:integration  # Verify system health
```

### **9. 🔑 Environment Variables**

**CRITICAL**: All environment variables are in the root `.env` file only!
- **NO** `.env` files in client/ or server/ directories
- Both frontend and backend read from root `.env`
- Use `VITE_` prefix only for values safe to expose to frontend
- Sensitive keys (SERVICE_KEY, OPENAI_KEY, DATABASE_URL) are backend-only

### **10. ⚠️ Common Pitfalls**

**web-vitals Import Error (Blank Page After Splash)**
- **Problem**: `import { reportWebVitals } from 'web-vitals'` - This export doesn't exist in v5
- **Solution**: Remove the import. The monitoring service already handles web-vitals correctly
- **Root Cause**: AI-generated code from July 2025 used outdated v3/v4 API pattern
- **Fix Applied**: Removed duplicate initialization from main.tsx

---

**Remember**: 
- Unified backend on port 3001
- No separate AI Gateway
- client/ and server/ directories
- All env vars in root `.env` file only
- See ARCHITECTURE.md for any architecture questions