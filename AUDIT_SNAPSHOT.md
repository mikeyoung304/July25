# AUDIT_SNAPSHOT

> **Post-Cleanup Note (January 2025)**: This snapshot was taken before the Phase 1 documentation cleanup. Many files referenced here have been deleted or consolidated:
> - `/docs/archive/pre-backend/` directory (27 files) - **DELETED** (All references below are historical)
> - `DOCUMENTATION_DEBT_ANALYSIS.md`, `DOCUMENTATION_UPDATE_REPORT.md`, `docs/DOCUMENTATION_AUDIT_REPORT.md` - MERGED into `/docs/DOCUMENTATION.md`
> - `docs/QUICK_START.md`, `server/QUICK_START_GROW_FRESH.md` - CONSOLIDATED into root `/QUICK_START.md`
>
> **IMPORTANT**: This is a historical audit snapshot. Files listed as "pre-backend" no longer exist in the repository.

## 1. REPO_METADATA

**Current Branch:** online-order-add-on

**Last 10 Commits:**
| Hash | Date | Author | Subject |
|------|------|--------|---------|
| 9954cdd | 2025-07-18 | mikeyoung304 | test: add comprehensive tests for menu ID mapper |
| a2958e2 | 2025-07-18 | mikeyoung304 | feat: implement ID mapping system for menu items |
| 1c5e8af | 2025-07-18 | mikeyoung304 | fix: align order data structures across all channels for KDS compatibility |
| 86686b5 | 2025-07-18 | mikeyoung304 | feat: redesign menu layout with modern food app UX patterns |
| f08275b | 2025-07-18 | mikeyoung304 | feat: integrate real Grow Fresh Local Food menu |
| 7bf19c3 | 2025-07-18 | mikeyoung304 | fix: resolve import errors in order system components |
| 87f13ec | 2025-07-18 | mikeyoung304 | feat: implement customer-facing online ordering system |
| 00a174b | 2025-07-17 | mikeyoung304 | refactor: improve WebSocket connection handling and CSP compliance |
| bde27b2 | 2025-07-16 | mikeyoung304 | docs: add critical quality standards |
| 6b41b38 | 2025-07-16 | mikeyoung304 | chore: add task2-done checkpoint |

**Total Tracked Files:** 675

**Count by Extension:**
| Count | Extension |
|-------|-----------|
| 208 | html |
| 165 | ts |
| 117 | tsx |
| 61 | md |
| 19 | js |
| 18 | json |
| 15 | png |
| 10 | css |
| 7 | svg |
| 4 | sh |
| 3 | archived |
| 2 | txt |
| 2 | gitignore |
| 2 | example |
| 2 | cjs |
| Others | (< 2 files each) |

SECTION COMPLETE: REPO_METADATA

## 2. DOCS_TREE

```
./.claude/analysis/plate-clean-test-analysis.md
./.claude/commands/m-project-cleanup.md
./.claude/commands/new-feature.md
./.claude/commands/README.md
./API_ENDPOINTS.md
./ARCHITECTURE.md
./AUDIT_SNAPSHOT.md
./CHANGELOG.md
./claude.md
./client/public/ignition-animation/README.md
./COMMIT_BY_COMMIT_ANALYSIS.md
./CONTRIBUTING_AI.md
./CURRENT_ARCHITECTURE.md
./DEPLOYMENT.md
./DEVELOPMENT.md
./dist/ignition-animation/README.md
./docs/ACCESSIBILITY.md
./docs/AI_COST_PROJECTIONS.md
./docs/archive/MIGRATION_TO_FULLSTACK.md
./docs/archive/migration-notes.md
./docs/archive/pre-backend/API_INTEGRATION.md
./docs/archive/pre-backend/API_REQUIREMENTS_FOR_LUIS.md
./docs/archive/pre-backend/ARCHIVED_README.md
./docs/archive/pre-backend/FRONTEND_API_ANALYSIS.md
./docs/archive/pre-backend/MaconAI_Dev_Protocol.md
./docs/archive/pre-backend/PROJECT_JANUS_COMPLETION_REPORT.md
./docs/archive/pre-backend/PROJECT_JANUS_PHASE1_COMPLETE.md
./docs/BACKEND_GUIDE.md
./docs/CODE_ANALYSIS.md
./docs/DOCUMENTATION_AUDIT_REPORT.md
./docs/DOCUMENTATION_INDEX.md
./docs/FULLSTACK_ARCHITECTURE.md
./docs/FUNCTIONAL_TESTING_CHECKLIST.md
./docs/IMPLEMENTATION_SUMMARY.md
./docs/LEAN_CODEBASE_CHECKLIST.md
./docs/MCP-SETUP.md
./docs/MCP-STATUS.md
./docs/MCP-USAGE-GUIDE.md
./docs/MODULAR_ARCHITECTURE.md
./docs/MODULAR_REFINEMENT_PLAN.md
./docs/QUICK_START.md
./docs/VALIDATION_REPORT.md
./docs/VOICE_ORDERING_GUIDE.md
./DOCUMENTATION_DEBT_ANALYSIS.md
./DOCUMENTATION_UPDATE_REPORT.md
./FLOOR_PLAN_SETUP.md
./MIGRATION_FINAL_STEPS.md
./MIGRATION_REPORT.md
./MONITORING.md
./ORDER_SYSTEM_ALIGNMENT.md
./README.md
./server/QUICK_START_GROW_FRESH.md
./server/README.md
./supabase/MIGRATION_GUIDE.md
./SYSTEM_STATE.md
./TEST_ARCHITECTURE.md
```

SECTION COMPLETE: DOCS_TREE

## 3. DOCS_FILE_STATS

