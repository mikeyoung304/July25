# Overnight Code Scanning System

**Version**: 1.0.0
**Created**: 2025-10-14
**Purpose**: Automated overnight code quality scans for Grow App

## Overview

This system provides 6 specialized AI agents that scan your codebase overnight for different categories of issues. Each agent has a specific focus and generates detailed reports with actionable recommendations.

## The 6 Specialized Agents

### 🔒 Agent 1: Multi-Tenancy Guardian (CRITICAL)
**Focus**: Data leak prevention via restaurant_id enforcement
**Runtime**: 30-45 minutes
**Priority**: CRITICAL

**What it finds**:
- Database queries missing restaurant_id filters
- API endpoints accepting restaurant_id from client input
- RLS policy gaps
- Multi-tenant test coverage gaps

**Why it matters**: A single missing restaurant_id filter can expose all customer data across restaurants—an enterprise-killer.

---

### 📐 Agent 2: Convention Enforcer (HIGH)
**Focus**: Snake_case naming convention (ADR-001)
**Runtime**: 30-40 minutes
**Priority**: HIGH

**What it finds**:
- camelCase in API responses (should be snake_case)
- Transformation utilities that violate ADR-001
- Inconsistent naming across layers
- Type definitions with wrong conventions

**Why it matters**: Enforces your architectural standard for consistency, maintainability, and zero transformation overhead.

---

### ⚡ Agent 3: Race Condition Detective (HIGH)
**Focus**: Async/await bugs and concurrency issues
**Runtime**: 40-50 minutes
**Priority**: HIGH

**What it finds**:
- Missing await in async functions
- useEffect without cleanup (memory leaks)
- setState after component unmount
- Promise.all without error handling
- WebSocket race conditions
- Infinite re-render loops

**Why it matters**: Recent git commits show race conditions caused infinite loading states. These bugs are intermittent and production-breaking.

---

### 🛡️ Agent 4: Security Auditor (CRITICAL)
**Focus**: Security vulnerabilities and exposed secrets
**Runtime**: 35-45 minutes
**Priority**: CRITICAL

**What it finds**:
- API keys exposed in client code
- SQL injection vulnerabilities
- Authentication bypasses
- Weak CORS configuration
- Sensitive data in logs
- .env files committed to git

**Why it matters**: Security breaches lead to data loss, reputation damage, regulatory fines, and potential lawsuits.

---

### 🚀 Agent 5: Performance Profiler (MEDIUM)
**Focus**: Performance bottlenecks and bundle optimization
**Runtime**: 35-45 minutes
**Priority**: MEDIUM

**What it finds**:
- Oversized bundles (>100KB main chunk violates CLAUDE.md)
- Large library imports (lodash, moment)
- Missing React.memo on expensive components
- Memory leaks (missing cleanup)
- N+1 database query problems
- Expensive operations in render

**Why it matters**: Performance affects user experience, conversion rates, and hosting costs. Recent commits show analytics endpoint caused infinite load.

---

### 🏗️ Agent 6: Complexity Analyzer (MEDIUM)
**Focus**: Code smells, duplication, refactoring opportunities
**Runtime**: 40-50 minutes
**Priority**: MEDIUM (long-term quality)

**What it finds**:
- High cyclomatic complexity (>10)
- Long functions (>50 lines)
- God objects (>15 methods)
- Code duplication
- Deep nesting (>4 levels)
- Magic numbers

**Why it matters**: Technical debt compounds. Git history shows active simplification efforts ("simplify to 2 order types"), so identifying complexity hotspots helps prioritize refactoring.

---

## Directory Structure

