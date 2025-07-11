# 🚀 Quick Start Guide - Voice Ordering

## The ONE Command You Need

```bash
npm run dev:ai
```

That's it! This single command starts **everything**:
- ✅ Frontend (Vite) on http://localhost:5173
- ✅ AI Gateway on http://localhost:3002
- ✅ WebSocket server for voice streaming
- ✅ All in one terminal with color-coded output

## 🎯 Testing Voice Ordering

Once running, visit:
- **Kiosk Interface**: http://localhost:5173/kiosk
- **Drive-Thru Interface**: http://localhost:5173/drive-thru

## 🎤 How to Use

1. **First Press**: Hold the blue "HOLD ME" button
   - You'll hear: "Welcome to Grow! What can I get started for you today?"

2. **Order**: Keep holding and speak your order
   - "I'll have a bacon burger with no pickles and a large coke"

3. **Release**: Let go of the button
   - Watch your order appear on the right
   - AI will confirm and suggest items

4. **Continue**: Press again to add more items or make changes
   - "Actually, make that two burgers"
   - "Add fries to that"

## 🛑 Shutting Down

Press `Ctrl+C` once - both services will shut down gracefully.

## 🔧 Troubleshooting

**If the AI Gateway doesn't start:**
1. Check if port 3002 is already in use
2. Make sure you have the `../macon-ai-gateway` folder

**If you don't have the AI Gateway:**
```bash
# The unified script will handle this, but if needed:
cd ..
git clone [ai-gateway-repo-url] macon-ai-gateway
cd rebuild-6.0
npm run dev:ai
```

## 📝 Environment Setup (Optional)

For real AI responses, add your OpenAI key:
```bash
# In ../macon-ai-gateway/.env
OPENAI_API_KEY=your-key-here
```

Without this, you'll get mock responses (perfect for testing the UI).

---

**Remember**: Just use `npm run dev:ai` - it handles everything! 🎉