# Claude Lessons v4 - Migration Checklist

**Status**: Draft
**Timeline**: 3 weeks
**Effort**: 10 days engineering time
**Risk Level**: LOW-MEDIUM

---

## Pre-Migration Validation

### ✅ Prerequisites

- [ ] Team review of v4 proposal completed
- [ ] Sign-off from key stakeholders
- [ ] v3 usage data analyzed (past 30 days)
- [ ] Top 20% patterns identified (based on usage)
- [ ] Rollback plan documented

### 📊 Baseline Metrics (v3)

Collect these BEFORE migration:

```bash
# Pattern count
grep -c "^## CL-" claude-lessons3/*/LESSONS.md

# File sizes
ls -lh claude-lessons3/*/LESSONS.md | awk '{print $9, $5}'

# Total size
du -sh claude-lessons3/

# Usage from sign-in sheet
cat claude-lessons3/SIGN_IN_SHEET.md | grep "⭐" | wc -l

# Average retrieval time (manual from sign-in sheet)
# Record: __________ minutes
```

**Document results** in `docs/archive/lessons-v3-baseline.md`

---

## Week 1: Foundation & Extraction

### Day 1: Setup New Structure

**Goal**: Create v4 directory skeleton

```bash
# Create new directory structure
mkdir -p lessons/{patterns,generated,tracking,scripts}
mkdir -p lessons/patterns/{auth,database,testing,websocket,react,build,api,performance,security,docs}
mkdir -p lessons/generated/{by-category,by-symptom}

# Copy baseline files
cp claude-lessons3/SIGN_IN_SHEET.md lessons/tracking/sign-in.md

# Initialize package.json for scripts
cd lessons
npm init -y
npm install --save-dev chalk commander

# Create script stubs
touch scripts/{build.js,new-pattern.js,validate.js,find.js,analytics.js}
```

**Deliverable**: Empty v4 structure ready for population

- [ ] Directory structure created
- [ ] Scripts initialized
- [ ] Git tracking enabled (`git add lessons/`)

### Day 2: Pattern Extraction Script

**Goal**: Automate conversion of LESSONS.md → JSON

**File**: `lessons/scripts/extract-patterns.js`

```javascript
#!/usr/bin/env node

/**
 * Extracts patterns from v3 LESSONS.md files into v4 JSON format
 *
 * Usage: node extract-patterns.js <category> <lessons-md-file>
 * Example: node extract-patterns.js auth ../claude-lessons3/01-auth-authorization-issues/LESSONS.md
 */

const fs = require('fs');
const path = require('path');

function parseLesson(markdown, category) {
  const patterns = [];

  // Regex to find pattern headers: ## CL-XXX-###: Title
  const patternRegex = /^## (CL-[A-Z]+-\d{3}):\s*(.+?)$/gm;

  let match;
  while ((match = patternRegex.exec(markdown)) !== null) {
    const [, id, title] = match;
    const startPos = match.index;

    // Extract section content (until next ## or end of file)
    const nextMatch = patternRegex.exec(markdown);
    const endPos = nextMatch ? nextMatch.index : markdown.length;
    const content = markdown.substring(startPos, endPos);

    // Parse structured fields
    const pattern = {
      id,
      title: title.trim(),
      version: '1.0',
      status: 'active',

      metadata: {
        category,
        severity: extractSeverity(content),
        date_discovered: extractDate(content, 'discovered'),
        date_resolved: extractDate(content, 'resolved'),
        debugging_days: extractDays(content),
        cost_estimate: extractCost(content),
        access_count: 0,
        last_accessed: null
      },

      symptoms: extractList(content, '### Symptoms'),
      keywords: extractKeywords(title, content),

      root_cause: {
        summary: extractSection(content, '### Root Cause', 200),
        technical: extractSection(content, '### The Problem', 500)
      },

      solution: {
        summary: extractSection(content, '### The Fix', 200),
        files_changed: extractFiles(content),
        commits: extractCommits(content),
        code_example: extractCodeExample(content)
      },

      prevention: extractList(content, '### Prevention'),
      related_patterns: extractRelated(content),
      eslint_rules: extractESLintRules(content),
      key_files: extractKeyFiles(content),
      timeline: extractTimeline(content),
      tags: generateTags(category, title, content)
    };

    patterns.push(pattern);
  }

  return patterns;
}

// Helper functions
function extractSeverity(content) {
  const match = content.match(/\*\*Severity\*\*:\s*(P[0-3])/);
  return match ? match[1] : 'P2';
}

function extractDays(content) {
  const match = content.match(/(\d+)\s*days?/i);
  return match ? parseInt(match[1]) : 0;
}

function extractCost(content) {
  const match = content.match(/\$[\d,]+\+?/);
  return match ? match[0] : 'Unknown';
}

function extractList(content, header) {
  const section = extractSection(content, header, 1000);
  if (!section) return [];

  const items = section.match(/^[-*]\s+(.+)$/gm);
  return items ? items.map(s => s.replace(/^[-*]\s+/, '').trim()) : [];
}

function extractCommits(content) {
  const matches = content.match(/\b[0-9a-f]{8}\b/g);
  return matches ? [...new Set(matches)] : [];
}

function extractCodeExample(content) {
  const beforeMatch = content.match(/```(?:typescript|javascript)\n\/\/ BEFORE.*?\n([\s\S]*?)```/);
  const afterMatch = content.match(/```(?:typescript|javascript)\n\/\/ AFTER.*?\n([\s\S]*?)```/);

  return {
    before: beforeMatch ? beforeMatch[1].trim() : '',
    after: afterMatch ? afterMatch[1].trim() : ''
  };
}

// Main execution
const category = process.argv[2];
const lessonsFile = process.argv[3];

if (!category || !lessonsFile) {
  console.error('Usage: node extract-patterns.js <category> <lessons-md-file>');
  process.exit(1);
}

const markdown = fs.readFileSync(lessonsFile, 'utf-8');
const patterns = parseLesson(markdown, category);

patterns.forEach(pattern => {
  const filename = pattern.id.toLowerCase().replace(/^cl-[a-z]+-/, '');
  const slug = pattern.title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const outputPath = path.join(__dirname, '..', 'patterns', category, `${slug}.json`);

  fs.writeFileSync(outputPath, JSON.stringify(pattern, null, 2));
  console.log(`✅ Created: patterns/${category}/${slug}.json`);
});

console.log(`\n✅ Extracted ${patterns.length} patterns from ${category}`);
```