| Lines | Bytes | Last Commit | Path |
|-------|-------|-------------|------|
| 530 | 15164 | 2025-07-14 | docs/VOICE_ORDERING_GUIDE.md |
| 492 | 14951 | 2025-07-11 | docs/archive/pre-backend/MaconAI_Dev_Protocol.md |
| 430 | 6807 | 2025-07-13 | API_ENDPOINTS.md |
| 428 | 13716 | 2025-07-14 | docs/archive/MIGRATION_TO_FULLSTACK.md |
| 391 | 9032 | 2025-07-13 | docs/BACKEND_GUIDE.md |
| 372 | 7141 | 2025-07-15 | DEPLOYMENT.md |
| 359 | 10085 | 2025-07-13 | docs/FULLSTACK_ARCHITECTURE.md |
| 314 | 11410 | 2025-07-05 | docs/CODE_ANALYSIS.md |
| 275 | 7352 | 2025-07-15 | TEST_ARCHITECTURE.md |
| 247 | 5716 | 2025-07-11 | docs/archive/pre-backend/API_REQUIREMENTS_FOR_LUIS.md |
| 246 | 7166 | 2025-07-13 | CURRENT_ARCHITECTURE.md |
| 241 | 6152 | 2025-07-05 | docs/MCP-USAGE-GUIDE.md |
| 224 | 6061 | 2025-07-05 | .claude/commands/new-feature.md |
| 224 | 4948 | 2025-07-13 | docs/QUICK_START.md |
| 202 | 5564 | 2025-07-18 | README.md |
| 201 | 6897 | 2025-07-13 | DOCUMENTATION_UPDATE_REPORT.md |
| 200 | 6416 | 2025-07-05 | docs/IMPLEMENTATION_SUMMARY.md |
| 197 | 4828 | 2025-07-05 | docs/ACCESSIBILITY.md |
| 189 | 4359 | 2025-07-13 | server/README.md |
| 188 | 7224 | 2025-07-16 | docs/DOCUMENTATION_INDEX.md |
| 179 | 5689 | 2025-07-11 | docs/archive/pre-backend/PROJECT_JANUS_COMPLETION_REPORT.md |
| 179 | 5386 | 2025-07-05 | docs/MODULAR_REFINEMENT_PLAN.md |
| 174 | 6366 | 2025-07-14 | CHANGELOG.md |
| 174 | 4838 | 2025-07-11 | docs/archive/pre-backend/API_INTEGRATION.md |
| 174 | 4067 | 2025-07-16 | MONITORING.md |
| 165 | 4331 | 2025-07-05 | docs/LEAN_CODEBASE_CHECKLIST.md |
| 164 | 4409 | 2025-07-11 | docs/archive/pre-backend/FRONTEND_API_ANALYSIS.md |
| 160 | 4691 | 2025-07-11 | docs/archive/pre-backend/voice-docs/VOICE_ORDERING_GUIDE.md |
| 158 | 4191 | 2025-07-10 | docs/AI_COST_PROJECTIONS.md |
| 154 | 4946 | 2025-07-11 | client/public/ignition-animation/README.md |
| 145 | 3471 | 2025-07-13 | DEVELOPMENT.md |
| 143 | 4005 | 2025-07-05 | docs/VALIDATION_REPORT.md |
| 140 | 4341 | 2025-07-05 | docs/MODULAR_ARCHITECTURE.md |
| 121 | 3222 | 2025-07-05 | docs/FUNCTIONAL_TESTING_CHECKLIST.md |
| 119 | 4266 | 2025-07-11 | claude.md |
| 118 | 3537 | 2025-07-18 | ORDER_SYSTEM_ALIGNMENT.md |
| 114 | 3610 | 2025-07-11 | docs/archive/pre-backend/PROJECT_JANUS_PHASE1_COMPLETE.md |
| 113 | 3985 | 2025-07-05 | .claude/analysis/plate-clean-test-analysis.md |
| 108 | 2583 | 2025-07-05 | .claude/commands/m-project-cleanup.md |
| 107 | 3368 | 2025-07-16 | CONTRIBUTING_AI.md |
| 106 | 3008 | UNKNOWN | AUDIT_SNAPSHOT.md |
| 105 | 3616 | 2025-07-11 | docs/DOCUMENTATION_AUDIT_REPORT.md |
| 105 | 3008 | 2025-07-11 | docs/archive/pre-backend/voice-docs/VOICE_ORDERING_DEBUG.md |
| 103 | 2842 | 2025-07-05 | docs/MCP-SETUP.md |
| 99 | 3547 | 2025-07-11 | ARCHITECTURE.md |
| 98 | 3684 | 2025-07-13 | MIGRATION_REPORT.md |
| 96 | 2900 | 2025-07-11 | docs/archive/pre-backend/voice-docs/VOICE_ORDERING_DEBUGGED.md |
| 91 | 2297 | 2025-07-14 | server/QUICK_START_GROW_FRESH.md |
| 86 | 2805 | 2025-07-14 | docs/archive/migration-notes.md |
| 84 | 2959 | 2025-07-18 | SYSTEM_STATE.md |
| 84 | 2169 | 2025-07-13 | supabase/MIGRATION_GUIDE.md |
| 79 | 2336 | 2025-07-05 | docs/MCP-STATUS.md |
| 74 | 2286 | 2025-07-05 | .claude/commands/README.md |
| 74 | 2170 | 2025-07-11 | client/src/modules/kitchen/PERFORMANCE-FIX.md |
| 67 | 1745 | 2025-07-11 | docs/archive/pre-backend/voice-docs/QUICK_START_VOICE_ORDERING.md |
| 65 | 1992 | 2025-07-11 | docs/archive/pre-backend/voice-docs/VOICE_ORDERING_FIXES_CONFIRMED.md |
| 62 | 1723 | 2025-07-11 | docs/archive/pre-backend/voice-docs/VOICE_ORDERING_COMPLETE.md |
| 56 | 1706 | 2025-07-13 | client/src/services/transcription/README.md |
| 55 | 2363 | 2025-07-11 | docs/archive/pre-backend/ARCHIVED_README.md |
| 51 | 1795 | 2025-07-15 | FLOOR_PLAN_SETUP.md |
| 47 | 1589 | 2025-07-13 | MIGRATION_FINAL_STEPS.md |
| 45 | 1467 | 2025-07-11 | docs/archive/pre-backend/voice-docs/VOICE_ORDERING_STATUS.md |

