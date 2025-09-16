# Root Cause Analysis - Voice Session Temperature Error

## Issue
Voice connection fails with error: "Invalid 'session.temperature': decimal below minimum value. Expected a value ≥ 0.6, but got 0.3 instead."

## Root Cause

### Source of 0.3 temperature value
- **File**: `client/src/modules/voice/config/voice-agent-modes.ts`
- **Line**: 60
- **Config**: `EMPLOYEE_AGENT_CONFIG.temperature: 0.3`
- **Comment**: "Lower temperature for consistency"

### Where temperature is applied
- **File**: `client/src/modules/voice/services/WebRTCVoiceClient.ts`
- **Line**: 986
- **Code**: `temperature: configWithMenu.temperature || 0.6`
- **Issue**: Uses config value (0.3) directly, fallback only applies if undefined

### Validation mismatch
- **Client**: No validation on temperature minimum
- **Server**: `server/src/voice/types.ts:42` - allows min(0), max(2)
- **OpenAI Realtime API**: Enforces minimum 0.6 (runtime error)

## Hypothesis
The OpenAI Realtime API has stricter temperature limits (0.6-2.0) than the regular chat API (0.0-2.0). Our employee mode was configured with 0.3 for consistency, which works for chat but fails for Realtime. The server schema doesn't match the provider's actual requirements.

## Solution
1. Implement SessionConfigNormalizer to clamp values to provider limits
2. Update employee default temperature from 0.3 to 0.7
3. Add validation that matches provider requirements
4. Add server-side safety net for extra protection