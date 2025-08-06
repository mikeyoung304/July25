#!/usr/bin/env tsx

/**
 * BuildPanel Real-time Streaming Validation Test
 * 
 * This script validates BuildPanel's streaming capabilities by testing:
 * 1. REST endpoint differences (/api/voice-chat vs /api/voice-chat-realtime)
 * 2. WebSocket connection and streaming support
 * 3. Audio format compatibility and performance metrics
 * 4. Integration patterns for our existing infrastructure
 */

import axios, { AxiosResponse } from 'axios';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

interface TestResult {
  test: string;
  success: boolean;
  duration: number;
  data?: any;
  error?: string;
  metrics?: {
    latency: number;
    responseSize: number;
    contentType: string;
  };
}

interface BuildPanelStreamingTest {
  buildPanelUrl: string;
  testResults: TestResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    streamingSupported: boolean;
    recommendedIntegration: string;
  };
}

class BuildPanelStreamingValidator {
  private buildPanelUrl: string;
  private results: TestResult[] = [];

  constructor(buildPanelUrl: string = 'http://localhost:3003') {
    this.buildPanelUrl = buildPanelUrl;
  }

  private async addResult(
    test: string, 
    testFn: () => Promise<any>
  ): Promise<void> {
    const startTime = performance.now();
    
    try {
      const data = await testFn();
      const duration = performance.now() - startTime;
      
      this.results.push({
        test,
        success: true,
        duration,
        data
      });
      
      console.log(`✅ ${test} - ${duration.toFixed(2)}ms`);
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.results.push({
        test,
        success: false,
        duration,
        error: errorMessage
      });
      
      console.log(`❌ ${test} - ${errorMessage}`);
    }
  }

  async testBuildPanelHealth(): Promise<void> {
    await this.addResult('BuildPanel Health Check', async () => {
      const response = await axios.get(`${this.buildPanelUrl}/api/health`, {
        timeout: 5000
      });
      
      return {
        status: response.status,
        data: response.data,
        responseTime: response.headers['x-response-time'] || 'unknown'
      };
    });
  }

  async testVoiceChatEndpoint(): Promise<void> {
    await this.addResult('Standard Voice Chat Endpoint', async () => {
      // Create a small test audio buffer (silence)
      const testAudioBuffer = Buffer.alloc(1024);
      const formData = new FormData();
      
      // Create a mock WebM file
      formData.append('audio', new Blob([testAudioBuffer], { type: 'audio/webm' }), 'test.webm');
      
      const startTime = performance.now();
      
      try {
        const response = await fetch(`${this.buildPanelUrl}/api/voice-chat`, {
          method: 'POST',
          headers: {
            'X-Restaurant-ID': 'test-restaurant',
            'X-User-ID': 'test-user'
          },
          body: formData
        });
        
        const latency = performance.now() - startTime;
        const responseSize = parseInt(response.headers.get('content-length') || '0');
        const contentType = response.headers.get('content-type') || 'unknown';
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return {
          status: response.status,
          latency,
          responseSize,
          contentType,
          streaming: false
        };
      } catch (error) {
        console.warn('Standard endpoint test failed:', error);
        throw error;
      }
    });
  }

  async testRealtimeVoiceChatEndpoint(): Promise<void> {
    await this.addResult('Real-time Voice Chat Endpoint', async () => {
      const testAudioBuffer = Buffer.alloc(1024);
      const formData = new FormData();
      
      formData.append('audio', new Blob([testAudioBuffer], { type: 'audio/webm' }), 'test.webm');
      
      const startTime = performance.now();
      
      try {
        const response = await fetch(`${this.buildPanelUrl}/api/voice-chat-realtime`, {
          method: 'POST',
          headers: {
            'X-Restaurant-ID': 'test-restaurant',
            'X-User-ID': 'test-user'
          },
          body: formData
        });
        
        const latency = performance.now() - startTime;
        const responseSize = parseInt(response.headers.get('content-length') || '0');
        const contentType = response.headers.get('content-type') || 'unknown';
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return {
          status: response.status,
          latency,
          responseSize,
          contentType,
          streaming: contentType.includes('stream') || response.headers.get('transfer-encoding') === 'chunked'
        };
      } catch (error) {
        console.warn('Realtime endpoint might not exist or be configured:', error);
        throw error;
      }
    });
  }

  async testWebSocketConnection(): Promise<void> {
    await this.addResult('WebSocket Connection Test', async () => {
      return new Promise((resolve, reject) => {
        const wsUrl = this.buildPanelUrl.replace('http', 'ws') + '/realtime-voice';
        const ws = new WebSocket(wsUrl);
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('WebSocket connection timeout'));
        }, 5000);

        ws.on('open', () => {
          clearTimeout(timeout);
          
          // Test sending a control message
          ws.send(JSON.stringify({
            type: 'connect',
            restaurantId: 'test-restaurant',
            userId: 'test-user'
          }));
          
          setTimeout(() => {
            ws.close();
            resolve({
              connected: true,
              url: wsUrl,
              protocol: ws.protocol,
              readyState: ws.readyState
            });
          }, 1000);
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`WebSocket error: ${error.message}`));
        });

