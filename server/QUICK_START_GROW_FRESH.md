# 🌱 Grow Fresh Voice Ordering - Quick Start

## 🚀 One-Command Start

From the backend directory:
```bash
npm run start:all
```

This opens 3 Terminal windows:
- Backend API (port 3001)
- Frontend App (port 5173)  
- AI Gateway (port 3002)

## 📋 Complete Setup Steps

### 1. Install Dependencies (if needed)
```bash
cd backend && npm install
cd .. && npm install
```

### 2. Start All Services
```bash
cd backend
npm run start:all
```

### 3. Upload Menu to AI (wait 10 seconds after starting)
```bash
npm run upload:menu
```

### 4. Test Voice Recognition
```bash
npm run test:voice:flow
```

### 5. Check System Health
```bash
npm run check:integration
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

## 🛠️ Individual Service Commands

If you prefer to start services individually:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
npm run dev

# Terminal 3 - AI Gateway
cd ../macon-ai-gateway
npm run dev:ai
```

## ⚠️ Troubleshooting

1. **Services not starting**: Make sure all ports are free (3001, 5173, 3002)
2. **Menu upload fails**: Wait for services to fully start (10 seconds)
3. **Voice not recognizing**: Check AI Gateway is running and menu uploaded
4. **Wrong menu items**: Run `npm run upload:menu` to sync Grow Fresh menu

## ✅ Success Criteria

- [ ] All services running (check with `npm run check:integration`)
- [ ] Menu uploaded to AI Gateway (31 items)
- [ ] Voice recognizes "Soul Bowl" not "burger"
- [ ] Orders appear in Kitchen Display
- [ ] 90%+ voice recognition accuracy

---

Ready to demo Grow Fresh Local Food voice ordering! 🎉