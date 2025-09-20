# Feature Flags
| Flag | Scope | Default | Note |
|---|---|---|---|
| VOICE_ENABLED | Voice UI + realtime session | false | Hide UI & 403 routes when false |
| TWILIO_ENABLED | Telephony/webhooks | false | Block inbound webhooks when false |
| PAYMENTS_WEBHOOKS_ENABLED | Square webhook route | false | Register route only when true |
| DEMO_MODE | Demo data/flows | false | Masks prod actions; idempotent demo |