**Test extraction**:

```bash
# Test with auth category
node lessons/scripts/extract-patterns.js auth claude-lessons3/01-auth-authorization-issues/LESSONS.md

# Verify output
ls -la lessons/patterns/auth/
cat lessons/patterns/auth/strict-auth-drift.json | head -30
```

**Deliverable**: Working extraction script

- [ ] Script extracts patterns correctly
- [ ] JSON structure matches v4 schema
- [ ] Code examples preserved
- [ ] Metadata extracted (severity, days, cost)
- [ ] Test run on auth category successful

### Day 3: Full Pattern Extraction

**Goal**: Extract all 80 patterns from v3

```bash
# Extract all categories
categories=(
  "auth:01-auth-authorization-issues"
  "database:02-database-supabase-issues"
  "react:03-react-ui-ux-issues"
  "websocket:04-realtime-websocket-issues"
  "build:05-build-deployment-issues"
  "testing:06-testing-quality-issues"
  "api:07-api-integration-issues"
  "performance:08-performance-optimization-issues"
  "security:09-security-compliance-issues"
  "docs:10-documentation-drift-issues"
)

for cat in "${categories[@]}"; do
  IFS=':' read -r name folder <<< "$cat"
  echo "Extracting $name..."
  node lessons/scripts/extract-patterns.js "$name" "claude-lessons3/$folder/LESSONS.md"
done

# Count extracted patterns
find lessons/patterns -name "*.json" | wc -l
# Expected: ~80
```

**Manual validation** (top 20%):

```bash
# List most valuable patterns (from sign-in sheet)
# - CL-AUTH-001 (48 days)
# - CL-DB-001 (30 days)
# - CL-TEST-001 (16 days)
# - CL-WS-001 (7 days)

# For each, manually compare:
# - v3: claude-lessons3/.../LESSONS.md
# - v4: lessons/patterns/.../[name].json

# Check:
# - [ ] All symptoms captured
# - [ ] Root cause preserved
# - [ ] Solution code correct
# - [ ] Prevention rules complete
# - [ ] Related patterns linked
```

**Deliverable**: All patterns extracted to JSON

- [ ] 80+ pattern files created
- [ ] Top 20% manually validated
- [ ] No data loss detected
- [ ] Git committed (`git add lessons/patterns/`)

### Day 4: Build Scripts

**Goal**: Generate documentation from patterns

**File**: `lessons/scripts/build.js`

