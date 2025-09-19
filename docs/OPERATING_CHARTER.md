# Operating Charter
**Mission:** Green trunk, small PRs, enterprise-leaning security, golden-path demo.  
**Principles:** Minimal diffs • Evidence-based • Feature-flag risk • Tests first • Reversible commits  
**Gates:** typecheck=0 • lint=0 • tests pass • client+server build pass • bundle budget respected  
**Security:** CSRF (mutations) • signatures (webhooks) • origin/CSP/helmet • rate limits • RLS enforced  
**Flags:** VOICE_ENABLED • TWILIO_ENABLED • PAYMENTS_WEBHOOKS_ENABLED • DEMO_MODE  
**Runbook:** see `docs/DEMO.md` and `docs/CHECKS.sh`. Agent entrypoint: `AGENTS.md`.
