> **Project Briefing: Rebuild 6.0**
> - **Mission**: Evolve a modular Restaurant OS by integrating advanced AI-driven workflows.
> - **Full Project Docs**: Refer to `README.md` for a complete feature list, architecture, and available `npm` scripts.

---

### **1. 🏛️ Architectural Mandates**

- **MUST Adhere to Modular Architecture**: As defined in `README.md`, all new features MUST be built within the `src/modules/` directory. Use the existing structure as a blueprint.
- **MUST Use Service Layer**: The `/services` directory is the ONLY integration point with the Supabase backend. All data access MUST go through this layer.
- **PRIORITY: Multi-Tenancy**: The `RestaurantContext` is the core of our multi-tenant strategy. Your immediate architectural priority is to analyze its current implementation and refactor it based on the patterns from `plate-clean-test` to ensure robust multi-location support.
- **PRIORITY: Real-time Updates**: All new features requiring real-time data MUST use Supabase subscriptions, following the existing patterns.

### **2. ✅ Quality Gates & Core Commands**

- **`npm test`**: **MANDATORY** before every commit. Refer to the `README.md` for specific testing commands like `npm test -- --coverage`.
- **`npm run lint:fix`**: Run this command to ensure code style consistency.
- **`npm run typecheck`**: All code must pass TypeScript checks before PR submission.

### **3. 🎯 Current Mission & Session Log**

- **Current Task**: Update the database schema to support the multi-tenant architecture and then implement real-time KDS order updates.
- **Session Log (Most Recent)**:
    - ✅ **TDD Complete**: Implemented `KDSOrderCard` with 8 passing tests and performance memoization.
    - ✅ **Config Synced**: Transferred `.env.local` configuration from a reference project.
    - ✅ **Schema Documented**: Analyzed and noted differences in database architecture.
    - ✅ **Linting Fixed**: Resolved all 59 ESLint errors, improved test coverage.
    - ✅ **Lean Architecture Planned**: Documented path to 40% file reduction.
- **Next Steps**:
    1.  **Lean Refactor**: Execute modular refinement plan for cleaner codebase.
    2.  **DB Refactor**: Implement the schema changes needed for multi-tenancy.
    3.  **Real-time KDS**: Wire up Supabase subscriptions for real-time order updates.

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

### **6. 🔧 Advanced Command Toolkit**

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