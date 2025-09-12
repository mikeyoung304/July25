# Restaurant OS v6.0.4

[![CI](https://github.com/mikeyoung304/July25/actions/workflows/ci.yml/badge.svg)](https://github.com/mikeyoung304/July25/actions/workflows/ci.yml)
[![Frontend CI](https://github.com/mikeyoung304/July25/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/mikeyoung304/July25/actions/workflows/frontend-ci.yml)
[![Production Ready](https://img.shields.io/badge/Production%20Ready-9.5%2F10-brightgreen)](./CHANGELOG_v6.0.4.md)
[![Security](https://img.shields.io/badge/Security-Hardened-blue)](./docs/AUTH_ENTERPRISE_PLAN.md)

A modern, production-ready restaurant management system with AI-powered voice ordering, real-time kitchen display, and comprehensive POS capabilities. **Now with enterprise-grade security and authentication.**

## 🆕 What's New in v6.0.4

- **🔐 Production Security**: Hardened authentication with RCTX enforcement
- **🎙️ Voice Ordering**: WebRTC + OpenAI Realtime API integration
- **💳 Payment Processing**: Square integration with PCI compliance
- **🚨 Security Patches**: Fixed critical axios vulnerability (CVE)
- **🏗️ Stability**: 6 critical PRs merged, 25% reduction in TypeScript errors
- **📊 Production Ready**: Upgraded from 8/10 to **9.5/10** readiness score

[See full changelog →](./CHANGELOG_v6.0.4.md)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development servers (client on :5173, server on :3001)
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 📋 System Requirements

- Node.js 18+ (20.x recommended)
- npm 9+
- PostgreSQL 14+ (via Supabase)
- 4GB RAM minimum for builds

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React | 19.1.0 |
| Language | TypeScript | 5.8.3 (client) / 5.3.3 (server) |
| Build Tool | Vite | 5.4.19 |
| Backend | Express | 4.18.2 |
| Database | Supabase | 2.50.5 (client) / 2.39.7 (server) |
| AI/Voice | OpenAI Realtime | Latest |
| WebSocket | ws | 8.18.0 |

### Project Structure

```
rebuild-6.0/
├── client/          # React frontend (Vite)
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── contexts/      # React contexts (UnifiedCartContext)
│   │   ├── modules/       # Feature modules
│   │   ├── pages/         # Route pages
│   │   └── services/      # API clients & utilities
├── server/          # Express backend + AI services
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   ├── ai/           # AI/Voice integration
│   │   └── middleware/    # Express middleware
├── shared/          # Shared types & utilities
│   ├── types/            # TypeScript definitions
│   ├── api-types.ts     # API boundary types (camelCase)
│   └── utils/           # Shared utilities
└── docs/           # Documentation
```

### API Architecture

- **Base URL**: `http://localhost:3001/api/v1`
- **Authentication**: Supabase JWT + CSRF tokens
- **Data Format**: JSON with camelCase fields
- **Database**: PostgreSQL with snake_case fields
- **Transformation**: Automatic case conversion at API boundary

## 🎯 Key Features

### 1. Multi-Tenant Restaurant Management
- Restaurant context isolation
- Customizable settings per location
- Role-based access control

### 2. AI-Powered Voice Ordering
- **Technology**: WebRTC + OpenAI Realtime API
- **Location**: `client/src/modules/voice/services/WebRTCVoiceClient.ts`
- **Features**:
  - Real-time speech recognition
  - Natural language order processing
  - Voice-guided checkout flow

### 3. Kitchen Display System (KDS)
- **Critical**: Must handle ALL 7 order statuses
  - `new`, `pending`, `confirmed`, `preparing`, `ready`, `completed`, `cancelled`
- Real-time WebSocket updates
- Multi-station routing
- Order prioritization

### 4. Point of Sale (POS)
- Table management with visual floor plan
  - Square, Circle, Rectangle, and Chip Monkey shapes
- Order creation and modification
- Payment processing (card, cash, mobile, terminal)
- Receipt printing

### 5. Real-Time Updates
- WebSocket connections for live updates
- Order status synchronization
- Kitchen-to-server communication

## 🔐 Security Features

### Authentication ✅ Complete
- **User Roles**: Owner, Manager, Server, Cashier, Kitchen, Expo, Customer
- **Methods**: Email/Password (with MFA), PIN codes, Station login, Anonymous
- **JWT Tokens**: RS256 signed, HttpOnly cookies
- **Security**: Rate limiting, audit logging, CSRF protection
- **Sessions**: 8h (managers), 12h (staff), role-based permissions

### API Security
```javascript
// Required headers for API calls
{
  'Authorization': 'Bearer <jwt-token>',
  'X-Restaurant-ID': '<restaurant-id>',
  'X-CSRF-Token': '<csrf-token>'  // From cookie
}
```

## 🛠️ Development

### Environment Variables

Create `.env` files in both client and server directories:

```bash
# Client (.env)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
VITE_OPENAI_API_KEY=your-openai-key  # For voice features
VITE_SQUARE_APP_ID=your-square-app-id  # For payments
VITE_SQUARE_LOCATION_ID=your-square-location

# Server (.env)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_JWT_SECRET=your-jwt-secret  # Required for auth
OPENAI_API_KEY=your-openai-key
SQUARE_ACCESS_TOKEN=your-square-token  # For payment processing
FRONTEND_URL=http://localhost:5173  # For CORS
PIN_PEPPER=development-pepper-secret  # For PIN hashing
DEVICE_FINGERPRINT_SALT=development-salt  # For device binding
PORT=3001
NODE_ENV=development
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development servers |
| `npm test` | Run test suite |
| `npm run lint` | Run ESLint (0 errors, 449 warnings) |
| `npm run lint:fix` | Auto-fix linting issues |
| `npm run typecheck` | TypeScript validation |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test:coverage` | Generate coverage report |
| `npm run analyze` | Analyze bundle size |

### Development Guidelines

1. **File Operations**: Always read files before editing
2. **Testing**: Run tests before commits
3. **Multi-tenancy**: Always include restaurant_id context
4. **Performance**: Monitor bundle size (target: <100KB main chunk)
5. **Memory**: Use NODE_OPTIONS="--max-old-space-size=4096" for builds

### Troubleshooting

#### App Stuck on "Loading..."
If the application gets stuck on the loading screen:

1. **Check for compiled JS in /shared**: Run `npm run check:no-shared-js`
2. **Clear Vite cache**: `rm -rf node_modules/.vite`
3. **Clean and rebuild**: 
   ```bash
   npm run clean
   npm run dev
   ```
4. **Check browser console** for "exports is not defined" errors
5. **Ensure no .js files exist in /shared directory** (only .ts files allowed)

### Naming Conventions

| Layer | Convention | Example |
|-------|------------|---------|
| Database | snake_case | `restaurant_id`, `order_number` |
| API | camelCase | `restaurantId`, `orderNumber` |
| Transform | Automatic | Utils in `shared/utils/` |

### Code Quality Standards

- **TypeScript**: Strict mode enabled - ~500 errors (non-blocking)
- **ESLint**: 0 errors required - 573 warnings
- **Test Coverage**: 60% statements, 50% branches
- **Bundle Size**: Main chunk target <100KB
- **Memory Usage**: Max 4GB for builds

## 📦 Deployment

### Production Build

```bash
# Build all packages
npm run build

# Build creates:
# - client/dist/    (static files for nginx/CDN)
# - server/dist/    (Node.js server)
```

### Docker Deployment

```bash
# Build Docker image
docker build -t restaurant-os:6.0.3 .

# Run container
docker run -p 3001:3001 \
  -e NODE_ENV=production \
  -e SUPABASE_URL=... \
  -e SUPABASE_SERVICE_KEY=... \
  restaurant-os:6.0.3
```

### Environment-Specific Configs

- **Development**: Hot reload, verbose logging, mock data support
- **Staging**: Production build, test data, debug enabled
- **Production**: Optimized build, real data, minimal logging

## 🧪 Testing

### Test Structure

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific suite
npm run test:client
npm run test:server

# Watch mode
npm run test:watch
```

### Coverage Requirements

- **Statements**: 60% minimum
- **Branches**: 50% minimum  
- **Functions**: 60% minimum
- **Lines**: 60% minimum

## 📊 Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Bundle Size | <100KB | 82KB ✅ |
| First Paint | <2s | 1.8s ✅ |
| TTI | <3s | 2.7s ✅ |
| Memory (build) | <4GB | 3.8GB ✅ |
| API Response | <200ms | 150ms ✅ |

## 🔧 Troubleshooting

### Common Issues

1. **CSRF Token Errors**
   - Ensure cookies are enabled
   - Check CSRF middleware is active
   - Verify X-CSRF-Token header

2. **Memory Issues During Build**
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npm run build
   ```

3. **WebSocket Connection Failures**
   - Check restaurant_id is included
   - Verify WebSocket port (3001)
   - Ensure proper cleanup in useEffect

4. **Type Errors with Naming**
   - Database uses snake_case
   - API uses camelCase
   - Use transform utilities

## 📚 Documentation

- [Architecture Overview](./docs/01-architecture/README.md)
- [API Reference](./docs/02-api/README.md)
- [Features Guide](./docs/03-features/README.md)
- [Deployment Guide](./docs/04-deployment/README.md)
- [Contributing Guidelines](./CONTRIBUTING.md)

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is proprietary software. All rights reserved.

## 🙏 Acknowledgments

- OpenAI for Realtime API
- Supabase for backend infrastructure
- React team for React 19
- Vite team for blazing fast builds

---

**Version**: 6.0.4  
**Last Updated**: September 12, 2025  
**Status**: Production Ready (**9.5/10**) - Security Hardened, Voice & Payments Integrated ✅  
**Next Milestone**: Production deployment on AWS/Vercel