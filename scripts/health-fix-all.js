#!/usr/bin/env node

/**
 * Health Fix Orchestrator
 *
 * Runs all documentation drift auto-fix scripts in sequence
 *
 * Usage:
 *   node scripts/health-fix-all.js [--dry-run] [--commit] [--skip-tests]
 *
 * Options:
 *   --dry-run      Show what would be changed without writing
 *   --commit       Auto-commit changes after each fix
 *   --skip-tests   Skip running tests after fixes
 *   --only=NAME    Only run specific fix (config|schema|api|links|timestamps)
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * Run a script and capture output
 */
function runScript(scriptPath, args = []) {
  try {
    const result = execSync(`node ${scriptPath} ${args.join(' ')}`, {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    return { success: true, output: result };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || error.message,
      error: error.stderr || error.message
    };
  }
}

/**
 * Print section header
 */
function printSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const autoCommit = args.includes('--commit');
  const skipTests = args.includes('--skip-tests');
  const onlyArg = args.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.split('=')[1] : null;

  console.log('🏥 Restaurant OS Health Fix\n');

  if (dryRun) {
    console.log('📋 DRY RUN MODE - No files will be modified\n');
  }

  const scriptArgs = [];
  if (dryRun) scriptArgs.push('--dry-run');
  if (autoCommit) scriptArgs.push('--commit');

  const fixes = [
    {
      name: 'config',
      title: 'Config Drift Fix',
      script: 'scripts/fix-config-drift.js',
      description: 'Sync .env.example → ENVIRONMENT.md'
    },
    {
      name: 'schema',
      title: 'Schema Drift Fix',
      script: 'scripts/fix-schema-drift.js',
      description: 'Sync Prisma schema → DATABASE.md'
    },
    {
      name: 'api',
      title: 'API Drift Fix',
      script: 'scripts/fix-api-drift.js',
      description: 'Sync route files → openapi.yaml'
    }
    // Future fixes to add:
    // - fix-broken-links.js
    // - fix-timestamps.js
  ];

  let totalFixed = 0;
  let totalFailed = 0;

  for (const fix of fixes) {
    // Skip if --only specified and doesn't match
    if (only && fix.name !== only) {
      continue;
    }

    printSection(`${fix.title}: ${fix.description}`);

    const result = runScript(fix.script, scriptArgs);

    if (result.success) {
      console.log(result.output);
      console.log(`✅ ${fix.title} completed successfully\n`);
      totalFixed++;
    } else {
      console.log(result.output);
      if (result.error) {
        console.error(`❌ Error:\n${result.error}\n`);
      }
      console.log(`❌ ${fix.title} failed\n`);
      totalFailed++;
    }
  }

  // Summary
  printSection('Summary');

  console.log(`Total fixes attempted: ${totalFixed + totalFailed}`);
  console.log(`Successful: ${totalFixed} ✅`);
  console.log(`Failed: ${totalFailed} ${totalFailed > 0 ? '❌' : ''}`);

  if (totalFixed > 0 && !dryRun) {
    console.log('\n📦 Files updated:');
    console.log('  - docs/reference/config/ENVIRONMENT.md');
    console.log('  - docs/reference/schema/DATABASE.md');
    console.log('  - docs/reference/api/openapi.yaml');

    if (!autoCommit) {
      console.log('\n💡 To commit all changes at once:');
      console.log('   git add docs/reference/');
      console.log('   git commit -m "docs: auto-fix documentation drift"');
    } else {
      console.log('\n✅ All changes have been auto-committed');
    }
  }

  // Run verification checks
  if (!dryRun && !skipTests) {
    printSection('Verification');

    console.log('Running drift detection checks...\n');

    const checks = [
      { name: 'Config Drift', script: 'node scripts/check-config-drift.cjs' },
      { name: 'Schema Drift', script: 'node scripts/check-schema-drift.cjs' },
      { name: 'API Drift', script: 'node scripts/check-api-drift.cjs' }
    ];

    let allPassed = true;

    for (const check of checks) {
      try {
        execSync(check.script, { cwd: ROOT, stdio: 'pipe' });
        console.log(`✅ ${check.name}: PASSED`);
      } catch (error) {
        console.log(`⚠️  ${check.name}: Still has issues`);
        allPassed = false;
      }
    }

    if (allPassed) {
      console.log('\n🎉 All drift checks passed!');
    } else {
      console.log('\n⚠️  Some checks still failing - manual review recommended');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Health fix complete!');
  console.log('='.repeat(60) + '\n');

  return totalFailed === 0 ? 0 : 1;
}

// Run
try {
  const code = await main();
  process.exit(code);
} catch (error) {
  console.error('❌ Orchestrator error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
