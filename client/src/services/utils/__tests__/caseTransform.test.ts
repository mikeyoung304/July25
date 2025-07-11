import { toSnakeCase, toCamelCase, transformQueryParams } from '../caseTransform'

describe('caseTransform utilities', () => {
  describe('toSnakeCase', () => {
    it('should convert simple camelCase to snake_case', () => {
      expect(toSnakeCase({ firstName: 'John' })).toEqual({ first_name: 'John' })
      expect(toSnakeCase({ lastName: 'Doe' })).toEqual({ last_name: 'Doe' })
      expect(toSnakeCase({ phoneNumber: '123' })).toEqual({ phone_number: '123' })
    })

    it('should handle nested objects', () => {
      const input = {
        userProfile: {
          firstName: 'John',
          lastName: 'Doe',
          contactInfo: {
            phoneNumber: '123',
            emailAddress: 'john@example.com'
          }
        }
      }
      
      const expected = {
        user_profile: {
          first_name: 'John',
          last_name: 'Doe',
          contact_info: {
            phone_number: '123',
            email_address: 'john@example.com'
          }
        }
      }
      
      expect(toSnakeCase(input)).toEqual(expected)
    })

    it('should handle arrays', () => {
      const input = {
        orderItems: [
          { itemName: 'Burger', itemPrice: 10 },
          { itemName: 'Fries', itemPrice: 5 }
        ]
      }
      
      const expected = {
        order_items: [
          { item_name: 'Burger', item_price: 10 },
          { item_name: 'Fries', item_price: 5 }
        ]
      }
      
      expect(toSnakeCase(input)).toEqual(expected)
    })

    it('should preserve Date objects', () => {
      const date = new Date('2024-01-01')
      const input = { createdAt: date }
      const result = toSnakeCase(input)
      
      expect(result).toEqual({ created_at: date })
      expect((result as any).created_at).toBeInstanceOf(Date)
    })

    it('should handle null and undefined', () => {
      expect(toSnakeCase(null)).toBeNull()
      expect(toSnakeCase(undefined)).toBeUndefined()
      expect(toSnakeCase({ value: null })).toEqual({ value: null })
      expect(toSnakeCase({ value: undefined })).toEqual({ value: undefined })
    })

    it('should handle primitive values', () => {
      expect(toSnakeCase('string')).toBe('string')
      expect(toSnakeCase(123)).toBe(123)
      expect(toSnakeCase(true)).toBe(true)
    })
  })

  describe('toCamelCase', () => {
    it('should convert simple snake_case to camelCase', () => {
      expect(toCamelCase({ first_name: 'John' })).toEqual({ firstName: 'John' })
      expect(toCamelCase({ last_name: 'Doe' })).toEqual({ lastName: 'Doe' })
      expect(toCamelCase({ phone_number: '123' })).toEqual({ phoneNumber: '123' })
    })

    it('should handle nested objects', () => {
      const input = {
        user_profile: {
          first_name: 'John',
          last_name: 'Doe',
          contact_info: {
            phone_number: '123',
            email_address: 'john@example.com'
          }
        }
      }
      
      const expected = {
        userProfile: {
          firstName: 'John',
          lastName: 'Doe',
          contactInfo: {
            phoneNumber: '123',
            emailAddress: 'john@example.com'
          }
        }
      }
      
      expect(toCamelCase(input)).toEqual(expected)
    })

    it('should handle arrays', () => {
      const input = {
        order_items: [
          { item_name: 'Burger', item_price: 10 },
          { item_name: 'Fries', item_price: 5 }
        ]
      }
      
      const expected = {
        orderItems: [
          { itemName: 'Burger', itemPrice: 10 },
          { itemName: 'Fries', itemPrice: 5 }
        ]
      }
      
      expect(toCamelCase(input)).toEqual(expected)
    })

    it('should convert ISO date strings to Date objects', () => {
      const input = {
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-02T12:30:45.123Z'
      }
      
      const result = toCamelCase(input)
      
      expect((result as any).createdAt).toBeInstanceOf(Date)
      expect((result as any).updatedAt).toBeInstanceOf(Date)
      expect((result as any).createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z')
      expect((result as any).updatedAt.toISOString()).toBe('2024-01-02T12:30:45.123Z')
    })

    it('should handle null and undefined', () => {
      expect(toCamelCase(null)).toBeNull()
      expect(toCamelCase(undefined)).toBeUndefined()
      expect(toCamelCase({ value: null })).toEqual({ value: null })
      expect(toCamelCase({ value: undefined })).toEqual({ value: undefined })
    })
  })

  describe('transformQueryParams', () => {
    it('should transform query parameter keys to snake_case', () => {
      const input = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '123'
      }
      
      const expected = {
        first_name: 'John',
        last_name: 'Doe',
        phone_number: '123'
      }
      
      expect(transformQueryParams(input)).toEqual(expected)
    })

    it('should filter out null and undefined values', () => {
      const input = {
        firstName: 'John',
        lastName: null,
        phoneNumber: undefined,
        email: 'john@example.com'
      }
      
      const expected = {
        first_name: 'John',
        email: 'john@example.com'
      }
      
      expect(transformQueryParams(input)).toEqual(expected)
    })

    it('should not deep transform values', () => {
      const input = {
        filterOptions: { sortBy: 'createdAt' }
      }
      
      const result = transformQueryParams(input)
      
      expect(result).toEqual({
        filter_options: { sortBy: 'createdAt' } // Value not transformed
      })
    })
  })

  describe('round-trip conversions', () => {
    it('should maintain data integrity in round-trip conversion', () => {
      const original = {
        restaurantId: 'rest-1',
        orderNumber: '001',
        tableNumber: '5',
        orderItems: [
          {
            itemId: 'item-1',
            itemName: 'Burger',
            modifierList: ['no-onions', 'extra-cheese']
          }
        ],
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        totalAmount: 25.99,
        isActive: true
      }
      
      const snakeCase = toSnakeCase(original)
      const backToCamel = toCamelCase(snakeCase)
      
      expect(backToCamel).toEqual(original)
    })
  })
})