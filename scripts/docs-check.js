/* eslint-disable no-console */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

let errors = [];

// ============================================================================
// BASIC CONTENT CHECKS (original)
// ============================================================================
function mustContain(file, needle, description = null) {
  const fullPath = path.isAbsolute(file) ? file : path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) {
    errors.push(`Missing file: ${file}`);
    return;
  }
  const s = fs.readFileSync(fullPath, 'utf8');
  if (!s.includes(needle)) {
    errors.push(`${file} missing "${needle}"${description ? ` (${description})` : ''}`);
  }
}

mustContain('README.md', 'v6.0.8-rc.1');
mustContain('index.md', 'Documentation Index');
mustContain('SECURITY.md', 'single required secret');
mustContain('DEPLOYMENT.md', 'CORS');
mustContain('docs/DATABASE.md', 'RLS');

// ============================================================================
// GUARDRAIL 1: ORPHAN DETECTOR
// ============================================================================
console.log('\n[1/5] Orphan Detector: checking all .md files are linked from index.md...');

const indexPath = path.join(ROOT, 'index.md');
const indexContent = fs.readFileSync(indexPath, 'utf8');

// Find all .md files, excluding docs/archive/** and generated/test outputs
const allMarkdownFiles = glob.sync('**/*.md', {
  cwd: ROOT,
  ignore: [
    'node_modules/**',
    '**/node_modules/**',
    'docs/archive/**',
    'client/dist/**',
    'server/dist/**',
    '.vercel/**',
    'test-results/**',
    '**/test-results/**',
    'scans/**',
    'reports/**',
    'scripts/archive/**',
    'coverage/**',
    'e2e/**',
    'examples/**',
  ],
  absolute: false,
});

// Extract all linked files from index.md
// Match patterns like [text](./FILE.md) or [text](FILE.md) or [text](docs/something/FILE.md)
const linkPattern = /\[([^\]]+)\]\(\.?\/?([\w\-\/\.]+\.md)\)/g;
const linkedFiles = new Set();
let match;
while ((match = linkPattern.exec(indexContent)) !== null) {
  let linkedPath = match[2];
  // Normalize path: remove leading ./ if present
  linkedPath = linkedPath.replace(/^\.\//, '');
  linkedFiles.add(linkedPath);
}

// Check each markdown file
for (const mdFile of allMarkdownFiles) {
  // Skip index.md itself, root README.md (project readme), and files in docs/archive
  if (mdFile === 'index.md' || mdFile === 'README.md' || mdFile.startsWith('docs/archive/')) {
    continue;
  }

  // Exempt ADRs (Architecture Decision Records)
  if (mdFile.includes('ADR-') || mdFile.match(/docs\/ADR.*\.md$/i)) {
    continue;
  }

  // Exempt workspace readmes: client/README.md, server/README.md, shared/README.md, docs/api/README.md
  if (mdFile.match(/^(client|server|shared)\/README\.md$/i) ||
      mdFile === 'docs/api/README.md') {
    continue;
  }

  // Exempt validated in-place navigation stubs
  const fullPath = path.join(ROOT, mdFile);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (/Moved to Canonical Documentation/i.test(content) &&
        /\.md#[\w-]+/i.test(content) &&
        /(Original preserved at:|Archived at:)/i.test(content)) {
      // Valid in-place navigation stub - exempt from orphan check
      continue;
    }
  }

  // Normalize for comparison
  const normalized = mdFile.replace(/^\.\//, '');

  if (!linkedFiles.has(normalized)) {
    errors.push(`ORPHAN: ${mdFile} is not linked from index.md`);
  }
}

console.log(`  ✓ Checked ${allMarkdownFiles.length} markdown files`);

// ============================================================================
// GUARDRAIL 2: STUB DETECTOR
// ============================================================================
console.log('\n[2/5] Stub Detector: checking stub files are properly archived...');

const stubPattern = /Moved to Canonical Documentation/i;
let stubCount = 0;
let validInPlaceStubs = [];

for (const mdFile of allMarkdownFiles) {
  const fullPath = path.join(ROOT, mdFile);
  const content = fs.readFileSync(fullPath, 'utf8');

  if (stubPattern.test(content)) {
    stubCount++;

    // Two valid locations for stubs:
    // 1) docs/archive/** (archival stubs)
    // 2) in-place source path IF it's a valid navigation stub

    if (mdFile.startsWith('docs/archive/')) {
      // Archival stub - always valid
      continue;
    }

    // Check if it's a valid in-place navigation stub
    // Must have: at least one anchor link (*.md#section) + archival reference
    const hasAnchorLink = /\.md#[\w-]+/i.test(content);
    const hasArchiveRef = /(Original preserved at:|Archived at:)/i.test(content);

    if (hasAnchorLink && hasArchiveRef) {
      // Valid in-place navigation stub
      validInPlaceStubs.push(mdFile);
      continue;
    }

    // Neither archival nor valid in-place stub
    errors.push(`STUB VIOLATION: ${mdFile} contains "Moved to Canonical Documentation" but is not in docs/archive/ and lacks required navigation stub markers (anchor link *.md#section + archive reference)`);
  }
}

console.log(`  ✓ Found ${stubCount} stub files (${validInPlaceStubs.length} valid in-place navigation stubs)`);

// ============================================================================
// GUARDRAIL 3: RISK LINTER (canonicals only)
// ============================================================================
console.log('\n[3/5] Risk Linter: scanning for dangerous patterns...');

const riskPatterns = [
  { pattern: /Access-Control-Allow-Origin:\s*\*/i, name: 'Access-Control-Allow-Origin: *' },
  { pattern: /anonymous\s+websocket/i, name: 'anonymous websocket' },
  { pattern: /fallback.*secret|default.*secret/i, name: 'fallback/default secret' },
  { pattern: /demo\s*creds|demo@/i, name: 'demo creds or demo@' },
  { pattern: /sk-[a-zA-Z0-9]{20,}/i, name: 'sk-<tokenlike>' },
];

// Check canonical docs (top-level .md files and docs/** excluding archive, incidents, strategy)
const canonicalFiles = allMarkdownFiles.filter(f => {
  return !f.startsWith('docs/archive/') &&
         !f.startsWith('docs/incidents/') &&
         !f.startsWith('docs/strategy/') &&
         !f.includes('ADR') &&
         !f.includes('CHANGELOG');
});

for (const mdFile of canonicalFiles) {
  const fullPath = path.join(ROOT, mdFile);
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  for (const { pattern, name } of riskPatterns) {
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i])) {
        errors.push(`RISK: ${mdFile}:${i + 1} contains banned phrase "${name}"`);
      }
    }
  }
}

