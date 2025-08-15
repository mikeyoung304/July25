import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('homepage accessibility audit', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('keyboard navigation works correctly', async ({ page }) => {
    await page.goto('/');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focusedElement);

    // Test that focus is visible
    const focusedEl = page.locator(':focus');
    await expect(focusedEl).toBeVisible();
    
    // Verify focus indicator exists (either outline or custom focus styles)
    const focusStyles = await focusedEl.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow
      };
    });
    
    const hasFocusIndicator = 
      focusStyles.outline !== 'none' || 
      focusStyles.outlineWidth !== '0px' ||
      focusStyles.boxShadow !== 'none';
    
    expect(hasFocusIndicator).toBeTruthy();
  });

  test('screen reader compatibility', async ({ page }) => {
    await page.goto('/');
    
    // Check for proper heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    const headingLevels = await Promise.all(
      headings.map(h => h.evaluate(el => parseInt(el.tagName.charAt(1))))
    );
    
    // Verify h1 exists and is first
    expect(headingLevels[0]).toBe(1);
    
    // Check for alt text on images
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      const ariaHidden = await img.getAttribute('aria-hidden');
      
      // Images should have alt text, aria-label, or be decorative (aria-hidden)
      expect(alt !== null || ariaLabel !== null || ariaHidden === 'true').toBeTruthy();
    }
    
    // Check for form labels
    const inputs = await page.locator('input, select, textarea').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).count();
        expect(label > 0 || ariaLabel !== null || ariaLabelledBy !== null).toBeTruthy();
      }
    }
  });

  test('color contrast compliance', async ({ page }) => {
    await page.goto('/');
    
    const contrastResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include(['color-contrast'])
      .analyze();
    
    expect(contrastResults.violations).toEqual([]);
  });

  test('motion and animation preferences', async ({ page }) => {
    // Test with reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    
    // Check that animations are reduced or disabled
    const animatedElements = await page.locator('[class*="animate"], [style*="transition"], [style*="animation"]').all();
    
    for (const element of animatedElements) {
      const styles = await element.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          animationDuration: computed.animationDuration,
          transitionDuration: computed.transitionDuration
        };
      });
      
      // With reduced motion, animations should be instant or very short
      const hasReducedMotion = 
        styles.animationDuration === '0s' || 
        styles.transitionDuration === '0s' ||
        parseFloat(styles.animationDuration) <= 0.01 ||
        parseFloat(styles.transitionDuration) <= 0.01;
      
      expect(hasReducedMotion).toBeTruthy();
    }
  });

  test('focus management in modals', async ({ page }) => {
    await page.goto('/');
    
    // Look for modal triggers
    const modalTriggers = await page.locator('[data-testid*="modal"], [aria-haspopup="dialog"], .modal-trigger').all();
    
    for (const trigger of modalTriggers) {
      if (await trigger.isVisible()) {
        // Focus the trigger and activate it
        await trigger.focus();
        await trigger.click();
        
        // Check if modal opened
        const modal = page.locator('[role="dialog"], .modal, [data-testid*="modal"][aria-hidden="false"]').first();
        
        if (await modal.isVisible()) {
          // Focus should be trapped in modal
          await page.keyboard.press('Tab');
          const focusedElement = await page.locator(':focus');
          
          // Focused element should be within the modal
          const isWithinModal = await focusedElement.evaluate((el, modalEl) => {
            return modalEl.contains(el);
          }, await modal.elementHandle());
          
          expect(isWithinModal).toBeTruthy();
          
          // Close modal (ESC key should work)
          await page.keyboard.press('Escape');
          await expect(modal).toBeHidden();
          break;
        }
      }
    }
  });
});