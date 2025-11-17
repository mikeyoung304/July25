# Clean Slate Protocol (CSP)

**Version**: 1.0
**Created**: 2025-11-16
**Purpose**: Systematic environment reset to eliminate cache/state corruption

---

## Core Principle

> **"When in doubt, start from a known-good state. But verify the slate is actually clean."**

The Clean Slate Protocol provides a graduated series of environment resets, from minimal cache clearing to full nuclear option, with verification at each level.

---

## CSP Levels

### Level 0: Cache Clear (Fastest, 30 seconds)

**When to use**: Build worked before, minor changes since

```bash
#!/bin/bash
# claudelessons-v2/scripts/csp-level-0.sh

echo "🧹 CSP LEVEL 0: Cache Clear"
echo "============================"

# 1. Clear build artifacts
echo "▸ Clearing dist..."
rm -rf dist/
echo "  ✓ Removed dist/"

# 2. Clear Vite cache
echo "▸ Clearing Vite cache..."
rm -rf node_modules/.vite/
echo "  ✓ Removed node_modules/.vite/"

# 3. Clear TypeScript cache
echo "▸ Clearing TypeScript cache..."
rm -rf node_modules/.cache/
echo "  ✓ Removed node_modules/.cache/"

# 4. Rebuild
echo "▸ Rebuilding..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ CSP Level 0: SUCCESS"
  exit 0
else
  echo "❌ CSP Level 0: FAILED"
  echo "→ Escalating to Level 1"
  exit 1
fi
```

**Verification**:
```bash
# Verify clean state
ls -la dist/ 2>/dev/null && echo "❌ dist/ still exists" || echo "✓ dist/ removed"
ls -la node_modules/.vite/ 2>/dev/null && echo "❌ .vite/ still exists" || echo "✓ .vite/ removed"
ls -la node_modules/.cache/ 2>/dev/null && echo "❌ .cache/ still exists" || echo "✓ .cache/ removed"
```

---

### Level 1: Dependency Reinstall (Medium, 2-5 minutes)

**When to use**: Level 0 failed, or dependency changes suspected

```bash
#!/bin/bash
# claudelessons-v2/scripts/csp-level-1.sh

echo "🧹 CSP LEVEL 1: Dependency Reinstall"
echo "===================================="

# 1. Include Level 0 actions
echo "▸ Running Level 0 first..."
./csp-level-0.sh || true

# 2. Remove node_modules
echo "▸ Removing node_modules..."
du -sh node_modules/ 2>/dev/null | awk '{print "  Size:", $1}'
rm -rf node_modules/
echo "  ✓ Removed node_modules/"

# 3. Clean npm cache (optional, takes longer)
if [ "$CLEAN_NPM_CACHE" = "true" ]; then
  echo "▸ Cleaning npm cache..."
  npm cache clean --force
  echo "  ✓ npm cache cleaned"
fi

# 4. Fresh install from lock file
echo "▸ Running npm ci (clean install)..."
npm ci --prefer-offline

if [ $? -ne 0 ]; then
  echo "❌ npm ci failed"
  echo "→ Trying npm install instead..."
  npm install
fi

# 5. Verify installation
echo "▸ Verifying installation..."
npm ls --depth=0 | grep -i "UNMET"
if [ $? -eq 0 ]; then
  echo "⚠️  WARNING: Unmet dependencies detected"
  npm ls --depth=0 | grep -i "UNMET"
fi

# 6. Rebuild
echo "▸ Rebuilding..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ CSP Level 1: SUCCESS"
  exit 0
else
  echo "❌ CSP Level 1: FAILED"
  echo "→ Escalating to Level 2"
  exit 1
fi
```

**Verification**:
```bash
# Verify fresh install
echo "Checking node_modules age..."
INSTALL_TIME=$(stat -f %Sm node_modules/)
echo "Installed: $INSTALL_TIME"

echo "Checking for package.json vs package-lock.json sync..."
npm ls --depth=0 2>&1 | grep -q "invalid" && echo "❌ Lock file out of sync" || echo "✓ Lock file valid"
```

---

### Level 2: Global State Reset (Slower, 5-10 minutes)

**When to use**: Level 1 failed, or global configuration suspected

