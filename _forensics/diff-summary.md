# Diff Analysis: Last Green to First Red

## Timeline
- Last Green: `6238f67` (chore(ci): add auto-deploy workflows)
- First Red: `5c7bd4a` to `d97ef36` (shared module changes)

## Critical Changes Found

### 1. Node Version Changes
- **package.json**: Changed from `"node": ">=18.0.0"` to `"node": "20.x"`
- **Added .nvmrc**: Specifies `20.18.1`
- **Added packageManager**: `"npm@10.7.0"`
- **Local conflict**: System has Node v24.2.0, but project expects 20.x

### 2. Shared Module Build Configuration
- **shared/package.json**:
  - Changed from source imports (`main: "types/index.ts"`) to built dist (`main: "dist/index.js"`)
  - Added exports map restricting subpath imports (`./*": null`)
  - Now requires build step before use

### 3. Vercel Configuration Changes
- **Moved**: From `client/vercel.json` to root `vercel.json`
- **installCommand**: Changed to `npm ci --workspaces`
- **buildCommand**: Now builds shared first: `npm run build --workspace shared && npm run build --workspace client`
- **New requirement**: Shared must be built before client

### 4. Render Configuration Changes
- **buildCommand**: Changed from `npm ci` to `npm ci --workspaces`
- **New requirement**: Workspace-aware install

### 5. Client Import Path Changes
- **tsconfig.app.json**: Added new path aliases for shared (`/shared/*`, `@shared/*`)
- **vite.config.ts**: Added corresponding Vite aliases
- **Multiple files**: Changed from subpath imports to main barrel export

### 6. Husky/Prepare Script
- **package.json**: Changed prepare script to check for husky existence first
- Likely to prevent CI failures where husky isn't needed

## Key Risk Areas

1. **Node Version Mismatch**: Providers may use different Node versions than specified
2. **Shared Build Dependency**: Client now requires shared to be built first
3. **Subpath Import Restriction**: `"./*": null` blocks direct file imports from shared
4. **Workspace Install**: Both providers must support npm workspaces
5. **Missing Build Output**: If shared/dist doesn't exist, imports will fail