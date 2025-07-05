# Multi-Agent Project Cleanup Workflow

## Overview
This workflow orchestrates a comprehensive project cleanup focusing on removing dead code, consolidating redundant patterns, and optimizing the codebase structure.

## Agent Roles

### Agent A (Analyzer)
- Scans codebase for bloat patterns
- Identifies dead code and redundancies
- Maps component relationships
- Reports metrics and opportunities

### Agent C (Cleaner)
- Executes cleanup operations
- Merges micro-components
- Removes unused code
- Consolidates patterns

### Agent V (Validator)
- Runs tests after each change
- Ensures no breaking changes
- Validates bundle size improvements
- Confirms functionality preserved

## Workflow Execution

### Phase 1: Analysis
Agent A performs comprehensive scan:
1. Identify files < 50 lines
2. Find duplicate patterns
3. Detect unused exports
4. Map component dependencies
5. Calculate potential savings

### Phase 2: Cleanup Plan
Agent A creates prioritized cleanup list:
1. Quick wins (micro-components)
2. Pattern consolidations
3. Dead code removal
4. Structure optimization

### Phase 3: Implementation
Agent C executes cleanup:
1. Merge micro-components
2. Consolidate duplicate hooks
3. Remove unused code
4. Update imports

### Phase 4: Validation
Agent V validates changes:
1. Run typecheck and linting
2. Execute test suite
3. Verify imports resolved
4. Check bundle size

### Phase 5: Deep Verification (NEW)
All agents collaborate:

**Agent A - Mistake Detection:**
1. Scan for broken imports/exports
2. Find missing type definitions  
3. Detect removed functionality
4. Check for circular dependencies
5. Validate service integrations

**Agent C - AI Bloat Detection:**
1. Overly verbose comments
2. Unnecessary abstractions
3. Complex solutions for simple problems
4. Redundant type annotations
5. Over-engineered error handling
6. Excessive defensive programming

**Agent V - Runtime Verification:**
1. Component render tests
2. Service method calls
3. Hook functionality
4. State management
5. Event handler bindings

### Phase 6: Report Generation
Agent A generates comprehensive report:
1. Issues found and fixed
2. AI bloat removed  
3. Performance improvements
4. Risk assessment
5. Recommendations
4. Confirm no regressions

## Success Criteria
- All tests passing
- No functionality lost
- Measurable file reduction
- Improved code clarity

## Output Format
```json
{
  "summary": {
    "filesRemoved": number,
    "linesReduced": number,
    "bundleSizeReduction": string,
    "patternsConsolidated": number
  },
  "changes": [...],
  "metrics": {...}
}
```