# BuildPanel Integration Documentation

## Overview
BuildPanel is the AI service that handles all voice recognition, natural language processing, and text-to-speech functionality for the restaurant ordering system. It runs as a separate service on port 3003 and is proxied through our unified backend on port 3001.

## Architecture

### Service Communication Flow
```
Frontend (5173) → Backend API (3001) → BuildPanel Service (3003)
                ↑                    ↑
            Auth & Context        AI Processing
```

### Key Endpoints
- **Voice Transcription**: `/api/v1/ai/transcribe`
- **Order Parsing**: `/api/v1/ai/parse-order`
- **Menu Upload**: `/api/v1/ai/upload-menu`
- **Health Check**: `/api/health`

## Current Status

### ✅ Working Features
- Voice input capture and transcription
- Audio response generation (MP3)
- Text-to-speech playback
- WebSocket proxy for real-time features

### ❌ Known Issues
- Menu data not synced (BuildPanel using empty menu)
- Real-time streaming capabilities pending validation
- Production endpoints returning 502 errors

## Menu Sync Requirements

### Database Connection
- **Platform**: Supabase PostgreSQL
- **Restaurant ID**: `11111111-1111-1111-1111-111111111111`
- **Tables**: `menu_categories`, `menu_items`
- **Current Items**: 28 menu items across 7 categories

### Expected Menu Structure
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Category Name",
      "sortOrder": 1
    }
  ],
  "items": [
    {
      "id": "uuid",
      "categoryId": "uuid",
      "name": "Item Name",
      "description": "Description",
      "price": 12.00,
      "aliases": ["alias1", "alias2"]
    }
  ]
}
```

## Real-Time Streaming Integration

### Implementation Plan (4 weeks)
- **Week 1**: Validation & Foundation
- **Week 2**: Core streaming infrastructure
- **Week 3**: Advanced features (live transcription)
- **Week 4**: Production readiness

### Performance Targets
| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Total Latency | 3-6s | 1-3s | 50-70% reduction |
| First Transcription | N/A | 500-1000ms | Real-time |
| User Experience | Batch | Live | Qualitative leap |

## Configuration

### Environment Variables
```env
USE_BUILDPANEL=true
BUILDPANEL_URL=http://localhost:3003
BUILDPANEL_API_KEY=your-api-key-here
```

### Service Health Check
```bash
# Check if BuildPanel is running
curl http://localhost:3003/api/health

# Test voice capabilities
npm run test:buildpanel:streaming
```

## Testing

### Voice Testing Commands
```bash
# Full voice pipeline test
npm run test:voice

# BuildPanel streaming test
npm run test:buildpanel:streaming

# POC streaming harness
npm run poc:streaming
```

### Manual Testing Steps
1. Start BuildPanel service on port 3003
2. Run application: `npm run dev`
3. Navigate to any ordering page
4. Click microphone button
5. Say: "What's on the menu today?"
6. Verify audio response plays

## Troubleshooting

### Common Issues

#### BuildPanel Not Responding
- Verify service is running on port 3003
- Check `USE_BUILDPANEL=true` in .env
- Review server logs for connection errors

#### Menu Data Empty
- Ensure menu upload completed: `npm run upload:menu`
- Verify Supabase connection
- Check restaurant_id filter

#### Audio Not Playing
- Check browser audio permissions
- Verify MP3 response from BuildPanel
- Review console for playback errors

## Future Enhancements

### Planned Features
- Real-time streaming transcription
- Multi-language support
- Voice command shortcuts
- Order modification via voice
- Kitchen display voice announcements

### Performance Optimizations
- WebSocket connection pooling
- Audio chunk streaming
- Response caching for common queries
- Fallback to batch mode on streaming failure

## Risk Mitigation

### Critical Risks
1. **BuildPanel Unavailable** (40% probability)
   - Mitigation: Graceful degradation to text input
   - Fallback: Local mock responses for testing

2. **WebSocket Load Issues** (25% probability)
   - Mitigation: Connection pooling and circuit breakers
   - Monitoring: Real-time performance metrics

3. **Browser Compatibility** (60% probability)
   - Mitigation: Progressive enhancement
   - Fallback: Standard HTTP requests

## Support & Resources

### Internal Documentation
- Architecture: `/ARCHITECTURE.md`
- Voice Testing: `/docs/testing/voice-testing.md`
- API Reference: `/docs/api/endpoints.md`

### External Resources
- BuildPanel Documentation: [Pending]
- Supabase Documentation: https://supabase.com/docs
- WebSocket Best Practices: [Internal Wiki]

---

*Last Updated: August 2025*
*Status: Integration in progress, menu sync pending*