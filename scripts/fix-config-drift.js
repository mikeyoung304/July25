#!/usr/bin/env node

/**
 * Config Drift Auto-Fix
 *
 * Automatically updates docs/reference/config/ENVIRONMENT.md
 * to match variables in .env.example
 *
 * Usage:
 *   node scripts/fix-config-drift.js [--dry-run] [--commit]
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
const DOCS_PATH = path.join(ROOT, 'docs/reference/config/ENVIRONMENT.md');
const ENV_EXAMPLE_PATH = path.join(ROOT, '.env.example');

/**
 * Parse .env.example with comments
 */
function parseEnvExample() {
  const content = fs.readFileSync(ENV_EXAMPLE_PATH, 'utf-8');
  const variables = [];
  const lines = content.split('\n');

  let currentComment = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Collect comment lines
    if (trimmed.startsWith('#')) {
      const comment = trimmed.replace(/^#\s*/, '');
      if (comment && !comment.match(/^-+$/)) {
        currentComment.push(comment);
      }
      continue;
    }

    // Skip empty lines
    if (trimmed === '') {
      currentComment = [];
      continue;
    }

    // Parse variable line
    const match = trimmed.match(/^([A-Z_]+)=(.*)$/);
    if (match) {
      const varName = match[1];
      const value = match[2].trim();

      // Determine if required based on placeholder
      const hasPlaceholder = value.includes('your_') ||
                            value.includes('YOUR_') ||
                            value.includes('generate-') ||
                            value === '' ||
                            value === '""';

      // Infer type from variable name and value
      let type = 'String';
      if (varName.includes('PORT') || varName.includes('TIMEOUT') || varName.includes('LIMIT')) {
        type = 'Number';
      } else if (varName.includes('ENABLE') || varName.includes('DISABLED')) {
        type = 'Boolean';
      } else if (varName.includes('URL') || varName.includes('ENDPOINT')) {
        type = 'URL';
      }

      // Get description from comments
      const description = currentComment.join('. ') || `${varName.toLowerCase().replace(/_/g, ' ')}`;

      variables.push({
        name: varName,
        type,
        required: hasPlaceholder,
        default: value === '' || value === '""' || hasPlaceholder ? '-' : value,
        description
      });

      currentComment = [];
    }
  }

  return variables;
}

/**
 * Generate ENVIRONMENT.md content
 */
function generateEnvironmentDoc(variables) {
  const now = new Date().toISOString().split('T')[0];

  let content = `# Environment Variables

**Last Updated:** ${now}

This document describes all environment variables used in the Restaurant OS application.

## Configuration Variables

### Required Variables

The following variables MUST be set for the application to function:

| Variable | Type | Required | Default | Description |
| -------- | ---- | -------- | ------- | ----------- |
`;

  // Add required variables
  const required = variables.filter(v => v.required);
  required.forEach(v => {
    content += `| ${v.name} | ${v.type} | Yes | ${v.default} | ${v.description} |\n`;
  });

  content += `\n### Optional Variables

The following variables are optional and have sensible defaults:

| Variable | Type | Required | Default | Description |
| -------- | ---- | -------- | ------- | ----------- |
`;

  // Add optional variables
  const optional = variables.filter(v => !v.required);
  optional.forEach(v => {
    content += `| ${v.name} | ${v.type} | No | ${v.default} | ${v.description} |\n`;
  });

  content += `\n## Variable Categories

### Database Configuration
- \`DATABASE_URL\` - PostgreSQL connection string
- \`DIRECT_URL\` - Direct database connection (bypassing pooler)

### Authentication
- \`SUPABASE_URL\` - Supabase project URL
- \`SUPABASE_ANON_KEY\` - Supabase anonymous key
- \`SUPABASE_SERVICE_ROLE_KEY\` - Supabase service role key (server-only)
- \`JWT_SECRET\` - Secret for JWT token signing

### Payment Processing
- \`SQUARE_ACCESS_TOKEN\` - Square API access token
- \`SQUARE_LOCATION_ID\` - Square location ID
- \`SQUARE_ENVIRONMENT\` - Square environment (sandbox or production)

### AI Services
- \`OPENAI_API_KEY\` - OpenAI API key for voice transcription
- \`ANTHROPIC_API_KEY\` - Anthropic API key for order processing

### Application
- \`PORT\` - Server port (default: 3001)
- \`NODE_ENV\` - Environment mode (development, production, test)
- \`CLIENT_URL\` - Frontend application URL
- \`ENABLE_REALTIME_STREAMING\` - Enable WebSocket streaming

## Security Notes

⚠️ **Never commit actual values for secret keys**

- All \`*_KEY\`, \`*_SECRET\`, and \`*_TOKEN\` variables should be kept secure
- Use environment-specific \`.env\` files (gitignored)
- For production, use your hosting platform's environment variable management

## Validation

Environment variables are validated on application startup using Zod schemas.
See \`shared/config/environment.ts\` for validation logic.

---

*This file is auto-generated from \`.env.example\` by \`scripts/fix-config-drift.js\`*
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

  console.log('🔧 Config Drift Auto-Fix\n');

  // Parse .env.example
  console.log('📖 Parsing .env.example...');
  const variables = parseEnvExample();
  console.log(`   Found ${variables.length} variables\n`);

  // Generate new documentation
  console.log('📝 Generating ENVIRONMENT.md...');
  const newContent = generateEnvironmentDoc(variables);

  if (dryRun) {
    console.log('\n📋 DRY RUN - Would write:\n');
    console.log(newContent);
    console.log(`\n✅ Dry run complete. File not modified.`);
    return 0;
  }

  // Write the file
  fs.writeFileSync(DOCS_PATH, newContent);
  console.log(`✅ Updated: ${DOCS_PATH}\n`);

  // Verify fix worked
  console.log('🔍 Verifying fix...');
  try {
    execSync('node scripts/check-config-drift.cjs', {
      stdio: 'pipe',
      cwd: ROOT
    });
    console.log('✅ Config drift resolved!\n');
  } catch (error) {
    console.log('⚠️  Verification check still shows issues. Manual review may be needed.\n');
  }

  // Auto-commit if requested
  if (autoCommit) {
    console.log('📦 Auto-committing changes...');
    try {
      execSync('git add docs/reference/config/ENVIRONMENT.md', { cwd: ROOT });
      execSync(`git commit -m "docs: auto-update environment variables documentation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"`, { cwd: ROOT });
      console.log('✅ Changes committed\n');
    } catch (error) {
      console.log('⚠️  Auto-commit failed. You may need to commit manually.\n');
    }
  } else {
    console.log('💡 To commit these changes, run:');
    console.log('   git add docs/reference/config/ENVIRONMENT.md');
    console.log('   git commit -m "docs: auto-update environment variables documentation"\n');
  }

  return 0;
}

// Run
try {
  process.exit(main());
} catch (error) {
  console.error('❌ Error fixing config drift:', error.message);
  console.error(error.stack);
  process.exit(1);
}
