/**
 * Menu Embedding Service
 * Generates and manages vector embeddings for menu items using OpenAI
 * Enables semantic search for AI-powered menu lookup
 */

import OpenAI from 'openai';
import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import { getConfig } from '../config/environment';

const config = getConfig();
const embeddingLogger = logger.child({ service: 'MenuEmbeddingService' });

// OpenAI client - only initialized if API key is available
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!openaiClient && config.openai?.apiKey) {
    openaiClient = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return openaiClient;
}

// Rate limiting configuration for embedding generation (TODO #217)
// 5 calls per hour = 12 minute cooldown between bulk regenerations
const GENERATION_COOLDOWN_MS = 12 * 60 * 1000; // 12 minutes
const MAX_GENERATIONS_PER_HOUR = 5;

/** Batch size for OpenAI API calls - balances throughput vs rate limits */
const EMBEDDING_BATCH_SIZE = 20;

/** OpenAI rate limit: 3000 RPM for text-embedding-3-small, 1s delay between batches */
const RATE_LIMIT_DELAY_MS = 1000;

/** Default similarity threshold - 0.5 = 50% similarity, good for menu matching */
const DEFAULT_SIMILARITY_THRESHOLD = 0.5;

/** Maximum items to process per run - prevents timeout and memory issues */
const MAX_ITEMS_PER_RUN = 500;

/** Default number of results to return from similarity search */
const DEFAULT_RESULT_LIMIT = 10;

export interface MenuItemForEmbedding {
  id: string;
  name: string;
  description: string | null;
  category_name?: string | undefined;
  price: number;
  dietary_flags?: string[] | undefined;
}

export interface SimilarMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string;
  similarity: number;
}

export class MenuEmbeddingService {
  /**
   * Rate limiting state for bulk embedding generation (TODO #217)
   * Tracks last generation timestamp per restaurant to prevent cost attacks
   *
   * NOTE: This is in-memory and not distributed across multiple instances.
   * For horizontal scaling, consider database or Redis-backed rate limiting.
   * See TODO-231 for details.
   */
  private static generationHistory = new Map<string, number[]>();

  /** Cleanup interval reference for proper shutdown */
  private static cleanupInterval: NodeJS.Timeout | null = null;

  /** Stale entry threshold: 1 hour (entries with all timestamps older than this are removed) */
  private static readonly STALE_ENTRY_THRESHOLD_MS = 60 * 60 * 1000;

  /** Cleanup runs every 10 minutes */
  private static readonly CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

