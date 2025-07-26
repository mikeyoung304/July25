# Accessibility Features

## Implemented

### Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to activate buttons
- Escape to close modals
- Arrow keys in dropdowns

### Screen Reader Support
- ARIA labels on buttons and form controls
- Live regions for order status updates
- Descriptive alt text for icons

### Visual Design
- WCAG AA color contrast ratios
- Focus indicators on all interactive elements
- Readable font sizes (min 14px)
- No color-only information

### Components
- `IconButton`: Built-in aria-label support
- `StatusBadge`: Screen reader announcements
- `LoadingSpinner`: aria-busy indicators
- `ErrorDisplay`: Role="alert" for errors

## Testing

```bash
# Keyboard navigation
Tab through the entire app

# Screen reader (macOS)
Cmd+F5 to enable VoiceOver

# Contrast checker
Chrome DevTools > Lighthouse > Accessibility
```