import {
  escapeHtml,
  sanitizeInput,
  validateOrderNumber,
  validateTableNumber,
  validateItemName,
  validateModifiers,
  validateNotes,
  validateQuantity,
  validatePrice,
  validateEmail,
  validatePhoneNumber,
  validateSearchQuery,
  RateLimiter
} from '../validation'

describe('Validation Utilities', () => {
  describe('escapeHtml', () => {
    it('escapes HTML entities', () => {
      expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
      )
      expect(escapeHtml("O'Neill's")).toBe("O&#x27;Neill&#x27;s")
      expect(escapeHtml('Fish & Chips')).toBe('Fish &amp; Chips')
      expect(escapeHtml('<a href="/test">Link</a>')).toBe(
        '&lt;a href=&quot;&#x2F;test&quot;&gt;Link&lt;&#x2F;a&gt;'
      )
    })

    it('returns normal text unchanged', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World')
      expect(escapeHtml('123-456')).toBe('123-456')
    })
  })

  describe('sanitizeInput', () => {
    it('removes script tags', () => {
      expect(sanitizeInput('<script>alert("XSS")</script>Hello')).toBe('Hello')
      expect(sanitizeInput('Hello<script src="evil.js"></script>World')).toBe('HelloWorld')
    })

    it('removes event handlers', () => {
      expect(sanitizeInput('<img src="x" onerror="alert(1)">')).toBe('<img src="x" >')
      expect(sanitizeInput('<div onclick="doEvil()">Click</div>')).toBe('<div >Click</div>')
    })

    it('removes javascript: URLs', () => {
      expect(sanitizeInput('<a href="javascript:alert(1)">Link</a>')).toBe('<a href="alert(1)">Link</a>')
    })

    it('removes null bytes', () => {
      expect(sanitizeInput('Hello\0World')).toBe('HelloWorld')
    })

    it('trims whitespace', () => {
      expect(sanitizeInput('  Hello World  ')).toBe('Hello World')
    })
  })

  describe('validateOrderNumber', () => {
    it('accepts valid order numbers', () => {
      expect(validateOrderNumber('001')).toBe('001')
      expect(validateOrderNumber('ABC-123')).toBe('ABC-123')
      expect(validateOrderNumber('ORDER2024')).toBe('ORDER2024')
    })

    it('rejects invalid order numbers', () => {
      expect(validateOrderNumber('001!')).toBeNull()
      expect(validateOrderNumber('ORDER#123')).toBeNull()
      expect(validateOrderNumber('<script>')).toBeNull()
      expect(validateOrderNumber('A'.repeat(21))).toBeNull() // Too long
    })

    it('sanitizes input before validation', () => {
      expect(validateOrderNumber('  001  ')).toBe('001')
    })
  })

  describe('validateTableNumber', () => {
    it('accepts valid table numbers', () => {
      expect(validateTableNumber('1')).toBe('1')
      expect(validateTableNumber('A12')).toBe('A12')
      expect(validateTableNumber('VIP1')).toBe('VIP1')
    })

    it('rejects invalid table numbers', () => {
      expect(validateTableNumber('Table 1')).toBeNull() // Space not allowed
      expect(validateTableNumber('1-A')).toBeNull() // Dash not allowed
      expect(validateTableNumber('12345678901')).toBeNull() // Too long
    })
  })

  describe('validateItemName', () => {
    it('accepts valid item names', () => {
      expect(validateItemName('Cheeseburger')).toBe('Cheeseburger')
      expect(validateItemName('Fish & Chips')).toBe('Fish & Chips')
      expect(validateItemName("Caesar's Salad")).toBe("Caesar's Salad")
      expect(validateItemName('Pizza (Large)')).toBe('Pizza (Large)')
      expect(validateItemName('Combo #1')).toBeNull() // # not allowed
    })

    it('rejects invalid item names', () => {
      expect(validateItemName('<script>alert(1)</script>')).toBeNull()
      expect(validateItemName('Item@Price')).toBeNull()
      expect(validateItemName('A'.repeat(101))).toBeNull() // Too long
    })
  })

  describe('validateModifiers', () => {
    it('validates array of modifiers', () => {
      const modifiers = ['Extra cheese', 'No onions', 'Well-done']
      const validated = validateModifiers(modifiers)
      expect(validated).toEqual(modifiers)
    })

    it('filters out invalid modifiers', () => {
      const modifiers = ['Extra cheese', '<script>bad</script>', 'No onions!']
      const validated = validateModifiers(modifiers)
      expect(validated).toEqual(['Extra cheese'])
    })

    it('handles empty array', () => {
      expect(validateModifiers([])).toEqual([])
    })
  })

  describe('validateNotes', () => {
    it('accepts valid notes', () => {
      expect(validateNotes('Please cook well done')).toBe('Please cook well done')
      expect(validateNotes('Allergic to nuts!')).toBe('Allergic to nuts!')
      expect(validateNotes('Table 5: Birthday celebration')).toBe('Table 5: Birthday celebration')
    })

    it('rejects invalid notes', () => {
      expect(validateNotes('Note with <script>')).toBeNull()
      expect(validateNotes('Note@email.com')).toBeNull()
      expect(validateNotes('A'.repeat(501))).toBeNull() // Too long
    })
  })

  describe('validateQuantity', () => {
    it('accepts valid quantities', () => {
      expect(validateQuantity(1)).toBe(1)
      expect(validateQuantity(10)).toBe(10)
      expect(validateQuantity(999)).toBe(999)
    })

    it('rejects invalid quantities', () => {
      expect(validateQuantity(0)).toBeNull()
      expect(validateQuantity(-1)).toBeNull()
      expect(validateQuantity(1.5)).toBeNull() // Not integer
      expect(validateQuantity(1000)).toBeNull() // Too large
    })
  })

  describe('validatePrice', () => {
    it('accepts valid prices', () => {
      expect(validatePrice(9.99)).toBe(9.99)
      expect(validatePrice(0)).toBe(0)
      expect(validatePrice(1234.56)).toBe(1234.56)
    })

    it('rounds to 2 decimal places', () => {
      expect(validatePrice(9.999)).toBe(10)
      expect(validatePrice(9.994)).toBe(9.99)
    })

    it('rejects invalid prices', () => {
      expect(validatePrice(-1)).toBeNull()
      expect(validatePrice(100000)).toBeNull() // Too large
      expect(validatePrice(NaN)).toBeNull()
    })
  })

  describe('validateEmail', () => {
    it('accepts valid emails', () => {
      expect(validateEmail('user@example.com')).toBe('user@example.com')
      expect(validateEmail('USER@EXAMPLE.COM')).toBe('user@example.com') // Lowercase
      expect(validateEmail('user+tag@example.co.uk')).toBe('user+tag@example.co.uk')
    })

    it('rejects invalid emails', () => {
      expect(validateEmail('not-an-email')).toBeNull()
      expect(validateEmail('@example.com')).toBeNull()
      expect(validateEmail('user@')).toBeNull()
      expect(validateEmail('user @example.com')).toBeNull()
      expect(validateEmail('a'.repeat(255) + '@example.com')).toBeNull() // Too long
    })

    it('sanitizes input', () => {
      expect(validateEmail('  user@example.com  ')).toBe('user@example.com')
    })
  })

  describe('validatePhoneNumber', () => {
    it('accepts valid phone numbers', () => {
      expect(validatePhoneNumber('1234567890')).toBe('1234567890')
      expect(validatePhoneNumber('+1 (555) 123-4567')).toBe('15551234567')
      expect(validatePhoneNumber('555.123.4567')).toBe('5551234567')
    })

    it('rejects invalid phone numbers', () => {
      expect(validatePhoneNumber('123')).toBeNull() // Too short
      expect(validatePhoneNumber('1234567890123456')).toBeNull() // Too long
      expect(validatePhoneNumber('abc-def-ghij')).toBeNull()
    })
  })

  describe('validateSearchQuery', () => {
    it('sanitizes search queries', () => {
      expect(validateSearchQuery('pizza')).toBe('pizza')
      expect(validateSearchQuery('fish & chips')).toBe('fish & chips')
    })

    it('removes regex special characters', () => {
      expect(validateSearchQuery('pizza.*')).toBe('pizza')
      expect(validateSearchQuery('item[0-9]+')).toBe('item0-9')
      expect(validateSearchQuery('price$10')).toBe('price10')
    })

    it('limits length', () => {
      const longQuery = 'a'.repeat(150)
      expect(validateSearchQuery(longQuery)).toHaveLength(100)
    })
  })

  describe('RateLimiter', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('allows requests within limit', () => {
      const limiter = new RateLimiter(3, 60000)
      
      expect(limiter.canAttempt()).toBe(true)
      expect(limiter.canAttempt()).toBe(true)
      expect(limiter.canAttempt()).toBe(true)
      expect(limiter.canAttempt()).toBe(false)
    })

    it('resets after time window', () => {
      const limiter = new RateLimiter(2, 60000)
      
      expect(limiter.canAttempt()).toBe(true)
      expect(limiter.canAttempt()).toBe(true)
      expect(limiter.canAttempt()).toBe(false)
      
      // Advance time past the window
      jest.advanceTimersByTime(60001)
      
      expect(limiter.canAttempt()).toBe(true)
    })

    it('handles partial window expiry', () => {
      const limiter = new RateLimiter(3, 60000)
      
      expect(limiter.canAttempt()).toBe(true)
      
      jest.advanceTimersByTime(30000)
      expect(limiter.canAttempt()).toBe(true)
      
      jest.advanceTimersByTime(30001)
      // First attempt should be expired now
      expect(limiter.canAttempt()).toBe(true)
      expect(limiter.canAttempt()).toBe(true)
      expect(limiter.canAttempt()).toBe(false)
    })

    it('can be reset manually', () => {
      const limiter = new RateLimiter(2, 60000)
      
      expect(limiter.canAttempt()).toBe(true)
      expect(limiter.canAttempt()).toBe(true)
      expect(limiter.canAttempt()).toBe(false)
      
      limiter.reset()
      
      expect(limiter.canAttempt()).toBe(true)
      expect(limiter.canAttempt()).toBe(true)
    })
  })
})