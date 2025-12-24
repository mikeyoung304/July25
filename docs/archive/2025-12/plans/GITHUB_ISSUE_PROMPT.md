# Prompt: Create GitHub Issue from Plan

Copy everything below the line to a new Claude Code chat:

---

## Task: Create GitHub Issue for UI/UX Brand Color Fix

Read the synthesized plan at `plans/ui-ux-brand-color-fix-SYNTHESIZED.md` and create a GitHub issue for it.

### Requirements:

1. **Read the plan file first** to understand the full scope
2. **Create a GitHub issue** using `gh issue create` with:
   - Clear, searchable title: `feat: Replace generic blue/purple with brand colors, fix touch targets`
   - Labels: `enhancement`, `ui/ux`, `accessibility`
   - Milestone: (if one exists for current sprint)

3. **Issue body should include:**
   - Executive summary (2-3 sentences)
   - Problem statement with bullet points
   - Scope section (what's in/out)
   - Task checklist with file:line references
   - Acceptance criteria
   - Timeline estimate (1-2 weeks)
   - Link to the full plan file

4. **Format the issue body** using GitHub markdown:
   - Use `<details>` tags for long sections
   - Use task lists `- [ ]` for trackable items
   - Use tables for file changes
   - Include the "Generated with Claude Code" footer

### Example structure:

```markdown
## Summary
[2-3 sentence overview]

## Problem
- Auth pages use generic blue instead of brand orange
- VoiceOrderingMode has purple/indigo "AI slop" colors
- Touch targets <44px violate WCAG 2.5.5
- No prefers-reduced-motion support

## Scope

### In Scope
- [ ] Replace blue-500/600 with orange in auth pages
- [ ] Replace purple/indigo with brand colors in VoiceOrderingMode
- [ ] Fix touch targets to 44px minimum
- [ ] Add prefers-reduced-motion CSS

### Out of Scope (Deferred)
- Dark mode implementation
- Animation system consolidation
- Tailwind config cleanup

<details>
<summary>Files to Change (10 files)</summary>

| File | Changes |
|------|---------|
| `client/src/pages/Login.tsx` | 12 blue→orange replacements |
| ... | ... |

</details>

## Acceptance Criteria
- [ ] No `blue-500` or `blue-600` in auth pages
- [ ] No `purple-*` or `indigo-*` classes remain
- [ ] All interactive elements ≥44px touch target
- [ ] Reduced motion CSS media query present
- [ ] Lighthouse accessibility score ≥95

## Timeline
1-2 weeks (40 hours)

## References
- Full plan: `plans/ui-ux-brand-color-fix-SYNTHESIZED.md`
- Original audit: `plans/ui-ux-design-system-update.md`

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### After creating the issue:
- Return the issue URL
- Confirm the issue was created successfully

---

**Start by reading the plan file, then create the issue.**
