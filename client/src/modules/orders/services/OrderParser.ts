import { MenuItem } from '../types';
import { OrderModification } from '../../voice/contexts/types';

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
  
  // Parse user's spoken text directly
  parseUserTranscript(transcript: string): ParsedOrderItem[] {
    const parsedItems: ParsedOrderItem[] = [];
    
    if (!transcript || transcript.trim().length === 0) {
      return parsedItems;
    }
    
    const cleanTranscript = transcript.toLowerCase().trim();
    
    // Split transcript into potential order segments
    // Look for separators like "and", "also", "plus", commas
    const segments = this.segmentTranscript(cleanTranscript);
    
    let lastValidItem: ParsedOrderItem | null = null;
    
    for (const segment of segments) {
      const parsed = this.parseTranscriptSegment(segment);
      if (parsed) {
        parsedItems.push(parsed);
        lastValidItem = parsed;
      } else if (lastValidItem && this.isPureModification(segment)) {
        // Try to apply this modification to the last valid item
        const additionalMods = this.extractModifications(segment, lastValidItem.menuItem);
        if (additionalMods.length > 0) {
          // Add modifications to the last item (modify in-place)
          for (const mod of additionalMods) {
            if (!lastValidItem.modifications.find(m => m.id === mod.id)) {
              lastValidItem.modifications.push(mod);
            }
          }
        }
      }
    }
    
    return parsedItems;
  }
  
  private segmentTranscript(transcript: string): string[] {
    // Handle complex segmentation more intelligently
    // Look for item indicators vs modification indicators
    
    // First, try to identify if this is a complex order with multiple items
    const itemKeywords = /(?:^|\s+)(?:i\s+want|i'd\s+like|can\s+i\s+get|give\s+me|i'll\s+take|get\s+me|also|and\s+(?:a|an|one|two|three|four|five))/gi;
    const matches = [...transcript.matchAll(itemKeywords)];
    
    if (matches.length > 1) {
      // Multiple items detected - split more carefully
      const segments = [];
      let lastIndex = 0;
      
      for (let i = 1; i < matches.length; i++) {
        const match = matches[i];
        const segment = transcript.slice(lastIndex, match.index).trim();
        if (segment) {
          segments.push(segment);
        }
        lastIndex = match.index || 0;
      }
      
      // Add the final segment
      const finalSegment = transcript.slice(lastIndex).trim();
      if (finalSegment) {
        segments.push(finalSegment);
      }
      
      return segments.filter(s => s.length > 0);
    }
    
    // Simple case - look for basic separators but be more conservative
    const separators = /(?:\s+and\s+(?:a|an|one|two|three|four|five|\d+)|\s+also\s+|\s+plus\s+)/i;
    const segments = transcript
      .split(separators)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // If no clear item separators found, treat as one segment
    return segments.length > 1 ? segments : [transcript];
  }
  
  private parseTranscriptSegment(segment: string): ParsedOrderItem | null {
    if (!segment || segment.trim().length === 0) {
      return null;
    }
    
    const lowerSegment = segment.toLowerCase().trim();
    
    // Detect action from common phrases
    let action: 'add' | 'remove' | 'update' = 'add';
    if (this.containsRemovalPhrases(lowerSegment)) {
      action = 'remove';
    } else if (this.containsUpdatePhrases(lowerSegment)) {
      action = 'update';
    }
    
    // Check if this segment is purely a modification phrase without menu item
    if (this.isPureModification(lowerSegment)) {
      return null; // Skip pure modification segments for now
    }
    
    // Extract quantity with enhanced patterns
    const quantity = this.extractQuantity(lowerSegment);
    
    // Find menu item using enhanced fuzzy matching
    const menuItemResult = this.findBestMenuMatch(lowerSegment);
    
    if (!menuItemResult.item && action === 'add') {
      // If we can't find a menu item for an add action, skip this segment
      return null;
    }
    
    // Extract modifications from the segment
    const modifications = this.extractModifications(lowerSegment, menuItemResult.item);
    
    return {
      menuItem: menuItemResult.item,
      quantity,
      modifications,
      action,
      confidence: menuItemResult.confidence,
    };
  }
  
  private isPureModification(text: string): boolean {
    // Check if the text is just a modification phrase without a menu item
    const pureModPatterns = [
      /^(?:no|without|hold(?:\s+the)?)\s+[a-zA-Z\s]+$/i,
      /^(?:extra|more|double)\s+[a-zA-Z\s]+$/i,
      /^(?:add|with)\s+[a-zA-Z\s]+$/i,
    ];
    
    return pureModPatterns.some(pattern => pattern.test(text.trim()));
  }
  
  private containsRemovalPhrases(text: string): boolean {
    const removalPhrases = [
      'remove', 'delete', 'cancel', 'take off', 'take out', 'get rid of',
      'don\'t want', 'no more', 'scratch that', 'never mind'
    ];
    
    return removalPhrases.some(phrase => text.includes(phrase));
  }
  
  private containsUpdatePhrases(text: string): boolean {
    const updatePhrases = [
      'change', 'modify', 'update', 'make that', 'actually', 'instead',
      'switch to', 'replace with'
    ];
    
    return updatePhrases.some(phrase => text.includes(phrase));
  }
  
  private extractQuantity(text: string): number {
    // Enhanced quantity extraction patterns
    const quantityPatterns = [
      // Direct numbers: "2", "three", "a couple"
      /(?:^|\s)(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?:\s|$)/i,
      // "A couple of", "a few"
      /(?:a\s+couple(?:\s+of)?|a\s+few)/i,
      // "A dozen", "half dozen"
      /((?:a\s+)?dozen|half\s+dozen)/i,
      // Just "a" or "an" (indicates 1)
      /(?:^|\s)(?:a|an)(?:\s+)/i
    ];
    
    for (const pattern of quantityPatterns) {
      const match = text.match(pattern);
      if (match) {
        const matchedText = match[1] || match[0];
        
        // Handle special cases
        if (matchedText.includes('couple') || matchedText.includes('few')) {
          return 2;
        }
        if (matchedText.includes('dozen')) {
          return matchedText.includes('half') ? 6 : 12;
        }
        if (matchedText === 'a' || matchedText === 'an') {
          return 1;
        }
        
        // Use existing wordToNumber method
        const num = this.wordToNumber(matchedText);
        if (num > 0) {
          return num;
        }
      }
    }
    
    return 1; // Default quantity
  }
  
  private findBestMenuMatch(text: string): { item: MenuItem | null; confidence: number } {
    let bestMatch = { item: null as MenuItem | null, confidence: 0 };
    
    // Clean text for better matching
    const cleanText = text.replace(/^(?:i\s+want|i'd\s+like|can\s+i\s+get|give\s+me|i'll\s+take|get\s+me)\s+/i, '');
    const words = cleanText.split(/\s+/);
    
    for (const item of this.menuDb.items) {
      const itemName = item.name.toLowerCase();
      
      // Direct fuzzy match on full text
      let score = this.fuzzyMatch(cleanText, itemName);
      
      // Check aliases
      for (const [alias, primary] of this.menuDb.aliases.entries()) {
        const aliasItem = this.menuDb.items.find(i => 
          i.name.toLowerCase() === primary || 
          this.menuDb.aliases.get(i.name.toLowerCase()) === primary
        );
        
        if (aliasItem === item) {
          const aliasScore = this.fuzzyMatch(cleanText, alias);
          score = Math.max(score, aliasScore);
        }
      }
      
      // Try phrase combinations (2-4 words)
      for (let i = 0; i < words.length - 1; i++) {
        for (let j = i + 2; j <= Math.min(i + 4, words.length); j++) {
          const phrase = words.slice(i, j).join(' ');
          const phraseScore = this.fuzzyMatch(phrase, itemName);
          score = Math.max(score, phraseScore);
          
          // Also check phrase against aliases
          for (const [alias] of this.menuDb.aliases.entries()) {
            const aliasScore = this.fuzzyMatch(phrase, alias);
            if (aliasScore > score && this.menuDb.aliases.get(alias) === itemName) {
              score = aliasScore;
            }
          }
        }
      }
      
      // Update best match
      if (score > bestMatch.confidence) {
        bestMatch = { item, confidence: score };
      }
    }
    
    // Only return matches with reasonable confidence
    return bestMatch.confidence > 0.5 ? bestMatch : { item: null, confidence: 0 };
  }
  
  private extractModifications(text: string, menuItem: MenuItem | null): OrderModification[] {
    const modifications: OrderModification[] = [];
    
    // Enhanced modification patterns
    const modificationPatterns = [
      // "No X" or "without X" patterns
      {
        pattern: /(?:no|without|hold(?:\s+the)?)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/gi,
        type: 'no'
      },
      // "Extra X" or "more X" patterns  
      {
        pattern: /(?:extra|more|double|lots?\s+of)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/gi,
        type: 'extra'
      },
      // "Add X" or "with X" patterns
      {
        pattern: /(?:add|with|including?)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/gi,
        type: 'add'
      },
      // "On the side"
      {
        pattern: /(?:on\s+the\s+side|side\s+of)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/gi,
        type: 'side'
      }
    ];
    
    for (const { pattern, type } of modificationPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const ingredient = match[1].trim().toLowerCase();
        
        // Build modifier key based on type
        let modKey: string;
        switch (type) {
          case 'no':
            modKey = `no ${ingredient}`;
            break;
          case 'extra':
            modKey = `extra ${ingredient}`;
            break;
          case 'add':
            modKey = `add ${ingredient}`;
            break;
          case 'side':
            modKey = `${ingredient} on side`;
            break;
          default:
            modKey = ingredient;
        }
        
        // Look for exact matches first
        let modifier = this.menuDb.modifiers.get(modKey);
        
        // If no exact match, try fuzzy matching
        if (!modifier) {
          let bestMatch = '';
          let bestScore = 0;
          
          for (const [key] of this.menuDb.modifiers.entries()) {
            const score = this.fuzzyMatch(modKey, key);
            if (score > bestScore && score > 0.6) {
              bestMatch = key;
              bestScore = score;
            }
          }
          
          if (bestMatch) {
            modifier = this.menuDb.modifiers.get(bestMatch);
          }
        }
        
        // If still no match, create a basic modifier
        if (!modifier && ingredient) {
          modifier = {
            id: `custom-${type}-${ingredient}`,
            name: `${type === 'no' ? 'No' : type === 'extra' ? 'Extra' : 'Add'} ${ingredient}`,
            price: type === 'no' ? 0 : (type === 'extra' ? 1 : 2)
          };
        }
        
        if (modifier && !modifications.find(m => m.id === modifier!.id)) {
          modifications.push(modifier);
        }
      }
    }
    
    // Special handling for veggie plate
    if (menuItem && (
      menuItem.name.toLowerCase().includes('veggie') || 
      menuItem.name.toLowerCase().includes('vegetable')
    )) {
      if (text.includes('three') || text.includes('3')) {
        const threeSides = this.menuDb.modifiers.get('three sides');
        if (threeSides && !modifications.find(m => m.id === threeSides.id)) {
          modifications.push(threeSides);
        }
      } else if (text.includes('four') || text.includes('4')) {
        const fourSides = this.menuDb.modifiers.get('four sides');
        if (fourSides && !modifications.find(m => m.id === fourSides.id)) {
          modifications.push(fourSides);
        }
      }
    }
    
    // Check for dietary preferences
    if (text.includes('vegan') || text.includes('make it vegan')) {
      const veganMod = this.menuDb.modifiers.get('make it vegan');
      if (veganMod && !modifications.find(m => m.id === veganMod.id)) {
        modifications.push(veganMod);
      }
    }
    
    if (text.includes('gluten free') || text.includes('gluten-free')) {
      const gfMod = this.menuDb.modifiers.get('gluten free');
      if (gfMod && !modifications.find(m => m.id === gfMod.id)) {
        modifications.push(gfMod);
      }
    }
    
    return modifications;
  }
}