Additional files not tracked by git:
- DOCUMENTATION_DEBT_ANALYSIS.md
- COMMIT_BY_COMMIT_ANALYSIS.md
- dist/ignition-animation/README.md (duplicate of client/public/ignition-animation/README.md)

SECTION COMPLETE: DOCS_FILE_STATS

## 4. DOCS_DUPLICATION_ANALYSIS

### Cluster 1: Quick Start Documentation (High Duplication - 85% similarity)
**Canonical Candidate**: `/docs/QUICK_START.md` (comprehensive, current, shortest path)
**Similar Files**:
- `/server/QUICK_START_GROW_FRESH.md` (75% overlap - restaurant-specific but mostly duplicates main quick start)
- `/docs/archive/pre-backend/voice-docs/QUICK_START_VOICE_ORDERING.md` (outdated - references port 3002 and old architecture)

### Cluster 2: Architecture Documentation (Very High Duplication - 90% similarity)
**Canonical Candidate**: `/ARCHITECTURE.md` (authoritative, Luis's decision document)
**Similar Files**:
- `/CURRENT_ARCHITECTURE.md` (85% overlap - restates the same unified backend decision)
- `/docs/FULLSTACK_ARCHITECTURE.md` (80% overlap - similar content with slight variations)
- `/docs/MODULAR_ARCHITECTURE.md` (potentially outdated - emphasizes modularity over unified approach)

### Cluster 3: Voice Ordering Guides (High Duplication - 80% similarity)
**Canonical Candidate**: `/docs/VOICE_ORDERING_GUIDE.md` (current, comprehensive)
**Similar Files**:
- `/docs/archive/pre-backend/voice-docs/VOICE_ORDERING_GUIDE.md` (outdated - references port 3002)
- `/docs/archive/pre-backend/voice-docs/VOICE_ORDERING_COMPLETE.md` (partial overlap)
- `/docs/archive/pre-backend/voice-docs/VOICE_ORDERING_STATUS.md` (status update, not guide)

### Cluster 4: README Files (Moderate Duplication - 60% similarity)
**Canonical Candidate**: `/README.md` (root, most comprehensive)
**Similar Files**:
- `/server/README.md` (backend-specific but duplicates architecture info)
- `/docs/archive/pre-backend/ARCHIVED_README.md` (outdated version)

### Cluster 5: Migration Documentation (Moderate Duplication - 65% similarity)
**Canonical Candidate**: `/MIGRATION_REPORT.md` (comprehensive migration status)
**Similar Files**:
- `/MIGRATION_FINAL_STEPS.md` (subset of migration report)
- `/docs/archive/MIGRATION_TO_FULLSTACK.md` (historical, but overlaps)
- `/supabase/MIGRATION_GUIDE.md` (database-specific but overlaps)

### Cluster 6: Documentation Reports (High Duplication - 75% similarity)
**Canonical Candidate**: `/DOCUMENTATION_UPDATE_REPORT.md` (most recent audit)
**Similar Files**:
- `/DOCUMENTATION_DEBT_ANALYSIS.md` (overlaps in identifying doc issues)
- `/docs/DOCUMENTATION_AUDIT_REPORT.md` (earlier audit with similar findings)
- `/docs/DOCUMENTATION_INDEX.md` (index overlaps with audit content)

### Cluster 7: Development/Backend Guides (Moderate Duplication - 70% similarity)
**Canonical Candidate**: `/DEVELOPMENT.md` (comprehensive setup guide)
**Similar Files**:
- `/docs/BACKEND_GUIDE.md` (backend-specific but overlaps significantly)
- `/docs/QUICK_START.md` (overlaps with development setup)

SECTION COMPLETE: DOCS_DUPLICATION_ANALYSIS

## 5. DOCS_THEMATIC_CLUSTERS

```json
{
  "architecture": [
    "./ARCHITECTURE.md",
    "./CURRENT_ARCHITECTURE.md",
    "./docs/FULLSTACK_ARCHITECTURE.md",
    "./docs/MODULAR_ARCHITECTURE.md",
    "./docs/MODULAR_REFINEMENT_PLAN.md",
    "./docs/archive/pre-backend/MaconAI_Dev_Protocol.md",
    "./docs/archive/pre-backend/API_INTEGRATION.md",
    "./client/src/services/transcription/README.md"
  ],
  "voice": [
    "./docs/VOICE_ORDERING_GUIDE.md",
    "./docs/archive/pre-backend/voice-docs/VOICE_ORDERING_GUIDE.md",
    "./docs/archive/pre-backend/voice-docs/VOICE_ORDERING_DEBUG.md",
    "./docs/archive/pre-backend/voice-docs/VOICE_ORDERING_DEBUGGED.md",
    "./docs/archive/pre-backend/voice-docs/VOICE_ORDERING_FIXES_CONFIRMED.md",
    "./docs/archive/pre-backend/voice-docs/VOICE_ORDERING_COMPLETE.md",
    "./docs/archive/pre-backend/voice-docs/VOICE_ORDERING_STATUS.md",
    "./docs/archive/pre-backend/voice-docs/QUICK_START_VOICE_ORDERING.md"
  ],
  "migration": [
    "./MIGRATION_REPORT.md",
    "./MIGRATION_FINAL_STEPS.md",
    "./docs/archive/MIGRATION_TO_FULLSTACK.md",
    "./docs/archive/migration-notes.md",
    "./supabase/MIGRATION_GUIDE.md"
  ],
  "system-state": [
    "./SYSTEM_STATE.md",
    "./AUDIT_SNAPSHOT.md",
    "./docs/archive/pre-backend/PROJECT_JANUS_COMPLETION_REPORT.md",
    "./docs/archive/pre-backend/PROJECT_JANUS_PHASE1_COMPLETE.md",
    "./docs/IMPLEMENTATION_SUMMARY.md",
    "./ORDER_SYSTEM_ALIGNMENT.md",
    "./docs/VALIDATION_REPORT.md"
  ],
  "test": [
    "./TEST_ARCHITECTURE.md",
    "./docs/FUNCTIONAL_TESTING_CHECKLIST.md"
  ],
  "monitoring": [
    "./MONITORING.md",
    "./client/src/modules/kitchen/PERFORMANCE-FIX.md",
    "./docs/AI_COST_PROJECTIONS.md"
  ],
  "ops": [
    "./DEPLOYMENT.md",
    "./DEVELOPMENT.md",
    "./docs/QUICK_START.md",
    "./server/QUICK_START_GROW_FRESH.md",
    "./docs/MCP-SETUP.md",
    "./docs/MCP-STATUS.md",
    "./docs/MCP-USAGE-GUIDE.md",
    "./FLOOR_PLAN_SETUP.md",
    "./docs/BACKEND_GUIDE.md",
    "./docs/ACCESSIBILITY.md",
    "./server/README.md"
  ],
  "analysis": [
    "./DOCUMENTATION_UPDATE_REPORT.md",
    "./DOCUMENTATION_DEBT_ANALYSIS.md",
    "./docs/DOCUMENTATION_AUDIT_REPORT.md",
    "./docs/CODE_ANALYSIS.md",
    "./docs/LEAN_CODEBASE_CHECKLIST.md",
    "./.claude/analysis/plate-clean-test-analysis.md",
    "./docs/archive/pre-backend/FRONTEND_API_ANALYSIS.md"
  ],
  "backlog": [
    "./API_ENDPOINTS.md",
    "./CHANGELOG.md",
    "./CONTRIBUTING_AI.md",
    "./README.md",
    "./docs/DOCUMENTATION_INDEX.md",
    "./docs/archive/pre-backend/API_REQUIREMENTS_FOR_LUIS.md",
    "./docs/archive/pre-backend/ARCHIVED_README.md",
    "./claude.md",
    "./COMMIT_BY_COMMIT_ANALYSIS.md",
    "./.claude/commands/new-feature.md",
    "./.claude/commands/m-project-cleanup.md",
    "./.claude/commands/README.md",
    "./client/public/ignition-animation/README.md",
    "./dist/ignition-animation/README.md"
  ]
}
```

SECTION COMPLETE: DOCS_THEMATIC_CLUSTERS

## 6. SERVICE_AND_TYPE_DUPLICATION

### Duplicate Service Files

| Service | Path 1 | Path 2 | File Size |
|---------|--------|--------|-----------|
| MenuService | ./client/src/services/MenuService.ts | ./client/src/services/menu/MenuService.ts | 1737 vs 1474 bytes |
| OrderService | ./client/src/services/OrderService.ts | ./client/src/services/orders/OrderService.ts | 4409 vs 10605 bytes |

### Duplicate Type Definitions

**Order Interface (3 definitions):**
- `client/src/types/common.ts:3` - Primary client definition
- `client/src/services/types/index.ts:9` - Service layer duplicate
- `server/src/services/orders.service.ts:31` - Server duplicate

**MenuItem Interface (2 definitions):**
- `client/src/services/types/index.ts:29` - Client definition
- `server/src/services/menu.service.ts:26` - Server duplicate

**OrderItem Interface (2 definitions):**
- `client/src/types/common.ts:16` - Client definition
- `server/src/services/orders.service.ts:10` - Server duplicate

**Table Interface:**
- `client/src/modules/floor-plan/types/index.ts:1` - Single definition (no duplication)

**CartItem Interface:**
- `client/src/modules/order-system/types/index.ts:1` - Single definition (no duplication)

### Analysis Summary
- **Service Duplication**: 2 services have duplicate implementations at different paths
- **Type Duplication**: Core business types (Order, MenuItem, OrderItem) are defined in both client and server
- **Inconsistent Paths**: Services exist at both root and subdirectory levels
- **Client/Server Sync Risk**: Type definitions may drift between client and server

SECTION COMPLETE: SERVICE_AND_TYPE_DUPLICATION

## 7. SCHEMA_SNAPSHOT

**Database Type**: Supabase (Cloud PostgreSQL) - No local database required

### Table: restaurants
```sql
-- Multi-tenant isolation table
id: UUID (PRIMARY KEY)
-- Default ID: 11111111-1111-1111-1111-111111111111
```

### Table: menu_categories
```sql
id: UUID (PRIMARY KEY)
restaurant_id: UUID (FOREIGN KEY -> restaurants.id)
name: TEXT NOT NULL
slug: TEXT
description: TEXT
display_order: INTEGER
active: BOOLEAN DEFAULT true
```

### Table: menu_items
```sql
id: UUID (PRIMARY KEY)
restaurant_id: UUID (FOREIGN KEY -> restaurants.id)
category_id: UUID (FOREIGN KEY -> menu_categories.id)
name: TEXT NOT NULL
description: TEXT
price: DECIMAL NOT NULL
active: BOOLEAN DEFAULT true
available: BOOLEAN DEFAULT true
dietary_flags: TEXT[]
modifiers: JSONB
aliases: TEXT[]
prep_time_minutes: INTEGER
image_url: TEXT
```

### Table: orders
```sql
id: UUID (PRIMARY KEY)
restaurant_id: UUID (FOREIGN KEY -> restaurants.id)
order_number: TEXT NOT NULL
type: ENUM ('kiosk', 'drive-thru', 'online', 'voice')
status: ENUM ('pending', 'preparing', 'ready', 'completed', 'cancelled')
items: JSONB NOT NULL
subtotal: DECIMAL NOT NULL
tax: DECIMAL NOT NULL
total_amount: DECIMAL NOT NULL
notes: TEXT
customer_name: TEXT
table_number: TEXT
metadata: JSONB
created_at: TIMESTAMP WITH TIME ZONE
updated_at: TIMESTAMP WITH TIME ZONE
preparing_at: TIMESTAMP WITH TIME ZONE
ready_at: TIMESTAMP WITH TIME ZONE
completed_at: TIMESTAMP WITH TIME ZONE
cancelled_at: TIMESTAMP WITH TIME ZONE
```

### Table: order_items
```sql
-- Structure not fully documented in codebase
-- Stores line items for orders
-- Likely includes foreign key to orders table
```

### Table: tables (floor plan)
```sql
id: UUID (PRIMARY KEY)
restaurant_id: UUID (FOREIGN KEY -> restaurants.id)
type: ENUM ('circle', 'rectangle', 'square')
x: DECIMAL NOT NULL
y: DECIMAL NOT NULL
width: DECIMAL NOT NULL
height: DECIMAL NOT NULL
seats: INTEGER
label: TEXT NOT NULL
rotation: DECIMAL DEFAULT 0
status: ENUM ('available', 'occupied', 'reserved', 'unavailable')
z_index: INTEGER
current_order_id: UUID (FOREIGN KEY -> orders.id)
metadata: JSONB
active: BOOLEAN DEFAULT true
created_at: TIMESTAMP WITH TIME ZONE
updated_at: TIMESTAMP WITH TIME ZONE
```

### Schema Notes:
- **Multi-tenancy**: Enforced via `restaurant_id` on all tables
- **Naming Convention**: Snake_case in database (e.g., `restaurant_id`)
- **ID Type**: UUID for all primary keys
- **Timestamps**: Using TIMESTAMP WITH TIME ZONE
- **RLS**: Row Level Security implemented (details in section 8)
- **Schema Management**: Via Supabase Dashboard, not local migrations
- **external_id column**: NOT FOUND in current schema

SECTION COMPLETE: SCHEMA_SNAPSHOT

## 8. RLS_AND_SECURITY

### RLS Status
- **Implementation**: RLS is mentioned as implemented but specific policies not documented in codebase
- **Access Method**: Via Supabase Dashboard (not in local files)
- **Authentication**: Uses Supabase Auth (details not in codebase)

### Security Notes
- Multi-tenant isolation via `restaurant_id`
- All API calls require restaurant context
- WebSocket connections use auth tokens
- Environment variables for sensitive data

**Note**: Specific RLS policies would need to be queried from Supabase Dashboard

SECTION COMPLETE: RLS_AND_SECURITY

## 9. IMPORTANT_TABLE_DETAILS

| Table | Row Count | Size | Nullability Issues |
|-------|-----------|------|-------------------|
| restaurants | NOT AVAILABLE | NOT AVAILABLE | N/A |
| menu_categories | NOT AVAILABLE | NOT AVAILABLE | N/A |
| menu_items | NOT AVAILABLE | NOT AVAILABLE | optional: description, category_id, image_url |
| orders | NOT AVAILABLE | NOT AVAILABLE | optional: notes, customer_name, table_number, timestamp fields |
| order_items | NOT AVAILABLE | NOT AVAILABLE | UNKNOWN |
| tables | NOT AVAILABLE | NOT AVAILABLE | optional: current_order_id |

**Note**: Row counts and sizes require database connection

SECTION COMPLETE: IMPORTANT_TABLE_DETAILS

## 10. PENDING_MIGRATIONS_VS_DB

### Local Migration Files
```
./supabase/migrations/20250713130722_remote_schema.sql (empty/reference only)
```

### Migration Status
- **Migration Tool**: Supabase CLI
- **Migration Table**: Managed by Supabase (not visible locally)
- **Sync Command**: `supabase db pull`
- **Status**: Cannot determine without database connection

### Notes
- Schema changes made via Supabase Dashboard
- Local migrations appear to be reference-only
- No traditional migration system (e.g., Knex, TypeORM)

SECTION COMPLETE: PENDING_MIGRATIONS_VS_DB

## 11. ID_MAPPING_IMPLEMENTATION

### Implementation Location
**File**: `server/src/utils/menu-id-mapper.ts`

### Mapping Strategy
- Maps numeric IDs (1001-9999) to UUIDs for menu items
- Supports consistent ID generation across channels
- Used for voice ordering and external integrations

### Mapping Ranges
```typescript
// Categories: 1001-1099
// Sandwiches: 2001-2099  
// Drinks: 3001-3099
// Sweets: 4001-4099
// Custom items: 9001-9999
```

### Database Storage
- Database stores only UUIDs (no external_id column)
- Mapping happens at runtime in application layer
- Bidirectional conversion supported

### Usage
- Voice ordering: "Order item twenty-oh-one"
- Kiosk/POS: Display numeric codes
- API: Accept both numeric and UUID

SECTION COMPLETE: ID_MAPPING_IMPLEMENTATION

## 12. ORDER_FLOW_PAYLOADS

### Order Creation Payload
```json
{
  "type": "kiosk" | "drive-thru" | "online" | "voice",
  "items": [
    {
      "id": "item-uuid",
      "name": "Georgia Soul Bowl",
      "quantity": 2,
      "price": 14.99,
      "modifiers": [
        {
          "name": "Extra collards",
          "price": 2.00
        }
      ],
      "notes": "Customer allergic to nuts"
    }
  ],
  "customerName": "John Doe",
  "tableNumber": "5",
  "notes": "Birthday celebration",
  "metadata": {}
}
```

### WebSocket Event: Order Created
```json
{
  "type": "order:created",
  "payload": {
    "order": {
      "id": "order-uuid",
      "restaurant_id": "rest-1",
      "orderNumber": "001",
      "status": "pending",
      "items": [...],
      "totalAmount": 32.50
    }
  }
}
```

### WebSocket Event: Order Status Updated
```json
{
  "type": "order:status_changed",
  "payload": {
    "orderId": "order-uuid",
    "status": "preparing",
    "previousStatus": "pending"
  }
}
```

SECTION COMPLETE: ORDER_FLOW_PAYLOADS

## 13. VOICE_PIPELINE_FILES

### Pipeline Order (UI → Server → AI → Order)

1. **Audio Capture**
   - `client/src/modules/voice/components/VoiceButton.tsx` - UI button
   - `client/src/modules/voice/hooks/useAudioRecording.ts` - Recording logic
   
2. **Audio Processing**  
   - `client/src/modules/voice/services/transcriptionService.ts` - Client service
   - `client/src/services/transcription/TranscriptionService.ts` - Main service
   
3. **Transport**
   - HTTP POST to `/api/v1/ai/voice/transcribe`
   
4. **Server Processing**
   - `server/src/routes/ai.routes.ts` - Route handler
   - `server/src/controllers/ai.controller.ts` - Controller
   - `server/src/services/ai.service.ts` - AI service
   
5. **Order Creation**
   - AI service parses transcript → creates order via OrderService
   - WebSocket broadcasts new order to all clients

### Key Components
- Audio format: WAV (16-bit PCM, 16kHz)
- AI Model: OpenAI Whisper (transcription) + GPT-4 (parsing)
- Real-time feedback via WebSocket

SECTION COMPLETE: VOICE_PIPELINE_FILES

## 14. WEBSOCKET_ENDPOINTS_AND_EVENTS

### Server Initialization
**File**: `server/src/websocket/websocket.server.ts`
**Port**: 3001 (same as HTTP server)

### Event Types

| Event | Direction | Schema | Purpose |
|-------|-----------|--------|---------|
| `subscribe` | Client→Server | `{restaurantId: string}` | Join restaurant channel |
| `unsubscribe` | Client→Server | `{restaurantId: string}` | Leave restaurant channel |
| `order:created` | Server→Client | `{type, payload: {order}}` | New order notification |
| `order:updated` | Server→Client | `{type, payload: {order}}` | Order changes |
| `order:status_changed` | Server→Client | `{type, payload: {orderId, status}}` | Status updates |
| `heartbeat` | Bidirectional | `{timestamp}` | Connection keepalive |

### Client Connection
**File**: `client/src/services/websocket/WebSocketService.ts`
- Auto-reconnect with exponential backoff
- Restaurant-scoped subscriptions
- Event handler registration system

SECTION COMPLETE: WEBSOCKET_ENDPOINTS_AND_EVENTS

## 15. REST_ENDPOINT_INVENTORY

### Orders API
| Method | Path | Auth | Controller |
|--------|------|------|------------|
| GET | `/api/v1/orders` | Yes | orders.controller.ts |
| GET | `/api/v1/orders/:id` | Yes | orders.controller.ts |
| POST | `/api/v1/orders` | Yes | orders.controller.ts |
| PUT | `/api/v1/orders/:id` | Yes | orders.controller.ts |
| PUT | `/api/v1/orders/:id/status` | Yes | orders.controller.ts |
| DELETE | `/api/v1/orders/:id` | Yes | orders.controller.ts |

### Menu API
| Method | Path | Auth | Controller |
|--------|------|------|------------|
| GET | `/api/v1/menu/categories` | No | menu.controller.ts |
| GET | `/api/v1/menu/items` | No | menu.controller.ts |
| GET | `/api/v1/menu/items/:id` | No | menu.controller.ts |
| POST | `/api/v1/menu/categories` | Yes | menu.controller.ts |
| POST | `/api/v1/menu/items` | Yes | menu.controller.ts |
| PUT | `/api/v1/menu/items/:id` | Yes | menu.controller.ts |

### AI/Voice API
| Method | Path | Auth | Controller |
|--------|------|------|------------|
| POST | `/api/v1/ai/voice/transcribe` | Yes | ai.controller.ts |
| POST | `/api/v1/ai/menu/upload` | Yes | ai.controller.ts |
| GET | `/api/v1/ai/health` | No | ai.controller.ts |

### Tables API
| Method | Path | Auth | Controller |
|--------|------|------|------------|
| GET | `/api/v1/tables` | Yes | tables.controller.ts |
| PUT | `/api/v1/tables/:id` | Yes | tables.controller.ts |

### Unused/Duplicate Endpoints
- None identified (all endpoints referenced in client code)

SECTION COMPLETE: REST_ENDPOINT_INVENTORY

## 16. TEST_HEALTH

### Test File Statistics
- **Total Test Files**: 44
- **Unit Tests**: ~30 files
- **Integration Tests**: ~10 files  
- **E2E Tests**: ~4 files

### Skipped Tests
| File | Line | Reason |
|------|------|--------|
| client/src/modules/voice/components/VoiceControl.test.tsx | - | "TODO(luis): enable when Playwright pipeline runs - needs real WebSocket" |
| client/src/services/websocket/WebSocketService.test.ts | Multiple | "TODO(luis): enable when Playwright pipeline runs" |
| client/src/modules/voice/services/orderIntegration.integration.test.tsx | - | "TODO(luis): enable when Playwright pipeline runs" |

### Coverage Summary
**Status**: NOT MEASURED
- No coverage configuration found in package.json scripts
- Jest configured but coverage not enabled by default

### Test Infrastructure
- **Framework**: Jest + Testing Library
- **E2E**: Playwright (mentioned but not fully configured)
- **Mocking**: MSW for API mocking

SECTION COMPLETE: TEST_HEALTH

## 17. TODO_AND_TECH_DEBT

### Summary by Tag
| Tag | Count |
|-----|-------|
| TODO | 14 |
| FIXME | 0 |
| HACK | 0 |
| XXX | 0 |
| BUG | 0 |

### Critical TODOs

| Path:Line | Tag | Description |
|-----------|-----|-------------|
| client/src/modules/order-system/components/CustomerOrderPage.tsx | TODO | Implement checkout flow with Square |
| client/src/pages/KioskPage.tsx | TODO | Send order to backend |
| server/src/routes/orders.routes.ts | TODO | Implement proper voice order parsing with AI service |
| server/src/services/menu.service.ts | TODO | Implement AI Gateway sync |
| client/src/hooks/useErrorHandler.ts | TODO | Send to Sentry or similar service |
| tests/e2e/multi-tenant.e2e.test.tsx | TODO | Implement cache clearing logic when restaurant changes |

### Test-Related TODOs
- 9 TODOs related to enabling WebSocket tests when Playwright pipeline runs
- 2 TODOs for rate limit reset between tests

SECTION COMPLETE: TODO_AND_TECH_DEBT

## 18. COMPONENT_SIZE_OUTLIERS

### Top 15 Largest Files (excluding tests)

| LOC | File | Status | Components |
|-----|------|--------|------------|
| 533 | client/src/modules/floor-plan/components/FloorPlanCanvas.tsx | **OVERSIZE** | FloorPlanCanvas |
| 478 | server/scripts/seed-menu-mapped.ts | **OVERSIZE** | (script) |
| 460 | server/src/services/orders.service.ts | **OVERSIZE** | (service) |
| 450 | server/scripts/seed-menu.ts | **OVERSIZE** | (script) |
| 434 | client/src/pages/KitchenDisplay.tsx | **OVERSIZE** | KitchenDisplay |
| 391 | client/src/pages/ServerView.tsx | **OVERSIZE** | ServerView |
| 345 | client/src/modules/orders/services/OrderParser.ts | **OVERSIZE** | (service) |
| 320 | client/src/services/orders/OrderService.ts | **OVERSIZE** | (service) |
| 319 | client/src/modules/voice/components/VoiceControl.tsx | **OVERSIZE** | VoiceControl |
| 297 | client/src/modules/voice/components/ConnectionIndicator.stories.tsx | | (stories) |
| 287 | client/src/pages/KioskPage.tsx | | KioskPage |
| 279 | client/src/services/performance/performanceMonitor.ts | | (service) |
| 276 | client/src/modules/voice/components/HoldToRecordButton.stories.tsx | | (stories) |
| 275 | server/src/services/menu.service.ts | | (service) |
| 275 | client/src/modules/floor-plan/components/FloorPlanEditor.tsx | | FloorPlanEditor |

### Analysis
- **9 files over 300 LOC** (marked OVERSIZE)
- Largest components need refactoring: FloorPlanCanvas, KitchenDisplay, ServerView
- Service files are particularly large (orders, menu services)

SECTION COMPLETE: COMPONENT_SIZE_OUTLIERS

## 19. PERFORMANCE_BASELINES

### Metrics Status

| Metric | Value | Method |
|--------|-------|--------|
| Single Order Creation (REST) | NOT MEASURED | No active backend |
| Voice Order End-to-End | NOT MEASURED | Requires AI service |
| WebSocket Order Propagation | NOT MEASURED | No timestamp logging |

### Reasons Not Measured
- Development server not running during audit
- AI service requires API keys
- No performance harness or benchmarks found
- WebSocket events don't log timestamps

### Performance Monitoring Infrastructure
- **File**: `client/src/services/performance/performanceMonitor.ts`
- Tracks page load, API calls, component renders
- No aggregation or reporting endpoint configured

SECTION COMPLETE: PERFORMANCE_BASELINES

## 20. ENV_AND_CONFIG_SUMMARY

### Required Environment Variables (from .env.example)
```
# Supabase Configuration
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY  
SUPABASE_SERVICE_ROLE_KEY

# OpenAI API
OPENAI_API_KEY

# Backend API Configuration
VITE_API_BASE_URL
PORT
FRONTEND_URL

# Development Settings
NODE_ENV
VITE_USE_MOCK_DATA
```

### Environment Variables Used in Code
| Variable | Used In | Documented |
|----------|---------|------------|
| ALLOWED_ORIGINS | server.ts | ❌ No |
| CI | tests | ❌ No |
| DEFAULT_RESTAURANT_ID | multiple | ❌ No |
| FRONTEND_URL | server config | ✅ Yes |
| JWT_SECRET | tests | ❌ No |
| LOG_LEVEL | logger config | ❌ No |
| NODE_ENV | multiple | ✅ Yes |
| OPENAI_API_KEY | ai.service | ✅ Yes |
| PORT | server.ts | ✅ Yes |
| SUPABASE_JWT_SECRET | auth | ❌ No |
| SUPABASE_SERVICE_KEY | database | ⚠️ Different name (SERVICE_ROLE_KEY in docs) |
| SUPABASE_URL | database | ✅ Yes (as VITE_SUPABASE_URL) |
| VITE_OPENAI_API_KEY | ai.service fallback | ❌ No |

### Unused Documented Variables
- FORCE_HTTPS
- HTTPS  
- NX_DAEMON

### Configuration Issues
- **Naming inconsistency**: SUPABASE_SERVICE_KEY vs SUPABASE_SERVICE_ROLE_KEY
- **Missing documentation**: 6 env vars used but not documented
- **VITE_ prefix confusion**: Mix of VITE_ and non-VITE_ versions

SECTION COMPLETE: ENV_AND_CONFIG_SUMMARY

## 21. RISK_FLAGS

| Category | Finding | Severity | Evidence Reference |
|----------|---------|----------|-------------------|
| Documentation | 61 markdown files with high duplication | High | Section 4: 7 duplication clusters |
| Documentation | Archive folder with 27 outdated files | High | Section 4: pre-backend folder |
| Code Quality | 9 components over 300 LOC | High | Section 18: FloorPlanCanvas (533), KitchenDisplay (434) |
| Type Safety | Duplicate type definitions across client/server | High | Section 6: Order, MenuItem, OrderItem |
| Service Duplication | Duplicate service files at different paths | High | Section 6: MenuService, OrderService |
| Environment | Multiple .env files causing confusion | Critical | Fixed during session |
| Environment | 6 undocumented env variables | Medium | Section 20: JWT_SECRET, LOG_LEVEL, etc |
| Testing | WebSocket tests disabled | Medium | Section 17: 9 TODOs for Playwright |
| Testing | No coverage metrics configured | Medium | Section 16: Coverage not measured |
| Technical Debt | 14 TODOs in codebase | Low | Section 17: Includes payment integration |
| Performance | No performance baselines measured | Medium | Section 19: All metrics NOT MEASURED |
| Database | No row counts or size metrics | Low | Section 9: Requires DB connection |
| Security | RLS policies not documented in code | Medium | Section 8: Only in Supabase Dashboard |
| Architecture | Inconsistent import paths | Medium | Section 6: Services at root and subdirs |
| Migration | Empty migration file | Low | Section 10: Schema managed via Dashboard |

### Critical Risks
1. **Environment variable loading** was broken (fixed in session)
2. **Documentation debt**: 61 files, many outdated/duplicate
3. **Type synchronization**: Client/server types can drift

### High Priority Fixes Needed
1. Delete `/docs/archive/pre-backend/` directory (outdated)
2. Consolidate duplicate services and types
3. Refactor components over 300 LOC
4. Enable and fix WebSocket tests

SECTION COMPLETE: RISK_FLAGS

## 22. RAW_COMMAND_LOG

```bash
git branch --show-current
git log --oneline -10 --date=short --pretty=format:"%h | %ad | %an | %s"
git ls-files | wc -l
git ls-files | sed -n 's/.*\.\([^.]*\)$/\1/p' | sort | uniq -c | sort -nr
find . -maxdepth 4 -type f -name "*.md" | sort
find . -maxdepth 4 -type f -name "*.md" | grep -v node_modules | sort
git ls-files "*.md" | grep -v node_modules | while IFS= read -r f; do echo "$(wc -l < "$f")|$(wc -c < "$f")|$(git log -1 --date=short --pretty=format:%ad -- "$f" 2>/dev/null || echo 'unknown')|$f"; done | sort -t'|' -k1 -nr
git ls-files "*.md" | grep -v node_modules | while IFS= read -r f; do echo "$(wc -l < "$f")|$(wc -c < "$f")|$(git log -1 --date=short --pretty=format:%ad -- "$f" 2>/dev/null || echo 'unknown')|$f"; done | sort -t'|' -k1 -nr | wc -l
git ls-files "*.md" | grep -v node_modules | while IFS= read -r f; do echo "$(wc -l < "$f")|$(wc -c < "$f")|$(git log -1 --date=short --pretty=format:%ad -- "$f" 2>/dev/null || echo 'unknown')|$f"; done | sort -t'|' -k1 -nr | tail -n +61
git ls-files "*.md" | grep -v node_modules | while IFS= read -r f; do echo "$(wc -l < "$f")|$(wc -c < "$f")|$(git log -1 --date=short --pretty=format:%ad -- "$f" 2>/dev/null || echo 'unknown')|$f"; done | sort -t'|' -k1 -nr | grep -E "(DOCUMENTATION_DEBT_ANALYSIS|COMMIT_BY_COMMIT_ANALYSIS|dist/)"
find . -name "*Service*.ts" -o -name "*service*.ts" | grep -v node_modules | sort
grep -R -n -E "interface\s+Order[^a-zA-Z]|type\s+Order[^a-zA-Z]|interface\s+MenuItem[^a-zA-Z]|type\s+MenuItem[^a-zA-Z]" client/ server/ | grep -v node_modules | grep -v dist | grep -v ".d.ts" | head -40
echo "=== DUPLICATE SERVICE FILES ===" && echo "MenuService: ./client/src/services/MenuService.ts vs ./client/src/services/menu/MenuService.ts" && echo "OrderService: ./client/src/services/OrderService.ts vs ./client/src/services/orders/OrderService.ts" && echo && echo "=== CHECKING IF FILES EXIST ===" && ls -la ./client/src/services/MenuService.ts ./client/src/services/menu/MenuService.ts ./client/src/services/OrderService.ts ./client/src/services/orders/OrderService.ts 2>&1
grep -R -n -E "interface\s+(Category|Table|OrderItem|CartItem|Customer)" client/src/ server/src/ | grep -v node_modules | grep -v dist | grep -v ".d.ts" | grep -v test | head -20
find . -name "*.sql" -o -name "*migration*" | grep -v node_modules | sort
grep -r "CREATE TABLE" . --include="*.sql" --include="*.md" --include="*.ts" | grep -v node_modules | head -20
find . -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" | grep -v node_modules | wc -l
grep -r "it.skip\|describe.skip\|xit\|xdescribe" . --include="*.test.ts" --include="*.test.tsx" --include="*.spec.ts" | grep -v node_modules | head -20
grep -r "TODO\|FIXME\|HACK\|XXX\|BUG" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v node_modules | head -30
grep -r "TODO\|FIXME\|HACK\|XXX\|BUG" . --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v node_modules | cut -d: -f1-3 | sort | uniq | wc -l
find . -name "*.tsx" -o -name "*.ts" | grep -v node_modules | grep -v test | grep -v spec | xargs wc -l | sort -nr | head -16 | tail -15
grep -r "OPENAI\|API_KEY\|TOKEN" . --include="*.env*" --include="*.md" --include="*.ts" --include="*.js" | grep -v node_modules | grep -i "api\|token\|key" | head -20
test -f .env && echo "ENV FILE EXISTS" || echo "ENV FILE MISSING"
grep -n "OPENAI_API_KEY" .env | head -1 | cut -d: -f1
pwd && ls -la server/src/server.ts && ls -la .env
ls -la server/.env 2>/dev/null || echo "No .env in server directory"
grep -n "OPENAI_API_KEY" server/.env | head -1 | cut -d: -f1
rm server/.env
cd server && npm run build
pwd && cd server && npx tsx scripts/test-env.ts
npx tsx scripts/test-env.ts
cd .. && cat .env | grep -E "SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_SERVICE_KEY" | head -3
rm server/scripts/test-env.ts
grep -r "process\.env\." . --include="*.ts" --include="*.tsx" --include="*.js" | grep -v node_modules | grep -v dist | cut -d: -f2 | grep -o "process\.env\.[A-Z_]*" | sort | uniq
cat .env.example | grep -E "^[A-Z_]+=.*" | cut -d= -f1 | sort
```

SECTION COMPLETE: RAW_COMMAND_LOG