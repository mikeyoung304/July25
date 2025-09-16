# 🚀 EXACT STEPS TO GO LIVE WITH FALL MENU

**Time Required**: ~10 minutes
**Date**: September 15, 2025

## Step 1: Verify Environment Variables (1 min)

```bash
# Check if your .env file has these required variables
cat .env | grep -E "SUPABASE|OPENAI|RESTAURANT"
```

You need:
- `SUPABASE_URL` or `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` or `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` (for backend)
- `VITE_OPENAI_API_KEY` (for frontend)
- `DEFAULT_RESTAURANT_ID` (should be: 11111111-1111-1111-1111-111111111111)

If missing, add them to `.env`:
```bash
echo "DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111" >> .env
```

## Step 2: Install Dependencies (1 min)

```bash
# From the project root (/Users/mikeyoung/CODING/rebuild-6.0)
npm install

# If you get errors, try:
npm install --legacy-peer-deps
```

## Step 3: Seed the Fall Menu (2 min)

```bash
# Make the script executable
chmod +x scripts/seed-fall-menu.ts

# Run the seed script
npx tsx scripts/seed-fall-menu.ts
```

Expected output:
```
🍂 Starting Fall Menu seed...
🧹 Clearing existing menu...
📁 Creating categories...
✅ Created 7 categories
🍽️ Creating menu items...
✅ Created 31 menu items
🎉 Fall menu seeded successfully!
✨ Done! Your fall menu is ready for voice ordering.
```

## Step 4: Start the Application (2 min)

```bash
# Start both frontend and backend
npm run dev
```

Wait for both servers to start:
- Backend: http://localhost:3001
- Frontend: http://localhost:5173

## Step 5: Verify Menu Data Loaded (1 min)

Open a new terminal and test the API:

```bash
# Check if menu is accessible
curl http://localhost:3001/api/v1/menu | jq '.items[0]'
```

You should see menu items with the fall menu data.

## Step 6: Login to the Application (1 min)

1. Open browser: http://localhost:5173
2. Click "Staff Login"
3. Use these credentials:
   - Email: `server@restaurantos.com`
   - Password: `password123` (or whatever is in your seed data)

If login fails, use development mode:
```bash
# Set development mode in .env
echo "NODE_ENV=development" >> .env

# Restart the app
npm run dev
```

## Step 7: Test Voice Ordering (2 min)

### A. Navigate to Voice Interface
1. After login, go to "Server View" or "Order Entry"
2. Look for a microphone icon or "Voice Order" button
3. Click "Connect Voice" or similar

### B. Test Basic Voice Flow
Say these phrases in order:

```
You: "I want a fall salad"
Agent: "Which dressing and cheese?"
You: "Ranch and feta"
Agent: "Fall salad, ranch, feta. Anything else?"
You: "Add chicken"
Agent: "Fall salad, ranch, feta, with chicken. What else?"
You: "That's it"
Agent: "Total sixteen dollars. Ready to pay?"
```

### C. Test Different Items

**Simple item (no requirements):**
```
You: "Pumpkin bread basket"
Agent: "Pumpkin bread basket. Anything else?"
```

**Item with one requirement:**
```
You: "I want nachos"
Agent: "Chicken or Sloppy Joe?"
You: "Chicken"
Agent: "Grow Nacho with chicken. What else?"
```

**Sandwich (multiple requirements):**
```
You: "BLT"
Agent: "Which bread and side?"
You: "Wheat and mac salad"
Agent: "BLT on wheat with mac salad. Anything else?"
```

**Entrée (two sides required):**
```
You: "Chicken and dressing"
Agent: "Two sides?"
You: "Collards and carrots"
Agent: "Chicken & Dressing, collards, carrots. What else?"
```

## Step 8: Verify Cart Updates (1 min)

After each voice order:
1. Check if items appear in the cart/order display
2. Verify prices are correct
3. Check modifiers are captured

## Step 9: Test Kitchen Display (Optional)

1. Open new tab: http://localhost:5173/kitchen
2. Complete a voice order
3. Verify order appears on kitchen display

## 🔥 Quick Troubleshooting

### If voice doesn't connect:
```bash
# Check OpenAI key is set
echo $VITE_OPENAI_API_KEY

# Check browser console for errors (F12)
# Look for WebRTC or OpenAI connection errors
```

### If menu items aren't recognized:
```bash
# Re-seed the menu
npx tsx scripts/seed-fall-menu.ts

# Clear browser cache
# Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

### If login doesn't work:
```bash
# Check for dev bypass
grep "NODE_ENV" .env
# Should show: NODE_ENV=development

# Or create a test user
npx tsx scripts/seed-database.ts
```

### If orders don't save:
```bash
# Check Supabase connection
curl $SUPABASE_URL/rest/v1/orders \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

## 📱 Test on Mobile/Tablet

1. Find your local IP:
```bash
# Mac
ipconfig getifaddr en0

# Windows
ipconfig | grep IPv4
```

2. On mobile device (same WiFi):
   - Navigate to: `http://[YOUR-IP]:5173`
   - Login and test voice

## ✅ Verification Checklist

- [ ] Menu API returns fall items at `/api/v1/menu`
- [ ] Voice connects without errors
- [ ] Agent recognizes menu items
- [ ] Agent asks for required fields only
- [ ] Items add to cart with correct price
- [ ] Modifiers are captured properly
- [ ] Order total calculates correctly
- [ ] Kitchen display shows orders (if applicable)

## 🎯 Success Indicators

You'll know it's working when:
1. Voice agent says item names correctly
2. Only asks for required choices (dressing, sides, etc.)
3. Confirms orders implicitly ("Fall salad, ranch, feta")
4. Keeps responses under 12 words
5. Items appear in cart with modifications

## 📞 Support Commands

```bash
# View logs
npm run dev 2>&1 | tee app.log

# Check database
psql $DATABASE_URL -c "SELECT name, price FROM menu_items LIMIT 5;"

# Test specific endpoint
curl -X POST http://localhost:3001/api/v1/menu/sync-ai \
  -H "x-restaurant-id: 11111111-1111-1111-1111-111111111111"

# Clear everything and start fresh
rm -rf node_modules package-lock.json
npm install
npx tsx scripts/seed-fall-menu.ts
npm run dev
```

---

**Ready!** Follow these steps in order. The whole process takes about 10 minutes. The voice agent will have full knowledge of your fall menu with intelligent slot-filling.