# Backend Services Documentation

## Overview

The Rebuild 6.0 backend is a unified Express.js application that handles all server-side operations including REST API endpoints, AI services, WebSocket connections, and real-time updates. Built with TypeScript and following a modular architecture for maintainability and scalability.

**Key Technologies:**

- **Express 4.18.2** web framework
- **TypeScript 5.3.3** for type safety
- **Supabase 2.39.7** for database operations
- **OpenAI Realtime API** for AI services (includes Whisper, GPT-4)
- **WebSocket (ws 8.16.0)** for real-time communication
- **JWT** for authentication

## Architecture

### Core Structure

```
server/src/
├── server.ts              # Application entry point
├── routes/               # API route definitions
├── services/            # Business logic services
├── middleware/          # Express middleware
├── ai/                 # AI and voice processing
├── voice/              # Voice WebSocket handlers
├── config/             # Configuration management
├── models/             # Data models
├── utils/              # Utility functions
└── validation/         # Input validation schemas
```

## API Routes

### Core Routes (`/api/v1/`)

#### Menu Management

- **`GET /api/v1/menu`** - Retrieve restaurant menu
- **`POST /api/v1/menu`** - Update menu items
- **Location**: `routes/menu.routes.ts`
- **Service**: `MenuService`

#### Order Management

- **`GET /api/v1/orders`** - List orders with filtering
- **`POST /api/v1/orders`** - Create new order
- **`PUT /api/v1/orders/:id`** - Update order status
- **Location**: `routes/orders.routes.ts`
- **Service**: `OrdersService`

#### AI Services

- **`POST /api/v1/ai/transcribe`** - Audio transcription
- **`POST /api/v1/ai/parse-order`** - Natural language order parsing
- **`POST /api/v1/ai/voice/handshake`** - Voice connection setup
- **Location**: `routes/ai.routes.ts`
- **Service**: `AIService`

#### Authentication

- **`POST /api/v1/auth/login`** - User authentication
- **`POST /api/v1/auth/demo`** - Demo user login
- **Location**: `routes/auth.routes.ts`

#### Table Management

- **`GET /api/v1/tables`** - List restaurant tables
- **`POST /api/v1/tables`** - Update table status
- **Location**: `routes/tables.routes.ts`
- **Service**: `TableService`

#### Health & Monitoring

- **`GET /api/v1/health`** - System health check
- **`GET /api/v1/metrics`** - Prometheus metrics
- **Location**: `routes/health.routes.ts`, `routes/metrics.ts`

## Core Services

### AI Service (`services/ai.service.ts`)

Handles all AI-related operations:

- **Transcription**: OpenAI Whisper for speech-to-text
- **Order Parsing**: GPT-4 for natural language to structured order data
- **Context Management**: Restaurant-specific menu integration

### Orders Service (`services/orders.service.ts`)

Manages order lifecycle:

- Order creation and validation
- Status updates and tracking
- Multi-tenant restaurant filtering
- Real-time WebSocket broadcasting

### Menu Service (`services/menu.service.ts`)

Handles menu operations:

- Menu item retrieval with caching
- ID mapping between frontend and database
- Restaurant-specific menu context

### Order Matching Service (`services/OrderMatchingService.ts`)

Intelligent order processing:

- Menu item fuzzy matching
- Voice order to database mapping
- Validation and error handling

## AI & Voice Processing

### AI Architecture (`ai/`)

```
ai/
├── core/              # Core AI interfaces
│   ├── transcriber.ts    # Speech-to-text interface
│   ├── order-nlp.ts      # Natural language processing
│   ├── chat.ts           # Conversational AI
│   └── tts.ts            # Text-to-speech
├── adapters/          # AI provider implementations
│   └── openai/           # OpenAI-specific adapters
└── stubs/             # Development/testing stubs
```

### Voice WebSocket (`voice/`)

Real-time voice processing:

- **WebSocket Server**: `websocket-server.ts`
- **OpenAI Integration**: `openai-adapter.ts`
- **Voice Routes**: `voice-routes.ts`
- **Audio Pipeline**: Binary audio chunk processing

## Middleware Pipeline

### Security & Validation

- **Authentication**: JWT token validation
- **Rate Limiting**: API call throttling
- **CORS**: Cross-origin request handling
- **Helmet**: Security headers
- **Input Validation**: Joi schema validation

### Restaurant Context

- **Multi-tenancy**: Restaurant ID extraction and validation
- **Access Control**: Restaurant-specific data filtering
- **Context Injection**: Restaurant context in all requests

### Monitoring & Logging

- **Request Logging**: Structured logging with Winston
- **Metrics Collection**: Prometheus metrics
- **Error Handling**: Centralized error processing
- **Performance Monitoring**: Request timing and monitoring

## Data Models

### Order Model (`models/order.model.ts`)

Unified order representation with:

- Status tracking (7 states: new, pending, confirmed, preparing, ready, completed, cancelled)
- Multi-tenant restaurant association
- Timestamp management
- Item and modifier handling

## Configuration

### Environment Configuration (`config/environment.ts`)

- Database connection settings
- OpenAI API configuration
- Authentication secrets
- Server port and host settings

### Database Configuration (`config/database.ts`)

- Supabase client initialization
- Connection pooling
- Query optimization

## WebSocket Architecture

### Real-time Order Updates

- **Connection Management**: Restaurant-specific channels
- **Event Broadcasting**: Order status changes
- **Connection Persistence**: Automatic reconnection handling
- **Error Recovery**: Graceful degradation

### Voice Streaming

- **Binary Audio Processing**: Real-time audio chunk handling
- **OpenAI Integration**: Streaming transcription and parsing
- **Session Management**: Voice conversation state

## Deployment

### Production Configuration

- **Port**: 3001 (unified backend)
- **Process Manager**: PM2 or similar
- **Environment**: Node.js 18+
- **Memory**: 512MB minimum

### Health Monitoring

- **Health Endpoint**: `/api/v1/health`
- **Metrics Endpoint**: `/api/v1/metrics`
- **Database Connectivity**: Real-time status checks
- **External Service Status**: OpenAI, Supabase connectivity

## Security

### Authentication & Authorization

- **JWT Tokens**: Stateless authentication
- **Role-based Access**: Multi-tenant security
- **API Rate Limiting**: Abuse prevention
- **Input Sanitization**: XSS and injection protection

### Data Protection

- **Environment Variables**: Secure configuration
- **HTTPS Enforcement**: Encrypted communication
- **Restaurant Isolation**: Multi-tenant data separation
- **Audit Logging**: Security event tracking

## Performance

### Optimization Strategies

- **Menu Caching**: Redis-like caching for frequently accessed data
- **Connection Pooling**: Database connection optimization
- **Compression**: Response compression
- **Static Assets**: CDN delivery

### Monitoring

- **Response Times**: Sub-200ms API responses
- **WebSocket Performance**: Real-time update latency
- **Memory Usage**: Leak prevention and monitoring
- **Error Rates**: Comprehensive error tracking

---

_This document provides a comprehensive overview of the backend services architecture. For specific implementation details, refer to the source code in `server/src/`._
