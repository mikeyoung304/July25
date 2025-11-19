#!/usr/bin/env python3
"""
Link Validation Script - Phase 3
Validates that all internal links in markdown files are working.
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Tuple
from collections import defaultdict

BASE_DIR = Path("/Users/mikeyoung/CODING/rebuild-6.0")
DOCS_DIR = BASE_DIR / "docs"

stats = {
    "total_files": 0,
    "total_links": 0,
    "valid_links": 0,
    "broken_links": 0
}

broken_links = []


def extract_markdown_links(content: str) -> List[Tuple[str, str]]:
    """Extract markdown links. Returns: List of (link_text, link_url) tuples"""
    pattern = r'\[([^\]]+)\]\(([^)]+)\)'
    matches = re.finditer(pattern, content)

    links = []
    for match in matches:
        link_text = match.group(1)
        link_url = match.group(2)

        # Only process internal markdown links
        if not link_url.startswith(('http://', 'https://')) and '.md' in link_url:
            # Remove anchor
            clean_url = link_url.split('#')[0]
            if clean_url:
                links.append((link_text, link_url))

    return links


def validate_link(source_file: Path, link_url: str) -> bool:
    """Validate that a relative link exists"""
    # Remove anchor
    clean_url = link_url.split('#')[0]

    # Resolve relative to source file's directory
    source_dir = source_file.parent
    target = (source_dir / clean_url).resolve()

    return target.exists()


def validate_file(file_path: Path) -> Dict:
    """Validate all links in a file"""
    file_stats = {
        "links": 0,
        "valid": 0,
        "broken": 0,
        "broken_list": []
    }

    try:
        content = file_path.read_text(encoding='utf-8')
    except Exception as e:
        return file_stats

    links = extract_markdown_links(content)
    file_stats["links"] = len(links)

    for link_text, link_url in links:
        if validate_link(file_path, link_url):
            file_stats["valid"] += 1
        else:
            file_stats["broken"] += 1
            file_stats["broken_list"].append((link_text, link_url))
            broken_links.append({
                "file": str(file_path.relative_to(BASE_DIR)),
                "link_text": link_text,
                "link_url": link_url
            })

    return file_stats


def main():
    """Main validation function"""
    print("=" * 80)
    print("Link Validation - Phase 3")
    print("Validating all internal markdown links")
    print("=" * 80)

    # Find all markdown files
    md_files = []
    for ext in ['*.md', '*.MD']:
        md_files.extend(DOCS_DIR.rglob(ext))
        md_files.extend(BASE_DIR.glob(ext))

    # Remove duplicates and filter
    md_files = list(set(md_files))
    md_files = [f for f in md_files if 'node_modules' not in f.parts
                and not any(part.startswith('.') for part in f.parts[:-1])]
    md_files.sort()

    stats["total_files"] = len(md_files)
    print(f"Found {len(md_files)} markdown files to validate\n")

    files_with_broken_links = []

    for i, md_file in enumerate(md_files, 1):
        rel_path = md_file.relative_to(BASE_DIR)
        print(f"\r[{i}/{len(md_files)}] Validating {rel_path}...", end='', flush=True)

        file_stats = validate_file(md_file)
        stats["total_links"] += file_stats["links"]
        stats["valid_links"] += file_stats["valid"]
        stats["broken_links"] += file_stats["broken"]

        if file_stats["broken"] > 0:
            files_with_broken_links.append({
                "file": str(rel_path),
                "broken_count": file_stats["broken"],
                "broken_links": file_stats["broken_list"]
            })

    print("\n")

    # Print summary
    print("=" * 80)
    print("VALIDATION SUMMARY")
    print("=" * 80)
    print(f"Files scanned:       {stats['total_files']}")
    print(f"Total links:         {stats['total_links']}")
    print(f"Valid links:         {stats['valid_links']}")
    print(f"Broken links:        {stats['broken_links']}")

    if stats['total_links'] > 0:
        health_rate = (stats['valid_links'] / stats['total_links']) * 100
        print(f"Link health:         {health_rate:.1f}%")

    print("=" * 80)

    if stats['broken_links'] > 0:
        print(f"\nWARNING: {stats['broken_links']} broken links found")
        print(f"Files affected: {len(files_with_broken_links)}")

        print("\nTop 20 files with broken links:")
        for i, file_info in enumerate(sorted(files_with_broken_links,
                                             key=lambda x: x['broken_count'],
                                             reverse=True)[:20], 1):
            print(f"{i}. {file_info['file']} - {file_info['broken_count']} broken links")
            for link_text, link_url in file_info['broken_links'][:5]:
                print(f"   - {link_url}")
            if len(file_info['broken_links']) > 5:
                print(f"   - ... and {len(file_info['broken_links']) - 5} more")

        return 1
    else:
        print("\n✅ All links are valid!")
        return 0


if __name__ == '__main__':
    exit(main())
