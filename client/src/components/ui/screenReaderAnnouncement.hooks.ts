import { useState } from 'react';

// Hook for managing announcements
export const useScreenReaderAnnouncement = () => {
  const [message, setMessage] = useState('');

  const announce = (text: string, _options?: { politeness?: 'polite' | 'assertive'; clearAfter?: number }) => {
    // Clear and re-set to ensure announcement is made even if same text
    setMessage('');
    setTimeout(() => setMessage(text), 100);
  };

  return {
    announcement: message,
    announce,
  };
};