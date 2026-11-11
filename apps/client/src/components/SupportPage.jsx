import React, { useState, useEffect, useCallback, useRef, useLayoutEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, CheckCircle2, Heart, HandHeart, Loader2, ExternalLink, AlertTriangle, Users, Lock, LayoutGrid, PieChart, BarChartHorizontal, ArrowUpRight, Eye, EyeOff, SlidersHorizontal, ArrowDownLeft } from 'lucide-react';
import { playClick } from '../utils/soundFx';
import { isUserAuthorized, getActiveDevSession } from '../services/devAuth';
import BackerConsentModal from './BackerConsentModal';
import ConfirmationDialog from './ConfirmationDialog';
import AnimatedAvatarGroup from './ui/AnimatedAvatarGroup';
import ShimmerImage from './ui/ShimmerImage';

/**
 * SupportPage.jsx — Razorpay-powered Community Sponsor Portal
 *
 * Design System Compliance (UI_DESIGN_SYSTEM.md):
 * - Zero emojis, zero eyebrow pills, zero bracketed tags
 * - Lucide icons + bespoke monoline SVG glyphs, font-mono diagnostics identifiers
 * - Constant 1px border — opacity lifts on hover, never border-2
 * - Popular card elevated only on xl: (1280px+) to prevent laptop overflow
 * - Fluid wave fill buttons (§11H persistent interaction fills)
 * - Container-relative sliding pill bar using Framer Motion (§1.8)
 * - No multi-line centered body prose (§13)
 * - Toast: fixed bottom, monochrome, pointer-events-none
 *
 * 3 Distinct Tier Materials & Color Schemes:
 *   1. Cookie ($2 / ₹169) — Warm Artisanal Bronze / Cacao (`CookieIcon`)
 *   2. 2 Cups ($4 / ₹339) — Electric Radiant Amber (`Coffee`)
 *   3. Core ($10 / ₹849)  — Shiny Glassmorphic Prism Diamond (`ShinyGemIcon`)
 */

// Public key — Vite inlines VITE_* at build time. Secret never reaches client.
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';

/** Bespoke artisanal chocolate chip cookie SVG glyph — precision monoline aesthetic */
function CookieIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Baked outer wafer rim with subtle natural contour notches */}
      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" />
      {/* Precision geometric chocolate morsels */}
      <path d="M8.5 8.5h.01" strokeWidth="2.5" />
      <path d="M12 12h.01" strokeWidth="2.5" />
      <path d="M8 15.5h.01" strokeWidth="2.5" />
      <path d="M15 15h.01" strokeWidth="2.5" />
      <path d="M16 11h.01" strokeWidth="2.5" />
    </svg>
  );
}

/** Shiny Glassmorphic Prism Gem — High-End Precision Crystal Glyph with Specular Glint */
function ShinyGemIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <defs>
        {/* Specular Prism Light Sheen Gradient */}
        <linearGradient id="gem-shine-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#E2E8F0" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Main Faceted Crystal Contours */}
      <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
      <path d="M2 9h20" />
      <path d="M10 3l2 6-2 12" />
      <path d="M14 3l-2 6 2 12" />

      {/* Internal Facet Reflection Planes (Depth & Shine) */}
      <polygon points="6,3 10,3 12,9 2,9" fill="currentColor" fillOpacity="0.14" stroke="none" />
      <polygon points="10,3 14,3 12,9" fill="url(#gem-shine-gradient)" fillOpacity="0.4" stroke="none" />
      <polygon points="14,3 18,3 22,9 12,9" fill="currentColor" fillOpacity="0.18" stroke="none" />
      <polygon points="2,9 12,9 10,21" fill="currentColor" fillOpacity="0.08" stroke="none" />
      <polygon points="12,9 22,9 14,21" fill="url(#gem-shine-gradient)" fillOpacity="0.25" stroke="none" />

      {/* Specular Gleam Glint in Crown */}
      <circle cx="15" cy="5.5" r="0.75" fill="#FFFFFF" stroke="none" />
    </svg>
  );
}

/**
 * Architectural Dual Heart — Precision Monochromatic Thin-Lined SVG Glyph with Fluid Wave Fill
 * Features a primary foreground heart with a nested heart behind it (100% outline opacity, zero fade).
 * Incorporates a rising watery fluid wave fill matching ProfilePage's sponsor button:
 * - Fills on hover on individual hearts
 * - Fills both hearts simultaneously on hover on heading ("Support CAVDAX") or tier buttons ("Sponsor").
 */
function ArchitecturalDualHeart({ align = 'left', className = 'w-7 h-7', isGlobalActive = false }) {
  const isLeft = align === 'left';
  const idPrefix = useId().replace(/:/g, '');
  const clipBgId = `${idPrefix}-bg`;
  const clipFgId = `${idPrefix}-fg`;

  const [hoverFg, setHoverFg] = useState(false);
  const [hoverBg, setHoverBg] = useState(false);
  const [hoverSelf, setHoverSelf] = useState(false);

  // Background heart fills if globally active, whole component hovered, or background heart hovered
  const isBgFilled = isGlobalActive || hoverSelf || hoverBg;
  // Foreground heart fills if globally active, whole component hovered, or foreground heart hovered
  const isFgFilled = isGlobalActive || hoverSelf || hoverFg;

  return (
    <div
      className={`relative inline-flex items-center justify-center cursor-pointer select-none ${className}`}
      onMouseEnter={() => setHoverSelf(true)}
      onMouseLeave={() => {
        setHoverSelf(false);
        setHoverFg(false);
        setHoverBg(false);
      }}
    >
      <svg
        viewBox="0 0 32 26"
        fill="none"
        className="w-full h-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {/* Background Heart ClipPath */}
          <clipPath id={clipBgId}>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </clipPath>

          {/* Foreground Heart ClipPath */}
          <clipPath id={clipFgId}>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </clipPath>
        </defs>

        {/* 1. Background Heart (100% outline opacity, same weight as foreground heart) */}
        <g
          transform={isLeft ? 'translate(1, 1) scale(0.72)' : 'translate(10, 1) scale(0.72)'}
          onMouseEnter={(e) => {
            e.stopPropagation();
            setHoverBg(true);
          }}
          onMouseLeave={() => setHoverBg(false)}
          className="cursor-pointer"
        >
          {/* Watery Fluid Wave Fill Layer */}
          <g clipPath={`url(#${clipBgId})`}>
            <g
              style={{
                transform: isBgFilled ? 'translateY(0px)' : 'translateY(24px)',
                opacity: isBgFilled ? 1 : 0,
                transition: isBgFilled
                  ? 'transform 750ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 150ms ease-out'
                  : 'opacity 200ms ease-out, transform 0s 200ms'
              }}
              className="pointer-events-none"
            >
              <svg viewBox="0 0 48 24" x="0" y="0" width="24" height="24" className="w-full h-full fill-rose-500 dark:fill-rose-600 block">
                <path d="M 0 6 Q 6 2, 12 5 T 24 3 T 36 5 T 48 3 L 48 28 L 0 28 Z" />
                <circle cx="6" cy="4" r="0.8" className="fill-rose-300 dark:fill-rose-400" />
                <circle cx="12" cy="5" r="1.1" className="fill-rose-300 dark:fill-rose-400" />
                <circle cx="18" cy="3.5" r="0.9" className="fill-rose-300 dark:fill-rose-400" />
                <circle cx="24" cy="4.5" r="1" className="fill-rose-300 dark:fill-rose-400" />
              </svg>
              <rect y="7" width="24" height="20" className="fill-rose-500 dark:fill-rose-600" />
            </g>
          </g>

          {/* Crisp Hairline Outline (100% opacity, same weight as front heart) */}
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-900 dark:text-white transition-colors duration-300"
          />
        </g>

        {/* 2. Foreground Heart (Primary prominent outline) */}
        <g
          transform={isLeft ? 'translate(6, 4) scale(0.88)' : 'translate(2, 4) scale(0.88)'}
          onMouseEnter={(e) => {
            e.stopPropagation();
            setHoverFg(true);
          }}
          onMouseLeave={() => setHoverFg(false)}
          className="cursor-pointer"
        >
          {/* Watery Fluid Wave Fill Layer */}
          <g clipPath={`url(#${clipFgId})`}>
            <g
              style={{
                transform: isFgFilled ? 'translateY(0px)' : 'translateY(24px)',
                opacity: isFgFilled ? 1 : 0,
                transition: isFgFilled
                  ? 'transform 750ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 150ms ease-out'
                  : 'opacity 200ms ease-out, transform 0s 200ms'
              }}
              className="pointer-events-none"
            >
              <svg viewBox="0 0 48 24" x="0" y="0" width="24" height="24" className="w-full h-full fill-rose-500 dark:fill-rose-600 block">
                <path d="M 0 6 Q 6 2, 12 5 T 24 3 T 36 5 T 48 3 L 48 28 L 0 28 Z" />
                <circle cx="6" cy="4" r="0.8" className="fill-rose-300 dark:fill-rose-400" />
                <circle cx="12" cy="5" r="1.1" className="fill-rose-300 dark:fill-rose-400" />
                <circle cx="18" cy="3.5" r="0.9" className="fill-rose-300 dark:fill-rose-400" />
                <circle cx="24" cy="4.5" r="1" className="fill-rose-300 dark:fill-rose-400" />
              </svg>
              <rect y="7" width="24" height="20" className="fill-rose-500 dark:fill-rose-600" />
            </g>
          </g>

          {/* Crisp Hairline Outline */}
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-900 dark:text-white transition-colors duration-300"
          />
        </g>
      </svg>
    </div>
  );
}

// Sponsor tiers: amounts in paise (₹1 = 100 paise)
const TIERS = [
  {
    id:       1,
    tierName: 'Cookie',
    usdPrice: '$2',
    inrPrice: '₹169',
    sub:      '/ cookie',
    usdSub:   'approx ₹169 INR',
    inrSub:   'approx $2 USD',
    paise:    16900,
    desc:     'Fueling daily causal engine dev.',
    perks:    ['Verified Backers Wall', 'In-App Backer profile halo', 'Community Contributor Badge'],
    accent:   'bronze',
    popular:  false,
    icon:     CookieIcon,
  },
  {
    id:       2,
    tierName: '2 Cups',
    usdPrice: '$4',
    inrPrice: '₹339',
    sub:      '/ 2 cups',
    usdSub:   'approx ₹339 INR',
    inrSub:   'approx $4 USD',
    paise:    33900,
    desc:     'Powers automated graph fuzzing.',
    perks:    ['Everything in $2 tier', 'Public Backer Spotlight', 'Early access MCP tool specs'],
    accent:   'amber',
    popular:  true,
    icon:     Coffee,
  },
  {
    id:       3,
    tierName: 'Core',
    usdPrice: '$10',
    inrPrice: '₹849',
    sub:      '/ core',
    usdSub:   'approx ₹849 INR',
    inrSub:   'approx $10 USD',
    paise:    84900,
    desc:     'Funds benchmark graph clusters.',
    perks:    ['Featured 3D Sphere Node', 'Permanent Core Patron Badge', 'Personal Team Acknowledgment'],
    accent:   'diamond',
    popular:  false,
    icon:     ShinyGemIcon,
  },
];

// Container-Relative Slider Tracker Hook (UI_DESIGN_SYSTEM.md §1.8 Anti-Flying Standard)
function usePillTracker(activeKey, extraDep = null) {
  const refs = useRef({});
  const [position, setPosition] = useState({ x: 0, y: 0, width: 0, height: 0, ready: false });

  useLayoutEffect(() => {
    let rafId;
    const update = () => {
      const el = refs.current[activeKey];
      if (el) {
        const x = el.offsetLeft;
        const y = el.offsetTop;
        const width = el.offsetWidth;
        const height = el.offsetHeight;
        setPosition((prev) => {
          if (
            prev.ready &&
            prev.x === x &&
            prev.y === y &&
            prev.width === width &&
            prev.height === height
          ) {
            return prev;
          }
          return { x, y, width, height, ready: true };
        });
      }
    };

    update();
    rafId = requestAnimationFrame(update);
    window.addEventListener('resize', update);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', update);
    };
  }, [activeKey, extraDep]);

  return { refs, position };
}

