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
   */
  private static generationHistory = new Map<string, number[]>();

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
      return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
    }

    // Check cooldown since last generation
    if (recentGenerations.length > 0) {
      const lastGeneration = Math.max(...recentGenerations);
      const timeSinceLastGeneration = now - lastGeneration;

      if (timeSinceLastGeneration < GENERATION_COOLDOWN_MS) {
        const retryAfterMs = GENERATION_COOLDOWN_MS - timeSinceLastGeneration;
        return { allowed: false, retryAfterMs };
      }
    }

    return { allowed: true, retryAfterMs: 0 };
  }

  /**
   * Record a bulk generation for rate limiting
   */
  private static recordGeneration(restaurantId: string): void {
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
   * Generate embedding for a menu item using pre-fetched data (no re-fetching)
   * Used by generateAllEmbeddings to avoid N+1 queries
   */
  private static async generateEmbeddingForItem(
    item: MenuItemForEmbedding
  ): Promise<{ id: string; embedding: number[] } | null> {
    try {
      const embeddingText = this.formatItemForEmbedding(item);
      const embedding = await this.generateEmbedding(embeddingText);

      if (!embedding) {
        return null;
      }

      return { id: item.id, embedding };
    } catch (error) {
      embeddingLogger.error('Failed to generate embedding for item', {
        itemId: item.id,
        error
      });
      return null;
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

        // Generate embeddings for all items in batch (no re-fetching)
        const embeddingResults = await Promise.allSettled(
          itemsForEmbedding.map(item => this.generateEmbeddingForItem(item))
        );

        // Collect successful embeddings for batch update
        const successfulEmbeddings: Array<{ id: string; embedding: number[] }> = [];
        embeddingResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            successfulEmbeddings.push(result.value);
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
