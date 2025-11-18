# Investigation Index

**Last Updated:** 2025-11-18

This directory contains active and completed technical investigations.

## Status Legend

- 🟢 **Active** - Currently investigating
- 🟡 **Monitoring** - Resolved but watching for recurrence
- ✅ **Resolved** - Investigation complete, issue fixed
- 📦 **Archived** - Moved to `/docs/archive/`

## Active Investigations

*None currently*

## Recently Resolved (2025-11)

| Investigation | Status | Date | Outcome |
|---------------|--------|------|---------|
| [Deployment Cascade Failure](../archive/2025-11/deployment/) | ✅ Resolved | Nov 17 | Fixed build:vercel script |
| [Environment Variable Audit](../archive/2025-11/environment/) | ✅ Resolved | Nov 11-15 | Consolidated .env files, rotated secrets |
| [GitHub Actions Cleanup](../archive/2025-11/github-actions/) | ✅ Resolved | Nov 17 | Reduced from 27 to 11 workflows |

## Active Investigations

### Template for New Investigation

```markdown
# Investigation: [Title]

**Status:** 🟢 Active / 🟡 Monitoring / ✅ Resolved
**Started:** YYYY-MM-DD
**Lead:** [Name]
**Related Incident:** [Link if applicable]

## Hypothesis
[What we think is happening]

## Evidence
- Finding 1
- Finding 2

## Next Steps
- [ ] Action 1
- [ ] Action 2

## Conclusion
[Final determination - fill when resolved]
```

## Investigation Archive

Investigations older than 3 months or marked resolved are moved to `/docs/archive/YYYY-MM/investigations/`.

## Related Documentation

- [Incidents](../incidents/README.md)
- [Post-mortems](../postmortems/README.md)
- [Archived Investigations](../archive/)