        ws.on('message', (data) => {
          console.log('WebSocket message received:', data.toString());
        });
      });
    });
  }

  async testAudioChunkStreaming(): Promise<void> {
    await this.addResult('Audio Chunk Streaming Test', async () => {
      return new Promise((resolve, reject) => {
        const wsUrl = this.buildPanelUrl.replace('http', 'ws') + '/realtime-voice';
        const ws = new WebSocket(wsUrl);
        const chunks: Buffer[] = [];
        const startTime = performance.now();
        
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('Streaming test timeout'));
        }, 10000);

        ws.on('open', () => {
          console.log('WebSocket opened for streaming test');
          
          // Send start recording message
          ws.send(JSON.stringify({
            type: 'start_recording',
            restaurantId: 'test-restaurant'
          }));
          
          // Send some mock audio chunks
          const mockChunk = Buffer.alloc(512); // Small audio chunk
          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              ws.send(mockChunk);
            }, i * 200);
          }
          
          // Stop recording after chunks
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'stop_recording'
            }));
          }, 1500);
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            console.log('Streaming message:', message.type);
            
            if (message.type === 'transcription_result' || message.type === 'audio_response') {
              clearTimeout(timeout);
              const duration = performance.now() - startTime;
              
              ws.close();
              resolve({
                streamingWorked: true,
                responseTime: duration,
                messageType: message.type,
                hasAudio: !!message.audioData || !!message.audioUrl,
                hasTranscription: !!message.transcription || !!message.text
              });
            }
          } catch (error) {
            // Might be binary data
            chunks.push(data as Buffer);
          }
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          reject(new Error(`WebSocket streaming error: ${error.message}`));
        });

        ws.on('close', () => {
          clearTimeout(timeout);
          if (chunks.length === 0) {
            reject(new Error('No streaming response received'));
          }
        });
      });
    });
  }

  async testExistingMenuContext(): Promise<void> {
    await this.addResult('Menu Context Integration Test', async () => {
      const response = await axios.get(`${this.buildPanelUrl}/api/menu`, {
        headers: {
          'X-Restaurant-ID': 'test-restaurant'
        },
        timeout: 5000
      });
      
      return {
        status: response.status,
        hasMenu: !!response.data && (Array.isArray(response.data) ? response.data.length > 0 : !!response.data.items),
        menuItemCount: Array.isArray(response.data) ? response.data.length : (response.data?.items?.length || 0)
      };
    });
  }

  private generateSummary(): BuildPanelStreamingTest['summary'] {
    const totalTests = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = totalTests - passed;
    
    // Determine if streaming is supported
    const webSocketTest = this.results.find(r => r.test.includes('WebSocket'));
    const streamingTest = this.results.find(r => r.test.includes('Streaming'));
    const realtimeEndpointTest = this.results.find(r => r.test.includes('Real-time'));
    
    const streamingSupported = (
      webSocketTest?.success && 
      (streamingTest?.success || realtimeEndpointTest?.success)
    ) || false;
    
    // Recommend integration approach
    let recommendedIntegration = 'BATCH_PROCESSING_ONLY';
    
    if (streamingSupported) {
      if (webSocketTest?.success) {
        recommendedIntegration = 'WEBSOCKET_PROXY_INTEGRATION';
      } else if (realtimeEndpointTest?.success) {
        recommendedIntegration = 'HTTP_STREAMING_INTEGRATION';
      }
    } else if (passed > failed) {
      recommendedIntegration = 'OPTIMIZED_BATCH_PROCESSING';
    }
    
    return {
      totalTests,
      passed,
      failed,
      streamingSupported,
      recommendedIntegration
    };
  }

  async runAllTests(): Promise<BuildPanelStreamingTest> {
    console.log('🔍 Starting BuildPanel Streaming Validation Tests...\n');
    
    // Test 1: Basic connectivity
    console.log('1. Testing BuildPanel Health...');
    await this.testBuildPanelHealth();
    
    // Test 2: Standard voice endpoint
    console.log('\n2. Testing Standard Voice Chat Endpoint...');
    await this.testVoiceChatEndpoint();
    
    // Test 3: Real-time voice endpoint (might not exist)
    console.log('\n3. Testing Real-time Voice Chat Endpoint...');
    await this.testRealtimeVoiceChatEndpoint();
    
    // Test 4: WebSocket connection
    console.log('\n4. Testing WebSocket Connection...');
    await this.testWebSocketConnection();
    
    // Test 5: Audio chunk streaming
    console.log('\n5. Testing Audio Chunk Streaming...');
    await this.testAudioChunkStreaming();
    
    // Test 6: Menu context
    console.log('\n6. Testing Menu Context Integration...');
    await this.testExistingMenuContext();
    
    const summary = this.generateSummary();
    
    const report: BuildPanelStreamingTest = {
      buildPanelUrl: this.buildPanelUrl,
      testResults: this.results,
      summary
    };
    
    console.log('\n📊 TEST SUMMARY:');
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Streaming Supported: ${summary.streamingSupported ? '✅ YES' : '❌ NO'}`);
    console.log(`Recommended Integration: ${summary.recommendedIntegration}`);
    
    return report;
  }
}

// Main execution
async function main() {
  const buildPanelUrl = process.env.BUILDPANEL_URL || 'http://localhost:3003';
  
  console.log(`Testing BuildPanel at: ${buildPanelUrl}`);
  console.log('=' .repeat(60));
  
  const validator = new BuildPanelStreamingValidator(buildPanelUrl);
  
  try {
    const report = await validator.runAllTests();
    
    // Save detailed report
    const reportPath = path.join(__dirname, '../.test-results/buildpanel-streaming-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📝 Detailed report saved to: ${reportPath}`);
    
    // Exit with appropriate code
    process.exit(report.summary.streamingSupported ? 0 : 1);
    
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { BuildPanelStreamingValidator, type BuildPanelStreamingTest, type TestResult };