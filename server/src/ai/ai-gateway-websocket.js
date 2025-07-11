/**
 * AI Gateway with WebSocket support for voice streaming
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import http from 'http';
import OpenAI from 'openai';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment
dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here'
});

// CORS for frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Restaurant-ID']
}));

// Body parsing
app.use(express.json());

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ai_gateway',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    features: {
      websocket: true,
      voice_streaming: true,
      openai_configured: !!process.env.OPENAI_API_KEY
    }
  });
});

// Menu context for AI
let menuContext = {
  categories: [],
  items: []
};

// Menu upload endpoint
app.post('/api/admin/restaurants/:id/menu', (req, res) => {
  const restaurantId = req.params.id;
  const menuData = req.body;
  
  // Store menu for AI context
  menuContext = {
    categories: menuData.menu_categories || [],
    items: menuData.menu_items || []
  };
  
  console.log(`Menu uploaded for restaurant ${restaurantId}`);
  console.log(`Categories: ${menuContext.categories.length}`);
  console.log(`Items: ${menuContext.items.length}`);
  
  res.json({
    message: 'Menu uploaded successfully',
    restaurant_id: restaurantId,
    categories_count: menuContext.categories.length,
    items_count: menuContext.items.length,
    uploaded_at: new Date().toISOString()
  });
});

// AI Chat endpoint with menu context
app.post('/chat', async (req, res) => {
  const { message, context } = req.body;
  
  console.log('AI Chat request:', { message, context });
  
  try {
    // Build system prompt with menu context
    const systemPrompt = `You are a friendly restaurant order-taking assistant for Grow restaurant. 
    ${context?.role === 'drive_thru_order_taker' ? 'You are taking orders at the drive-thru.' : 'You are taking orders at the kiosk.'}
    
    Current menu:
    ${JSON.stringify(menuContext, null, 2)}
    
    Current order:
    ${JSON.stringify(context?.currentOrder || [], null, 2)}
    
    Guidelines:
    - Be conversational and friendly, matching the customer's tone
    - Confirm each item as you add it
    - Suggest relevant add-ons or upgrades
    - Always confirm the total at the end
    - If modifying an order, be clear about what's changing`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    const aiResponse = completion.choices[0].message.content;
    
    res.json({
      response: aiResponse,
      session_id: context?.session_id || Date.now().toString(),
      response_time_ms: 500,
      model_used: 'gpt-3.5-turbo'
    });
    
  } catch (error) {
    console.error('OpenAI error:', error);
    
    // Fallback response
    res.json({
      response: `I'll help you with your order. You said: "${message}". Our menu includes burgers, fries, and drinks. What would you like?`,
      session_id: context?.session_id || Date.now().toString(),
      response_time_ms: 100,
      model_used: 'fallback'
    });
  }
});

// Whisper transcription endpoint
app.post('/api/v1/ai/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  console.log('Transcription request:', {
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype
  });

  try {
    // Create a readable stream from the uploaded file
    const audioStream = fs.createReadStream(req.file.path);
    
    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: "whisper-1",
    });

    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      text: transcription.text,
      duration: null, // Whisper doesn't return duration
      confidence: null, // Whisper doesn't return confidence
      language: 'en',
      model: 'whisper-1',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Transcription error:', error);
    
    // Clean up file on error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: 'Transcription failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// Import VoiceHandler
import VoiceHandler from './ai-gateway-voiceHandler.js';

// Initialize WebSocket server
const wss = new WebSocketServer({ server, path: '/voice-stream' });

// Create voice handler instance
const voiceHandler = new VoiceHandler(process.env.OPENAI_API_KEY);

// WebSocket connection handler
wss.on('connection', (ws) => {
  voiceHandler.handleConnection(ws);
});

// Start server
const PORT = process.env.PORT || 3002;

server.listen(PORT, () => {
  console.log(`🚀 AI Gateway with WebSocket running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/voice-stream`);
  console.log(`🔗 Frontend CORS: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`✅ Ready for voice ordering!`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});