# Environment Configuration (v6.0.8-rc.1)

All production deployments require these keys. Values shown are examples only.

## Required
| Key | Description | Example |
|---|---|---|
| `KIOSK_JWT_SECRET` | Signing/verification secret for JWT. **No fallback; server fails fast if unset.** | (32+ random bytes) |
| `SUPABASE_URL` | Supabase REST URL | https://xyz.supabase.co |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server-side ops | (secret) |
| `FRONTEND_URL` | Primary origin allowed by CORS in prod | https://app.growfreshlocalfood.com |
| `ALLOWED_ORIGINS` | Comma-separated extra origins (previews, tools) | https://preview.vercel.app,https://admin.grow… |

## Optional (non-prod only)
| Key | Description | Default |
|---|---|---|
| `DEMO_LOGIN_ENABLED` | Enable `/api/v1/auth/demo-session` | `false` |
| `LOG_LEVEL` | `info` / `debug` | `info` |

## Invariants
- No secrets in the client bundle.
- WebSockets in **production** require a valid JWT.
- CORS in **production** must match `FRONTEND_URL` or one of `ALLOWED_ORIGINS`.

Update both `DEPLOYMENT.md` and this file when keys change.
