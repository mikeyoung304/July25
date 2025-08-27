# Quick Start Guide

## 5-Minute Setup

### 1. Clone & Install
```bash
git clone [repository-url]
cd rebuild-6.0
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon key
- `DEFAULT_RESTAURANT_ID` - Use `11111111-1111-1111-1111-111111111111`

### 3. Start Development
```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api-docs

## Key Features to Try

### Voice Ordering
1. Navigate to Drive-Thru or Kiosk page
2. Click microphone button
3. Try these real menu commands:
   - "I'd like to order a Soul Bowl"
   - "Can I get a Greek Salad with extra feta"
   - "Add a BLT Sandwich to my order"
4. Watch order populate automatically with correct items and prices

### Kitchen Display System
1. Open Kitchen Display page
2. Create test orders from Kiosk (uses real menu: Soul Bowl, Greek Bowl, etc.)
3. Watch real-time order updates
4. Use keyboard shortcuts (Space to mark ready)
5. Test order button creates realistic orders with actual menu items

### Server View
1. Open Server View page
2. See floor plan with tables
3. Click tables to manage orders
4. Real-time status updates

## Common Commands

```bash
npm run dev          # Start everything
npm test             # Run tests
npm run typecheck    # Check TypeScript
npm run build        # Production build
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5173
npx kill-port 5173

# Kill process on port 3001
npx kill-port 3001
```

### Database Connection Issues
- Verify Supabase credentials in `.env`
- Check Supabase project is active
- Ensure network connectivity

### Voice Features Not Working
- OpenAI is cloud-based (no local setup)
- Check browser microphone permissions
- Verify HTTPS for production

## Next Steps

- Read [ARCHITECTURE.md](../ARCHITECTURE.md) for system design
- Check [docs/API.md](./API.md) for API reference
- See [docs/FEATURES.md](./FEATURES.md) for full feature list