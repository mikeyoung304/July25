# Diagnostic Protocol System - Implementation Roadmap

**Step-by-step guide to implementing the complete system**

---

## Overview

This roadmap breaks down implementation into manageable phases, from quick wins to full automation.

**Total estimated time**: 2-3 weeks (1 developer)
**Expected ROI**: 10x within first month

---

## Phase 1: Foundation (Week 1, Days 1-2)

**Goal**: Basic CLI tool with EPL and manual HTF

### Tasks

#### 1.1: Project Setup (2 hours)
```bash
cd claudelessons-v2/protocols
mkdir -p {cli,lib,data}

# Initialize package.json
npm init -y
npm install commander inquirer chalk yaml
npm install -D typescript @types/node
```

**Deliverable**: Basic TypeScript project structure

#### 1.2: EPL Data Structure (3 hours)
```typescript
// lib/epl/types.ts
export interface ErrorPattern {
  id: string;
  pattern: string | RegExp;
  misleading_message: string;
  real_cause: string;
  symptoms: string[];
  test_commands: TestCommand[];
  fix_commands: FixCommand[];
  confidence: number;
  occurrences: number;
  time_saved: string;
  first_seen: string;
  last_seen: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  related_patterns?: string[];
}

export interface TestCommand {
  command: string;
  expected: string;
  timeout?: number;
}

export interface FixCommand {
  command: string;
  description: string;
  requires_manual?: boolean;
}
```

**Deliverable**: Type definitions for EPL

#### 1.3: EPL Search Function (4 hours)
```typescript
// lib/epl/search.ts
import { ErrorPattern } from './types';
import { loadPatterns } from './loader';

export async function searchEPL(error: string): Promise<{
  match: ErrorPattern | null;
  confidence: number;
  type: 'exact' | 'regex' | 'fuzzy' | 'none';
}> {
  const patterns = await loadPatterns();

  // 1. Exact match
  const exactMatch = patterns.find(p =>
    error.toLowerCase() === p.misleading_message.toLowerCase()
  );
  if (exactMatch) {
    return { match: exactMatch, confidence: 1.0, type: 'exact' };
  }

  // 2. Regex match
  const regexMatches = patterns.filter(p => {
    const regex = new RegExp(p.pattern, 'i');
    return regex.test(error);
  });
  if (regexMatches.length > 0) {
    return {
      match: regexMatches[0],
      confidence: regexMatches[0].confidence,
      type: 'regex'
    };
  }

  // 3. Fuzzy match
  const fuzzyMatches = patterns
    .map(p => ({
      pattern: p,
      score: similarity(error, p.misleading_message)
    }))
    .filter(m => m.score > 0.7)
    .sort((a, b) => b.score - a.score);

  if (fuzzyMatches.length > 0) {
    return {
      match: fuzzyMatches[0].pattern,
      confidence: fuzzyMatches[0].score * 0.8,
      type: 'fuzzy'
    };
  }

  return { match: null, confidence: 0, type: 'none' };
}
```

**Deliverable**: Working EPL search

#### 1.4: Basic CLI (3 hours)
```typescript
// cli/index.ts
import { Command } from 'commander';
import { searchEPL } from '../lib/epl/search';
import chalk from 'chalk';

const program = new Command();

program
  .name('claudelessons')
  .description('Diagnostic protocol system')
  .version('2.0.0');

program
  .command('epl search <error>')
  .description('Search Error Pattern Library')
  .action(async (error: string) => {
    console.log(chalk.blue('🔍 Searching Error Pattern Library...\n'));

    const result = await searchEPL(error);

    if (result.match) {
      console.log(chalk.green(`✅ Match found: ${result.match.id}`));
      console.log(chalk.gray(`   Confidence: ${(result.confidence * 100).toFixed(0)}%`));
      console.log(chalk.gray(`   Type: ${result.type}`));
      console.log();
      console.log(chalk.yellow('Real cause:'));
      console.log(`   ${result.match.real_cause}`);
      console.log();
      console.log(chalk.yellow('Time saved:'));
      console.log(`   ${result.match.time_saved}`);
    } else {
      console.log(chalk.red('❌ No match found'));
      console.log(chalk.gray('   Continue to systematic investigation'));
    }
  });

program.parse();
```

