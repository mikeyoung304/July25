# Per-Restaurant Voice Configuration

## Overview

The voice session middleware now supports per-restaurant voice configuration overrides, enabling restaurants to customize voice AI parameters for their specific needs.

## Configuration Priority (Fallback Chain)

1. **Request Parameters** (highest priority)
2. **Environment Variables**
3. **Restaurant Settings** (database)
4. **Mode Defaults** (employee/customer defaults)

All values are still validated and clamped by the `normalizeSessionConfig` function to ensure they comply with OpenAI Realtime API limits.

## Database Schema

Restaurant voice settings are stored in the `restaurants.settings` JSON column:

```json
{
  "voice": {
    "employee": {
      "temperature": 0.7,
      "topP": 1.0,
      "presencePenalty": 0.0,
      "frequencyPenalty": 0.0,
      "max_response_output_tokens": 50
    },
    "customer": {
      "temperature": 0.85,
      "topP": 1.0,
      "presencePenalty": 0.0,
      "frequencyPenalty": 0.0,
      "max_response_output_tokens": 500
    }
  }
}
```

## API Usage

### Setting Restaurant Voice Configuration

```typescript
import { RestaurantService } from '../services/restaurant.service';

// Update restaurant voice settings
await RestaurantService.updateRestaurantSettings(restaurantId, {
  voice: {
    employee: {
      temperature: 0.65,  // More conservative for employees
      max_response_output_tokens: 30
    },
    customer: {
      temperature: 0.9,   // More conversational for customers
      max_response_output_tokens: 600
    }
  }
});
```

### Retrieving Voice Settings

```typescript
// Get voice settings for a specific mode
const employeeSettings = await RestaurantService.getVoiceSettings(restaurantId, 'employee');
const customerSettings = await RestaurantService.getVoiceSettings(restaurantId, 'customer');
```

## Middleware Flow

The `normalizeVoiceSession` middleware follows this process:

1. **Extract mode** from request body (`employee` | `customer`)
2. **Get restaurant ID** from authenticated request context
3. **Fetch restaurant voice settings** from database (cached)
4. **Apply environment overrides** (if configured)
5. **Apply request parameters** (highest priority)
6. **Normalize and clamp** all values using `normalizeSessionConfig`
7. **Log configuration sources** for debugging

## Example Configuration Scenarios

### Scenario 1: Fine Dining Restaurant
```json
{
  "voice": {
    "employee": {
      "temperature": 0.6,           // Very consistent responses
      "max_response_output_tokens": 25  // Brief acknowledgments
    },
    "customer": {
      "temperature": 0.75,          // Professional but friendly
      "max_response_output_tokens": 300 // Detailed explanations
    }
  }
}
```

### Scenario 2: Fast Casual Restaurant
```json
{
  "voice": {
    "employee": {
      "temperature": 0.8,           // More flexible responses
      "max_response_output_tokens": 40  // Quick confirmations
    },
    "customer": {
      "temperature": 0.9,           // Very conversational
      "max_response_output_tokens": 600 // Comprehensive responses
    }
  }
}
```

## Caching

Restaurant voice settings are cached using NodeCache with the same TTL as other restaurant data. Cache keys:

- `restaurant:settings:{restaurantId}`
- `restaurant:voice_settings:{restaurantId}:employee`
- `restaurant:voice_settings:{restaurantId}:customer`

Cache is automatically cleared when restaurant settings are updated.

## Logging

The middleware provides detailed logging about the configuration fallback chain:

```json
{
  "mode": "customer",
  "restaurantId": "rest_123",
  "configSources": {
    "temperature": "restaurant",
    "topP": "default",
    "presencePenalty": "environment",
    "frequencyPenalty": "request",
    "max_response_output_tokens": "restaurant"
  },
  "changes": {
    "temperature": {
      "from": 0.95,
      "to": 0.85,
      "reason": "clamped_to_limits"
    }
  }
}
```

## Implementation Notes

- All settings remain optional - restaurants can override only specific parameters
- Values are still subject to OpenAI Realtime API limits (e.g., temperature ≥ 0.6)
- The service includes error handling and fallbacks to ensure the voice system continues working even if database access fails
- Restaurant settings are loaded asynchronously but with proper error handling to avoid blocking voice sessions