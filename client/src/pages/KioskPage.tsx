import React, { useState } from 'react';
import { useRestaurant } from '@/core';
import { KioskErrorBoundary } from '@/components/kiosk/KioskErrorBoundary';
import { KioskCartProvider, useKioskCart } from '@/components/kiosk/KioskCartProvider';
import { KioskModeSelector, KioskMode } from '@/components/kiosk/KioskModeSelector';
import { VoiceOrderingMode } from '@/components/kiosk/VoiceOrderingMode';
import { KioskCheckoutPage } from '@/components/kiosk/KioskCheckoutPage';

const KioskPageContent: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<KioskMode>('selection');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { setRestaurant } = useRestaurant();
  const { cart } = useKioskCart();

  // Set default restaurant context for kiosk
  React.useEffect(() => {
    setRestaurant({
      id: import.meta.env.VITE_DEFAULT_RESTAURANT_ID || '11111111-1111-1111-1111-111111111111',
      name: 'Restaurant Kiosk',
      timezone: 'America/New_York',
      currency: 'USD'
    });
  }, [setRestaurant]);

  const handleModeSelect = (mode: KioskMode) => {
    setCurrentMode(mode);
  };

  const handleBackToModeSelection = () => {
    setCurrentMode('selection');
    setIsCheckingOut(false);
  };

  const handleCheckout = () => {
    setIsCheckingOut(true);
  };

  const handleBackFromCheckout = () => {
    setIsCheckingOut(false);
  };

  // Checkout flow
  if (isCheckingOut) {
    return <KioskCheckoutPage onBack={handleBackFromCheckout} />;
  }

  // Mode selection
  if (currentMode === 'selection') {
    return (
      <KioskModeSelector
        onModeSelect={handleModeSelect}
        cartItemCount={cart.itemCount}
        cartTotal={cart.total}
        onViewCart={cart.itemCount > 0 ? handleCheckout : undefined}
      />
    );
  }

  // Voice ordering mode
  if (currentMode === 'voice') {
    return (
      <VoiceOrderingMode
        onBack={handleBackToModeSelection}
        onCheckout={handleCheckout}
      />
    );
  }

  // Note: Touch/menu browsing now redirects to /order via KioskModeSelector
  // No need for touch mode handling here anymore
  
  return null;
};

const KioskPage: React.FC = () => {
  return (
    <KioskErrorBoundary>
      <KioskCartProvider>
        <KioskPageContent />
      </KioskCartProvider>
    </KioskErrorBoundary>
  );
};

export default KioskPage