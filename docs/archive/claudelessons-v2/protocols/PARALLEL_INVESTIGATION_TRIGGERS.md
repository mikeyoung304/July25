# Parallel Investigation Triggers (PIT)

**Version**: 1.0
**Created**: 2025-11-16
**Purpose**: Define when and how to launch multiple investigation threads

---

## Core Principle

> **"When uncertainty is high, investigate in parallel. When paths diverge, explore all branches simultaneously."**

Single-threaded debugging wastes time when multiple hypotheses are equally likely. PIT defines triggers for launching parallel subagents and how to synthesize their findings.

---

## Trigger Conditions

### Automatic Trigger: Launch Subagents When...

#### 1. Multiple Equally-Likely Hypotheses (MEH)
```
CONDITION: 3+ hypotheses with >20% confidence each
TRIGGER: Launch N subagents (one per hypothesis)
MAX: 5 parallel agents

EXAMPLE:
Build fails with vague error message:
- Hypothesis 1 (30%): Dependency issue
- Hypothesis 2 (25%): TypeScript config
- Hypothesis 3 (25%): Recent code change
- Hypothesis 4 (20%): Environment variable

ACTION: Launch 4 subagents in parallel
```

#### 2. Time Budget Exceeded (TBE)
```
CONDITION: Diagnostic step exceeds 150% of time budget
TRIGGER: Launch 3 standard investigation agents
TIMEOUT: Remaining time budget / 3

EXAMPLE:
Step budget: 15 minutes
Time elapsed: 23 minutes (153%)
→ TRIGGER: Parallel investigation
→ Each agent gets: (30min total - 23min used) / 3 = 2.3min each
```

#### 3. Environmental Disparity Detected (EDD)
```
CONDITION: Works in environment A, fails in environment B
TRIGGER: Launch comparison agents
AGENTS: 3

AGENT 1: Compare dependencies (package versions)
AGENT 2: Compare environment variables
AGENT 3: Compare runtime configurations
```

#### 4. Circular Investigation Detected (CID)
```
CONDITION: Testing same hypothesis twice
TRIGGER: Escalate to meta-analysis
AGENTS: 2

AGENT 1: Analyze investigation path (find circular logic)
AGENT 2: Generate novel hypotheses (fresh perspective)

EXAMPLE:
Diagnostic log shows:
- 10:30 - Test: Check if module installed
- 10:35 - Test: Check import path
- 10:40 - Test: Check if module installed (DUPLICATE!)

→ TRIGGER: Circular investigation detected
→ Launch meta-analysis agents
```

#### 5. Unknown Error Pattern (UEP)
```
CONDITION: Error not in Error Pattern Library
AND: No claudelessons match
TRIGGER: Research and pattern mining agents
AGENTS: 4

AGENT 1: Search stack overflow
AGENT 2: Search GitHub issues
AGENT 3: Analyze recent commits
AGENT 4: Check dependency changelogs
```

---

## Subagent Orchestration

### Agent Assignment Template

