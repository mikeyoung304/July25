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

// Embedding model configuration
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

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
        model: EMBEDDING_MODEL,
        input: text,
        dimensions: EMBEDDING_DIMENSIONS
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
   * Generate embeddings for all menu items in a restaurant
   * Batches requests to avoid rate limiting
   */
  static async generateAllEmbeddings(
    restaurantId: string,
    options: { batchSize?: number; force?: boolean } = {}
  ): Promise<{ success: number; failed: number }> {
    const { batchSize = 20, force = false } = options;

    try {
      // Fetch items that need embeddings
      let query = supabase
        .from('menu_items')
        .select('id, name, description, price, dietary_flags, category_id')
        .eq('restaurant_id', restaurantId)
        .eq('active', true);

      // Only fetch items without embeddings (unless force refresh)
      if (!force) {
        query = query.is('embedding', null);
      }

      const { data: items, error } = await query.limit(500);

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

        const results = await Promise.allSettled(
          batch.map(item => this.generateItemEmbedding(restaurantId, item.id))
        );

        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            success++;
          } else {
            failed++;
          }
        });

        // Rate limiting: wait 1 second between batches
        if (i + batchSize < items.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
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
   */
  static async findSimilarItems(
    query: string,
    restaurantId: string,
    options: { limit?: number; threshold?: number } = {}
  ): Promise<SimilarMenuItem[]> {
    const { limit = 10, threshold = 0.5 } = options;

    try {
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
