/**
 * Voice Configuration Types
 * Shared types for Voice Agent subsystem
 * Created: 2025-11-23 (Phase 4: Cleanup)
 */

/**
 * Voice modifier action types
 */
export type VoiceModifierActionType =
  | 'remove_ingredient'
  | 'add_modifier'
  | 'replace_ingredient';

/**
 * Voice modifier rule (database entity)
 */
export interface VoiceModifierRule {
  id: string;
  restaurant_id: string;
  trigger_phrases: string[];
  action_type: VoiceModifierActionType;
  target_name: string;
  replacement_value: string | null;
  price_adjustment: number;
  applicable_menu_item_ids: string[] | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  notes: string | null;
}

/**
 * DTO for creating a voice modifier rule
 */
export interface CreateVoiceModifierRuleDTO {
  restaurant_id: string;
  trigger_phrases: string[];
  action_type: VoiceModifierActionType;
  target_name: string;
  replacement_value?: string | null;
  price_adjustment?: number;
  applicable_menu_item_ids?: string[] | null;
  active?: boolean;
  notes?: string | null;
}

/**
 * DTO for updating a voice modifier rule
 */
export interface UpdateVoiceModifierRuleDTO {
  trigger_phrases?: string[];
  action_type?: VoiceModifierActionType;
  target_name?: string;
  replacement_value?: string | null;
  price_adjustment?: number;
  applicable_menu_item_ids?: string[] | null;
  active?: boolean;
  notes?: string | null;
}

/**
 * Voice menu configuration (includes menu aliases and tax rate)
 */
export interface VoiceMenuConfiguration {
  restaurant_id: string;
  menu_items: Array<{
    id: string;
    name: string;
    aliases: string[];
  }>;
  tax_rate: number;
  modifier_rules: VoiceModifierRule[];
}
