# Post-Fix Compound Hook

After fixing any issue that took >15 minutes:

## Compound Checklist

1. **Create solution doc**: `docs/solutions/{category}/{issue-name}.md`
   - Use template: `docs/solutions/TEMPLATE.md`
   - Categories: `auth-issues/`, `security-issues/`, `build-errors/`, `database-issues/`, `performance-issues/`, `test-failures/`, `integration-issues/`

2. **If security-related**: Update `docs/RISK_REGISTER.md`
   - Add new risk or mark existing as resolved
   - Include date and resolution summary

3. **If pattern-worthy**: Add to CLAUDE.md Prevention Patterns
   - Security, Multi-Tenancy, or Payments sections
   - Include rule and violation example

4. **If architectural**: Create or update ADR
   - Location: `docs/adrs/ADR-{NNN}-{short-title}.md`
   - Use ADR template with Status, Context, Decision, Consequences

5. **Update Quick Links**: If this is a commonly encountered issue
   - Add to CLAUDE.md Quick Links table
   - Link to the solution doc

## When to Compound

**DO compound if:**
- Debugging took >15 minutes
- Solution wasn't obvious from first principles
- You'd want to find this solution again later
- It affects security, payments, or multi-tenancy
- Multiple files were involved in the fix

**DON'T compound if:**
- Simple typo or obvious fix
- Already documented elsewhere
- One-time configuration issue
- Not reproducible

## Template Location

`docs/solutions/TEMPLATE.md`

## Quick Commands

```bash
# Create new solution file
cp docs/solutions/TEMPLATE.md docs/solutions/{category}/{issue-name}.md

# Update README with new solution
# Edit docs/solutions/README.md to add entry
```

---

*Part of: Compound Engineering Workflow*
*See: CLAUDE.md "Compound Engineering" section*
