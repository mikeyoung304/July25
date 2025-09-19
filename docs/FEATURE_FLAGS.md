# Feature Flags
| Flag | Scope | Default (prod) | Notes |
|---|---|---|---|
| VOICE_ENABLED | Voice UI + /realtime | false | Hide UI & 403 routes when false |
| TWILIO_ENABLED | Telephony/webhooks | false | Block inbound webhooks when false |
| PAYMENTS_WEBHOOKS_ENABLED | Square webhook | false | Register route only when true |
| DEMO_MODE | Demo data/flows | false | Masks prod actions; idempotent demo |

Policy: Fence risky surfaces server+client. Tests MUST cover enabled/disabled.
