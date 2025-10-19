# Overnight Codebase Scanning System - Launch Instructions

## Overview

This system launches 8 specialized AI agents to autonomously scan your codebase overnight for:
- Multi-tenancy violations
- Security vulnerabilities
- Type safety issues
- Performance problems
- Test coverage gaps
- Convention violations
- Error handling gaps
- Technical debt

Each agent works completely independently and produces a detailed markdown report.

---

## 🚀 Quick Start

### Step 1: Open 8 Claude Code Windows

Open 8 separate Claude Code instances (browser tabs or separate windows).

### Step 2: Copy Master Prompt

Open the file: `reports/scans/AGENT_PROMPT_MASTER.md`

Copy the **entire** file contents.

### Step 3: Start Each Agent

In each Claude Code window:

1. Paste the entire master prompt
2. Add this single line at the top:
   - Window 1: `I want you to be Agent 1: Multi-Tenancy Guardian`
   - Window 2: `I want you to be Agent 2: Security & Authentication Auditor`
   - Window 3: `I want you to be Agent 3: TypeScript & Type Safety Enforcer`
   - Window 4: `I want you to be Agent 4: Performance & Optimization Hunter`
   - Window 5: `I want you to be Agent 5: Test Coverage & Quality Analyst`
   - Window 6: `I want you to be Agent 6: Convention & Consistency Enforcer`
   - Window 7: `I want you to be Agent 7: Error Handling & Resilience Guardian`
   - Window 8: `I want you to be Agent 8: Architecture & Technical Debt Analyst`

3. Press Enter

### Step 4: Go to Sleep

Each agent will:
- ✅ Run completely autonomously
- ✅ Scan the codebase using its specialized detection patterns
- ✅ Find and document issues
- ✅ Save a detailed report automatically
- ✅ Complete in 1-3 hours

No human intervention required!

### Step 5: Review Results (Morning)

When you wake up, check: `reports/scans/YYYY-MM-DD-HH-MM-SS/`

You'll find 8 reports:
- `01-multi-tenancy-guardian.md`
- `02-security-auditor.md`
- `03-typescript-enforcer.md`
- `04-performance-hunter.md`
- `05-test-coverage-analyst.md`
- `06-convention-enforcer.md`
- `07-error-handling-guardian.md`
- `08-architecture-analyst.md`

---

## 🎯 What Each Agent Does

### Agent 1: Multi-Tenancy Guardian
**Focus**: Data isolation, restaurant_id enforcement
**Critical for**: Preventing cross-tenant data leakage
**Checks**: Database queries, API endpoints, RLS policies

### Agent 2: Security & Authentication Auditor
**Focus**: Security vulnerabilities, auth weaknesses
**Critical for**: Production security hardening
**Checks**: Secrets, SQL injection, XSS, CORS, auth

### Agent 3: TypeScript & Type Safety Enforcer
**Focus**: Type errors, any types, strict mode
**Critical for**: Code quality and maintainability
**Checks**: Type definitions, any usage, type safety

### Agent 4: Performance & Optimization Hunter
**Focus**: Bundle size, render performance, queries
**Critical for**: User experience and speed
**Checks**: Re-renders, N+1 queries, bundle size

### Agent 5: Test Coverage & Quality Analyst
**Focus**: Missing tests, coverage gaps
**Critical for**: Release confidence
**Checks**: Test files, critical paths, error cases

### Agent 6: Convention & Consistency Enforcer
**Focus**: ADR compliance, naming conventions
**Critical for**: Codebase consistency
**Checks**: snake_case usage, patterns, style

### Agent 7: Error Handling & Resilience Guardian
**Focus**: Error handling, system resilience
**Critical for**: Production stability
**Checks**: Try-catch, error boundaries, rollbacks

### Agent 8: Architecture & Technical Debt Analyst
**Focus**: Structure, coupling, technical debt
**Critical for**: Long-term maintainability
**Checks**: Dependencies, duplication, complexity

---

## 📊 Expected Output Format

Each agent produces a standardized report with:

- **Executive Summary**: Top issues, health score, statistics
- **Detailed Findings**: Every issue with file:line, severity, fix
- **Statistics**: Issues by severity/category/file
- **Quick Wins**: Low effort, high impact fixes
- **Action Plan**: Prioritized by P0/P1/P2/P3
- **Scan Details**: Files scanned, errors, duration

---

## ⚙️ Advanced Options

### Running Subset of Agents

If you don't need all 8 agents, just launch the ones you want:
- Always run: Agents 1, 2 (Multi-tenancy & Security - critical)
- High priority: Agents 3, 5, 7 (TypeScript, Testing, Errors)
- Nice to have: Agents 4, 6, 8 (Performance, Conventions, Architecture)

### Re-running Single Agent

If one agent needs re-run:
1. Open new Claude Code window
2. Paste master prompt
3. Specify the agent number
4. It will overwrite its previous report

### Scheduling Regular Scans