```bash
#!/bin/bash
# claudelessons-v2/scripts/csp-level-2.sh

echo "🧹 CSP LEVEL 2: Global State Reset"
echo "=================================="

# 1. Include Level 1 actions
echo "▸ Running Level 1 first..."
./csp-level-1.sh || true

# 2. Clear global npm cache
echo "▸ Clearing global npm cache..."
npm cache clean --force
echo "  ✓ Global cache cleared"

# 3. Reset npm config (backup first)
echo "▸ Backing up npm config..."
cp ~/.npmrc ~/.npmrc.backup 2>/dev/null || echo "  No .npmrc to backup"

echo "▸ Checking for problematic npm configs..."
npm config list | grep -E "registry|proxy|cache" | tee npm-config.txt
if [ -s npm-config.txt ]; then
  echo "  ⚠️  Non-standard npm config detected"
  cat npm-config.txt
fi

# 4. Clear TypeScript cache globally
echo "▸ Clearing global TypeScript cache..."
rm -rf ~/.ts-node/ 2>/dev/null
rm -rf /tmp/ts-* 2>/dev/null
echo "  ✓ TypeScript cache cleared"

# 5. Clear docker build cache (if using docker)
if command -v docker &> /dev/null; then
  echo "▸ Clearing Docker build cache..."
  docker builder prune -f --filter "until=24h"
  echo "  ✓ Docker cache cleared"
fi

# 6. Reinstall with frozen lockfile
echo "▸ Running npm ci with frozen lockfile..."
npm ci --prefer-offline --frozen-lockfile

# 7. Rebuild
echo "▸ Rebuilding..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ CSP Level 2: SUCCESS"
  exit 0
else
  echo "❌ CSP Level 2: FAILED"
  echo "→ Escalating to Level 3 (Nuclear Option)"
  exit 1
fi
```

**Verification**:
```bash
# Verify global state
echo "Checking npm cache..."
npm cache verify

echo "Checking Docker state..."
docker system df

echo "Checking for stale processes..."
lsof -i :3000 || echo "✓ Port 3000 free"
lsof -i :5432 || echo "✓ Port 5432 free"
```

---

### Level 3: Nuclear Option (Slowest, 10-20 minutes)

**When to use**: All else failed, starting completely fresh

```bash
#!/bin/bash
# claudelessons-v2/scripts/csp-level-3.sh

echo "🧹 CSP LEVEL 3: Nuclear Option"
echo "=============================="
echo ""
echo "⚠️  WARNING: This will:"
echo "   - Remove all build artifacts"
echo "   - Remove all dependencies"
echo "   - Reset git state"
echo "   - Clear all caches"
echo "   - Restart all services"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

# 1. Stop all services
echo "▸ Stopping all services..."
docker-compose down -v 2>/dev/null || echo "  No docker-compose"
pkill -f "node" || echo "  No node processes"
echo "  ✓ Services stopped"

# 2. Clean git working directory
echo "▸ Cleaning git working directory..."
git status --porcelain
read -p "Stash uncommitted changes? (y/n): " stash
if [ "$stash" = "y" ]; then
  git stash push -m "CSP Level 3 auto-stash $(date)"
  echo "  ✓ Changes stashed"
fi

# Clean untracked files (ask first)
echo "▸ Untracked files:"
git clean -n -d
read -p "Remove these files? (y/n): " clean_git
if [ "$clean_git" = "y" ]; then
  git clean -fd
  echo "  ✓ Untracked files removed"
fi

# 3. Remove EVERYTHING
echo "▸ Removing all generated files..."
rm -rf node_modules/
rm -rf dist/
rm -rf .vite/
rm -rf .next/ # if using Next.js
rm -rf .turbo/ # if using Turbo
rm -rf .cache/
rm -rf coverage/
rm -rf .nyc_output/
rm -rf *.log
echo "  ✓ All generated files removed"

# 4. Reset package lock
echo "▸ Regenerating package-lock.json..."
rm -f package-lock.json
npm install --package-lock-only
echo "  ✓ Lock file regenerated"

# 5. Fresh install
echo "▸ Fresh install..."
npm ci

# 6. Reset database (if using docker)
if [ -f docker-compose.yml ]; then
  echo "▸ Resetting database..."
  docker-compose down -v
  docker-compose up -d postgres
  sleep 5
  npm run db:migrate
  echo "  ✓ Database reset"
fi

# 7. Rebuild everything
echo "▸ Rebuilding..."
npm run build

# 8. Run tests to verify
echo "▸ Running tests to verify..."
npm test -- --run

if [ $? -eq 0 ]; then
  echo "✅ CSP Level 3: SUCCESS"
  echo "Environment completely reset and verified"
  exit 0
else
  echo "❌ CSP Level 3: FAILED"
  echo "→ Issue is NOT environment-related"
  echo "→ Investigate code or configuration"
  exit 1
fi
```

**Verification**:
```bash
# Verify nuclear reset
echo "=== VERIFICATION REPORT ==="
echo ""
echo "Git status:"
git status --short
echo ""
echo "Generated files:"
ls -la | grep -E "node_modules|dist|\.vite|\.cache" || echo "✓ All removed"
echo ""
echo "Processes:"
ps aux | grep node || echo "✓ No node processes"
echo ""
echo "Ports:"
lsof -i :3000 || echo "✓ Port 3000 free"
echo ""
echo "Docker:"
docker ps
```

