#!/usr/bin/env node
const { execSync } = require('node:child_process');
const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

function run(cmd) {
  try { return String(execSync(cmd, { stdio: 'pipe' })); }
  catch (e) { return String((e && e.stdout) || '') + String((e && e.stderr) || ''); }
}
const root = process.cwd();
const baselinePath = join(root, 'scripts', 'eslint-freeze.baseline.json');

// run eslint with unix formatter; eslint exits non-zero on findings, which is fine
const out = run('npx eslint . --ext .ts,.tsx,.js -f unix');
const lines = out.split('\n').filter(Boolean).length;

if (!existsSync(baselinePath)) {
  writeFileSync(baselinePath, JSON.stringify({ lines }, null, 2) + '\n');
  console.log(`[eslint-freeze] baseline created: ${lines}`);
  process.exit(0);
}
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
console.log(`[eslint-freeze] baseline=${baseline.lines} current=${lines}`);
if (lines > baseline.lines) {
  console.error(`[eslint-freeze] ❌ increased ESLint lines: baseline=${baseline.lines} current=${lines}`);
  process.exit(1);
}
console.log('[eslint-freeze] ✅ no increase detected');