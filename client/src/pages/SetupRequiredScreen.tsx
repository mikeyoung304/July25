import React from 'react'
import { AlertTriangle } from 'lucide-react'

export function SetupRequiredScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-macon-background p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-large p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-warning-50 rounded-full">
            <AlertTriangle className="h-12 w-12 text-warning" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-macon-navy mb-4">
          Setup Required
        </h1>
        
        <p className="text-gray-600 mb-6">
          Missing environment configuration. Please ensure your <code className="px-2 py-1 bg-gray-100 rounded">.env</code> file exists in the project root directory with the following required variables:
        </p>
        
        <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
          <ul className="space-y-2 font-mono text-sm">
            <li>• VITE_API_BASE_URL</li>
            <li>• VITE_SUPABASE_URL</li>
            <li>• VITE_SUPABASE_ANON_KEY</li>
          </ul>
        </div>
        
        <p className="text-sm text-gray-500">
          After adding the environment variables, restart the development server.
        </p>
      </div>
    </div>
  )
}