# Claude Code Features Guide
*A comprehensive reference for AI assistants working with Claude Code*
*Last Updated: January 2025*

## Executive Summary

Claude Code is Anthropic's official CLI tool that transforms how developers interact with AI for coding tasks. It has evolved from a simple command-line interface to a sophisticated development platform with enterprise features, IDE integrations, and extensible architecture through the Model Context Protocol (MCP).

### Key Evolution Points
- **Terminal-Native**: Works directly in your existing terminal workflow
- **File System Access**: Can read, write, edit files directly
- **Command Execution**: Runs bash commands and development tools
- **IDE Integration**: Deep integration with VS Code and JetBrains IDEs
- **Enterprise Ready**: Supports AWS, GCP deployment with managed settings
- **Extensible**: Connect to 100+ external tools via MCP

## Core Features

### Fundamental Capabilities
1. **Direct File Manipulation**
   - Read files with line numbers and offsets
   - Edit files with precise string replacements
   - MultiEdit for batch file modifications
   - Create and manage directory structures

2. **Command Execution**
   - Run bash commands with timeout control
   - Background process management
   - Git operations and version control
   - Build tools and test runners

3. **Intelligent Search**
   - Grep with regex support and context lines
   - Glob pattern matching for file discovery
   - Task-based agents for complex searches

4. **Development Workflows**
   - Create features from descriptions
   - Debug and fix issues systematically
   - Navigate complex codebases
   - Automate repetitive tasks

## Memory Management System

### Hierarchical Memory Structure
Claude Code uses a four-tier memory system with specific precedence:

1. **Enterprise Policy** (`/etc/claude/CLAUDE.md` or platform-specific)
   - System-wide instructions for all users
   - Managed by administrators
   - Highest precedence

2. **Project Memory** (`.claude/CLAUDE.md`)
   - Team-shared project instructions
   - Version controlled with code
   - Project-specific context

3. **User Memory** (`~/.claude/CLAUDE.md`)
   - Personal preferences across all projects
   - User-specific shortcuts and aliases
   - Cross-project configurations

4. **Local Project Memory** (`.claude/CLAUDE.local.md`) - *Deprecated*
   - Being phased out in favor of settings.local.json

### Memory Best Practices
```markdown
# Example CLAUDE.md Structure
## Project Context
- Stack: React, TypeScript, Vite
- Testing: Vitest with React Testing Library
- State Management: Zustand

## Coding Standards
- Use functional components
- Prefer composition over inheritance
- Always run typecheck before commits

## Critical Rules
1. NO console.log in production code
2. ALL API calls must use the httpClient service
3. Test coverage minimum: 80%

## Import External Memory
@../shared/coding-standards.md
```

### Quick Memory Addition
- Start any input with `#` to append to current memory
- Use `/memory` command to edit memory files directly
- Memories support recursive imports with `@path/to/file`

## Model Context Protocol (MCP)

### What is MCP?
MCP is an open-source standard that enables Claude Code to connect with external tools, databases, and APIs. It's like having a universal adapter for AI-tool communication.

### Integration Methods
1. **Local stdio servers** - Run as local processes
2. **Remote SSE servers** - Server-Sent Events for real-time data
3. **Remote HTTP servers** - RESTful API connections

### Available Server Categories
- **Development**: GitHub, Sentry, Linear, Buildkite
- **Databases**: PostgreSQL, SQLite, MySQL, MongoDB
- **Productivity**: Notion, Asana, Slack, Google Drive
- **Commerce**: Stripe, Shopify
- **Infrastructure**: AWS, Kubernetes, Terraform
- **Media**: Figma, Screenshot tools

### MCP Configuration Example
```bash
# Add an MCP server
claude mcp add

# List connected servers
claude mcp list

# Use MCP tools in conversation
"Check Sentry for errors in the last 24 hours"
"Create a GitHub issue for this bug"
"Query the PostgreSQL database for user stats"
```

### MCP Slash Commands
- Dynamically discovered from connected servers
- Format: `/mcp__<server>__<command>`
- Example: `/mcp__github__create_issue`

## IDE Integrations

