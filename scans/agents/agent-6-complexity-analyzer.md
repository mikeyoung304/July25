# Agent 6: Complexity Analyzer

**Priority**: MEDIUM (Long-term code quality)
**Estimated Runtime**: 40-50 minutes
**Focus**: Code complexity, duplication, and refactoring opportunities

## Mission

Scan the codebase for code smells, high complexity, duplication, and architectural issues that accumulate as technical debt. Based on recent commits ("feat(kds): simplify to 2 order types"), the team is actively working to reduce complexity.

## Why This Matters

Technical debt compounds over time:
- **Slower development** (hard to understand code)
- **More bugs** (complex code is error-prone)
- **Difficult onboarding** (new devs struggle)
- **Fear of changes** (risky to modify complex code)
- **Maintenance burden** (duplicate code means duplicate bugs)

Your team is actively simplifying (git history shows this), so identifying complexity hotspots helps prioritize refactoring.

## Scan Strategy

### 1. Cyclomatic Complexity Analysis
**Target Files**: `**/*.ts`, `**/*.tsx`

**Detection Steps**:
1. Glob for all TypeScript files
2. Analyze each function for cyclomatic complexity
3. Count decision points:
   - if, else, elif
   - for, while, do-while
   - case in switch
   - &&, ||, ternary ?:
   - catch blocks
4. Flag functions with complexity >10 (industry standard threshold)

**Complexity Scoring**:
- 1-5: Low complexity (good)
- 6-10: Moderate complexity (acceptable)
- 11-20: High complexity (refactor recommended)
- 21+: Very high complexity (refactor required)

**Example Violation**:
```typescript
// ❌ HIGH COMPLEXITY (complexity: 15)
function processOrder(order: Order, user: User, settings: Settings) {
  if (!order) return null;                    // +1
  if (!user.is_authenticated) return null;    // +1

  if (order.type === 'dine-in') {             // +1
    if (order.table_number) {                 // +1
      if (settings.table_service_enabled) {   // +1
        // ...
      } else {                                // +1
        // ...
      }
    }
  } else if (order.type === 'takeout') {      // +1
    if (order.pickup_time) {                  // +1
      // ...
    } else {                                  // +1
      // ...
    }
  } else if (order.type === 'delivery') {     // +1
    if (order.address && order.address.zip) { // +2
      // ...
    } else {                                  // +1
      // ...
    }
  }

  try {
    validateOrder(order);
  } catch (error) {                           // +1
    // ...
  }

  return order;  // Total: 15 (TOO HIGH)
}

// ✅ BETTER - Refactored (complexity: 3 per function)
function processOrder(order: Order, user: User, settings: Settings) {
  if (!validateAuth(order, user)) return null;  // +1

  if (order.type === 'dine-in') {                // +1
    return processDineInOrder(order, settings);
  } else if (order.type === 'takeout') {         // +1
    return processTakeoutOrder(order);
  } else if (order.type === 'delivery') {
    return processDeliveryOrder(order);
  }
}

// Complexity distributed across smaller functions
function processDineInOrder(order: Order, settings: Settings) {
  if (!order.table_number) return null;         // +1
  if (!settings.table_service_enabled) {        // +1
    return processAsPickup(order);
  }
  return order;
}
```

### 2. Function Length Analysis
**Target Files**: `**/*.ts`, `**/*.tsx`

**Detection Steps**:
1. Count lines of code (LOC) per function
2. Flag functions >50 lines (guideline from CLAUDE.md)
3. Flag functions >100 lines (critical - must refactor)
4. Measure ratio of LOC to actual logic (comments, whitespace)

**Industry Standards**:
- <20 lines: Ideal (easy to understand)
- 20-50 lines: Acceptable
- 50-100 lines: Long (consider refactoring)
- 100+ lines: Too long (refactor required)

**Example Violation**:
```typescript
// ❌ TOO LONG (127 lines)
async function handleOrderSubmit(orderData: OrderData) {
  // ... 127 lines of mixed concerns:
  // - Validation
  // - Data transformation
  // - API calls
  // - Error handling
  // - State updates
  // - Analytics
  // - Notifications
  // All in one function!
}

// ✅ BETTER - Broken into focused functions
async function handleOrderSubmit(orderData: OrderData) {
  const validated = validateOrderData(orderData);      // 15 lines
  const transformed = transformOrderData(validated);   // 10 lines
  const created = await createOrder(transformed);      // 20 lines
  updateOrderState(created);                           // 8 lines
  trackOrderAnalytics(created);                        // 5 lines
  sendOrderNotifications(created);                     // 12 lines
  return created;
}
// Each function is now <20 lines and has single responsibility
```

### 3. Code Duplication Detection
**Target Files**: `**/*.ts`, `**/*.tsx`

