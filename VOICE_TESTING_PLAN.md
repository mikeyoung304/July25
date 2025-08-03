# Voice Ordering System Testing Plan

## Overview
This document outlines the comprehensive testing strategy for the voice ordering system with audio response playback, specifically for the "what is on the menu today" query functionality.

## Test Environment Setup

### Prerequisites
1. **Backend Services Running**:
   ```bash
   cd /Users/mikeyoung/CODING/rebuild-6.0
   npm run dev  # Starts both client (3000) and server (3001)
   ```

2. **Environment Variables**:
   - `USE_BUILDPANEL=true` (in root `.env`)
   - `BUILDPANEL_URL=http://localhost:3003` (or your BuildPanel instance)
   - BuildPanel service must be running and accessible

3. **Browser Requirements**:
   - Chrome/Edge (recommended for WebAudio API support)
   - Microphone permissions granted
   - Audio output enabled (speakers/headphones)

## Test Scenarios

### 1. Basic Voice Flow Test
**Objective**: Verify complete voice-to-audio pipeline works

**Steps**:
1. Navigate to `http://localhost:3000/kiosk`
2. Click "Enable microphone" if prompted
3. Press and hold the voice button
4. Say: "What is on the menu today?"
5. Release the button
6. Wait for processing

**Expected Results**:
- Button shows "LISTENING..." while pressed
- Button shows "PROCESSING..." after release
- Audio response plays automatically
- Conversation panel shows transcript
- Volume controls are visible and functional

**Success Criteria**:
- ✅ Audio plays clearly
- ✅ Voice response is relevant to menu query
- ✅ No JavaScript errors in console
- ✅ Audio completes without interruption

### 2. Audio Playback Controls Test
**Objective**: Verify audio playback service functionality

**Steps**:
1. Complete Basic Voice Flow Test
2. While AI is speaking, test volume slider
3. Test mute/unmute button
4. Try another voice query while audio is playing

**Expected Results**:
- Volume changes affect audio immediately
- Mute button stops/starts audio
- New voice input is blocked while audio plays
- Audio status indicator shows "AI Speaking"

**Success Criteria**:
- ✅ Volume controls work in real-time
- ✅ Mute functionality works correctly
- ✅ UI prevents concurrent voice input
- ✅ Status indicators are accurate

### 3. Error Handling Test
**Objective**: Verify graceful error handling

**Test Cases**:

**3a. Network Error Simulation**:
1. Disconnect network during voice processing
2. Verify error message appears
3. Reconnect and try again

**3b. BuildPanel Service Down**:
1. Stop BuildPanel service
2. Try voice input
3. Verify meaningful error message

**3c. Microphone Permission Denied**:
1. Block microphone in browser settings
2. Refresh page
3. Verify permission prompt and error handling

**Expected Results**:
- Clear error messages in conversation panel
- No application crashes
- User can retry after fixing issues

### 4. Performance Test
**Objective**: Verify system performance under normal conditions

**Metrics to Monitor**:
- Time from voice release to audio start (target: <5 seconds)
- Audio latency and quality
- Memory usage during audio playback
- WebSocket connection stability

**Steps**:
1. Open browser developer tools
2. Monitor Network and Performance tabs
3. Perform 5 consecutive voice queries
4. Check for memory leaks or performance degradation

**Success Criteria**:
- ✅ Consistent response times
- ✅ No memory leaks
- ✅ Audio quality remains high
- ✅ WebSocket maintains connection

### 5. Integration Test
**Objective**: Verify integration with order system (future enhancement)

**Note**: Currently the system focuses on audio responses. Order parsing integration would be a future enhancement.

## Manual Testing Checklist

### Pre-Test Setup
- [ ] Server running on port 3001
- [ ] Client running on port 3000
- [ ] BuildPanel service accessible
- [ ] Microphone connected and working
- [ ] Audio output device connected

