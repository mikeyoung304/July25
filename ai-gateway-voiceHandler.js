/**
 * Voice Handler for WebSocket audio streaming and transcription
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VoiceHandler {
  constructor(openaiApiKey) {
    this.openai = new OpenAI({
      apiKey: openaiApiKey
    });
    this.audioBuffers = new Map(); // Track audio data per connection
    this.connectionStates = new Map(); // Track connection states
  }

  handleConnection(ws) {
    const connectionId = Date.now().toString();
    this.audioBuffers.set(connectionId, []);
    this.connectionStates.set(connectionId, {
      isRecording: false,
      startTime: null
    });
    
    console.log(`Voice client connected: ${connectionId}`);
    
    // Send welcome message
    ws.send(JSON.stringify({ 
      type: 'connected', 
      connectionId,
      message: 'Voice stream ready' 
    }));
    
    ws.on('message', async (data) => {
      try {
        // Check if it's a JSON control message
        if (data.toString().startsWith('{')) {
          const message = JSON.parse(data.toString());
          await this.handleControlMessage(ws, connectionId, message);
        } else {
          // Raw audio data
          await this.handleAudioData(ws, connectionId, data);
        }
      } catch (error) {
        console.error('Error handling message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Failed to process message'
        }));
      }
    });
    
    ws.on('close', () => {
      console.log(`Voice client disconnected: ${connectionId}`);
      this.cleanup(connectionId);
    });
    
    ws.on('error', (error) => {
      console.error(`WebSocket error for ${connectionId}:`, error);
      this.cleanup(connectionId);
    });
  }
  
  async handleControlMessage(ws, connectionId, message) {
    const state = this.connectionStates.get(connectionId);
    
    switch (message.type) {
      case 'start_recording':
        state.isRecording = true;
        state.startTime = Date.now();
        this.audioBuffers.set(connectionId, []); // Clear buffer
        
        ws.send(JSON.stringify({
          type: 'recording_started',
          timestamp: state.startTime
        }));
        break;
        
      case 'stop_recording':
        state.isRecording = false;
        const duration = Date.now() - state.startTime;
        
        // Process accumulated audio
        await this.processAudio(ws, connectionId, duration);
        break;
        
      case 'end':
        // Legacy support
        state.isRecording = false;
        await this.processAudio(ws, connectionId);
        break;
        
      default:
        console.log(`Unknown control message: ${message.type}`);
    }
  }
  
  async handleAudioData(ws, connectionId, audioData) {
    const state = this.connectionStates.get(connectionId);
    
    if (!state.isRecording) {
      return; // Ignore audio when not recording
    }
    
    const buffer = this.audioBuffers.get(connectionId);
    buffer.push(audioData);
    
    // Optional: Send progress updates
    const totalSize = buffer.reduce((sum, chunk) => sum + chunk.length, 0);
    if (totalSize % 10000 === 0) { // Every ~10KB
      ws.send(JSON.stringify({
        type: 'progress',
        bytesReceived: totalSize
      }));
    }
  }
  
  async processAudio(ws, connectionId, duration = 0) {
    const buffer = this.audioBuffers.get(connectionId);
    
    if (!buffer || buffer.length === 0) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'No audio data to process'
      }));
      return;
    }
    
    try {
      // Combine all chunks into a single buffer
      const combinedBuffer = Buffer.concat(buffer);
      const audioSize = combinedBuffer.length;
      
      console.log(`Processing audio: ${audioSize} bytes, duration: ${duration}ms`);
      
      // Use real Whisper transcription
      const transcript = await this.transcribeWithWhisper(combinedBuffer);
      
      ws.send(JSON.stringify({
        type: 'transcription',
        text: transcript,
        final: true,
        duration: duration / 1000, // Convert to seconds
        audioSize: audioSize
      }));
      
      // Clear the buffer after processing
      this.audioBuffers.set(connectionId, []);
      
    } catch (error) {
      console.error('Transcription error:', error);
      
      // Fallback to mock if Whisper fails
      const mockTranscripts = [
        "I'd like to order a burger please",
        "Can I get a bacon burger with fries",
        "I'll have a cheeseburger and a coke",
        "Give me two burgers and a large fries"
      ];
      
      const fallbackTranscript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
      
      ws.send(JSON.stringify({
        type: 'transcription',
        text: fallbackTranscript,
        final: true,
        duration: duration / 1000,
        audioSize: buffer.reduce((sum, chunk) => sum + chunk.length, 0),
        fallback: true,
        error: error.message
      }));
      
      // Clear the buffer
      this.audioBuffers.set(connectionId, []);
    }
  }
  
  cleanup(connectionId) {
    this.audioBuffers.delete(connectionId);
    this.connectionStates.delete(connectionId);
  }
  
  async transcribeWithWhisper(audioBuffer) {
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Create a temporary file for the audio
    const tempFileName = `audio_${Date.now()}.webm`;
    const tempFilePath = path.join(uploadsDir, tempFileName);
    
    try {
      // Write buffer to temporary file
      fs.writeFileSync(tempFilePath, audioBuffer);
      
      // Create a readable stream from the file
      const audioStream = fs.createReadStream(tempFilePath);
      
      // Call OpenAI Whisper API
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioStream,
        model: "whisper-1",
      });
      
      // Clean up the temporary file
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      console.log('Whisper transcription successful:', transcription.text);
      return transcription.text;
      
    } catch (error) {
      // Clean up on error
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      console.error('Whisper transcription failed:', error);
      throw error;
    }
  }
}

export default VoiceHandler;