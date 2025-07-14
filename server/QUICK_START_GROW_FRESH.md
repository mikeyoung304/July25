# 🌱 Grow Fresh Voice Ordering - Quick Start

## 🚀 One-Command Start

From the root directory:
```bash
npm run dev
```

This starts:
- Unified Backend (port 3001) - API + AI + WebSocket
- Frontend App (port 5173)

That's it! No third service needed.

## 📋 Complete Setup Steps

### 1. Install Dependencies (if needed)
```bash
npm install  # From root - installs everything
```

### 2. Start the System
```bash
npm run dev  # From root directory
```

### 3. Upload Menu to AI Service (wait 10 seconds after starting)
```bash
cd server && npm run upload:menu
```

### 4. Test Voice Recognition
```bash
cd server && npm run test:voice:flow
```

### 5. Check System Health
```bash
cd server && npm run check:integration
```

## 🎤 Test Voice Ordering

1. Open http://localhost:5173/kiosk
2. Click the microphone button
3. Say: "I'd like a soul bowl please"
4. Verify it recognizes "Soul Bowl" (not burger!)

## 📊 Available Voice Commands

- "I'd like a soul bowl"
- "Can I get mom's chicken salad"
- "Greek bowl no olives"
- "Summer vegan bowl"
- "Honey bowl with extra seeds"
- "Protein power bowl"
- "Green goddess salad"

## 🗄️ Database Info

- **Supabase Project**: xiwfhcikfdoshxwbtjxt
- **Menu Items**: 31 Grow Fresh items
- **Categories**: Bowls, Salads, Soups, Beverages, Kids Menu

## 🛠️ Architecture Note

This project uses a **unified backend architecture**:
- Everything runs on port 3001 (API + AI + WebSocket)
- No separate AI Gateway needed
- Single unified backend on port 3001
- See [ARCHITECTURE.md](../ARCHITECTURE.md) for details

## ⚠️ Troubleshooting

1. **Services not starting**: Make sure ports 3001 and 5173 are free
2. **Menu upload fails**: Wait for backend to fully start (10 seconds)
3. **Voice not recognizing**: Check menu is uploaded with `npm run upload:menu`
4. **Wrong menu items**: Re-run `npm run upload:menu` to sync Grow Fresh menu
5. **WebSocket issues**: Ensure you're connecting to port 3001

## ✅ Success Criteria

- [ ] Services running on 3001 and 5173 (check with `npm run check:integration`)
- [ ] Menu uploaded to AI service (31 items)
- [ ] Voice recognizes "Soul Bowl" not "burger"
- [ ] Orders appear in Kitchen Display
- [ ] 90%+ voice recognition accuracy

---

Ready to demo Grow Fresh Local Food voice ordering! 🎉