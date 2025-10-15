# Usage Examples for Overnight Scanning Agents

## How to Run Agents with Claude Code

### Example 1: Run a Single Agent

```bash
# Run the Multi-Tenancy Guardian
```

Then in Claude Code, say:

> Read the file `scans/agents/agent-1-multi-tenancy-guardian.md` and execute the scan exactly as defined. Generate a comprehensive report and save it to `scans/reports/$(date +%Y-%m-%d-%H-%M-%S)/multi-tenancy-guardian.md`

### Example 2: Run All 6 Agents Sequentially

Ask Claude Code:

> I want you to run all 6 overnight scanning agents defined in the scans/agents/ directory. For each agent:
> 1. Read the agent definition file
> 2. Execute the scan following the strategy exactly
> 3. Generate a report in the format specified
> 4. Save to scans/reports/[timestamp]/[agent-name].md
>
> Run them in this order (by priority):
> 1. Multi-Tenancy Guardian (CRITICAL)
> 2. Security Auditor (CRITICAL)
> 3. Race Condition Detective (HIGH)
> 4. Convention Enforcer (HIGH)
> 5. Performance Profiler (MEDIUM)
> 6. Complexity Analyzer (MEDIUM)
>
> After all agents complete, generate an EXECUTIVE-SUMMARY.md that consolidates findings from all 6 agents.

### Example 3: Run Specific Agents in Parallel

Ask Claude Code:

> Run these 3 agents in parallel (they scan different file types so won't conflict):
> 1. Multi-Tenancy Guardian (server-side focus)
> 2. Race Condition Detective (client-side focus)
> 3. Security Auditor (both client and server)
>
> Generate reports for each in scans/reports/[timestamp]/

### Example 4: Focus on Critical Issues Only

Ask Claude Code:

> Run only the CRITICAL priority agents tonight:
> - Agent 1: Multi-Tenancy Guardian
> - Agent 4: Security Auditor
>
> I need actionable findings by morning to fix before deployment.

### Example 5: Re-run After Fixes

Ask Claude Code:

> I've fixed the issues from yesterday's multi-tenancy scan. Re-run Agent 1 (Multi-Tenancy Guardian) and compare results with the previous scan at scans/reports/2025-10-13-03-00-00/multi-tenancy-guardian.md
>
> Show me:
> - Issues fixed
> - New issues (if any)
> - Overall improvement percentage

### Example 6: Custom Threshold

Ask Claude Code:

> Run Agent 6 (Complexity Analyzer) but adjust the complexity threshold from 10 to 15 for our codebase. We want to focus on the REALLY bad functions first.

## Agent-Specific Examples

### Multi-Tenancy Guardian

**Use Case**: Before deployment to production
```
Run Multi-Tenancy Guardian with extra focus on these new files:
- server/src/routes/analytics.ts
- server/src/services/reporting.ts

Flag any queries without restaurant_id filtering.
```

### Convention Enforcer

**Use Case**: After onboarding new developer
```
Run Convention Enforcer on files modified in the last week.
Show me any violations of ADR-001 (snake_case standard).
```

### Race Condition Detective

**Use Case**: After adding new real-time features
```
Run Race Condition Detective with focus on:
- WebSocket handlers
- useEffect hooks in client/src/modules/kds/

Recent changes added real-time order updates, want to catch race conditions early.
```

### Security Auditor

**Use Case**: Before security audit
```
Run Security Auditor in strict mode.
Flag even minor issues like:
- HTTP instead of HTTPS
- Missing security headers
- Weak password requirements

Generate a pre-audit checklist.
```

### Performance Profiler

**Use Case**: After adding new dependencies
```
We just added @mui/x-data-grid. Run Performance Profiler to:
1. Check bundle impact
2. Verify tree-shaking is working
3. Flag any import optimizations

Compare bundle size before/after.
```

### Complexity Analyzer

**Use Case**: Sprint planning for refactoring
```
Run Complexity Analyzer and:
1. Identify the top 10 most complex functions
2. Calculate estimated refactoring effort
3. Suggest which to tackle this sprint

Prioritize functions that are both complex AND frequently modified (check git history).
```

## Morning Review Examples

### Quick 5-Minute Review

Ask Claude Code:

> Give me a 5-minute briefing on last night's scans:
> 1. Total CRITICAL issues (must fix today)
> 2. Top 3 quick wins (high impact, low effort)
> 3. Any security issues (highest priority)
>
> Format as a bullet list for standup.

### Detailed Review

Ask Claude Code:

> Create a prioritized action plan from last night's scans:
>
> **Today** (CRITICAL issues):
> - [List with file:line references]
>
> **This Week** (HIGH issues):
> - [List with effort estimates]
>
> **This Sprint** (MEDIUM issues):
> - [Refactoring opportunities]
>
> Generate GitHub issues for each item.

### Trend Analysis

Ask Claude Code:

> Compare this week's scans with last week's (scans/reports/2025-10-07-*):
>
> Show me:
> - Issues fixed (celebrate wins!)
> - New issues introduced (need attention)
> - Metrics improved (bundle size, complexity, etc.)
> - Overall code quality trend
>
> Generate a chart or table showing progress.

## Integration Examples

### Pre-Commit Hook

```bash
# .git/hooks/pre-commit
# Run quick security scan before commit

echo "Running Security Auditor on staged files..."
claude-code "Run Agent 4 (Security Auditor) on staged files only. Flag any exposed secrets or security issues. Block commit if CRITICAL issues found."
```

### CI/CD Pipeline

```yaml
# .github/workflows/nightly-scan.yml
name: Nightly Code Quality Scan

on:
  schedule:
    - cron: '0 3 * * *'  # 3 AM daily

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run All Agents
        run: |
          claude-code "Run all 6 overnight scanning agents and generate reports"
      - name: Upload Reports
        uses: actions/upload-artifact@v2
        with:
          name: scan-reports
          path: scans/reports/
```

### Weekly Summary Email

Ask Claude Code:

> Generate a weekly summary email from this week's scans (all reports in scans/reports/2025-10-*):
>
> Subject: Weekly Code Quality Report - Week of Oct 14
>
> Include:
> - Key metrics (violations, fixes, trends)
> - Top 5 issues that need attention
> - Wins (issues fixed this week)
> - Team shoutouts (who fixed the most issues)
>
> Format as HTML email.

## Advanced Usage

### Custom Agent Combination

Ask Claude Code:

> Create a custom "Pre-Deployment Audit" by combining:
> - Multi-Tenancy Guardian (data safety)
> - Security Auditor (security)
> - Performance Profiler (bundle size check)
>
> Run only CRITICAL checks from each.
> Generate a go/no-go deployment recommendation.

### Focus on Specific Module

Ask Claude Code:

> Run all 6 agents but ONLY on the KDS (Kitchen Display System) module:
> - client/src/modules/kds/**
> - server/src/routes/kds.ts
> - server/src/services/kds-*.ts
>
> We're refactoring this module and want a quality baseline.

### Compare Branches

Ask Claude Code:

> Compare code quality between main and feature/new-payment-flow:
>
> 1. Run Agent 5 (Performance Profiler) on both branches
> 2. Show bundle size difference
> 3. Flag any new memory leaks
> 4. Recommend whether to merge based on performance impact

## Troubleshooting Examples

### Agent Running Too Long

> Agent 3 (Race Condition Detective) has been running for 2 hours. Please:
> 1. Check if it's stuck
> 2. If stuck, cancel and re-run with:
>    - Exclude test files
>    - Limit to top 50 files by complexity
> 3. Generate partial report with what was scanned

### Too Many False Positives

> Agent 2 (Convention Enforcer) flagged 500+ violations, many are false positives.
>
> Please:
> 1. Review the top 20 findings
> 2. Identify patterns in false positives
> 3. Suggest exclusion rules
> 4. Re-run with refined rules

### Memory Issues

> Agent 6 (Complexity Analyzer) crashed with out-of-memory error.
>
> Please:
> 1. Run in batches (25 files at a time)
> 2. Start with server/ directory
> 3. Then client/ directory
> 4. Combine reports at the end

## Report Customization Examples

### Executive-Friendly Report

Ask Claude Code:

> Generate an executive summary from last night's scans suitable for non-technical stakeholders:
>
> - Use plain English (no jargon)
> - Focus on business impact (data breach risk, user experience, costs)
> - Include risk levels (High/Medium/Low)
> - Provide effort estimates in days, not hours
> - Add recommendations with ROI

### Developer-Focused Report

Ask Claude Code:

> Generate a technical deep-dive from last night's scans for the dev team:
>
> - Include code samples for each finding
> - Show exact git blame for who introduced the issue
> - Link to relevant documentation (ADR-001, coding standards)
> - Suggest specific libraries/tools to fix issues
> - Include automated fix scripts where possible

### Sprint Planning Report

Ask Claude Code:

> Generate a sprint planning report from this week's scans:
>
> - Group issues by estimated effort (1 point, 2 points, 3 points, 5 points)
> - Highlight "quick wins" (high impact, low effort)
> - Suggest 2-3 technical debt tickets for sprint
> - Provide acceptance criteria for each ticket

## Quick Commands Reference

```bash
# Run all agents overnight
./scans/run-all-agents.sh &

# Check if agents are still running
ps aux | grep claude

# View latest executive summary
cat scans/reports/$(ls -t scans/reports | head -1)/EXECUTIVE-SUMMARY.md

# Count total issues from last scan
grep -r "CRITICAL\|HIGH\|MEDIUM" scans/reports/$(ls -t scans/reports | head -1)/ | wc -l

# Find all multi-tenancy violations
cat scans/reports/$(ls -t scans/reports | head -1)/multi-tenancy-guardian.md | grep "restaurant_id"

# Compare bundle sizes week-over-week
diff <(cat scans/reports/2025-10-07-*/performance-profiler.md | grep "Bundle Size") \
     <(cat scans/reports/2025-10-14-*/performance-profiler.md | grep "Bundle Size")
```

---

**Pro Tip**: Save your common prompts as shell aliases or scripts for quick access!

```bash
# Add to ~/.bashrc or ~/.zshrc
alias scan-all="claude-code 'Run all 6 overnight scanning agents'"
alias scan-critical="claude-code 'Run CRITICAL priority agents only'"
alias scan-summary="cat scans/reports/$(ls -t scans/reports | head -1)/EXECUTIVE-SUMMARY.md"
```
