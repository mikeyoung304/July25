# Claude Lessons 3.0 CLI Tool

A comprehensive command-line interface for navigating and querying the Claude Lessons 3.0 catalog.

## Installation

From the `claude-lessons3` directory:

```bash
npm install
```

## Usage

```bash
node scripts/lessons-cli.cjs [command] [options]
```

Or make it globally accessible by linking:

```bash
npm link
lessons [command] [options]
```

## Commands

### `lessons list`

List all 10 lesson categories with their costs, incidents, and severity levels.

```bash
node scripts/lessons-cli.cjs list
```

**Output:** Formatted table showing all categories with totals.

---

### `lessons find <file>`

Find lessons relevant to a specific file path. Uses glob pattern matching.

```bash
node scripts/lessons-cli.cjs find "server/src/middleware/auth.ts"
node scripts/lessons-cli.cjs find "client/src/components/OrderList.tsx"
```

**Shows:**
- Risk level (color-coded)
- Matching patterns
- Related lessons
- Required reading indicator
- Key anti-patterns
- Estimated cost if broken
- Summary with total potential cost

**Risk Levels:**
- 🔴 **CRITICAL** - Production outages or security breaches ($50K-$1M)
- 🟡 **HIGH** - Significant bugs or deployment failures ($10K-$50K)
- 🔵 **MEDIUM** - Moderate bugs or quality issues ($2K-$10K)
- 🟢 **LOW** - Minimal risk impact ($0-$2K)

---

### `lessons search <keyword>`

Search lessons by tag or topic.

```bash
node scripts/lessons-cli.cjs search "jwt"
node scripts/lessons-cli.cjs search "multi-tenancy"
node scripts/lessons-cli.cjs search "react"
```

**Shows:**
- Tag matches with incident counts and costs
- Category matches with full details
- Formatted tables for easy scanning

---

### `lessons category <id>`

Show detailed information about a specific category.

```bash
node scripts/lessons-cli.cjs category "01"
node scripts/lessons-cli.cjs category "authentication-authorization"
```

**Shows:**
- Full category overview
- Tags and related ADRs
- Key files
- Available documents (with existence checks)
- Related files from mappings

---

### `lessons stats`

Display aggregate metrics and statistics.

```bash
node scripts/lessons-cli.cjs stats
```

**Shows:**
- Overview (version, categories, documents)
- Financial impact (total cost, prevented losses)
- Engineering effort (hours, commits)
- Severity distribution
- Cost breakdown by category

---

### `lessons validate`

Validate the lessons structure and integrity.

```bash
node scripts/lessons-cli.cjs validate
```

**Checks:**
- ✓ index.json exists and is valid JSON
- ✓ .file-mappings.json exists and is valid JSON
- ✓ All 10 category directories exist
- ✓ All expected documents are present

**Exit Codes:**
- `0` - All validations passed
- `1` - Validation errors found

---

## Global Options

### `--json`

Output results as JSON instead of formatted tables.

```bash
node scripts/lessons-cli.cjs list --json
node scripts/lessons-cli.cjs stats --json
node scripts/lessons-cli.cjs find "server/src/middleware/auth.ts" --json
```

Useful for:
- Programmatic processing
- CI/CD integration
- Scripting and automation

---

### `--help`

Show help for any command.

```bash
node scripts/lessons-cli.cjs --help
node scripts/lessons-cli.cjs find --help
```

---

## Examples

### Example 1: Before modifying auth middleware

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

### Example 2: Research security patterns

```bash
$ node scripts/lessons-cli.cjs search "rbac"

Search results for: rbac

Tag Matches:
┌──────┬────────────┬───────────┬───────┐
│ Tag  │ Categories │ Incidents │ Cost  │
├──────┼────────────┼───────────┼───────┤
│ rbac │ 01, 09     │ 2         │ $53K  │
└──────┴────────────┴───────────┴───────┘
```

### Example 3: Deep dive into category

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
  ...
```

### Example 4: Quick validation

```bash
$ node scripts/lessons-cli.cjs validate

✓ index.json is valid JSON
✓ .file-mappings.json is valid JSON

Checking category directories...
✓ 01-auth-authorization-issues
✓ 02-database-supabase-issues
...

✓ All validations passed!
```

---

## Integration with Development Workflow

### Pre-commit Hook

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Check changed files for relevant lessons

CHANGED_FILES=$(git diff --cached --name-only)

for file in $CHANGED_FILES; do
  if [[ "$file" =~ \.(ts|tsx|js|jsx)$ ]]; then
    node claude-lessons3/scripts/lessons-cli.cjs find "$file" 2>/dev/null
  fi
done
```

### CI/CD Integration

Use JSON output for automated checks:

```bash
# Get high-risk files
node scripts/lessons-cli.cjs find "$FILE" --json | jq -r '.[] | select(.risk_level == "critical")'

# Validate before deploy
node scripts/lessons-cli.cjs validate --json
```

---

## File Structure

```
claude-lessons3/
├── scripts/
│   ├── lessons-cli.cjs       # Main CLI tool
│   └── README.md             # This file
├── index.json                # Lesson catalog
├── .file-mappings.json       # File-to-lesson mappings
└── package.json              # Dependencies
```

---

## Dependencies

- **commander** - CLI framework
- **chalk@4.1.2** - Terminal colors (CommonJS compatible)
- **cli-table3** - ASCII tables
- **minimatch** - Glob pattern matching

---

## Development

### Adding New Commands

1. Add command handler function
2. Register command with `program.command()`
3. Support `--json` option
4. Handle errors gracefully
5. Update this README

### Testing

```bash
# Test all commands
node scripts/lessons-cli.cjs list
node scripts/lessons-cli.cjs stats
node scripts/lessons-cli.cjs validate
node scripts/lessons-cli.cjs find "server/src/middleware/auth.ts"
node scripts/lessons-cli.cjs search "jwt"
node scripts/lessons-cli.cjs category "01"
```

---

## Troubleshooting

### Module not found errors

```bash
cd claude-lessons3
npm install --no-save commander chalk@4.1.2 cli-table3 minimatch
```

### Permission denied

```bash
chmod +x scripts/lessons-cli.cjs
```

### JSON files not found

Ensure you're running from the `claude-lessons3` directory or provide absolute paths.

---

## License

Part of the Claude Lessons 3.0 system. See parent directory for licensing.
