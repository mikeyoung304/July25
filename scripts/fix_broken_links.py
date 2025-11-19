#!/usr/bin/env python3
"""
Link Repair Agent - Phase 3
Systematically fixes broken internal links in Restaurant OS documentation.

This script:
1. Scans all markdown files for internal links
2. Validates link targets exist
3. Attempts to find correct paths for broken links
4. Fixes links using intelligent pattern matching
5. Generates comprehensive report
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Tuple, Set
from collections import defaultdict
import json

# Base directory for the project
BASE_DIR = Path("/Users/mikeyoung/CODING/rebuild-6.0")
DOCS_DIR = BASE_DIR / "docs"

# Track statistics
stats = {
    "total_files_scanned": 0,
    "total_links_found": 0,
    "broken_links_found": 0,
    "links_fixed": 0,
    "links_unfixable": 0,
    "files_modified": 0
}

# Track fixes by pattern
fixes_by_pattern = defaultdict(int)
unfixable_links = []

# File location cache - build once, use many times
file_cache: Dict[str, List[Path]] = {}


def build_file_cache():
    """Build a cache of all markdown files by filename."""
    print("Building file cache...")
    for md_file in BASE_DIR.rglob("*.md"):
        # Skip node_modules and hidden directories
        if "node_modules" in md_file.parts or any(part.startswith('.') for part in md_file.parts[:-1]):
            continue

        filename = md_file.name
        if filename not in file_cache:
            file_cache[filename] = []
        file_cache[filename].append(md_file)

    print(f"Cached {sum(len(v) for v in file_cache.values())} files ({len(file_cache)} unique names)")


def extract_markdown_links(content: str) -> List[Tuple[str, str, str]]:
    """
    Extract markdown links from content.
    Returns: List of (full_match, link_text, link_url) tuples
    """
    # Pattern: [text](url)
    pattern = r'\[([^\]]+)\]\(([^)]+)\)'
    matches = re.finditer(pattern, content)

    links = []
    for match in matches:
        full_match = match.group(0)
        link_text = match.group(1)
        link_url = match.group(2)

        # Only process internal markdown links (no http://, https://, #anchors only)
        if not link_url.startswith(('http://', 'https://')) and '.md' in link_url:
            # Remove anchor if present
            clean_url = link_url.split('#')[0]
            if clean_url:  # Skip empty (anchor-only) links
                links.append((full_match, link_text, link_url))

    return links


def resolve_link(source_file: Path, link_url: str) -> Tuple[bool, Path]:
    """
    Resolve a relative link from source_file.
    Returns: (exists: bool, resolved_path: Path)
    """
    # Remove anchor
    clean_url = link_url.split('#')[0]

    # Resolve relative to source file's directory
    source_dir = source_file.parent
    target = (source_dir / clean_url).resolve()

    return target.exists(), target


def find_file_in_cache(filename: str) -> List[Path]:
    """Find all instances of a filename in the cache."""
    return file_cache.get(filename, [])


def calculate_relative_path(source: Path, target: Path) -> str:
    """Calculate relative path from source to target."""
    try:
        return os.path.relpath(target, source.parent)
    except ValueError:
        # Different drives on Windows
        return str(target)


def find_correct_path(source_file: Path, broken_link: str) -> str:
    """
    Attempt to find the correct path for a broken link.
    Returns: corrected link or original if no fix found
    """
    # Extract just the filename
    filename = Path(broken_link).name

    # Find all instances of this file
    candidates = find_file_in_cache(filename)

    if not candidates:
        return None

    # If only one candidate, use it
    if len(candidates) == 1:
        return calculate_relative_path(source_file, candidates[0])

    # Multiple candidates - use heuristics to pick the best one

    # Heuristic 1: Check if the original link structure gives us hints
    original_parts = Path(broken_link).parts

    best_match = None
    best_score = 0

    for candidate in candidates:
        score = 0
        candidate_parts = candidate.parts

        # Match directory structure
        for orig_part in original_parts[:-1]:  # Exclude filename
            if orig_part in candidate_parts:
                score += 2

        # Prefer files in docs directory
        if 'docs' in candidate_parts:
            score += 1

        # Prefer files not in archive
        if 'archive' not in candidate_parts:
            score += 3

        # Check for common directory patterns from the broken link
        if 'how-to' in original_parts and 'how-to' in candidate_parts:
            score += 5
        if 'reference' in original_parts and 'reference' in candidate_parts:
            score += 5
        if 'explanation' in original_parts and 'explanation' in candidate_parts:
            score += 5
        if 'tutorials' in original_parts and 'tutorials' in candidate_parts:
            score += 5

        if score > best_score:
            best_score = score
            best_match = candidate

    if best_match and best_score >= 3:  # Require minimum confidence
        return calculate_relative_path(source_file, best_match)

    # If still multiple good candidates, prefer the first non-archive one
    for candidate in candidates:
        if 'archive' not in candidate.parts:
            return calculate_relative_path(source_file, candidate)

    # Last resort: return first candidate
    return calculate_relative_path(source_file, candidates[0])


def fix_links_in_file(file_path: Path, dry_run: bool = False) -> Dict:
    """
    Fix broken links in a single file.
    Returns: Dict with statistics for this file
    """
    file_stats = {
        "links_found": 0,
        "broken_links": 0,
        "fixed_links": 0,
        "unfixable_links": 0,
        "fixes": []
    }

    try:
        content = file_path.read_text(encoding='utf-8')
        original_content = content
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return file_stats

    links = extract_markdown_links(content)
    file_stats["links_found"] = len(links)

    for full_match, link_text, link_url in links:
        exists, resolved_path = resolve_link(file_path, link_url)

        if not exists:
            file_stats["broken_links"] += 1

            # Try to find correct path
            corrected_link = find_correct_path(file_path, link_url)

            if corrected_link and corrected_link != link_url:
                # Preserve anchor if present
                anchor = ""
                if '#' in link_url:
                    anchor = '#' + link_url.split('#', 1)[1]

                new_link = corrected_link + anchor
                new_full_match = f"[{link_text}]({new_link})"

                # Verify the fix works
                fix_exists, _ = resolve_link(file_path, new_link)

                if fix_exists:
                    content = content.replace(full_match, new_full_match, 1)
                    file_stats["fixed_links"] += 1
                    file_stats["fixes"].append({
                        "old": link_url,
                        "new": new_link,
                        "text": link_text
                    })

                    # Track pattern
                    pattern_key = f"{Path(link_url).name} -> {Path(new_link).name}"
                    fixes_by_pattern[pattern_key] += 1
                else:
                    file_stats["unfixable_links"] += 1
                    unfixable_links.append({
                        "file": str(file_path.relative_to(BASE_DIR)),
                        "link": link_url,
                        "attempted_fix": new_link
                    })
            else:
                file_stats["unfixable_links"] += 1
                unfixable_links.append({
                    "file": str(file_path.relative_to(BASE_DIR)),
                    "link": link_url,
                    "reason": "No candidates found in file cache"
                })

    # Write changes if not dry run and content changed
    if not dry_run and content != original_content:
        try:
            file_path.write_text(content, encoding='utf-8')
            return file_stats
        except Exception as e:
            print(f"Error writing {file_path}: {e}")
            return file_stats

    return file_stats


def process_all_files(dry_run: bool = False):
    """Process all markdown files in the repository."""
    print(f"\n{'DRY RUN - ' if dry_run else ''}Processing markdown files...")

    # Find all markdown files
    md_files = []
    for ext in ['*.md', '*.MD']:
        md_files.extend(DOCS_DIR.rglob(ext))
        md_files.extend(BASE_DIR.glob(ext))  # Include root level

    # Remove duplicates and filter out node_modules
    md_files = list(set(md_files))
    md_files = [f for f in md_files if 'node_modules' not in f.parts and not any(part.startswith('.') for part in f.parts[:-1])]
    md_files.sort()

    stats["total_files_scanned"] = len(md_files)
    print(f"Found {len(md_files)} markdown files to process")

    modified_files = []

    for i, md_file in enumerate(md_files, 1):
        rel_path = md_file.relative_to(BASE_DIR)
        print(f"\r[{i}/{len(md_files)}] Processing {rel_path}...", end='', flush=True)

        file_stats = fix_links_in_file(md_file, dry_run=dry_run)

        stats["total_links_found"] += file_stats["links_found"]
        stats["broken_links_found"] += file_stats["broken_links"]
        stats["links_fixed"] += file_stats["fixed_links"]
        stats["links_unfixable"] += file_stats["unfixable_links"]

        if file_stats["fixed_links"] > 0:
            stats["files_modified"] += 1
            modified_files.append({
                "file": str(rel_path),
                "fixes": file_stats["fixes"],
                "count": file_stats["fixed_links"]
            })

    print()  # New line after progress
    return modified_files


def generate_report(modified_files: List[Dict], output_file: Path):
    """Generate a comprehensive report of all fixes."""
    report = []

    report.append("# Link Repair Report - Phase 3")
    report.append("")
    report.append(f"**Date:** {os.popen('date').read().strip()}")
    report.append(f"**Agent:** Link Repair Agent")
    report.append("")

    report.append("## Executive Summary")
    report.append("")
    report.append(f"- **Files Scanned:** {stats['total_files_scanned']}")
    report.append(f"- **Total Links Found:** {stats['total_links_found']}")
    report.append(f"- **Broken Links Found:** {stats['broken_links_found']}")
    report.append(f"- **Links Fixed:** {stats['links_fixed']}")
    report.append(f"- **Links Unfixable:** {stats['links_unfixable']}")
    report.append(f"- **Files Modified:** {stats['files_modified']}")
    report.append("")

    if stats['broken_links_found'] > 0:
        fix_rate = (stats['links_fixed'] / stats['broken_links_found']) * 100
        report.append(f"**Fix Rate:** {fix_rate:.1f}%")
        remaining = stats['broken_links_found'] - stats['links_fixed']
        report.append(f"**Remaining Broken Links:** {remaining}")
    report.append("")

    report.append("## Top Fix Patterns")
    report.append("")
    sorted_patterns = sorted(fixes_by_pattern.items(), key=lambda x: x[1], reverse=True)
    for pattern, count in sorted_patterns[:20]:
        report.append(f"- **{count}x** {pattern}")
    report.append("")

    report.append("## Files Modified")
    report.append("")
    report.append(f"Total: {len(modified_files)} files")
    report.append("")

    for file_info in sorted(modified_files, key=lambda x: x['count'], reverse=True)[:50]:
        report.append(f"### {file_info['file']}")
        report.append(f"**Fixes:** {file_info['count']}")
        report.append("")
        for fix in file_info['fixes'][:10]:  # Show first 10 fixes per file
            report.append(f"- `{fix['old']}` → `{fix['new']}`")
        if len(file_info['fixes']) > 10:
            report.append(f"- ... and {len(file_info['fixes']) - 10} more")
        report.append("")

    if len(modified_files) > 50:
        report.append(f"\n... and {len(modified_files) - 50} more files\n")

    report.append("## Unfixable Links")
    report.append("")
    report.append(f"Total: {len(unfixable_links)}")
    report.append("")

    # Group by file
    unfixable_by_file = defaultdict(list)
    for item in unfixable_links[:100]:  # Limit to first 100
        unfixable_by_file[item['file']].append(item)

    for file_path, items in sorted(unfixable_by_file.items()):
        report.append(f"### {file_path}")
        for item in items:
            report.append(f"- `{item['link']}`")
            if 'reason' in item:
                report.append(f"  - Reason: {item['reason']}")
            elif 'attempted_fix' in item:
                report.append(f"  - Attempted: `{item['attempted_fix']}` (still broken)")
        report.append("")

    if len(unfixable_links) > 100:
        report.append(f"\n... and {len(unfixable_links) - 100} more unfixable links\n")

    # Write report
    output_file.write_text('\n'.join(report), encoding='utf-8')
    print(f"\nReport written to: {output_file}")


def main():
    """Main execution function."""
    import argparse

    parser = argparse.ArgumentParser(description='Fix broken internal links in documentation')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be fixed without making changes')
    parser.add_argument('--report', default='link_repair_report.md', help='Report output file')
    args = parser.parse_args()

    print("=" * 80)
    print("Link Repair Agent - Phase 3")
    print("Restaurant OS Documentation Link Repair")
    print("=" * 80)

    # Build file cache
    build_file_cache()

    # Process all files
    modified_files = process_all_files(dry_run=args.dry_run)

    # Generate report
    report_path = BASE_DIR / args.report
    generate_report(modified_files, report_path)

    # Print summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Files scanned:       {stats['total_files_scanned']}")
    print(f"Total links:         {stats['total_links_found']}")
    print(f"Broken links:        {stats['broken_links_found']}")
    print(f"Links fixed:         {stats['links_fixed']}")
    print(f"Links unfixable:     {stats['links_unfixable']}")
    print(f"Files modified:      {stats['files_modified']}")

    if stats['broken_links_found'] > 0:
        fix_rate = (stats['links_fixed'] / stats['broken_links_found']) * 100
        remaining = stats['broken_links_found'] - stats['links_fixed']
        print(f"Fix rate:            {fix_rate:.1f}%")
        print(f"Remaining broken:    {remaining}")

    print("=" * 80)

    if args.dry_run:
        print("\nDRY RUN COMPLETE - No files were modified")
        print("Run without --dry-run to apply fixes")
    else:
        print(f"\nFIXES APPLIED - {stats['files_modified']} files modified")
        print(f"Review report at: {report_path}")


if __name__ == '__main__':
    main()
