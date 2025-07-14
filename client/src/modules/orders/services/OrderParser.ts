import { MenuItem } from '../types';
import { OrderModification } from '../../voice/contexts/VoiceOrderContext';

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
    
    // Build common modifiers for Grow Fresh Local Food
    const commonModifiers = [
      // Bowl modifiers
      { id: 'no-rice', name: 'No rice', price: 0 },
      { id: 'add-rice', name: 'Add rice', price: 1 },
      { id: 'extra-collards', name: 'Extra collards', price: 2 },
      { id: 'no-olives', name: 'No olives', price: 0 },
      { id: 'no-feta', name: 'No feta', price: 0 },
      { id: 'extra-sauce', name: 'Extra sauce', price: 0.50 },
      // Salad add-ons
      { id: 'add-chicken', name: 'Add chicken', price: 4 },
      { id: 'add-salmon', name: 'Add salmon', price: 6 },
      { id: 'add-prosciutto', name: 'Add prosciutto', price: 4 },
      // Side options
      { id: 'three-sides', name: 'Three sides', price: 10 },
      { id: 'four-sides', name: 'Four sides', price: 12.50 },
      // Dietary preferences
      { id: 'make-it-vegan', name: 'Make it vegan', price: 0 },
      { id: 'gluten-free', name: 'Gluten free', price: 0 },
    ];
    
    commonModifiers.forEach(mod => {
      db.modifiers.set(mod.name.toLowerCase(), mod);
    });
    
    // Build aliases for Grow Fresh Local Food menu items
    const aliases = [
      // Starters
      ['summer sampler', 'sampler', 'sampler plate', 'appetizer sampler'],
      ['peach caprese', 'peach and prosciutto', 'caprese', 'peach salad'],
      ['watermelon tataki', 'watermelon', 'tataki'],
      ['tea sandwiches', 'tea sandwich', 'finger sandwiches'],
      ['jalapeno pimento', 'pimento bites', 'jalapeno bites', 'pimento cheese'],
      // Bowls
      ['soul bowl', 'georgia soul', 'soul food bowl', 'sausage bowl', 'collard bowl'],
      ['chicken fajita keto', 'fajita bowl', 'keto bowl', 'chicken fajita', 'keto chicken'],
      ['greek bowl', 'greek chicken', 'mediterranean bowl', 'greek chicken bowl'],
      ['summer vegan bowl', 'vegan bowl', 'cold vegan', 'vegan option'],
      ['summer succotash', 'succotash', 'hot vegan', 'succotash bowl'],
      // Salads
      ['summer salad', 'house salad', 'seasonal salad'],
      ['peach arugula', 'peach salad', 'arugula salad'],
      ['greek salad', 'mediterranean salad'],
      ['tuna salad', 'tuna', 'tuna plate'],
      ['moms chicken salad', 'mama salad', 'chicken salad', 'mom salad', 'mama chicken'],
      ['grilled chicken salad', 'grilled chicken', 'chicken breast salad'],
      // Entrees
      ['peach chicken', 'chicken with peaches', 'peach glazed chicken'],
      ['teriyaki salmon', 'salmon', 'salmon over rice', 'salmon rice'],
      ['hamburger steak', 'burger steak', 'salisbury steak', 'steak over rice'],
      ['greek chicken thighs', 'greek thighs', 'chicken thighs', 'greek chicken over rice'],
      // Sides
      ['potatoes romanoff', 'romanoff', 'potato romanoff', 'creamy potatoes'],
      ['black eyed peas', 'black eye peas', 'peas', 'field peas'],
      ['collards', 'collard greens', 'greens'],
      ['sweet potatoes', 'sweet potato', 'yams'],
      ['rice', 'white rice', 'steamed rice'],
      ['potato salad', 'tater salad'],
      ['fruit cup', 'fruit', 'fresh fruit'],
      ['cucumber salad', 'cucumber', 'cucumbers'],
      ['side salad', 'small salad', 'garden salad'],
      ['peanut asian noodles', 'asian noodles', 'peanut noodles', 'noodles'],
      // Veggie plate
      ['veggie plate', 'vegetable plate', 'veggie platter', 'vegetarian plate'],
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
    
    // Find menu item using fuzzy matching
    let menuItem: MenuItem | null = null;
    let bestMatch = { item: null as MenuItem | null, score: 0 };
    
    // Extract potential item name from the line
    const words = lowerLine.split(' ');
    
    for (const item of this.menuDb.items) {
      const itemName = item.name.toLowerCase();
      
      // Direct fuzzy match on item name
      const directScore = this.fuzzyMatch(lowerLine, itemName);
      if (directScore > bestMatch.score) {
        bestMatch = { item, score: directScore };
      }
      
      // Check aliases with fuzzy matching
      for (const [alias, primary] of this.menuDb.aliases.entries()) {
        if (primary === itemName || this.menuDb.aliases.get(itemName) === primary) {
          const aliasScore = this.fuzzyMatch(lowerLine, alias);
          if (aliasScore > bestMatch.score) {
            bestMatch = { item, score: aliasScore };
          }
        }
      }
      
      // Check word combinations for better matching
      for (let i = 0; i < words.length - 1; i++) {
        for (let j = i + 1; j <= Math.min(i + 4, words.length); j++) {
          const phrase = words.slice(i, j).join(' ');
          const phraseScore = this.fuzzyMatch(phrase, itemName);
          if (phraseScore > bestMatch.score) {
            bestMatch = { item, score: phraseScore };
          }
        }
      }
    }
    
    menuItem = bestMatch.score > 0.6 ? bestMatch.item : null;
    
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
    const noPattern = /(?:no|without|hold the)\s+(\w+)/g;
    let noMatch;
    while ((noMatch = noPattern.exec(lowerLine)) !== null) {
      const ingredient = noMatch[1];
      const modKey = `no ${ingredient}`;
      const mod = this.menuDb.modifiers.get(modKey);
      if (mod) modifications.push(mod);
    }
    
    // Check for extra modifications
    const extraPattern = /(?:extra|more|double)\s+(\w+)/g;
    let extraMatch;
    while ((extraMatch = extraPattern.exec(lowerLine)) !== null) {
      const ingredient = extraMatch[1];
      const modKey = `extra ${ingredient}`;
      const mod = this.menuDb.modifiers.get(modKey);
      if (mod) modifications.push(mod);
    }
    
    // Check for add-on modifications
    const addPattern = /(?:add|with)\s+(\w+)/g;
    let addMatch;
    while ((addMatch = addPattern.exec(lowerLine)) !== null) {
      const ingredient = addMatch[1];
      const modKey = `add ${ingredient}`;
      const mod = this.menuDb.modifiers.get(modKey);
      if (mod) modifications.push(mod);
    }
    
    // Check for veggie plate specific
    if (lowerLine.includes('veggie plate') || lowerLine.includes('vegetable plate')) {
      if (lowerLine.includes('three') || lowerLine.includes('3')) {
        const threeSides = this.menuDb.modifiers.get('three sides');
        if (threeSides) modifications.push(threeSides);
      } else if (lowerLine.includes('four') || lowerLine.includes('4')) {
        const fourSides = this.menuDb.modifiers.get('four sides');
        if (fourSides) modifications.push(fourSides);
      }
    }
    
    return {
      menuItem,
      quantity,
      modifications,
      action,
      confidence: bestMatch.score,
    };
  }
  
  private wordToNumber(word: string): number {
    const numbers: { [key: string]: number } = {
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    };
    
    return numbers[word] || parseInt(word) || 1;
  }
  
  // Fuzzy matching for Southern accents and variations
  private fuzzyMatch(input: string, target: string): number {
    input = input.toLowerCase().trim();
    target = target.toLowerCase().trim();
    
    // Exact match
    if (input === target) return 1.0;
    
    // Contains match
    if (input.includes(target) || target.includes(input)) return 0.8;
    
    // Common Southern pronunciation variations
    const southernVariations: { [key: string]: string[] } = {
      'bowl': ['bol', 'bole', 'bowel'],
      'soul': ['sole', 'sol', 'soal'],
      'chicken': ['chickin', 'chiken', 'chick\'n'],
      'salad': ['sallad', 'salid', 'saled'],
      'collards': ['collards', 'collard greens', 'greens'],
      'peas': ['pease', 'peaz'],
      'rice': ['rahce', 'rahs'],
      'fajita': ['fahita', 'fajeta', 'faheta'],
      'keto': ['keeto', 'ketto'],
      'vegan': ['veegan', 'vaygan'],
      'peach': ['peech', 'pech'],
      'tea': ['tay', 'tee'],
      'salmon': ['samon', 'sammon', 'sam\'n'],
    };
    
    // Check for Southern variations
    for (const [standard, variations] of Object.entries(southernVariations)) {
      if (target.includes(standard)) {
        for (const variant of variations) {
          if (input.includes(variant)) return 0.7;
        }
      }
    }
    
    // Levenshtein distance for close matches
    const distance = this.levenshteinDistance(input, target);
    const maxLength = Math.max(input.length, target.length);
    const similarity = 1 - (distance / maxLength);
    
    return similarity > 0.6 ? similarity : 0;
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  // Parse user's spoken text directly (for future enhancement)
  parseUserTranscript(transcript: string): ParsedOrderItem[] {
    // This method can be enhanced to parse user's direct speech
    // For now, we'll rely on AI to structure the response
    return [];
  }
}