  /**
   * Start the rate limit cleanup interval
   * IMPORTANT: Called during server initialization
   */
  static startRateLimitCleanup(): void {
    if (this.cleanupInterval) {
      embeddingLogger.warn('Menu embedding rate limit cleanup already started');
      return;
    }

    // Cleanup stale entries every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleEntries();
    }, this.CLEANUP_INTERVAL_MS);

    embeddingLogger.info('Menu embedding rate limit cleanup interval started');
  }

  /**
   * Stop the rate limit cleanup interval
   * CRITICAL: Must be called during server shutdown to prevent memory leaks
   */
  static stopRateLimitCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      embeddingLogger.info('Menu embedding rate limit cleanup interval stopped');
    }

    // Clear all tracked data
    const entryCount = this.generationHistory.size;
    this.generationHistory.clear();

    if (entryCount > 0) {
      embeddingLogger.info('Menu embedding rate limit data cleared', { entriesCleared: entryCount });
    }
  }

  /**
   * Clean up stale entries from the rate limit Map
   * Removes entries where all timestamps are older than 1 hour
   */
  private static cleanupStaleEntries(): void {
    const now = Date.now();
    const oneHourAgo = now - this.STALE_ENTRY_THRESHOLD_MS;
    let removedCount = 0;

    for (const [restaurantId, timestamps] of this.generationHistory.entries()) {
      // Filter to only recent timestamps
      const recentTimestamps = timestamps.filter(ts => ts > oneHourAgo);

      if (recentTimestamps.length === 0) {
        // All timestamps are stale, remove the entry entirely
        this.generationHistory.delete(restaurantId);
        removedCount++;
      } else if (recentTimestamps.length < timestamps.length) {
        // Some timestamps are stale, update with only recent ones
        this.generationHistory.set(restaurantId, recentTimestamps);
      }
    }

    embeddingLogger.info('Menu embedding rate limit cleanup completed', {
      entriesRemoved: removedCount,
      entriesRemaining: this.generationHistory.size
    });
  }

  /**
   * Check if bulk embedding generation is rate limited for a restaurant
   * Returns time remaining in ms if limited, or 0 if allowed
   */
  static checkRateLimit(restaurantId: string): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Get generation history for this restaurant
    const history = this.generationHistory.get(restaurantId) || [];

    // Filter to only include generations within the last hour
    const recentGenerations = history.filter(timestamp => timestamp > oneHourAgo);

    // Update the history with filtered list
    this.generationHistory.set(restaurantId, recentGenerations);

    // Check if we've exceeded the hourly limit
    if (recentGenerations.length >= MAX_GENERATIONS_PER_HOUR) {
      // Find the oldest generation in the window to determine retry time
      const oldestInWindow = Math.min(...recentGenerations);
      const retryAfterMs = oldestInWindow + 60 * 60 * 1000 - now;
      const actualRetryAfterMs = Math.max(0, retryAfterMs);

      // Log rate limit hit for monitoring (TODO #231)
      embeddingLogger.warn('Embedding generation rate limit hit: hourly limit exceeded', {
        restaurantId,
        attemptsInWindow: recentGenerations.length,
        maxAllowed: MAX_GENERATIONS_PER_HOUR,
        retryAfterMs: actualRetryAfterMs,
        retryAfterMinutes: Math.ceil(actualRetryAfterMs / 60000)
      });

      return { allowed: false, retryAfterMs: actualRetryAfterMs };
    }

    // Check cooldown since last generation
    if (recentGenerations.length > 0) {
      const lastGeneration = Math.max(...recentGenerations);
      const timeSinceLastGeneration = now - lastGeneration;

      if (timeSinceLastGeneration < GENERATION_COOLDOWN_MS) {
        const retryAfterMs = GENERATION_COOLDOWN_MS - timeSinceLastGeneration;

        // Log rate limit hit for monitoring (TODO #231)
        embeddingLogger.warn('Embedding generation rate limit hit: cooldown active', {
          restaurantId,
          timeSinceLastMs: timeSinceLastGeneration,
          cooldownMs: GENERATION_COOLDOWN_MS,
          retryAfterMs,
          retryAfterMinutes: Math.ceil(retryAfterMs / 60000)
        });

        return { allowed: false, retryAfterMs };
      }
    }

    return { allowed: true, retryAfterMs: 0 };
  }

  /**
   * Record a bulk generation for rate limiting
   * @internal Exposed for testing - use generateAllEmbeddings in production
   */
  static recordGeneration(restaurantId: string): void {
    const history = this.generationHistory.get(restaurantId) || [];
    history.push(Date.now());
    this.generationHistory.set(restaurantId, history);
  }

  /**
   * Clear rate limit history (for testing)
   */
  static clearRateLimitHistory(): void {
    this.generationHistory.clear();
  }

  /**
   * Generate embedding text from menu item data
   * Combines name, description, category, and dietary info for rich semantic matching
   */
  static formatItemForEmbedding(item: MenuItemForEmbedding): string {
    const parts: string[] = [item.name];

    if (item.description) {
      parts.push(item.description);
    }

    if (item.category_name) {
      parts.push(`Category: ${item.category_name}`);
    }

    if (item.dietary_flags && item.dietary_flags.length > 0) {
      parts.push(`Dietary: ${item.dietary_flags.join(', ')}`);
    }

    // Include price for contextual matching (e.g., "affordable", "premium")
    const priceInDollars = item.price / 100;
    parts.push(`Price: $${priceInDollars.toFixed(2)}`);

    return parts.join('. ');
  }

  /**
   * Generate embedding for a single text input
   */
  static async generateEmbedding(text: string): Promise<number[] | null> {
    const client = getOpenAIClient();

    if (!client) {
      embeddingLogger.warn('OpenAI client not available - embedding generation skipped');
      return null;
    }

    try {
      const response = await client.embeddings.create({
        model: config.openai.embeddingModel,
        input: text,
        dimensions: config.openai.embeddingDimensions
      });

      return response.data[0]?.embedding ?? null;
    } catch (error) {
      embeddingLogger.error('Failed to generate embedding', { error, textLength: text.length });
      return null;
    }
  }

  /**
   * Generate and store embedding for a single menu item
   */
  static async generateItemEmbedding(
    restaurantId: string,
    itemId: string
  ): Promise<boolean> {
    try {
      // Fetch item with category name
      const { data: item, error: fetchError } = await supabase
        .from('menu_items')
        .select(`
          id,
          name,
          description,
          price,
          dietary_flags,
          menu_categories!inner(name)
        `)
        .eq('id', itemId)
        .eq('restaurant_id', restaurantId)
        .single();

      if (fetchError || !item) {
        embeddingLogger.error('Failed to fetch menu item for embedding', {
          itemId,
          restaurantId,
          error: fetchError
        });
        return false;
      }

      // Format item for embedding
      const embeddingText = this.formatItemForEmbedding({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category_name: (item.menu_categories as unknown as { name: string } | null)?.name,
        dietary_flags: item.dietary_flags
      });

      // Generate embedding
      const embedding = await this.generateEmbedding(embeddingText);

      if (!embedding) {
        return false;
      }

      // Store embedding in database
      const { error: updateError } = await supabase
        .from('menu_items')
        .update({
          embedding: `[${embedding.join(',')}]`,
          embedding_updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .eq('restaurant_id', restaurantId);

      if (updateError) {
        embeddingLogger.error('Failed to store embedding', {
          itemId,
          restaurantId,
          error: updateError
        });
        return false;
      }

      embeddingLogger.info('Generated and stored embedding', {
        itemId,
        restaurantId,
        embeddingDimensions: embedding.length
      });

      return true;
    } catch (error) {
      embeddingLogger.error('Unexpected error in generateItemEmbedding', {
        itemId,
        restaurantId,
        error
      });
      return false;
    }
  }

  /**
   * Generate embeddings for a batch of menu items in a single OpenAI API call (TODO #235)
   * This is significantly more efficient than calling generateEmbeddingForItem individually.
   * OpenAI's embeddings API supports up to 2048 inputs per request.
   *
   * @param items - Array of menu items to generate embeddings for
   * @returns Array of results in the same order as input items (null for failures)
   */
  private static async generateEmbeddingsForBatch(
    items: MenuItemForEmbedding[]
  ): Promise<Array<{ id: string; embedding: number[] } | null>> {
    if (items.length === 0) {
      return [];
    }

    const client = getOpenAIClient();

    if (!client) {
      embeddingLogger.warn('OpenAI client not available - batch embedding generation skipped');
      return items.map(() => null);
    }

    // Collect all texts for the batch API call
    const texts = items.map(item => this.formatItemForEmbedding(item));

    try {
      // Single API call for all texts in the batch
      const response = await client.embeddings.create({
        model: config.openai.embeddingModel,
        input: texts,
        dimensions: config.openai.embeddingDimensions
      });

      // Map response embeddings back to items by index
      // OpenAI returns embeddings in the same order as input texts
      // The response.data array length matches items array length, so items[index] is safe
      return response.data.map((embeddingData, index) => {
        const item = items[index];
        if (!item) {
          // This should never happen as OpenAI returns same number of embeddings as inputs
          embeddingLogger.error('Embedding response index mismatch', { index, itemCount: items.length });
          return null;
        }
        return {
          id: item.id,
          embedding: embeddingData.embedding
        };
      });
    } catch (error) {
      embeddingLogger.error('Batch embedding generation failed', {
        error,
        itemCount: items.length,
        textLengths: texts.map(t => t.length)
      });
      // On failure, return null for all items in the batch
      return items.map(() => null);
    }
  }

  /**
   * Generate embeddings for all menu items in a restaurant
   * Batches requests to avoid rate limiting
   * Rate limited to 5 calls per hour per restaurant (TODO #217)
   *
   * Optimized to:
   * - Fetch all items with categories in ONE query upfront (no N+1)
   * - Pass item data directly to embedding generation (no re-fetching)
   * - Batch updates for database writes
   */
  static async generateAllEmbeddings(
    restaurantId: string,
    options: { batchSize?: number; force?: boolean } = {}
  ): Promise<{ success: number; failed: number; rateLimited?: boolean; retryAfterMs?: number }> {
    const { batchSize = EMBEDDING_BATCH_SIZE, force = false } = options;

    // Check rate limit before proceeding (TODO #217)
    const rateLimitCheck = this.checkRateLimit(restaurantId);
    if (!rateLimitCheck.allowed) {
      const retryAfterSeconds = Math.ceil(rateLimitCheck.retryAfterMs / 1000);
      embeddingLogger.warn('Embedding generation rate limited', {
        restaurantId,
        retryAfterMs: rateLimitCheck.retryAfterMs,
        retryAfterSeconds
      });
      return {
        success: 0,
        failed: 0,
        rateLimited: true,
        retryAfterMs: rateLimitCheck.retryAfterMs
      };
    }

    // Record this generation attempt for rate limiting
    this.recordGeneration(restaurantId);

    try {
      // Fetch ALL items with their categories in ONE query upfront (fixes N+1)
      let query = supabase
        .from('menu_items')
        .select('id, name, description, price, dietary_flags, menu_categories!inner(name)')
        .eq('restaurant_id', restaurantId)
        .eq('active', true);

      // Only fetch items without embeddings (unless force refresh)
      if (!force) {
        query = query.is('embedding', null);
      }

      const { data: items, error } = await query.limit(MAX_ITEMS_PER_RUN);

      if (error) {
        embeddingLogger.error('Failed to fetch menu items for embedding', {
          restaurantId,
          error
        });
        return { success: 0, failed: 0 };
      }

      if (!items || items.length === 0) {
        embeddingLogger.info('No menu items need embedding updates', { restaurantId });
        return { success: 0, failed: 0 };
      }

      let success = 0;
      let failed = 0;

      // Process in batches
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        // Transform items to MenuItemForEmbedding format with pre-fetched category data
        const itemsForEmbedding: MenuItemForEmbedding[] = batch.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          category_name: (item.menu_categories as unknown as { name: string } | null)?.name,
          dietary_flags: item.dietary_flags
        }));

        // Generate embeddings for all items in batch using single API call (TODO #235)
        const embeddingResults = await this.generateEmbeddingsForBatch(itemsForEmbedding);

        // Collect successful embeddings for batch update
        const successfulEmbeddings: Array<{ id: string; embedding: number[] }> = [];
        embeddingResults.forEach(result => {
          if (result !== null) {
            successfulEmbeddings.push(result);
          } else {
            failed++;
          }
        });

        // Batch update all successful embeddings
        if (successfulEmbeddings.length > 0) {
          const updateTimestamp = new Date().toISOString();

          // Use Promise.all for parallel updates within the batch
          const updateResults = await Promise.allSettled(
            successfulEmbeddings.map(({ id, embedding }) =>
              supabase
                .from('menu_items')
                .update({
                  embedding: `[${embedding.join(',')}]`,
                  embedding_updated_at: updateTimestamp
                })
                .eq('id', id)
                .eq('restaurant_id', restaurantId)
            )
          );

          updateResults.forEach(result => {
            if (result.status === 'fulfilled' && !result.value.error) {
              success++;
            } else {
              failed++;
              const errorDetail = result.status === 'rejected'
                ? result.reason
                : result.value.error;
              embeddingLogger.error('Failed to store embedding in batch update', {
                restaurantId,
                error: errorDetail
              });
            }
          });
        }

        // Rate limiting: wait between batches to respect OpenAI rate limits
        if (i + batchSize < items.length) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
        }
      }

      embeddingLogger.info('Completed batch embedding generation', {
        restaurantId,
        success,
        failed,
        total: items.length
      });

      return { success, failed };
    } catch (error) {
      embeddingLogger.error('Failed to generate all embeddings', {
        restaurantId,
        error
      });
      return { success: 0, failed: 0 };
    }
  }

  /**
   * Find menu items similar to a text query using vector search
   * Requires ENABLE_SEMANTIC_SEARCH=true feature flag (default: false)
   */
  static async findSimilarItems(
    query: string,
    restaurantId: string,
    options: { limit?: number; threshold?: number } = {}
  ): Promise<SimilarMenuItem[]> {
    const { limit = DEFAULT_RESULT_LIMIT, threshold = DEFAULT_SIMILARITY_THRESHOLD } = options;

    // Check if semantic search is enabled via feature flag (TODO #216)
    if (!config.features.semanticSearch) {
      embeddingLogger.debug('Semantic search disabled, skipping embedding lookup', {
        query,
        restaurantId
      });
      return [];
    }

    try {
      // Validate restaurant exists before running the search
      const { data: restaurant, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('id', restaurantId)
        .single();

      if (restaurantError || !restaurant) {
        embeddingLogger.warn('Invalid restaurant_id in similarity search', { restaurantId });
        return [];
      }

      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);

      if (!queryEmbedding) {
        embeddingLogger.warn('Could not generate query embedding', { query, restaurantId });
        return [];
      }

      // Call the PostgreSQL function for vector similarity search
      const { data, error } = await supabase.rpc('find_similar_menu_items', {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        target_restaurant_id: restaurantId,
        match_count: limit,
        similarity_threshold: threshold
      });

      if (error) {
        embeddingLogger.error('Vector search failed', {
          query,
          restaurantId,
          error
        });
        return [];
      }

      embeddingLogger.debug('Vector search completed', {
        query,
        restaurantId,
        resultsCount: data?.length || 0
      });

      return (data || []) as SimilarMenuItem[];
    } catch (error) {
      embeddingLogger.error('Unexpected error in findSimilarItems', {
        query,
        restaurantId,
        error
      });
      return [];
    }
  }

  /**
   * Check if embeddings are available for a restaurant
   */
  static async hasEmbeddings(restaurantId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('active', true)
        .not('embedding', 'is', null);

      if (error) {
        embeddingLogger.error('Failed to check embeddings', { restaurantId, error });
        return false;
      }

      return (count ?? 0) > 0;
    } catch (error) {
      embeddingLogger.error('Unexpected error in hasEmbeddings', { restaurantId, error });
      return false;
    }
  }

  /**
   * Get embedding stats for a restaurant
   */
  static async getEmbeddingStats(restaurantId: string): Promise<{
    total: number;
    withEmbeddings: number;
    withoutEmbeddings: number;
    percentComplete: number;
  }> {
    try {
      // Count total active items
      const { count: total, error: totalError } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('active', true);

      if (totalError) {
        throw totalError;
      }

      // Count items with embeddings
      const { count: withEmbeddings, error: embeddingError } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('active', true)
        .not('embedding', 'is', null);

      if (embeddingError) {
        throw embeddingError;
      }

      const totalCount = total ?? 0;
      const embeddingCount = withEmbeddings ?? 0;
      const withoutCount = totalCount - embeddingCount;
      const percentComplete = totalCount > 0
        ? Math.round((embeddingCount / totalCount) * 100)
        : 0;

      return {
        total: totalCount,
        withEmbeddings: embeddingCount,
        withoutEmbeddings: withoutCount,
        percentComplete
      };
    } catch (error) {
      embeddingLogger.error('Failed to get embedding stats', { restaurantId, error });
      return { total: 0, withEmbeddings: 0, withoutEmbeddings: 0, percentComplete: 0 };
    }
  }
}
