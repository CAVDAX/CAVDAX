import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useScroll, useSpring, useTransform, LayoutGroup } from 'framer-motion';
import Lightfall from './Lightfall';
import HairlineFigure from './ui/HairlineFigure';
import Tooltip from './Tooltip';
import {
  ArrowLeft,
  ChevronUp,
  Network,
  Lock,
  Fingerprint,
  Building2,
  Terminal,
  Users,
  Gem,
  Sun,
  Moon
} from 'lucide-react';
import { playClick } from '../utils/soundFx';

/**
 * Modern, sleek, non-AI tier iconography (Lucide unified 1.5px/2px vector geometry):
 * - CommunityIcon: Users team/community icon
 * - ProDiamondIcon: Gem precision diamond icon
 * - TeamScaleIcon: Building2 institutional multi-tenant pylon
 */
function CommunityIcon({ className = 'w-3.5 h-3.5' }) {
  return <Users className={`${className} shrink-0`} aria-hidden="true" />;
}

function ProDiamondIcon({ className = 'w-3.5 h-3.5' }) {
  return <Gem className={`${className} shrink-0`} aria-hidden="true" />;
}

function TeamScaleIcon({ className = 'w-3.5 h-3.5' }) {
  return <Building2 className={`${className} shrink-0`} aria-hidden="true" />;
}

/**
 * Modern, sleek, non-AI amber directional indicator arrow (1.75px crisp geometry).
 */
function ArrowRightAmber({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg
      className={`${className} text-[#d9a353] shrink-0`}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 7h10M8.5 3.5l3.5 3.5-3.5 3.5" />
    </svg>
  );
}

/**
 * Architectural Coordinate Matrix Grid SVG (Clean, non-AI CAD-style table geometry).
 */
function MatrixGridIcon({ className = 'w-4 h-4' }) {
  return (
    <svg
      className={`${className} text-slate-900 dark:text-white shrink-0`}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M2 6.5h12M6.5 2v12M11 6.5v7.5" />
    </svg>
  );
}

const TIERS = [
  {
    id: 'community',
    label: 'Community',
    icon: CommunityIcon,
    tag: 'Free Forever',
    price: '₹0',
    period: '/ mo',
    desc: 'For solo developers & local architectural evaluation.',
    btnLabel: 'Current Plan',
    specs: {
      graphblas: '< 1.0ms (Local In-Memory)',
      repos: '1 Repository (Active branch)',
      branches: 'Main / Default Branch only',
      mutex: 'Single Agent (1 lease max)',
      crossProcess: 'Local Stdio MCP only',
      preflight: '100 req/min (30 tools/min)',
      cicd: 'Manual CLI (npx cavdax check)',
      provisioning: 'Individual GitHub PAT',
      audit: '10 Entries History Window',
      deployment: 'Local Self-Hosted Mesh'
    }
  },
  {
    id: 'pro',
    label: 'Pro Autonomous',
    icon: ProDiamondIcon,
    tag: '7-Day Free Trial',
    price: '₹299',
    period: '/ mo ($4 USD)',
    desc: 'For autonomous agents & multi-branch parallel engineering.',
    btnLabel: 'Start 7-Day Free Trial',
    specs: {
      graphblas: '< 1.5ms (Hosted In-Memory)',
      repos: '5 Repositories (All branches)',
      branches: 'Full Multi-Branch Tracking',
      mutex: 'Up to 3 Concurrent Agent Leases',
      crossProcess: 'Hosted Remote SSE MCP',
      preflight: '300 req/min (100 tools/min)',
      cicd: 'Automated GitHub Action Gate',
      provisioning: 'Team Member GitHub OAuth',
      audit: '1,000 Entries History Window',
      deployment: 'Managed Cloud Cluster'
    }
  },
  {
    id: 'enterprise',
    label: 'Team & Scale',
    icon: TeamScaleIcon,
    tag: 'Team Multi-Tenancy',
    price: '₹2,999',
    period: '/ mo ($35 USD)',
    desc: 'For high-velocity engineering teams requiring strict CI/CD merge blockers.',
    btnLabel: 'Activate Team & Scale',
    specs: {
      graphblas: 'Uncapped Invalidation Engine',
      repos: 'Unlimited Repositories',
      branches: 'Tenant-Isolated Multi-Branch',
      mutex: 'Unlimited Agent Leases',
      crossProcess: 'Dedicated High-Speed SSE Mesh',
      preflight: 'Unlimited Rate (No Throttling)',
      cicd: 'Enforced Merge Blocker Gate',
      provisioning: 'Auto-Provision (@yourcompany.com)',
      audit: 'Signed Full Compliance Ledger',
      deployment: 'Dedicated KeySpace & Self-Hosted Mesh'
    }
  }
];

export default function TierBenefitsPage({
  user,
  tier = 'free',
  onOpenProfilePage,
  onOpenMcpPage,
  onLaunchConsole,
  isDarkTheme = true,
  onToggleTheme
}) {
  const [selectedTier, setSelectedTier] = useState(() => (tier === 'enterprise' ? 'enterprise' : (tier === 'pro' ? 'pro' : 'community')));
  const [isMutexHovered, setIsMutexHovered] = useState(false);
  const [themeRotation, setThemeRotation] = useState(0);
  const prevDarkThemeRef = useRef(isDarkTheme);
  useEffect(() => {
    if (prevDarkThemeRef.current !== isDarkTheme) {
      setThemeRotation(prev => prev + 360);
      prevDarkThemeRef.current = isDarkTheme;
    }
  }, [isDarkTheme]);

  const handleToggleTheme = () => {
    playClick();
    if (onToggleTheme) onToggleTheme();
  };
  const currentTierData = TIERS.find(t => t.id === selectedTier) || TIERS[1];

  // Client-mount state for pure root viewport Portal projection
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Dynamic Scroll State: tracks whether user has moved past the hero section
  const [isBelowHero, setIsBelowHero] = useState(false);

  useEffect(() => {
    const handleScroll = e => {
      const hero = document.getElementById('tier-hero-section');
      const threshold = hero ? hero.offsetHeight - 120 : 540;
      const currentScroll = typeof e?.scroll === 'number' ? e.scroll : window.scrollY;
      setIsBelowHero(currentScroll >= threshold);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    if (window.__lenis) {
      window.__lenis.on('scroll', handleScroll);
    }
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (window.__lenis) {
        window.__lenis.off('scroll', handleScroll);
      }
    };
  }, []);


  const theaterRef = useRef(null);
  const tableContainerRef = useRef(null);

  // Auto-scroll comparison matrix to active tier on compact viewports
  useEffect(() => {
    if (!tableContainerRef.current) return;
    const container = tableContainerRef.current;
    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll <= 0) return;
    if (selectedTier === 'enterprise') {
      container.scrollTo({ left: maxScroll + 80, behavior: 'smooth' });
    } else if (selectedTier === 'community') {
      container.scrollTo({ left: 0, behavior: 'smooth' });
    } else if (selectedTier === 'pro') {
      container.scrollTo({ left: maxScroll / 2, behavior: 'smooth' });
    }
  }, [selectedTier]);
  const { scrollYProgress } = useScroll({
    target: theaterRef,
    offset: ['start end', 'end start']
  });

  const ribbonPath = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    restDelta: 0.001
  });

  // ── Kinetic Perimeter Scroll Circuit for Floating Right Sidebar Dock ──
  const { scrollYProgress: globalScrollYProgress } = useScroll();
  const dockProgress = useTransform(globalScrollYProgress, [0.12, 0.98], [0, 1], { clamp: true });
  const dockPerimeterSpring = useSpring(dockProgress, {
    stiffness: 140,
    damping: 26,
    restDelta: 0.001
  });
  const dockNavRef = useRef(null);
  const [dockBounds, setDockBounds] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!dockNavRef.current) return;
    const updateBounds = () => {
      if (dockNavRef.current) {
        const el = dockNavRef.current;
        // CRITICAL INVARIANT: Use offsetWidth & offsetHeight instead of getBoundingClientRect().
        // getBoundingClientRect() measures the visual box AFTER CSS transform: scale() is applied.
        // During Framer Motion scale transitions (e.g. scale: 0.95), getBoundingClientRect()
        // returns 0.95x the real height (e.g. 361px instead of 380px), causing the border to cut off 19px early!
        // offsetWidth and offsetHeight return the true untransformed CSS layout box geometry.
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        if (w > 0 && h > 0) {
          setDockBounds({ width: w, height: h });
        }
      }
    };
    updateBounds();
    const frame = requestAnimationFrame(updateBounds);
    const ro = new ResizeObserver(updateBounds);
    ro.observe(dockNavRef.current);
    window.addEventListener('resize', updateBounds);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener('resize', updateBounds);
    };
  }, [isBelowHero]);

  // ── High-Precision Lenis & Wheel Scroll Snap between Fullscreen Hero and Content Theater ──
  useEffect(() => {
    let isSnapping = false;
    let snapSafetyTimer = null;
    let snapTimeout = null;

    const unlockSnapping = () => {
      isSnapping = false;
      if (window.__lenis) {
        window.__lenis.isLocked = false;
      }
    };

    const snapToContent = () => {
      const content = document.getElementById('tier-theater-content');
      if (!content) return;
      isSnapping = true;
      clearTimeout(snapSafetyTimer);
      snapSafetyTimer = setTimeout(unlockSnapping, 1100);

      const targetY = content.offsetTop - 80;
      if (window.__lenis) {
        window.__lenis.scrollTo(targetY, {
          duration: 0.82,
          lock: true,
          easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          onComplete: unlockSnapping
        });
      } else {
        window.scrollTo({ top: targetY, behavior: 'smooth' });
        setTimeout(unlockSnapping, 950);
      }
    };

    const snapToHero = () => {
      isSnapping = true;
      clearTimeout(snapSafetyTimer);
      snapSafetyTimer = setTimeout(unlockSnapping, 1100);

      if (window.__lenis) {
        window.__lenis.scrollTo(0, {
          duration: 0.82,
          lock: true,
          easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          onComplete: unlockSnapping
        });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(unlockSnapping, 950);
      }
    };

    // Wheel intent catcher
    const handleWheel = e => {
      if (isSnapping || window.__lenis?.isLocked) return;
      const currentY = window.scrollY;
      const content = document.getElementById('tier-theater-content');
      if (!content) return;
      const contentTop = content.offsetTop - 80;

      // Scrolling down from within fullscreen Hero viewport (0 to contentTop - 50)
      if (currentY < contentTop - 50 && e.deltaY > 0) {
        if (e.cancelable) e.preventDefault();
        snapToContent();
        return;
      }

      // Scrolling up when near the top boundary of content
      if (currentY <= contentTop + 40 && currentY > 20 && e.deltaY < 0) {
        if (e.cancelable) e.preventDefault();
        snapToHero();
        return;
      }
    };

    // Momentum settling catcher for trackpads and continuous scroll
    const handleScrollSettling = () => {
      if (isSnapping || window.__lenis?.isLocked) return;
      const currentY = window.scrollY;
      const content = document.getElementById('tier-theater-content');
      if (!content) return;
      const contentTop = content.offsetTop - 80;

      if (currentY > 30 && currentY < contentTop - 40) {
        clearTimeout(snapTimeout);
        snapTimeout = setTimeout(() => {
          if (isSnapping || window.__lenis?.isLocked) return;
          if (currentY > contentTop * 0.5) {
            snapToContent();
          } else {
            snapToHero();
          }
        }, 80);
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('scroll', handleScrollSettling, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('scroll', handleScrollSettling);
      clearTimeout(snapTimeout);
      clearTimeout(snapSafetyTimer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans relative overflow-x-hidden pb-24 transition-colors duration-200">
      {/* ── Substrate Specular Blueprint Grid ── */}
      <div className="fixed inset-0 pointer-events-none z-0" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:opacity-30" />
      </div>

      {/* ── DUAL DYNAMIC NAVBAR: Horizontal Floating Bar in Hero ⇄ Vertical Right Sidebar Below Hero ── */}
      {/* Mounted via Root Portal directly on document.body to guarantee absolute viewport fixation free of ancestor CSS transform traps */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {!isBelowHero ? (
          /* 1. Hero Mode: Top Horizontal Floating Dock (Centered mathematically via flexbox container) */
          <div className="fixed top-4 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
            <motion.div
              key="tier-top-dock"
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto"
            >
              <nav
                aria-label="Tier Navigation (Hero)"
                className="bg-white/70 dark:bg-slate-950/70 backdrop-blur-3xl shadow-[0_16px_40px_-10px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] rounded-full px-2.5 py-1.5 flex items-center gap-2.5 transition-colors duration-300"
              >
                {/* Arrow-only Back Button with Tooltip (No wordy clutter, rock-solid icon) */}
                <Tooltip content="Back to Account & Quotas" position="bottom">
                  <button
                    onClick={() => {
                      playClick();
                      if (onOpenProfilePage) onOpenProfilePage();
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                    aria-label="Back to Account & Quotas"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </Tooltip>

                {/* Minimalist Divider (Crisp hairline visible in both light & dark modes) */}
                <div className="w-[1px] h-4 bg-slate-300 dark:bg-white/20 shrink-0" />

                {/* 3 Tier Selector Tabs with Pure Declarative Spring-Animated Sliding Pill */}
                <LayoutGroup id="tier-hero-nav">
                  <div className="relative flex items-center p-1 rounded-full bg-slate-100/50 dark:bg-white/[0.03] text-[11px] font-mono">
                    {TIERS.map(t => {
                      const Icon = t.icon;
                      const isActive = selectedTier === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            playClick();
                            setSelectedTier(t.id);
                          }}
                          className={`relative px-4 py-2 rounded-full transition-colors duration-200 cursor-pointer font-medium flex items-center gap-1.5 whitespace-nowrap select-none ${
                            isActive
                              ? 'text-white dark:text-slate-950 font-bold'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="hero-active-tier-pill"
                              className="absolute inset-0 rounded-full bg-slate-950 dark:bg-white shadow-xs"
                              transition={{
                                type: 'spring',
                                stiffness: 500,
                                damping: 36
                              }}
                            />
                          )}
                          <span className="relative z-10 flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="leading-none">{t.label}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </LayoutGroup>

                {/* Minimalist Divider */}
                <div className="w-[1px] h-4 bg-slate-300 dark:bg-white/20 shrink-0" />

                {/* Theme Toggle Button — Exact match to Header.jsx & SponsorsPage.jsx */}
                <Tooltip content={isDarkTheme ? 'Switch to Light' : 'Switch to Dark'} position="bottom">
                  <button
                    type="button"
                    onClick={handleToggleTheme}
                    className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border border-slate-200/80 dark:border-white/20 bg-slate-100/80 dark:bg-white/[0.08] hover:bg-slate-200/80 dark:hover:bg-white/15 text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-all shadow-2xs backdrop-blur-md focus:outline-none group shrink-0"
                    aria-label="Toggle theme"
                  >
                    <motion.div
                      animate={{ rotate: themeRotation }}
                      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                      className="flex items-center justify-center pointer-events-none"
                    >
                      {isDarkTheme
                        ? <Sun className="w-3.5 h-3.5 text-current theme-toggle-icon" />
                        : <Moon className="w-3.5 h-3.5 text-current theme-toggle-icon" />}
                    </motion.div>
                  </button>
                </Tooltip>
              </nav>
            </motion.div>
          </div>
        ) : (
          /* 2. Below-Hero Mode: Elevated Floating Right Sidebar Dock */
          <div className="fixed right-3 sm:right-6 xl:right-6 2xl:right-8 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
            <motion.aside
              key="tier-sidebar-dock"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto"
              aria-label="Tier Quick Dock"
            >
              <nav
                ref={dockNavRef}
                className="relative bg-white/70 dark:bg-slate-950/70 backdrop-blur-3xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.15),0_0_1px_rgba(0,0,0,0.06)] dark:shadow-[0_25px_60px_-10px_rgba(0,0,0,0.7),0_0_1px_rgba(255,255,255,0.08)] rounded-2xl p-2 sm:p-2.5 flex flex-col items-center gap-2.5 sm:gap-3 transition-colors duration-300"
              >
                {/* ── Kinetic Scroll-Linked Perimeter Circuit (Suneet Option A Standard) ── */}
                {dockBounds.width > 0 && dockBounds.height > 0 && (
                  <svg
                    className="absolute inset-0 pointer-events-none overflow-visible rounded-2xl"
                    width={dockBounds.width}
                    height={dockBounds.height}
                    aria-hidden="true"
                    style={{ zIndex: 0 }}
                  >
                    {/* Baseline Track */}
                    <rect
                      x="0.75"
                      y="0.75"
                      width={dockBounds.width - 1.5}
                      height={dockBounds.height - 1.5}
                      rx="16"
                      fill="none"
                      className="stroke-slate-300/40 dark:stroke-white/10"
                      strokeWidth="1"
                    />

                    {/* Ambient Diffuse Underglow Track */}
                    <motion.rect
                      x="0.75"
                      y="0.75"
                      width={dockBounds.width - 1.5}
                      height={dockBounds.height - 1.5}
                      rx="16"
                      fill="none"
                      stroke="#d9a353"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      className="blur-[2px] opacity-25 dark:opacity-40"
                      style={{ pathLength: dockPerimeterSpring }}
                    />

                    {/* Crisp Precision Amber Hairline Stroke */}
                    <motion.rect
                      x="0.75"
                      y="0.75"
                      width={dockBounds.width - 1.5}
                      height={dockBounds.height - 1.5}
                      rx="16"
                      fill="none"
                      stroke="#d9a353"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      style={{ pathLength: dockPerimeterSpring }}
                    />
                  </svg>
                )}

                {/* Back to Account & Quotas */}
                <Tooltip content="Back to Account & Quotas" position="left">
                  <button
                    onClick={() => {
                      playClick();
                      if (onOpenProfilePage) onOpenProfilePage();
                    }}
                    className="relative z-10 w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                    aria-label="Back to Account & Quotas"
                  >
                    <ArrowLeft className="w-4 h-4 shrink-0" />
                  </button>
                </Tooltip>

                {/* Minimalist Divider */}
                <div className="relative z-10 w-5 h-[1px] bg-slate-400/80 dark:bg-white/40 my-0.5 shrink-0" />

                {/* Vertical Track for Tier SVGs with Pure Declarative Spring-Animated Sliding Pill */}
                <LayoutGroup id="tier-sidebar-nav">
                  <div className="relative z-10 flex flex-col items-center gap-2 p-1 rounded-xl bg-slate-100/50 dark:bg-white/[0.03]">
                    {TIERS.map(t => {
                      const Icon = t.icon;
                      const isActive = selectedTier === t.id;
                      return (
                        <Tooltip
                          key={t.id}
                          content={`${t.label} (${t.price}/mo)`}
                          position="left"
                        >
                          <button
                            onClick={() => {
                              playClick();
                              setSelectedTier(t.id);
                            }}
                            className={`relative w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl transition-colors duration-200 cursor-pointer select-none ${
                              isActive
                                ? 'text-white dark:text-slate-950 font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5'
                            }`}
                            aria-label={t.label}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="sidebar-active-tier-pill"
                                className="absolute inset-0 rounded-xl bg-slate-950 dark:bg-white shadow-xs"
                                transition={{
                                  type: 'spring',
                                  stiffness: 500,
                                  damping: 36
                                }}
                              />
                            )}
                            <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5 shrink-0 relative z-10" />
                          </button>
                        </Tooltip>
                      );
                    })}
                  </div>
                </LayoutGroup>

                {/* Minimalist Divider */}
                <div className="relative z-10 w-5 h-[1px] bg-slate-400/80 dark:bg-white/40 my-0.5 shrink-0" />
                {/* Theme Toggle Button — Sidebar Dock */}
                <Tooltip content={isDarkTheme ? 'Switch to Light' : 'Switch to Dark'} position="left">
                  <button
                    type="button"
                    onClick={handleToggleTheme}
                    className="relative z-10 w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                    aria-label="Toggle theme"
                  >
                    <motion.div
                      animate={{ rotate: themeRotation }}
                      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                      className="flex items-center justify-center pointer-events-none"
                    >
                      {isDarkTheme
                        ? <Sun className="w-4 h-4 text-current theme-toggle-icon" />
                        : <Moon className="w-4 h-4 text-current theme-toggle-icon" />}
                    </motion.div>
                  </button>
                </Tooltip>

                {/* Minimalist Divider */}
                <div className="relative z-10 w-5 h-[1px] bg-slate-400/80 dark:bg-white/40 my-0.5 shrink-0" />


                {/* Smooth Return to Top Cue */}
                <Tooltip content="Return to Top" position="left">
                  <button
                    onClick={() => {
                      playClick();
                      if (window.__lenis) {
                        window.__lenis.scrollTo(0, {
                          duration: 0.82,
                          lock: true,
                          easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t))
                        });
                      } else {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className="relative z-10 w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                    aria-label="Return to Top"
                  >
                    <ChevronUp className="w-4 h-4 shrink-0" />
                  </button>
                </Tooltip>
              </nav>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* ── FULLSCREEN HERO VIEWPORT (100dvh — Matching Wordmark Page Section) ── */}
      <section
        id="tier-hero-section"
        className="relative w-full h-[100dvh] min-h-[640px] flex flex-col items-center justify-center overflow-hidden select-none"
      >
        {/* Full-bleed 3D Lightfall Ambient Light Tunnel Background (Calibrated Sweet-Spot: Balanced Speed, Moderate Gaps & Natural Ray Cadence) */}
        <div className="absolute inset-0 z-0">
          <Lightfall
            colors={['#ffffff', '#e2e8f0', '#94a3b8']}
            backgroundColor={isDarkTheme ? '#020617' : '#f8fafc'}
            speed={0.2}
            streakCount={8}
            streakWidth={0.8}
            streakLength={1.2}
            density={0.5}
            glow={1.1}
            bloom={1.0}
            opacity={0.9}
            lightMode={!isDarkTheme}
            intensity={selectedTier === 'enterprise' ? 1.4 : selectedTier === 'pro' ? 1.1 : 0.85}
          />
        </div>

        {/* ── Atmospheric Filter Blur Layer (Exact Match to Main Benchmark) ── */}
        <div className="absolute inset-0 backdrop-blur-md bg-slate-50/40 dark:backdrop-blur-[2.5px] dark:bg-slate-950/20 pointer-events-none z-1" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-transparent to-transparent dark:from-slate-950 dark:via-transparent dark:to-transparent pointer-events-none z-1" />

        {/* Center-Aligned Monumental Display Typography with Optical Comma Kerning */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-8 text-center flex flex-col items-center py-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-950 dark:text-white font-mono tracking-normal leading-[1.26] sm:leading-[1.3] lg:leading-[1.32] dark:[text-shadow:_0_0_8px_rgba(2,6,23,0.75),_0_2px_4px_rgba(0,0,0,0.85)] dark:drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
            Tier Plans<span className="-mr-2 sm:-mr-3.5">,</span> Capabilities<br className="hidden sm:inline" /> &amp; Benefits
          </h1>
        </div>

        {/* ── Wordmark Page Scroll Cue (with Localized Optical Vignette in Dark Theme) ── */}
        <div
          onClick={() => {
            playClick();
            const content = document.getElementById('tier-theater-content');
            if (content) {
              const targetY = content.offsetTop - 80;
              if (window.__lenis) {
                window.__lenis.scrollTo(targetY, {
                  duration: 0.82,
                  lock: true,
                  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t))
                });
              } else {
                window.scrollTo({ top: targetY, behavior: 'smooth' });
              }
            }
          }}
          className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer group select-none opacity-85 hover:opacity-100 transition-opacity z-20 px-4 py-2"
        >
          {/* Localized dark theme radial vignette behind the scroll cue and mouse icon */}
          <div className="absolute inset-0 -inset-x-6 -inset-y-3 bg-[radial-gradient(ellipse_at_center,rgba(2,6,23,0.75)_0%,rgba(2,6,23,0.4)_50%,transparent_80%)] dark:block hidden pointer-events-none -z-1 rounded-2xl" />

          <span className="text-[10px] font-mono tracking-widest uppercase text-slate-500 dark:text-slate-300 dark:drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] group-hover:text-slate-900 dark:group-hover:text-white transition-colors relative z-10">
            Scroll to inspect engine
          </span>
          <div className="w-5 h-8 rounded-full border border-slate-400/80 dark:border-white/40 dark:bg-slate-950/40 dark:shadow-[0_2px_12px_rgba(0,0,0,0.8)] flex items-start justify-center p-1 group-hover:border-slate-800 dark:group-hover:border-white transition-colors relative z-10 backdrop-blur-[1px]">
            <div className="w-1 h-2 rounded-full bg-slate-700 dark:bg-white animate-bounce" />
          </div>
        </div>
      </section>

      {/* ── SECTION 2: Alternating Hardware Instrument Theater with #Ribbon ── */}
      <main
        ref={theaterRef}
        id="tier-theater-content"
        className="max-w-6xl mx-auto px-4 sm:px-6 xl:pr-24 2xl:pr-6 relative z-10 scroll-mt-24 space-y-24"
      >
        {/* ── Continuous Flowing Monochromatic Ribbon SVG (from #Ribbon reference) ── */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-visible hidden md:block" aria-hidden="true">
          <svg
            className="w-full h-full"
            viewBox="0 0 1200 1800"
            fill="none"
            preserveAspectRatio="none"
          >
            {/* Ambient diffuse under-glow stroke */}
            <motion.path
              d="M 600,0 C 950,220 1080,420 850,650 C 600,900 150,850 250,1150 C 350,1400 950,1450 600,1800"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              className="text-slate-300/40 dark:text-white/10 blur-md"
              style={{ pathLength: ribbonPath }}
            />
            {/* Crisp Monochromatic Hairline Spline */}
            <motion.path
              d="M 600,0 C 950,220 1080,420 850,650 C 600,900 150,850 250,1150 C 350,1400 950,1450 600,1800"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="text-slate-400/70 dark:text-slate-400/40"
              style={{ pathLength: ribbonPath }}
            />
          </svg>
        </div>

        {/* Active Tier Summary Glassmorphic Banner (Borderless Frosted Glass) */}
        <div className="relative z-10 p-6 sm:p-8 rounded-3xl bg-white/50 dark:bg-slate-950/40 backdrop-blur-xl shadow-[0_20px_50px_-15px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.55),0_2px_8px_rgba(0,0,0,0.25)] transition-all duration-300">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedTier}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              <div>
                <div className="flex items-center gap-3">
                  <currentTierData.icon className="w-5 h-5 text-slate-900 dark:text-white shrink-0" />
                  <h2 className="text-2xl font-bold font-mono text-slate-950 dark:text-white">
                    {currentTierData.label}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                    {currentTierData.tag}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-sans mt-1">
                  {currentTierData.desc}
                </p>
              </div>

              {(() => {
                const isPlanActive =
                  (selectedTier === 'community' && (tier === 'free' || tier === 'community')) ||
                  (selectedTier === 'pro' && tier === 'pro') ||
                  (selectedTier === 'enterprise' && tier === 'enterprise');
                const isLoggedIn = Boolean(
                  user?.login ||
                  user?.id ||
                  (typeof window !== 'undefined' &&
                    (localStorage.getItem('cavdax_github_token') || localStorage.getItem('cavdax_dev_session')))
                );

                let ctaLabel = currentTierData.btnLabel;
                let showLock = false;
                if (isPlanActive) {
                  ctaLabel = 'Current Plan';
                } else if (!isLoggedIn) {
                  ctaLabel = 'Sign In to Activate';
                  showLock = true;
                } else if (selectedTier === 'pro') {
                  const hasClaimedTrial = Boolean(
                    user?.trial?.claimed ||
                    (typeof window !== 'undefined' && localStorage.getItem('cavdax_pro_trial'))
                  );
                  const isTrialActive = Boolean(
                    user?.trial?.claimed &&
                    user?.trial?.expiresAt &&
                    user.trial.expiresAt > Date.now()
                  );
                  if (isTrialActive) {
                    ctaLabel = 'Resume Pro Trial';
                  } else if (hasClaimedTrial) {
                    ctaLabel = 'Upgrade to Pro';
                  }
                }

                const handleCtaClick = () => {
                  playClick();
                  if (isPlanActive) return;
                  if (!isLoggedIn) {
                    const isLocalhost =
                      typeof window !== 'undefined' &&
                      (window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname === '::1');
                    if (isLocalhost) {
                      if (onOpenProfilePage) onOpenProfilePage();
                    } else {
                      window.location.href = '/api/auth/github?returnTo=/profile';
                    }
                    return;
                  }
                  // Authenticated user navigates to Profile page to confirm and activate plan
                  if (onOpenProfilePage) onOpenProfilePage();
                };

                return (
                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <div>
                      <div className="text-2xl font-black font-mono text-slate-950 dark:text-white">
                        {currentTierData.price}
                        <span className="text-xs font-normal text-slate-500"> {currentTierData.period}</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {isPlanActive ? 'Active Plan' : 'Managed via Account'}
                      </div>
                    </div>

                    <button
                      onClick={handleCtaClick}
                      disabled={isPlanActive}
                      className={`px-5 py-2.5 rounded-full font-mono font-bold text-xs transition-transform shadow-md flex items-center gap-1.5 ${
                        isPlanActive
                          ? 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400 cursor-default border border-slate-300/60 dark:border-white/10'
                          : 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 active:scale-95 cursor-pointer'
                      }`}
                    >
                      {showLock && <Lock className="w-3 h-3" />}
                      <span>{ctaLabel}</span>
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── FEATURE 1: GraphBLAS Matrix Invalidation ── */}
        {/* Left: Glassmorphic Card slides from LEFT (-60px)
            Right: Unboxed Free-Floating Hardware Vector Visual appears via MOSAIC BLUR FADE-IN */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-4">
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.25 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl bg-white/50 dark:bg-slate-950/40 backdrop-blur-xl p-6 sm:p-8 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.55),0_2px_8px_rgba(0,0,0,0.25)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <Network className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Causal Graph Engine
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold font-mono text-slate-950 dark:text-white">
              FalkorDB GraphBLAS Matrix Invalidation
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-sans mt-2 leading-relaxed line-clamp-2">
              Sparse algebraic semiring sweeps computing multi-hop reachability across the entire AST dependency DAG.
            </p>

            <div className="mt-6 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-white/[0.025]">
                <span className="text-slate-500">Invalidation Latency:</span>
                <span className="text-slate-950 dark:text-white font-bold">{currentTierData.specs.graphblas}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-white/[0.025]">
                <span className="text-slate-500">Repository Quota:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">{currentTierData.specs.repos}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-white/[0.025]">
                <span className="text-slate-500">Branch Isolation:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">{currentTierData.specs.branches}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(16px)' }}
            whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            viewport={{ once: false, amount: 0.25 }}
            transition={{ duration: 0.85, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex items-center justify-center overflow-visible"
          >
            <HairlineFigure
              type="branches"
              intensity={selectedTier === 'enterprise' ? 1.4 : selectedTier === 'pro' ? 1.1 : 0.85}
              isDarkTheme={isDarkTheme}
            />
          </motion.div>
        </div>

        {/* ── FEATURE 2: Distributed Multi-Agent Mutex Lock Engine ── */}
        {/* Left: Glassmorphic Card slides from LEFT (-60px)
            Right: Unboxed Free-Floating Hardware Vector Visual appears via MOSAIC BLUR FADE-IN */}
        <div
          onMouseEnter={() => setIsMutexHovered(true)}
          onMouseLeave={() => setIsMutexHovered(false)}
          className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-4"
        >
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.25 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl bg-white/50 dark:bg-slate-950/40 backdrop-blur-xl p-6 sm:p-8 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.55),0_2px_8px_rgba(0,0,0,0.25)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Concurrency Protection
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold font-mono text-slate-950 dark:text-white">
              Distributed Mutex Lock Engine
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-sans mt-2 leading-relaxed line-clamp-2">
              Leases exclusive locks on decisions so parallel agent fleets cannot mutate the same ADR concurrently or cause split-brain drift.
            </p>

            <div className="mt-6 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-white/[0.025]">
                <span className="text-slate-500">Agent Concurrency Quota:</span>
                <span className="text-slate-950 dark:text-white font-bold">{currentTierData.specs.mutex}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-white/[0.025]">
                <span className="text-slate-500">MCP Transport Topology:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">{currentTierData.specs.crossProcess}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-white/[0.025]">
                <span className="text-slate-500">API & Tool Rate Limit:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">{currentTierData.specs.preflight}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(16px)' }}
            whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            viewport={{ once: false, amount: 0.25 }}
            transition={{ duration: 0.85, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex items-center justify-center overflow-visible"
          >
            <HairlineFigure
              type="padlock"
              intensity={selectedTier === 'enterprise' ? 1.4 : selectedTier === 'pro' ? 1.1 : 0.85}
              isDarkTheme={isDarkTheme}
              isHovered={isMutexHovered}
            />
          </motion.div>
        </div>

        {/* ── FEATURE 3: CI/CD Invariant Blocking Gate & Audit Ledger ── */}
        {/* Left: Glassmorphic Card slides from LEFT (-60px)
            Right: Unboxed Free-Floating Hardware Vector Visual appears via MOSAIC BLUR FADE-IN */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-4">
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.25 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl bg-white/50 dark:bg-slate-950/40 backdrop-blur-xl p-6 sm:p-8 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.55),0_2px_8px_rgba(0,0,0,0.25)]"
          >
            <div className="flex items-center gap-2 mb-3">
              <Fingerprint className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Security &amp; Compliance
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold font-mono text-slate-950 dark:text-white">
              CI/CD Invariant Blocking Gate &amp; Audit Trail
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-sans mt-2 leading-relaxed line-clamp-2">
              Mandatory GitHub Status Check blocking pull requests if code touches invalidated decisions or breaches architectural invariants.
            </p>

            <div className="mt-6 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-white/[0.025]">
                <span className="text-slate-500">PR Merge Blocker:</span>
                <span className="text-slate-950 dark:text-white font-bold">{currentTierData.specs.cicd}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-white/[0.025]">
                <span className="text-slate-500">Audit Trail Retention:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">{currentTierData.specs.audit}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/50 dark:bg-white/[0.025]">
                <span className="text-slate-500">Seat Provisioning:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">{currentTierData.specs.provisioning}</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(16px)' }}
            whileInView={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            viewport={{ once: false, amount: 0.25 }}
            transition={{ duration: 0.85, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex items-center justify-center overflow-visible"
          >
            <HairlineFigure
              type="vault"
              intensity={selectedTier === 'enterprise' ? 1.4 : selectedTier === 'pro' ? 1.1 : 0.85}
              isDarkTheme={isDarkTheme}
            />
          </motion.div>
        </div>

        {/* ── SECTION 3: Architectural Invariant Matrix Table (Borderless Frosted Slab) ── */}
        <div className="relative z-10 rounded-3xl bg-white/50 dark:bg-slate-950/40 backdrop-blur-xl shadow-[0_24px_60px_-15px_rgba(0,0,0,0.06),0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.55),0_2px_8px_rgba(0,0,0,0.25)] overflow-hidden mt-16">
          <div className="py-4 px-6 border-b border-slate-200/50 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <MatrixGridIcon className="w-4 h-4" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Architectural Invariant Matrix
              </h3>
            </div>
          </div>

          <div ref={tableContainerRef} className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[1040px] text-left text-xs font-mono border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="py-3 px-4 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider w-[31%] min-w-[280px] border-b border-slate-200/50 dark:border-white/5 bg-slate-100/50 dark:bg-slate-950/40 whitespace-nowrap">
                    Capability &amp; Invariant
                  </th>
                  <th
                    className={`py-3 px-4 font-bold uppercase tracking-wider w-[23%] min-w-[220px] border-b border-slate-200/50 dark:border-white/5 whitespace-nowrap transition-colors duration-300 ease-out ${
                      selectedTier === 'community'
                        ? 'text-slate-950 dark:text-white bg-slate-200/60 dark:bg-white/[0.06] font-bold'
                        : 'text-slate-600 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-950/40'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      {selectedTier === 'community' && (
                        <motion.span layoutId="matrixActiveArrowIndicator" transition={{ type: 'spring', stiffness: 500, damping: 35 }}>
                          <ArrowRightAmber className="w-3.5 h-3.5" />
                        </motion.span>
                      )}
                      <span>Community</span>
                    </span>
                  </th>
                  <th
                    className={`py-3 px-4 font-bold uppercase tracking-wider w-[23%] min-w-[240px] border-b border-slate-200/50 dark:border-white/5 whitespace-nowrap transition-colors duration-300 ease-out ${
                      selectedTier === 'pro'
                        ? 'text-slate-950 dark:text-white bg-slate-200/60 dark:bg-white/[0.06] font-bold'
                        : 'text-slate-600 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-950/40'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      {selectedTier === 'pro' && (
                        <motion.span layoutId="matrixActiveArrowIndicator" transition={{ type: 'spring', stiffness: 500, damping: 35 }}>
                          <ArrowRightAmber className="w-3.5 h-3.5" />
                        </motion.span>
                      )}
                      <span>Pro Autonomous</span>
                    </span>
                  </th>
                  <th
                    className={`py-3 px-4 pr-8 font-bold uppercase tracking-wider w-[23%] min-w-[260px] border-b border-slate-200/50 dark:border-white/5 whitespace-nowrap transition-colors duration-300 ease-out ${
                      selectedTier === 'enterprise'
                        ? 'text-slate-950 dark:text-white bg-slate-200/60 dark:bg-white/[0.06] font-bold'
                        : 'text-slate-600 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-950/40'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      {selectedTier === 'enterprise' && (
                        <motion.span layoutId="matrixActiveArrowIndicator" transition={{ type: 'spring', stiffness: 500, damping: 35 }}>
                          <ArrowRightAmber className="w-3.5 h-3.5" />
                        </motion.span>
                      )}
                      <span>Team &amp; Scale</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-white/[0.04]">
                {[
                  {
                    name: 'FalkorDB GraphBLAS Invalidation',
                    desc: 'Sparse algebraic semiring sweeps computing multi-hop causality.',
                    community: { base: '< 1.0ms Local' },
                    pro: { base: '< 1.5ms Hosted' },
                    enterprise: { base: 'Uncapped Throughput' }
                  },
                  {
                    name: 'Connected Repositories & Workspaces',
                    desc: 'Active repositories tracked concurrently with AST links.',
                    community: { base: '1 Active Repo' },
                    pro: { base: '5 Repositories' },
                    enterprise: { base: 'Unlimited Repos' }
                  },
                  {
                    name: 'Secondary Branch Causal Isolation',
                    desc: 'Per-branch DAGs preventing staging edits from corrupting ADRs.',
                    community: { base: 'Main Branch only', vsPro: 'Main Only', vsEnterprise: 'Main Only' },
                    pro: { base: 'Multi-Branch DAG' },
                    enterprise: { base: 'Tenant Multi-Branch' }
                  },
                  {
                    name: 'Distributed Mutex Lock Engine',
                    desc: 'Exclusive leases preventing parallel agent mutate conflicts.',
                    community: { base: '1 Active Lease' },
                    pro: { base: '3 Agent Leases' },
                    enterprise: { base: 'Unlimited Leases' }
                  },
                  {
                    name: 'MCP Transport & Network Protocol',
                    desc: 'Agent connection transport across Cursor, Claude Code, and CLI.',
                    community: { base: 'Local Stdio MCP', vsPro: 'Stdio Only', vsEnterprise: 'Stdio Only' },
                    pro: { base: 'Hosted Remote SSE' },
                    enterprise: { base: 'Dedicated SSE Mesh' }
                  },
                  {
                    name: 'API & Tool Execution Rate Limits',
                    desc: 'Throughput bounds protecting FalkorDB from runaway agent loops.',
                    community: { base: '100 req/min (30 tools)' },
                    pro: { base: '300 req/min (100 tools)' },
                    enterprise: { base: 'Unlimited Rate' }
                  },
                  {
                    name: 'Graph Storage & Node Quota',
                    desc: 'Maximum architectural nodes before write rejection.',
                    community: { base: '500 Nodes Max' },
                    pro: { base: '10,000 Nodes Max' },
                    enterprise: { base: 'Unlimited Nodes' }
                  },
                  {
                    name: 'CI/CD Invariant Blocking Gate',
                    desc: 'Pull request status check verifying commit SHAs against ADRs.',
                    community: { base: 'Manual CLI Check', vsPro: 'Manual Only', vsEnterprise: 'Manual Only' },
                    pro: { base: 'GitHub Action Gate', vsEnterprise: 'Advisory Only' },
                    enterprise: { base: 'Enforced Blocker' }
                  },
                  {
                    name: 'Corporate Domain Provisioning',
                    desc: 'Automatic seat federation via corporate email domains.',
                    community: { base: 'Individual PAT', vsEnterprise: 'No Org SSO' },
                    pro: { base: 'GitHub OAuth', vsEnterprise: 'No Org SSO' },
                    enterprise: { base: 'Corporate Domain' }
                  },
                  {
                    name: 'Audit Trail Retention Depth',
                    desc: 'Execution trail retention for governance and compliance.',
                    community: { base: '10 Entries Depth' },
                    pro: { base: '1,000 Entries Depth' },
                    enterprise: { base: 'Full Compliance Log' }
                  },
                  {
                    name: 'Deployment & Tenancy Topology',
                    desc: 'Hosting topology, tenancy model, and isolation level.',
                    community: { base: 'Local Docker Mesh' },
                    pro: { base: 'Managed Cloud Cluster' },
                    enterprise: { base: 'Dedicated KeySpace' }
                  }
                ].map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">{row.name}</div>
                      <div className="text-[11px] font-sans text-slate-500 mt-0.5 truncate max-w-[190px] sm:max-w-[230px] whitespace-nowrap">{row.desc}</div>
                    </td>
                    <td
                      className={`py-2.5 px-4 whitespace-nowrap transition-colors duration-300 ease-out ${
                        selectedTier === 'community'
                          ? 'bg-slate-200/50 dark:bg-white/[0.06] font-bold text-slate-950 dark:text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {selectedTier === 'community' ? (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <span className="text-[#d9a353] font-mono select-none shrink-0">•</span>
                          <span>{row.community.base}</span>
                        </span>
                      ) : selectedTier === 'pro' ? (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <span>{row.community.base}</span>
                          {row.community.vsPro && (
                            <span className="text-rose-500/90 dark:text-rose-400/90 font-medium text-[11px]">({row.community.vsPro})</span>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <span>{row.community.base}</span>
                          {row.community.vsEnterprise && (
                            <span className="text-rose-500/90 dark:text-rose-400/90 font-medium text-[11px]">({row.community.vsEnterprise})</span>
                          )}
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-2.5 px-4 whitespace-nowrap transition-colors duration-300 ease-out ${
                        selectedTier === 'pro'
                          ? 'bg-slate-200/50 dark:bg-white/[0.06] font-bold text-slate-950 dark:text-white'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {selectedTier === 'pro' ? (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <span className="text-[#d9a353] font-mono select-none shrink-0">•</span>
                          <span>{row.pro.base}</span>
                        </span>
                      ) : selectedTier === 'enterprise' ? (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <span>{row.pro.base}</span>
                          {row.pro.vsEnterprise && (
                            <span className="text-rose-500/90 dark:text-rose-400/90 font-medium text-[11px]">({row.pro.vsEnterprise})</span>
                          )}
                        </span>
                      ) : (
                        <span className="whitespace-nowrap">{row.pro.base}</span>
                      )}
                    </td>
                    <td
                      className={`py-2.5 px-4 pr-8 whitespace-nowrap transition-colors duration-300 ease-out ${
                        selectedTier === 'enterprise'
                          ? 'bg-slate-200/50 dark:bg-white/[0.06] font-bold text-slate-950 dark:text-white'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {selectedTier === 'enterprise' ? (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                          <span className="text-[#d9a353] font-mono select-none shrink-0">•</span>
                          <span>{row.enterprise.base}</span>
                        </span>
                      ) : (
                        <span className="whitespace-nowrap">{row.enterprise.base}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
