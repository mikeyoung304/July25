# Backend Services Documentation

## Overview

The Rebuild 6.0 backend is a **unified Express.js server** running on port 3001 that handles all server-side operations including API endpoints, AI services, and WebSocket connections. This architecture follows the decision documented in `ARCHITECTURE.md` to consolidate all backend functionality into a single service for easier development and deployment.

## Architecture

### Server Structure

```
server/
├── src/
│   ├── server.ts           # Main server entry point
│   ├── routes/             # API route definitions
│   ├── services/           # Business logic layer
│   ├── middleware/         # Express middleware
│   ├── config/             # Configuration files
│   ├── models/             # Data models
│   ├── utils/              # Utility functions
│   ├── ai/                 # AI-specific functionality
│   └── validation/         # Request validation schemas
```

### Service Flow

```
Client Request
    ↓
Express Server (port 3001)
    ↓
Middleware Pipeline
    ├── Helmet (Security Headers)
    ├── CORS
    ├── JSON/URL Parser
    ├── Request Logger
    ├── Metrics Collection
    ├── Rate Limiting
    ├── Authentication (JWT)
    └── Restaurant Context
    ↓
Route Handler
    ↓
Service Layer
    ↓
Database (Supabase)
    ↓
Response
```

## API Endpoints

### Base URL
- Development: `http://localhost:3001/api/v1`
- Production: Configured via `FRONTEND_URL` environment variable

### Health & Monitoring

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Basic health check |
| `/api/v1/status` | GET | No | Detailed system status |
| `/api/v1/ready` | GET | No | Kubernetes readiness probe |
| `/api/v1/live` | GET | No | Kubernetes liveness probe |
| `/metrics` | GET | No | Prometheus metrics endpoint |

### Menu Management

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/menu` | GET | Optional | Get full menu with categories |
| `/api/v1/menu/items` | GET | Optional | Get all menu items |
| `/api/v1/menu/items/:id` | GET | Optional | Get single menu item |
| `/api/v1/menu/categories` | GET | Optional | Get menu categories |
| `/api/v1/menu/sync-ai` | POST | Required | Sync menu to AI service |
| `/api/v1/menu/cache/clear` | POST | Required | Clear menu cache |

### Order Management

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/orders` | GET | Required | List orders with filters |
| `/api/v1/orders` | POST | Required | Create new order |
| `/api/v1/orders/voice` | POST | Required | Process voice order |
| `/api/v1/orders/:id` | GET | Required | Get single order |
| `/api/v1/orders/:id/status` | PATCH | Required | Update order status |
| `/api/v1/orders/:id` | DELETE | Required | Cancel order |

### Table Management

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/tables` | GET | Required | Get all tables |
| `/api/v1/tables/:id` | GET | Required | Get single table |
| `/api/v1/tables` | POST | Required | Create new table |
| `/api/v1/tables/:id` | PUT | Required | Update table |
| `/api/v1/tables/:id` | DELETE | Required | Delete table (soft) |
| `/api/v1/tables/:id/status` | PATCH | Required | Update table status |
| `/api/v1/tables/batch` | PUT | Required | Batch update tables |

### AI Services

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/ai/menu` | POST | Admin/Manager | Upload menu for AI parsing |
| `/api/v1/ai/menu` | GET | Required | Get current AI menu |
| `/api/v1/ai/transcribe` | POST | Required | Transcribe audio file |
| `/api/v1/ai/parse-order` | POST | Required | Parse order from text |
| `/api/v1/ai/health` | GET | No | AI service health check |

## Middleware Chain

### 1. Security (Helmet)
- Configures security headers
- Content Security Policy (CSP)
- HSTS headers
- X-Frame-Options, X-Content-Type-Options

### 2. CORS
- Configurable allowed origins
- Credentials support
- Exposed rate limit headers

### 3. Request Parsing
- JSON body parser (1MB limit)
- URL-encoded parser (1MB limit)

### 4. Request Logging
- Logs all incoming requests
- Includes method, URL, status, duration
- Structured JSON logging

### 5. Metrics Collection
- Prometheus-compatible metrics
- Request duration histogram
- Request counter by method/route/status

### 6. Rate Limiting
- General API: 100 requests/minute
- Voice orders: 10 requests/minute
- Health checks: 50 requests/minute

### 7. Authentication
- JWT token validation (Supabase)
- Optional auth for public endpoints
- Required auth for protected endpoints
- Role-based access control

### 8. Restaurant Context
- Validates restaurant ID from header
- Ensures multi-tenant data isolation
- Default restaurant ID fallback

### 9. Error Handling
- Structured error responses
- Operational vs non-operational errors
- Environment-aware error messages

## Service Layer

### OrdersService
- Order creation with item validation
- Status management and transitions
- Voice order processing
- Real-time WebSocket broadcasts
- Order number generation
- Status history tracking

### MenuService
- Menu data retrieval with caching
- Category management
- AI service synchronization
- Cache invalidation

### AIService
- Audio transcription via BuildPanel service
- Order parsing from text via BuildPanel
- Menu context management with BuildPanel integration
- WebSocket voice streaming

### Menu ID Mapper
- Maps external IDs to UUIDs
- Bidirectional mapping support
- Used for menu item consistency

## Database Operations

### Connection
- Supabase client with service role key
- Connection pooling
- Automatic retry logic

