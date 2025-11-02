#!/usr/bin/env node

/**
 * Schema Drift Auto-Fix
 *
 * Automatically updates docs/reference/schema/DATABASE.md
 * to match the actual database schema from Prisma schema file
 *
 * Usage:
 *   node scripts/fix-schema-drift.js [--dry-run] [--commit]
 *
 * Options:
 *   --dry-run   Show what would be changed without writing
 *   --commit    Auto-commit changes after fixing
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOCS_PATH = path.join(ROOT, 'docs/reference/schema/DATABASE.md');
const PRISMA_SCHEMA_PATH = path.join(ROOT, 'prisma/schema.prisma');

/**
 * Parse Prisma schema file
 */
function parsePrismaSchema() {
  const content = fs.readFileSync(PRISMA_SCHEMA_PATH, 'utf-8');
  const models = [];

  // Extract model definitions
  const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
  let match;

  while ((match = modelRegex.exec(content)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];

    // Parse fields
    const fields = [];
    const fieldRegex = /(\w+)\s+(\w+)(\??)\s*(@[^\n]*)?/g;
    let fieldMatch;

    while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      const isOptional = fieldMatch[3] === '?';
      const attributes = fieldMatch[4] || '';

      // Skip relation fields (they don't create columns)
      if (attributes.includes('@relation')) {
        continue;
      }

      // Map Prisma types to SQL types
      let sqlType = fieldType;
      if (fieldType === 'String') sqlType = 'TEXT';
      if (fieldType === 'Int') sqlType = 'INTEGER';
      if (fieldType === 'Boolean') sqlType = 'BOOLEAN';
      if (fieldType === 'DateTime') sqlType = 'TIMESTAMP';
      if (fieldType === 'Json') sqlType = 'JSONB';
      if (fieldType === 'Decimal') sqlType = 'NUMERIC';

      // Build description from attributes
      let description = '';
      if (attributes.includes('@id')) description = 'Primary key';
      else if (attributes.includes('@unique')) description = 'Unique identifier';
      else if (attributes.includes('@default(now())')) description = 'Timestamp';
      else if (attributes.includes('@default(autoincrement())')) description = 'Auto-increment ID';
      else if (fieldName.includes('_at')) description = 'Timestamp';
      else description = fieldName.replace(/_/g, ' ');

      if (!isOptional && !attributes.includes('@default')) {
        description += ' (required)';
      }

      fields.push({
        name: fieldName,
        type: sqlType,
        description,
        isOptional,
        attributes
      });
    }

    // Convert model name to snake_case for table name
    const tableName = modelName
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');

    models.push({
      name: modelName,
      tableName,
      fields
    });
  }

  return models;
}

/**
 * Generate DATABASE.md content
 */
function generateDatabaseDoc(models) {
  const now = new Date().toISOString().split('T')[0];

  let content = `# Database Schema

**Last Updated:** ${now}

This document describes the PostgreSQL database schema for Restaurant OS.

## Overview

The database uses PostgreSQL with Row-Level Security (RLS) policies for multi-tenant data isolation.

### Key Features
- **Multi-tenancy**: All data is scoped by \`restaurant_id\`
- **Row-Level Security**: Automatic data isolation per restaurant
- **Audit Logging**: Comprehensive change tracking
- **Real-time**: Supabase Realtime enabled for live updates

## Core Tables

`;

  // Generate table sections
  models.forEach(model => {
    content += `### ${model.tableName}

**Model**: \`${model.name}\`

| Column | Type | Description |
| ------ | ---- | ----------- |
`;

    model.fields.forEach(field => {
      content += `| ${field.name} | ${field.type} | ${field.description} |\n`;
    });

    content += '\n';
  });

  content += `## Row-Level Security (RLS)

All tables have RLS policies that enforce:

1. **Restaurant Isolation**: Users can only access data for their restaurant
2. **Role-Based Access**: Different permissions for admin, manager, staff, customer
3. **Audit Trails**: All changes logged with user and timestamp

### Policy Structure

Each table typically has policies for:
- \`SELECT\`: Read access based on restaurant_id
- \`INSERT\`: Create with automatic restaurant_id assignment
- \`UPDATE\`: Modify own restaurant's data
- \`DELETE\`: Remove own restaurant's data (soft delete preferred)

## Indexes

Performance-critical indexes are created for:
- \`restaurant_id\` on all multi-tenant tables
- \`user_id\` for user-scoped queries
- \`created_at\` for time-range queries
- Composite indexes for common query patterns

## Migrations

Database schema is managed through Supabase migrations in \`supabase/migrations/\`.

To create a new migration:
\`\`\`bash
npm run db:migration:new <migration_name>
\`\`\`

To apply migrations:
\`\`\`bash
npm run db:push
\`\`\`

## Schema Validation

The Prisma schema file (\`server/prisma/schema.prisma\`) is the source of truth.
TypeScript types are generated from this schema.

---

*This file is auto-generated from \`server/prisma/schema.prisma\` by \`scripts/fix-schema-drift.js\`*
`;

  return content;
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const autoCommit = args.includes('--commit');

  console.log('🔧 Schema Drift Auto-Fix\n');

  // Check if Prisma schema exists
  if (!fs.existsSync(PRISMA_SCHEMA_PATH)) {
    console.error(`❌ Prisma schema not found: ${PRISMA_SCHEMA_PATH}`);
    process.exit(1);
  }

  // Parse Prisma schema
  console.log('📖 Parsing Prisma schema...');
  const models = parsePrismaSchema();
  console.log(`   Found ${models.length} models\n`);

  // Generate new documentation
  console.log('📝 Generating DATABASE.md...');
  const newContent = generateDatabaseDoc(models);

  if (dryRun) {
    console.log('\n📋 DRY RUN - Would write:\n');
    console.log(newContent.substring(0, 1000) + '...\n');
    console.log(`✅ Dry run complete. File not modified.`);
    return 0;
  }

  // Ensure directory exists
  const docsDir = path.dirname(DOCS_PATH);
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  // Write the file
  fs.writeFileSync(DOCS_PATH, newContent);
  console.log(`✅ Updated: ${DOCS_PATH}\n`);

  // Verify fix worked
  console.log('🔍 Verifying fix...');
  try {
    execSync('node scripts/check-schema-drift.cjs', {
      stdio: 'pipe',
      cwd: ROOT
    });
    console.log('✅ Schema drift resolved!\n');
  } catch (error) {
    console.log('⚠️  Verification check still shows issues. Manual review may be needed.\n');
  }

  // Auto-commit if requested
  if (autoCommit) {
    console.log('📦 Auto-committing changes...');
    try {
      execSync('git add docs/reference/schema/DATABASE.md', { cwd: ROOT });
      execSync(`git commit -m "docs: auto-update database schema documentation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"`, { cwd: ROOT });
      console.log('✅ Changes committed\n');
    } catch (error) {
      console.log('⚠️  Auto-commit failed. You may need to commit manually.\n');
    }
  } else {
    console.log('💡 To commit these changes, run:');
    console.log('   git add docs/reference/schema/DATABASE.md');
    console.log('   git commit -m "docs: auto-update database schema documentation"\n');
  }

  return 0;
}

// Run
try {
  process.exit(main());
} catch (error) {
  console.error('❌ Error fixing schema drift:', error.message);
  console.error(error.stack);
  process.exit(1);
}
