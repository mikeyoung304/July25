#!/usr/bin/env node
import fs from 'node:fs';

const EXPECTED = 'july25-client';
const pjPath = '.vercel/project.json';

if (!fs.existsSync(pjPath)) {
  console.error(`❌ Missing ${pjPath}. Run: vercel link --project ${EXPECTED} --yes`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(pjPath, 'utf8'));
const name = data?.projectName || data?.project?.name || data?.project || data?.orgId || '';

if (name !== EXPECTED) {
  console.error(`❌ Wrong Vercel project linked: "${name}". Expected "${EXPECTED}".`);
  console.error(`   Fix: rm -f .vercel/project.json && vercel link --project ${EXPECTED} --yes`);
  process.exit(2);
}

console.log(`✅ Vercel project verified: ${EXPECTED}`);