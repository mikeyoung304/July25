# MVP - Minimal Viable Pages Plan

## Mission Statement
Strip every page down to its core function. If it doesn't directly support the page's primary purpose, remove it. The Dashboard is our touchstone of greatness - clean, purposeful, minimal.

## Guiding Principles
1. **Function over form** - Remove all decorative elements
2. **One navigation path** - Single "Back to Dashboard" component everywhere
3. **No redundancy** - If it exists elsewhere, don't duplicate it
4. **Zero animations** - Remove all motion/transitions
5. **Silent operation** - Remove all console logs and debug panels

## Instructions for AI Assistants
- **Update this file** as you complete each task
- Mark items with ✅ when complete
- Add the date and any notes about what was removed
- If you find additional bloat not listed, add it to the plan
- Test after each page cleanup to ensure core functionality remains

---

## Phase 1: Create Reusable Components
- ✅ Create `client/src/components/navigation/BackToDashboard.tsx` - 2025-08-21
  - Simple arrow icon + "Dashboard" text
  - No animations, minimal styling
  - Should work as drop-in replacement for all "Back to X" links

---

## Phase 2: Page-by-Page Cleanup

### KitchenDisplaySimple (`/kitchen`)
**Core Function**: Display orders and update their status

**Remove:**
- ✅ Restaurant name in header (line 209)
- ✅ Connection status indicators (lines 214-223)
- ✅ Refresh button (lines 225-232)
- ✅ Search functionality (lines 265-275)
- ✅ "All" filter button (lines 256-262)
- ✅ All logger statements (6 console.log removed)
- ✅ PageLayout wrapper replaced with simple div
- ✅ Toast notifications removed
- ✅ Sound effects removed
- ✅ Loading spinner animation removed
- ✅ Hover effects in OrderCard removed

**Keep:** Order cards, Active/Ready filters only, status update buttons

---

### CheckoutPage (`/checkout`)
**Core Function**: Complete payment for order

**Remove:**
- [ ] "Back to Menu" header link (lines 165-171)
- [ ] Shopping cart decorative icon in empty state (line 144)
- [ ] Replace with BackToDashboard component

**Keep:** Cart items, contact form, payment form, order summary

---

### ExpoPage (`/expo`)
**Core Function**: Coordinate orders between kitchen stations

**Remove:**
- [ ] All framer-motion animations
- [ ] Rush order functionality (lines 69-74)
- [ ] Recall order feature (lines 76-83)
- [ ] Show/hide completed toggle
- [ ] Decorative badges and icons
- [ ] Complex state management for priorities
- [ ] All logger statements

**Keep:** Order list, station assignments, complete button

---

### KioskPage (`/kiosk`)
**Core Function**: Voice ordering interface

**Remove:**
- [ ] Volume controls (lines 35, 55-58)
- [ ] Audio playback state management (lines 34, 49-58)
- [ ] View switcher (order/conversation/cart) (line 36)
- [ ] Conversation history display
- [ ] Audio service subscriptions
- [ ] All logger statements

**Keep:** Voice control component, current order display, checkout button

---

### DriveThruPage (`/drive-thru`)
**Core Function**: Drive-thru voice ordering

**Remove:**
- [ ] Order submission confirmation state (line 23)
- [ ] Full conversation history
- [ ] First press greeting logic (lines 40-49)
- [ ] Auto-scroll to conversation bottom
- [ ] All logger statements

**Keep:** Voice control, simple current order display, basic transcript

---

### AdminDashboard (`/admin`)
**Core Function**: Admin management tools

**Remove:**
- [ ] "Back to Home" button - replace with BackToDashboard
- [ ] Loading animation spinner (lines 38-40)
- [ ] Hover effects and transitions (lines 77-82)
- [ ] All logger.info statements
- [ ] Motion animations

**Keep:** Floor plan editor card, analytics card

---

### HomePage (`/`)
**Core Function**: Main navigation hub

