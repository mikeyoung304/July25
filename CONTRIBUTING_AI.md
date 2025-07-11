# Contributing Guide for AI Assistants (and Developers)

## 🎯 Critical Context

This project uses a **UNIFIED BACKEND ARCHITECTURE**. This is not negotiable.

### What This Means
- ONE backend service on port 3001 handles everything
- NO separate AI Gateway
- NO microservices
- NO port 3002 (it doesn't exist)

If you're thinking "let me add a separate service for X" - **STOP**. Read [ARCHITECTURE.md](./ARCHITECTURE.md) first.

## ⚠️ Common Traps to Avoid

### Trap #1: Creating an AI Gateway
❌ **DON'T**: "Let me create an AI Gateway service on port 3002"  
✅ **DO**: Add AI functionality to `server/src/ai/` within the unified backend

### Trap #2: Suggesting Microservices
❌ **DON'T**: "For better scaling, we should separate the AI service"  
✅ **DO**: Work within the unified architecture - it's a deliberate choice

### Trap #3: Wrong Port References
❌ **DON'T**: Connect to `http://localhost:3002` for AI features  
✅ **DO**: Use `http://localhost:3001/api/v1/ai/*` endpoints

### Trap #4: Overcomplicating Startup
❌ **DON'T**: Create complex startup scripts for multiple services  
✅ **DO**: Use simple `npm run dev` from root - it starts everything

### Trap #5: Mock Data Confusion
❌ **DON'T**: Assume the system uses mock data by default  
✅ **DO**: The backend is fully connected to Supabase with real data

## 📊 Current State (July 2024)

### What's Working
- ✅ Unified backend on port 3001
- ✅ Voice ordering with real menu items (Soul Bowl, not burgers!)
- ✅ WebSocket connections for real-time updates
- ✅ Supabase integration with 31 Grow Fresh menu items
- ✅ Multi-tenant architecture with restaurant contexts

### What's In Progress
- 🔄 Performance optimizations for voice processing
- 🔄 Enhanced menu management UI
- 🔄 Advanced analytics dashboards

### What's NOT Implemented
- ❌ Separate AI Gateway (by design - won't be added)
- ❌ Microservices architecture (by design - won't be added)
- ❌ GraphQL API (using REST by choice)

## 🏗️ Architecture Decisions

### Why Unified Backend?
Luis made this decision for simplicity. Benefits:
1. Easier deployment (one service)
2. Simpler development (no inter-service communication)
3. Lower operational overhead
4. Faster local development

### Why Not Microservices?
We started with microservices but found:
- Too complex for our team size
- Unnecessary for our scale
- Added latency without benefits
- Complicated local development

## 💻 Development Guidelines

### Adding New Features

1. **Check Architecture First**
   - Read [ARCHITECTURE.md](./ARCHITECTURE.md)
   - Ensure your feature fits within unified backend
   - Don't create new services

2. **Follow Existing Patterns**
   - API routes go in `server/src/routes/`
   - Business logic in `server/src/services/`
   - AI features in `server/src/ai/`

3. **Test Your Changes**
   ```bash
   # From root
   npm test
   
   # Integration test
   cd server && npm run check:integration
   ```

### Code Style

- TypeScript with strict mode
- Functional components for React
- Express middleware patterns for backend
- Clear error handling with proper status codes

### Git Workflow

1. Create feature branch from `main`
2. Make focused commits
3. Update relevant documentation
4. Ensure all tests pass
5. Create PR with clear description

## 🔍 Debugging Tips

### Common Issues

**WebSocket Won't Connect**
- Check you're connecting to port 3001, not 3002
- Ensure backend is running (`npm run dev`)
- Check for authentication token (uses 'test-token' in dev)

**Menu Items Missing**
- Run `cd server && npm run upload:menu`
- Check Supabase connection in server/.env
- Verify restaurant ID matches

**Voice Orders Failing**
- Check OpenAI API key in server/.env
- Ensure menu is uploaded to AI service
- Check browser microphone permissions

## 📚 Key Files to Understand

1. **server/src/server.ts** - Main entry point, shows unified architecture
2. **server/src/routes/ai.routes.ts** - AI endpoints (NOT a separate service)
3. **server/src/services/ai.service.ts** - AI business logic
4. **client/src/services/websocket/WebSocketService.ts** - WebSocket client

## 🚀 Quick Commands

```bash
# Start everything
npm run dev

# Check if everything is working
cd server && npm run check:integration

# Upload menu for voice ordering
cd server && npm run upload:menu

# Run specific tests
npm test -- OrderService
```

## 📞 Getting Help

If you're stuck:
1. Check [ARCHITECTURE.md](./ARCHITECTURE.md) first
2. Look for similar patterns in existing code
3. Check the test files for usage examples
4. Review recent commits for context

## 🎓 Learning Resources

- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [React TypeScript Patterns](https://react-typescript-cheatsheet.netlify.app/)
- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)

---

**Remember**: This is a unified backend architecture. Everything runs on port 3001. This is intentional and should not be changed without team discussion and updating [ARCHITECTURE.md](./ARCHITECTURE.md).