/**
 * MockStreamingService
 * 
 * Provides realistic mock streaming data for UI development and testing
 * when AI streaming is not available.
 */

export interface MockTranscriptionUpdate {
  text: string;
  confidence: number;
  isFinal: boolean;
  timestamp: number;
}

export interface MockStreamingOptions {
  /** Speed multiplier for mock updates (1.0 = real-time, 2.0 = 2x faster) */
  speedMultiplier?: number;
  /** Whether to simulate network delays and jitter */
  simulateNetworkIssues?: boolean;
  /** Confidence level variation (0-1) */
  confidenceVariation?: boolean;
  /** Custom sample phrases to use */
  samplePhrases?: string[];
}

export class MockStreamingService {
  private isActive = false;
  private currentSessionId: string | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private options: Required<MockStreamingOptions>;

  // Sample phrases for realistic mock data
  private readonly defaultSamplePhrases = [
    "I would like to order a large pepperoni pizza",
    "Can I get two cheeseburgers with fries please",
    "I'll take a chicken Caesar salad and a Diet Coke",
    "Could I have the fish and chips with extra tartar sauce",
    "I want three tacos al pastor and a horchata",
    "Can I get the breakfast special with scrambled eggs",
    "I'd like the pad thai with chicken, medium spicy",
    "Could I order a margherita pizza and a side of garlic bread",
    "I'll have the ribeye steak medium rare with mashed potatoes",
    "Can I get a veggie burger with sweet potato fries"
  ];

  constructor(options: MockStreamingOptions = {}) {
    this.options = {
      speedMultiplier: 1.0,
      simulateNetworkIssues: false,
      confidenceVariation: true,
      samplePhrases: this.defaultSamplePhrases,
      ...options
    };
  }

  /**
   * Start mock streaming for a given phrase
   */
  startMockStreaming(
    sessionId: string,
    onTranscriptionUpdate: (update: MockTranscriptionUpdate) => void,
    customPhrase?: string
  ): void {
    if (this.isActive) {
      this.stopMockStreaming();
    }

    this.isActive = true;
    this.currentSessionId = sessionId;

    // Select phrase to simulate
    const phrase = customPhrase || this.getRandomPhrase();
    const words = phrase.split(' ');
    
    let currentWordIndex = 0;
    let currentText = '';
    const startTime = Date.now();

    const sendUpdate = () => {
      if (!this.isActive || currentWordIndex >= words.length) {
        // Send final update
        if (this.isActive) {
          onTranscriptionUpdate({
            text: phrase,
            confidence: 0.95,
            isFinal: true,
            timestamp: Date.now()
          });
        }
        this.stopMockStreaming();
        return;
      }

      // Add next word
      currentText += (currentWordIndex > 0 ? ' ' : '') + words[currentWordIndex];
      currentWordIndex++;

      // Calculate confidence (varies based on position and options)
      let confidence = 0.6 + (currentWordIndex / words.length) * 0.3;
      
      if (this.options.confidenceVariation) {
        confidence += (Math.random() - 0.5) * 0.2;
        confidence = Math.max(0.3, Math.min(0.98, confidence));
      }

      // Simulate network issues
      let delay = 150 + Math.random() * 200; // 150-350ms base delay
      delay /= this.options.speedMultiplier;

      if (this.options.simulateNetworkIssues && Math.random() < 0.1) {
        delay += Math.random() * 500; // Occasional network hiccup
      }

      // Send update
      onTranscriptionUpdate({
        text: currentText,
        confidence,
        isFinal: false,
        timestamp: Date.now()
      });

      // Schedule next update
      this.updateInterval = setTimeout(sendUpdate, delay);
    };

    // Start with small delay
    this.updateInterval = setTimeout(sendUpdate, 300 / this.options.speedMultiplier);
  }

  /**
   * Simulate streaming audio playback
   */
  simulateAudioResponse(
    sessionId: string,
    onAudioChunk: (chunk: ArrayBuffer, isComplete: boolean) => void,
    responseDuration: number = 3000
  ): void {
    if (sessionId !== this.currentSessionId) {
      return;
    }

    const chunkCount = Math.ceil(responseDuration / 200); // 200ms chunks
    let currentChunk = 0;

    const sendAudioChunk = () => {
      if (currentChunk >= chunkCount) {
        return;
      }

      // Create mock audio chunk (silence with random data)
      const chunkSize = 1024 + Math.random() * 512;
      const mockAudioChunk = new ArrayBuffer(chunkSize);
      const view = new Uint8Array(mockAudioChunk);
      
      // Fill with mock audio data
      for (let i = 0; i < view.length; i++) {
        view[i] = Math.floor(Math.random() * 256);
      }

      const isComplete = currentChunk === chunkCount - 1;
      onAudioChunk(mockAudioChunk, isComplete);

      currentChunk++;

      if (!isComplete) {
        setTimeout(sendAudioChunk, 200);
      }
    };

    // Start audio simulation after short delay
    setTimeout(sendAudioChunk, 500);
  }

  /**
   * Stop current mock streaming
   */
  stopMockStreaming(): void {
    this.isActive = false;
    this.currentSessionId = null;
    
    if (this.updateInterval) {
      clearTimeout(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Get a random sample phrase
   */
  private getRandomPhrase(): string {
    return this.options.samplePhrases[
      Math.floor(Math.random() * this.options.samplePhrases.length)
    ];
  }

  /**
   * Check if currently streaming
   */
  isStreaming(): boolean {
    return this.isActive;
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Simulate different streaming scenarios for testing
   */
  simulateScenario(
    scenario: 'perfect' | 'slow-network' | 'low-confidence' | 'choppy',
    sessionId: string,
    onTranscriptionUpdate: (update: MockTranscriptionUpdate) => void
  ): void {
    const scenarios: Record<string, MockStreamingOptions> = {
      perfect: {
        speedMultiplier: 1.5,
        simulateNetworkIssues: false,
        confidenceVariation: false,
        samplePhrases: ["I would like to order a large pepperoni pizza with extra cheese"]
      },
      'slow-network': {
        speedMultiplier: 0.5,
        simulateNetworkIssues: true,
        confidenceVariation: true,
        samplePhrases: ["Can I get two cheeseburgers with fries"]
      },
      'low-confidence': {
        speedMultiplier: 1.0,
        simulateNetworkIssues: false,
        confidenceVariation: true,
        samplePhrases: ["I'll take the... um... chicken parmesan with... uh... garlic bread"]
      },
      choppy: {
        speedMultiplier: 0.8,
        simulateNetworkIssues: true,
        confidenceVariation: true,
        samplePhrases: ["Could I... can I get... I want three tacos please"]
      }
    };

    // Temporarily update options
    const originalOptions = { ...this.options };
    Object.assign(this.options, scenarios[scenario]);

    this.startMockStreaming(sessionId, onTranscriptionUpdate);

    // Restore original options after completion
    setTimeout(() => {
      Object.assign(this.options, originalOptions);
    }, 10000);
  }
}

// Singleton instance for global use
export const mockStreamingService = new MockStreamingService({
  speedMultiplier: 1.2, // Slightly faster for demo purposes
  simulateNetworkIssues: false,
  confidenceVariation: true
});

export default MockStreamingService;