**Deliverable**: `npx claudelessons epl search "error"` works

#### 1.5: Populate EPL with Top 10 Patterns (4 hours)
```yaml
# data/epl/EPL-001.yaml
id: EPL-001
pattern: "Cannot find module ['\"@/.*['\"]"
misleading_message: "Cannot find module '@/components/Header'"
real_cause: "TypeScript doesn't know about @ path alias"
symptoms:
  - "Import uses @ or ~ prefix"
  - "Module exists in src/"
  - "Works in IDE, fails at build"
test_commands:
  - command: "cat tsconfig.json | jq '.compilerOptions.paths'"
    expected: "null or missing @/* mapping"
  - command: "ls src/components/Header.tsx"
    expected: "file exists"
fix_commands:
  - command: |
      # Add to tsconfig.json compilerOptions:
      "paths": {
        "@/*": ["./src/*"]
      }
    description: "Add path alias to tsconfig.json"
confidence: 0.95
occurrences: 23
time_saved: "15-30 minutes"
first_seen: "2025-10-15"
last_seen: "2025-11-16"
```

Create files for EPL-001 through EPL-010 (top patterns from existing incidents)

**Deliverable**: 10 most common patterns documented

### Phase 1 Success Criteria
- [x] CLI tool installed and working
- [x] EPL search returns results
- [x] Top 10 patterns documented
- [x] Search accuracy >80% for known patterns

**Time**: 2 days
**Lines of code**: ~500

---

## Phase 2: HTF and Verification (Week 1, Days 3-4)

**Goal**: Add hypothesis testing and verification capabilities

### Tasks

#### 2.1: HTF Core (4 hours)
```typescript
// lib/htf/framework.ts
export interface Hypothesis {
  name: string;
  test_command: string;
  expected_result: string;
  timeout_ms?: number;
}

export interface HypothesisResult {
  hypothesis: Hypothesis;
  actual_result: string;
  expected: string;
  matches: boolean;
  confidence: number;
  duration_ms: number;
}

export async function testHypothesis(
  hypothesis: Hypothesis
): Promise<HypothesisResult> {
  const startTime = Date.now();

  console.log(chalk.blue(`\n🧪 Testing: ${hypothesis.name}`));
  console.log(chalk.gray(`   Command: ${hypothesis.test_command}`));
  console.log(chalk.gray(`   Expected: ${hypothesis.expected_result}`));

  const actual = await exec(hypothesis.test_command);
  const matches = evaluateExpected(actual, hypothesis.expected_result);
  const duration = Date.now() - startTime;

  console.log(chalk.gray(`   Actual: ${actual.substring(0, 100)}`));
  console.log(matches ? chalk.green('   ✅ CONFIRMED') : chalk.red('   ❌ REJECTED'));

  return {
    hypothesis,
    actual_result: actual,
    expected: hypothesis.expected_result,
    matches,
    confidence: matches ? 0.9 : 0.1,
    duration_ms: duration
  };
}
```

**Deliverable**: HTF test function

#### 2.2: EPL Verification (3 hours)
```typescript
// lib/epl/verify.ts
export async function verifyPattern(
  pattern: ErrorPattern,
  context: any
): Promise<{
  verified: boolean;
  confirmationRate: number;
  results: HypothesisResult[];
}> {
  console.log(chalk.blue(`\n🧪 Verifying pattern ${pattern.id}...\n`));

  const hypotheses: Hypothesis[] = pattern.test_commands.map(tc => ({
    name: tc.command,
    test_command: tc.command,
    expected_result: tc.expected
  }));

  const results = await Promise.all(
    hypotheses.map(h => testHypothesis(h))
  );

  const confirmationRate = results.filter(r => r.matches).length / results.length;
  const verified = confirmationRate > 0.5;

  console.log(chalk.yellow(`\nConfirmation rate: ${(confirmationRate * 100).toFixed(0)}%`));
  console.log(verified ? chalk.green('✅ VERIFIED') : chalk.red('❌ REJECTED'));

  return { verified, confirmationRate, results };
}
```

