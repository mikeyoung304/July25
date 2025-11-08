# Server Touch + Voice Ordering E2E Tests

## Overview

Comprehensive end-to-end test suite for the new server touch+voice ordering functionality using Playwright.

**Test File:** `/Users/mikeyoung/CODING/rebuild-6.0/tests/e2e/server-touch-voice-ordering.spec.ts`

## Features Tested

### Voice Mode Tests (7 tests)
- ✅ Default to voice mode on order open
- ✅ Microphone button visibility
- ✅ Current transcript display during speech
- ✅ Adding items via voice
- ✅ Voice badge on voice-added items
- ✅ Processing state during voice recognition

### Touch Mode Tests (7 tests)
- ✅ Switch to touch mode and display menu grid
- ✅ Display menu items in grid layout
- ✅ Open ItemDetailModal on menu item click
- ✅ Select modifiers in ItemDetailModal
- ✅ Adjust quantity in ItemDetailModal
- ✅ Add item to order from modal
- ✅ Touch badge on touch-added items

### Cross-Mode Tests (3 tests)
- ✅ Switch between modes multiple times
- ✅ Preserve order items when switching modes
- ✅ Create mixed order with voice and touch items

### Order Review & Editing Tests (10 tests)
- ✅ Display inline quantity adjuster (+/-)
- ✅ Increase item quantity
- ✅ Decrease item quantity
- ✅ Edit button for items with menuItemId
- ✅ Remove button for all items
- ✅ Confirmation dialog on remove
- ✅ Order notes field display
- ✅ Character limit enforcement (500 chars)
- ✅ Source badges (voice/touch) display

### Order Submission Tests (6 tests)
- ✅ Disable submit when no items
- ✅ Enable submit when items added
- ✅ Display item count on button
- ✅ Display total price on button
- ✅ Loading state during submission
- ✅ Success state after submission

### Responsive Layout Tests (3 tests)
- ✅ Desktop layout (side-by-side panels)
- ✅ Mobile layout (stacked panels)
- ✅ Tablet viewport usability

### Integration Tests (1 test)
- ✅ Complete flow: voice item + touch item + notes + submit

## Test Statistics

- **Total Tests:** 37
- **Test Suites:** 7
- **Lines of Code:** ~1,100
- **Coverage Areas:** Voice ordering, touch ordering, mode switching, order management, responsive design

## Running the Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure dev server can be started
npm run dev
```

### Run All Tests

```bash
# Run all server touch+voice ordering tests
npx playwright test server-touch-voice-ordering.spec.ts

# Run with UI mode for debugging
npx playwright test server-touch-voice-ordering.spec.ts --ui

# Run in headed mode (see browser)
npx playwright test server-touch-voice-ordering.spec.ts --headed

# Run specific browser
npx playwright test server-touch-voice-ordering.spec.ts --project=chromium
```

### Run Specific Test Suites

```bash
# Run only voice mode tests
npx playwright test server-touch-voice-ordering.spec.ts -g "Voice Mode"

# Run only touch mode tests
npx playwright test server-touch-voice-ordering.spec.ts -g "Touch Mode"

# Run only order submission tests
npx playwright test server-touch-voice-ordering.spec.ts -g "Order Confirmation"

# Run responsive tests
npx playwright test server-touch-voice-ordering.spec.ts -g "Responsive"
```

### Debug Individual Tests

```bash
# Debug a specific test
npx playwright test server-touch-voice-ordering.spec.ts -g "should default to voice mode" --debug

# Run with trace
npx playwright test server-touch-voice-ordering.spec.ts --trace on

# Show test report after run
npx playwright show-report
```

### CI/CD Integration

```bash
# Run in CI mode (with retries)
CI=true npx playwright test server-touch-voice-ordering.spec.ts

# Generate HTML report
npx playwright test server-touch-voice-ordering.spec.ts --reporter=html

