import { parseVoiceOrder } from './orderIntegration'

describe('parseVoiceOrder', () => {
  it('parses a simple soul bowl order', () => {
    const transcription = "I'd like a soul bowl please"
    const result = parseVoiceOrder(transcription)
    
    expect(result).toEqual({
      items: [
        { name: 'Soul Bowl', quantity: 1, modifiers: [] }
      ],
      specialRequests: undefined,
      orderType: 'dine-in'
    })
  })

  it('parses order with quantity', () => {
    const transcription = "I want 2 greek bowls and 3 summer salads"
    const result = parseVoiceOrder(transcription)
    
    expect(result).toEqual({
      items: [
        { name: 'Greek Bowl', quantity: 2, modifiers: [] },
        { name: 'Summer Salad', quantity: 3, modifiers: [] }
      ],
      specialRequests: undefined,
      orderType: 'dine-in'
    })
  })

  it('parses order with modifiers', () => {
    const transcription = "One soul bowl with no rice and a greek salad with add chicken"
    const result = parseVoiceOrder(transcription)
    
    expect(result).toEqual({
      items: [
        { name: 'Soul Bowl', quantity: 1, modifiers: ['No rice'] },
        { name: 'Greek Salad', quantity: 1, modifiers: ['Add chicken'] }
      ],
      specialRequests: undefined,
      orderType: 'dine-in'
    })
  })

  it('extracts special requests', () => {
    const transcription = "I'd like a summer salad please make sure no nuts"
    const result = parseVoiceOrder(transcription)
    
    expect(result).toEqual({
      items: [
        { name: 'Summer Salad', quantity: 1, modifiers: [] }
      ],
      specialRequests: "make sure no nuts",
      orderType: 'dine-in'
    })
  })

  it('identifies takeout orders', () => {
    const transcription = "Two chicken fajita keto to go"
    const result = parseVoiceOrder(transcription)
    
    expect(result?.orderType).toBe('takeout')
    expect(result?.items[0]).toEqual({ 
      name: 'Chicken Fajita Keto', 
      quantity: 2, 
      modifiers: [] 
    })
  })

  it('handles complex orders', () => {
    const transcription = "I'd like 2 soul bowls with extra collards, no rice, a veggie plate with three sides, and a peach arugula salad. I'm allergic to peanuts"
    const result = parseVoiceOrder(transcription)
    
    expect(result).toEqual({
      items: [
        { name: 'Soul Bowl', quantity: 2, modifiers: ['No rice', 'Extra collards'] },
        { name: 'Peach Arugula Salad', quantity: 1, modifiers: [] },
        { name: 'Veggie Plate', quantity: 1, modifiers: ['Three sides'] }
      ],
      specialRequests: "peanuts",
      orderType: 'dine-in'
    })
  })

  it('returns null for non-food transcriptions', () => {
    const transcription = "Hello, how are you today?"
    const result = parseVoiceOrder(transcription)
    
    expect(result).toBeNull()
  })

  it('handles various quantity formats', () => {
    const transcription = "3x soul bowl, 2 x greek bowl, and 1x summer vegan bowl"
    const result = parseVoiceOrder(transcription)
    
    expect(result?.items).toHaveLength(3)
    expect(result?.items[0]).toEqual({ name: 'Soul Bowl', quantity: 3, modifiers: [] })
    expect(result?.items[1]).toEqual({ name: 'Greek Bowl', quantity: 2, modifiers: [] })
    expect(result?.items[2]).toEqual({ name: 'Summer Vegan Bowl', quantity: 1, modifiers: [] })
  })
})