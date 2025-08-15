# 🚀 Developer Setup Guide
## Complete Development Environment & Tooling

This guide walks you through all the new development tools and how to use them effectively.

---

## 🎯 **What's Been Added**

Your development environment now includes:

- ✅ **Pre-commit Quality Gates** - Automated code quality checks
- ✅ **Enhanced Testing Suite** - Visual, accessibility, API, and performance tests  
- ✅ **Performance Monitoring** - Real-time metrics and error tracking
- ✅ **Auto-Documentation** - Generated from your code
- ✅ **Bundle Analysis** - Size tracking and optimization recommendations
- ✅ **Development Tools** - Setup automation and database seeding

---

## 🔧 **Initial Setup (Already Done)**

✅ Environment has been initialized with `npm run dev:setup`
✅ Documentation has been generated in `docs/generated/`
✅ Git hooks are configured for quality gates

---

## 🚦 **Quick Start Commands**

### **Development Workflow**
```bash
# Start development (same as before)
npm run dev

# Run all tests (includes new enhanced tests)
npm test

# Fix code style issues
npm run lint:fix

# Check TypeScript types
npm run typecheck
```

### **New Enhanced Testing**
```bash
# Run full enhanced test suite (visual, a11y, API, performance)
npm run test:enhanced

# Run specific test types
npm run test:visual        # Visual regression tests
npm run test:a11y          # Accessibility tests  
npm run test:api           # API contract tests
npm run test:performance   # Performance & Lighthouse tests
```

### **Analysis & Documentation**
```bash
# Analyze bundle size and get optimization tips
npm run analyze:bundle

# Generate/update documentation from code
npm run docs:generate

# Existing codebase analysis
npm run analyze
```

### **Database & Setup**
```bash
# Populate database with consistent test data
npm run db:seed

# Re-run development environment setup
npm run dev:setup
```

---

## 📋 **How to Use Each Tool**

### **1. Pre-commit Hooks (Automatic)**

**What it does:** Automatically runs when you commit code
- Formats code with prettier
- Fixes ESLint issues  
- Runs TypeScript checks
- Runs tests for changed files
- Validates commit message format

**How to use:**
```bash
# Just commit normally - hooks run automatically
git add .
git commit -m "feat: add new feature"

# Use conventional commit format:
# feat: new feature
# fix: bug fix  
# docs: documentation
# test: add tests
# refactor: code cleanup
```

### **2. Enhanced Testing Suite**

**Visual Regression Tests:**
- Takes screenshots of your app
- Compares against baseline images
- Catches visual breaking changes

**Accessibility Tests:**  
- Checks WCAG compliance
- Tests keyboard navigation
- Validates screen reader compatibility

**API Contract Tests:**
- Validates all API endpoints
- Tests request/response formats
- Checks error handling

**Performance Tests:**
- Lighthouse performance audits
- Bundle size analysis
- Core Web Vitals monitoring

**Run specific tests:**
```bash
npm run test:visual      # Screenshots & visual diffs
npm run test:a11y        # Accessibility compliance  
npm run test:api         # API endpoint validation
npm run test:performance # Performance metrics
```

### **3. Monitoring & Observability**

**Web Vitals Monitoring:**
- Automatically tracks Core Web Vitals (LCP, CLS, FID)
- Reports performance metrics to your server
- Available in `shared/monitoring/web-vitals.ts`

**Error Tracking:**
- Captures JavaScript errors and crashes
- Records user actions leading to errors  
- Available in `shared/monitoring/error-tracker.ts`

**Performance Monitoring:**
- Tracks API response times
- Monitors page load performance
- Available in `shared/monitoring/performance-monitor.ts`

**To use in your code:**
```typescript
import { errorTracker } from '@/shared/monitoring/error-tracker';
import { performanceMonitor } from '@/shared/monitoring/performance-monitor';

// Track custom events
errorTracker.captureMessage('User completed checkout', 'info');
performanceMonitor.recordUserInteraction('button_click', 150);
```

### **4. Documentation Generation**

**What gets generated:**
- API documentation from your code
- TypeScript interface documentation
- Component usage guides
- Architecture decision records
- Changelog from git commits

**Location:** `docs/generated/`

**Update docs:**
```bash
npm run docs:generate
```

### **5. Bundle Analysis**

**What it analyzes:**
- Total bundle size and trends
- Individual asset sizes  
- Dependency impact
- Performance recommendations
- Size change over time

**Run analysis:**
```bash
npm run analyze:bundle
```

**Results location:** `docs/analysis/`

---

## 🔄 **Daily Development Workflow**

