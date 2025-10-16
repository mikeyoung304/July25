# Documentation Standards

**Last Updated**: 2025-09-26
**Version**: See [VERSION.md](VERSION.md)

## Purpose

This document defines standards for maintaining accurate, consistent, and useful documentation across the Restaurant OS project.

## Required Headers

Every documentation file MUST include:

```markdown
# Document Title

**Last Updated**: YYYY-MM-DD
**Version**: See [VERSION.md](VERSION.md)
```

## Version References

### DO NOT
❌ Hardcode version numbers in documentation:
```markdown
<!-- WRONG -->
This feature requires React 18.3.1
We use Express 4.21.2 for the backend
```

### DO
✅ Link to VERSION.md for all version references:
```markdown
<!-- CORRECT -->
This feature requires React (see [VERSION.md](VERSION.md))
We use Express for the backend (see [VERSION.md](VERSION.md))
```

## Source of Truth

Documentation should point to code as the source of truth:

### Code References
```markdown
<!-- Point to actual implementation -->
For implementation details, see [`server/src/routes/auth.routes.ts`](../server/src/routes/auth.routes.ts)
```

### Schema References
```markdown
<!-- Don't duplicate schemas -->
Request/response schemas are defined in the route files using Zod.
See [`server/src/routes/orders.routes.ts`](../server/src/routes/orders.routes.ts)
```

### Configuration
```markdown
<!-- Reference actual config files -->
Configuration options are in [`.env.example`](../.env.example)
```

## Documentation Categories

### `/docs/` - Main documentation
Primary documentation for users and developers.

### `/docs/api/` - API reference
Endpoint documentation, request/response formats.

### `/docs/archive/` - Historical docs
Outdated documentation preserved for reference.

### `/reports/` - Generated reports
Build reports, coverage reports, analysis outputs.

## File Naming

- Use lowercase with hyphens: `database-schema.md`
- Exception: Standard files: `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`
- Date format in filenames: `YYYY-MM-DD`

## Content Guidelines

### Accuracy
- Verify all claims against actual code
- Test all code examples
- Update docs when code changes

### Clarity
- Use simple, direct language
- Define technical terms on first use
- Include examples for complex concepts

### Completeness
- Cover all major features
- Include error cases and edge cases
- Provide troubleshooting sections

### Conciseness
- Avoid redundancy
- Link to existing docs instead of duplicating
- Use tables for structured data

## Code Examples

### Formatting
```javascript
// Use syntax highlighting
const example = {
  formatted: true,
  language: 'javascript'
};
```

### Testing
All code examples must be tested and working.

### Context
Provide context for code examples:
```javascript
// Connect to WebSocket with authentication
const ws = new WebSocket('ws://localhost:3001', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## Links

### Internal Links
Use relative paths:
```markdown
[API Documentation](api/README.md)
[Database Schema](DATABASE.md)
```

### External Links
Include link text that describes destination:
```markdown
[Supabase Dashboard](https://app.supabase.com)
```

### Anchors
Use lowercase with hyphens:
```markdown
[Security Section](#security-configuration)
```

## Tables

Use tables for structured data:
```markdown
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR | Item name |
```

## Maintenance

### Regular Updates
- Review quarterly for accuracy
- Update after major releases
- Fix broken links immediately

### Deprecation
Mark deprecated content clearly:
```markdown
> ⚠️ **DEPRECATED**: This feature was removed in v6.0.0
> See [new-feature.md](new-feature.md) for the replacement
```

### Historical Content
Move outdated docs to archive with banner:
```markdown
> ⚠️ **HISTORICAL DOCUMENT** - From version 5.x
> Current documentation: [current-doc.md](../current-doc.md)
```

## PR Checklist

When updating documentation:

- [ ] Added/updated "Last Updated" date
- [ ] Linked to VERSION.md for versions
- [ ] Verified code references are correct
- [ ] Tested code examples
- [ ] Checked all links work
- [ ] Ran `npm run env:check` if updating env docs
- [ ] Updated index.md if adding new files

## Automation

### CI Checks
The CI pipeline checks:
- No hardcoded versions
- Links are valid
- Required headers present
- .env.example is complete

### Scripts
```bash
# Check environment documentation
npm run env:check

# Validate environment setup
npm run env:validate
```

## Common Patterns

### API Endpoint Documentation
```markdown
| Method | Path | Auth | Description | Source |
|--------|------|------|-------------|--------|
| GET | /api/orders | Yes | List orders | [orders.routes.ts](../server/src/routes/orders.routes.ts) |
```

### Configuration Documentation
```markdown
| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| PORT | Yes | Server port | 3001 |
```

### Error Documentation
```markdown
| Code | Description | Resolution |
|------|-------------|------------|
| AUTH_FAILED | Authentication failed | Check token validity |
```

## Review Process

1. **Self-review**: Check against these standards
2. **Peer review**: Another developer reviews
3. **Technical review**: Verify against code
4. **User testing**: Ensure clarity for users

## Tools

### Markdown Linters
- markdownlint
- remark

### Link Checkers
- markdown-link-check
- dead-link-checker

### Spell Checkers
- cspell
- aspell

## Examples

### Good Documentation
- Clear purpose statement
- Accurate technical details
- Working code examples
- Proper version linking
- Up-to-date references

### Poor Documentation
- Hardcoded versions
- Outdated information
- Broken links
- Missing "Last Updated"
- Duplicated content

## Getting Help

- Check existing docs in `/docs/`
- Review these standards
- Ask in PR comments
- Consult [CONTRIBUTING.md](CONTRIBUTING.md)

## Future Improvements

- Automated documentation generation
- Version-specific documentation branches
- Interactive API documentation
- Documentation search