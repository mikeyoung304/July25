import { createContext } from 'react';

interface AnnounceOptions {
  priority?: 'polite' | 'assertive';
  clearAfter?: number;
}

interface LiveRegionContextType {
  announce: (message: string, options?: AnnounceOptions) => void;
}

export const LiveRegionContext = createContext<LiveRegionContextType | undefined>(undefined);