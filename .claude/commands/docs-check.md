---
description: Quick documentation validation check before committing
---

# Documentation Check

Run quick local validation of documentation before committing changes.

## Your Task

Perform a fast pre-commit check of documentation quality. Use simple bash commands to validate:

1. **Broken Links** - Find markdown links pointing to non-existent files
2. **Missing Dates** - Identify docs missing "Last Updated"
3. **Bloat Warning** - Flag files >1000 lines

## Execution

```bash
echo "🔍 Quick Documentation Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Check for broken internal links
echo "📎 Checking internal links..."
BROKEN=0
find docs -name "*.md" -type f 2>/dev/null | while read file; do
  grep -oE '\]\([^)]+\)' "$file" 2>/dev/null | sed 's/](\(.*\))/\1/' | while read link; do
    [[ "$link" =~ ^https?:// ]] && continue
    [[ "$link" =~ ^mailto: ]] && continue
    [[ "$link" =~ ^# ]] && continue

    file_path="${link%%#*}"
    [[ -z "$file_path" ]] && continue

    dir=$(dirname "$file")
    if [[ "$file_path" =~ ^/ ]]; then
      target=".$file_path"
    else
      target="$dir/$file_path"
    fi

    if [ ! -f "$target" ] && [ ! -d "$target" ]; then
      echo "  ❌ $file → $link (broken)"
      BROKEN=$((BROKEN + 1))
    fi
  done
done

if [ $BROKEN -eq 0 ]; then
  echo "  ✅ All links valid"
fi

echo ""

# 2. Check for missing Last Updated dates
echo "📅 Checking Last Updated dates..."
MISSING=$(find docs -name "*.md" -type f -not -path "docs/archive/*" 2>/dev/null | \
  while read f; do grep -L "Last Updated" "$f" 2>/dev/null; done | wc -l)

if [ $MISSING -gt 0 ]; then
  echo "  ⚠️  $MISSING files missing 'Last Updated' date"
else
  echo "  ✅ All files have dates"
fi

echo ""

# 3. Check for bloated files
echo "📏 Checking for bloat (>1000 lines)..."
LARGE=$(find docs -name "*.md" -type f -exec wc -l {} \; 2>/dev/null | \
  awk '$1 > 1000 {print "  ⚠️ ", $2, "("$1" lines)"}')

if [ -n "$LARGE" ]; then
  echo "$LARGE"
else
  echo "  ✅ No bloated files"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Documentation check complete"
```

## Output Format

Present results concisely:
- ✅ for passing checks
- ⚠️  for warnings (non-blocking)
- ❌ for errors (should fix)

## Notes

- This is a **quick check** for common issues
- Full validation runs in CI via `.github/workflows/docs-check.yml`
- Focus on catching obvious problems before pushing
