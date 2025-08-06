#!/usr/bin/env tsx

/**
 * Proof of Concept: Voice Streaming Test Harness
 * 
 * This minimal test harness validates the core streaming integration
 * between our existing infrastructure and BuildPanel's streaming capabilities.
 * 
 * Usage:
 *   npm run poc:streaming
 *   or
 *   tsx scripts/poc-streaming-harness.ts
 */

import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

interface StreamingTestMetrics {
  testStartTime: number;
  firstConnectionTime?: number;
  firstTranscriptionTime?: number;
  firstAudioResponseTime?: number;
  totalTestDuration?: number;
  chunksTransmitted: number;
  chunksAcknowledged: number;
  transcriptionUpdates: number;
  audioChunksReceived: number;
  errors: string[];
}

class VoiceStreamingPOC {
  private ourWebSocket: WebSocket | null = null;
  private buildPanelWebSocket: WebSocket | null = null;
  private metrics: StreamingTestMetrics;
  private sessionId: string;
  
  constructor() {
    this.sessionId = `poc-${Date.now()}`;
    this.metrics = {
      testStartTime: performance.now(),
      chunksTransmitted: 0,
      chunksAcknowledged: 0,
      transcriptionUpdates: 0,
      audioChunksReceived: 0,
      errors: []
    };
  }

