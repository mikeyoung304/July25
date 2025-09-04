# MCP Wiring Steps for Supabase
Generated: 2025-09-03

## Prerequisites

1. **Get Supabase Access Token**:
   - Go to: https://supabase.com/dashboard/account/tokens
   - Click "Generate new token"
   - Name it: "MCP Access - Restaurant OS"
   - Copy the token (you won't see it again)

2. **Set Environment Variable**:
   ```bash
   # Add to your shell profile (.zshrc, .bashrc, etc.)
   export SUPABASE_ACCESS_TOKEN='your-token-here'
   
   # Or for Claude Desktop on macOS:
   # Add to ~/Library/Application Support/Claude/claude_desktop_config.json
   ```

## Step-by-Step Configuration

### Step 1: Backup Current Config
```bash
cp .mcp.json .mcp.json.backup
```

### Step 2: Edit .mcp.json
Remove the broken supabase entry and add the corrected one:

```json
{
  "mcpServers": {
    // ... keep existing servers ...
    
    // REMOVE THIS:
    "supabase": {
      "command": "npx",
      "args": ["supabase-mcp"],
      "env": {
        "SUPABASE_URL": "...",
        "SUPABASE_SERVICE_ROLE_KEY": "..."
      }
    },
    
    // ADD THIS:
    "supabase": {
      "command": "npx",
      "args": [
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=xiwfhcikfdoshxwbtjxt",
        "--features=database,branching,debugging",
        "--read-only"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}"
      }
    }
  }
}
```

### Step 3: Install MCP Package
```bash
# Install globally (recommended)
npm install -g @supabase/mcp-server-supabase@latest

# Or ensure npx will fetch latest
npx @supabase/mcp-server-supabase@latest --version
```

### Step 4: Restart Claude Desktop
- Quit Claude Desktop completely (Cmd+Q on macOS)
- Reopen Claude Desktop
- Start a new conversation or continue this one

### Step 5: Verify Connection

In Claude, ask me to run these checks:

1. **Check MCP servers**:
   ```
   List all MCP servers
   ```

2. **Check Supabase tools**:
   ```
   List tools for supabase server
   ```

3. **Test read-only query**:
   ```
   Run: SELECT version(), current_database()
   ```

## Troubleshooting

### If MCP Still Not Connected

1. **Check environment variable**:
   ```bash
   echo $SUPABASE_ACCESS_TOKEN
   # Should show your token (or at least not be empty)
   ```

2. **Check Claude Desktop config** (macOS):
   ```bash
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```
   Should contain:
   ```json
   {
     "mcpServers": {
       // your servers
     },
     "env": {
       "SUPABASE_ACCESS_TOKEN": "your-actual-token"
     }
   }
   ```

3. **Check package installation**:
   ```bash
   npm list -g @supabase/mcp-server-supabase
   ```

4. **Test manually**:
   ```bash
   npx @supabase/mcp-server-supabase@latest \
     --project-ref=xiwfhcikfdoshxwbtjxt \
     --features=database \
     --read-only \
     --help
   ```

### Common Issues

| Issue | Solution |
|-------|----------|
| "command not found" | Install package globally: `npm install -g @supabase/mcp-server-supabase@latest` |
| "Invalid token" | Regenerate token from Supabase dashboard |
| "SSL error" | Add `--no-ssl-verify` to args (not recommended for production) |
| Empty resources | Ensure `--features=database` is in args |
| "Read-only mode" | This is expected! We start read-only for safety |

## Verification Checklist

After setup, I should be able to:

- [ ] See "supabase" in MCP servers list
- [ ] List available tools (should include `database.execute_sql`)
- [ ] Run a simple SELECT query
- [ ] Get database schema information
- [ ] See "read-only mode" confirmation

## Security Notes

⚠️ **NEVER**:
- Put your access token directly in .mcp.json
- Commit .mcp.json with tokens to git
- Use service role key for MCP (use access token instead)

✅ **ALWAYS**:
- Use environment variables for tokens
- Start with read-only mode
- Test on development first
- Keep .mcp.json in .gitignore

## Next Steps

Once verified in read-only mode:
1. Run verification queries (Phase 2)
2. Analyze database state (Phase 3)
3. Prepare migrations (Phase 3)
4. Only enable writes after explicit approval (Phase 4)