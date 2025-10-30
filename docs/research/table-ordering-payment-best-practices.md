# Table Ordering & Payment Workflow Best Practices
## Competitive Analysis & Implementation Recommendations

**Date:** October 29, 2025
**Author:** System Analysis
**Status:** Research Complete

---

## Executive Summary

This report analyzes how leading restaurant POS/KDS systems (Toast, Square, Lightspeed, Clover) handle dine-in table ordering, seat management, and payment workflows. The analysis reveals critical gaps in the current system's seat ordering workflow and payment UX, with specific recommendations for improvement prioritized by business impact.

### Key Findings

1. **Industry Standard Pattern**: All major POS systems use a **continuous seat ordering workflow** with explicit "Next Seat" and "Finish Table" actions
2. **Payment Workflow**: Modern systems provide **tableside payment** with clear tender selection (cash/card) and automatic table status transitions
3. **Critical Gaps**: Current system lacks seat progression prompting and integrated check closing workflow
4. **Quick Win**: Existing Square payment integration provides foundation for rapid implementation

### Priority Recommendations

| Priority | Feature | Effort | Impact | Timeline |
|----------|---------|--------|--------|----------|
| P0 | Sequential seat ordering with "Finish Table" | Medium | High | 2-3 days |
| P0 | Check closing with tender selection (Cash/Card) | Medium | High | 2-3 days |
| P1 | Table status automation post-payment | Low | Medium | 1 day |
| P2 | Split check by seat | High | Medium | 5-7 days |

---

## Table of Contents

