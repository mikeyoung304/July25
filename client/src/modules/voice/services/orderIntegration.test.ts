import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseVoiceOrder } from './orderIntegration'

// Mock the menu service
vi.mock('@/services/menu/MenuService', () => ({
  menuService: {
    getMenu: vi.fn()
  }
}))

// Mock logger
vi.mock('@/services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

describe('parseVoiceOrder', () => {
  beforeEach(async () => {
    // Reset mocks before each test
    vi.clearAllMocks()

    // Import and mock menu items for voice matching
    const { menuService } = await import('@/services/menu/MenuService')
    vi.mocked(menuService.getMenu).mockResolvedValue({
      items: [
        { id: '1', name: 'Soul Bowl', description: 'Soul food bowl', price: 12.99, isAvailable: true, category: 'Bowls' },
        { id: '2', name: 'Greek Bowl', description: 'Mediterranean bowl', price: 11.99, isAvailable: true, category: 'Bowls' },
        { id: '3', name: 'Summer Salad', description: 'Fresh summer salad', price: 9.99, isAvailable: true, category: 'Salads' },
        { id: '4', name: 'Greek Salad', description: 'Traditional Greek salad', price: 8.99, isAvailable: true, category: 'Salads' },
        { id: '5', name: 'Chicken Fajita Keto', description: 'Keto fajita', price: 13.99, isAvailable: true, category: 'Keto' },
        { id: '6', name: 'Peach Arugula Salad', description: 'Peach and arugula', price: 10.99, isAvailable: true, category: 'Salads' },
        { id: '7', name: 'Veggie Plate', description: 'Vegetable plate', price: 11.99, isAvailable: true, category: 'Plates' }
      ] as any
    })
  })

  it('parses a simple soul bowl order', async () => {
    const transcription = "I'd like a soul bowl please"
    const result = await parseVoiceOrder(transcription)

    expect(result).toEqual(expect.objectContaining({
      items: expect.arrayContaining([
        expect.objectContaining({ name: 'Soul Bowl', quantity: 1, modifiers: [] })
      ]),
      specialRequests: undefined,
      orderType: 'dine-in'
    }))
  })

  it('parses order with quantity', async () => {
    const transcription = "I want 2 greek bowls and 3 summer salads"
    const result = await parseVoiceOrder(transcription)

    expect(result).toEqual(expect.objectContaining({
      items: expect.arrayContaining([
        expect.objectContaining({ name: 'Greek Bowl', quantity: 2, modifiers: [] }),
        expect.objectContaining({ name: 'Summer Salad', quantity: 3, modifiers: [] })
      ]),
      specialRequests: undefined,
      orderType: 'dine-in'
    }))
  })

  it('parses order with modifiers', async () => {
    const transcription = "One soul bowl with no rice"
    const result = await parseVoiceOrder(transcription)

    expect(result).toEqual(expect.objectContaining({
      items: expect.arrayContaining([
        expect.objectContaining({ name: 'Soul Bowl', quantity: 1, modifiers: ['No rice'] })
      ]),
      specialRequests: undefined,
      orderType: 'dine-in'
    }))
  })

  it('extracts special requests', async () => {
    const transcription = "I'd like a summer salad please make sure no nuts"
    const result = await parseVoiceOrder(transcription)

    expect(result).toEqual(expect.objectContaining({
      items: expect.arrayContaining([
        expect.objectContaining({ name: 'Summer Salad', quantity: 1, modifiers: [] })
      ]),
      specialRequests: "make sure no nuts",
      orderType: 'dine-in'
    }))
  })

  it('identifies takeout orders', async () => {
    const transcription = "Two chicken fajita keto to go"
    const result = await parseVoiceOrder(transcription)

    expect(result?.orderType).toBe('takeout')
    expect(result?.items[0]).toEqual(expect.objectContaining({
      name: 'Chicken Fajita Keto',
      quantity: 2,
      modifiers: []
    }))
  })

  it('handles complex orders', async () => {
    const transcription = "I'd like 2 soul bowls with extra collards, no rice. I'm allergic to peanuts"
    const result = await parseVoiceOrder(transcription)

    expect(result).toEqual(expect.objectContaining({
      items: expect.arrayContaining([
        expect.objectContaining({ name: 'Soul Bowl', quantity: 2, modifiers: ['No rice', 'Extra collards'] })
      ]),
      specialRequests: "peanuts",
      orderType: 'dine-in'
    }))
  })

  it('returns null for non-food transcriptions', async () => {
    const transcription = "Hello, how are you today?"
    const result = await parseVoiceOrder(transcription)

    expect(result).toBeNull()
  })

  it('handles various quantity formats', async () => {
    const transcription = "3x soul bowl, 2 x greek bowl"
    const result = await parseVoiceOrder(transcription)

    expect(result?.items).toHaveLength(2)
    expect(result?.items[0]).toEqual(expect.objectContaining({ name: 'Soul Bowl', quantity: 3, modifiers: [] }))
    expect(result?.items[1]).toEqual(expect.objectContaining({ name: 'Greek Bowl', quantity: 2, modifiers: [] }))
  })
})