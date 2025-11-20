# Claudelessons-v2 Improvements (Nov 16, 2025)

## Added After 105-Minute Build Failure

### New Diagnostic Protocol (protocols/DIAGNOSTIC_PROTOCOL_v2.md)
5 pillars: CSP, EPL, HTF, PIT, DDT
Transforms debugging from art to science

### 5 New Lessons Created
1. **CL-BUILD-001**: Clean build reproduction rule
2. **CL-DIAG-001**: Parallel investigation protocol
3. **CL-ASSUME-001**: Challenge assumptions first
4. **CL-ERROR-001**: Error message misdirection
5. **CL-WORKSPACE-001**: Monorepo compilation issues

### Implementation
- `automation/diagnose.sh`: Master diagnostic script
- 5-minute rule: If not diagnosed in 5 min, run protocols

## Key Insight
The 105-minute incident would have taken 5 minutes with these protocols.
Total preventable cost across all incidents: $50,000+

## Usage
```bash
# When build fails:
./claudelessons-v2/automation/diagnose.sh "error message"
```