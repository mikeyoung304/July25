# Supabase Database Verification
**Date**: 2025-09-15
**Branch**: hardening/voice-session-guard-20250915

## Configuration Status
- ✅ SUPABASE_URL configured: xiwfhcikfdoshxwbtjxt.supabase.co
- ✅ SUPABASE_SERVICE_KEY present (JWT token)
- Environment: Development/Staging

## Restaurant Tenant
**Default Restaurant ID**: 11111111-1111-1111-1111-111111111111
(Used throughout codebase as development default)

## Staff PIN Status
Due to security constraints, cannot directly query production database.
Staff PINs are hashed with bcrypt (12 rounds) + application pepper.

## Authentication Methods Available
1. **Email/Password**: Via Supabase Auth
2. **PIN Authentication**: 4-6 digit codes for staff
3. **Kiosk/Anonymous**: JWT tokens with limited scope
4. **Station Login**: Shared device authentication

## Voice-Related Tables
- orders: Main order storage
- order_items: Individual line items
- menu_items: Restaurant menu data
- restaurants: Tenant configuration
- users: Staff accounts

## Security Features
- Row-level security enabled
- Restaurant ID validation on all operations
- JWT token validation (RS256 for staff, HS256 for kiosk)
- Audit logging for auth events

## Notes
- Multi-tenant architecture via restaurant_id
- WebSocket events scoped to restaurant
- Voice sessions ephemeral (60-second tokens)
- Payment tokens one-time use only
