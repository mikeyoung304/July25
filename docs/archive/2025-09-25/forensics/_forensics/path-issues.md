# Path and Import Issues

## Duplicate Filenames Found
Multiple files with same name in different folders detected. This could cause issues on case-insensitive systems.

Common duplicates:
- index.ts (multiple locations)
- tsconfig.json (root, client, server, shared)
- package.json (root, client, server, shared)
- README.md (multiple)
- vitest.config.ts (multiple)

## Shared Import Analysis
- No subpath imports found (`@rebuild/shared/...`)
- Successfully migrated to barrel exports only
- Client and server both use `@rebuild/shared` main export

## Case Sensitivity Risk
- macOS (dev) is case-insensitive
- Linux (Vercel/Render) is case-sensitive
- No obvious case-only differences found in critical files