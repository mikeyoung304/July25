import { useContext } from 'react';
import { VoiceOrderContext } from '../contexts/context';

export const useVoiceOrder = () => {
  const context = useContext(VoiceOrderContext);
  if (!context) {
    throw new Error('useVoiceOrder must be used within a VoiceOrderProvider');
  }
  return context;
};