**Deliverable**: Pattern verification works

#### 2.3: Interactive HTF Session (5 hours)
```typescript
// cli/commands/htf.ts
import inquirer from 'inquirer';

export async function startHTFSession() {
  console.log(chalk.blue('\n┌────────────────────────────────┐'));
  console.log(chalk.blue('│ HYPOTHESIS TESTING FRAMEWORK   │'));
  console.log(chalk.blue('└────────────────────────────────┘\n'));

  const { hypothesis } = await inquirer.prompt([
    {
      type: 'input',
      name: 'hypothesis',
      message: 'What is your hypothesis?',
      validate: (input) => input.length > 10
    }
  ]);

  const { testCommand } = await inquirer.prompt([
    {
      type: 'input',
      name: 'testCommand',
      message: 'What command will test this?',
      validate: (input) => input.length > 0
    }
  ]);

  const { expected } = await inquirer.prompt([
    {
      type: 'input',
      name: 'expected',
      message: 'What do you expect the result to be?',
      validate: (input) => input.length > 0
    }
  ]);

  const result = await testHypothesis({
    name: hypothesis,
    test_command: testCommand,
    expected_result: expected
  });

  if (result.matches) {
    const { applyFix } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'applyFix',
        message: 'Hypothesis confirmed. Do you have a fix to apply?',
        default: false
      }
    ]);

    if (applyFix) {
      const { fixCommand } = await inquirer.prompt([
        {
          type: 'input',
          name: 'fixCommand',
          message: 'Enter fix command:'
        }
      ]);

      await exec(fixCommand);
      console.log(chalk.green('\n✅ Fix applied'));
    }
  }
}
```

**Deliverable**: Interactive HTF session

### Phase 2 Success Criteria
- [x] HTF tests single hypothesis
- [x] EPL verification runs all tests
- [x] Interactive HTF session works
- [x] Results logged properly

**Time**: 2 days
**Lines of code**: ~400

---

## Phase 3: CSP and DDT (Week 1, Days 5-7)

**Goal**: Add environment reset and decision trees

### Tasks

#### 3.1: CSP Suspicion Calculator (3 hours)
```typescript
// lib/csp/suspicion.ts
export function calculateSuspicionScore(context: {
  error?: string;
  lastInstall?: Date;
  cacheSize?: number;
  lockFileChanged?: boolean;
}): number {
  let score = 0;

  // Recent npm install less suspicious
  if (context.lastInstall) {
    const hoursSince = (Date.now() - context.lastInstall.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 1) score += 0.1;
    else if (hoursSince > 24) score += 0.2;
  }

  // Cache size
  if (context.cacheSize && context.cacheSize > 100 * 1024 * 1024) {
    score += 0.3; // Large cache suspicious
  }

  // Lock file sync
  if (context.lockFileChanged === false) {
    score += 0.3; // Lock file not updated
  }

  // Error mentions cache
  if (context.error?.toLowerCase().includes('cache') ||
      context.error?.toLowerCase().includes('enoent')) {
    score += 0.3;
  }

  return Math.min(score, 1.0);
}
```

**Deliverable**: Suspicion score calculator

#### 3.2: CSP Executors (6 hours)
```bash
# scripts/csp-level-0.sh (created in Phase 1)
# scripts/csp-level-1.sh
# scripts/csp-level-2.sh
# scripts/csp-level-3.sh
```

Create shell scripts for each CSP level (already designed in protocol docs)

**Deliverable**: 4 CSP level scripts

#### 3.3: DDT Engine (8 hours)
```typescript
// lib/ddt/engine.ts
export interface DecisionNode {
  id: string;
  question: string;
  test_command: string;
  yes_path: string | DecisionNode;
  no_path: string | DecisionNode;
  time_budget_minutes: number;
}

export async function runDecisionTree(
  tree: DecisionNode,
  context: any
): Promise<string> {
  const timer = new DiagnosticTimer(tree.question, tree.time_budget_minutes);

  console.log(chalk.blue(`\n❓ ${tree.question}`));
  console.log(chalk.gray(`   Time budget: ${tree.time_budget_minutes} minutes`));

  const result = await exec(tree.test_command);
  console.log(chalk.gray(`   Result: ${result.substring(0, 100)}`));

  const decision = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'yes',
      message: 'Is the answer YES?',
      default: false
    }
  ]);

  timer.complete();

  const nextPath = decision.yes ? tree.yes_path : tree.no_path;

  if (typeof nextPath === 'string') {
    return nextPath; // Reached conclusion
  } else {
    return runDecisionTree(nextPath, context); // Continue tree
  }
}
```

