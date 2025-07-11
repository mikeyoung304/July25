# Grow Fresh Local Food - Backend API

Production-ready Express.js backend for the Restaurant OS serving Grow Fresh Local Food in Macon, GA.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run database migrations
npm run migrate

# Seed menu data
npm run seed

# Start development server
npm run dev
```

Server runs at `http://localhost:3001`

## 📁 Architecture

```
src/
├── config/          # Configuration files
├── middleware/      # Express middleware
├── routes/          # API route definitions
├── services/        # Business logic layer
├── models/          # TypeScript interfaces
├── utils/           # Helper functions
└── server.ts        # Application entry point
```

## 🔑 Key Features

- **Multi-tenant Architecture**: Restaurant-based data isolation
- **Real-time Updates**: WebSocket support for kitchen displays
- **Voice Order Processing**: Fuzzy matching for Southern accents
- **Menu Caching**: 5-minute TTL for performance
- **JWT Authentication**: Supabase-based auth
- **Rate Limiting**: Protection against abuse
- **Comprehensive Logging**: Structured JSON logs

## 🛣️ API Endpoints

### Health & Monitoring
- `GET /health` - System health check
- `GET /api/v1/status` - Detailed status information

### Menu Management
- `GET /api/v1/menu` - Full menu with categories
- `GET /api/v1/menu/items` - All menu items
- `GET /api/v1/menu/items/:id` - Single menu item
- `GET /api/v1/menu/categories` - Menu categories
- `POST /api/v1/menu/sync-ai` - Sync menu to AI Gateway

### Order Processing
- `GET /api/v1/orders` - List orders (with filters)
- `POST /api/v1/orders` - Create new order
- `GET /api/v1/orders/:id` - Get single order
- `PATCH /api/v1/orders/:id/status` - Update order status
- `POST /api/v1/orders/voice` - Process voice order

### WebSocket Events
- `connection` - Client connects
- `join-restaurant` - Join restaurant room
- `order-updated` - Order status change
- `new-order` - New order created

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
- `NODE_ENV=production`
- `PORT` - Server port (default: 3001)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Service role key
- `FRONTEND_URL` - Frontend URL for CORS

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

### Database Migrations
```bash
# Run migrations
npm run migrate

# Create new migration
npm run migrate:create -- add_order_notes
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   lsof -i :3001
   kill -9 <PID>
   ```

2. **Database connection errors**
   - Check Supabase credentials in .env
   - Verify network connectivity
   - Check RLS policies

3. **Voice parsing errors**
   - Check menu-upload.json is current
   - Verify AI Gateway is running
   - Review fuzzy matching thresholds

## 📚 Related Documentation

- [Frontend README](../README.md)
- [Voice Ordering Guide](../docs/VOICE_ORDERING_GUIDE.md)
- [API Documentation](../docs/api/)
- [Database Schema](./supabase/migrations/)

---

Built with ❤️ for Grow Fresh Local Food by Macon AI Solutions