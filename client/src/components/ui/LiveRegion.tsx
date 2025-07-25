import React, { createContext, useContext, useState, useCallback } from 'react';

interface LiveRegionContextType {
  announce: (message: string, options?: AnnounceOptions) => void;
}

interface AnnounceOptions {
  priority?: 'polite' | 'assertive';
  clearAfter?: number;
}

const LiveRegionContext = createContext<LiveRegionContextType | undefined>(undefined);

export const useLiveRegion = () => {
  const context = useContext(LiveRegionContext);
  if (!context) {
    throw new Error('useLiveRegion must be used within a LiveRegionProvider');
  }
  return context;
};

interface LiveRegionProviderProps {
  children: React.ReactNode;
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

// Utility hook for order status announcements
export const useOrderStatusAnnouncement = () => {
  const { announce } = useLiveRegion();

  const announceOrderStatus = useCallback((orderNumber: string, status: string) => {
    const statusMessages: Record<string, string> = {
      'new': `New order ${orderNumber} received`,
      'preparing': `Order ${orderNumber} is now being prepared`,
      'ready': `Order ${orderNumber} is ready for pickup`,
      'completed': `Order ${orderNumber} has been completed`,
      'cancelled': `Order ${orderNumber} has been cancelled`,
    };

    const message = statusMessages[status] || `Order ${orderNumber} status changed to ${status}`;
    announce(message, { priority: status === 'ready' ? 'assertive' : 'polite' });
  }, [announce]);

  return { announceOrderStatus };
};