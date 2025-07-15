import type { Meta, StoryObj } from '@storybook/react';
import { ConnectionIndicator } from './ConnectionIndicator';
import { useState, useEffect } from 'react';
import type { ConnectionStatus } from '../hooks/useVoiceSocket';

const meta = {
  title: 'Voice/ConnectionIndicator',
  component: ConnectionIndicator,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
The ConnectionIndicator provides visual feedback about the WebSocket connection status for voice ordering.
It helps users understand the current state of their connection to the ordering system.

## Features
- **Visual states**: Different colors for connected, connecting, disconnected, and error states
- **Animations**: Pulsing animation for connecting state
- **Compact design**: Small footprint that fits well in headers or status bars
- **Accessible**: Includes proper ARIA labels for screen readers

## Usage
\`\`\`tsx
import { ConnectionIndicator } from '@/modules/voice/components/ConnectionIndicator';
import { useWebSocket } from '@/hooks/useWebSocket';

function Header() {
  const { connectionState } = useWebSocket();
  
  return (
    <header className="flex items-center justify-between p-4">
      <h1>Grow Fresh</h1>
      <ConnectionIndicator status={connectionState} />
    </header>
  );
}
\`\`\`

## Status Values
- **connected**: Green - WebSocket is connected and ready
- **connecting**: Yellow with pulse - Attempting to establish connection
- **disconnected**: Gray - Not connected to the server
- **error**: Red - Connection failed or encountered an error
        `
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: { type: 'select' },
      options: ['connected', 'connecting', 'disconnected', 'error'],
      description: 'The current connection status'
    },
    className: {
      control: { type: 'text' },
      description: 'Additional CSS classes to apply'
    }
  }
} satisfies Meta<typeof ConnectionIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Connected: Story = {
  args: {
    status: 'connected',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows a green indicator when the WebSocket connection is established.'
      }
    }
  }
};

export const Connecting: Story = {
  args: {
    status: 'connecting',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows a yellow pulsing indicator while attempting to connect.'
      }
    }
  }
};

export const Disconnected: Story = {
  args: {
    status: 'disconnected',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows a gray indicator when not connected to the server.'
      }
    }
  }
};

export const Error: Story = {
  args: {
    status: 'error',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows a red indicator when the connection has failed.'
      }
    }
  }
};

// All states showcase
export const AllStates: Story = {
  args: {
    status: 'connected',
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <ConnectionIndicator status="connected" />
        <span className="text-sm">Connected</span>
      </div>
      <div className="flex items-center gap-3">
        <ConnectionIndicator status="connecting" />
        <span className="text-sm">Connecting...</span>
      </div>
      <div className="flex items-center gap-3">
        <ConnectionIndicator status="disconnected" />
        <span className="text-sm">Disconnected</span>
      </div>
      <div className="flex items-center gap-3">
        <ConnectionIndicator status="error" />
        <span className="text-sm">Error</span>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows all possible connection states side by side for comparison.'
      }
    }
  }
};

// Simulated connection lifecycle
export const ConnectionLifecycle: Story = {
  args: {
    status: 'disconnected',
  },
  render: function Render() {
    const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
    const [message, setMessage] = useState('Click to connect');
    
    const simulateConnection = () => {
      setStatus('connecting');
      setMessage('Establishing connection...');
      
      // Simulate connection attempt
      setTimeout(() => {
        // Randomly succeed or fail
        if (Math.random() > 0.3) {
          setStatus('connected');
          setMessage('Connected successfully!');
          
          // Simulate disconnection after a while
          setTimeout(() => {
            setStatus('disconnected');
            setMessage('Connection lost. Click to reconnect.');
          }, 5000);
        } else {
          setStatus('error');
          setMessage('Connection failed. Click to retry.');
          
          // Reset to disconnected after showing error
          setTimeout(() => {
            setStatus('disconnected');
            setMessage('Click to connect');
          }, 3000);
        }
      }, 2000);
    };
    
    return (
      <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold">Connection Lifecycle Demo</h3>
        <ConnectionIndicator status={status} />
        <p className="text-sm text-gray-600">{message}</p>
        <button
          onClick={simulateConnection}
          disabled={status === 'connecting'}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {status === 'connecting' ? 'Connecting...' : 'Connect'}
        </button>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing the connection lifecycle with automatic state transitions.'
      }
    }
  }
};

// Real-world usage example
export const InHeader: Story = {
  args: {
    status: 'connected',
  },
  render: () => {
    const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connected');
    
    // Simulate connection changes
    useEffect(() => {
      const interval = setInterval(() => {
        setStatus(current => {
          const states: Array<'connected' | 'connecting' | 'disconnected' | 'error'> = 
            ['connected', 'connecting', 'disconnected', 'error'];
          const currentIndex = states.indexOf(current);
          return states[(currentIndex + 1) % states.length];
        });
      }, 3000);
      
      return () => clearInterval(interval);
    }, []);
    
    return (
      <div className="w-full max-w-2xl">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">Grow Fresh Voice Ordering</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">System Status:</span>
              <ConnectionIndicator status={status} />
            </div>
          </div>
        </header>
        <main className="p-6 bg-gray-50">
          <p className="text-gray-600">
            The connection indicator in the header shows the current WebSocket connection status.
            It automatically cycles through different states in this demo.
          </p>
        </main>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Example of the ConnectionIndicator used in a realistic header layout.'
      }
    }
  }
};

// With custom styling
export const CustomStyling: Story = {
  args: {
    status: 'connected',
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <ConnectionIndicator status="connected" className="w-4 h-4" />
        <span className="text-sm">Small size (16px)</span>
      </div>
      <div className="flex items-center gap-3">
        <ConnectionIndicator status="connected" className="w-6 h-6" />
        <span className="text-sm">Medium size (24px)</span>
      </div>
      <div className="flex items-center gap-3">
        <ConnectionIndicator status="connected" className="w-8 h-8" />
        <span className="text-sm">Large size (32px)</span>
      </div>
      <div className="flex items-center gap-3 p-3 bg-gray-800 rounded">
        <ConnectionIndicator status="connected" className="ring-2 ring-white ring-offset-2 ring-offset-gray-800" />
        <span className="text-sm text-white">With ring on dark background</span>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Examples of custom styling using className prop.'
      }
    }
  }
};