import React, { useState, useCallback } from 'react';
import { LiveRegionContext } from './LiveRegion.context';

interface LiveRegionProviderProps {
  children: React.ReactNode;
}

interface AnnounceOptions {
  priority?: 'polite' | 'assertive';
  clearAfter?: number;
}

export const LiveRegionProvider: React.FC<LiveRegionProviderProps> = ({ children }) => {
  const [politeAnnouncements, setPoliteAnnouncements] = useState<string[]>([]);
  const [assertiveAnnouncements, setAssertiveAnnouncements] = useState<string[]>([]);

  const announce = useCallback((message: string, options: AnnounceOptions = {}) => {
    const { priority = 'polite', clearAfter = 5000 } = options;
    
    if (priority === 'assertive') {
      setAssertiveAnnouncements(prev => [...prev, message]);
      if (clearAfter) {
        setTimeout(() => {
          setAssertiveAnnouncements(prev => prev.filter(msg => msg !== message));
        }, clearAfter);
      }
    } else {
      setPoliteAnnouncements(prev => [...prev, message]);
      if (clearAfter) {
        setTimeout(() => {
          setPoliteAnnouncements(prev => prev.filter(msg => msg !== message));
        }, clearAfter);
      }
    }
  }, []);

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      
      {/* Polite announcements */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {politeAnnouncements.map((announcement, index) => (
          <div key={`${announcement}-${index}`}>{announcement}</div>
        ))}
      </div>
      
      {/* Assertive announcements */}
      <div
        className="sr-only"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        {assertiveAnnouncements.map((announcement, index) => (
          <div key={`${announcement}-${index}`}>{announcement}</div>
        ))}
      </div>
    </LiveRegionContext.Provider>
  );
};