# Routes Map
Generated: 2025-09-05

## Authentication Routes (`/api/v1/auth`)

### Public Routes (No Auth Required)
| Route | Method | Purpose | Risk |
|-------|--------|---------|------|
| `/kiosk` | POST | Issue demo JWT token | HIGH - Creates bypass token |
| `/login` | POST | Supabase email/password login | Standard |
| `/pin-login` | POST | PIN-based staff login | Standard |
| `/station-login` | POST | Station device login | Standard |
| `/refresh` | POST | Refresh auth token | Standard |

### Protected Routes (Auth Required)
| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/me` | GET | Get current user | Bearer token |
| `/logout` | POST | End session | Bearer token |
| `/set-pin` | POST | Create/update PIN | Bearer + Manager role |
| `/validate-pin` | POST | Check PIN validity | Bearer token |

## Order Routes (`/api/v1/orders`)

### Protected Routes (Auth Required)
| Route | Method | Purpose | Scopes |
|-------|--------|---------|--------|
| `/` | GET | List orders | orders:read |
| `/` | POST | Create order | orders:create |
| `/:id` | GET | Get order details | orders:read |
| `/:id` | PUT | Update order | orders:update |
| `/:id/status` | PATCH | Update status | orders:status |
| `/voice` | POST | Voice ordering | ai.voice:chat |

## Payment Routes (`/api/v1/payments`)

### Protected Routes (Auth Required)
| Route | Method | Purpose | Scopes |
|-------|--------|---------|--------|
| `/process` | POST | Process payment | payments:process |
| `/refund` | POST | Issue refund | payments:refund |
| `/tip` | POST | Add tip | payments:process |
| `/validate` | POST | Validate payment | payments:read |

## Menu Routes (`/api/v1/menu`)

### Mixed Auth Routes
| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/items` | GET | List menu items | Optional (public menu) |
| `/items` | POST | Create menu item | Manager role |
| `/items/:id` | PUT | Update item | Manager role |
| `/items/:id` | DELETE | Delete item | Manager role |
| `/categories` | GET | List categories | Optional |

## Table Routes (`/api/v1/tables`)

### Protected Routes (Auth Required)
| Route | Method | Purpose | Scopes |
|-------|--------|---------|--------|
| `/` | GET | List tables | tables:read |
| `/` | POST | Create table | Manager role |
| `/:id/assign` | POST | Assign server | tables:assign |
| `/:id/status` | PATCH | Update status | tables:update |

## Kitchen Routes (WebSocket)

### WebSocket Events (Auth via token param)
| Event | Direction | Purpose | Auth |
|-------|-----------|---------|------|
| `order:new` | Server→Client | New order | WS token |
| `order:update` | Server→Client | Status change | WS token |
| `order:status` | Client→Server | Update status | WS token |
| `heartbeat` | Both | Keep-alive | WS token |

## AI/Voice Routes (`/api/v1/ai`, `/api/v1/realtime`)

### Protected Routes
| Route | Method | Purpose | Scopes |
|-------|--------|---------|--------|
| `/ai/voice` | POST | Voice processing | ai.voice:chat |
| `/realtime/session` | GET | WebRTC session | ai.voice:chat |

## Health & Metrics

### Public Routes
| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/health` | GET | Health check | None |
| `/api/v1/health` | GET | API health | None |

### Protected Routes
| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/internal/metrics` | GET | Prometheus metrics | Admin role |

## Security Analysis

### Unprotected Attack Surface
1. **`/api/v1/auth/kiosk`** - Creates demo tokens (MUST RESTRICT)
2. **`/health`** - Acceptable for monitoring
3. **Menu read endpoints** - Acceptable for public menu

### Properly Protected
- ✅ All order operations require auth
- ✅ Payment processing requires scopes
- ✅ Kitchen operations need WebSocket auth
- ✅ Admin functions role-gated

### Recommendations
1. **Add rate limiting** to auth endpoints
2. **Remove/restrict** `/auth/kiosk` endpoint
3. **Move** WebSocket auth from URL to headers
4. **Add** audit logging for auth events
5. **Implement** request signing for critical operations