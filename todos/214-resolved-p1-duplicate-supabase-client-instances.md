# TODO-214: Duplicate Supabase Client Instantiation

**Priority:** ~~P1 (Critical - Connection Pool Fragmentation)~~ → **RESOLVED**
**Category:** Architecture / Performance
**Source:** Code Review - Kieran Agent (2025-12-26)
**PR:** #163 (Enterprise Audit Remediation)
**Status:** RESOLVED - All duplicate clients replaced with singleton import

## Resolution

Replaced all duplicate `createClient` calls with import from the singleton:

### Files Fixed

1. **`server/src/ai/services/cart.service.ts`**
   ```typescript
   // Before
   import { createClient, SupabaseClient } from '@supabase/supabase-js';
   const supabase: SupabaseClient = createClient(...);

   // After
   import { supabase } from '../../config/database';
   ```

2. **`server/src/ai/services/modifier-pricing.service.ts`**
   ```typescript
   // Before
   import { createClient, SupabaseClient } from '@supabase/supabase-js';
   const supabase: SupabaseClient = createClient(...);

   // After
   import { supabase } from '../../config/database';
   ```

3. **`server/src/ai/functions/realtime-menu-tools.ts`**
   ```typescript
   // Before
   import { createClient, SupabaseClient } from '@supabase/supabase-js';
   const supabase: SupabaseClient = createClient(...);

   // After
   import { supabase } from '../../config/database';
   ```

## Verification

```bash
# Should only find createClient in database.ts and test files
grep -rn "createClient" server/src/ --include="*.ts" | grep -v "node_modules" | grep -v ".test."
```

## Impact

- Connection pool now shared across all services
- Consistent database configuration
- Easier to mock in tests (single mock point)
- Type safety from Database generic
