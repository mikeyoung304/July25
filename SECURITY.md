# Security Policy

## Supported Versions
| Version | Supported |
|---------|-----------|
| 6.0.x   | ✅        |
| < 6.0   | ❌        |

## Reporting
Email: security@restaurant-os.com (do not open a public issue). Include reproduction steps, commit hash, and environment.

## Controls

### Authentication & Authorization
- **JWT secret:** single required secret (KIOSK_JWT_SECRET or canonical) — the server fails to start if missing. No default or fallback.
- **WS auth:** production WebSocket connections require a valid JWT; anonymous access disabled.
- **RBAC:** roles embedded in JWT; server validates on each request.

### Multi-tenancy (Defense-in-Depth)
- **Middleware:** JWT validated; tenant context resolved.
- **Application:** all UPDATE/DELETE mutations must include `.eq('restaurant_id', restaurantId)`.
- **Database (RLS):** row-level security on orders/scheduled_orders; policies enforce `restaurant_id = jwt.restaurant_id`.
- **PIN model:** per-restaurant; composite unique (restaurant_id, user_id).

### Transport & Data
- TLS 1.2+; no secrets in the client bundle; PII redaction in server logs (tokens/emails/passwords).
- Payments tokenized; never store card data.

### CORS
- **Prod:** explicit allowlist via FRONTEND_URL and ALLOWED_ORIGINS. No wildcard origins.
- **Non-prod:** allow localhost dev ports only.

### Verification
- Artifact audit greps dist/ for secrets/emails/demo strings.
- WS e2e tests assert single connection/handlers under thrash/nav-churn.
