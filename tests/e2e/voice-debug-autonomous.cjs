const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseUrl: 'http://localhost:5173',
  apiUrl: 'http://localhost:3001',
  headless: false, // Show browser to see what's happening
  slowMo: 50, // Slow down actions slightly
  devtools: true, // Open DevTools automatically
  dumpio: true, // Capture ALL browser output
  logFile: path.join(__dirname, 'voice-debug.log'),
  screenshotDir: path.join(__dirname, 'debug-screenshots'),
};

// Create screenshot directory
if (!fs.existsSync(CONFIG.screenshotDir)) {
  fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
}

// Logging to file
const logStream = fs.createWriteStream(CONFIG.logFile, { flags: 'a' });
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...(data && { data })
  };
  console.log(`[${level}] ${message}`, data || '');
  logStream.write(JSON.stringify(logEntry) + '\n');
};

// Take screenshot with timestamp
async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}-${name}.png`;
  const filepath = path.join(CONFIG.screenshotDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  log('SCREENSHOT', `Saved: ${filename}`);
  return filepath;
}

// Main autonomous debugging function
async function debugVoiceConnection() {
  let browser;
  const errors = [];
  const consoleMessages = [];
  const networkRequests = [];
  const webrtcEvents = [];
  
  try {
    log('INFO', '🚀 Starting Autonomous Voice Debug Session');
    log('INFO', `Results will be logged to: ${CONFIG.logFile}`);
    
    // Launch browser with maximum debugging capabilities
    browser = await puppeteer.launch({
      headless: CONFIG.headless,
      slowMo: CONFIG.slowMo,
      devtools: CONFIG.devtools,
      dumpio: CONFIG.dumpio,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--enable-logging',
        '--v=1', // Verbose logging
        '--enable-webrtc-event-log-uploader',
        '--use-fake-ui-for-media-stream', // Auto-accept microphone permissions
        '--use-fake-device-for-media-stream', // Use fake audio device
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // Enable all domains for comprehensive monitoring
    const client = await page.createCDPSession();
    await client.send('Runtime.enable');
    await client.send('Network.enable');
    await client.send('Console.enable');
    
    // Capture ALL console messages with full details
    page.on('console', async msg => {
      const msgData = {
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        args: []
      };
      
      // Try to get argument values
      try {
        for (const arg of msg.args()) {
          msgData.args.push(await arg.jsonValue().catch(() => 'Unable to serialize'));
        }
      } catch (e) {
        // Ignore serialization errors
      }
      
      consoleMessages.push(msgData);
      log('CONSOLE', `[${msg.type()}] ${msg.text()}`, msgData);
      
      // Look for specific WebRTC voice client logs
      if (msg.text().includes('[WebRTCVoice]')) {
        webrtcEvents.push(msgData);
        log('WEBRTC', msg.text(), msgData);
      }
    });
    
    // Capture page errors
    page.on('error', err => {
      errors.push({ type: 'page_error', message: err.message, stack: err.stack });
      log('ERROR', 'Page error', err);
    });
    
    // Capture page crashes
    page.on('pageerror', err => {
      errors.push({ type: 'page_crash', message: err.toString() });
      log('ERROR', 'Page crash', err.toString());
    });
    
    // Capture request failures
    page.on('requestfailed', request => {
      const failure = {
        url: request.url(),
        method: request.method(),
        error: request.failure()?.errorText
      };
      networkRequests.push({ type: 'failed', ...failure });
      log('NETWORK_ERROR', 'Request failed', failure);
    });
    
    // Monitor specific API endpoints
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/realtime/session') || 
          url.includes('openai.com') || 
          url.includes('/auth')) {
        const responseData = {
          url,
          status: response.status(),
          statusText: response.statusText(),
          headers: response.headers()
        };
        networkRequests.push({ type: 'response', ...responseData });
        log('API_RESPONSE', `${url} - ${response.status()}`, responseData);
      }
    });
    
    // Inject WebRTC monitoring
    await page.evaluateOnNewDocument(() => {
      // Monitor RTCPeerConnection
      const originalRTCPeerConnection = window.RTCPeerConnection;
      window.RTCPeerConnection = new Proxy(originalRTCPeerConnection, {
        construct(target, args) {
          const pc = new target(...args);
          console.log('[WebRTC Monitor] PeerConnection created', args);
          
          // Monitor connection state changes
          pc.addEventListener('connectionstatechange', () => {
            console.log('[WebRTC Monitor] Connection state:', pc.connectionState);
          });
          
          pc.addEventListener('iceconnectionstatechange', () => {
            console.log('[WebRTC Monitor] ICE state:', pc.iceConnectionState);
          });
          
          pc.addEventListener('signalingstatechange', () => {
            console.log('[WebRTC Monitor] Signaling state:', pc.signalingState);
          });
          
          // Monitor data channel
          pc.addEventListener('datachannel', (event) => {
            console.log('[WebRTC Monitor] Data channel received:', event.channel.label);
            
            event.channel.addEventListener('open', () => {
              console.log('[WebRTC Monitor] Data channel opened:', event.channel.label);
            });
            
            event.channel.addEventListener('message', (msg) => {
              console.log('[WebRTC Monitor] Data channel message:', msg.data);
            });
            
            event.channel.addEventListener('error', (err) => {
              console.error('[WebRTC Monitor] Data channel error:', err);
            });
          });
          
          return pc;
        }
      });
      
      // Monitor getUserMedia
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
      navigator.mediaDevices.getUserMedia = async function(constraints) {
        console.log('[Media Monitor] getUserMedia called with:', constraints);
        try {
          const stream = await originalGetUserMedia.call(this, constraints);
          console.log('[Media Monitor] getUserMedia succeeded, tracks:', stream.getTracks().length);
          return stream;
        } catch (error) {
          console.error('[Media Monitor] getUserMedia failed:', error.name, error.message);
          throw error;
        }
      };
    });
    
    // STEP 1: Navigate to app
    log('STEP', 'Navigating to application...');
    await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle2' });
    await takeScreenshot(page, '01-landing');
    
    // STEP 2: Handle authentication
    log('STEP', 'Checking for authentication...');
    
    // Check if we need to use the Dev Auth Overlay
    const hasQuickAccess = await page.evaluate(() => {
      const headings = document.querySelectorAll('h2, h3, h4');
      for (const heading of headings) {
        if (heading.textContent?.includes('Quick Access')) {
          return true;
        }
      }
      return false;
    });
    
    if (hasQuickAccess) {
      log('AUTH', 'Dev Auth Overlay detected, clicking Server...');
      
      // Click Server button
      const serverClicked = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const button of buttons) {
          if (button.textContent?.includes('Server') || 
              button.closest('div')?.textContent?.includes('server@restaurant.com')) {
            button.click();
            return true;
          }
        }
        return false;
      });
      
      if (serverClicked) {
        log('AUTH', 'Server button clicked');
        await new Promise(resolve => setTimeout(resolve, 3000));
        await takeScreenshot(page, '02-after-auth');
      }
    }
    
    // STEP 3: Navigate to Server page
    log('STEP', 'Navigating to Server page...');
    
    // Try to click Server link
    const serverLinkClicked = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      for (const link of links) {
        if (link.href?.includes('/server') || link.textContent?.includes('Server')) {
          link.click();
          return true;
        }
      }
      return false;
    });
    
    if (!serverLinkClicked) {
      // Direct navigation if link not found
      await page.goto(`${CONFIG.baseUrl}/server`, { waitUntil: 'networkidle2' });
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    await takeScreenshot(page, '03-server-page');
    
    // STEP 4: Find and click Voice Connect button
    log('STEP', 'Looking for Voice Connect button...');
    
    const voiceButtonFound = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const button of buttons) {
        const text = button.textContent || '';
        if (text.includes('Connect Voice') || 
            text.includes('Start Voice') || 
            text.includes('Voice')) {
          console.log('[Voice Debug] Found voice button:', text);
          button.click();
          return true;
        }
      }
      console.log('[Voice Debug] No voice button found');
      return false;
    });
    
    if (voiceButtonFound) {
      log('VOICE', 'Voice button clicked, waiting for connection...');
      
      // Wait for connection attempt
      await new Promise(resolve => setTimeout(resolve, 5000));
      await takeScreenshot(page, '04-after-voice-click');
      
      // Check connection status
      const connectionStatus = await page.evaluate(() => {
        // Look for any status indicators
        const statusElements = document.querySelectorAll('[class*="status"], [class*="connected"], [data-status]');
        const statuses = [];
        statusElements.forEach(el => {
          statuses.push({
            class: el.className,
            text: el.textContent,
            dataStatus: el.getAttribute('data-status')
          });
        });
        return statuses;
      });
      
      log('STATUS', 'Connection status elements', connectionStatus);
    } else {
      log('ERROR', 'Voice button not found on page');
    }
    
    // Wait a bit more to capture any delayed errors
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // FINAL: Generate comprehensive report
    log('REPORT', '=' + '='.repeat(79));
    log('REPORT', 'VOICE CONNECTION DEBUG REPORT');
    log('REPORT', '=' + '='.repeat(79));
    
    // Analyze results
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalErrors: errors.length,
        totalConsoleMessages: consoleMessages.length,
        totalNetworkRequests: networkRequests.length,
        totalWebRTCEvents: webrtcEvents.length
      },
      errors,
      webrtcEvents,
      networkFailures: networkRequests.filter(r => r.type === 'failed'),
      apiResponses: networkRequests.filter(r => r.type === 'response'),
      criticalLogs: consoleMessages.filter(m => 
        m.type === 'error' || 
        m.text.includes('failed') || 
        m.text.includes('Failed') ||
        m.text.includes('Error')
      )
    };
    
    // Write detailed report
    const reportPath = path.join(__dirname, 'voice-debug-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log('REPORT', `Full report saved to: ${reportPath}`);
    
    // Print summary
    console.log('\n📊 DEBUG SUMMARY:');
    console.log(`  Errors: ${report.summary.totalErrors}`);
    console.log(`  Console Messages: ${report.summary.totalConsoleMessages}`);
    console.log(`  Network Requests: ${report.summary.totalNetworkRequests}`);
    console.log(`  WebRTC Events: ${report.summary.totalWebRTCEvents}`);
    
    if (report.errors.length > 0) {
      console.log('\n❌ ERRORS FOUND:');
      report.errors.forEach(err => {
        console.log(`  - ${err.type}: ${err.message}`);
      });
    }
    
    if (report.criticalLogs.length > 0) {
      console.log('\n⚠️ CRITICAL LOGS:');
      report.criticalLogs.forEach(log => {
        console.log(`  - [${log.type}] ${log.text}`);
      });
    }
    
    if (report.networkFailures.length > 0) {
      console.log('\n🌐 NETWORK FAILURES:');
      report.networkFailures.forEach(req => {
        console.log(`  - ${req.method} ${req.url}: ${req.error}`);
      });
    }
    
    // Look for specific voice connection issues
    const voiceConnectionLogs = webrtcEvents.filter(e => 
      e.text.includes('Step') || 
      e.text.includes('failed') || 
      e.text.includes('error')
    );
    
    if (voiceConnectionLogs.length > 0) {
      console.log('\n🎤 VOICE CONNECTION PROGRESS:');
      voiceConnectionLogs.forEach(log => {
        console.log(`  - ${log.text}`);
      });
    }
    
    return report;
    
  } catch (error) {
    log('FATAL', 'Test execution failed', error);
    console.error('💥 FATAL ERROR:', error);
  } finally {
    if (browser) {
      // Keep browser open for 10 seconds to observe
      await new Promise(resolve => setTimeout(resolve, 10000));
      await browser.close();
    }
    logStream.end();
  }
}

// Run the autonomous debugger
console.log('🤖 Autonomous Voice Connection Debugger');
console.log('=' + '='.repeat(39));
console.log('This will automatically:');
console.log('  1. Navigate to the app');
console.log('  2. Authenticate as Server');
console.log('  3. Click Connect Voice');
console.log('  4. Capture ALL errors and logs');
console.log('  5. Generate a comprehensive report');
console.log('=' + '='.repeat(39));

debugVoiceConnection()
  .then(report => {
    if (report && report.errors.length === 0 && report.networkFailures.length === 0) {
      console.log('\n✅ No critical errors found');
      process.exit(0);
    } else {
      console.log('\n❌ Issues detected - check report for details');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Debugger crashed:', error);
    process.exit(1);
  });