```javascript
// claudelessons-v2/protocols/subagent-orchestrator.js

class SubagentOrchestrator {
  constructor(issue, context) {
    this.issue = issue;
    this.context = context;
    this.agents = [];
    this.results = [];
  }

  async launchParallelInvestigation(trigger) {
    console.log(`\n🚀 PARALLEL INVESTIGATION TRIGGERED`);
    console.log(`   Trigger: ${trigger.name}`);
    console.log(`   Confidence threshold: ${trigger.threshold}%`);
    console.log(`   Agents to launch: ${trigger.agentCount}\n`);

    // Define investigation agents
    const agents = this.defineAgents(trigger);

    // Launch all agents in parallel
    const startTime = Date.now();
    const results = await Promise.all(
      agents.map((agent, idx) =>
        this.runAgent(agent, idx, trigger.timeLimit)
      )
    );

    // Synthesize findings
    const synthesis = this.synthesizeResults(results);

    console.log(`\n✅ Parallel investigation complete`);
    console.log(`   Duration: ${(Date.now() - startTime) / 1000}s`);
    console.log(`   Findings synthesized: ${synthesis.recommendations.length}`);

    return synthesis;
  }

  defineAgents(trigger) {
    switch (trigger.type) {
      case 'MEH': // Multiple Equally-likely Hypotheses
        return this.context.hypotheses.map(h => ({
          name: `Hypothesis: ${h.name}`,
          task: 'test_hypothesis',
          hypothesis: h,
          commands: h.testCommands,
          successCriteria: h.expected
        }));

      case 'TBE': // Time Budget Exceeded
        return [
          {
            name: 'Recent Changes Analyzer',
            task: 'analyze_recent_changes',
            commands: [
              'git log --since="1 day ago" --oneline',
              'git diff HEAD~5 -- "*.ts" "*.tsx"'
            ]
          },
          {
            name: 'Dependency Validator',
            task: 'validate_dependencies',
            commands: [
              'npm ls --depth=0',
              'npm outdated',
              'npm audit'
            ]
          },
          {
            name: 'Configuration Checker',
            task: 'check_configs',
            commands: [
              'cat tsconfig.json | jq .',
              'cat vite.config.ts',
              'env | grep -E "NODE|VITE"'
            ]
          }
        ];

      case 'EDD': // Environmental Disparity
        return [
          {
            name: 'Dependency Diff',
            task: 'compare_dependencies',
            commands: [
              'diff <(npm ls --prod --depth=0 | sort) <(ssh prod "npm ls --prod --depth=0" | sort)',
              'node --version && ssh prod "node --version"',
              'npm --version && ssh prod "npm --version"'
            ]
          },
          {
            name: 'Environment Diff',
            task: 'compare_env_vars',
            commands: [
              'env | grep -E "NODE|PORT|DB|API" | sort > local.env',
              'ssh prod "env | grep -E NODE|PORT|DB|API | sort" > prod.env',
              'diff local.env prod.env'
            ]
          },
          {
            name: 'Runtime Config Diff',
            task: 'compare_runtime',
            commands: [
              'docker inspect $(docker ps -q -f name=app) | jq .[0].Config',
              'cat docker-compose.yml | yq .services.app',
              'diff deploy/dev.yml deploy/prod.yml'
            ]
          }
        ];

      case 'CID': // Circular Investigation
        return [
          {
            name: 'Investigation Path Analyzer',
            task: 'analyze_investigation',
            commands: [
              'cat .claudelessons/diagnostic.log | grep "HYPOTHESIS:"',
              'cat .claudelessons/diagnostic.log | awk "/HYPOTHESIS:/{count[$0]++} END {for (h in count) if (count[h] > 1) print h, count[h]}"'
            ]
          },
          {
            name: 'Novel Hypothesis Generator',
            task: 'generate_novel_hypotheses',
            commands: [
              'npx claudelessons similar-issues --error="$(cat error.log)"',
              'git log --all --grep="$(cat error.log | head -1)" --oneline'
            ]
          }
        ];

      case 'UEP': // Unknown Error Pattern
        return [
          {
            name: 'Stack Overflow Researcher',
            task: 'search_stackoverflow',
            commands: [
              'npx claudelessons search-so "$(cat error.log | head -5)"'
            ]
          },
          {
            name: 'GitHub Issues Researcher',
            task: 'search_github_issues',
            commands: [
              'gh search issues "$(cat error.log | head -1)" --limit 10'
            ]
          },
          {
            name: 'Recent Changes Analyzer',
            task: 'analyze_recent_changes',
            commands: [
              'git log --since="1 week ago" --all --oneline',
              'git diff HEAD~10 --stat'
            ]
          },
          {
            name: 'Dependency Changelog Checker',
            task: 'check_dependency_changes',
            commands: [
              'npm outdated --json | jq "to_entries[] | select(.value.wanted != .value.current)"',
              'git diff HEAD~1 -- package-lock.json | grep "^+" | grep version'
            ]
          }
        ];

      default:
        throw new Error(`Unknown trigger type: ${trigger.type}`);
    }
  }

  async runAgent(agent, index, timeLimit) {
    console.log(`\n🤖 Agent ${index + 1}: ${agent.name}`);
    console.log(`   Task: ${agent.task}`);
    console.log(`   Time limit: ${timeLimit}ms`);

    const startTime = Date.now();
    const timeout = setTimeout(() => {
      console.log(`   ⏰ Agent ${index + 1} timeout reached`);
    }, timeLimit);

    try {
      const results = [];
      for (const command of agent.commands) {
        console.log(`   ▸ Running: ${command.substring(0, 60)}...`);
        const output = await exec(command, { timeout: timeLimit });
        results.push({
          command,
          output,
          timestamp: Date.now()
        });
      }

      clearTimeout(timeout);
      const duration = Date.now() - startTime;

      console.log(`   ✅ Agent ${index + 1} complete (${duration}ms)`);

      return {
        agent: agent.name,
        task: agent.task,
        results,
        duration,
        success: true
      };

    } catch (error) {
      clearTimeout(timeout);
      console.log(`   ❌ Agent ${index + 1} failed: ${error.message}`);

      return {
        agent: agent.name,
        task: agent.task,
        error: error.message,
        duration: Date.now() - startTime,
        success: false
      };
    }
  }

  synthesizeResults(results) {
    console.log(`\n📊 SYNTHESIZING FINDINGS`);
    console.log(`   Successful agents: ${results.filter(r => r.success).length}/${results.length}`);

    // Analyze all agent outputs
    const findings = results
      .filter(r => r.success)
      .flatMap(r => this.extractFindings(r));

    // Group by confidence
    const highConfidence = findings.filter(f => f.confidence > 0.7);
    const mediumConfidence = findings.filter(f => f.confidence > 0.4 && f.confidence <= 0.7);
    const lowConfidence = findings.filter(f => f.confidence <= 0.4);

    console.log(`   High confidence findings: ${highConfidence.length}`);
    console.log(`   Medium confidence findings: ${mediumConfidence.length}`);
    console.log(`   Low confidence findings: ${lowConfidence.length}`);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      highConfidence,
      mediumConfidence,
      lowConfidence
    );

    return {
      findings,
      highConfidence,
      mediumConfidence,
      lowConfidence,
      recommendations,
      nextSteps: this.determineNextSteps(recommendations)
    };
  }

  extractFindings(agentResult) {
    // Pattern matching on agent outputs
    const findings = [];

    for (const result of agentResult.results) {
      // Look for common patterns
      if (result.output.includes('ECONNREFUSED')) {
        findings.push({
          type: 'connection_refused',
          confidence: 0.9,
          source: agentResult.agent,
          evidence: result.output,
          recommendation: 'Check if database/service is running'
        });
      }

      if (result.output.includes('not found') || result.output.includes('404')) {
        findings.push({
          type: 'resource_not_found',
          confidence: 0.8,
          source: agentResult.agent,
          evidence: result.output,
          recommendation: 'Verify resource exists and path is correct'
        });
      }

      if (result.output.includes('version') && result.output.includes('mismatch')) {
        findings.push({
          type: 'version_mismatch',
          confidence: 0.85,
          source: agentResult.agent,
          evidence: result.output,
          recommendation: 'Sync versions between environments'
        });
      }

      // Add more pattern matchers...
    }

    return findings;
  }

  generateRecommendations(high, medium, low) {
    const recommendations = [];

    // High confidence findings → immediate action
    if (high.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'immediate',
        finding: high[0],
        command: this.getFixCommand(high[0])
      });
    }

    // Medium confidence → manual verification
    if (medium.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'verify_then_fix',
        findings: medium,
        verificationSteps: medium.map(f => this.getVerificationCommand(f))
      });
    }

    // Low confidence → further investigation
    if (low.length > 0) {
      recommendations.push({
        priority: 'LOW',
        action: 'investigate_further',
        findings: low,
        nextInvestigation: 'Launch deep-dive subagent'
      });
    }

    return recommendations;
  }

  determineNextSteps(recommendations) {
    if (recommendations.length === 0) {
      return {
        action: 'escalate_to_human',
        reason: 'No clear findings from parallel investigation'
      };
    }

    const highPriority = recommendations.find(r => r.priority === 'HIGH');
    if (highPriority) {
      return {
        action: 'apply_fix',
        fix: highPriority.command,
        confidence: highPriority.finding.confidence
      };
    }

    return {
      action: 'manual_review',
      recommendations: recommendations.map(r => r.finding)
    };
  }

  getFixCommand(finding) {
    // Map finding types to fix commands
    const fixes = {
      connection_refused: 'docker-compose up -d',
      resource_not_found: 'npm install',
      version_mismatch: 'npm ci',
      // ... more mappings
    };

    return fixes[finding.type] || 'manual_fix_required';
  }

  getVerificationCommand(finding) {
    const verifications = {
      connection_refused: 'docker ps | grep postgres',
      resource_not_found: 'ls node_modules',
      version_mismatch: 'npm ls',
      // ... more mappings
    };

    return verifications[finding.type] || 'manual_verification_required';
  }
}
```