### **Starting Work**
```bash
git pull origin main
npm run dev
```

### **Before Committing**
```bash
# These run automatically via git hooks, but you can run manually:
npm run lint:fix
npm run typecheck  
npm test
```

### **Weekly/Monthly Maintenance**
```bash
# Update documentation
npm run docs:generate

# Check bundle size trends  
npm run analyze:bundle

# Run full enhanced test suite
npm run test:enhanced
```

---

## 🚨 **Troubleshooting**

### **Pre-commit hooks not working?**
```bash
# Reinstall git hooks
rm -rf .husky
npm run prepare
```

### **Tests failing?**
```bash
# Update visual regression baselines (if UI intentionally changed)
npm run test:visual -- --update-snapshots

# Check if services are running
npm run check:integration
```

### **Database issues?**
```bash
# Reset and seed database
npm run db:reset
npm run db:seed
```

### **Documentation generation fails?**
```bash
# Check if TypeScript compiles
npm run typecheck

# Generate docs with specific options
npm run docs:generate -- --no-typedoc
```

### **Bundle analysis issues?**
```bash
# Make sure client builds successfully
cd client && npm run build

# Run analysis from client directory
cd client && npx vite-bundle-analyzer
```

---

## 📊 **Understanding the Reports**

### **Test Results**
- **Visual tests:** Look for screenshot diffs in `test-results/`
- **Accessibility:** Check for WCAG violations in test output
- **Performance:** Lighthouse scores should be >80 for all metrics

### **Bundle Analysis**
- **Total size:** Should stay <2MB for good performance
- **Gzipped size:** More important metric, should be <500KB  
- **Trends:** Watch for unexpected size increases
- **Recommendations:** Follow the suggestions in the report

### **Documentation**
- **API docs:** `docs/generated/api.md`
- **Components:** `docs/generated/components.md` 
- **Types:** `docs/generated/types/index.html`
- **ADRs:** `docs/generated/architecture-decisions.md`

---

## 🎯 **Best Practices**

### **Commit Messages**
Use conventional commit format:
```bash
feat(auth): add password reset functionality
fix(api): handle timeout errors gracefully  
docs: update API documentation
test: add accessibility tests for forms
```

### **Testing Strategy**
1. Write unit tests first (existing Jest setup)
2. Add integration tests for new API endpoints  
3. Run visual tests when changing UI
4. Check accessibility for new components
5. Monitor performance impact of changes

### **Performance**
1. Run bundle analysis before major releases
2. Keep an eye on Core Web Vitals in production
3. Use the performance monitoring data to identify bottlenecks
4. Follow bundle size recommendations

### **Documentation**
1. Add JSDoc comments to new functions
2. Document component props with TypeScript interfaces
3. Create ADRs for architectural decisions
4. Regenerate docs before releases

---

## 🔗 **Key Files & Directories**

```
📁 Project Structure
├── 📁 .husky/                    # Git hooks configuration
├── 📁 docs/
│   ├── 📁 generated/             # Auto-generated documentation  
│   └── 📁 analysis/              # Bundle and performance reports
├── 📁 tests/
│   ├── 📁 visual/                # Visual regression tests
│   ├── 📁 a11y/                  # Accessibility tests
│   ├── 📁 api/                   # API contract tests
│   └── 📁 performance/           # Performance tests
├── 📁 scripts/
│   ├── 📄 dev-setup.sh           # Development environment setup
│   ├── 📄 generate-docs.ts       # Documentation generator
│   ├── 📄 analyze-bundle.ts      # Bundle analyzer
│   └── 📄 seed-database.ts       # Database seeding
├── 📁 shared/monitoring/         # Monitoring utilities
└── 📄 playwright-enhanced.config.ts # Enhanced test configuration
```

---

## ❓ **Questions & Next Steps**

**Can I use this in Claude Code?**
Yes! All these commands work in Claude Code's terminal. You can:
- Run commands directly: `npm run test:enhanced`
- Ask Claude to run them for you: "run the visual tests"
- Get help: "explain the bundle analysis results"

**Do I need to open a new terminal?**
No, Claude Code can run all these commands for you. Just ask!

**What should I do first?**
1. Try running `npm run test:enhanced` to see all tests pass
2. Check `docs/generated/README.md` for your new documentation
3. Run `npm run analyze:bundle` to see your current bundle size
4. Make a small commit to see the pre-commit hooks in action

**Need help?**
- Ask Claude Code to run any of these commands
- Ask for explanations of any test failures or reports
- Request help optimizing based on bundle analysis results

---

*This development environment is now enterprise-grade with comprehensive tooling for quality, performance, and maintainability!*