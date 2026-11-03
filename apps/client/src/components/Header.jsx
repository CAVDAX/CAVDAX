import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  Sun, Moon,
  Layers, SlidersHorizontal, Cable, Play, Users, Settings, ClipboardList, User,
  Menu, X, Heart, Terminal, Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CavdaxBrandLoader from './CavdaxBrandLoader';
import Tooltip from './Tooltip';
import { playClick } from '../utils/soundFx';

/**
 * Header — Monochromatic Portfolio Morphing Navbar.
 *
 * Adheres strictly to CAVDAX & CAVDAX design standards:
 * - Line SVG icons for all navigation items.
 * - Framer Motion shared-layout sliding pill for active tab state on desktop.
 * - Compact, mobile-friendly navigation drawer on viewports < md (eliminates clutter & overflow).
 * - Unboxed, completely free brand mark (Strictly NO text wordmark in navbar).
 * - Animates on hover ONLY, static by default.
 * - Perfectly centered navigation tabs (flex-1 / flex-shrink-0 / flex-1 3-zone geometry).
 * - 100% consistent across all tabs with zero layout jitter.
 * - Monochromatic light/dark theme inversion with zero cyan.
 * - Dedicated PreferencesModal trigger with smooth gear spin.
 */

const NAV_TABS = [
  { id: "landing", label: "Overview", icon: Layers },
  { id: "console", label: "Console", icon: SlidersHorizontal },
  { id: "mcp", label: "MCP", icon: Cable },
  { id: "audit", label: "Audit", icon: ClipboardList },
  { id: "project", label: "Walkthrough", icon: Play },
  { id: "team", label: "Team", icon: Users },
];

const ALL_NAV_ITEMS = [
  ...NAV_TABS,
  { id: "profile", label: "Profile", icon: User },
  { id: "support", label: "Sponsor", icon: Heart },
];

export default function Header({
  status,
  activeTab = 'landing',
  landingTarget = 'overview',
  onSelectTab,
  onOpenPreferences,
  onOpenTour,
  isDarkTheme = true,
  onToggleTheme,
  tier = 'free',
  user = null,
}) {
  const [scrollY, setScrollY] = useState(0);
  const [isRadarSection, setIsRadarSection] = useState(false);
  const [isScrolled, setIsScrolled] = useState(() => (typeof window !== 'undefined' ? window.scrollY > 20 : false));
  const [gearRotation, setGearRotation] = useState(0);
  const [themeRotation, setThemeRotation] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Track scroll morphing state
  const prevScrolledRef = useRef(false);

  // Industry-Standard Container-Relative Horizontal Slider Tracking (Immune to scroll jumps & Y-flying)
  const tabRefs = useRef({});
  const [pillPosition, setPillPosition] = useState({ x: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    const updatePill = () => {
      const activeEl = tabRefs.current[activeTab];
      if (activeEl) {
        setPillPosition({
          x: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          ready: true,
          visible: true,
        });
      } else {
        setPillPosition((prev) => ({ ...prev, visible: false }));
      }
    };
    updatePill();
    const rafId = requestAnimationFrame(updatePill);
    window.addEventListener('resize', updatePill);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updatePill);
    };
  }, [activeTab, isScrolled]);

  useEffect(() => {
    const handleScroll = () => {
      const y = window.scrollY;
      setScrollY(y);
      setIsScrolled(y > 20);

            // Hide navbar completely when user is inside the continuous radar theater section or causal solution theater
      if (activeTab === 'landing') {
        const radarEl = document.getElementById('radar-section');
        const causalEl = document.getElementById('causal-loop-section');
        const enclaveEl = document.getElementById('enclave-hub-section');
        const faqEl = document.getElementById('faq-section');
        const ctaEl = document.getElementById('cta-section');
        let inTheater = false;

        // 1. Causal Enclave Hub Theater:
        // Keeps navbar completely hidden while exploring the Causal Interception Enclave.
        if (enclaveEl) {
          const eRect = enclaveEl.getBoundingClientRect();
          if (eRect.top <= 120 && eRect.bottom >= 80) {
            inTheater = true;
          }
        }

        // 2. Causal Solution Scroller Theater:
        // Keeps navbar hidden from entry into #causal-loop-section until #faq-section actually arrives at top of viewport.
        // Guarantees navbar never appears early over Card 4's punchline ("Deterministic causal feedback...").
        if (causalEl && !inTheater) {
          const cRect = causalEl.getBoundingClientRect();
          const fRect = faqEl ? faqEl.getBoundingClientRect() : null;
          if (cRect.top <= 120 && (!fRect || fRect.top > 80)) {
            inTheater = true;
          }
        }

        // 2. Continuous Provenance Radar Theater:
        // Hides navbar strictly while inside radar and restores it immediately upon entering #cta-section or footer.
        if (radarEl) {
          const rRect = radarEl.getBoundingClientRect();
          const ctaRect = ctaEl ? ctaEl.getBoundingClientRect() : null;
          if (rRect.top <= window.innerHeight * 0.35 && (!ctaRect || ctaRect.top > window.innerHeight * 0.35)) {
            inTheater = true;
          }
        }

        setIsRadarSection(inTheater);
      } else {
        setIsRadarSection(false);
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  // Suppress the navbar exclusively when within the Wordmark Intro Viewport (#brand-intro, before reaching #hero-section)
  const isWordmarkSection = activeTab === 'landing' && scrollY < (typeof window !== 'undefined' ? ((document.getElementById('hero-section')?.offsetTop || window.innerHeight) - 80) : 600);
  const isHeaderHidden = isWordmarkSection || isRadarSection;

  useEffect(() => {
    prevScrolledRef.current = isScrolled;
  }, [isScrolled]);

  const handlePreferencesClick = () => {
    playClick();
    setGearRotation(prev => prev + 180);
    if (onOpenPreferences) onOpenPreferences();
  };

  const handleToggleTheme = () => {
    playClick();
    setThemeRotation(prev => prev + 360);
    if (onToggleTheme) onToggleTheme();
  };

  const currentTabObj = ALL_NAV_ITEMS.find((t) => t.id === activeTab) || {
    id: activeTab,
    label: activeTab === 'devteam' ? 'Dev Core' : activeTab === 'dev' ? 'Dev Console' : activeTab,
    icon: activeTab === 'devteam' || activeTab === 'dev' ? Terminal : Layers,
  };
  const ActiveIcon = currentTabObj.icon;

  return (
    <>
      <motion.header
        layoutRoot
        className={`portfolio-header ${activeTab === 'profile' ? 'profile-tab-header !border-b-transparent border-b-transparent' : ''} ${isScrolled ? 'scrolled' : ''} ${isHeaderHidden ? 'header-hidden' : ''}`}
      >
        {/* 1. Left: Brand Logo (Unboxed, completely free, animate-on-hover only) */}
        <div
          style={{
            flexGrow: isScrolled ? 0 : 1,
            flexShrink: 0,
            flexBasis: isScrolled ? 'auto' : 0,
            transition: 'flex-grow 0.4s cubic-bezier(0.16, 1, 0.3, 1), flex-basis 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          className="flex items-center justify-start min-w-0"
        >
          <div
            className="flex items-center cursor-pointer flex-shrink-0 select-none group text-slate-900 dark:text-white hover:text-black dark:hover:text-slate-100 transition-colors"
            onClick={() => {
              playClick();
              if (onSelectTab) onSelectTab('landing', { target: 'wordmark' });
            }}
            title="CAVDAX Home"
          >
            <div className="h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center flex-shrink-0">
              <CavdaxBrandLoader size={34} strokeWidth={7.4} animateOnHover={true} />
            </div>
          </div>
        </div>

        {/* Left-to-Center Vertical Divider Line (Desktop only) */}
        <div className={`hidden md:block shrink-0 h-4 w-[1px] bg-slate-400/80 dark:bg-white/35 mx-2.5 sm:mx-3.5 transition-opacity duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />

        {/* 2a. Center: Desktop Nav Links with Sliding Pill (Hidden on Mobile < md) */}
        <div className="hidden md:flex items-center justify-center flex-shrink-0">
          <nav
            className={`relative flex items-center transition-all duration-300 ${
              isScrolled
                ? "p-1 rounded-full bg-transparent border border-transparent gap-1 sm:gap-1.5"
                : "p-1 rounded-full bg-slate-200/50 dark:bg-white/[0.06] border border-slate-300/80 dark:border-white/10 backdrop-blur-md shadow-2xs gap-1 sm:gap-1.5"
            }`}
          >
            {/* Sliding Pill */}
            {pillPosition.ready && pillPosition.visible && (
              <motion.div
                className="absolute top-1 bottom-1 rounded-full bg-slate-950 dark:bg-white shadow-xs pointer-events-none"
                initial={false}
                animate={{
                  x: pillPosition.x,
                  width: pillPosition.width,
                  opacity: 1,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 34,
                }}
              />
            )}

            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    if (el) tabRefs.current[tab.id] = el;
                  }}
                  onClick={() => {
                    playClick();
                    if (onSelectTab) onSelectTab(tab.id, { target: tab.id === "landing" ? "overview" : "top" });
                  }}
                  className={`relative px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-mono transition-colors duration-200 tactile-btn flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 select-none portfolio-nav-link ${
                    isActive
                      ? "active-pill text-white dark:text-slate-950 font-bold z-10"
                      : "text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-white/10"
                  }`}
                >
                  <Icon size={13} className="shrink-0 relative z-10" />
                  <span className="relative z-10 whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Center-to-Right Spacer (Mobile only) */}
        <div className="flex md:hidden flex-1" />

        {/* Center-to-Right Vertical Divider Line (Desktop only) */}
        <div className={`hidden md:block shrink-0 h-4 w-[1px] bg-slate-400/80 dark:bg-white/35 mx-2.5 sm:mx-3.5 transition-opacity duration-300 ${isScrolled ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />

        {/* 3. Right: Profile, Theme Toggle, Preferences & Mobile Menu */}
        <div
          style={{
            flexGrow: isScrolled ? 0 : 1,
            flexShrink: 0,
            flexBasis: isScrolled ? 'auto' : 0,
            transition: 'flex-grow 0.4s cubic-bezier(0.16, 1, 0.3, 1), flex-basis 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          className="flex items-center justify-end space-x-1.5 sm:space-x-2.5 min-w-0"
        >
          {/* Profile Button with Uniform 1px Outline & Distinct Tier Dot */}
          <Tooltip content={user?.login ? `@${user.login} (${(tier || 'free').toUpperCase()} Tier)` : `Profile & Account (${(tier || 'free').toUpperCase()} Tier)`} position="bottom">
            <button
              onClick={() => {
                playClick();
                if (onSelectTab) onSelectTab('profile');
              }}
              className={`relative w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 focus:outline-none shadow-2xs backdrop-blur-md group tactile-btn p-[1px] shrink-0 ${
                activeTab === 'profile'
                  ? (tier === 'pro'
                      ? 'border border-amber-400 bg-amber-400 text-slate-950 shadow-xs'
                      : tier === 'enterprise'
                      ? 'border border-purple-600 dark:border-purple-500 bg-[#150a26] dark:bg-[#0f051d] text-purple-200 shadow-xs'
                      : 'border border-slate-950 dark:border-white bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-xs')
                  : (tier === 'pro'
                      ? 'border border-amber-400/90 bg-amber-400/10 text-amber-600 dark:text-amber-400 hover:bg-amber-400/20'
                      : tier === 'enterprise'
                      ? 'border border-purple-600/90 bg-purple-950/20 text-purple-600 dark:text-purple-300 hover:border-purple-500 hover:bg-purple-950/30'
                      : 'border border-slate-200/80 dark:border-white/20 bg-slate-100/80 dark:bg-white/[0.08] hover:bg-slate-200/80 dark:hover:bg-white/15 text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white')
              }`}
              aria-label="User Profile and Account"
            >
              {user?.avatar_url || user?.avatarUrl || user?.avatar ? (
                <img
                  src={user?.avatar_url || user?.avatarUrl || user?.avatar}
                  alt={user.login || user.name || 'User'}
                  className="w-full h-full rounded-full object-cover relative z-10"
                />
              ) : (
                <div className="w-full h-full rounded-full flex items-center justify-center relative z-10">
                  <User className="w-3.5 h-3.5 text-current" />
                </div>
              )}

              {tier === 'pro' && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white dark:ring-slate-950 z-20 pointer-events-none" />
              )}
              {tier === 'enterprise' && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-purple-600 dark:bg-purple-500 ring-2 ring-white dark:ring-slate-950 z-20 pointer-events-none" />
              )}
            </button>
          </Tooltip>

          {/* Theme Toggle Button — Flawless 360 rotation in both fixed & floating navbars */}
          <Tooltip content={isDarkTheme ? 'Switch to Light' : 'Switch to Dark'} position="bottom">
            <button
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

          {/* System Preferences Settings Button — Smooth hover rotation & click spin */}
          <Tooltip content="System Preferences" position="bottom">
            <button
              onClick={handlePreferencesClick}
              className="hidden md:flex w-8 h-8 rounded-full items-center justify-center cursor-pointer border border-slate-200/80 dark:border-white/20 bg-slate-100/80 dark:bg-white/[0.08] hover:bg-slate-200/80 dark:hover:bg-white/15 text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-all shadow-2xs backdrop-blur-md focus:outline-none group shrink-0"
              aria-label="Open System Preferences"
            >
              <motion.div
                animate={{ rotate: gearRotation }}
                whileHover={{ rotate: gearRotation + 45 }}
                transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
                className="flex items-center justify-center pointer-events-none"
              >
                <Settings className="w-3.5 h-3.5 text-current settings-icon" />
              </motion.div>
            </button>
          </Tooltip>

          {/* Mobile Menu Hamburger Trigger (< md) */}
          <button
            onClick={() => {
              playClick();
              setIsMobileMenuOpen((prev) => !prev);
            }}
            className="flex md:hidden w-8 h-8 rounded-full items-center justify-center cursor-pointer border border-slate-200/80 dark:border-white/20 bg-slate-100/80 dark:bg-white/[0.08] hover:bg-slate-200/80 dark:hover:bg-white/15 text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-all shadow-2xs active:scale-95 shrink-0"
            aria-label="Toggle navigation drawer"
          >
            {isMobileMenuOpen ? <X size={15} /> : <Menu size={15} />}
          </button>
        </div>
      </motion.header>

      {/* Mobile Slide-Over Navigation Drawer Sheet */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 md:hidden bg-slate-950/70 backdrop-blur-md flex flex-col justify-end p-3 pb-6"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="w-full max-w-md mx-auto bg-white/95 dark:bg-[#0c0d12]/95 border border-slate-300 dark:border-white/15 rounded-3xl p-4 shadow-2xl backdrop-blur-2xl flex flex-col gap-3 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-white/10 px-1">
                <div className="flex items-center gap-2">
                  <CavdaxBrandLoader size={20} strokeWidth={6} />
                  <span className="font-mono font-bold text-xs tracking-wider text-slate-900 dark:text-white">
                    CAVDAX NAVIGATION
                  </span>
                </div>
                <button
                  onClick={() => {
                    playClick();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  aria-label="Close Navigation"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Grid of Navigation Tabs */}
              <div className="grid grid-cols-2 gap-2 py-1">
                {ALL_NAV_ITEMS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        playClick();
                        setIsMobileMenuOpen(false);
                        if (onSelectTab) onSelectTab(tab.id, { target: tab.id === 'landing' ? 'overview' : 'top' });
                      }}
                      className={`p-3 rounded-2xl border text-xs font-mono flex items-center gap-2.5 transition-all cursor-pointer active:scale-95 ${
                        isActive
                          ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950 font-bold shadow-sm'
                          : 'border-slate-200 dark:border-white/5 bg-slate-100/60 dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-white/10'
                      }`}
                    >
                      <Icon size={15} className="shrink-0 text-current" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Drawer Utility Actions */}
              <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handlePreferencesClick();
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Settings size={13} />
                  <span>Preferences</span>
                </button>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                  <span>Tier:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{tier}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