### Tables
- `orders` - Order management
- `menu_items` - Menu catalog
- `menu_categories` - Menu organization
- `tables` - Restaurant tables
- `restaurants` - Multi-tenant support
- `voice_order_logs` - Voice order tracking
- `order_status_history` - Status transitions

### Security
- Row-level security (RLS)
- Restaurant-scoped queries
- Service role for backend operations

## WebSocket Implementation

### General WebSocket (`ws://localhost:3001`)
- Real-time order updates
- Restaurant-scoped broadcasts
- Heartbeat/ping-pong mechanism
- JWT authentication

### Voice WebSocket (`ws://localhost:3001/voice-stream`)
- Binary audio streaming
- Flow control (backpressure)
- Connection limits (2 per IP, 100 total)
- Progress acknowledgments

### Message Types

#### General WebSocket
```typescript
// Client → Server
{ type: 'join-restaurant', data: { restaurantId: string } }
{ type: 'ping' }

// Server → Client
{ type: 'connected', timestamp: string }
{ type: 'joined', restaurantId: string }
{ type: 'order-updated', order: Order, timestamp: string }
{ type: 'new-order', order: Order, timestamp: string }
{ type: 'pong' }
```

#### Voice WebSocket
```typescript
// Client → Server
{ type: 'start_recording' }
{ type: 'stop_recording' }
{ type: 'ping' }
[Binary audio data]

// Server → Client
{ type: 'recording_started', timestamp: number }
{ type: 'transcription_result', text: string, success: boolean }
{ type: 'progress', bytesReceived: number, totalBytesReceived: number }
{ type: 'error', message: string }
{ type: 'pong', timestamp: number }
```

## Error Handling

### Error Types
- `BadRequest` (400) - Invalid input
- `Unauthorized` (401) - Missing/invalid auth
- `Forbidden` (403) - Insufficient permissions
- `NotFound` (404) - Resource not found
- `Conflict` (409) - State conflict
- `UnprocessableEntity` (422) - Validation failure
- `InternalError` (500) - Server error

### Error Response Format
```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "statusCode": 400,
    "timestamp": "2025-01-29T12:00:00.000Z"
  }
}
```

## Authentication & Authorization

### JWT Token Validation
- Supabase JWT verification
- Token expiration handling
- Development test token support

### Request Headers
- `Authorization: Bearer <token>` - JWT token
- `x-restaurant-id: <uuid>` - Restaurant context

### Role-Based Access
- `admin` - Full system access
- `manager` - Restaurant management
- `user` - Standard operations

## Environment Configuration

### Required Variables
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Public anonymous key
- `SUPABASE_SERVICE_KEY` - Service role key

### Optional Variables
- `USE_BUILDPANEL` - Enable BuildPanel integration (default: true)
- `BUILDPANEL_URL` - BuildPanel service URL (default: http://localhost:3003)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment mode
- `FRONTEND_URL` - Frontend URL for CORS
- `LOG_LEVEL` - Logging verbosity
- `RATE_LIMIT_WINDOW_MS` - Rate limit window
- `DEFAULT_RESTAURANT_ID` - Fallback restaurant

## Security Measures

### Request Security
- Helmet.js security headers
- CORS with origin validation
- Request size limits (1MB)
- Rate limiting per endpoint

### Data Security
- Input validation schemas
- SQL injection prevention (Supabase RLS)
- XSS protection (CSP headers)
- Authentication required for sensitive ops

### Multi-Tenancy
- Restaurant ID validation
- Scoped database queries
- Isolated WebSocket broadcasts

## Performance Optimizations

### Caching
- In-memory menu caching (5 min TTL)
- Cache invalidation endpoints
- Metrics tracking (hits/misses)

### Database
- Connection pooling
- Indexed queries
- Pagination support

### WebSocket
- Binary message compression disabled
- Flow control for audio streaming
- Connection limits

## Monitoring & Observability

### Logging
- Structured JSON logging
- Request/response logging
- Error tracking with context
- Child loggers for modules

### Metrics (Prometheus)
- Request duration histogram
- Request counter
- Voice connection gauge
- Audio chunk counter
- Overrun counter

### Health Checks
- Database connectivity
- Service uptime
- Cache statistics
- WebSocket connections

## Development Workflow

### Starting the Server
```bash
# From root directory
npm run dev

# From server directory
npm run dev
```

### Running Tests
```bash
# From root directory
npm test

# From server directory
npm test
```

### Database Migrations
```bash
# From server directory
npm run migrate
```

### Seeding Data
```bash
# From server directory
npm run seed:menu
npm run seed:tables
```

### Uploading Menu to AI
```bash
# From server directory
npm run upload:menu
```

## Common Issues & Solutions

### Port Already in Use
- Check for other processes on port 3001
- Use `lsof -i :3001` to find process
- Kill process or change PORT env variable

### Database Connection Failed
- Verify Supabase credentials
- Check network connectivity
- Ensure service role key is valid

### Voice Features Not Working
- Verify USE_BUILDPANEL=true is set
- Check BuildPanel service is running on port 3003
- Verify BUILDPANEL_URL is correct
- Monitor BuildPanel service connectivity

### WebSocket Connection Issues
- Verify authentication token
- Check CORS configuration
- Monitor connection limits

## Future Enhancements

### Planned Features
- GraphQL API support
- Redis caching layer
- Message queue integration
- Advanced analytics

### Performance Improvements
- Database query optimization
- Response compression
- CDN integration
- Horizontal scaling support