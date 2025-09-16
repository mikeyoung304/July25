#!/usr/bin/env python3

import json
import os
import re
import csv
from pathlib import Path
from collections import defaultdict, deque

def analyze_imports(file_path):
    """Extract imports from TypeScript/JavaScript files"""
    imports = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Find ES6 imports
        import_patterns = [
            r"import\s+(?:.*?\s+from\s+)?['\"]([^'\"]+)['\"]",
            r"require\(['\"]([^'\"]+)['\"]\)",
            r"from\s+['\"]([^'\"]+)['\"]"
        ]

        for pattern in import_patterns:
            matches = re.findall(pattern, content)
            imports.extend(matches)

    except Exception as e:
        pass

    return imports

def build_dependency_graph(root_dir, extensions=['.ts', '.tsx', '.js', '.jsx']):
    """Build dependency graph for all files in directory"""
    graph = {}
    files = []

    for ext in extensions:
        files.extend(Path(root_dir).rglob(f'*{ext}'))

    # Filter out test files and node_modules
    files = [f for f in files if 'node_modules' not in str(f) and '__tests__' not in str(f) and '.test.' not in str(f) and '.spec.' not in str(f)]

    for file_path in files:
        rel_path = str(file_path.relative_to(root_dir))
        imports = analyze_imports(file_path)

        # Resolve relative imports
        resolved_imports = []
        for imp in imports:
            if imp.startswith('.'):
                # Relative import
                resolved = (Path(file_path).parent / imp).resolve()
                try:
                    rel_resolved = str(resolved.relative_to(root_dir))
                    resolved_imports.append(rel_resolved)
                except:
                    pass
            elif imp.startswith('@/'):
                # Alias import (common in client)
                resolved_imports.append(imp.replace('@/', 'src/'))
            else:
                # External package
                resolved_imports.append(f"external:{imp}")

        graph[rel_path] = resolved_imports

    return graph

def find_circular_dependencies(graph):
    """Find circular dependencies using DFS"""
    circulars = []

    def dfs(node, path, visited, rec_stack):
        visited.add(node)
        rec_stack.add(node)
        path.append(node)

        if node in graph:
            for neighbor in graph[node]:
                if neighbor not in visited:
                    result = dfs(neighbor, path[:], visited, rec_stack)
                    if result:
                        circulars.extend(result)
                elif neighbor in rec_stack:
                    # Found circular dependency
                    cycle_start = path.index(neighbor)
                    cycle = path[cycle_start:] + [neighbor]
                    circulars.append(cycle)

        rec_stack.remove(node)
        return circulars

    visited = set()
    for node in graph:
        if node not in visited:
            dfs(node, [], visited, set())

    # Remove duplicates
    unique_circulars = []
    for circular in circulars:
        if circular not in unique_circulars:
            unique_circulars.append(circular)

    return unique_circulars

def extract_routes_from_file(file_path):
    """Extract route definitions from a file"""
    routes = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Express routes
        express_pattern = r'(?:router|app)\.(get|post|put|patch|delete|use)\([\'"`]([^\'"`]+)[\'"`]'
        express_matches = re.findall(express_pattern, content)

        for method, path in express_matches:
            routes.append({
                'path': path,
                'method': method.upper(),
                'file': str(file_path),
                'type': 'express'
            })

        # React routes
        react_pattern = r'<Route\s+path=[\'"`]([^\'"`]+)[\'"`]'
        react_matches = re.findall(react_pattern, content)

        for path in react_matches:
            routes.append({
                'path': path,
                'method': 'GET',
                'file': str(file_path),
                'type': 'react'
            })

    except Exception as e:
        pass

    return routes

def analyze_auth_requirements(file_path):
    """Analyze authentication requirements in route files"""
    auth_required = False
    role_required = None

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check for authentication middleware
        if 'authenticate' in content or 'requireAuth' in content:
            auth_required = True

        # Check for role requirements
        role_pattern = r'requireRole\(\[([^\]]+)\]\)'
        role_matches = re.findall(role_pattern, content)
        if role_matches:
            role_required = role_matches[0]

    except:
        pass

    return auth_required, role_required

