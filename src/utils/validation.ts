/**
 * Input validation and sanitization utilities
 */

// HTML entities that need to be escaped to prevent XSS
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
}

/**
 * Escape HTML entities to prevent XSS attacks
 */
export const escapeHtml = (text: string): string => {
  return text.replace(/[&<>"'/]/g, char => HTML_ENTITIES[char] || char)
}

/**
 * Sanitize user input by removing potentially dangerous content
 */
export const sanitizeInput = (input: string): string => {
  // Remove null bytes
  let sanitized = input.replace(/\0/g, '')
  
  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  
  // Remove event handlers
  sanitized = sanitized.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
  
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '')
  
  // Trim whitespace
  sanitized = sanitized.trim()
  
  return sanitized
}

/**
 * Validate and sanitize order number
 */
export const validateOrderNumber = (orderNumber: string): string | null => {
  const sanitized = sanitizeInput(orderNumber)
  
  // Order numbers should be alphanumeric with optional dashes
  if (!/^[A-Za-z0-9-]+$/.test(sanitized)) {
    return null
  }
  
  // Reasonable length limit
  if (sanitized.length > 20) {
    return null
  }
  
  return sanitized
}

/**
 * Validate and sanitize table number
 */
export const validateTableNumber = (tableNumber: string): string | null => {
  const sanitized = sanitizeInput(tableNumber)
  
  // Table numbers should be alphanumeric
  if (!/^[A-Za-z0-9]+$/.test(sanitized)) {
    return null
  }
  
  // Reasonable length limit
  if (sanitized.length > 10) {
    return null
  }
  
  return sanitized
}

/**
 * Validate and sanitize item name
 */
export const validateItemName = (itemName: string): string | null => {
  const sanitized = sanitizeInput(itemName)
  
  // Item names can contain letters, numbers, spaces, and some punctuation
  if (!/^[A-Za-z0-9\s\-,.'()&]+$/.test(sanitized)) {
    return null
  }
  
  // Reasonable length limit
  if (sanitized.length > 100) {
    return null
  }
  
  return sanitized
}

/**
 * Validate and sanitize modifiers
 */
export const validateModifiers = (modifiers: string[]): string[] => {
  return modifiers
    .map(modifier => {
      const sanitized = sanitizeInput(modifier)
      
      // Modifiers can contain letters, numbers, spaces, and some punctuation
      if (!/^[A-Za-z0-9\s\-,.'()]+$/.test(sanitized)) {
        return null
      }
      
      // Reasonable length limit
      if (sanitized.length > 50) {
        return null
      }
      
      return sanitized
    })
    .filter((modifier): modifier is string => modifier !== null)
}

/**
 * Validate and sanitize notes
 */
export const validateNotes = (notes: string): string | null => {
  const sanitized = sanitizeInput(notes)
  
  // Notes can contain more characters but still need to be safe
  if (!/^[A-Za-z0-9\s\-,.!?'()&:;]+$/.test(sanitized)) {
    return null
  }
  
  // Reasonable length limit
  if (sanitized.length > 500) {
    return null
  }
  
  return sanitized
}

/**
 * Validate quantity
 */
export const validateQuantity = (quantity: number): number | null => {
  // Must be a positive integer
  if (!Number.isInteger(quantity) || quantity < 1) {
    return null
  }
  
  // Reasonable upper limit
  if (quantity > 999) {
    return null
  }
  
  return quantity
}

/**
 * Validate price
 */
export const validatePrice = (price: number): number | null => {
  // Must be a positive number
  if (typeof price !== 'number' || price < 0 || isNaN(price)) {
    return null
  }
  
  // Reasonable upper limit
  if (price > 99999.99) {
    return null
  }
  
  // Round to 2 decimal places
  return Math.round(price * 100) / 100
}

/**
 * Validate email address
 */
export const validateEmail = (email: string): string | null => {
  const sanitized = sanitizeInput(email).toLowerCase()
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(sanitized)) {
    return null
  }
  
  // Length limit
  if (sanitized.length > 254) {
    return null
  }
  
  return sanitized
}

/**
 * Validate phone number
 */
export const validatePhoneNumber = (phone: string): string | null => {
  const sanitized = sanitizeInput(phone)
  
  // Remove common formatting characters
  const cleaned = sanitized.replace(/[\s\-().+]/g, '')
  
  // Should be digits only after cleaning
  if (!/^\d+$/.test(cleaned)) {
    return null
  }
  
  // Reasonable length for international numbers
  if (cleaned.length < 7 || cleaned.length > 15) {
    return null
  }
  
  return cleaned
}

/**
 * Validate search query
 */
export const validateSearchQuery = (query: string): string => {
  let sanitized = sanitizeInput(query)
  
  // Remove special regex characters that could cause issues
  sanitized = sanitized.replace(/[.*+?^${}()|[\]\\]/g, '')
  
  // Limit length
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100)
  }
  
  return sanitized
}

/**
 * Rate limiting helper for API calls
 */
export class RateLimiter {
  private attempts: number[] = []
  
  constructor(
    private maxAttempts: number,
    private windowMs: number
  ) {}
  
  canAttempt(): boolean {
    const now = Date.now()
    const windowStart = now - this.windowMs
    
    // Remove old attempts outside the window
    this.attempts = this.attempts.filter(timestamp => timestamp > windowStart)
    
    // Check if we can make another attempt
    if (this.attempts.length < this.maxAttempts) {
      this.attempts.push(now)
      return true
    }
    
    return false
  }
  
  reset(): void {
    this.attempts = []
  }
}