# Generate JSON report
npx playwright test server-touch-voice-ordering.spec.ts --reporter=json
```

## Test Architecture

### Test Structure

```
tests/e2e/server-touch-voice-ordering.spec.ts
├── Test Configuration
├── Helper Functions
│   ├── openServerOrder()
│   ├── mockVoiceAPI()
│   ├── mockMicrophone()
│   ├── switchMode()
│   └── getOrderItemsList()
├── Voice Mode Tests
├── Touch Mode Tests
├── Cross-Mode Tests
├── Order Review Tests
├── Order Submission Tests
├── Responsive Tests
└── Integration Tests
```

### Key Helper Functions

#### `openServerOrder(page: Page)`
Navigates to server view, selects table and seat, opens order modal.

#### `switchMode(page: Page, mode: 'voice' | 'touch')`
Switches between voice and touch ordering modes.

#### `mockVoiceAPI(page: Page)`
Mocks voice API responses for testing voice ordering.

#### `mockMicrophone(page: Page)`
Mocks browser microphone access for voice tests.

#### `getOrderItemsList(page: Page)`
Returns the order items list locator.

## Test Patterns Used

### 1. Page Object Pattern
Helper functions encapsulate common UI interactions.

### 2. Mocking
- Voice API responses
- Microphone access
- Menu items API
- Order submission API

### 3. Event Simulation
Custom events used to simulate voice and touch item additions:
```typescript
window.dispatchEvent(new CustomEvent('voice-order-detected', {
  detail: { items: [...] }
}))
```

### 4. Proper Waits
- `expect().toBeVisible({ timeout })` for element visibility
- `page.waitForTimeout()` for state changes
- `page.waitForURL()` for navigation

### 5. Screenshot on Failure
Configured in `playwright.config.ts`:
```typescript
screenshot: 'only-on-failure'
```

## Common Issues & Solutions

### Issue: Tests fail with "element not found"
**Solution:** Increase timeout or check if elements have correct test IDs.

```typescript
await expect(element).toBeVisible({ timeout: 5000 })
```

### Issue: Voice tests fail
**Solution:** Ensure voice API mocking is set up before test:

```typescript
test.beforeEach(async ({ page }) => {
  await mockVoiceAPI(page)
  await mockMicrophone(page)
})
```

### Issue: Modal doesn't open
**Solution:** Verify table/seat selection succeeded before clicking start order.

### Issue: Items not appearing in order list
**Solution:** Check event simulation format matches expected schema.

## Test Data

### Mock Table
```typescript
const MOCK_TABLE = {
  id: 'table-1',
  label: 'Table 5',
  capacity: 4,
  position: { x: 200, y: 150 }
}
```

### Mock Menu Items
```typescript
const MOCK_MENU_ITEMS = [
  {
    id: 'item-1',
    name: 'Soul Bowl',
    price: 12.99,
    category: { name: 'Bowls' },
    description: 'Fresh bowl with vegetables',
    isAvailable: true
  },
  // ... more items
]
```

## Performance Considerations

- Tests use `test.describe.configure({ mode: 'serial' })` to run sequentially
- Long-running tests marked with `test.slow()`
- Selective waits with appropriate timeouts
- Mocked APIs to avoid network delays

## Accessibility Testing

Tests verify:
- ARIA labels on mode selector buttons
- ARIA roles on modal dialogs
- Keyboard navigation support
- Screen reader compatibility (implicit through ARIA)

## Future Enhancements

### Potential Additions
1. ✨ Category filtering tests
2. ✨ Search functionality tests
3. ✨ PostOrderPrompt integration tests
4. ✨ WebSocket real-time updates tests
5. ✨ Error handling for network failures
6. ✨ Modifier group validation tests
7. ✨ Special instructions display on KDS tests
8. ✨ Multi-seat order workflow integration

### Visual Regression Testing
Consider adding visual regression tests using Playwright's screenshot comparison:

```typescript
await expect(page).toHaveScreenshot('voice-mode.png')
```

## Contributing

When adding new tests:

1. Follow existing naming conventions
2. Add clear test descriptions
3. Use helper functions for common operations
4. Mock external dependencies
5. Add appropriate timeouts
6. Document any new test patterns

## Related Documentation

- [Playwright Documentation](https://playwright.dev)
- [Voice Ordering Tests](./voice-ordering.spec.ts)
- [Multi-Seat Ordering Tests](./multi-seat-ordering.spec.ts)
- [Test Helpers](./fixtures/test-helpers.ts)

## Support

For issues or questions:
- Check test output and screenshots in `test-results/`
- Review trace files for detailed execution info
- Run tests in UI mode for interactive debugging
- Check browser console logs for runtime errors

---

**Last Updated:** 2025-11-07
**Test Coverage:** Voice + Touch ordering modes, Order management, Responsive design
**Playwright Version:** As specified in package.json
