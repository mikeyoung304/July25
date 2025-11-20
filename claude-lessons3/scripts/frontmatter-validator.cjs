#!/usr/bin/env node
/**
 * Frontmatter Validator for Claude Lessons 3.0
 *
 * Validates that all markdown files have proper YAML frontmatter
 * with required fields and correct formats.
 *
 * Usage:
 *   node scripts/frontmatter-validator.cjs
 *   npm run validate:frontmatter
 *
 * Exit codes:
 *   0 - All validations passed
 *   1 - Validation errors found
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Required fields for each document type
const REQUIRED_FIELDS = {
  'README': ['category', 'category_id', 'version', 'last_updated', 'document_type', 'total_cost', 'incident_count', 'tags'],
  'INCIDENTS': ['category', 'category_id', 'version', 'last_updated', 'document_type', 'incident_count', 'total_cost', 'severity_distribution', 'tags'],
  'PATTERNS': ['category', 'category_id', 'version', 'last_updated', 'document_type', 'tags'],
  'PREVENTION': ['category', 'category_id', 'version', 'last_updated', 'document_type', 'tags'],
  'QUICK-REFERENCE': ['category', 'category_id', 'version', 'last_updated', 'document_type', 'tags'],
  'AI-AGENT-GUIDE': ['category', 'category_id', 'version', 'last_updated', 'document_type', 'target_audience', 'tags'],
  'ROOT_README': ['version', 'last_updated', 'document_type', 'total_categories', 'total_cost', 'tags'],
  'AI_AGENT_MASTER_GUIDE': ['version', 'last_updated', 'document_type', 'target_audience', 'tags']
};

// Expected version
const EXPECTED_VERSION = '3.0.0';

// Date format regex (YYYY-MM-DD)
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

let errors = [];
let warnings = [];
let filesChecked = 0;

/**
 * Extract frontmatter from markdown file
 */
function extractFrontmatter(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check if file starts with ---
    if (!content.startsWith('---')) {
      return { error: 'No frontmatter found (file must start with ---)' };
    }

    // Extract YAML between first two ---
    const parts = content.split('---');
    if (parts.length < 3) {
      return { error: 'Invalid frontmatter format (missing closing ---)' };
    }

    const frontmatterText = parts[1];

    try {
      const frontmatter = yaml.parse(frontmatterText);
      return { frontmatter };
    } catch (e) {
      return { error: `Invalid YAML: ${e.message}` };
    }
  } catch (e) {
    return { error: `Cannot read file: ${e.message}` };
  }
}

/**
 * Validate frontmatter fields
 */
function validateFrontmatter(filePath, frontmatter, requiredFields) {
  const fileErrors = [];
  const fileWarnings = [];

  // Check required fields
  requiredFields.forEach(field => {
    if (frontmatter[field] === undefined || frontmatter[field] === null) {
      fileErrors.push(`Missing required field: ${field}`);
    }
  });

  // Validate specific fields

  // Version
  if (frontmatter.version && frontmatter.version !== EXPECTED_VERSION) {
    fileWarnings.push(`Version mismatch: expected ${EXPECTED_VERSION}, got ${frontmatter.version}`);
  }

  // Last updated date
  if (frontmatter.last_updated) {
    if (!DATE_REGEX.test(frontmatter.last_updated)) {
      fileErrors.push(`Invalid date format for last_updated: ${frontmatter.last_updated} (expected YYYY-MM-DD)`);
    }
  }

  // Document type
  if (frontmatter.document_type) {
    const validTypes = Object.keys(REQUIRED_FIELDS);
    if (!validTypes.includes(frontmatter.document_type)) {
      fileErrors.push(`Invalid document_type: ${frontmatter.document_type}`);
    }
  }

  // Category ID format (01-10)
  if (frontmatter.category_id) {
    if (!/^\d{2}$/.test(frontmatter.category_id)) {
      fileErrors.push(`Invalid category_id format: ${frontmatter.category_id} (expected 01-10)`);
    }
  }

  // Total cost should be number
  if (frontmatter.total_cost !== undefined) {
    if (typeof frontmatter.total_cost !== 'number') {
      fileErrors.push(`total_cost must be a number, got: ${typeof frontmatter.total_cost}`);
    }
  }

  // Incident count should be number
  if (frontmatter.incident_count !== undefined) {
    if (typeof frontmatter.incident_count !== 'number') {
      fileErrors.push(`incident_count must be a number, got: ${typeof frontmatter.incident_count}`);
    }
  }

  // Tags should be array
  if (frontmatter.tags) {
    if (!Array.isArray(frontmatter.tags)) {
      fileErrors.push('tags must be an array');
    } else if (frontmatter.tags.length === 0) {
      fileWarnings.push('tags array is empty');
    }
  }

  // Target audience should be array (for AI guides)
  if (frontmatter.target_audience) {
    if (!Array.isArray(frontmatter.target_audience)) {
      fileErrors.push('target_audience must be an array');
    }
  }

  // Severity distribution should be object
  if (frontmatter.severity_distribution) {
    if (typeof frontmatter.severity_distribution !== 'object') {
      fileErrors.push('severity_distribution must be an object');
    }
  }

  return { errors: fileErrors, warnings: fileWarnings };
}