### Basic Functionality
- [ ] Voice button appears and is clickable
- [ ] Microphone permission request works
- [ ] Voice recording starts on button press
- [ ] Voice recording stops on button release
- [ ] Audio processing indicator appears
- [ ] AI audio response plays automatically
- [ ] Conversation transcript updates correctly

### Audio Controls
- [ ] Volume slider affects playback volume
- [ ] Mute button toggles audio on/off
- [ ] Audio status indicator shows correct state
- [ ] Multiple audio responses queue properly

### Error Conditions
- [ ] Network disconnection handled gracefully
- [ ] Microphone permission denial handled
- [ ] BuildPanel service unavailable handled
- [ ] Audio playback errors handled
- [ ] Invalid voice input handled

### Edge Cases
- [ ] Very short voice input (< 1 second)
- [ ] Very long voice input (> 30 seconds)
- [ ] Background noise during recording
- [ ] Multiple rapid button presses
- [ ] Browser tab switching during audio
- [ ] Window minimizing during audio

## Automated Testing

### Unit Tests
- `AudioPlaybackService` - test audio queue and playback
- `useVoiceToAudio` hook - test voice processing flow
- `VoiceControlWithAudio` - test component behavior

### Integration Tests
- Voice input → API → Audio output flow
- Error handling for each API endpoint
- WebSocket connection management

### E2E Tests
```typescript
// Example Playwright test
test('voice ordering flow', async ({ page }) => {
  await page.goto('http://localhost:3000/kiosk');
  await page.click('[data-testid="enable-microphone"]');
  
  // Mock voice input and verify audio response
  await page.evaluate(() => {
    // Simulate voice input
  });
  
  await expect(page.locator('[data-testid="audio-playing"]')).toBeVisible();
});
```

## Debugging Guide

### Common Issues

**1. No Audio Playback**
- Check browser audio permissions
- Verify BuildPanel service is running
- Check network requests in DevTools
- Confirm audio format support (MP3)

**2. Voice Not Recognized**
- Check microphone permissions
- Verify clear speech and minimal background noise
- Check WebSocket connection status
- Verify BuildPanel voice processing

**3. Slow Response Times**
- Check network latency to BuildPanel
- Monitor server logs for processing times
- Verify adequate system resources

### Debug Commands
```bash
# Check server logs
tail -f /Users/mikeyoung/CODING/rebuild-6.0/server/server.log

# Test BuildPanel connectivity
curl -X GET http://localhost:3003/health

# Check WebSocket connections
# (Use browser DevTools Network tab)
```

## Success Metrics

### Primary Goals
- ✅ "What is on the menu today?" query returns relevant audio response
- ✅ Audio plays clearly without interruption
- ✅ Complete flow works within 10 seconds end-to-end
- ✅ System handles errors gracefully

### Secondary Goals
- ✅ Audio controls (volume, mute) work correctly
- ✅ UI provides clear feedback at each step
- ✅ System prevents user errors (concurrent input)
- ✅ Performance remains consistent across multiple uses

### Technical Requirements
- ✅ No JavaScript errors in console
- ✅ No memory leaks during extended use
- ✅ WebSocket connection remains stable
- ✅ Audio quality is clear and professional

## Test Reports Template

```markdown
## Test Report - [Date]

**Environment**: 
- Browser: Chrome 119+
- OS: macOS
- Server: localhost:3001
- BuildPanel: localhost:3003

**Test Results**:
- Basic Voice Flow: ✅/❌
- Audio Controls: ✅/❌  
- Error Handling: ✅/❌
- Performance: ✅/❌

**Issues Found**:
1. [Issue description]
2. [Issue description]

**Notes**:
[Additional observations]
```

## Next Steps

After successful testing:
1. Deploy to staging environment
2. Conduct user acceptance testing
3. Performance testing with realistic load
4. Security review of voice data handling
5. Documentation updates
6. Production deployment plan