**Deliverable**: DDT engine

#### 3.4: Build Failure Decision Tree (4 hours)
```yaml
# data/ddt/build-failure.yaml
id: build-failure-root
question: "Is this a clean environment?"
test_command: "ls -la node_modules/.cache"
time_budget_minutes: 5
yes_path:
  id: build-failure-error-clear
  question: "Is the error message clear?"
  test_command: "npm run build 2>&1 | tee build.log && grep -i error build.log"
  time_budget_minutes: 10
  yes_path: "categorize-error"
  no_path: "search-epl"
no_path: "run-csp"
```

**Deliverable**: Build failure DDT

### Phase 3 Success Criteria
- [x] CSP auto-selects correct level
- [x] CSP executes and verifies
- [x] DDT engine navigates tree
- [x] Build failure tree works

**Time**: 3 days
**Lines of code**: ~600

---

## Phase 4: PIT and Integration (Week 2, Days 1-3)

**Goal**: Add parallel investigation and complete integration

### Tasks

#### 4.1: Subagent Orchestrator (8 hours)
```typescript
// lib/pit/orchestrator.ts
export class SubagentOrchestrator {
  async launchParallelInvestigation(
    trigger: PITTrigger
  ): Promise<Synthesis> {
    const agents = this.defineAgents(trigger);

    console.log(chalk.blue('\n🚀 PARALLEL INVESTIGATION TRIGGERED'));
    console.log(chalk.gray(`   Agents: ${agents.length}`));
    console.log(chalk.gray(`   Time limit: ${trigger.timeLimit}ms each\n`));

    const results = await Promise.all(
      agents.map((agent, idx) =>
        this.runAgent(agent, idx, trigger.timeLimit)
      )
    );

    return this.synthesizeResults(results);
  }
}
```

**Deliverable**: PIT orchestrator

#### 4.2: Finding Synthesis (6 hours)
```typescript
// lib/pit/synthesis.ts
export function synthesizeResults(
  results: AgentResult[]
): Synthesis {
  const findings = results
    .filter(r => r.success)
    .flatMap(r => extractFindings(r));

  const highConfidence = findings.filter(f => f.confidence > 0.7);
  const mediumConfidence = findings.filter(f => f.confidence > 0.4 && f.confidence <= 0.7);
  const lowConfidence = findings.filter(f => f.confidence <= 0.4);

  const recommendations = generateRecommendations(
    highConfidence,
    mediumConfidence,
    lowConfidence
  );

  return {
    findings,
    highConfidence,
    mediumConfidence,
    lowConfidence,
    recommendations
  };
}
```

**Deliverable**: Synthesis algorithm

#### 4.3: Unified Diagnostic Command (6 hours)
```typescript
// cli/commands/diagnose.ts
export async function diagnose(error?: string) {
  console.log(chalk.blue('\n┌─────────────────────────────────┐'));
  console.log(chalk.blue('│ CLAUDELESSONS DIAGNOSTIC SYSTEM │'));
  console.log(chalk.blue('└─────────────────────────────────┘\n'));

  // If no error provided, ask
  if (!error) {
    const { errorInput } = await inquirer.prompt([
      {
        type: 'input',
        name: 'errorInput',
        message: 'Paste the error message:'
      }
    ]);
    error = errorInput;
  }

  // LEVEL 1: EPL
  console.log(chalk.yellow('[LEVEL 1] Checking Error Pattern Library...'));
  const eplResult = await searchEPL(error);

  if (eplResult.match && eplResult.confidence > 0.8) {
    console.log(chalk.green(`✅ Pattern match: ${eplResult.match.id}`));

    const verification = await verifyPattern(eplResult.match, {});

    if (verification.verified) {
      const { applyFix } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'applyFix',
          message: 'Apply automated fix?',
          default: true
        }
      ]);

      if (applyFix) {
        // Apply fix...
        return { resolved: true, method: 'EPL' };
      }
    }
  }

  // LEVEL 2: DDT
  console.log(chalk.yellow('\n[LEVEL 2] Starting Decision Tree Investigation...'));
  const tree = await loadDecisionTree('build-failure');
  const conclusion = await runDecisionTree(tree, { error });

  if (conclusion === 'run-csp') {
    // Run CSP...
  }

  // LEVEL 3: PIT (if uncertain)
  // ...
}
```