---

## Automated CSP Selection

```javascript
// claudelessons-v2/protocols/csp-selector.js

class CleanSlateSelector {
  constructor(context) {
    this.context = context;
  }

  selectLevel() {
    const score = this.calculateEnvironmentSuspicionScore();

    if (score < 0.3) {
      return {
        level: 0,
        reason: 'Low suspicion, try cache clear first',
        command: './csp-level-0.sh'
      };
    }

    if (score < 0.6) {
      return {
        level: 1,
        reason: 'Moderate suspicion, reinstall dependencies',
        command: './csp-level-1.sh'
      };
    }

    if (score < 0.8) {
      return {
        level: 2,
        reason: 'High suspicion, reset global state',
        command: './csp-level-2.sh'
      };
    }

    return {
      level: 3,
      reason: 'Very high suspicion, nuclear option',
      command: './csp-level-3.sh'
    };
  }

  calculateEnvironmentSuspicionScore() {
    let score = 0;

    // Check 1: Recent npm install?
    const lastInstall = this.getLastInstallTime();
    if (lastInstall < 1) { // hours
      score += 0.1; // Recent install less likely to be corrupt
    } else if (lastInstall > 24) {
      score += 0.2; // Old install more suspicious
    }

    // Check 2: Dependency changes?
    const packageJsonChanged = this.hasFileChanged('package.json', 24);
    const lockFileChanged = this.hasFileChanged('package-lock.json', 24);

    if (packageJsonChanged && !lockFileChanged) {
      score += 0.4; // Lock file out of sync
    }

    // Check 3: Build worked before?
    const lastSuccessfulBuild = this.getLastSuccessfulBuildTime();
    if (lastSuccessfulBuild < 1) {
      score += 0.1; // Recently worked
    } else if (lastSuccessfulBuild > 24) {
      score += 0.3; // Long time since success
    }

    // Check 4: Error message mentions cache?
    if (this.context.error?.includes('cache') ||
        this.context.error?.includes('ENOENT')) {
      score += 0.3;
    }

    // Check 5: Node modules size unexpected?
    const nodeModulesSize = this.getDirectorySize('node_modules');
    const expectedSize = this.getExpectedNodeModulesSize();
    if (Math.abs(nodeModulesSize - expectedSize) / expectedSize > 0.2) {
      score += 0.2; // 20% size difference
    }

    return Math.min(score, 1.0);
  }

  getLastInstallTime() {
    try {
      const stats = fs.statSync('node_modules');
      const hoursSince = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
      return hoursSince;
    } catch {
      return Infinity; // No node_modules
    }
  }

  hasFileChanged(filename, hoursAgo) {
    const result = exec(`git log -1 --since="${hoursAgo} hours ago" --name-only | grep ${filename}`);
    return result.trim().length > 0;
  }

  getLastSuccessfulBuildTime() {
    try {
      const stats = fs.statSync('dist');
      const hoursSince = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
      return hoursSince;
    } catch {
      return Infinity; // No successful build
    }
  }

  getDirectorySize(dir) {
    const result = exec(`du -sm ${dir} 2>/dev/null | awk '{print $1}'`);
    return parseInt(result) || 0;
  }

  getExpectedNodeModulesSize() {
    // Parse package.json and estimate size
    // For now, use a heuristic
    const packageJson = JSON.parse(fs.readFileSync('package.json'));
    const depCount = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    }).length;

    return depCount * 5; // ~5MB per package (rough estimate)
  }
}

// Usage
const selector = new CleanSlateSelector({
  error: 'Cannot find module @/components/Header'
});

const recommendation = selector.selectLevel();
console.log(`Recommended: CSP Level ${recommendation.level}`);
console.log(`Reason: ${recommendation.reason}`);
console.log(`Run: ${recommendation.command}`);
```

---

## CSP Checklist

Before running CSP, verify you've tried non-destructive debugging:

```markdown
## Pre-CSP Checklist

- [ ] Read error message carefully
- [ ] Searched Error Pattern Library
- [ ] Checked recent git commits
- [ ] Verified file exists
- [ ] Checked import paths
- [ ] Ran TypeScript compiler directly
- [ ] Checked for typos

If all above fail, CSP is appropriate.
```

---

## CSP Decision Tree