```javascript
#!/usr/bin/env node

/**
 * Builds all generated documentation from pattern JSON files
 *
 * Generates:
 * - generated/knowledge.json (unified knowledge base)
 * - generated/by-category/*.md (category docs)
 * - generated/by-symptom/*.md (symptom index)
 * - INDEX.md (fast lookup)
 */

const fs = require('fs');
const path = require('path');

// Load all patterns
function loadPatterns() {
  const patterns = [];
  const patternsDir = path.join(__dirname, '..', 'patterns');

  const categories = fs.readdirSync(patternsDir);
  for (const category of categories) {
    const categoryPath = path.join(patternsDir, category);
    if (!fs.statSync(categoryPath).isDirectory()) continue;

    const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const pattern = JSON.parse(fs.readFileSync(path.join(categoryPath, file)));
      patterns.push(pattern);
    }
  }

  return patterns;
}

// Build knowledge.json
function buildKnowledgeBase(patterns) {
  const categories = {};

  patterns.forEach(p => {
    if (!categories[p.metadata.category]) {
      categories[p.metadata.category] = {
        patterns: [],
        total_days: 0,
        total_cost: 0
      };
    }

    categories[p.metadata.category].patterns.push({
      id: p.id,
      title: p.title,
      severity: p.metadata.severity,
      debugging_days: p.metadata.debugging_days,
      symptoms: p.symptoms,
      solution_summary: p.solution.summary
    });

    categories[p.metadata.category].total_days += p.metadata.debugging_days;
  });

  const knowledge = {
    version: '4.0.0',
    generated: new Date().toISOString(),
    total_patterns: patterns.length,
    categories
  };

  fs.writeFileSync(
    path.join(__dirname, '..', 'generated', 'knowledge.json'),
    JSON.stringify(knowledge, null, 2)
  );

  console.log('✅ Built: generated/knowledge.json');
}

// Build category docs
function buildCategoryDocs(patterns) {
  const byCategory = {};

  patterns.forEach(p => {
    const cat = p.metadata.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(p);
  });

  for (const [category, catPatterns] of Object.entries(byCategory)) {
    const markdown = `# ${category.charAt(0).toUpperCase() + category.slice(1)} Patterns

Total Patterns: ${catPatterns.length}
Total Debugging Days: ${catPatterns.reduce((sum, p) => sum + p.metadata.debugging_days, 0)}

## Patterns

${catPatterns.map(p => `
### ${p.id}: ${p.title}

**Severity**: ${p.metadata.severity}
**Impact**: ${p.metadata.debugging_days} days, ${p.metadata.cost_estimate}

**Symptoms**:
${p.symptoms.map(s => `- ${s}`).join('\n')}

**Solution**: ${p.solution.summary}

**Pattern File**: [${p.id}](../../patterns/${category}/${path.basename(p.id.toLowerCase())}.json)

---
`).join('\n')}
`;

    fs.writeFileSync(
      path.join(__dirname, '..', 'generated', 'by-category', `${category}.md`),
      markdown
    );

    console.log(`✅ Built: generated/by-category/${category}.md`);
  }
}

// Build symptom index
function buildSymptomIndex(patterns) {
  const symptomMap = {};

  patterns.forEach(p => {
    p.symptoms.forEach(symptom => {
      const key = symptom.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (!symptomMap[key]) {
        symptomMap[key] = {
          symptom,
          patterns: []
        };
      }
      symptomMap[key].patterns.push(p);
    });
  });

  for (const [key, data] of Object.entries(symptomMap)) {
    const markdown = `# ${data.symptom}

Found in ${data.patterns.length} pattern(s):

${data.patterns.map(p => `
## ${p.id}: ${p.title}

**Category**: ${p.metadata.category}
**Impact**: ${p.metadata.debugging_days} days

**Root Cause**: ${p.root_cause.summary}

**Solution**: ${p.solution.summary}

[View Pattern](../../patterns/${p.metadata.category}/)
`).join('\n')}
`;

    fs.writeFileSync(
      path.join(__dirname, '..', 'generated', 'by-symptom', `${key}.md`),
      markdown
    );
  }

  console.log(`✅ Built ${Object.keys(symptomMap).length} symptom docs`);
}

// Main
const patterns = loadPatterns();
console.log(`Loaded ${patterns.length} patterns`);

buildKnowledgeBase(patterns);
buildCategoryDocs(patterns);
buildSymptomIndex(patterns);

console.log('\n✅ Build complete!');
```

**Test build**:

```bash
# Run build
node lessons/scripts/build.js

# Verify output
ls -la lessons/generated/
ls -la lessons/generated/by-category/
ls -la lessons/generated/by-symptom/

# Check generated files
head -50 lessons/generated/knowledge.json
head -50 lessons/generated/by-category/auth.md
```

**Deliverable**: Working build pipeline

- [ ] knowledge.json generated
- [ ] Category docs generated
- [ ] Symptom docs generated
- [ ] Output validated (spot check)

### Day 5: INDEX.md Creation

**Goal**: Create fast symptom lookup index

**File**: `lessons/INDEX.md`

