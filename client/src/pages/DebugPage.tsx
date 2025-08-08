import React from 'react'

export function DebugPage() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Debug Page - App is Working!</h1>
      <p>If you see this, React is rendering correctly.</p>
      <p>Time: {new Date().toLocaleTimeString()}</p>
    </div>
  )
}