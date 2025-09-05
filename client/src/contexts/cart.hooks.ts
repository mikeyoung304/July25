import { useContext } from 'react';
import { UnifiedCartContext } from './UnifiedCartContext';

export const useUnifiedCart = () => {
  const context = useContext(UnifiedCartContext);
  if (!context) {
    throw new Error('useUnifiedCart must be used within UnifiedCartProvider');
  }
  return context;
};

// Aliases for backward compatibility
export const useCart = useUnifiedCart;
export const useKioskCart = useUnifiedCart;