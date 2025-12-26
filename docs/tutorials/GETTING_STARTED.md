# Getting Started

**Last Updated:** 2025-11-19

[Home](../../index.md) > [Docs](../README.md) > [Tutorials](./README.md) > Getting Started

This guide will help you set up and run Restaurant OS locally.

## Prerequisites

- Node.js 20.x or higher
- npm 10.7.0 or higher
- Git

## Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/mikeyoung304/July25.git
cd July25
npm install
```

### 2. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
```

**For complete environment variable documentation, see [ENVIRONMENT.md](../reference/config/ENVIRONMENT.md)**

### 3. Start Development
```bash
# Start both client and server
npm run dev

# Or start individually:
npm run dev:client  # Frontend on http://localhost:5173
npm run dev:server  # Backend on http://localhost:3001
```

## Project Structure

```
July25/
├── client/          # React frontend (Vite)
├── server/          # Express backend
├── shared/          # Shared types and utilities
├── docs/           # Documentation
├── scripts/        # Build and utility scripts
└── tests/          # Test files
```

## Auth Quickstart (v6.0.14+)

Restaurant OS uses dual authentication (Supabase + localStorage). For local development:

### 1. Environment Setup
```bash
# Ensure auth flags are set in .env
AUTH_DUAL_AUTH_ENABLE=true
AUTH_ACCEPT_KIOSK_DEMO_ALIAS=true  # Allows kiosk_demo → customer alias
DEMO_LOGIN_ENABLED=true            # Enables /api/v1/auth/demo-session
```

### 2. Database Migration
```bash
# Apply customer role scopes migration
npm run db:push

# Verify customer role exists
# (DATABASE_URL from your .env file - Supabase connection string)
psql $DATABASE_URL -c "SELECT role, scope_name FROM role_scopes WHERE role='customer';"
```

### 3. Test Authentication
```bash
# Run auth integration tests (12 tests)
npm run test:server -- tests/routes/orders.auth.test.ts

# Expected: ✅ 12/12 passing
```

### 4. Demo Authentication

Demo authentication uses `AuthContext` for proper token storage:

```typescript
// Customer authentication (public self-service - online orders, kiosk)
import { useAuth } from '@/contexts/AuthContext';

const CheckoutPage = () => {
  const { loginAsDemo, isAuthenticated } = useAuth();

  // Ensure customer is authenticated before order submission
  if (!isAuthenticated) {
    await loginAsDemo('customer');
  }
};

// Server authentication (staff operations - ServerView, voice ordering)
import { useAuth } from '@/contexts/AuthContext';

const ServerView = () => {
  const { loginAsDemo } = useAuth();

  // Login as server for staff operations
  await loginAsDemo('server');
};
```

**Deprecated (v6.0.14)**: `getCustomerToken()` and `getServerToken()` from `@/services/auth/roleHelpers` store tokens in sessionStorage which is incompatible with httpClient's dual auth pattern. Use `AuthContext.loginAsDemo()` instead.

See [AUTHENTICATION_ARCHITECTURE.md](../explanation/architecture/AUTHENTICATION_ARCHITECTURE.md) for complete auth documentation.

## Development Workflow

### Running Tests
```bash
# Run all tests
npm test

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

### Building for Production
```bash
# Build both client and server
npm run build

# Build individually
npm run build:client
npm run build:server
```

## Key Features

- **Voice Ordering**: AI-powered voice ordering with OpenAI Realtime API
- **Kitchen Display**: Real-time order management for kitchen staff
- **Payment Processing**: Stripe integration for payments
- **Multi-tenant**: Support for multiple restaurants
- **Real-time Updates**: WebSocket-based live updates

## Common Issues

### Port Already in Use
```bash
# Kill processes on ports
npx kill-port 5173 3001

# Or use clean start commands
npm run dev:clean
```

### Environment Variables Not Loading
- Ensure `.env` file is in project root
- Check variable names have correct prefixes (`VITE_` for frontend)
- Restart development server after changes

### Build Failures
- Verify Node.js version: `node --version`
- Clear node_modules: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run typecheck`

## Next Steps

- Read [Architecture Overview](../explanation/architecture/ARCHITECTURE.md) for system design
- See [Development Process](../how-to/development/DEVELOPMENT_PROCESS.md) for workflows
- Check [Deployment Guide](../how-to/operations/DEPLOYMENT.md) for production deployment
- Review [API documentation](../reference/api/api/README.md) for backend integration

---

## Related Documentation

- [Architecture Overview](../explanation/architecture/ARCHITECTURE.md) - System design
- [Authentication Architecture](../explanation/architecture/AUTHENTICATION_ARCHITECTURE.md) - Auth setup
- [Development Process](../how-to/development/DEVELOPMENT_PROCESS.md) - Workflows and best practices
- [Environment Configuration](../reference/config/ENVIRONMENT.md) - Environment variables
- [Troubleshooting](../how-to/troubleshooting/TROUBLESHOOTING.md) - Common issues

---

**Version**: 6.0.14
**Last Updated**: October 30, 2025
