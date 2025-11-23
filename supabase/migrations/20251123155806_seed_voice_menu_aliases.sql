-- Migration: Seed voice menu aliases
-- Version: 1.0.0
-- Created: 2025-11-23
-- Purpose: Migrate hardcoded menu variations from client code to database
--
-- Context: Phase 4 of Voice Agent Remediation
-- This migration populates menu_items.aliases with transcription variations
-- previously hardcoded in client/src/modules/voice/hooks/useVoiceCommerce.ts
--
-- Source (before):
--   DEFAULT_MENU_VARIATIONS = {
--     'soul bowl': ['soul', 'bowl', 'sobo', 'solo bowl', 'soul ball'],
--     'greek salad': ['greek', 'greek salad', 'geek salad'],
--     ...
--   }
--
-- Target (after):
--   menu_items.aliases = ['soul', 'bowl', 'sobo', 'solo bowl', 'soul ball']

-- ============================================================================
-- HELPER FUNCTION: Update menu item aliases by name
-- ============================================================================

CREATE OR REPLACE FUNCTION update_menu_item_aliases(
  p_item_name TEXT,
  p_aliases TEXT[]
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.menu_items
  SET aliases = p_aliases,
      updated_at = NOW()
  WHERE LOWER(name) = LOWER(p_item_name)
    AND (aliases IS NULL OR aliases = '{}');

  -- Log if no items were updated
  IF NOT FOUND THEN
    RAISE NOTICE 'No menu items found matching name: %', p_item_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DATA MIGRATION: Populate aliases for common menu items
-- ============================================================================

-- Soul Bowl (most common voice ordering item)
SELECT update_menu_item_aliases(
  'soul bowl',
  ARRAY['soul', 'bowl', 'sobo', 'solo bowl', 'soul ball', 'so bowl']
);

-- Greek Salad
SELECT update_menu_item_aliases(
  'greek salad',
  ARRAY['greek', 'greek salad', 'geek salad', 'greak salad']
);

-- Peach Arugula
SELECT update_menu_item_aliases(
  'peach arugula',
  ARRAY['peach', 'arugula', 'peach salad', 'arugula salad', 'peach arugula salad']
);

-- Jalapeño Pimento
SELECT update_menu_item_aliases(
  'jalapeño pimento',
  ARRAY['jalapeno', 'pimento', 'cheese bites', 'jalapeño', 'jalapeno pimento', 'pepper cheese']
);

-- Succotash
SELECT update_menu_item_aliases(
  'succotash',
  ARRAY['succotash', 'suck a toss', 'sock a tash', 'suckotash']
);

-- Additional common transcription errors for popular items
-- (Add more as you discover them in production logs)

-- Chicken Caesar (common voice order)
SELECT update_menu_item_aliases(
  'chicken caesar',
  ARRAY['caesar', 'chicken caesar salad', 'ceasar', 'chicken ceasar']
);

-- French Fries (common phonetic variations)
SELECT update_menu_item_aliases(
  'french fries',
  ARRAY['fries', 'french fry', 'fires', 'fried potatoes']
);

-- Cheeseburger (common variations)
SELECT update_menu_item_aliases(
  'cheeseburger',
  ARRAY['cheese burger', 'burger', 'hamburger with cheese', 'cheese bugger']
);

-- Coca-Cola / Coke (brand name variations)
SELECT update_menu_item_aliases(
  'coca-cola',
  ARRAY['coke', 'coca cola', 'cocacola', 'cola']
);

SELECT update_menu_item_aliases(
  'sprite',
  ARRAY['sprite', '7up', 'seven up', 'lemon lime soda']
);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO updated_count
  FROM public.menu_items
  WHERE aliases IS NOT NULL
    AND aliases != '{}';

  RAISE NOTICE 'Migration complete. % menu items now have voice aliases configured.', updated_count;
END;
$$;

-- ============================================================================
-- CLEANUP
-- ============================================================================

-- Drop the helper function (no longer needed after migration)
DROP FUNCTION IF EXISTS update_menu_item_aliases(TEXT, TEXT[]);

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

-- To rollback this data migration:
-- UPDATE public.menu_items SET aliases = '{}' WHERE aliases IS NOT NULL;
