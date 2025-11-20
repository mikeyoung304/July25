#!/usr/bin/env node
/**
 * Claude Lessons 3.0 CLI Tool
 * Comprehensive CLI for navigating and querying the lessons catalog
 */

const { Command } = require('commander');
const chalk = require('chalk');
const Table = require('cli-table3');
const { minimatch } = require('minimatch');
const fs = require('fs');
const path = require('path');

// ============================================================================
// Constants & Setup
// ============================================================================

const BASE_DIR = path.join(__dirname, '..');
const INDEX_FILE = path.join(BASE_DIR, 'index.json');
const MAPPINGS_FILE = path.join(BASE_DIR, '.file-mappings.json');

// Risk level colors
const RISK_COLORS = {
  critical: chalk.red.bold,
  high: chalk.yellow.bold,
  medium: chalk.blue.bold,
  low: chalk.green.bold,
};

// Severity colors
const SEVERITY_COLORS = {
  P0: chalk.red.bold,
  P1: chalk.yellow.bold,
  P2: chalk.blue.bold,
};

// ============================================================================
// Data Loaders
// ============================================================================

/**
 * Load and parse the index.json file
 */
function loadIndex() {
  try {
    const data = fs.readFileSync(INDEX_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(chalk.red('Error loading index.json:'), error.message);
    process.exit(1);
  }
}

/**
 * Load and parse the .file-mappings.json file
 */
function loadMappings() {
  try {
    const data = fs.readFileSync(MAPPINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(chalk.red('Error loading .file-mappings.json:'), error.message);
    process.exit(1);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format time values
 */
function formatTime(days) {
  if (days >= 30) {
    return `${Math.round(days / 30)} months`;
  } else if (days >= 7) {
    return `${Math.round(days / 7)} weeks`;
  }
  return `${days} days`;
}

/**
 * Get color function for risk level
 */
function getRiskColor(riskLevel) {
  return RISK_COLORS[riskLevel] || chalk.white;
}

/**
 * Get severity display string with color
 */
function formatSeverity(severity) {
  const parts = [];
  if (severity.P0) parts.push(SEVERITY_COLORS.P0(`P0:${severity.P0}`));
  if (severity.P1) parts.push(SEVERITY_COLORS.P1(`P1:${severity.P1}`));
  if (severity.P2) parts.push(SEVERITY_COLORS.P2(`P2:${severity.P2}`));
  return parts.join(' ');
}

/**
 * Output as JSON or formatted
 */
function output(data, asJson) {
  if (asJson) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// ============================================================================
// Command: find <file>
// ============================================================================

/**
 * Find lessons for a specific file path
 */
function findLessons(filePath, options) {
  const mappings = loadMappings();
  const index = loadIndex();

  // Find matching patterns
  const matches = [];

  for (const [pattern, mapping] of Object.entries(mappings.mappings)) {
    if (minimatch(filePath, pattern)) {
      matches.push({ pattern, ...mapping });
    }
  }

  if (matches.length === 0) {
    console.log(chalk.yellow(`No lessons found for file: ${filePath}`));
    console.log(chalk.dim('Try searching by tag or category instead.'));
    return;
  }

  if (options.json) {
    output(matches, true);
    return;
  }

  // Display results
  console.log(chalk.bold(`\nLessons for: ${chalk.cyan(filePath)}\n`));

  matches.forEach((match, idx) => {
    const riskColor = getRiskColor(match.risk_level);

    console.log(riskColor(`${idx + 1}. Risk Level: ${match.risk_level.toUpperCase()}`));
    console.log(chalk.dim(`   Pattern: ${match.pattern}`));
    console.log(`   Time Impact: ${chalk.yellow.bold(formatTime(match.debugging_days || 1))}`);

    if (match.required_reading) {
      console.log(chalk.yellow('   ⚠ Required Reading'));
    }

    // Show lessons
    console.log(`   Lessons:`);
    match.lessons.forEach(lessonPath => {
      const category = index.categories.find(c => c.path === lessonPath);
      if (category) {
        console.log(`     - ${category.name} (${category.id})`);
      }
    });

    // Show documents
    if (match.documents && match.documents.length > 0) {
      console.log(`   Documents: ${chalk.blue(match.documents.join(', '))}`);
    }

    // Show anti-patterns
    if (match.key_anti_patterns && match.key_anti_patterns.length > 0) {
      console.log(`   Key Anti-Patterns:`);
      match.key_anti_patterns.forEach(pattern => {
        console.log(`     • ${pattern}`);
      });
    }

    console.log('');
  });

  // Summary
  const totalDays = matches.reduce((sum, m) => sum + m.debugging_days, 0);
  const maxRisk = matches.reduce((max, m) => {
    const levels = ['low', 'medium', 'high', 'critical'];
    const maxLevel = levels.indexOf(max);
    const currentLevel = levels.indexOf(m.risk_level);
    return currentLevel > maxLevel ? m.risk_level : max;
  }, 'low');

  const riskColor = getRiskColor(maxRisk);
  console.log(chalk.bold('Summary:'));
  console.log(`  Total Time Saved: ${chalk.green.bold(formatTime(totalDays || 0))}`);
  console.log(`  Maximum Risk Level: ${riskColor(maxRisk.toUpperCase())}`);
  console.log(`  Patterns Matched: ${matches.length}`);
}

// ============================================================================
// Command: search <keyword>
// ============================================================================

/**
 * Search lessons by tag or topic
 */
function searchLessons(keyword, options) {
  const index = loadIndex();
  const searchTerm = keyword.toLowerCase();

  // Search in tag index
  const tagMatches = [];
  for (const [tag, tagInfo] of Object.entries(index.tag_index)) {
    if (tag.toLowerCase().includes(searchTerm)) {
      tagMatches.push({ tag, ...tagInfo });
    }
  }

  // Search in categories
  const categoryMatches = index.categories.filter(cat => {
    return cat.name.toLowerCase().includes(searchTerm) ||
           cat.tags.some(t => t.toLowerCase().includes(searchTerm));
  });

  if (tagMatches.length === 0 && categoryMatches.length === 0) {
    console.log(chalk.yellow(`No results found for: ${keyword}`));
    return;
  }

  if (options.json) {
    output({ tagMatches, categoryMatches }, true);
    return;
  }

  console.log(chalk.bold(`\nSearch results for: ${chalk.cyan(keyword)}\n`));

  // Display tag matches
  if (tagMatches.length > 0) {
    console.log(chalk.bold.blue('Tag Matches:\n'));

    const table = new Table({
      head: ['Tag', 'Categories', 'Incidents', 'Cost'],
      style: { head: ['cyan'] }
    });

    tagMatches.forEach(match => {
      table.push([
        match.tag,
        match.categories.join(', '),
        match.incident_count,
        formatTime(match.debugging_days || 0)
      ]);
    });

    console.log(table.toString());
    console.log('');
  }

  // Display category matches
  if (categoryMatches.length > 0) {
    console.log(chalk.bold.blue('Category Matches:\n'));

    const table = new Table({
      head: ['ID', 'Name', 'Cost', 'Incidents', 'Severity'],
      style: { head: ['cyan'] }
    });

    categoryMatches.forEach(cat => {
      table.push([
        cat.id,
        cat.name,
        formatTime(cat.debugging_days || 0),
        cat.incident_count,
        formatSeverity(cat.severity)
      ]);
    });

    console.log(table.toString());
  }
}

// ============================================================================
// Command: list
// ============================================================================

/**
 * List all categories
 */
function listCategories(options) {
  const index = loadIndex();

  if (options.json) {
    output(index.categories, true);
    return;
  }

  console.log(chalk.bold('\nClaude Lessons 3.0 - All Categories\n'));

  const table = new Table({
    head: ['ID', 'Name', 'Cost', 'Commits', 'Incidents', 'Severity'],
    style: { head: ['cyan'] },
    colWidths: [5, 35, 12, 10, 12, 20]
  });

  index.categories.forEach(cat => {
    const severityStr = formatSeverity(cat.severity);
    table.push([
      cat.id,
      cat.name,
      formatTime(cat.debugging_days || 0),
      cat.total_commits,
      cat.incident_count,
      severityStr
    ]);
  });

  console.log(table.toString());

  // Totals
  console.log(chalk.bold('\nTotals:'));
  console.log(`  Categories: ${index.meta.total_categories}`);
  console.log(`  Documents: ${index.meta.total_documents}`);
  console.log(`  Total Time: ${chalk.red.bold(formatTime(index.meta.total_debugging_days || 0))}`);
  console.log(`  Total Commits: ${index.meta.total_commits}`);
  console.log(`  Total Hours: ${index.meta.total_hours}`);
  console.log(`  Total Incidents: ${index.meta.total_incidents}`);
}

// ============================================================================
// Command: stats
// ============================================================================

/**
 * Show aggregate metrics
 */
function showStats(options) {
  const index = loadIndex();

  if (options.json) {
    output({
      meta: index.meta,
      summary: index.summary
    }, true);
    return;
  }

  console.log(chalk.bold('\nClaude Lessons 3.0 - Statistics\n'));

  // Overview
  console.log(chalk.bold.blue('Overview:'));
  console.log(`  Version: ${index.meta.version}`);
  console.log(`  Last Updated: ${index.meta.last_updated}`);
  console.log(`  Total Categories: ${index.meta.total_categories}`);
  console.log(`  Total Documents: ${index.meta.total_documents}`);
  console.log('');

  // Financial Impact
  console.log(chalk.bold.blue('Financial Impact:'));
  console.log(`  Total Time: ${chalk.red.bold(formatTime(index.meta.total_debugging_days || 0))}`);
  console.log(`  Hours Saved: ${chalk.green.bold(formatTime(index.summary.engineering_hours_saved || 0))}`);
  console.log('');

  // Engineering Effort
  console.log(chalk.bold.blue('Engineering Effort:'));
  console.log(`  Total Hours: ${index.summary.engineering_hours}`);
  console.log(`  Total Commits: ${index.summary.commits_analyzed}`);
  console.log('');

  // Severity Distribution
  console.log(chalk.bold.blue('Severity Distribution:'));
  const sevTable = new Table({
    head: ['Severity', 'Count', 'Percentage'],
    style: { head: ['cyan'] }
  });

  const totalIncidents = Object.values(index.summary.severity_distribution).reduce((a, b) => a + b, 0);
  Object.entries(index.summary.severity_distribution).forEach(([severity, count]) => {
    const percentage = ((count / totalIncidents) * 100).toFixed(1);
    const colorFn = SEVERITY_COLORS[severity] || chalk.white;
    sevTable.push([
      colorFn(severity),
      count,
      `${percentage}%`
    ]);
  });

  console.log(sevTable.toString());
  console.log('');

  // Cost Breakdown by Category
  console.log(chalk.bold.blue('Cost Breakdown by Category:'));
  const costTable = new Table({
    head: ['Category', 'Cost', 'Percentage'],
    style: { head: ['cyan'] },
    colWidths: [30, 15, 15]
  });

  const sortedCosts = Object.entries(index.summary.stability_improvements)
    .sort((a, b) => b[1] - a[1]);

  sortedCosts.forEach(([category, cost]) => {
    const percentage = ((cost / index.summary.total_cost_usd) * 100).toFixed(1);
    costTable.push([
      category,
      formatCurrency(cost),
      `${percentage}%`
    ]);
  });

  console.log(costTable.toString());
}

// ============================================================================
// Command: validate
// ============================================================================

/**
 * Validate the lessons structure
 */
function validateLessons(options) {
  const issues = [];

  // Check index.json exists and is valid
  let index;
  try {
    index = loadIndex();
    console.log(chalk.green('✓ index.json is valid JSON'));
  } catch (error) {
    issues.push(`index.json: ${error.message}`);
  }

  // Check .file-mappings.json exists and is valid
  try {
    loadMappings();
    console.log(chalk.green('✓ .file-mappings.json is valid JSON'));
  } catch (error) {
    issues.push(`.file-mappings.json: ${error.message}`);
  }

  if (!index) {
    console.log(chalk.red('\n✗ Cannot continue validation without valid index.json'));
    process.exit(1);
  }

  // Check all 10 categories have directories
  console.log(chalk.bold('\nChecking category directories...'));
  index.categories.forEach(cat => {
    const catDir = path.join(BASE_DIR, cat.path);
    if (fs.existsSync(catDir)) {
      console.log(chalk.green(`✓ ${cat.path}`));
    } else {
      issues.push(`Missing directory: ${cat.path}`);
      console.log(chalk.red(`✗ ${cat.path} (missing)`));
    }
  });

  // Check expected document structure
  console.log(chalk.bold('\nChecking documents...'));
  const expectedDocs = ['README.md', 'INCIDENTS.md', 'PATTERNS.md', 'PREVENTION.md', 'QUICK-REFERENCE.md', 'AI-AGENT-GUIDE.md'];

  index.categories.forEach(cat => {
    const catDir = path.join(BASE_DIR, cat.path);
    if (fs.existsSync(catDir)) {
      expectedDocs.forEach(doc => {
        const docPath = path.join(catDir, doc);
        if (!fs.existsSync(docPath)) {
          issues.push(`${cat.path}/${doc} not found`);
        }
      });
    }
  });

  if (issues.length === 0) {
    console.log(chalk.green.bold('\n✓ All validations passed!'));
  } else {
    console.log(chalk.red.bold(`\n✗ Found ${issues.length} issue(s):`));
    issues.forEach(issue => {
      console.log(chalk.red(`  - ${issue}`));
    });
  }

  if (options.json) {
    output({
      valid: issues.length === 0,
      issues
    }, true);
  }

  process.exit(issues.length > 0 ? 1 : 0);
}

// ============================================================================
// Command: category <id>
// ============================================================================

/**
 * Show detailed category information
 */
function showCategory(categoryId, options) {
  const index = loadIndex();
  const mappings = loadMappings();

  // Find category
  const category = index.categories.find(c => c.id === categoryId || c.name === categoryId);

  if (!category) {
    console.log(chalk.red(`Category not found: ${categoryId}`));
    console.log(chalk.dim('Use "lessons list" to see all categories'));
    process.exit(1);
  }

  if (options.json) {
    // Find related files
    const relatedFiles = [];
    for (const [pattern, mapping] of Object.entries(mappings.mappings)) {
      if (mapping.lessons.includes(category.path)) {
        relatedFiles.push({ pattern, ...mapping });
      }
    }

    output({
      category,
      relatedFiles
    }, true);
    return;
  }

  // Display category details
  console.log(chalk.bold(`\nCategory ${category.id}: ${chalk.cyan(category.name)}\n`));

  console.log(chalk.bold('Overview:'));
  console.log(`  Path: ${category.path}`);
  console.log(`  Total Time: ${chalk.red.bold(formatTime(category.debugging_days || 0))}`);
  console.log(`  Total Commits: ${category.total_commits}`);
  console.log(`  Incidents: ${category.incident_count}`);
  console.log(`  Patterns: ${category.pattern_count}`);
  console.log(`  Severity: ${formatSeverity(category.severity)}`);

  if (category.total_rewrites) {
    console.log(`  Total Rewrites: ${chalk.yellow(category.total_rewrites)}`);
  }

  console.log('');

  // Tags
  if (category.tags && category.tags.length > 0) {
    console.log(chalk.bold('Tags:'));
    console.log(`  ${category.tags.map(t => chalk.blue(t)).join(', ')}`);
    console.log('');
  }

  // Key Files
  if (category.key_files && category.key_files.length > 0) {
    console.log(chalk.bold('Key Files:'));
    category.key_files.forEach(file => {
      console.log(`  - ${file}`);
    });
    console.log('');
  }

  // Documents
  if (category.documents) {
    console.log(chalk.bold('Documents:'));
    Object.entries(category.documents).forEach(([name, doc]) => {
      const fullPath = path.join(BASE_DIR, doc);
      const exists = fs.existsSync(fullPath);
      const indicator = exists ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${indicator} ${name}: ${doc}`);
    });
    console.log('');
  }

  // Related ADRs
  if (category.related_adrs && category.related_adrs.length > 0) {
    console.log(chalk.bold('Related ADRs:'));
    console.log(`  ${category.related_adrs.join(', ')}`);
    console.log('');
  }

  // Find related files from mappings
  console.log(chalk.bold('Related Files (from mappings):'));
  let foundFiles = false;
  for (const [pattern, mapping] of Object.entries(mappings.mappings)) {
    if (mapping.lessons.includes(category.path)) {
      foundFiles = true;
      const riskColor = getRiskColor(mapping.risk_level);
      console.log(`  ${riskColor('●')} ${pattern} (${mapping.risk_level})`);
    }
  }

  if (!foundFiles) {
    console.log(chalk.dim('  No file mappings found'));
  }
}

// ============================================================================
// CLI Setup
// ============================================================================

const program = new Command();

program
  .name('lessons')
  .description('Claude Lessons 3.0 CLI - Navigate and query the lessons catalog')
  .version('3.0.0');

// Global options
program.option('--json', 'Output as JSON');

// Command: find
program
  .command('find <file>')
  .description('Find lessons for a file path')
  .action((file, options) => {
    const globalOpts = program.opts();
    findLessons(file, { ...options, ...globalOpts });
  });

// Command: search
program
  .command('search <keyword>')
  .description('Search by tag or topic')
  .action((keyword, options) => {
    const globalOpts = program.opts();
    searchLessons(keyword, { ...options, ...globalOpts });
  });

// Command: list
program
  .command('list')
  .description('List all categories')
  .action((options) => {
    const globalOpts = program.opts();
    listCategories({ ...options, ...globalOpts });
  });

// Command: stats
program
  .command('stats')
  .description('Show aggregate metrics')
  .action((options) => {
    const globalOpts = program.opts();
    showStats({ ...options, ...globalOpts });
  });

// Command: validate
program
  .command('validate')
  .description('Validate lessons structure')
  .action((options) => {
    const globalOpts = program.opts();
    validateLessons({ ...options, ...globalOpts });
  });

// Command: category
program
  .command('category <id>')
  .description('Show category details')
  .action((id, options) => {
    const globalOpts = program.opts();
    showCategory(id, { ...options, ...globalOpts });
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
