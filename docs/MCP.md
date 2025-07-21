# MCP (Model Context Protocol) Reference

## Available Servers

### filesystem
Primary tool for all file operations. Use for reading, writing, editing files.

### desktop
Run commands, take screenshots, click elements. Requires system permissions.

### sequential
Extended thinking for complex problems. Use for architecture decisions.

### context7
Library documentation lookup. Use when working with external packages.

## Quick Usage

```bash
# Enable MCP servers
claude --mcp

# Enable specific server
claude --mcp --use-mcp filesystem

# Disable MCP
claude --no-mcp
```

## Common Patterns

```bash
# Complex analysis
"Analyze the codebase architecture" → Sequential thinking

# Library questions  
"How do I use React Query?" → Context7 docs

# File operations
"Update all imports" → Filesystem

# UI automation
"Click the submit button" → Desktop
```

## Best Practices
- Use native tools first, MCP for complex tasks
- Sequential for architecture, Context7 for docs
- Batch similar operations for efficiency