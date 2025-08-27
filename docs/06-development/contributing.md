# Contributing to Restaurant OS

Welcome to the Restaurant OS project! We're excited that you're interested in contributing.

## 🚀 Getting Started

1. **Fork the Repository**: Create your own fork of the project
2. **Clone Your Fork**: `git clone https://github.com/your-username/restaurant-os.git`
3. **Create a Branch**: `git checkout -b feature/your-feature-name`
4. **Make Your Changes**: Write code, fix bugs, or improve documentation
5. **Test Your Changes**: Run `npm test` to ensure everything works
6. **Submit a Pull Request**: Open a PR with a clear description of your changes

## 📋 Development Setup

Follow the instructions in [setup.md](./setup.md) to get your development environment ready.

## 🧪 Testing Requirements

Before submitting your changes, ensure:
- All tests pass: `npm test`
- TypeScript compiles without errors: `npm run typecheck`
- Code follows our style guide: `npm run lint`
- Bundle size remains under 100KB: `npm run analyze`

## 💻 Code Standards

### TypeScript
- Use strict mode
- Provide proper types (avoid `any`)
- Document complex functions with JSDoc

### React
- Use functional components with hooks
- Implement proper error boundaries
- Follow React 19 best practices

### Performance
- Keep bundle size under 100KB
- Memory usage under 4GB
- API response times under 100ms

## 🏗️ Architecture Guidelines

- **Multi-tenancy**: Always consider restaurant context
- **WebSocket**: Implement proper cleanup and reconnection
- **Error Handling**: Use error boundaries at section level
- **DRY Principles**: Use existing utilities from `@/hooks` and `@/utils`

## 📝 Documentation

- Update relevant documentation when adding features
- Include JSDoc comments for public APIs
- Add examples for complex functionality
- Keep README files current

## 🐛 Reporting Issues

1. Check existing issues first
2. Use issue templates when available
3. Include:
   - Clear reproduction steps
   - Expected vs actual behavior
   - Environment details (OS, browser, Node version)
   - Relevant error messages or screenshots

## 🔄 Pull Request Process

1. **Small, Focused Changes**: Keep PRs focused on a single feature or fix
2. **Clear Description**: Explain what, why, and how
3. **Link Issues**: Reference related issues with `Fixes #123`
4. **Pass CI/CD**: Ensure all automated checks pass
5. **Review Ready**: Mark as ready for review when complete

## 📚 Resources

- [Architecture Overview](../02-architecture/overview.md)
- [API Documentation](../04-api/rest/README.md)
- [Testing Guide](../TESTING_GUIDE.md)
- [Troubleshooting](../05-operations/troubleshooting.md)

## 🤝 Code of Conduct

Be respectful, inclusive, and professional. We're all here to build something great together.

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to Restaurant OS! 🎉