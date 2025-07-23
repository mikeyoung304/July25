# Backend Swap Plan

## Overview

This document outlines the migration from the current unified backend (port 3001) to Luis's new Express server.

## New Express Server Architecture

### Port & Base URL
- **Port**: 3001 (same as current)
- **Base URL**: `http://localhost:3001`

### API Routes
- `POST /api/menu` - Upload/update restaurant menu
- `POST /api/chat` - Process voice/text orders
- `GET /api/conversations/:sessionId` - Retrieve conversation history
- WebSocket endpoint for real-time updates

### Environment Variables Required
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI Configuration  
OPENAI_API_KEY=your-openai-api-key

# Server Configuration
PORT=3001
```

## Migration Steps

### 1. Database Preparation
- Ensure all menu items have proper IDs for mapping
- Run migration to add `external_id` column if missing:
  ```sql
  ALTER TABLE public.menu_items 
  ADD COLUMN external_id text UNIQUE;
  ```

### 2. Seed Menu Data
```bash
cd server
npm run seed:menu
```

### 3. Client Updates Required
- Update API base URL configuration (already points to 3001)
- Remove old WebSocket process references
- Update API endpoints:
  - `/api/v1/ai/menu` → `/api/menu`
  - `/api/v1/ai/parse-order` → `/api/chat`
  - Add conversation history endpoint

### 4. Testing Strategy Post-Swap

#### Integration Tests
- Test menu upload endpoint
- Test order processing flow
- Test WebSocket connectivity
- Test conversation retrieval

#### Skip Legacy Tests
- Keep `.skip.ts` files for historical reference
- Focus on integration tests over unit tests
- Run E2E tests against new endpoints

### 5. Rollback Plan
- Tag current state: `pre-backend-swap-YYYYMMDD`
- Keep unified backend code in `pre-luis` branch
- Environment variables remain compatible

## Known Issues to Address
- Auth middleware differences
- Rate limiting implementation
- CORS configuration
- WebSocket authentication

## Success Criteria
1. Menu upload works via `/api/menu`
2. Voice orders process through `/api/chat`
3. Real-time updates flow through WebSocket
4. All environment variables properly loaded
5. No regression in user-facing features