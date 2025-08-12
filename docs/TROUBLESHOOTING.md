# Troubleshooting Guide

## Common Issues & Solutions

### Port Already in Use

**Problem**: "Port 5173/3001 is already in use"

**Solution**:
```bash
# Kill process on specific port
npx kill-port 5173
npx kill-port 3001

# Or find and kill manually
lsof -i :5173
kill -9 [PID]
```

### TypeScript Errors

**Problem**: "Cannot find module" or type errors

**Solutions**:
1. Ensure shared types are built:
```bash
cd shared && npm run build
```

2. Clear TypeScript cache:
```bash
rm -rf node_modules/.cache
npm run typecheck
```

3. Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Database Connection Failed

**Problem**: "Failed to connect to Supabase"

**Checklist**:
- ✓ Verify `.env` has correct `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- ✓ Check Supabase project is active (not paused)
- ✓ Verify network connectivity
- ✓ Ensure credentials match your Supabase project

### Voice Features Not Working

**Problem**: Microphone not capturing or no audio response

**Solutions**:

1. **Check browser permissions**:
   - Chrome: Settings → Privacy → Site Settings → Microphone
   - Firefox: Settings → Privacy → Permissions → Microphone
   - Must allow localhost:5173

2. **Verify OpenAI connection**:
```bash
curl https://api.mike.app.buildpanel.ai/api/health
# Should return: {"status":"OK"}
```

3. **Check browser console** for errors:
   - MediaRecorder errors
   - WebSocket connection failures
   - CORS issues

4. **Audio format issues**:
   - Ensure browser supports WebM with opus codec
   - Check if MP3 playback is working

### WebSocket Connection Failed

**Problem**: "WebSocket connection to 'ws://localhost:3001' failed"

**Solutions**:
1. Ensure backend is running:
```bash
npm run dev:server
```

2. Check WebSocket upgrade headers:
```bash
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: test" \
  http://localhost:3001
```

3. Verify no proxy interference (check browser network tab)

### Orders Not Updating in Real-time

**Problem**: Kitchen display not showing new orders

**Checklist**:
- ✓ WebSocket connected (check browser console)
- ✓ Restaurant ID matches across client/server
- ✓ No JavaScript errors in console
- ✓ Backend WebSocket service running

**Debug steps**:
```javascript
// In browser console
localStorage.getItem('restaurant_id')  // Should match your restaurant
```

### Build Failures

**Problem**: "npm run build" fails

**Common causes**:

1. **TypeScript errors**: Fix with `npm run typecheck`
2. **Import path issues**: Ensure all imports resolve
3. **Environment variables**: Build needs proper `.env.production`
4. **Memory issues**: 
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

### Test Failures

**Problem**: Tests failing with import errors

**Solution**:
```bash
# Clear test cache
rm -rf node_modules/.vitest

# Run tests with fresh cache
npm test -- --no-cache
```

### Menu Items Not Appearing

**Problem**: Menu page shows empty or wrong items

**Debug**:
1. Check API response:
```bash
curl http://localhost:3001/api/v1/menu \
  -H "X-Restaurant-ID: 11111111-1111-1111-1111-111111111111"
```

2. Verify database has menu items:
   - Check Supabase dashboard
   - Run seed script: `cd server && npm run seed:menu`

3. Check restaurant context in frontend

### Authentication Issues

**Problem**: "Unauthorized" errors

**Solutions**:
1. Clear browser storage:
```javascript
localStorage.clear()
sessionStorage.clear()
```

2. Re-authenticate with Supabase
3. Check JWT token expiry
4. Verify Supabase auth settings

### Performance Issues

**Problem**: Application running slowly

**Quick fixes**:
1. Clear browser cache
2. Disable React DevTools in production
3. Check for memory leaks in console
4. Reduce console.log statements
5. Enable production mode:
```bash
NODE_ENV=production npm run build
npm run preview
```

## Getting Help

### Logs Location
- Frontend logs: Browser console
- Backend logs: `server/logs/`
- OpenAI logs: Check backend logs for AI requests

### Debug Mode
```bash
# Run with debug logging
DEBUG=* npm run dev
```

### System Check
```bash
# Run integration check
npm run check:integration
```

## Still Stuck?

1. Check existing issues on GitHub
2. Search error message in codebase
3. Review recent commits for breaking changes
4. Create detailed issue with:
   - Error message
   - Steps to reproduce
   - Environment details
   - Console logs