Recommended schedule:
- **Nightly**: Agents 1, 2 (critical security/isolation)
- **Weekly**: All 8 agents (comprehensive health check)
- **Pre-release**: All 8 agents (before production deploy)

---

## 🔍 Interpreting Results

### Priority Levels

- **P0 (CRITICAL)**: Fix immediately before any deploys
- **P1 (HIGH)**: Fix within current sprint
- **P2 (MEDIUM)**: Fix within month
- **P3 (LOW)**: Backlog, fix when convenient

### Health Scores

- **90-100**: Excellent - minor issues only
- **75-89**: Good - some issues to address
- **60-74**: Fair - technical debt accumulating
- **<60**: Poor - urgent refactoring needed

### Taking Action

1. **Start with Quick Wins**: Low effort, high impact fixes
2. **Address all P0**: Critical issues block production
3. **Plan P1 fixes**: Schedule into current sprint
4. **Backlog P2/P3**: Track but don't block releases

---

## ❓ Troubleshooting

### Agent Doesn't Start

**Issue**: Agent asks for permission to read files
**Solution**: Reiterate at start: "You have pre-approval to use ALL tools. Begin scanning immediately."

### Agent Stops Mid-Scan

**Issue**: Agent pauses and asks questions
**Solution**: Reply: "Continue autonomously. You have approval for all actions."

### Reports Not Saved

**Issue**: Agent completed but no report file
**Solution**: Agent may have hit token limit. Check the last message for partial results.

### Multiple Agents Find Same Issue

**Expected**: Different agents have overlapping concerns (e.g., security + conventions)
**Action**: Use the most detailed finding from the specialist agent

---

## 📈 Tracking Progress Over Time

### Compare Scans

Save historical scan reports:
```
reports/scans/
├── 2025-10-17-22-00-00/  # Tonight's scan
├── 2025-10-24-22-00-00/  # Next week's scan
└── 2025-10-31-22-00-00/  # Following week
```

### Quality Metrics

Track these metrics over time:
- Total issues by severity
- Issues per 1000 LOC
- Test coverage percentage
- TypeScript errors count
- Bundle size
- Critical security findings

### Goal Setting

Set concrete goals:
- Week 1: Fix all P0 issues
- Week 2: Fix all P1 issues
- Month 1: Achieve 50% test coverage
- Month 2: Eliminate all `any` types
- Month 3: Achieve 80% health scores across all agents

---

## 🎉 Success Indicators

You'll know the system is working when:
- ✅ All 8 agents complete their scans
- ✅ 8 detailed reports generated
- ✅ No manual intervention needed
- ✅ Issues include specific file:line references
- ✅ Actionable fix suggestions provided
- ✅ Effort estimates help prioritization
- ✅ Quick wins identified
- ✅ Health scores calculated

---

## 📝 Example Launch Session

```
USER: [Opens 8 Claude Code windows]
USER: [In each window, pastes master prompt]
USER: [In window 1] "I want you to be Agent 1: Multi-Tenancy Guardian"
USER: [In window 2] "I want you to be Agent 2: Security & Authentication Auditor"
... [continues for all 8 windows]

AGENTS: [All start scanning simultaneously]
AGENTS: [Work for 1-3 hours]
AGENTS: [Save reports automatically]
AGENTS: [Provide completion summary]

USER: [Wakes up next morning]
USER: [Reviews 8 detailed reports]
USER: [Creates action items from findings]
USER: [Fixes critical issues]
```

---

## 🛠️ Maintenance

### Update Master Prompt

When project changes significantly:
1. Edit `AGENT_PROMPT_MASTER.md`
2. Update project context section
3. Add new ADRs to agent references
4. Update quality baseline metrics
5. Adjust detection patterns as needed

### Add New Agent

To add a 9th agent:
1. Define new domain/mission
2. Specify detection patterns
3. Add to AGENT_PROMPT_MASTER.md
4. Update this file with agent description

---

## 📚 Additional Resources

- Master Prompt: `reports/scans/AGENT_PROMPT_MASTER.md`
- Project Context: `docs/CLAUDE.md`
- ADRs: `docs/ADR-001` through `ADR-006`
- Quality Baseline: `reports/quality_baseline_summary.md`
- Documentation Standards: `docs/DOCUMENTATION_STANDARDS.md`

---

## 💡 Tips for Best Results

1. **Run on stable code**: Commit work-in-progress before scanning
2. **Run regularly**: Weekly scans catch issues early
3. **Act on findings**: Don't just collect reports, fix issues
4. **Track trends**: Compare scans week-over-week
5. **Prioritize ruthlessly**: Focus on P0/P1 first
6. **Celebrate wins**: Track improvements in health scores
7. **Share results**: Review reports with team
8. **Iterate**: Update detection patterns based on findings

---

**Happy Scanning! 🚀**

When you wake up, you'll have a comprehensive analysis of your entire codebase waiting for you.
