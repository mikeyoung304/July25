#!/usr/bin/env node

/**
 * Simple Validation Script for Authentication Fixes
 * Checks that critical files have been properly modified
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

let totalTests = 0;
let passedTests = 0;

function checkFile(filePath, testName, searchPatterns) {
  console.log(`\n${colors.cyan}Testing: ${testName}${colors.reset}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    searchPatterns.forEach(({ pattern, description }) => {
      totalTests++;
      if (content.includes(pattern)) {
        console.log(`  ${colors.green}✅ ${description}${colors.reset}`);
        passedTests++;
      } else {
        console.log(`  ${colors.red}❌ ${description}${colors.reset}`);
        console.log(`     ${colors.yellow}Missing: "${pattern}"${colors.reset}`);
      }
    });
    
  } catch (error) {
    console.log(`  ${colors.red}❌ Failed to read file: ${error.message}${colors.reset}`);
  }
}

console.log(`${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
console.log(`${colors.bold}Authentication Fix Validation${colors.reset}`);
console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);

// Check auth.ts
checkFile(
  path.join(__dirname, '..', 'server', 'src', 'middleware', 'auth.ts'),
  'auth.ts - Authentication Middleware',
  [
    {
      pattern: "import { ROLE_SCOPES } from './rbac'",
      description: 'Imports ROLE_SCOPES'
    },
    {
      pattern: 'ROLE_SCOPES[decoded.role]',
      description: 'Uses role-based scopes'
    }
  ]
);

// Check rbac.ts
checkFile(
  path.join(__dirname, '..', 'server', 'src', 'middleware', 'rbac.ts'),
  'rbac.ts - Role-Based Access Control',
  [
    {
      pattern: 'export const ROLE_SCOPES',
      description: 'Exports ROLE_SCOPES'
    },
    {
      pattern: 'ApiScope.ORDERS_CREATE',
      description: 'Defines ORDERS_CREATE scope'
    }
  ]
);

// Check useVoiceOrderWebRTC.ts
checkFile(
  path.join(__dirname, '..', 'client', 'src', 'pages', 'hooks', 'useVoiceOrderWebRTC.ts'),
  'useVoiceOrderWebRTC.ts - Voice Order Hook',
  [
    {
      pattern: 'tableNumber:',
      description: 'Uses camelCase tableNumber'
    },
    {
      pattern: 'customerName:',
      description: 'Uses camelCase customerName'
    },
    {
      pattern: "type: 'dine-in'",
      description: 'Uses correct type field'
    }
  ]
);

// Check VoiceOrderModal.tsx
checkFile(
  path.join(__dirname, '..', 'client', 'src', 'pages', 'components', 'VoiceOrderModal.tsx'),
  'VoiceOrderModal.tsx - Voice Modal',
  [
    {
      pattern: "mode === 'kiosk' ?",
      description: 'Prevents duplicate items in server mode'
    }
  ]
);

// Summary
console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
console.log(`${colors.bold}Summary${colors.reset}`);
console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0;

console.log(`Total Tests: ${totalTests}`);
console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
console.log(`${colors.red}Failed: ${totalTests - passedTests}${colors.reset}`);
console.log(`Success Rate: ${successRate}%\n`);

if (passedTests === totalTests) {
  console.log(`${colors.green}${colors.bold}✅ ALL FIXES VALIDATED!${colors.reset}`);
  console.log(`${colors.green}Ready for testing order submission.${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.red}${colors.bold}❌ VALIDATION FAILED${colors.reset}`);
  console.log(`${colors.red}Some fixes are missing or incorrect.${colors.reset}\n`);
  process.exit(1);
}
