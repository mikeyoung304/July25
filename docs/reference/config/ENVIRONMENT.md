# Environment Variables Reference

**Last Updated**: 2025-11-15
**Version**: 6.0.14
**Status**: Production Ready

This document provides the authoritative reference for all environment variables used in the Restaurant OS system. Variables are validated at startup using Zod schemas per ADR-009 fail-fast philosophy.

## Configuration Variables

### Required Variables

The following variables MUST be set for the application to function:

| Variable | Type | Required | Default | Description |
| -------- | ---- | -------- | ------- | ----------- |
| SUPABASE_URL | URL | Yes | - | ====================. Supabase Configuration. ====================. Get these from: https://app.supabase.com/project/YOUR_PROJECT |
| SUPABASE_ANON_KEY | String | Yes | - | supabase anon key |
| SUPABASE_SERVICE_KEY | String | Yes | - | supabase service key |
| SUPABASE_JWT_SECRET | String | Yes | - | supabase jwt secret |
| OPENAI_API_KEY | String | Yes | - | ====================. OpenAI Configuration. ==================== |
| SQUARE_ACCESS_TOKEN | String | Yes | - | ====================. Square Payment Configuration. ====================. Get these from: https://developer.squareup.com/apps |
| SQUARE_LOCATION_ID | String | Yes | - | square location id |
| SQUARE_WEBHOOK_SIGNATURE_KEY | String | Yes | - | square webhook signature key |
| PIN_PEPPER | String | Yes | - | ====================. Security Configuration. ====================. Required for v6.0.5+ |
| DEVICE_FINGERPRINT_SALT | String | Yes | - | device fingerprint salt |
| VITE_SUPABASE_URL | URL | Yes | - | vite supabase url |
| VITE_SUPABASE_ANON_KEY | String | Yes | - | vite supabase anon key |
| VITE_SQUARE_APP_ID | String | Yes | - | Square frontend configuration |
| VITE_SQUARE_LOCATION_ID | String | Yes | - | vite square location id |

### Optional Variables

The following variables are optional and have sensible defaults:

| Variable | Type | Required | Default | Description |
| -------- | ---- | -------- | ------- | ----------- |
| NODE_ENV | String | No | development | ====================. Server Configuration. ==================== |
| PORT | Number | No | 3001 | port |
| DEFAULT_RESTAURANT_ID | String | No | grow | Default restaurant identifier. Supports both UUID format (11111111-1111-1111-1111-111111111111) and slug format (grow). See [ADR-008](../../explanation/architecture-decisions/ADR-008-slug-based-routing.md) |
| DATABASE_URL | URL | No | postgresql://user:password@localhost:5432/dbname | Database URL (Cloud Supabase). Get from: Supabase Dashboard > Settings > Database > Connection string. Format: postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres |
| SQUARE_ENVIRONMENT | String | No | sandbox # 'sandbox' for testing, 'production' for live payments | square environment |
| FRONTEND_URL | URL | No | http://localhost:5173 # Required for CORS | frontend url |
| AUTH_DUAL_AUTH_ENABLE | Boolean | No | true | Dual Authentication Pattern (v6.0.8+). Enable support for both Supabase sessions AND localStorage sessions. Required for demo/PIN/station authentication alongside Supabase |
| AUTH_ACCEPT_KIOSK_DEMO_ALIAS | String | No | true | Authentication Role Aliasing. Accept deprecated 'kiosk_demo' role as 'customer' for backwards compatibility. Set to 'false' to reject kiosk_demo tokens (after migration complete) |
| LOG_LEVEL | String | No | debug | ====================. Logging & Monitoring. ==================== |
| LOG_FORMAT | String | No | json | log format |
| CACHE_TTL_SECONDS | String | No | 300 | ====================. Performance Configuration. ==================== |
| RATE_LIMIT_WINDOW_MS | Number | No | 60000 | rate limit window ms |
| RATE_LIMIT_MAX_REQUESTS | Number | No | 100 | rate limit max requests |
| VITE_API_BASE_URL | URL | No | http://localhost:3001 | REQUIRED: Core Client Variables (app will fail without these) |
| VITE_DEFAULT_RESTAURANT_ID | String | No | grow | Client-side default restaurant identifier. Supports both UUID and slug formats. Used in customer-facing URLs (e.g., /order/grow). See [ADR-008](../../explanation/architecture-decisions/ADR-008-slug-based-routing.md) |
| VITE_ENVIRONMENT | String | No | development | vite environment |
| VITE_SQUARE_ENVIRONMENT | String | No | sandbox # Must match SQUARE_ENVIRONMENT | vite square environment |
| VITE_USE_MOCK_DATA | String | No | false | Optional client features |
| VITE_USE_REALTIME_VOICE | String | No | false | vite use realtime voice |
| VITE_ENABLE_PERF | Boolean | No | false # Performance monitoring | vite enable perf |
| VITE_DEBUG_VOICE | String | No | false # Voice/menu debugging | vite debug voice |
| VITE_DEMO_PANEL | String | No | 0 # Enable demo auth panel (set to '1' for development) | vite demo panel |

## Variable Categories

