import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const globs = ['client', 'server', 'shared', 'tests'];
const patterns = [
  { re: /\.only\(/, msg: 'Found .only in tests' },
  { re: /(it|test|describe)\.skip\(/, msg: 'Found skipped tests' },
  { re: /@ts-ignore/, msg: 'Found @ts-ignore' },
  { re: /console\.log\(/, msg: 'Found console.log', exclude: ['scripts/', 'tools/', '.cjs'] },
];

let bad = 0;
function walk(p) {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    // Skip node_modules and dist directories
    if (p.includes('node_modules') || p.includes('dist')) return;

    for (const f of fs.readdirSync(p)) {
      walk(path.join(p, f));
    }
  } else if (/\.(ts|tsx|js|jsx)$/.test(p)) {
    const t = fs.readFileSync(p, 'utf8');
    for (const { re, msg, exclude } of patterns) {
      // Check if path should be excluded
      if (exclude && exclude.some(ex => p.includes(ex))) continue;

      if (re.test(t)) {
        console.error(`${msg}: ${p}`);
        bad++;
      }
    }
  }
}

for (const g of globs) {
  const fullPath = path.join(ROOT, g);
  if (fs.existsSync(fullPath)) {
    walk(fullPath);
  }
}

if (bad) {
  console.error(`\n❌ Found ${bad} forbidden pattern(s)`);
  process.exit(1);
}

console.log('✅ No forbidden patterns found');