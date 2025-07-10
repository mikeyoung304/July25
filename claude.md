> **Project Briefing: Rebuild 6.0**
> - **Mission**: Evolve a modular Restaurant OS by integrating advanced AI-driven workflows.
> - **Full Project Docs**: Refer to `README.md` for a complete feature list, architecture, and available `npm` scripts.

---

### **1. 🏛️ Architectural Mandates**

- **MUST Adhere to Modular Architecture**: As defined in `README.md`, all new features MUST be built within the `src/modules/` directory.

- **MUST Adhere to the API Service Layer Pattern**:
    - The frontend application **NEVER** communicates directly with the database (Supabase).
    - The `src/services` directory is the ONLY integration point between the frontend and the backend.
    - This service layer makes HTTP requests (e.g., GET, POST) to the **Express.js server** managed by our backend architect, Luis.
    - The Express.js server is solely responsible for all database interactions.
    - For development, this service layer will return mocked data until a real endpoint from Luis is available.

- **PRIORITY: Multi-Tenancy**: The `RestaurantContext` is the core of our multi-tenant strategy. It must be used to provide the necessary `restaurant_id` for all relevant API calls to the Express.js backend.

### **2. ✅ Quality Gates & Core Commands**

- **`npm test`**: **MANDATORY** before every commit. Refer to the `README.md` for specific testing commands like `npm test -- --coverage`.
- **`npm run lint:fix`**: Run this command to ensure code style consistency.
- **`npm run typecheck`**: All code must pass TypeScript checks before PR submission.

### **3. 🎯 Current Mission & Session Log**