1. [Competitive Analysis](#competitive-analysis)
2. [Industry Best Practices](#industry-best-practices)
3. [Current System Architecture](#current-system-architecture)
4. [Gap Analysis](#gap-analysis)
5. [Workflow Diagrams](#workflow-diagrams)
6. [Implementation Recommendations](#implementation-recommendations)
7. [Technical Specifications](#technical-specifications)

---

## Competitive Analysis

### 1. Toast POS

**Company:** Toast, Inc. (NYSE: TOST)
**Market Position:** Leading restaurant-specific POS platform

#### Seat Ordering Workflow

Toast implements a **mode-based ordering system** with explicit seat management:

```
Default: "By Course" mode
↓
Server taps mode selector → chooses "By Seat"
↓
Tap "Add a seat" → Select seat number (1-N)
↓
Add menu items for selected seat
↓
Tap "Add a seat" again → Select different seat number
↓
Repeat for all seated guests
↓
Tap "Send" (lower-right) → Order sent to kitchen
```

**Key Features:**
- Seat numbers are printed on kitchen tickets
- Items default to "Shared" until assigned to specific seat
- Can move multiple items between seats via "Edit order"
- **Cannot change course after sending** (prevents kitchen confusion)
- Integrated with Toast Tables for real-time floor plan updates

**Standardized Seat Numbering:**
- Seat #1 = back to point of reference (hostess stand/kitchen)
- Seats 2, 3, 4... proceed clockwise around table
- Prevents "food auction" where servers ask "who ordered the burger?"

#### Payment Workflow

```
Server taps Pay ($)
↓
Choose payment method:
  - Credit (for card reader)
  - Guest Pay (dual-screen customer-facing)
  - Cash (with Fast Cash buttons for $20, $50, $100)
  - House Account
  - Custom payment types
↓
FOR CARD: Swipe/insert/tap → Tip selection → Signature
FOR CASH: Enter amount → System calculates change
↓
Receipt delivery preference (print/text/email/none)
↓
Optional: Loyalty program prompt
↓
Check closes, order status = "completed"
```

**Split Check Capabilities:**
- Split by item (move items to new check)
- Split by seat (auto-creates checks per seat)
- Split individual items (fractional portions like 1/3 bottle)
- Split evenly (choose number of ways)

#### Table Status Management

Toast Tables integration provides:
- Real-time status: What guests ordered, when fulfilled, when paid
- Automatic table status updates from POS/KDS
- "Next up" server rotation based on cover counts
- Table progress indicators without leaving host stand

**Strengths:**
- Comprehensive seat-to-kitchen workflow
- Strong standardization (reduces training time)
- Excellent integration between front-of-house and kitchen

**Weaknesses:**
- Requires mode switching (adds friction)
- Cannot modify courses after sending (inflexible)

---

### 2. Square for Restaurants

**Company:** Block, Inc. (NYSE: SQ)
**Market Position:** Versatile payment processor with restaurant module

#### Seat Ordering Workflow

Square offers **three configurable approaches** to cover/seat tracking:

1. **Track cover count only** - Basic party size, no seat assignment
2. **Track cover count with optional seat positions** - Flexible seat assignment
3. **Track cover count with required seat positions** - Enforced seat-level ordering

When seat positions are enabled:
```
Open table → Set number of guests
↓
Tap item → Assign to seat (or leave unassigned)
↓
Repeat for all items
↓
Review sale → Charge
```

**Key Features:**
- Flexible assignment: Items can remain unassigned or move freely between seats
- Integrated with Square Terminal for tableside ordering
- One-tap table opening with auto-populated guest count

#### Payment Workflow

**Square Terminal Tableside Payment:**

```
Server brings Square Terminal to table
↓
Reviews check with customer
↓
FOR SPLIT CHECK:
  - Split by seat (automatic per-seat checks)
  - Split by item (select items, move to new check)
  - Split evenly (choose N ways)
  - Split by payment amount
↓
Customer pays via:
  - Contactless (tap)
  - Chip card (insert)
  - Swipe
  - Manual key-in
↓
Tip entry on device
↓
Digital signature
↓
Check closes automatically
```

**Payment Collection Benefits:**
- **Single trip to table** (traditional method requires 2+ trips)
- Faster table turnover
- Easier bill splitting at the table
- Tips entered digitally (no end-of-shift reconciliation)

#### Table Status Management

Square for Restaurants includes:
- Table maps with cover counts
- Color indicators based on time since check opened
- Real-time order fulfillment visibility
- Service charge automation

**Strengths:**
- Highly flexible (optional vs. required seats)
- Best-in-class payment hardware (Square Terminal)
- Unified payment processing (no separate processor needed)

**Weaknesses:**
- Less restaurant-specific than Toast
- Advanced features require Plus/Premium subscription
- Lighter on kitchen workflow optimization

---

### 3. Lightspeed Restaurant

**Company:** Lightspeed Commerce (NYSE: LSPD)
**Market Position:** Global commerce platform with restaurant module

#### Seat Ordering Workflow

Lightspeed provides **three methods** for seat assignment:

**Method 1: Seat Buttons (Primary)**
```
Bottom of order screen shows seat buttons
↓
Tap seat button (e.g., "Seat 3")
↓
Add items from menu
↓
Items automatically assigned to selected seat
↓
Tap different seat button to switch
↓
Move existing items: Select item → Tap target seat button
```

**Method 2: Item Options Menu**
```
Tap and hold order item
↓
Context menu appears
↓
Select "Move to Seat"
↓
Choose target seat
```
*Limitation: Can only move one item at a time (unless grouped)*

**Method 3: Actions Panel**
```
Tap Actions button
↓
Select multiple items from receipt display
↓
Tap "Move to Seat"
↓
Choose target seat for all selected items
```
*Most flexible: Can move individual items within groups*

**Key Features:**
- Specify **number of covers** when opening table (helps with split billing)
- **Course management**: Can assign items to courses (appetizers, mains, desserts)
- Sent items appear on Kitchen Display System with seat numbers
- Requires "Split Bill" payment type setup in Restaurant Manager

#### Payment Workflow

**Lightspeed K-Series:**

```
Server completes order entry
↓
Tap payment button (lightning bolt for fast payment)
↓
Choose payment type:
  - Cash (default, built-in)
  - Credit/Debit Card (via EFTPOS integration)
  - Manual payment types (checks, vouchers, etc.)
↓
FOR CARD (Integrated):
  - Amount auto-sent to payment terminal
  - Customer completes on terminal
  - Transaction records automatically in POS
↓
FOR CARD (Non-integrated):
  - Server manually enters amount on external terminal
  - Runs customer's card
  - Manually records transaction in POS
↓
FOR CASH:
  - Enter amount received
  - System calculates change
  - Cash drawer opens automatically (if configured)
↓
Order marked as closed/paid
```

**Payment Type Architecture:**
- **Payment Methods** = Customer-facing options in POS
- **Payment Types** = Backend processor/integration
- Each payment method must be assigned a payment type

**Error Correction:**
- After closing, orders cannot be reopened
- Workaround: Refund the sale → Process order again with correct payment type

#### Table Status Management

- Tables show active orders with "Blue addition symbol" when open on another register
- **Warning**: Avoid editing orders on multiple registers simultaneously
- OpenTable integration: Auto-updates table status from 'Seated' to 'Paid'

**Strengths:**
- Three flexible methods for seat assignment
- Course management for pacing service
- Strong global presence and multi-location support

**Weaknesses:**
- Non-integrated payment types require manual double-entry
- Cannot reopen closed checks (must refund and re-enter)
- Concurrent editing can cause data issues

---

### 4. Clover Restaurant

**Company:** Fiserv (NASDAQ: FI)
**Market Position:** Bank-provided POS with restaurant module

#### Seat Ordering Workflow

Clover uses **Server Station mode** for table service:

```
Open register in Server Station mode
↓
Select table → Add guest information
↓
Add order items to current order
↓
Assign items to seats as needed
↓
Use course firing to prioritize by course:
  - Appetizers
  - Entrees
  - Desserts
↓
Send to kitchen
```

**Key Features:**
- **Clover Dining app**: Manage tables, monitor seated tables, headcounts, ordered items
- **Course firing**: Control order flow, prioritize dishes by course
- Table layout development with real-time monitoring
- Split check functionality

#### Payment Workflow

Similar to Square/Lightspeed model:
- Table-level or seat-level check splitting
- Integrated card processing via Clover hardware
- Cash tender support
- Split payment for large groups with separate bills

#### Table Status Management

- Floor plan view with table status indicators
- Integration with reservation systems
- Real-time order tracking per table

**Strengths:**
- Strong bank partnerships (easy merchant onboarding)
- Integrated payment hardware ecosystem
- Course-based kitchen coordination

**Weaknesses:**
- Less innovative than Toast/Square
- Heavier reliance on proprietary hardware
- Smaller independent software vendor ecosystem

---

## Industry Best Practices

### Pattern #1: Continuous Seat Ordering Workflow

**Universal Pattern Across All Systems:**

```
┌─────────────────────────────────────────┐
│  Server approaches table, opens check   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │ "Select Seat 1" │
         └────────┬─────────┘
                  │
                  ▼
      ┌───────────────────────┐
      │ Add items for Seat 1  │
      └───────────┬────────────┘
                  │
                  ▼
         ┌────────────────────┐
         │   Prompt Server:   │
         │ ┌───────────────┐  │
         │ │ Add Next Seat │  │
         │ └───────────────┘  │
         │ ┌───────────────┐  │
         │ │ Finish Table  │  │
         │ └───────────────┘  │
         └────┬──────────┬────┘
              │          │
      "Next"  │          │ "Finish"
              ▼          │
    ┌──────────────┐     │
    │Select Seat 2 │     │
    └──────┬───────┘     │
           │             │
           ▼             │
    ┌─────────────────┐  │
    │Add items Seat 2 │  │
    └──────┬──────────┘  │
           │             │
           │             │
      [Repeat...]        │
           │             │
           └─────────────┤
                         ▼
              ┌──────────────────┐
              │ Send to Kitchen  │
              └──────────────────┘
```

**Critical Design Principles:**

1. **Explicit Seat Progression**: Never auto-advance to next seat
2. **Clear Termination**: "Finish Table" signals all guests accounted for
3. **Visual Feedback**: Show which seats have items assigned
4. **Easy Correction**: Allow moving items between seats before sending

### Pattern #2: Seat Numbering Standardization

**Industry Standard (Adopted by Toast, Lightspeed, Others):**

```
        ┌─────────────┐
        │   Kitchen   │
        │(Reference)  │
        └─────────────┘
             ▲
             │
    ┌────────┴────────┐
    │                 │
    │   [4]     [2]   │
Seat 4 has          Seat 2 faces
back to              reference
reference            (Seat 1's right)
    │                 │
    │   [1]     [3]   │
    │                 │
Seat 1 has          Seat 3 (Seat 1's left)
back to reference
    └─────────────────┘

Numbering: Seat 1 = back to kitchen/host stand
           Proceed CLOCKWISE: 1 → 2 → 3 → 4
```

**Benefits:**
- Eliminates "food auction" (servers asking "who ordered X?")
- Faster food running (anyone can deliver to correct seat)
- Reduces errors and remakes
- Universal training across locations

### Pattern #3: Payment Tender Selection

**Standard Checkout Flow:**

```
┌──────────────────────────┐
│   Customer Ready to Pay   │
└─────────────┬─────────────┘
              │
              ▼
     ┌────────────────────┐
     │  Server Opens Check │
     │   Reviews Total     │
     └────────┬────────────┘
              │
              ▼
   ┌─────────────────────────┐
   │  Tender Selection Screen │
   │  ┌───────────────────┐  │
   │  │   💳 Card         │  │
   │  ├───────────────────┤  │
   │  │   💵 Cash         │  │
   │  ├───────────────────┤  │
   │  │   🏠 House Acct   │  │
   │  ├───────────────────┤  │
   │  │   🎫 Gift Card    │  │
   │  └───────────────────┘  │
   └──────┬──────────┬───────┘
          │          │
      CARD│          │CASH
          ▼          ▼
  ┌────────────┐  ┌────────────┐
  │ Card Reader│  │Enter Amount│
  │  Process   │  │  Received  │
  └─────┬──────┘  └─────┬──────┘
        │               │
        ▼               ▼
  ┌──────────┐    ┌──────────┐
  │Tip Entry │    │Calculate │
  └────┬─────┘    │  Change  │
       │          └────┬─────┘
       ▼               │
  ┌──────────┐        │
  │Signature │        │
  └────┬─────┘        │
       └──────┬───────┘
              │
              ▼
       ┌─────────────┐
       │Receipt Opts │
       │Print/Email/ │
       │Text/None    │
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
       │Check Closed │
       │Table Status │
       │  → "Paid"   │
       └─────────────┘
```

**Key Elements:**
1. **Clear visual hierarchy**: Large, touch-friendly buttons
2. **Flexible tender mix**: Support split tender (e.g., $50 cash + $30 card)
3. **Fast cash buttons**: $20, $50, $100 shortcuts
4. **Automatic change calculation**: Reduce math errors
5. **Digital tip entry**: Eliminate end-of-shift reconciliation

### Pattern #4: Table Status State Machine

**Standard Status Lifecycle:**

```
┌─────────────┐
│  Available  │ ← Initial state, ready for guests
└──────┬──────┘
       │ Host seats guests
       ▼
┌─────────────┐
│   Seated    │ ← Reservation confirmed, waiting for server
└──────┬──────┘
       │ Server opens check
       ▼
┌─────────────┐
│  Occupied   │ ← Active order in system
└──────┬──────┘
       │ Order sent to kitchen
       ▼
┌─────────────┐
│ In Service  │ ← Food being prepared/served
└──────┬──────┘
       │ Payment collected
       ▼
┌─────────────┐
│    Paid     │ ← Check closed, guests may still be present
└──────┬──────┘
       │ Guests leave
       ▼
┌─────────────┐
│  Cleaning   │ ← Bus staff clearing/resetting table
└──────┬──────┘
       │ Table reset complete
       ▼
┌─────────────┐
│  Available  │ ← Ready for next guests
└─────────────┘
```

**Automation Opportunities:**
- **Occupied**: Auto-set when order created
- **Paid**: Auto-set when payment processed
- **Available**: Auto-set after X minutes in "Paid" or manual by staff

### Pattern #5: Split Check Strategies

**Industry Standard Methods:**

1. **Split by Seat** (Most Common)
   - System auto-creates separate check for each seat
   - Works perfectly with seat-based ordering
   - One-tap operation

2. **Split by Item**
   - Server selects items, moves to new check
   - Flexible for groups sharing dishes
   - Allows fractional splits (e.g., 1/3 of appetizer)

3. **Split Evenly**
   - Divides total by N people
   - Fast for groups splitting everything
   - Good for business lunches

4. **Custom Split**
   - Server manually assigns items/amounts
   - Most flexible but slowest
   - Used when above methods don't fit

---

## Current System Architecture

### Database Schema

#### Tables Table (`tables`)

```typescript
interface Table {
  id: string;
  restaurant_id: string;
  table_number: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning';
  section?: string;
  position?: { x: number; y: number };
  shape?: 'square' | 'round' | 'rectangle' | 'circle' | 'chip_monkey';
  current_order_id?: string;
  server_id?: string;
  created_at: string;
  updated_at: string;
}
```

**API Endpoints:**
- `GET /api/tables` - List all tables
- `GET /api/tables/:id` - Get single table
- `POST /api/tables` - Create table
- `PUT /api/tables/:id` - Update table
- `PATCH /api/tables/:id/status` - Update table status
- `DELETE /api/tables/:id` - Soft delete table
- `PUT /api/tables/batch` - Batch update (floor plan editor)

#### Orders Schema

```typescript
interface Order {
  id: string;
  restaurant_id: string;
  order_number: string;
  items: OrderItem[];
  type: 'kiosk' | 'drive-thru' | 'online' | 'voice';
  customerName?: string;
  tableNumber?: string;
  notes?: string;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  created_at: string;
  // ... other fields
}
```

**Missing Fields:**
- ❌ `seat_number` - Not tracked per order or item
- ❌ `payment_status` - ('unpaid' | 'paid' | 'failed')
- ❌ `payment_method` - ('cash' | 'card' | 'other')
- ❌ `check_closed_at` - Timestamp
- ❌ `split_from_check_id` - For split checks

### Frontend Components

#### Existing: SeatSelectionModal.tsx

**Location:** `client/src/pages/components/SeatSelectionModal.tsx`

**Current Behavior:**
```tsx
<SeatSelectionModal
  show={boolean}
  table={Table}
  selectedSeat={number | null}
  onSeatSelect={(seat: number) => void}
  onStartVoiceOrder={() => void}
  onClose={() => void}
/>
```

**UI:**
- 3-column grid of seat buttons (Seat 1, Seat 2, ...)
- Based on table capacity
- Single selection only
- "Start Voice Order" button (disabled until seat selected)

**Critical Gap:** No "Next Seat" or "Finish Table" buttons!

**Current Flow:**
```
1. Server selects table
2. Modal shows: "Select Seat - Table 5"
3. Server taps "Seat 1"
4. Server taps "Start Voice Order"
5. Voice order UI opens
6. Server places order for Seat 1
7. Order completes... THEN WHAT?
   ❌ No prompt for Seat 2
   ❌ No "Finish Table" option
   ❌ Modal doesn't reappear
```

#### Existing: useTableGrouping Hook

**Location:** `client/src/hooks/useTableGrouping.ts`

**Functionality:**
- Groups orders by table number
- Calculates completion percentage
- Tracks urgency level based on age
- Separates takeout/delivery/drive-thru

**Output:**
```typescript
interface TableGroup {
  tableNumber: string;
  orders: Order[];
  totalItems: number;
  completedItems: number;
  readyItems: number;
  preparingItems: number;
  oldestOrderTime: string;
  newestOrderTime: string;
  status: 'pending' | 'in-progress' | 'partially-ready' | 'ready' | 'completed';
  completionPercentage: number;
  serverName?: string;
  urgencyLevel: 'normal' | 'warning' | 'urgent' | 'critical';
}
```

**Usage:** Powers Kitchen Display and Expo screens

### Payment Integration

#### Existing: Square Payment Integration

**Location:** `server/src/routes/payments.routes.ts`

**API Endpoints:**
- `POST /api/v1/payments/create` - Process payment
- `GET /api/v1/payments/:paymentId` - Get payment details
- `POST /api/v1/payments/:paymentId/refund` - Refund payment

**Current Flow:**
```typescript
POST /api/v1/payments/create
{
  order_id: string;
  token: string;  // From Square Web SDK
  amount: number;
  idempotency_key?: string;
}

Response:
{
  success: boolean;
  paymentId: string;
  status: 'COMPLETED';
  receiptUrl: string;
  order: Order;
}
```

**Features:**
- ✅ Square Web SDK integration
- ✅ Server-side amount validation
- ✅ Demo mode for development
- ✅ 3D Secure support
- ✅ Payment audit logging
- ✅ Idempotency protection
- ✅ Refund capability

**Missing:**
- ❌ Cash payment option (no API endpoint)
- ❌ Table status update after payment
- ❌ Check closing workflow
- ❌ Split payment support

### Voice Ordering Integration

**Location:** `client/src/pages/hooks/useVoiceOrderWebRTC.ts`

**Current Workflow:**
1. User selects table → Opens SeatSelectionModal
2. User selects seat → Closes modal
3. Voice order UI appears
4. User speaks order
5. Order parsed and submitted
6. Success confirmation
7. **END** (No prompt for additional seats)

---

## Gap Analysis

### Feature Comparison Matrix

| Feature | Toast | Square | Lightspeed | Clover | **Your System** | Gap |
|---------|-------|--------|------------|--------|----------------|-----|
| **Seat Ordering** |
| Sequential seat workflow | ✅ | ✅ | ✅ | ✅ | ❌ | **Critical** |
| "Add Next Seat" button | ✅ | ✅ | ✅ | ✅ | ❌ | **Critical** |
| "Finish Table" button | ✅ (Send) | ✅ (Charge) | ✅ (Send) | ✅ | ❌ | **Critical** |
| Seat number on kitchen ticket | ✅ | ✅ | ✅ | ✅ | ❌ | High |
| Move items between seats | ✅ | ✅ | ✅ | ✅ | ❌ | Medium |
| Visual seat status indicator | ✅ | ✅ | ✅ | ✅ | ❌ | Medium |
| Course management | ✅ | ⚠️ | ✅ | ✅ | ❌ | Low |
| **Payment & Checkout** |
| Tender selection screen | ✅ | ✅ | ✅ | ✅ | ❌ | **Critical** |
| Cash payment option | ✅ | ✅ | ✅ | ✅ | ❌ | **Critical** |
| Card payment | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Fast cash buttons ($20, $50) | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ | Medium |
| Automatic change calculation | ✅ | ✅ | ✅ | ✅ | ❌ | Medium |
| Tip entry (card) | ✅ | ✅ | ✅ | ✅ | ⚠️ | Medium |
| Digital signature | ✅ | ✅ | ⚠️ | ✅ | ⚠️ | Low |
| Receipt options | ✅ | ✅ | ✅ | ✅ | ⚠️ | Low |
| Split tender (cash + card) | ✅ | ✅ | ✅ | ✅ | ❌ | Low |
| **Split Check** |
| Split by seat | ✅ | ✅ | ✅ | ✅ | ❌ | High |
| Split by item | ✅ | ✅ | ✅ | ✅ | ❌ | High |
| Split evenly | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | Medium |
| Fractional item split | ✅ | ✅ | ⚠️ | ⚠️ | ❌ | Low |
| **Table Management** |
| Table status tracking | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Auto status update on payment | ✅ | ✅ | ✅ | ⚠️ | ❌ | High |
| Table-to-order linking | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Floor plan visualization | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| Server assignment | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | - |

**Legend:**
- ✅ Fully supported
- ⚠️ Partially supported or requires configuration
- ❌ Not supported
- **Bold** = Critical gap

### Priority Gap Summary

#### P0 - Critical (Blocks MVP)

1. **Sequential Seat Ordering Workflow**
   - **Gap:** After placing order for Seat 1, no prompt for Seat 2
   - **Impact:** Servers must manually navigate back, breaking flow
   - **User Story:** "As a server, after taking Seat 1's order, I want to be prompted to take Seat 2's order so I can efficiently serve the whole table"

2. **"Finish Table" Action**
   - **Gap:** No way to signal "all seats accounted for, send to kitchen"
   - **Impact:** Ambiguity about whether table order is complete
   - **User Story:** "As a server, I want to tap 'Finish Table' when done so the kitchen knows this is the complete order"

3. **Payment Tender Selection**
   - **Gap:** No UI for choosing Cash vs. Card payment
   - **Impact:** System only supports card payments, excluding cash customers
   - **User Story:** "As a server, I want to choose 'Cash' or 'Card' when closing a check so I can accommodate all payment types"

#### P1 - High Priority (Significant UX Impact)

4. **Cash Payment Workflow**
   - **Gap:** No API endpoint or UI for cash transactions
   - **Impact:** Cannot close checks for cash-paying customers
   - **Effort:** Low (simple amount entry + table status update)

5. **Table Status Automation**
   - **Gap:** Table status doesn't auto-update to "available" after payment
   - **Impact:** Hosts see tables as occupied when they're actually free
   - **Effort:** Low (webhook or status update in payment callback)

6. **Seat Number on Orders**
   - **Gap:** Orders don't store seat number
   - **Impact:** Kitchen can't coordinate multi-seat tables, food runners guess
   - **Effort:** Medium (DB migration + UI updates)

#### P2 - Medium Priority (Nice to Have)

7. **Split Check by Seat**
   - **Gap:** Cannot split single table check into per-seat checks
   - **Impact:** Manual bill splitting, slower checkout
   - **Effort:** High (complex check splitting logic)

8. **Check Closing UI**
   - **Gap:** No dedicated checkout screen, using generic payment modal
   - **Impact:** Less professional, missing features (tip, receipt options)
   - **Effort:** Medium (new screen + Square SDK integration)

---

## Workflow Diagrams

### Current System Flow (As-Is)

```
┌──────────────────────────────────────────────────────┐
│                 SERVER AT TABLE 5                    │
│              (4 guests seated)                       │
└─────────────────────┬────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Tap "Table 5" on app  │
         └────────────┬────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   SeatSelectionModal   │
         │   Opens (capacity: 4)  │
         │                        │
         │   [Seat 1] [Seat 2]    │
         │   [Seat 3] [Seat 4]    │
         └────────────┬────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Server taps "Seat 1"  │
         └────────────┬────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │"Start Voice Order" btn │
         └────────────┬────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Voice Order UI opens  │
         │  (VoiceOrderWebRTC)    │
         └────────────┬────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   Server speaks order  │
         │   "Burger, fries, Coke"│
         └────────────┬────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Order parsed & sent   │
         │  to kitchen            │
         └────────────┬────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Success confirmation  │
         └────────────┬────────────┘
                      │
                      ▼
            ❓ NOW WHAT? ❓

         ❌ Modal doesn't reappear
         ❌ No prompt for Seat 2
         ❌ Server must manually:
            1. Navigate back to table list
            2. Tap "Table 5" again
            3. Select "Seat 2"
            4. Start voice order
            5. Repeat for Seats 3 & 4

         🚨 BROKEN WORKFLOW 🚨
```

### Recommended System Flow (To-Be)

```
┌──────────────────────────────────────────────────────┐
│                 SERVER AT TABLE 5                    │
│              (4 guests seated)                       │
└─────────────────────┬────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Tap "Table 5" on app  │
         └────────────┬────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   SeatSelectionModal   │
         │   Opens (capacity: 4)  │
         │                        │
         │   [Seat 1] [Seat 2]    │
         │   [Seat 3] [Seat 4]    │
         │                        │
         │   Currently ordering:  │
         │   👤 None selected     │
         └────────────┬────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Server taps "Seat 1"  │
         └────────────┬────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Voice Order UI opens  │
         │  🪑 Ordering for Seat 1│
         └────────────┬────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   Server speaks order  │
         │   "Burger, fries, Coke"│
         └────────────┬────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Order parsed & sent   │
         │  ✅ Seat 1 complete    │
         └────────────┬────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   🎉 Success! Now:     │
         │                        │
         │  ┌──────────────────┐  │
         │  │ 🪑 Add Next Seat │  │ ← NEW!
         │  └──────────────────┘  │
         │  ┌──────────────────┐  │
         │  │ ✅ Finish Table  │  │ ← NEW!
         │  └──────────────────┘  │
         └────────────┬────────────┘
                      │
           ┌──────────┴──────────┐
           │                     │
    "Next Seat"           "Finish Table"
           │                     │
           ▼                     │
┌──────────────────────┐         │
│  Return to           │         │
│  SeatSelectionModal  │         │
│                      │         │
│  [✅Seat 1][Seat 2]  │ ← Seat 1 marked!
│  [Seat 3] [Seat 4]   │         │
│                      │         │
│  Select next seat... │         │
└──────────┬───────────┘         │
           │                     │
           ▼                     │
  Server taps "Seat 2"           │
           │                     │
      [Repeat for                │
       Seats 3 & 4]              │
           │                     │
           │                     │
           └─────────────────────┤
                                 ▼
                    ┌─────────────────────┐
                    │  All seats ordered! │
                    │  Send to kitchen    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Kitchen receives:  │
                    │                     │
                    │  Table 5, Seat 1:   │
                    │   - Burger          │
                    │   - Fries           │
                    │   - Coke            │
                    │                     │
                    │  Table 5, Seat 2:   │
                    │   - Salad           │
                    │   - Water           │
                    │  ... etc            │
                    └─────────────────────┘

✅ COMPLETE WORKFLOW ✅
```

### Payment Workflow (To-Be)

```
┌───────────────────────────────────────┐
│  GUESTS AT TABLE 5 READY TO PAY      │
└─────────────────┬─────────────────────┘
                  │
                  ▼
       ┌────────────────────┐
       │ Server opens app   │
       │ Navigates to       │
       │ "Close Check"      │
       └──────────┬─────────┘
                  │
                  ▼
       ┌────────────────────────────┐
       │   CHECK SUMMARY SCREEN     │
       │                            │
       │   Table 5                  │
       │   ───────────────────────  │
       │   Subtotal:    $45.00      │
       │   Tax (8%):     $3.60      │
       │   ───────────────────────  │
       │   Total:       $48.60      │
       │                            │
       │   Items: 4                 │
       │   Seats ordered: 4         │
       │                            │
       │   ┌─────────────────────┐  │
       │   │   Close Check       │  │
       │   └─────────────────────┘  │
       └─────────────┬──────────────┘
                     │
                     ▼
       ┌────────────────────────────┐
       │  TENDER SELECTION          │
       │                            │
       │  ┌──────────────────────┐  │
       │  │   💳 Card Payment    │  │
       │  │   $48.60             │  │
       │  └──────────────────────┘  │
       │                            │
       │  ┌──────────────────────┐  │
       │  │   💵 Cash Payment    │  │
       │  │   $48.60             │  │
       │  └──────────────────────┘  │
       │                            │
       │  ┌──────────────────────┐  │
       │  │   🔀 Split Check     │  │
       │  │   (by seat/item)     │  │
       │  └──────────────────────┘  │
       └──────────┬──────┬──────────┘
                  │      │
          CARD ◄──┘      └──► CASH
                  │            │
                  ▼            ▼
       ┌─────────────────┐  ┌──────────────────┐
       │  CARD PAYMENT   │  │  CASH PAYMENT    │
       │                 │  │                  │
       │  Present card   │  │  Amount Due:     │
       │  to Square      │  │  $48.60          │
       │  Terminal or    │  │                  │
       │  enter details  │  │  Amount Received:│
       │                 │  │  [____$__.__]    │
       │  ┌───────────┐  │  │                  │
       │  │Processing │  │  │  ┌─────┐ ┌─────┐│
       │  │    ...    │  │  │  │ $20 │ │ $50 ││← Fast cash
       │  └───────────┘  │  │  └─────┘ └─────┘│
       │                 │  │  ┌─────┐         │
       │  Tip:           │  │  │$100 │         │
       │  ⚪ 15% ($7.29)  │  │  └─────┘         │
       │  ⚪ 18% ($8.75)  │  │                  │
       │  ⚪ 20% ($9.72)  │  │  Change:         │
       │  ⚪ Custom       │  │  $51.40          │
       │                 │  │                  │
       │  ┌───────────┐  │  │  ┌────────────┐ │
       │  │  Submit   │  │  │  │  Complete  │ │
       │  └───────────┘  │  │  └────────────┘ │
       └────────┬────────┘  └────────┬─────────┘
                │                    │
                └──────────┬─────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │   ✅ PAYMENT SUCCESS    │
              │                         │
              │   Payment ID: abc123    │
              │   Amount: $48.60        │
              │   Method: Card/Cash     │
              │                         │
              │   Receipt Options:      │
              │   ⚪ Print               │
              │   ⚪ Email               │
              │   ⚪ Text                │
              │   ⚪ No receipt          │
              │                         │
              │   ┌─────────────────┐   │
              │   │      Done       │   │
              │   └─────────────────┘   │
              └────────────┬────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │   TABLE STATUS UPDATE   │
              │                         │
              │   Table 5:              │
              │   "occupied" → "paid"   │
              │                         │
              │   After 2 min:          │
              │   "paid" → "cleaning"   │
              │                         │
              │   (Manual or auto)      │
              │   "cleaning" →          │
              │   "available"           │
              └─────────────────────────┘

✅ COMPLETE PAYMENT WORKFLOW ✅
```

### Table Status State Machine

```
                    ┌─────────────┐
             ┌──────┤  Available  ├──────┐
             │      └─────────────┘      │
             │              ▲            │
             │              │            │
  Host seats │              │ Manual     │ Reservation
  party      │              │ reset by   │ made
             │              │ staff      │
             ▼              │            ▼
      ┌─────────────┐       │      ┌──────────┐
      │   Seated    │       │      │ Reserved │
      └──────┬──────┘       │      └────┬─────┘
             │              │           │
  Server     │              │           │ Guests
  opens      │              │           │ arrive
  check      │              │           │
             ▼              │           │
      ┌─────────────┐       │           │
  ┌───┤  Occupied   ├───────┘           │
  │   └──────┬──────┘                   │
  │          │                          │
  │          │ Order sent               │
  │          │ to kitchen               │
  │          ▼                          │
  │   ┌──────────────┐                 │
  │   │ In Service   │◄────────────────┘
  │   └──────┬───────┘
  │          │
  │          │ Payment
  │          │ completed
  │          ▼
  │   ┌─────────────┐
  │   │    Paid     │
  │   └──────┬──────┘
  │          │
  │          │ Guests leave
  │          │ or auto after
  │          │ 2-5 minutes
  │          ▼
  │   ┌─────────────┐
  │   │  Cleaning   │
  │   └──────┬──────┘
  │          │
  │          │ Bus staff
  │          │ marks clean
  │          │
  └──────────┘

States:
  🟢 Available  - Ready for guests
  🟡 Reserved   - Booked, not yet arrived
  🟡 Seated     - Party seated, waiting for server
  🔴 Occupied   - Active order
  🟠 In Service - Food being prepared/served
  🟣 Paid       - Check closed, guests still present
  🟤 Cleaning   - Being reset
```

---

## Implementation Recommendations

### Phase 1: Sequential Seat Ordering (P0)

**Goal:** Enable continuous seat-to-seat ordering workflow

#### Database Changes

**Option A: Store seat in Order**
```sql
ALTER TABLE orders ADD COLUMN seat_number INTEGER;
CREATE INDEX idx_orders_table_seat ON orders(table_number, seat_number);
```

**Option B: Store seat in OrderItem** (More flexible for shared items)
```sql
ALTER TABLE order_items ADD COLUMN seat_number INTEGER;
CREATE INDEX idx_order_items_seat ON order_items(order_id, seat_number);
```

**Recommendation:** Use Option A (seat per order) initially for simplicity. This matches the industry pattern where orders are taken seat-by-seat, not item-by-item.

#### Frontend Changes

**1. Update SeatSelectionModal.tsx**

Add state tracking and new buttons:

```tsx
interface SeatSelectionModalProps {
  show: boolean
  table: Table | null
  selectedSeat: number | null
  orderedSeats: number[]  // NEW: Track which seats already ordered
  onSeatSelect: (seat: number) => void
  onStartVoiceOrder: () => void
  onFinishTable: () => void  // NEW
  onClose: () => void
}

export function SeatSelectionModal({
  show,
  table,
  selectedSeat,
  orderedSeats,  // NEW
  onSeatSelect,
  onStartVoiceOrder,
  onFinishTable,  // NEW
  onClose
}: SeatSelectionModalProps) {
  // ... existing code ...

  return (
    <Card>
      {/* Seat grid with visual indicators */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {seats.map((seat) => (
          <button
            key={seat}
            onClick={() => onSeatSelect(seat)}
            className={`
              ${orderedSeats.includes(seat)
                ? 'border-green-500 bg-green-100'  // ✅ Already ordered
                : 'border-neutral-200'
              }
              ${selectedSeat === seat
                ? 'border-primary bg-primary/10'  // 🎯 Currently selected
                : ''
              }
            `}
          >
            <Users className="h-6 w-6 mx-auto mb-2" />
            <span>Seat {seat}</span>
            {orderedSeats.includes(seat) && <Check className="h-4 w-4" />}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button onClick={onClose} variant="outline">
          Cancel
        </Button>
        {orderedSeats.length > 0 && (  // NEW
          <Button onClick={onFinishTable} variant="success">
            ✅ Finish Table
          </Button>
        )}
        <Button
          onClick={onStartVoiceOrder}
          disabled={!selectedSeat}
        >
          Start Voice Order
        </Button>
      </div>
    </Card>
  )
}
```

**2. Update useVoiceOrderWebRTC Hook**

Add seat tracking and post-order prompt:

```typescript
export function useVoiceOrderWebRTC() {
  const [orderedSeats, setOrderedSeats] = useState<number[]>([])
  const [showSeatSelector, setShowSeatSelector] = useState(false)
  const [currentTable, setCurrentTable] = useState<Table | null>(null)

  const handleOrderSuccess = useCallback((orderId: string) => {
    // Mark current seat as ordered
    setOrderedSeats(prev => [...prev, currentSeat])

    // Show prompt: "Add Next Seat" or "Finish Table"
    setShowPostOrderPrompt(true)
  }, [currentSeat])

  const handleAddNextSeat = useCallback(() => {
    setShowPostOrderPrompt(false)
    setShowSeatSelector(true)  // Reopen seat selector
  }, [])

  const handleFinishTable = useCallback(async () => {
    // Send all orders to kitchen
    await sendTableOrdersToKitchen(currentTable, orderedSeats)

    // Show success
    toast.success(`Table ${currentTable.table_number} order complete!`)

    // Reset state
    setOrderedSeats([])
    setShowSeatSelector(false)
    setShowPostOrderPrompt(false)
  }, [currentTable, orderedSeats])

  return {
    orderedSeats,
    showSeatSelector,
    handleAddNextSeat,
    handleFinishTable,
    // ... other exports
  }
}
```

**3. Create PostOrderPrompt Component**

New modal that appears after each seat's order:

```tsx
export function PostOrderPrompt({
  show,
  tableName,
  completedSeat,
  totalSeats,
  orderedSeatsCount,
  onAddNextSeat,
  onFinishTable,
}: {
  show: boolean
  tableName: string
  completedSeat: number
  totalSeats: number
  orderedSeatsCount: number
  onAddNextSeat: () => void
  onFinishTable: () => void
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center">
          <Card className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />

            <h2 className="text-2xl font-bold mb-2">
              Seat {completedSeat} Order Placed!
            </h2>

            <p className="text-neutral-600 mb-6">
              {tableName} - {orderedSeatsCount} of {totalSeats} seats ordered
            </p>

            <div className="flex gap-4">
              <Button
                onClick={onAddNextSeat}
                size="lg"
                className="flex-1"
              >
                🪑 Add Next Seat
              </Button>

              <Button
                onClick={onFinishTable}
                size="lg"
                variant="success"
                className="flex-1"
              >
                ✅ Finish Table
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

#### Backend Changes

**Update Order Creation API**

```typescript
// server/src/routes/orders.routes.ts

interface CreateOrderBody {
  items: OrderItem[];
  type: OrderType;
  customerName?: string;
  tableNumber?: string;
  seatNumber?: number;  // NEW
  notes?: string;
}

router.post('/create', async (req, res) => {
  const { tableNumber, seatNumber, ...orderData } = req.body;

  // Validate seat number if table provided
  if (tableNumber && seatNumber) {
    const table = await getTable(tableNumber);
    if (seatNumber > table.capacity) {
      return res.status(400).json({
        error: `Seat ${seatNumber} exceeds table capacity (${table.capacity})`
      });
    }
  }

  // Create order with seat number
  const order = await OrdersService.createOrder({
    ...orderData,
    tableNumber,
    seatNumber,  // NEW
    restaurantId: req.restaurantId
  });

  res.json(order);
});
```

**Update Order Schema Validation**

```typescript
// server/src/models/order.model.ts

export const orderSchemas = {
  create: Joi.object({
    items: Joi.array().min(1).required(),
    type: Joi.string().valid('kiosk', 'drive-thru', 'online', 'voice').default('kiosk'),
    customerName: Joi.string().max(100).optional(),
    tableNumber: Joi.string().max(20).optional(),
    seatNumber: Joi.number().integer().min(1).optional(),  // NEW
    notes: Joi.string().max(500).optional(),
  }),
};
```

#### Testing Checklist

- [ ] Server can select Seat 1, place order
- [ ] After order completes, "Add Next Seat" and "Finish Table" buttons appear
- [ ] Tapping "Add Next Seat" reopens seat selector with Seat 1 marked ✅
- [ ] Server can select Seat 2, place order
- [ ] After all seats ordered, "Finish Table" sends orders to kitchen
- [ ] Kitchen display shows: "Table 5, Seat 1: ...", "Table 5, Seat 2: ..."
- [ ] Seat numbers appear on order cards in KDS
- [ ] Edge case: Server can tap "Finish Table" without ordering all seats
- [ ] Edge case: Server can re-order for same seat (adds another order)

**Estimated Effort:** 2-3 days

---

### Phase 2: Payment & Check Closing (P0)

**Goal:** Enable servers to close checks with Cash or Card payment

#### Database Changes

Add payment tracking to orders:

```sql
ALTER TABLE orders
  ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'refunded')),
  ADD COLUMN payment_method VARCHAR(20)
    CHECK (payment_method IN ('cash', 'card', 'house_account', 'gift_card', 'other')),
  ADD COLUMN payment_amount DECIMAL(10,2),
  ADD COLUMN cash_received DECIMAL(10,2),
  ADD COLUMN change_given DECIMAL(10,2),
  ADD COLUMN check_closed_at TIMESTAMP,
  ADD COLUMN closed_by_user_id UUID REFERENCES users(id);

CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_check_closed ON orders(check_closed_at);
```

#### Backend Changes

**1. Add Cash Payment Endpoint**

```typescript
// server/src/routes/payments.routes.ts

router.post('/cash',
  authenticate,
  validateRestaurantAccess,
  requireScopes(ApiScope.PAYMENTS_PROCESS),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { order_id, amount_received, table_id } = req.body;
      const restaurantId = req.restaurantId!;

      // Get order and validate amount
      const order = await OrdersService.getOrder(restaurantId, order_id);
      const total = calculateOrderTotal(order);

      if (amount_received < total) {
        return res.status(400).json({
          error: 'Insufficient payment',
          required: total,
          received: amount_received
        });
      }

      const change = amount_received - total;

      // Update order
      await OrdersService.updateOrderPayment(
        restaurantId,
        order_id,
        'paid',
        'cash',
        null, // no payment ID for cash
        {
          cash_received: amount_received,
          change_given: change
        }
      );

      // Update table status if provided
      if (table_id) {
        await updateTableStatus(table_id, 'paid');
      }

      // Log for audit
      await PaymentService.logPaymentAttempt({
        orderId: order_id,
        amount: total,
        status: 'success',
        restaurantId,
        paymentMethod: 'cash',
        userId: req.user?.id,
        metadata: {
          cashReceived: amount_received,
          changeGiven: change
        }
      });

      res.json({
        success: true,
        order: await OrdersService.getOrder(restaurantId, order_id),
        change
      });

    } catch (error) {
      next(error);
    }
  }
);
```

**2. Update OrdersService**

```typescript
// server/src/services/orders.service.ts

export class OrdersService {
  static async updateOrderPayment(
    restaurantId: string,
    orderId: string,
    paymentStatus: 'paid' | 'failed' | 'refunded',
    paymentMethod: string,
    paymentId?: string,
    additionalData?: Record<string, any>
  ) {
    const { data, error } = await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        payment_id: paymentId,
        check_closed_at: new Date().toISOString(),
        ...additionalData
      })
      .eq('id', orderId)
      .eq('restaurant_id', restaurantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
```

#### Frontend Changes

**1. Create CheckClosingScreen Component**

New full-screen checkout experience:

```tsx
// client/src/pages/CheckClosingScreen.tsx

export function CheckClosingScreen({
  tableId,
  orders,
  onClose,
}: {
  tableId: string
  orders: Order[]
  onClose: () => void
}) {
  const [step, setStep] = useState<'summary' | 'tender' | 'cash' | 'card'>('summary')

  const subtotal = orders.reduce((sum, order) =>
    sum + order.items.reduce((s, item) => s + item.price * item.quantity, 0), 0
  )
  const tax = subtotal * 0.08
  const total = subtotal + tax

  return (
    <div className="fixed inset-0 bg-white z-50">
      {step === 'summary' && (
        <CheckSummary
          table={tableId}
          orders={orders}
          subtotal={subtotal}
          tax={tax}
          total={total}
          onNext={() => setStep('tender')}
          onClose={onClose}
        />
      )}

      {step === 'tender' && (
        <TenderSelection
          total={total}
          onSelectCard={() => setStep('card')}
          onSelectCash={() => setStep('cash')}
          onBack={() => setStep('summary')}
        />
      )}

      {step === 'cash' && (
        <CashPayment
          total={total}
          orders={orders}
          tableId={tableId}
          onComplete={onClose}
          onBack={() => setStep('tender')}
        />
      )}

      {step === 'card' && (
        <CardPayment
          total={total}
          orders={orders}
          tableId={tableId}
          onComplete={onClose}
          onBack={() => setStep('tender')}
        />
      )}
    </div>
  )
}
```

**2. TenderSelection Component**

Large, touch-friendly payment method selector:

```tsx
function TenderSelection({
  total,
  onSelectCard,
  onSelectCash,
  onBack,
}: {
  total: number
  onSelectCard: () => void
  onSelectCash: () => void
  onBack: () => void
}) {
  return (
    <div className="p-8">
      <button onClick={onBack} className="mb-4">
        ← Back
      </button>

      <h1 className="text-3xl font-bold mb-2">Select Payment Method</h1>
      <p className="text-4xl font-bold text-green-600 mb-8">
        ${total.toFixed(2)}
      </p>

      <div className="grid gap-4 max-w-2xl mx-auto">
        <button
          onClick={onSelectCard}
          className="flex items-center gap-4 p-8 border-2 rounded-xl hover:border-blue-500 transition-all"
        >
          <CreditCard className="w-16 h-16" />
          <div className="text-left">
            <div className="text-2xl font-bold">Card Payment</div>
            <div className="text-neutral-600">Credit or Debit Card</div>
          </div>
        </button>

        <button
          onClick={onSelectCash}
          className="flex items-center gap-4 p-8 border-2 rounded-xl hover:border-green-500 transition-all"
        >
          <DollarSign className="w-16 h-16" />
          <div className="text-left">
            <div className="text-2xl font-bold">Cash Payment</div>
            <div className="text-neutral-600">Cash payment with change</div>
          </div>
        </button>
      </div>
    </div>
  )
}
```

**3. CashPayment Component**

Cash entry with fast buttons and change calculation:

```tsx
function CashPayment({
  total,
  orders,
  tableId,
  onComplete,
  onBack,
}: {
  total: number
  orders: Order[]
  tableId: string
  onComplete: () => void
  onBack: () => void
}) {
  const [amountReceived, setAmountReceived] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const change = amountReceived - total
  const isValid = amountReceived >= total

  const handleFastCash = (amount: number) => {
    setAmountReceived(amount)
  }

  const handleComplete = async () => {
    setIsProcessing(true)

    try {
      // Process cash payment for each order
      for (const order of orders) {
        await api.post('/payments/cash', {
          order_id: order.id,
          amount_received: amountReceived,
          table_id: tableId
        })
      }

      // Update table status
      await api.patch(`/tables/${tableId}/status`, {
        status: 'paid'
      })

      toast.success(`Payment complete! Change: $${change.toFixed(2)}`)
      onComplete()

    } catch (error) {
      toast.error('Payment failed')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="p-8">
      <button onClick={onBack}>← Back</button>

      <h1 className="text-3xl font-bold mb-8">Cash Payment</h1>

      <div className="max-w-2xl mx-auto">
        {/* Amount due */}
        <div className="bg-blue-50 p-6 rounded-xl mb-6">
          <div className="text-neutral-600">Amount Due</div>
          <div className="text-4xl font-bold">${total.toFixed(2)}</div>
        </div>

        {/* Fast cash buttons */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => handleFastCash(20)}
            className="p-6 border-2 rounded-xl text-2xl font-bold hover:border-green-500"
          >
            $20
          </button>
          <button
            onClick={() => handleFastCash(50)}
            className="p-6 border-2 rounded-xl text-2xl font-bold hover:border-green-500"
          >
            $50
          </button>
          <button
            onClick={() => handleFastCash(100)}
            className="p-6 border-2 rounded-xl text-2xl font-bold hover:border-green-500"
          >
            $100
          </button>
        </div>

        {/* Custom amount input */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Or enter custom amount
          </label>
          <input
            type="number"
            step="0.01"
            value={amountReceived || ''}
            onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
            className="w-full text-3xl p-4 border-2 rounded-xl"
            placeholder="0.00"
          />
        </div>

        {/* Change display */}
        {amountReceived > 0 && (
          <div className={`p-6 rounded-xl mb-6 ${
            isValid ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <div className="text-neutral-600">Change</div>
            <div className={`text-4xl font-bold ${
              isValid ? 'text-green-600' : 'text-red-600'
            }`}>
              {isValid ? `$${change.toFixed(2)}` : 'Insufficient'}
            </div>
          </div>
        )}

        {/* Complete button */}
        <button
          onClick={handleComplete}
          disabled={!isValid || isProcessing}
          className="w-full p-6 bg-green-600 text-white rounded-xl text-2xl font-bold disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : 'Complete Payment'}
        </button>
      </div>
    </div>
  )
}
```

**4. CardPayment Component**

Square Web SDK integration:

```tsx
function CardPayment({
  total,
  orders,
  tableId,
  onComplete,
  onBack,
}: {
  total: number
  orders: Order[]
  tableId: string
  onComplete: () => void
  onBack: () => void
}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [cardToken, setCardToken] = useState<string | null>(null)

  // Initialize Square Web SDK
  useEffect(() => {
    // Load Square SDK and initialize card form
    // (Use existing Square integration from payments.routes.ts)
  }, [])

  const handlePayment = async () => {
    if (!cardToken) return

    setIsProcessing(true)

    try {
      // Process card payment for each order
      for (const order of orders) {
        await api.post('/payments/create', {
          order_id: order.id,
          token: cardToken,
          amount: total
        })
      }

      // Update table status
      await api.patch(`/tables/${tableId}/status`, {
        status: 'paid'
      })

      toast.success('Payment successful!')
      onComplete()

    } catch (error) {
      toast.error('Payment failed')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="p-8">
      <button onClick={onBack}>← Back</button>

      <h1 className="text-3xl font-bold mb-8">Card Payment</h1>

      <div className="max-w-2xl mx-auto">
        {/* Amount due */}
        <div className="bg-blue-50 p-6 rounded-xl mb-6">
          <div className="text-neutral-600">Amount Due</div>
          <div className="text-4xl font-bold">${total.toFixed(2)}</div>
        </div>

        {/* Square card form */}
        <div id="card-form" className="mb-6">
          {/* Square SDK renders form here */}
        </div>

        {/* Process button */}
        <button
          onClick={handlePayment}
          disabled={!cardToken || isProcessing}
          className="w-full p-6 bg-blue-600 text-white rounded-xl text-2xl font-bold disabled:opacity-50"
        >
          {isProcessing ? 'Processing...' : 'Process Payment'}
        </button>
      </div>
    </div>
  )
}
```

#### Testing Checklist

- [ ] Server can access check closing screen from table view
- [ ] Summary shows correct subtotal, tax, total for all orders at table
- [ ] Tender selection shows Cash and Card options
- [ ] Cash payment: Fast cash buttons ($20, $50, $100) work
- [ ] Cash payment: Custom amount input works
- [ ] Cash payment: Change calculates correctly
- [ ] Cash payment: Cannot submit if insufficient amount
- [ ] Cash payment: Success updates order payment_status to 'paid'
- [ ] Cash payment: Success updates table status to 'paid'
- [ ] Card payment: Square SDK loads correctly
- [ ] Card payment: Test card processes successfully
- [ ] Card payment: Success updates order and table status
- [ ] Error handling: Network failures show appropriate messages
- [ ] Audit log: All payments logged with user ID and timestamp

**Estimated Effort:** 2-3 days

---

### Phase 3: Table Status Automation (P1)

**Goal:** Auto-update table status through payment lifecycle

#### Backend Changes

**1. Add Table Status Webhook Handler**

```typescript
// server/src/services/table.service.ts

export class TableService {
  static async updateStatusAfterPayment(
    tableId: string,
    restaurantId: string
  ): Promise<void> {
    // Check if all orders for table are paid
    const { data: orders } = await supabase
      .from('orders')
      .select('payment_status')
      .eq('table_id', tableId)
      .eq('restaurant_id', restaurantId)
      .neq('status', 'cancelled');

    const allPaid = orders?.every(o => o.payment_status === 'paid');

    if (allPaid) {
      await this.updateTableStatus(tableId, restaurantId, 'paid');

      // Schedule auto-transition to "cleaning" after 2 minutes
      setTimeout(async () => {
        await this.updateTableStatus(tableId, restaurantId, 'cleaning');
      }, 2 * 60 * 1000);
    }
  }

  static async updateTableStatus(
    tableId: string,
    restaurantId: string,
    status: TableStatus
  ): Promise<void> {
    const { error } = await supabase
      .from('tables')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId);

    if (error) throw error;

    // Emit real-time event for floor plan updates
    await supabase
      .channel(`restaurant:${restaurantId}`)
      .send({
        type: 'broadcast',
        event: 'table_status_changed',
        payload: { tableId, status }
      });
  }
}
```

**2. Integrate with Payment Routes**

```typescript
// server/src/routes/payments.routes.ts

// After successful payment (both cash and card)
await TableService.updateStatusAfterPayment(
  table_id,
  restaurantId
);
```

#### Frontend Changes

**1. Add Real-Time Table Status Subscription**

```typescript
// client/src/hooks/useTableStatus.ts

export function useTableStatus(restaurantId: string) {
  const [tables, setTables] = useState<Table[]>([])

  useEffect(() => {
    // Subscribe to table status changes
    const channel = supabase
      .channel(`restaurant:${restaurantId}`)
      .on('broadcast', { event: 'table_status_changed' }, (payload) => {
        setTables(prev => prev.map(table =>
          table.id === payload.tableId
            ? { ...table, status: payload.status }
            : table
        ))
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [restaurantId])

  return tables
}
```

**2. Visual Table Status Indicators**

Update floor plan to show status colors:

```tsx
// client/src/components/floor-plan/TableShape.tsx

const statusColors = {
  available: 'bg-green-100 border-green-500',
  seated: 'bg-yellow-100 border-yellow-500',
  occupied: 'bg-red-100 border-red-500',
  paid: 'bg-purple-100 border-purple-500',
  cleaning: 'bg-gray-100 border-gray-500',
  reserved: 'bg-blue-100 border-blue-500',
}

export function TableShape({ table }: { table: Table }) {
  return (
    <div className={`
      table-shape
      ${statusColors[table.status]}
      transition-colors duration-300
    `}>
      <span>{table.label}</span>
      <StatusBadge status={table.status} />
    </div>
  )
}
```

#### Testing Checklist

- [ ] After payment, table status auto-updates to 'paid'
- [ ] Floor plan shows table in purple (paid state)
- [ ] After 2 minutes, table auto-transitions to 'cleaning'
- [ ] Staff can manually mark table as 'available' from 'cleaning'
- [ ] Real-time updates work across multiple devices
- [ ] Edge case: Partial payment doesn't trigger status change
- [ ] Edge case: Last order payment triggers status change

**Estimated Effort:** 1 day

---

### Phase 4: Split Check by Seat (P2)

**Goal:** Allow servers to split table check into per-seat checks

#### Database Changes

Add check splitting support:

```sql
ALTER TABLE orders
  ADD COLUMN parent_check_id UUID REFERENCES orders(id),
  ADD COLUMN is_split_check BOOLEAN DEFAULT false,
  ADD COLUMN split_number INTEGER;

CREATE INDEX idx_orders_parent_check ON orders(parent_check_id);
```

#### Backend API

```typescript
// server/src/routes/orders.routes.ts

router.post('/split-by-seat',
  authenticate,
  validateRestaurantAccess,
  async (req: AuthenticatedRequest, res) => {
    const { table_id, restaurant_id } = req.body;

    // Get all orders for table
    const orders = await OrdersService.getOrdersForTable(table_id, restaurant_id);

    // Group by seat number
    const seatGroups = groupBy(orders, 'seat_number');

    // Create new check for each seat
    const splitChecks = await Promise.all(
      Object.entries(seatGroups).map(async ([seatNum, seatOrders]) => {
        return await OrdersService.createSplitCheck({
          originalOrders: seatOrders,
          seatNumber: parseInt(seatNum),
          tableId: table_id,
          restaurantId: restaurant_id
        });
      })
    );

    res.json({
      success: true,
      checks: splitChecks
    });
  }
);
```

#### Frontend UI

```tsx
// client/src/components/payments/SplitCheckModal.tsx

export function SplitCheckModal({
  table,
  orders,
  onComplete,
}: {
  table: Table
  orders: Order[]
  onComplete: () => void
}) {
  const seatGroups = groupBy(orders, 'seat_number')

  return (
    <div>
      <h2>Split Check - {table.label}</h2>

      <div className="grid gap-4">
        {Object.entries(seatGroups).map(([seatNum, seatOrders]) => (
          <div key={seatNum} className="border rounded p-4">
            <h3>Seat {seatNum}</h3>
            <ul>
              {seatOrders.map(order => (
                <li key={order.id}>
                  {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                </li>
              ))}
            </ul>
            <div className="font-bold">
              Total: ${calculateTotal(seatOrders)}
            </div>
            <button onClick={() => processPayment(seatOrders)}>
              Pay for Seat {seatNum}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Estimated Effort:** 5-7 days (complex feature)

---

## Technical Specifications

### API Endpoints Summary

#### New Endpoints Required

```typescript
// Cash Payment
POST /api/v1/payments/cash
Request: {
  order_id: string
  amount_received: number
  table_id?: string
}
Response: {
  success: boolean
  order: Order
  change: number
}

// Split Check
POST /api/v1/orders/split-by-seat
Request: {
  table_id: string
}
Response: {
  success: boolean
  checks: Order[]
}

// Table Status Update (existing, document usage)
PATCH /api/v1/tables/:id/status
Request: {
  status: TableStatus
  order_id?: string
}
Response: {
  success: boolean
  table: Table
}
```

### Database Migrations

```sql
-- Migration 001: Add seat_number to orders
ALTER TABLE orders ADD COLUMN seat_number INTEGER;
CREATE INDEX idx_orders_table_seat ON orders(table_number, seat_number);

-- Migration 002: Add payment fields
ALTER TABLE orders
  ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid',
  ADD COLUMN payment_method VARCHAR(20),
  ADD COLUMN payment_amount DECIMAL(10,2),
  ADD COLUMN cash_received DECIMAL(10,2),
  ADD COLUMN change_given DECIMAL(10,2),
  ADD COLUMN check_closed_at TIMESTAMP,
  ADD COLUMN closed_by_user_id UUID REFERENCES users(id);

CREATE INDEX idx_orders_payment_status ON orders(payment_status);

-- Migration 003: Add split check support
ALTER TABLE orders
  ADD COLUMN parent_check_id UUID REFERENCES orders(id),
  ADD COLUMN is_split_check BOOLEAN DEFAULT false,
  ADD COLUMN split_number INTEGER;

CREATE INDEX idx_orders_parent_check ON orders(parent_check_id);
```

### TypeScript Type Updates

```typescript
// shared/types/orders.ts

export interface Order {
  // ... existing fields
  seat_number?: number
  payment_status: 'unpaid' | 'paid' | 'failed' | 'refunded'
  payment_method?: 'cash' | 'card' | 'house_account' | 'gift_card'
  payment_amount?: number
  cash_received?: number
  change_given?: number
  check_closed_at?: string
  closed_by_user_id?: string
  parent_check_id?: string
  is_split_check?: boolean
  split_number?: number
}

// shared/types/table.types.ts

export type TableStatus =
  | 'available'
  | 'reserved'
  | 'seated'
  | 'occupied'
  | 'paid'
  | 'cleaning'
```

---

## Conclusion

This comprehensive analysis reveals that while your system has a solid foundation with Square payment integration and table management, it lacks the **sequential seat ordering workflow** and **integrated check closing UI** that are standard across all major POS systems.

### Immediate Action Items

**Week 1:**
1. Implement sequential seat ordering with "Next Seat" and "Finish Table" buttons
2. Add seat number tracking to orders database and display in kitchen

**Week 2:**
1. Build check closing UI with tender selection
2. Implement cash payment endpoint and workflow
3. Add table status automation

**Week 3:**
1. User acceptance testing with real servers
2. Refine UX based on feedback
3. Deploy to production

**Future Enhancements:**
- Split check functionality (Phase 4)
- Tip management for card payments
- Receipt printing/emailing
- Payment reporting and reconciliation

### Success Metrics

- **Order Efficiency**: Time to complete multi-seat table order < 2 minutes
- **Payment Speed**: Check closing time < 30 seconds
- **Table Turnover**: Faster table status updates → more accurate availability
- **Server Satisfaction**: Reduced friction in ordering/payment workflow

---

**END OF REPORT**

*For questions or clarifications, contact the development team.*
