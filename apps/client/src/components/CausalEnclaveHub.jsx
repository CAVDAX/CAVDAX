import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { playClick } from '../utils/soundFx';
import Hub from './ui/hub';

/**
 * CausalEnclaveHub.jsx — The Causal Interception Enclave (Hero Theater Scroller)
 * 
 * Architectural Highlights:
 * - 3D Grid Rotation: Starts in front-face top view at Core (Stage 0) and smoothly
 *   rotates in 3D perspective to side isometric view as you scroll through sectors.
 * - Dynamic 2D-to-3D Node Bloom: Glyphs exist statically on the 2D surface of the tile lid;
 *   as the node elevates, the glyph physically rises with the slab and blossoms into a 
 *   front-facing card badge (zero lag, continuous physical motion).
 * - Watery Arc Reactor Fluid Fill: When Core is active or hovered, an internal wave
 *   rises inside the triangle with a subtle luminous liquid ripple.
 * - Physics Spring Settle: Arc Reactor smoothly settles down with zero jerk.
 * - Solitary Node Elevation: Strictly the active node rises (FALL = [1, 0, 0, 0, 0]).
 * - Clean Typography: Subtitle tag removed alongside heading for pure Swiss typography.
 * - Clean Cursor: Default normal cursor restored.
 */

const ENCLAVE_STAGES = [
  {
    id: 'kernel',
    indexStr: 'CORE',
    title: 'Causal Semiring Kernel',
    tag: 'FalkorDB GraphBLAS Matrix',
    desc: 'Central algebraic semiring computing reachability and causal invalidation in sub-2ms sweeps.',
    coord: [200, 182],
    restCoord: [200, 169.66],
    elevatedCoord: [200, 169.66]
  },
  {
    id: 'claude-mcp',
    indexStr: '01',
    title: 'Claude Code MCP Gate',
    tag: 'Tool Gate Interceptor',
    desc: 'Intercepts filesystem write operations in-flight, blocking obsolete code mutations before disk writes.',
    coord: [205, 112],
    restCoord: [204.98, 112.57],
    elevatedCoord: [204.98, 70.50]
  },
  {
    id: 'cursor-stdio',
    indexStr: '02',
    title: 'Cursor IDE Transceiver',
    tag: 'In-Flight Stdio Stream',
    desc: 'Low-latency stdio bridge delivering instant topological feedback directly into editor buffers.',
    coord: [260, 144],
    restCoord: [260.36, 144.61],
    elevatedCoord: [260.36, 102.54]
  },
  {
    id: 'git-ast',
    indexStr: '03',
    title: 'Git AST Diff Extractor',
    tag: 'Optical Parser Engine',
    desc: 'Extracts architectural deltas from commit graphs, detecting implementation drift from active ADRs.',
    coord: [328, 179],
    restCoord: [328.18, 179.77],
    elevatedCoord: [328.18, 137.70]
  },
  {
    id: 'adr-store',
    indexStr: '04',
    title: 'ADR Invariant Store',
    tag: 'Architectural Ledger',
    desc: 'Single source of truth, preserving superseded and active decision lineages to prevent semantic blindness.',
    coord: [263, 207],
    restCoord: [262.85, 207.46],
    elevatedCoord: [262.85, 165.39]
  },
  {
    id: 'falkordb-mesh',
    indexStr: '05',
    title: 'GraphBLAS Matrix Mesh',
    tag: 'Reachability Semiring',
    desc: 'Sparse matrix algebraic semiring computing multi-hop reachability across the full dependency DAG.',
    coord: [201, 243],
    restCoord: [200.62, 244.17],
    elevatedCoord: [200.62, 202.10]
  },
  {
    id: 'cicd-gate',
    indexStr: '06',
    title: 'CI/CD Gate Harness',
    tag: 'PR Enforcement Gate',
    desc: 'Fails pull requests automatically if code commits rely on deprecated architectural claims.',
    coord: [131, 209],
    restCoord: [130.93, 209.95],
    elevatedCoord: [130.93, 167.88]
  },
  {
    id: 'audit-ledger',
    indexStr: '07',
    title: 'Cryptographic Audit Trail',
    tag: 'Signed Verification Log',
    desc: 'Tamper-evident execution ledger capturing every agent interception and deterministic verdict.',
    coord: [76, 177],
    restCoord: [75.55, 177.90],
    elevatedCoord: [75.55, 135.83]
  },
  {
    id: 'repair-loop',
    indexStr: '08',
    title: 'Closed-Loop Auto-Repair',
    tag: 'Autonomous Self-Healing',
    desc: 'Returns the exact causal desync path upon block, prompting the agent to self-heal without human triage.',
    coord: [136, 141],
    restCoord: [135.91, 142.12],
    elevatedCoord: [135.91, 100.06]
  }
];

// Authentic isometric concentric squircle contours matching all 3 physical tiers of the center slab
const SQUIRCLE_INNER = "M 2.49 7.47 L 1.96 7.69 L 1.35 7.85 L 0.69 7.95 L 0 7.98 L -0.69 7.95 L -1.35 7.85 L -1.96 7.69 L -2.49 7.47 L -14.93 1.24 L -15.37 0.98 L -15.7 0.67 L -15.9 0.34 L -15.97 0 L -15.9 -0.34 L -15.7 -0.67 L -15.37 -0.98 L -14.93 -1.24 L -2.49 -7.47 L -1.96 -7.69 L -1.35 -7.85 L -0.69 -7.95 L 0 -7.98 L 0.69 -7.95 L 1.35 -7.85 L 1.96 -7.69 L 2.49 -7.47 L 14.93 -1.24 L 15.37 -0.98 L 15.7 -0.67 L 15.9 -0.34 L 15.97 0 L 15.9 0.34 L 15.7 0.67 L 15.37 0.98 L 14.93 1.24 Z";
const SQUIRCLE_MID = "M 6.51 13.64 L 6.07 13.85 L 5.84 13.95 L 5.28 14.14 L 4.65 14.35 L 4.45 14.40 L 3.72 14.55 L 2.94 14.72 L 2.76 14.74 L 1.92 14.83 L 0.00 14.92 L -1.92 14.83 L -2.76 14.74 L -2.94 14.72 L -3.72 14.55 L -4.45 14.40 L -4.65 14.35 L -5.28 14.14 L -5.84 13.95 L -6.07 13.85 L -6.51 13.64 L -30.63 1.57 L -30.91 1.40 L -31.15 1.18 L -31.34 0.92 L -31.49 0.63 L -31.58 0.32 L -31.61 0.00 L -31.58 -0.32 L -31.49 -0.64 L -31.34 -0.93 L -31.15 -1.18 L -30.91 -1.40 L -30.63 -1.57 L -6.51 -13.64 L -6.07 -13.86 L -5.84 -13.95 L -5.28 -14.14 L -4.65 -14.35 L -4.45 -14.40 L -3.72 -14.56 L -2.94 -14.72 L -2.76 -14.74 L -1.92 -14.83 L 0.00 -14.92 L 1.92 -14.83 L 2.76 -14.74 L 2.94 -14.72 L 3.72 -14.56 L 4.45 -14.40 L 4.65 -14.35 L 5.28 -14.14 L 5.84 -13.95 L 6.07 -13.86 L 6.51 -13.64 L 30.63 -1.57 L 30.91 -1.40 L 31.15 -1.18 L 31.34 -0.93 L 31.49 -0.64 L 31.58 -0.32 L 31.61 0.00 L 31.58 0.32 L 31.49 0.63 L 31.34 0.92 L 31.15 1.18 L 30.91 1.40 L 30.63 1.57 Z";
const SQUIRCLE_OUTER = "M 7.69 16.00 L 7.09 16.30 L 6.86 16.39 L 6.12 16.64 L 5.34 16.90 L 5.14 16.96 L 4.25 17.14 L 3.34 17.33 L 3.16 17.36 L 2.18 17.45 L 0.00 17.56 L -2.18 17.45 L -3.16 17.36 L -3.34 17.33 L -4.25 17.14 L -5.14 16.96 L -5.34 16.90 L -6.12 16.64 L -6.86 16.39 L -7.09 16.30 L -7.69 16.00 L -35.07 2.31 L -35.60 2.04 L -35.87 1.88 L -36.25 1.59 L -36.49 1.41 L -36.74 1.19 L -36.93 0.93 L -37.08 0.64 L -37.17 0.32 L -37.20 0.00 L -37.17 -0.33 L -37.08 -0.64 L -36.93 -0.93 L -36.74 -1.19 L -36.49 -1.41 L -36.25 -1.59 L -35.87 -1.88 L -35.60 -2.04 L -35.07 -2.31 L -7.69 -16.00 L -7.09 -16.30 L -6.86 -16.40 L -6.12 -16.64 L -5.34 -16.90 L -5.14 -16.96 L -4.25 -17.14 L -3.34 -17.33 L -3.16 -17.36 L -2.18 -17.45 L 0.00 -17.56 L 2.18 -17.45 L 3.16 -17.36 L 3.34 -17.33 L 4.25 -17.14 L 5.14 -16.96 L 5.34 -16.90 L 6.12 -16.64 L 6.86 -16.40 L 7.09 -16.30 L 7.69 -16.00 L 35.07 -2.31 L 35.60 -2.04 L 35.87 -1.88 L 36.25 -1.59 L 36.49 -1.41 L 36.74 -1.19 L 36.93 -0.93 L 37.08 -0.64 L 37.17 -0.33 L 37.20 0.00 L 37.17 0.32 L 37.08 0.64 L 36.93 0.93 L 36.74 1.19 L 36.49 1.41 L 36.25 1.59 L 35.87 1.88 L 35.60 2.04 L 35.07 2.31 Z";

// 3D Camera Angles: Cinematic dynamic tracking, orbit tilt, and zoom for each subsystem stage
const STAGE_CAMERAS = [
  // 0: CORE (Architectural Overview - Front-Face Top Perspective)
  { pitch: 30, yaw: 0, roll: 0, tx: 0, ty: 22, tz: -30, scale: 1.04 },
  
  // 1: Claude Code MCP Gate (Top-Center: Camera pitches up, shifts down to center top node)
  { pitch: 10, yaw: 0, roll: 0, tx: 0, ty: 38, tz: 40, scale: 1.15 },
  
  // 2: Cursor IDE Transceiver (Top-Right: Camera pans left, yaws slightly toward right corner)
  { pitch: 7, yaw: -6, roll: 0, tx: -34, ty: 22, tz: 35, scale: 1.14 },
  
  // 3: Git AST Diff Extractor (East Flank: Camera pans left, yaws inward to frame right wing)
  { pitch: 3, yaw: -8, roll: 0, tx: -55, ty: 0, tz: 45, scale: 1.15 },
  
  // 4: ADR Invariant Store (Bottom-Right: Camera pans left-up, tilts downward)
  { pitch: -6, yaw: -6, roll: 0, tx: -35, ty: -24, tz: 35, scale: 1.14 },
  
  // 5: GraphBLAS Matrix Mesh (Bottom-Center: Camera pitches down, shifts up to center bottom node)
  { pitch: -10, yaw: 0, roll: 0, tx: 0, ty: -42, tz: 40, scale: 1.15 },
  
  // 6: CI/CD Gate Harness (Bottom-Left: Camera pans right-up, yaws inward)
  { pitch: -6, yaw: 6, roll: 0, tx: 35, ty: -24, tz: 35, scale: 1.14 },
  
  // 7: Cryptographic Audit Trail (West Flank: Camera pans right, yaws inward to frame left wing)
  { pitch: 3, yaw: 8, roll: 0, tx: 55, ty: 0, tz: 45, scale: 1.15 },
  
  // 8: Closed-Loop Auto-Repair (Top-Left: Camera pans right-down, yaws toward top-left corner)
  { pitch: 7, yaw: 6, roll: 0, tx: 34, ty: 22, tz: 35, scale: 1.14 },
];

// Clean vector icons for each subsystem
function SubsystemGlyphVector({ stepIndex }) {
  const gProps = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "0.95",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    vectorEffect: "non-scaling-stroke"
  };

  switch (stepIndex) {
    case 1: // Claude MCP Gate: Interception Barrier Port
      return (
        <g {...gProps}>
          {/* Stanchion gateway boundaries */}
          <path d="M -5.5 -4.5 V 4.5" />
          <path d="M 5.5 -4.5 V 4.5" />
          {/* In-flight tool call interception beam with central trigger node */}
          <line x1="-5.5" y1="0" x2="-1.8" y2="0" />
          <line x1="1.8" y1="0" x2="5.5" y2="0" />
          <circle cx="0" cy="0" r="1.05" fill="currentColor" />
        </g>
      );
    case 2: // Cursor Stdio Transceiver: Stream prompt (Universal IDE standard)
      return (
        <g {...gProps}>
          <path d="M-5 -4L0 0L-5 4" />
          <line x1="2" y1="4" x2="6" y2="4" />
        </g>
      );
    case 3: // Git AST Diff Extractor: Canonical Git Branch & Syntax Delta
      return (
        <g {...gProps}>
          <circle cx="-3" cy="-3.5" r="1.15" />
          <circle cx="-3" cy="3.5" r="1.15" />
          <circle cx="3.5" cy="0" r="1.15" />
          <path d="M -3 -2 V 2" />
          <path d="M -3 0 Q 0 0 2 0" />
        </g>
      );
    case 4: // ADR Invariant Store: Architectural Decision Record Sheet
      return (
        <g {...gProps}>
          <path d="M -4.5 -5.5 H 1.5 L 4.5 -2.5 V 5.5 H -4.5 Z" />
          <path d="M 1.5 -5.5 V -2.5 H 4.5" />
          <line x1="-2.2" y1="0.5" x2="2.2" y2="0.5" />
          <line x1="-2.2" y1="3" x2="1" y2="3" />
        </g>
      );
    case 5: // GraphBLAS Matrix Mesh: Authentic Sparse Adjacency Matrix
      return (
        <g {...gProps}>
          {/* Matrix boundary brackets [ ] */}
          <path d="M -3.5 -5 H -5.5 V 5 H -3.5" />
          <path d="M 3.5 -5 H 5.5 V 5 H 3.5" />
          {/* Nonzero sparse coordinate entries with adjacency link */}
          <circle cx="-2.2" cy="-2.2" r="1" fill="currentColor" />
          <circle cx="1.8" cy="-1.8" r="1" fill="currentColor" />
          <circle cx="0" cy="1" r="1" fill="currentColor" />
          <circle cx="-1.8" cy="3" r="1" fill="currentColor" />
          <line x1="-2.2" y1="-2.2" x2="0" y2="1" strokeWidth="0.8" />
          <line x1="0" y1="1" x2="1.8" y2="-1.8" strokeWidth="0.8" />
        </g>
      );
    case 6: // CI/CD Gate Harness: PR Merge Verification Pipeline
      return (
        <g {...gProps}>
          <circle cx="-3.5" cy="-3.5" r="1.15" />
          <circle cx="-3.5" cy="3.5" r="1.15" />
          <circle cx="3.5" cy="3.5" r="1.15" />
          <path d="M -3.5 -2 V 2" />
          <path d="M 3.5 2 V -0.5 Q 3.5 -3.5 0 -3.5" />
        </g>
      );
    case 7: // Cryptographic Audit Trail: Interlinked Merkle Ledger Chain
      return (
        <g {...gProps}>
          <rect x="-5.5" y="-3" width="5.5" height="6" rx="2" />
          <rect x="0" y="-3" width="5.5" height="6" rx="2" />
          <line x1="-1" y1="0" x2="1" y2="0" strokeWidth="1.0" />
        </g>
      );
    case 8: // Closed-Loop Auto-Repair: Precision Dual-Arrow Self-Healing Cycle
      return (
        <g {...gProps}>
          {/* Top Arc (Clockwise from left to upper-right) */}
          <path d="M -4.8 0 A 4.8 4.8 0 0 1 4.5 -2" />
          <path d="M 4.5 -5.2 V -2 H 1.5" />
          {/* Bottom Arc (Clockwise from right to lower-left) */}
          <path d="M 4.8 0 A 4.8 4.8 0 0 1 -4.5 2" />
          <path d="M -4.5 5.2 V 2 H -1.5" />
        </g>
      );
    default:
      return null;
  }
}

export default function CausalEnclaveHub() {
  const containerRef = useRef(null);
  const hubRef = useRef(null);
  const [isWheelScrolling, setIsWheelScrolling] = useState(false);

  const [activeStep, setActiveStep] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isHoveredCore, setIsHoveredCore] = useState(false);

  // References for strict lock and gesture handling
  const isLockedRef = useRef(false);
  const isExitingRef = useRef(false);
  const exitAttemptRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const activeStepRef = useRef(0);
  const lastScrollYRef = useRef(typeof window !== 'undefined' ? window.scrollY : 0);
  const touchStartYRef = useRef(0);
  const touchStartXRef = useRef(0);
  const isHoveringCanvasRef = useRef(false);
  const isScrollingRef = useRef(false);
  const scrollQuiescenceTimerRef = useRef(null);
  const hasIntentionalPointerMoveRef = useRef(false);
  const lastPointerPosRef = useRef({ x: 0, y: 0 });

  // Centralized Atomic State Setter (Synchronizes activeStep and activeStepRef synchronously)
  const setStep = useCallback((valOrFn) => {
    setActiveStep((prev) => {
      const next = typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn;
      activeStepRef.current = next;
      return next;
    });
    hasIntentionalPointerMoveRef.current = false;
  }, []);

  // Sync activeStepRef with state
  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);

  // Scroll progress for theater dimming envelope
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const backdropOpacity = useTransform(
    scrollYProgress,
    [0, 0.12, 0.28, 0.72, 0.88, 1],
    [0, 0, 1, 1, 0, 0],
    { clamp: true }
  );

  const blurPx = useTransform(
    scrollYProgress,
    [0, 0.12, 0.28, 0.72, 0.88, 1],
    [0, 0, 40, 40, 0, 0],
    { clamp: true }
  );

  const backdropFilter = useTransform(blurPx, (v) => `blur(${v.toFixed(1)}px)`);
  const backdropVisibility = useTransform(backdropOpacity, (val) => (val > 0.002 ? 'visible' : 'hidden'));

  // Safety unlock on unmount
  useEffect(() => {
    if (window.__lenis) {
      window.__lenis.start();
      window.__lenis.isLocked = false;
    }
    return () => {
      isLockedRef.current = false;
      isExitingRef.current = false;
      if (window.__lenis) {
        window.__lenis.start();
        window.__lenis.isLocked = false;
      }
    };
  }, []);

  // Smooth exit functions (Deterministic Lock-OUT to adjacent landmarks with zero fight)
  const exitDownward = useCallback(() => {
    if (isExitingRef.current) return;
    const el = containerRef.current;
    isTransitioningRef.current = true;
    isExitingRef.current = true;
    isLockedRef.current = false;
    setIsLocked(false);

    const targetY = el ? el.offsetTop + el.offsetHeight + 10 : (window.scrollY + window.innerHeight * 0.75);

    if (window.__lenis) {
      window.__lenis.start();
      window.__lenis.isLocked = false;
      window.__lenis.scrollTo(targetY, {
        duration: 0.85,
        force: true,
        isInternalDock: true,
        onComplete: () => {
          isExitingRef.current = false;
          isTransitioningRef.current = false;
        }
      });
    } else {
      window.scrollTo({ top: targetY, behavior: "smooth" });
    }

    setTimeout(() => {
      isExitingRef.current = false;
      isTransitioningRef.current = false;
    }, 1100);
  }, []);

    const exitUpward = useCallback(() => {
    if (isExitingRef.current) return;
    const el = containerRef.current;
    isTransitioningRef.current = true;
    isExitingRef.current = true;
    isLockedRef.current = false;
    setIsLocked(false);

    const targetY = el ? Math.max(0, el.offsetTop - window.innerHeight * 0.75) : 0;

    if (window.__lenis) {
      window.__lenis.start();
      window.__lenis.isLocked = false;
      window.__lenis.scrollTo(targetY, {
        duration: 0.85,
        force: true,
        isInternalDock: true,
        onComplete: () => {
          isExitingRef.current = false;
          isTransitioningRef.current = false;
        }
      });
    } else {
      window.scrollTo({ top: targetY, behavior: "smooth" });
    }

    setTimeout(() => {
      isExitingRef.current = false;
      isTransitioningRef.current = false;
    }, 1100);
  }, []);

    // 1. Precise Viewport Docking: Lock IN when reached
  useEffect(() => {
    const handleScrollCheck = () => {
      // Programmatic Navigation Guard: Never hijack or dock when user clicked nav/cue
      if (typeof window !== 'undefined' && window.__isProgrammaticScroll) {
        if (isLockedRef.current) {
          isLockedRef.current = false;
          setIsLocked(false);
          if (window.__lenis) {
            window.__lenis.isLocked = false;
            window.__lenis.start();
          }
        }
        return;
      }

      if (isExitingRef.current) return;
      const el = containerRef.current;
      if (!el) return;

      const currentScrollY = window.scrollY;
      const scrollingDown = currentScrollY >= lastScrollYRef.current;
      lastScrollYRef.current = currentScrollY;

      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Scrolled completely out: release lock cleanly
      if (rect.bottom < -80 || rect.top > viewportHeight + 80) {
        if (isLockedRef.current) {
          isLockedRef.current = false;
          setIsLocked(false);
          if (window.__lenis) {
            window.__lenis.start();
            window.__lenis.isLocked = false;
          }
        }
        isExitingRef.current = false;
        return;
      }

      // Precise Fullscreen Docking (F11 & standard): Lock ONLY when section genuinely fills the viewport (>=90%)
      const sectionCenter = rect.top + rect.height / 2;
      const viewportCenter = viewportHeight / 2;
      const diffCenter = Math.abs(sectionCenter - viewportCenter);
      const isDocked = diffCenter < Math.min(80, viewportHeight * 0.08);

      if (!isLockedRef.current && isDocked) {
        isLockedRef.current = true;
        setIsLocked(true);
        exitAttemptRef.current = false;

        if (scrollingDown) {
          setStep(0);
        } else {
          setStep(ENCLAVE_STAGES.length - 1);
        }

        if (window.__lenis) {
          window.__lenis.isLocked = true;
          window.__lenis.stop();
          window.__lenis.scrollTo(el, {
            duration: 0.5,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            force: true,
            isInternalDock: true,
          });
        }
      }
    };

    window.addEventListener('scroll', handleScrollCheck, { passive: true });
    if (window.__lenis) {
      window.__lenis.on('scroll', handleScrollCheck);
    }
    handleScrollCheck();

    return () => {
      window.removeEventListener('scroll', handleScrollCheck);
      if (window.__lenis) {
        window.__lenis.off('scroll', handleScrollCheck);
        window.__lenis.start();
        window.__lenis.isLocked = false;
      }
    };
  }, []);

  // 2. Guaranteed Step Lock-In & Natural Directional Exit (Wheel, Touchpad, Touch)
  useEffect(() => {
    const handleWheel = (e) => {
      // Mark scrolling active with debounce to suppress stationary raycast snags
      isScrollingRef.current = true;
      setIsWheelScrolling(true);
      hasIntentionalPointerMoveRef.current = false;
      if (scrollQuiescenceTimerRef.current) clearTimeout(scrollQuiescenceTimerRef.current);
      scrollQuiescenceTimerRef.current = setTimeout(() => {
        isScrollingRef.current = false;
        setIsWheelScrolling(false);
      }, 280);

      if (isExitingRef.current) return;

      // CRITICAL FIX: Only hijack and prevent default when the section is ACTUALLY locked!
      if (!isLockedRef.current) return;

      if (e.cancelable) e.preventDefault();
      if (isTransitioningRef.current) return;

      const current = activeStepRef.current;
      const delta = e.deltaY;

      if (Math.abs(delta) > 16) {
        if (delta > 0) {
          // Scrolling Down -> Advance Stage
          if (current < ENCLAVE_STAGES.length - 1) {
            isTransitioningRef.current = true;
            exitAttemptRef.current = false;
            playClick();
            setStep((prev) => Math.min(ENCLAVE_STAGES.length - 1, prev + 1));
            setTimeout(() => { isTransitioningRef.current = false; }, 480);
          } else {
            // On Last Step: Require secondary impulse to exit downward (prevents inertia blow-through)
            if (!exitAttemptRef.current) {
              exitAttemptRef.current = true;
              setTimeout(() => { exitAttemptRef.current = false; }, 650);
            } else {
              exitDownward();
            }
          }
        } else {
          // Scrolling Up -> Reverse Stage
          if (current > 0) {
            isTransitioningRef.current = true;
            exitAttemptRef.current = false;
            playClick();
            setStep((prev) => Math.max(0, prev - 1));
            setTimeout(() => { isTransitioningRef.current = false; }, 480);
          } else {
            // On First Step: Require secondary impulse to exit upward (prevents inertia blow-through)
            if (!exitAttemptRef.current) {
              exitAttemptRef.current = true;
              setTimeout(() => { exitAttemptRef.current = false; }, 650);
            } else {
              exitUpward();
            }
          }
        }
      }
    };

    const handleTouchStart = (e) => {
      touchStartYRef.current = e.touches[0].clientY;
      touchStartXRef.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e) => {
      isScrollingRef.current = true;
      setIsWheelScrolling(true);
      hasIntentionalPointerMoveRef.current = false;
      if (scrollQuiescenceTimerRef.current) clearTimeout(scrollQuiescenceTimerRef.current);
      scrollQuiescenceTimerRef.current = setTimeout(() => {
        isScrollingRef.current = false;
        setIsWheelScrolling(false);
      }, 280);

      if (isExitingRef.current || !isLockedRef.current || isTransitioningRef.current) return;
      const touchY = e.touches[0].clientY;
      const touchX = e.touches[0].clientX;
      const diffY = touchStartYRef.current - touchY;
      const diffX = touchStartXRef.current - touchX;
      const dominant = Math.abs(diffX) > Math.abs(diffY) ? diffX : diffY;

      if (Math.abs(dominant) > 35) {
        if (e.cancelable) e.preventDefault();
        const current = activeStepRef.current;

        if (dominant > 35) {
          if (current < ENCLAVE_STAGES.length - 1) {
            isTransitioningRef.current = true;
            playClick();
            setStep((prev) => Math.min(ENCLAVE_STAGES.length - 1, prev + 1));
            setTimeout(() => { isTransitioningRef.current = false; }, 480);
          } else {
            exitDownward();
          }
        } else if (dominant < -35) {
          if (current > 0) {
            isTransitioningRef.current = true;
            playClick();
            setStep((prev) => Math.max(0, prev - 1));
            setTimeout(() => { isTransitioningRef.current = false; }, 480);
          } else {
            exitUpward();
          }
        }
        touchStartYRef.current = touchY;
        touchStartXRef.current = touchX;
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      if (scrollQuiescenceTimerRef.current) clearTimeout(scrollQuiescenceTimerRef.current);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [exitDownward, exitUpward]);

  // 3. Complete Keyboard Navigation (Arrow Keys, Page Up/Down, Space to navigate)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isExitingRef.current) return;

      // Ignore if user is currently typing in an input, textarea, or contentEditable element
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // ── A. PROACTIVE DOCKING VIA KEYBOARD (Arrow Keys / PageUp / PageDown / Space) ──
      // When approaching from Bento (top) or Causal Loop (bottom), entering the viewport center zone
      // cleanly docks and locks the section instead of jumping past.
      if (!isLockedRef.current) {
        const inDockZone = rect.top <= viewportHeight * 0.25 && rect.bottom >= viewportHeight * 0.75;
        if (!inDockZone) return; // Allow natural page scroll outside the dock zone

        if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey) || e.key === 'ArrowRight') {
          e.preventDefault();
          isLockedRef.current = true;
          setIsLocked(true);
          exitAttemptRef.current = false;
          setStep(0);
          playClick();
          if (window.__lenis) {
            window.__lenis.isLocked = true;
            window.__lenis.stop();
            window.__lenis.scrollTo(el, {
              duration: 0.5,
              easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
              force: true,
              isInternalDock: true,
            });
          }
          return;
        } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey) || e.key === 'ArrowLeft') {
          e.preventDefault();
          isLockedRef.current = true;
          setIsLocked(true);
          exitAttemptRef.current = false;
          setStep(ENCLAVE_STAGES.length - 1);
          playClick();
          if (window.__lenis) {
            window.__lenis.isLocked = true;
            window.__lenis.stop();
            window.__lenis.scrollTo(el, {
              duration: 0.5,
              easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
              force: true,
              isInternalDock: true,
            });
          }
          return;
        }
        return;
      }

      // ── B. IN-SECTION KEYBOARD STEPPING & PROGRESSION (When Locked) ──
      const current = activeStepRef.current;

      // 1. Horizontal Node Traversal (Left / Right Arrow)
      if (e.key === 'ArrowRight') {
        if (current < ENCLAVE_STAGES.length - 1) {
          e.preventDefault();
          if (isTransitioningRef.current) return;
          isTransitioningRef.current = true;
          exitAttemptRef.current = false;
          playClick();
          setStep((prev) => Math.min(ENCLAVE_STAGES.length - 1, prev + 1));
          setTimeout(() => { isTransitioningRef.current = false; }, 420);
        }
      } else if (e.key === 'ArrowLeft') {
        if (current > 0) {
          e.preventDefault();
          if (isTransitioningRef.current) return;
          isTransitioningRef.current = true;
          exitAttemptRef.current = false;
          playClick();
          setStep((prev) => Math.max(0, prev - 1));
          setTimeout(() => { isTransitioningRef.current = false; }, 420);
        }
      }
      // 2. Vertical Stage Browsing & Exit Downward (ArrowDown, PageDown, Space)
      else if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault();
        if (isTransitioningRef.current) return;

        if (current < ENCLAVE_STAGES.length - 1) {
          isTransitioningRef.current = true;
          exitAttemptRef.current = false;
          playClick();
          setStep((prev) => Math.min(ENCLAVE_STAGES.length - 1, prev + 1));
          setTimeout(() => { isTransitioningRef.current = false; }, 420);
        } else {
          // On Last Node: require secondary impulse to exit downward (prevents accidental blow-through)
          if (!exitAttemptRef.current) {
            exitAttemptRef.current = true;
            setTimeout(() => { exitAttemptRef.current = false; }, 650);
          } else {
            exitDownward();
          }
        }
      }
      // 3. Vertical Stage Browsing & Exit Upward (ArrowUp, PageUp, Shift+Space)
      else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault();
        if (isTransitioningRef.current) return;

        if (current > 0) {
          isTransitioningRef.current = true;
          exitAttemptRef.current = false;
          playClick();
          setStep((prev) => Math.max(0, prev - 1));
          setTimeout(() => { isTransitioningRef.current = false; }, 420);
        } else {
          // On First Node: require secondary impulse to exit upward (prevents accidental blow-through)
          if (!exitAttemptRef.current) {
            exitAttemptRef.current = true;
            setTimeout(() => { exitAttemptRef.current = false; }, 650);
          } else {
            exitUpward();
          }
        }
      }
    };

            window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [exitDownward, exitUpward]);

  // Current camera target for the active stage (Stage 0 = Top View, Stages 1..8 = Side View)
  const baseCam = STAGE_CAMERAS[activeStep] || STAGE_CAMERAS[0];
  const currentStage = ENCLAVE_STAGES[activeStep] || ENCLAVE_STAGES[0];
  const isCoreActive = activeStep === 0;

  return (
    <section
      ref={containerRef}
      id="enclave-hub-section" 
      tabIndex={-1}
      role="region"
      aria-label="Causal Interception Enclave"
      className="relative w-full h-[100dvh] max-h-[100dvh] py-3 sm:py-4 md:py-5 px-4 sm:px-8 flex flex-col items-center justify-between z-[60] border-none overflow-hidden outline-none focus:outline-none"
    >
      {/* ── Fixed Heavy Dimming & Blur Backdrop (Focusing Exclusively on Diagram) ── */}
      <motion.div 
        style={{
          opacity: backdropOpacity,
          visibility: backdropVisibility,
          backdropFilter,
          WebkitBackdropFilter: backdropFilter,
        }}
        className="fixed inset-0 z-[70] bg-white/94 dark:bg-[#060709]/96 pointer-events-none will-change-[opacity,backdrop-filter]"
      />

      {/* ── Fullscreen Open Theater Container ── */}
      <div className="relative w-full h-full max-w-[1440px] 2xl:max-w-[1680px] flex flex-col justify-between items-center z-[80] my-auto overflow-hidden">
        
        {/* ── Top HUD Navigation: Section Title & Step Jumper Pills ── */}
        <div className="w-full flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-2.5 sm:pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs sm:text-sm font-bold text-slate-950 dark:text-white tracking-widest uppercase">
              The Causal Interception Enclave
            </span>
          </div>

          {/* Minimal Numbered Stage Jumpers (CORE, 01..08) */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-end">
            {ENCLAVE_STAGES.map((stg, idx) => {
              const isActive = idx === activeStep;
              return (
                <button
                  key={stg.id}
                  type="button"
                  onClick={() => {
                    playClick();
                    setStep(idx);
                  }}
                  className={`px-2.5 sm:px-3 py-1 rounded-full font-mono text-[10px] sm:text-xs font-semibold transition-all duration-200 cursor-pointer select-none ${
                    isActive 
                      ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-xs scale-105' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  {stg.indexStr}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Center Stage: Massive Radar-Scale 3D Viewport with Top-to-Side Camera Rotation ── */}
        <div 
          className="w-full flex-1 min-h-0 flex flex-col items-center justify-center my-1 sm:my-2 relative"
          style={{ perspective: '1400px', perspectiveOrigin: 'center center' }}
        >
          
          <div 
            onPointerEnter={(e) => {
              isHoveringCanvasRef.current = true;
              lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerLeave={() => {
              isHoveringCanvasRef.current = false;
              hasIntentionalPointerMoveRef.current = false;
            }}
            onPointerDown={(e) => {
              hasIntentionalPointerMoveRef.current = true;
              lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
            }}
            onPointerMove={(e) => {
              const dx = e.clientX - lastPointerPosRef.current.x;
              const dy = e.clientY - lastPointerPosRef.current.y;
              if (dx * dx + dy * dy > 36) { // > 6px intentional pointer displacement
                hasIntentionalPointerMoveRef.current = true;
                lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
              }
            }}
            className="w-full max-w-[1190px] 2xl:max-w-[1410px] aspect-[16/9.6] max-h-[min(66vh,660px)] 2xl:max-h-[770px] flex items-center justify-center relative select-none will-change-transform cursor-default"
            style={{
              transform: `rotateX(${baseCam.pitch}deg) rotateY(${baseCam.yaw}deg) rotateZ(${baseCam.roll}deg) translate3d(${baseCam.tx}px, ${baseCam.ty}px, ${baseCam.tz}px) scale(${baseCam.scale})`,
              transformStyle: 'preserve-3d',
              transition: 'transform 1.05s cubic-bezier(0.25, 1, 0.35, 1)',
              '--hl-plate': 'var(--hub-plate, #060709)',
              '--hl-hi': 'var(--hub-hi, #F8FAFC)',
              '--hl-edge': 'var(--hub-edge, #CBD5E1)',
              '--hl-lo': 'var(--hub-lo, rgba(255, 255, 255, 0.30))',
              '--hl-mid': 'var(--hub-mid, rgba(255, 255, 255, 0.38))',
              '--hl-sw': '1px'
            }}
          >
            <style>{`
              .dark #enclave-hub-section {
                --hub-plate: #060709;
                --hub-hi: #F8FAFC;
                --hub-edge: #CBD5E1;
                --hub-lo: rgba(255, 255, 255, 0.30);
                --hub-mid: rgba(255, 255, 255, 0.38);
              }
              html:not(.dark) #enclave-hub-section {
                --hub-plate: #FFFFFF;
                --hub-hi: #0F172A;
                --hub-edge: #475569;
                --hub-lo: rgba(0, 0, 0, 0.18);
                --hub-mid: rgba(0, 0, 0, 0.26);
              }
              #enclave-hub-section svg {
                width: 100%;
                height: 100%;
                overflow: visible;
              }
              #enclave-hub-section .sil {
                fill: var(--hl-plate);
                stroke: var(--hub-edge);
                stroke-width: var(--hl-sw);
                vector-effect: non-scaling-stroke;
                stroke-linejoin: round;
                stroke-linecap: round;
                transition: stroke 260ms cubic-bezier(0.32, 0.72, 0, 1);
              }
              #enclave-hub-section .sil.hi {
                stroke: var(--hub-hi);
              }
              #enclave-hub-section .nf {
                fill: none;
                stroke-width: var(--hl-sw);
                vector-effect: non-scaling-stroke;
                stroke-linejoin: round;
                stroke-linecap: round;
              }
              #enclave-hub-section .nf.lo {
                stroke: var(--hub-lo);
              }
              #enclave-hub-section .nf.hi {
                stroke: var(--hub-hi);
              }
              @keyframes enclave-text-shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
              }
              .enclave-shimmer-title {
                background: linear-gradient(110deg, #94a3b8 25%, #ffffff 50%, #94a3b8 75%);
                background-size: 200% auto;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: enclave-text-shimmer 2.8s linear infinite;
              }
              html:not(.dark) .enclave-shimmer-title {
                background: linear-gradient(110deg, #334155 25%, #0f172a 50%, #334155 75%);
                background-size: 200% auto;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: enclave-text-shimmer 2.8s linear infinite;
              }
              @keyframes arc-fluid-ripple {
                0% { transform: translateX(-4px); }
                100% { transform: translateX(4px); }
              }
              .arc-fluid-wave {
                animation: arc-fluid-ripple 3s ease-in-out infinite alternate;
              }
            `}</style>
            
            <Hub
              ref={hubRef}
              activeTile={activeStep === 0 ? -1 : activeStep - 1}
              intensity={1}
              className={isWheelScrolling ? "pointer-events-none" : "pointer-events-auto"}
              onRead={(text) => {
                if (text && text.startsWith('tile ')) {
                  const idx = parseInt(text.replace('tile ', ''), 10);
                  if (idx >= 1 && idx <= 8 && idx !== activeStepRef.current) {
                    const isApproved = isHoveringCanvasRef.current && 
                                       !isScrollingRef.current && 
                                       !isTransitioningRef.current && 
                                       hasIntentionalPointerMoveRef.current;
                    if (isApproved) {
                      playClick();
                      setStep(idx);
                    } else {
                      // Strict 3D/2D Parity Invariant: snap Hairline's 3D plate back to the active step!
                      hubRef.current?.setActiveTile(activeStepRef.current === 0 ? -1 : activeStepRef.current - 1);
                    }
                  }
                } else if (text === 'rest') {
                  if (activeStepRef.current !== 0) {
                    const isApproved = isHoveringCanvasRef.current && 
                                       !isScrollingRef.current && 
                                       !isTransitioningRef.current && 
                                       hasIntentionalPointerMoveRef.current;
                    if (isApproved) {
                      playClick();
                      setStep(0);
                    } else {
                      hubRef.current?.setActiveTile(activeStepRef.current === 0 ? -1 : activeStepRef.current - 1);
                    }
                  }
                }
              }}
            />

            {/* ── Overlay Layer: Iron Man Arc Reactor & 2D-to-3D Blooming Subsystem Glyphs ── */}
            <svg 
              viewBox="0 0 400 320" 
              className="absolute inset-0 w-full h-full pointer-events-none overflow-visible select-none"
              aria-hidden="true"
            >
              <defs>
                {/* Precise Cutout ClipPath for Iron Man Arc Reactor Inner Cavity */}
                <clipPath id="arc-reactor-inner-clip">
                  <path d="M-4.2 -2.1L4.2 -2.1L0 2.5Z" />
                </clipPath>
              </defs>

              {/* 1. Center Kernel: Iron Man Monochromatic Arc Reactor & Concentric Causal Wavefronts */}
              <g 
                transform="translate(200, 169.66)"
                onPointerEnter={() => setIsHoveredCore(true)}
                onPointerLeave={() => setIsHoveredCore(false)}
                className="cursor-pointer pointer-events-auto"
              >
                {/* 1-by-1 Sequential Squircle Wavefront Propagation (Core -> Inner -> Mid -> Outermost Expanding Wavefront) */}
                {(isCoreActive || isHoveredCore) && (
                  <g className="pointer-events-none select-none">
                    <style>{`
                      /* 4.2s Calm Deliberate Cycle: 1 by 1 Sequential Propagation */
                      @keyframes wave-inner-step {
                        0% { transform: scale(1); opacity: 0; }
                        1% { transform: scale(1); opacity: 0.95; }
                        23% { transform: scale(1.42); opacity: 0; }
                        100% { transform: scale(1.42); opacity: 0; }
                      }
                      @keyframes wave-mid-step {
                        0%, 21% { transform: scale(1); opacity: 0; }
                        22% { transform: scale(1); opacity: 0.95; }
                        45% { transform: scale(1.36); opacity: 0; }
                        100% { transform: scale(1.36); opacity: 0; }
                      }
                      @keyframes wave-outer-step {
                        0%, 43% { transform: scale(1); opacity: 0; }
                        44% { transform: scale(1); opacity: 1.0; }
                        72% { opacity: 0.55; }
                        82% { transform: scale(1.68); opacity: 0; }
                        100% { transform: scale(1.68); opacity: 0; }
                      }
                      @keyframes wave-outer-echo {
                        0%, 50% { transform: scale(1); opacity: 0; }
                        51% { transform: scale(1); opacity: 0.75; }
                        78% { opacity: 0.35; }
                        88% { transform: scale(1.78); opacity: 0; }
                        100% { transform: scale(1.78); opacity: 0; }
                      }
                      @keyframes glow-inner-conduct {
                        0%, 26%, 100% { opacity: 0.30; }
                        8% { opacity: 0.95; }
                      }
                      @keyframes glow-mid-conduct {
                        0%, 20%, 48%, 100% { opacity: 0.30; }
                        32% { opacity: 0.95; }
                      }
                      @keyframes glow-outer-conduct {
                        0%, 42%, 84%, 100% { opacity: 0.30; }
                        54% { opacity: 0.95; }
                      }

                      .squircle-step-inner {
                        animation: wave-inner-step 4.2s cubic-bezier(0.2, 0.8, 0.25, 1) infinite;
                        transform-origin: 0px 0px;
                      }
                      .squircle-step-mid {
                        animation: wave-mid-step 4.2s cubic-bezier(0.2, 0.8, 0.25, 1) infinite;
                        transform-origin: 0px 0px;
                      }
                      .squircle-step-outer {
                        animation: wave-outer-step 4.2s cubic-bezier(0.18, 0.85, 0.25, 1) infinite;
                        transform-origin: 0px 0px;
                      }
                      .squircle-step-outer-echo {
                        animation: wave-outer-echo 4.2s cubic-bezier(0.18, 0.85, 0.25, 1) infinite;
                        transform-origin: 0px 0px;
                      }

                      .squircle-glow-inner {
                        animation: glow-inner-conduct 4.2s ease-in-out infinite;
                      }
                      .squircle-glow-mid {
                        animation: glow-mid-conduct 4.2s ease-in-out infinite;
                      }
                      .squircle-glow-outer {
                        animation: glow-outer-conduct 4.2s ease-in-out infinite;
                      }
                    `}</style>

                    {/* ── Step 1: Smallest Nearest Squircle (Inner Core Rim) ── */}
                    {/* Outline Accent */}
                    <path
                      d={SQUIRCLE_INNER}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      vectorEffect="non-scaling-stroke"
                      shapeRendering="geometricPrecision"
                      className="text-slate-950 dark:text-white squircle-glow-inner"
                    />
                    {/* Outbound Expanding Wave */}
                    <path
                      d={SQUIRCLE_INNER}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      vectorEffect="non-scaling-stroke"
                      shapeRendering="geometricPrecision"
                      className="text-slate-950 dark:text-white squircle-step-inner"
                    />

                    {/* ── Step 2: Middle Squircle (Intermediate Deck Terrace) ── */}
                    {/* Outline Accent */}
                    <path
                      d={SQUIRCLE_MID}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      vectorEffect="non-scaling-stroke"
                      shapeRendering="geometricPrecision"
                      className="text-slate-900/90 dark:text-white/90 squircle-glow-mid"
                    />
                    {/* Outbound Expanding Wave */}
                    <path
                      d={SQUIRCLE_MID}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      vectorEffect="non-scaling-stroke"
                      shapeRendering="geometricPrecision"
                      className="text-slate-900 dark:text-white squircle-step-mid"
                    />

                    {/* ── Step 3: Outermost Squircle (Wide Expanding WaveFront Propagation) ── */}
                    {/* Outline Accent */}
                    <path
                      d={SQUIRCLE_OUTER}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      vectorEffect="non-scaling-stroke"
                      shapeRendering="geometricPrecision"
                      className="text-slate-950 dark:text-white squircle-glow-outer"
                    />
                    {/* Grand Primary Expanding Wavefront across the whole Enclave */}
                    <path
                      d={SQUIRCLE_OUTER}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      vectorEffect="non-scaling-stroke"
                      shapeRendering="geometricPrecision"
                      className="text-slate-950 dark:text-white squircle-step-outer"
                    />
                    {/* Specular Diffuse Glow on Wavefront */}
                    <path
                      d={SQUIRCLE_OUTER}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.4"
                      vectorEffect="non-scaling-stroke"
                      shapeRendering="geometricPrecision"
                      className="text-slate-900/20 dark:text-white/35 hidden dark:block squircle-step-outer"
                    />
                    {/* Secondary Echo Wavefront */}
                    <path
                      d={SQUIRCLE_OUTER}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      vectorEffect="non-scaling-stroke"
                      shapeRendering="geometricPrecision"
                      className="text-slate-900/80 dark:text-white/80 squircle-step-outer-echo"
                    />
                  </g>
                )}

                {/* Mark VI Arc Reactor Centerpiece: 100% Vector Direct-Display List (Zero Offscreen Texture Blur) */}
                <motion.g 
                  animate={{
                    y: (isCoreActive || isHoveredCore) ? -12 : 0
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 120,
                    damping: 16,
                    mass: 0.6
                  }}
                >
                  {/* Subtle Fluid Wave Fill Layer (Mounted ONLY when Core active or hovered to eliminate background repaints) */}
                  {(isCoreActive || isHoveredCore) && (
                    <g clipPath="url(#arc-reactor-inner-clip)">
                      {/* Inner core specular base layer */}
                      <path
                        d="M-4.2 -2.1L4.2 -2.1L0 2.5Z"
                        className="fill-slate-900/10 dark:fill-white/20"
                      />
                      <motion.g
                        initial={{ y: 4.5, opacity: 0 }}
                        animate={{ y: -1.0, opacity: 0.95 }}
                        transition={{
                          duration: 0.55,
                          ease: [0.2, 0.9, 0.3, 1]
                        }}
                      >
                        <path
                          d="M -10 0 Q -5 -1.5, 0 0 T 10 0 L 10 8 L -10 8 Z"
                          className="fill-slate-950 dark:fill-white arc-fluid-wave"
                        />
                      </motion.g>
                    </g>
                  )}

                  {/* Outer Monochromatic Specular Halo (Layered Vectors - 100% Vector Direct Pipeline) */}
                  {(isCoreActive || isHoveredCore) && (
                    <>
                      <path 
                        d="M-7.5 -3.8L7.5 -3.8L0 4.5Z" 
                        fill="none" 
                        stroke="currentColor" 
                        className="text-white/20 hidden dark:block" 
                        strokeWidth="3.2" 
                        strokeLinejoin="round" 
                        vectorEffect="non-scaling-stroke"
                        shapeRendering="geometricPrecision"
                      />
                      <path 
                        d="M-7.5 -3.8L7.5 -3.8L0 4.5Z" 
                        fill="none" 
                        stroke="currentColor" 
                        className="text-white/40 hidden dark:block" 
                        strokeWidth="2.0" 
                        strokeLinejoin="round" 
                        vectorEffect="non-scaling-stroke"
                        shapeRendering="geometricPrecision"
                      />
                    </>
                  )}

                  {/* Outer Inverted Equilateral Triangle (Mark VI Arc Reactor - Razor-Sharp Direct Geometry) */}
                  <path 
                    d="M-7.5 -3.8L7.5 -3.8L0 4.5Z" 
                    fill="none" 
                    stroke="currentColor" 
                    className={isCoreActive || isHoveredCore ? "text-slate-950 dark:text-white" : "text-slate-500/80 dark:text-slate-400/80"} 
                    strokeWidth="1.2" 
                    strokeLinejoin="round" 
                    vectorEffect="non-scaling-stroke"
                    shapeRendering="geometricPrecision"
                  />

                  {/* Inner Concentric Bevel Cutout Rim */}
                  <path 
                    d="M-4.2 -2.1L4.2 -2.1L0 2.5Z" 
                    fill="none" 
                    stroke="currentColor" 
                    className={isCoreActive || isHoveredCore ? "text-slate-600 dark:text-slate-300" : "text-slate-400/60 dark:text-slate-500/60"} 
                    strokeWidth="0.8" 
                    strokeLinejoin="round" 
                    vectorEffect="non-scaling-stroke"
                    shapeRendering="geometricPrecision"
                  />
                </motion.g>
              </g>

              {/* 2. All 8 Subsystem Nodes: Seamless 2D Surface -> Elevating 3D Blooming Card Transition */}
              {ENCLAVE_STAGES.slice(1).map((stg, i) => {
                const stepIdx = i + 1;
                const isThisNodeActive = activeStep === stepIdx;

                return (
                  <g
                    key={stg.id}
                    transform={`translate(${stg.restCoord[0]}, ${stg.restCoord[1]})`}
                    className="pointer-events-none select-none"
                  >
                    <motion.g
                      animate={{
                        // 0 = resting at floor lid; -42 = elevated tile lid; -56 = floating 3D badge position
                        y: isThisNodeActive ? -56 : 0,
                        opacity: isThisNodeActive ? 1.0 : 0.45
                      }}
                      transition={{
                        y: isThisNodeActive
                          ? { type: 'spring', stiffness: 90, damping: 15, mass: 0.7 }
                          : { type: 'spring', stiffness: 60, damping: 14, mass: 0.8, delay: 0.04 },
                        opacity: isThisNodeActive
                          ? { duration: 0.25, ease: 'easeOut' }
                          : { duration: 0.35, delay: 0.05, ease: 'easeInOut' }
                      }}
                      className="origin-center"
                    >
                      {/* Front-Facing Floating Badge (Vector card blooms smoothly on elevation, collapses on descent) */}
                      <motion.g
                        animate={{
                          opacity: isThisNodeActive ? 1 : 0,
                          scale: isThisNodeActive ? 1 : 0.75
                        }}
                        transition={{
                          duration: isThisNodeActive ? 0.28 : 0.22,
                          delay: isThisNodeActive ? 0.05 : 0,
                          ease: [0.16, 1, 0.3, 1]
                        }}
                        className="origin-center"
                      >
                        {/* Pure vector ambient drop shadow - zero raster blur */}
                        <rect
                          x="-12"
                          y="-10.5"
                          width="24"
                          height="24"
                          rx="6"
                          className="fill-black/10 dark:fill-black/40"
                        />
                        {/* Crisp card plate */}
                        <rect
                          x="-12"
                          y="-12"
                          width="24"
                          height="24"
                          rx="6"
                          className="fill-white dark:fill-[#0c0f14] stroke-slate-300/90 dark:stroke-white/20"
                          strokeWidth="1"
                        />
                      </motion.g>

                      {/* Monochromatic Vector Emblem (Smooth bidirectional transition: 2D isometric squash <-> front-facing) */}
                      <motion.g
                        animate={{
                          scaleY: isThisNodeActive ? 1.0 : 0.52
                        }}
                        transition={{
                          scaleY: isThisNodeActive
                            ? { type: 'spring', stiffness: 90, damping: 15, mass: 0.7 }
                            : { type: 'spring', stiffness: 60, damping: 14, mass: 0.8, delay: 0.04 }
                        }}
                        className={isThisNodeActive ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}
                      >
                        <SubsystemGlyphVector stepIndex={stepIdx} />
                      </motion.g>
                    </motion.g>
                  </g>
                );
              })}
            </svg>

          </div>

        </div>

        {/* ── Bottom HUD Readout: Smooth Shimmering Typography (Zero Layout Shifts) ── */}
        <div className="w-full pt-2 sm:pt-3 border-t border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-center sm:text-left shrink-0 pb-1">
          
          <div className="flex-1 max-w-3xl min-h-[50px] flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStage.id}
                initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-baseline gap-3"
              >
                {/* Pure Node Title (Subtext tag removed per industry minimalism directives) */}
                <span className="font-mono text-base sm:text-lg font-bold tracking-tight enclave-shimmer-title">
                  {currentStage.title}
                </span>
              </motion.div>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.p
                key={currentStage.desc}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.28, delay: 0.04 }}
                className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-sans leading-relaxed mt-0.5"
              >
                {currentStage.desc}
              </motion.p>
            </AnimatePresence>
          </div>

        </div>

      </div>
    </section>
  );
}