**Deliverable**: Unified diagnostic command

### Phase 4 Success Criteria
- [x] PIT launches multiple agents
- [x] Synthesis produces recommendations
- [x] Unified diagnose command works end-to-end
- [x] All components integrated

**Time**: 3 days
**Lines of code**: ~800

---

## Phase 5: Polish and Metrics (Week 2, Days 4-5)

**Goal**: Add metrics, logging, and polish

### Tasks

#### 5.1: Metrics Collection (4 hours)
```typescript
// lib/metrics/collector.ts
export class MetricsCollector {
  async recordSession(session: DiagnosticSession) {
    const metrics = {
      timestamp: new Date().toISOString(),
      issue: session.issue,
      components_used: session.componentsUsed,
      resolution_time_minutes: session.durationMs / 1000 / 60,
      pattern_matched: session.patternMatched,
      outcome: session.outcome
    };

    await appendFile('metrics.jsonl', JSON.stringify(metrics) + '\n');
  }

  async getStats() {
    const sessions = await this.loadAllSessions();

    return {
      total: sessions.length,
      resolved: sessions.filter(s => s.outcome === 'resolved').length,
      avg_time: average(sessions.map(s => s.resolution_time_minutes)),
      by_component: groupBy(sessions, 'components_used')
    };
  }
}
```

**Deliverable**: Metrics collection and stats

#### 5.2: Logging (3 hours)
```typescript
// lib/logging/logger.ts
export class DiagnosticLogger {
  logFile: string;

  constructor() {
    this.logFile = `.claudelessons/diagnostic-${Date.now()}.log`;
  }

  async log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };

    await appendFile(this.logFile, JSON.stringify(entry) + '\n');
  }
}
```

**Deliverable**: Diagnostic logging

#### 5.3: EPL Pattern Addition UI (5 hours)
```typescript
// cli/commands/epl-add.ts
export async function addPattern() {
  console.log(chalk.blue('\n┌─────────────────────────────┐'));
  console.log(chalk.blue('│ ADD NEW ERROR PATTERN       │'));
  console.log(chalk.blue('└─────────────────────────────┘\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'misleading_message',
      message: 'What is the misleading error message?'
    },
    {
      type: 'input',
      name: 'real_cause',
      message: 'What was the REAL cause?'
    },
    {
      type: 'input',
      name: 'time_spent',
      message: 'How long did it take to find? (e.g., "2 hours")'
    },
    // More prompts...
  ]);

  // Generate pattern ID
  const nextId = await getNextEPLId();

  // Create pattern file
  await writeYAML(`data/epl/${nextId}.yaml`, {
    id: nextId,
    ...answers,
    occurrences: 1,
    first_seen: new Date().toISOString().split('T')[0],
    last_seen: new Date().toISOString().split('T')[0]
  });

  console.log(chalk.green(`\n✅ Pattern ${nextId} created`));
}
```

**Deliverable**: Interactive pattern addition

### Phase 5 Success Criteria
- [x] Metrics collected automatically
- [x] Stats command shows useful data
- [x] Logs written for debugging
- [x] Adding patterns is easy

**Time**: 2 days
**Lines of code**: ~400

---

## Phase 6: Testing and Documentation (Week 3)

**Goal**: Ensure quality and usability

### Tasks

