# Development Setup

## Prerequisites

### Required Software
- **Node.js**: v18+ (check with `node --version`)
- **npm**: v9+ (check with `npm --version`)
- **Git**: v2+ (check with `git --version`)

### Required Accounts
- **Supabase**: Free tier works (https://supabase.com)
- **OpenAI**: API access required (https://platform.openai.com)
- **Square**: Sandbox account for payments (https://squareup.com)

## Initial Setup

### 1. Clone Repository

```bash
git clone [repository-url]
cd rebuild-6.0
```

### 2. Install Dependencies

```bash
# Install all dependencies (root, client, server)
npm install
```

This runs the postinstall script that handles all subdirectories.

### 3. Environment Configuration

```bash
# Copy example environment file
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Database (Required)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...

# Default Settings (Required)
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
PORT=3001

# AI Integration (Required for voice features)
OPENAI_API_KEY=sk-...

# Payment Processing (Optional)
SQUARE_ACCESS_TOKEN=EAAAEA...
SQUARE_APPLICATION_ID=sandbox-sq0idb-...
SQUARE_LOCATION_ID=L123...
SQUARE_ENVIRONMENT=sandbox

# Frontend URLs (Auto-configured)
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
```

### 4. Database Setup

#### Option A: Use Existing Database
If you have a Supabase project with the schema already set up, just add the credentials to `.env`.

#### Option B: New Database Setup
```bash
# Initialize Supabase
npx supabase init

# Link to your project
npx supabase link --project-ref [your-project-ref]

# Run migrations
npx supabase db push

# Seed demo data (optional)
npm run db:seed
```

### 5. Start Development

```bash
# Start both frontend and backend
npm run dev
```

Access points:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api-docs

## Development Workflow

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development servers |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate coverage report |
| `npm run lint` | Check code style |
| `npm run lint:fix` | Auto-fix style issues |
| `npm run typecheck` | Check TypeScript types |
| `npm run build` | Create production build |
| `npm run analyze` | Analyze bundle size |

### Code Organization

```
rebuild-6.0/
├── client/                 # Frontend application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   ├── hooks/         # Custom hooks
│   │   ├── modules/       # Feature modules
│   │   ├── services/      # API clients
│   │   └── utils/         # Utilities
│   └── public/           # Static assets
├── server/                # Backend application
│   ├── src/
│   │   ├── routes/       # Express routes
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Express middleware
│   │   ├── models/       # Data models
│   │   └── utils/        # Utilities
│   └── tests/           # Backend tests
├── shared/               # Shared code
│   ├── types/           # TypeScript types
│   └── utils/           # Shared utilities
└── docs/                # Documentation
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/your-feature

# Create pull request
```

#### Commit Convention
Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

## IDE Setup

### VS Code

Recommended extensions:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-tslint-plugin",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense"
  ]
}
```

Settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

## Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run specific test file
npm test -- --grep "OrderService"

# Run with coverage
npm run test:coverage
```

### Integration Tests
```bash
# API tests
npm run test:api

# Database tests
npm run test:db
```

### E2E Tests
```bash
# Run Playwright tests
npm run test:e2e

# Run in headed mode
npm run test:e2e -- --headed
```

## Debugging

### Frontend Debugging

1. **React DevTools**
   - Install browser extension
   - Inspect component tree
   - Monitor state changes

2. **Browser DevTools**
   ```javascript
   // Add debugger statements
   debugger;
   
   // Console logging
   console.log('Order data:', orderData);
   
   // Performance profiling
   console.time('render');
   // ... code
   console.timeEnd('render');
   ```

3. **VS Code Debugging**
   Launch configuration (`.vscode/launch.json`):
   ```json
   {
     "type": "chrome",
     "request": "launch",
     "name": "Debug Frontend",
     "url": "http://localhost:5173",
     "webRoot": "${workspaceFolder}/client"
   }
   ```

### Backend Debugging

1. **Node Inspector**
   ```bash
   # Start with inspector
   node --inspect server/src/index.js
   ```

2. **VS Code Debugging**
   ```json
   {
     "type": "node",
     "request": "launch",
     "name": "Debug Backend",
     "program": "${workspaceFolder}/server/src/index.js",
     "envFile": "${workspaceFolder}/.env"
   }
   ```

3. **Logging**
   ```javascript
   import { logger } from './utils/logger';
   
   logger.info('Order created', { orderId, userId });
   logger.error('Payment failed', { error, orderId });
   ```

## Performance Optimization

### Bundle Analysis
```bash
# Generate bundle report
npm run analyze

# Review report
open client/dist/stats.html
```

### Memory Profiling
```bash
# Run with memory monitoring
npm run dev:profile

# Generate heap snapshot
kill -USR2 [process-id]
```

### Performance Monitoring
```javascript
// Add performance marks
performance.mark('order-start');
// ... processing
performance.mark('order-end');
performance.measure('order-time', 'order-start', 'order-end');

// Log measures
performance.getEntriesByType('measure').forEach(entry => {
  console.log(`${entry.name}: ${entry.duration}ms`);
});
```

## Common Development Tasks

### Adding a New Feature

1. **Create feature branch**
2. **Add types** in `shared/types`
3. **Implement backend** in `server/src`
4. **Add API route** in `server/src/routes`
5. **Implement frontend** in `client/src`
6. **Add tests**
7. **Update documentation**

### Adding a New Page

```bash
# Create component
touch client/src/pages/NewPage.tsx

# Add route
# Edit client/src/App.tsx
```

### Adding an API Endpoint

```bash
# Create route file
touch server/src/routes/new.routes.ts

# Register in server/src/index.ts
```

## Security Best Practices

### Never Commit
- `.env` files
- API keys
- Private keys
- Passwords
- Personal data

### Always Do
- Validate input
- Sanitize output
- Use parameterized queries
- Check authentication
- Log security events

## Troubleshooting Development

### Common Issues

| Issue | Solution |
|-------|----------|
| Port in use | `npx kill-port 5173` or `npx kill-port 3001` |
| Module not found | `rm -rf node_modules && npm install` |
| TypeScript errors | Known issue, app runs despite errors |
| HMR not working | `rm -rf node_modules/.vite` |
| Database connection failed | Check `.env` credentials |

### Getting Help

1. Check [Troubleshooting Guide](../05-operations/troubleshooting.md)
2. Search existing issues on GitHub
3. Ask in development channel
4. Create detailed issue report