# MCP (Model Context Protocol) Status

## Active MCP Servers

### ✅ Filesystem Server
- **Status**: Connected and operational
- **Allowed Directory**: `/Users/mikeyoung/CODING`
- **Current Project**: `/Users/mikeyoung/CODING/rebuild-6.0`
- **Available Operations**:
  - `read_file` - Read file contents
  - `write_file` - Create or overwrite files
  - `edit_file` - Make line-based edits
  - `list_directory` - List directory contents
  - `search_files` - Search for files by pattern
  - `get_file_info` - Get file metadata

### ✅ Desktop Commander
- **Status**: Connected
- **Capabilities**:
  - Execute shell commands
  - Manage processes
  - Enhanced file operations

### ✅ Sequential Thinking
- **Status**: Available on-demand
- **Usage**: Complex problem analysis and multi-step reasoning

### ✅ Context7
- **Status**: Available on-demand
- **Usage**: Library documentation lookup

### ✅ GitHub Server
- **Status**: Available
- **Usage**: Repository operations, PR management

### ✅ Browser Automation (Puppeteer/Playwright)
- **Status**: Available
- **Usage**: E2E testing, web scraping

## Project Integration

The MCP servers are integrated with the rebuild-6.0 project workflow:

1. **File Operations**: All code generation and editing uses the filesystem server
2. **Testing**: Test execution via desktop commander (`npm test`)
3. **Development**: Dev server management (`npm run dev`)
4. **Documentation**: Context-aware file creation and updates
5. **BuildPanel Integration**: MCP servers can assist with BuildPanel service monitoring and configuration

## Usage Examples

### Reading a file
```typescript
// MCP automatically handles this when you request file content
const content = await mcp.filesystem.read_file({
  path: '/Users/mikeyoung/CODING/rebuild-6.0/src/features/kds/KDSOrderCard.tsx'
})
```

### Running tests
```bash
# Via desktop commander
npm test -- --coverage
```

### Complex analysis
```yaml
# Sequential thinking for architectural decisions
task: "Analyze KDS performance optimization strategies"
approach: "Multi-step reasoning with hypothesis testing"
```

## Monitoring

To check MCP server status:
1. File operations work = Filesystem server active
2. Commands execute = Desktop commander active
3. Complex reasoning available = Sequential thinking ready
4. Library docs accessible = Context7 ready

All servers are managed by Claude Code infrastructure and reconnect automatically if needed.