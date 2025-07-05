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
- **Next Steps**:
    1.  **DB Refactor**: Implement the schema changes needed for multi-tenancy.
    2.  **Real-time KDS**: Wire up Supabase subscriptions for real-time order updates.
    3.  **Routing Logic**: Add logic for routing orders to specific KDS stations.

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