console.log(`  ✓ Scanned ${canonicalFiles.length} canonical files for risk patterns`);

// ============================================================================
// GUARDRAIL 4: ANCHOR LINTER
// ============================================================================
console.log('\n[4/5] Anchor Linter: verifying all markdown links with anchors...');

let anchorChecks = 0;
let anchorErrors = 0;

// Extract headings from a file and create anchor map
function extractHeadings(content) {
  const headings = new Set();
  const lines = content.split('\n');

  for (const line of lines) {
    // Match markdown headings: # Heading or ## Heading, etc.
    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
    if (headingMatch) {
      const heading = headingMatch[1].trim();
      // Convert to GitHub-style anchor: lowercase, spaces to hyphens, remove special chars
      const anchor = heading
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      headings.add(anchor);
    }

    // Check for {#custom-anchor} syntax
    const anchorMatch = line.match(/\{#([\w-]+)\}/);
    if (anchorMatch) {
      headings.add(anchorMatch[1]);
    }

    // Check for HTML anchor tags: <a id="anchor-name"></a>
    const htmlAnchorMatch = line.match(/<a\s+id="([\w-]+)"\s*>/i);
    if (htmlAnchorMatch) {
      headings.add(htmlAnchorMatch[1]);
    }
  }

  return headings;
}

for (const mdFile of allMarkdownFiles) {
  const fullPath = path.join(ROOT, mdFile);
  const content = fs.readFileSync(fullPath, 'utf8');

  // Find all links with anchors: [text](path#anchor)
  const anchorLinkPattern = /\[([^\]]+)\]\(([\w\-\/\.]*\.md)#([\w-]+)\)/g;
  let linkMatch;

  while ((linkMatch = anchorLinkPattern.exec(content)) !== null) {
    anchorChecks++;
    const targetFile = linkMatch[2].replace(/^\.\//, '');
    const anchor = linkMatch[3];

    // Resolve target file path relative to current file
    const currentDir = path.dirname(mdFile);
    const targetPath = path.join(ROOT, currentDir, targetFile);

    if (!fs.existsSync(targetPath)) {
      errors.push(`BROKEN LINK: ${mdFile} links to non-existent ${targetFile}`);
      anchorErrors++;
      continue;
    }

    // Check if anchor exists
    const targetContent = fs.readFileSync(targetPath, 'utf8');
    const targetHeadings = extractHeadings(targetContent);

    if (!targetHeadings.has(anchor)) {
      errors.push(`BROKEN ANCHOR: ${mdFile} links to ${targetFile}#${anchor} but anchor not found`);
      anchorErrors++;
    }
  }
}

console.log(`  ✓ Verified ${anchorChecks} anchor links (${anchorErrors} errors)`);

// ============================================================================
// GUARDRAIL 5: REALITY GREPS
// ============================================================================
console.log('\n[5/5] Reality Greps: verifying critical implementation details...');

const realityChecks = [
  {
    description: 'CORS allowlist (not wildcard)',
    files: ['server/**/*.ts', 'server/**/*.js'],
    pattern: /allowedOrigins.*\[|origin:\s*function/,
  },
  {
    description: 'WebSocket JWT authentication',
    files: ['server/src/**/*.ts', 'server/src/**/*.js', 'server/**/utils/**/*.ts', 'server/**/utils/**/*.js'],
    patterns: [
      /(upgrade|websocket).*auth/i,
      /(Sec-WebSocket-Protocol|Authorization).*Bearer/i,
      /jwt.*(verify|decode)/i,
    ],
    matchAny: true, // Pass if ANY pattern matches
  },
  {
    description: 'RLS (Row Level Security) enabled',
    files: ['server/**/*.sql', 'supabase/**/*.sql'],
    pattern: /ALTER TABLE.*ENABLE ROW LEVEL SECURITY|CREATE POLICY/i,
  },
  {
    description: 'Refresh token latch/rotation',
    files: ['client/**/*.ts', 'client/**/*.tsx', 'client/**/*.js'],
    patterns: [
      /refreshInProgressRef.*useRef\(false\)/,
      /clearTimeout\(.*refreshTimerRef/,
      /refreshTimerRef.*=.*setTimeout/, // Check for timer assignment (refreshSession call is in the callback)
    ],
    matchAll: true, // Pass only if ALL patterns match
  },
  {
    description: 'WebSocket reconnect with exponential backoff',
    files: ['client/**/*.ts', 'client/**/*.tsx', 'client/**/*.js'],
    pattern: /reconnect.*backoff|backoff.*reconnect|Math\.min.*delay.*reconnect/i,
  },
  {
    description: 'Voice ordering split audio effects',
    files: ['client/**/*.ts', 'client/**/*.tsx', 'server/**/*.ts'],
    pattern: /split.*audio|audio.*split|separate.*effect/i,
  },
];

for (const check of realityChecks) {
  let found = false;

  // Collect all files matching the check's file patterns
  let allFiles = [];
  for (const filePattern of check.files) {
    const files = glob.sync(filePattern, {
      cwd: ROOT,
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.test.*', '**/*.spec.*'],
    });
    allFiles = allFiles.concat(files);
  }

  if (check.patterns) {
    // Multi-pattern check
    if (check.matchAny) {
      // Pass if ANY pattern matches in ANY file
      for (const file of allFiles) {
        const fullPath = path.join(ROOT, file);
        if (!fs.existsSync(fullPath)) continue;
        const content = fs.readFileSync(fullPath, 'utf8');

        for (const pattern of check.patterns) {
          if (pattern.test(content)) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
    } else if (check.matchAll) {
      // Pass only if ALL patterns match (can be across different files)
      const matchedPatterns = new Set();

      for (const file of allFiles) {
        const fullPath = path.join(ROOT, file);
        if (!fs.existsSync(fullPath)) continue;
        const content = fs.readFileSync(fullPath, 'utf8');

        for (let i = 0; i < check.patterns.length; i++) {
          if (check.patterns[i].test(content)) {
            matchedPatterns.add(i);
          }
        }
      }

      found = matchedPatterns.size === check.patterns.length;
    }
  } else {
    // Single pattern check (original logic)
    for (const file of allFiles) {
      const fullPath = path.join(ROOT, file);
      if (!fs.existsSync(fullPath)) continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      if (check.pattern.test(content)) {
        found = true;
        break;
      }
    }
  }

  if (!found) {
    errors.push(`REALITY CHECK FAILED: No evidence of "${check.description}" in codebase`);
  }
}

console.log(`  ✓ Completed ${realityChecks.length} reality checks`);

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(70));
if (errors.length === 0) {
  console.log('✅ ALL DOCS GUARDRAILS PASSED');
  console.log('='.repeat(70));
  process.exit(0);
} else {
  console.log(`❌ DOCS GUARDRAILS FAILED - ${errors.length} error(s):`);
  console.log('='.repeat(70));
  errors.forEach(err => console.log(`  • ${err}`));
  console.log('='.repeat(70));
  process.exit(1);
}
