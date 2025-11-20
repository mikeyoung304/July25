# CL-ERROR-001: Error Message Misdirection

## Pattern
TypeScript shows wrong error when it can't parse a file.

## Common Misdirections
```
SHOWS: "Cannot find declaration file for module 'X'"
ACTUAL: Browser code in server build

SHOWS: "Cannot find namespace 'JSX'"
ACTUAL: React not in scope

SHOWS: "Type error in node_modules"
ACTUAL: Your code imports wrong thing
```

## The Rule
**ALWAYS read the FIRST error, ignore cascading errors**

```bash
# Wrong way
npm run build 2>&1 | tail -20  # Shows cascading errors

# Right way
npm run build 2>&1 | head -20  # Shows root cause
```

## Error Decoder Map
```javascript
const ERROR_DECODER = {
  "Cannot find declaration": [
    "Check if browser code in server",
    "Check if actually installed",
    "Check tsconfig paths"
  ],
  "Cannot find namespace": [
    "Missing import",
    "Wrong environment",
    "Check lib in tsconfig"
  ],
  "Cannot find name 'window'": [
    "Browser code in Node.js",
    "Missing DOM lib",
    "Need environment check"
  ]
};
```

## Test
```bash
# When you see a TypeScript error, first check:
tsc --listFiles | grep -E "(browser|window|document)"
# If matches, you have browser code in server build
```

## Cost: Every build failure wastes 30-120 minutes on wrong path