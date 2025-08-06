# MCP Configuration for rebuild-6.0

This directory contains Model Context Protocol (MCP) server configurations for the rebuild-6.0 project.

## Configured Servers

- **filesystem**: File operations within `/Users/mikeyoung/CODING`
- **sequential-thinking**: Complex analysis and reasoning
- **memory**: Knowledge graph and context persistence  
- **git**: Repository operations

## Usage

MCP servers are automatically configured when running Claude Code in this project directory.

```bash
# Check server status
claude mcp list
```

## Configuration

Server definitions are in `.mcp.json` following [official MCP documentation](https://docs.anthropic.com/en/docs/claude-code/mcp).