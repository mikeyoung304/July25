import { Router, Request, Response } from 'express';
import { getSessionMetrics } from './twilio-bridge';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';

// Debug data storage (in production, use Redis or similar)
const debugData = {
  transcripts: new Map<string, any[]>(),
  audioBuffers: new Map<string, Buffer[]>(),
  errors: [] as any[],
  functionCalls: [] as any[],
  metrics: {
    totalSessions: 0,
    successfulOrders: 0,
    failedSessions: 0,
    averageSessionDuration: 0,
    totalTokensUsed: 0,
    totalCost: 0
  }
};

// Maximum items to keep in memory
const MAX_ITEMS = 100;
const MAX_ERROR_LOG = 50;

/**
 * Create debug dashboard routes
 */
export function createDebugDashboard(): Router {
  const router = Router();

  /**
   * Main dashboard HTML page
   */
  router.get('/api/voice/debug', async (req: Request, res: Response) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Voice System Debug Dashboard</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    h1 {
      color: #333;
      border-bottom: 2px solid #4CAF50;
      padding-bottom: 10px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .card h2 {
      margin-top: 0;
      color: #555;
      font-size: 18px;
    }
    .metric {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .metric-value {
      font-weight: bold;
      color: #4CAF50;
    }
    .session {
      background: #f9f9f9;
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
      border-left: 4px solid #4CAF50;
    }
    .error {
      background: #fff3cd;
      border-left-color: #ff9800;
      color: #856404;
    }
    .audio-player {
      width: 100%;
      margin: 10px 0;
    }
    button {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      margin: 5px;
    }
    button:hover {
      background: #45a049;
    }
    .status-active {
      color: #4CAF50;
    }
    .status-inactive {
      color: #f44336;
    }
    .transcript {
      background: #f0f0f0;
      padding: 10px;
      border-radius: 4px;
      margin: 5px 0;
      font-family: monospace;
    }
    .function-call {
      background: #e3f2fd;
      padding: 10px;
      border-radius: 4px;
      margin: 5px 0;
    }
    #refreshIndicator {
      display: inline-block;
      width: 10px;
      height: 10px;
      background: #4CAF50;
      border-radius: 50%;
      margin-left: 10px;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎙️ Voice System Debug Dashboard <span id="refreshIndicator"></span></h1>
    
    <div class="grid">
      <!-- Active Sessions -->
      <div class="card">
        <h2>📞 Active Sessions</h2>
        <div id="sessions">Loading...</div>
      </div>
      
      <!-- System Metrics -->
      <div class="card">
        <h2>📊 System Metrics</h2>
        <div id="metrics">Loading...</div>
      </div>
      
      <!-- Recent Transcripts -->
      <div class="card">
        <h2>💬 Recent Transcripts</h2>
        <div id="transcripts">Loading...</div>
      </div>
      
      <!-- Function Calls -->
      <div class="card">
        <h2>🔧 Function Calls</h2>
        <div id="functions">Loading...</div>
      </div>
      
      <!-- Error Log -->
      <div class="card">
        <h2>⚠️ Recent Errors</h2>
        <div id="errors">Loading...</div>
      </div>
      
      <!-- Controls -->
      <div class="card">
        <h2>🎛️ Controls</h2>
        <button onclick="testConnection()">Test OpenAI Connection</button>
        <button onclick="clearLogs()">Clear Logs</button>
        <button onclick="downloadLogs()">Download Logs</button>
        <button onclick="injectTestAudio()">Inject Test Audio</button>
        <div id="controlOutput"></div>
      </div>
    </div>
  </div>

  <script>
    // Auto-refresh data
    async function refreshData() {
      try {
        // Fetch sessions
        const sessionsRes = await fetch('/api/voice/debug/sessions');
        const sessionsData = await sessionsRes.json();
        updateSessions(sessionsData);
        
        // Fetch metrics
        const metricsRes = await fetch('/api/voice/debug/metrics');
        const metricsData = await metricsRes.json();
        updateMetrics(metricsData);
        
        // Fetch transcripts
        const transcriptsRes = await fetch('/api/voice/debug/transcripts');
        const transcriptsData = await transcriptsRes.json();
        updateTranscripts(transcriptsData);
        
        // Fetch function calls
        const functionsRes = await fetch('/api/voice/debug/functions');
        const functionsData = await functionsRes.json();
        updateFunctions(functionsData);
        
        // Fetch errors
        const errorsRes = await fetch('/api/voice/debug/errors');
        const errorsData = await errorsRes.json();
        updateErrors(errorsData);
      } catch (error) {
        console.error('Failed to refresh data:', error);
      }
    }

    function updateSessions(data) {
      const container = document.getElementById('sessions');
      if (data.sessions.length === 0) {
        container.innerHTML = '<p>No active sessions</p>';
        return;
      }
      
      container.innerHTML = data.sessions.map(session => \`
        <div class="session">
          <div class="metric">
            <span>Session ID:</span>
            <span class="metric-value">\${session.sessionId.slice(0, 8)}...</span>
          </div>
          <div class="metric">
            <span>Phone:</span>
            <span>\${session.from || 'Web'}</span>
          </div>
          <div class="metric">
            <span>Duration:</span>
            <span>\${Math.round(session.duration / 1000)}s</span>
          </div>
          <div class="metric">
            <span>Status:</span>
            <span class="status-active">Active</span>
          </div>
        </div>
      \`).join('');
    }

    function updateMetrics(data) {
      const container = document.getElementById('metrics');
      container.innerHTML = \`
        <div class="metric">
          <span>Total Sessions:</span>
          <span class="metric-value">\${data.totalSessions}</span>
        </div>
        <div class="metric">
          <span>Successful Orders:</span>
          <span class="metric-value">\${data.successfulOrders}</span>
        </div>
        <div class="metric">
          <span>Failed Sessions:</span>
          <span class="metric-value">\${data.failedSessions}</span>
        </div>
        <div class="metric">
          <span>Avg Duration:</span>
          <span class="metric-value">\${Math.round(data.averageSessionDuration / 1000)}s</span>
        </div>
        <div class="metric">
          <span>Tokens Used:</span>
          <span class="metric-value">\${data.totalTokensUsed.toLocaleString()}</span>
        </div>
        <div class="metric">
          <span>Est. Cost:</span>
          <span class="metric-value">$\${data.totalCost.toFixed(2)}</span>
        </div>
      \`;
    }

    function updateTranscripts(data) {
      const container = document.getElementById('transcripts');
      if (data.transcripts.length === 0) {
        container.innerHTML = '<p>No recent transcripts</p>';
        return;
      }
      
      container.innerHTML = data.transcripts.slice(0, 5).map(t => \`
        <div class="transcript">
          <strong>\${t.role}:</strong> \${t.text}
          <br><small>\${new Date(t.timestamp).toLocaleTimeString()}</small>
        </div>
      \`).join('');
    }

    function updateFunctions(data) {
      const container = document.getElementById('functions');
      if (data.functions.length === 0) {
        container.innerHTML = '<p>No function calls</p>';
        return;
      }
      
      container.innerHTML = data.functions.slice(0, 5).map(f => \`
        <div class="function-call">
          <strong>\${f.name}</strong>
          <br>Args: <code>\${JSON.stringify(f.args)}</code>
          <br>Result: \${f.success ? '✅' : '❌'}
          <br><small>\${new Date(f.timestamp).toLocaleTimeString()}</small>
        </div>
      \`).join('');
    }

    function updateErrors(data) {
      const container = document.getElementById('errors');
      if (data.errors.length === 0) {
        container.innerHTML = '<p>No recent errors</p>';
        return;
      }
      
      container.innerHTML = data.errors.slice(0, 5).map(e => \`
        <div class="session error">
          <strong>\${e.code}</strong>: \${e.message}
          <br><small>\${new Date(e.timestamp).toLocaleTimeString()}</small>
        </div>
      \`).join('');
    }

    async function testConnection() {
      const output = document.getElementById('controlOutput');
      output.innerHTML = 'Testing connection...';
      
      try {
        const res = await fetch('/api/voice/debug/test', { method: 'POST' });
        const data = await res.json();
        output.innerHTML = \`<div class="session">Test result: \${data.success ? '✅ Success' : '❌ Failed'}<br>\${data.message}</div>\`;
      } catch (error) {
        output.innerHTML = \`<div class="session error">Test failed: \${error.message}</div>\`;
      }
    }

    async function clearLogs() {
      const output = document.getElementById('controlOutput');
      try {
        const res = await fetch('/api/voice/debug/clear', { method: 'POST' });
        const data = await res.json();
        output.innerHTML = \`<div class="session">Logs cleared</div>\`;
        refreshData();
      } catch (error) {
        output.innerHTML = \`<div class="session error">Failed to clear logs</div>\`;
      }
    }

    async function downloadLogs() {
      window.open('/api/voice/debug/export', '_blank');
    }

    async function injectTestAudio() {
      const output = document.getElementById('controlOutput');
      output.innerHTML = 'Injecting test audio...';
      
      try {
        const res = await fetch('/api/voice/debug/inject', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'I would like to order a large pepperoni pizza'
          })
        });
        const data = await res.json();
        output.innerHTML = \`<div class="session">Audio injected: \${data.message}</div>\`;
      } catch (error) {
        output.innerHTML = \`<div class="session error">Injection failed: \${error.message}</div>\`;
      }
    }

    // Initial load and auto-refresh
    refreshData();
    setInterval(refreshData, 2000);
  </script>
</body>
</html>`;
    
    res.send(html);
  });

  /**
   * Get active sessions
   */
  router.get('/api/voice/debug/sessions', (req: Request, res: Response) => {
    const metrics = getSessionMetrics();
    res.json({
      sessions: metrics.sessions,
      total: metrics.activeSessions
    });
  });

  /**
   * Get system metrics
   */
  router.get('/api/voice/debug/metrics', (req: Request, res: Response) => {
    res.json(debugData.metrics);
  });

  /**
   * Get recent transcripts
   */
  router.get('/api/voice/debug/transcripts', (req: Request, res: Response) => {
    const allTranscripts = [];
    for (const transcripts of debugData.transcripts.values()) {
      allTranscripts.push(...transcripts);
    }
    
    res.json({
      transcripts: allTranscripts
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20)
    });
  });

  /**
   * Get recent function calls
   */
  router.get('/api/voice/debug/functions', (req: Request, res: Response) => {
    res.json({
      functions: debugData.functionCalls
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20)
    });
  });

  /**
   * Get recent errors
   */
  router.get('/api/voice/debug/errors', (req: Request, res: Response) => {
    res.json({
      errors: debugData.errors
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20)
    });
  });

  /**
   * Test OpenAI connection
   */
  router.post('/api/voice/debug/test', async (req: Request, res: Response) => {
    try {
      const testSessionId = 'test-' + Date.now();
      const { EnhancedOpenAIAdapter } = await import('../ai/voice/EnhancedOpenAIAdapter');
      
      const adapter = new EnhancedOpenAIAdapter(
        testSessionId,
        process.env['RESTAURANT_ID'] || 'default'
      );
      
      await adapter.connect();
      await adapter.disconnect();
      
      res.json({
        success: true,
        message: 'OpenAI connection successful'
      });
    } catch (error) {
      res.json({
        success: false,
        message: error.message
      });
    }
  });

  /**
   * Inject test audio
   */
  router.post('/api/voice/debug/inject', async (req: Request, res: Response) => {
    const { sessionId, text } = req.body;
    
    // This would inject test audio into a session
    // Implementation depends on your testing needs
    
    res.json({
      success: true,
      message: `Would inject: "${text}" into session ${sessionId || 'new'}`
    });
  });

  /**
   * Clear debug logs
   */
  router.post('/api/voice/debug/clear', (req: Request, res: Response) => {
    debugData.transcripts.clear();
    debugData.audioBuffers.clear();
    debugData.errors = [];
    debugData.functionCalls = [];
    
    res.json({ success: true });
  });

  /**
   * Export logs
   */
  router.get('/api/voice/debug/export', async (req: Request, res: Response) => {
    const exportData = {
      timestamp: new Date().toISOString(),
      metrics: debugData.metrics,
      errors: debugData.errors,
      functionCalls: debugData.functionCalls,
      transcripts: Array.from(debugData.transcripts.entries()).map(([sessionId, transcripts]) => ({
        sessionId,
        transcripts
      }))
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="voice-debug-${Date.now()}.json"`);
    res.send(JSON.stringify(exportData, null, 2));
  });

  /**
   * Get audio for a session (if recording is enabled)
   */
  router.get('/api/voice/debug/audio/:sessionId', (req: Request, res: Response) => {
    const { sessionId } = req.params;
    const audioBuffers = debugData.audioBuffers.get(sessionId);
    
    if (!audioBuffers || audioBuffers.length === 0) {
      return res.status(404).json({ error: 'No audio found for session' });
    }
    
    // Combine audio buffers
    const combined = Buffer.concat(audioBuffers);
    
    res.setHeader('Content-Type', 'audio/wav');
    res.send(combined);
  });

  return router;
}

/**
 * Log transcript to debug data
 */
export function logTranscript(sessionId: string, role: string, text: string): void {
  if (!debugData.transcripts.has(sessionId)) {
    debugData.transcripts.set(sessionId, []);
  }
  
  const transcripts = debugData.transcripts.get(sessionId)!;
  transcripts.push({
    role,
    text,
    timestamp: Date.now()
  });
  
  // Limit size
  if (transcripts.length > MAX_ITEMS) {
    transcripts.shift();
  }
}

/**
 * Log function call to debug data
 */
export function logFunctionCall(name: string, args: any, result: any, success: boolean): void {
  debugData.functionCalls.push({
    name,
    args,
    result,
    success,
    timestamp: Date.now()
  });
  
  // Limit size
  if (debugData.functionCalls.length > MAX_ITEMS) {
    debugData.functionCalls.shift();
  }
}

/**
 * Log error to debug data
 */
export function logError(code: string, message: string, details?: any): void {
  debugData.errors.push({
    code,
    message,
    details,
    timestamp: Date.now()
  });
  
  // Limit size
  if (debugData.errors.length > MAX_ERROR_LOG) {
    debugData.errors.shift();
  }
}

/**
 * Update metrics
 */
export function updateMetrics(update: Partial<typeof debugData.metrics>): void {
  Object.assign(debugData.metrics, update);
}

/**
 * Log audio buffer (only if recording is enabled)
 */
export function logAudioBuffer(sessionId: string, buffer: Buffer): void {
  if (process.env['VOICE_RECORD_AUDIO'] !== 'true') {
    return;
  }
  
  if (!debugData.audioBuffers.has(sessionId)) {
    debugData.audioBuffers.set(sessionId, []);
  }
  
  const buffers = debugData.audioBuffers.get(sessionId)!;
  buffers.push(buffer);
  
  // Limit to 30 seconds of audio (at 24kHz, 16-bit mono)
  const maxBuffers = 30 * 24000 * 2 / 4800; // Assuming 100ms chunks
  if (buffers.length > maxBuffers) {
    buffers.shift();
  }
}