  /**
   * Test 1: Connect to our existing WebSocket server
   * This validates our current infrastructure is ready
   */
  async testOurWebSocketConnection(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      console.log('🔗 Testing connection to our WebSocket server (port 3001)...');
      
      this.ourWebSocket = new WebSocket('ws://localhost:3001/voice-stream');
      
      const timeout = setTimeout(() => {
        this.ourWebSocket?.close();
        reject(new Error('Connection timeout to our WebSocket server'));
      }, 5000);

      this.ourWebSocket.on('open', () => {
        clearTimeout(timeout);
        this.metrics.firstConnectionTime = performance.now() - this.metrics.testStartTime;
        console.log(`✅ Connected to our WebSocket in ${this.metrics.firstConnectionTime.toFixed(2)}ms`);
        resolve(true);
      });

      this.ourWebSocket.on('error', (error) => {
        clearTimeout(timeout);
        this.metrics.errors.push(`Our WebSocket error: ${error.message}`);
        reject(error);
      });

      this.ourWebSocket.on('message', (data) => {
        this.handleOurWebSocketMessage(data);
      });
    });
  }

  /**
   * Test 2: Connect directly to BuildPanel WebSocket  
   * This validates BuildPanel's streaming capability
   */
  async testBuildPanelDirectConnection(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      console.log('🔗 Testing direct connection to BuildPanel WebSocket...');
      
      const buildPanelUrl = process.env.BUILDPANEL_URL || 'http://localhost:3003';
      const wsUrl = buildPanelUrl.replace('http', 'ws') + '/realtime-voice';
      
      this.buildPanelWebSocket = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        this.buildPanelWebSocket?.close();
        console.log('⚠️  BuildPanel WebSocket connection timeout - streaming may not be available');
        resolve(false); // Not a failure, just not available
      }, 5000);

      this.buildPanelWebSocket.on('open', () => {
        clearTimeout(timeout);
        console.log('✅ Direct BuildPanel WebSocket connection established');
        resolve(true);
      });

      this.buildPanelWebSocket.on('error', (error) => {
        clearTimeout(timeout);
        console.log(`⚠️  BuildPanel WebSocket not available: ${error.message}`);
        resolve(false); // Not a failure, just not available
      });

      this.buildPanelWebSocket.on('message', (data) => {
        this.handleBuildPanelMessage(data);
      });
    });
  }

  /**
   * Test 3: Simulate streaming audio chunks
   * This tests the complete flow with mock audio data
   */
  async testStreamingAudioFlow(): Promise<void> {
    if (!this.ourWebSocket || this.ourWebSocket.readyState !== WebSocket.OPEN) {
      throw new Error('Our WebSocket not connected');
    }

    console.log('🎤 Starting streaming audio simulation...');
    
    // Send streaming session start
    this.ourWebSocket.send(JSON.stringify({
      type: 'start_voice_streaming',
      sessionId: this.sessionId,
      restaurantId: 'test-restaurant',
      userId: 'test-user',
      audioConfig: {
        sampleRate: 48000,
        channels: 1,
        format: 'webm'
      }
    }));

    // Simulate audio chunks (500ms intervals)
    const chunkInterval = 500;
    const totalChunks = 6; // 3 seconds of audio
    
    for (let i = 0; i < totalChunks; i++) {
      await new Promise(resolve => setTimeout(resolve, chunkInterval));
      
      // Create mock audio chunk (silence)
      const mockAudioChunk = new ArrayBuffer(1024);
      
      // Send chunk metadata
      this.ourWebSocket.send(JSON.stringify({
        type: 'audio_chunk',
        sessionId: this.sessionId,
        sequenceNumber: i,
        timestamp: Date.now()
      }));
      
      // Send binary audio data
      this.ourWebSocket.send(mockAudioChunk);
      this.metrics.chunksTransmitted++;
      
      console.log(`📡 Sent audio chunk ${i + 1}/${totalChunks}`);
    }

    // End streaming session
    this.ourWebSocket.send(JSON.stringify({
      type: 'end_voice_streaming',
      sessionId: this.sessionId
    }));

    console.log('🎤 Audio streaming simulation complete');
  }

  /**
   * Test 4: Measure end-to-end latency
   */
  async measureStreamingLatency(): Promise<void> {
    console.log('⏱️  Measuring streaming latency...');
    
    // Wait for responses and measure timing
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.metrics.totalTestDuration = performance.now() - this.metrics.testStartTime;
        console.log('⏱️  Latency measurement timeout reached');
        resolve();
      }, 10000); // 10 second timeout

      const checkComplete = () => {
        // Consider complete if we got some response or timeout
        if (this.metrics.transcriptionUpdates > 0 || this.metrics.audioChunksReceived > 0) {
          clearTimeout(timeout);
          this.metrics.totalTestDuration = performance.now() - this.metrics.testStartTime;
          resolve();
        }
      };

      // Check every 100ms
      const checkInterval = setInterval(() => {
        checkComplete();
        if (this.metrics.totalTestDuration) {
          clearInterval(checkInterval);
        }
      }, 100);
    });
  }

  private handleOurWebSocketMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📨 Our WebSocket: ${message.type}`);
      
      switch (message.type) {
        case 'streaming_session_started':
          console.log(`✅ Streaming session started: ${message.sessionId}`);
          console.log(`   BuildPanel connected: ${message.buildPanelConnected}`);
          if (message.fallbackToBatch) {
            console.log('   ⚠️  Falling back to batch processing');
          }
          break;
          
        case 'transcription_update':
          if (!this.metrics.firstTranscriptionTime) {
            this.metrics.firstTranscriptionTime = performance.now() - this.metrics.testStartTime;
            console.log(`🎯 First transcription in ${this.metrics.firstTranscriptionTime.toFixed(2)}ms`);
          }
          this.metrics.transcriptionUpdates++;
          console.log(`📝 Transcription: "${message.text}" (final: ${message.isFinal})`);
          break;
          
        case 'audio_response_chunk':
          if (!this.metrics.firstAudioResponseTime) {
            this.metrics.firstAudioResponseTime = performance.now() - this.metrics.testStartTime;
            console.log(`🔊 First audio response in ${this.metrics.firstAudioResponseTime.toFixed(2)}ms`);
          }
          this.metrics.audioChunksReceived++;
          console.log(`🔊 Audio chunk received (seq: ${message.sequenceNumber}, complete: ${message.isComplete})`);
          break;
          
        case 'streaming_complete':
          console.log(`✅ Streaming complete: "${message.finalTranscription}"`);
          if (message.orderData) {
            console.log('📋 Order data received:', message.orderData);
          }
          break;
          
        case 'streaming_error':
          this.metrics.errors.push(`Streaming error: ${message.error}`);
          console.log(`❌ Streaming error: ${message.error}`);
          if (message.fallbackToBatch) {
            console.log('   🔄 Falling back to batch processing');
          }
          break;
          
        case 'progress':
          this.metrics.chunksAcknowledged++;
          break;
      }
    } catch (error) {
      // Might be binary data
      console.log('📨 Binary data received from our WebSocket');
    }
  }

  private handleBuildPanelMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📨 BuildPanel: ${message.type}`);
    } catch (error) {
      console.log('📨 Binary data received from BuildPanel');
    }
  }

  private generateReport(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 STREAMING POC TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`Session ID: ${this.sessionId}`);
    console.log(`Total Test Duration: ${(this.metrics.totalTestDuration || 0).toFixed(2)}ms`);
    
    if (this.metrics.firstConnectionTime) {
      console.log(`✅ WebSocket Connection: ${this.metrics.firstConnectionTime.toFixed(2)}ms`);
    }
    
    if (this.metrics.firstTranscriptionTime) {
      console.log(`✅ First Transcription: ${this.metrics.firstTranscriptionTime.toFixed(2)}ms`);
    } else {
      console.log('❌ No transcription received');
    }
    
    if (this.metrics.firstAudioResponseTime) {
      console.log(`✅ First Audio Response: ${this.metrics.firstAudioResponseTime.toFixed(2)}ms`);
    } else {
      console.log('❌ No audio response received');
    }
    
    console.log(`📊 Chunks Transmitted: ${this.metrics.chunksTransmitted}`);
    console.log(`📊 Chunks Acknowledged: ${this.metrics.chunksAcknowledged}`);
    console.log(`📊 Transcription Updates: ${this.metrics.transcriptionUpdates}`);
    console.log(`📊 Audio Chunks Received: ${this.metrics.audioChunksReceived}`);
    
    if (this.metrics.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.metrics.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    // Determine streaming capability
    const streamingWorking = (
      this.metrics.transcriptionUpdates > 0 || 
      this.metrics.audioChunksReceived > 0
    );
    
    console.log('\n🎯 STREAMING ASSESSMENT:');
    if (streamingWorking) {
      console.log('✅ Real-time streaming appears to be working');
      
      if (this.metrics.firstTranscriptionTime && this.metrics.firstTranscriptionTime < 2000) {
        console.log('✅ Streaming latency is within acceptable range');
      } else {
        console.log('⚠️  Streaming latency may be higher than expected');
      }
    } else {
      console.log('❌ Real-time streaming not working - batch fallback recommended');
    }
    
    console.log('\n📝 RECOMMENDED NEXT STEPS:');
    if (streamingWorking) {
      console.log('1. Proceed with full streaming implementation');
      console.log('2. Optimize chunk size and buffering');
      console.log('3. Add comprehensive error handling');
      console.log('4. Implement UI real-time updates');
    } else {
      console.log('1. Verify BuildPanel streaming configuration');
      console.log('2. Test with actual BuildPanel service');
      console.log('3. Implement optimized batch processing as fallback');
      console.log('4. Consider hybrid approach');
    }
  }

  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up connections...');
    
    if (this.ourWebSocket) {
      this.ourWebSocket.close();
    }
    
    if (this.buildPanelWebSocket) {
      this.buildPanelWebSocket.close();
    }
    
    // Save detailed results
    const reportPath = path.join(__dirname, '../.test-results/streaming-poc-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(this.metrics, null, 2));
    
    console.log(`📄 Detailed metrics saved to: ${reportPath}`);
  }

  async runFullTest(): Promise<boolean> {
    let success = false;
    
    try {
      console.log('🚀 Starting Voice Streaming POC Test\n');
      
      // Test 1: Our WebSocket infrastructure
      await this.testOurWebSocketConnection();
      
      // Test 2: BuildPanel direct connection (optional)
      const buildPanelAvailable = await this.testBuildPanelDirectConnection();
      
      // Test 3: Streaming audio simulation
      await this.testStreamingAudioFlow();
      
      // Test 4: Latency measurement
      await this.measureStreamingLatency();
      
      success = true;
      
    } catch (error) {
      console.error('❌ POC Test failed:', error);
      this.metrics.errors.push(`Test execution error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.generateReport();
      await this.cleanup();
    }
    
    return success;
  }
}

// Main execution
async function main() {
  const poc = new VoiceStreamingPOC();
  
  const success = await poc.runFullTest();
  
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main();
}

export { VoiceStreamingPOC };