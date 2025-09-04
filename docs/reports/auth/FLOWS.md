# Authentication Flows

## Implemented Flows

### 1. Email/Password (Primary)
- **Route**: POST /api/v1/auth/login
- **Users**: Managers, Servers, Kitchen, Expo, Cashier
- **Token**: Standard Supabase JWT (733 chars)
- **Duration**: 1 hour sessions
- **Status**: ✅ Working

### 2. PIN Authentication
- **Route**: POST /api/v1/auth/pin-login
- **Users**: Service staff quick login
- **Storage**: user_pins table with hashed PINs
- **Status**: ✅ Pins seeded, needs route testing

### 3. Station Tokens
- **Route**: POST /api/v1/auth/station
- **Purpose**: Shared kitchen/expo displays
- **Storage**: station_tokens table
- **Status**: ⚠️ Not yet implemented

## Session Management
- Supabase handles refresh tokens automatically
- Sessions stored in auth.sessions table
- User metadata includes email_verified flag

## Key Finding
✅ Standard Supabase auth works with membership-based RLS
No custom JWT claims needed!