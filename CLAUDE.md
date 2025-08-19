# Restaurant OS - rebuild-6.0 Project Instructions

## Project Overview

- **Type**: Restaurant OS (Point of Sale + Management System)
- **Version**: 6.0.0
- **Stack**: React 19.1.0, TypeScript 5.8.3/5.3.3, Vite 5.4.19, Express 4.18.2, Supabase 2.50.5/2.39.7
- **Architecture**: Unified backend on port 3001

## Directory Structure

```
rebuild-6.0/
├── client/          # React frontend (Vite)
├── server/          # Express backend + AI services
├── shared/          # Shared types & utilities
├── docs/           # Documentation
└── scripts/        # Build & deployment scripts
```

## Development Commands

- `npm run dev` - Start development servers (both client & server)
- `npm test` - Run test suite
- `npm run lint:fix` - Fix linting issues
- `npm run typecheck` - TypeScript validation
- `npm run build` - Production build

## Quality Requirements

- **Mandatory**: All tests pass, TypeScript strict mode
- **Coverage**: 60% statements, 50% branches, 60% functions/lines
- **Pre-commit**: test, lint, typecheck must pass

## Key Features

- Multi-tenant restaurant management
- AI-powered voice ordering (WebSocket + OpenAI Realtime)
- Real-time POS system
- Menu management with QR codes
- Kitchen display system (KDS)
- Analytics dashboard

## Kitchen Display System (KDS) Critical Requirements

### Status Handling (CRITICAL)

- **ALL 7 order statuses MUST be handled**: 'new', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'
- **Missing status handling = Runtime errors = ErrorBoundary failures**
- Always provide fallback/default cases in switch statements
- Validate status values at runtime, not just compile time

### Data Contract Validation

- Backend sends all 7 statuses - frontend components must handle all
- OrderType database format: 'online' | 'pickup' | 'delivery'
- UI display format: 'dine-in' | 'takeout' | 'delivery' | 'online' | 'drive-thru' | 'kiosk' | 'voice'
- All WebSocket events must include restaurant_id for multi-tenancy

### Error Prevention Checklist

1. Check browser console FIRST for runtime errors (not server logs)
2. Validate all status config objects have all 7 statuses
3. Add fallback cases to all switch statements
4. Test with actual backend data, not mocked data
5. Use ErrorBoundary at section level, not just page level

### WebSocket Stability

- Implement exponential backoff for reconnection
- Handle connection state changes gracefully
- Batch order updates to prevent UI thrashing
- Monitor for memory leaks in long-running connections

## AI Integration

- Location: `server/src/ai/`
- WebSocket enabled for real-time communication
- Voice ordering through OpenAI Realtime API
- Context provider: RestaurantContext (restaurant_id field)

## Specialized Agents

- **vite-builder**: Build issues, bundle optimization, HMR
- **react-optimizer**: Performance optimization, React patterns

## Development Guidelines

1. **File Operations**: Always read files before editing
2. **Testing**: Run tests before commits
3. **Multi-tenancy**: Always consider restaurant_id context
4. **Performance**: Monitor bundle sizes, optimize for mobile
5. **Voice Features**: Test WebSocket connections thoroughly
6. **KDS Stability**: Always handle all 7 order statuses with fallbacks
7. **Runtime Debugging**: Use browser console over server logs for UI issues
8. **Status Validation**: Test components with all possible status values
9. **WebSocket Resilience**: Implement proper reconnection and error handling

## Environment

- Backend: http://localhost:3001
- Frontend: http://localhost:5173
- Database: Supabase (configured in .env)

## Memory Management

- Use NODE_OPTIONS="--max-old-space-size=8192" for builds
- Clear Vite cache if HMR issues: `rm -rf node_modules/.vite`

## Common Patterns

- Restaurant context in all data operations
- TypeScript strict mode throughout
- Shared types in `shared/` directory
- Error boundaries for React components
- Proper WebSocket cleanup in useEffect hooks
