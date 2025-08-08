import React from 'react'
import ReactDOM from 'react-dom/client'

function DebugTest() {
  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Test - React Works!</h1>
      <p>If you see this, React is loading correctly.</p>
      <p>Time: {new Date().toLocaleTimeString()}</p>
    </div>
  )
}

const root = document.getElementById('root')
if (root) {
  ReactDOM.createRoot(root).render(<DebugTest />)
  console.log('Debug test mounted successfully')
} else {
  console.error('No root element found!')
}