-- Migration: Add voice modifier rules table
-- Version: 1.0.0
-- Created: 2025-11-23
-- Purpose: Support voice-driven menu item modifications (e.g., "no cheese", "extra sauce")
--
-- Context: Phase 4 of Voice Agent Remediation
-- This migration creates infrastructure for dynamic voice modification rules,
-- eliminating hardcoded logic in the application layer.

-- ============================================================================
-- TABLE: voice_modifier_rules
-- ============================================================================
-- Stores voice trigger phrases and their corresponding modifications
-- Examples:
--   - "no cheese" -> removes cheese ingredient
--   - "extra sauce" -> adds extra sauce modifier
--   - "make it spicy" -> adds spicy modifier

CREATE TABLE IF NOT EXISTS public.voice_modifier_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,

  -- Voice trigger phrases (e.g., ["no cheese", "without cheese", "hold the cheese"])
  trigger_phrases TEXT[] NOT NULL DEFAULT '{}',

  -- Action type: 'remove_ingredient', 'add_modifier', 'replace_ingredient'
  action_type TEXT NOT NULL CHECK (action_type IN ('remove_ingredient', 'add_modifier', 'replace_ingredient')),

  -- Target (what to remove/add/replace)
  target_name TEXT NOT NULL,

  -- Optional: Replacement value (for 'replace_ingredient')
  replacement_value TEXT,

  -- Optional: Price adjustment (in cents, can be negative)
  price_adjustment INTEGER DEFAULT 0,

  -- Optional: Apply only to specific menu items (null = applies to all)
  applicable_menu_item_ids UUID[] DEFAULT NULL,

  -- Active flag
  active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Notes for staff (e.g., "Customer allergies")
  notes TEXT
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_voice_modifier_rules_restaurant
  ON public.voice_modifier_rules(restaurant_id)
  WHERE active = true;

CREATE INDEX idx_voice_modifier_rules_action_type
  ON public.voice_modifier_rules(restaurant_id, action_type)
  WHERE active = true;

-- GIN index for fast trigger phrase searches
CREATE INDEX idx_voice_modifier_rules_triggers
  ON public.voice_modifier_rules USING GIN(trigger_phrases);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.voice_modifier_rules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access rules for their restaurant
CREATE POLICY voice_modifier_rules_tenant_isolation
  ON public.voice_modifier_rules
  FOR ALL
  USING (
    restaurant_id IN (
      SELECT restaurant_id
      FROM public.user_restaurants
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Service role has full access (for API operations)
CREATE POLICY voice_modifier_rules_service_role
  ON public.voice_modifier_rules
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION update_voice_modifier_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_voice_modifier_rules_timestamp
  BEFORE UPDATE ON public.voice_modifier_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_voice_modifier_rules_updated_at();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE public.voice_modifier_rules IS
  'Voice-driven menu item modification rules (e.g., "no cheese", "extra sauce"). Part of Voice Agent Remediation Phase 4.';

COMMENT ON COLUMN public.voice_modifier_rules.trigger_phrases IS
  'Array of voice phrases that trigger this rule (e.g., ["no cheese", "without cheese", "hold the cheese"])';

COMMENT ON COLUMN public.voice_modifier_rules.action_type IS
  'Type of modification: remove_ingredient, add_modifier, or replace_ingredient';

COMMENT ON COLUMN public.voice_modifier_rules.target_name IS
  'Name of the ingredient/modifier to remove, add, or replace';

COMMENT ON COLUMN public.voice_modifier_rules.price_adjustment IS
  'Price adjustment in cents (can be negative for removals, positive for additions)';

COMMENT ON COLUMN public.voice_modifier_rules.applicable_menu_item_ids IS
  'Optional: Array of menu item UUIDs this rule applies to. NULL = applies to all items.';
