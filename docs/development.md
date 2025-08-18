# Development Environment Guide

This guide covers setting up and running the Grow Fresh Local Food Restaurant Operating System.

## Prerequisites
- Node.js 18+ installed
- Supabase project created (for cloud database)
- **OpenAI API key** (REQUIRED for AI features - integrated in unified backend)

## First-Time Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd rebuild-6.0
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```
   This installs dependencies for the root, client, and server directories.

3. **Configure environment variables**
   
   Create `.env` file in the root directory:
   ```env
   # Backend Configuration
   PORT=3001
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_service_key
   DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
   
   # AI Configuration (REQUIRED for AI features)
   OPENAI_API_KEY=your_openai_api_key

   # Frontend Configuration (VITE_ prefix required)
   VITE_API_BASE_URL=http://localhost:3001
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_SQUARE_APP_ID=sandbox-sq0idb-xxxxx
   VITE_SQUARE_LOCATION_ID=L1234567890
   ```
   
   **IMPORTANT**: All environment variables go in the root `.env` file only. Do NOT create separate `.env` files in client/ or server/ directories.

5. **Set up the database**
   
   Pull the schema from cloud Supabase:
   ```bash
   npx supabase db pull
   ```
   
   Run initial seed data (if needed):
   ```bash
   cd server
   npm run seed:tables
   ```

6. **Start development servers**
   ```bash
   npm run dev
   ```
   This starts both the frontend (http://localhost:5173) and backend (http://localhost:3001).

## Daily Workflow

### Starting the Application
```bash
npm run dev
```

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run tests for specific module
npm test -- --testNamePattern="OrderService"
```

### Code Quality Checks
```bash
# Type checking
npm run typecheck

# Linting
npm run lint:fix
```

### Working with Voice Ordering
1. **Ensure OPENAI_API_KEY is configured** in your .env file
2. Start the development servers
3. Upload menu data: `cd server && npm run upload:menu`
4. Navigate to http://localhost:5173/kiosk
5. Test voice commands with real menu items:
   - "I'd like to order a Soul Bowl"
   - "Can I get a Greek Salad with extra feta"
   - "Add a BLT Sandwich to my order"
   
**Note**: Orders use `"online"` type by default, not `"dine-in"`

### Making Database Schema Changes
1. Make changes in the Supabase dashboard or SQL editor
2. Pull the latest schema to sync locally:
   ```bash
   npx supabase db pull
   ```
3. This updates your local migration files to match the cloud database

## Project Structure

```
rebuild-6.0/
├── client/          # React frontend
│   ├── src/
│   └── package.json
├── server/          # Express backend (includes AI)
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── ai/      # AI/Voice functionality
│   └── package.json
├── shared/          # Shared types and utilities
│   ├── types/       # TypeScript type definitions
│   └── package.json
└── package.json     # Root orchestration with workspaces
```

## Troubleshooting

### Port Already in Use
If you get an error about ports being in use:
```bash
# Kill processes on port 3001 (backend)
lsof -ti:3001 | xargs kill -9

# Kill processes on port 5173 (frontend)
lsof -ti:5173 | xargs kill -9
```

### Database Connection Issues
- Verify your Supabase credentials in the root `.env` file
- Check that your Supabase project is active
- Ensure you've run the migrations

### Voice Ordering Not Working
- **Verify OPENAI_API_KEY is set** in your `.env` file
- Check that menu data has been uploaded (`npm run upload:menu`)
- Ensure microphone permissions are granted in your browser
- Check backend logs for AI service initialization messages
- Verify menu context loads: Check for "Loaded menu for voice context" in server logs
- Test with real menu items: Soul Bowl, Greek Bowl, BLT Sandwich

### Testing Voice-to-Kitchen Flow
1. Open Kitchen Display: http://localhost:5173/kitchen
2. Open Kiosk in another tab: http://localhost:5173/kiosk
3. Connect voice and say: "I'd like a Soul Bowl"
4. Verify order appears in Kitchen Display with:
   - Correct item name (Soul Bowl)
   - Correct price ($14)
   - Status: "pending" or "new"
5. Use test order button to verify real menu items are shown

### TypeScript Errors with Shared Types
- Run `npm install` from root to set up workspaces
- The shared types are in `/shared/types/`
- Import like: `import { Order } from '@rebuild/shared'`

## Additional Resources
- [Architecture Overview](./ARCHITECTURE.md)
- [API Reference](./docs/API_REFERENCE.md)
- [Contributing Guide](./CONTRIBUTING_AI.md)
- [Voice Ordering Guide](./docs/VOICE_ORDERING_GUIDE.md)