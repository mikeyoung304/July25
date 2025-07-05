# Plate-Clean-Test Project Analysis

## Overview
The plate-clean-test project is a comprehensive Next.js restaurant management system with:
- Multi-tenant architecture (tenants table)
- Real-time Kitchen Display System (KDS)
- Voice ordering capabilities
- Table and seat management
- Order tracking and routing
- Performance metrics and analytics

## Key Discoveries

### 1. Environment Configuration (.env.local)
✅ **Transferred to rebuild-6.0**
- Local Supabase Docker instance (port 54321)
- Supabase anon and service role keys
- OpenAI API key for voice features
- Development settings

### 2. Database Schema (Supabase Migrations)
**Multi-tenant Architecture:**
- `tenants` - Restaurant/organization accounts
- `profiles` - User profiles with roles (admin, cook, server, resident)
- Row Level Security (RLS) policies for tenant isolation

**Restaurant Operations:**
- `tables` - Restaurant tables with visual layout properties
- `seats` - Individual seats at tables
- `orders` - Order management with status tracking
- Order items stored as JSONB (flexible structure)

**Kitchen Display System:**
- `kds_stations` - Different kitchen stations (grill, fryer, salad, expo, etc.)
- `kds_order_routing` - Routes orders to appropriate stations
- `kds_configuration` - Station-specific settings
- `kds_metrics` - Performance tracking

**AI/Voice Features:**
- `transcription_cache` - Caches voice transcriptions
- `openai_usage_metrics` - Tracks API usage and costs

### 3. Type System
Comprehensive TypeScript definitions in `types/database.ts`:
- Full database schema types
- Insert/Update/Row types for each table
- Enum types for statuses and roles
- Composite types for joined queries
- API response types

### 4. Key Differences from rebuild-6.0

**Data Model Differences:**
- plate-clean-test: Orders have `items: string[]` (simple array)
- rebuild-6.0: Orders have structured `OrderItem` objects with modifiers/notes
- plate-clean-test: Multi-tenant with `tenant_id` everywhere
- rebuild-6.0: Using `RestaurantContext` for multi-tenancy

**Architecture:**
- plate-clean-test: Next.js App Router with server components
- rebuild-6.0: Vite + React SPA
- plate-clean-test: Server-side Supabase client for SSR
- rebuild-6.0: Client-side only Supabase

## What to Transfer

### Immediate Transfers:
1. ✅ **Environment variables** (.env.local) - Already done
2. **Database schema concepts** - Adapt multi-tenant model
3. **KDS station types and routing logic**
4. **Real-time subscription patterns**
5. **Performance optimization patterns** (memoization, etc.)

### Adapt with Modifications:
1. **Order data structure** - Keep rebuild-6.0's richer OrderItem model
2. **Multi-tenancy** - Use tenant_id pattern instead of RestaurantContext
3. **Type definitions** - Merge best of both approaches
4. **KDS components** - Adapt UI to shadcn/ui components

### Features to Consider:
1. **Voice ordering** - Significant feature not in rebuild-6.0
2. **Transcription caching** - Cost optimization
3. **Metrics tracking** - Performance monitoring
4. **Table layout system** - Visual table positioning

## Recommendations

1. **Update Database Schema:**
   - Add `tenant_id` to all tables for proper multi-tenancy
   - Implement RLS policies for security
   - Add KDS routing tables

2. **Enhance Order Model:**
   - Keep structured OrderItem but add voice transcript support
   - Add order routing to multiple stations
   - Track preparation times

3. **Implement Real-time Features:**
   - Use Supabase channels for order updates
   - Subscribe to station-specific changes
   - Add presence for active users

4. **Performance Optimizations:**
   - Implement caching strategies from plate-clean-test
   - Add metrics collection
   - Use batch operations for efficiency

## Next Steps

1. Create database migrations for rebuild-6.0
2. Update type definitions to include tenant model
3. Implement KDS station management
4. Add real-time order routing
5. Consider voice ordering integration