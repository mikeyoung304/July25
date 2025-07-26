# Documentation Index

## 📚 Core Documentation

### Getting Started
- **[README.md](../README.md)** - Project overview, features, and quick setup
- **[QUICK_START.md](../QUICK_START.md)** - 5-minute guide for new developers
- **[DEVELOPMENT.md](../DEVELOPMENT.md)** - Detailed development setup and workflow
- **[DOCUMENTATION.md](./DOCUMENTATION.md)** - Documentation standards and organization

### Architecture & Design
- **[ARCHITECTURE.md](../ARCHITECTURE.md)** ⭐ - **Unified backend architecture decision (SOURCE OF TRUTH)**
- **[MIGRATION_REPORT.md](../MIGRATION_REPORT.md)** - Unified backend migration documentation

### Backend Documentation
- **[BACKEND_GUIDE.md](./BACKEND_GUIDE.md)** - Comprehensive backend development guide
- **[API_ENDPOINTS.md](../API_ENDPOINTS.md)** - Complete API endpoint reference
- **[server/README.md](../server/README.md)** - Backend service documentation

### Feature Guides
- **[VOICE_ORDERING_GUIDE.md](./VOICE_ORDERING_GUIDE.md)** - Voice ordering implementation guide
- **[FLOOR_PLAN_SETUP.md](../FLOOR_PLAN_SETUP.md)** - Floor plan management setup
- **[MCP-SETUP.md](./MCP-SETUP.md)** - Model Context Protocol configuration

### AI Development
- **[CLAUDE.md](../CLAUDE.md)** - Claude AI assistant instructions
- **[CONTRIBUTING_AI.md](../CONTRIBUTING_AI.md)** - AI development guidelines and pitfalls

### Testing & Quality
- **[TEST_ARCHITECTURE.md](../TEST_ARCHITECTURE.md)** - Test strategy, structure, and setup guide
- **[FUNCTIONAL_TESTING_CHECKLIST.md](./FUNCTIONAL_TESTING_CHECKLIST.md)** - Testing requirements
- **[CODE_ANALYSIS.md](./CODE_ANALYSIS.md)** - Codebase metrics and analysis

### Operations
- **[DEPLOYMENT.md](../DEPLOYMENT.md)** - Production deployment guide
- **[MONITORING.md](../MONITORING.md)** - Monitoring and observability guide

### Historical Documentation

## 🗂️ Documentation Structure

```
rebuild-6.0/
├── Root Documentation
│   ├── README.md                    # Project overview
│   ├── ARCHITECTURE.md             # ⭐ Unified backend decision
│   ├── DEVELOPMENT.md              # Dev setup guide
│   ├── API_ENDPOINTS.md            # API reference
│   ├── CURRENT_ARCHITECTURE.md     # System overview
│   ├── MIGRATION_REPORT.md         # Migration history
│   ├── FLOOR_PLAN_SETUP.md         # Feature setup
│   ├── CLAUDE.md                   # AI assistant config
│   └── CONTRIBUTING_AI.md          # AI guidelines
│
├── server/
│   ├── README.md                   # Backend docs
│
├── client/
│   └── (component documentation in source)
│
└── docs/
    ├── Getting Started
    │   ├── DOCUMENTATION_INDEX.md (this file)
    │   └── DOCUMENTATION.md
    │
    ├── Architecture
    │   ├── FULLSTACK_ARCHITECTURE.md
    │   ├── MODULAR_ARCHITECTURE.md
    │   └── BACKEND_GUIDE.md
    │
    ├── Features
    │   ├── VOICE_ORDERING_GUIDE.md
    │   └── MCP-SETUP.md
    │
    ├── Quality
    │   ├── FUNCTIONAL_TESTING_CHECKLIST.md
    │   └── CODE_ANALYSIS.md
    │
```

## 📝 Documentation Standards

### File Naming
- Use UPPERCASE for documentation files (e.g., `README.md`, `ARCHITECTURE.md`)
- Use underscores for multi-word files (e.g., `VOICE_ORDERING_GUIDE.md`)
- Keep names descriptive and action-oriented

### Content Structure
1. **Title** - Clear, descriptive title with emoji if appropriate
2. **Overview** - Brief description of content and purpose
3. **Table of Contents** - For documents longer than 3 sections
4. **Main Content** - Well-organized sections with clear headers
5. **Examples** - Code examples with syntax highlighting
6. **Related Docs** - Links to related documentation

### Markdown Guidelines
- Use headers hierarchically (# > ## > ### > ####)
- Include code blocks with language hints (```typescript, ```bash)
- Use tables for structured comparison data
- Add emoji sparingly for section headers (📚 📝 ⚠️ ✅)
- Keep line length reasonable (~100 chars)
- Use **bold** for emphasis, *italics* for terms

## 🔄 Keeping Documentation Updated

### Critical Documents
These documents MUST be kept current:
1. **ARCHITECTURE.md** - Any architecture decisions
2. **API_ENDPOINTS.md** - When adding/changing endpoints
3. **README.md** - New features or setup changes
4. **DEVELOPMENT.md** - Development process changes

### When to Update
- **Before** implementing architecture changes
- **After** completing a feature
- **When** changing API contracts
- **After** fixing significant bugs
- **Before** major releases

### Update Checklist
- [ ] Is the unified backend architecture still reflected?
- [ ] Are all port references correct (3001)?
- [ ] Do examples still work?
- [ ] Are file paths still valid?
- [ ] Is the information current?

## 🤝 Contributing to Documentation

### Principles
1. **Write for newcomers** - Assume no prior project knowledge
2. **Show, don't just tell** - Include examples and commands
3. **Keep it current** - Update docs with code changes
4. **Be concise** - Get to the point, avoid fluff
5. **Test everything** - Ensure commands and examples work

### Documentation Reviews
- Documentation PRs should be reviewed like code
- Check for accuracy, clarity, and completeness
- Verify examples work as written
- Ensure consistency with existing docs

## 📊 Documentation Health

### ✅ Current & Accurate
- Unified backend architecture docs
- API endpoint documentation
- Development setup guides
- Core feature documentation

### ⚠️ Needs Review
- Testing documentation (may need updates for new test structure)
- Some feature-specific guides
- Performance optimization guides

### 📋 Future Documentation
- Deployment playbooks
- Performance tuning guide
- Security best practices
- Troubleshooting guide
- Architecture Decision Records (ADRs)

## 🔗 External Resources

### Core Technologies
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

### Services & Tools
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Docs](https://playwright.dev/docs/intro)

### AI Development
- [Claude Documentation](https://docs.anthropic.com/claude/docs)
- [MCP Specification](https://github.com/modelcontextprotocol/specification)

---

*Last updated: January 2025 | Unified Backend Architecture v6.0*