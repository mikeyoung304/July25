# Quick Start Guide

Welcome to Rebuild 6.0! This guide will help you get up and running quickly.

## 🚀 5-Minute Setup

### Prerequisites Check
```bash
node --version  # Should be 18.x or higher
npm --version   # Should be 8.x or higher
```

### Quick Install
```bash
# Clone and enter directory
git clone <repo-url>
cd rebuild-6.0

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

Your app is now running at http://localhost:5173 🎉

## 🧭 First Steps

### 1. Explore the Kitchen Display
Navigate to http://localhost:5173/kitchen to see:
- Real-time order cards
- Status management (New → Preparing → Ready)
- Sound notifications
- Filter and search functionality

### 2. Try Voice Ordering
Go to http://localhost:5173/kiosk to:
- Test voice capture (requires microphone permission)
- Create orders using natural language
- See transcription in real-time

### 3. Check Order History
Visit http://localhost:5173/history to:
- View historical orders
- Apply filters and search
- See order analytics

## 💻 Development Workflow

### Running Tests
```bash
npm test              # Run all tests
npm test:watch        # Watch mode for TDD
npm test OrderCard    # Test specific component
```

### Code Quality
```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
npm run typecheck     # TypeScript checks
npm run format        # Format with Prettier
```

### Making Changes

1. **Find the right module**:
   - Orders → `src/modules/orders/`
   - UI Components → `src/components/`
   - Services → `src/services/`

2. **Follow the pattern**:
   ```typescript
   // 1. Create/modify component
   src/modules/orders/components/YourComponent.tsx
   
   // 2. Add tests
   src/modules/orders/components/__tests__/YourComponent.test.tsx
   
   // 3. Export from module
   src/modules/orders/components/index.ts
   ```

3. **Test your changes**:
   ```bash
   npm test YourComponent
   npm run typecheck
   npm run lint
   ```

## 🏗️ Architecture Overview

```
User Interface
    ↓
Page Components (src/pages/)
    ↓
Module Components (src/modules/*/components/)
    ↓
Shared Components (src/components/shared/)
    ↓
Services Layer (src/services/)
    ↓
API/Database (Supabase)
```

## 🔑 Key Concepts

### 1. Modules
Self-contained features with their own:
- Components
- Hooks
- Types
- Tests

Example: Orders Module
```
modules/orders/
├── components/   # UI components
├── hooks/        # Business logic
├── types/        # TypeScript types
└── index.ts      # Public API
```

### 2. Services
Domain-specific business logic:
```typescript
import { orderService } from '@/services/ServiceFactory'

// Use the service
const orders = await orderService.getOrders()
```

### 3. Custom Hooks
Reusable state and logic:
```typescript
import { useOrderData } from '@/modules/orders'

function MyComponent() {
  const { orders, loading, error } = useOrderData()
  // ...
}
```

## 🎯 Common Tasks

### Adding a New Order Status
1. Update type in `src/services/types/index.ts`
2. Add status to `OrderCard` component
3. Update status badge colors
4. Add tests

### Creating a New Page
1. Create component in `src/pages/`
2. Add route in `src/components/layout/AppRoutes.tsx`
3. Add navigation link in `src/components/layout/Navigation.tsx`

### Adding a Sound Effect
1. Use the sound module:
   ```typescript
   import { useSoundEffects } from '@/modules/sound'
   
   const { playNewOrder } = useSoundEffects()
   playNewOrder()
   ```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 3000
```

### TypeScript Errors
```bash
# Clear cache and rebuild
rm -rf node_modules/.cache
npm run typecheck
```

### Test Failures
```bash
# Run specific test with details
npm test -- --verbose YourTest

# Update snapshots if needed
npm test -- -u
```

## 📚 Next Steps

1. Read the [Modular Architecture Guide](./MODULAR_ARCHITECTURE.md)
2. Review the [Testing Guide](./FUNCTIONAL_TESTING_CHECKLIST.md)
3. Check out existing components in Storybook (coming soon)
4. Join the team chat for questions

## 🎮 Keyboard Shortcuts

- `Ctrl+K` → Kitchen Display
- `Ctrl+O` → Voice Kiosk
- `Ctrl+H` → Order History
- `/` → Focus search
- `?` → Show all shortcuts

Happy coding! 🚀