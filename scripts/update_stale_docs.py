#!/usr/bin/env python3
"""
Update Stale Documentation Script
Automatically updates outdated documentation with current information
"""

import os
import re
from datetime import datetime
from pathlib import Path

# Current version from package.json
CURRENT_VERSION = "6.0.14"
TODAY = datetime.now().strftime("%Y-%m-%d")

class DocumentationUpdater:
    def __init__(self, dry_run=False):
        self.dry_run = dry_run
        self.changes = []
        self.files_updated = 0

    def update_file(self, filepath, updates):
        """Apply updates to a file"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            original = content

            for update in updates:
                if update['type'] == 'replace':
                    content = content.replace(update['old'], update['new'])
                elif update['type'] == 'regex':
                    content = re.sub(update['pattern'], update['replacement'], content)
                elif update['type'] == 'add_timestamp':
                    # Add or update timestamp
                    if "**Last Updated:**" in content:
                        content = re.sub(
                            r'\*\*Last Updated:\*\* \d{4}-\d{2}-\d{2}',
                            f'**Last Updated:** {TODAY}',
                            content
                        )
                    else:
                        # Add after first header
                        lines = content.split('\n')
                        for i, line in enumerate(lines):
                            if line.startswith('#'):
                                lines.insert(i + 1, f'\n**Last Updated:** {TODAY}')
                                break
                        content = '\n'.join(lines)

            if content != original:
                if not self.dry_run:
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(content)

                self.files_updated += 1
                self.changes.append({
                    'file': filepath,
                    'updates': len(updates)
                })
                return True
            return False

        except Exception as e:
            print(f"❌ Error updating {filepath}: {e}")
            return False

    def fix_versions(self):
        """Fix all version mismatches"""
        version_updates = [
            {
                'file': 'SECURITY.md',
                'updates': [
                    {'type': 'replace', 'old': 'v6.0.8', 'new': CURRENT_VERSION},
                    {'type': 'replace', 'old': '6.0.8', 'new': CURRENT_VERSION},
                    {'type': 'add_timestamp'}
                ]
            },
            {
                'file': 'docs/PRODUCTION_STATUS.md',
                'updates': [
                    {'type': 'replace', 'old': 'v6.0.15', 'new': f'v{CURRENT_VERSION}'},
                    {'type': 'replace', 'old': '6.0.15', 'new': CURRENT_VERSION},
                    {'type': 'add_timestamp'}
                ]
            },
            {
                'file': 'docs/reference/config/AUTH_ROLES.md',
                'updates': [
                    {'type': 'replace', 'old': 'v6.0.15', 'new': f'v{CURRENT_VERSION}'},
                    {'type': 'replace', 'old': '6.0.15', 'new': CURRENT_VERSION},
                    {'type': 'add_timestamp'}
                ]
            },
            {
                'file': 'docs/tutorials/GETTING_STARTED.md',
                'updates': [
                    {'type': 'regex',
                     'pattern': r'v6\.0\.\d+',
                     'replacement': f'v{CURRENT_VERSION}'},
                    {'type': 'add_timestamp'}
                ]
            }
        ]

        print("📝 Fixing version numbers...")
        for item in version_updates:
            filepath = Path(item['file'])
            if filepath.exists():
                if self.update_file(filepath, item['updates']):
                    print(f"  ✅ Updated {item['file']}")
            else:
                print(f"  ⚠️  File not found: {item['file']}")

    def fix_api_paths(self):
        """Fix incorrect API paths"""
        api_updates = [
            {
                'file': 'docs/learning-path/01_APP_OVERVIEW.md',
                'updates': [
                    {'type': 'replace',
                     'old': '/payments/process',
                     'new': '/payments/create'},
                    {'type': 'replace',
                     'old': '/api/v1/sync',
                     'new': '/api/v1/menu/sync'},
                    {'type': 'add_timestamp'}
                ]
            },
            {
                'file': 'docs/how-to/operations/runbooks/PRODUCTION_DEPLOYMENT_CHECKLIST.md',
                'updates': [
                    {'type': 'replace',
                     'old': '/payments/process',
                     'new': '/payments/create'},
                    {'type': 'add_timestamp'}
                ]
            }
        ]

        print("🔗 Fixing API paths...")
        for item in api_updates:
            filepath = Path(item['file'])
            if filepath.exists():
                if self.update_file(filepath, item['updates']):
                    print(f"  ✅ Updated {item['file']}")
            else:
                print(f"  ⚠️  File not found: {item['file']}")

    def fix_security_issues(self):
        """Fix security-related documentation issues"""
        security_updates = [
            {
                'file': 'docs/reference/config/ENVIRONMENT.md',
                'updates': [
                    # Remove VITE_OPENAI_API_KEY from client variables
                    {'type': 'regex',
                     'pattern': r'\| VITE_OPENAI_API_KEY.*?\|\n',
                     'replacement': ''},
                    # Add security warning
                    {'type': 'replace',
                     'old': '## Client Environment Variables',
                     'new': '## Client Environment Variables\n\n⚠️ **Security Note:** OpenAI API keys should NEVER be exposed to the client. They are handled server-side only.\n'},
                    {'type': 'add_timestamp'}
                ]
            }
        ]

        print("🔒 Fixing security issues...")
        for item in security_updates:
            filepath = Path(item['file'])
            if filepath.exists():
                if self.update_file(filepath, item['updates']):
                    print(f"  ✅ Updated {item['file']}")
            else:
                print(f"  ⚠️  File not found: {item['file']}")

    def update_feature_status(self):
        """Update feature status to reflect reality"""
        feature_updates = [
            {
                'file': 'docs/reference/api/WEBSOCKET_EVENTS.md',
                'updates': [
                    # Mark notifications as planned, not implemented
                    {'type': 'replace',
                     'old': 'kitchen_notification (working)',
                     'new': 'kitchen_notification (PLANNED - Phase 3)'},
                    {'type': 'replace',
                     'old': 'customer_notification (working)',
                     'new': 'customer_notification (PLANNED - Phase 3)'},
                    {'type': 'replace',
                     'old': 'refund_notification (working)',
                     'new': 'refund_notification (PLANNED - Phase 3)'},
                    {'type': 'add_timestamp'}
                ]
            }
        ]

        print("✨ Updating feature status...")
        for item in feature_updates:
            filepath = Path(item['file'])
            if filepath.exists():
                if self.update_file(filepath, item['updates']):
                    print(f"  ✅ Updated {item['file']}")
            else:
                print(f"  ⚠️  File not found: {item['file']}")

    def add_auth_evolution_notes(self):
        """Add notes about authentication evolution"""
        auth_note = """
