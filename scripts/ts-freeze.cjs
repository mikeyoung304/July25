#!/usr/bin/env node
const { execSync } = require('node:child_process');
const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

function run(cmd) {
  try { return String(execSync(cmd, { stdio: 'pipe' })); }
  catch (e) { return String((e && e.stdout) || '') + String((e && e.stderr) || ''); }
}
function tscCount(dir) {
  if (!existsSync(join(dir, 'tsconfig.json'))) return 0;
  const out = run(`npx tsc -p ${dir} --noEmit`);
  const m = out.match(/error TS\d+:/g);
  return m ? m.length : 0;
}

const root = process.cwd();
const baselinePath = join(root, 'scripts', 'ts-freeze.baseline.json');
const counts = {
  client: tscCount('client'),
  server: tscCount('server'),
  shared: tscCount('shared'),
};
const total = counts.client + counts.server + counts.shared;

if (!existsSync(baselinePath)) {
  writeFileSync(baselinePath, JSON.stringify({ total, counts }, null, 2) + '\n');
  console.log(`[ts-freeze] baseline created: total=${total}`, counts);
  process.exit(0);
}
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
console.log(`[ts-freeze] baseline=${baseline.total} current=${total}`);
if (total > baseline.total) {
  console.error(`[ts-freeze] ❌ increased TS errors: baseline=${baseline.total} current=${total}`);
  process.exit(1);
}
console.log('[ts-freeze] ✅ no increase detected');