# Command: /new-feature
# Usage: /new-feature feature-name
# Description: Scaffolds a new, empty feature module following the Janus Module Architecture.

## Script Definition

```bash
#!/bin/bash

# 1. Get the feature name from the first argument.
FEATURE_NAME=$1

# Validate input
if [ -z "$FEATURE_NAME" ]; then
    echo "❌ Error: Please provide a feature name"
    echo "Usage: /new-feature <feature-name>"
    exit 1
fi

# Convert to lowercase and replace spaces with hyphens
FEATURE_NAME=$(echo "$FEATURE_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

# Check if feature already exists
if [ -d "src/features/$FEATURE_NAME" ]; then
    echo "❌ Error: Feature '$FEATURE_NAME' already exists"
    exit 1
fi

# 2. Create the directory structure.
mkdir -p src/features/$FEATURE_NAME/components
mkdir -p src/features/$FEATURE_NAME/hooks
mkdir -p src/features/$FEATURE_NAME/mocks
mkdir -p src/features/$FEATURE_NAME/types
mkdir -p src/features/$FEATURE_NAME/utils

# 3. Create a feature-specific context file.
cat > src/features/$FEATURE_NAME/claude.md << EOF
# Context: ${FEATURE_NAME} Feature

## Overview
- Purpose: [Describe the feature's purpose]
- Primary Components: [List main components]
- State Management: [Describe state approach]
- Integration Points: [List service/API integrations]

## Architecture Notes
- Follow the established Janus Module Architecture
- All external data access through services directory
- Use RestaurantContext for multi-tenant data
- Implement with TypeScript and functional components

## Performance Goals
- [Define specific performance targets]
- [List optimization strategies]
EOF

# 4. Create a placeholder index file.
cat > src/features/$FEATURE_NAME/index.tsx << EOF
/**
 * ${FEATURE_NAME} Feature Module
 * 
 * This module handles [describe feature purpose]
 */

// Export all public components
export * from './components'

// Export all public hooks
export * from './hooks'

// Export all public types
export * from './types'
EOF

# 5. Create basic type definitions
cat > src/features/$FEATURE_NAME/types/index.ts << EOF
/**
 * Type definitions for ${FEATURE_NAME} feature
 */

// Add your feature-specific types here
export interface ${FEATURE_NAME}Config {
  // Define configuration options
}

export interface ${FEATURE_NAME}State {
  // Define state shape
}
EOF

# 6. Create a sample component
COMPONENT_NAME=$(echo "$FEATURE_NAME" | sed 's/-\([a-z]\)/\U\1/g' | sed 's/^./\U&/')
cat > src/features/$FEATURE_NAME/components/${COMPONENT_NAME}.tsx << EOF
import React from 'react'
import { cn } from '@/lib/utils'

interface ${COMPONENT_NAME}Props {
  className?: string
}

/**
 * Main component for ${FEATURE_NAME} feature
 */
export const ${COMPONENT_NAME}: React.FC<${COMPONENT_NAME}Props> = ({ className }) => {
  return (
    <div className={cn('', className)}>
      <h2>${COMPONENT_NAME} Component</h2>
      {/* Implement your feature here */}
    </div>
  )
}

${COMPONENT_NAME}.displayName = '${COMPONENT_NAME}'
EOF

# 7. Create component index
cat > src/features/$FEATURE_NAME/components/index.ts << EOF
export * from './${COMPONENT_NAME}'
EOF

# 8. Create a sample hook
cat > src/features/$FEATURE_NAME/hooks/use${COMPONENT_NAME}.ts << EOF
import { useState, useEffect } from 'react'
import { ${FEATURE_NAME}State } from '../types'

/**
 * Hook for managing ${FEATURE_NAME} state and logic
 */
export const use${COMPONENT_NAME} = () => {
  const [state, setState] = useState<${FEATURE_NAME}State>({})

  useEffect(() => {
    // Initialize feature logic
  }, [])

  return {
    state,
    // Add methods here
  }
}
EOF

# 9. Create hooks index
cat > src/features/$FEATURE_NAME/hooks/index.ts << EOF
export * from './use${COMPONENT_NAME}'
EOF

# 10. Create a mock data file
cat > src/features/$FEATURE_NAME/mocks/index.ts << EOF
/**
 * Mock data for ${FEATURE_NAME} feature development and testing
 */

export const mock${COMPONENT_NAME}Data = {
  // Add mock data here
}
EOF

# 11. Create a basic test file
cat > src/features/$FEATURE_NAME/components/${COMPONENT_NAME}.test.tsx << EOF
import { render, screen } from '@testing-library/react'
import { ${COMPONENT_NAME} } from './${COMPONENT_NAME}'

describe('${COMPONENT_NAME}', () => {
  it('renders without crashing', () => {
    render(<${COMPONENT_NAME} />)
    expect(screen.getByText('${COMPONENT_NAME} Component')).toBeInTheDocument()
  })

  // Add more tests here
})
EOF

# 12. Report completion to the user.
echo "✅ Successfully created new feature module: $FEATURE_NAME"
echo ""
echo "📁 Created structure:"
echo "   src/features/$FEATURE_NAME/"
echo "   ├── claude.md"
echo "   ├── index.tsx"
echo "   ├── components/"
echo "   │   ├── index.ts"
echo "   │   ├── ${COMPONENT_NAME}.tsx"
echo "   │   └── ${COMPONENT_NAME}.test.tsx"
echo "   ├── hooks/"
echo "   │   ├── index.ts"
echo "   │   └── use${COMPONENT_NAME}.ts"
echo "   ├── types/"
echo "   │   └── index.ts"
echo "   ├── mocks/"
echo "   │   └── index.ts"
echo "   └── utils/"
echo ""
echo "🚀 Next steps:"
echo "   1. Update src/features/$FEATURE_NAME/claude.md with feature details"
echo "   2. Implement the ${COMPONENT_NAME} component"
echo "   3. Add feature-specific types and interfaces"
echo "   4. Write comprehensive tests"
```

## Command Metadata

- **Type**: Scaffolding
- **Category**: Development
- **Requires**: Bash environment
- **Safe**: Yes (only creates new files, doesn't modify existing ones)

## Example Usage

```bash
/new-feature order-tracking
# Creates: src/features/order-tracking/ with all necessary files

/new-feature "Customer Analytics"
# Creates: src/features/customer-analytics/ (converts to kebab-case)
```

## Integration with Multi-Agent Workflow

After running this command:
1. **Architect** can review and update the claude.md file
2. **Builder** can implement the component and hooks
3. **Validator** can write comprehensive tests
4. **Optimizer** can add performance enhancements
5. **Documenter** can enhance JSDoc comments