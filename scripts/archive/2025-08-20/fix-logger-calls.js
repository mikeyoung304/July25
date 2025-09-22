#!/usr/bin/env node

/**
 * Fix logger method calls that have too many arguments
 * Logger methods accept (message, data?) but some calls pass 3+ args
 */

const fs = require('fs');
const path = require('path');

// Files with logger issues from TypeScript errors
const filesToFix = [
  'client/src/hooks/kitchen/useKitchenOrders.ts',
  'client/src/modules/floor-plan/components/FloorPlanEditor.tsx',
  'client/src/modules/voice/hooks/useVoiceToAudio.ts',
  'client/src/modules/voice/services/VoiceOrderProcessor.ts',
  'client/src/services/websocket/orderUpdates.ts',
  'client/src/services/websocket/WebSocketService.ts',
  'client/src/voice/ws-transport.ts'
];

function fixLoggerCalls(content) {
  // Pattern: logger.method(arg1, arg2, arg3, ...) where method is info, debug, warn, error
  // Fix: Combine args 2+ into an object or array for the data parameter
  
  const loggerPattern = /logger\.(info|debug|warn|error)\s*\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\s*\)/g;
  
  return content.replace(loggerPattern, (match, method, arg1, arg2, arg3) => {
    // Clean up the arguments
    arg1 = arg1.trim();
    arg2 = arg2.trim();
    arg3 = arg3.trim();
    
    // If arg3 contains more commas, it's multiple arguments
    if (arg3.includes(',')) {
      const extraArgs = arg3.split(',').map(a => a.trim());
      return `logger.${method}(${arg1}, { value: ${arg2}, extra: [${extraArgs.join(', ')}] })`;
    } else {
      return `logger.${method}(${arg1}, { value: ${arg2}, extra: ${arg3} })`;
    }
  });
}

let fixedCount = 0;

filesToFix.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const fixed = fixLoggerCalls(content);
  
  if (content !== fixed) {
    fs.writeFileSync(fullPath, fixed);
    const matches = content.match(/logger\.(info|debug|warn|error)\s*\([^)]*,[^)]*,[^)]*\)/g);
    const count = matches ? matches.length : 0;
    fixedCount += count;
  }
});

