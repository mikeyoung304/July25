/**
 * Hook to determine if the application is running in demo mode.
 * Demo mode is active when:
 * - Stripe publishable key is not configured
 * - Stripe key is set to 'demo'
 * - Running in development mode
 * - VITE_ENVIRONMENT is set to 'development'
 */
export function useDemoMode(): boolean {
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
  return !stripeKey ||
         stripeKey === 'demo' ||
         import.meta.env.DEV ||
         import.meta.env.VITE_ENVIRONMENT === 'development';
}
