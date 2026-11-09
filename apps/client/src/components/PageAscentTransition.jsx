import React, { useEffect, useState } from 'react';

/**
 * PageAscentTransition
 * Exact WaveTone kinetic motion profile:
 * - Exponential spring curve: cubic-bezier(0.22, 1, 0.36, 1)
 * - Cinematic duration: 550ms
 * - Fluid translation distance: 22px
 * - Zero-flicker fill-mode: both
 */
export default function PageAscentTransition({
  children,
  routeKey,
  distance = 22,
  duration = 550,
  className = ''
}) {
  const [animating, setAnimating] = useState(true);

  useEffect(() => {
    setAnimating(true);
    const timer = setTimeout(() => {
      setAnimating(false);
    }, duration + 100);
    return () => clearTimeout(timer);
  }, [routeKey, duration]);

  // Respect OS-level reduced motion preferences
  const isReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  if (isReducedMotion || distance === 0) {
    return <main id="main-content" className={`w-full ${className}`}>{children}</main>;
  }

  return (
    <main
      id="main-content"
      key={routeKey}
      onAnimationEnd={() => setAnimating(false)}
      className={`page-ascent-wrapper w-full ${className}`}
      style={{
        animation: animating ? `cavdaxPageAscentIn ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) both` : 'none',
        transform: animating ? undefined : 'none',
        willChange: animating ? 'opacity, transform' : 'auto'
      }}
    >
      <style>{`
        @keyframes cavdaxPageAscentIn {
          0% {
            opacity: 0;
            transform: translate3d(0, ${distance}px, 0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .page-ascent-wrapper {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
      {children}
    </main>
  );
}
