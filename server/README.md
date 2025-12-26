# Server - Restaurant OS Backend API


**Last Updated:** 2025-08-26

Production-ready Express.js backend for Restaurant OS 6.0 - A revolutionary restaurant management system with real-time order processing, AI-powered voice ordering, and Stripe payment integration.

## 🚀 Quick Start

### Prerequisites
**OpenAI API Key**
- Required for AI features (voice transcription, order parsing, chat)
- Set `OPENAI_API_KEY` in your .env file

### Setup
```bash
# 1. Install dependencies
npm install

# 2. Environment variables should be in root .env file
# See root directory README for .env configuration
# IMPORTANT: Set OPENAI_API_KEY in .env

# 3. Upload menu data for AI context
npm run upload:menu

# 5. (Optional) Seed test data
npm run seed:tables

# 6. Start development server
npm run dev
```

Server runs at `http://localhost:3001`

## 📁 Architecture

```
src/
├── server.ts                        # Express server configuration
├── routes/                          # API route definitions
│   ├── health.routes.ts            # Health & monitoring endpoints
│   ├── orders.routes.ts            # Order management endpoints
│   ├── menu.routes.ts              # Menu CRUD operations
│   ├── payments.routes.ts          # Stripe payment integration
│   ├── tables.routes.ts            # Table management endpoints
│   ├── auth.routes.ts              # Authentication endpoints
│   ├── ai.routes.ts                # AI services (voice, transcription)
│   ├── realtime.routes.ts          # WebRTC session management
│   └── terminal.routes.ts          # Terminal integration
├── services/                        # Business logic layer
│   ├── orders.service.ts           # Order processing logic
│   ├── menu.service.ts             # Menu management
│   ├── ai.service.ts               # AI integration services
│   ├── menu-id-mapper.ts           # Menu item fuzzy matching
│   └── OrderMatchingService.ts     # Order item matching logic
├── middleware/                      # Express middleware
│   ├── auth.ts                     # JWT authentication
│   ├── restaurantAccess.ts        # Multi-tenant context
│   ├── errorHandler.ts            # Global error handling
│   ├── validation.ts              # Request validation
│   ├── rateLimiter.ts             # API rate limiting
│   └── fileValidation.ts          # File upload validation
├── ai/                             # AI subsystem
│   ├── adapters/openai/           # OpenAI integration
│   ├── voice/                     # Voice processing
│   ├── websocket.ts               # WebSocket voice handler
│   └── functions/                 # Realtime function tools
├── config/                         # Configuration
│   ├── database.ts                # Database settings
│   └── environment.ts             # Environment config
├── utils/                          # Utility functions
│   ├── logger.ts                  # Winston logging
│   ├── websocket.ts               # WebSocket utilities
│   └── case.ts                    # Case conversion helpers
├── validation/                     # Joi validation schemas
│   └── ai.validation.ts           # AI endpoint validation
└── models/                         # TypeScript interfaces
    └── order.model.ts              # Order type definitions
```

## 🔑 Key Features

- **Multi-tenant Architecture**: Restaurant-based data isolation with context headers
- **Real-time WebSocket**: Instant order updates for KDS, POS, and Expo stations
- **AI Voice Ordering**: OpenAI Realtime API with WebRTC integration
- **Stripe Payment Integration**: Card payment processing
- **Fuzzy Menu Matching**: Intelligent item recognition for voice orders
- **JWT Authentication**: Supabase-based auth with role-based access
- **Rate Limiting**: API protection with configurable limits
- **Comprehensive Logging**: Winston-based structured JSON logs
- **Health Monitoring**: Prometheus-compatible metrics endpoint

## 🛣️ API Endpoints

### Health & Monitoring
- `GET /health` - System health check
- `GET /api/v1/metrics` - Prometheus metrics
- `GET /api/v1/status` - Detailed service status

### Authentication
- `GET /api/v1/auth/demo` - Demo JWT token (dev only)
- `GET /api/v1/auth/kiosk` - Kiosk authentication
- `POST /api/v1/auth/login` - User authentication

### Menu Management
- `GET /api/v1/menu` - Full menu with categories
- `GET /api/v1/menu/items` - All menu items
- `GET /api/v1/menu/items/:id` - Single menu item
- `GET /api/v1/menu/categories` - Menu categories
- `POST /api/v1/menu` - Create menu item (admin)
- `PUT /api/v1/menu/:id` - Update menu item (admin)
- `DELETE /api/v1/menu/:id` - Delete menu item (admin)
- `POST /api/v1/menu/sync-ai` - Sync menu for AI context

### Order Processing
- `GET /api/v1/orders` - List orders (with filters)
- `POST /api/v1/orders` - Create new order
- `GET /api/v1/orders/:id` - Get single order
- `PUT /api/v1/orders/:id/status` - Update order status
- `POST /api/v1/orders/voice` - Process voice order
- `DELETE /api/v1/orders/:id` - Cancel order

