# Contributing to Restaurant OS

Thank you for your interest in contributing to Restaurant OS!

## Quick Start

1. **Fork** the repository and clone your fork locally
2. **Set up** the development environment: `pnpm i && pnpm -w dev`
3. **Create a feature branch**: `feat/your-feature-name`
4. **Make your changes** following our coding standards
5. **Test your changes**: `npm run typecheck && npm test`
6. **Submit a pull request** with a clear description

## Pull Request Checklist

- [ ] Code follows TypeScript strict mode (zero errors required)
- [ ] ESLint checks pass (zero errors allowed)
- [ ] All tests pass: `npm test`
- [ ] Documentation updated if needed
- [ ] Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/)
- [ ] Multi-tenancy enforced (all features include `restaurant_id` scoping)
- [ ] **Database Changes Deployed** (if applicable):
  - Created migration: `supabase migration new description`
  - Wrote SQL with idempotent patterns (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
  - **Deployed to Supabase cloud:** `supabase db push --linked`
  - **Verified deployment:** `supabase db diff --linked` shows no changes
  - Migration file committed to git
  - Never edited deployed migrations (created new ones instead)
  - See [SUPABASE_CONNECTION_GUIDE.md](./docs/SUPABASE_CONNECTION_GUIDE.md) for full workflow

## Important Guidelines

- **Multi-Tenancy**: Every database operation and API endpoint must enforce tenant isolation
- **Security**: Never commit secrets or API keys
- **Testing**: Write tests for new features (current coverage baseline: ~23.47%)
- **Performance**: Keep main bundle under 100KB

## Comprehensive Documentation

For detailed contributing guidelines including:
- Coding standards and architecture guidelines
- Commit message format and branch naming conventions
- Quality gates and testing requirements
- Release process and deployment procedures
- Documentation structure

See: [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md)

## Getting Help

- **Issues**: Check existing [GitHub Issues](https://github.com/mikeyoung304/July25/issues)
- **Discussions**: Ask questions in [Discussions](https://github.com/mikeyoung304/July25/discussions)
- **Documentation**: Refer to the [docs/](./docs/) directory

---

**Thank you for contributing!**
