# Migration Notes from plate-clean-test

This document tracks adaptations made when transferring code from the Next.js-based plate-clean-test to the Vite + React rebuild-6.0 project.

## Key Changes

### 1. Framework Migration
- **From**: Next.js App Router
- **To**: Vite + React Router
- **Changes**:
  - Removed `'use client'` directives (not needed in Vite)
  - Replaced `next/image` with standard `<img>` tags
  - Removed Server Actions in favor of standard API calls
  - Updated routing from file-based to React Router configuration

### 2. Import Path Updates
- **From**: `@/` imports (Next.js convention)
- **To**: `@/` imports (configured in tsconfig.json and vite.config.ts)
- No changes needed in component imports

### 3. Authentication
- **From**: Server-side auth with Next.js middleware
- **To**: Client-side auth with Supabase client
- **Note**: Will need to implement protected routes using React Router

### 4. API Layer
- **From**: Next.js API routes
- **To**: Mock API service (`src/services/api.ts`)
- **Benefits**: 
  - Easier testing during development
  - Can be replaced with real backend API calls
  - Type-safe with TypeScript interfaces

### 5. Real-time Features
- **From**: Custom WebSocket implementation
- **To**: Supabase real-time subscriptions
- **Configuration**: See `src/core/supabase.ts`

### 6. State Management
- **From**: Multiple context providers
- **To**: Simplified RestaurantContext with hooks
- **Location**: `src/core/RestaurantContext.tsx`

## Components Transferred

### Successfully Adapted
1. **KDSOrderCard** (`src/features/kds/KDSOrderCard.tsx`)
   - Removed Next.js specific imports
   - Maintained all functionality
   - Added proper TypeScript exports

2. **UI Components** (`src/components/ui/`)
   - Button, Badge, Card components
   - No changes needed (already framework-agnostic)

3. **Utility Functions** (`src/lib/utils.ts`)
   - Direct copy, no changes needed

### Components Requiring Rebuild
1. **VoiceOrderPanel**
   - Heavy dependency on Next.js specific hooks
   - Will rebuild with simpler state management

2. **Floor Plan Components**
   - Complex canvas interactions
   - Will rebuild with optimized approach

## Environment Variables
- Changed from `NEXT_PUBLIC_*` to `VITE_*` prefix
- See `.env.example` for required variables

## Build & Development
- **Dev Server**: `npm run dev` (Vite's fast HMR)
- **Build**: `npm run build` (outputs to `dist/`)
- **Preview**: `npm run preview`

## Performance Improvements
1. Faster dev server startup (Vite vs Next.js)
2. Smaller bundle sizes with better tree-shaking
3. Simplified build configuration

## Next Steps
1. Implement routing with React Router
2. Add authentication flow
3. Create remaining feature modules
4. Set up testing infrastructure
5. Deploy to production environment