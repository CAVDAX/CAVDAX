import React, { useState, useRef, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Portal-Backed Viewport-Clamped Monospace Tooltip
 * Renders into document.body at z-[99999] with strict pixel edge-clamping and auto-flipping,
 * ensuring tooltips NEVER overflow or cut off near screen edges or corners.
 */
export default function Tooltip({
  content,
  shortcut,
  position = 'bottom',
  children,
  className = '',
  disabled = false,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const PADDING = 10;
    const gap = 8;

    const tooltipWidth = tooltipRef.current?.offsetWidth || 110;
    const tooltipHeight = tooltipRef.current?.offsetHeight || 26;

    let targetPos = position;

    // Auto-flip vertical if tight against viewport boundary
    if (targetPos === 'bottom' && rect.bottom + gap + tooltipHeight > viewportHeight - PADDING) {
      if (rect.top - gap - tooltipHeight >= PADDING) {
        targetPos = 'top';
      }
    } else if (targetPos === 'top' && rect.top - gap - tooltipHeight < PADDING) {
      if (rect.bottom + gap + tooltipHeight <= viewportHeight - PADDING) {
        targetPos = 'bottom';
      }
    }

    // Auto-flip horizontal if tight against viewport boundary
    if (targetPos === 'right' && rect.right + gap + tooltipWidth > viewportWidth - PADDING) {
      if (rect.left - gap - tooltipWidth >= PADDING) {
        targetPos = 'left';
      }
    } else if (targetPos === 'left' && rect.left - gap - tooltipWidth < PADDING) {
      if (rect.right + gap + tooltipWidth <= viewportWidth - PADDING) {
        targetPos = 'right';
      }
    }

    let top = 0;
    let left = 0;

    switch (targetPos) {
      case 'top':
        top = rect.top - gap - tooltipHeight;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - gap - tooltipWidth;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + gap;
        break;
      default:
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
    }

    // STRICT SCREEN CLAMPING
    const clampedTop = Math.max(PADDING, Math.min(top, viewportHeight - PADDING - tooltipHeight));
    const clampedLeft = Math.max(PADDING, Math.min(left, viewportWidth - PADDING - tooltipWidth));

    setCoords({ top: clampedTop, left: clampedLeft });
  }, [position]);

  const isTouchDevice = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
      window.innerWidth < 768
    );
  }, []);

  const handleMouseEnter = () => {
    if (disabled || isTouchDevice()) return;
    calculatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const handleClick = () => {
    // Dismiss tooltip immediately when trigger is clicked (e.g. opens a popover, modal, or action)
    setIsVisible(false);
  };

  useLayoutEffect(() => {
    if (disabled && isVisible) {
      setIsVisible(false);
      return;
    }
    if (!disabled && isVisible && !isTouchDevice()) {
      calculatePosition();
    }
  }, [disabled, isVisible, calculatePosition, isTouchDevice]);

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-flex items-center justify-center ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        onClick={handleClick}
      >
        {children}
      </div>

      {typeof document !== 'undefined' &&
        isVisible &&
        createPortal(
          <div
            ref={tooltipRef}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 99999,
              pointerEvents: 'none',
              animation: 'tooltipFadeIn 110ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
            className="select-none pointer-events-none"
          >
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0B0D11] text-slate-100 text-[10px] font-mono uppercase font-bold tracking-tight border border-[#1E293B] shadow-2xl backdrop-blur-md whitespace-nowrap">
              <span>{content}</span>
              {shortcut && (
                <kbd className="hidden md:inline-flex shrink-0 px-1 py-0.2 rounded bg-white/10 text-[8.5px] font-mono font-bold border border-white/15 text-slate-400">
                  {shortcut}
                </kbd>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
