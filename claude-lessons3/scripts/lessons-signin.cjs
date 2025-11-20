#!/usr/bin/env node
/**
 * Claude Lessons 3.0 - Sign In/Sign Out Tool
 * Auto-edits SIGN_IN_SHEET.md with proper formatting
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Paths
const SIGN_IN_SHEET = path.join(__dirname, '..', 'SIGN_IN_SHEET.md');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

/**
 * Get current timestamp in YYYY-MM-DD HH:MM format
 */
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Get next available entry ID
 */
function getNextId(content) {
  // Find all existing IDs in tables
  const idMatches = content.match(/^\| (\d+) \|/gm);
  if (!idMatches || idMatches.length === 0) {
    return 1;
  }

  const ids = idMatches.map(match => {
    const idStr = match.match(/^\| (\d+) \|/)[1];
    return parseInt(idStr, 10);
  });

  return Math.max(...ids) + 1;
}

/**
 * Prompt user for input
 */
function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Sign in - Add entry to Current Sessions
 */
async function signIn() {
  console.log(`${colors.cyan}Claude Lessons 3.0 - Sign In${colors.reset}\n`);

  // Read current sheet
  let content;
  try {
    content = fs.readFileSync(SIGN_IN_SHEET, 'utf8');
  } catch (error) {
    console.error(`${colors.red}Error reading SIGN_IN_SHEET.md:${colors.reset}`, error.message);
    process.exit(1);
  }

  // Get next ID
  const id = getNextId(content);
  const timestamp = getTimestamp();

  // Prompt for issue
  const issue = await prompt(`${colors.green}Issue Summary:${colors.reset} `);

  if (!issue) {
    console.error(`${colors.red}Issue summary is required${colors.reset}`);
    process.exit(1);
  }

  // Optional: agent name
  const agent = await prompt(`${colors.green}Agent name${colors.reset} [Claude Code]: `) || 'Claude Code';

  // Create entry
  const entry = `| ${String(id).padStart(3, '0')} | ${timestamp} | ${agent} | ${issue} | | | IN_PROGRESS | | |`;

  // Find Current Sessions table and replace placeholder
  const updatedContent = content.replace(
    /\|\s*\*No active sessions\*\s*\|[^\n]*\n/,
    `${entry}\n`
  );

  // If placeholder not found, add after Current Sessions header
  let finalContent;
  if (updatedContent === content) {
    // Find the Current Sessions table header
    const currentSessionsMatch = content.match(/(## 🟢 Current Sessions.*?\n\|.*?\n\|.*?\n)/s);
    if (currentSessionsMatch) {
      const headerEnd = currentSessionsMatch.index + currentSessionsMatch[0].length;
      finalContent = content.slice(0, headerEnd) + entry + '\n' + content.slice(headerEnd);
    } else {
      console.error(`${colors.red}Could not find Current Sessions table${colors.reset}`);
      process.exit(1);
    }
  } else {
    finalContent = updatedContent;
  }

  // Write back
  try {
    fs.writeFileSync(SIGN_IN_SHEET, finalContent, 'utf8');
    console.log(`\n${colors.green}✓ Signed in successfully${colors.reset}`);
    console.log(`Entry ID: ${id}`);
    console.log(`Timestamp: ${timestamp}`);
    console.log(`Agent: ${agent}`);
    console.log(`Issue: ${issue}`);
    console.log(`\n${colors.yellow}Remember to sign out when finished!${colors.reset}`);
    console.log(`  npm run lessons:signout\n`);
  } catch (error) {
    console.error(`${colors.red}Error writing SIGN_IN_SHEET.md:${colors.reset}`, error.message);
    process.exit(1);
  }
}

/**
 * Sign out - Move entry from Current to Completed
 */
async function signOut() {
  console.log(`${colors.cyan}Claude Lessons 3.0 - Sign Out${colors.reset}\n`);

  // Read current sheet
  let content;
  try {
    content = fs.readFileSync(SIGN_IN_SHEET, 'utf8');
  } catch (error) {
    console.error(`${colors.red}Error reading SIGN_IN_SHEET.md:${colors.reset}`, error.message);
    process.exit(1);
  }

  // Find active sessions
  const currentSessionsSection = content.match(/## 🟢 Current Sessions.*?(?=##)/s);
  if (!currentSessionsSection) {
    console.error(`${colors.red}No Current Sessions section found${colors.reset}`);
    process.exit(1);
  }

  const entries = currentSessionsSection[0].match(/^\| \d+ \|.*IN_PROGRESS.*$/gm);

  if (!entries || entries.length === 0) {
    console.log(`${colors.yellow}No active sessions to sign out${colors.reset}`);
    process.exit(0);
  }

  // Show active sessions
  console.log(`${colors.green}Active Sessions:${colors.reset}`);
  entries.forEach((entry, index) => {
    const [, id, timestamp, agent, issue] = entry.match(/^\| (\d+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|/);
    console.log(`  ${index + 1}. [ID ${id}] ${timestamp.trim()} - ${issue.trim()}`);
  });

  // Prompt for which session
  let sessionIndex = 0;
  if (entries.length > 1) {
    const choice = await prompt(`\n${colors.green}Which session to sign out?${colors.reset} [1-${entries.length}]: `);
    sessionIndex = parseInt(choice, 10) - 1;
    if (isNaN(sessionIndex) || sessionIndex < 0 || sessionIndex >= entries.length) {
      console.error(`${colors.red}Invalid choice${colors.reset}`);
      process.exit(1);
    }
  }

  const selectedEntry = entries[sessionIndex];
  const [, id, timestamp, agent, issue] = selectedEntry.match(/^\| (\d+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|/);

  console.log(`\n${colors.cyan}Signing out entry ${id}:${colors.reset} ${issue.trim()}`);

  // Prompt for completion details
  const categories = await prompt(`${colors.green}Categories referenced${colors.reset} (e.g., "01, 04, 07"): `);
  const files = await prompt(`${colors.green}Files involved${colors.reset} (e.g., "auth.ts, websocket.ts"): `);
  const resolution = await prompt(`${colors.green}Resolution${colors.reset} (what worked): `);
  const effectivenessInput = await prompt(`${colors.green}Effectiveness${colors.reset} (1-5 stars): `);

  const effectiveness = parseInt(effectivenessInput, 10);
  if (isNaN(effectiveness) || effectiveness < 1 || effectiveness > 5) {
    console.error(`${colors.red}Effectiveness must be 1-5${colors.reset}`);
    process.exit(1);
  }

  const stars = '⭐'.repeat(effectiveness);

  // Calculate duration
  const startTime = new Date(timestamp.trim().replace(' ', 'T'));
  const endTime = new Date();
  const durationMs = endTime - startTime;
  const durationMins = Math.floor(durationMs / 60000);

  let durationStr;
  if (durationMins < 60) {
    durationStr = `${durationMins}min`;
  } else if (durationMins < 1440) {
    const hours = Math.floor(durationMins / 60);
    const mins = durationMins % 60;
    durationStr = mins > 0 ? `${hours}h${mins}min` : `${hours}h`;
  } else {
    const days = Math.floor(durationMins / 1440);
    const hours = Math.floor((durationMins % 1440) / 60);
    durationStr = hours > 0 ? `${days}d${hours}h` : `${days}d`;
  }

  // Create completed entry
  const completedEntry = `| ${id} | ${timestamp.trim()} | ${agent.trim()} | ${issue.trim()} | ${categories} | ${files} | ${resolution} | ${stars} ${resolution} | ${durationStr} |`;

  // Remove from Current Sessions
  const updatedCurrent = content.replace(selectedEntry, '| *No active sessions* | | | | | | | | |');

  // Add to Completed Sessions (after the header row)
  const completedSectionMatch = updatedCurrent.match(/(## ✅ Completed Sessions.*?\n\|.*?\n\|.*?\n)/s);
  if (!completedSectionMatch) {
    console.error(`${colors.red}Could not find Completed Sessions table${colors.reset}`);
    process.exit(1);
  }

  const headerEnd = completedSectionMatch.index + completedSectionMatch[0].length;
  const finalContent = updatedCurrent.slice(0, headerEnd) + completedEntry + '\n' + updatedCurrent.slice(headerEnd);

  // Write back
  try {
    fs.writeFileSync(SIGN_IN_SHEET, finalContent, 'utf8');
    console.log(`\n${colors.green}✓ Signed out successfully${colors.reset}`);
    console.log(`Entry ID: ${id}`);
    console.log(`Categories: ${categories || '(none)'}`);
    console.log(`Files: ${files || '(none)'}`);
    console.log(`Resolution: ${resolution || '(none)'}`);
    console.log(`Effectiveness: ${stars} (${effectiveness}/5)`);
    console.log(`Duration: ${durationStr}\n`);
  } catch (error) {
    console.error(`${colors.red}Error writing SIGN_IN_SHEET.md:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// ============================================================================
// Main
// ============================================================================

const command = process.argv[2];

if (command === 'in' || command === 'signin') {
  signIn().catch(error => {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    process.exit(1);
  });
} else if (command === 'out' || command === 'signout') {
  signOut().catch(error => {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    process.exit(1);
  });
} else {
  console.log(`${colors.cyan}Usage:${colors.reset}`);
  console.log(`  npm run lessons:signin   - Sign in to start a session`);
  console.log(`  npm run lessons:signout  - Sign out and complete a session`);
  process.exit(1);
}
