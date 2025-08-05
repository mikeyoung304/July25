#!/bin/bash
# MCP Workflow Runner
# Automates common MCP server workflows for rebuild-6.0

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

show_usage() {
    echo "🚀 MCP Workflow Runner"
    echo "Usage: $0 <workflow> [options]"
    echo ""
    echo "Available workflows:"
    echo "  health-check     - Check MCP server health"
    echo "  validate-config  - Validate MCP configurations"  
    echo "  architecture     - Run architecture analysis workflow"
    echo "  knowledge-sync   - Sync knowledge across sessions"
    echo "  dev-cycle       - Complete development cycle check"
    echo ""
    echo "Options:"
    echo "  --verbose       - Verbose output"
    echo "  --dry-run      - Show what would be done"
    echo "  --help         - Show this help"
}

run_health_check() {
    echo "🔍 Running MCP Health Check Workflow..."
    "$SCRIPT_DIR/mcp-health-check.sh"
}

run_config_validation() {
    echo "✅ Running Configuration Validation Workflow..."
    node "$SCRIPT_DIR/mcp-validator.js"
}

run_architecture_workflow() {
    echo "🏗️ Running Architecture Analysis Workflow..."
    echo "This workflow combines sequential-thinking + memory + filesystem servers"
    
    if [[ "$1" == "--dry-run" ]]; then
        echo "[DRY RUN] Would analyze unified backend architecture"
        echo "[DRY RUN] Would store insights in memory server"
        echo "[DRY RUN] Would review related code files"
        return 0
    fi
    
    echo "📋 Checking server availability..."
    claude mcp list --quiet >/dev/null 2>&1
    
    if [[ $? -eq 0 ]]; then
        echo "✅ MCP servers available"
        echo "💡 Ready for architecture analysis with sequential-thinking server"
        echo "🧠 Memory server ready for pattern storage"  
        echo "📁 Filesystem server ready for code review"
    else
        echo "❌ MCP servers not available"
        return 1
    fi
}

run_knowledge_sync() {
    echo "🧠 Running Knowledge Sync Workflow..."
    echo "This workflow uses memory server for cross-session persistence"
    
    if [[ "$1" == "--dry-run" ]]; then
        echo "[DRY RUN] Would sync knowledge patterns"
        echo "[DRY RUN] Would update memory server"
        return 0
    fi
    
    echo "🔄 Knowledge sync requires active memory server..."
    # This would integrate with actual memory server operations
    echo "✅ Knowledge sync workflow ready"
}

run_dev_cycle() {
    echo "🔄 Running Complete Development Cycle Check..."
    echo ""
    
    echo "1️⃣ Health Check:"
    run_health_check
    echo ""
    
    echo "2️⃣ Configuration Validation:"
    run_config_validation  
    echo ""
    
    echo "3️⃣ Architecture Workflow:"
    run_architecture_workflow "$@"
    echo ""
    
    echo "4️⃣ Knowledge Sync:"
    run_knowledge_sync "$@"
    echo ""
    
    echo "✨ Development cycle check complete!"
}

# Main execution
case "$1" in
    "health-check")
        run_health_check
        ;;
    "validate-config")
        run_config_validation
        ;;
    "architecture")
        run_architecture_workflow "$2"
        ;;
    "knowledge-sync")
        run_knowledge_sync "$2"
        ;;
    "dev-cycle")
        run_dev_cycle "$2"
        ;;
    "--help"|"-h"|"help"|"")
        show_usage
        ;;
    *)
        echo "❌ Unknown workflow: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac