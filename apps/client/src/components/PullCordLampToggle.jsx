import React, { useState, useEffect, useRef, useCallback } from 'react';
import { playClick } from '../utils/soundFx';

/**
 * PullCordLampToggle — Physics-based stretchy pull-string lamp button.
 *
 * Designed specifically for the CAVDAX Wordmark Intro viewport.
 * Features:
 * - Dynamic spring & pendulum physics (Hooke's elasticity, gravity, damping, ambient breeze).
 * - Multi-segment elastic chain simulation that bends and stretches realistically.
 * - Completely unrestricted free-form drag & rotation across all directions.
 * - Knowledge Graph Node Orb Anchor with gold aura in Dark Mode (no inner dot).
 * - Bold filled-up architectural Sun icon inside the acorn bob.
 * - Bidirectional Dark <-> Light theme toggle with haptic sound and lamp pulse glow.
 * - Drifts and fades smoothly as the user scrolls into the Overview page.
 */
export default function PullCordLampToggle({
  id = 'wordmark-lamp-toggle',
  isDarkTheme = true,
  onToggleTheme,
  opacity = 1,
  className = ''
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const svgRef = useRef(null);
  const animFrameRef = useRef(null);
  const glowCircleRef = useRef(null);
  const beadedPathRef = useRef(null);
  const corePathRef = useRef(null);
  const bobGroupRef = useRef(null);
  const tooltipRef = useRef(null);

  // Physics simulation constants
  const ANCHOR_X = 180;
  const ANCHOR_Y = 24; // Attached to center of the Graph Node Orb
  const REST_LENGTH = 140;
  const NUM_SEGMENTS = 8;
  const TRIGGER_STRETCH = 26; // pixels of stretch required to switch

  // State refs for 60-120fps physics loop without React re-render lag
  const physicsRef = useRef({
    // Bob position and velocity
    x: ANCHOR_X,
    y: REST_LENGTH,
    vx: 0,
    vy: 0,
    // Drag tracking
    isDragging: false,
    dragStartY: 0,
    dragStartX: 0,
    initialBobX: ANCHOR_X,
    initialBobY: REST_LENGTH,
    hasFlippedThemeInPull: false,
    // Spring physics parameters (Hooke's law with tuned damping for crisp recoil)
    stiffness: 0.14,
    damping: 0.88,
    breezeTime: 0,
    // Click impulse animation
    isAutoPulling: false,
    autoPullProgress: 0
  });



  // Sound and theme trigger
  const triggerToggle = useCallback(() => {
    playClick();
    if (onToggleTheme) {
      onToggleTheme();
    }
  }, [onToggleTheme]);

  // Main physics loop (direct DOM updates for zero React state thrashing, pauses when off-screen)
  useEffect(() => {
    // If cord is invisible/scrolled out, sleep physics loop completely
    if (opacity <= 0.01) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    let lastTime = performance.now();

    const loop = (currentTime) => {
      const dt = Math.min((currentTime - lastTime) / 16.666, 2.0); // normalized delta time
      lastTime = currentTime;

      const p = physicsRef.current;
      p.breezeTime += 0.03 * dt;

      // 1. Calculate ambient micro-breeze (sways gently when idle)
      const breeze = !p.isDragging && !p.isAutoPulling 
        ? Math.sin(p.breezeTime) * 1.5 + Math.sin(p.breezeTime * 2.3) * 0.7 
        : 0;

      // 2. Target anchor and position calculation
      let targetX = ANCHOR_X + breeze;
      let targetY = REST_LENGTH;

      if (p.isAutoPulling) {
        // Scripted click snap bounce animation
        p.autoPullProgress += 0.07 * dt;
        if (p.autoPullProgress < 1) {
          const easeDown = Math.sin(p.autoPullProgress * Math.PI * 0.5);
          targetY = REST_LENGTH + easeDown * 50;
        } else {
          if (!p.hasFlippedThemeInPull) {
            triggerToggle();
            p.hasFlippedThemeInPull = true;
          }
          if (p.autoPullProgress >= 1.22) {
            p.isAutoPulling = false;
            p.autoPullProgress = 0;
            p.hasFlippedThemeInPull = false;
            p.vy = -22; // sharp upward recoil impulse
          } else {
            targetY = REST_LENGTH + 50;
          }
        }
      }

      if (!p.isDragging && !p.isAutoPulling) {
        // True spring pendulum physics towards rest position (Hooke's law: F = -k * displacement)
        // Equilibrium is at (targetX, targetY). Zero phantom gravity kick at rest!
        const dx = targetX - p.x;
        const dy = targetY - p.y;

        const fx = dx * p.stiffness;
        const fy = dy * p.stiffness;

        p.vx = (p.vx + fx * dt) * Math.pow(p.damping, dt);
        p.vy = (p.vy + fy * dt) * Math.pow(p.damping, dt);

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Defensive radial & bounding clamp: prevent cord from ever exceeding physical length (240px)
        const curDistFromAnchor = Math.hypot(p.x - ANCHOR_X, p.y - ANCHOR_Y);
        const MAX_PHYSICAL_DIST = 240;
        if (curDistFromAnchor > MAX_PHYSICAL_DIST) {
          const angle = Math.atan2(p.y - ANCHOR_Y, p.x - ANCHOR_X);
          p.x = ANCHOR_X + Math.cos(angle) * MAX_PHYSICAL_DIST;
          p.y = ANCHOR_Y + Math.sin(angle) * MAX_PHYSICAL_DIST;
          p.vx *= 0.5;
          p.vy *= 0.5;
        }
      }

      // 3. Construct unified smooth catenary / cubic Bézier curve from anchor to bob
      // Completely eliminates node vibration, alternating velocity overshoots, and initial zigzagging
      const currentDist = Math.hypot(p.x - ANCHOR_X, p.y - ANCHOR_Y);
      const restChord = REST_LENGTH - ANCHOR_Y;
      const slack = Math.max(0, restChord - currentDist);

      // Tangent-aligned cubic control points: straight line at rest, gentle catenary curve when slack
      const cp1X = ANCHOR_X + (p.x - ANCHOR_X) * 0.25;
      const cp1Y = ANCHOR_Y + (p.y - ANCHOR_Y) * 0.45 + slack * 0.35;
      const cp2X = ANCHOR_X + (p.x - ANCHOR_X) * 0.75;
      const cp2Y = ANCHOR_Y + (p.y - ANCHOR_Y) * 0.75 + slack * 0.45;

      const d = `M ${ANCHOR_X} ${ANCHOR_Y} C ${cp1X.toFixed(1)} ${cp1Y.toFixed(1)}, ${cp2X.toFixed(1)} ${cp2Y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;

      // 4. Natural bob rotation tangent to the incoming cord segment
      const segDx = p.x - cp2X;
      const segDy = p.y - cp2Y;
      const rawAngle = Math.atan2(segDx, segDy) * (180 / Math.PI);

      // Direct DOM updates: 0 React re-renders per second!
      if (glowCircleRef.current) {
        glowCircleRef.current.setAttribute('cx', p.x.toFixed(1));
        glowCircleRef.current.setAttribute('cy', p.y.toFixed(1));
      }
      if (beadedPathRef.current) {
        beadedPathRef.current.setAttribute('d', d);
      }
      if (corePathRef.current) {
        corePathRef.current.setAttribute('d', d);
      }
      if (bobGroupRef.current) {
        bobGroupRef.current.setAttribute('transform', `translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) rotate(${rawAngle.toFixed(2)})`);
      }
      if (tooltipRef.current) {
        tooltipRef.current.style.transform = `translate3d(calc(${p.x.toFixed(1)}px - 50%), calc(${p.y.toFixed(1)}px + 28px), 0)`;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
      } else if (!animFrameRef.current && opacity > 0.01) {
        lastTime = performance.now();
        animFrameRef.current = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [triggerToggle, opacity]);

  // Pointer drag interactions (Free-form 360 drag with natural pendulum swing)
  const handlePointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // On touch devices, disable drag to prevent accidental pull-to-refresh & trigger spring click
    const isTouch = typeof window !== 'undefined' && 
      (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || window.innerWidth < 768);

    if (isTouch) {
      handleClick(e);
      return;
    }

    const p = physicsRef.current;
    p.isDragging = true;
    setIsPulling(true);
    p.isAutoPulling = false;
    p.hasFlippedThemeInPull = false;
    p.dragStartY = e.clientY;
    p.dragStartX = e.clientX;
    p.initialBobX = p.x;
    p.initialBobY = p.y;

    const onPointerMove = (moveEv) => {
      if (!p.isDragging) return;
      const dx = moveEv.clientX - p.dragStartX;
      const dy = moveEv.clientY - p.dragStartY;

      // Free-form unconstrained drag in all directions
      const rawTargetX = p.initialBobX + dx;
      const rawTargetY = p.initialBobY + dy;

      // Calculate distance & angle from anchor
      const distFromAnchor = Math.hypot(rawTargetX - ANCHOR_X, rawTargetY - ANCHOR_Y);
      const angleFromAnchor = Math.atan2(rawTargetY - ANCHOR_Y, rawTargetX - ANCHOR_X);

      // Max elasticity stretch distance (240px) and min distance from anchor orb (32px)
      const maxDist = 240;
      const minDist = 32;
      const clampedDist = Math.max(minDist, Math.min(maxDist, distFromAnchor));

      p.x = ANCHOR_X + Math.cos(angleFromAnchor) * clampedDist;
      p.y = ANCHOR_Y + Math.sin(angleFromAnchor) * clampedDist;

      // Check if pull stretch threshold crossed (works in any pull direction)
      const stretchAmount = clampedDist - (REST_LENGTH - ANCHOR_Y);
      if (stretchAmount >= TRIGGER_STRETCH && !p.hasFlippedThemeInPull) {
        triggerToggle();
        p.hasFlippedThemeInPull = true;
      }
    };

    const onPointerUp = () => {
      p.isDragging = false;
      setIsPulling(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      // Clean release: zero artificial impulse so Hooke's restoring spring smoothly returns the bob to rest
      p.vx = 0;
      p.vy = 0;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  // Click on bob triggers instant theme flip + physical spring snap bounce
  const handleClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const p = physicsRef.current;
    if (p.isDragging) return;

    triggerToggle();
    p.isAutoPulling = false;
    p.vy = 26; // strong downward impulse that stretches the string and springs back
  };

  return (
    <div
      id={id}
      style={{
        position: 'fixed',
        top: 0,
        width: '360px',
        height: '360px',
        zIndex: 40,
        opacity,
        visibility: opacity <= 0.01 ? 'hidden' : 'visible',
        display: opacity <= 0.01 ? 'none' : 'flex',
        pointerEvents: 'none',
        transition: 'opacity 0.25s ease, visibility 0.25s ease'
      }}
      className={`fixed top-0 left-1/2 -translate-x-1/2 sm:left-auto sm:right-10 sm:translate-x-0 z-40 select-none pointer-events-none flex flex-col items-center ${className}`}
    >
      {/* Ceiling Connection Stem */}
      <div className="w-[1.5px] h-3 bg-slate-400/80 dark:bg-amber-400/30" style={{ width: '1.5px', height: '12px' }} />

      {/* 2. Interactive SVG Stretchy Chain + Pull Bob Canvas */}
      <div 
        style={{ position: 'relative', width: '360px', height: '360px', margin: '-4px auto 0 auto' }}
        className="relative w-[360px] h-[360px] -mt-1 cursor-default select-none"
      >
        <svg
          ref={svgRef}
          width="360"
          height="360"
          viewBox="0 0 360 360"
          style={{ width: '360px', height: '360px', overflow: 'visible' }}
          className="overflow-visible"
        >
          <defs>
            {/* Lamp Bulb Radial Glow in Dark Theme (Warm Gold) */}
            <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity={isDarkTheme ? "0.45" : "0.55"} />
              <stop offset="60%" stopColor={isDarkTheme ? "#F59E0B" : "#F59E0B"} stopOpacity={isDarkTheme ? "0.3" : "0.15"} />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>

            

            {/* Chain drop shadow */}
            <filter id="cordShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.25" />
            </filter>
          </defs>

          

          {/* Ambient subtle light aura around bob */}
          <circle
            ref={glowCircleRef}
            cx={ANCHOR_X}
            cy={REST_LENGTH}
            r="26"
            fill="url(#lampGlow)"
            className="pointer-events-none opacity-80"
          />

          {/* The Elastic Cord / Beaded Pull String */}
          <path
            ref={beadedPathRef}
            d={`M ${ANCHOR_X} ${ANCHOR_Y} L ${ANCHOR_X} ${REST_LENGTH}`}
            fill="none"
            stroke={isDarkTheme ? '#E2E8F0' : '#334155'}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeDasharray="1 3.5" // Beaded chain texture
            filter="url(#cordShadow)"
            className="transition-colors duration-200"
          />

          {/* Secondary solid inner core line for tensile depth */}
          <path
            ref={corePathRef}
            d={`M ${ANCHOR_X} ${ANCHOR_Y} L ${ANCHOR_X} ${REST_LENGTH}`}
            fill="none"
            stroke={isDarkTheme ? '#94A3B8' : '#64748B'}
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.6"
          />

          {/* ══════════════════════════════════════════════════════════
              KNOWLEDGE GRAPH VERTEX ORB ANCHOR (FalkorDB Graph Node)
              ══════════════════════════════════════════════════════════ */}
          <g transform={`translate(${ANCHOR_X}, ${ANCHOR_Y})`} className="pointer-events-none">
            {/* Outer Graph Halo Orbit (Gold shadow in Dark theme) */}
            <circle
              cx="0"
              cy="0"
              r={17 + (isPulling ? 2.5 : 0)}
              fill="none"
              stroke={isDarkTheme ? "rgba(245, 158, 11, 0.55)" : "rgba(15, 23, 42, 0.3)"}
              strokeWidth="1.3"
              strokeDasharray="3 3"
              className="transition-all duration-300"
            />

            {/* Ambient Radial Aura around Node (Warm Gold Shadow in Dark) */}
            <circle
              cx="0"
              cy="0"
              r="24"
              fill={isDarkTheme ? "rgba(245, 158, 11, 0.22)" : "rgba(15, 23, 42, 0.05)"}
              className="transition-all duration-300"
            />

            {/* Solid Graph Vertex Body (Pure Luminous Sphere - NO INNER DOT) */}
            <circle
              cx="0"
              cy="0"
              r="11"
              fill={isDarkTheme ? "#141720" : "#FFFFFF"}
              stroke={isDarkTheme ? (isPulling ? "#F59E0B" : "#D97706") : (isPulling ? "#0F172A" : "#94A3B8")}
              strokeWidth="2"
              filter="url(#cordShadow)"
              className="transition-colors duration-200"
            />

            {/* Bottom Cord Socket / Hinge Joint */}
            <circle
              cx="0"
              cy="11"
              r="2.2"
              fill={isDarkTheme ? "#F59E0B" : "#475569"}
            />
          </g>

          {/* The Tactile Pull Bob / Acorn Lamp Switch */}
          <g
            ref={bobGroupRef}
            role="button"
            tabIndex={0}
            aria-label="Toggle theme pull cord"
            style={{ pointerEvents: opacity <= 0.01 ? 'none' : 'auto' }}
            transform={`translate(${ANCHOR_X}, ${REST_LENGTH}) rotate(0)`}
            onPointerDown={handlePointerDown}
            onClick={handleClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick(e);
              }
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="cursor-default select-none focus:outline-none"
          >
            {/* Extended invisible touch target for easy grabbing */}
            <circle cx="0" cy="8" r="26" fill="transparent" />

            {/* Top Collar Ring */}
            <ellipse
              cx="0"
              cy="-2"
              rx="4"
              ry="2"
              fill={isDarkTheme ? '#94A3B8' : '#475569'}
            />

            {/* Main Acorn / Cylinder Bob Body */}
            <path
              d="M -6 0 L 6 0 C 7 10, 5 18, 0 22 C -5 18, -7 10, -6 0 Z"
              fill={isDarkTheme ? '#FFFFFF' : '#0F172A'}
              stroke={isDarkTheme ? '#CBD5E1' : '#1E293B'}
              strokeWidth="1"
              filter="url(#cordShadow)"
              className="transition-colors duration-200"
            />

            {/* Decorative knurled grip bands on the bob */}
            <line x1="-5" y1="5" x2="5" y2="5" stroke={isDarkTheme ? '#94A3B8' : '#64748B'} strokeWidth="0.8" opacity="0.6" />
            <line x1="-5" y1="9" x2="5" y2="9" stroke={isDarkTheme ? '#94A3B8' : '#64748B'} strokeWidth="0.8" opacity="0.6" />
            <line x1="-4" y1="13" x2="4" y2="13" stroke={isDarkTheme ? '#94A3B8' : '#64748B'} strokeWidth="0.8" opacity="0.6" />

            {/* Bottom Accent Ring / Terminal Bead */}
            <circle
              cx="0"
              cy="23"
              r="2"
              fill={isDarkTheme ? '#F59E0B' : '#F59E0B'}
              className="transition-colors duration-200"
            />

            {/* Glowing Lamp Filament / Sun-Moon Icon inside the Bob */}
            <g transform="translate(0, 9)">
              {isDarkTheme ? (
                // Bold Filled-up Architectural Sun Icon (Warm Radiant Gold Filament)
                <g fill="#F59E0B" style={{ filter: 'drop-shadow(0 0 2.5px rgba(245, 158, 11, 0.75))' }}>
                  {/* Solid Center Disc */}
                  <circle cx="0" cy="0" r="3.6" />
                  {/* 8 Crisp Chiseled Solid Triangular Rays */}
                  <polygon points="-1,-4.8 1,-4.8 0,-7.5" />
                  <polygon points="-1,4.8 1,4.8 0,7.5" />
                  <polygon points="4.8,-1 4.8,1 7.5,0" />
                  <polygon points="-4.8,-1 -4.8,1 -7.5,0" />
                  <polygon points="2.8,-3.8 3.8,-2.8 5.6,-5.6" />
                  <polygon points="2.8,3.8 3.8,2.8 5.6,5.6" />
                  <polygon points="-2.8,3.8 -3.8,2.8 -5.6,5.6" />
                  <polygon points="-2.8,-3.8 -3.8,-2.8 -5.6,-5.6" />
                </g>
              ) : (
                // Moon Icon (Inviting dark mode)
                <path
                  d="M 2.2 -4 A 4.2 4.2 0 1 0 2.2 4 A 3 3 0 0 1 2.2 -4 Z"
                  fill="#FFFFFF"
                />
              )}
            </g>
          </g>
        </svg>

        {/* 3. Floating Tooltip / Interactive Prompt on Hover */}
        <div
          ref={tooltipRef}
          style={{
            transform: `translate3d(calc(${ANCHOR_X}px - 50%), calc(${REST_LENGTH}px + 28px), 0)`,
            opacity: isHovered || isPulling ? 1 : 0,
            pointerEvents: 'none'
          }}
          className="absolute top-0 left-0 transition-opacity duration-200 whitespace-nowrap z-50 flex flex-col items-center"
        >
          <div className="px-2.5 py-1 rounded-full text-[9px] font-mono font-medium tracking-tight bg-slate-900/90 dark:bg-white/95 text-white dark:text-slate-950 shadow-md backdrop-blur-md border border-white/10 dark:border-slate-800/10 flex items-center gap-1.5">
            <span>{isPulling ? 'Release to toggle' : isDarkTheme ? 'Pull for Light' : 'Pull for Dark'}</span>
            <span className="text-[8px] opacity-60">↓</span>
          </div>
        </div>
      </div>
    </div>
  );
}
