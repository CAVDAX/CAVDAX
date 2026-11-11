import React, { useState, useEffect, useRef } from 'react';
import { playClick } from '../utils/soundFx';

const TAB_SECTIONS = {
  landing: [
    { id: 'brand-intro', label: '01 · Brand Identity' },
    { id: 'hero-section', label: '02 · Causal Engine' },
    { id: 'bento-section', label: '03 · Vector Rot vs Graph' },
    { id: 'enclave-hub-section', label: '04 · Causal Enclave' },
    { id: 'causal-loop-section', label: '05 · Verification Loop' },
    { id: 'comparison-matrix', label: '06 · Matrix Comparison' },
    { id: 'faq-section', label: '07 · Specifications' },
    { id: 'radar-section', label: '08 · Invalidation Radar' },
    { id: 'cta-section', label: '09 · Live Verification' },
  ],
  mcp: [
    { id: 'mcp-header', label: '01 · Protocol Gateway' },
    { id: 'mcp-config', label: '02 · Agent Configuration' },
    { id: 'mcp-architecture', label: '03 · Causal Interception' },
    { id: 'mcp-metrics', label: '04 · Protocol Metrics' },
  ],
  project: [
    { id: 'project-overview', label: '01 · System Overview' },
    { id: 'project-video', label: '02 · Demo Showcase' },
    { id: 'project-license', label: '03 · Open Source License' },
    { id: 'project-specs', label: '04 · Architectural Specs' },
  ],
  team: [
    { id: 'team-intro', label: '01 · Team Contrarians' },
    { id: 'team-roster', label: '02 · Builders & Engineers' },
    { id: 'team-credits', label: '03 · System Credits' },
  ],
  profile: [
    { id: '__top', label: '01 · Profile Identity', pct: 0 },
    { id: '__mid_1', label: '02 · Tier & Quotas', pct: 33 },
    { id: '__mid_2', label: '03 · Real-Time Metrics', pct: 66 },
    { id: '__bot', label: '04 · API Credentials', pct: 100 },
  ],
  support: [
    { id: '__top', label: '01 · Community Support', pct: 0 },
    { id: '__mid_1', label: '02 · Sponsorship Tiers', pct: 33 },
    { id: '__mid_2', label: '03 · Fund Stewardship', pct: 66 },
    { id: '__bot', label: '04 · Prototype Notice', pct: 100 },
  ],
  default: [
    { id: '__top', label: '01 · Top Landmark', pct: 0 },
    { id: '__mid_1', label: '02 · Architecture', pct: 33 },
    { id: '__mid_2', label: '03 · System Details', pct: 66 },
    { id: '__bot', label: '04 · Viewport Base', pct: 100 },
  ],
};

/**
 * ArchitecturalRailScrubber (Universal Scroll Cue & Rail Scrubber)
 * 
 * - Universal: Displays on ANY page whenever vertical scroll is present (scrollY / maxScroll > 0).
 * - Default State: Discrete floating editorial scroll cue bubbles (exact original design with active pill).
 * - Transform on Hold: Only when user presses and holds, it transforms into an architectural rail scrubber.
 * - Draggable: Continuous luminous thumb scrubs the page smoothly in real time.
 * - Revert on Release: Releases immediately back to discrete bubbles when pointer is lifted or clicked outside.
 */
export default function ArchitecturalRailScrubber({ activeTab = 'landing' }) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [hasScroll, setHasScroll] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [hoveredSection, setHoveredSection] = useState(null);
  const [activeSection, setActiveSection] = useState('');
  const [isRadarSection, setIsRadarSection] = useState(false);
  const [isCausalSection, setIsCausalSection] = useState(false);
  const [isFooterSection, setIsFooterSection] = useState(false);

  const containerRef = useRef(null);
  const isHoldingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const didDragRef = useRef(false);

  // Resolve current active section list for this view
  const sections = TAB_SECTIONS[activeTab] || TAB_SECTIONS.default;

  // 1. Detect scroll availability across any view
  useEffect(() => {
    const updateScrollMetrics = () => {
      try {
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const maxScroll = Math.max(0, scrollHeight - clientHeight);

      // Presence check: Page must have vertical scroll room (> 40px)
      const scrollable = maxScroll > 40;
      setHasScroll(scrollable);

      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);

      if (scrollable && !isDraggingRef.current) {
        const ratio = maxScroll > 0 ? Math.min(1, Math.max(0, currentScrollY / maxScroll)) : 0;
        setScrollProgress(ratio);
      }

      const radarEl = document.getElementById('radar-section');
      const causalEl = document.getElementById('causal-loop-section');
      const enclaveEl = document.getElementById('enclave-hub-section');
      if (radarEl && activeTab === 'landing') {
        const rect = radarEl.getBoundingClientRect();
        const inRadar = rect.top <= clientHeight * 0.35 && rect.bottom >= clientHeight * 0.15;
        setIsRadarSection(inRadar);
      } else {
        setIsRadarSection(false);
      }
      if (activeTab === 'landing') {
        let inCausalOrEnclave = false;
        if (causalEl) {
          const rect = causalEl.getBoundingClientRect();
          if (rect.top <= clientHeight * 0.35 && rect.bottom >= clientHeight * 0.15) {
            inCausalOrEnclave = true;
          }
        }
        if (enclaveEl) {
          const rect = enclaveEl.getBoundingClientRect();
          if (rect.top <= clientHeight * 0.35 && rect.bottom >= clientHeight * 0.15) {
            inCausalOrEnclave = true;
          }
        }
        setIsCausalSection(inCausalOrEnclave);
      } else {
        setIsCausalSection(false);
      }

      // Check proximity to footer landmark to smoothly fade out vertical scroll cue
      const footerEl = document.querySelector('footer') || document.getElementById('footer');
      let inFooter = false;
      if (footerEl) {
        const fRect = footerEl.getBoundingClientRect();
        if (fRect.top <= clientHeight * 0.82) {
          inFooter = true;
        }
      } else if (maxScroll > 0 && currentScrollY / maxScroll >= 0.94) {
        inFooter = true;
      }
      setIsFooterSection(inFooter);
      } catch (err) {
        console.warn("[ArchitecturalRailScrubber] Scroll metrics evaluation bypassed:", err);
      }
    };

    updateScrollMetrics();
    window.addEventListener('scroll', updateScrollMetrics, { passive: true });
    window.addEventListener('resize', updateScrollMetrics, { passive: true });
    if (window.__lenis) {
      window.__lenis.on('scroll', updateScrollMetrics);
    }

    // Mutation & Resize observer for dynamic page layout expansions
    let observer;
    if (typeof ResizeObserver !== 'undefined' && document.body) {
      observer = new ResizeObserver(updateScrollMetrics);
      observer.observe(document.body);
    }

    const timer1 = setTimeout(updateScrollMetrics, 100);
    const timer2 = setTimeout(updateScrollMetrics, 400);

    return () => {
      window.removeEventListener('scroll', updateScrollMetrics);
      window.removeEventListener('resize', updateScrollMetrics);
      if (window.__lenis) {
        window.__lenis.off('scroll', updateScrollMetrics);
      }
      if (observer) observer.disconnect();
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [activeTab]);

  // 2. Track active section landmarks
  useEffect(() => {
    if (!sections || sections.length === 0) return;

    // Filter valid DOM landmark IDs
    const elements = sections
      .map((s) => ({ id: s.id, el: document.getElementById(s.id) }))
      .filter((item) => item.el !== null);

    if (elements.length > 0) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(entry.target.id);
            }
          });
        },
        { rootMargin: '-20% 0px -40% 0px', threshold: 0.1 }
      );

      elements.forEach((item) => observer.observe(item.el));
      return () => observer.disconnect();
    } else {
      // Proportional fallback when DOM IDs aren't explicitly rendered
      const idx = Math.min(sections.length - 1, Math.floor(scrollProgress * sections.length));
      setActiveSection(sections[idx]?.id || '');
    }
  }, [sections, scrollProgress, activeTab]);

  // 3. Pointer drag & hold interactions
  const handlePointerDown = (e, targetSec) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    isHoldingRef.current = true;
    isDraggingRef.current = false;
    didDragRef.current = false;
    startYRef.current = e.clientY;
    setIsHolding(true);

    const container = containerRef.current;
    if (container) {
      try {
        container.setPointerCapture(e.pointerId);
      } catch {}
    }

    const updateScrollFromPointer = (clientY) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const relativeY = Math.min(rect.height, Math.max(0, clientY - rect.top));
      const ratio = rect.height > 0 ? relativeY / rect.height : 0;
      setScrollProgress(ratio);

      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const targetScroll = ratio * maxScroll;

      if (window.__lenis) {
        window.__lenis.scrollTo(targetScroll, { immediate: true });
      } else {
        window.scrollTo(0, targetScroll);
      }
    };

    const onPointerMove = (moveEvent) => {
      if (!isHoldingRef.current) return;

      const deltaY = Math.abs(moveEvent.clientY - startYRef.current);
      if (deltaY > 3) {
        didDragRef.current = true;
        isDraggingRef.current = true;
      }

      if (didDragRef.current) {
        moveEvent.preventDefault();
        updateScrollFromPointer(moveEvent.clientY);
      }
    };

    const onPointerUp = (upEvent) => {
      isHoldingRef.current = false;
      isDraggingRef.current = false;
      setIsHolding(false);

      if (container) {
        try {
          container.releasePointerCapture(upEvent.pointerId);
        } catch {}
      }

      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      // Discrete click without dragging navigates directly to that section
      if (!didDragRef.current && targetSec) {
        handleSectionClick(targetSec);
      }
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const handleSectionClick = (sec) => {
    playClick();
    if (sec.id && !sec.id.startsWith('__')) {
      const el = document.getElementById(sec.id);
      if (el) {
        if (window.__lenis) {
          window.__lenis.scrollTo(el, { offset: (sec.id === 'brand-intro' || sec.id === 'comparison-matrix') ? 0 : -30 });
        } else {
          el.scrollIntoView({ behavior: 'smooth' });
        }
        return;
      }
    }

    if (typeof sec.pct === 'number') {
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const target = (sec.pct / 100) * maxScroll;
      if (window.__lenis) {
        window.__lenis.scrollTo(target);
      } else {
        window.scrollTo({ top: target, behavior: 'smooth' });
      }
    }
  };

  // If page does NOT have vertical scroll, do not show scroll cues
  // Hide scroll cues if no scroll room or if on Profile page
  if (!hasScroll || activeTab === 'profile') return null;

  // Hide exclusively on Wordmark Intro section, reveal on other pages & sections with smooth subtle fade
  const isWordmarkIntro = activeTab === 'landing' && scrollY < (typeof window !== 'undefined' ? window.innerHeight * 0.52 : 420);

  // During causal loop section: hide the vertical scroll cue entirely (only horizontal cue is present)
  // During radar section: only scroll cue is visible, kept very dimmed (0.20) as requested
  const isHidden = isWordmarkIntro || isCausalSection || isFooterSection;
  const currentOpacity = isHidden 
    ? 0 
    : (isRadarSection ? (hoveredSection || isHolding ? 0.6 : 0.20) : 1);

  return (
    <aside
      aria-label="Universal Section Navigation and Scrubber"
      style={{
        opacity: currentOpacity,
        transform: `translate3d(${isHidden ? '16px' : '0px'}, -50%, 0)`,
        pointerEvents: isHidden ? 'none' : 'auto',
        transition: 'opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className="fixed right-3 sm:right-6 top-1/2 z-[75] hidden sm:flex items-center select-none"
    >
      <div
        ref={containerRef}
        className={`relative flex flex-col items-center justify-between py-1 transition-all duration-300 ease-out ${
          isHolding ? 'h-60 cursor-grabbing' : 'gap-3 h-auto cursor-pointer'
        }`}
      >
        {/* Continuous 2px Architectural Rail Line: Fades in exclusively on hold */}
        <div
          className={`absolute left-1/2 -translate-x-1/2 top-2 bottom-2 w-[2px] rounded-full bg-slate-300 dark:bg-white/20 transition-all duration-300 pointer-events-none ${
            isHolding ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-75'
          }`}
        />

        {/* Draggable Luminous Thumb: Appears exclusively when holding/scrubbing */}
        {isHolding && (
          <div
            style={{
              top: `${Math.min(96, Math.max(4, scrollProgress * 100))}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute left-1/2 w-2.5 h-7 rounded-full bg-slate-950 dark:bg-white shadow-[0_0_12px_rgba(0,0,0,0.35)] dark:shadow-[0_0_14px_rgba(255,255,255,0.6)] z-30 pointer-events-none transition-none"
          />
        )}

        {/* Discrete Section Bubbles (Original Default Design) */}
        {sections.map((sec) => {
          const isActive = activeSection === sec.id;
          const isHovered = hoveredSection === sec.id;

          return (
            <button
              key={sec.id}
              onPointerDown={(e) => handlePointerDown(e, sec)}
              onMouseEnter={() => setHoveredSection(sec.id)}
              onMouseLeave={() => setHoveredSection(null)}
              className="group relative flex items-center justify-end p-1.5 focus:outline-none z-20"
              aria-label={sec.label}
            >
              {/* Floating Monospace Label Tooltip on Left */}
              <span
                className={`absolute right-7 px-2.5 py-1 rounded text-[10px] font-mono font-medium whitespace-nowrap bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-md transition-all duration-200 pointer-events-none ${
                  isHovered || (isHolding && isActive)
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 translate-x-1'
                }`}
              >
                {sec.label}
              </span>

              {/* Architectural Indicator Bubble:
                  - In resting state: active is w-2.5 h-6, inactive is w-2 h-2.
                  - In holding state: morphs smoothly into track alignment ticks.
              */}
              <span
                className={`block rounded-full transition-all duration-300 ${
                  isHolding
                    ? isActive
                      ? 'w-2 h-2 bg-slate-950 dark:bg-white ring-2 ring-slate-400/50 dark:ring-white/50'
                      : 'w-1.5 h-1.5 bg-slate-400 dark:bg-white/30'
                    : isActive
                    ? 'w-2.5 h-6 bg-slate-950 dark:bg-white shadow-xs'
                    : 'w-2 h-2 bg-slate-300 dark:bg-white/25 group-hover:bg-slate-500 dark:group-hover:bg-white/70 group-hover:scale-125'
                }`}
              />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
