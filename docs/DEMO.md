
Golden-Path Demo
Goal: Login → Create order → Pay (single payment) → KDS updates → Receipt
Preconditions: DEMO_MODE=true; VOICE_ENABLED=false (text demo); test manager account configured
Steps: (1) Login (2) Create order (3) Submit (KDS shows Preparing) (4) Pay via Square sandbox (5) KDS → Ready → Completed (6) Receipt verified
Verification: No console errors; correct totals (server-computed)
Reset: DEMO_MODE reseeds; script idempotent.
