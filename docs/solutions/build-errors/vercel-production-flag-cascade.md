---
title: Vercel --production Flag Cascade
category: build-errors
severity: P0
cost: $900
duration: 9 hours
symptoms:
  - "vite: command not found"
  - "tsc: command not found"
  - Works locally, fails in Vercel
  - Multiple PATH manipulation attempts don't help
root_cause: Vercel runs npm ci --production by default, excluding devDependencies
tags: [vercel, build, monorepo, npm]
created_date: 2025-11-25
---

# Vercel --production Flag Cascade

## Problem

Vercel runs `npm ci --production` by default, excluding ALL devDependencies. Build tools (vite, typescript) are devDependencies, so builds fail with "command not found". 30 commits tried PATH manipulation — NONE worked.

## Bug Pattern

```json
// vercel.json - BROKEN (default behavior)
{
  "buildCommand": "npm run build"
}
// Result: vite not found, tsc not found
```

## Fix Pattern

```json
// vercel.json - CORRECT
{
  "installCommand": "npm ci --production=false --workspaces --include-workspace-root",
  "buildCommand": "npm run build:vercel"
}

// package.json
{
  "scripts": {
    "build:vercel": "npm run build --workspace=@rebuild/shared --if-present && npm run build --workspace=restaurant-os-client"
  }
}
```

## Prevention

- Always use `--production=false` for Vercel install
- Build shared workspace FIRST, then client
- Test with `npm ci --production` locally before deploying

## Key Insight

**No amount of PATH manipulation fixes missing packages.** The packages must be INSTALLED first. `--production=false` is the ONLY solution.
