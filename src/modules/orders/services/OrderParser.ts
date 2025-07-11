import { MenuItem } from '../types';
import { OrderModification } from '../contexts/VoiceOrderContext';

export interface ParsedOrderItem {
  menuItem: MenuItem | null;
  quantity: number;
  modifications: OrderModification[];
  action: 'add' | 'remove' | 'update';
  confidence: number;
}

interface MenuDatabase {
  items: MenuItem[];
  modifiers: Map<string, OrderModification>;
  aliases: Map<string, string>;
}

export class OrderParser {
  private menuDb: MenuDatabase;
  
  constructor(menuItems: MenuItem[]) {
    this.menuDb = this.buildMenuDatabase(menuItems);
  }
  
  private buildMenuDatabase(items: MenuItem[]): MenuDatabase {
    const db: MenuDatabase = {
      items,
      modifiers: new Map(),
      aliases: new Map(),
    };
    
    // Build common modifiers
    const commonModifiers = [
      { id: 'no-pickles', name: 'No pickles', price: 0 },
      { id: 'no-onions', name: 'No onions', price: 0 },
      { id: 'no-tomatoes', name: 'No tomatoes', price: 0 },
      { id: 'extra-cheese', name: 'Extra cheese', price: 1.50 },
      { id: 'extra-sauce', name: 'Extra sauce', price: 0.50 },
      { id: 'large', name: 'Large', price: 2.00 },
      { id: 'medium', name: 'Medium', price: 1.00 },
      { id: 'small', name: 'Small', price: 0 },
    ];
    
    commonModifiers.forEach(mod => {
      db.modifiers.set(mod.name.toLowerCase(), mod);
    });
    
    // Build aliases for common menu items
    const aliases = [
      ['burger', 'hamburger'],
      ['fries', 'french fries'],
      ['coke', 'coca cola', 'coca-cola'],
      ['diet coke', 'diet coca cola', 'diet coca-cola'],
    ];
    
    aliases.forEach(group => {
      const primary = group[0];
      group.forEach(alias => {
        db.aliases.set(alias.toLowerCase(), primary);
      });
    });
    
    return db;
  }
  
  parseAIResponse(aiResponse: string): ParsedOrderItem[] {
    const parsedItems: ParsedOrderItem[] = [];
    
    // Extract structured data from AI response
    // Look for patterns like:
    // - "Adding [item]"
    // - "I'll add [quantity] [item]"
    // - "Removing [item]"
    // - "Changing [item] to [modification]"
    
    const lines = aiResponse.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const parsed = this.parseLine(line);
      if (parsed) {
        parsedItems.push(parsed);
      }
    }
    
    return parsedItems;
  }
  
  private parseLine(line: string): ParsedOrderItem | null {
    const lowerLine = line.toLowerCase();
    
    // Detect action
    let action: 'add' | 'remove' | 'update' = 'add';
    if (lowerLine.includes('remov') || lowerLine.includes('cancel') || lowerLine.includes('delete')) {
      action = 'remove';
    } else if (lowerLine.includes('chang') || lowerLine.includes('modif') || lowerLine.includes('updat')) {
      action = 'update';
    }
    
    // Extract quantity
    const quantityMatch = lowerLine.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/);
    let quantity = 1;
    if (quantityMatch) {
      const numWord = quantityMatch[1];
      quantity = this.wordToNumber(numWord);
    }
    
    // Find menu item
    let menuItem: MenuItem | null = null;
    let bestMatch = { item: null as MenuItem | null, score: 0 };
    
    for (const item of this.menuDb.items) {
      const itemName = item.name.toLowerCase();
      if (lowerLine.includes(itemName)) {
        const score = itemName.length;
        if (score > bestMatch.score) {
          bestMatch = { item, score };
        }
      }
      
      // Check aliases
      for (const [alias, primary] of this.menuDb.aliases.entries()) {
        if (lowerLine.includes(alias) && primary.includes(item.name.toLowerCase())) {
          const score = alias.length;
          if (score > bestMatch.score) {
            bestMatch = { item, score };
          }
        }
      }
    }
    
    menuItem = bestMatch.item;
    
    if (!menuItem && action === 'add') {
      return null;
    }
    
    // Extract modifications
    const modifications: OrderModification[] = [];
    
    // Check for size modifications
    if (lowerLine.includes('large')) {
      const largeMod = this.menuDb.modifiers.get('large');
      if (largeMod) modifications.push(largeMod);
    } else if (lowerLine.includes('medium')) {
      const medMod = this.menuDb.modifiers.get('medium');
      if (medMod) modifications.push(medMod);
    } else if (lowerLine.includes('small')) {
      const smallMod = this.menuDb.modifiers.get('small');
      if (smallMod) modifications.push(smallMod);
    }
    
    // Check for ingredient modifications
    const noPattern = /no\s+(\w+)/g;
    let noMatch;
    while ((noMatch = noPattern.exec(lowerLine)) !== null) {
      const ingredient = noMatch[1];
      const modKey = `no ${ingredient}`;
      const mod = this.menuDb.modifiers.get(modKey);
      if (mod) modifications.push(mod);
    }
    
    // Check for extra modifications
    const extraPattern = /extra\s+(\w+)/g;
    let extraMatch;
    while ((extraMatch = extraPattern.exec(lowerLine)) !== null) {
      const ingredient = extraMatch[1];
      const modKey = `extra ${ingredient}`;
      const mod = this.menuDb.modifiers.get(modKey);
      if (mod) modifications.push(mod);
    }
    
    return {
      menuItem,
      quantity,
      modifications,
      action,
      confidence: bestMatch.score > 0 ? 0.8 : 0.5,
    };
  }
  
  private wordToNumber(word: string): number {
    const numbers: { [key: string]: number } = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    };
    
    return numbers[word] || parseInt(word) || 1;
  }
  
  // Parse user's spoken text directly (for future enhancement)
  parseUserTranscript(transcript: string): ParsedOrderItem[] {
    // This method can be enhanced to parse user's direct speech
    // For now, we'll rely on AI to structure the response
    return [];
  }
}