---

## Example: Real-World PIT Execution

### Scenario: Build Fails After npm install

```javascript
// Trigger detection
const issue = {
  type: 'build_failure',
  error: 'Cannot find module @/components/Header',
  context: {
    lastCommand: 'npm install',
    environment: 'development',
    recentChanges: ['package.json updated']
  }
};

// Evaluate trigger conditions
const trigger = evaluateTriggers(issue);
// Result: UEP (Unknown Error Pattern) - not in library

// Launch parallel investigation
const orchestrator = new SubagentOrchestrator(issue, issue.context);
const results = await orchestrator.launchParallelInvestigation({
  type: 'UEP',
  agentCount: 4,
  timeLimit: 5 * 60 * 1000 // 5 minutes per agent
});

/* OUTPUT:

🚀 PARALLEL INVESTIGATION TRIGGERED
   Trigger: Unknown Error Pattern
   Confidence threshold: 50%
   Agents to launch: 4

🤖 Agent 1: Recent Changes Analyzer
   Task: analyze_recent_changes
   ▸ Running: git log --since="1 day ago" --oneline
   ▸ Running: git diff HEAD~5 -- "*.ts" "*.tsx"
   ✅ Agent 1 complete (2341ms)

🤖 Agent 2: Dependency Validator
   Task: validate_dependencies
   ▸ Running: npm ls --depth=0
   ▸ Running: npm outdated
   ▸ Running: npm audit
   ✅ Agent 2 complete (8903ms)

🤖 Agent 3: Configuration Checker
   Task: check_configs
   ▸ Running: cat tsconfig.json | jq .
   ▸ Running: cat vite.config.ts
   ▸ Running: env | grep -E "NODE|VITE"
   ✅ Agent 3 complete (453ms)

🤖 Agent 4: Dependency Changelog Checker
   Task: check_dependency_changes
   ▸ Running: npm outdated --json | jq ...
   ▸ Running: git diff HEAD~1 -- package-lock.json | grep "^+" | grep version
   ✅ Agent 4 complete (1876ms)

📊 SYNTHESIZING FINDINGS
   Successful agents: 4/4
   High confidence findings: 1
   Medium confidence findings: 2
   Low confidence findings: 1

FINDINGS:

✅ HIGH CONFIDENCE (0.9):
   Type: missing_path_alias
   Source: Configuration Checker
   Evidence: tsconfig.json missing "paths" config for "@/*" alias
   Recommendation: Add path mapping to tsconfig.json

⚠️  MEDIUM CONFIDENCE (0.6):
   Type: recent_dependency_update
   Source: Dependency Changelog Checker
   Evidence: vite updated from 4.5.0 to 5.0.0 (major version)
   Recommendation: Check Vite 5.0 breaking changes

⚠️  MEDIUM CONFIDENCE (0.5):
   Type: build_tool_config
   Source: Configuration Checker
   Evidence: vite.config.ts has "resolve.alias" but incomplete
   Recommendation: Ensure vite.config.ts and tsconfig.json aligned

ℹ️  LOW CONFIDENCE (0.3):
   Type: node_modules_corruption
   Source: Dependency Validator
   Evidence: Some peer dependencies unmet
   Recommendation: Try npm ci

RECOMMENDED ACTIONS:

1. [HIGH PRIORITY] Add path mapping to tsconfig.json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }

2. [MEDIUM PRIORITY] Align Vite and TypeScript configs
   Ensure vite.config.ts resolve.alias matches tsconfig paths

3. [LOW PRIORITY] Clean reinstall if above don't work
   rm -rf node_modules && npm ci

*/
```

