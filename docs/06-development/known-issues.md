# Known Issues & Workarounds

Last Updated: August 27, 2025 | Version: 6.0.2

## 🔴 Critical Issues

Currently, there are **no critical issues** affecting production use.

## 🟡 Minor Issues

### 1. ESLint Warnings
**Issue**: 87 unused variable warnings in the codebase  
**Impact**: None on functionality  
**Workaround**: Run `npm run lint:fix` to auto-fix where possible  
**Status**: Low priority cleanup task

### 2. Module Type Warning
**Issue**: ESLint config shows module type warning  
**Impact**: Console warning only  
**Fix**: Add `"type": "module"` to client/package.json  
**Status**: Planned for next patch

### 3. WebSocket Idle Timeout
**Issue**: WebSocket disconnects after ~6 minutes of inactivity  
**Impact**: Automatic reconnection within 3 seconds  
**Workaround**: This is expected behavior with exponential backoff  
**Status**: Working as designed

## 🔵 Development Issues

### 1. Test Suite Timeouts
**Issue**: Some integration tests may timeout on slower machines  
**Solution**: Increase timeout in vitest.config.ts:
```javascript
testTimeout: 10000 // Increase from 5000
```

### 2. Memory Usage During Build
**Issue**: Build process may use up to 4GB RAM  
**Solution**: Already optimized with NODE_OPTIONS in package.json  
**Note**: Down from 12GB in previous versions

### 3. HMR Cache Issues
**Issue**: Vite HMR may occasionally fail to update  
**Solution**: Clear cache:
```bash
rm -rf node_modules/.vite
npm run dev
```

## 📱 Browser Compatibility

### Supported Browsers
- Chrome/Edge 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Mobile Safari iOS 14+ ✅
- Chrome Android 90+ ✅

### Known Browser Issues
- **Safari**: Voice ordering requires explicit microphone permission
- **Firefox**: WebRTC may require about:config adjustments for local development

## 🔧 Environment-Specific Issues

### macOS
- **Port conflicts**: Kill existing processes with `npx kill-port 5173 3001`
- **File watching**: May need to increase file descriptor limit

### Windows
- **Path issues**: Use forward slashes in import statements
- **Script execution**: May need to enable script execution policy

### Linux
- **Permissions**: May need to run with elevated permissions for port binding
- **File watching**: Increase inotify watchers if needed

## 🚀 Performance Considerations

### Large Order Volumes
- **Issue**: KDS may slow with 100+ simultaneous orders
- **Mitigation**: Virtualization planned for next release
- **Workaround**: Archive completed orders regularly

### Memory Leaks
- **Status**: No known memory leaks
- **Monitoring**: Use `npm run test:memory` to verify
- **Prevention**: Proper cleanup in useEffect hooks

## 🔄 WebSocket Specific

### Connection Issues
- **Multiple tabs**: Each tab creates separate WebSocket connection
- **Rate limiting**: Not implemented, but planned
- **Reconnection**: Automatic with exponential backoff

## 📝 API Limitations

### Order Creation
- **Authentication**: Demo token required for API calls
- **Rate limits**: None currently implemented
- **Batch operations**: Not supported, single operations only

## 🎯 Upcoming Fixes

### Version 6.0.3 (Planned)
- [ ] Clean up ESLint warnings
- [ ] Add module type to package.json
- [ ] Enhance error messages
- [ ] Add rate limiting to APIs

### Version 6.1.0 (Planned)
- [ ] Implement order virtualization for KDS
- [ ] Add batch API operations
- [ ] Enhanced monitoring dashboard
- [ ] WebSocket rate limiting

## 📞 Getting Help

If you encounter issues not listed here:

1. Check [Troubleshooting Guide](../05-operations/troubleshooting.md)
2. Search existing [GitHub Issues](https://github.com/restaurant-os/issues)
3. Join our [Discord Community](https://discord.gg/restaurant-os)
4. Create a new issue with reproduction steps

## 🔄 Reporting New Issues

When reporting new issues, please include:
- OS and browser versions
- Steps to reproduce
- Expected vs actual behavior
- Console errors (if any)
- Network tab screenshots (for API issues)

---

This document is regularly updated. Last verified: August 27, 2025