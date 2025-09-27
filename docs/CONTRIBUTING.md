# Contributing to Restaurant OS

Thank you for your interest in contributing to Restaurant OS! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

1. **Fork the repository** and clone your fork locally
2. **Set up the development environment** following the instructions in [README.md](README.md)
3. **Create a feature branch** from `main` for your changes
4. **Make your changes** following our coding standards
5. **Test your changes** thoroughly
6. **Submit a pull request** with a clear description

## Development Workflow

### Branch Naming Convention

- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes
- `chore/` - Maintenance tasks

Example: `feat/add-table-reservation`

### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Example:
```
feat(orders): add order status tracking

Implement real-time order status updates using WebSocket events.
Updates are pushed to kitchen display and customer views.

Closes #123
```

## Coding Standards

### TypeScript

- **Strict mode** must be enabled
- All code must pass TypeScript compilation
- Use explicit types rather than `any`
- Document complex types with JSDoc comments

### Code Style

- ESLint configuration is enforced
- Run `npm run lint:fix` before committing
- Follow existing code patterns in the codebase
- Use meaningful variable and function names

### Testing

- Write tests for new features
- Coverage is tracked in CI (see server coverage report for current levels)
- Current coverage baseline: ~23.47% (working to improve)
- Run `npm test` before submitting PR

## Pull Request Process

1. **Update documentation** for any changed functionality
2. **Add tests** for new features
3. **Ensure all tests pass**: `npm test`
4. **Verify TypeScript compilation**: `npm run typecheck`
5. **Fix linting issues**: `npm run lint:fix`
6. **Update the CHANGELOG.md** if applicable
7. **Request review** from maintainers

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] TypeScript compilation successful
- [ ] ESLint checks pass
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main

## Quality Gates

All PRs must pass the following automated checks:

1. **TypeScript compilation** - Zero errors required
2. **ESLint** - Zero errors allowed
3. **Tests** - All tests must pass
4. **Coverage** - Coverage tracked (current baseline: ~23.47%)
5. **Bundle size** - Main chunk must stay under 100KB
6. **Guard checks** - No compiled JS in /shared directory

## Architecture Guidelines

### Multi-tenancy

All features must support multi-tenant operation:
- Include `restaurant_id` in all data operations
- Validate restaurant context in API endpoints
- Never expose data across restaurant boundaries

### Performance

- Monitor bundle sizes with `npm run analyze`
- Use code splitting for routes
- Implement proper cleanup in React components
- Use WebSocket connection pooling

### Security

- Never commit secrets or API keys
- Validate all user input
- Use parameterized database queries
- Implement proper authentication checks
- Follow OWASP security guidelines

## Documentation

### When to Update Documentation

Update documentation when you:
- Add a new feature
- Change API endpoints
- Modify configuration options
- Update dependencies significantly
- Change deployment procedures

### Documentation Structure

- **README.md** - Project overview and setup
- **CLAUDE.md** - Development guidelines
- **docs/** - Detailed documentation
  - `01-getting-started/` - Setup and installation
  - `02-api/` - API reference
  - `03-features/` - Feature documentation
  - `04-architecture/` - System design
  - `05-deployment/` - Deployment guides
  - `06-development/` - Development guides

## Getting Help

- **Issues**: Check existing [GitHub Issues](https://github.com/mikeyoung304/July25/issues)
- **Discussions**: Ask questions in [Discussions](https://github.com/mikeyoung304/July25/discussions)
- **Documentation**: Refer to the [docs/](docs/) directory

## Release Process

Releases follow [Semantic Versioning](https://semver.org/):
- **Major** (X.0.0): Breaking changes
- **Minor** (0.X.0): New features, backward compatible
- **Patch** (0.0.X): Bug fixes, backward compatible

## License

By contributing to Restaurant OS, you agree that your contributions will be licensed under the project's license terms.

## Acknowledgments

Thank you to all contributors who help make Restaurant OS better!