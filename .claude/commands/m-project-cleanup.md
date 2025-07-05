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
Agent V ensures quality:
1. Run all tests
2. Check type safety
3. Verify bundle size
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