### Visual Studio Code
- **Installation**: Run `claude` in integrated terminal
- **Quick Launch**: Cmd+Esc (Mac) / Ctrl+Esc (Windows/Linux)
- **Features**:
  - Interactive diff viewing
  - Automatic selection/tab context sharing
  - Diagnostic error sharing
  - File reference shortcuts (Cmd+Shift+P)

### JetBrains IDEs
- **Supported**: IntelliJ, PyCharm, WebStorm, Android Studio, PhpStorm, GoLand
- **Installation**: Plugin marketplace or terminal command
- **Features**:
  - Same capabilities as VS Code
  - Integrated terminal support
  - Project-wide context awareness

### IDE Best Practices
1. Start Claude Code from project root directory
2. Configure diff tool to "auto" for automatic detection
3. Use keyboard shortcuts for rapid context sharing
4. Let Claude Code access current file/selection automatically

## Advanced Workflows

### Extended Thinking
Trigger deep analysis for complex tasks:
```bash
# Activation phrases
"think about this architecture"
"think harder about this bug"
"let me think through this refactor"
```
- Displays thinking process in italic gray text
- Useful for: Architecture planning, complex debugging, algorithm design

### Image Analysis
Claude Code can analyze visual inputs:
1. **Drag and drop** images into terminal
2. **Paste** with Ctrl+V / Cmd+V
3. **Reference** by file path
4. **Use cases**: Mockup implementation, diagram analysis, screenshot debugging

### Conversation Resume
Continue previous work seamlessly:
```bash
# Resume most recent conversation
claude --continue

# Choose from conversation history
claude --resume

# Non-interactive continuation
claude --continue "implement the remaining features"
```

### Subagents & Task Management
Claude Code includes specialized agents:
- **general-purpose**: Complex multi-step research
- **strategic-analyzer**: Root cause analysis and approach validation
- **statusline-setup**: Configure Claude Code status line
- **output-style-setup**: Create custom output styles

### File References
Use `@` syntax for context:
```bash
# Reference specific files
"Update the @src/api/client.ts to use new endpoints"

# Reference directories
"Refactor all components in @src/components"
```

## Configuration & Settings

### Settings Hierarchy
1. Enterprise managed settings (highest priority)
2. User settings (`~/.claude/settings.json`)
3. Project settings (`.claude/settings.json`)
4. Local project settings (`.claude/settings.local.json`)

### Key Configuration Options
```json
{
  "permissions": {
    "tools": {
      "bash": true,
      "edit": true,
      "write": true
    },
    "allowedDirectories": ["/home/user/projects"],
    "blockedPatterns": ["*.env", "*.key"]
  },
  "model": "claude-opus-4-1",
  "hooks": {
    "pre-commit": "npm run lint && npm test"
  },
  "environment": {
    "NODE_ENV": "development",
    "DEBUG": "true"
  }
}
```

### Environment Variables
```bash
# API Configuration
export ANTHROPIC_API_KEY="your-key"
export ANTHROPIC_MODEL="claude-opus-4-1"

# Feature Flags
export CLAUDE_CODE_DISABLE_TELEMETRY=true
export CLAUDE_CODE_ENABLE_EXPERIMENTAL=true

# Performance
export NODE_OPTIONS="--max-old-space-size=8192"
```

## Slash Commands Reference

### Essential Commands
- `/help` - Get usage help
- `/clear` - Clear conversation history
- `/compact` - Reduce context size
- `/config` - View/modify configuration
- `/memory` - Edit CLAUDE.md files
- `/model` - Change AI model
- `/mcp` - Manage MCP connections
- `/agents` - Manage subagents
- `/status` - View system status
- `/cost` - Show token usage

### Workflow Commands
- `/init` - Initialize project with CLAUDE.md
- `/review` - Request code review
- `/pr_comments` - View PR comments
- `/add-dir` - Add working directories
- `/vim` - Enter vim mode

### Custom Slash Commands
Create in `.claude/commands/` or `~/.claude/commands/`:
```markdown
---
arguments: [file]
execute: npm test {{file}}
---
# /test-file

Run tests for a specific file
```

## Best Practices for AI Assistants

### Context Management
1. **Use TodoWrite proactively** for multi-step tasks
2. **Batch similar operations** to reduce API calls
3. **Prefer Grep/Glob** over Task for simple searches
4. **Use MultiEdit** over Edit for multiple changes
5. **Read before editing** - always understand context first

