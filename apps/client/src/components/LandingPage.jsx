import React, { useState, useEffect, useLayoutEffect } from 'react';

import CurvyArrow from './CurvyArrow';

import { 

  ArrowRight, 

  Database, 

  Layers, 

  GitBranch, 

  Cpu, 

  AlertTriangle, 

  CheckCircle2, 

  KeyRound, 

  Lock,

  ArrowUpRight,

  Compass,

  FileCode2, 

  Workflow, 

  Zap,

  Cable,

  HelpCircle

} from 'lucide-react';

import CavdaxWordmark from './CavdaxWordmark';

import FooterParticles from './FooterParticles';

import KineticRollingHeadline from './KineticRollingHeadline';

import ThanosTypewriterHeadline from './ThanosTypewriterHeadline';

import McpCableConnectionSvg from './McpCableConnectionSvg';

import PullCordLampToggle from './PullCordLampToggle';

import CausalProvenanceRadar from './CausalProvenanceRadar';

import CausalSolutionScroller from './CausalSolutionScroller';

import SubsystemErrorBoundary from './SubsystemErrorBoundary';
import CausalEnclaveHub from './CausalEnclaveHub';

import SpotlightDataRain from './SpotlightDataRain';
import ArchitecturalComparisonMatrix from './ArchitecturalComparisonMatrix';

import { playClick } from '../utils/soundFx';



const FAQS = [

  {

    q: "What is 'Silent Cache Rot' in autonomous AI coding agents?",

    a: "When codebases evolve, vector embeddings continue retrieving deprecated decisions due to high semantic similarity. Agents silently write stale, broken code without realizing the architectural rule was superseded."

  },

  {

    q: "How does CAVDAX enforce deterministic invalidation over cosine similarity?",

    a: "CAVDAX models architecture as a temporal Directed Acyclic Graph (DAG) in FalkorDB. Superseding commits trigger instant sub-2ms graph traversals that invalidate all dependent claims with 100% mathematical certainty."

  },

  {

    q: "How does the Enclosed Model Context Protocol (MCP) Interceptor gate tool execution?",

    a: "CAVDAX intercepts agent write tools in-flight over MCP stdio. Verified causal chains commit to disk in < 2ms; stale dependencies trigger an immediate 403 Hard Rejection with the exact invalidation path."

  },

  {

    q: "Does CAVDAX require changing my coding agent or LLM weights?",

    a: "Zero model modifications needed. CAVDAX drops directly into Claude Code, Cursor, Claude Desktop, Windsurf, or Roo Code via standard JSON configuration."

  },

  {

    q: "Why is FalkorDB GraphBLAS specifically required for this problem?",

    a: "FalkorDB performs multi-hop graph traversals via RAM-resident GraphBLAS sparse matrix operations, delivering sub-2ms causal verification with zero perceptible latency."

  }

];



