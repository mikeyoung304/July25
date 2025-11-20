#!/usr/bin/env node
/**
 * Consolidate documentation from 6 types down to 2-3 core types
 * Keeps: README.md, LESSONS.md (combined), PREVENTION.md (if substantial)
 * Removes: AI-AGENT-GUIDE.md, PATTERNS.md, INCIDENTS.md, QUICK-REFERENCE.md as separate files
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, '..');

// Categories to process
const categories = [
  '01-auth-authorization-issues',
  '02-database-supabase-issues',
  '03-react-ui-ux-issues',
  '04-realtime-websocket-issues',
  '05-build-deployment-issues',
  '06-testing-quality-issues',
  '07-api-integration-issues',
  '08-performance-optimization-issues',
  '09-security-compliance-issues',
  '10-documentation-drift-issues'
];

function consolidateCategory(categoryPath) {
  const fullPath = path.join(BASE_DIR, categoryPath);

  // Read existing files
  const readme = fs.existsSync(path.join(fullPath, 'README.md'))
    ? fs.readFileSync(path.join(fullPath, 'README.md'), 'utf8')
    : '';

  const incidents = fs.existsSync(path.join(fullPath, 'INCIDENTS.md'))
    ? fs.readFileSync(path.join(fullPath, 'INCIDENTS.md'), 'utf8')
    : '';

  const patterns = fs.existsSync(path.join(fullPath, 'PATTERNS.md'))
    ? fs.readFileSync(path.join(fullPath, 'PATTERNS.md'), 'utf8')
    : '';

  const quickRef = fs.existsSync(path.join(fullPath, 'QUICK-REFERENCE.md'))
    ? fs.readFileSync(path.join(fullPath, 'QUICK-REFERENCE.md'), 'utf8')
    : '';

  const prevention = fs.existsSync(path.join(fullPath, 'PREVENTION.md'))
    ? fs.readFileSync(path.join(fullPath, 'PREVENTION.md'), 'utf8')
    : '';

  // Extract key content (remove YAML frontmatter and AI bloat)
  const extractContent = (content) => {
    // Remove YAML frontmatter
    const contentWithoutYaml = content.replace(/^---[\s\S]*?---\n*/m, '');
    // Remove excessive emojis and formatting
    return contentWithoutYaml
      .replace(/📋|🔍|✅|🛡️|📚|💡|🎯|⚡|🔴|🟡|🟢|⚠️|❌|✓|🚀|💪|🤝|📝|📊|🧠|💰|🎓|⭐/g, '')
      .replace(/\n{3,}/g, '\n\n'); // Remove excessive blank lines
  };

  // Create consolidated LESSONS.md
  let lessonsContent = `# Lessons: ${categoryPath.replace(/-/g, ' ').replace(/^\d+\s/, '')}\n\n`;

  if (incidents) {
    lessonsContent += `## Key Incidents\n\n${extractContent(incidents)}\n\n`;
  }

  if (patterns) {
    lessonsContent += `## Solution Patterns\n\n${extractContent(patterns)}\n\n`;
  }

  if (quickRef) {
    lessonsContent += `## Quick Reference\n\n${extractContent(quickRef)}\n\n`;
  }

  // Write new consolidated files
  fs.writeFileSync(path.join(fullPath, 'LESSONS.md'), lessonsContent);

  // Keep prevention if substantial (>50 lines of actual content)
  if (prevention && extractContent(prevention).split('\n').length > 50) {
    fs.writeFileSync(
      path.join(fullPath, 'PREVENTION.md'),
      extractContent(prevention)
    );
  }

  // Update README to be simpler
  const simpleReadme = `# ${categoryPath.replace(/-/g, ' ').replace(/^\d+\s/, '')}

## Files in this category:
- **LESSONS.md** - Incidents, patterns, and quick reference
${prevention && extractContent(prevention).split('\n').length > 50 ? '- **PREVENTION.md** - How to prevent these issues' : ''}

${extractContent(readme)}
`;

  fs.writeFileSync(path.join(fullPath, 'README.md'), simpleReadme);

  // Delete old files
  const filesToDelete = [
    'AI-AGENT-GUIDE.md',
    'PATTERNS.md',
    'INCIDENTS.md',
    'QUICK-REFERENCE.md'
  ];

  filesToDelete.forEach(file => {
    const filePath = path.join(fullPath, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  console.log(`✓ Consolidated ${categoryPath}`);
}

// Process all categories
console.log('Consolidating documentation...\n');
categories.forEach(consolidateCategory);
console.log('\n✓ Documentation consolidation complete');