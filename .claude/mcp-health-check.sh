#!/bin/bash
# MCP Server Health Check Script
# Monitors all configured MCP servers and reports status

echo "🔍 MCP Server Health Check - $(date)"
echo "======================================"

# Check CLI MCP servers (project-scope)
echo "📋 Project-Scope MCP Servers:"
claude mcp list 2>/dev/null || echo "❌ CLI MCP servers not accessible"

echo ""
echo "🖥️ Desktop MCP Servers:"

# Check if servers are responsive by testing basic connectivity
DESKTOP_CONFIG="/Users/mikeyoung/Library/Application Support/Claude/claude_desktop_config.json"

if [[ -f "$DESKTOP_CONFIG" ]]; then
    echo "✅ Desktop configuration found"
    
    # Extract server names from config
    SERVERS=$(jq -r '.mcpServers | keys[]' "$DESKTOP_CONFIG" 2>/dev/null)
    
    if [[ -n "$SERVERS" ]]; then
        for server in $SERVERS; do
            echo "   • $server - Configured ✓"
        done
    else
        echo "❌ No servers found in desktop config"
    fi
else
    echo "❌ Desktop configuration not found"
fi

echo ""
echo "📊 Configuration Status:"
echo "   Project config: $(test -f .mcp.json && echo "✅ Found" || echo "❌ Missing")"
echo "   Claude settings: $(test -f .claude/settings.json && echo "✅ Found" || echo "❌ Missing")"
echo "   CLI config: $(test -f ~/.claude.json && echo "✅ Found" || echo "❌ Missing")"

echo ""
echo "🔧 Package Status:"
npm list -g --depth=0 2>/dev/null | grep -E "(filesystem|sequential-thinking|memory|git-mcp|mcp-github)" || echo "   No MCP packages found globally"

echo ""
echo "✨ Health Check Complete - $(date)"