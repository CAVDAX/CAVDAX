import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Github, 
  ExternalLink, 
  Copy, 
  Check, 
  SlidersHorizontal,
  FileCode2,
  Terminal,
  Clock,
  Youtube,
  ChevronDown,
  List,
  X
} from 'lucide-react';
import McpCableConnectionSvg from './McpCableConnectionSvg';
import { playClick } from '../utils/soundFx';

const YOUTUBE_VIDEO_ID = 'Nhdd7spj1RA';

const ACTS = [
  {
    id: 1,
    act: 'Act I',
    title: 'Vector RAG Failure & Drift',
    time: '0:00',
    seconds: 0,
    desc: 'Why cosine similarity fails and FalkorDB resolves precedence.'
  },
  {
    id: 2,
    act: 'Act II',
    title: 'Published MCP Gate Daemon',
    time: '1:42',
    seconds: 102,
    desc: 'Universal stdio & SSE setup for Claude Code, Cursor, and Windsurf.'
  },
  {
    id: 3,
    act: 'Act III',
    title: 'Live Interception & Repair',
    time: '3:15',
    seconds: 195,
    desc: 'Stale Redis write blocked; self-correction to DynamoDB DAX.'
  },
  {
    id: 4,
    act: 'Act IV',
    title: 'Connected GitHub Graph Sync',
    time: '6:08',
    seconds: 368,
    desc: 'Live repository scan, 1-click ADR PR, and verified audit log.'
  }
];

const TOTAL_DURATION_SECONDS = 621;

const KEY_MOMENTS = [
  { label: 'Cosine Blindness', time: '0:33', seconds: 33 },
  { label: 'Verification Console', time: '1:22', seconds: 82 },
  { label: 'MCP Config Guides', time: '1:42', seconds: 102 },
  { label: 'npm run doctor', time: '2:45', seconds: 165 },
  { label: 'Act I Baseline Ingestion', time: '3:15', seconds: 195 },
  { label: 'Act II ADR-004 Mutation', time: '4:00', seconds: 240 },
  { label: 'Act III Stale Redis Blocked', time: '4:30', seconds: 270 },
  { label: 'Act IV DynamoDB DAX Self-Correction', time: '5:15', seconds: 315 },
  { label: 'Connected GitHub Graph', time: '6:08', seconds: 368 },
  { label: '1-Click GitHub PR Sync', time: '8:35', seconds: 515 },
  { label: 'Agent Action Audit Log', time: '8:58', seconds: 538 },
  { label: 'System Preferences & Alerts', time: '9:30', seconds: 570 },
  { label: 'Team Contrarians Credits', time: '10:02', seconds: 602 }
];