---

## Trigger Decision Matrix

| Condition | Trigger | Agents | Time Each | Total Time |
|-----------|---------|--------|-----------|------------|
| 3+ hypotheses @ >20% confidence | MEH | N (= hypothesis count) | Budget / N | Budget |
| Step > 150% time budget | TBE | 3 | Remaining / 3 | Remaining |
| Dev works, Prod fails | EDD | 3 | 10 min | 30 min |
| Testing same hypothesis 2x | CID | 2 | 15 min | 30 min |
| Error not in EPL | UEP | 4 | 5 min | 20 min |

---

## Synthesis Algorithms

### Confidence Scoring

```javascript
function calculateConfidence(finding, agentResults) {
  let confidence = 0;

  // Multiple agents found same thing
  const agreementCount = agentResults.filter(r =>
    r.findings.some(f => f.type === finding.type)
  ).length;
  confidence += agreementCount * 0.2; // +20% per agreement

  // Evidence strength
  if (finding.evidence.includes('error') || finding.evidence.includes('failed')) {
    confidence += 0.3; // Strong evidence
  }

  // Pattern match in EPL
  const eplMatch = errorPatternLibrary.find(finding.type);
  if (eplMatch) {
    confidence += 0.25; // Known pattern
  }

  // Recency of related changes
  if (finding.source === 'Recent Changes Analyzer' &&
      finding.evidence.includes('1 hour ago')) {
    confidence += 0.15; // Very recent change
  }

  return Math.min(confidence, 1.0); // Cap at 100%
}
```