- **Current Task**: Continue Phase 3 implementation - E2E testing and final hardening.
- **Session Log (Most Recent)**:
    - ✅ **Project Janus Phase 1 Complete**: Implemented HTTP client with Luis's API specifications.
    - ✅ **Case Transformation**: Built utilities for camelCase/snake_case conversion with full test coverage.
    - ✅ **Service Adapter Pattern**: Created base pattern for gradual migration from mock to real API.
    - ✅ **Kitchen Display Fixed**: Resolved performance issues with memoization and stable callbacks.
    - ✅ **Floor Plan Service**: Implemented save/load functionality with localStorage fallback.
    - ✅ **WebSocket Service**: Built real-time order updates infrastructure (ready for Luis's backend).
    - ✅ **All Tests Passing**: 229 tests passing with comprehensive coverage.
- **Next Steps**:
    1.  **E2E Testing**: Create comprehensive end-to-end tests for voice-to-kitchen workflow.
    2.  **Service Migration**: Continue migrating remaining services to HttpServiceAdapter pattern.
    3.  **Documentation**: Update technical documentation with integration patterns.

### **4. 🚨 Critical Directives (DO NOT)**

- **DO NOT** modify the Supabase client config in `services/supabaseClient.ts` without explicit instruction.
- **DO NOT** introduce new dependencies (`npm install ...`) without approval.
- **DO NOT** alter the core build process in `vite.config.ts`.

### **5. 🧠 MCP Directives & Agent Roles**

- **`filesystem`**: **Primary Tool.** For all file reading, writing, and searching.
- **`desktop`**: For running `npm` scripts and other shell commands.
- **`sequential`**: **For Complex Problems.** Use for architectural analysis, complex debugging, and refactoring plans.
- **`context7`**: For external library documentation (React, TS, Supabase, etc.).
- **`github`**: For all Git operations and PR management.
- **`puppeteer`/`playwright`**: For End-to-End (E2E) testing and live app inspection.

**Agent Role Quick Reference:**
-   **Architect**: Uses `sequential` + `filesystem` for planning.
-   **Builder**: Uses `filesystem` + `desktop` for coding and testing.
-   **Validator**: Uses `desktop` + `puppeteer` for validation and E2E checks.

### **6. 🔗 API Integration Layer (Project Janus)**

**IMPORTANT**: The frontend is now equipped with a complete API integration layer ready for Luis's Express.js backend.

#### Core Components:

**HTTP Client** (`src/services/http/httpClient.ts`):
- Automatic Supabase JWT authentication in `Authorization` header
- Multi-tenant support via `X-Restaurant-ID` header
- Automatic case transformation (camelCase ↔ snake_case)
- Status code-based error handling
- Configuration via `VITE_API_BASE_URL` environment variable

**Service Adapter Pattern** (`src/services/base/HttpServiceAdapter.ts`):
- Base class for all services requiring API integration
- Seamless switching between mock and real API modes
- Maintains backward compatibility during migration
- Example implementation: `OrderService.migrated.ts`

**WebSocket Service** (`src/services/websocket/`):
- Real-time order updates for Kitchen Display
- Automatic reconnection with exponential backoff
- Message queueing for offline resilience
- Event-based architecture for order state changes

**Case Transformation** (`src/services/utils/caseTransform.ts`):
- Deep object transformation between naming conventions
- Handles nested objects, arrays, and Date objects
- ISO date string to Date object conversion
- Query parameter transformation support

#### Migration Guide:

1. **For New Services**: Extend `HttpServiceAdapter` and implement both mock and real methods
2. **For Existing Services**: Create `.migrated.ts` version following OrderService pattern
3. **Environment Setup**: Set `VITE_API_BASE_URL=http://localhost:3001` for local development
4. **Authentication**: Ensure user is logged in via Supabase for API calls to work

#### Luis's API Contract:
```typescript
// Request Headers
Authorization: Bearer <supabase-jwt>
X-Restaurant-ID: <restaurant-id>
Content-Type: application/json

// Data Format
- Request body: snake_case
- Response body: snake_case (auto-converted to camelCase)
- No response envelope (direct data return)
- Status code-based error handling
```

### **7. 🔧 Advanced Command Toolkit**

**NEW**: This project now includes an advanced multi-agent orchestration toolkit located in `.claude/commands/`. These are specialized, on-demand workflows that can be invoked for complex development scenarios.

#### Available Commands:

**🎯 Core Development Workflows:**
- **`/m-orchestrated-dev`**: Launch full multi-agent development cycle with Orchestrator, Developer, and Reviewer agents
- **`/m-task-planner`**: Systematic task decomposition with dependency mapping and visualization
- **`/m-tdd-planner`**: Test-driven development planning with comprehensive test strategies

**🔍 Code Quality & Review:**
- **`/m-review-code`**: Comprehensive code review with actionable feedback
- **`/m-security-scan`**: Security vulnerability assessment and recommendations
- **`/m-debate-code`**: Multi-perspective code analysis for optimal solutions
- **`/m-debate-architecture`**: Architectural decision debates with trade-off analysis

**📝 Project Management:**
- **`/m-commit-push`**: Intelligent commit message generation and git workflow
- **`/m-document-update`**: Automated documentation updates based on code changes
- **`/m-project-cleanup`**: Identify and remove dead code, optimize structure
- **`/m-branch-prune`**: Clean up stale branches with safety checks

**🧪 Testing & Quality:**
- **`/m-test-generation`**: Generate comprehensive test suites for existing code
- **`/m-bug-fix`**: Systematic bug investigation and resolution workflow

**📊 Context Management:**
- **`/m-next-task`**: Intelligent task selection based on project state
- **`/m-next-context`**: Context preparation for seamless session handoffs

#### Command Usage:
To invoke any command, simply reference it by name (e.g., "Let's use /m-orchestrated-dev to implement the new feature"). Each command follows a structured multi-agent pattern with:
- Clear role definitions (Orchestrator, Developer, Reviewer)
- Evidence-based decision making
- Built-in quality gates
- Iterative refinement cycles

#### Command Philosophy:
These commands implement advanced AI collaboration patterns where multiple specialized agents work together, each bringing unique perspectives and validation to ensure high-quality outcomes. They emphasize:
- Research-driven development
- Systematic problem decomposition
- Continuous quality validation
- Clear documentation of decisions

---

**Remember**: The toolkit commands are powerful accelerators for complex tasks but should be used judiciously. For simple tasks, direct implementation remains the most efficient approach.