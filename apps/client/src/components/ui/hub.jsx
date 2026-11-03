import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { hub } from '@lucasmarkes/hairline';

/**
 * Hub.jsx — Shadcn-compatible theme wrapper for Hairline's Hub figure.
 * 
 * Supports:
 * - `activeTile`: -1 for Core resting state, 0..7 for solitary elevated tile
 * - Exposes `setActiveTile(idx)` via ref to enforce strict master-slave synchronization
 * - Theme-mapped vector tokens: `--hl-plate`, `--hl-hi`, `--hl-edge`, `--hl-lo`
 */
const Hub = forwardRef(function Hub({
  activeTile = -1,
  intensity = 1,
  onRead,
  className = '',
  style = {},
  ...props
}, ref) {
  const containerRef = useRef(null);
  const figureRef = useRef(null);
  const onReadRef = useRef(onRead);

  useEffect(() => {
    onReadRef.current = onRead;
  }, [onRead]);

  useImperativeHandle(ref, () => ({
    setActiveTile: (idx) => {
      if (figureRef.current?.setActiveTile) {
        figureRef.current.setActiveTile(idx);
      }
    },
    figure: figureRef.current,
    container: containerRef.current
  }), []);

  useEffect(() => {
    if (!containerRef.current) return;

    const fig = hub(containerRef.current, {
      intensity,
      play: false,
      onRead: (text) => {
        onReadRef.current?.(text);
      }
    });
    figureRef.current = fig;
    containerRef.current.__hairline = fig;

    // Set initial active tile if specified
    if (activeTile !== undefined && fig.setActiveTile) {
      fig.setActiveTile(activeTile);
    }

    return () => {
      fig.destroy();
      figureRef.current = null;
    };
  }, []);

  // Sync activeTile prop whenever it changes
  useEffect(() => {
    if (figureRef.current?.setActiveTile) {
      figureRef.current.setActiveTile(activeTile);
    }
  }, [activeTile]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full select-none ${className}`}
      style={{
        aspectRatio: '5 / 4',
        ...style
      }}
      {...props}
    />
  );
});

export default Hub;