export default function ProjectVideoPage({ onLaunchConsole, onOpenMcpPage }) {
  const [activeAct, setActiveAct] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(null);
  const [isChaptersOpen, setIsChaptersOpen] = useState(false);
  const [activeMoment, setActiveMoment] = useState(KEY_MOMENTS[0]);
  const [hoveredMoment, setHoveredMoment] = useState(null);
  const [canScrollDown, setCanScrollDown] = useState(true);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const playerRef = useRef(null);
  const iframeRef = useRef(null);
  const chaptersRef = useRef(null);
  const buttonRef = useRef(null);
  const chapterListRef = useRef(null);

  const checkScrollCues = useCallback(() => {
    if (chapterListRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chapterListRef.current;
      setCanScrollUp(scrollTop > 6);
      setCanScrollDown(scrollTop + clientHeight < scrollHeight - 6);
    }
  }, []);

  useEffect(() => {
    if (isChaptersOpen) {
      const t = setTimeout(checkScrollCues, 50);
      return () => clearTimeout(t);
    }
  }, [isChaptersOpen, checkScrollCues]);

  // Close chapters popover on outside click or Escape
  useEffect(() => {
    if (!isChaptersOpen) return;
    const handleClickOutside = (e) => {
      if (
        chaptersRef.current && 
        !chaptersRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsChaptersOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsChaptersOpen(false);
        return;
      }

      // Trap and route arrow/page scrolling exclusively into the chapters drawer
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        if (chapterListRef.current) {
          chapterListRef.current.scrollBy({ top: 48, behavior: 'smooth' });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        if (chapterListRef.current) {
          chapterListRef.current.scrollBy({ top: -48, behavior: 'smooth' });
        }
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        e.stopPropagation();
        if (chapterListRef.current) {
          chapterListRef.current.scrollBy({ top: 180, behavior: 'smooth' });
        }
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        e.stopPropagation();
        if (chapterListRef.current) {
          chapterListRef.current.scrollBy({ top: -180, behavior: 'smooth' });
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        e.stopPropagation();
        if (chapterListRef.current) {
          chapterListRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (e.key === 'End') {
        e.preventDefault();
        e.stopPropagation();
        if (chapterListRef.current) {
          chapterListRef.current.scrollTo({ top: chapterListRef.current.scrollHeight, behavior: 'smooth' });
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isChaptersOpen]);

  // Initialize YouTube IFrame API
  useEffect(() => {
    let isMounted = true;

    const setupPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      try {
        if (playerRef.current && typeof playerRef.current.destroy === 'function') {
          playerRef.current.destroy();
        }
        playerRef.current = new window.YT.Player('cavdax-yt-iframe', {
          events: {
            onReady: () => {
              if (isMounted) {
                // Player ready
              }
            },
            onStateChange: (event) => {
              if (!isMounted) return;
              if (event.data === 1) setIsPlaying(true);
              else if (event.data === 2 || event.data === 0) setIsPlaying(false);
            }
          }
        });
      } catch (e) {
        console.warn('CAVDAX: YouTube player initialization handled via postMessage interface:', e);
      }
    };

    if (window.YT && window.YT.Player) {
      setupPlayer();
    } else {
      const existingTag = document.getElementById('youtube-iframe-api');
      if (!existingTag) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScript = document.getElementsByTagName('script')[0];
        if (firstScript && firstScript.parentNode) {
          firstScript.parentNode.insertBefore(tag, firstScript);
        } else {
          document.head.appendChild(tag);
        }
      }

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        if (isMounted) setupPlayer();
      };
    }

    return () => {
      isMounted = false;
      if (playerRef.current && typeof playerRef.current.destroy === 'function') {
        try {
          playerRef.current.destroy();
        } catch {}
      }
    };
  }, []);

  const seekToSeconds = useCallback((seconds, actIndex = null) => {
    playClick();
    if (actIndex !== null) {
      setActiveAct(actIndex);
    } else {
      for (let i = ACTS.length - 1; i >= 0; i--) {
        if (seconds >= ACTS[i].seconds) {
          setActiveAct(i);
          break;
        }
      }
    }

    const matchedMoment = KEY_MOMENTS.find(km => km.seconds === seconds);
    if (matchedMoment) setActiveMoment(matchedMoment);

    const validSec = Math.max(0, Math.min(622, Number(seconds) || 0));

    // Try YouTube Player API first
    if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
      try {
        playerRef.current.seekTo(validSec, true);
        playerRef.current.playVideo();
        setIsPlaying(true);
        return;
      } catch {}
    }

    // Fallback: postMessage command directly to iframe with strict target origin
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const targetOrigin = 'https://www.youtube-nocookie.com';
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [validSec, true] }),
        targetOrigin
      );
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: [] }),
        targetOrigin
      );
      setIsPlaying(true);
    }
  }, []);

  const handleCopy = (text, key) => {
    playClick();
    navigator.clipboard.writeText(text);
    setCopiedCmd(key);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div className="w-full flex-1 flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-200 select-none relative overflow-hidden pt-24 sm:pt-28 pb-20 px-4 sm:px-6">
      {/* Background Watermark */}
      <div 
        aria-hidden="true" 
        className="absolute inset-0 pointer-events-none flex items-center justify-center select-none -z-0 overflow-hidden"
      >
        <span className="text-[16vw] font-black tracking-tighter text-slate-950/[0.04] dark:text-white/[0.03] leading-none font-mono">
          PROJECT
        </span>
      </div>

      <div className="max-w-5xl mx-auto w-full relative z-10 flex flex-col items-center">
        {/* Header Cluster */}
        <div id="project-overview" className="text-center mb-8">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 dark:text-white mb-3">
            System Demonstration
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed font-sans">
            End-to-end demonstration of FalkorDB causal invalidation, real-time MCP write protection, and autonomous agent self-correction.
          </p>
        </div>

        {/* Cinema Video Frame */}
        <div id="project-video" className="w-full neo-glass-card p-3 sm:p-5 rounded-2xl sm:rounded-3xl mb-8 overflow-hidden shadow-2xl">
          <div className="relative aspect-video w-full rounded-xl sm:rounded-2xl bg-[#07090D] border border-slate-300 dark:border-white/10 overflow-hidden flex flex-col justify-between group shadow-inner">
            {/* Ambient Video Glow */}
            <div 
              aria-hidden="true"
              className="absolute inset-0 bg-radial from-slate-800/20 via-transparent to-transparent pointer-events-none z-10"
            />

            {/* Real YouTube Video Embed */}
            <iframe
              ref={iframeRef}
              id="cavdax-yt-iframe"
              title="CAVDAX — Architecture Verification MCP For Autonomous AI Agents (FalkorDB GraphBLAS)"
              src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_VIDEO_ID}?enablejsapi=1&origin=${typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : ''}&rel=0&modestbranding=1&iv_load_policy=3&color=white`}
              className="w-full h-full border-0 absolute inset-0 z-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />

            {/* In-Player Chapter Sidebar Trigger Tab (Center-Right Floating HUD) */}
            {!isChaptersOpen && (
              <div className="absolute top-1/2 -translate-y-1/2 right-0 z-20 pointer-events-auto">
                <button
                  ref={buttonRef}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playClick();
                    setIsChaptersOpen(true);
                  }}
                  aria-expanded={isChaptersOpen}
                  aria-label="Open Chapters Sidebar"
                  className="group flex items-center gap-2 pl-3 pr-2.5 py-2.5 rounded-l-xl backdrop-blur-md bg-slate-950/80 hover:bg-slate-950 text-white border-y border-l border-white/20 hover:border-white/40 shadow-2xl transition-all duration-200 cursor-pointer"
                  title="View Video Chapters"
                >
                  <List size={14} className="text-slate-300 group-hover:text-white transition-colors shrink-0" />
                  <span className="font-mono text-xs font-semibold overflow-hidden max-w-0 group-hover:max-w-[85px] transition-all duration-300 ease-out whitespace-nowrap opacity-0 group-hover:opacity-100">
                    Chapters
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/15 font-mono text-slate-300 font-bold shrink-0">
                    {KEY_MOMENTS.length}
                  </span>
                </button>
              </div>
            )}

            {/* In-Player Right Chapter Sidebar (YouTube-Style Drawer) */}
            <AnimatePresence>
              {isChaptersOpen && (
                <>
                  {/* Scrim Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => setIsChaptersOpen(false)}
                    className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-30 cursor-pointer pointer-events-auto"
                    aria-hidden="true"
                  />

                  {/* Right-Hand Drawer */}
                  <motion.aside
                    ref={chaptersRef}
                    data-lenis-prevent
                    onWheel={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-label="Video Chapters Drawer"
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    className="absolute top-0 right-0 bottom-0 w-[290px] sm:w-[330px] md:w-[360px] max-w-[85%] z-40 bg-slate-950/95 border-l border-white/15 backdrop-blur-xl flex flex-col shadow-2xl text-white select-none pointer-events-auto overscroll-contain"
                  >
                    {/* Header */}
                    <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                          Chapters
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 font-mono text-slate-300">
                          {KEY_MOMENTS.length}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          playClick();
                          setIsChaptersOpen(false);
                        }}
                        className="p-1 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        aria-label="Close Chapters Sidebar"
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {/* Top Scroll Shadow Cue (Visible when scrolled down) */}
                    {canScrollUp && (
                      <div 
                        aria-hidden="true" 
                        className="pointer-events-none absolute top-[49px] left-0 right-0 h-6 bg-gradient-to-b from-slate-950 via-slate-950/80 to-transparent z-10 transition-opacity duration-200"
                      />
                    )}

                    {/* Scrollable List */}
                    <div 
                      ref={chapterListRef}
                      data-lenis-prevent
                      onWheel={(e) => e.stopPropagation()}
                      onScroll={checkScrollCues}
                      tabIndex={0}
                      className="flex-1 overflow-y-auto overscroll-contain divide-y divide-white/5 p-2 scrollbar-thin [scrollbar-color:rgba(255,255,255,0.2)_transparent] outline-none"
                    >
                      {KEY_MOMENTS.map((km, idx) => {
                        const isCurrent = activeMoment?.seconds === km.seconds;
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              seekToSeconds(km.seconds);
                              setActiveMoment(km);
                            }}
                            className={`w-full px-3 py-2.5 rounded-lg text-left text-xs font-mono transition-all flex items-center justify-between group cursor-pointer ${
                              isCurrent
                                ? 'bg-white/20 text-white font-bold shadow-inner'
                                : 'hover:bg-white/5 text-slate-300 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0 ${
                                isCurrent
                                  ? 'bg-white text-slate-950'
                                  : 'bg-white/10 text-slate-400 group-hover:text-white'
                              }`}>
                                {km.time}
                              </span>
                              <span className="truncate text-[12px]">{km.label}</span>
                            </div>
                            <Play size={11} className={`opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${
                              isCurrent ? 'opacity-100 text-amber-400' : 'text-slate-400'
                            }`} />
                          </button>
                        );
                      })}
                    </div>

                    {/* Bottom Scroll Cue (Visible when more chapters exist below) */}
                    {canScrollDown && (
                      <div 
                        aria-hidden="true" 
                        className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent z-10 flex items-end justify-center pb-1 transition-opacity duration-200"
                      >
                        <ChevronDown size={13} className="text-white/40" />
                      </div>
                    )}
                  </motion.aside>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* 4 Primary Acts Selector Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-3.5 border-t border-slate-200 dark:border-white/5">
            {ACTS.map((actItem, idx) => (
              <button
                key={actItem.id}
                onClick={() => seekToSeconds(actItem.seconds, idx)}
                className={`p-4 rounded-xl text-left transition-all text-xs border cursor-pointer flex flex-col justify-between ${
                  activeAct === idx
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-transparent shadow-md'
                    : 'bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.03] dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider opacity-70">{actItem.act}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono font-semibold">{actItem.time}</span>
                  </div>
                  <div className="font-sans font-bold text-[13px] tracking-tight leading-snug mb-1.5 whitespace-nowrap overflow-hidden text-ellipsis sm:whitespace-normal" title={actItem.title}>{actItem.title}</div>
                </div>
                <div className="text-[11px] font-sans font-normal opacity-75 leading-relaxed mt-1">{actItem.desc}</div>
              </button>
            ))}
          </div>

          {/* Dual-Mode Precision Hardware Scrubber Rail */}
          <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-white/5 relative">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <Clock size={12} className="text-slate-700 dark:text-slate-300" />
                <span className="font-semibold text-slate-900 dark:text-slate-200">Interactive Causal Timeline</span>
              </div>

              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-2">
                {hoveredMoment ? (
                  <span className="text-slate-900 dark:text-slate-200 font-medium">
                    {hoveredMoment.time} — {hoveredMoment.label}
                  </span>
                ) : (
                  <span>{(activeMoment || KEY_MOMENTS[0]).time} — {(activeMoment || KEY_MOMENTS[0]).label}</span>
                )}
              </div>
            </div>

            {/* Precision Hardware Scrubber Rail */}
            <div className="pt-2 pb-1 px-1">
              <div 
                className="relative w-full h-8 flex items-center"
                onMouseLeave={() => setHoveredMoment(null)}
              >
                {/* Hairline Groove Track */}
                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 relative overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-slate-400/40 via-slate-500/50 to-slate-400/40 dark:from-white/20 dark:via-white/30 dark:to-white/20 w-full" />
                </div>

                {/* 13 Calibrated Pips along the timeline */}
                {KEY_MOMENTS.map((km, idx) => {
                  const percent = (km.seconds / TOTAL_DURATION_SECONDS) * 100;
                  const isHovered = hoveredMoment?.seconds === km.seconds;
                  const isActive = activeMoment?.seconds === km.seconds;

                  return (
                    <div
                      key={idx}
                      style={{ left: `${percent}%` }}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group"
                    >
                      {/* Hover Tooltip */}
                      {isHovered && (
                        <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-md bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-[10px] font-mono font-medium shadow-xl border border-white/15 whitespace-nowrap z-50 pointer-events-none flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100">
                          <span className="font-bold opacity-70">{km.time}</span>
                          <span>•</span>
                          <span>{km.label}</span>
                          {/* Micro Caret */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-950 dark:border-t-white" />
                        </div>
                      )}

                      {/* Clickable Pip Button */}
                      <button
                        onClick={() => {
                          seekToSeconds(km.seconds);
                          setActiveMoment(km);
                        }}
                        onMouseEnter={() => setHoveredMoment(km)}
                        onFocus={() => setHoveredMoment(km)}
                        onBlur={() => setHoveredMoment(null)}
                        aria-label={`Jump to ${km.time}: ${km.label}`}
                        className={`w-3 h-3 rounded-full transition-all duration-150 flex items-center justify-center cursor-pointer ${
                          isActive
                            ? 'bg-slate-950 dark:bg-white ring-4 ring-slate-400/40 dark:ring-white/40 scale-125 z-20'
                            : isHovered
                            ? 'bg-slate-800 dark:bg-slate-200 ring-2 ring-slate-400/50 scale-125 z-10'
                            : 'bg-slate-400 dark:bg-slate-600 hover:bg-slate-800 dark:hover:bg-white border border-white dark:border-slate-900'
                        }`}
                      >
                        <span className="sr-only">{km.time} {km.label}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Rail Baseline Ticks Label */}
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 dark:text-slate-400 px-0.5 mt-0.5">
                <span>0:00 Ingestion</span>
                <span className="hidden sm:inline text-slate-400 dark:text-slate-500">10m 22s Complete Walkthrough</span>
                <span>10:22 Credits</span>
              </div>
            </div>
          </div>
        </div>

        {/* Open Source GNU GPL 3.0 & Repo Information */}
        <div id="project-license" className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Box 1: Open Source License Guarantee */}
          <div className="neo-glass-card p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileCode2 size={18} className="text-slate-800 dark:text-slate-200" />
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-950 dark:text-white">
                  GNU General Public License v3.0
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans mb-3">
                100% free and open-source software under GPL-3.0. Complete freedom to audit, run, self-host, and inspect the codebase.
              </p>

              {/* Architectural Freedom Guarantees (Clean Bench-Instrument Plates) */}
              <div className="mt-2.5">
                {/* Guarantee 1 */}
                <div className="mb-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Engine &amp; Graph Portability:
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10">
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-white leading-snug [text-wrap:balance]">
                      Full Cypher graph transparency and zero vendor&nbsp;lock-in
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-0.5 leading-relaxed [text-wrap:balance]">
                      Deterministic FalkorDB GraphBLAS execution with auditable DAG traversal and offline schema&nbsp;portability.
                    </div>
                  </div>
                </div>

                {/* Guarantee 2 */}
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Commercial &amp; Deployment Freedom:
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10">
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-white leading-snug [text-wrap:balance]">
                      Permission to modify, commercialize, and self-host&nbsp;offline
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-0.5 leading-relaxed [text-wrap:balance]">
                      Complete autonomy to adapt verification gates for enterprise repos, local CI/CD pipelines, and air-gapped agent&nbsp;swarms.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">License: GPL-3.0</span>
              <a 
                href="https://www.gnu.org/licenses/gpl-3.0.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-800 dark:text-white hover:underline inline-flex items-center gap-1"
              >
                <span>Read License</span>
                <ExternalLink size={11} />
              </a>
            </div>
          </div>

          {/* Box 2: Quick Start Terminal Commands */}
          <div className="neo-glass-card p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Terminal size={18} className="text-slate-800 dark:text-slate-200" />
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-950 dark:text-white">
                  Local Setup & Verification
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-sans mb-3">
                Clone the repository and launch the full FalkorDB and MCP mesh locally in under 60 seconds:
              </p>

              {/* Code Snippet 1 */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                  <span>Clone Repository:</span>
                  <button 
                    onClick={() => handleCopy('git clone https://github.com/suneetchugh-dev/CAVDAX.git', 'clone')}
                    className="hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCmd === 'clone' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    <span>{copiedCmd === 'clone' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800">
                  <code>git clone https://github.com/suneetchugh-dev/CAVDAX.git</code>
                </div>
              </div>

              {/* Code Snippet 2 */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1">
                  <span>Start Stack via Docker:</span>
                  <button 
                    onClick={() => handleCopy('docker compose up --build -d', 'docker')}
                    className="hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCmd === 'docker' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    <span>{copiedCmd === 'docker' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto border border-slate-800">
                  <code>docker compose up --build -d</code>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500">Port: 5173 (HUD) • 6379 (FalkorDB)</span>
              <a 
                href="https://github.com/suneetchugh-dev/CAVDAX" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-800 dark:text-white hover:underline inline-flex items-center gap-1 font-bold"
              >
                <Github size={13} />
                <span>GitHub Repository</span>
              </a>
            </div>
          </div>
        </div>

        {/* Navigation CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => {
              playClick();
              if (onLaunchConsole) onLaunchConsole();
            }}
            className="btn-primary inline-flex items-center gap-2 tactile-btn cursor-pointer"
          >
            <SlidersHorizontal size={14} />
            <span>Launch Verification Console</span>
          </button>

          <button
            onClick={() => {
              playClick();
              if (onOpenMcpPage) onOpenMcpPage();
            }}
            className="btn-secondary inline-flex items-center gap-2 tactile-btn group cursor-pointer"
          >
            <span>Connect Real MCP Agent</span>
            <McpCableConnectionSvg className="text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
}
