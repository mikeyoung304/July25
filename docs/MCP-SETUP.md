# Model Context Protocol (MCP) Setup

## Overview
The Model Context Protocol (MCP) provides enhanced capabilities for AI assistants to interact with your development environment. In Claude Code, MCP servers are automatically available and provide various "senses" for understanding and manipulating the project.

## Available MCP Servers

### 1. Filesystem Server
- **Purpose**: Read, write, and navigate files within allowed directories
- **Status**: ✅ Active (automatically connected)
- **Capabilities**:
  - Read file contents
  - Write and edit files
  - List directory contents
  - Search for files by pattern
  - Get file metadata

### 2. Sequential Thinking Server
- **Purpose**: Complex problem-solving and analysis
- **Status**: ✅ Available
- **Usage**: Activated for complex architectural decisions

### 3. Context7 Server
- **Purpose**: Library documentation lookup
- **Status**: ✅ Available
- **Usage**: Activated when working with external libraries

### 4. Desktop Commander
- **Purpose**: Execute shell commands and manage processes
- **Status**: ✅ Active
- **Capabilities**:
  - Run terminal commands
  - Manage long-running processes
  - File operations with enhanced permissions

## Project-Specific MCP Configuration

For the rebuild-6.0 project, the following MCP patterns are established:

### File System Access
```yaml
allowed_directories:
  - /Users/mikeyoung/CODING/rebuild-6.0
  - /Users/mikeyoung/.claude
  
excluded_patterns:
  - node_modules/**
  - dist/**
  - .git/**
```

### Command Execution
```yaml
allowed_commands:
  - npm test
  - npm run dev
  - npm run build
  - npm run lint
  - git status
  - git diff
  
blocked_commands:
  - rm -rf
  - sudo
  - npm install (requires approval)
```

## Usage in Multi-Agent Workflow

### Architect Role
- Uses Sequential Thinking for system design
- Reads existing architecture via Filesystem
- Documents decisions in claude.md files

### Builder Role
- Uses Filesystem for code generation
- Executes tests via Desktop Commander
- Reads documentation via Context7

### Validator Role
- Runs test suites via Desktop Commander
- Analyzes code coverage reports
- Searches for edge cases via Filesystem

## Best Practices

1. **Always verify file paths** before writing
2. **Use batch operations** when reading multiple files
3. **Check command output** for errors
4. **Maintain context files** for better MCP understanding

## Troubleshooting

If MCP servers appear disconnected:
1. The servers are managed by Claude Code infrastructure
2. They reconnect automatically
3. No manual intervention needed

## Integration with Project

The MCP setup integrates with our project structure:
- `claude.md` files provide context at each level
- File operations respect the Janus Module Architecture
- Commands follow the quality gates defined in the project constitution