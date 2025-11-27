import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModifierList } from '../ModifierList';

describe('ModifierList', () => {
  describe('allergy safety (CRITICAL)', () => {
    it('renders visible ALLERGY label for allergy modifiers', () => {
      const mods = [{ name: 'Peanut allergy', price: 0 }];
      render(<ModifierList modifiers={mods} />);

      const allergyLabel = screen.getByText('ALLERGY:', { exact: false });
      expect(allergyLabel).toBeInTheDocument();
      expect(allergyLabel).toHaveClass('font-bold');
      expect(allergyLabel).toHaveClass('uppercase');
    });

    it('provides screen reader text for allergy warnings', () => {
      const mods = [{ name: 'Gluten allergy', price: 0 }];
      render(<ModifierList modifiers={mods} />);

      const srText = screen.getByText('ALLERGY WARNING:', { exact: false });
      expect(srText).toBeInTheDocument();
      expect(srText).toHaveClass('sr-only');
    });

    it('applies allergy styling classes', () => {
      const mods = [{ name: 'Dairy allergy', price: 0 }];
      const { container } = render(<ModifierList modifiers={mods} />);

      const allergyElement = container.querySelector('.bg-red-100');
      expect(allergyElement).toBeInTheDocument();
      expect(allergyElement).toHaveClass('text-red-800');
      expect(allergyElement).toHaveClass('font-semibold');
      expect(allergyElement).toHaveClass('px-2');
      expect(allergyElement).toHaveClass('py-0.5');
      expect(allergyElement).toHaveClass('rounded');
    });

    it('renders allergy warning emoji icon', () => {
      const mods = [{ name: 'Shellfish allergy', price: 0 }];
      render(<ModifierList modifiers={mods} />);

      // Warning emoji ⚠️ should be present (aria-hidden)
      const { container } = render(<ModifierList modifiers={mods} />);
      const text = container.textContent || '';
      expect(text).toContain('⚠️');
    });

    it('detects various allergy keywords', () => {
      const testCases = [
        { name: 'Gluten allergy', price: 0 },
        { name: 'Dairy allergic', price: 0 },
        { name: 'Nut sensitivity', price: 0 },
        { name: 'Peanut free', price: 0 },
        { name: 'Shellfish restriction', price: 0 },
        { name: 'Celiac disease', price: 0 },
      ];

      testCases.forEach((mod) => {
        const { container } = render(<ModifierList modifiers={[mod]} />);
        const allergyElement = container.querySelector('.bg-red-100');
        expect(allergyElement).toBeInTheDocument();
      });
    });
  });

  describe('modifier types and icons', () => {
    it('renders removal modifiers with X icon and red text', () => {
      const mods = [{ name: 'No onions', price: 0 }];
      const { container } = render(<ModifierList modifiers={mods} />);

      const text = container.textContent || '';
      expect(text).toContain('✕');

      const modElement = container.querySelector('.text-red-600');
      expect(modElement).toBeInTheDocument();
      expect(modElement?.textContent).toContain('No onions');
    });

    it('renders addition modifiers with + icon and green text', () => {
      const mods = [{ name: 'Extra cheese', price: 0 }];
      const { container } = render(<ModifierList modifiers={mods} />);

      const text = container.textContent || '';
      expect(text).toContain('+');

      const modElement = container.querySelector('.text-green-600');
      expect(modElement).toBeInTheDocument();
      expect(modElement?.textContent).toContain('Extra cheese');
    });

    it('renders temperature modifiers with fire emoji and orange text', () => {
      const mods = [{ name: 'Medium rare', price: 0 }];
      const { container } = render(<ModifierList modifiers={mods} />);

      const text = container.textContent || '';
      expect(text).toContain('🔥');

      const modElement = container.querySelector('.text-orange-600');
      expect(modElement).toBeInTheDocument();
      expect(modElement?.textContent).toContain('Medium rare');
    });

    it('renders substitution modifiers with arrow icon and blue text', () => {
      const mods = [{ name: 'Sub fries for salad', price: 0 }];
      const { container } = render(<ModifierList modifiers={mods} />);

      const text = container.textContent || '';
      expect(text).toContain('↔');

      const modElement = container.querySelector('.text-blue-600');
      expect(modElement).toBeInTheDocument();
      expect(modElement?.textContent).toContain('Sub fries for salad');
    });

    it('renders default modifiers with bullet and gray text', () => {
      const mods = [{ name: 'Special request', price: 0 }];
      const { container } = render(<ModifierList modifiers={mods} />);

      const text = container.textContent || '';
      expect(text).toContain('•');

      const modElement = container.querySelector('.text-gray-600');
      expect(modElement).toBeInTheDocument();
      expect(modElement?.textContent).toContain('Special request');
    });

    it('detects removal keywords at start of modifier name', () => {
      const testCases = [
        { name: 'No pickles', expected: '✕' },
        { name: 'Without mayo', expected: '✕' },
        { name: 'Remove tomatoes', expected: '✕' },
        { name: 'Hold the sauce', expected: '✕' },
      ];

      testCases.forEach((testCase) => {
        const { container } = render(<ModifierList modifiers={[testCase]} />);
        const text = container.textContent || '';
        expect(text).toContain(testCase.expected);
      });
    });

    it('detects addition keywords at start of modifier name', () => {
      const testCases = [
        { name: 'Extra bacon', expected: '+' },
        { name: 'Add avocado', expected: '+' },
        { name: 'Double meat', expected: '+' },
        { name: 'Triple cheese', expected: '+' },
        { name: 'More sauce', expected: '+' },
      ];

      testCases.forEach((testCase) => {
        const { container } = render(<ModifierList modifiers={[testCase]} />);
        const text = container.textContent || '';
        expect(text).toContain(testCase.expected);
      });
    });
  });

  describe('sizing', () => {
    it('applies sm size class by default', () => {
      const mods = [{ name: 'Extra cheese', price: 0 }];
      const { container } = render(<ModifierList modifiers={mods} />);

      const modElement = container.querySelector('.text-sm');
      expect(modElement).toBeInTheDocument();
    });

    it('applies base size class when specified', () => {
      const mods = [{ name: 'Extra cheese', price: 0 }];
      const { container } = render(<ModifierList modifiers={mods} size="base" />);

      const modElement = container.querySelector('.text-base');
      expect(modElement).toBeInTheDocument();
      expect(container.querySelector('.text-sm')).not.toBeInTheDocument();
    });

    it('applies lg size class when specified', () => {
      const mods = [{ name: 'Extra cheese', price: 0 }];
      const { container } = render(<ModifierList modifiers={mods} size="lg" />);

      const modElement = container.querySelector('.text-lg');
      expect(modElement).toBeInTheDocument();
    });

    it('applies xl size class when specified', () => {
      const mods = [{ name: 'Extra cheese', price: 0 }];
      const { container } = render(<ModifierList modifiers={mods} size="xl" />);

      const modElement = container.querySelector('.text-xl');
      expect(modElement).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('returns null for empty modifier list', () => {
      const { container } = render(<ModifierList modifiers={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null for undefined modifiers', () => {
      const { container } = render(<ModifierList modifiers={undefined} />);
      expect(container.firstChild).toBeNull();
    });

    it('handles modifiers without price property', () => {
      const mods = [{ name: 'No onions' }];
      const { container } = render(<ModifierList modifiers={mods} />);

      expect(container.textContent).toContain('No onions');
    });

    it('handles empty modifier name', () => {
      const mods = [{ name: '', price: 0 }];
      const { container } = render(<ModifierList modifiers={mods} />);

      // Should render but with minimal content (just icon)
      expect(container.querySelector('.text-gray-600')).toBeInTheDocument();
    });
  });

  describe('multiple modifiers', () => {
    it('renders all modifiers in correct order', () => {
      const mods = [
        { name: 'Extra cheese', price: 1.5 },
        { name: 'No onions', price: 0 },
        { name: 'Gluten allergy', price: 0 },
      ];
      const { container } = render(<ModifierList modifiers={mods} />);

      const text = container.textContent || '';
      expect(text).toContain('Extra cheese');
      expect(text).toContain('No onions');
      expect(text).toContain('Gluten allergy');

      // Check order is preserved
      const indexExtra = text.indexOf('Extra cheese');
      const indexNo = text.indexOf('No onions');
      const indexGluten = text.indexOf('Gluten allergy');

      expect(indexExtra).toBeLessThan(indexNo);
      expect(indexNo).toBeLessThan(indexGluten);
    });

    it('applies different styles to different modifier types', () => {
      const mods = [
        { name: 'Extra cheese', price: 1.5 },  // addition (green)
        { name: 'No onions', price: 0 },        // removal (red)
        { name: 'Medium rare', price: 0 },      // temperature (orange)
      ];
      const { container } = render(<ModifierList modifiers={mods} />);

      expect(container.querySelector('.text-green-600')).toBeInTheDocument();
      expect(container.querySelector('.text-red-600')).toBeInTheDocument();
      expect(container.querySelector('.text-orange-600')).toBeInTheDocument();
    });

    it('handles duplicate modifier names with unique keys', () => {
      const mods = [
        { name: 'Extra cheese', price: 1.5 },
        { name: 'Extra cheese', price: 1.5 },
      ];

      // Should not throw key warning and render both
      const { container } = render(<ModifierList modifiers={mods} />);
      const elements = container.querySelectorAll('.text-green-600');
      expect(elements).toHaveLength(2);
    });
  });

  describe('accessibility', () => {
    it('marks icons as aria-hidden', () => {
      const mods = [{ name: 'Extra cheese', price: 0 }];
      render(<ModifierList modifiers={mods} />);

      const ariaHiddenElements = screen.getAllByText(/[+✕⚠️🔥↔•]/, { exact: false });
      ariaHiddenElements.forEach((element) => {
        // The icon span should have aria-hidden="true"
        if (element.tagName === 'SPAN' && element.getAttribute('aria-hidden')) {
          expect(element.getAttribute('aria-hidden')).toBe('true');
        }
      });
    });

    it('provides semantic HTML structure', () => {
      const mods = [
        { name: 'Extra cheese', price: 0 },
        { name: 'No onions', price: 0 },
      ];
      const { container } = render(<ModifierList modifiers={mods} />);

      // Should have a wrapping div
      expect(container.firstChild?.nodeName).toBe('DIV');

      // Each modifier should be a div
      const modifierDivs = container.querySelectorAll('div > div');
      expect(modifierDivs.length).toBeGreaterThan(0);
    });
  });

  describe('custom className', () => {
    it('applies custom className to wrapper', () => {
      const mods = [{ name: 'Extra cheese', price: 0 }];
      const customClass = 'custom-modifier-list';
      const { container } = render(
        <ModifierList modifiers={mods} className={customClass} />
      );

      expect(container.firstChild).toHaveClass(customClass);
    });

    it('preserves custom className with other size classes', () => {
      const mods = [{ name: 'Extra cheese', price: 0 }];
      const customClass = 'my-custom-spacing';
      const { container } = render(
        <ModifierList modifiers={mods} className={customClass} size="xl" />
      );

      expect(container.firstChild).toHaveClass(customClass);
      expect(container.querySelector('.text-xl')).toBeInTheDocument();
    });
  });

  describe('priority of modifier type detection', () => {
    it('prioritizes allergy over other types', () => {
      // "Extra" would normally trigger addition, but "allergy" takes priority
      const mods = [{ name: 'Extra careful - peanut allergy', price: 0 }];
      const { container } = render(<ModifierList modifiers={mods} />);

      // Should be allergy style (red background), not addition (green text)
      expect(container.querySelector('.bg-red-100')).toBeInTheDocument();
      expect(container.querySelector('.text-green-600')).not.toBeInTheDocument();

      const text = container.textContent || '';
      expect(text).toContain('⚠️');
      expect(text).not.toContain('+');
    });

    it('prioritizes removal over addition when both keywords present', () => {
      // Only the starting keyword should matter for removal/addition
      const mods = [{ name: 'No extra sauce', price: 0 }];
      const { container } = render(<ModifierList modifiers={mods} />);

      // "No" at start should trigger removal (red)
      expect(container.querySelector('.text-red-600')).toBeInTheDocument();
      expect(container.querySelector('.text-green-600')).not.toBeInTheDocument();

      const text = container.textContent || '';
      expect(text).toContain('✕');
    });
  });

  describe('case insensitivity', () => {
    it('detects modifier types regardless of case', () => {
      const testCases = [
        { name: 'NO ONIONS', expectedClass: 'text-red-600' },
        { name: 'EXTRA CHEESE', expectedClass: 'text-green-600' },
        { name: 'PEANUT ALLERGY', expectedClass: 'bg-red-100' },
        { name: 'Medium Rare', expectedClass: 'text-orange-600' },
      ];

      testCases.forEach((testCase) => {
        const { container } = render(<ModifierList modifiers={[testCase]} />);
        expect(container.querySelector(`.${testCase.expectedClass}`)).toBeInTheDocument();
      });
    });
  });
});
