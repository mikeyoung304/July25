# Migration Guide: Claudelessons v1 → v2

## Overview

Migrating from Claudelessons v1 (static knowledge base) to v2 (living knowledge system) is designed to be incremental and non-disruptive. You can run both systems in parallel during the transition.

## Key Differences

| Aspect | v1 (Current) | v2 (New) |
|--------|--------------|----------|
| **Structure** | Single folder with markdown | Multi-layer architecture |
| **Usage** | Manual lookup | Automated enforcement |
| **Learning** | Manual documentation | Automatic pattern detection |
| **Integration** | Standalone | IDE, CI/CD, CLI integrated |
| **Prevention** | Read and remember | Catch at commit time |

## Migration Steps

### Step 1: Install Claudelessons v2 (5 minutes)

```bash
# Keep your existing claudelessons/ folder intact
# Install v2 alongside it
cd your-project-root

# Copy the new system
cp -r path/to/claudelessons-v2 .

# Install dependencies
cd claudelessons-v2
npm install

# Create symlink for CLI
npm link
```

### Step 2: Import Existing Lessons (10 minutes)

```bash
# Automatic import from v1
npx claudelessons migrate --from ../claudelessons

# This will:
# 1. Parse existing markdown files
# 2. Extract patterns and lessons
# 3. Generate ESLint rules where possible
# 4. Create validators for database patterns
# 5. Update .claudelessons-rc.json
```

### Step 3: Configure Your Project (15 minutes)

#### Add to package.json

```json
{
  "scripts": {
    "claudelessons:check": "claudelessons check",
    "claudelessons:prevent": "claudelessons prevent",
    "precommit": "claudelessons check --staged",
    "postinstall": "claudelessons init"
  },
  "eslintConfig": {
    "extends": [
      "./claudelessons-v2/enforcement/eslint-rules"
    ]
  }
}
```

#### Update .gitignore

```gitignore
# Claudelessons v2
claudelessons-v2/metrics.json
claudelessons-v2/monitoring/telemetry/
claudelessons-v2/.cache/
```

#### Configure ESLint

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    // your existing configs
    './claudelessons-v2/enforcement/eslint-rules'
  ],
  rules: {
    // Override specific rules if needed
    'claudelessons/no-early-return-before-wrapper': 'error',
    'claudelessons/component-size-limit': 'warn'
  }
};
```

### Step 4: Set Up Git Hooks (5 minutes)

```bash
# Install husky if not already installed
npm install -D husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npx claudelessons check --staged"

# Add pre-push hook
npx husky add .husky/pre-push "npx claudelessons prevent"
```

### Step 5: Configure CI/CD (10 minutes)

#### GitHub Actions

```yaml
# .github/workflows/claudelessons.yml
name: Claudelessons Validation

on:
  pull_request:
    types: [opened, synchronize]
  push:
    branches: [main, develop]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd claudelessons-v2
          npm ci

      - name: Run Claudelessons checks
        run: npx claudelessons check

      - name: Check for preventable issues
        run: npx claudelessons prevent

      - name: Post results to PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const results = require('./claudelessons-v2/results.json');
            github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: results.summary
            });
```

### Step 6: Verify Installation (5 minutes)

```bash
# Test the CLI
npx claudelessons --version
# Should output: 2.0.0

# Run initial check
npx claudelessons check
# Should show any existing violations

# Search for a known pattern
npx claudelessons search "React #318"
# Should return the hydration lesson

# Check metrics
npx claudelessons stats
# Should show initial baseline
```

## Mapping v1 Lessons to v2 Rules

| v1 Lesson | v2 Implementation | Auto-Enforcement |
|-----------|-------------------|------------------|
| `react-hydration-early-return-bug.md` | ESLint rule `no-early-return-before-wrapper` | ✅ Yes |
| `database-schema-mismatches.md` | CI check `rpc-sync-validator` | ✅ Yes |
| `auth-multi-tenancy-security.md` | AST analyzer `dual-middleware-validator` | ✅ Yes |
| `configuration-environment-errors.md` | Pre-commit `env-var-validator` | ✅ Yes |
| `code-complexity-debt.md` | ESLint rule `component-size-limit` | ⚠️ Warning only |
| `testing-debugging-strategies.md` | Guidelines + test coverage check | ⚠️ Partial |

## Gradual Adoption Strategy

### Week 1: Passive Monitoring
- Install v2 alongside v1
- Run checks in "report only" mode
- Gather baseline metrics
- No enforcement yet

```json
// .claudelessons-rc.json
{
  "enforcement": {
    "eslint": {
      "enabled": true,
      "severity": "warn"  // Start with warnings
    },
    "preCommit": {
      "enabled": false  // Don't block commits yet
    }
  }
}
```

### Week 2: Selective Enforcement
- Enable blocking for critical rules only
- Fix existing violations
- Train team on new workflow

```json
{
  "patterns": {
    "no-early-return-before-wrapper": {
      "severity": "error"  // Block on this
    },
    "component-size-limit": {
      "severity": "warn"  // Just warn
    }
  }
}
```

### Week 3: Full Enforcement
- Enable all rules
- Add pre-commit hooks
- Integrate with CI/CD
- Require passing checks for merge

### Week 4: Continuous Improvement
- Review metrics
- Adjust thresholds
- Add custom patterns
- Share learnings

## Handling Existing Violations

When you first run `npx claudelessons check`, you may find existing violations. Here's how to handle them:

### Option 1: Fix All Immediately

```bash
# Auto-fix what's possible
npx claudelessons fix

