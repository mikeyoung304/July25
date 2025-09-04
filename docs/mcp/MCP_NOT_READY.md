# MCP Server Not Ready for Migrations

## Available MCP Tools
- mcp__supabase__list_tables
- mcp__supabase__list_extensions
- mcp__supabase__list_migrations
- mcp__supabase__apply_migration
- mcp__supabase__execute_sql
- mcp__supabase__get_logs
- mcp__supabase__get_advisors
- mcp__supabase__create_branch
- mcp__supabase__list_branches
- mcp__supabase__delete_branch
- mcp__supabase__merge_branch
- mcp__supabase__reset_branch
- mcp__supabase__rebase_branch

## Current Database User
- **current_user**: supabase_read_only_user

## Diagnosis
MCP server connected with read-only privileges - insufficient permissions to apply migrations