# Main execution
if __name__ == "__main__":
    base_dir = Path("/Users/mikeyoung/CODING/rebuild-6.0")
    output_dir = base_dir / "docs/overnight-audit/20250115"
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Building dependency graphs...")

    # Build dependency graphs
    client_graph = build_dependency_graph(base_dir / "client", ['.ts', '.tsx'])
    server_graph = build_dependency_graph(base_dir / "server", ['.ts', '.js'])

    # Save graphs
    with open(output_dir / "graph_client.json", 'w') as f:
        json.dump(client_graph, f, indent=2)

    with open(output_dir / "graph_server.json", 'w') as f:
        json.dump(server_graph, f, indent=2)

    print(f"Client graph: {len(client_graph)} modules")
    print(f"Server graph: {len(server_graph)} modules")

    # Find circular dependencies
    print("\nFinding circular dependencies...")
    client_circulars = find_circular_dependencies(client_graph)
    server_circulars = find_circular_dependencies(server_graph)

    with open(output_dir / "circulars.txt", 'w') as f:
        f.write("=== CLIENT CIRCULAR DEPENDENCIES ===\n\n")
        if client_circulars:
            for i, circular in enumerate(client_circulars, 1):
                f.write(f"{i}. " + " -> ".join(circular) + "\n")
        else:
            f.write("No circular dependencies found\n")

        f.write("\n=== SERVER CIRCULAR DEPENDENCIES ===\n\n")
        if server_circulars:
            for i, circular in enumerate(server_circulars, 1):
                f.write(f"{i}. " + " -> ".join(circular) + "\n")
        else:
            f.write("No circular dependencies found\n")

    print(f"Client circulars: {len(client_circulars)}")
    print(f"Server circulars: {len(server_circulars)}")

    # Extract all routes
    print("\nExtracting routes...")
    all_routes = []

    # Server routes
    for root, dirs, files in os.walk(base_dir / "server"):
        for file in files:
            if file.endswith(('.ts', '.js')) and 'node_modules' not in root:
                file_path = Path(root) / file
                routes = extract_routes_from_file(file_path)
                for route in routes:
                    if route['type'] == 'express':
                        auth, role = analyze_auth_requirements(file_path)
                        route['auth_required'] = auth
                        route['role_required'] = role
                        all_routes.append(route)

    # Client routes
    for root, dirs, files in os.walk(base_dir / "client"):
        for file in files:
            if file.endswith(('.tsx', '.ts')) and 'node_modules' not in root:
                file_path = Path(root) / file
                routes = extract_routes_from_file(file_path)
                for route in routes:
                    if route['type'] == 'react':
                        route['auth_required'] = False
                        route['role_required'] = None
                        all_routes.append(route)

    # Save routes inventory
    with open(output_dir / "routes_inventory.csv", 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['path', 'method', 'handler_file', 'auth_required', 'role_required', 'type'])
        writer.writeheader()
        for route in all_routes:
            writer.writerow({
                'path': route['path'],
                'method': route['method'],
                'handler_file': route['file'].replace(str(base_dir) + '/', ''),
                'auth_required': route['auth_required'],
                'role_required': route['role_required'] or '',
                'type': route['type']
            })

    print(f"Total routes: {len(all_routes)}")

    # Create API endpoints mapping
    api_routes = [r for r in all_routes if r['type'] == 'express' and '/api/' in r['path']]

    with open(output_dir / "api_endpoints.csv", 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['endpoint', 'method', 'handler_file', 'auth_required', 'role_required'])
        writer.writeheader()
        for route in api_routes:
            writer.writerow({
                'endpoint': route['path'],
                'method': route['method'],
                'handler_file': route['file'].replace(str(base_dir) + '/', ''),
                'auth_required': route['auth_required'],
                'role_required': route['role_required'] or ''
            })

    print(f"API endpoints: {len(api_routes)}")
    print("\nAnalysis complete!")