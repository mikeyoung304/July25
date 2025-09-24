// Production Debug Helper
(function() {
  'use strict';

  // Capture and log all errors
  const errors = [];

  window.addEventListener('error', function(e) {
    const errorInfo = {
      message: e.message || 'Unknown error',
      filename: e.filename || 'unknown',
      lineno: e.lineno || 0,
      colno: e.colno || 0,
      error: e.error ? {
        message: e.error.message,
        stack: e.error.stack
      } : null,
      timestamp: new Date().toISOString()
    };

    errors.push(errorInfo);
    console.error('[DEBUG] Error captured:', errorInfo);

    // If app fails to load, show error screen after 3 seconds
    setTimeout(function() {
      const sentinel = document.getElementById('boot-sentinel');
      if (sentinel && sentinel.textContent === 'loading…') {
        const errorHTML = `
          <div style="padding: 20px; font-family: monospace;">
            <h1 style="color: red;">Application Failed to Load</h1>
            <h2>Errors Detected:</h2>
            <pre style="background: #f0f0f0; padding: 10px; overflow: auto;">
${JSON.stringify(errors, null, 2)}
            </pre>
            <button onclick="location.reload()">Reload Page</button>
          </div>
        `;
        document.body.innerHTML = errorHTML;
      }
    }, 3000);
  });

  // Log when scripts load successfully
  window.addEventListener('load', function() {
    console.log('[DEBUG] Window loaded successfully');
  });

  // Export debug info
  window.__DEBUG__ = {
    errors: errors,
    getErrors: function() { return errors; },
    clearErrors: function() { errors.length = 0; }
  };
})();