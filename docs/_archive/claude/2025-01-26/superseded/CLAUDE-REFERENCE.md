
> **ARCHIVED (CLAUDE) — superseded**
> Historical context only. Do NOT rely on it.
> Canonical sources: AGENTS.md and docs/VERIFIED_TRUTH.md.

# Claude Code System Reference

## Configuration Structure
```
~/.claude/                    # Minimal global (optional)
└── config.json              # Just defaults

~/CODING/rebuild-6.0/.claude/  # Project config
├── config.json              # Standalone configuration
├── agent.md                 # Unified agent with all capabilities
└── commands/                # 5 custom commands
    ├── meet-claude.md
    ├── experiment-driven.md
    ├── codebase-context.md
    ├── github-workflow.md
    └── ui-implementation.md
```

## Memory Configuration
- Development: 6GB (NODE_OPTIONS='--max-old-space-size=6144')
- Build: 12GB (NODE_OPTIONS='--max-old-space-size=12288')
- Warning threshold: 5GB
- System RAM: 48GB

## Daily Commands
```bash
npm run dev          # Start dev with 6GB
npm run build        # Build with 12GB
npm run memory:check # Check current usage
npm run reset        # Kill and clean
npm run clean        # Remove caches
```

## Custom Claude Commands
- `/meet-claude` - Capabilities overview
- `/experiment-driven` - Iterative development with tracking
- `/codebase-context` - Generate llms.txt documentation
- `/github-workflow` - Issue creation and PR resolution
- `/ui-implementation` - Figma to React workflow

## Emergency Procedures
```bash
# Memory spike
pkill -f vite && npm run clean && npm run dev

# Port conflict
lsof -i :3001
kill -9 [PID]

# Cache bloat
rm -rf ~/Library/Caches/claude*

# Complete reset
pkill -f claude && pkill -f vite && npm run clean:all
```

## Critical Rules
- ALWAYS use npm scripts (they include NODE_OPTIONS)
- Vite manual chunks MUST stay enabled
- Restart if memory exceeds 5GB
- No inheritance in configs (standalone only)
- One unified agent, not multiple specialized ones