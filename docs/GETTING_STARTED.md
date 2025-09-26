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
