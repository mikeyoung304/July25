/**
 * Lazy-loaded route components for code splitting
 * Each route is loaded on-demand to reduce initial bundle size
 */

import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

// Create a loading component for route transitions
const RouteLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner message="Loading..." />
  </div>
);

// Lazy load all major routes with webpackChunkName for better debugging
export const LazyRoutes = {
  // Admin routes
  AdminDashboard: lazy(() => 
    import(/* webpackChunkName: "admin-dashboard" */ '@/pages/AdminDashboard')
  ),
  PerformanceDashboard: lazy(() => 
    import(/* webpackChunkName: "performance" */ '@/pages/PerformanceDashboard')
  ),
  // Settings page not implemented yet
  // Settings: lazy(() => 
  //   import(/* webpackChunkName: "settings" */ '@/pages/Settings')
  // ),
  
  // Kitchen routes
  KitchenDisplay: lazy(() => 
    import(/* webpackChunkName: "kitchen" */ '@/pages/KitchenDisplayMinimal')
  ),
  ExpoPage: lazy(() => 
    import(/* webpackChunkName: "expo" */ '@/pages/ExpoPage')
  ),
  
  // Customer routes
  KioskPage: lazy(() => 
    import(/* webpackChunkName: "kiosk" */ '@/pages/KioskPage')
  ),
  KioskDemo: lazy(() => 
    import(/* webpackChunkName: "kiosk-demo" */ '@/pages/KioskDemo')
  ),
  CheckoutPage: lazy(() => 
    import(/* webpackChunkName: "checkout" */ '@/pages/CheckoutPage')
  ),
  
  // Server routes - using existing ServerView  
  ServerView: lazy(() => 
    import(/* webpackChunkName: "server" */ '@/pages/ServerView').then(m => ({ default: m.ServerView }))
  ),
};

// Wrapper component to handle suspense for lazy routes
interface LazyRouteProps {
  component: React.LazyExoticComponent<any>;
  [key: string]: any;
}

export const LazyRoute: React.FC<LazyRouteProps> = ({ component: Component, ...props }) => (
  <Suspense fallback={<RouteLoader />}>
    <Component {...props} />
  </Suspense>
);

// Preload function for critical routes
export const preloadCriticalRoutes = () => {
  // Preload routes that users are likely to navigate to
  // Note: preload() doesn't exist on LazyExoticComponent, this is for documentation
  // LazyRoutes.KitchenDisplay.preload();
  // LazyRoutes.AdminDashboard.preload();
};

// Preload route based on user role
export const preloadByRole = (role: string) => {
  // Note: preload() doesn't exist on LazyExoticComponent
  // This function is for documentation/future implementation
  switch (role) {
    case 'admin':
      // LazyRoutes.AdminDashboard.preload();
      // LazyRoutes.PerformanceDashboard.preload();
      break;
    case 'kitchen':
      // LazyRoutes.KitchenDisplay.preload();
      // LazyRoutes.ExpoPage.preload();
      break;
    case 'server':
      // LazyRoutes.ServerView?.preload();
      break;
    case 'customer':
      // LazyRoutes.KioskPage.preload();
      // LazyRoutes.CheckoutPage.preload();
      break;
  }
};

// Intersection Observer for preloading routes when links become visible
export const setupRoutePreloading = () => {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const link = entry.target as HTMLAnchorElement;
            const href = link.getAttribute('href');
            
            // Map href to lazy route and preload
            // Note: preload() doesn't exist, this is for future implementation
            if (href?.includes('/admin')) {
              // LazyRoutes.AdminDashboard.preload();
            } else if (href?.includes('/kitchen')) {
              // LazyRoutes.KitchenDisplay.preload();
            } else if (href?.includes('/kiosk')) {
              // LazyRoutes.KioskPage.preload();
            }
            
            observer.unobserve(link);
          }
        });
      },
      { rootMargin: '50px' }
    );
    
    // Observe all navigation links
    document.querySelectorAll('a[href^="/"]').forEach((link) => {
      observer.observe(link);
    });
    
    return observer;
  }
};