**Detection Steps**:
1. Look for duplicated code blocks (5+ lines similar)
2. Search for similar function signatures
3. Flag copy-paste patterns:
   - Same logic with minor variations
   - Repeated validation logic
   - Similar API call patterns
4. Calculate duplication ratio

**Detection Strategy**:
- Read files in chunks
- Compare code blocks using fuzzy matching
- Flag blocks that appear 3+ times
- Suggest extraction to shared utility

**Example Violation**:
```typescript
// ❌ DUPLICATION - Same pattern in 5 different files

// File 1: orders.ts
const orders = await supabase
  .from('orders')
  .select('*')
  .eq('restaurant_id', restaurant_id)
  .eq('status', 'pending');

// File 2: menu.ts
const menuItems = await supabase
  .from('menu_items')
  .select('*')
  .eq('restaurant_id', restaurant_id)
  .eq('active', true);

// File 3: customers.ts
const customers = await supabase
  .from('customers')
  .select('*')
  .eq('restaurant_id', restaurant_id)
  .eq('active', true);

// ✅ BETTER - Extracted to utility
async function queryByRestaurant<T>(
  table: string,
  restaurantId: string,
  additionalFilters: Record<string, any> = {}
): Promise<T[]> {
  let query = supabase
    .from(table)
    .select('*')
    .eq('restaurant_id', restaurantId);

  for (const [key, value] of Object.entries(additionalFilters)) {
    query = query.eq(key, value);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as T[];
}

// Usage
const orders = await queryByRestaurant('orders', restaurantId, { status: 'pending' });
const menuItems = await queryByRestaurant('menu_items', restaurantId, { active: true });
```

### 4. God Object Detection
**Target Files**: `**/*.ts`, `**/*.tsx`, `**/*.tsx`

**Detection Steps**:
1. Count methods/functions per file
2. Count responsibilities per class/module
3. Flag files with >15 exported functions (god module)
4. Flag classes with >10 methods (god class)
5. Measure coupling (imports from many places)

**Example Violation**:
```typescript
// ❌ GOD OBJECT - OrderService.ts (400 lines, 23 methods)
class OrderService {
  createOrder()
  updateOrder()
  deleteOrder()
  getOrder()
  listOrders()
  validateOrder()
  calculateTotal()
  applyDiscount()
  calculateTax()
  processPayment()
  refundPayment()
  sendConfirmationEmail()
  sendCancellationEmail()
  logOrderEvent()
  trackAnalytics()
  updateInventory()
  notifyKitchen()
  printReceipt()
  generateInvoice()
  exportToPDF()
  syncToAccounting()
  scheduleDelivery()
  optimizeRoute()
  // ... doing everything!
}

// ✅ BETTER - Single Responsibility Principle
class OrderRepository {
  create()
  update()
  delete()
  findById()
  findAll()
}

class OrderCalculator {
  calculateTotal()
  applyDiscount()
  calculateTax()
}

class PaymentProcessor {
  processPayment()
  refundPayment()
}

class OrderNotifier {
  sendConfirmationEmail()
  sendCancellationEmail()
  notifyKitchen()
}

class OrderDocuments {
  printReceipt()
  generateInvoice()
  exportToPDF()
}
```

### 5. Deep Nesting Detection
**Target Files**: `**/*.ts`, `**/*.tsx`

**Detection Steps**:
1. Count indentation levels
2. Flag code with >4 levels of nesting
3. Suggest early returns and guard clauses

**Example Violation**:
```typescript
// ❌ DEEP NESTING (6 levels)
function processPayment(order: Order, user: User) {
  if (order) {                                    // Level 1
    if (user.is_authenticated) {                  // Level 2
      if (order.total > 0) {                      // Level 3
        if (user.payment_method) {                // Level 4
          if (user.payment_method.is_valid) {     // Level 5
            if (chargePayment(order, user)) {     // Level 6
              return { success: true };
            }
          }
        }
      }
    }
  }
  return { success: false };
}

// ✅ BETTER - Guard clauses (1-2 levels max)
function processPayment(order: Order, user: User) {
  // Guard clauses - fail fast
  if (!order) return { success: false };
  if (!user.is_authenticated) return { success: false };
  if (order.total <= 0) return { success: false };
  if (!user.payment_method) return { success: false };
  if (!user.payment_method.is_valid) return { success: false };

  // Happy path - no nesting
  const charged = chargePayment(order, user);
  return { success: charged };
}
```

### 6. Magic Numbers Detection
**Target Files**: `**/*.ts`, `**/*.tsx`

**Detection Steps**:
1. Search for numeric literals in code
2. Flag numbers that aren't obvious (0, 1, -1, 100 are OK)
3. Suggest named constants

