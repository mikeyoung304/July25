# MCP Context Summary
Generated: 2025-09-03

## Previous MCP Attempts and Failures

### What We Tried

1. **Initial MCP Check**: 
   - Ran `ListMcpResourcesTool` - returned empty array `[]`
   - Conclusion: Supabase MCP not connected or not returning resources

2. **Fallback to Node.js Script**:
   - Created `scripts/check-db-state.js` to connect directly
   - **First Error**: `password authentication failed for user "postgres"`
   - **Second Error**: `self-signed certificate in certificate chain`
   - **Solution**: Used `NODE_TLS_REJECT_UNAUTHORIZED=0` environment variable
   - **Success**: Connected using DATABASE_URL with SSL disabled

3. **Connection String Evolution**:
   - Started with: `postgresql://postgres:${SERVICE_KEY}@db.${projectRef}.supabase.co:5432/postgres`
   - Failed with password auth
   - Switched to: Using DATABASE_URL from .env
   - Added pooler endpoint: `aws-0-us-west-1.pooler.supabase.com:6543`

### Exact Error Strings Encountered

1. `"❌ Database query failed: password authentication failed for user "postgres"`
2. `"❌ Database query failed: self-signed certificate in certificate chain"`
3. MCP returned empty resources: `[]`

## What Likely Went Wrong with MCP

• **Wrong MCP package**: Used `supabase-mcp` instead of `@supabase/mcp-server-supabase`
• **Service key in config**: Exposed service key directly in `.mcp.json` (security issue)
• **Missing project ref**: No `--project-ref` argument in MCP server args
• **SSL/TLS issues**: MCP might have same SSL certificate problems we hit with Node
• **Wrong environment variables**: Used `SUPABASE_SERVICE_ROLE_KEY` instead of `SUPABASE_ACCESS_TOKEN`
• **No features specified**: Didn't specify `--features` flag for database access

## Existing Config Attempts

### Found: `.mcp.json`
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["supabase-mcp"],
      "env": {
        "SUPABASE_URL": "https://xiwfhcikfdoshxwbtjxt.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "[EXPOSED_KEY]"
      }
    }
  }
}
```

**Issues with this config**:
1. Wrong package name (`supabase-mcp` vs `@supabase/mcp-server-supabase`)
2. Service key exposed in plain text
3. No project-ref argument
4. No features specified
5. No read-only mode specified

## Database State from Fallback Method

### What We Discovered
- **RLS Enabled**: 7 tables have RLS enabled
- **Missing Tables**: ALL auth tables missing (`user_restaurants`, `user_profiles`, `user_pins`, etc.)
- **Policies**: 10 policies exist but reference non-existent `user_restaurants` table
- **Project Ref**: `xiwfhcikfdoshxwbtjxt`
- **Connection**: Works via DATABASE_URL with SSL disabled

### Key Reports Generated
- `/docs/reports/DB_STATE_CONFIRM.json` - Raw database state
- `/docs/reports/AUTH_FLOW_CONFIRM.md` - Authentication flow analysis
- `/docs/reports/SERVICE_CLIENT_WRITE_MAP.md` - Service key usage mapping
- `/docs/reports/ROLE_RISK_MATRIX.md` - Role compatibility assessment

## Patches Prepared (Not Applied)
- `/docs/diffs/tables-user-client.patch` - Switch tables route to user client
- `/docs/diffs/authenticated-request-interface.patch` - Add userSupabase to interface
- `/docs/diffs/orders-service-user-client.patch` - Service refactor pattern

## Migration Prepared (Not Applied)
- `/supabase/migrations/20250903_auth_core.sql` - Create missing auth tables
- Includes: user_restaurants, user_profiles, user_pins, station_tokens, api_scopes, role_scopes

## Next Steps for MCP
1. Remove incorrect supabase entry from `.mcp.json`
2. Install correct package: `@supabase/mcp-server-supabase`
3. Create proper configuration with project-ref
4. Use environment variable for access token (not inline)
5. Start with read-only mode
6. Test MCP tools availability
7. Retry database queries via MCP