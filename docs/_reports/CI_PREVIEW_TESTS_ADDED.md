# CI Preview Tests Implementation Report
**Date**: 2025-08-13  
**Branch**: 86BP-phase2-openai  
**Status**: ✅ IMPLEMENTED

## Summary
Implemented reliable CI workflows for Playwright smoke tests and Lighthouse performance audits using Vercel preview deployments. Tests now run against live preview URLs instead of localhost, with backend health verification.

## Changes Made

### 1. Health Check Script
- **File**: `scripts/wait-for-health.sh`
- **Purpose**: Polls backend health endpoint for 90 seconds
- **Usage**: Shared by both CI workflows

### 2. Playwright Smoke Tests Workflow
- **File**: `.github/workflows/playwright-smoke.yml`
- **Updates**:
  - Deploy to Vercel preview first
  - Extract and validate preview URL
  - Wait for backend health at Render
  - Run tests with `@smoke` tag against preview URL
  - Upload artifacts on failure

### 3. Lighthouse Performance Workflow
- **File**: `.github/workflows/lighthouse-performance.yml` (renamed from lighthouse-perf.yml)
- **Updates**:
  - Deploy to Vercel preview first
  - Use treosh/lighthouse-ci-action@v10
  - Audit preview URL with soft thresholds
  - Upload HTML reports as artifacts

### 4. Configuration Updates
- **playwright-smoke.config.ts**: Now accepts `BASE_URL` from environment
- **.lighthouserc.json**: Updated with soft thresholds (warn only, no failures)
- **smoke-tests/basic-routes.spec.ts**: Added `@smoke` tags and regex URL matching

### 5. Documentation
- **CLAUDE.md**: Added CI/CD Pipeline section with required GitHub secrets

## Required GitHub Secrets
The following secrets must be added to the repository:
- `VERCEL_TOKEN` - Your Vercel API token
- `VERCEL_ORG_ID` - Your Vercel organization ID  
- `VERCEL_PROJECT_ID` - The july25-client project ID
- `RENDER_API_BASE` (optional) - Override default backend URL

## How It Works
1. PR triggers workflows for changes in `client/**`
2. Vercel deploys a preview of the client
3. Script waits for Render backend to be healthy
4. Tests run against the preview URL
5. Results uploaded as artifacts

## Benefits
- **Reliable**: Tests run against real deployments, not localhost
- **Isolated**: Each PR gets its own preview environment
- **Fast Feedback**: Smoke tests catch critical issues early
- **Performance Tracking**: Lighthouse scores tracked over time
- **Non-blocking**: Soft thresholds during early development

## Files Modified
- Created: `scripts/wait-for-health.sh`
- Updated: `.github/workflows/playwright-smoke.yml`
- Created: `.github/workflows/lighthouse-performance.yml`
- Updated: `client/playwright-smoke.config.ts`
- Updated: `client/.lighthouserc.json`
- Updated: `client/smoke-tests/basic-routes.spec.ts`
- Updated: `CLAUDE.md`

## Next Steps
1. Add the required GitHub secrets to the repository
2. Open a PR to test the workflows
3. Monitor initial runs and adjust thresholds as needed