**Example Violation**:
```typescript
// ❌ MAGIC NUMBERS
function calculateDiscount(total: number) {
  if (total > 100) {                   // What's 100?
    return total * 0.15;               // What's 15%?
  } else if (total > 50) {             // What's 50?
    return total * 0.10;               // What's 10%?
  }
  return 0;
}

setTimeout(fetchData, 300000);         // What's 300000?

// ✅ BETTER - Named constants
const DISCOUNT_THRESHOLDS = {
  LARGE_ORDER: 100,
  MEDIUM_ORDER: 50
};

const DISCOUNT_RATES = {
  LARGE_ORDER: 0.15,  // 15%
  MEDIUM_ORDER: 0.10  // 10%
};

function calculateDiscount(total: number) {
  if (total > DISCOUNT_THRESHOLDS.LARGE_ORDER) {
    return total * DISCOUNT_RATES.LARGE_ORDER;
  } else if (total > DISCOUNT_THRESHOLDS.MEDIUM_ORDER) {
    return total * DISCOUNT_RATES.MEDIUM_ORDER;
  }
  return 0;
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;
setTimeout(fetchData, FIVE_MINUTES_MS);
```

### 7. Comment Ratio Analysis
**Target Files**: `**/*.ts`, `**/*.tsx`

**Detection Steps**:
1. Count lines of code vs. lines of comments
2. Flag files with <5% comments (under-documented)
3. Flag files with >30% comments (over-commented, code smell)
4. Look for commented-out code (should be deleted)

**Ideal Ratio**: 10-20% comments

## Detection Patterns

### High Complexity (Severity: HIGH)
- [ ] Function with cyclomatic complexity >20
- [ ] Function >100 lines
- [ ] File >1000 lines
- [ ] God object (>15 methods)

### Medium Complexity (Severity: MEDIUM)
- [ ] Function with cyclomatic complexity 11-20
- [ ] Function 50-100 lines
- [ ] Deep nesting (>4 levels)
- [ ] Significant code duplication (5+ occurrences)

### Low Priority (Severity: LOW)
- [ ] Magic numbers without constants
- [ ] Missing function documentation
- [ ] Commented-out code

## Report Template

Generate report at: `/scans/reports/[timestamp]/complexity-analyzer.md`

```markdown
# Complexity Analyzer - Overnight Scan Report

**Generated**: [ISO timestamp]
**Scan Duration**: [time in minutes]
**Files Scanned**: [count]

## Executive Summary

[2-3 sentence overview of code quality]

**Total Issues Found**: X
- HIGH: X (critical complexity)
- MEDIUM: X (refactoring recommended)
- LOW: X (minor improvements)

**Estimated Refactoring Effort**: X hours
**Technical Debt Score**: Y/100 (lower is better)

## Complexity Metrics

### Codebase Statistics
- Total lines of code: X
- Total functions: Y
- Average function length: Z lines
- Average complexity: W

### Complexity Distribution
```
Functions by Complexity:
1-5 (Low):      ████████████████ 234 functions (65%)
6-10 (Medium):  ███████░░░░░░░░░  89 functions (25%)
11-20 (High):   ███░░░░░░░░░░░░░  28 functions (8%)
21+ (Critical): █░░░░░░░░░░░░░░░   7 functions (2%)  ← REFACTOR THESE
```

### Function Length Distribution
```
Functions by Length:
<20 lines:    ████████████████ 198 functions (55%)
20-50 lines:  ██████████░░░░░░ 112 functions (31%)
50-100 lines: ███░░░░░░░░░░░░░  38 functions (11%)
100+ lines:   █░░░░░░░░░░░░░░░  10 functions (3%)   ← REFACTOR THESE
```

## High-Priority Findings

### 1. [File Path:Line] - Extreme Complexity
**Severity**: HIGH
**Metric**: Cyclomatic Complexity = 24
**Function**: processOrderSubmit (127 lines)

**Issues**:
- Complexity: 24 (target: <10)
- Length: 127 lines (target: <50)
- Nested 6 levels deep (target: <4)

**Recommended Refactoring**:
1. Extract validation logic → validateOrder()
2. Extract payment logic → processPayment()
3. Extract notification logic → sendNotifications()
4. Use guard clauses to reduce nesting

**Estimated Effort**: 2 hours
**Impact**: Easier testing, fewer bugs, better maintainability

[Repeat for each HIGH finding]

## Code Duplication Report

### Duplicated Blocks Found
**Total**: X blocks duplicated Y times

### Pattern 1: Restaurant ID Filtering (7 occurrences)
```typescript
// Duplicated in:
- server/src/routes/orders.ts:45
- server/src/routes/menu.ts:67
- server/src/routes/customers.ts:89
- server/src/services/analytics.ts:123
[etc.]

// Pattern:
.eq('restaurant_id', restaurant_id)

