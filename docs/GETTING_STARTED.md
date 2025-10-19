# Getting Started

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
# See docs/ENVIRONMENT.md for complete variable reference
```

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

## Auth Quickstart (v6.0.8+)

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
psql $DATABASE_URL -c "SELECT role, scope_name FROM role_scopes WHERE role='customer';"
```

### 3. Test Authentication
```bash
# Run auth integration tests (12 tests)
npm run test:server -- tests/routes/orders.auth.test.ts

# Expected: ✅ 12/12 passing
```

### 4. Demo Token Helpers

Two demo token generators exist for testing:

```typescript
// Customer token (public self-service)
import { getCustomerToken } from '@/services/auth/roleHelpers';
const token = await getCustomerToken();

// Server token (staff operations)
import { getServerToken } from '@/services/auth/roleHelpers';
const token = await getServerToken();
```

See [AUTHENTICATION_ARCHITECTURE.md](./docs/AUTHENTICATION_ARCHITECTURE.md) for complete auth documentation.

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
- **Payment Processing**: Square integration for payments
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

- Read [ARCHITECTURE.md](ARCHITECTURE.md) for system overview
- See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment
- Check [ENVIRONMENT.md](ENVIRONMENT.md) for configuration details
- Review [API documentation](api/README.md) for backend integration

---

**Version**: 6.0.6  
**Last Updated**: September 26, 2025
