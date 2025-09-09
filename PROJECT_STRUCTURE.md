# Restaurant OS - Project Structure

## 📁 Project Organization

```
rebuild-6.0/
├── 📂 client/                # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── contexts/         # React contexts (Auth, Cart, Restaurant)
│   │   ├── hooks/           # Custom React hooks
│   │   ├── modules/         # Feature modules (voice, orders, etc.)
│   │   ├── pages/           # Route components
│   │   ├── services/        # API and WebSocket services
│   │   └── utils/           # Utility functions
│   ├── public/              # Static assets
│   └── dist/                # Production build output
│
├── 📂 server/                # Express backend + API
│   ├── src/
│   │   ├── api/             # API route handlers
│   │   ├── middleware/      # Express middleware (auth, cors, etc.)
│   │   ├── services/        # Business logic services
│   │   ├── database/        # Database connections and queries
│   │   └── utils/           # Server utilities
│   └── dist/                # Compiled TypeScript output
│
├── 📂 shared/                # Shared types and utilities
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Shared utility functions
│
├── 📂 docs/                  # Documentation
│   ├── archive/             # Archived old documentation
│   ├── api/                 # API documentation
│   ├── reports/             # Performance and analysis reports
│   └── *.md                 # Main documentation files
│
├── 📂 scripts/               # Build and deployment scripts
│   ├── deploy.sh            # Deployment automation
│   ├── check-bundle-size.js # Bundle size monitoring
│   └── migrate.js           # Database migration scripts
│
├── 📂 tests/                 # Test suites
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # End-to-end tests
│
├── 📂 config/                # Configuration files
│   ├── .env.example         # Environment variable template
│   ├── .env.production.template
│   └── .env.security.template
│
├── 📂 logs/                  # Log files (gitignored)
│   ├── baseline-lint.log
│   ├── baseline-test.log
│   └── baseline-typecheck.log
│
├── 📂 supabase/              # Supabase configuration
│   ├── migrations/          # Database migrations
│   └── config.toml          # Supabase project config
│
├── 📂 artifacts/             # Build artifacts and reports
│
├── 📂 assets/                # Design assets and mockups
│
├── 📂 tools/                 # Development tools
│
├── 📂 .github/               # GitHub Actions workflows
│
├── 📂 .husky/                # Git hooks
│
├── 📂 node_modules/          # Dependencies (gitignored)
│
├── 📄 package.json           # Project dependencies
├── 📄 tsconfig.json          # TypeScript configuration
├── 📄 vite.config.ts         # Vite bundler configuration
├── 📄 eslint.config.js       # ESLint configuration
├── 📄 .gitignore            # Git ignore patterns
├── 📄 .env                  # Environment variables (gitignored)
├── 📄 README.md             # Project overview
├── 📄 CLAUDE.md             # AI assistant instructions
├── 📄 CHANGELOG.md          # Version history
└── 📄 ARCHITECTURE.md       # System architecture

```

## 🎯 Key Directories Explained

### `/client` - Frontend Application
- **React 19.1.0** with TypeScript
- **Vite** for fast development and optimized builds
- Component-based architecture with hooks
- Real-time WebSocket connections
- Voice ordering with WebRTC

### `/server` - Backend API
- **Express 4.18.2** with TypeScript
- RESTful API endpoints
- WebSocket server for real-time updates
- Supabase integration for database
- JWT authentication with RBAC

### `/shared` - Shared Code
- TypeScript types used by both client and server
- Common utility functions
- Ensures type safety across the stack

### `/docs` - Documentation
- API documentation
- Architecture decisions
- Component library reference
- Deployment guides
- Performance reports

### `/scripts` - Automation
- Deployment scripts
- Database migrations
- Build optimization
- Testing automation

### `/tests` - Test Suites
- Unit tests for components and functions
- Integration tests for API endpoints
- End-to-end tests for user flows
- Performance tests

### `/supabase` - Database
- SQL migrations
- Database schema
- Row-level security policies
- Edge functions

## 🔧 Configuration Files

### Root Level Configs
- **package.json** - Dependencies and scripts
- **tsconfig.json** - TypeScript compiler options
- **vite.config.ts** - Build configuration
- **eslint.config.js** - Code quality rules
- **.prettierrc** - Code formatting rules

### Environment Variables
- **.env** - Local development settings
- **config/.env.example** - Template for new developers
- **config/.env.production.template** - Production settings template

## 📝 Important Files

### Documentation
- **README.md** - Getting started guide
- **CLAUDE.md** - AI coding assistant instructions
- **CHANGELOG.md** - Release notes
- **ARCHITECTURE.md** - System design decisions

### Development
- **.gitignore** - Files to exclude from git
- **.lintstagedrc.json** - Pre-commit hooks config
- **.mcp.json** - Model Context Protocol config

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Run tests
npm test

# Check TypeScript
npm run typecheck

# Fix linting issues
npm run lint:fix

# Build for production
npm run build

# Analyze bundle size
npm run analyze
```

## 📊 Project Statistics

- **Frontend**: ~32 React pages/components
- **Backend**: Express API with 20+ endpoints
- **Database**: 15+ Supabase tables
- **Tests**: 60% coverage target
- **Bundle Size**: <100KB main chunk target
- **Memory**: Optimized to <4GB build

## 🔐 Security Features

- JWT authentication with RS256
- Role-based access control (7 roles)
- Multi-tenant architecture
- CORS protection
- Rate limiting
- SQL injection prevention
- XSS protection

## 🎨 Key Features

- Real-time Kitchen Display System (KDS)
- Voice ordering with WebRTC
- Multi-tenant restaurant management
- Order status tracking (7 statuses)
- Payment processing
- Analytics dashboard
- QR code menu generation

## 📚 Further Reading

- [Authentication Guide](./docs/AUTHENTICATION.md)
- [API Documentation](./docs/API_AUTHENTICATION.md)
- [Component Library](./docs/COMPONENT_LIBRARY.md)
- [Deployment Guide](./docs/DEPLOYMENT_CHECKLIST.md)
- [Performance Guidelines](./docs/PERFORMANCE_GUIDELINES.md)