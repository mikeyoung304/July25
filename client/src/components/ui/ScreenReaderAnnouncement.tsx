import React, { useEffect, useState } from 'react';

interface ScreenReaderAnnouncementProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  clearAfter?: number; // milliseconds
}

export const ScreenReaderAnnouncement: React.FC<ScreenReaderAnnouncementProps> = ({
  message,
  politeness = 'polite',
  clearAfter = 1000,
}) => {
  const [announcement, setAnnouncement] = useState(message);

  useEffect(() => {
    setAnnouncement(message);

    if (clearAfter && message) {
      const timer = setTimeout(() => {
        setAnnouncement('');
      }, clearAfter);

      return () => clearTimeout(timer);
    }
  }, [message, clearAfter]);

  return (
    <div
      className="sr-only"
      role="status"
      aria-live={politeness}
      aria-atomic="true"
    >
      {announcement}
    </div>
  );
};

// Hook for managing announcements
export const useScreenReaderAnnouncement = () => {
  const [message, setMessage] = useState('');

  const announce = (text: string, options?: { politeness?: 'polite' | 'assertive'; clearAfter?: number }) => {
    // Clear and re-set to ensure announcement is made even if same text
    setMessage('');
    setTimeout(() => setMessage(text), 100);
  };

  return {
    announcement: message,
    announce,
  };
};