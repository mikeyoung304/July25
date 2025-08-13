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
- `UnifiedVoiceRecorder`: Voice recording accessibility with screen reader support
- `BaseOrderCard`: ARIA labels for order status and actions

### Voice Interface Accessibility
- **Visual indicators**: Recording status clearly shown with visual cues
- **Audio feedback**: OpenAI audio responses provide audible confirmation
- **Screen reader support**: Voice transcription results announced to screen readers
- **Keyboard alternatives**: All voice features have keyboard fallbacks
- **Error handling**: Clear error messages for microphone issues

## Testing

```bash
# Keyboard navigation
Tab through the entire app

# Screen reader (macOS)
Cmd+F5 to enable VoiceOver

# Contrast checker
Chrome DevTools > Lighthouse > Accessibility
```