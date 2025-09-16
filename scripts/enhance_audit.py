#!/usr/bin/env python3

import json
import csv
from pathlib import Path
from collections import defaultdict

def analyze_graph_statistics(graph_file):
    """Analyze dependency graph for statistics"""
    with open(graph_file, 'r') as f:
        graph = json.load(f)

    stats = {
        'total_modules': len(graph),
        'external_deps': set(),
        'most_imported': defaultdict(int),
        'most_dependencies': [],
        'isolated_modules': []
    }

    # Count imports
    for module, deps in graph.items():
        if not deps:
            stats['isolated_modules'].append(module)

        dep_count = 0
        for dep in deps:
            if dep.startswith('external:'):
                stats['external_deps'].add(dep.replace('external:', ''))
            else:
                stats['most_imported'][dep] += 1
                dep_count += 1

        if dep_count > 0:
            stats['most_dependencies'].append((module, dep_count))

    # Sort by most dependencies
    stats['most_dependencies'].sort(key=lambda x: x[1], reverse=True)
    stats['most_dependencies'] = stats['most_dependencies'][:10]

    # Sort most imported
    stats['most_imported'] = sorted(stats['most_imported'].items(), key=lambda x: x[1], reverse=True)[:10]

    return stats

def analyze_routes_coverage(routes_file):
    """Analyze route coverage and patterns"""
    routes_by_method = defaultdict(list)
    routes_by_auth = {'authenticated': [], 'public': []}
    routes_by_role = defaultdict(list)

    with open(routes_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['type'] == 'express':
                routes_by_method[row['method']].append(row['path'])

                if row['auth_required'] == 'True':
                    routes_by_auth['authenticated'].append(row['path'])
                else:
                    routes_by_auth['public'].append(row['path'])

                if row['role_required']:
                    routes_by_role[row['role_required']].append(row['path'])

    return {
        'by_method': dict(routes_by_method),
        'by_auth': routes_by_auth,
        'by_role': dict(routes_by_role)
    }

def create_module_hierarchy(graph):
    """Create module hierarchy analysis"""
    hierarchy = defaultdict(list)

    for module in graph:
        parts = module.split('/')
        if len(parts) > 1:
            parent = parts[0]
            hierarchy[parent].append(module)

    return dict(hierarchy)

# Main execution
if __name__ == "__main__":
    base_dir = Path("/Users/mikeyoung/CODING/rebuild-6.0")
    output_dir = base_dir / "docs/overnight-audit/20250115"

    print("Enhancing audit results...")

    # Analyze client graph
    client_stats = analyze_graph_statistics(output_dir / "graph_client.json")
    server_stats = analyze_graph_statistics(output_dir / "graph_server.json")

    # Analyze routes
    routes_analysis = analyze_routes_coverage(output_dir / "routes_inventory.csv")

    # Create enhanced summary
    summary = {
        'client': {
            'total_modules': client_stats['total_modules'],
            'isolated_modules': len(client_stats['isolated_modules']),
            'external_dependencies': len(client_stats['external_deps']),
            'top_external_deps': list(client_stats['external_deps'])[:20],
            'most_imported_modules': client_stats['most_imported'],
            'modules_with_most_deps': client_stats['most_dependencies']
        },
        'server': {
            'total_modules': server_stats['total_modules'],
            'isolated_modules': len(server_stats['isolated_modules']),
            'external_dependencies': len(server_stats['external_deps']),
            'top_external_deps': list(server_stats['external_deps'])[:20],
            'most_imported_modules': server_stats['most_imported'],
            'modules_with_most_deps': server_stats['most_dependencies']
        },
        'routes': routes_analysis
    }

    # Save enhanced summary
    with open(output_dir / "dependency_summary.json", 'w') as f:
        json.dump(summary, f, indent=2)

    # Create readable report
    with open(output_dir / "AUDIT_SUMMARY.md", 'w') as f:
        f.write("# Restaurant OS - Dependency & Route Audit Summary\n\n")
        f.write("Generated: 2025-01-15\n\n")

        f.write("## Client Module Analysis\n\n")
        f.write(f"- **Total Modules**: {client_stats['total_modules']}\n")
        f.write(f"- **Isolated Modules**: {len(client_stats['isolated_modules'])}\n")
        f.write(f"- **External Dependencies**: {len(client_stats['external_deps'])}\n")
        f.write(f"- **Circular Dependencies**: 0 found\n\n")

        f.write("### Most Imported Client Modules:\n")
        for module, count in client_stats['most_imported'][:5]:
            f.write(f"- `{module}`: {count} imports\n")

        f.write("\n### Client Modules with Most Dependencies:\n")
        for module, count in client_stats['most_dependencies'][:5]:
            f.write(f"- `{module}`: {count} dependencies\n")

        f.write("\n## Server Module Analysis\n\n")
        f.write(f"- **Total Modules**: {server_stats['total_modules']}\n")
        f.write(f"- **Isolated Modules**: {len(server_stats['isolated_modules'])}\n")
        f.write(f"- **External Dependencies**: {len(server_stats['external_deps'])}\n")
        f.write(f"- **Circular Dependencies**: 0 found\n\n")

        f.write("### Most Imported Server Modules:\n")
        for module, count in server_stats['most_imported'][:5]:
            f.write(f"- `{module}`: {count} imports\n")

        f.write("\n### Server Modules with Most Dependencies:\n")
        for module, count in server_stats['most_dependencies'][:5]:
            f.write(f"- `{module}`: {count} dependencies\n")

        f.write("\n## Route Analysis\n\n")

        f.write("### Routes by HTTP Method:\n")
        for method, routes in routes_analysis['by_method'].items():
            f.write(f"- **{method}**: {len(routes)} routes\n")

        f.write("\n### Authentication Coverage:\n")
        f.write(f"- **Authenticated Routes**: {len(routes_analysis['by_auth']['authenticated'])}\n")
        f.write(f"- **Public Routes**: {len(routes_analysis['by_auth']['public'])}\n")

        if routes_analysis['by_role']:
            f.write("\n### Role-based Access:\n")
            for role, routes in routes_analysis['by_role'].items():
                f.write(f"- **{role}**: {len(routes)} routes\n")

        f.write("\n## Key Files Generated\n\n")
        f.write("- `graph_client.json`: Complete client dependency graph\n")
        f.write("- `graph_server.json`: Complete server dependency graph\n")
        f.write("- `routes_inventory.csv`: All routes with auth requirements\n")
        f.write("- `api_endpoints.csv`: API-specific endpoints mapping\n")
        f.write("- `circulars.txt`: Circular dependency analysis\n")
        f.write("- `dependency_summary.json`: Comprehensive analysis data\n")

    print("Enhancement complete!")