```
scans/
├── README.md                          # This file
├── agents/                            # Agent definitions (6 files)
│   ├── agent-1-multi-tenancy-guardian.md
│   ├── agent-2-convention-enforcer.md
│   ├── agent-3-race-condition-detective.md
│   ├── agent-4-security-auditor.md
│   ├── agent-5-performance-profiler.md
│   └── agent-6-complexity-analyzer.md
├── reports/                           # Generated reports (by timestamp)
│   └── 2025-10-14-03-00-00/          # Example timestamp
│       ├── multi-tenancy-guardian.md
│       ├── convention-enforcer.md
│       ├── race-condition-detective.md
│       ├── security-auditor.md
│       ├── performance-profiler.md
│       ├── complexity-analyzer.md
│       └── EXECUTIVE-SUMMARY.md
└── run-all-agents.sh                  # Master orchestration script
```

## How to Run

### Option 1: Run All Agents (Recommended for Overnight)

```bash
# Make script executable (one-time setup)
chmod +x scans/run-all-agents.sh

# Run all agents in sequence
./scans/run-all-agents.sh

# Or run in background and check tomorrow
nohup ./scans/run-all-agents.sh > scans/scan.log 2>&1 &
```

### Option 2: Run Individual Agents

Use Claude Code to run specific agents:

```bash
# Example: Run just the security audit
claude-code "Read scans/agents/agent-4-security-auditor.md and execute the scan as defined. Generate the report in scans/reports/[timestamp]/security-auditor.md"
```

### Option 3: Run Agents in Parallel (Faster)

The agents have non-overlapping file focuses, so they can run in parallel:

```bash
# In separate terminals or tmux panes
claude-code "Run agent 1" &
claude-code "Run agent 2" &
claude-code "Run agent 3" &
claude-code "Run agent 4" &
claude-code "Run agent 5" &
claude-code "Run agent 6" &
wait
```

## Execution Timeline

**Sequential Execution** (safe, recommended for first run):
- Total runtime: ~3-4 hours
- Agents run one after another
- Lower system resource usage

**Parallel Execution** (faster):
- Total runtime: ~50-60 minutes
- All agents run simultaneously
- Higher resource usage (monitor memory)

## Morning Review Workflow

1. **Check Executive Summary**
   ```bash
   cat scans/reports/[latest]/EXECUTIVE-SUMMARY.md
   ```

2. **Prioritize by Severity**
   - Start with CRITICAL issues (Agents 1 & 4)
   - Move to HIGH issues (Agents 2 & 3)
   - Schedule MEDIUM issues (Agents 5 & 6)

3. **Create Action Items**
   - Add CRITICAL fixes to today's sprint
   - Schedule HIGH fixes for this week
   - Plan MEDIUM improvements for this sprint

4. **Track Progress**
   - Use todo list or GitHub issues
   - Link commits to findings
   - Re-run agents after fixes to verify

## Expected Output

Each agent generates a comprehensive markdown report with:

- **Executive Summary**: 2-3 sentence overview
- **Statistics**: Total issues, severity breakdown
- **Critical Findings**: Top 10 most important issues with:
  - File:line references
  - Code examples (current vs. recommended)
  - Impact assessment
  - Estimated fix effort
- **All Findings**: Complete list in tabular format
- **Next Steps**: Immediate, short-term, and long-term actions
- **Recommendations**: Tools, patterns, preventive measures

## Integration with Development Workflow

### Daily Workflow
```bash
# Morning: Review overnight scan results
cat scans/reports/latest/EXECUTIVE-SUMMARY.md

# Create fixes based on findings
# Commit with reference to finding
git commit -m "fix: missing restaurant_id filter (scan finding #1.3)"

# Evening: Queue overnight scan
./scans/run-all-agents.sh &
```

### Weekly Workflow
```bash
# Monday: Review all CRITICAL and HIGH issues
# Prioritize top 10 for the week

# Friday: Re-run specific agents to verify fixes
# Compare before/after metrics
```

### Sprint Workflow
```bash
# Sprint planning: Review MEDIUM issues
# Select refactoring targets for sprint
# Set technical debt reduction goals

# Sprint review: Compare metrics
# Celebrate reductions in complexity, duplications
```

## Customization