### Conflict Resolution

When agents provide conflicting findings:

```javascript
function resolveConflicts(findings) {
  // Group by type
  const grouped = findings.reduce((acc, f) => {
    acc[f.type] = acc[f.type] || [];
    acc[f.type].push(f);
    return acc;
  }, {});

  // For each conflict
  return Object.entries(grouped).map(([type, group]) => {
    if (group.length === 1) {
      return group[0]; // No conflict
    }

    // Multiple findings of same type - take highest confidence
    const sorted = group.sort((a, b) => b.confidence - a.confidence);

    return {
      ...sorted[0],
      confidence: sorted[0].confidence * 0.8, // Reduce due to conflict
      note: `${group.length} agents found this, showing highest confidence result`
    };
  });
}
```

---

## Integration with HTF and DDT

```
DDT Step: Unknown error encountered
   ↓
HTF: No hypothesis > 50% confidence
   ↓
PIT: TRIGGER - Unknown Error Pattern
   ↓
Launch 4 parallel agents
   ↓
Each agent runs HTF on their investigation path
   ↓
Synthesize results
   ↓
IF high confidence finding
  → Return to DDT with new hypothesis
ELSE
  → Escalate to human
```

---

## CLI Integration

```bash
# Manual trigger
npx claudelessons pit \
  --trigger=UEP \
  --error="$(cat error.log)" \
  --time-limit=20

# Auto-detect and trigger
npx claudelessons diagnose \
  --auto-pit \
  --budget=30

# Example output:
┌──────────────────────────────────────────┐
│ PARALLEL INVESTIGATION                   │
│ Auto-triggered: Time Budget Exceeded     │
└──────────────────────────────────────────┘

Launching 3 agents...
├─ 🤖 Agent 1: Recent Changes Analyzer
├─ 🤖 Agent 2: Dependency Validator
└─ 🤖 Agent 3: Configuration Checker

⏱️  Time limit per agent: 6.7 minutes

[Progress bars for each agent...]

✅ Investigation complete (18.2 minutes)

Top finding (confidence: 0.92):
TypeScript path alias "@/*" not configured

Recommended fix:
Add to tsconfig.json:
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}

Apply fix? (y/n):
```

---

## Success Metrics

```json
{
  "pit_sessions": {
    "total": 23,
    "auto_triggered": 18,
    "manual_triggered": 5,
    "avg_agents_launched": 3.2,
    "avg_time_to_synthesis": "8.7 minutes",
    "high_confidence_findings": 19,
    "issues_resolved": 21,
    "escalations_to_human": 2,
    "success_rate": "91.3%"
  }
}
```

---

**Version**: 1.0
**Last Updated**: 2025-11-16
**Integration**: Claudelessons v2.0
**Status**: Ready for implementation
