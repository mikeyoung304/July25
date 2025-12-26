-- Migration: Add vector embeddings for Menu RAG
-- Created: 2025-12-26
-- Purpose: Enable semantic search for menu items using pgvector
-- Phase: 5 - AI Architecture (Menu RAG)

-- Enable pgvector extension (if not already enabled)
-- Note: This may require superuser privileges on some Supabase plans
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to menu_items table
-- Using 1536 dimensions for OpenAI text-embedding-3-small model
-- Using text-embedding-3-small instead of ada-002 for better cost/performance ratio
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add embedding_updated_at to track when embeddings were last generated
ALTER TABLE menu_items
ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMPTZ;

-- Create index for vector similarity search
-- Using IVFFlat index for good balance of speed and accuracy
-- Lists = 100 is appropriate for up to 100k items per restaurant
CREATE INDEX IF NOT EXISTS idx_menu_items_embedding
ON menu_items
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create function to find similar menu items by embedding
CREATE OR REPLACE FUNCTION find_similar_menu_items(
  query_embedding vector(1536),
  target_restaurant_id uuid,
  match_count int DEFAULT 10,
  similarity_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  price integer,
  category_id uuid,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mi.id,
    mi.name,
    mi.description,
    mi.price,
    mi.category_id,
    1 - (mi.embedding <=> query_embedding) as similarity
  FROM menu_items mi
  WHERE
    mi.restaurant_id = target_restaurant_id
    AND mi.active = true
    AND mi.available = true
    AND mi.embedding IS NOT NULL
    AND 1 - (mi.embedding <=> query_embedding) > similarity_threshold
  ORDER BY mi.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION find_similar_menu_items TO authenticated;

-- Comment for documentation
COMMENT ON COLUMN menu_items.embedding IS 'Vector embedding for semantic search (1536-dim, text-embedding-3-small)';
COMMENT ON COLUMN menu_items.embedding_updated_at IS 'Timestamp of last embedding generation';
COMMENT ON FUNCTION find_similar_menu_items IS 'Find menu items similar to a query embedding using cosine similarity';