/**
 * Get document type from filename
 */
function getDocumentType(filename) {
  if (filename === 'README.md') return 'README';
  if (filename === 'INCIDENTS.md') return 'INCIDENTS';
  if (filename === 'PATTERNS.md') return 'PATTERNS';
  if (filename === 'PREVENTION.md') return 'PREVENTION';
  if (filename === 'QUICK-REFERENCE.md') return 'QUICK-REFERENCE';
  if (filename === 'AI-AGENT-GUIDE.md') return 'AI-AGENT-GUIDE';
  return null;
}

/**
 * Validate a single file
 */
function validateFile(filePath) {
  filesChecked++;

  const filename = path.basename(filePath);
  const relativePath = path.relative(process.cwd(), filePath);

  // Extract frontmatter
  const { frontmatter, error } = extractFrontmatter(filePath);

  if (error) {
    errors.push({ file: relativePath, error });
    return;
  }

  // Determine expected document type
  let expectedType = frontmatter.document_type;

  // For root files
  if (relativePath.includes('claude-lessons3/README.md')) {
    expectedType = 'ROOT_README';
  } else if (relativePath.includes('claude-lessons3/AI_AGENT_MASTER_GUIDE.md')) {
    expectedType = 'AI_AGENT_MASTER_GUIDE';
  } else {
    // For category files
    const docType = getDocumentType(filename);
    if (docType && frontmatter.document_type !== docType) {
      warnings.push({
        file: relativePath,
        warning: `document_type mismatch: expected ${docType}, got ${frontmatter.document_type}`
      });
    }
  }

  // Get required fields for this document type
  const requiredFields = REQUIRED_FIELDS[expectedType];

  if (!requiredFields) {
    warnings.push({
      file: relativePath,
      warning: `Unknown document type: ${expectedType}`
    });
    return;
  }

  // Validate
  const { errors: fileErrors, warnings: fileWarnings } = validateFrontmatter(
    filePath,
    frontmatter,
    requiredFields
  );

  // Collect errors
  fileErrors.forEach(err => {
    errors.push({ file: relativePath, error: err });
  });

  fileWarnings.forEach(warn => {
    warnings.push({ file: relativePath, warning: warn });
  });
}

/**
 * Find all markdown files to validate
 */
function findMarkdownFiles(dir) {
  const files = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    entries.forEach(entry => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, .git, etc.
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'scripts') {
          files.push(...findMarkdownFiles(fullPath));
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    });
  } catch (e) {
    console.error(`${colors.red}Error reading directory ${dir}: ${e.message}${colors.reset}`);
  }

  return files;
}

/**
 * Print results
 */
function printResults() {
  console.log(`\n${colors.cyan}=== Frontmatter Validation Results ===${colors.reset}\n`);
  console.log(`Files checked: ${filesChecked}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}\n`);

  // Print errors
  if (errors.length > 0) {
    console.log(`${colors.red}ERRORS:${colors.reset}\n`);
    errors.forEach(({ file, error }) => {
      console.log(`  ${colors.red}✗${colors.reset} ${file}`);
      console.log(`    ${error}\n`);
    });
  }

  // Print warnings
  if (warnings.length > 0) {
    console.log(`${colors.yellow}WARNINGS:${colors.reset}\n`);
    warnings.forEach(({ file, warning }) => {
      console.log(`  ${colors.yellow}⚠${colors.reset} ${file}`);
      console.log(`    ${warning}\n`);
    });
  }

  // Print summary
  if (errors.length === 0 && warnings.length === 0) {
    console.log(`${colors.green}✓ All frontmatter validations passed!${colors.reset}\n`);
  } else if (errors.length === 0) {
    console.log(`${colors.green}✓ No errors found${colors.reset} (${warnings.length} warnings)\n`);
  } else {
    console.log(`${colors.red}✗ Validation failed${colors.reset} (${errors.length} errors, ${warnings.length} warnings)\n`);
  }
}

/**
 * Main
 */
function main() {
  console.log(`${colors.cyan}Claude Lessons 3.0 - Frontmatter Validator${colors.reset}\n`);

  const lessonsDir = path.join(__dirname, '..');

  console.log(`Scanning: ${lessonsDir}\n`);

  // Find all markdown files
  const markdownFiles = findMarkdownFiles(lessonsDir);

  console.log(`Found ${markdownFiles.length} markdown files\n`);
  console.log('Validating...\n');

  // Validate each file
  markdownFiles.forEach(validateFile);

  // Print results
  printResults();

  // Exit with appropriate code
  process.exit(errors.length > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { extractFrontmatter, validateFrontmatter };
