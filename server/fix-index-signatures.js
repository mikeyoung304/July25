const fs = require('fs');
const path = require('path');

const files = [
  'src/middleware/__tests__/auth.test.ts',
  'src/middleware/csrf.ts',
  'src/middleware/rateLimiter.ts', 
  'src/middleware/requestSanitizer.ts',
  'src/middleware/security-headers.ts',
  'src/middleware/security.ts',
  'src/routes/auth.routes.ts',
  'src/routes/health.routes.ts',
  'src/routes/metrics.ts',
  'src/routes/realtime.routes.ts',
  'src/routes/security.routes.ts',
  'src/routes/tables.routes.ts',
  'src/routes/terminal.routes.ts',
  'src/server.ts',
  'src/services/auth/pinAuth.ts'
];

const replacements = [
  // process.env patterns
  [/process\.env\.(\w+)(?![\[\]])/g, "process.env['$1']"],
  // req.locals patterns
  [/req\.locals\.(\w+)(?![\[\]])/g, "req.locals['$1']"],
  // res.locals patterns  
  [/res\.locals\.(\w+)(?![\[\]])/g, "res.locals['$1']"],
  // table property patterns (for tables.routes.ts)
  [/table\.x_pos/g, "table['x_pos']"],
  [/table\.y_pos/g, "table['y_pos']"],
  [/table\.shape/g, "table['shape']"],
  [/updates\.x_pos/g, "updates['x_pos']"],
  [/updates\.y_pos/g, "updates['y_pos']"],
  [/updates\.shape/g, "updates['shape']"],
  [/data\.x(?!_)/g, "data['x']"],
  [/data\.y(?!_)/g, "data['y']"],
  [/data\.type/g, "data['type']"],
  [/table\.current_order_id/g, "table['current_order_id']"],
  [/data\.locked_until/g, "data['locked_until']"]
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  replacements.forEach(([pattern, replacement]) => {
    const before = content;
    content = content.replace(pattern, replacement);
    if (before !== content) changed = true;
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
  } else {
  }
});

