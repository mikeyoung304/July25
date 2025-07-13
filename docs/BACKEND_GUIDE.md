# Unified Backend Development Guide

## 🎯 Overview

The Restaurant OS uses a **unified backend architecture** where a single Express.js server handles all backend functionality including API routes, AI/voice processing, and WebSocket connections.

## 🏗️ Backend Stack

### Core Technologies
- **Express.js**: Unified API server with TypeScript
- **Supabase**: Cloud PostgreSQL database
- **JWT Authentication**: Supabase-based user authentication
- **WebSocket**: Real-time updates via ws library
- **OpenAI Integration**: Voice and AI features
- **Multi-Tenant**: Restaurant-based data isolation

### Development Tools
- **TypeScript**: Type-safe backend development
- **ESLint**: Code quality and consistency
- **Vitest**: Comprehensive test coverage
- **tsx**: Development server with hot reload

## 📁 Unified Backend Architecture

```
server/                      # Unified backend directory
├── src/
│   ├── routes/             # API route definitions
│   ├── services/           # Business logic layer
│   ├── middleware/         # Auth, validation, error handling
│   ├── models/             # TypeScript interfaces
│   ├── utils/              # Helpers, WebSocket, database
│   ├── ai/                 # AI/Voice functionality
│   ├── config/             # Configuration files
│   └── server.ts           # Main server entry point
├── scripts/                # Utility scripts
├── tests/                  # Test suites
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

## 🚀 Getting Started

### Prerequisites
1. Node.js 18+ installed
2. Supabase project configured
3. Environment variables set

### Setup Steps

1. **Navigate to Server Directory**:
   ```bash
   cd server
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   # Or from root: npm run dev (starts both frontend and backend)
   ```

5. **Run Tests**:
   ```bash
   npm test
   npm run test:coverage
   ```

### Environment Variables

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# OpenAI Configuration (for AI/Voice features)
OPENAI_API_KEY=your_openai_api_key

# Server Configuration
PORT=3001
NODE_ENV=development
DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

## 🔧 API Development

### Controller Pattern

```typescript
// src/controllers/menuController.ts
import { Request, Response } from 'express';
import { MenuService } from '../services/MenuService';

export class MenuController {
  static async getMenuItems(req: Request, res: Response) {
    try {
      const restaurantId = req.headers['x-restaurant-id'] as string;
      const items = await MenuService.getItems(restaurantId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

### Service Layer Pattern

```typescript
// src/services/MenuService.ts
import { supabase } from '../utils/supabase';

export class MenuService {
  static async getItems(restaurantId: string) {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId);
    
    if (error) throw error;
    return data;
  }
}
```

### Authentication Middleware

```typescript
// src/middleware/auth.ts
import jwt from 'jsonwebtoken';

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

## 📊 Database Operations

### Supabase Integration

```typescript
// src/utils/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
```

### Data Models

```typescript
// src/models/MenuItem.ts
export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  created_at: string;
  updated_at: string;
}
```

## 🔄 Real-Time Features

### WebSocket Setup

```typescript
// src/utils/websocket.ts
import { WebSocketServer } from 'ws';

export const setupWebSocket = (server: any) => {
  const wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');
    
    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'join-restaurant') {
        ws.restaurantId = message.restaurantId;
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });
  
  return wss;
};
```

## 🧪 Testing Strategy

### Test Structure

```typescript
// tests/controllers/menuController.test.ts
import request from 'supertest';
import { app } from '../../src/app';

describe('Menu Controller', () => {
  test('GET /api/menu should return menu items', async () => {
    const response = await request(app)
      .get('/api/menu')
      .set('x-restaurant-id', 'test-restaurant')
      .expect(200);
    
    expect(response.body).toBeInstanceOf(Array);
  });
});
```

### Test Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- menuController.test.ts

# Watch mode for development
npm run test:watch
```

## 🚀 Deployment

### Production Setup

1. **Build Application**:
   ```bash
   npm run build
   ```

2. **Start Production Server**:
   ```bash
   npm start
   ```

3. **Environment Configuration**:
   - Set production Supabase credentials
   - Configure CORS for production frontend URL
   - Set appropriate PORT for hosting platform

### Health Checks

```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version 
  });
});
```

## 📈 Monitoring & Debugging

### Logging

```typescript
// src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

### Error Handling

```typescript
// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({ error: 'Internal server error' });
});
```

## 🤖 AI/Voice Integration

### Voice Processing

```typescript
// src/ai/voiceService.ts
import OpenAI from 'openai';

export class VoiceService {
  static async transcribeAudio(audioBuffer: Buffer) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioBuffer,
      model: 'whisper-1',
    });
    
    return transcription.text;
  }
  
  static async processOrder(transcript: string) {
    // Natural language processing for order extraction
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Extract order items from transcript' },
        { role: 'user', content: transcript }
      ]
    });
    
    return response.choices[0].message.content;
  }
}
```

## 🔄 Integration with Frontend

### API Base URL Configuration

Frontend connects via `VITE_API_BASE_URL=http://localhost:3001`

### Request Flow

1. Frontend service calls API endpoint
2. Authentication middleware validates JWT
3. Controller extracts restaurant ID from headers
4. Service layer performs database operations
5. Response transformed and returned

### Case Transformation

- Frontend sends camelCase
- Backend expects snake_case
- Automatic transformation via middleware

### Unified Backend Benefits

- **Single Port**: Everything runs on port 3001
- **Simplified Deployment**: One service to deploy and monitor
- **Shared Resources**: Database connections, caching, etc.
- **Easier Development**: No service orchestration needed

---

**Next Steps**: Review [CURRENT_ARCHITECTURE.md](../CURRENT_ARCHITECTURE.md) for complete system architecture.