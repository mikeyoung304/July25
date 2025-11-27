import { describe, it, expect } from 'vitest'
import {
  formatOrderNumber,
  getModifierType,
  getCardSize,
  getDisplayCustomerName,
  getOrderPrimaryLabel,
  CARD_SIZING_CONFIG,
  GUEST_CUSTOMER_NAME
} from '../kds'

describe('formatOrderNumber', () => {
  it('extracts last segment from hyphenated order number', () => {
    expect(formatOrderNumber('20251105-0004')).toBe('0004')
    expect(formatOrderNumber('ABC-123-0042')).toBe('0042')
  })

  it('pads short numbers to 4 digits', () => {
    expect(formatOrderNumber('20251105-4')).toBe('0004')
    expect(formatOrderNumber('20251105-42')).toBe('0042')
  })

  it('handles order numbers without hyphens', () => {
    expect(formatOrderNumber('0004')).toBe('0004')
    expect(formatOrderNumber('42')).toBe('0042')
  })

  it('returns 0000 for empty/null input', () => {
    expect(formatOrderNumber('')).toBe('0000')
  })
})

describe('getModifierType', () => {
  describe('allergy detection (SAFETY CRITICAL)', () => {
    it('detects explicit allergy keywords', () => {
      expect(getModifierType('Gluten allergy')).toBe('allergy')
      expect(getModifierType('PEANUT ALLERGY')).toBe('allergy')
      expect(getModifierType('allergic to dairy')).toBe('allergy')
    })

    it('detects all common allergens', () => {
      // These 8 keywords must all be detected - food safety critical
      expect(getModifierType('allergy warning')).toBe('allergy')
      expect(getModifierType('allergic reaction')).toBe('allergy')
      expect(getModifierType('gluten free please')).toBe('allergy')
      expect(getModifierType('no dairy - intolerant')).toBe('allergy')
      expect(getModifierType('nut free')).toBe('allergy')
      expect(getModifierType('no peanuts')).toBe('allergy')
      expect(getModifierType('shellfish allergy')).toBe('allergy')
      expect(getModifierType('celiac disease')).toBe('allergy')
    })

    it('prioritizes allergy over other types', () => {
      // "No gluten" starts with removal keyword but contains allergy keyword
      expect(getModifierType('No gluten - allergy')).toBe('allergy')
      expect(getModifierType('Extra careful - nut allergy')).toBe('allergy')
    })
  })

  describe('allergy detection - FDA Top 9 coverage (FOOD SAFETY CRITICAL)', () => {
    // Current ALLERGY_KEYWORDS: allergy, allergic, gluten, dairy, nut, peanut, shellfish, celiac

    it('detects common allergen-related terms', () => {
      // These should all be detected as allergies
      expect(getModifierType('milk allergy')).toBe('allergy')
      expect(getModifierType('egg allergy')).toBe('allergy')
      expect(getModifierType('fish allergy')).toBe('allergy')
      expect(getModifierType('soy allergy')).toBe('allergy')
      expect(getModifierType('wheat allergy')).toBe('allergy')
      expect(getModifierType('sesame allergy')).toBe('allergy')
    })

    it('handles case insensitivity robustly', () => {
      expect(getModifierType('PEANUT ALLERGY')).toBe('allergy')
      expect(getModifierType('Gluten Free')).toBe('allergy')
      expect(getModifierType('NUT ALLERGY')).toBe('allergy')
      expect(getModifierType('Celiac Disease')).toBe('allergy')
    })

    it('detects allergen-free requests', () => {
      expect(getModifierType('gluten free')).toBe('allergy')
      expect(getModifierType('dairy free')).toBe('allergy')
      expect(getModifierType('nut free')).toBe('allergy')
    })

    it('detects dairy-related keywords via "dairy" keyword', () => {
      // 'dairy' keyword catches lactose mentions
      expect(getModifierType('lactose intolerant')).toBe('default') // 'intolerant' not in ALLERGY_KEYWORDS
      expect(getModifierType('no dairy - lactose issue')).toBe('allergy') // 'dairy' keyword
      expect(getModifierType('dairy allergy')).toBe('allergy')
    })
  })

  describe('allergy detection - false positive prevention', () => {
    it('matches allergen keywords as substrings (current behavior)', () => {
      // NOTE: Current implementation uses .includes() which matches substrings
      // This means 'nut' will match 'donut', 'coconut', 'minute', etc.
      // These are acceptable false positives for food safety (better safe than sorry)
      expect(getModifierType('minute rice')).toBe('allergy') // contains 'nut' - detected
      expect(getModifierType('coconut milk')).toBe('allergy') // contains 'nut' - detected
      expect(getModifierType('donut holes')).toBe('allergy') // contains 'nut' - detected
    })

    it('avoids false positives for non-food-related terms', () => {
      // Words that don't contain any allergen keywords should be default
      expect(getModifierType('medium rare')).toBe('temperature') // handled by temp keywords
      expect(getModifierType('extra sauce')).toBe('addition') // handled by addition keywords
      expect(getModifierType('light ice')).toBe('default') // no keywords matched
    })
  })

  describe('removal detection', () => {
    it('detects removal keywords at start', () => {
      expect(getModifierType('No onions')).toBe('removal')
      expect(getModifierType('without pickles')).toBe('removal')
      expect(getModifierType('remove tomato')).toBe('removal')
      expect(getModifierType('hold the mayo')).toBe('removal')
    })

    it('does not match removal in middle of string', () => {
      expect(getModifierType('say no to waste')).toBe('default')
    })
  })

  describe('addition detection', () => {
    it('detects addition keywords at start', () => {
      expect(getModifierType('Extra cheese')).toBe('addition')
      expect(getModifierType('Add bacon')).toBe('addition')
      expect(getModifierType('Double meat')).toBe('addition')
      expect(getModifierType('Triple shot')).toBe('addition')
      expect(getModifierType('more sauce')).toBe('addition')
    })
  })

  describe('temperature detection', () => {
    it('detects cooking temperatures', () => {
      expect(getModifierType('Medium rare')).toBe('temperature')
      expect(getModifierType('Well done')).toBe('temperature')
      expect(getModifierType('Rare steak')).toBe('temperature')
      // Note: "Extra hot" matches addition keyword first (priority order)
      expect(getModifierType('Hot soup')).toBe('temperature')
      expect(getModifierType('Served cold')).toBe('temperature')
    })
  })

  describe('substitution detection', () => {
    it('detects substitution keywords', () => {
      expect(getModifierType('Sub fries for salad')).toBe('substitution')
      expect(getModifierType('Substitute oat milk')).toBe('substitution')
      expect(getModifierType('Swap bun for lettuce')).toBe('substitution')
      expect(getModifierType('instead of rice')).toBe('substitution')
    })
  })

  describe('default fallback', () => {
    it('returns default for unrecognized modifiers', () => {
      expect(getModifierType('Light ice')).toBe('default')
      expect(getModifierType('On the side')).toBe('default')
      expect(getModifierType('Split in half')).toBe('default')
    })
  })
})

