#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

function log(level, message) {
  const color = level === 'error' ? colors.red :
                level === 'success' ? colors.green :
                level === 'warn' ? colors.yellow :
                colors.blue;
  
  console.log(`${color}[${level.toUpperCase()}]: ${message}${colors.reset}`);
}

/**
 * Feature flag rollout script
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || !['enable', 'disable', 'status', 'rollout'].includes(command)) {
    console.log(`
Usage: node enable-authv2.mjs <command> [options]

Commands:
  enable    Enable AUTH_V2 features
  disable   Disable AUTH_V2 features  
  status    Show current feature status
  rollout   Gradual rollout configuration

Options:
  --env <environment>  Target environment (dev|staging|prod)
  --percentage <n>     Rollout percentage (0-100)
  --dry-run           Preview changes without applying

Examples:
  node enable-authv2.mjs enable --env dev
  node enable-authv2.mjs rollout --percentage 10 --env staging
  node enable-authv2.mjs status
    `);
    process.exit(1);
  }
  
  const envFile = args.includes('--env') 
    ? `.env.${args[args.indexOf('--env') + 1]}`
    : '.env';
    
  const dryRun = args.includes('--dry-run');
  const percentage = args.includes('--percentage')
    ? parseInt(args[args.indexOf('--percentage') + 1])
    : 100;
    
  const envPath = path.join(__dirname, '..', envFile);
  
  // Read current env file
  let envContent = '';
  try {
    envContent = await fs.readFile(envPath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      log('error', `Failed to read ${envFile}: ${error.message}`);
      process.exit(1);
    }
    // File doesn't exist, create it
    envContent = '';
  }
  
  // Parse env variables
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      envVars[match[1]] = match[2];
    }
  });
  
  // Handle commands
  switch (command) {
    case 'enable':
      log('info', 'Enabling AUTH_V2 features...');
      envVars['FEATURE_AUTH_V2'] = 'true';
      envVars['FEATURE_IDEMPOTENCY'] = 'true';
      envVars['FEATURE_VOICE_DEDUPE'] = 'true';
      envVars['FEATURE_REQUIRE_CONTEXT'] = 'true';
      envVars['FEATURE_CACHE_ROLES'] = 'true';
      envVars['FEATURE_STRICT_DTO'] = 'false'; // Keep backward compat initially
      log('success', 'AUTH_V2 features enabled');
      break;
      
    case 'disable':
      log('info', 'Disabling AUTH_V2 features...');
      envVars['FEATURE_AUTH_V2'] = 'false';
      envVars['FEATURE_IDEMPOTENCY'] = 'false';
      envVars['FEATURE_VOICE_DEDUPE'] = 'false';
      envVars['FEATURE_REQUIRE_CONTEXT'] = 'false';
      envVars['FEATURE_CACHE_ROLES'] = 'false';
      envVars['FEATURE_STRICT_DTO'] = 'false';
      log('warn', 'AUTH_V2 features disabled - using legacy auth');
      break;
      
    case 'rollout':
      log('info', `Setting rollout percentage to ${percentage}%...`);
      envVars['FEATURE_AUTH_V2'] = 'true';
      envVars['FEATURE_AUTH_V2_ROLLOUT'] = String(percentage);
      log('success', `Gradual rollout configured at ${percentage}%`);
      break;
      
    case 'status':
      console.log('\n' + '='.repeat(50));
      console.log('Feature Flag Status');
      console.log('='.repeat(50));
      console.log(`Environment: ${envFile}`);
      console.log('');
      console.log('AUTH_V2:', envVars['FEATURE_AUTH_V2'] || 'not set (default: dev=true, prod=false)');
      console.log('IDEMPOTENCY:', envVars['FEATURE_IDEMPOTENCY'] || 'not set (default: dev=true, prod=false)');
      console.log('VOICE_DEDUPE:', envVars['FEATURE_VOICE_DEDUPE'] || 'not set (default: true)');
      console.log('REQUIRE_CONTEXT:', envVars['FEATURE_REQUIRE_CONTEXT'] || 'not set (default: dev=true, prod=false)');
      console.log('CACHE_ROLES:', envVars['FEATURE_CACHE_ROLES'] || 'not set (default: true)');
      console.log('STRICT_DTO:', envVars['FEATURE_STRICT_DTO'] || 'not set (default: false)');
      
      if (envVars['FEATURE_AUTH_V2_ROLLOUT']) {
        console.log(`\nRollout: ${envVars['FEATURE_AUTH_V2_ROLLOUT']}% of users`);
      }
      
      console.log('='.repeat(50));
      return; // Don't write file for status
  }
  
  // Build new env content
  const newEnvContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
    
  if (dryRun) {
    console.log('\n' + colors.yellow + 'DRY RUN - Changes to be applied:' + colors.reset);
    console.log(newEnvContent);
    console.log('\n' + colors.yellow + 'No changes were made.' + colors.reset);
  } else {
    // Write updated env file
    await fs.writeFile(envPath, newEnvContent + '\n', 'utf8');
    log('success', `Updated ${envFile}`);
    
    // Provide rollback instructions
    console.log('\n' + colors.blue + 'Rollback Instructions:' + colors.reset);
    console.log(`1. To disable: node enable-authv2.mjs disable --env ${args.includes('--env') ? args[args.indexOf('--env') + 1] : 'local'}`);
    console.log('2. Or restore from backup: git checkout -- ' + envFile);
    console.log('3. Monitor logs: tail -f logs/app.log | grep -E "AUTH|Feature"');
    
    // Health check command
    console.log('\n' + colors.blue + 'Verify with:' + colors.reset);
    console.log('node scripts/auth-smoke.mjs');
  }
}

// Run
main().catch(error => {
  log('error', error.message);
  process.exit(1);
});