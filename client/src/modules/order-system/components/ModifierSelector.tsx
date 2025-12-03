import React from 'react';
import { Check } from 'lucide-react';
import { Modifier } from '../../menu/types';
import { CartModifier } from '../types';
import { formatPrice } from '@rebuild/shared';

interface ModifierSelectorProps {
  modifiers: Modifier[];
  selectedModifiers: CartModifier[];
  onModifierToggle: (modifier: CartModifier) => void;
}

export const ModifierSelector: React.FC<ModifierSelectorProps> = ({
  modifiers,
  selectedModifiers,
  onModifierToggle
}) => {
  const formatModifierPrice = (price: number) => {
    if (price === 0) return 'Free';
    return formatPrice(price);
  };

  const isSelected = (modifierId: string) => {
    return selectedModifiers.some(m => m.id === modifierId);
  };

  return (
    <div className="space-y-2">
      {modifiers.map((modifier) => (
        <label
          key={modifier.id}
          className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors duration-200 ${
            isSelected(modifier.id)
              ? 'border-macon-teal bg-teal-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
              isSelected(modifier.id)
                ? 'border-macon-teal bg-macon-teal'
                : 'border-gray-300'
            }`}>
              {isSelected(modifier.id) && (
                <Check className="w-3 h-3 text-white" />
              )}
            </div>
            
            <span className="font-medium">{modifier.name}</span>
          </div>
          
          <span className={`font-medium ${
            modifier.price > 0 ? 'text-gray-700' : 'text-green-600'
          }`}>
            {formatModifierPrice(modifier.price)}
          </span>

          <input
            type="checkbox"
            checked={isSelected(modifier.id)}
            onChange={() => onModifierToggle({
              id: modifier.id,
              name: modifier.name,
              price: modifier.price
            })}
            className="sr-only"
            aria-label={`${modifier.name} - ${formatModifierPrice(modifier.price)}`}
          />
        </label>
      ))}
    </div>
  );
};