# Quick Start Guide - Server Touch+Voice Ordering Tests

## Installation & Setup

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Verify Playwright is installed
npx playwright --version

# 3. Install browser binaries (if needed)
npx playwright install
```

## Quick Test Commands

### Run All Tests
```bash
npx playwright test server-touch-voice-ordering.spec.ts
```

### Run Tests with Visual Feedback
```bash
# UI Mode (recommended for development)
npx playwright test server-touch-voice-ordering.spec.ts --ui

# Headed Mode (see browser)
npx playwright test server-touch-voice-ordering.spec.ts --headed
```

### Run Specific Test Categories

```bash
# Voice ordering tests only
npx playwright test server-touch-voice-ordering.spec.ts -g "Voice Mode"

# Touch ordering tests only
npx playwright test server-touch-voice-ordering.spec.ts -g "Touch Mode"

# Order review tests
npx playwright test server-touch-voice-ordering.spec.ts -g "Order Review"

# Submission tests
npx playwright test server-touch-voice-ordering.spec.ts -g "Submission"

# Responsive tests
npx playwright test server-touch-voice-ordering.spec.ts -g "Responsive"
```

### Debug a Failing Test

```bash
# Run with debugger
npx playwright test server-touch-voice-ordering.spec.ts -g "test name" --debug

# Run with trace
npx playwright test server-touch-voice-ordering.spec.ts --trace on

# View trace after test
npx playwright show-trace trace.zip
```

## Test Report

```bash
# Generate HTML report
npx playwright test server-touch-voice-ordering.spec.ts --reporter=html

# View report
npx playwright show-report
```

## Common Test Scenarios

### 1. Voice Ordering Flow
```bash
npx playwright test server-touch-voice-ordering.spec.ts -g "should add items to order via voice"
```

### 2. Touch Ordering Flow
```bash
npx playwright test server-touch-voice-ordering.spec.ts -g "should add item to order from ItemDetailModal"
```

### 3. Mixed Order (Voice + Touch)
```bash
npx playwright test server-touch-voice-ordering.spec.ts -g "should create mixed order"
```

### 4. Complete End-to-End Flow
```bash
npx playwright test server-touch-voice-ordering.spec.ts -g "complete order flow"
```

## Troubleshooting

### Tests are failing
1. Check if dev server is running: `npm run dev`
2. Clear browser state: `rm -rf test-results/`
3. Check test output in `test-results/` folder
4. View screenshots in `test-results/` for visual debugging

### Elements not found
- Increase timeouts in the test
- Check if component test IDs match expected values
- Run in headed mode to see what's happening

### API mocking issues
- Verify mock routes are set up in `beforeEach`
- Check if routes match actual API endpoints
- Look at network tab in headed mode

## Performance Tips

```bash
# Run in parallel (faster)
npx playwright test server-touch-voice-ordering.spec.ts --workers=4

# Run only on Chrome (faster than all browsers)
npx playwright test server-touch-voice-ordering.spec.ts --project=chromium

# Skip slow tests
npx playwright test server-touch-voice-ordering.spec.ts --grep-invert "slow"
```

## CI/CD Integration

```bash
# Run in CI mode
CI=true npx playwright test server-touch-voice-ordering.spec.ts

# With retries
npx playwright test server-touch-voice-ordering.spec.ts --retries=2

# Generate JSON report for CI
npx playwright test server-touch-voice-ordering.spec.ts --reporter=json > results.json
```

## Next Steps

1. ✅ Review test documentation: `tests/e2e/SERVER_TOUCH_VOICE_TESTS.md`
2. ✅ Run tests locally to verify setup
3. ✅ Add to CI/CD pipeline
4. ✅ Extend tests as new features are added

---

**Need Help?** Check `SERVER_TOUCH_VOICE_TESTS.md` for detailed documentation.