/** Individual Backer Card with Ascending Appreciation Heart animation on hover */
function BackerCard({ backer }) {
  const [hovered, setHovered] = useState(false);
  const isHighlight = backer.highlighted || backer.tier_id === 3;
  const isCups = backer.tier_id === 2;
  const cleanHandle = backer.github_handle && backer.github_handle !== 'community-backer' && backer.github_handle !== 'evaluator-pass'
    ? String(backer.github_handle).replace(/^@/, '').trim()
    : null;
  const canLink = Boolean(cleanHandle && (!backer.is_seed || cleanHandle === 'suneetchugh-dev'));
  const displayAvatar = backer.avatar_url || backer.avatarUrl || (cleanHandle ? `https://github.com/${cleanHandle}.png` : null);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative p-3 rounded-xl border transition-all duration-200 flex items-start gap-3 group ${
        isHighlight
          ? 'border-slate-300 dark:border-white/20 bg-slate-100/50 dark:bg-white/[0.03] shadow-xs hover:border-slate-400 dark:hover:border-white/40'
          : isCups
          ? 'border-amber-400/30 bg-amber-400/[0.02] dark:bg-[#1A150B]/30 hover:border-amber-400/60'
          : 'border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.01] hover:border-amber-800/30 dark:hover:border-amber-700/30'
      }`}
    >
      {/* Avatar Container with Precision Hairline Outline (UI_DESIGN_SYSTEM.md §4287) */}
      <div className="relative shrink-0 transition-transform duration-200 group-hover:scale-105">
        {canLink ? (
          <a
            href={`https://github.com/${backer.github_handle}`}
            target="_blank"
            rel="noreferrer noopener"
            title={`View @${backer.github_handle} on GitHub`}
            className="block cursor-pointer hover:ring-2 hover:ring-slate-400 dark:hover:ring-white/40 rounded-full transition-all focus:outline-hidden"
          >
            <ShimmerImage
              src={displayAvatar}
              alt={backer.name}
              containerClassName={`w-9 h-9 rounded-full border shrink-0 transition-transform duration-300 group-hover:scale-105 ${
                isHighlight
                  ? 'border-slate-300 dark:border-white/30 group-hover:border-slate-400 dark:group-hover:border-white/50'
                  : isCups
                  ? 'border-amber-400/40 group-hover:border-amber-400'
                  : 'border-slate-200 dark:border-white/15 group-hover:border-amber-700/40'
              }`}
              className="w-full h-full object-cover"
              fallback={
                <div
                  className={`w-full h-full rounded-full flex items-center justify-center text-[11px] font-mono font-bold ${
                    isHighlight
                      ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                      : isCups
                      ? 'bg-amber-400/10 text-amber-500'
                      : 'bg-amber-950/10 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500'
                  }`}
                >
                  {isHighlight ? (
                    <ShinyGemIcon className="w-4 h-4 text-slate-800 dark:text-slate-200" />
                  ) : isCups ? (
                    <Coffee className="w-4 h-4 text-amber-500" />
                  ) : (
                    <CookieIcon className="w-4 h-4 text-amber-700 dark:text-amber-500" />
                  )}
                </div>
              }
            />
          </a>
        ) : (
          <ShimmerImage
              src={displayAvatar}
            alt={backer.name}
            containerClassName={`w-9 h-9 rounded-full border shrink-0 transition-transform duration-300 group-hover:scale-105 ${
              isHighlight
                ? 'border-slate-300 dark:border-white/30 group-hover:border-slate-400 dark:group-hover:border-white/50'
                : isCups
                ? 'border-amber-400/40 group-hover:border-amber-400'
                : 'border-slate-200 dark:border-white/15 group-hover:border-amber-700/40'
            }`}
            className="w-full h-full object-cover"
            fallback={
              <div
                className={`w-full h-full rounded-full flex items-center justify-center text-[11px] font-mono font-bold ${
                  isHighlight
                    ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                    : isCups
                    ? 'bg-amber-400/10 text-amber-500'
                    : 'bg-amber-950/10 dark:bg-amber-900/20 text-amber-700 dark:text-amber-500'
                }`}
              >
                {isHighlight ? (
                  <ShinyGemIcon className="w-4 h-4 text-slate-800 dark:text-slate-200" />
                ) : isCups ? (
                  <Coffee className="w-4 h-4 text-amber-500" />
                ) : (
                  <CookieIcon className="w-4 h-4 text-amber-700 dark:text-amber-500" />
                )}
              </div>
            }
          />
        )}

        {/* Themed Tier badge icon corner */}
        <div
          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center shadow-xs border ${
            isHighlight
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 border-slate-700 dark:border-slate-300 shadow-xs'
              : isCups
              ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
              : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-500 border-amber-700/30'
          }`}
        >
          {isHighlight ? (
            <ShinyGemIcon className="w-2.5 h-2.5" />
          ) : isCups ? (
            <Coffee className="w-2.5 h-2.5" />
          ) : (
            <CookieIcon className="w-2.5 h-2.5" />
          )}
        </div>

        
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {backer.name}
            </span>
            
          </div>
          {canLink && (
            <a
              href={`https://github.com/${backer.github_handle}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0 transition-colors"
              title={`@${backer.github_handle} on GitHub`}
            >
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>

        {/* Monospace Subtext: @handle or Patron Role */}
        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate mb-1.5">
          {backer.github_handle && backer.github_handle !== 'community-backer' && backer.github_handle !== 'evaluator-pass'
            ? `@${backer.github_handle}`
            : (backer.is_evaluation ? 'Hackathon Evaluator' : 'Community Patron')}
        </div>

        <div className="flex items-center justify-between gap-1">
          {(() => {
            const isPastCore = isHighlight && backer.is_active === false;
            const backerYear = backer.created_at ? new Date(backer.created_at).getFullYear() : new Date().getFullYear();
            const backerShortYear = `’${String(backerYear).slice(-2)}`;
            const cardBadgeLabel = isPastCore
              ? `Core Patron ${backerShortYear}`
              : (backer.tier_label || (isHighlight ? 'Core Patron' : isCups ? '2 Cups' : 'Cookie Backer'));
            const cardBadgeTooltip = isHighlight
              ? (isPastCore
                  ? `Core Patron Cohort of ${backerYear} • Lifetime Contributor`
                  : 'Active Core Patron • Renewing monthly')
              : (isCups
                  ? 'Verified Supporter • Powering daily causal graph passes'
                  : 'Verified Backer • Fueling independent innovation');
            return (
              <span
                className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                  isHighlight
                    ? 'border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                    : isCups
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    : 'border-amber-800/25 bg-amber-950/10 dark:bg-amber-900/20 text-amber-800 dark:text-amber-500'
                }`}
                title={cardBadgeTooltip}
              >
                {isHighlight && <ShinyGemIcon className="w-2.5 h-2.5 shrink-0" />}
                {cardBadgeLabel}
              </span>
            );
          })()}
          <span className="text-[9px] font-mono text-slate-400">
            {backer.created_at ? new Date(backer.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent'}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Dynamically injects checkout.js once; resolves true when ready. */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}


function getStoredUser() {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('cavdax_user_session') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.username || parsed?.login) {
        return {
          login: parsed.username || parsed.login,
          name: parsed.name || parsed.username || parsed.login,
          avatarUrl: parsed.avatarUrl || parsed.avatar_url || ''
        };
      }
    }
  } catch {}
  return null;
}

export default function SupportPage({ onLaunchConsole, onNavigateHome, onNavigateToSponsors, onPrefetchTab, user }) {
  const [hoveredTier, setHoveredTier] = useState(null);
  const [isHeadingHovered, setIsHeadingHovered] = useState(false);
  const [isExploreHovered, setIsExploreHovered] = useState(false);

  const isGlobalHeartActive = isHeadingHovered || hoveredTier !== null || isExploreHovered;

  const handleCardPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  const handleCardPointerLeave = (e) => {
    e.currentTarget.style.setProperty('--mouse-x', '-999px');
    e.currentTarget.style.setProperty('--mouse-y', '-999px');
  };

  const handlePrefetchSponsors = useCallback(() => {
    if (onPrefetchTab) {
      onPrefetchTab('sponsors');
    }
  }, [onPrefetchTab]);
  const [loadingTier, setLoadingTier] = useState(null);
  const [evalLoadingTier, setEvalLoadingTier] = useState(null);
  const [toast, setToast]             = useState(null); // { ok: bool, text: string }
  const [sponsors, setSponsors]       = useState([]);
  const [loadingSponsors, setLoadingSponsors] = useState(true);
  const [selectedFilter, setSelectedFilter]   = useState('all'); // 'all' | 'core' | 'two_cups' | 'cookie'
  const [consentBacker, setConsentBacker]     = useState(null);
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);

  const handleSaveConsent = async (consentData) => {
    try {
      const res = await fetch('/api/sponsors/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(consentData)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(false, data?.message || 'Failed to update visibility preference.');
        return;
      }
      fetchSponsors();
      try {
        if (consentData.visibility) {
          localStorage.setItem('cavdax_backer_visibility', consentData.visibility);
        }
        if (consentData.quote !== undefined || consentData.backer_message !== undefined) {
          localStorage.setItem('cavdax_backer_quote', consentData.quote || consentData.backer_message || '');
        }
      } catch {}
      const visLabel = consentData.visibility === 'private' ? 'Private (Unlisted)' : (consentData.visibility === 'anonymous' ? 'Anonymous Patron' : 'Public Wall');
      showToast(true, `Backer preference updated to ${visLabel}.`);
    } catch (err) {
      console.warn('[SupportPage] Failed to save consent:', err);
      showToast(false, 'Network error saving recognition preference.');
    }
  };

  // Evaluation Mode & Dev pass detection
  const [isHackathonMode, setIsHackathonMode] = useState(() => {
    return typeof window !== 'undefined' && localStorage.getItem('cavdax_hackathon_mode') === 'true';
  });
  const activeUser = user || getStoredUser() || getActiveDevSession();
  const isAuthorizedDev = Boolean(isUserAuthorized(user) || getActiveDevSession());
  const hasEvaluationPass = Boolean(isAuthorizedDev || (isHackathonMode && Boolean(activeUser)));

  const userHandle = activeUser?.login ? activeUser.login.toLowerCase().replace(/^@/, '').trim() : null;
  const matchedSponsor = userHandle
    ? (sponsors.find(s => s.github_handle && s.github_handle.toLowerCase().replace(/^@/, '').trim() === userHandle) || null)
    : null;
  const isUserSponsor = Boolean(
    (typeof window !== 'undefined' && localStorage.getItem('cavdax_is_sponsor') === 'true') ||
    matchedSponsor ||
    (typeof window !== 'undefined' && localStorage.getItem('cavdax_evaluation_sponsor_tier'))
  );
  const currentVisibility = matchedSponsor?.visibility || (typeof window !== 'undefined' ? localStorage.getItem('cavdax_backer_visibility') : null) || 'public';
  const currentQuote = matchedSponsor?.backer_message || (typeof window !== 'undefined' ? localStorage.getItem('cavdax_backer_quote') : null) || '';

  const handleOpenConsentPreferences = () => {
    playClick();
    setConsentBacker({
      id: matchedSponsor?.id || activeUser?.login || 'self',
      sponsorId: matchedSponsor?.id || activeUser?.login || 'self',
      name: activeUser?.name || activeUser?.login || 'Backer',
      backer_name: activeUser?.name || activeUser?.login || 'Backer',
      tierName: matchedSponsor?.tier_label || (typeof window !== 'undefined' ? localStorage.getItem('cavdax_sponsor_tier') : null) || 'Verified Backer',
      visibility: currentVisibility,
      quote: currentQuote
    });
    setIsConsentModalOpen(true);
  };

  const [activeEvaluationTier, setActiveEvaluationTier] = useState(() => {
    try {
      return parseInt(localStorage.getItem('cavdax_evaluation_sponsor_tier'), 10) || null;
    } catch {
      return null;
    }
  });

  const [isDowngradeModalOpen, setIsDowngradeModalOpen] = useState(false);
  const [pendingDowngradeTier, setPendingDowngradeTier] = useState(null);

  const currentActiveTierId = activeEvaluationTier || matchedSponsor?.tier_id || (() => {
    try {
      const stored = localStorage.getItem('cavdax_sponsor_tier');
      if (!stored) return null;
      const lower = stored.toLowerCase();
      if (lower.includes('core')) return 3;
      if (lower.includes('cup') || lower.includes('coffee')) return 2;
      if (lower.includes('cookie')) return 1;
    } catch {}
    return null;
  })();

  const handleSelectTier = (tier) => {
    playClick();

    // 1. If currently on a higher sponsor tier, ALWAYS open ConfirmationDialog first (exact same order as ProfilePage.jsx)
    if (currentActiveTierId && tier.id < currentActiveTierId) {
      setPendingDowngradeTier(tier);
      setIsDowngradeModalOpen(true);
      return;
    }

    // 2. If clicking currently active tier in evaluation mode
    if (currentActiveTierId && tier.id === currentActiveTierId) {
      if (hasEvaluationPass || activeEvaluationTier) {
        handleEvaluationSponsor(tier);
      }
      return;
    }

    // 3. Evaluation mode / Dev pass bypass (avoids redirecting to external OAuth when testing)
    if (hasEvaluationPass || activeEvaluationTier || (typeof window !== 'undefined' && localStorage.getItem('cavdax_hackathon_mode') === 'true')) {
      handleEvaluationSponsor(tier);
      return;
    }

    // 4. Live Razorpay Sponsor Flow (requires user session)
    const currUser = user || getStoredUser() || getActiveDevSession();
    if (!currUser) {
      window.location.href = '/api/auth/github?returnTo=/support';
      return;
    }

    handleSponsor(tier);
  };

  const executeSponsorDowngrade = async () => {
    if (!pendingDowngradeTier) return;
    const tier = pendingDowngradeTier;
    setIsDowngradeModalOpen(false);
    setPendingDowngradeTier(null);

    const currUser = user || getStoredUser() || getActiveDevSession();
    if (hasEvaluationPass || activeEvaluationTier || !currUser) {
      await handleEvaluationSponsor(tier);
      return;
    }
    handleSponsor(tier);
  };

  const fetchSponsors = useCallback(async () => {
    try {
      const res = await fetch('/api/sponsors');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.sponsors)) {
        setSponsors(data.sponsors);
      }
    } catch (err) {
      console.warn('[CAVDAX Sponsors] Could not fetch directory:', err.message);
    } finally {
      setLoadingSponsors(false);
    }
  }, []);

  useEffect(() => {
    fetchSponsors();
  }, [fetchSponsors]);

  // Sync Hackathon Evaluation Mode state & auto-revert when disabled from Dev Panel
  useEffect(() => {
    const handleMode = (e) => {
      const enabled = Boolean(e.detail?.enabled);
      setIsHackathonMode(enabled);
      if (!enabled && !isAuthorizedDev) {
        // Automatic cleanup on mode disengagement
        setActiveEvaluationTier(null);
        try {
          if (localStorage.getItem('cavdax_sponsor_is_evaluation') === 'true') {
            localStorage.removeItem('cavdax_is_sponsor');
            localStorage.removeItem('cavdax_sponsor_tier');
            localStorage.removeItem('cavdax_evaluation_sponsor_tier');
            localStorage.removeItem('cavdax_sponsor_is_evaluation');
            window.dispatchEvent(new CustomEvent('cavdax:sponsor-registered', { detail: null }));
          }
        } catch {}
        fetch('/api/billing/reset-evaluation-sponsor', { method: 'POST', credentials: 'include' })
          .catch(() => {})
          .finally(() => fetchSponsors());
      }
    };
    window.addEventListener('cavdax:hackathon-mode-changed', handleMode);

    fetch('/api/system/hackathon-mode')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.enabled === 'boolean') {
          setIsHackathonMode(data.enabled);
        }
      })
      .catch(() => {});

    return () => window.removeEventListener('cavdax:hackathon-mode-changed', handleMode);
  }, [isAuthorizedDev, fetchSponsors]);

  const filteredSponsors = sponsors.filter((s) => {
    if (selectedFilter === 'core') return s.tier_id === 3 || s.highlighted;
    if (selectedFilter === 'two_cups') return s.tier_id === 2;
    if (selectedFilter === 'cookie' || selectedFilter === 'coffee') return s.tier_id === 1;
    return true;
  });

  const coreCount = sponsors.filter(s => s.tier_id === 3 || s.highlighted).length;
  const cupsCount = sponsors.filter(s => s.tier_id === 2).length;
  const cookieCount = sponsors.filter(s => s.tier_id === 1).length;

  const [allocationFormat, setAllocationFormat] = useState(() => {
    try {
      return localStorage.getItem('cavdax_allocation_format') || 'cards';
    } catch {
      return 'cards';
    }
  });
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const allocationPill = usePillTracker(allocationFormat);

  const filterPill = usePillTracker(selectedFilter, filteredSponsors.length);

  const [currency, setCurrency] = useState(() => {
    try {
      const saved = localStorage.getItem('cavdax_currency');
      if (saved === 'USD' || saved === 'INR') return saved;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const lang = navigator.language || '';
      if (tz.includes('Calcutta') || tz.includes('Kolkata') || lang.includes('en-IN') || lang.includes('hi')) {
        return 'INR';
      }
    } catch {}
    return 'USD';
  });

  const toggleCurrency = (newCurr) => {
    playClick();
    setCurrency(newCurr);
    try {
      localStorage.setItem('cavdax_currency', newCurr);
      window.dispatchEvent(new CustomEvent('cavdax:currency-changed', { detail: { currency: newCurr } }));
    } catch {}
  };

  useEffect(() => {
    const handleCurrencyChange = (e) => {
      const next = e.detail?.currency || localStorage.getItem('cavdax_currency');
      if (next && (next === 'USD' || next === 'INR')) {
        setCurrency(next);
      }
    };
    window.addEventListener('cavdax:currency-changed', handleCurrencyChange);
    return () => window.removeEventListener('cavdax:currency-changed', handleCurrencyChange);
  }, []);

  const showToast = (ok, text) => {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 5000);
  };

  // 1-Click Evaluation Sponsor Pass Handler (Adversarially Partitioned)
  const handleEvaluationSponsor = useCallback(async (tier) => {
    playClick();
    setEvalLoadingTier(tier.id);

    // If this tier is already active, toggle it OFF (reset back to standard visitor)
    if (activeEvaluationTier === tier.id) {
      try {
        await fetch('/api/billing/reset-evaluation-sponsor', {
          method: 'POST',
          credentials: 'include'
        });
        setActiveEvaluationTier(null);
        try {
          localStorage.removeItem('cavdax_is_sponsor');
          localStorage.removeItem('cavdax_sponsor_tier');
          localStorage.removeItem('cavdax_evaluation_sponsor_tier');
          localStorage.removeItem('cavdax_sponsor_is_evaluation');
          window.dispatchEvent(new CustomEvent('cavdax:sponsor-registered', { detail: null }));
        } catch {}
        showToast(true, 'Reset sponsor status back to standard.');
        fetchSponsors();
      } catch (err) {
        showToast(false, `Could not reset evaluation tier: ${err.message}`);
      } finally {
        setEvalLoadingTier(null);
      }
      return;
    }

    const activeUser = user || getStoredUser() || getActiveDevSession() || {
      id: 'evaluator-pass',
      login: 'evaluator-pass',
      name: 'Hackathon Evaluator',
      avatar_url: null
    };

    const userOverride = {
      id: activeUser.id,
      login: activeUser.login,
      name: activeUser.name || activeUser.login,
      avatar_url: activeUser.avatarUrl || activeUser.avatar_url || null
    };

    try {
      const res = await fetch('/api/billing/activate-evaluation-sponsor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tier_id: tier.id,
          user_override: userOverride
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(false, data?.error?.message || 'Failed to activate evaluation sponsor pass.');
        setEvalLoadingTier(null);
        return;
      }

      setActiveEvaluationTier(tier.id);
      try {
        localStorage.setItem('cavdax_is_sponsor', 'true');
        localStorage.setItem('cavdax_sponsor_tier', data.sponsor_tier || tier.tierName);
        localStorage.setItem('cavdax_evaluation_sponsor_tier', String(tier.id));
        localStorage.setItem('cavdax_sponsor_is_evaluation', 'true');
        window.dispatchEvent(new CustomEvent('cavdax:sponsor-registered', { detail: data.backer }));
      } catch {}

      showToast(true, `Activated ${tier.tierName} Sponsor! In-app halo is live.`);
      setConsentBacker({
        id: data.backer?.id || ('spn_eval_' + (activeUser.id || activeUser.login)),
        name: activeUser.name || activeUser.login,
        login: activeUser.login,
        avatar_url: activeUser.avatar_url || activeUser.avatarUrl,
        tier_id: tier.id,
        tierName: tier.tierName
      });
      setIsConsentModalOpen(true);
      fetchSponsors();
    } catch (err) {
      showToast(false, `Error: ${err.message}`);
    } finally {
      setEvalLoadingTier(null);
    }
  }, [activeEvaluationTier, fetchSponsors]);

  // Real Razorpay Checkout Handler
  const handleSponsor = useCallback(async (tier) => {
    playClick();
    if (!user) {
      window.location.href = '/api/auth/github?returnTo=/support';
      return;
    }
    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1' ||
      window.location.protocol === 'file:'
    );
    if (isLocalhost) {
      showToast(false, 'Live sponsorship payments are disabled on localhost to prevent stranded funds. Sponsor on our production platform: https://cavdax.sahnirmaan.live/support');
      return;
    }
    setLoadingTier(tier.id);

    try {
      // 1. Load checkout.js
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        showToast(false, 'Could not load payment gateway. Check your connection.');
        setLoadingTier(null);
        return;
      }

      // 2. Create order on the backend
      const orderRes  = await fetch('/api/billing/create-order', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify({
          amount_paise: tier.paise,
          receipt:      `cavdax_sponsor_${tier.id}_${Date.now()}`
        })
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.success) {
        showToast(false, orderData?.error?.message || 'Failed to create payment order.');
        setLoadingTier(null);
        return;
      }

      const keyId = orderData.key_id || RAZORPAY_KEY_ID;
      if (!keyId) {
        showToast(false, 'Payment gateway key not configured. Contact the team.');
        setLoadingTier(null);
        return;
      }

      // 3. Open Razorpay modal
      const options = {
        key:         keyId,
        amount:      orderData.amount,
        currency:    orderData.currency,
        name:        'CAVDAX',
        description: `${currency === 'INR' ? tier.inrPrice : tier.usdPrice} Sponsor — Open-source causal AI gate`,
        image:       `${window.location.origin}/cavdax-brand-logo.jpg`,
        order_id:    orderData.order_id,
        theme:       { color: tier.accent === 'diamond' ? '#0F172A' : tier.accent === 'bronze' ? '#B45309' : '#F59E0B' },
        modal: {
          ondismiss: () => setLoadingTier(null)
        },
        handler: async (response) => {
          // 4. Verify HMAC-SHA256 signature server-side
          try {
            const verifyRes = await fetch('/api/billing/verify-payment', {
              method:      'POST',
              headers:     { 'Content-Type': 'application/json' },
              credentials: 'include',
              body:        JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature
              })
            });
            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              showToast(true, 'Payment verified! Welcome to CAVDAX Verified Backers.');
              if (verifyData.backer) {
                setSponsors(prev => [verifyData.backer, ...prev.filter(s => s.id !== verifyData.backer.id)]);
              }
              fetchSponsors();
              try {
                localStorage.setItem('cavdax_is_sponsor', 'true');
                if (verifyData.sponsor_tier) {
                  localStorage.setItem('cavdax_sponsor_tier', verifyData.sponsor_tier);
                }
                localStorage.removeItem('cavdax_sponsor_is_evaluation');
                window.dispatchEvent(new CustomEvent('cavdax:sponsor-registered', { detail: verifyData.backer }));
              } catch {}
              setConsentBacker({
                id: verifyData.backer?.id,
                name: user.name || user.login,
                login: user.login,
                avatar_url: user.avatar_url || user.avatarUrl,
                tier_id: tier.id,
                tierName: tier.tierName
              });
              setIsConsentModalOpen(true);
            } else {
              showToast(false, 'Signature verification failed. Contact support with your payment ID.');
            }
          } catch {
            showToast(false, 'Verification request failed. Contact support with your payment ID.');
          } finally {
            setLoadingTier(null);
          }
        }
      };

      // eslint-disable-next-line no-undef
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (r) => {
        showToast(false, r?.error?.description || 'Payment failed.');
        setLoadingTier(null);
      });

      setLoadingTier(null);
      rzp.open();

    } catch (err) {
      showToast(false, `Error: ${err.message}`);
      setLoadingTier(null);
    }
  }, [currency, fetchSponsors]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pt-20 sm:pt-24 pb-20 px-4 sm:px-6 max-w-4xl mx-auto w-full select-none">

      {/* ── 1. Header ── */}
      <section className="text-center mb-10 sm:mb-12">
        <h1
          onMouseEnter={() => setIsHeadingHovered(true)}
          onMouseLeave={() => setIsHeadingHovered(false)}
          className="text-2xl sm:text-3xl font-mono font-bold text-slate-950 dark:text-white tracking-tight flex items-center justify-center gap-3 cursor-pointer group/heading"
        >
          <ArchitecturalDualHeart align="left" isGlobalActive={isGlobalHeartActive} className="w-7 h-7" />
          <span className="text-slate-950 dark:text-white transition-colors duration-300">Support CAVDAX</span>
          <ArchitecturalDualHeart align="right" isGlobalActive={isGlobalHeartActive} className="w-7 h-7" />
        </h1>
        <p className="mt-3 text-xs font-sans text-slate-500 dark:text-slate-400">
          Direct community backing funds open causal benchmarks and maintainer hours.
        </p>
        {sponsors.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <AnimatedAvatarGroup
              avatars={sponsors.map((s) => {
                const cleanHandle = s.github_handle && s.github_handle !== 'community-backer' && s.github_handle !== 'evaluator-pass'
                  ? String(s.github_handle).replace(/^@/, '').trim()
                  : null;
                return {
                  id: s.id,
                  name: s.name,
                  github_handle: cleanHandle,
                  src: s.avatar_url || s.avatarUrl || (cleanHandle ? `https://github.com/${cleanHandle}.png` : null),
                  tier: s.tier_id === 3 ? 'Core Patron' : s.tier_id === 2 ? '2 Cups' : 'Cookie',
                };
              })}
              max={6}
              size={30}
              overlap={8}
            />
            {onNavigateToSponsors ? (
              <button
                type="button"
                onClick={() => {
                  playClick();
                  onNavigateToSponsors();
                }}
                onMouseEnter={() => {
                  setIsExploreHovered(true);
                  handlePrefetchSponsors();
                }}
                onFocus={handlePrefetchSponsors}
                onTouchStart={handlePrefetchSponsors}
                onMouseLeave={() => setIsExploreHovered(false)}
                className="group flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.04] hover:bg-slate-200/80 dark:hover:bg-white/10 text-xs font-mono text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-all cursor-pointer shadow-2xs"
                title="Open dedicated community backers wall with 3D supporter galaxy"
              >
                <span>{sponsors.length} verified backers</span>
                <span className="opacity-30">•</span>
                <span className="font-semibold text-slate-900 dark:text-white group-hover:text-black dark:group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.35)] transition-all">
                  Explore Wall
                </span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 text-slate-500 group-hover:text-slate-950 dark:text-slate-400 dark:group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </button>
            ) : (
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {sponsors.length} verified backers
              </span>
            )}
          </div>
        )}
      </section>

      {/* ── 2. Sponsorship Tiers & Currency Switcher ── */}
      <div id="sponsorship-tiers" className="flex items-center justify-between mb-3.5 sm:mb-4 scroll-mt-24">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Sponsorship Tiers
          </span>
          
        </div>

        {/* Monochromatic Subtle Currency Switcher (USD / INR) */}
        <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/15 text-[10px] font-mono">
          <button
            type="button"
            onClick={() => toggleCurrency('USD')}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              currency === 'USD'
                ? 'bg-white dark:bg-white/15 text-slate-950 dark:text-white font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            USD ($)
          </button>
          <button
            type="button"
            onClick={() => toggleCurrency('INR')}
            className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
              currency === 'INR'
                ? 'bg-white dark:bg-white/15 text-slate-950 dark:text-white font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            INR (₹)
          </button>
        </div>
      </div>

      {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '::1') && (
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs font-mono mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
            <span>Local Loopback Confinement: Live Razorpay payments are disabled on localhost to prevent stranded funds. Use the Evaluation Sponsor Pass below for local testing.</span>
          </div>
          <a
            href="https://cavdax.sahnirmaan.live/support"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white underline shrink-0 inline-flex items-center gap-1 font-semibold"
          >
            <span>Production Support</span>
            <ExternalLink size={12} />
          </a>
        </div>
      )}

      <section className="pt-0 grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mb-10 sm:mb-12">
        {TIERS.map((tier) => {
          const isLoading = loadingTier === tier.id;
          const isEvalLoading = evalLoadingTier === tier.id;
          const isHovered = hoveredTier === tier.id;
          const TierIcon = tier.icon || CookieIcon;
          const isCurrentEvalTier = (activeEvaluationTier === tier.id) || (currentActiveTierId === tier.id);

          const isBronze = tier.accent === 'bronze';
          const isAmber = tier.accent === 'amber';
          const isDiamond = tier.accent === 'diamond';

          return (
            <div
              key={tier.id}
              onPointerMove={handleCardPointerMove}
              onPointerLeave={handleCardPointerLeave}
              className={`group/card p-6 rounded-2xl border flex flex-col justify-between transition-all duration-300 relative
                ${isCurrentEvalTier
                  ? isAmber
                    ? 'border-amber-400 ring-2 ring-amber-400/50 bg-amber-500/[0.06] dark:bg-[#1A150B]/80 shadow-[0_16px_40px_rgba(245,158,11,0.22)] md:scale-[1.02] md:-translate-y-2 xl:scale-[1.035] xl:-translate-y-2.5 z-10'
                    : isDiamond
                    ? 'border-slate-900 dark:border-white ring-2 ring-slate-900/20 dark:ring-white/40 bg-slate-900/[0.04] dark:bg-white/[0.06] shadow-[0_14px_36px_rgba(0,0,0,0.12)] dark:shadow-[0_0_36px_rgba(255,255,255,0.08)] z-10'
                    : 'border-amber-700/80 dark:border-amber-600/80 ring-2 ring-amber-700/30 bg-amber-950/[0.04] dark:bg-amber-950/20 shadow-[0_12px_32px_rgba(180,83,9,0.14)] z-10'
                  : isAmber && tier.popular
                  ? 'border-amber-400/70 dark:border-amber-400/80 ring-1 ring-amber-400/20 bg-slate-50 dark:bg-white/[0.03] md:scale-[1.02] md:-translate-y-2 md:hover:-translate-y-3.5 xl:scale-[1.035] xl:-translate-y-2.5 xl:hover:-translate-y-4 shadow-[0_12px_32px_rgba(245,158,11,0.14)] hover:shadow-[0_20px_48px_rgba(245,158,11,0.22)] dark:shadow-[0_0_28px_rgba(245,158,11,0.12)] dark:hover:shadow-[0_0_46px_rgba(245,158,11,0.20)] z-10'
                  : isDiamond
                  ? 'border-slate-300 dark:border-white/20 hover:border-slate-400 dark:hover:border-white/40 bg-slate-50/60 dark:bg-white/[0.02] shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(255,255,255,0.03)]'
                  : 'border-slate-200/80 dark:border-white/15 bg-transparent hover:border-amber-700/30 dark:hover:border-amber-600/30'
                }`}
            >
              {isCurrentEvalTier && tier.popular ? (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-amber-400 text-slate-950 font-mono font-extrabold text-[9px] uppercase tracking-widest rounded-full z-20 shadow-xs flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>ACTIVE</span>
                </div>
              ) : isCurrentEvalTier ? (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-mono font-bold text-[9px] uppercase tracking-wider rounded-full z-20 shadow-xs flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>ACTIVE</span>
                </div>
              ) : tier.popular ? (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-amber-400 text-slate-950 font-mono font-extrabold text-[9px] uppercase tracking-widest rounded-full z-20">
                  POPULAR
                </div>
              ) : null}

              {/* ── Substrate Specular Spotlight & Fine Blueprint Matrix (Linear/Vercel Engineering Pattern) ── */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden z-0" aria-hidden="true">
                {/* 1. Fine CAD / Blueprint Dot Grid illuminated in cursor spotlight */}
                <div
                  className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
                  style={{
                    maskImage: 'radial-gradient(190px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), black 0%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(190px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), black 0%, transparent 100%)',
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#64748b_1.2px,transparent_1.2px)] [background-size:14px_14px] opacity-20 dark:opacity-45" />
                </div>

                {/* 2. Ambient Specular Radial Glow */}
                <div
                  className="absolute inset-0 opacity-0 group-hover/card:opacity-35 dark:group-hover/card:opacity-90 transition-opacity duration-300"
                  style={{
                    background: isAmber && tier.popular
                      ? 'radial-gradient(220px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(245,158,11,0.08), transparent 70%)'
                      : isDiamond
                      ? 'radial-gradient(220px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(148,163,184,0.12), transparent 70%)'
                      : 'radial-gradient(220px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(255,255,255,0.05), transparent 70%)'
                  }}
                />
              </div>

              <div className="relative z-10">
                {/* 3 Distinct Themed Icon Boxes */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-3 border transition-all duration-300
                  ${isDiamond
                    ? 'backdrop-blur-md bg-slate-100 dark:bg-white/[0.08] border-slate-300 dark:border-white/20 text-slate-900 dark:text-white shadow-xs'
                    : isAmber
                    ? 'bg-amber-400/10 border-amber-400/25 text-amber-600 dark:text-amber-400'
                    : 'bg-amber-950/10 dark:bg-amber-900/20 border-amber-800/25 text-amber-700 dark:text-amber-500'
                  }`}>
                  <TierIcon className="w-3.5 h-3.5" />
                </div>

                {/* Price */}
                <div className="text-2xl font-bold font-mono text-slate-950 dark:text-white tracking-tight">
                  {currency === 'INR' ? tier.inrPrice : tier.usdPrice}
                  <span className="text-[11px] font-normal text-slate-500 font-sans ml-1">{tier.sub}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 mb-3">
                  {currency === 'INR' ? tier.inrSub : tier.usdSub}
                </div>

                {/* Desc */}
                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mb-4 leading-relaxed">{tier.desc}</p>

                {/* Perks — non-folding items-start with proper line-height & distinct accent checkmarks */}
                <ul className="text-xs font-mono space-y-2 mb-6 text-slate-600 dark:text-slate-300">
                  {tier.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 leading-relaxed">
                      <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                        isDiamond
                          ? 'text-slate-900 dark:text-slate-200'
                          : isAmber
                          ? 'text-amber-500 dark:text-amber-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`} />
                      <span className="whitespace-nowrap overflow-hidden text-ellipsis">{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative z-10">
                {/* Single Unified Action Button (Strict ProfilePage Tier Card Parity) */}
                <button
                  type="button"
                  onClick={() => handleSelectTier(tier)}
                  onMouseEnter={() => setHoveredTier(tier.id)}
                  onMouseLeave={() => setHoveredTier(null)}
                  disabled={loadingTier !== null || evalLoadingTier !== null}
                  className={`relative overflow-hidden w-full h-9 flex items-center justify-center rounded-lg border text-xs font-mono font-semibold cursor-pointer select-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isCurrentEvalTier
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-transparent shadow-xs'
                      : isDiamond
                      ? (isHovered && !isLoading && !isEvalLoading ? 'border-slate-950 dark:border-white text-white dark:text-slate-950' : 'bg-transparent border-slate-300 dark:border-white/20 hover:border-slate-950 dark:hover:border-white text-slate-900 dark:text-white')
                      : isAmber
                      ? (isHovered && !isLoading && !isEvalLoading ? 'border-amber-400 text-slate-950' : 'bg-transparent border-slate-300 dark:border-white/20 hover:border-amber-400 text-slate-900 dark:text-white')
                      : (isHovered && !isLoading && !isEvalLoading ? 'border-amber-700 text-white' : 'bg-transparent border-slate-300 dark:border-white/20 hover:border-amber-700 text-slate-900 dark:text-white')
                  }`}
                >
                  {/* Fluid wave fill layer (active when not in current active tier state) */}
                  {!isCurrentEvalTier && (
                    <div
                      aria-hidden="true"
                      style={{
                        transform:  isHovered && !isLoading && !isEvalLoading ? 'translateY(0%)' : 'translateY(105%)',
                        opacity:    isHovered && !isLoading && !isEvalLoading ? 1 : 0,
                        transition: isHovered
                          ? 'transform 900ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 200ms ease-out'
                          : 'opacity 250ms ease-out, transform 0s 250ms'
                      }}
                      className="absolute left-[-15%] right-[-15%] bottom-0 h-[260%] flex flex-col pointer-events-none z-0"
                    >
                      <svg viewBox="0 0 320 48" preserveAspectRatio="none"
                        className={`w-full h-6 shrink-0 fill-current block ${
                          isDiamond ? 'text-slate-900 dark:text-white' : isAmber ? 'text-amber-400' : 'text-amber-700'
                        }`}>
                        <path d="M 0 24 Q 40 8, 80 20 T 160 15 T 240 22 T 320 12 L 320 48 L 0 48 Z" />
                        <circle cx="80" cy="20" r="4.5" /><circle cx="120" cy="12" r="3.5" /><circle cx="160" cy="15" r="5" /><circle cx="200" cy="13" r="3.5" /><circle cx="240" cy="22" r="4.5" />
                        <line x1="80" y1="20" x2="120" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                        <line x1="120" y1="12" x2="160" y2="15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                        <line x1="160" y1="15" x2="200" y2="13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                        <line x1="200" y1="13" x2="240" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                      </svg>
                      <div className={`flex-1 w-full ${
                        isDiamond
                          ? 'bg-slate-900 dark:bg-white'
                          : isAmber
                          ? 'bg-amber-400'
                          : 'bg-amber-700'
                      }`} />
                    </div>
                  )}

                  <span className="relative z-10 flex items-center gap-1.5 transition-colors duration-300">
                    {isLoading || isEvalLoading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" />Processing...</>
                    ) : isCurrentEvalTier ? (
                      <><CheckCircle2 className="w-3.5 h-3.5 shrink-0" />Active Sponsor Tier</>
                    ) : (hasEvaluationPass || Boolean(currentActiveTierId)) ? (
                      <><TierIcon className="w-3 h-3 shrink-0" />Switch to {tier.tierName}</>
                    ) : !activeUser ? (
                      <><Lock className="w-3 h-3 shrink-0" />Sign In to Sponsor</>
                    ) : (
                      <><TierIcon className="w-3 h-3 shrink-0" />Sponsor ({currency === 'INR' ? tier.inrPrice : tier.usdPrice})</>
                    )}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── 3. Capital allocation (Multi-Format Interactive Transparency Section) ── */}
      <section className="mb-8 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/15 bg-slate-900/[0.02] dark:bg-white/[0.02]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200/60 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
              <HandHeart className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                How Backing Is Allocated
              </h2>
              <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
                Transparent ledger distribution for every contribution received.
              </p>
            </div>
          </div>

          {/* Segmented Chart View Switcher Pills — Container-Relative Slider (UI_DESIGN_SYSTEM.md § 1.8) */}
          <div className="relative flex items-center gap-1 self-start sm:self-auto p-0.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-white/[0.02]">
            {allocationPill.position.ready && (
              <motion.div
                className="absolute top-0 left-0 rounded-md bg-white dark:bg-white/15 shadow-xs pointer-events-none"
                initial={false}
                animate={{
                  x: allocationPill.position.x,
                  y: allocationPill.position.y,
                  width: allocationPill.position.width,
                  height: allocationPill.position.height,
                }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            {[
              { id: 'cards', label: 'Cards', icon: LayoutGrid },
              { id: 'donut', label: 'Donut', icon: PieChart },
              { id: 'strip', label: 'Strip', icon: BarChartHorizontal },
            ].map((v) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  ref={(el) => { if (el) allocationPill.refs.current[v.id] = el; }}
                  onClick={() => {
                    playClick();
                    setAllocationFormat(v.id);
                    try {
                      localStorage.setItem('cavdax_allocation_format', v.id);
                    } catch {}
                  }}
                  className={`relative z-10 whitespace-nowrap shrink-0 px-2.5 sm:px-3 py-1 rounded-md text-[10px] font-mono font-semibold transition-colors duration-150 flex items-center gap-1.5 cursor-pointer ${
                    allocationFormat === v.id
                      ? 'text-slate-950 dark:text-white font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span>{v.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Format 1: Detailed Cards */}
          {allocationFormat === 'cards' && (
            <motion.div
              key="cards"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="space-y-3"
            >
              {[
                {
                  id: 'maintainers',
                  label: 'Core Maintainers',
                  pct: 40,
                  pctText: '40%',
                  color: 'bg-amber-400',
                  textColor: 'text-amber-600 dark:text-amber-400',
                  note: 'Triaging causal graphs, RFC specifications & zero-regression patches',
                },
                {
                  id: 'benchmark',
                  label: 'Benchmark Nodes',
                  pct: 35,
                  pctText: '35%',
                  color: 'bg-slate-700 dark:bg-slate-300',
                  textColor: 'text-slate-700 dark:text-slate-300',
                  note: 'FalkorDB cloud instances, vector index hosting & latency benchmarks',
                },
                {
                  id: 'ci',
                  label: 'Automated CI & Fuzzing',
                  pct: 25,
                  pctText: '25%',
                  color: 'bg-slate-400 dark:bg-slate-500',
                  textColor: 'text-slate-600 dark:text-slate-400',
                  note: 'Regression testing harnesses, synthetic DAG fuzzing & MCP test suites',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-3 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
                      <span className="font-semibold text-slate-900 dark:text-white">{item.label}</span>
                    </div>
                    <span className={`font-bold ${item.textColor}`}>{item.pctText}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] font-sans text-slate-500 dark:text-slate-400">
                    {item.note}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Format 2: Precision Vector Donut Chart */}
          {allocationFormat === 'donut' && (
            <motion.div
              key="donut"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="p-4 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] flex flex-col sm:flex-row items-center justify-around gap-6"
            >
              {/* SVG Donut Circle (Radius=68, Circumference ~427.26) */}
              <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                  {/* Subtle Background Ring */}
                  <circle
                    cx="100"
                    cy="100"
                    r="68"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="16"
                    className="text-slate-100 dark:text-white/5"
                  />
                  {/* 40% Core Maintainers (Amber) */}
                  <circle
                    cx="100"
                    cy="100"
                    r="68"
                    fill="none"
                    stroke="#F59E0B"
                    strokeWidth={hoveredSlice === 'maintainers' ? "20" : "16"}
                    strokeDasharray="170.9 427.26"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredSlice('maintainers')}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                  {/* 35% Benchmark Nodes (Slate-700 / Slate-300) */}
                  <circle
                    cx="100"
                    cy="100"
                    r="68"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={hoveredSlice === 'benchmark' ? "20" : "16"}
                    strokeDasharray="149.54 427.26"
                    strokeDashoffset="-170.9"
                    strokeLinecap="round"
                    className="text-slate-700 dark:text-slate-300 transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredSlice('benchmark')}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                  {/* 25% Automated CI & Fuzzing (Slate-400 / Slate-500) */}
                  <circle
                    cx="100"
                    cy="100"
                    r="68"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={hoveredSlice === 'ci' ? "20" : "16"}
                    strokeDasharray="106.81 427.26"
                    strokeDashoffset="-320.44"
                    strokeLinecap="round"
                    className="text-slate-400 dark:text-slate-500 transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredSlice('ci')}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                </svg>

                {/* Donut Center Readout */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                  <span className="text-xl font-bold font-mono text-slate-900 dark:text-white tracking-tight">
                    {hoveredSlice === 'maintainers'
                      ? '40%'
                      : hoveredSlice === 'benchmark'
                      ? '35%'
                      : hoveredSlice === 'ci'
                      ? '25%'
                      : '100%'}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    {hoveredSlice === 'maintainers'
                      ? 'Maintainers'
                      : hoveredSlice === 'benchmark'
                      ? 'Benchmarks'
                      : hoveredSlice === 'ci'
                      ? 'CI Fuzzing'
                      : 'Allocated'}
                  </span>
                </div>
              </div>

              {/* Side Legend with Interactive Hover Link */}
              <div className="flex-1 w-full space-y-2.5">
                {[
                  {
                    id: 'maintainers',
                    label: 'Core Maintainers',
                    pct: '40%',
                    color: 'bg-amber-400',
                    textColor: 'text-amber-600 dark:text-amber-400',
                    note: 'Graph triage & RFC specifications',
                  },
                  {
                    id: 'benchmark',
                    label: 'Benchmark Nodes',
                    pct: '35%',
                    color: 'bg-slate-700 dark:bg-slate-300',
                    textColor: 'text-slate-700 dark:text-slate-300',
                    note: 'FalkorDB instances & index hosting',
                  },
                  {
                    id: 'ci',
                    label: 'Automated CI & Fuzzing',
                    pct: '25%',
                    color: 'bg-slate-400 dark:bg-slate-500',
                    textColor: 'text-slate-600 dark:text-slate-400',
                    note: 'Regression harnesses & MCP test suites',
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    onMouseEnter={() => setHoveredSlice(item.id)}
                    onMouseLeave={() => setHoveredSlice(null)}
                    className={`p-2.5 rounded-lg border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                      hoveredSlice === item.id
                        ? 'border-slate-400 dark:border-white/30 bg-slate-100/80 dark:bg-white/[0.06] shadow-xs'
                        : 'border-slate-200/60 dark:border-white/5 bg-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.color}`} />
                      <div>
                        <div className="text-xs font-mono font-semibold text-slate-900 dark:text-white">
                          {item.label}
                        </div>
                        <div className="text-[10px] font-sans text-slate-500 dark:text-slate-400">
                          {item.note}
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-mono font-bold ${item.textColor}`}>
                      {item.pct}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Format 3: Single Line (Horizontal Proportional Segmented Strip) */}
          {allocationFormat === 'strip' && (
            <motion.div
              key="strip"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="p-4 rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] space-y-4"
            >
              {/* Continuous Stacked Segmented Line */}
              <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-slate-100 dark:bg-white/5 p-0.5 gap-0.5 border border-slate-200/80 dark:border-white/10">
                <div
                  style={{ width: '40%' }}
                  className="h-full rounded-l-full bg-amber-400 hover:brightness-110 transition-all cursor-pointer"
                  title="Core Maintainers: 40%"
                />
                <div
                  style={{ width: '35%' }}
                  className="h-full bg-slate-700 dark:bg-slate-300 hover:brightness-110 transition-all cursor-pointer"
                  title="Benchmark Nodes: 35%"
                />
                <div
                  style={{ width: '25%' }}
                  className="h-full rounded-r-full bg-slate-400 dark:bg-slate-500 hover:brightness-110 transition-all cursor-pointer"
                  title="Automated CI & Fuzzing: 25%"
                />
              </div>

              {/* 3 Proportional Metric Footers */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {[
                  {
                    label: 'Maintainers',
                    pct: '40%',
                    color: 'bg-amber-400',
                    textColor: 'text-amber-600 dark:text-amber-400',
                    note: 'Triage & RFC specifications',
                  },
                  {
                    label: 'Benchmarks',
                    pct: '35%',
                    color: 'bg-slate-700 dark:bg-slate-300',
                    textColor: 'text-slate-700 dark:text-slate-300',
                    note: 'Cloud instances & latency tests',
                  },
                  {
                    label: 'Automated CI',
                    pct: '25%',
                    color: 'bg-slate-400 dark:bg-slate-500',
                    textColor: 'text-slate-600 dark:text-slate-400',
                    note: 'Regression testing harnesses',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-2.5 rounded-lg border border-slate-200/60 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{item.label}</span>
                      </div>
                      <span className={`font-bold ${item.textColor}`}>{item.pct}</span>
                    </div>
                    <span className="text-[10px] font-sans text-slate-500 dark:text-slate-400 leading-tight">
                      {item.note}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── 3.5. Monochromatic Backer Recognition Preferences Ribbon Strip ── */}
      {isUserSponsor && (
        <div className="mb-6 px-4 py-2.5 rounded-xl border border-slate-200/90 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.03] backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {currentVisibility === 'private' ? (
              <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 stroke-[1.75] shrink-0" />
            ) : currentVisibility === 'anonymous' ? (
              <EyeOff className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 stroke-[1.75] shrink-0" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 stroke-[1.75] shrink-0" />
            )}
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">Recognition Preference:</span>
            <span className="text-xs font-mono font-semibold text-slate-900 dark:text-white truncate">
              {currentVisibility === 'private'
                ? 'Private (Do Not List)'
                : currentVisibility === 'anonymous'
                ? 'Anonymous Patron'
                : 'Public Backers Wall'}
            </span>
            {currentVisibility === 'public' && activeUser?.login && (
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 hidden md:inline truncate">
                (@{activeUser.login})
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleOpenConsentPreferences}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-medium text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white bg-white hover:bg-slate-50 dark:bg-white/10 dark:hover:bg-white/20 border border-slate-300/80 dark:border-white/10 shadow-2xs transition-all cursor-pointer shrink-0"
          >
            <SlidersHorizontal className="w-3 h-3 text-slate-500 dark:text-slate-400 shrink-0" />
            <span>Edit Recognition</span>
          </button>
        </div>
      )}

      {/* ── 4. Verified Backers Wall ── */}
      <section className="mb-10 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/15 bg-slate-900/[0.02] dark:bg-white/[0.02]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200/60 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl border border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0 text-slate-800 dark:text-slate-200 shadow-xs">
              {/* Monochromatic Highlighted Gem + People Cluster SVG */}
              <ShinyGemIcon className="w-5 h-5 text-slate-800 dark:text-slate-200" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-900 dark:bg-slate-950 border border-slate-700 dark:border-slate-600 flex items-center justify-center text-slate-200">
                <Users className="w-2.5 h-2.5" />
              </div>
            </div>
            <div>
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Verified Backers Directory
              </h2>
              <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400 mt-0.5 [text-wrap:balance]">
                Honoring the community champions and builders powering independent innovation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {/* Segmented Filter Pills — Container-Relative Sliding Pill Bar (UI_DESIGN_SYSTEM.md §1.8) */}
            <div className="relative flex items-center gap-1 p-0.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-white/[0.02]">
            {filterPill.position.ready && (
              <motion.div
                className="absolute top-0 left-0 rounded-md bg-white dark:bg-white/15 shadow-xs pointer-events-none"
                initial={false}
                animate={{
                  x: filterPill.position.x,
                  y: filterPill.position.y,
                  width: filterPill.position.width,
                  height: filterPill.position.height,
                }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            {[
              { id: 'all', label: 'All', count: sponsors.length, icon: Users },
              { id: 'core', label: 'Core', count: coreCount, icon: ShinyGemIcon },
              { id: 'two_cups', label: '2 Cups', count: cupsCount, icon: Coffee },
              { id: 'cookie', label: 'Cookie', count: cookieCount, icon: CookieIcon },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.id}
                  ref={(el) => { if (el) filterPill.refs.current[f.id] = el; }}
                  onClick={() => {
                    playClick();
                    setSelectedFilter(f.id);
                  }}
                  className={`relative z-10 whitespace-nowrap shrink-0 px-2.5 sm:px-3 py-1 rounded-md text-[10px] font-mono font-semibold transition-colors duration-150 flex items-center gap-1.5 cursor-pointer ${
                    selectedFilter === f.id
                      ? 'text-slate-950 dark:text-white font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3 h-3 shrink-0" />
                  <span>{f.label}</span>
                  <span className="text-[9px] opacity-70">({f.count})</span>
                </button>
              );
            })}
            </div>
          </div>
        </div>

        {loadingSponsors ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs font-mono text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            <span>Loading verified backers...</span>
          </div>
        ) : filteredSponsors.length === 0 ? (
          <div className="group/empty py-10 text-center flex flex-col items-center justify-center gap-3">
            {/* Upper Badge with Dual-Layered Velvet Heart Fill Bloom */}
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 dark:text-slate-500 transition-all duration-300 group-hover/empty:border-rose-400/40 group-hover/empty:bg-rose-50/50 dark:group-hover/empty:bg-rose-500/10">
              <div className="relative w-5 h-5 flex items-center justify-center">
                {/* Crisp Outline Layer */}
                <Heart className="w-5 h-5 text-rose-500/70 transition-colors duration-300 stroke-[1.8]" />
                {/* Velvet Fill Bloom (Zero flickering, compositor-accelerated) */}
                <Heart className="absolute inset-0 w-5 h-5 text-rose-500 fill-rose-500 opacity-0 scale-75 group-hover/empty:opacity-100 group-hover/empty:scale-100 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" />
              </div>
            </div>
            <div>
              <p className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                No supporters in this tier yet.
              </p>
              <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400 mt-0.5">
                Become the first to back CAVDAX in this category!
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                playClick();
                const tiersSection = document.getElementById('sponsorship-tiers');
                if (tiersSection) {
                  tiersSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="group mt-1 px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/20 bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-mono font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              {/* Dual-Layered Velvet Heart Button Icon */}
              <div className="relative w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                {/* Crisp Outline Layer */}
                <Heart className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0 transition-colors duration-300 stroke-[2]" />
                {/* Smooth blossoming velvet fill */}
                <Heart className="absolute inset-0 w-3.5 h-3.5 text-rose-500 fill-rose-500 dark:text-rose-400 dark:fill-rose-400 shrink-0 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]" />
              </div>
              <span>Become First Supporter</span>
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="max-h-[380px] overflow-y-auto pr-1 sm:pr-1.5 custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredSponsors.map((backer) => (
                  <BackerCard
                    key={backer.id || backer.order_id || backer.github_handle || Math.random()}
                    backer={backer}
                  />
                ))}
              </div>
            </div>
            {filteredSponsors.length > 6 && (
              <div className="mt-2 text-center">
                <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400">
                  Scroll to view all backers ({filteredSponsors.length})
                </span>
              </div>
            )}
            {onNavigateToSponsors && (
              <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
                <span>Honoring independent contributors</span>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    onNavigateToSponsors();
                  }}
                  onMouseEnter={() => {
                    setIsExploreHovered(true);
                    handlePrefetchSponsors();
                  }}
                  onFocus={handlePrefetchSponsors}
                  onTouchStart={handlePrefetchSponsors}
                  onMouseLeave={() => setIsExploreHovered(false)}
                  className="group inline-flex items-center gap-1 text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer font-medium"
                >
                  <span>Explore 3D Backer Sphere</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Toast ── */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 text-xs font-mono font-medium shadow-2xl backdrop-blur-md flex items-center gap-2 border border-white/10 dark:border-slate-900/10 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 whitespace-nowrap"
        >
          {toast.ok ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-current shrink-0" />
          ) : (
            <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          )}
          <span>{toast.text}</span>
        </div>
      )}
      {/* ── Lower Sponsor Category Switch Confirmation Dialog ── */}
      <ConfirmationDialog
        isOpen={isDowngradeModalOpen}
        onClose={() => {
          setIsDowngradeModalOpen(false);
          setPendingDowngradeTier(null);
        }}
        onConfirm={executeSponsorDowngrade}
        title={pendingDowngradeTier ? `Switch to ${pendingDowngradeTier.tierName}?` : 'Switch Sponsor Category?'}
        description={
          pendingDowngradeTier?.id === 2
            ? [
                'Sets your 3D sphere profile picture to medium size.',
                'Preserves honorary Core Patron vintage cohort.'
              ]
            : [
                'Sets your 3D sphere profile picture to small size.',
                currentActiveTierId === 3
                  ? 'Preserves honorary Core Patron vintage cohort.'
                  : 'Transfers spotlight recognition to Cookie tier.'
              ]
        }
        confirmLabel="Confirm Switch"
        severity="neutral"
        icon={ArrowDownLeft}
        confirmIcon={ArrowDownLeft}
      />

      {/* ── Post-Sponsorship Recognition & Consent Modal ── */}
      <BackerConsentModal
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
        onSave={handleSaveConsent}
        backer={consentBacker}
      />
    </div>
  );
}
