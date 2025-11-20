# Claude Lessons CLI - Usage Examples

Real-world examples of using the lessons CLI in development workflows.

## Table of Contents

- [Quick Start](#quick-start)
- [Finding Lessons for Your Work](#finding-lessons-for-your-work)
- [Research and Discovery](#research-and-discovery)
- [Integration with Git Workflow](#integration-with-git-workflow)
- [CI/CD Integration](#cicd-integration)
- [Advanced Usage](#advanced-usage)

---

## Quick Start

### See all available categories

```bash
npm run list
```

**When to use:** Get an overview of all lesson categories and their impact.

---

### View system statistics

```bash
npm run stats
```

**When to use:** Understand the overall lessons system, costs, and severity distribution.

---

### Validate the lessons system

```bash
npm run validate
```

**When to use:** Ensure all lesson files and structure are intact before committing changes.

---

## Finding Lessons for Your Work

### Scenario 1: About to modify authentication middleware

```bash
$ node scripts/lessons-cli.cjs find "server/src/middleware/auth.ts"

Lessons for: server/src/middleware/auth.ts

1. Risk Level: CRITICAL
   Pattern: server/src/middleware/auth.ts
   Estimated Cost if Broken: $20K
   ⚠ Required Reading
   Lessons:
     - authentication-authorization (01)
   Documents: AI-AGENT-GUIDE.md, PATTERNS.md, PREVENTION.md
   Key Anti-Patterns:
     • JWT structure
     • middleware ordering
     • STRICT_AUTH

Summary:
  Total Potential Cost: $20K
  Maximum Risk Level: CRITICAL
  Patterns Matched: 1
```

**Action:** Read the required documents before making changes:
- `01-auth-authorization-issues/AI-AGENT-GUIDE.md`
- `01-auth-authorization-issues/PATTERNS.md`
- `01-auth-authorization-issues/PREVENTION.md`

---

### Scenario 2: Creating a new React component

```bash
$ node scripts/lessons-cli.cjs find "client/src/components/NewFeature.tsx"

Lessons for: client/src/components/NewFeature.tsx

1. Risk Level: MEDIUM
   Pattern: client/src/components/**/*.tsx
   Estimated Cost if Broken: $8K
   Lessons:
     - react-ui-ux (03)
   Documents: AI-AGENT-GUIDE.md, PATTERNS.md
   Key Anti-Patterns:
     • early return before AnimatePresence
     • unstable hook returns
     • non-deterministic renders
```

**Action:** Review React 18.3 patterns before implementing animations.

---

### Scenario 3: Modifying database schema

```bash
$ node scripts/lessons-cli.cjs find "supabase/migrations/20250119_add_feature.sql"

Lessons for: supabase/migrations/20250119_add_feature.sql

1. Risk Level: HIGH
   Pattern: supabase/migrations/*.sql
   Estimated Cost if Broken: $100K
   ⚠ Required Reading
   Lessons:
     - database-supabase (02)
   Documents: AI-AGENT-GUIDE.md, PREVENTION.md
   Key Anti-Patterns:
     • migration timestamp
     • RPC function types
```

**Action:** Follow the migration patterns and run post-migration sync.

---

## Research and Discovery

### Scenario 4: Learning about JWT implementation

```bash
$ node scripts/lessons-cli.cjs search "jwt"

Search results for: jwt

Tag Matches:
┌─────┬────────────┬───────────┬──────┐
│ Tag │ Categories │ Incidents │ Cost │
├─────┼────────────┼───────────┼──────┤
│ jwt │ 01         │ 3         │ $68K │
└─────┴────────────┴───────────┴──────┘

Category Matches:
┌────┬──────────────────────────────┬───────┬───────────┬───────────┐
│ ID │ Name                         │ Cost  │ Incidents │ Severity  │
├────┼──────────────────────────────┼───────┼───────────┼───────────┤
│ 01 │ authentication-authorization │ $100K │ 5         │ P0:4 P1:1 │
└────┴──────────────────────────────┴───────┴───────────┴───────────┘
```

**Action:** Dive deeper into category 01 for JWT patterns.

---

### Scenario 5: Understanding multi-tenancy requirements

```bash
$ node scripts/lessons-cli.cjs search "multi-tenancy"

Search results for: multi-tenancy

Tag Matches:
┌───────────────┬────────────┬───────────┬───────┐
│ Tag           │ Categories │ Incidents │ Cost  │
├───────────────┼────────────┼───────────┼───────┤
│ multi-tenancy │ 01, 09     │ 2         │ $1.0M │
└───────────────┴────────────┴───────────┴───────┘
```

**Shows:** Multi-tenancy spans authentication (01) and security (09) with $1M potential impact.

---

### Scenario 6: Deep dive into security compliance

```bash
$ node scripts/lessons-cli.cjs category "09"

Category 09: security-compliance

Overview:
  Path: 09-security-compliance-issues
  Total Cost: $1.0M
  Total Commits: 150
  Incidents: 2
  Patterns: 10
  Severity: P0:2

Tags:
  multi-tenancy, rbac, audit-logging, credentials, rls

Key Files:
  - server/src/middleware/restaurantAccess.ts
  - supabase/rls-policies/
  - server/src/middleware/rbac.ts

Documents:
  ✓ README: 09-security-compliance-issues/README.md
  ✓ INCIDENTS: 09-security-compliance-issues/INCIDENTS.md
  ✓ PATTERNS: 09-security-compliance-issues/PATTERNS.md
  ...

Related Files (from mappings):
  ● server/src/middleware/restaurantAccess.ts (critical)
  ● server/src/middleware/rbac.ts (critical)
  ● supabase/rls-policies/**/*.sql (critical)
```

**Action:** Read all documents before modifying security-critical files.

---

## Integration with Git Workflow

### Scenario 7: Pre-commit check for changed files

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Check changed files for relevant lessons

echo "Checking changed files for relevant lessons..."
echo ""

CHANGED_FILES=$(git diff --cached --name-only)
HIGH_RISK_FOUND=false

for file in $CHANGED_FILES; do
  # Check each TypeScript/JavaScript file
  if [[ "$file" =~ \.(ts|tsx|js|jsx)$ ]]; then
    OUTPUT=$(node claude-lessons3/scripts/lessons-cli.cjs find "$file" 2>/dev/null)

    if echo "$OUTPUT" | grep -q "CRITICAL\|HIGH"; then
      echo "⚠️  $file"
      echo "$OUTPUT"
      echo ""
      HIGH_RISK_FOUND=true
    fi
  fi
done

if [ "$HIGH_RISK_FOUND" = true ]; then
  echo "High-risk files detected. Please review relevant lessons."
  echo "Continue with commit? (y/n)"
  read -r response
  if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "Commit cancelled."
    exit 1
  fi
fi

exit 0
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

---

### Scenario 8: Branch-based lesson recommendations

When creating a feature branch:

```bash
#!/bin/bash
# create-feature-branch.sh

BRANCH_NAME=$1
FEATURE_AREA=$2

git checkout -b "feature/$BRANCH_NAME"

echo "Relevant lessons for $FEATURE_AREA:"
node claude-lessons3/scripts/lessons-cli.cjs search "$FEATURE_AREA"
```

Usage:

```bash
./create-feature-branch.sh voice-ordering openai
```

---

## CI/CD Integration

### Scenario 9: Automated PR comments

GitHub Actions workflow (`.github/workflows/lessons-check.yml`):

```yaml
name: Lessons Check

on:
  pull_request:
    paths:
      - 'server/**/*.ts'
      - 'client/**/*.tsx'
      - 'supabase/migrations/**/*.sql'

jobs:
  check-lessons:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd claude-lessons3
          npm install

      - name: Check changed files
        id: lessons
        run: |
          CHANGED_FILES=$(git diff --name-only origin/main...HEAD)

          for file in $CHANGED_FILES; do
            if [[ "$file" =~ \.(ts|tsx|sql)$ ]]; then
              node claude-lessons3/scripts/lessons-cli.cjs find "$file" --json >> lessons-output.json
            fi
          done

      - name: Comment PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const lessons = JSON.parse(fs.readFileSync('lessons-output.json', 'utf8'));

            let comment = '## 📚 Relevant Lessons\n\n';

            for (const lesson of lessons) {
              if (lesson.risk_level === 'critical' || lesson.risk_level === 'high') {
                comment += `### ⚠️ ${lesson.pattern}\n`;
                comment += `- **Risk:** ${lesson.risk_level}\n`;
                comment += `- **Cost if broken:** $${lesson.estimated_cost_if_broken}\n`;
                comment += `- **Documents:** ${lesson.documents.join(', ')}\n\n`;
              }
            }

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

---

### Scenario 10: Deployment gate

```bash
#!/bin/bash
# pre-deploy-check.sh

echo "Running pre-deployment validation..."

# Validate lessons structure
node claude-lessons3/scripts/lessons-cli.cjs validate --json > validation.json

if [ $? -ne 0 ]; then
  echo "❌ Lessons validation failed!"
  exit 1
fi

# Check for critical files in deployment
DEPLOY_FILES=$(git diff --name-only HEAD~1..HEAD)
CRITICAL_FOUND=false

for file in $DEPLOY_FILES; do
  RESULT=$(node claude-lessons3/scripts/lessons-cli.cjs find "$file" --json 2>/dev/null)

  if echo "$RESULT" | jq -e '.[] | select(.risk_level == "critical")' > /dev/null; then
    echo "⚠️  Critical file in deployment: $file"
    CRITICAL_FOUND=true
  fi
done

if [ "$CRITICAL_FOUND" = true ]; then
  echo "Critical files detected. Verify all lessons reviewed."
fi

echo "✅ Pre-deployment checks complete"
```

---

## Advanced Usage

### Scenario 11: Generate risk report for entire codebase

```bash
#!/bin/bash
# generate-risk-report.sh

OUTPUT_FILE="risk-report.md"
echo "# Codebase Risk Report" > $OUTPUT_FILE
echo "" >> $OUTPUT_FILE
echo "Generated: $(date)" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# Get all TypeScript files
find . -type f \( -name "*.ts" -o -name "*.tsx" \) | while read file; do
  RESULT=$(node claude-lessons3/scripts/lessons-cli.cjs find "$file" --json 2>/dev/null)

  if [ ! -z "$RESULT" ]; then
    RISK=$(echo "$RESULT" | jq -r '.[0].risk_level // "none"')
    COST=$(echo "$RESULT" | jq -r '.[0].estimated_cost_if_broken // 0')

    if [ "$RISK" != "none" ]; then
      echo "- **$file** - Risk: $RISK, Cost: \$$COST" >> $OUTPUT_FILE
    fi
  fi
done

echo "" >> $OUTPUT_FILE
echo "Report complete: $OUTPUT_FILE"
```

---

### Scenario 12: Cost analysis for feature areas

```bash
#!/bin/bash
# feature-cost-analysis.sh

FEATURE=$1

echo "Cost analysis for: $FEATURE"
echo ""

# Search for relevant categories
CATEGORIES=$(node claude-lessons3/scripts/lessons-cli.cjs search "$FEATURE" --json | jq -r '.categoryMatches[].id')

TOTAL_COST=0
for cat_id in $CATEGORIES; do
  COST=$(node claude-lessons3/scripts/lessons-cli.cjs category "$cat_id" --json | jq -r '.category.total_cost')
  TOTAL_COST=$((TOTAL_COST + COST))
done

echo "Total estimated cost for $FEATURE: \$$TOTAL_COST"
```

Usage:

```bash
./feature-cost-analysis.sh authentication
```

---

### Scenario 13: Team onboarding checklist

```bash
#!/bin/bash
# onboarding-checklist.sh

echo "🎓 New Team Member Onboarding - Lessons to Review"
echo ""
echo "Run this after reviewing the main documentation:"
echo ""

# Show all critical categories
node claude-lessons3/scripts/lessons-cli.cjs list --json | \
  jq -r '.[] | select(.severity.P0 > 0) | "- [ ] Category \(.id): \(.name) - \(.incident_count) incidents"'

echo ""
echo "High-priority tags to understand:"
echo ""

# Show top tags by cost
node claude-lessons3/scripts/lessons-cli.cjs --json stats | \
  jq -r '.summary.category_cost_breakdown | to_entries | sort_by(.value) | reverse | .[0:5] | .[] | "- [ ] \(.key) - $\(.value)"'
```

---

## Tips and Best Practices

### Use JSON output for automation

```bash
# Extract only critical files
node scripts/lessons-cli.cjs find "server/src/middleware/auth.ts" --json | \
  jq -r '.[] | select(.risk_level == "critical")'

# Get cost for specific category
node scripts/lessons-cli.cjs category "01" --json | jq -r '.category.total_cost'

# List all P0 incidents
node scripts/lessons-cli.cjs list --json | jq -r '.[] | select(.severity.P0 > 0) | .name'
```

### Combine with other tools

```bash
# Find all files matching a pattern and check lessons
find client/src/components -name "*.tsx" | while read file; do
  node scripts/lessons-cli.cjs find "$file"
done

# Check lessons for modified files in last commit
git diff --name-only HEAD~1 | while read file; do
  node scripts/lessons-cli.cjs find "$file"
done
```

### Create custom aliases

Add to `~/.bashrc` or `~/.zshrc`:

```bash
alias lessons='cd /path/to/rebuild-6.0/claude-lessons3 && node scripts/lessons-cli.cjs'
alias lessons-find='cd /path/to/rebuild-6.0/claude-lessons3 && node scripts/lessons-cli.cjs find'
alias lessons-stats='cd /path/to/rebuild-6.0/claude-lessons3 && node scripts/lessons-cli.cjs stats'
```

---

## Troubleshooting Examples

### File not matching any patterns

```bash
$ node scripts/lessons-cli.cjs find "some/random/file.ts"

No lessons found for file: some/random/file.ts
Try searching by tag or category instead.
```

**Solution:** Search by related topic instead:

```bash
node scripts/lessons-cli.cjs search "performance"
```

### Validation fails

```bash
$ npm run validate

✗ Found 2 issue(s):
  - Missing directory: 01-auth-authorization-issues
  - 01-auth-authorization-issues/PATTERNS.md not found
```

**Solution:** Restore missing files from git or regenerate documentation.

---

## See Also

- [CLI README](README.md) - Full command reference
- [../README.md](../README.md) - Main lessons documentation
- [../AI_AGENT_MASTER_GUIDE.md](../AI_AGENT_MASTER_GUIDE.md) - Guide for AI agents
