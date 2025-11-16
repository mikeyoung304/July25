#!/bin/bash
# Pre-commit Hook for Documentation Validation
# Install: ln -s ../../scripts/pre-commit-docs-check.sh .git/hooks/pre-commit
# Or add to your existing pre-commit hook

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# Legitimate root-level files
LEGITIMATE_FILES=(
    "README.md"
    "CONTRIBUTING.md"
    "SECURITY.md"
    "index.md"
    "onward.md"
)

# Check if we're committing any .md files
md_files=$(git diff --cached --name-only --diff-filter=ACM | grep '\.md$')

if [ -z "$md_files" ]; then
    # No .md files in this commit, skip checks
    exit 0
fi

echo -e "${GREEN}Running documentation validation...${NC}"

# Check for root-level .md files that are being added/modified
root_md_files=$(echo "$md_files" | grep '^[^/]*\.md$')

if [ -n "$root_md_files" ]; then
    problems=0

    while IFS= read -r file; do
        if [ -z "$file" ]; then
            continue
        fi

        basename=$(basename "$file")
        is_legitimate=false

        # Check if file is in legitimate list
        for legit in "${LEGITIMATE_FILES[@]}"; do
            if [ "$basename" == "$legit" ]; then
                is_legitimate=true
                break
            fi
        done

        if [ "$is_legitimate" = false ]; then
            echo -e "${YELLOW}⚠ Warning: Adding root-level .md file: $file${NC}"
            echo -e "${YELLOW}  Consider placing in docs/ directory instead${NC}"
            problems=$((problems + 1))
        fi
    done <<< "$root_md_files"

    # Count total root-level .md files (including existing ones)
    total_root_files=$(find . -maxdepth 1 -name "*.md" -type f | wc -l | tr -d ' ')

    if [ $total_root_files -gt 15 ]; then
        echo -e "${RED}✗ Error: Too many root-level .md files ($total_root_files)${NC}"
        echo -e "${RED}  Maximum recommended: 10${NC}"
        echo -e "${YELLOW}  Run './scripts/cleanup-root-documentation.sh' to organize${NC}"
        exit 1
    elif [ $problems -gt 0 ]; then
        echo -e "${YELLOW}⚠ Found $problems root-level .md file(s) being committed${NC}"
        echo -e "${YELLOW}  Current total: $total_root_files root-level .md files${NC}"
        echo -e "${YELLOW}  Consider organizing documentation regularly${NC}"
    fi
fi

# Check for "Last Updated" in modified docs/ files
docs_files=$(echo "$md_files" | grep '^docs/.*\.md$')

if [ -n "$docs_files" ]; then
    missing_timestamp=()

    while IFS= read -r file; do
        if [ -z "$file" ] || [ ! -f "$file" ]; then
            continue
        fi

        # Skip archive and meta directories
        if [[ "$file" == *"/archive/"* ]] || [[ "$file" == *"/meta/"* ]]; then
            continue
        fi

        # Check for timestamp in first 30 lines
        if ! head -n 30 "$file" | grep -qi "Last Updated\|Last Modified\|Updated:"; then
            missing_timestamp+=("$file")
        fi
    done <<< "$docs_files"

    if [ ${#missing_timestamp[@]} -gt 0 ]; then
        echo -e "${YELLOW}⚠ Warning: Documentation files missing 'Last Updated' timestamp:${NC}"
        for file in "${missing_timestamp[@]}"; do
            echo -e "${YELLOW}    - $file${NC}"
        done
        echo -e "${YELLOW}  Add '**Last Updated**: YYYY-MM-DD' to the header${NC}"
    fi
fi

# Check for TODO or WIP in commit message (suggest draft PR)
commit_msg_file=".git/COMMIT_EDITMSG"
if [ -f "$commit_msg_file" ]; then
    if grep -qi "TODO\|WIP\|DRAFT" "$commit_msg_file"; then
        echo -e "${YELLOW}⚠ Commit message contains TODO/WIP/DRAFT${NC}"
        echo -e "${YELLOW}  Consider using a draft Pull Request for work in progress${NC}"
    fi
fi

echo -e "${GREEN}✓ Documentation validation complete${NC}"
exit 0