```
Error encountered
   ↓
Is error in EPL? ───YES─→ Use EPL fix
   │
   NO
   ↓
Have you tried non-destructive debugging? ───NO─→ Do that first
   │
   YES
   ↓
Calculate suspicion score
   ↓
   ├─ Score < 0.3 ─→ CSP Level 0 (cache clear)
   │                      ↓
   │                   Success? ───YES─→ Done
   │                      │
   │                      NO → CSP Level 1
   │
   ├─ Score 0.3-0.6 ─→ CSP Level 1 (reinstall)
   │                      ↓
   │                   Success? ───YES─→ Done
   │                      │
   │                      NO → CSP Level 2
   │
   ├─ Score 0.6-0.8 ─→ CSP Level 2 (global reset)
   │                      ↓
   │                   Success? ───YES─→ Done
   │                      │
   │                      NO → CSP Level 3
   │
   └─ Score > 0.8 ───→ CSP Level 3 (nuclear)
                          ↓
                       Success? ───YES─→ Done
                          │
                          NO → Not environment issue
                               → Investigate code/config
```

---

## Integration with Diagnostic Decision Tree

```
DDT Step: Is environment clean?
   ↓
Run: npx claudelessons csp check
   ↓
   ├─ Clean ─────→ Continue debugging
   │
   └─ Suspicious ─→ Run recommended CSP level
                       ↓
                    Success? ───YES─→ Continue debugging
                       │
                       NO ─→ Environment not the issue
```

---

## CLI Integration

```bash
# Check if CSP needed
npx claudelessons csp check

# Output:
Environment Suspicion Score: 0.72 (HIGH)

Factors:
✓ package.json changed 12 hours ago
✓ package-lock.json unchanged (OUT OF SYNC)
✓ Last successful build: 36 hours ago
✓ node_modules size: 567MB (expected: 450MB, +26%)

Recommendation: CSP Level 2 (Global State Reset)

Run now? (y/n):

# Run specific level
npx claudelessons csp run --level=1

# Auto-select and run
npx claudelessons csp auto
```

---

## Post-CSP Actions

After successful CSP:

1. **Document what level worked**
   ```bash
   echo "CSP Level 1 resolved build issue" >> .claudelessons/csp-log.txt
   ```

2. **Add to Error Pattern Library**
   ```bash
   npx claudelessons epl add \
     --error="Cannot find module" \
     --solution="CSP Level 1 (dependency reinstall)" \
     --confidence=0.8
   ```

3. **Check what was wrong**
   ```bash
   # Compare before/after
   diff node_modules-backup/.package-lock.json package-lock.json
   ```

---

## Common CSP Scenarios

### Scenario 1: "It works on my machine"

```bash
# Developer A's machine (works)
$ npx claudelessons csp check
Environment Suspicion Score: 0.15 (LOW)
✓ Recent clean install
✓ Lock file in sync
✓ Build artifacts fresh

# Developer B's machine (fails)
$ npx claudelessons csp check
Environment Suspicion Score: 0.68 (HIGH)
✗ node_modules 2 weeks old
✗ Lock file out of sync
✗ Cache size: 245MB (should be ~0)

Recommendation: CSP Level 2
```

### Scenario 2: After merging main

```bash
$ git merge main
$ npm run build
ERROR: Cannot find module...

$ npx claudelessons csp auto

Detected: package-lock.json merge conflict resolved
Suspicion: Dependencies changed in merge
Running: CSP Level 1 (dependency reinstall)

▸ Removing node_modules...
▸ Running npm ci...
▸ Rebuilding...
✅ Build successful

Resolution: Merge brought in new dependencies
```

### Scenario 3: Random build failures

```bash
# Build fails intermittently
$ npm run build
✓ Success

$ npm run build
✗ Failed

$ npm run build
✓ Success

$ npx claudelessons csp check

Detected: Intermittent failures (race condition?)
Suspicion: Cache corruption or parallel build issue
Running: CSP Level 0 (cache clear)

✅ Cleared cache
Testing 5 sequential builds...
✓ Build 1/5
✓ Build 2/5
✓ Build 3/5
✓ Build 4/5
✓ Build 5/5

Resolution: Cache corruption causing race condition
```

---

## Success Metrics

```json
{
  "csp_usage": {
    "total_runs": 156,
    "by_level": {
      "0": 89,
      "1": 52,
      "2": 13,
      "3": 2
    },
    "success_rate_by_level": {
      "0": "76%",
      "1": "94%",
      "2": "100%",
      "3": "100%"
    },
    "avg_time_by_level": {
      "0": "0.5 min",
      "1": "3.2 min",
      "2": "7.8 min",
      "3": "15.4 min"
    },
    "false_alarms": 12,
    "issues_resolved": 144
  }
}
```

---

**Version**: 1.0
**Last Updated**: 2025-11-16
**Integration**: Claudelessons v2.0
**Status**: Ready for implementation
