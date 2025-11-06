import { validators } from '@/utils/validation';

/**
 * Shared validation rules for checkout forms
 * Used by both CheckoutPage (online orders) and KioskCheckoutPage
 */
export const checkoutValidationRules = {
  customerEmail: {
    rules: [validators.required, validators.email],
    validateOnBlur: true,
  },
  customerPhone: {
    rules: [validators.required, validators.phone],
    validateOnBlur: true,
  },
  customerName: {
    rules: [validators.required],
    validateOnBlur: true,
  },
};
