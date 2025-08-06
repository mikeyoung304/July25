import React, { useState } from 'react';
import { UnifiedVoiceRecorder } from '@/components/voice/UnifiedVoiceRecorder';
import { mockStreamingService } from '@/services/mock/MockStreamingService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, TestTube, Settings, Info } from 'lucide-react';

const StreamingDemo: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<'perfect' | 'slow-network' | 'low-confidence' | 'choppy'>('perfect');
  const [lasttranscription, setLastTranscription] = useState<string>('');

  const scenarios = [
    {
      id: 'perfect' as const,
      name: 'Perfect Conditions',
      description: 'Optimal network, high confidence, fast processing',
      color: 'bg-green-100 text-green-800',
      settings: 'Fast processing, no network issues, high confidence'
    },
    {
      id: 'slow-network' as const,
      name: 'Slow Network',
      description: 'Network delays, intermittent connectivity',
      color: 'bg-yellow-100 text-yellow-800',
      settings: 'Slower processing, network hiccups, variable confidence'
    },
    {
      id: 'low-confidence' as const,
      name: 'Low Confidence',
      description: 'Unclear speech, background noise',
      color: 'bg-orange-100 text-orange-800',
      settings: 'Normal speed, hesitant speech patterns, lower confidence'
    },
    {
      id: 'choppy' as const,
      name: 'Choppy Audio',
      description: 'Poor connection, audio artifacts',
      color: 'bg-red-100 text-red-800',
      settings: 'Slow processing, network issues, interrupted speech'
    }
  ];

  const handleTranscriptionComplete = (transcript: string) => {
    setLastTranscription(transcript);
  };

  const testScenario = (scenario: typeof selectedScenario) => {
    const sessionId = `demo-${Date.now()}`;
    mockStreamingService.simulateScenario(scenario, sessionId, (update) => {
      console.log('Demo scenario update:', update);
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Zap className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Real-time Voice Streaming Demo</h1>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Experience real-time voice transcription with typing animations and live feedback. 
          Toggle between streaming and standard modes to see the difference.
        </p>
      </div>

      {/* Info Banner */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800">
                <strong>Mock Streaming Active:</strong> This demo uses realistic mock data to simulate real-time streaming. 
                Words appear progressively as they would with actual voice recognition, including confidence indicators and various network conditions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Voice Recorder */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Voice Recorder
              </CardTitle>
              <CardDescription>
                Try both standard and real-time streaming modes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UnifiedVoiceRecorder
                mode="tap-to-toggle"
                enableStreaming={true}
                showConnectionStatus={true}
                showTranscription={true}
                showRecordingIndicator={true}
                onTranscriptionComplete={handleTranscriptionComplete}
                streamingConfig={{
                  chunkSize: 500,
                  showRealtimeTranscription: true,
                  enableTypingEffect: true,
                  confidenceThreshold: 0.7
                }}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Last Transcription */}
          {lastTranscription && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Last Completed Transcription</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 italic">"{lastTranscription}"</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Scenario Testing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TestTube className="w-5 h-5" />
                Test Scenarios
              </CardTitle>
              <CardDescription>
                Test different streaming conditions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {scenarios.map((scenario) => (
                <div key={scenario.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge className={scenario.color}>
                        {scenario.name}
                      </Badge>
                      <p className="text-xs text-gray-600 mt-1">
                        {scenario.description}
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant={selectedScenario === scenario.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedScenario(scenario.id);
                      testScenario(scenario.id);
                    }}
                    className="w-full"
                  >
                    Test {scenario.name}
                  </Button>
                  
                  <p className="text-xs text-gray-500">
                    {scenario.settings}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Settings Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="w-5 h-5" />
                Current Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Chunk Size:</span>
                <span className="font-medium">500ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Typing Effect:</span>
                <span className="font-medium">Enabled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Confidence Threshold:</span>
                <span className="font-medium">70%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mode:</span>
                <span className="font-medium">Tap to Toggle</span>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How to Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <div className="space-y-1">
                <p><strong>1.</strong> Toggle between Standard and Real-time modes</p>
                <p><strong>2.</strong> Press and hold the record button</p>
                <p><strong>3.</strong> Watch words appear progressively in real-time mode</p>
                <p><strong>4.</strong> Try different test scenarios to see various conditions</p>
                <p><strong>5.</strong> Note confidence indicators and typing animations</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Feature Comparison */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Feature Comparison</CardTitle>
          <CardDescription>Standard vs Real-time Streaming Modes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Feature</th>
                  <th className="text-center py-2">Standard Mode</th>
                  <th className="text-center py-2">Real-time Mode</th>
                </tr>
              </thead>
              <tbody className="space-y-2">
                <tr className="border-b">
                  <td className="py-2 font-medium">Transcription Feedback</td>
                  <td className="text-center py-2">After recording ends</td>
                  <td className="text-center py-2">
                    <Badge className="bg-green-100 text-green-800">Live, word-by-word</Badge>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Processing Time</td>
                  <td className="text-center py-2">3-6 seconds</td>
                  <td className="text-center py-2">
                    <Badge className="bg-blue-100 text-blue-800">500ms-2s</Badge>  
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">User Experience</td>
                  <td className="text-center py-2">Wait for result</td>
                  <td className="text-center py-2">
                    <Badge className="bg-purple-100 text-purple-800">Interactive</Badge>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Confidence Indicators</td>
                  <td className="text-center py-2">Final only</td>
                  <td className="text-center py-2">
                    <Badge className="bg-orange-100 text-orange-800">Live updates</Badge>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Error Recovery</td>
                  <td className="text-center py-2">Re-record needed</td>
                  <td className="text-center py-2">
                    <Badge className="bg-green-100 text-green-800">Real-time correction</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StreamingDemo;