#### 6.1: Unit Tests (2 days)
```typescript
// tests/epl.test.ts
describe('EPL Search', () => {
  it('should find exact match', async () => {
    const result = await searchEPL("Cannot find module '@/components/Header'");
    expect(result.match?.id).toBe('EPL-001');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('should find regex match', async () => {
    const result = await searchEPL("Cannot find module '@/utils/helper'");
    expect(result.match?.id).toBe('EPL-001');
    expect(result.type).toBe('regex');
  });
});
```

**Deliverable**: >80% test coverage

#### 6.2: Integration Tests (1 day)
```typescript
// tests/integration/diagnose.test.ts
describe('Full Diagnostic Flow', () => {
  it('should resolve known pattern via EPL', async () => {
    const result = await diagnose("Cannot find module '@/test'");
    expect(result.resolved).toBe(true);
    expect(result.method).toBe('EPL');
  });
});
```

**Deliverable**: End-to-end tests

#### 6.3: User Documentation (1 day)
- Update README.md
- Create tutorial videos/gifs
- Write troubleshooting guide
- Document all commands

**Deliverable**: Complete user docs

#### 6.4: Developer Documentation (1 day)
- API documentation
- Architecture diagrams
- Contribution guidelines
- Pattern creation guide

**Deliverable**: Developer docs

### Phase 6 Success Criteria
- [x] All tests passing
- [x] >80% code coverage
- [x] User docs complete
- [x] Developer docs complete

**Time**: 5 days

---

## Phase 7: Deployment and Monitoring (Week 3, Days 6-7)

**Goal**: Ship and start collecting real data

### Tasks

#### 7.1: Package for Distribution (4 hours)
```json
// package.json
{
  "name": "@claudelessons/diagnostic",
  "version": "2.0.0",
  "bin": {
    "claudelessons": "./dist/cli/index.js"
  },
  "files": [
    "dist/",
    "data/",
    "scripts/"
  ]
}
```

#### 7.2: CI/CD Setup (3 hours)
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test
      - run: npm run build
```

#### 7.3: Publish to NPM (1 hour)
```bash
npm publish --access public
```

#### 7.4: Add to Existing Project (2 hours)
```bash
cd /Users/mikeyoung/CODING/rebuild-6.0
npm install @claudelessons/diagnostic

# Add to package.json scripts
{
  "scripts": {
    "diagnose": "claudelessons diagnose",
    "epl": "claudelessons epl"
  }
}
```

### Phase 7 Success Criteria
- [x] Package published
- [x] CI/CD running
- [x] Installed in main project
- [x] First real diagnostic session logged

**Time**: 2 days

---

## Success Metrics

After 1 month of usage, measure:

| Metric | Target |
|--------|--------|
| Diagnostic sessions | >50 |
| Resolution rate | >85% |
| Avg resolution time | <10 min |
| Time saved vs manual | >75% |
| EPL patterns added | >20 |
| User satisfaction | >8/10 |

---

## Rollout Plan

### Week 1: Internal Testing
- Use on own debugging sessions
- Refine based on experience
- Add patterns as discovered

### Week 2: Team Alpha
- Invite 2-3 team members
- Collect feedback
- Fix critical issues

### Week 3: Team Beta
- Expand to full team
- Monitor metrics
- Create tutorials

### Week 4: Production
- Full deployment
- Announce to organization
- Start tracking ROI

---

## Maintenance Plan

### Weekly
- Review new patterns added
- Check metrics dashboard
- Triage any issues

### Monthly
- Analyze trends
- Update patterns
- Improve algorithms

### Quarterly
- Major feature additions
- Performance optimization
- ROI reporting

---

## Cost Estimate

**Development time**: 3 weeks @ $75/hr = $9,000
**Expected savings**: $10,000+/month
**ROI timeframe**: 1 month
**NPV (1 year)**: $111,000

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Low adoption | Make it dead simple, show value immediately |
| False positives | Require verification, adjust confidence thresholds |
| Maintenance burden | Automated testing, clear contribution guidelines |
| Performance issues | Async operations, caching, time limits |

---

## Next Steps

1. **Read this roadmap**
2. **Set up development environment**
3. **Start Phase 1, Task 1.1**
4. **Ship Phase 1 in 2 days**
5. **Iterate rapidly**

---

**The system is fully designed. Time to build it.**
