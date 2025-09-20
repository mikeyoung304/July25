# Operating Charter
**Mission:** Green trunk, small PRs, security by default, golden-path demo.  
**Principles:** Minimal diffs • Evidence-based • Feature-flag risk • Tests first • Reversible commits  
**Gates:** typecheck=0 • lint=0 • tests pass • client+server build pass • bundle budget respected  
**Security:** CSRF (mutations) • webhook signatures • origin/CSP/helmet • rate limits • RLS enforced  
**Flags:** VOICE_ENABLED • TWILIO_ENABLED • PAYMENTS_WEBHOOKS_ENABLED • DEMO_MODE  
**Runbook:** `docs/DEMO.md` and `docs/CHECKS.sh`. Entry: `AGENTS.md`.
