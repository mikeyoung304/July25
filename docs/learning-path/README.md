# Learning Path & Prerequisites

**Audience:** CS Students & New Developers
**Last Updated:** 2025-11-01
**Time to Complete:** 8-12 hours for full comprehension

---

## Table of Contents

1. [How to Use This Guide](#1-how-to-use-this-guide)
2. [Prerequisites](#2-prerequisites)
3. [Recommended Reading Order](#3-recommended-reading-order)
4. [Phase-by-Phase Learning Path](#4-phase-by-phase-learning-path)
5. [Hands-On Exercises](#5-hands-on-exercises)
6. [Common Pitfalls](#6-common-pitfalls)
7. [Assessment Checklist](#7-assessment-checklist)

---

## 1. How to Use This Guide

### 1.1 Purpose

This guide provides a **structured learning path** for mastering the Restaurant OS codebase. It's designed for:
- **CS students** learning full-stack development
- **New team members** onboarding to the project
- **Contributors** wanting to understand the system deeply
- **Instructors** teaching modern web development

### 1.2 Learning Philosophy

**Progressive Complexity:**
- Start with high-level concepts
- Gradually dive into technical details
- Build hands-on experience incrementally
- Connect theory to practice

**Active Learning:**
- Read documentation
- Run code locally
- Make small changes
- Debug issues
- Ask questions

**Depth vs. Breadth:**
- Master core concepts before advanced topics
- Understand "why" before "how"
- Focus on patterns, not memorization

### 1.3 Time Commitment

**Minimum (Basic Comprehension):** 4-6 hours
- Understand application purpose
- Set up local environment
- Make basic code changes

**Recommended (Full Comprehension):** 8-12 hours
- Master architecture patterns
- Understand all major subsystems
- Complete hands-on exercises
- Ready to contribute

**Expert (Deep Dive):** 20+ hours
- Study all ADRs and design decisions
- Review git history and evolution
- Understand production incidents
- Contribute to architecture

---

## 2. Prerequisites

### 2.1 Required Knowledge

**Essential (Must Have):**
- JavaScript fundamentals (ES6+)
- Basic understanding of:
  - Variables, functions, objects, arrays
  - Promises and async/await
  - Modules and imports
- Git basics (clone, commit, push)
- Command line navigation

**Helpful (Nice to Have):**
- TypeScript basics
- React fundamentals
- Node.js / Express basics
- SQL / Database concepts
- REST API concepts

### 2.2 Technical Prerequisites

**Software to Install:**
- ✅ Node.js 20.x ([Download](https://nodejs.org))
- ✅ npm 10.7.0+ (comes with Node.js)
- ✅ Git ([Download](https://git-scm.com))
- ✅ Code editor (VS Code recommended)
- ✅ Browser (Chrome/Edge recommended for DevTools)

**Accounts to Create:**
- ✅ GitHub account
- ✅ Supabase account (free tier)
- ✅ Square developer account (sandbox)
- ✅ OpenAI account (paid API access)

**Verify Installation:**
```bash
node --version    # Should be v20.x.x
npm --version     # Should be 10.7.0+
git --version     # Any recent version
```

### 2.3 Recommended Tutorials (If Needed)

**JavaScript/TypeScript:**
- [JavaScript.info](https://javascript.info) - Modern JavaScript tutorial
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

**React:**
- [React Official Tutorial](https://react.dev/learn)
- [React Hooks](https://react.dev/reference/react)

**Node.js/Express:**
- [Node.js Guides](https://nodejs.org/en/docs/guides/)
- [Express Tutorial](https://expressjs.com/en/starter/installing.html)

**PostgreSQL:**
- [PostgreSQL Tutorial](https://www.postgresqltutorial.com/)
- [Supabase Quickstart](https://supabase.com/docs/guides/getting-started)

---

## 3. Recommended Reading Order

### 3.1 Quick Start (1-2 hours)

**For Absolute Beginners:**
1. **Start Here:**  ← You are here!
2. **App Overview:** [01_APP_OVERVIEW.md](./01_APP_OVERVIEW.md)
3. **Git History:** [05_GIT_HISTORY_MILESTONES.md](./05_GIT_HISTORY_MILESTONES.md)

**Outcome:** Understand what Restaurant OS is, why it exists, and its evolution.

### 3.2 Understanding the System (2-3 hours)

**Core Concepts:**
1. **Documentation Organization:** [02_DOCUMENTATION_ORGANIZATION.md](./02_DOCUMENTATION_ORGANIZATION.md)
2. **Architecture:** [docs/explanation/architecture/ARCHITECTURE.md](../explanation/architecture/ARCHITECTURE.md)
3. **Authentication:** [docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md](../explanation/architecture/AUTHENTICATION_ARCHITECTURE.md)

**Outcome:** Understand system architecture, documentation structure, and security patterns.

### 3.3 Hands-On Setup (1-2 hours)

**Get It Running:**
1. **Environment Setup:** [04_ENVIRONMENT_SETUP.md](./04_ENVIRONMENT_SETUP.md)
2. **Getting Started:** [docs/tutorials/GETTING_STARTED.md](../tutorials/GETTING_STARTED.md)

**Outcome:** Application running locally on your machine.

### 3.4 Deep Dive (3-4 hours)

**Advanced Topics:**
1. **GitHub Workflows:** [03_GITHUB_WORKFLOWS_CICD.md](./03_GITHUB_WORKFLOWS_CICD.md)
2. **Key ADRs:**
   - [ADR-002: Multi-Tenancy](../explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md)
   - [ADR-003: Embedded Orders](../explanation/architecture-decisions/ADR-003-embedded-orders-pattern.md)
   - [ADR-006: Dual Authentication](../explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md)
3. **Git Patterns:** [06_GIT_PATTERNS_IMPROVEMENTS.md](./06_GIT_PATTERNS_IMPROVEMENTS.md)

**Outcome:** Understand design decisions, CI/CD pipeline, and common pitfalls.

### 3.5 Reference Material (Ongoing)

**Look Up as Needed:**
- [API Reference](../../README.md)
- [Database Schema](../DATABASE.md)
- [Environment Variables](../reference/config/ENVIRONMENT.md)
- [WebSocket Events](../reference/api/WEBSOCKET_EVENTS.md)

**Outcome:** Know where to find technical details when implementing features.

---

## 4. Phase-by-Phase Learning Path

### Phase 1: Understanding the System (1-2 hours)

**Goal:** Grasp the big picture before diving into code.

**Documents to Read:**
1.  ← Start here
2. [01_APP_OVERVIEW.md](./01_APP_OVERVIEW.md) - What is Restaurant OS?
3. [05_GIT_HISTORY_MILESTONES.md](./05_GIT_HISTORY_MILESTONES.md) - How did it evolve?

**Key Questions to Answer:**
- What problem does Restaurant OS solve?
- What are the main features?
- What technologies does it use?
- How has it evolved over time?

**Activities:**
- [ ] Read all three documents
- [ ] Write a 1-paragraph summary of what Restaurant OS does
- [ ] List the 5 main technologies used

**Success Criteria:**
You can explain Restaurant OS to a non-technical friend in 2 minutes.

---

### Phase 2: Documentation System (30 minutes)

**Goal:** Learn how documentation is organized so you can find information later.

**Documents to Read:**
1. [02_DOCUMENTATION_ORGANIZATION.md](./02_DOCUMENTATION_ORGANIZATION.md)
2. [docs/README.md](../../README.md)

**Key Questions to Answer:**
- What is the Diátaxis framework?
- Where do I find how-to guides vs. reference docs?
- How do I know if documentation is up-to-date?

**Activities:**
- [ ] Understand the 4 documentation types (Tutorial, How-To, Reference, Explanation)
- [ ] Explore the `docs/` directory structure
- [ ] Find where API endpoints are documented

**Success Criteria:**
Given a question, you can quickly find the right documentation category.

---

### Phase 3: Local Setup (1-2 hours)

**Goal:** Get the application running on your computer.

**Documents to Read:**
1. [04_ENVIRONMENT_SETUP.md](./04_ENVIRONMENT_SETUP.md)
2. [docs/tutorials/GETTING_STARTED.md](../tutorials/GETTING_STARTED.md)

**Key Questions to Answer:**
- What services do I need to set up?
- What are VITE_ prefixed variables?
- How do I know if everything is working?

**Activities:**
- [ ] Clone the repository
- [ ] Install dependencies
- [ ] Create Supabase account and project
- [ ] Configure .env file
- [ ] Apply database migrations
- [ ] Start development servers
- [ ] Open app in browser at http://localhost:5173

**Success Criteria:**
- Client runs on http://localhost:5173
- Server runs on http://localhost:3001
- No errors in terminal
- Can see login page in browser

**Common Issues:**
- Port 3001 already in use → `lsof -i :3001` and `kill -9 [PID]`
- Missing VITE_ prefix → Check all client vars have `VITE_`
- Database connection fails → Verify Supabase credentials

---

### Phase 4: Architecture Deep Dive (2-3 hours)

**Goal:** Understand how the system is designed and why.

**Documents to Read:**
1. [docs/explanation/architecture/ARCHITECTURE.md](../explanation/architecture/ARCHITECTURE.md)
2. [docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md](../explanation/architecture/AUTHENTICATION_ARCHITECTURE.md)
3. [ADR-002: Multi-Tenancy](../explanation/architecture-decisions/ADR-002-multi-tenancy-architecture.md)
4. [ADR-003: Embedded Orders](../explanation/architecture-decisions/ADR-003-embedded-orders-pattern.md)
5. [ADR-006: Dual Authentication](../explanation/architecture-decisions/ADR-006-dual-authentication-pattern.md)

**Key Questions to Answer:**
- How does multi-tenancy work?
- Why are order items stored as JSONB?
- What are the different authentication methods?
- How does real-time communication work?

**Activities:**
- [ ] Draw a diagram of the system architecture
- [ ] Trace an order from creation to completion
- [ ] Understand the authentication flow
- [ ] Identify the 3 layers of multi-tenancy protection

**Success Criteria:**
You can explain:
- Why orders use JSONB instead of separate table
- How restaurant data is isolated
- The difference between Supabase auth and custom auth
- How WebSocket events propagate

---

### Phase 5: Hands-On Development (2-3 hours)

**Goal:** Make your first code changes and understand the development workflow.

**Documents to Read:**
1. [docs/how-to/development/DEVELOPMENT_PROCESS.md](../how-to/development/DEVELOPMENT_PROCESS.md)
2. [docs/how-to/development/CONTRIBUTING.md](../../CONTRIBUTING.md)

**Activities:**
See [Hands-On Exercises](#5-hands-on-exercises) section below

**Success Criteria:**
- Made a component change and saw it live
- Created a database migration
- Added an API endpoint
- Ran tests successfully
- Committed changes with proper message

---

### Phase 6: CI/CD & Quality (1-2 hours)

**Goal:** Understand automated testing, deployment, and quality gates.

**Documents to Read:**
1. [03_GITHUB_WORKFLOWS_CICD.md](./03_GITHUB_WORKFLOWS_CICD.md)
2. [06_GIT_PATTERNS_IMPROVEMENTS.md](./06_GIT_PATTERNS_IMPROVEMENTS.md)
3. [scripts/README.md](../../README.md)

**Key Questions to Answer:**
- What happens when I push code?
- How do migrations get deployed?
- What is drift detection?
- What quality checks run in CI?

**Activities:**
- [ ] Run `npm run docs:drift` locally
- [ ] Understand the 22 GitHub Actions workflows
- [ ] Review a past PR to see CI checks
- [ ] Run pre-commit hooks manually

**Success Criteria:**
You can explain:
- The database-first deployment strategy
- How drift detection prevents doc staleness
- What checks must pass before merging
- Common deployment pitfalls (from Phase 6 doc)

---

## 5. Hands-On Exercises

### Exercise 1: Add a New React Component (Beginner)

**Goal:** Understand React component structure

**Steps:**
1. Navigate to `client/src/components/`
2. Create new folder `HelloWorld/`
3. Create `HelloWorld.tsx`:
```typescript
import React from 'react';

export function HelloWorld() {
  return (
    <div className="p-4 bg-blue-100 rounded">
      <h2 className="text-xl font-bold">Hello from Restaurant OS!</h2>
      <p>This is my first component.</p>
    </div>
  );
}
```
4. Import in a page (e.g., `client/src/pages/Dashboard.tsx`)
5. See it render in browser

**What You Learned:**
- Component file structure
- TypeScript in React
- Tailwind CSS classes
- Hot module replacement

---

### Exercise 2: Add an API Endpoint (Intermediate)

**Goal:** Understand backend routing and middleware

**Steps:**
1. Open `server/src/routes/test.routes.ts` (or create if doesn't exist)
2. Add new route:
```typescript
router.get('/hello', (req, res) => {
  res.json({ message: 'Hello from API!', timestamp: new Date() });
});
```
3. Import in `server/src/index.ts`
4. Test with curl:
```bash
curl http://localhost:3001/api/test/hello
```

**What You Learned:**
- Express routing
- Route file organization
- JSON responses
- Testing API endpoints

---

### Exercise 3: Create a Database Migration (Intermediate)

**Goal:** Understand database schema changes

**Steps:**
1. Create migration:
```bash
npx supabase migration new add_test_table
```
2. Edit generated file in `supabase/migrations/`:
```sql
-- Create test table
CREATE TABLE test_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policy
ALTER TABLE test_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their restaurant's messages"
ON test_messages FOR ALL
USING (restaurant_id = auth.restaurant_id());
```
3. Apply migration:
```bash
npm run db:push
```
4. Verify in Supabase dashboard

**What You Learned:**
- Migration workflow
- SQL syntax
- Row-Level Security (RLS)
- Multi-tenancy enforcement

---

### Exercise 4: Add TypeScript Type (Intermediate)

**Goal:** Understand shared types

**Steps:**
1. Open `shared/types/index.ts`
2. Add new type:
```typescript
export interface TestMessage {
  id: string;
  restaurant_id: string;
  message: string;
  created_at: string;
}
```
3. Use in server route:
```typescript
import { TestMessage } from '../../shared/types';

router.get('/messages', async (req, res) => {
  const messages: TestMessage[] = await db
    .select()
    .from('test_messages')
    .where('restaurant_id', req.restaurantId);

  res.json(messages);
});
```
4. Run typecheck:
```bash
npm run typecheck
```

**What You Learned:**
- Shared types between client/server
- TypeScript interfaces
- Type safety benefits
- Monorepo structure

---

### Exercise 5: Write a Test (Advanced)

**Goal:** Understand testing patterns

**Steps:**
1. Create test file: `server/src/routes/test.routes.test.ts`
2. Write test:
```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('Test Routes', () => {
  it('should return hello message', async () => {
    const response = await request(app)
      .get('/api/test/hello')
      .expect(200);

    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Hello from API!');
  });
});
```
3. Run test:
```bash
npm run test:server
```

**What You Learned:**
- Vitest testing framework
- API integration testing
- Test structure (describe, it, expect)
- Continuous testing

---

### Exercise 6: Fix Documentation Drift (Advanced)

**Goal:** Understand drift detection and documentation maintenance

**Steps:**
1. Add a new column to orders table:
```sql
ALTER TABLE orders ADD COLUMN notes TEXT;
```
2. Apply migration:
```bash
npm run db:push
```
3. Run drift detection:
```bash
npm run docs:drift:schema
```
4. See error: "Column 'notes' not documented"
5. Update `docs/reference/schema/DATABASE.md`:
```markdown
| notes | text | No | - | Additional order notes |
```
6. Run drift check again:
```bash
npm run docs:drift:schema
# Should pass now
```

**What You Learned:**
- How drift detection works
- Importance of documentation
- CI automation benefits
- Documentation standards

---

## 6. Common Pitfalls

### 6.1 Environment Variables

**Mistake:** Forgetting VITE_ prefix on client variables
```bash
❌ API_BASE_URL=http://localhost:3001
✅ VITE_API_BASE_URL=http://localhost:3001
```

**Why It Matters:** Client won't have access to variable, causing "undefined" errors

**How to Avoid:**
- Always use VITE_ prefix for client vars
- Run `npm run env:check`
- Check browser console for undefined vars

---

### 6.2 Multi-Tenancy

**Mistake:** Forgetting to filter by restaurant_id
```typescript
❌ const orders = await db.select().from('orders');
✅ const orders = await db.select().from('orders')
                      .where('restaurant_id', restaurantId);
```

**Why It Matters:** Security vulnerability - users see other restaurants' data

**How to Avoid:**
- ALWAYS include restaurant_id filter
- Use RLS policies as defense-in-depth
- Review "Git Patterns" document for examples

---

### 6.3 Database Migrations

**Mistake:** Editing already-applied migrations
```bash
❌ Edit supabase/migrations/20250101_initial.sql  # Already applied!
✅ npx supabase migration new fix_issue           # Create new migration
```

**Why It Matters:** Migrations are immutable - editing causes inconsistencies

**How to Avoid:**
- Never edit applied migrations
- Create new migration to fix issues
- Use migration versioning properly

---

### 6.4 WebSocket Memory Leaks

**Mistake:** Not cleaning up connections
```typescript
❌ useEffect(() => {
     const ws = new WebSocket(url);
     setInterval(ping, 30000);  // Leak!
   }, []);

✅ useEffect(() => {
     const ws = new WebSocket(url);
     const interval = setInterval(ping, 30000);
     return () => {
       ws.close();
       clearInterval(interval);
     };
   }, []);
```

**Why It Matters:** Memory grows unbounded, crashes application

**How to Avoid:**
- Always return cleanup function from useEffect
- Clear all intervals/timeouts
- Close WebSocket connections

---

### 6.5 Authentication Bypass

**Mistake:** Not validating JWT tokens properly
```typescript
❌ if (req.headers.authorization) {
     // User is authenticated!
   }

✅ const token = req.headers.authorization?.split(' ')[1];
   const user = await validateJWT(token);
   if (!user) return res.status(401).json({ error: 'Unauthorized' });
```

**Why It Matters:** Security vulnerability allowing unauthorized access

**How to Avoid:**
- Always validate JWT tokens
- Check expiration
- Verify signature
- Use authentication middleware

---

## 7. Assessment Checklist

### 7.1 Knowledge Check

After completing all phases, you should be able to:

**Conceptual Understanding:**
- [ ] Explain Restaurant OS's purpose in 2 minutes
- [ ] Describe the multi-tenancy architecture
- [ ] Explain why embedded orders use JSONB
- [ ] Differentiate between the 4 doc types (Diátaxis)
- [ ] Trace an order from creation to completion
- [ ] Describe the authentication flow
- [ ] Explain the dual auth pattern

**Technical Skills:**
- [ ] Set up local development environment
- [ ] Create a React component
- [ ] Add an API endpoint
- [ ] Write a database migration
- [ ] Run tests successfully
- [ ] Use git effectively
- [ ] Debug common issues

**Development Workflow:**
- [ ] Know where to find documentation
- [ ] Understand CI/CD pipeline
- [ ] Use pre-commit hooks
- [ ] Run drift detection
- [ ] Follow commit message conventions
- [ ] Review code quality checks

### 7.2 Practical Assessment

**Challenge: Build a Simple Feature**

Create a "Favorites" feature for menu items:

**Requirements:**
1. Database migration to add `favorites` table
2. API endpoints:
   - `POST /api/favorites` - Add favorite
   - `GET /api/favorites` - List favorites
   - `DELETE /api/favorites/:id` - Remove favorite
3. React component to display favorites
4. Tests for API endpoints
5. Update documentation

**What This Tests:**
- Full-stack development
- Database design
- API creation
- React components
- Testing practices
- Documentation

**Time Estimate:** 2-3 hours

**Success Criteria:**
- All tests pass
- Documentation updated
- No drift detection errors
- Code follows conventions
- Feature works end-to-end

---

## 8. Next Steps

### 8.1 After Completing This Guide

You're ready to:
- **Contribute Code:** Pick an issue from GitHub
- **Fix Bugs:** Help with troubleshooting
- **Improve Docs:** Update outdated documentation
- **Optimize Performance:** Tackle performance issues
- **Add Features:** Implement new capabilities

### 8.2 Continuing Education

**Advanced Topics to Explore:**
- Voice ordering implementation ([ADR-005](../explanation/architecture-decisions/ADR-005-client-side-voice-ordering.md))
- Production deployment ([DEPLOYMENT.md](../DEPLOYMENT.md))
- Incident investigations ([docs/investigations/](./docs/investigations/))
- Performance optimization
- Security hardening

**External Resources:**
- [React Advanced Patterns](https://react.dev/learn/thinking-in-react)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance-tips.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### 8.3 Contributing Back

**Ways to Contribute:**
- Submit bug fixes
- Improve documentation
- Add test coverage
- Optimize performance
- Share knowledge with others

**See:** [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines

---

## 9. Questions & Support

**Getting Help:**
- Check [Troubleshooting Guide](../how-to/troubleshooting/TROUBLESHOOTING.md)
- Search [GitHub Issues](https://github.com/your-org/restaurant-os/issues)
- Ask in team chat/Slack
- Open a new issue with details

**Asking Good Questions:**
1. What were you trying to do?
2. What did you expect to happen?
3. What actually happened?
4. What have you tried?
5. Include error messages and logs

**Remember:**
- Everyone was a beginner once
- Questions help improve documentation
- Asking is better than guessing

---

## 10. Feedback

**Help Us Improve This Guide:**
- Was anything confusing?
- What took longer than expected?
- What exercises were most helpful?
- What's missing?

**Submit Feedback:**
- Open a GitHub issue
- Submit a PR with improvements
- Message the team

---

**Document Version:** 1.0
**Last Updated:** 2025-11-01
**Maintained By:** Restaurant OS Education Team

**Congratulations on completing this learning path! You're now ready to contribute to Restaurant OS. Welcome to the team! 🎉**