### Payment Processing
- `POST /api/v1/payments/process` - Process card payment
- `POST /api/v1/payments/terminal-checkout` - Terminal checkout
- `POST /api/v1/payments/refund` - Process refund
- `GET /api/v1/payments/:id/status` - Payment status

### Table Management
- `GET /api/v1/tables` - List all tables
- `GET /api/v1/tables/:id` - Get table details
- `PUT /api/v1/tables/:id` - Update table status
- `POST /api/v1/tables/:id/complete` - Complete table orders

### AI Services
- `POST /api/v1/ai/transcribe` - Audio to text transcription
- `POST /api/v1/ai/tts` - Text to speech synthesis
- `POST /api/v1/ai/chat` - AI chat completion
- `POST /api/v1/realtime/session` - Create WebRTC session

### WebSocket Events

#### Client → Server
- `join:restaurant` - Join restaurant room
- `orders:sync` - Request full order sync
- `order:update_status` - Update order status
- `table:complete` - Complete all table orders

#### Server → Client
- `order:created` - New order notification
- `order:updated` - Order details changed
- `order:status_changed` - Status update broadcast
- `order:deleted` - Order removed
- `table:ready` - Table orders ready
- `kitchen:alert` - Kitchen urgency alert
- `connection:status` - Connection state change

## 🔐 Authentication

All API requests require JWT authentication via Supabase:

```http
Authorization: Bearer <supabase-jwt-token>
X-Restaurant-ID: <restaurant-uuid>
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage
npm run test:coverage

# Test specific file
npm test -- menu.test.ts
```

## 📊 Database Schema

### Core Tables
- `restaurants` - Multi-tenant isolation
- `menu_categories` - Menu organization
- `menu_items` - Items with modifiers
- `orders` - Order management
- `order_items` - Line items

### Row Level Security (RLS)
- Automatic restaurant isolation
- JWT-based access control
- Public menu read access

## 🚀 Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Environment Variables

```env
# Server Configuration
NODE_ENV=production                  # Environment (development/production)
PORT=3001                           # Server port

# Database
SUPABASE_URL=your_supabase_url     # Supabase project URL
SUPABASE_SERVICE_KEY=your_key      # Service role key
DATABASE_URL=postgresql://...       # Direct PostgreSQL connection

# Authentication
JWT_SECRET=your_jwt_secret          # JWT signing secret
JWT_EXPIRY=24h                      # Token expiry time

# External Services
OPENAI_API_KEY=your_openai_key     # OpenAI API key (REQUIRED for AI features)
STRIPE_SECRET_KEY=your_stripe_key   # Stripe secret key (sk_test_... or sk_live_...)
STRIPE_WEBHOOK_SECRET=your_webhook  # Stripe webhook secret (optional)

# CORS & Security
FRONTEND_URL=http://localhost:5173  # Frontend URL for CORS
ALLOWED_ORIGINS=http://localhost:5173,https://your-domain.com

# Restaurant Context
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111

# Optional Services
REDIS_URL=redis://localhost:6379    # Redis for caching (optional)
AI_DEGRADED_MODE=false              # Fallback when OpenAI unavailable
```

## 📈 Performance

- Menu caching: 300s TTL
- Database connection pooling
- Gzip compression
- Response time target: <100ms (cached), <500ms (uncached)

## 🔧 Development

### Voice Order Testing
```bash
# Test voice scenarios
npm run test:voice

# Example phrases:
# "I'd like a soul bowl with extra collards"
# "Greek bowl no olives"
# "Mom's chicken salad and fruit cup"
```

### Database Management
```bash
# Pull latest schema from cloud Supabase
npx supabase db pull

# Check integration with database
npm run check:integration
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   lsof -i :3001
   kill -9 <PID>
   ```

2. **Database connection errors**
   - Check Supabase credentials in root .env
   - Verify network connectivity
   - Check RLS policies

3. **Voice parsing errors**
   - Check menu-upload.json is current
   - Verify OPENAI_API_KEY is set in environment
   - Check server logs for OpenAI connection status
   - Review fuzzy matching thresholds

## 📚 Related Documentation

- [Main Project README](../README.md)
- [Client README](../client/README.md)
- [Shared Types README](../shared/README.md)
- [API Documentation](../docs/04-api/)
- [Architecture Overview](../docs/02-architecture/)
- [KDS Revolution Guide](../docs/03-features/kds-revolution.md)

## 🤝 Contributing

See [Contributing Guide](../docs/06-development/contributing.md) for development guidelines.

## 📄 License

MIT License - See [LICENSE](../LICENSE) for details.

---

**Restaurant OS 6.0** - Revolutionary restaurant management system
Built with TypeScript, Express, and modern web technologies