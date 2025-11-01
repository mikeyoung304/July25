# Kitchen Display System (KDS) Bible

**Last Updated:** 2025-10-31

**Status**: ✅ Merged into [DEPLOYMENT.md](./DEPLOYMENT.md#kds-deploy)

**Merged**: October 15, 2025
**Original**: Archived in `docs/archive/2025-10/2025-10-15_KDS-BIBLE.md`

This document's verified content has been integrated into the canonical deployment documentation with corrected file paths.

## Quick Links

- **KDS Deployment**: See [DEPLOYMENT.md#kds-deploy](./DEPLOYMENT.md#kds-deploy)
- **Order Statuses**: See [DEPLOYMENT.md#kds-deploy](./DEPLOYMENT.md#kds-deploy)
- **WebSocket Real-Time Updates**: See [DEPLOYMENT.md#websockets](./DEPLOYMENT.md#websockets)

## Path Corrections Applied

The following file paths were corrected in the canonical documentation:

| Referenced Path (Old) | Actual Path (Corrected) |
|----------------------|-------------------------|
| `client/src/modules/kitchen/*` | `client/src/pages/KitchenDisplay*.tsx` |
| `client/src/modules/kitchen/*` | `client/src/components/kitchen/*` |
| - | `client/src/hooks/useKitchenOrdersRealtime.ts` |
| - | `client/src/components/errors/KitchenErrorBoundary.tsx` |

## Archived Content

The complete operational guide with troubleshooting tips, testing strategies, and emergency procedures has been preserved at:
`docs/archive/2025-10/2025-10-15_KDS-BIBLE.md`

This stub remains for backward compatibility. All new KDS documentation updates should be made in [DEPLOYMENT.md](./DEPLOYMENT.md).