### Database Configuration
- `DATABASE_URL` - PostgreSQL connection string
- `DIRECT_URL` - Direct database connection (bypassing pooler)

### Authentication
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only)
- `JWT_SECRET` - Secret for JWT token signing

### Payment Processing
- `SQUARE_ACCESS_TOKEN` - Square API access token
- `SQUARE_LOCATION_ID` - Square location ID
- `SQUARE_ENVIRONMENT` - Square environment (sandbox or production)

### AI Services
- `OPENAI_API_KEY` - OpenAI API key for voice transcription
- `ANTHROPIC_API_KEY` - Anthropic API key for order processing

### Application
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment mode (development, production, test)
- `CLIENT_URL` - Frontend application URL
- `ENABLE_REALTIME_STREAMING` - Enable WebSocket streaming

### Restaurant Identification
- `DEFAULT_RESTAURANT_ID` - Server-side default restaurant (supports UUID or slug)
- `VITE_DEFAULT_RESTAURANT_ID` - Client-side default restaurant (supports UUID or slug)

**Slug-Based Routing** (Since v6.0.9):
Restaurant identifiers support both UUID and human-friendly slug formats:

- **UUID Format**: `11111111-1111-1111-1111-111111111111`
- **Slug Format**: `grow` (recommended for customer-facing URLs)

The backend middleware transparently resolves slugs to UUIDs, so business logic continues to work with UUIDs while customers see clean URLs.

**Examples**:
```bash
# Customer-facing URLs (use slug)
VITE_DEFAULT_RESTAURANT_ID=grow
# Results in: /order/grow, /checkout/grow

# Internal/legacy (UUID still supported)
VITE_DEFAULT_RESTAURANT_ID=11111111-1111-1111-1111-111111111111
# Results in: /order/11111111-1111-1111-1111-111111111111
```

See [ADR-008: Slug-Based Restaurant Routing](../explanation/architecture-decisions/ADR-008-slug-based-routing.md) for architecture details.

## Security Notes

⚠️ **Never commit actual values for secret keys**

- All `*_KEY`, `*_SECRET`, and `*_TOKEN` variables should be kept secure
- Use environment-specific `.env` files (gitignored)
- For production, use your hosting platform's environment variable management

## Validation

Environment variables are validated on application startup using Zod schemas.
See `shared/config/environment.ts` for validation logic.

## Quick Reference

| Category | Location | Key Variables |
|----------|----------|--------------|
| **Server** | `server/src/config/env.ts` | Database, Auth, Payments |
| **Client** | `client/src/config/env.schema.ts` | UI, Voice, Features |
| **Template** | `.env.example` | All variables with placeholders |
| **Production** | Platform dashboards | Vercel (client), Render (server) |

## Architecture

### File Structure (Post-Cleanup 2025-11-15)
```
/
├── .env                    # Local development (gitignored)
├── .env.example            # Template with all variables
└── client/
    └── .env.production     # Vercel reference template
```

**Deleted Files** (11 redundant files removed):
- `.env-audit-with-secrets.md`
- `.env.bak`
- `.env.preview.vercel`
- `.env.production`
- `.env.production.vercel`
- `.env.staging.example`
- `.env.vercel.check`
- `.env.vercel.current`
- `client/.env.example`
- `config/.env.production.template`
- `config/.env.security.template`
- `server/.env.test`

### Loading Hierarchy
1. **Server**: Reads from `../.env` (root directory)
2. **Client**: Reads VITE_ prefixed variables from root `.env`
3. **Production**: Uses dashboard-injected variables (no files)

## Validation

### Startup Validation (Zod)
- **Server**: `server/src/config/env.schema.ts`
- **Client**: `client/src/config/env.schema.ts`
- Implements fail-fast per ADR-009
- Trims whitespace/newlines automatically

### CI/CD Validation
- **Pre-commit**: `.husky/pre-commit`
- **GitHub Actions**: `.github/workflows/env-validation.yml`
- **Script**: `scripts/validate-env.js`

### Validation Commands
```bash
# Local validation
npm run env:validate

# Check production readiness
node scripts/validate-env.js --check-production
```

## Common Issues & Solutions

### Voice ordering not working
**Solution**: Ensure `VITE_USE_REALTIME_VOICE=true` in Vercel dashboard

### Trailing newlines breaking comparisons
**Solution**: Zod schema automatically trims all values

### Restaurant ID format mismatch
**Solution**: Use slug format (`grow`) for both client and server

### Secrets exposed in repository
**Solution**: Rotate immediately using `openssl rand -hex 32`, update all dashboards

## References

- **ADR-007**: [Per-Restaurant Configuration](../../explanation/architecture-decisions/ADR-007-per-restaurant-configuration.md)
- **ADR-008**: [Slug-Based Routing](../../explanation/architecture-decisions/ADR-008-slug-based-routing.md)
- **ADR-009**: [Error Handling Philosophy](../../explanation/architecture-decisions/ADR-009-error-handling-philosophy.md)
- **CL004**: No VITE_ prefix for secrets (Claudelessons)

---

*This document is the single source of truth for environment configuration.*
*Last major cleanup: 2025-11-15 (reduced from 15 to 3 .env files)*
