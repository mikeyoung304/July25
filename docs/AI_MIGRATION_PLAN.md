# AI Migration Plan: BuildPanel to OpenAI

## Architectural Constraints (must stay true)

- [ ] One backend (Express) on 3001; existing WS unchanged
- [ ] Public API routes + response shapes unchanged (/api/v1/*, /api/v1/ai/*)
- [ ] No client-side AI keys; client only has VITE_API_BASE_URL
- [ ] BuildPanel is fully removed (no flags, no fallbacks)

## Current State Audit (fill before coding)

### Files that import/use BuildPanel
- [x] List of files that import/use BuildPanel (paths + functions)
- [x] Where AI routes are wired today (ai.routes.ts etc.)
- [x] Any env/config that still mentions BP
- [x] Count of TS errors: 334 (pre-existing, not addressed in this PR)

### BuildPanel Usage Summary
**Total Files with BuildPanel Dependencies: 7**
- `server/src/services/ai.service.ts` - Main AI orchestration, delegates to BuildPanel
- `server/src/services/buildpanel.service.ts` - BuildPanel client service
- `server/src/routes/ai.routes.ts` - AI endpoints that call BuildPanel
- `server/src/routes/health.routes.ts` - Health checks for BuildPanel
- `server/src/server.ts` - Startup/shutdown hooks for BuildPanel
- `server/src/config/environment.ts` - BuildPanel configuration
- `server/scripts/integration-check.ts` - Integration tests

**Key API Routes to Maintain:**
- `POST /api/v1/ai/menu` - Menu sync
- `POST /api/v1/ai/transcribe` - Voice transcription
- `POST /api/v1/ai/voice-chat` - Voice chat with metadata
- `POST /api/v1/ai/chat` - Text chat
- `POST /api/v1/ai/parse-order` - Order parsing
- `GET /api/v1/ai/health` - AI service health

## Deliverables (this PR)

- [ ] OpenAI adapters: STT, TTS, Chat, OrderNLP
- [ ] OrderMatchingService (name→canonical ID, with suggestions)
- [ ] Route wiring to adapters (no shape changes)
- [ ] Provider health endpoint
- [ ] Rate limits + body limits
- [ ] Metrics (request/error counters, latency)
- [ ] Tests (unit + integration)
- [ ] Final greps prove zero BP in active code

## Acceptance Criteria (must pass before PR)

- [ ] `/api/v1/ai/transcribe` → real text from small webm payload
- [ ] `/api/v1/ai/parse-order` → zod-validated ParsedOrder w/ canonical IDs
- [ ] `/api/v1/ai/chat` → sensible reply; can reference menu via server lookup
- [ ] Auth + X-Restaurant-ID enforced on all AI routes
- [ ] No client exposure of AI keys; single backend on 3001; WS unchanged

## Implementation Status

### Phase 0: Planning & Setup
- [x] Create branch `86BP-phase2-openai`
- [x] Create this migration plan document
- [ ] Ground-truth BuildPanel usage report

### Phase 1: Dependencies & Config
- [ ] Add openai, zod dependencies
- [ ] Fail fast if OPENAI_API_KEY missing
- [ ] Remove BP env vars

### Phase 2: OpenAI Adapters
- [ ] Transcription adapter (Whisper)
- [ ] TTS adapter (Speech)
- [ ] Chat adapter
- [ ] Order NLP adapter

### Phase 3: Order Matching
- [ ] OrderMatchingService
- [ ] ParsedOrder schema (zod)
- [ ] Menu name → canonical ID mapping

### Phase 4: Route Wiring
- [ ] Replace BuildPanel calls in ai.routes.ts
- [ ] Replace BuildPanel calls in ai.service.ts
- [ ] Add provider health endpoint
- [ ] Add rate/body limits
- [ ] Ensure auth/tenant guards

### Phase 5: Cleanup
- [ ] Delete buildpanel.service.ts
- [ ] Remove all BP references
- [ ] Update docs

### Phase 6: Tests & Metrics
- [ ] Unit tests
- [ ] Integration tests
- [ ] Metrics & logging

### Phase 7: Final Verification
- [ ] Clean greps (no BP references)
- [ ] Pre-push checks pass
- [ ] PR ready

## TypeScript Errors Note
Current count: 334 errors (pre-existing, not addressed in this PR)

## Phase 2 Deliverables

- [x] openai-transcriber.ts (commit 01a9425)
- [x] openai-tts.ts (commit de496a4)
- [x] openai-chat.ts (commit f01c3a7)
- [ ] openai-order-nlp.ts
- [ ] OrderMatchingService (name → canonical IDs + suggestions)
- [ ] shared/types/orders.ts (zod schema)
- [ ] Wire routes to adapters (no contract changes)
- [ ] Delete BuildPanel code (service + imports)
- [ ] Tests: unit + integration
- [ ] Provider health + rate/body limits
- [ ] Metrics (counters + latency)
- [ ] Final greps: zero BP in active code

## Acceptance Criteria

- [ ] POST /api/v1/ai/transcribe returns real text for a small webm
- [ ] POST /api/v1/ai/parse-order returns zod-validated ParsedOrder with canonical IDs
- [ ] POST /api/v1/ai/chat replies (can reference menu via server lookup)
- [ ] Auth + X-Restaurant-ID enforced; single backend on 3001; WS unchanged

## References
- BuildPanel usage report: `docs/_reports/buildpanel-usage.md`
- Original architecture doc: `ARCHITECTURE.md`