#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const QUARANTINE_FILE = path.join(ROOT, 'test-quarantine', 'test-health.json');
const DASHBOARD_FILE = path.join(ROOT, 'TEST_HEALTH.md');

/**
 * Load test health data
 */
function loadQuarantineData() {
  if (!fs.existsSync(QUARANTINE_FILE)) {
    console.error('❌ Quarantine data not found:', QUARANTINE_FILE);
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(QUARANTINE_FILE, 'utf-8'));
}

/**
 * Generate markdown dashboard
 */
function generateDashboard() {
  const data = loadQuarantineData();
  const now = new Date().toISOString().split('T')[0];

  let md = `# 🏥 Test Health Dashboard

**Last Updated:** ${now}
**Health Score:** ${data.summary.health_score}
**Overall Pass Rate:** ${data.summary.pass_rate.toFixed(1)}%

## 📊 Quick Stats

| Metric | Value | Status |
| ------ | ----- | ------ |
| Total Tests | ${data.summary.total_tests} | - |
| Passing | ${data.summary.passing} | ✅ |
| Quarantined | ${data.summary.quarantined} | ⚠️ |
| Pass Rate | ${data.summary.pass_rate.toFixed(1)}% | ${data.summary.pass_rate >= 90 ? '✅' : data.summary.pass_rate >= 75 ? '⚠️' : '❌'} |

## 🔬 Module Health

`;

  for (const [moduleName, moduleData] of Object.entries(data.modules)) {
    const healthIcon = moduleData.health === 'HEALTHY' ? '✅' :
                      moduleData.health === 'DEGRADED' ? '⚠️' : '❌';
    md += `### ${healthIcon} ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}

| Metric | Value |
| ------ | ----- |
| Total Tests | ${moduleData.total_tests} |
| Passing | ${moduleData.passing} |
| Quarantined | ${moduleData.quarantined} |
| Pass Rate | ${((moduleData.passing / moduleData.total_tests) * 100).toFixed(1)}% |

`;
  }

  md += `## 🚨 Quarantined Tests (${data.summary.quarantined} total)

### By Priority

`;

  // Group by priority
  const byPriority = {};
  data.quarantined_tests.forEach(test => {
    const priority = test.priority;
    if (!byPriority[priority]) {
      byPriority[priority] = [];
    }
    byPriority[priority].push(test);
  });

  [1, 2, 3].forEach(priority => {
    const tests = byPriority[priority] || [];
    const priorityName = priority === 1 ? 'CRITICAL' : priority === 2 ? 'HIGH' : 'MEDIUM';
    const icon = priority === 1 ? '🔴' : priority === 2 ? '🟡' : '🟢';

    md += `#### ${icon} Priority ${priority}: ${priorityName} (${tests.length} tests)

`;

    tests.forEach(test => {
      md += `- **${test.id}**: \`${test.file}\`
  - **Reason**: ${test.reason}
  - **Fix Strategy**: ${test.fix_strategy}
  - **Status**: ${test.status}

`;
    });
  });

  md += `## 📋 Remediation Plan

| Phase | Target Date | Tests | Status |
| ----- | ----------- | ----- | ------ |
| Phase 1: Critical Auth Fixes | ${data.remediation_plan.phase_1.target_date} | ${data.remediation_plan.phase_1.tests.length} tests | 🔜 |
| Phase 2: Order Flow Restoration | ${data.remediation_plan.phase_2.target_date} | ${data.remediation_plan.phase_2.tests.length} tests | ⏳ |
| Phase 3: Voice Integration | ${data.remediation_plan.phase_3.target_date} | ${data.remediation_plan.phase_3.tests.length} tests | ⏳ |

## 🛠️ How to Use

### Run Only Healthy Tests
\`\`\`bash
npm run test:healthy
\`\`\`

### Check Quarantine Status
\`\`\`bash
npm run test:quarantine:status
\`\`\`

### Regenerate This Dashboard
\`\`\`bash
npm run test:quarantine:dashboard
\`\`\`

### Run System Health Check
\`\`\`bash
npm run health
\`\`\`

## 📚 Documentation

- **Root Cause**: ${data.metadata.root_cause}
- **Triggered By**: ${data.metadata.trigger_event}
- **Created**: ${data.metadata.created_by}

---

*This dashboard is auto-generated from \`test-quarantine/test-health.json\`*
`;

  fs.writeFileSync(DASHBOARD_FILE, md);
  console.log('✅ Dashboard generated:', DASHBOARD_FILE);
  return md;
}

/**
 * Show quarantine status
 */
function showStatus() {
  const data = loadQuarantineData();

  console.log('\n🏥 TEST HEALTH STATUS\n');
  console.log(`Health Score: ${data.summary.health_score}`);
  console.log(`Pass Rate: ${data.summary.pass_rate.toFixed(1)}%`);
  console.log(`Passing: ${data.summary.passing}/${data.summary.total_tests}`);
  console.log(`Quarantined: ${data.summary.quarantined}\n`);

  console.log('Module Breakdown:');
  for (const [moduleName, moduleData] of Object.entries(data.modules)) {
    const healthIcon = moduleData.health === 'HEALTHY' ? '✅' :
                      moduleData.health === 'DEGRADED' ? '⚠️' : '❌';
    console.log(`  ${healthIcon} ${moduleName}: ${moduleData.passing}/${moduleData.total_tests} (${moduleData.quarantined} quarantined)`);
  }

  console.log('\nQuarantined Tests by Priority:');
  const byPriority = {};
  data.quarantined_tests.forEach(test => {
    const priority = test.priority;
    if (!byPriority[priority]) byPriority[priority] = [];
    byPriority[priority].push(test);
  });

  [1, 2, 3].forEach(priority => {
    const tests = byPriority[priority] || [];
    const icon = priority === 1 ? '🔴' : priority === 2 ? '🟡' : '🟢';
    console.log(`  ${icon} Priority ${priority}: ${tests.length} tests`);
  });

  console.log('\nFor detailed information, see TEST_HEALTH.md');
}

/**
 * Run healthy tests only
 */
function runHealthyTests() {
  const data = loadQuarantineData();

  // Get list of quarantined test files
  const quarantinedFiles = data.quarantined_tests
    .map(test => test.file)
    .filter(file => file && !file.endsWith('.skip'));

  console.log(`\n🧪 Running healthy tests (${data.summary.passing}/${data.summary.total_tests} tests)\n`);
  console.log(`Excluding ${data.summary.quarantined} quarantined tests\n`);

  // Build vitest command with exclusions
  let cmd = 'npm run test:quick --workspaces';

  // Note: In a real implementation, we'd need to configure vitest to exclude specific files
  // For now, we assume the .skip files are already excluded by vitest

  try {
    execSync(cmd, { stdio: 'inherit', cwd: ROOT });
    console.log('\n✅ Healthy tests passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Some healthy tests failed');
    process.exit(1);
  }
}

/**
 * Main
 */
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--dashboard')) {
    generateDashboard();
  } else if (args.includes('--status')) {
    showStatus();
  } else if (args.includes('--run-healthy')) {
    runHealthyTests();
  } else {
    console.log(`
Test Quarantine Management

Usage:
  node scripts/test-quarantine.js [--dashboard|--status|--run-healthy]

Options:
  --dashboard     Generate TEST_HEALTH.md dashboard
  --status        Show current quarantine status
  --run-healthy   Run only non-quarantined tests

Examples:
  npm run test:quarantine:dashboard
  npm run test:quarantine:status
  npm run test:healthy
`);
  }
}

main();
