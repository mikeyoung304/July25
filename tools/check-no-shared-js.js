#!/usr/bin/env node
import { execSync } from 'node:child_process';
try {
  const out = execSync('git ls-files -z shared | xargs -0 -n1 | grep -E "\\.(js|cjs|mjs)$" || true', { stdio: 'pipe' }).toString().trim();
  if (out) {
    console.error('❌ Compiled JS detected under /shared (not allowed):\n' + out);
    process.exit(1);
  }
} catch (e) {
  console.error('Guard check failed:', e?.message || e);
  process.exit(1);
}