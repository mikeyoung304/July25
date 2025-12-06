---
status: complete
priority: p3
issue_id: "127"
tags: [config, external-services]
dependencies: []
created_date: 2025-12-02
resolved_date: 2025-12-02
---

# TODO: Hardcoded External Service URLs

## Resolution

Created `/Users/mikeyoung/CODING/rebuild-6.0/server/src/config/services.ts` with configurable URLs for DataDog and New Relic services. Updated:
- `server/src/routes/metrics.ts`: DataDog API URL and New Relic metrics URL now use config
- `server/src/middleware/security.ts`: DataDog logs URL now uses config

Note: The TODO mentioned GitHub API, npm registry, and ipapi.co URLs, but these were not found in the actual codebase. The changes address the external service URLs that actually exist (DataDog and New Relic monitoring services).

## Problem

External service URLs are hardcoded in multiple files, preventing use of private instances, alternative services, or test doubles. This reduces flexibility and makes testing harder.

## Locations

1. **File**: `server/src/routes/metrics.ts`
   - **Line 60**: `fetch('https://api.github.com/repos/...')`
   - **Line 104**: `fetch('https://registry.npmjs.org/...')`

2. **File**: `server/src/middleware/security.ts`
   - **Line 209**: `fetch('https://ipapi.co/...')`

## Current Code

```typescript
// metrics.ts:60
const response = await fetch('https://api.github.com/repos/owner/repo/commits', {
  headers: { 'Authorization': `token ${process.env.GITHUB_TOKEN}` }
});

// metrics.ts:104
const response = await fetch('https://registry.npmjs.org/package-name', {
  headers: { 'Accept': 'application/json' }
});

// security.ts:209
const response = await fetch(`https://ipapi.co/${ip}/json/`, {
  timeout: 5000
});
```

## Proposed Solution

Add environment variables with sensible defaults:

```typescript
// server/src/config/services.ts
export const serviceConfig = {
  github: {
    apiUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
    token: process.env.GITHUB_TOKEN
  },
  npm: {
    registryUrl: process.env.NPM_REGISTRY_URL || 'https://registry.npmjs.org'
  },
  ipApi: {
    baseUrl: process.env.IP_API_URL || 'https://ipapi.co',
    timeout: parseInt(process.env.IP_API_TIMEOUT || '5000', 10)
  }
};
```

## Updated Code

```typescript
// metrics.ts
import { serviceConfig } from '../config/services';

// Line 60
const response = await fetch(
  `${serviceConfig.github.apiUrl}/repos/owner/repo/commits`,
  {
    headers: {
      'Authorization': serviceConfig.github.token
        ? `token ${serviceConfig.github.token}`
        : undefined
    }
  }
);

// Line 104
const response = await fetch(
  `${serviceConfig.npm.registryUrl}/package-name`,
  {
    headers: { 'Accept': 'application/json' }
  }
);

// security.ts:209
import { serviceConfig } from '../config/services';

const response = await fetch(
  `${serviceConfig.ipApi.baseUrl}/${ip}/json/`,
  {
    timeout: serviceConfig.ipApi.timeout
  }
);
```

## Environment Variables

Add to `.env.example`:

```bash
# External Service URLs (optional - defaults provided)
# GITHUB_API_URL=https://api.github.com
# NPM_REGISTRY_URL=https://registry.npmjs.org
# IP_API_URL=https://ipapi.co
# IP_API_TIMEOUT=5000
```

## Benefits

1. **Testing**: Use test doubles or mock services
2. **Private Instances**: Corporate GitHub/npm registries
3. **Rate Limiting**: Route through proxy or caching layer
4. **Security**: Block external calls in isolated environments
5. **Development**: Use local mock servers

## Testing

```typescript
// Example test setup
process.env.GITHUB_API_URL = 'http://localhost:3000/mock-github';
process.env.NPM_REGISTRY_URL = 'http://localhost:3000/mock-npm';
process.env.IP_API_URL = 'http://localhost:3000/mock-ipapi';

// Now tests can use local mock servers
```

## Migration

1. Create `server/src/config/services.ts`
2. Update imports in affected files
3. Replace hardcoded URLs with config values
4. Update `.env.example` with optional variables
5. Update documentation if needed
6. Test with default values (no env vars set)
7. Test with custom values

## Effort

~30 minutes (create config, update 3 files, test)
