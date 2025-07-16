import type { Meta, StoryObj } from '@storybook/react-vite';
import { HoldToRecordButton } from './HoldToRecordButton';
import { useState } from 'react';

const meta = {
  title: 'Voice/HoldToRecordButton',
  component: HoldToRecordButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The HoldToRecordButton is the primary interface for voice recording in the Grow Fresh ordering system.
It provides visual and interactive feedback for the recording state.

## Features
- **Hold to record**: Press and hold to start recording, release to stop
- **Visual states**: Different appearances for idle, listening, and processing states
- **Accessibility**: Keyboard support with Space/Enter keys
- **Responsive**: Scales appropriately on different screen sizes

## Usage
\`\`\`tsx
import { HoldToRecordButton } from '@/modules/voice/components/HoldToRecordButton';

function VoiceOrdering() {
  const [isListening, setIsListening] = useState(false);
  
  const handleMouseDown = () => {
    setIsListening(true);
    // Start recording
  };
  
  const handleMouseUp = () => {
    setIsListening(false);
    // Stop recording and process
  };
  
  return (
    <HoldToRecordButton
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      isListening={isListening}
      isProcessing={false}
      disabled={false}
    />
  );
}
\`\`\`
        `
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    onMouseDown: { 
      action: 'mousedown',
      description: 'Called when the user starts pressing the button'
    },
    onMouseUp: { 
      action: 'mouseup',
      description: 'Called when the user releases the button'
    },
    isListening: {
      control: { type: 'boolean' },
      description: 'Whether the button is currently recording audio'
    },
    isProcessing: {
      control: { type: 'boolean' },
      description: 'Whether the recorded audio is being processed'
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Whether the button is disabled'
    }
  },
} satisfies Meta<typeof HoldToRecordButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onMouseDown: () => {},
    onMouseUp: () => {},
    isListening: false,
    isProcessing: false,
    disabled: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'The default state of the button, ready to record.'
      }
    }
  }
};

export const Listening: Story = {
  args: {
    onMouseDown: () => {},
    onMouseUp: () => {},
    isListening: true,
    isProcessing: false,
    disabled: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'The button while actively recording. Shows a pulsing animation to indicate recording is in progress.'
      }
    }
  }
};

export const Processing: Story = {
  args: {
    onMouseDown: () => {},
    onMouseUp: () => {},
    isListening: false,
    isProcessing: true,
    disabled: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'The button while processing the recorded audio. Shows a spinner to indicate processing.'
      }
    }
  }
};

export const Disabled: Story = {
  args: {
    onMouseDown: () => {},
    onMouseUp: () => {},
    isListening: false,
    isProcessing: false,
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'The button in a disabled state. Cannot be interacted with.'
      }
    }
  }
};

// Interactive example with state management
export const Interactive: Story = {
  args: {
    onMouseDown: () => {},
    onMouseUp: () => {},
    isListening: false,
    isProcessing: false,
    disabled: false,
  },
  render: function Render() {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const handleMouseDown = () => {
      setIsListening(true);
      setIsProcessing(false);
    };
    
    const handleMouseUp = () => {
      setIsListening(false);
      setIsProcessing(true);
      
      // Simulate processing
      setTimeout(() => {
        setIsProcessing(false);
      }, 2000);
    };
    
    return (
      <div className="flex flex-col items-center gap-4">
        <HoldToRecordButton
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          isListening={isListening}
          isProcessing={isProcessing}
          disabled={false}
        />
        <div className="text-sm text-gray-600">
          {isListening && "Recording..."}
          {isProcessing && "Processing..."}
          {!isListening && !isProcessing && "Press and hold to record"}
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'A fully interactive example showing the button transitioning through different states.'
      }
    }
  }
};

// Simulated voice ordering flow
export const VoiceOrderingFlow: Story = {
  args: {
    onMouseDown: () => {},
    onMouseUp: () => {},
    isListening: false,
    isProcessing: false,
    disabled: false,
  },
  render: function Render() {
    const [state, setState] = useState<'idle' | 'listening' | 'processing' | 'complete'>('idle');
    const [transcript, setTranscript] = useState('');
    
    const handleMouseDown = () => {
      setState('listening');
      setTranscript('');
    };
    
    const handleMouseUp = () => {
      if (state === 'listening') {
        setState('processing');
        
        // Simulate processing and transcription
        setTimeout(() => {
          setTranscript("I'd like a Soul Bowl with extra tzatziki sauce");
          setState('complete');
          
          // Reset after showing result
          setTimeout(() => {
            setState('idle');
            setTranscript('');
          }, 3000);
        }, 1500);
      }
    };
    
    return (
      <div className="flex flex-col items-center gap-6 p-8 bg-gray-50 rounded-lg min-w-[400px]">
        <h3 className="text-lg font-semibold">Voice Ordering Demo</h3>
        
        <HoldToRecordButton
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          isListening={state === 'listening'}
          isProcessing={state === 'processing'}
          disabled={state === 'complete'}
        />
        
        <div className="text-center">
          <div className="text-sm text-gray-600 mb-2">
            {state === 'idle' && "Press and hold to order"}
            {state === 'listening' && "Listening... speak your order"}
            {state === 'processing' && "Processing your order..."}
            {state === 'complete' && "Order received!"}
          </div>
          
          {transcript && (
            <div className="mt-4 p-3 bg-white rounded border border-gray-200">
              <p className="text-sm font-medium">Transcript:</p>
              <p className="text-sm text-gray-700 italic">"{transcript}"</p>
            </div>
          )}
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'A complete voice ordering flow simulation showing how the button works in context.'
      }
    }
  }
};