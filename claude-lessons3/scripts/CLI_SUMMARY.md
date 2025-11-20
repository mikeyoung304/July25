# Claude Lessons CLI - Quick Summary

## Installation

```bash
cd claude-lessons3
npm install
```

## Quick Reference

| Command | Description | Example |
|---------|-------------|---------|
| `lessons list` | Show all 10 categories | `npm run list` |
| `lessons stats` | Aggregate metrics | `npm run stats` |
| `lessons find <file>` | Find lessons for file | `node scripts/lessons-cli.cjs find "server/src/middleware/auth.ts"` |
| `lessons search <tag>` | Search by tag/topic | `node scripts/lessons-cli.cjs search "jwt"` |
| `lessons category <id>` | Category details | `node scripts/lessons-cli.cjs category "01"` |
| `lessons validate` | Validate structure | `npm run validate` |

## Output Options

Add `--json` to any command for JSON output:

```bash
node scripts/lessons-cli.cjs stats --json
node scripts/lessons-cli.cjs find "server/src/middleware/auth.ts" --json
```

## Risk Levels

- **CRITICAL** (red) - $50K-$1M potential cost
- **HIGH** (yellow) - $10K-$50K potential cost
- **MEDIUM** (blue) - $2K-$10K potential cost
- **LOW** (green) - $0-$2K potential cost

## Key Features

1. **Glob Pattern Matching** - Automatically matches file paths to lesson categories
2. **Color-Coded Output** - Risk levels clearly indicated with colors
3. **JSON Support** - Easy integration with scripts and CI/CD
4. **Comprehensive Validation** - Ensures lessons structure integrity
5. **Tag-Based Search** - Find lessons by topic or pattern

## Most Common Use Cases

### Before Modifying Critical Files

```bash
node scripts/lessons-cli.cjs find "server/src/middleware/auth.ts"
```

### Research a Topic

```bash
node scripts/lessons-cli.cjs search "multi-tenancy"
```

### Learn About a Category

```bash
node scripts/lessons-cli.cjs category "09"
```

### Pre-Deployment Check

```bash
npm run validate
```

## Integration Examples

### Pre-commit Hook

```bash
# In .git/hooks/pre-commit
for file in $(git diff --cached --name-only); do
  node claude-lessons3/scripts/lessons-cli.cjs find "$file"
done
```

### CI/CD Pipeline

```yaml
# In .github/workflows/lessons-check.yml
- name: Check Lessons
  run: |
    node claude-lessons3/scripts/lessons-cli.cjs validate
    # Check changed files for high-risk patterns
```

## Files

- `lessons-cli.cjs` - Main CLI tool (714 lines)
- `README.md` - Complete documentation
- `EXAMPLES.md` - Real-world usage examples
- `CLI_SUMMARY.md` - This file

## Statistics

- **Total Categories:** 10
- **Total Cost:** $1.3M
- **Total Incidents:** 50
- **Total Commits Analyzed:** 1,750
- **Engineering Hours:** 600
- **File Mappings:** 45+

## Dependencies

- commander@12.1.0
- chalk@4.1.2 (CommonJS compatible)
- cli-table3@0.6.5
- minimatch@10.0.1

## Exit Codes

- `0` - Success
- `1` - Error or validation failure

## Documentation

- Full docs: [README.md](README.md)
- Examples: [EXAMPLES.md](EXAMPLES.md)
- Main lessons: [../README.md](../README.md)

## Support

For issues or questions:
1. Check [README.md](README.md) for detailed documentation
2. Review [EXAMPLES.md](EXAMPLES.md) for usage patterns
3. Run `node scripts/lessons-cli.cjs --help`
