import React, { useState, useRef } from 'react';
import { useRestaurant } from '@/core';
import { KioskErrorBoundary } from '@/components/kiosk/KioskErrorBoundary';
import { useUnifiedCart } from '@/contexts/cart.hooks';
import { KioskModeSelector, KioskMode } from '@/components/kiosk/KioskModeSelector';
import { VoiceOrderingMode } from '@/components/kiosk/VoiceOrderingMode';
import { KioskCheckoutPage } from '@/components/kiosk/KioskCheckoutPage';
import { BackToDashboard } from '@/components/navigation/BackToDashboard';
import { useKioskAuth } from '@/hooks/useKioskAuth';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Alert } from '@/components/ui/alert';

const KioskPageContent: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<KioskMode>('selection');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { setRestaurant } = useRestaurant();
  const { cart } = useUnifiedCart();
  const { isAuthenticated, isLoading, error, authenticate } = useKioskAuth();
  
  // Track voice checkout orchestrator for terminal integration
  const voiceCheckoutOrchestratorRef = useRef<any>(null);

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

  // Show loading state while authenticating
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Initializing kiosk...</p>
        </div>
      </div>
    );
  }

  // Show error if authentication failed
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full">
          <Alert variant="error">
            <h3 className="font-semibold">Authentication Failed</h3>
            <p className="mt-1">{error}</p>
            <button
              onClick={() => authenticate()}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </Alert>
          <div className="mt-4">
            <BackToDashboard />
          </div>
        </div>
      </div>
    );
  }

  // Ensure authenticated before showing kiosk interface
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Alert variant="warning">
            <p>Kiosk authentication required</p>
            <button
              onClick={() => authenticate()}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Authenticate
            </button>
          </Alert>
        </div>
      </div>
    );
  }

  // Checkout flow
  if (isCheckingOut) {
    return (
      <div className="relative min-h-screen">
        <div className="fixed top-4 left-4 z-50">
          <BackToDashboard />
        </div>
        <KioskCheckoutPage 
          onBack={handleBackFromCheckout} 
          voiceCheckoutOrchestrator={voiceCheckoutOrchestratorRef.current}
        />
      </div>
    );
  }

  // Mode selection
  if (currentMode === 'selection') {
    return (
      <div className="relative min-h-screen">
        <div className="fixed top-4 left-4 z-50">
          <BackToDashboard />
        </div>
        <KioskModeSelector
          onModeSelect={handleModeSelect}
          cartItemCount={cart.itemCount}
          cartTotal={cart.total}
          onViewCart={cart.itemCount > 0 ? handleCheckout : undefined}
        />
      </div>
    );
  }

  // Voice ordering mode
  if (currentMode === 'voice') {
    return (
      <div className="relative min-h-screen">
        <div className="fixed top-4 left-4 z-50">
          <BackToDashboard />
        </div>
        <VoiceOrderingMode
          onBack={handleBackToModeSelection}
          onCheckout={handleCheckout}
          onOrchestratorReady={(orchestrator) => {
            voiceCheckoutOrchestratorRef.current = orchestrator;
          }}
        />
      </div>
    );
  }

  // Note: Touch/menu browsing now redirects to /order via KioskModeSelector
  // No need for touch mode handling here anymore
  
  return null;
};

const KioskPage: React.FC = () => {
  return (
    <KioskErrorBoundary>
      <KioskPageContent />
    </KioskErrorBoundary>
  );
};

export default KioskPage