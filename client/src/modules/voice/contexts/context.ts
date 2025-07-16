import { createContext } from 'react';
import type { VoiceOrderContextType } from './types';

export const VoiceOrderContext = createContext<VoiceOrderContextType | undefined>(undefined);