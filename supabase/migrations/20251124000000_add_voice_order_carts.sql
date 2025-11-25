-- ============================================================================
-- Migration: 20251124000000_add_voice_order_carts
-- ============================================================================
-- Purpose: Add persistent cart storage for voice ordering sessions
-- Author: Claude Code
-- Created: 2024-11-24
-- Related:
--   - Voice ordering module (server/src/ai/functions/realtime-menu-tools.ts)
--   - Replaces in-memory Map with Supabase persistence
--   - Enables horizontal scaling and prevents data loss on restart
-- Rollback: DROP TABLE public.voice_order_carts CASCADE;
-- ============================================================================

-- ============================================================================
-- TABLE: voice_order_carts
-- ============================================================================
-- Stores active voice ordering session carts with 30-minute TTL

CREATE TABLE IF NOT EXISTS public.voice_order_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session and tenant identification
  session_id TEXT NOT NULL,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,

  -- Cart contents (JSONB for flexible storage)
  -- Structure matches Cart interface from realtime-menu-tools.ts
  items JSONB NOT NULL DEFAULT '[]',

  -- Calculated totals (stored for quick retrieval)
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),

  -- Ensure one cart per session per restaurant
  CONSTRAINT unique_session_restaurant UNIQUE(session_id, restaurant_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookup by session_id and restaurant_id
CREATE INDEX idx_voice_order_carts_session_restaurant
  ON public.voice_order_carts(session_id, restaurant_id);

-- Cleanup index for expired carts
CREATE INDEX idx_voice_order_carts_expires_at
  ON public.voice_order_carts(expires_at)
  WHERE expires_at < NOW();

-- Restaurant-scoped queries
CREATE INDEX idx_voice_order_carts_restaurant
  ON public.voice_order_carts(restaurant_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.voice_order_carts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access carts for their restaurant
CREATE POLICY voice_order_carts_tenant_isolation
  ON public.voice_order_carts
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT restaurant_id
      FROM public.user_restaurants
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Service role has full access (for API operations)
CREATE POLICY voice_order_carts_service_role
  ON public.voice_order_carts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at and expires_at on modification
CREATE OR REPLACE FUNCTION update_voice_order_carts_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.expires_at = NOW() + INTERVAL '30 minutes';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_voice_order_carts_timestamps
  BEFORE UPDATE ON public.voice_order_carts
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_order_carts_timestamps();

-- ============================================================================
-- CLEANUP FUNCTION
-- ============================================================================

-- Function to delete expired carts (call via cron job or scheduled task)
CREATE OR REPLACE FUNCTION cleanup_expired_voice_carts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.voice_order_carts
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE public.voice_order_carts IS
  'Persistent storage for voice ordering session carts. TTL: 30 minutes.';

COMMENT ON COLUMN public.voice_order_carts.session_id IS
  'Voice ordering session ID (from OpenAI Realtime API)';

COMMENT ON COLUMN public.voice_order_carts.items IS
  'Cart items as JSONB array matching CartItem interface';

COMMENT ON COLUMN public.voice_order_carts.expires_at IS
  'Automatic expiration timestamp (30 minutes from last update)';

COMMENT ON FUNCTION cleanup_expired_voice_carts() IS
  'Deletes expired voice order carts. Run periodically via cron.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'voice_order_carts'
ORDER BY ordinal_position;
