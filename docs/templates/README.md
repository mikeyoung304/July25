# Documentation Templates

**Last Updated:** 2025-11-19

This directory contains standard templates for Restaurant OS documentation and development processes.

## Available Templates

### 📋 [feature-checklist.md](./feature-checklist.md)
Comprehensive checklist for feature development from planning to post-launch.
- Requirements gathering
- Development standards
- Testing requirements
- Security review
- Performance criteria
- Deployment process

**Use when:** Starting any new feature development

### 🔧 [migration-checklist.md](./migration-checklist.md)
Database migration planning and execution checklist.
- Pre-migration planning
- Testing requirements
- Deployment steps
- Rollback procedures
- Verification steps

**Use when:** Planning database schema changes

### 📝 [post-mortem.md](./post-mortem.md)
Incident post-mortem template for blameless reviews.
- Incident timeline
- Root cause analysis (5 Whys)
- Action items
- Lessons learned
- Prevention measures

**Use when:** After any production incident (P0-P2)

## How to Use Templates

1. **Copy the template** to your working directory:
   ```bash
   cp docs/templates/feature-checklist.md docs/features/my-feature-checklist.md
   ```

2. **Fill out all sections** as you progress through the task

3. **Use checkboxes** to track completion:
   - `[ ]` = Not started
   - `[x]` = Completed
   - `[-]` = In progress/partial

4. **Keep updated** throughout the process

5. **Archive** completed checklists in `docs/archive/YYYY-MM/`

## Template Guidelines

### When to Use Each Template

| Situation | Template | Required |
|-----------|----------|----------|
| New feature > 1 sprint | feature-checklist.md | Yes |
| Database schema change | migration-checklist.md | Yes |
| Production incident | post-mortem.md | P0-P2 |
| Bug fix < 1 day | None | No |
| Documentation update | None | No |

### Customization

Templates can be customized for specific needs, but ensure:
- Core sections remain intact
- Security checks aren't skipped
- Sign-offs are obtained
- Documentation is updated

### Version Control

- Templates are versioned at the bottom
- Major changes require team review
- Updates should be backwards compatible
- Old versions archived if significantly different

## Contributing

To improve templates:
1. Discuss changes with team
2. Create PR with proposed changes
3. Get 2+ reviewer approvals
4. Update template version
5. Announce changes to team

## Related Documentation

- [Development Workflows](../how-to/development/WORKFLOWS.md)
- [Incident Response](../how-to/operations/runbooks/INCIDENT_RESPONSE.md)
- [Database Migrations](../how-to/operations/DATABASE_MIGRATIONS.md)
- [Feature Flags](../how-to/development/FEATURE_FLAGS.md)

---

**Questions?** Contact the Engineering Team