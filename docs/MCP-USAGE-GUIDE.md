# MCP (Model Context Protocol) Usage Guide for rebuild 6.0

## Overview

The Model Context Protocol (MCP) provides Claude Code with enhanced capabilities to interact with your development environment. Unlike traditional CLI tools, MCP servers in Claude Code are automatically managed and provide seamless integration.

## Available MCP Servers

### 1. Filesystem Server (Always Active)
**Purpose:** Safe file system operations within allowed directories

**Key Operations:**
- `read_file`: Read any file in the project
- `write_file`: Create or overwrite files
- `edit_file`: Make line-based edits to existing files
- `list_directory`: Browse directory contents
- `search_files`: Find files by pattern
- `get_file_info`: Get metadata about files

**Example Usage:**
```typescript
// Reading the KDSOrderCard component
const content = await mcp.filesystem.read_file({
  path: '/Users/mikeyoung/CODING/rebuild-6.0/src/features/kds/KDSOrderCard.tsx'
})

// Searching for all test files
const testFiles = await mcp.filesystem.search_files({
  path: '/Users/mikeyoung/CODING/rebuild-6.0',
  pattern: '*.test.tsx'
})
```

### 2. Desktop Commander (Always Active)
**Purpose:** Execute shell commands and manage processes

**Safe Commands:**
- `npm test` - Run test suite
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Check code style
- `git status` - Check repository status
- `git diff` - View changes

**Example Usage:**
```bash
# Run tests with coverage
npm test -- --coverage

# Start dev server
npm run dev

# Check TypeScript errors
npx tsc --noEmit
```

### 3. Sequential Thinking (On-Demand)
**Purpose:** Complex multi-step analysis and reasoning

**Use Cases:**
- Architectural design decisions
- Performance optimization strategies
- Complex debugging scenarios
- System integration planning

**Activation:** Automatically engaged for complex problems

### 4. Context7 (On-Demand)
**Purpose:** Instant library documentation access

**Supported Libraries:**
- React and React Hooks
- TypeScript
- Tailwind CSS
- Vite
- Jest and React Testing Library
- Supabase

**Example Usage:**
```typescript
// When implementing a custom hook
// Context7 automatically provides React Hooks best practices

// When using Supabase real-time
// Context7 provides real-time subscription patterns
```

### 5. GitHub (On-Demand)
**Purpose:** Repository and collaboration management

**Capabilities:**
- Create and manage PRs
- Search code across repositories
- Manage issues
- View commit history

### 6. Puppeteer/Playwright (On-Demand)
**Purpose:** Browser automation and E2E testing

**Use Cases:**
- Visual regression testing
- E2E test creation
- Live app inspection
- Screenshot generation

## MCP Integration Patterns

### Pattern 1: TDD Workflow
```yaml
1. Filesystem: Read component file
2. Filesystem: Create test file
3. Desktop: Run tests (should fail)
4. Filesystem: Implement component
5. Desktop: Run tests (should pass)
6. Context7: Check best practices
```

### Pattern 2: Feature Development
```yaml
1. Sequential: Analyze requirements
2. Filesystem: Scaffold using /new-feature
3. Context7: Research library usage
4. Filesystem: Implement feature
5. Desktop: Test implementation
6. GitHub: Create PR
```

### Pattern 3: Performance Optimization
```yaml
1. Sequential: Analyze performance bottlenecks
2. Filesystem: Read problematic components
3. Context7: Research optimization techniques
4. Filesystem: Implement optimizations
5. Puppeteer: Measure improvements
```

## Best Practices

### 1. File Operations
- Always use filesystem MCP instead of direct file manipulation
- Batch read operations when analyzing multiple files
- Use search_files for discovery, read_file for specific content

### 2. Command Execution
- Prefer npm scripts over direct commands
- Always check command output for errors
- Use background processes for long-running tasks

### 3. Documentation Access
- Let Context7 auto-activate for library questions
- Combine with Sequential for architectural decisions
- Cache documentation insights in claude.md files

### 4. Testing
- Desktop for unit tests
- Puppeteer/Playwright for E2E tests
- Sequential for test strategy planning

## Multi-Agent MCP Usage

### Architect Agent
```yaml
Primary MCPs:
- Sequential: System design and planning
- Filesystem: Read existing architecture
- Context7: Research best practices
```

### Builder Agent
```yaml
Primary MCPs:
- Filesystem: Code generation and editing
- Desktop: Run tests and builds
- Context7: API documentation
```

### Validator Agent
```yaml
Primary MCPs:
- Desktop: Execute test suites
- Filesystem: Create test files
- Puppeteer: E2E validation
```

### Optimizer Agent
```yaml
Primary MCPs:
- Sequential: Performance analysis
- Filesystem: Code optimization
- Desktop: Benchmark execution
```

### Documenter Agent
```yaml
Primary MCPs:
- Filesystem: Update documentation
- Context7: API references
- GitHub: Documentation PRs
```

## Troubleshooting

### MCP Not Responding
- MCP servers auto-reconnect
- No manual intervention needed
- Check claude.md for configuration

### File Access Denied
- Verify path is within allowed directories
- Check .claude/commands/ for custom commands
- Ensure absolute paths are used

### Command Execution Failed
- Verify command is in allowed list
- Check for syntax errors
- Review output for specific errors

## Advanced Usage

### Combining MCPs
```typescript
// Example: Full feature implementation
1. Sequential thinking for design
2. Filesystem for scaffolding
3. Context7 for library usage
4. Desktop for testing
5. GitHub for PR creation
```

### Custom Workflows
Create custom commands in `.claude/commands/` that orchestrate multiple MCPs for complex workflows.

## Security Notes

- File operations restricted to project directory
- Commands filtered through allowlist
- No sudo or destructive operations
- Automatic safety checks on all operations

---

This guide ensures efficient use of MCP capabilities within the rebuild 6.0 project. The MCP servers transform Claude Code from a text generator into a full development partner with environmental awareness.