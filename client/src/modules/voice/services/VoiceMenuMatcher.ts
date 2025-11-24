/**
 * Voice Menu Matcher - Dynamic Menu Resolution
 *
 * PHASE 3: Architectural Hardening - Eliminates hardcoded menu items
 * and prices, enabling voice ordering for ALL restaurants.
 *
 * Key Design Principles:
 * - Fetches menu dynamically from MenuService
 * - Fuzzy matching with configurable threshold
 * - Southern accent variations support
 * - Per-restaurant configuration
 *
 * Version: 1.0.0
 * Created: 2025-01-23 (Phase 3: Architectural Hardening)
 */

import { menuService } from '@/services';
import { MenuItem } from '@/services/types';
import { logger } from '@/services/logger';

export interface VoiceMatchResult {
  menuItem: MenuItem;
  confidence: number;
  matchedPattern?: string;
}

export interface VoiceMenuMatcherOptions {
  minConfidenceThreshold?: number; // 0.0 to 1.0, default 0.6
  debug?: boolean;
}

export class VoiceMenuMatcher {
  private menuItems: MenuItem[] = [];
  private isInitialized = false;
  private readonly minConfidence: number;
  private readonly debug: boolean;

  constructor(options: VoiceMenuMatcherOptions = {}) {
    this.minConfidence = options.minConfidenceThreshold ?? 0.6;
    this.debug = options.debug ?? false;
  }

  /**
   * Initialize by fetching menu from API
   */
  async initialize(): Promise<void> {
    try {
      if (this.debug) {
        logger.info('[VoiceMenuMatcher] Initializing...');
      }

      const { items } = await menuService.getMenu();
      this.menuItems = items.filter(item => item.isAvailable !== false);
      this.isInitialized = true;

      if (this.debug) {
        logger.info('[VoiceMenuMatcher] Initialized', {
          itemCount: this.menuItems.length,
        });
      }
    } catch (error) {
      logger.error('[VoiceMenuMatcher] Initialization failed', { error });
      throw new Error('Failed to load menu for voice ordering');
    }
  }

  /**
   * Match spoken text to menu item
   */
  matchItem(spokenText: string): VoiceMatchResult | null {
    if (!this.isInitialized) {
      throw new Error('VoiceMenuMatcher not initialized. Call initialize() first.');
    }

    const normalizedText = this.normalizeText(spokenText);
    let bestMatch: VoiceMatchResult | null = null;

    for (const menuItem of this.menuItems) {
      const itemName = this.normalizeText(menuItem.name);
      const confidence = this.calculateConfidence(normalizedText, itemName, menuItem);

      if (confidence >= this.minConfidence) {
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            menuItem,
            confidence,
            matchedPattern: itemName,
          };
        }
      }
    }

    if (this.debug && bestMatch) {
      logger.info('[VoiceMenuMatcher] Match found', {
        spokenText,
        matchedItem: bestMatch.menuItem.name,
        confidence: bestMatch.confidence,
      });
    }

    return bestMatch;
  }

  /**
   * Get menu item by exact name (for fallback)
   */
  getItemByName(name: string): MenuItem | null {
    if (!this.isInitialized) {
      throw new Error('VoiceMenuMatcher not initialized. Call initialize() first.');
    }

    return this.menuItems.find(item =>
      item.name.toLowerCase() === name.toLowerCase()
    ) || null;
  }

  /**
   * Get all available menu items
   */
  getMenuItems(): MenuItem[] {
    if (!this.isInitialized) {
      throw new Error('VoiceMenuMatcher not initialized. Call initialize() first.');
    }

    return [...this.menuItems];
  }

  /**
   * Normalize text for matching (handle Southern accents, common variations)
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      // Southern accent variations
      .replace(/fahita|faheta/gi, 'fajita')
      .replace(/\bbol\b/gi, 'bowl')
      .replace(/keeto|ketto/gi, 'keto')
      .replace(/\bsole\b/gi, 'soul')
      .replace(/georgia\s*soul/gi, 'soul')
      .replace(/soul\s*food/gi, 'soul')
      // Common speech-to-text errors
      .replace(/\s+/g, ' ')
      .replace(/[''`]/g, "'")
      .replace(/[""]/g, '"');
  }

  /**
   * Calculate confidence score for match (0.0 to 1.0)
   */
  private calculateConfidence(
    spokenText: string,
    itemName: string,
    menuItem: MenuItem
  ): number {
    let confidence = 0;

    // Exact match
    if (spokenText === itemName) {
      return 1.0;
    }

    // Contains full item name
    if (spokenText.includes(itemName)) {
      confidence = 0.9;
    }

    // Item name contains spoken text (partial match)
    if (itemName.includes(spokenText)) {
      confidence = 0.8;
    }

    // Fuzzy word-based matching
    const spokenWords = spokenText.split(' ');
    const itemWords = itemName.split(' ');
    const matchedWords = spokenWords.filter(sw =>
      itemWords.some(iw => iw.includes(sw) || sw.includes(iw))
    );
    const wordMatchRatio = matchedWords.length / itemWords.length;

    if (wordMatchRatio > confidence) {
      confidence = wordMatchRatio * 0.85; // Slightly lower than contains match
    }

    // Check aliases if available
    if (menuItem.aliases && menuItem.aliases.length > 0) {
      for (const alias of menuItem.aliases) {
        const normalizedAlias = this.normalizeText(alias);
        if (spokenText.includes(normalizedAlias) || normalizedAlias.includes(spokenText)) {
          confidence = Math.max(confidence, 0.85);
        }
      }
    }

    // Boost confidence for featured items (more likely to be ordered)
    if (menuItem.isFeatured && confidence > 0) {
      confidence = Math.min(1.0, confidence * 1.1);
    }

    return confidence;
  }

  /**
   * Check if matcher is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.menuItems.length > 0;
  }

  /**
   * Refresh menu (call after menu updates)
   */
  async refresh(): Promise<void> {
    this.isInitialized = false;
    await this.initialize();
  }
}

/**
 * Singleton instance for app-wide use
 */
export const voiceMenuMatcher = new VoiceMenuMatcher({ debug: false });