### Performance Optimization
```bash
# Monitor context usage
/cost

# Compact when context > 60%
/compact

# Clear and restart if needed
/clear
```

### Task Execution Strategy
1. **Plan with TodoWrite** - Break complex tasks into steps
2. **Search extensively** - Use parallel searches for efficiency
3. **Verify changes** - Run tests and linters
4. **Document in CLAUDE.md** - Important patterns and decisions

### Error Prevention
- Validate paths before file operations
- Check permissions for sensitive operations
- Handle errors gracefully
- Monitor resource usage
- Clean up temporary files

## Quick Reference

### File Operations
```bash
# Search patterns
Grep: "function.*Controller" with -A 3 -B 3
Glob: "**/*.test.ts"

# Edit patterns
Edit: file.ts, old_string, new_string
MultiEdit: file.ts, [{old: "foo", new: "bar"}, ...]

# Read patterns
Read: /path/to/file (offset: 100, limit: 50)
```

### Git Workflow
```bash
# Standard flow
1. git status - Check changes
2. git diff - Review modifications
3. git add - Stage changes
4. git commit - With conventional commit message
5. git push - When explicitly requested
```

### Testing Pattern
```bash
# Discover test command
1. Check package.json scripts
2. Look for test configuration
3. Run appropriate test command
4. Fix any failures
5. Document in CLAUDE.md for future
```

### Memory Usage Guidelines
- **Project Context**: Architecture, dependencies, conventions
- **Coding Standards**: Style guides, patterns, anti-patterns
- **Critical Rules**: Security, performance, must-follow practices
- **Shortcuts**: Common commands, file locations, workflows

## Advanced Features

### Hooks System
Configure automated commands:
```json
{
  "hooks": {
    "pre-edit": "npm run lint",
    "post-edit": "npm run format",
    "pre-commit": "npm test"
  }
}
```

### Telemetry & Monitoring
- OpenTelemetry support for metrics
- Usage tracking for cost optimization
- Performance monitoring
- Error reporting to Anthropic

### Enterprise Features
- Centralized policy management
- SSO and authentication
- Audit logging
- Custom model deployment
- Network proxy support

## Implementation Tips for AI Assistants

### When Starting a Session
1. Check for CLAUDE.md in current directory
2. Review project structure and dependencies
3. Understand testing and build commands
4. Note any critical rules or conventions
5. Set up TodoWrite for complex tasks

### During Development
1. Use appropriate search tools for context
2. Batch file reads for efficiency
3. Make atomic, focused edits
4. Run validation after changes
5. Update todos as you progress

### Before Completing Tasks
1. Run linters and type checkers
2. Execute relevant tests
3. Verify no regressions
4. Update CLAUDE.md if patterns discovered
5. Clear completed todos

### Communication Style
- Be concise for terminal display
- Use GitHub-flavored markdown
- Provide file:line references
- Avoid unnecessary comments in code
- Skip emojis unless requested

## Troubleshooting Guide

### Common Issues
1. **Context overflow**: Use `/compact` or `/clear`
2. **Permission denied**: Check settings.json permissions
3. **MCP connection failed**: Verify server configuration
4. **IDE integration missing**: Reinstall from terminal
5. **Memory not loading**: Check file paths and syntax

### Debug Commands
```bash
# Check installation health
/doctor

# View current configuration
/config

# Check permissions
/permissions

# View system status
/status
```

## Summary

Claude Code represents a paradigm shift in AI-assisted development. Its key strengths include:

1. **Deep Integration** - Native terminal and IDE support
2. **Extensibility** - MCP protocol for tool connections
3. **Intelligence** - Specialized agents and context management
4. **Enterprise Ready** - Scalable with managed configurations
5. **Developer Focused** - Built for real development workflows

For AI assistants using Claude Code, the key is to leverage these features systematically:
- Use memory for persistent context
- Connect relevant MCP servers for external data
- Employ subagents for specialized tasks
- Optimize context usage proactively
- Follow project conventions discovered through search

This guide should enable any AI assistant to effectively utilize Claude Code's full potential for software development tasks.