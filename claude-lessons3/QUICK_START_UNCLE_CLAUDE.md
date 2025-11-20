# Quick Start: Using Uncle Claude in Claude Code

## What is Uncle Claude?

A specialized AI agent that helps you use the Claude Lessons 3.0 system. Instead of running npm commands, just invoke Uncle Claude and he'll do everything for you.

---

## How to Use

### Step 1: Invoke Uncle Claude

In Claude Code, just type:

```
@uncle-claude I'm getting JWT authentication errors
```

or

```
@uncle-claude Help me prevent memory leaks in this WebSocket code
```

or

```
@uncle-claude What lessons apply to server/src/middleware/auth.ts?
```

### Step 2: Uncle Claude Takes Over

Uncle Claude will automatically:

1. ✅ Sign you into `SIGN_IN_SHEET.md`
2. ✅ Search for relevant lessons using the CLI tools
3. ✅ Read the appropriate documentation (AI-AGENT-GUIDE.md, PATTERNS.md, etc.)
4. ✅ Show you code examples (✅ CORRECT vs ❌ WRONG)
5. ✅ Reference specific incidents (CL-AUTH-001, etc.)
6. ✅ Provide prevention strategies
7. ✅ Sign you out with effectiveness rating

**You don't run any commands** - Uncle Claude uses Claude Code's tools (Read, Bash, Edit) to do everything.

---

## What Uncle Claude Does Behind the Scenes

Uncle Claude has direct access to:
- **Read tool** - Reads lesson files, SIGN_IN_SHEET.md
- **Bash tool** - Runs `node claude-lessons3/scripts/lessons-cli.cjs` commands
- **Edit tool** - Updates SIGN_IN_SHEET.md
- **Grep/Glob tools** - Searches codebase

Example workflow:
```bash
# Uncle Claude runs internally:
node claude-lessons3/scripts/lessons-cli.cjs find server/src/middleware/auth.ts
# Then reads: claude-lessons3/01-auth-authorization/AI-AGENT-GUIDE.md
# Then shows you the relevant patterns
```

---

## Uncle Claude's 5-Phase Workflow

### Phase 1: INTAKE (Sign In)
Uncle Claude edits `SIGN_IN_SHEET.md`:
```markdown
| 003 | 2025-11-19 18:45 | Uncle Claude | JWT authentication errors | | | IN_PROGRESS | | |
```

### Phase 2: DISCOVERY (Find Lessons)
Uncle Claude runs:
```bash
node claude-lessons3/scripts/lessons-cli.cjs find server/src/middleware/auth.ts
```

### Phase 3: RESEARCH (Read Docs)
Uncle Claude reads in this order:
1. `AI-AGENT-GUIDE.md` (always first)
2. `QUICK-REFERENCE.md` (if urgent)
3. `PATTERNS.md` (solution patterns)
4. `INCIDENTS.md` (historical context)

### Phase 4: APPLICATION (Show Solutions)
Uncle Claude shows you:
```typescript
// ❌ WRONG - JWT missing required fields (CL-AUTH-001)
const token = jwt.sign({ user_id: user.id }, secret);

// ✅ CORRECT - All required fields present
const token = jwt.sign({
  user_id: user.id,
  restaurant_id: user.restaurant_id,
  scope: user.scope
}, secret);
```

### Phase 5: COMPLETION (Sign Out)
Uncle Claude updates SIGN_IN_SHEET.md:
```markdown
| 003 | 2025-11-19 18:45 | Uncle Claude | JWT authentication errors | 01 | auth.ts | ✅ Fixed JWT structure | ⭐⭐⭐⭐⭐ | 15min |
```

---

## Categories Uncle Claude Knows

| ID | Category | When to Invoke |
|----|----------|----------------|
| 01 | Authentication/Authorization | JWT errors, login issues, RBAC |
| 02 | Database/Supabase | Schema drift, migrations, RPC |
| 03 | React/UI/UX | Hydration, infinite loops |
| 04 | WebSocket/Real-time | Memory leaks, KDS issues |
| 05 | Build/Deployment | CI failures, Vercel errors |
| 06 | Testing/Quality | Test failures, quarantine |
| 07 | API Integration | Timeouts, external APIs |
| 08 | Performance | Memory usage, optimization |
| 09 | Security | Multi-tenancy, RLS, RBAC |
| 10 | Documentation | Link rot, drift |

---

## Example Session

**You**: `@uncle-claude I'm getting 401 errors even though credentials are correct`

**Uncle Claude**:
```markdown
## 🔍 Discovery

I'm signing you in and searching for authentication lessons...

Running: lessons:find server/src/middleware/auth.ts
Found: Category 01 (Authentication/Authorization)
Risk Level: CRITICAL

## 📚 Relevant Lessons

CL-AUTH-001: STRICT_AUTH Environment Drift (48 days debugging)
- Production had STRICT_AUTH=true, local had false
- JWT missing restaurant_id field

## ✅ Solution

[Shows code examples]

## 🛡️ Prevention

[Prevention strategies]

## 📝 Sign-In Entry

Logged in SIGN_IN_SHEET.md as Entry #003
```

---

## ESLint Integration

Uncle Claude knows about the ESLint rules too:

**5 Active Rules**:
1. `custom/no-uncleared-timers` - Detects memory leaks
2. `custom/require-api-timeout` - Enforces API timeouts
3. `custom/no-skip-without-quarantine` - Test quarantine tracking
4. `custom/require-jwt-fields` - JWT structure validation
5. `custom/require-multi-tenant-filter` - Multi-tenancy protection

Uncle Claude will mention: "The ESLint rule `custom/require-jwt-fields` would have caught this"

---

## Pre-Commit Integration

Uncle Claude knows about STRICT mode:

When you commit critical files (auth*, migrations*, websocket*):
- Pre-commit hook shows lessons
- BLOCKS commit unless you set `LESSONS_ACK=1`
- Uncle Claude will remind you: "Remember to review lessons before committing"

---

## Tips for Best Results

1. **Be specific**: "JWT 401 errors" > "auth broken"
2. **Mention files**: "in server/src/middleware/auth.ts"
3. **Let Uncle Claude guide**: He follows a proven workflow
4. **Review patterns**: Don't just copy code, understand WHY
5. **Rate effectiveness**: Helps improve the system

---

## You're Ready!

Just invoke: `@uncle-claude <your problem>`

Uncle Claude will:
- ✅ Sign in
- ✅ Find lessons
- ✅ Show solutions
- ✅ Sign out

**No npm commands needed. No manual file editing. Uncle Claude handles everything.**

---

**Version**: 3.2.0
**Agent Location**: `.claude/agents/uncle-claude.md`
**Last Updated**: 2025-11-19
