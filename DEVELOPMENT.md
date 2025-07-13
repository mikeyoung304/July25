# Development Environment Guide

This guide covers setting up and running the Grow Fresh Local Food Restaurant Operating System.

## Prerequisites
- Node.js 18+ installed
- Supabase project created (for cloud database)
- OpenAI API key (for voice ordering features)

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
   
   Create `.env` file in the `server` directory:
   ```env
   PORT=3001
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_service_key
   OPENAI_API_KEY=your_openai_key
   DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
   ```
   
   Create `.env.local` file in the `client` directory:
   ```env
   VITE_API_BASE_URL=http://localhost:3001
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database**
   
   If using Supabase:
   ```bash
   npx supabase db push
   ```
   
   Run initial migrations:
   ```bash
   cd server
   npm run migrate
   ```

5. **Start development servers**
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
1. Start the development servers
2. Upload menu data: `cd server && npm run upload:menu`
3. Navigate to http://localhost:5173/kiosk
4. Test voice commands

### Making Database Schema Changes
1. Create a new migration file:
   ```bash
   npx supabase migration new <your_change_name>
   ```
2. Write your SQL in the new migration file
3. Apply changes to your database:
   ```bash
   npx supabase db push
   ```

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
└── package.json     # Root orchestration
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
- Verify your Supabase credentials in the `.env` files
- Check that your Supabase project is active
- Ensure you've run the migrations

### Voice Ordering Not Working
- Verify your OpenAI API key is set correctly
- Check that menu data has been uploaded (`npm run upload:menu`)
- Ensure microphone permissions are granted in your browser

## Additional Resources
- [Architecture Overview](./ARCHITECTURE.md)
- [API Reference](./docs/API_REFERENCE.md)
- [Contributing Guide](./CONTRIBUTING_AI.md)
- [Voice Ordering Guide](./docs/VOICE_ORDERING_GUIDE.md)