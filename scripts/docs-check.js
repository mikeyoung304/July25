/* eslint-disable no-console */
import fs from 'fs';

function mustContain(file, needle) {
  const s = fs.readFileSync(file, 'utf8');
  if (!s.includes(needle)) {
    console.error(`Docs check failed: ${file} missing "${needle}"`);
    process.exit(1);
  }
}

mustContain('README.md', 'v6.0.8-rc.1');
mustContain('index.md', 'Documentation Index');
mustContain('SECURITY.md', 'single required secret');
mustContain('DEPLOYMENT.md', 'CORS');
mustContain('docs/DATABASE.md', 'RLS');

console.log('✓ docs:check OK');
