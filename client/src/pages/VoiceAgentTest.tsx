import React, { useState } from 'react';
import { VoiceControlWebRTC } from '../modules/voice/components/VoiceControlWebRTC';
import { useAuth } from '@/contexts/auth.hooks';

/**
 * Test page for authentication-based voice agent modes
 */
export const VoiceAgentTest: React.FC = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [overrideMode, setOverrideMode] = useState<'employee' | 'customer' | undefined>(undefined);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Voice Agent Mode Testing</h1>

      {/* Authentication Status */}
      <div className="bg-gray-100 rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-2">Authentication Status</h2>
        <div className="space-y-1 text-sm">
          <p>Authenticated: <span className="font-medium">{isAuthenticated ? 'Yes' : 'No'}</span></p>
          <p>Role: <span className="font-medium">{user?.role || 'None'}</span></p>
          <p>Email: <span className="font-medium">{user?.email || 'Not logged in'}</span></p>
        </div>

        {/* Quick Auth Actions */}
        <div className="mt-4 flex gap-2">
          {!isAuthenticated ? (
            <>
              <button
                onClick={() => login({
                  email: 'manager@test.com',
                  role: 'manager',
                  restaurant_id: '11111111-1111-1111-1111-111111111111'
                })}
                className="px-3 py-1 bg-purple-600 text-white rounded text-sm"
              >
                Login as Manager
              </button>
              <button
                onClick={() => login({
                  email: 'server@test.com',
                  role: 'server',
                  restaurant_id: '11111111-1111-1111-1111-111111111111'
                })}
                className="px-3 py-1 bg-purple-600 text-white rounded text-sm"
              >
                Login as Server
              </button>
            </>
          ) : (
            <button
              onClick={logout}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm"
            >
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Mode Override Controls */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-2">Mode Override (Testing Only)</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setOverrideMode(undefined)}
            className={`px-3 py-1 rounded text-sm ${
              overrideMode === undefined
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Auto-Detect
          </button>
          <button
            onClick={() => setOverrideMode('employee')}
            className={`px-3 py-1 rounded text-sm ${
              overrideMode === 'employee'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Force Employee
          </button>
          <button
            onClick={() => setOverrideMode('customer')}
            className={`px-3 py-1 rounded text-sm ${
              overrideMode === 'customer'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Force Customer
          </button>
        </div>
      </div>

      {/* Expected Behavior */}
      <div className="bg-yellow-50 rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-2">Expected Behavior</h2>
        <div className="text-sm space-y-2">
          <div>
            <span className="font-medium">Employee Mode (Purple badge):</span>
            <ul className="ml-4 mt-1 list-disc">
              <li>No voice responses (display only)</li>
              <li>Brief text confirmations</li>
              <li>Direct to kitchen on confirmation</li>
              <li>No payment collection</li>
            </ul>
          </div>
          <div>
            <span className="font-medium">Customer Mode (Blue badge):</span>
            <ul className="ml-4 mt-1 list-disc">
              <li>Full voice interaction</li>
              <li>Friendly conversational responses</li>
              <li>Collects customer information</li>
              <li>Processes payment before kitchen</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Voice Control Component */}
      <div className="border rounded-lg p-4">
        <VoiceControlWebRTC
          debug={true}
          overrideMode={overrideMode}
          onTranscript={(text) => console.log('Transcript:', text)}
          onOrderDetected={(order) => console.log('Order detected:', order)}
          onOrderConfirmation={(conf) => console.log('Order confirmed:', conf)}
          onVisualFeedback={(feedback) => console.log('Visual feedback:', feedback)}
        />
      </div>
    </div>
  );
};