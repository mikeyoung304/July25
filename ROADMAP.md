# Roadmap (Q4 2025)

## Now → Launch
- Cut v6.0.8-rc.1, canary, full rollout with monitors.
- Docs freeze during canary (critical fixes only).

## Sprint: Refactor & Conform (post-launch)
- **ADR-001 Naming**: snake_case end-to-end; remove camel↔snake transformers; update client models & API docs.
- **Complexity**: split OrdersService, VoiceWebSocketServer, KitchenDisplayOptimized into focused units.
- **Observability**: structured logs, request IDs/correlation, Sentry (client+server).
- **Payments**: increase integration tests and error semantics.

## Stretch
- Offline/low-connectivity improvements for KDS.
- Configurable KDS roles/views per station.
