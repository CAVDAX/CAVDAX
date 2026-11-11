import React, { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import {
  ArrowLeft,
  Coffee,
  ExternalLink,
  Search,
  Users,
  ArrowUpRight,
  CircleDollarSign,
  CheckCircle2,
  Lock,
  Loader2,
  Sun,
  Moon,
  X
} from 'lucide-react';
import { playClick } from '../utils/soundFx';
import SphereImageGrid from './ui/SphereImageGrid';
import Tooltip from './Tooltip';

// Custom Minimalist Icons for Tiers matching SupportPage.jsx
function CookieIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
      <path d="M8.5 8.5v.01" />
      <path d="M16 15.5v.01" />
      <path d="M12 12v.01" />
      <path d="M11 17v.01" />
      <path d="M7 14v.01" />
    </svg>
  );
}


// ── Bespoke Monochromatic Architectural Hexagonal Nexus (Bedrock Graph Architecture) ──
export function ArchitecturalHexNexus({ align = 'left', className = 'w-7 h-7' }) {
  const isLeft = align === 'left';
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {/* Primary Architectural Hexagon */}
      <path d={isLeft ? "M 6 4 L 14 4 L 18 10 L 14 16 L 6 16 L 2 10 Z" : "M 10 4 L 18 4 L 22 10 L 18 16 L 10 16 L 6 10 Z"} />
      {/* Interlocking Partner Hexagon */}
      <path d={isLeft ? "M 12 11 L 18 11 L 21 15 L 18 20 L 12 20 L 9 15 Z" : "M 6 11 L 12 11 L 15 15 L 12 20 L 6 20 L 3 15 Z"} />
      {/* Core Keystone Nexus Dot */}
      <circle cx={isLeft ? "10" : "14"} cy="10" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ShinyGemIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h12l4 6-10 13L2 9Z" />
      <path d="M11 3 8 9l4 13 4-13-3-6" />
      <path d="M2 9h20" />
    </svg>
  );
}

// Bespoke Monochromatic Magnifying Glass with Optical Highlight & Micro-Kinetics
function MonochromaticMagnifier({ isFocused, isHovered, className = 'w-3.5 h-3.5' }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isFocused
          ? 'text-slate-950 dark:text-white scale-110 rotate-12'
          : isHovered
          ? 'text-slate-700 dark:text-slate-200 scale-105'
          : 'text-slate-400 dark:text-slate-500'
      }`}
      aria-hidden="true"
    >
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M12.5 12.5 L17 17" />
      {/* Subtle optical reflection tick mark */}
      <path
        d="M6.5 6.5 A 2.5 2.5 0 0 1 9 5"
        strokeWidth="1.2"
        className={`transition-opacity duration-300 ${isFocused || isHovered ? 'opacity-100' : 'opacity-40'}`}
      />
    </svg>
  );
}

/**
 * Continuous Scroll-Drawn Ribbon Spline Component (Suneet-Ribbon-Scroll standard)
 * Weaves continuously from top header down through all sponsor tiers to the page floor.
 */
function ContinuousRibbon({ targetRef }) {
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ['start start', 'end end']
  });

  const ribbonSpring = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    restDelta: 0.001
  });

  // Alternating Weave Spline: Hero -> Core -> 2 Cups -> Cookie -> Page Floor
  const splinePath = 'M 600,0 C 980,180 1120,440 920,680 C 720,920 180,840 280,1120 C 380,1400 1020,1350 900,1650 C 780,1950 180,1900 320,2180 C 460,2380 820,2420 600,2500';

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-visible hidden md:block" aria-hidden="true">
      <svg
        className="w-full h-full"
        viewBox="0 0 1200 2500"
        fill="none"
        preserveAspectRatio="none"
      >
        {/* Layer 1: Ambient Diffuse Under-Glow Stroke */}
        <motion.path
          d={splinePath}
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          className="text-slate-300/40 dark:text-white/10 blur-md"
          style={{ pathLength: ribbonSpring }}
        />
        {/* Layer 2: Crisp Monochromatic Hairline Spline */}
        <motion.path
          d={splinePath}
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-slate-400/70 dark:text-slate-400/40"
          style={{ pathLength: ribbonSpring }}
        />
      </svg>
    </div>
  );
}

const FILTER_TABS = [
  { id: 'all', label: 'All Backers', icon: ArchitecturalHexNexus, color: 'text-slate-900 dark:text-white' },
  { id: 'core', label: 'Core Patrons', icon: ShinyGemIcon, color: 'text-slate-900 dark:text-white' },
  { id: 'two_cups', label: '2 Cups', icon: Coffee, color: 'text-slate-700 dark:text-slate-200' },
  { id: 'cookie', label: 'Cookie', icon: CookieIcon, color: 'text-slate-600 dark:text-slate-400' },
];

/**
 * Dedicated Sponsors & Backers Showcase Page
 *
 * Strict Compliance with docs/UI_DESIGN_SYSTEM.md:
 * - §1.1: Strict Ban on all emojis
 * - §1.2: Strict Ban on Gemini Sparkles
 * - §1.4: Monochromatic Precision Dark Theme (Obsidian, zero navy/cyan slop)
 * - §14: Continuous Super-Ellipse Curvature (Gabriel Lamé n=4.4)
 * - §58: Sliding Pill Tracker
 * - §90: Universal Modal Portal Isolation
 * - §91: Anti-Orphan Heading Typography
 */
export default function SponsorsPage({ onNavigateToSupport, onPrefetchTab, user, isDarkTheme = true, onToggleTheme }) {
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearchHovered, setIsSearchHovered] = useState(false);
  const searchInputRef = useRef(null);

  // Global '/' hotkey to focus search bar, 'Escape' to blur
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleClearSearch = () => {
    playClick();
    setSearchQuery('');
    searchInputRef.current?.focus();
  };
  const [themeRotation, setThemeRotation] = useState(0);
  const prevDarkThemeRef = useRef(isDarkTheme);
  useEffect(() => {
    if (prevDarkThemeRef.current !== isDarkTheme) {
      setThemeRotation((prev) => prev + 360);
      prevDarkThemeRef.current = isDarkTheme;
    }
  }, [isDarkTheme]);

  const handleToggleTheme = () => {
    playClick();
    if (onToggleTheme) onToggleTheme();
  };
  
  const containerRef = useRef(null);
  const tabRefs = useRef({});
  const [pillPos, setPillPos] = useState({ x: 0, width: 0, ready: false });

  // Speculative hover-prefetch for support route (§100)
  const handlePrefetchSupport = useCallback(() => {
    if (onPrefetchTab) {
      onPrefetchTab('support');
    }
  }, [onPrefetchTab]);

  // Fetch verified directory from server
  const loadSponsors = useCallback(async (isMounted = true) => {
    try {
      const res = await fetch('/api/sponsors');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (isMounted && data.success && Array.isArray(data.sponsors)) {
        setSponsors(data.sponsors);
      }
    } catch (err) {
      console.warn('[SponsorsPage] Fallback to demo sponsors on fetch failure:', err.message);
      if (isMounted) {
        setSponsors([
          {
            id: 'demo-1',
            name: 'Suneet Chugh',
            backer_name: 'Suneet Chugh',
            tier_id: 3,
            highlighted: true,
            github_handle: 'suneetchugh-dev',
            avatar_url: 'https://avatars.githubusercontent.com/u/76564569?v=4',
            quote: 'Supporting open-source causal engineering',
            visibility: 'public'
          },
          {
            id: 'demo-2',
            name: 'Causal Inference Working Group',
            backer_name: 'Causal Inference Working Group',
            tier_id: 2,
            quote: 'Accelerating zero-regression causal validation',
            visibility: 'public'
          },
          {
            id: 'demo-3',
            name: 'Developer Tooling Circle',
            backer_name: 'Developer Tooling Circle',
            tier_id: 1,
            quote: 'Proud to back independent developer infrastructure',
            visibility: 'public'
          }
        ]);
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    loadSponsors(isMounted);

    // Real-time synchronization when a sponsor is registered across sessions
    const handleSponsorRegistered = () => {
      if (isMounted) loadSponsors(isMounted);
    };

    window.addEventListener('cavdax:sponsor-registered', handleSponsorRegistered);
    return () => {
      isMounted = false;
      window.removeEventListener('cavdax:sponsor-registered', handleSponsorRegistered);
    };
  }, [loadSponsors]);

  // Update sliding pill indicator position
  useLayoutEffect(() => {
    const el = tabRefs.current[activeFilter];
    if (el) {
      setPillPos({
        x: el.offsetLeft,
        width: el.offsetWidth,
        ready: true,
      });
    }
  }, [activeFilter, loading]);

  // Format Backers for 3D Sphere Galaxy: Unique Backers strictly ONCE, sized proportionally by Tier
  const sphereImages = useMemo(() => {
    const uniqueBackers = sponsors.filter((s) => s.visibility !== 'private');
    if (uniqueBackers.length === 0) return [];

    const formatted = uniqueBackers.map((s) => {
      const isCore = s.tier_id === 3 || s.tier_id === '3' || s.highlighted;
      const isTwoCups = s.tier_id === 2 || s.tier_id === '2';
      const scaleMultiplier = isCore ? 1.6 : isTwoCups ? 1.15 : 0.85;

      const rawAvatar = s.avatar_url || s.avatarUrl || s.avatar;
      const backerName = s.name || s.backer_name || (s.github_handle ? `@${s.github_handle}` : 'Backer');

      return {
        id: String(s.id || s.github_handle || Math.random()),
        src: rawAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(backerName || s.id)}`,
        alt: backerName,
        title: backerName,
        subtitle: isCore ? 'Core Patron ($10)' : isTwoCups ? '2 Cups ($4)' : 'Cookie ($2)',
        description: s.backer_message || s.quote || (s.github_handle ? `@${s.github_handle} supporting open-source causal engineering` : 'Verified community supporter'),
        link: s.github_handle ? `https://github.com/${encodeURIComponent(String(s.github_handle).replace(/^@/, ''))}` : null,
        tier_id: Number(s.tier_id) || (isCore ? 3 : isTwoCups ? 2 : 1),
        scaleMultiplier
      };
    });

    // If fewer than 14 nodes, supplement with subtle celestial constellation waypoint nodes
    // to preserve 3D Fibonacci sphere distribution without duplicating people
    if (formatted.length < 14) {
      const placeholdersNeeded = 14 - formatted.length;
      const celestialWaypoints = Array.from({ length: placeholdersNeeded }, (_, i) => ({
        id: `celestial-node-${i + 1}`,
        isWaypoint: true,
        title: `CAVDAX Celestial Node #${i + 1}`,
        subtitle: 'Causal Governance Validator',
        scaleMultiplier: 0.4
      }));
      return [...formatted, ...celestialWaypoints];
    }

    return formatted;
  }, [sponsors]);

  const coreBackers = useMemo(() => sponsors.filter(s => (s.tier_id === 3 || s.tier_id === '3' || s.highlighted) && s.visibility !== 'private'), [sponsors]);
  const twoCupsBackers = useMemo(() => sponsors.filter(s => (s.tier_id === 2 || s.tier_id === '2') && s.visibility !== 'private'), [sponsors]);
  const cookieBackers = useMemo(() => sponsors.filter(s => (s.tier_id === 1 || s.tier_id === '1') && s.visibility !== 'private'), [sponsors]);

  // Search filtering
  const filteredSponsors = useMemo(() => {
    let list = sponsors.filter(s => s.visibility !== 'private');
    if (activeFilter === 'core') list = list.filter(s => s.tier_id === 3 || s.tier_id === '3' || s.highlighted);
    if (activeFilter === 'two_cups') list = list.filter(s => s.tier_id === 2 || s.tier_id === '2');
    if (activeFilter === 'cookie') list = list.filter(s => s.tier_id === 1 || s.tier_id === '1');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.backer_name && s.backer_name.toLowerCase().includes(q)) ||
        (s.github_handle && s.github_handle.toLowerCase().includes(q)) ||
        (s.backer_message && s.backer_message.toLowerCase().includes(q)) ||
        (s.quote && s.quote.toLowerCase().includes(q))
      );
    }
    return list;
  }, [sponsors, activeFilter, searchQuery]);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-slate-50 dark:bg-[#07090D] text-slate-900 dark:text-slate-100 font-sans selection:bg-slate-950/20 dark:selection:bg-white/20 selection:text-slate-950 dark:selection:text-white">
      {/* Background Ambience & Clean Monochromatic Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-slate-200/40 via-transparent to-transparent dark:from-white/[0.03] dark:via-transparent dark:to-transparent blur-3xl pointer-events-none" />

      {/* Suneet Continuous Scroll Ribbon Spine (Full Length) */}
      <ContinuousRibbon targetRef={containerRef} />

      {/* Main Content Substrate */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pt-4 pb-28">
        
        {/* Dedicated Top Header */}
        <header className="sticky top-4 z-40 mb-8 flex items-center justify-between p-2.5 sm:px-4 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 backdrop-blur-xl shadow-xs">
          <button
            type="button"
            onClick={() => {
              playClick();
              if (onNavigateToSupport) onNavigateToSupport();
            }}
            onMouseEnter={handlePrefetchSupport}
            onFocus={handlePrefetchSupport}
            onTouchStart={handlePrefetchSupport}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-medium text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back to Support</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Theme Toggle Button — Exact Match to Header.jsx */}
            <Tooltip content={isDarkTheme ? "Switch to Light" : "Switch to Dark"} position="bottom">
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

            <button
              type="button"
              onClick={() => {
                playClick();
                if (onNavigateToSupport) onNavigateToSupport();
              }}
              onMouseEnter={handlePrefetchSupport}
              onFocus={handlePrefetchSupport}
              onTouchStart={handlePrefetchSupport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 text-xs font-mono font-semibold transition-all cursor-pointer shadow-xs"
            >
              <span>Become a Backer</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
            </button>
          </div>
        </header>

        {/* Hero Section: Clean Architectural Typography with Symmetrical Monochromatic Hexagonal Nexus Badges */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-slate-950 dark:text-white mb-2 flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap">
            <ArchitecturalHexNexus align="left" className="w-7 h-7 sm:w-8 sm:h-8 text-slate-900 dark:text-white shrink-0 transition-transform duration-300 hover:scale-105" />
            <span>Community Backers</span>
            <ArchitecturalHexNexus align="right" className="w-7 h-7 sm:w-8 sm:h-8 text-slate-900 dark:text-white shrink-0 transition-transform duration-300 hover:scale-105" />
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto font-sans leading-relaxed text-balance">
            Independent engineers and organizations backing open-source causal AI graph governance.
          </p>

          {/* Interactive 3D Supporter Galaxy Sphere */}
          {sphereImages.length > 0 && (
            <div className="my-6 flex flex-col items-center justify-center">
              <SphereImageGrid
                images={sphereImages}
                containerSize={320}
                sphereRadius={135}
                autoRotate={true}
                autoRotateSpeed={0.2}
                baseImageScale={0.16}
                className="mx-auto"
              />
            </div>
          )}
        </div>

        {/* Directory Controls Bar: Framer Motion Sliding Pill Tracker (§1.8 & §58) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-10">
          <div className="relative flex items-center gap-1 p-1 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 backdrop-blur-xl overflow-x-auto" style={{ borderRadius: '18px' }}>
            {/* Sliding Pill Indicator (§1.8) */}
            {pillPos.ready && (
              <motion.div
                className="absolute top-1 bottom-1 rounded-xl bg-slate-900 dark:bg-white shadow-xs pointer-events-none"
                initial={false}
                animate={{
                  x: pillPos.x,
                  width: pillPos.width,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 34,
                }}
              />
            )}

            {FILTER_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeFilter === tab.id;
              const count =
                tab.id === 'all'
                  ? sponsors.length
                  : tab.id === 'core'
                  ? coreBackers.length
                  : tab.id === 'two_cups'
                  ? twoCupsBackers.length
                  : cookieBackers.length;

              return (
                <button
                  key={tab.id}
                  ref={(el) => (tabRefs.current[tab.id] = el)}
                  onClick={() => {
                    playClick();
                    setActiveFilter(tab.id);
                  }}
                  className={`relative z-10 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'text-white dark:text-slate-950 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-current' : tab.color}`} align="left" />}
                  <span>{tab.label}</span>
                  <span className="text-[10px] font-mono opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search Input with Monochromatic Magnifier & Micro-Kinetics */}
          <div
            className={`relative w-full sm:w-72 flex items-center transition-all duration-300 rounded-xl bg-white/80 dark:bg-white/[0.03] border backdrop-blur-xl group ${
              isSearchFocused
                ? 'border-slate-900/90 dark:border-white/50 ring-2 ring-slate-950/5 dark:ring-white/10 shadow-sm'
                : 'border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
            }`}
            style={{ borderRadius: '16px' }}
            onMouseEnter={() => setIsSearchHovered(true)}
            onMouseLeave={() => setIsSearchHovered(false)}
          >
            <div
              onClick={() => {
                playClick();
                searchInputRef.current?.focus();
              }}
              className="pl-3 pr-1.5 flex items-center justify-center cursor-pointer select-none"
              title="Click to search backers"
            >
              <MonochromaticMagnifier isFocused={isSearchFocused} isHovered={isSearchHovered} />
            </div>

            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search by name or quote..."
              className="w-full py-2 pr-8 text-xs bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-sans focus:outline-none"
              aria-label="Search verified backers"
            />

            {/* Clear Button (Visible when query is non-empty) */}
            {searchQuery ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            ) : (
              /* Hotkey Indicator Keycap (Visible when idle) */
              <div className="absolute right-2.5 pointer-events-none select-none">
                <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-mono text-slate-400 dark:text-slate-500 border border-slate-200/80 dark:border-white/10 rounded-md bg-slate-100/70 dark:bg-white/[0.04]">
                  /
                </kbd>
              </div>
            )}
          </div>
        </div>

        {/* Backers Grid Section */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block animate-spin text-slate-900 dark:text-white mb-3">
              <Loader2 className="w-6 h-6" />
            </div>
            <p className="text-xs font-mono text-slate-500">Loading verified backers directory...</p>
          </div>
        ) : filteredSponsors.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-white/40 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/10 backdrop-blur-xl p-8" style={{ borderRadius: '24px' }}>
            <Users className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Backers Match Criteria</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery ? `No sponsors found matching "${searchQuery}".` : 'No sponsors currently listed in this category.'}
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* 1. Core Patrons Showcase ($10 Tier) */}
            {(activeFilter === 'all' || activeFilter === 'core') && coreBackers.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.08] text-slate-800 dark:text-white border border-slate-200 dark:border-white/15">
                    <ShinyGemIcon className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Core Patrons
                  </h2>
                  <span className="text-xs font-mono text-slate-400">
                    ($10 Tier)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {coreBackers.map((backer) => (
                    <div
                      key={backer.id}
                      className="group relative p-5 rounded-2xl bg-white/80 dark:bg-white/[0.03] border border-slate-300/80 dark:border-white/10 backdrop-blur-2xl transition-all duration-300 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5 hover:border-slate-400 dark:hover:border-white/25"
                      style={{
                        borderRadius: '24px', // Continuous Super-Ellipse Curvature
                      }}
                    >
                      <div className="flex items-start gap-4">
                        {backer.avatar_url || backer.avatarUrl ? (
                          <img
                            src={backer.avatar_url || backer.avatarUrl}
                            alt={backer.name || backer.backer_name || 'Core Patron'}
                            className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-400/30 dark:ring-white/20 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white flex items-center justify-center font-mono font-bold text-base shrink-0 ring-1 ring-slate-300 dark:ring-white/15">
                            {(backer.name || backer.backer_name || backer.github_handle || 'C').charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {backer.name || backer.backer_name || (backer.github_handle ? `@${backer.github_handle}` : 'Backer')}
                            </h3>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/15 shrink-0">
                              <ShinyGemIcon className="w-2.5 h-2.5" />
                              Core Patron
                            </span>
                          </div>

                          {backer.github_handle && (
                            <a
                              href={`https://github.com/${encodeURIComponent(String(backer.github_handle).replace(/^@/, ''))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-slate-950 dark:hover:text-white transition-colors mt-0.5"
                            >
                              <span>@{String(backer.github_handle).replace(/^@/, '')}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                            </a>
                          )}

                          {(backer.backer_message || backer.quote) && (
                            <p className="mt-2.5 text-xs text-slate-600 dark:text-slate-300 italic font-sans border-l-2 border-slate-300 dark:border-white/30 pl-2.5 py-0.5">
                              "{backer.backer_message || backer.quote}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 2. 2 Cups of Coffee Backers ($4 Tier - Popular) */}
            {(activeFilter === 'all' || activeFilter === 'two_cups') && twoCupsBackers.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    2 Cups of Coffee Backers
                  </h2>
                  <span className="text-xs font-mono text-slate-400">
                    ($4 Tier)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {twoCupsBackers.map((backer) => (
                    <div
                      key={backer.id}
                      className="p-4 rounded-2xl bg-white/60 dark:bg-white/[0.025] border border-slate-200/80 dark:border-white/10 backdrop-blur-xl transition-all duration-200 hover:border-slate-300 dark:hover:border-white/20"
                      style={{
                        borderRadius: '20px', // Super-Ellipse
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {backer.avatar_url || backer.avatarUrl ? (
                          <img
                            src={backer.avatar_url || backer.avatarUrl}
                            alt={backer.name || backer.backer_name || '2 Cups Backer'}
                            className="w-9 h-9 rounded-lg object-cover ring-1 ring-slate-300/40 dark:ring-white/15 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                            {(backer.name || backer.backer_name || backer.github_handle || '2C').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-medium text-slate-900 dark:text-white truncate">
                            {backer.name || backer.backer_name || (backer.github_handle ? `@${backer.github_handle}` : 'Backer')}
                          </h4>
                          {backer.github_handle ? (
                            <a
                              href={`https://github.com/${encodeURIComponent(String(backer.github_handle).replace(/^@/, ''))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-mono text-slate-500 hover:text-slate-900 dark:hover:text-white truncate block"
                            >
                              @{String(backer.github_handle).replace(/^@/, '')}
                            </a>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400">
                              Backer
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 3. Cookie Backers ($2 Tier) */}
            {(activeFilter === 'all' || activeFilter === 'cookie') && cookieBackers.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                    <CookieIcon className="w-4 h-4" />
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Cookie Backers
                  </h2>
                  <span className="text-xs font-mono text-slate-400">
                    ($2 Tier)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cookieBackers.map((backer) => (
                    <div
                      key={backer.id}
                      className="p-3 rounded-xl bg-white/50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/10 backdrop-blur-lg flex items-center gap-2.5 transition-all hover:border-slate-300 dark:hover:border-white/20"
                      style={{
                        borderRadius: '16px', // Super-Ellipse
                      }}
                    >
                      {backer.avatar_url || backer.avatarUrl ? (
                        <img
                          src={backer.avatar_url || backer.avatarUrl}
                          alt={backer.name || backer.backer_name || 'Cookie Backer'}
                          className="w-7 h-7 rounded-md object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                          {(backer.name || backer.backer_name || backer.github_handle || 'B').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate block">
                          {backer.name || backer.backer_name || (backer.github_handle ? `@${backer.github_handle}` : 'Backer')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