// Recommendation: Extract to utility function
```

### Pattern 2: Error Handling (5 occurrences)
```typescript
// Duplicated error handling pattern
try {
  // operation
} catch (error) {
  console.error(error);
  res.status(500).json({ error: 'Something went wrong' });
}

// Recommendation: Create error middleware
```

## God Objects Found

### 1. server/src/services/OrderService.ts
**Methods**: 23
**Lines**: 456
**Responsibilities**: 7 (too many!)

**Responsibilities**:
1. CRUD operations
2. Payment processing
3. Email notifications
4. Analytics tracking
5. PDF generation
6. Inventory management
7. Delivery scheduling

**Recommended Refactoring**:
Split into:
- OrderRepository (CRUD)
- PaymentService (payments)
- NotificationService (emails/SMS)
- OrderAnalytics (tracking)
- DocumentService (PDF)
- InventoryService (stock)
- DeliveryService (scheduling)

**Effort**: 4 hours

## Deep Nesting Hotspots

### Files with Deep Nesting (>4 levels)
1. server/src/routes/orders.ts:89 - 6 levels
2. client/src/pages/Checkout.tsx:123 - 5 levels
3. server/src/services/payment.ts:45 - 5 levels

**Recommended Pattern**: Use guard clauses and early returns

## Magic Numbers Found

### Constants to Extract
- `300000` appears 4 times → `FIVE_MINUTES_MS`
- `0.15` appears 3 times → `DISCOUNT_RATE_LARGE`
- `50` appears 8 times → Various contexts, need review

## Statistics

### Most Complex Files
1. server/src/services/OrderService.ts - Avg complexity: 18
2. client/src/pages/Dashboard.tsx - Avg complexity: 14
3. server/src/routes/orders.ts - Avg complexity: 12

### Longest Functions
1. processOrderSubmit (127 lines) - orders.ts:45
2. handleCheckout (98 lines) - Checkout.tsx:67
3. generateReport (87 lines) - analytics.ts:123

### Most Duplicated Files
1. server/src/routes/*.ts - 23 duplicated blocks
2. client/src/components/*.tsx - 15 duplicated blocks

## Next Steps

### Immediate Actions (This Week)
1. Refactor top 3 most complex functions
2. Extract duplicated restaurant_id query pattern
3. Break up OrderService god object

### Short-term (This Sprint)
1. Add complexity metrics to CI
2. Set complexity budget (no function >15)
3. Extract all magic numbers to constants
4. Refactor deep nesting patterns

### Long-term (This Quarter)
1. Establish coding standards document
2. Add automated complexity gates
3. Regular refactoring sprints
4. Code review checklist for complexity

## Refactoring Opportunities

### Quick Wins (High Impact, Low Effort)
1. Extract 7 duplicated query patterns → 30 minutes
2. Add constants for magic numbers → 15 minutes
3. Apply guard clauses to reduce nesting → 45 minutes

**Total Impact**: Better readability, less duplication
**Total Effort**: 90 minutes

### High-Value Refactors
1. Split OrderService into 7 services → 4 hours
2. Refactor processOrderSubmit → 2 hours
3. Create shared error handling middleware → 1 hour

**Total Impact**: Significantly better architecture
**Total Effort**: 7 hours

## Code Quality Recommendations

### Establish Metrics
```json
// package.json
{
  "scripts": {
    "complexity": "eslint --ext .ts,.tsx . --format json > complexity-report.json"
  }
}
```

### ESLint Rules
```json
// .eslintrc.json
{
  "rules": {
    "complexity": ["error", 10],
    "max-lines-per-function": ["warn", 50],
    "max-depth": ["warn", 4],
    "max-params": ["warn", 4]
  }
}
```

## Validation Checklist

Before marking this scan as complete, verify:
- [ ] All TypeScript files analyzed for complexity
- [ ] Function lengths measured
- [ ] Code duplication detected
- [ ] God objects identified
- [ ] Deep nesting flagged
- [ ] Magic numbers catalogued
- [ ] File:line references are accurate
- [ ] Refactoring recommendations prioritized
```

## Success Criteria

- [ ] All .ts and .tsx files scanned
- [ ] Cyclomatic complexity calculated
- [ ] Function lengths measured
- [ ] Code duplication identified
- [ ] God objects detected
- [ ] Refactoring opportunities prioritized
- [ ] Quick wins identified
- [ ] Long-term improvements suggested

## Tools to Use

- **Glob**: Find all TypeScript files
- **Read**: Analyze file contents for patterns
- **Grep**: Find duplicated patterns
- **Bash**: Run complexity analysis tools if available

## Exclusions

Do NOT flag:
- Test files (complexity is OK in tests)
- Configuration files
- Type definition files (.d.ts)
- Generated code

## End of Agent Definition
