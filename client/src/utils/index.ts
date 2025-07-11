// Consolidated utilities
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Style utilities
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Validation utilities (simplified - only what's actually used)
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/\0/g, '') // Remove null bytes
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .trim()
}

export const validateOrderNumber = (orderNumber: string): string | null => {
  const sanitized = sanitizeInput(orderNumber)
  return /^[A-Za-z0-9-]+$/.test(sanitized) && sanitized.length <= 20 ? sanitized : null
}

export const validateTableNumber = (tableNumber: string): string | null => {
  const sanitized = sanitizeInput(tableNumber)
  return /^[A-Za-z0-9]+$/.test(sanitized) && sanitized.length <= 10 ? sanitized : null
}

export const validateQuantity = (quantity: number): number | null => {
  return Number.isInteger(quantity) && quantity >= 1 && quantity <= 999 ? quantity : null
}

export const validatePrice = (price: number): number | null => {
  if (typeof price !== 'number' || price < 0 || isNaN(price) || price > 99999.99) {
    return null
  }
  return Math.round(price * 100) / 100
}

export const validateItemName = (itemName: string): string | null => {
  const sanitized = sanitizeInput(itemName)
  return /^[A-Za-z0-9\s\-,.'()&]+$/.test(sanitized) && sanitized.length <= 100 ? sanitized : null
}

export const validateModifiers = (modifiers: string[]): string[] => {
  return modifiers
    .map(modifier => {
      const sanitized = sanitizeInput(modifier)
      return /^[A-Za-z0-9\s\-,.'()]+$/.test(sanitized) && sanitized.length <= 50 ? sanitized : null
    })
    .filter((modifier): modifier is string => modifier !== null)
}

export const validateNotes = (notes: string): string | null => {
  const sanitized = sanitizeInput(notes)
  return /^[A-Za-z0-9\s\-,.!?'()&:;]+$/.test(sanitized) && sanitized.length <= 500 ? sanitized : null
}

// Security utilities
export const escapeHtml = (text: string): string => {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  }
  return text.replace(/[&<>"'/]/g, char => entities[char] || char)
}

// Simple rate limiter
export class RateLimiter {
  private attempts: number[] = []
  
  constructor(
    private maxAttempts: number,
    private windowMs: number
  ) {}
  
  canAttempt(): boolean {
    const now = Date.now()
    const windowStart = now - this.windowMs
    
    this.attempts = this.attempts.filter(timestamp => timestamp > windowStart)
    
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

// Generate cryptographically secure random token
const generateSecureToken = (length: number = 32): string => {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// CSRF token management (simplified)
export class CSRFTokenManager {
  private static TOKEN_KEY = 'csrf_token'
  private static TOKEN_HEADER = 'X-CSRF-Token'
  
  static generateToken(): string {
    const token = generateSecureToken()
    sessionStorage.setItem(this.TOKEN_KEY, token)
    return token
  }
  
  static getToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY)
  }
  
  static validateToken(token: string): boolean {
    const storedToken = this.getToken()
    return storedToken !== null && storedToken === token
  }
  
  static getHeader(): Record<string, string> {
    const token = this.getToken()
    if (!token) {
      throw new Error('CSRF token not found')
    }
    return { [this.TOKEN_HEADER]: token }
  }
}