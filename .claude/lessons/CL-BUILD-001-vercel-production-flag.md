# CL-BUILD-001: Vercel --production Flag Cascade

**Severity:** P0 | **Cost:** $900 | **Duration:** 9 hours | **Commits:** 30 sequential failures

## Problem

Vercel runs `npm ci --production` by default, excluding ALL devDependencies. Build tools (vite, typescript) are devDependencies, so builds fail with "command not found".

## Bug Pattern

```json
// vercel.json - BROKEN (default behavior)
{
  "buildCommand": "npm run build"
}
// Result: vite not found, tsc not found
// 30 commits trying PATH manipulation - NONE worked
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

## Prevention Checklist

- [ ] Always use `--production=false` for Vercel install
- [ ] Build shared workspace FIRST, then client
- [ ] Use `--if-present` for optional workspace builds
- [ ] Test with `npm ci --production` locally before deploying
- [ ] Check Vercel build logs for "Installing dependencies" section

## Detection

- `vite: command not found`
- `tsc: command not found`
- Works locally, fails in Vercel
- Multiple PATH manipulation attempts don't help

## Key Insight

**No amount of PATH manipulation fixes missing packages.** The packages must be INSTALLED first. `--production=false` is the ONLY solution.
