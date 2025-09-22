#!/usr/bin/env tsx
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'

function log(message: string, color: string = RESET) {
}

function loadEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Environment file not found: ${filePath}`)
  }
  
  const result = dotenv.config({ path: filePath })
  if (result.error) {
    throw new Error(`Failed to parse environment file: ${result.error.message}`)
  }
  
  return result.parsed || {}
}

function checkIntegration() {
  log('\n🔍 Running Integration Check...', BOLD)
  
  try {
    // Load environment files
    const clientEnvPath = path.join(__dirname, '..', 'client', '.env.local')
    const serverEnvPath = path.join(__dirname, '..', 'server', '.env')
    
    log('\nLoading environment files...')
    const clientEnv = loadEnvFile(clientEnvPath)
    const serverEnv = loadEnvFile(serverEnvPath)
    
    // Check Supabase configuration
    log('\n📊 Checking Supabase configuration...')
    
    const clientSupabaseUrl = clientEnv['VITE_SUPABASE_URL']
    const serverSupabaseUrl = serverEnv['SUPABASE_URL']
    
    const clientSupabaseKey = clientEnv['VITE_SUPABASE_ANON_KEY']
    const serverSupabaseKey = serverEnv['SUPABASE_ANON_KEY']
    
    let hasErrors = false
    
    // Check URL match
    if (clientSupabaseUrl !== serverSupabaseUrl) {
      log('\n❌ ERROR: Supabase URL mismatch!', RED)
      log(`   Client: ${clientSupabaseUrl}`, RED)
      log(`   Server: ${serverSupabaseUrl}`, RED)
      log('\n   This will cause the client and server to use different databases!', YELLOW)
      log('   Fix: Update client/.env.local to use the same VITE_SUPABASE_URL as server/.env', YELLOW)
      hasErrors = true
    } else {
      log('✅ Supabase URL matches', GREEN)
    }
    
    // Check Anon Key match
    if (clientSupabaseKey !== serverSupabaseKey) {
      log('\n❌ ERROR: Supabase Anon Key mismatch!', RED)
      log('   This will cause authentication issues!', YELLOW)
      log('   Fix: Update client/.env.local to use the same VITE_SUPABASE_ANON_KEY as server/.env', YELLOW)
      hasErrors = true
    } else {
      log('✅ Supabase Anon Key matches', GREEN)
    }
    
    // Check API configuration
    log('\n🔌 Checking API configuration...')
    
    const clientApiUrl = clientEnv['VITE_API_BASE_URL']
    const expectedApiUrl = 'http://localhost:3001'
    
    if (clientApiUrl !== expectedApiUrl) {
      log(`\n⚠️  WARNING: Client API URL is ${clientApiUrl}, expected ${expectedApiUrl}`, YELLOW)
      log('   This might cause issues if the server is running on a different port', YELLOW)
    } else {
      log('✅ Client API URL is correct', GREEN)
    }
    
    // Final result
    if (hasErrors) {
      log('\n❌ Integration check FAILED!', RED)
      log('   Please fix the errors above before continuing.', RED)
      process.exit(1)
    } else {
      log('\n✅ Integration check PASSED!', GREEN)
      log('   Client and server are properly configured.', GREEN)
    }
    
  } catch (error) {
    log(`\n❌ Integration check failed with error: ${error.message}`, RED)
    process.exit(1)
  }
}

async function checkApiHealth() {
  log('\n🏥 Checking API and Database Health...', BOLD)
  
  try {
    const response = await fetch('http://localhost:3001/api/v1/')
    
    if (response.ok) {
      const data = await response.json()
      log('✅ API Health Check PASSED', GREEN)
      log(`   Status: ${data.status}`, GREEN)
      log(`   Uptime: ${Math.floor(data.uptime)}s`, GREEN)
      log(`   Environment: ${data.environment}`, GREEN)
      
      // Check detailed status
      const statusResponse = await fetch('http://localhost:3001/api/v1/status')
      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        if (statusData.services?.database?.status === 'connected') {
          log('✅ Database connection is healthy', GREEN)
          log(`   Latency: ${statusData.services.database.latency}ms`, GREEN)
        } else {
          log('❌ Database connection is not healthy', RED)
          log(`   Status: ${statusData.services?.database?.status || 'unknown'}`, RED)
          if (statusData.services?.database?.error) {
            log(`   Error: ${statusData.services.database.error}`, RED)
          }
          process.exit(1)
        }
      }
      
      return true
    } else {
      throw new Error(`Health check failed with status: ${response.status}`)
    }
  } catch (error) {
    log(`❌ API Health Check FAILED: ${(error as Error).message}`, RED)
    log('   Make sure the server is running on port 3001', YELLOW)
    process.exit(1)
  }
}

// Main function to run all checks
async function runChecks() {
  checkIntegration()
  await checkApiHealth()
  
  log('\n🎉 All integration checks PASSED!', GREEN)
  log('   Your project is stable and ready for development.', GREEN)
}

// Run all checks
runChecks()