## Authentication Evolution Note

This system has undergone 3 major authentication rewrites:
1. **Phase 1**: Custom JWT + RLS (July-Sept 2025)
2. **Phase 2**: Pure Supabase Auth (Oct 2025, failed)
3. **Phase 3**: Dual Authentication Pattern (Nov 2025, current)

See [ADR-011: Authentication Evolution](../architecture-decisions/ADR-011-authentication-evolution.md) for complete history.
"""

        auth_updates = [
            {
                'file': 'docs/explanation/architecture/AUTHENTICATION_ARCHITECTURE.md',
                'updates': [
                    {'type': 'replace',
                     'old': '## Overview',
                     'new': auth_note + '\n## Overview'},
                    {'type': 'add_timestamp'}
                ]
            }
        ]

        print("🔐 Adding authentication evolution notes...")
        for item in auth_updates:
            filepath = Path(item['file'])
            if filepath.exists():
                if self.update_file(filepath, item['updates']):
                    print(f"  ✅ Updated {item['file']}")
            else:
                print(f"  ⚠️  File not found: {item['file']}")

    def generate_report(self):
        """Generate update report"""
        report = f"""
# Stale Documentation Update Report
**Generated:** {TODAY}
**Mode:** {'DRY RUN' if self.dry_run else 'LIVE UPDATE'}

## Summary
- Files Updated: {self.files_updated}
- Total Changes: {sum(c['updates'] for c in self.changes)}

## Files Updated
"""
        for change in self.changes:
            report += f"- `{change['file']}` ({change['updates']} changes)\n"

        report += f"""
## Updates Applied
- ✅ Version numbers updated to {CURRENT_VERSION}
- ✅ API paths corrected
- ✅ Security issues fixed
- ✅ Feature status updated to reality
- ✅ Authentication evolution documented
- ✅ Timestamps updated to {TODAY}

## Next Steps
1. Review changes with `git diff`
2. Run tests to ensure nothing broke
3. Commit with appropriate message
4. Update any remaining manual items
"""
        return report

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Update stale documentation')
    parser.add_argument('--dry-run', action='store_true',
                       help='Show what would be updated without making changes')
    args = parser.parse_args()

    updater = DocumentationUpdater(dry_run=args.dry_run)

    print("🔄 Starting documentation update...")
    print(f"Mode: {'DRY RUN' if args.dry_run else 'LIVE UPDATE'}")
    print()

    # Run all updates
    updater.fix_versions()
    updater.fix_api_paths()
    updater.fix_security_issues()
    updater.update_feature_status()
    updater.add_auth_evolution_notes()

    # Generate report
    report = updater.generate_report()
    print(report)

    # Save report
    report_path = 'stale_docs_update_report.md'
    with open(report_path, 'w') as f:
        f.write(report)
    print(f"\n📄 Report saved to {report_path}")

    if args.dry_run:
        print("\n⚠️  This was a dry run. Use without --dry-run to apply changes.")
    else:
        print("\n✅ Documentation updates complete!")
        print("Review changes with: git diff")

if __name__ == '__main__':
    main()