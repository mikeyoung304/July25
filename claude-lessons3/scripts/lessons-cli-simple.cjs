#!/usr/bin/env node
/**
 * Simplified Claude Lessons CLI
 * Essential commands only
 */

const fs = require('fs');
const path = require('path');
const { minimatch } = require('minimatch');

const BASE_DIR = path.join(__dirname, '..');
const KNOWLEDGE_BASE = path.join(BASE_DIR, 'knowledge-base.json');

// Load knowledge base
function loadKnowledge() {
  try {
    return JSON.parse(fs.readFileSync(KNOWLEDGE_BASE, 'utf8'));
  } catch (error) {
    console.error('Error loading knowledge-base.json:', error.message);
    process.exit(1);
  }
}

// Command: find <file>
function findLessonsForFile(filePath) {
  const kb = loadKnowledge();

  // Check if file matches any known patterns
  for (const [pattern, info] of Object.entries(kb.file_risk_mappings)) {
    if (minimatch(filePath, pattern)) {
      const category = kb.categories.find(c => c.id === info.category);
      if (category) {
        console.log(`\nFile: ${filePath}`);
        console.log(`Category: ${category.name} (${category.id})`);
        console.log(`Risk Level: ${info.risk_level}`);
        console.log(`Time Impact: ${info.debugging_days} days`);
        console.log(`\nKey Problems:`);
        category.key_problems.forEach(p => console.log(`  - ${p}`));
        console.log(`\nSolution Pattern:`);
        console.log(`  ${category.solution_pattern}`);
        return;
      }
    }
  }

  console.log(`No lessons found for: ${filePath}`);
}

// Command: search <keyword>
function searchLessons(keyword) {
  const kb = loadKnowledge();
  const results = [];

  kb.categories.forEach(category => {
    const matches = category.key_problems.filter(p =>
      p.toLowerCase().includes(keyword.toLowerCase())
    );

    if (matches.length > 0) {
      results.push({
        category: category.name,
        id: category.id,
        matches
      });
    }
  });

  if (results.length > 0) {
    console.log(`\nSearch results for "${keyword}":\n`);
    results.forEach(r => {
      console.log(`Category ${r.id}: ${r.category}`);
      r.matches.forEach(m => console.log(`  - ${m}`));
    });
  } else {
    console.log(`No results found for: ${keyword}`);
  }
}

// Command: category <id>
function showCategory(id) {
  const kb = loadKnowledge();
  const category = kb.categories.find(c => c.id === id);

  if (category) {
    console.log(`\nCategory ${category.id}: ${category.name}`);
    console.log(`Risk Level: ${category.risk_level}`);
    console.log(`Debugging Days: ${category.debugging_days}`);
    console.log(`\nKey Problems:`);
    category.key_problems.forEach(p => console.log(`  - ${p}`));
    console.log(`\nKey Files:`);
    category.key_files.forEach(f => console.log(`  - ${f}`));
    console.log(`\nSolution Pattern:`);
    console.log(`  ${category.solution_pattern}`);
  } else {
    console.log(`Category not found: ${id}`);
  }
}

// Main CLI
const args = process.argv.slice(2);
const command = args[0];
const param = args[1];

if (!command) {
  console.log('Usage:');
  console.log('  lessons find <file>       - Find lessons for a file');
  console.log('  lessons search <keyword>  - Search by keyword');
  console.log('  lessons category <id>     - View category (01-10)');
  process.exit(0);
}

switch (command) {
  case 'find':
    if (!param) {
      console.error('Usage: lessons find <file>');
      process.exit(1);
    }
    findLessonsForFile(param);
    break;

  case 'search':
    if (!param) {
      console.error('Usage: lessons search <keyword>');
      process.exit(1);
    }
    searchLessons(param);
    break;

  case 'category':
    if (!param) {
      console.error('Usage: lessons category <id>');
      process.exit(1);
    }
    showCategory(param);
    break;

  default:
    console.error(`Unknown command: ${command}`);
    console.error('Use: find, search, or category');
    process.exit(1);
}