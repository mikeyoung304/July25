import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  fg: {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
  }
}

function log(message, color = 'reset') {
  const colorCode = colors.fg[color] || colors[color] || colors.reset
  console.log(`${colorCode}${message}${colors.reset}`)
}

console.clear()
log('🚀 Macon Restaurant OS - Unified Development Server', 'bright')
log('================================================\n', 'bright')

// Check if AI Gateway files exist
const aiGatewayFile = path.join(__dirname, 'ai-gateway-websocket.js')
if (!fs.existsSync(aiGatewayFile)) {
  log('❌ AI Gateway not found at: ' + aiGatewayFile, 'red')
  log('Please ensure ai-gateway-websocket.js exists in the project', 'yellow')
  process.exit(1)
}

// Check if dependencies are installed
if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
  log('📦 Installing dependencies...', 'yellow')
  const install = spawn('npm', ['install'], { cwd: __dirname, stdio: 'inherit' })
  install.on('close', (code) => {
    if (code === 0) {
      startServices()
    } else {
      log('❌ Failed to install dependencies', 'red')
      process.exit(1)
    }
  })
} else {
  startServices()
}

function startServices() {
  log('🚀 Starting services...\n', 'green')

  // Start AI Gateway with Voice Support
  log('[AI Gateway] Starting Voice-enabled Gateway on port 3002...', 'cyan')
  const aiGateway = spawn('node', ['ai-gateway-websocket.js'], {
    cwd: __dirname,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, NODE_ENV: 'development' }
  })

  aiGateway.stdout.on('data', (data) => {
    process.stdout.write(`${colors.fg.cyan}[AI Gateway]${colors.reset} ${data}`)
  })

  aiGateway.stderr.on('data', (data) => {
    process.stderr.write(`${colors.fg.red}[AI Gateway Error]${colors.reset} ${data}`)
  })

  // Wait a bit for AI Gateway to start
  setTimeout(() => {
    // Start Frontend
    log('\n[Frontend] Starting on port 5173...', 'blue')
    const frontend = spawn('npm', ['run', 'dev'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    })

    frontend.stdout.on('data', (data) => {
      process.stdout.write(`${colors.fg.blue}[Frontend]${colors.reset} ${data}`)
    })

    frontend.stderr.on('data', (data) => {
      process.stderr.write(`${colors.fg.red}[Frontend Error]${colors.reset} ${data}`)
    })

    // Show success message after services start
    setTimeout(() => {
      console.log('\n')
      log('✅ All services started successfully!', 'green')
      log('==================================\n', 'green')
      
      log('🌐 Access Points:', 'bright')
      log('   Frontend:       http://localhost:5173', 'blue')
      log('   Kiosk:          http://localhost:5173/kiosk', 'blue')
      log('   Drive-Thru:     http://localhost:5173/drive-thru', 'blue')
      log('   AI Gateway:     http://localhost:3002/health', 'cyan')
      log('   Voice Stream:   ws://localhost:3002/voice-stream', 'cyan')
      log('   AI Chat:        POST http://localhost:3002/chat', 'cyan')
      log('   Transcription:  POST http://localhost:3002/api/v1/ai/transcribe\n', 'cyan')
      
      log('💡 Features:', 'bright')
      log('   - Voice ordering with real-time transcription', 'green')
      log('   - WebSocket streaming for audio', 'green')
      log('   - Push-to-talk interface', 'green')
      log('   - AI-powered order processing\n', 'green')
      
      log('⚙️  Configuration:', 'bright')
      log('   - Add OPENAI_API_KEY to .env for real transcription', 'yellow')
      log('   - Current mode: ' + (process.env.OPENAI_API_KEY ? 'Real AI' : 'Mock mode'), 'yellow')
      log('   - Use Ctrl+C to stop all services\n', 'yellow')
    }, 3000)

    // Handle process termination
    process.on('SIGINT', () => {
      log('\n\n🛑 Shutting down services...', 'yellow')
      aiGateway.kill()
      frontend.kill()
      setTimeout(() => {
        log('✅ All services stopped', 'green')
        process.exit(0)
      }, 1000)
    })

  }, 2000)
}