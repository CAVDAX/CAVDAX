import React, { useRef, useEffect } from 'react';
import * as hairline from '@lucasmarkes/hairline';

/**
 * HairlineFigure.jsx — Monochromatic Bench-Instrument Hardware Vector Wrapper
 *
 * Renders authentic Lucas Markes Hairline figures (SVG-based):
 * - Zero WebGL contexts (guarantees zero context-loss crashes, zero browser sad-face icons).
 * - Master-grade four-tone isometric shading, bevels, screws, ruler tick marks, and physics springs.
 * - Monochromatic theme variables (--hl-plate, --hl-hi, --hl-edge, --hl-lo, --hl-mid).
 * - Free-floating: no enclosing card or border.
 * - Scroll-Aware Animation: Animates continuously when presently on scroll location,
 *   and smoothly stops/rests when user scrolls away.
 * - Mutex Specialization (padlock):
 *   At rest, firmly locked (shackle seated in body, 0°).
 *   On hover/interaction, smoothly springs open (lift + rotate).
 *   On pointer exit, cleanly swings back and snaps securely locked (zero 26° awkward ajar rest).
 */
export default function HairlineFigure({
  type = 'branches',
  intensity = 1,
  className = '',
  style = {},
  isDarkTheme = true,
  isHovered = false,
  ...props
}) {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);

  // Mount / unmount figure instance and manage scroll-triggered animation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const fn = hairline[type];
    if (typeof fn !== 'function') {
      console.warn(`[HairlineFigure] Unknown figure type: "${type}"`);
      return;
    }

    try {
      const fig = fn(el, {
        intensity,
        play: false
      });
      instanceRef.current = fig;
    } catch (err) {
      console.warn(`[HairlineFigure] Error mounting "${type}":`, err);
    }

    // Mutex Lock Specialization:
    // Lucas Markes' default padlock figure rests at an open 26° pose and auto-tours through 4 arbitrary points.
    // For Distributed Mutex Lock Engine, the invariant resting state is strictly LOCKED (shackle seated in body).
    // Intercept pointerleave in capture phase to prevent resetting to 26°, and dispatch far-field pointermove
    // so the shackle snaps cleanly and securely shut.
    let cleanupPadlock = null;
    if (type === 'padlock') {
      const handlePointerLeave = (e) => {
        e.stopImmediatePropagation();
        const r = el.getBoundingClientRect();
        el.dispatchEvent(
          new PointerEvent('pointermove', {
            clientX: r.left - 800,
            clientY: r.top - 800,
            bubbles: true
          })
        );
      };

      el.addEventListener('pointerleave', handlePointerLeave, true);

      // Force initial lock closure on mount
      const r = el.getBoundingClientRect();
      el.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: r.left - 800,
          clientY: r.top - 800,
          bubbles: true
        })
      );

      cleanupPadlock = () => {
        el.removeEventListener('pointerleave', handlePointerLeave, true);
      };
    }

    // Scroll-triggered dynamic animation: plays when on its scroll location, stops immediately when scrolled off-screen
    // For padlock, tour is suppressed so the lock maintains its authoritative locked invariant at rest.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (instanceRef.current?.update && type !== 'padlock') {
          instanceRef.current.update({ play: entry.isIntersecting });
        }
      },
      {
        threshold: 0.05,
        rootMargin: '0px'
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (cleanupPadlock) cleanupPadlock();
      if (instanceRef.current?.destroy) {
        try {
          instanceRef.current.destroy();
        } catch (e) {
          // Safe unmount
        }
      }
      instanceRef.current = null;
    };
  }, [type]);

  // Handle external hover state (e.g. Card hover triggers padlock unlock/lock cycle)
  useEffect(() => {
    if (type !== 'padlock') return;
    const el = containerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (isHovered) {
      // Unlock: move pointer near center
      el.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: r.left + r.width / 2,
          clientY: r.top + r.height / 2,
          bubbles: true
        })
      );
    } else {
      // Lock: move pointer to far field
      el.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: r.left - 800,
          clientY: r.top - 800,
          bubbles: true
        })
      );
    }
  }, [type, isHovered]);

  // Dynamic Intensity parameter update without unmounting / DOM recreation
  useEffect(() => {
    if (instanceRef.current?.update) {
      instanceRef.current.update({ intensity });
    }
  }, [intensity]);

  const themeVars = {
    '--hl-plate': isDarkTheme ? '#060709' : '#FFFFFF',
    '--hl-hi': isDarkTheme ? '#F8FAFC' : '#0F172A',
    '--hl-edge': isDarkTheme ? '#CBD5E1' : '#475569',
    '--hl-lo': isDarkTheme ? 'rgba(255, 255, 255, 0.28)' : 'rgba(0, 0, 0, 0.16)',
    '--hl-mid': isDarkTheme ? 'rgba(255, 255, 255, 0.38)' : 'rgba(0, 0, 0, 0.26)',
    ...style
  };

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-[420px] mx-auto select-none overflow-visible flex items-center justify-center ${className}`}
      style={{
        aspectRatio: '5 / 4',
        ...themeVars
      }}
      {...props}
    />
  );
}
