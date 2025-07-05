# AI Bloat Patterns to Detect

## Common AI Over-Engineering Patterns

### 1. Excessive Comments
```typescript
// BAD: AI tends to over-comment
/**
 * This function adds two numbers together
 * @param a - The first number to add
 * @param b - The second number to add  
 * @returns The sum of a and b
 */
const add = (a: number, b: number): number => {
  // Add the numbers and return the result
  return a + b;
}

// GOOD: Let code speak for itself
const add = (a: number, b: number) => a + b;
```

### 2. Unnecessary Abstractions
```typescript
// BAD: Creating abstractions for single use
interface IOrderNumberProps {
  value: string;
}
const OrderNumber: React.FC<IOrderNumberProps> = ({ value }) => <span>{value}</span>;

// GOOD: Inline simple components
<span>{orderNumber}</span>
```

### 3. Defensive Overkill
```typescript
// BAD: Checking everything
if (value !== null && value !== undefined && typeof value === 'string' && value.length > 0) {
  
// GOOD: Trust TypeScript
if (value) {
```

### 4. Verbose Type Annotations
```typescript
// BAD: Annotating what TS infers
const isReady: boolean = status === 'ready';
const items: OrderItem[] = [];

// GOOD: Let TS infer
const isReady = status === 'ready';
const items = [];
```

### 5. Factory Pattern Abuse
```typescript
// BAD: Factories for everything
class ServiceFactory {
  static createOrderService(): IOrderService {
    return new OrderService();
  }
}

// GOOD: Direct instantiation
export const orderService = new OrderService();
```

### 6. Interface Segregation Overkill
```typescript
// BAD: Interface for every prop combination
interface IButtonProps { }
interface IButtonWithIconProps extends IButtonProps { }
interface IButtonWithLoadingProps extends IButtonProps { }

// GOOD: Single flexible interface
interface ButtonProps {
  icon?: ReactNode;
  loading?: boolean;
}
```

## Detection Commands

```bash
# Find excessive comments
rg "^\s*//" --type ts --type tsx | wc -l

# Find trivial interfaces  
rg "interface.*\{[\s]*\}" --type ts

# Find over-annotated code
rg ": (string|number|boolean) =" --type ts

# Find unnecessary factories
rg "Factory|factory" --type ts

# Find micro-components (< 10 lines)
find src -name "*.tsx" -exec wc -l {} \; | sort -n | head -20
```