```markdown
# Claude Lessons - Quick Index

**Version**: 4.0.0
**Total Patterns**: 80
**Total Debugging Days Saved**: 190+
**Last Updated**: 2025-11-20

---

## 🚨 By Error Message (Fastest)

### Authentication Errors
- **401: Token missing restaurant context** → [CL-AUTH-001](patterns/auth/strict-auth-drift.json)
- **401: Missing required scope** → [CL-AUTH-002](patterns/auth/jwt-scope-bug.json)
- **Authentication Required modal loops forever** → [CL-AUTH-001](patterns/auth/strict-auth-drift.json)
- **403: Access denied to restaurant** → [CL-SEC-001](patterns/security/multi-tenant-leak.json)

### Database Errors
- **Migration failed to apply** → [CL-DB-002](patterns/database/migration-failure.json)
- **Schema drift detected** → [CL-DB-001](patterns/database/schema-drift.json)
- **Prisma client out of sync** → [CL-DB-001](patterns/database/schema-drift.json)
- **RPC function not found** → [CL-DB-003](patterns/database/rpc-evolution.json)

### Testing Errors
- **Missing required environment variables (CI)** → [CL-TEST-001](patterns/testing/ci-env-validation.json)
- **playwright-smoke.config.ts does not exist** → [CL-TEST-002](patterns/testing/dead-workflow.json)
- **Test timing variance too high** → [CL-TEST-003](patterns/testing/timing-test-flake.json)

### WebSocket/Real-time Errors
- **Memory leak: heap size growing** → [CL-WS-001](patterns/websocket/timer-cleanup.json)
- **WebSocket connection timeout** → [CL-WS-002](patterns/websocket/event-listener-leak.json)
- **State updates after unmount** → [CL-WS-003](patterns/websocket/cleanup-missing.json)

---

## 📁 By Category

| Category | Patterns | Debugging Days | Estimated Cost | View |
|----------|----------|----------------|----------------|------|
| Authentication | 3 | 48 | $92,000+ | [View](generated/by-category/auth.md) |
| Database | 4 | 30 | $60,000+ | [View](generated/by-category/database.md) |
| Testing | 4 | 16 | $48,000+ | [View](generated/by-category/testing.md) |
| WebSocket | 3 | 7 | $28,000+ | [View](generated/by-category/websocket.md) |
| React UI | 3 | 5 | $15,000+ | [View](generated/by-category/react.md) |
| Build/Deploy | 3 | 10 | $30,000+ | [View](generated/by-category/build.md) |
| API Integration | 3 | 14 | $42,000+ | [View](generated/by-category/api.md) |
| Performance | 2 | 5 | $15,000+ | [View](generated/by-category/performance.md) |
| Security | 2 | 60 | $180,000+ | [View](generated/by-category/security.md) |
| Documentation | 2 | 8 | $24,000+ | [View](generated/by-category/docs.md) |

---

## 🏆 Top 20% (Most Valuable)

1. **[CL-AUTH-001](patterns/auth/strict-auth-drift.json)**: STRICT_AUTH Drift
   - Impact: 48 days, $20K+
   - Effectiveness: ⭐⭐⭐⭐⭐
   - Last used: 2025-11-20

2. **[CL-DB-001](patterns/database/schema-drift.json)**: Schema Drift
   - Impact: 30 days, $15K+
   - Effectiveness: ⭐⭐⭐⭐⭐
   - Last used: 2025-11-19

3. **[CL-TEST-001](patterns/testing/ci-env-validation.json)**: CI Environment Validation
   - Impact: 16 days, $12K+
   - Effectiveness: ⭐⭐⭐⭐
   - Last used: 2025-11-20

4. **[CL-WS-001](patterns/websocket/timer-cleanup.json)**: Timer Memory Leaks
   - Impact: 7 days, $8K+
   - Effectiveness: ⭐⭐⭐⭐⭐
   - Last used: 2025-11-18

---

## 🔍 By File (When Working On...)

| File | Related Patterns |
|------|------------------|
| `server/src/middleware/auth.ts` | [Auth patterns](generated/by-category/auth.md) |
| `server/src/middleware/restaurantAccess.ts` | [Security patterns](generated/by-category/security.md) |
| `supabase/migrations/*.sql` | [Database patterns](generated/by-category/database.md) |
| `client/src/hooks/useWebSocket.ts` | [WebSocket patterns](generated/by-category/websocket.md) |
| `client/src/App.tsx` | [React patterns](generated/by-category/react.md) |
| `vite.config.ts`, `playwright.config.ts` | [Testing patterns](generated/by-category/testing.md) |

---

## 📊 System Health

**Pattern Status**:
- Active: 78
- Deprecated: 2
- Archived: 0

**Usage (Past 30 Days)**:
- Total accesses: 31
- Average retrieval time: 1m 15s
- Effectiveness: 4.75/5.0 ⭐

**Alerts**:
- ⚠️ 3 patterns unused for 6+ months (review for archival)
- ✅ All file references valid
- ✅ All code examples compile

---

**Last Generated**: 2025-11-20
**System Version**: v4.0.0
```

**Deliverable**: INDEX.md created and tested

- [ ] All error messages indexed
- [ ] All categories listed
- [ ] Top 20% identified
- [ ] File mappings complete

---

## Week 2: Validation & Integration

### Day 6: Validation Script

**Goal**: Automated quality checks

**File**: `lessons/scripts/validate.js`

```javascript
#!/usr/bin/env node

/**
 * Validates pattern files for:
 * - File references exist
 * - Code examples compile
 * - No duplicate IDs
 * - Required fields present
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');

function validatePattern(pattern, filepath) {
  const errors = [];

  // Required fields
  if (!pattern.id) errors.push('Missing id');
  if (!pattern.title) errors.push('Missing title');
  if (!pattern.symptoms || pattern.symptoms.length === 0) {
    errors.push('Missing symptoms');
  }

  // File references
  if (pattern.key_files) {
    pattern.key_files.forEach(file => {
      const fullPath = path.join(process.cwd(), '..', '..', file);
      if (!fs.existsSync(fullPath)) {
        errors.push(`File not found: ${file}`);
      }
    });
  }

  // Code examples
  if (pattern.solution.code_example) {
    const { before, after } = pattern.solution.code_example;

    [before, after].forEach((code, idx) => {
      if (!code) return;

      try {
        parse(code, {
          sourceType: 'module',
          plugins: ['typescript', 'jsx']
        });
      } catch (e) {
        errors.push(`Code example ${idx === 0 ? 'before' : 'after'} invalid: ${e.message}`);
      }
    });
  }

  return errors;
}

// Validate all patterns
const patternsDir = path.join(__dirname, '..', 'patterns');
const categories = fs.readdirSync(patternsDir);

let totalPatterns = 0;
let totalErrors = 0;
const seenIds = new Set();

for (const category of categories) {
  const categoryPath = path.join(patternsDir, category);
  if (!fs.statSync(categoryPath).isDirectory()) continue;

  const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.json'));

  for (const file of files) {
    totalPatterns++;
    const filepath = path.join(categoryPath, file);
    const pattern = JSON.parse(fs.readFileSync(filepath));

    // Check duplicate IDs
    if (seenIds.has(pattern.id)) {
      console.error(`❌ Duplicate ID: ${pattern.id} in ${filepath}`);
      totalErrors++;
    }
    seenIds.add(pattern.id);

    // Validate pattern
    const errors = validatePattern(pattern, filepath);

    if (errors.length > 0) {
      console.error(`❌ ${pattern.id} (${filepath}):`);
      errors.forEach(e => console.error(`   - ${e}`));
      totalErrors += errors.length;
    }
  }
}

console.log(`\n📊 Validation Results:`);
console.log(`Total patterns: ${totalPatterns}`);
console.log(`Total errors: ${totalErrors}`);

if (totalErrors === 0) {
  console.log('✅ All patterns valid!');
  process.exit(0);
} else {
  console.log('❌ Validation failed');
  process.exit(1);
}
```

**Run validation**:

```bash
cd lessons
npm install --save-dev @babel/parser
node scripts/validate.js

# Expected output:
# ✅ All patterns valid!
# Total patterns: 80
# Total errors: 0
```

**Deliverable**: Validation passing

- [ ] No duplicate IDs
- [ ] All file references valid
- [ ] All code examples compile
- [ ] All required fields present

### Day 7: Uncle Claude Integration

**Goal**: Update agent with YAML frontmatter

**File**: `.claude/agents/uncle-claude.md`

```yaml
---
name: uncle-claude
description: Memory augmentation agent retrieving solutions from 190+ debugging days across 10 categories (auth, database, React, WebSocket, build, testing, API, performance, security, docs). Use PROACTIVELY when encountering errors, implementing patterns, debugging issues, or preventing known anti-patterns. Returns code examples, incident references, and prevention strategies.
tools: [Read, Edit, Bash, Grep, Glob]
model: inherit
triggers:
  - pattern: "401.*error|authentication.*fail|jwt.*missing|strict.*auth"
    category: "auth"
    action: "Check lessons/INDEX.md for auth patterns"

  - pattern: "migration.*fail|schema.*drift|prisma.*out.*sync"
    category: "database"
    action: "Check lessons/INDEX.md for database patterns"

  - pattern: "memory.*leak|timer.*cleanup|websocket.*timeout"
    category: "websocket"
    action: "Check lessons/INDEX.md for websocket patterns"

  - pattern: "test.*fail|ci.*fail|environment.*variable"
    category: "testing"
    action: "Check lessons/INDEX.md for testing patterns"
---

# Uncle Claude - Lessons System v4 Agent

## Quick Access (v4 Workflow)

When encountering an issue:

1. **Read INDEX.md** (Fast symptom lookup)
   ```
   File: lessons/INDEX.md
   Time: <30 seconds
   ```

2. **Find pattern by symptom**
   - Search for error message
   - Get direct link to pattern JSON

3. **Read pattern file**
   ```
   File: lessons/patterns/{category}/{name}.json
   Structured: symptoms, root_cause, solution, prevention
   Time: <30 seconds
   ```

4. **Apply solution**
   - Copy code from solution.code_example.after
   - Reference solution.files_changed
   - Check prevention rules

5. **Track usage**
   - Update lessons/tracking/sign-in.md
   - Record retrieval time, pattern used, effectiveness

## Example Usage

**User error**: `401: Token missing restaurant context`

**My workflow**:
1. Read lessons/INDEX.md
2. Search "401: Token missing restaurant context"
3. Found: → CL-AUTH-001 (strict-auth-drift.json)
4. Read patterns/auth/strict-auth-drift.json
5. Solution: Use custom /api/v1/auth/login (not Supabase direct)
6. Update sign-in: ⭐⭐⭐⭐⭐ (saved 48 days)

Total time: <2 minutes (vs 8-12 min in v3)
```

**Test agent**:

```bash
# In Claude Code, trigger uncle-claude
# Type: "Getting 401 errors with JWT authentication"

# Expected:
# - Uncle Claude auto-invoked (YAML triggers)
# - Reads lessons/INDEX.md
# - Finds CL-AUTH-001
# - Returns solution
# - Updates sign-in sheet
```

**Deliverable**: Uncle Claude using v4

- [ ] YAML frontmatter added
- [ ] Triggers configured
- [ ] Test invocation successful
- [ ] Sign-in sheet updated

### Day 8: Git Hooks & IDE Integration

**Goal**: Proactive guidance for developers

**1. Git Pre-Commit Hook**

**File**: `.husky/pre-commit` (add to existing)

```bash
#!/bin/bash

# ... existing pre-commit checks ...

# Claude Lessons - High-Risk File Warnings
CHANGED_FILES=$(git diff --cached --name-only)

if echo "$CHANGED_FILES" | grep -q "server/src/middleware/auth.ts"; then
  echo ""
  echo "⚠️  MODIFYING HIGH-RISK FILE: auth.ts"
  echo "   📚 48 days of debugging history documented"
  echo "   📖 Review: lessons/generated/by-category/auth.md"
  echo ""
  echo "   ✅ Checklist:"
  echo "   - [ ] JWT includes restaurant_id, scope, user_id"
  echo "   - [ ] Test with STRICT_AUTH=true locally"
  echo "   - [ ] Middleware order: authenticate → validateRestaurantAccess → requireScopes"
  echo ""
fi

if echo "$CHANGED_FILES" | grep -q "supabase/migrations"; then
  echo ""
  echo "⚠️  DATABASE MIGRATION DETECTED"
  echo "   📚 30 days of schema drift incidents"
  echo "   📖 Review: lessons/generated/by-category/database.md"
  echo ""
  echo "   ✅ Post-Migration Checklist:"
  echo "   - [ ] Run 'npx prisma db pull' to sync schema"
  echo "   - [ ] Update RPC functions if schema changed"
  echo "   - [ ] Run ./scripts/post-migration-sync.sh"
  echo ""
fi

if echo "$CHANGED_FILES" | grep -q "useWebSocket\|WebSocket"; then
  echo ""
  echo "⚠️  MODIFYING WEBSOCKET CODE"
  echo "   📚 7 days of memory leak incidents"
  echo "   📖 Review: lessons/patterns/websocket/"
  echo ""
  echo "   ✅ Memory Leak Prevention:"
  echo "   - [ ] Store all timer IDs for cleanup"
  echo "   - [ ] Remove event listeners in useEffect cleanup"
  echo "   - [ ] Check connection guard flags (isConnecting)"
  echo ""
fi
```

**2. VS Code Snippets**

**File**: `.vscode/lessons.code-snippets`

```json
{
  "Auth JWT Check": {
    "prefix": "cl-auth-jwt",
    "body": [
      "// CL-AUTH-001: Ensure JWT has required fields",
      "// Required: restaurant_id (multi-tenancy), scope (RBAC), user_id (identity)",
      "// See: lessons/patterns/auth/strict-auth-drift.json",
      "const token = jwt.sign({",
      "  sub: user.id,",
      "  email: user.email,",
      "  role: user.role,",
      "  scope: userScopes,  // Fetch BEFORE creating JWT",
      "  restaurant_id: restaurantId  // CRITICAL for STRICT_AUTH",
      "}, process.env.KIOSK_JWT_SECRET);"
    ]
  },

  "WebSocket Timer Cleanup": {
    "prefix": "cl-ws-timer",
    "body": [
      "useEffect(() => {",
      "  const timerId = setInterval(() => {",
      "    $1",
      "  }, ${2:1000});",
      "  ",
      "  // CL-WS-001: Always cleanup timers to prevent memory leaks",
      "  return () => {",
      "    clearInterval(timerId);",
      "  };",
      "}, [${3}]);",
      "// See: lessons/patterns/websocket/timer-cleanup.json"
    ]
  },

  "Database Migration Warning": {
    "prefix": "cl-db-migration",
    "body": [
      "-- CL-DB-001: After deploying this migration:",
      "-- 1. Run: npx prisma db pull",
      "-- 2. Update RPC functions if schema changed",
      "-- 3. Run: ./scripts/post-migration-sync.sh",
      "-- See: lessons/patterns/database/schema-drift.json",
      "",
      "$1"
    ]
  }
}
```

**Deliverable**: Proactive guidance working

- [ ] Git hooks warn on high-risk files
- [ ] VS Code snippets available
- [ ] Tested with sample edits

### Day 9: CLAUDE.md Integration

**Goal**: Reference lessons in main project docs

**File**: `/CLAUDE.md` (add section)

```markdown
## Claude Lessons System

Quick access to 190+ days of debugging knowledge organized by symptom and category.

### Fast Symptom Lookup

📖 **[INDEX.md](lessons/INDEX.md)** - Start here for fastest results

**Common Issues**:
- 401 errors → [Auth patterns](lessons/generated/by-category/auth.md)
- Schema drift → [Database patterns](lessons/generated/by-category/database.md)
- Test failures → [Testing patterns](lessons/generated/by-category/testing.md)
- Memory leaks → [WebSocket patterns](lessons/generated/by-category/websocket.md)

### Invoke Uncle Claude

When encountering errors or implementing patterns:

```
@uncle-claude <problem description>
```

Uncle Claude will:
1. Search lessons/INDEX.md for symptom
2. Retrieve relevant pattern (JSON)
3. Apply proven solution
4. Track usage in sign-in sheet

### Example

```
You: Getting 401 errors after login works locally

Claude: Let me check the lessons system...
[Reads lessons/INDEX.md]
[Finds: "401: Token missing restaurant context" → CL-AUTH-001]
[Reads patterns/auth/strict-auth-drift.json]

This is CL-AUTH-001: STRICT_AUTH Environment Drift

Root Cause: Using Supabase direct auth (missing restaurant_id in JWT).
Production STRICT_AUTH=true requires this field.

Solution: Switch to custom auth endpoint /api/v1/auth/login

[Provides code example]

Saved: 48 days of debugging (documented 2025-10-01 to 2025-11-18)
```

### Commands

```bash
# Search patterns
npm run lessons:search "jwt"

# Find patterns for file
npm run lessons:find server/src/middleware/auth.ts

# Validate all patterns
npm run lessons:validate

# Rebuild documentation
npm run lessons:build
```
```

**Deliverable**: CLAUDE.md updated

- [ ] Lessons system referenced
- [ ] Quick links added
- [ ] Example usage shown

### Day 10: Package.json Scripts

**Goal**: Convenient commands for team

**File**: `package.json` (add to root)

```json
{
  "scripts": {
    "lessons:search": "node lessons/scripts/find.js",
    "lessons:find": "node lessons/scripts/find.js --file",
    "lessons:new": "node lessons/scripts/new-pattern.js",
    "lessons:build": "node lessons/scripts/build.js",
    "lessons:validate": "node lessons/scripts/validate.js",
    "lessons:analytics": "node lessons/scripts/analytics.js"
  }
}
```

**Deliverable**: Scripts configured

- [ ] All commands working
- [ ] Tested by team member
- [ ] Added to QUICK_START.md

---

## Week 3: Testing & Cutover

### Day 11-12: Parallel Testing

**Goal**: Validate v4 improves on v3

**Test Plan**:

```markdown
# v3 vs v4 Comparison Test

## Test Scenarios (Real issues from past 30 days)

1. **Auth 401 Error**
   - v3 time: _________ (manual timing)
   - v4 time: _________ (manual timing)
   - Found pattern: _________
   - Effectiveness: ⭐____

2. **Schema Drift**
   - v3 time: _________
   - v4 time: _________
   - Found pattern: _________
   - Effectiveness: ⭐____

3. **Memory Leak**
   - v3 time: _________
   - v4 time: _________
   - Found pattern: _________
   - Effectiveness: ⭐____

4. **Test CI Failure**
   - v3 time: _________
   - v4 time: _________
   - Found pattern: _________
   - Effectiveness: ⭐____

## Success Criteria

- [ ] v4 retrieval time <2 minutes for all scenarios
- [ ] v4 faster than v3 in all scenarios
- [ ] All patterns found (0 false negatives)
- [ ] Effectiveness ≥4.5 stars average
```

**Collect metrics**:

```bash
# For each test scenario:
# 1. Start timer
# 2. Find pattern using v3 (claude-lessons3/)
# 3. Record time
# 4. Find pattern using v4 (lessons/)
# 5. Record time
# 6. Compare
```

**Deliverable**: Test results documented

- [ ] 4+ scenarios tested
- [ ] v4 consistently faster
- [ ] No false negatives
- [ ] Results in `docs/reports/lessons-v4-test-results.md`

### Day 13: Team Training

**Goal**: Onboard team to v4

**Training Session** (1 hour):

```
Agenda:
1. Why v4? (10 min)
   - Show file size comparison
   - Demo retrieval speed difference
   - Explain single source of truth

2. New Structure Tour (15 min)
   - lessons/INDEX.md (fast lookup)
   - lessons/patterns/ (JSON files)
   - lessons/generated/ (auto-built)

3. Hands-On Practice (25 min)
   - Exercise 1: Find pattern by symptom
   - Exercise 2: Create new pattern (npm run lessons:new)
   - Exercise 3: Trigger Uncle Claude auto-invocation

4. Q&A (10 min)
```

**Documentation**:
- Update `lessons/QUICK_START.md`
- Create video walkthrough (5 min)
- Distribute to team

**Deliverable**: Team trained

- [ ] Training session completed
- [ ] QUICK_START.md finalized
- [ ] Video walkthrough recorded

### Day 14: Cutover & Archive

**Goal**: Replace v3 with v4

**Cutover Checklist**:

```bash
# 1. Final validation
npm run lessons:validate
npm run lessons:build

# 2. Archive v3
mkdir -p docs/archive/claude-lessons-v3
mv claude-lessons3/ docs/archive/claude-lessons-v3/

# 3. Add deprecation notice
cat > docs/archive/claude-lessons-v3/README.md << 'EOF'
# Claude Lessons v3 (ARCHIVED)

**Status**: Archived 2025-11-20
**Replaced By**: /lessons/ (v4.0)

This version is kept for historical reference only.
All content has been migrated to v4 format.

## Migration

- v3 LESSONS.md → v4 patterns/*.json
- v3 knowledge-base.json → v4 generated/knowledge.json
- v3 README per category → v4 generated/by-category/*.md

## Why Archived?

v4 improvements:
- 75% faster retrieval (<1 min vs 5-10 min)
- Zero duplication (single source of truth)
- Automated builds (no drift)
- Better indexing (symptom-first)

See: /lessons/QUICK_START.md for v4 usage
EOF

# 4. Update all references
grep -r "claude-lessons3" . --exclude-dir=node_modules --exclude-dir=.git
# Replace each with "lessons"

# 5. Commit
git add lessons/ docs/archive/claude-lessons-v3/ CLAUDE.md package.json
git commit -m "feat: migrate to Claude Lessons v4

- Single source of truth (JSON patterns)
- 75% faster retrieval (symptom index)
- Zero duplication (automated builds)
- Proactive integration (git hooks, IDE snippets)

Archived v3 to docs/archive/ for reference.

See: lessons/QUICK_START.md for usage guide"

# 6. Announce to team
# - Slack message with link to QUICK_START.md
# - Demo in next standup
```

**Rollback Plan** (if needed):

```bash
# Restore v3
mv docs/archive/claude-lessons-v3 claude-lessons3

# Revert references
git checkout HEAD^ CLAUDE.md package.json .claude/agents/uncle-claude.md

# Remove v4
rm -rf lessons/

# Communicate to team
echo "v4 rollback complete - v3 restored"
```

**Deliverable**: v4 live, v3 archived

- [ ] v3 archived with deprecation notice
- [ ] All references updated
- [ ] Git committed
- [ ] Team notified

---

## Post-Migration (30 Days)

### Monitoring Checklist

**Week 1**:
- [ ] 5+ sign-in sheet entries
- [ ] No errors reported
- [ ] Build scripts running successfully
- [ ] Validation passing in CI

**Week 2**:
- [ ] 10+ sign-in sheet entries
- [ ] Average retrieval time <1 minute
- [ ] Uncle Claude auto-invoked 3+ times
- [ ] Effectiveness ≥4.5 stars

**Week 4**:
- [ ] 20+ sign-in sheet entries
- [ ] Generate first v4 analytics report
- [ ] Identify unused patterns (>30 days)
- [ ] Collect feedback for v4.1 improvements

### Success Metrics (30-Day Target)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Retrieval time | <1 min | _____ | _____ |
| Effectiveness | ≥4.5 ⭐ | _____ | _____ |
| Sign-in entries | ≥20 | _____ | _____ |
| Build failures | 0 | _____ | _____ |
| Validation errors | 0 | _____ | _____ |

### Iteration Plan

Based on feedback:
- [ ] Improve INDEX.md symptom list
- [ ] Add missing patterns
- [ ] Refine JSON schema
- [ ] Optimize build scripts
- [ ] Archive unused patterns

---

## Appendix: Key Files

### Migration Scripts

- `lessons/scripts/extract-patterns.js` - v3 → v4 conversion
- `lessons/scripts/build.js` - Generate docs from JSON
- `lessons/scripts/validate.js` - Quality checks
- `lessons/scripts/new-pattern.js` - Interactive pattern creator

### Documentation

- `lessons/INDEX.md` - Fast symptom lookup
- `lessons/QUICK_START.md` - Team onboarding
- `lessons/generated/knowledge.json` - Unified knowledge base

### Integration

- `.claude/agents/uncle-claude.md` - Agent with YAML
- `.husky/pre-commit` - Git hook warnings
- `.vscode/lessons.code-snippets` - IDE snippets
- `CLAUDE.md` - Project reference

---

**Migration Plan Version**: 1.0
**Last Updated**: 2025-11-20
**Status**: Ready for execution
