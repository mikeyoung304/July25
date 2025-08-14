import { useState } from 'react';

export const MockDataBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  
  const isUsingMocks = import.meta.env.VITE_USE_MOCK_DATA === 'true' && 
                       import.meta.env.MODE === 'development';
  
  if (!isUsingMocks || dismissed) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: '#ff9800',
      color: 'white',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      zIndex: 9999,
      fontSize: '14px',
      fontFamily: 'monospace'
    }}>
      <span>🚧 DEV MODE: Using mock menu data (VITE_USE_MOCK_DATA=true)</span>
      <button 
        onClick={() => setDismissed(true)}
        style={{
          background: 'transparent',
          border: '1px solid white',
          color: 'white',
          padding: '2px 8px',
          cursor: 'pointer',
          borderRadius: '3px'
        }}
      >
        Dismiss
      </button>
    </div>
  );
};