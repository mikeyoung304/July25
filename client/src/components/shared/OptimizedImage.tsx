import React, { useState } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface OptimizedImageProps {
  src: string | undefined;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallbackSrc?: string;
  blurDataUrl?: string;
}

const CATEGORY_FALLBACKS: Record<string, string> = {
  starters: '/images/menu/summer-sampler.jpg',
  salads: '/images/menu/greek-salad.jpg',
  bowls: '/images/menu/soul-bowl.jpg',
  entrees: '/images/menu/peach-chicken.jpg',
  sides: '/images/menu/collard-greens.jpg',
  'veggie-plate': '/images/menu/veggie-plate.jpg',
  default: '/images/menu/summer-sampler.jpg'
};

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width = 400,
  height = 300,
  className = '',
  fallbackSrc,
  blurDataUrl
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { ref, hasIntersected } = useIntersectionObserver({
    rootMargin: '50px',
    freezeOnceVisible: true
  });

  // Determine which image to show
  const imageSrc = imageError || !src ? (fallbackSrc || CATEGORY_FALLBACKS.default) : src;
  
  // Extract category from alt text for smart fallback
  const getCategoryFallback = () => {
    const altLower = alt.toLowerCase();
    for (const [category, fallback] of Object.entries(CATEGORY_FALLBACKS)) {
      if (altLower.includes(category.replace('-', ' '))) {
        return fallback;
      }
    }
    return CATEGORY_FALLBACKS.default;
  };

  const handleError = () => {
    if (!imageError) {
      setImageError(true);
      // Try category-specific fallback
      if (!fallbackSrc) {
        fallbackSrc = getCategoryFallback();
      }
    }
  };

  // Generate srcset for responsive images
  const generateSrcSet = (baseSrc: string) => {
    if (!baseSrc || baseSrc.includes('http')) return undefined;
    
    const _ext = baseSrc.substring(baseSrc.lastIndexOf('.'));
    const _base = baseSrc.substring(0, baseSrc.lastIndexOf('.'));
    
    // For now, use the same image for all sizes (until we have resize service)
    return `${baseSrc} 400w, ${baseSrc} 800w`;
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Blur placeholder or skeleton */}
      {!imageLoaded && (
        <div 
          className="absolute inset-0 bg-gray-100"
          style={{
            backgroundImage: blurDataUrl ? `url(${blurDataUrl})` : undefined,
            backgroundSize: 'cover',
            filter: blurDataUrl ? 'blur(20px)' : undefined
          }}
        >
          {!blurDataUrl && (
            <div className="w-full h-full animate-pulse bg-gradient-to-br from-gray-100 to-gray-200" />
          )}
        </div>
      )}
      
      {/* Main image - only load when in viewport */}
      {hasIntersected && (
        <picture>
          {/* WebP source for browsers that support it (97%+ coverage) */}
          <source
            type="image/webp"
            srcSet={imageSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp')}
          />

          <img
            src={imageSrc}
            alt={alt}
            width={width}
            height={height}
            loading="lazy"
            decoding="async"
            srcSet={generateSrcSet(imageSrc)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
            className={`transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={handleError}
          />
        </picture>
      )}
    </div>
  );
};