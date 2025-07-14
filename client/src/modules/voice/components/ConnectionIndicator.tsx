import React from 'react';
import { cn } from '@/utils';
import type { ConnectionStatus } from '../hooks/useVoiceSocket';

interface ConnectionIndicatorProps {
  status: ConnectionStatus;
  className?: string;
}

export const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({ status, className }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Voice Ready';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('w-2 h-2 rounded-full', getStatusColor())} />
      <span className="text-xs text-gray-600">
        {getStatusText()}
      </span>
    </div>
  );
};

export default ConnectionIndicator;