export default function LandingPage({ 

  landingTarget = 'overview',

  onSelectTab,

  onLaunchConsole, 

  onOpenMcpPage, 

  onOpenMcpModal, 

  onStartTour,

  isDarkTheme = true,

  onToggleTheme

}) {

  const [expandedFaq, setExpandedFaq] = useState(null);

  const [scrollY, setScrollY] = useState(() => {

    if (typeof window !== 'undefined') {

      if (landingTarget === 'overview') {

        const hero = document.getElementById('hero-section');

        if (hero) return hero.offsetTop;

        return (window.innerHeight || 800) * 1.06;

      }

      return window.scrollY;

    }

    return 0;

  });

  const [hasAlignedOverview, setHasAlignedOverview] = useState(landingTarget !== 'overview');



  useLayoutEffect(() => {

    if (landingTarget === 'overview') {

      const align = () => {

        const hero = document.getElementById('hero-section');

        if (!hero) return;

        const targetY = hero.offsetTop;

        if (window.__lenis) {

          window.__lenis.resize();

          window.__lenis.scrollTo(targetY, { immediate: true });

        }

        window.scrollTo({ top: targetY, left: 0, behavior: 'instant' });

        setScrollY(targetY);

        setHasAlignedOverview(true);

      };

      align();

      const t1 = setTimeout(align, 20);

      const t2 = setTimeout(align, 80);

      return () => {

        clearTimeout(t1);

        clearTimeout(t2);

      };

    } else {

      setHasAlignedOverview(true);

    }

  }, [landingTarget]);

  const [viewportDims, setViewportDims] = useState({ width: 1200, height: 800 });

  const [activeSection, setActiveSection] = useState('brand-intro');

  const [isBtnHovered, setIsBtnHovered] = useState(false);

  // Staggered Ambient Atmosphere Reveal: Allow wordmark vector typography to claim focus on frame 0,
  // gracefully fading in the heavy canvas firefly rain after typography anchors.
  const [ambientRainActive, setAmbientRainActive] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setAmbientRainActive(true), 1200);
    return () => clearTimeout(timer);
  }, []);



  // Track window scroll and resize metrics for butter-smooth 60fps transform physics

  useEffect(() => {

    const handleScroll = () => {

      setScrollY(window.scrollY);

    };

    const handleResize = () => {

      setViewportDims({ width: window.innerWidth, height: window.innerHeight });

    };



    handleResize();

    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {

      window.removeEventListener('scroll', handleScroll);

      window.removeEventListener('resize', handleResize);

    };

  }, []);



  // Section observer for right-side vertical scroll bubbles

  useEffect(() => {

    const sectionIds = ['brand-intro', 'hero-section', 'bento-section', 'enclave-hub-section', 'causal-loop-section', 'comparison-matrix', 'faq-section', 'radar-section', 'cta-section'];

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



    sectionIds.forEach((id) => {

      const el = document.getElementById(id);

      if (el) observer.observe(el);

    });



    return () => observer.disconnect();

  }, []);



      // High-precision Lenis & wheel scroll snap between Wordmark Intro and Overview

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



    const snapToOverview = () => {

      const hero = document.getElementById("hero-section");

      if (!hero) return;

      isSnapping = true;

      clearTimeout(snapSafetyTimer);

      snapSafetyTimer = setTimeout(unlockSnapping, 1100);



      setTimeout(() => {

        if (window.__lenis) {

          window.__lenis.scrollTo(hero.offsetTop, {

            duration: 0.82,

            lock: true,

            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),

            onComplete: unlockSnapping

          });

        } else {

          window.scrollTo({ top: hero.offsetTop, behavior: "smooth" });

          setTimeout(unlockSnapping, 950);

        }

      }, 0);

    };



    const snapToWordmark = () => {

      isSnapping = true;

      clearTimeout(snapSafetyTimer);

      snapSafetyTimer = setTimeout(unlockSnapping, 1100);



      setTimeout(() => {

        if (window.__lenis) {

          window.__lenis.scrollTo(0, {

            duration: 0.82,

            lock: true,

            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),

            onComplete: unlockSnapping

          });

        } else {

          window.scrollTo({ top: 0, behavior: "smooth" });

          setTimeout(unlockSnapping, 950);

        }

      }, 0);

    };



    // 1. Wheel gesture handler (catches user scroll intent in either direction, fast or slow)

    const handleWheel = (e) => {

      if (isSnapping || window.__lenis?.isLocked) return;

      const currentY = window.scrollY;

      const hero = document.getElementById("hero-section");

      if (!hero) return;

      const heroTop = hero.offsetTop;



      // Scrolling DOWN from anywhere in Wordmark intro (0 to heroTop - 50)

      if (currentY < heroTop - 50 && e.deltaY > 0) {

        if (e.cancelable) e.preventDefault();

        snapToOverview();

        return;

      }



      // Scrolling UP strictly from top of Overview (within 4px of heroTop) OR inside transition zone

      if (currentY <= heroTop + 4 && currentY > 20 && e.deltaY < 0) {

        if (e.cancelable) e.preventDefault();

        snapToWordmark();

        return;

      }

    };



    // 2. Lenis virtual and momentum scroll listener (trackpad, touch, momentum settling)

    let lastScrollY = window.scrollY;

    const handleLenisScroll = (e) => {

      if (isSnapping || window.__lenis?.isLocked) return;

      const hero = document.getElementById("hero-section");

      if (!hero) return;

      const heroTop = hero.offsetTop;



      const currentY = typeof e?.scroll === "number" ? e.scroll : window.scrollY;

      const direction = typeof e?.direction === "number" && e.direction !== 0

        ? e.direction 

        : (currentY > lastScrollY ? 1 : (currentY < lastScrollY ? -1 : 0));

      lastScrollY = currentY;



      // When user settles strictly in the transition zone between Wordmark and Hero

      if (currentY > 40 && currentY < heroTop - 40) {

        clearTimeout(snapTimeout);

        snapTimeout = setTimeout(() => {

          if (isSnapping || window.__lenis?.isLocked) return;

          if (direction === 1 || currentY > heroTop * 0.5) {

            snapToOverview();

          } else if (direction === -1 || currentY <= heroTop * 0.5) {

            snapToWordmark();

          }

        }, 75);

      }

    };



    window.addEventListener("wheel", handleWheel, { passive: false });



    // Robust Lenis attachment: handles when Lenis initializes after LandingPage mount

    let lenisBound = false;

    const bindLenis = () => {

      if (window.__lenis && !lenisBound) {

        window.__lenis.on("scroll", handleLenisScroll);

        lenisBound = true;

        return true;

      }

      return false;

    };



    if (!bindLenis()) {

      const lenisInterval = setInterval(() => {

        if (bindLenis()) clearInterval(lenisInterval);

      }, 50);

      setTimeout(() => clearInterval(lenisInterval), 3000);

    }



    return () => {

      window.removeEventListener("wheel", handleWheel);

      if (window.__lenis && lenisBound) {

        window.__lenis.off("scroll", handleLenisScroll);

      }

      clearTimeout(snapTimeout);

      clearTimeout(snapSafetyTimer);

    };

  }, []);



  // Compute scroll progress dedicated wordmark intro section

  const introThreshold = (viewportDims.height || 800) * 0.58;

  const introProgress = Math.min(1, Math.max(0, scrollY / introThreshold));



  // Wordmark Hinge & Exit Physics:

  // 1. Drifts smoothly to the left

  const translateX = -introProgress * Math.min(viewportDims.width * 0.32, 360);

  // 2. Accelerates downward like gravity

  const translateY = Math.pow(introProgress, 1.9) * 380;

  // 3. Hinges/rotates counter-clockwise around the top-left nail (anchored at top-left of letter 'C')

  const rotation = -introProgress * 16;

  // 4. Stays crisp initially, then fades smoothly and rapidly

  const wordmarkOpacity = introProgress < 0.22 ? 1 : Math.max(0, 1 - (introProgress - 0.22) / 0.52);

  // 5. Cues fade away quickly as scrolling begins

  const cuesOpacity = Math.max(0, 1 - introProgress * 3.8);

  // Stretchy Pull-String Lamp Button must ONLY be visible when strictly on the Wordmark Page

  // and completely hidden everywhere else.

  const isWordmarkSection = scrollY < 40;

  const isWordmarkActive = hasAlignedOverview && isWordmarkSection;

  const lampOpacity = isWordmarkActive ? cuesOpacity : 0;

  const scale = 1 - introProgress * 0.08;



  // Responsive width for the monumentally enlarged Wordmark in its own dedicated section

  const wordmarkWidth = Math.min(780, Math.max(280, viewportDims.width * 0.88));



  const handleMcpClick = () => {

    playClick();

    if (onOpenMcpPage) {

      onOpenMcpPage();

    } else if (onOpenMcpModal) {

      onOpenMcpModal();

    }

  };



  return (

    <div className="w-full flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-200 select-none overflow-x-hidden">

      

      {/* ══════════════════════════════════════════════════════════════════════

          0. DEDICATED FULLSCREEN WORDMARK INTRO VIEWPORT

          (Pristine Void, Enlarged Wordmark, Scroll-driven Hinge Drop & Fade)

          ══════════════════════════════════════════════════════════════════════ */}

      <div id="brand-intro" className="relative w-full h-[106dvh]">

        <div className="sticky top-0 h-[100dvh] w-full flex flex-col justify-center items-center relative px-6 overflow-hidden select-none">

          {/* Stretchy Pull-String Lamp Theme Toggle */}

          <PullCordLampToggle

            isDarkTheme={isDarkTheme}

            onToggleTheme={onToggleTheme}

            opacity={lampOpacity}

          />

          {/* Interactive Causal Provenance Spotlight Data Rain (Cursor-revealed discovery mask) */}

          <SpotlightDataRain isDarkTheme={isDarkTheme} opacity={ambientRainActive ? wordmarkOpacity : 0} />

          {/* Soft Monochromatic Ambient Radial Halo */}

          <div 

            aria-hidden="true" 

            style={{ opacity: wordmarkOpacity * 0.9 }}

            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] sm:w-[820px] h-[240px] sm:h-[420px] bg-white/[0.04] dark:bg-white/[0.04] blur-[100px] sm:blur-[160px] pointer-events-none rounded-full transition-opacity" 

          />



          {/* Monumentally Enlarged CAVDAX Wordmark with Nail-Hinge & Gravity Physics */}

          <div 

            id="wordmark-hero-container"

            style={{

              transform: `translate3d(${translateX}px, ${translateY}px, 0) rotate(${rotation}deg) scale(${scale})`,

              transformOrigin: '14% 12%',

              opacity: wordmarkOpacity,

              visibility: wordmarkOpacity <= 0.005 ? 'hidden' : 'visible',

              willChange: 'transform, opacity'

            }}

            className="relative flex items-center justify-center max-w-[820px] w-full py-4 transition-colors"

          >

            <CavdaxWordmark width={wordmarkWidth} className="text-slate-950 dark:text-white relative z-10 drop-shadow-xs" />

          </div>



          {/* Discovery Sub-Cues (CurvyArrow + Explore CTA Button) */}

          <div 

            style={{

              opacity: cuesOpacity,

              visibility: cuesOpacity <= 0.01 ? 'hidden' : 'visible',

              transform: `translate3d(0, -${introProgress * 45}px, 0)`,

              pointerEvents: cuesOpacity <= 0.1 ? 'none' : 'auto',

              willChange: 'opacity, transform'

            }}

            className="flex flex-col items-center mt-8 sm:mt-10 md:mt-12 relative z-20"

          >

            {/* CurvyArrow with Rectangular Squircle Arrow-Only CTA Button */}

            <div 

              onMouseEnter={() => setIsBtnHovered(true)}

              onMouseLeave={() => setIsBtnHovered(false)}

              className="relative inline-flex items-center group"

            >

              <CurvyArrow

                direction="top-right"

                label="HOW IT WORKS"

                active={isBtnHovered}

                hoverOnly={true}

                className="-top-14 sm:-top-16 -right-16 sm:-right-24 pointer-events-none"

              />



              {/* Rectangular squircle arrow-only button (wider than tall, elegant and minimalistic) */}

              <button

                id="wordmark-explore-btn"

                aria-label="Explore the CAVDAX Causal Engine"

                onMouseEnter={() => setIsBtnHovered(true)}

                onMouseLeave={() => setIsBtnHovered(false)}

                onClick={() => {

                  playClick();

                  const hero = document.getElementById('hero-section');

                  if (hero) {

                    if (window.__lenis) {

                      window.__lenis.scrollTo(hero.offsetTop, { duration: 0.82, lock: true, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });

                    } else {

                      hero.scrollIntoView({ behavior: 'smooth' });

                    }

                  }

                }}

                className="relative h-9 px-6 min-w-[70px] rounded-xl flex items-center justify-center bg-slate-950 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-900 dark:hover:bg-slate-100 border border-slate-800 dark:border-white/20 hover:border-slate-700 dark:hover:border-white/35 shadow-xs hover:shadow-md transition-all duration-200 ease-out tactile-btn cursor-pointer group"

              >

                <ArrowRight className="w-4 h-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />

              </button>

            </div>

          </div>



          {/* Downward Mouse / Arrow Scroll Prompt — Grounded at the Bottom of Viewport */}

          <div 

            onClick={() => {

              playClick();

              const hero = document.getElementById('hero-section');

              if (hero) {

                if (window.__lenis) {

                  window.__lenis.scrollTo(hero.offsetTop, { duration: 0.82, lock: true, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });

                } else {

                  hero.scrollIntoView({ behavior: 'smooth' });

                }

              }

            }}

            id="wordmark-scroll-prompt"

            style={{

              opacity: cuesOpacity,

              visibility: cuesOpacity <= 0.01 ? 'hidden' : 'visible',

              transform: `translate3d(-50%, -${introProgress * 30}px, 0)`,

              pointerEvents: cuesOpacity <= 0.1 ? 'none' : 'auto',

              willChange: 'opacity, transform'

            }}

            className="absolute bottom-10 sm:bottom-12 md:bottom-14 lg:bottom-16 left-1/2 flex flex-col items-center gap-2 cursor-pointer group select-none opacity-80 hover:opacity-100 transition-opacity z-20"

          >

            <span className="text-[10px] font-mono tracking-widest uppercase text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">

              Scroll to inspect engine

            </span>

            <div className="w-5 h-8 rounded-full border border-slate-400/80 dark:border-white/30 flex items-start justify-center p-1 group-hover:border-slate-800 dark:group-hover:border-white transition-colors">

              <div className="w-1 h-2 rounded-full bg-slate-700 dark:bg-white animate-bounce" />

            </div>

          </div>

        </div>

      </div>



      



      {/* ══════════════════════════════════════════════════════════════════════

          1. HERO SECTION (Decluttered & Monumentally Upscaled Typography)

          ══════════════════════════════════════════════════════════════════════ */}

      <section id="hero-section" className="min-h-[100dvh] w-full flex flex-col justify-center items-center text-center relative px-6 py-20 overflow-hidden">

        {/* Soft Monochromatic Ambient Radial Halo */}

        <div 

          aria-hidden="true" 

          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[700px] h-[220px] sm:h-[360px] bg-white/[0.03] dark:bg-white/[0.03] blur-[100px] sm:blur-[140px] pointer-events-none rounded-full" 

        />



        {/* Primary Hero Heading: Monumental Display Hierarchy (Wordmark elevated to Section 0) */}

        <h1 className="max-w-6xl tracking-tight leading-[1.05] mb-8 sm:mb-12 flex flex-col items-center">

          <span className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-[4.25rem] xl:text-[4.75rem] text-balance font-black tracking-tight leading-[1.1] sm:leading-[1.04] bg-clip-text text-transparent bg-gradient-to-b from-slate-950 via-slate-900 to-slate-700 dark:from-white dark:via-slate-100 dark:to-slate-400 block pb-2 sm:pb-3 px-2 max-w-full">

            <span className="inline-block whitespace-normal break-words">Eliminating Silent Cache Rot</span>

          </span>

          <span className="text-xl sm:text-3xl md:text-4xl lg:text-[2.65rem] xl:text-[3rem] font-bold tracking-tight leading-[1.25] text-slate-600 dark:text-slate-300 block pt-2 pb-3 overflow-visible">

            <KineticRollingHeadline 

              phrases={[

                "In Autonomous AI Coding Agents",

                "Across Multi-Hop Git Commits",

                "Inside Model Context Protocols",

                "For Deterministic Agentic Workflows"

              ]}

              className="text-slate-700 dark:text-slate-200"

            />

          </span>

        </h1>


        {/* Symmetrical Dual Action CTA Buttons (Section 15 Standard, Optical Right Icons) */}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 sm:mb-14">

          <button

            onClick={() => {

              playClick();

              if (onLaunchConsole) onLaunchConsole();

            }}

            className="btn-primary group tactile-btn inline-flex items-center justify-center gap-2 leading-none"

          >

            <span>Launch Verification Console</span>

            <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />

          </button>



          <button

            onClick={handleMcpClick}

            className="btn-secondary group tactile-btn inline-flex items-center justify-center gap-2 leading-none"

          >

            <span>Connect Real MCP Agent</span>

            <McpCableConnectionSvg className="text-slate-700 dark:text-slate-300" />

          </button>

        </div>



        {/* Clean Unbracketed Monospace metrics row (Zero colored dots per Rule 3) */}

        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-[11px] font-mono text-slate-500 dark:text-slate-400 border-y border-slate-300 dark:border-white/10 py-3.5 max-w-3xl w-full">

          <div>
            <span>GATE LATENCY: <strong className="text-slate-900 dark:text-white font-bold">&lt; 15MS</strong></span>
          </div>

          <span className="hidden sm:inline-block h-3.5 w-px bg-slate-300 dark:bg-white/10 shrink-0 self-center select-none" aria-hidden="true" />

          <div>
            <span>INVALIDATION: <strong className="text-slate-900 dark:text-white font-bold">100% DETERMINISTIC</strong></span>
          </div>

          <span className="hidden sm:inline-block h-3.5 w-px bg-slate-300 dark:bg-white/10 shrink-0 self-center select-none" aria-hidden="true" />

          <div>
            <span>TRANSPORT: <strong className="text-slate-900 dark:text-white font-bold">MCP STDIO / HTTP</strong></span>
          </div>

        </div>

      </section>



      {/* ══════════════════════════════════════════════════════════════════════

          2. CORE PROBLEM SPACE: WHY VECTOR RAG FAILS CODING AGENTS

          (Zero Eyebrow Pills, Zero Tag Noise, Strictly Pure Typography)

          ══════════════════════════════════════════════════════════════════════ */}

      <section id="bento-section" className="w-full min-h-screen flex flex-col justify-center py-12 sm:py-16 px-6 max-w-7xl mx-auto border-t border-slate-300 dark:border-white/10">

        <div className="text-center mb-12">

          {/* Heading with Integrated Thanos Typewriter Dissolve — strictly NO text below */}

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-950 dark:text-white tracking-tight flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 pb-2">

            <span className="whitespace-nowrap shrink-0">Why Vector RAG Fails</span>

            <ThanosTypewriterHeadline 

              phrases={[

                "Coding Agents?",

                "Autonomous Writes?",

                "Temporal Decisions?",

                "Production Repos?"

              ]} 

            />

          </h2>

        </div>



        {/* ASYMMETRIC PROBLEM SPACE BENTO GRID */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          

          {/* Problem Card 1 (2-Column): Semantic Cosine Blindness */}

          <div className="md:col-span-2 neo-glass-card p-7 sm:p-9 flex flex-col justify-between text-left relative overflow-hidden group">

            <div>

              <div className="flex items-center gap-3 mb-4">

                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">

                  <GitBranch className="w-4 h-4 text-slate-950 dark:text-white" />

                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-slate-950 dark:text-white tracking-tight">

                  Semantic Cosine Blindness

                </h3>

              </div>

              

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">

                Active and deprecated decisions share near-identical embeddings, blinding agents to temporal succession.

              </p>



              {/* Visual Vector Collision Simulator */}

              <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-black/40 border border-slate-200 dark:border-white/5 font-mono text-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-800 dark:text-slate-300">

                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold">

                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />

                  <span>ADR-001 (Deprecated v1)</span>

                </div>

                <span className="text-slate-600 dark:text-slate-400 font-bold">≈ 0.89 Cosine Match ≈</span>

                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">

                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />

                  <span>ADR-002 (Active OAuth2)</span>

                </div>

              </div>

            </div>



            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 font-mono">

              <span>Failure: Directional Blindness</span>

              <span>RAG Probability: 50% Stale Pick</span>

            </div>

          </div>



          {/* Problem Card 2 (1-Column): Silent Cache Rot */}

          <div className="neo-glass-card p-7 sm:p-9 flex flex-col justify-between text-left relative overflow-hidden group">

            <div>

              <div className="flex items-center gap-3 mb-4">

                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">

                  <AlertTriangle className="w-4 h-4 text-slate-950 dark:text-white" />

                </div>

                <h3 className="text-xl font-bold text-slate-950 dark:text-white tracking-tight">

                  Silent Cache Rot

                </h3>

              </div>

              

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">

                Static embeddings drift out of sync as git commits mutate code.

              </p>



              <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-black/40 border border-slate-200 dark:border-white/5 font-mono text-[11px] space-y-1.5 text-slate-700 dark:text-slate-300">

                <div className="text-slate-600 dark:text-slate-400 font-medium"># Git State vs Vector DB:</div>

                <div className="text-rose-700 dark:text-rose-400 font-bold">DESYNC: 42 Commits Behind</div>

                <div className="text-slate-600 dark:text-slate-400 text-[10px]">Stale Invariant Ingested</div>

              </div>

            </div>



            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 font-mono">

              <span>Cache Integrity: 0% Guarantee</span>

              <span>Invalidation: None</span>

            </div>

          </div>



          {/* Problem Card 3 (1-Column): Unenclosed Disk Mutation */}

          <div className="neo-glass-card p-7 sm:p-9 flex flex-col justify-between text-left relative overflow-hidden group">

            <div>

              <div className="flex items-center gap-3 mb-4">

                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">

                  <FileCode2 className="w-4 h-4 text-slate-950 dark:text-white" />

                </div>

                <h3 className="text-xl font-bold text-slate-950 dark:text-white tracking-tight">

                  Unenclosed Disk IO

                </h3>

              </div>

              

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">

                Agents write directly to disk without verifying active architectural invariants.

              </p>



              <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-black/40 border border-slate-200 dark:border-white/5 font-mono text-[11px] space-y-1.5 text-slate-700 dark:text-slate-300">

                <div className="text-slate-600 dark:text-slate-400 font-medium"># Direct Execution Vulnerability:</div>

                <div className="text-rose-700 dark:text-rose-400 font-bold">DIRECT DISK WRITE</div>

                <div className="text-slate-600 dark:text-slate-400 text-[10px]">Bypasses Architecture Checks</div>

              </div>

            </div>



            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 font-mono">

              <span>Gate Protection: 0% (Raw Access)</span>

              <span>Risk: Silent Regression</span>

            </div>

          </div>



          {/* Problem Card 4 (2-Column): Multi-Hop Cascade Failures */}

          <div className="md:col-span-2 neo-glass-card p-7 sm:p-9 flex flex-col justify-between text-left relative overflow-hidden group">

            <div>

              <div className="flex items-center gap-3 mb-4">

                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">

                  <Layers className="w-4 h-4 text-slate-950 dark:text-white" />

                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-slate-950 dark:text-white tracking-tight">

                  Broken Dependency Cascades

                </h3>

              </div>

              

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">

                Flat vector search cannot traverse multi-hop graph reachability or downstream breaks.

              </p>



              <div className="p-4 rounded-xl bg-slate-100/80 dark:bg-black/40 border border-slate-200 dark:border-white/5 font-mono text-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-800 dark:text-slate-300">

                <div className="flex items-center gap-2">

                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-white" />

                  <span>ADR-001 Invalidation</span>

                </div>

                <span className="text-slate-600 dark:text-slate-400 font-bold">-- 3 Hops Lost in RAG --</span>

                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold">

                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />

                  <span>Silent Service Regression</span>

                </div>

              </div>

            </div>



            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs text-slate-500 font-mono">

              <span>Reachability: Not Computed</span>

              <span>Vector Depth: 1 Hop Max</span>

            </div>

          </div>



        </div>

      </section>

      {/* ── 2.5 ARCHITECTURAL ENCLAVE: ISOMETRIC CAUSAL MESH HUB ── */}
      <SubsystemErrorBoundary name="Causal Enclave Hub">
        <CausalEnclaveHub onLaunchConsole={onLaunchConsole} />
      </SubsystemErrorBoundary>

            {/* ══════════════════════════════════════════════════════════════════════

          3. SOLUTION SPACE: GRAPH-GROUNDED DECISION EXECUTION

          (Interactive 3D Cylindrical Visual Scrollytelling Sliding Window)

          ══════════════════════════════════════════════════════════════════════ */}

      <SubsystemErrorBoundary name="Solution Showcase">

        <CausalSolutionScroller />

      </SubsystemErrorBoundary>

      {/* ══════════════════════════════════════════════════════════════════════
          3b. SPECIFICATION COMPARISON MATRIX (Institutional Differentiation)
          ══════════════════════════════════════════════════════════════════════ */}
      <SubsystemErrorBoundary name="Architectural Comparison Matrix">
        <ArchitecturalComparisonMatrix />
      </SubsystemErrorBoundary>



      {/* ══════════════════════════════════════════════════════════════════════

          4. ARCHITECTURAL FAQ ACCORDION SECTION (CAVDAX Caliber)

          ══════════════════════════════════════════════════════════════════════ */}

      <section id="faq-section" className="w-full py-16 pro-27:pt-28 pro-27:pb-20 px-6 max-w-4xl mx-auto border-t border-slate-300 dark:border-white/10">

        <div className="text-center mb-10">

          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight">

            Frequently Asked Questions

          </h2>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto mt-2 font-sans">

            Technical clarity on causal graph provenance, silent cache rot elimination, and enclosed MCP gating.

          </p>

        </div>



        <div className="space-y-3">

          {FAQS.map((faq, idx) => {

            const isOpen = expandedFaq === idx;

            return (

              <div 

                key={idx}

                className={`p-5 rounded-2xl neo-glass-card cursor-pointer select-none transition-all duration-300 group border ${

                  isOpen 

                    ? "border-slate-400/80 dark:border-white/25 shadow-sm" 

                    : "border-slate-300/80 dark:border-white/10 hover:border-slate-400/60 dark:hover:border-white/20"

                }`}

                onClick={() => {

                  playClick();

                  setExpandedFaq(isOpen ? null : idx);

                }}

              >

                <div className="flex items-center justify-between gap-4">

                  <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white font-mono leading-snug">

                    {faq.q}

                  </span>

                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ${

                    isOpen 

                      ? "bg-slate-950 text-white border-slate-950 dark:bg-white dark:text-slate-950 dark:border-white shadow-xs" 

                      : "bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-white/10 text-slate-500 dark:text-slate-400 group-hover:border-slate-400 dark:group-hover:border-white/25 group-hover:text-slate-900 dark:group-hover:text-white"

                  }`}>

                    {/* Architectural Precision Transforming Plus-Minus SVG */}

                    <svg 

                      viewBox="0 0 16 16" 

                      className={`w-3.5 h-3.5 overflow-visible transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? "rotate-180" : "rotate-0"}`} 

                      fill="none" 

                      stroke="currentColor" 

                      strokeWidth="1.75" 

                      strokeLinecap="round"

                    >

                      {/* Constant horizontal stroke (minus bar) */}

                      <line x1="3.5" y1="8" x2="12.5" y2="8" />

                      {/* Transforming vertical stroke: rotates 90deg and scales down to 0 on open */}

                      <line 

                        x1="8" 

                        y1="3.5" 

                        x2="8" 

                        y2="12.5" 

                        style={{ transformOrigin: "8px 8px" }}

                        className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${

                          isOpen ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"

                        }`}

                      />

                    </svg>

                  </span>

                </div>

                <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>

                  <div className="overflow-hidden">

                    <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans border-t border-slate-200 dark:border-white/5 pt-3">

                      {faq.a}

                    </p>

                  </div>

                </div>

              </div>

            );

          })}

        </div>

      </section>



      {/* ══════════════════════════════════════════════════════════════════════

          5. CONTINUOUS PROVENANCE RADAR (Real-Time Invalidation Sweeper Climax)

          ══════════════════════════════════════════════════════════════════════ */}

      <CausalProvenanceRadar onLaunchConsole={onLaunchConsole} />



      {/* ══════════════════════════════════════════════════════════════════════

          6. ACTION CTA SECTION

          ══════════════════════════════════════════════════════════════════════ */}

      <section id="cta-section" className="w-full py-20 px-6 max-w-4xl mx-auto border-t border-slate-300 dark:border-white/10 text-center">

        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-950 dark:text-white mb-4 tracking-tight">

          <span className="inline-block whitespace-nowrap">Ready to Witness</span>{' '}

          <span className="inline-block whitespace-nowrap">Graph-Grounded Verification?</span>

        </h2>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto mb-8 font-mono px-4">

          Launch the interactive verification console or connect your local coding agent over standard MCP stdio.

        </p>



        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">

          <button

            onClick={() => {

              playClick();

              if (onLaunchConsole) onLaunchConsole();

            }}

            className="btn-primary group tactile-btn inline-flex items-center justify-center gap-2 leading-none"

          >

            <span>Launch Verification Console</span>

            <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" />

          </button>



          <button

            onClick={handleMcpClick}

            className="btn-secondary group tactile-btn inline-flex items-center justify-center gap-2 leading-none"

          >

            <span>Connect Real MCP Agent</span>

            <McpCableConnectionSvg className="text-slate-700 dark:text-slate-300" />

          </button>

        </div>

      </section>



      {/* ══════════════════════════════════════════════════════════════════════

          5. STIPPLED CYAN PARTICLE TYPOGRAPHY FOOTER (Sole Cyan Exception)

          ══════════════════════════════════════════════════════════════════════ */}

      <FooterParticles text="CAVDAX" onSelectTab={onSelectTab} onLaunchConsole={onLaunchConsole} />





    </div>

  );

}