# Manually fix the rest
npx claudelessons check --show-fixes
```

### Option 2: Gradual Resolution

```javascript
// .claudelessons-rc.json
{
  "grandfather": {
    "before": "2024-01-01",  // Ignore violations before this date
    "files": [
      "legacy/**/*",  // Ignore legacy code
      "vendor/**/*"   // Ignore vendored code
    ]
  }
}
```

### Option 3: Baseline and Improve

```bash
# Create baseline of current violations
npx claudelessons baseline

# Only fail on new violations
npx claudelessons check --since-baseline
```

## Team Training

### For Developers

1. **Quick presentation** (15 minutes)
   - Show the value (time saved, issues prevented)
   - Demo the CLI tools
   - Explain the automation

2. **Hands-on practice** (30 minutes)
   - Search for a known issue
   - Fix a violation with auto-fix
   - Run preventive checks

3. **Reference card**
   ```
   CLAUDELESSONS QUICK REFERENCE

   Daily Commands:
   - npx claudelessons check     # Before commit
   - npx claudelessons search    # When debugging
   - npx claudelessons prevent   # Before PR

   Common Fixes:
   - Early return → Move condition inside wrapper
   - Large component → Extract into smaller pieces
   - Missing middleware → Add both auth middlewares
   ```

### For AI Assistants

Add to your AI system prompts:

```markdown
Before making code changes, query the Claudelessons system:

1. Check for relevant patterns:
   `npx claudelessons search "[error message or symptom]"`

2. Validate changes won't violate rules:
   `npx claudelessons check [file]`

3. Learn from new issues:
   `npx claudelessons learn --error "[error]" --fix "[solution]"`

Never violate rules marked as "severity: error" in .claudelessons-rc.json.
```

## Rollback Plan

If you need to temporarily disable v2:

```bash
# Disable enforcement (keep learning active)
npx claudelessons disable

# Or completely remove
npm unlink claudelessons
rm -rf claudelessons-v2

# Your v1 knowledge base remains intact
```

## Common Migration Issues

### Issue: ESLint rule conflicts

**Solution:**
```javascript
// .eslintrc.js
{
  rules: {
    // Disable conflicting rule
    'some-other-rule': 'off',
    // Use claudelessons rule instead
    'claudelessons/no-early-return-before-wrapper': 'error'
  }
}
```

### Issue: Too many violations to fix immediately

**Solution:**
```bash
# Create a fix schedule
npx claudelessons check --group-by-severity > fix-schedule.md

# Fix critical first
npx claudelessons fix --severity critical

# Then high, medium, low over time
```

### Issue: CI/CD timeout on large codebases

**Solution:**
```yaml
# Run in parallel
- name: Claudelessons checks
  run: |
    npx claudelessons check --parallel --max-workers=4
```

## Success Metrics

Track these metrics to measure migration success:

| Metric | Week 1 | Week 4 | Target |
|--------|--------|--------|--------|
| Violations prevented | Baseline | +50 | +200/month |
| Time to fix issues | 2-3 days | 1 day | 2-3 hours |
| Test pass rate | Current | +10% | >95% |
| New patterns learned | 0 | 2 | 2-3/month |

## Support

### Documentation
- Full docs: `claudelessons-v2/README.md`
- API reference: `claudelessons-v2/docs/API.md`
- Troubleshooting: `claudelessons-v2/docs/TROUBLESHOOTING.md`

### Getting Help
- Run: `npx claudelessons doctor` for diagnostic
- Check: `claudelessons-v2/logs/` for detailed logs
- Open issue: [GitHub Issues](https://github.com/your-org/claudelessons)

## Next Steps

After successful migration:

1. **Customize patterns** for your specific needs
2. **Add domain-specific rules** for your business logic
3. **Connect monitoring** to production error tracking
4. **Share learnings** with the community

---

Remember: The goal is not perfection on day one, but continuous improvement. Start small, measure impact, and expand gradually.

**Welcome to Claudelessons v2 - where your code gets smarter every day! 🚀**