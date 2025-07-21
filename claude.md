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

### **5. 🧠 MCP Directives & Agent Roles**

- **`filesystem`**: **Primary Tool.** For all file operations
- **`desktop`**: For running `npm` scripts and commands
- **`sequential`**: For architectural analysis (respects unified backend)
- **`context7`**: For library documentation only
- **NO AI Gateway references**: All AI code goes in server/src/ai/

**Agent Role Quick Reference:**
- **Architect**: Must respect unified backend decision
- **Builder**: Add features to server/, not new services
- **Validator**: Test on port 3001 only

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

---

**Remember**: 
- Unified backend on port 3001
- No separate AI Gateway
- client/ and server/ directories
- See ARCHITECTURE.md for any architecture questions