**Remove:**
- [ ] All framer-motion animations (whileHover, whileTap)
- [ ] Decorative overlay effects (line 29)
- [ ] Staggered animation delays
- [ ] Scale transforms on hover

**Keep:** Simple navigation cards with direct links

---

### PerformanceDashboard (`/performance`)
**Core Function**: Display performance metrics

**Remove:**
- [ ] Excessive charts and visualizations
- [ ] Debug information
- [ ] Complex filtering options
- [ ] Animation effects

**Keep:** Essential metrics only

---

## Phase 3: Global Cleanup

### Remove Across All Files
- [ ] All `logger` import statements and usage
- [ ] All `console.log`, `console.warn`, `console.error` statements
- [ ] All `framer-motion` imports and animations where not essential
- [ ] All `data-testid` attributes unless critical for testing
- [ ] Unused imports after cleanup
- [ ] Shadow effects (`shadow-elevation-*`)
- [ ] Hover transitions
- [ ] Any commented-out code

### Standardize Navigation
- [ ] Replace all "Back to X" variations with BackToDashboard component
- [ ] Remove duplicate navigation options
- [ ] Ensure consistent placement (top-left corner)

---

## Phase 4: Testing & Validation

### After Each Page Cleanup
- [ ] Verify core functionality still works
- [ ] Check that page loads faster
- [ ] Ensure no console errors
- [ ] Test on mobile viewport
- [ ] Verify navigation to/from Dashboard

### Final Validation
- [ ] All pages follow minimal principle
- [ ] No duplicate navigation elements
- [ ] No decorative animations remain
- [ ] All debug/logging removed
- [ ] Build succeeds without warnings

---

## Progress Tracking

### Completed Pages

- ✅ KitchenDisplaySimple - 2025-08-21 - Removed ~100 lines of bloat
  - **Round 1**: Eliminated 6 console.log statements
  - Removed connection status UI, refresh button, search functionality
  - Stripped out toast notifications and sound effects
  - Simplified from PageLayout wrapper to minimal div structure
  - Removed hover animations from OrderCard component
  - **Round 2**: Further refinements
  - Fixed BackToDashboard placement (now actually used)
  - Removed redundant "Kitchen Display" header text
  - Simplified to single "Complete Order" button (removed Start Preparing)
  - Reduced padding/margins for tighter layout
  - **Round 3**: Complete navigation isolation
  - Removed entire top navigation menu bar from kitchen page
  - Made kitchen display truly standalone (only BackToDashboard link remains)
  - Added /kitchen to customer-facing pages list in AppContent.tsx
  - **Round 4**: Dashboard-style redesign (KitchenDisplayMinimal.tsx)
  - Replaced small buttons with large card-style filter selectors
  - Matched Dashboard's gray/white color palette
  - Added icon indicators (AlertCircle, CheckCircle) like Dashboard
  - Simplified order cards to minimal white boxes with gray accents
  - Removed all color except subtle urgency borders
  - Created unified design language across the app

### Pending Pages
- ✅ KitchenDisplaySimple - 2025-08-21
- [ ] CheckoutPage
- [ ] ExpoPage
- [ ] KioskPage
- [ ] DriveThruPage
- [ ] AdminDashboard
- [ ] HomePage
- [ ] PerformanceDashboard

---

## Notes for Future AIs

1. **Start with KitchenDisplaySimple** - It has the most bloat
2. **Test after each removal** - Don't break core functionality
3. **Update this file** - Mark your progress
4. **Be ruthless** - If in doubt, remove it
5. **Match the Dashboard** - It's our gold standard of minimalism

## Success Metrics
- Pages load 50% faster
- Code reduced by 30-40%
- Zero console output in production
- Every element serves a purpose
- Navigation is consistent and minimal

---

_Last Updated: 2025-08-21_
_Status: Kitchen Page Complete - Continuing Implementation_