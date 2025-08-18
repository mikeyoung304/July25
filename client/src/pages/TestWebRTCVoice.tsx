import React, { useState } from 'react';
import { VoiceControlWebRTC } from '../modules/voice/components/VoiceControlWebRTC';
import { Clock, Zap, Shield, Globe } from 'lucide-react';

/**
 * Test page for WebRTC voice implementation
 * Demonstrates low-latency real-time voice transcription
 */
export const TestWebRTCVoice: React.FC = () => {
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  
  const handleTranscript = (text: string) => {
    setTranscripts(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${text}`]);
  };
  
  const handleOrderDetected = (order: any) => {
    setOrders(prev => [...prev, order]);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            WebRTC Voice Test
          </h1>
          <p className="text-gray-600">
            Real-time voice transcription using OpenAI Realtime API with WebRTC
          </p>
          
          {/* Benefits */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-lg p-3 border">
              <Zap className="w-5 h-5 text-yellow-500 mb-2" />
              <p className="text-xs font-medium">Low Latency</p>
              <p className="text-xs text-gray-500">~200ms response</p>
            </div>
            <div className="bg-white rounded-lg p-3 border">
              <Globe className="w-5 h-5 text-blue-500 mb-2" />
              <p className="text-xs font-medium">Direct Connection</p>
              <p className="text-xs text-gray-500">Browser → OpenAI</p>
            </div>
            <div className="bg-white rounded-lg p-3 border">
              <Shield className="w-5 h-5 text-green-500 mb-2" />
              <p className="text-xs font-medium">Secure</p>
              <p className="text-xs text-gray-500">Ephemeral tokens</p>
            </div>
            <div className="bg-white rounded-lg p-3 border">
              <Clock className="w-5 h-5 text-purple-500 mb-2" />
              <p className="text-xs font-medium">Real-time</p>
              <p className="text-xs text-gray-500">Streaming audio</p>
            </div>
          </div>
        </div>
        
        {/* Voice Control */}
        <div className="mb-8">
          <VoiceControlWebRTC
            onTranscript={handleTranscript}
            onOrderDetected={handleOrderDetected}
            debug={true}
          />
        </div>
        
        {/* Transcript History */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Transcript History
            </h2>
            <div className="bg-white rounded-lg border p-4 h-64 overflow-y-auto">
              {transcripts.length === 0 ? (
                <p className="text-sm text-gray-500">No transcripts yet. Start speaking!</p>
              ) : (
                <div className="space-y-2">
                  {transcripts.map((text, idx) => (
                    <div key={idx} className="text-sm">
                      <p className="text-gray-700">{text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Detected Orders */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Detected Orders
            </h2>
            <div className="bg-white rounded-lg border p-4 h-64 overflow-y-auto">
              {orders.length === 0 ? (
                <p className="text-sm text-gray-500">No orders detected yet.</p>
              ) : (
                <div className="space-y-2">
                  {orders.map((order, idx) => (
                    <div key={idx} className="text-sm bg-green-50 p-2 rounded">
                      <p className="text-green-900">
                        Order #{idx + 1} - Confidence: {(order.confidence * 100).toFixed(0)}%
                      </p>
                      <pre className="text-xs mt-1 text-green-700">
                        {JSON.stringify(order.items, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">How to Test:</h3>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Click "Enable Microphone" if prompted</li>
            <li>Wait for "Connected" status (green indicator)</li>
            <li>Hold the microphone button and speak clearly</li>
            <li>Try saying: "I'd like to order a large pizza with pepperoni"</li>
            <li>Release the button to stop recording</li>
            <li>Watch transcription appear in ~200-300ms</li>
          </ol>
        </div>
        
        {/* Technical Details */}
        <div className="mt-4 bg-gray-100 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Technical Details:</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Model: gpt-4o-realtime-preview-2025-06-03</li>
            <li>• Connection: WebRTC (RTCPeerConnection + RTCDataChannel)</li>
            <li>• Audio: PCM16 @ 24kHz, bidirectional streaming</li>
            <li>• Transcription: OpenAI Whisper with VAD (Voice Activity Detection)</li>
            <li>• Token: Ephemeral (expires after 60 seconds)</li>
            <li>• Latency: Target &lt;300ms end-to-end</li>
          </ul>
        </div>
      </div>
    </div>
  );
};