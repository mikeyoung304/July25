# TODO-179: sed -i syntax incompatible with macOS

## Status: pending
## Priority: P2 (Important - schema sync fails on macOS)
## Category: build-errors
## Tags: shell, sed, macos, bsd

## Problem Statement

The post-migration sync script uses GNU sed syntax that fails on macOS:

**Location:** `scripts/post-migration-sync.sh` lines 46-49

```bash
sed -i.bak 's/pattern/replacement/' prisma/schema.prisma
```

**BSD (macOS) vs GNU (Linux) difference:**
- GNU sed: `sed -i.bak` (no space, backup suffix attached)
- BSD sed: `sed -i .bak` (space required between -i and suffix)
- BSD sed: `sed -i ''` (empty string for no backup)

**Error on macOS:**
```
sed: invalid option -- i.
```

**Impact:**
- Prisma schema patching fails on macOS
- @ignore attributes not added
- Type generation proceeds with incorrect schema

## Proposed Solution

Use portable sed pattern:

```bash
# Cross-platform sed in-place edit
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS (BSD sed)
  sed -i '' 's/pattern/replacement/' file
else
  # Linux (GNU sed)
  sed -i 's/pattern/replacement/' file
fi

# Or use temp file approach (most portable):
sed 's/pattern/replacement/' file > file.tmp && mv file.tmp file
```

## Acceptance Criteria

- [ ] `scripts/post-migration-sync.sh` works on macOS
- [ ] `scripts/post-migration-sync.sh` works on Linux
- [ ] Schema patching creates correct @ignore attributes
- [ ] No .bak files left behind

## Related

- CL-BUILD-003: BSD/GNU differences
