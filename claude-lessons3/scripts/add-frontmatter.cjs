#!/usr/bin/env node
/**
 * Automated script to add YAML frontmatter to all claude-lessons3 markdown files
 *
 * Usage: node scripts/add-frontmatter.js
 */

const fs = require('fs');
const path = require('path');

// Category configurations with specific metadata
const categories = {
  '02-database-supabase-issues': {
    name: 'database-supabase',
    total_cost: 100000,
    total_commits: 150,
    incident_count: 5,
    severity: { P0: 3, P1: 2 },
    tags: ['schema-drift', 'rpc-functions', 'prisma', 'migrations', 'remote-first']
  },
  '03-react-ui-ux-issues': {
    name: 'react-ui-ux',
    total_cost: 8000,
    total_commits: 40,
    incident_count: 3,
    severity: { P0: 2, P1: 1 },
    tags: ['react-318', 'hydration', 'animate-presence', 'hooks', 'infinite-loops']
  },
  '04-realtime-websocket-issues': {
    name: 'realtime-websocket',
    total_cost: 20000,
    total_commits: 70,
    incident_count: 4,
    severity: { P0: 3, P1: 1 },
    tags: ['memory-leaks', 'race-conditions', 'event-handlers', 'connection-pooling']
  },
  '05-build-deployment-issues': {
    name: 'build-deployment',
    total_cost: 30000,
    total_commits: 82,
    incident_count: 3,
    severity: { P0: 2, P1: 1 },
    tags: ['vercel', 'monorepo', 'memory-limits', 'build-order', 'ci-cd']
  },
  '06-testing-quality-issues': {
    name: 'testing-quality',
    total_cost: 10000,
    total_commits: 60,
    incident_count: 2,
    severity: { P1: 2 },
    tags: ['quarantine', 'test-health', 'flaky-tests', 'coverage']
  },
  '07-api-integration-issues': {
    name: 'api-integration',
    total_cost: 20000,
    total_commits: 61,
    incident_count: 4,
    severity: { P0: 2, P1: 2 },
    tags: ['openai', 'square', 'timeouts', 'model-changes', 'audit-logging']
  },
  '08-performance-optimization-issues': {
    name: 'performance-optimization',
    total_cost: 10000,
    total_commits: 56,
    incident_count: 3,
    severity: { P1: 3 },
    tags: ['memory-leaks', 'bundle-size', 'lazy-loading', 'optimization']
  },
  '09-security-compliance-issues': {
    name: 'security-compliance',
    total_cost: 1000000,
    total_commits: 150,
    incident_count: 2,
    severity: { P0: 2 },
    tags: ['multi-tenancy', 'rbac', 'audit-logging', 'credentials', 'rls']
  },
  '10-documentation-drift-issues': {
    name: 'documentation-drift',
    total_cost: 15000,
    total_commits: 36,
    incident_count: 2,
    severity: { P1: 2 },
    tags: ['link-rot', 'diataxis', 'freshness', 'sync']
  }
};

// Document type templates
const documentTypes = {
  'README.md': (category, config) => ({
    category: config.name,
    category_id: category.split('-')[0],
    version: '3.0.0',
    last_updated: '2025-11-19',
    document_type: 'README',
    total_cost: config.total_cost,
    total_commits: config.total_commits,
    incident_count: config.incident_count,
    severity_distribution: config.severity,
    tags: config.tags
  }),
  'INCIDENTS.md': (category, config) => ({
    category: config.name,
    category_id: category.split('-')[0],
    version: '3.0.0',
    last_updated: '2025-11-19',
    document_type: 'INCIDENTS',
    incident_count: config.incident_count,
    total_cost: config.total_cost,
    severity_distribution: config.severity,
    tags: config.tags
  }),
  'PATTERNS.md': (category, config) => ({
    category: config.name,
    category_id: category.split('-')[0],
    version: '3.0.0',
    last_updated: '2025-11-19',
    document_type: 'PATTERNS',
    tags: config.tags
  }),
  'PREVENTION.md': (category, config) => ({
    category: config.name,
    category_id: category.split('-')[0],
    version: '3.0.0',
    last_updated: '2025-11-19',
    document_type: 'PREVENTION',
    tags: config.tags
  }),
  'QUICK-REFERENCE.md': (category, config) => ({
    category: config.name,
    category_id: category.split('-')[0],
    version: '3.0.0',
    last_updated: '2025-11-19',
    document_type: 'QUICK-REFERENCE',
    tags: ['debugging', 'troubleshooting', ...config.tags]
  }),
  'AI-AGENT-GUIDE.md': (category, config) => ({
    category: config.name,
    category_id: category.split('-')[0],
    version: '3.0.0',
    last_updated: '2025-11-19',
    document_type: 'AI-AGENT-GUIDE',
    target_audience: ['claude-code', 'github-copilot', 'gpt-4', 'ai-assistants'],
    tags: ['ai-guide', 'anti-patterns', ...config.tags]
  })
};

function generateFrontmatter(metadata) {
  const lines = ['---'];

  function addValue(key, value, indent = 0) {
    const spaces = '  '.repeat(indent);

    if (Array.isArray(value)) {
      lines.push(`${spaces}${key}: [${value.join(', ')}]`);
    } else if (typeof value === 'object' && value !== null) {
      lines.push(`${spaces}${key}:`);
      Object.entries(value).forEach(([k, v]) => {
        addValue(k, v, indent + 1);
      });
    } else if (typeof value === 'string') {
      lines.push(`${spaces}${key}: "${value}"`);
    } else {
      lines.push(`${spaces}${key}: ${value}`);
    }
  }

  Object.entries(metadata).forEach(([key, value]) => {
    addValue(key, value);
  });

  lines.push('---\n');
  return lines.join('\n');
}

function addFrontmatterToFile(filePath, metadata) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check if file already has frontmatter
    if (content.startsWith('---')) {
      console.log(`⏭️  Skipping ${filePath} (already has frontmatter)`);
      return;
    }

    const frontmatter = generateFrontmatter(metadata);
    const newContent = frontmatter + content;

    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ Added frontmatter to ${filePath}`);
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function processCategory(categoryPath, categoryName) {
  const config = categories[categoryName];
  if (!config) {
    console.log(`⚠️  No configuration for ${categoryName}, skipping`);
    return;
  }

  console.log(`\n📁 Processing ${categoryName}...`);

  Object.entries(documentTypes).forEach(([fileName, metadataGenerator]) => {
    const filePath = path.join(categoryPath, fileName);

    if (fs.existsSync(filePath)) {
      const metadata = metadataGenerator(categoryName, config);
      addFrontmatterToFile(filePath, metadata);
    } else {
      console.log(`⚠️  File not found: ${filePath}`);
    }
  });
}

function main() {
  const lessonsDir = path.join(__dirname, '..');

  console.log('🚀 Starting frontmatter addition process...\n');

  // Process all categories except 01-auth (already done manually)
  Object.keys(categories).forEach(categoryName => {
    const categoryPath = path.join(lessonsDir, categoryName);

    if (fs.existsSync(categoryPath)) {
      processCategory(categoryPath, categoryName);
    } else {
      console.log(`⚠️  Category directory not found: ${categoryPath}`);
    }
  });

  console.log('\n✨ Frontmatter addition complete!');
}

main();
