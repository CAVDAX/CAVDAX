import React, { useState, useEffect, useRef } from 'react';

/**
 * ShimmerImage — High-performance image loader with smooth shimmer skeleton transition.
 * 
 * Complies with CAVDAX Design Standards:
 * - Fluid horizontal shimmer sweep animation before image decode.
 * - Instant cache-hit detection (naturalWidth > 0) eliminating 1-frame skeleton flash.
 * - Smooth CSS opacity transition (300ms ease-out) once loaded to eliminate abrupt pop-in.
 * - Robust fallback support (fallback ReactNode or fallbackText monogram) on load error or missing src.
 * - Handles src changes, image errors, and responsive container framing.
 */
export default function ShimmerImage({
  src,
  alt = '',
  className = '',
  containerClassName = '',
  fallback = null,
  fallbackText = null,
  fallbackClassName = 'w-full h-full flex items-center justify-center font-mono font-bold text-slate-400 select-none',
  onError,
  onLoad,
  loading = 'lazy',
  draggable = false,
  ...props
}) {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  // Reset loaded status if image source changes (e.g. in lightbox or tier switch)
  useEffect(() => {
    setLoaded(false);
    setHasError(false);
    
    // Check if image is already cached and loaded in memory
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  const isInvalidSrc = !src || typeof src !== 'string' || src.trim().length === 0;
  const shouldRenderFallback = isInvalidSrc || hasError;

  if (shouldRenderFallback && (fallback || fallbackText)) {
    return (
      <div className={`relative overflow-hidden ${containerClassName}`}>
        {fallback || (
          <div className={fallbackClassName}>
            {fallbackText}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${containerClassName}`}>
      {/* Shimmer skeleton layer visible until image is fully decoded */}
      {!loaded && !hasError && !isInvalidSrc && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 shimmer-active pointer-events-none"
        />
      )}

      {!isInvalidSrc && !hasError && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={loading}
          draggable={draggable}
          onLoad={(e) => {
            setLoaded(true);
            if (onLoad) onLoad(e);
          }}
          onError={(e) => {
            setHasError(true);
            if (onError) onError(e);
          }}
          className={`${className} transition-opacity duration-300 ease-out ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...props}
        />
      )}
    </div>
  );
}
