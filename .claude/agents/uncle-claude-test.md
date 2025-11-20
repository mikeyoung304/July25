# Quick Test for Uncle Claude

**Test invocation**: `@uncle-claude I'm seeing authentication errors, JWT tokens not working`

**Expected behavior**:
1. Signs into SIGN_IN_SHEET.md automatically
2. Runs: lessons:find for auth files
3. Reads: 01-auth-authorization/AI-AGENT-GUIDE.md
4. Shows: Code examples (✅ CORRECT vs ❌ WRONG)
5. References: CL-AUTH-001, CL-AUTH-002 incidents
6. Signs out with effectiveness rating

**Uncle Claude should**:
- Use Read/Edit tools for SIGN_IN_SHEET.md
- Use Bash tool to run: node claude-lessons3/scripts/lessons-cli.cjs find <file>
- Use Read tool for lesson docs
- Show pattern examples directly in response
- Ask for effectiveness rating at end
- Update SIGN_IN_SHEET.md with resolution

**You don't need npm commands** - Uncle Claude handles everything through Claude Code tools.