### Adjust Agent Priorities

Edit agent definitions to change:
- Detection thresholds (e.g., complexity >15 instead of >10)
- File patterns to scan
- Severity classifications
- Report format

### Add New Agents

Create new agent definition following the template:
```markdown
# Agent N: [Name]
**Priority**: [CRITICAL/HIGH/MEDIUM/LOW]
**Runtime**: [estimate]
**Focus**: [description]

## Mission
[What the agent does]

## Scan Strategy
[How it scans]

## Detection Patterns
[What it looks for]

## Report Template
[Output format]

## Success Criteria
[Validation checklist]
```

### Exclude Files/Patterns

Add exclusions to agent definitions:
```markdown
## Exclusions
Do NOT flag:
- Test files (*.test.ts, *.spec.ts)
- Generated code (dist/, build/)
- Third-party libraries (node_modules/)
- Migration files (supabase/migrations/)
```

## Best Practices

### 1. Run Overnight
- Scans take 3-4 hours sequentially
- Don't block development time
- Fresh results in the morning

### 2. Review Every Morning
- 10-minute review of executive summary
- Prioritize CRITICAL issues immediately
- Plan HIGH issues for the day

### 3. Track Trends
- Save reports with timestamps
- Compare week-over-week metrics
- Celebrate improvements

### 4. Act on Findings
- Don't let reports sit
- Create GitHub issues from findings
- Link commits to scan results

### 5. Refine Agents
- Adjust thresholds based on your team
- Add project-specific patterns
- Remove false positives

## Metrics to Track

### Code Quality Metrics
- **Multi-tenancy violations**: Target 0
- **Convention violations**: Target <10
- **Race conditions**: Target 0 CRITICAL
- **Security issues**: Target 0 CRITICAL
- **Bundle size**: Target <800KB total
- **Avg complexity**: Target <8

### Progress Metrics
- Issues found vs. fixed (weekly)
- Time to fix CRITICAL issues (target <24hrs)
- Technical debt reduction (month-over-month)
- Code duplication ratio (target <5%)

## Troubleshooting

### Agent Takes Too Long
- Check if running on large files (>1000 lines)
- Exclude generated code
- Run specific sections only

### False Positives
- Review exclusion rules
- Adjust detection thresholds
- Document intentional violations

### Out of Memory
- Run agents sequentially instead of parallel
- Increase Node memory limit: `NODE_OPTIONS=--max-old-space-size=8192`
- Exclude large files

### Missing Findings
- Verify file patterns match your structure
- Check grep patterns are correct
- Review agent success criteria

## Support

For issues or questions:
1. Check agent definition README sections
2. Review example findings for clarity
3. Adjust thresholds if too sensitive
4. Add exclusions for false positives

## Version History

**v1.0.0** (2025-10-14)
- Initial release
- 6 specialized agents
- Comprehensive report templates
- Tailored to Grow App architecture

---

## Quick Reference: Agent Comparison

| Agent | Priority | Runtime | Focus Area | Key Metrics |
| --- | --- | --- | --- | --- |
| 1. Multi-Tenancy Guardian | CRITICAL | 30-45min | Data isolation | restaurant_id violations |
| 2. Convention Enforcer | HIGH | 30-40min | Naming standards | ADR-001 compliance % |
| 3. Race Condition Detective | HIGH | 40-50min | Async bugs | Race conditions found |
| 4. Security Auditor | CRITICAL | 35-45min | Vulnerabilities | Exposed secrets, auth gaps |
| 5. Performance Profiler | MEDIUM | 35-45min | Speed & size | Bundle size, memory leaks |
| 6. Complexity Analyzer | MEDIUM | 40-50min | Code quality | Avg complexity, duplication |

**Total Sequential Runtime**: ~3-4 hours
**Total Parallel Runtime**: ~50-60 minutes (highest runtime agent)

---

*Built with deep analysis of your codebase's specific pain points from git history and architectural standards.*