describe('getCardSize', () => {
  it('returns standard for simple orders (complexity <= 5)', () => {
    expect(getCardSize(1, 0)).toBe('standard')
    expect(getCardSize(3, 2)).toBe('standard') // 3 + 0.6 = 3.6
    expect(getCardSize(5, 0)).toBe('standard')
  })

  it('returns wide for medium orders (complexity 5-10)', () => {
    expect(getCardSize(6, 0)).toBe('wide')
    expect(getCardSize(5, 5)).toBe('wide')  // 5 + 1.5 = 6.5
    expect(getCardSize(8, 5)).toBe('wide')  // 8 + 1.5 = 9.5
  })

  it('returns large for complex orders (complexity > 10)', () => {
    expect(getCardSize(10, 5)).toBe('large')  // 10 + 1.5 = 11.5
    expect(getCardSize(15, 0)).toBe('large')
    expect(getCardSize(8, 10)).toBe('large') // 8 + 3 = 11
  })

  it('weights modifiers at configured weight', () => {
    // 5 items + 0 mods = 5.0 (standard)
    // 5 items + 1 mod = 5.3 (wide - just over threshold)
    expect(getCardSize(5, 0)).toBe('standard')
    expect(getCardSize(5, 1)).toBe('wide')
  })

  it('uses config values for thresholds', () => {
    // Verify config is being used
    expect(CARD_SIZING_CONFIG.MODIFIER_WEIGHT).toBe(0.3)
    expect(CARD_SIZING_CONFIG.STANDARD_MAX_COMPLEXITY).toBe(5)
    expect(CARD_SIZING_CONFIG.WIDE_MAX_COMPLEXITY).toBe(10)
  })
})

describe('getDisplayCustomerName', () => {
  it('returns last name from full name', () => {
    expect(getDisplayCustomerName('John Smith')).toBe('Smith')
    expect(getDisplayCustomerName('Mary Jane Watson')).toBe('Watson')
  })

  it('returns single name as-is', () => {
    expect(getDisplayCustomerName('Madonna')).toBe('Madonna')
    expect(getDisplayCustomerName('Prince')).toBe('Prince')
  })

  it('returns null for Guest placeholder', () => {
    expect(getDisplayCustomerName('Guest')).toBeNull()
    expect(getDisplayCustomerName(GUEST_CUSTOMER_NAME)).toBeNull()
  })

  it('returns null for empty/null input', () => {
    expect(getDisplayCustomerName('')).toBeNull()
    expect(getDisplayCustomerName(null)).toBeNull()
    expect(getDisplayCustomerName(undefined)).toBeNull()
  })

  it('trims whitespace', () => {
    expect(getDisplayCustomerName('  John Smith  ')).toBe('Smith')
    expect(getDisplayCustomerName('  Guest  ')).toBeNull()
  })
})

describe('getOrderPrimaryLabel', () => {
  it('prioritizes table number when present', () => {
    expect(getOrderPrimaryLabel(5, 'John Smith', '20251105-0004')).toBe('Table 5')
    expect(getOrderPrimaryLabel('7', null, '20251105-0004')).toBe('Table 7')
  })

  it('uses customer name when no table', () => {
    expect(getOrderPrimaryLabel(null, 'John Smith', '20251105-0004')).toBe('Smith')
  })

  it('falls back to order number when no table or valid customer', () => {
    expect(getOrderPrimaryLabel(null, null, '20251105-0004')).toBe('Order #0004')
    expect(getOrderPrimaryLabel(null, 'Guest', '20251105-0004')).toBe('Order #0004')
    expect(getOrderPrimaryLabel(undefined, undefined, '20251105-0004')).toBe('Order #0004')
  })

  it('handles edge cases', () => {
    // Table 0 is falsy so falls through to customer name
    expect(getOrderPrimaryLabel(0, 'John', '0004')).toBe('John')
    // Empty string table also falsy - uses customer name
    expect(getOrderPrimaryLabel('', 'John', '0004')).toBe('John')
  })
})
