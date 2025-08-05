# MCP (Model Context Protocol) Reference - 2025 Official Servers

## Available Servers (Configured)

### filesystem ✅ Connected
**Official Anthropic MCP Server**
- **Package**: `@modelcontextprotocol/server-filesystem`
- **Scope**: Project-level file operations
- **Authorized Path**: `/Users/mikeyoung/CODING` 
- **Usage**: All file reading, writing, editing operations within codebase

### sequential-thinking ✅ Connected  
**Official Anthropic MCP Server**
- **Package**: `@modelcontextprotocol/server-sequential-thinking`
- **Scope**: Complex problem analysis and multi-step reasoning
- **Usage**: Architecture decisions, debugging analysis, system design

### memory ✅ Connected
**Official Anthropic MCP Server**
- **Package**: `@modelcontextprotocol/server-memory`
- **Scope**: Persistent knowledge graph and context retention
- **Usage**: Store architectural patterns, remember decisions across sessions

### git ✅ Connected
**Third-party MCP Server**
- **Package**: `@cyanheads/git-mcp-server`
- **Scope**: Repository operations for rebuild-6.0 project
- **Usage**: Version control, branching, commits, repository management

## Quick Usage

```bash
# List all configured MCP servers
claude mcp list

# Check server health status
claude mcp list  # Shows ✓ Connected status

# Add new MCP server  
claude mcp add <name> <command> [args...]

# Remove MCP server
claude mcp remove <name>
```

## Common Patterns

```bash
# Complex analysis and architecture
"Analyze the codebase architecture" → sequential-thinking server

# File operations within authorized paths
"Update all imports" → filesystem server  

# Knowledge retention across sessions
"Remember this architectural decision" → memory server

# Repository operations
"Create feature branch and commit changes" → git server

# External library questions
"How do I use React Query?" → WebSearch for official docs
```

## Best Practices (2025)
- Use filesystem server for ALL file operations in `/Users/mikeyoung/CODING`
- Use sequential-thinking for complex architectural analysis
- Store important insights in memory server for persistence
- Use git server for all version control operations
- Batch similar operations for efficiency
- Native tools only for simple, non-MCP tasks