import React, { useRef, useEffect, useState } from 'react';
import { Terminal, AlertTriangle, CheckCircle2, Clock, FileCode, Cpu } from 'lucide-react';
import CavdaxAgentStateIndicator from './CavdaxAgentStateIndicator';

export default function TerminalView({ terminalLogs, activeVerdict, latestAction, currentAct, agentState = 'idle' }) {
  const logContainerRef = useRef(null);
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(1);
  const [isHolding, setIsHolding] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isHoldingRef = useRef(false);
  const rafIdRef = useRef(null);

  const updateScrollProgress = () => {
    if (!logContainerRef.current) return;
    const el = logContainerRef.current;
    const maxScroll = el.scrollHeight - el.clientHeight;
    const ratio = maxScroll > 0 ? Math.min(1, Math.max(0, el.scrollTop / maxScroll)) : 1;
    setScrollProgress(ratio);
    if (thumbRef.current && !isHoldingRef.current) {
      thumbRef.current.style.top = `${Math.min(94, Math.max(6, ratio * 100))}%`;
    }
  };

  const handleScroll = () => {
    if (!isHoldingRef.current) {
      updateScrollProgress();
    }
  };

  const scrollToRatio = (ratio) => {
    if (!logContainerRef.current) return;
    const el = logContainerRef.current;
    const maxScroll = el.scrollHeight - el.clientHeight;
    el.scrollTop = ratio * maxScroll;
    if (thumbRef.current) {
      thumbRef.current.style.top = `${Math.min(94, Math.max(6, ratio * 100))}%`;
    }
  };

  const handleKeyDown = (e) => {
    if (!logContainerRef.current) return;
    const el = logContainerRef.current;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      el.scrollBy({ top: 44, behavior: 'smooth' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      el.scrollBy({ top: -44, behavior: 'smooth' });
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      el.scrollBy({ top: 180, behavior: 'smooth' });
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      el.scrollBy({ top: -180, behavior: 'smooth' });
    } else if (e.key === 'Home') {
      e.preventDefault();
      el.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (e.key === 'End') {
      e.preventDefault();
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (!trackRef.current) return;

    isHoldingRef.current = true;
    setIsHolding(true);

    try {
      trackRef.current.setPointerCapture(e.pointerId);
    } catch {}

    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    scrollToRatio(ratio);

    const onPointerMove = (moveEvent) => {
      if (!isHoldingRef.current || !trackRef.current) return;
      moveEvent.preventDefault();
      
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

      rafIdRef.current = requestAnimationFrame(() => {
        if (!trackRef.current || !isHoldingRef.current) return;
        const curRect = trackRef.current.getBoundingClientRect();
        const curRatio = Math.min(1, Math.max(0, (moveEvent.clientY - curRect.top) / curRect.height));
        scrollToRatio(curRatio);
      });
    };

    const onPointerUp = (upEvent) => {
      isHoldingRef.current = false;
      setIsHolding(false);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      try {
        if (trackRef.current) trackRef.current.releasePointerCapture(upEvent.pointerId);
      } catch {}
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      updateScrollProgress();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      updateScrollProgress();
    }
  }, [terminalLogs]);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-[#0B0D11] border-r border-slate-300 dark:border-white/10 select-none">
      {/* Terminal Title Bar */}
      <div className="h-10 px-4 bg-slate-100 dark:bg-[#060709] border-b border-slate-300 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Monochromatic Window Dots */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-white/30" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-white/20" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-white/10" />
          </div>
          <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-300 ml-2 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
            CAVDAX Agent Enclosed MCP Terminal
          </span>
        </div>

        {/* Live Agent HUD & Gate Verdict Badge */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white dark:bg-[#0B0D11] border border-slate-300 dark:border-white/10 text-[10px] font-mono text-slate-800 dark:text-slate-300">
            <CavdaxAgentStateIndicator status={agentState} size={18} strokeWidth={4} />
            <span className="uppercase tracking-wider font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline">
              {agentState === 'reasoning'
                ? 'Reasoning'
                : agentState === 'executing'
                ? 'Evaluating'
                : agentState === 'verified'
                ? 'Verified'
                : agentState === 'rejected'
                ? 'Rejected'
                : 'Standby'}
            </span>
          </div>

          {activeVerdict && (
            <div className="flex items-center gap-1.5">
              {activeVerdict === 'BLOCKED' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-100 dark:bg-[#2A080E] border border-rose-300 dark:border-rose-500/40 text-[10px] font-mono font-bold text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  403 MCP GATE BLOCKED
                </span>
              ) : activeVerdict === 'APPROVED' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-[#06261B] border border-emerald-300 dark:border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  200 MCP GATE APPROVED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-200 dark:bg-[#161B22] border border-slate-300 dark:border-white/10 text-[10px] font-mono text-slate-600 dark:text-slate-400">
                  <Clock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  STANDBY
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Visual Gate Alert Banner (MCP Interceptor Gate) */}
      <div data-tour="mcp-gate" className="w-full">
        {currentAct === 1 && (
          <div className="p-3 bg-slate-50 dark:bg-[#0E1118] border-b border-slate-300 dark:border-white/10 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Cpu className="w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-slate-900 dark:text-slate-200 font-mono tracking-wide">
                  MCP ENCLOSED VERIFICATION GATE: ACTIVE MONITORING
                </div>
                <div className="text-slate-600 dark:text-slate-400 mt-0.5 font-mono text-[11px]">
                  FalkorDB GraphBLAS gate active. Enclosing autonomous tool write invocations in &lt; 15ms.
                </div>
              </div>
            </div>
            <div className="shrink-0 p-1 rounded-xl bg-white dark:bg-[#060709] border border-slate-300 dark:border-white/10">
              <CavdaxAgentStateIndicator status="idle" size={38} strokeWidth={4} />
            </div>
          </div>
        )}

        {currentAct === 2 && (
          <div className="p-3 bg-amber-50/60 dark:bg-[#1a1408] border-b border-amber-200 dark:border-amber-900/40 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Cpu className="w-5 h-5 text-amber-600 dark:text-[#d9a353] shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-amber-950 dark:text-[#fef08a] font-mono tracking-wide">
                  INGESTION PIPELINE: EVALUATING AST &amp; INVALIDATING DAG
                </div>
                <div className="text-amber-900/80 dark:text-amber-200/80 mt-0.5 font-mono text-[11px]">
                  AST parser parsed superseding ADR-002; GraphBLAS actively recomputing dependency reachability in 2.1ms.
                </div>
              </div>
            </div>
            <div className="shrink-0 p-1 rounded-xl bg-white dark:bg-[#060709] border border-amber-300 dark:border-amber-500/30">
              <CavdaxAgentStateIndicator status="executing" size={40} strokeWidth={4} />
            </div>
          </div>
        )}

        {currentAct === 3 && (
          <div className="p-3 bg-rose-50 dark:bg-[#2A080E] border-b border-rose-200 dark:border-rose-900/50 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-rose-900 dark:text-rose-300 font-mono tracking-wide">
                  EXECUTION INTERCEPTED: BLOCKED_SUPERSEDED_SOURCE
                </div>
                <div className="text-rose-800/90 dark:text-rose-200/90 mt-0.5 font-mono text-[11px]">
                  FalkorDB Cypher traversal verified that <span className="font-bold text-slate-900 dark:text-white">DEC-102</span> depends on <span className="text-rose-700 dark:text-rose-300 font-bold">ADR-001 (SUPERSEDED)</span>. Zero files written to disk.
                </div>
              </div>
            </div>
            <div className="shrink-0 p-1 rounded-xl bg-white dark:bg-[#060709] border border-rose-300 dark:border-rose-500/30">
              <CavdaxAgentStateIndicator status="rejected" size={40} strokeWidth={4} />
            </div>
          </div>
        )}

        {currentAct === 4 && (
          <div className="p-3 bg-emerald-50 dark:bg-[#06261B] border-b border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-emerald-900 dark:text-emerald-300 font-mono tracking-wide">
                  VERIFIED CAUSAL PROVENANCE: APPROVED
                </div>
                <div className="text-emerald-800/90 dark:text-emerald-200/90 mt-0.5 font-mono text-[11px]">
                  <span className="font-bold text-slate-900 dark:text-white">DEC-103</span> verified against fresh source <span className="text-emerald-700 dark:text-emerald-300 font-bold">ADR-002 (ACTIVE)</span>. Code written to <span className="font-bold text-slate-900 dark:text-white">payment.js</span>.
                </div>
              </div>
            </div>
            <div className="shrink-0 p-1 rounded-xl bg-white dark:bg-[#060709] border border-emerald-300 dark:border-emerald-500/30">
              <CavdaxAgentStateIndicator status="verified" size={40} strokeWidth={4} />
            </div>
          </div>
        )}
      </div>

      {/* Code Payload Inspector (Diff View) */}
      {latestAction && (
        <div className="p-3 bg-slate-100 dark:bg-[#08090A] border-b border-slate-300 dark:border-white/10 text-xs font-mono">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-300">
              <FileCode className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
              Target: <span className="text-slate-950 dark:text-white font-bold">{latestAction.filePath}</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 font-mono">
              Decision: {latestAction.decisionId}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-white dark:bg-[#060709] border border-slate-300 dark:border-white/10 overflow-x-auto text-[11px] text-slate-900 dark:text-slate-200 leading-relaxed max-h-36">
            <pre><code>{latestAction.codeSnippet}</code></pre>
          </div>
        </div>
      )}

      {/* Terminal Log Console with Activated Architectural Scroll Cue */}
      <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
        <style>{`
          /* Pure Mini Scroll Cue Only: Browser scrollbars completely suppressed */
          .terminal-cue-only-scroll {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .terminal-cue-only-scroll::-webkit-scrollbar {
            display: none;
            width: 0;
            height: 0;
          }
        `}</style>

        {/* Universal Architectural Scroll Cue & Rail Scrubber (Active on Click, Wheel, Trackpad & Arrows) */}
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          className="absolute right-1.5 top-3 bottom-3 w-4 flex items-center justify-center cursor-pointer select-none z-20 group"
          title="Click or drag to scrub terminal output (Arrow keys enabled on click)"
          aria-label="Terminal scroll cue and rail scrubber"
        >
          {/* Architectural Rail Line: subtle glow on panel focus/hover, solid on drag */}
          <div
            className={`w-[2px] h-full rounded-full bg-slate-300 dark:bg-white/20 transition-all duration-200 pointer-events-none ${
              isHolding
                ? 'opacity-100 scale-y-100'
                : isFocused
                ? 'opacity-60 scale-y-100'
                : 'opacity-0 group-hover:opacity-40 scale-y-75 group-hover:scale-y-100'
            }`}
          />

          {/* Thumb / Cue Indicator:
              - Resting: Discrete floating scroll cue pill (w-1.5 h-5 bg-slate-400 dark:bg-white/40).
              - Active on Focus: Luminous indicator (w-1.5 h-6 bg-slate-800 dark:bg-white/90).
              - Holding / Scrubbing: Expanded luminous thumb (w-2.5 h-7).
          */}
          <div
            ref={thumbRef}
            style={{
              top: `${Math.min(94, Math.max(6, scrollProgress * 100))}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className={`absolute left-1/2 rounded-full pointer-events-none transition-all ${
              isHolding
                ? 'w-2.5 h-7 bg-slate-950 dark:bg-white shadow-[0_0_12px_rgba(0,0,0,0.4)] dark:shadow-[0_0_12px_rgba(255,255,255,0.7)] duration-75'
                : isFocused
                ? 'w-1.5 h-6 bg-slate-800 dark:bg-white/90 shadow-[0_0_8px_rgba(0,0,0,0.25)] dark:shadow-[0_0_8px_rgba(255,255,255,0.5)] duration-150'
                : 'w-1.5 h-5 bg-slate-400 dark:bg-white/40 group-hover:bg-slate-700 dark:group-hover:bg-white/80 group-hover:h-6 duration-200'
            }`}
          />
        </div>

        <div
          ref={logContainerRef}
          tabIndex={0}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          data-lenis-prevent
          className="flex-1 p-4 pr-5 overflow-y-auto overscroll-contain terminal-cue-only-scroll font-mono text-xs space-y-2 select-text outline-none focus-visible:ring-1 focus-visible:ring-slate-300 dark:focus-visible:ring-white/20 transition-all cursor-text"
        >
        {terminalLogs.map((log, index) => {
          let badgeColor = 'text-slate-800 dark:text-slate-300';
          let borderClass = 'border-slate-200 dark:border-white/10';
          let bgClass = 'bg-white dark:bg-[#11141B]';

          if (log.type === 'GATE_BLOCK') {
            badgeColor = 'text-rose-800 dark:text-rose-300 font-bold';
            borderClass = 'border-rose-300 dark:border-rose-900/40';
            bgClass = 'bg-rose-50 dark:bg-[#2A080E]/60';
          } else if (log.type === 'GATE_APPROVE') {
            badgeColor = 'text-emerald-800 dark:text-emerald-300 font-bold';
            borderClass = 'border-emerald-300 dark:border-emerald-900/40';
            bgClass = 'bg-emerald-50 dark:bg-[#06261B]/60';
          } else if (log.type === 'CASCADE') {
            badgeColor = 'text-slate-900 dark:text-slate-200 font-bold';
            borderClass = 'border-slate-300 dark:border-white/20';
            bgClass = 'bg-slate-100 dark:bg-white/[0.04]';
          } else if (log.type === 'REVALIDATION') {
            badgeColor = 'text-slate-950 dark:text-white font-bold';
            borderClass = 'border-slate-300 dark:border-white/20';
            bgClass = 'bg-slate-100 dark:bg-white/[0.06]';
          }

          return (
            <div
              key={index}
              className={`p-2.5 rounded-lg border ${borderClass} ${bgClass} transition-all`}
            >
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                <span className="flex items-center gap-1 font-bold text-slate-600 dark:text-slate-400">
                  <Cpu className="w-2.5 h-2.5 text-slate-800 dark:text-white" />
                  {log.component || 'CAVDAX'}
                </span>
                <span>{log.time}</span>
              </div>
              <div className={`${badgeColor} leading-snug break-words`}>
                {log.text}
              </div>
              {log.violationPaths && log.violationPaths.length > 0 && (
                <div className="mt-1.5 p-1.5 rounded bg-rose-100 dark:bg-black/60 border border-rose-300 dark:border-rose-900/40 text-[10px] text-rose-800 dark:text-rose-300 font-mono">
                  <div className="text-slate-600 dark:text-slate-400 mb-0.5">Detected Stale Dependency Chain:</div>
                  {log.violationPaths.map((p, pIdx) => (
                    <div key={pIdx}>↳ {Array.isArray(p) ? p.join(' ➔ ') : p}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
