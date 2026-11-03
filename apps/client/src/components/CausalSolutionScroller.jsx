import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import CavdaxAgentStateIndicator from './CavdaxAgentStateIndicator';
import { playClick } from '../utils/soundFx';

/* ─── 4 Causal Architecture Steps (Clean, Minimal, Zero Cyan in Light Mode) ─── */
const SOLUTION_STEPS = [
  {
    id: 'step-ingestion',
    indexStr: '01',
    title: 'ADR & Git Ingestion',
    punchline: 'Autonomous AST parser extracts markdown frontmatter and commit diffs into directed causal vertices.',
    accentDark: '#ffffff',
    accentLight: '#0f172a', // Deep Architectural Slate/Steel in light mode
  },
  {
    id: 'step-graphblas',
    indexStr: '02',
    title: 'FalkorDB GraphBLAS Engine',
    punchline: 'In-memory sparse adjacency matrix multiplication traverses 100,000+ causal dependencies in 1.84ms.',
    accentDark: '#d9a353',
    accentLight: '#b45309', // Deep Bronze in light mode
  },
  {
    id: 'step-mcp-gate',
    indexStr: '03',
    title: 'Enclosed MCP Firewall Gate',
    punchline: 'Every agent mutation is intercepted at the protocol layer and hard-rejected if grounded in stale ancestry.',
    accentDark: '#f43f5e',
    accentLight: '#be123c', // Deep Wine in light mode
  },
  {
    id: 'step-revalidation',
    indexStr: '04',
    title: 'Continuous Revalidation Loop',
    punchline: 'Deterministic causal feedback guides the agent to self-heal and write verified patches to disk.',
    accentDark: '#10b981',
    accentLight: '#047857', // Deep Emerald in light mode
  },
];

/* ─── Infographic 1: Git & ADR Ingestion (Architectural Monochrome + Verified Emerald) ── */
function WidescreenVisualIngestion({ triggerKey = 0 }) {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      <svg className="w-full h-full max-h-[360px]" viewBox="0 0 900 260" fill="none">
        {/* ── LEFT: DUAL-TRACK GIT REPO (MAIN vs NEW ADR-002) ── */}
        <g transform="translate(60, 45)">
          {/* Base Instrument Plate */}
          <rect x="-10" y="-10" width="220" height="150" rx="8" className="fill-slate-50 dark:fill-[#121214] stroke-slate-200 dark:stroke-[#27272a]" strokeWidth="1" />
          <circle cx="-2" cy="-2" r="1.5" className="fill-slate-400 dark:fill-[#52525b]" />
          <circle cx="202" cy="-2" r="1.5" className="fill-slate-400 dark:fill-[#52525b]" />
          <circle cx="-2" cy="132" r="1.5" className="fill-slate-400 dark:fill-[#52525b]" />
          <circle cx="202" cy="132" r="1.5" className="fill-slate-400 dark:fill-[#52525b]" />

          {/* Lower Track: Git Main Line */}
          <line x1="10" y1="95" x2="190" y2="95" className="stroke-slate-400 dark:stroke-[#52525b]" strokeWidth="2.5" strokeDasharray="6 6"/>
          <circle cx="35" cy="95" r="9" className="fill-white dark:fill-[#18181b] stroke-slate-500 dark:stroke-[#71717a]" strokeWidth="2"/>
          <circle cx="35" cy="95" r="3" className="fill-slate-600 dark:fill-[#71717a]"/>
          {/* Text positioned cleanly 21px below line at y=116 - zero collision or line intersection */}
          <text x="35" y="116" className="fill-slate-600 dark:fill-[#a1a1aa] font-mono text-[11px] font-bold">main [c3a8f]</text>

          {/* Upper Diverging Track: ADR-002 with Left-to-Right Animated Flexible Stroke Trace (Single-Shot on Arrival/Hover) */}
          {/* Subtle background rail path */}
          <path d="M 35 95 C 75 95, 90 35, 140 35 L 195 35" className="stroke-slate-300 dark:stroke-[#27272a]" strokeWidth="3"/>
          {/* Dynamic flowing stroke path from main [hashcode] curving into New Proposal and onward — plays once on arrival/hover and preserves final state */}
          <motion.path
            key={triggerKey}
            d="M 35 95 C 75 95, 90 35, 140 35 L 195 35"
            className="stroke-slate-900 dark:stroke-white pointer-events-auto"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeDasharray="210"
            initial={{ strokeDashoffset: 210 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{
              duration: 2.2,
              repeat: 0,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
          
          {/* Dimensionally Solid Carriage Node (Zero Pulsing Circles) */}
          <circle
            cx="140" cy="35" r="12"
            className="fill-slate-900 dark:fill-white stroke-white dark:stroke-slate-900"
            strokeWidth="2.5"
          />
          <circle cx="140" cy="35" r="4" className="fill-white dark:fill-slate-950"/>
          <text x="140" y="16" textAnchor="middle" className="fill-slate-900 dark:fill-white font-mono text-[13px] font-bold">ADR-002</text>
          <text x="140" y="65" textAnchor="middle" className="fill-slate-500 dark:fill-[#a1a1aa] font-mono text-[10px]">New Proposal</text>
        </g>

        {/* Central Inflow Conduit & Animated Traveling Packet */}
        <motion.line
          x1="270" y1="110" x2="370" y2="110"
          className="stroke-slate-400 dark:stroke-zinc-600"
          strokeWidth="2"
          strokeDasharray="6 4"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
        <polygon points="370,110 360,105 360,115" className="fill-slate-900 dark:fill-white"/>
        <motion.circle
          r="4.5"
          className="fill-slate-900 dark:fill-white"
          animate={{ cx: [270, 370], opacity: [0, 1, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          cy="110"
        />

        {/* ── CENTER: PROMINENT OPTICAL AST SCANNER CHAMBER ── */}
        <g transform="translate(380, 45)">
          {/* Outer Scanner Frame */}
          <rect x="0" y="0" width="145" height="135" rx="12" className="fill-white dark:fill-[#18181b] stroke-slate-300 dark:stroke-zinc-600" strokeWidth="1.8"/>
          {/* Inner Scanning Glass Aperture */}
          <rect x="15" y="15" width="115" height="105" rx="8" className="fill-slate-50 dark:fill-zinc-900/60 stroke-slate-200 dark:stroke-zinc-700" strokeWidth="1"/>
          
          {/* Central AST Token (Static Integer Raster, Zero Jitter) */}
          <g>
            <circle cx="72" cy="68" r="26" className="fill-slate-100 dark:fill-[#121214] stroke-slate-900 dark:stroke-zinc-300" strokeWidth="2"/>
            <text x="72" y="73" textAnchor="middle" className="fill-slate-900 dark:fill-white font-mono text-[14px] font-black" style={{ textRendering: 'geometricPrecision' }}>AST</text>
          </g>

          {/* Animated Laser Scanner Line */}
          <motion.line
            x1="22" x2="122"
            className="stroke-rose-500 dark:stroke-rose-400"
            strokeWidth="2.5"
            animate={{ y1: [30, 105, 30], y2: [30, 105, 30] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          
          {/* Stable Static OPTICAL PARSER Label (Zero Subpixel Shake) */}
          <text
            x="72"
            y="152"
            textAnchor="middle"
            className="fill-slate-900 dark:fill-white font-mono text-[11px] font-bold"
            style={{ textRendering: 'geometricPrecision' }}
          >
            OPTICAL PARSER
          </text>
        </g>

        {/* Central Outflow Conduit & Animated Traveling Packet */}
        <motion.line
          x1="525" y1="110" x2="625" y2="110"
          className="stroke-slate-400 dark:stroke-zinc-600"
          strokeWidth="2"
          strokeDasharray="6 4"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
        <polygon points="625,110 615,105 615,115" className="fill-slate-900 dark:fill-white"/>
        <motion.circle
          r="4.5"
          className="fill-slate-900 dark:fill-white"
          animate={{ cx: [525, 625], opacity: [0, 1, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'linear', delay: 0.9 }}
          cy="110"
        />

        {/* ── RIGHT: CLEAR SORTING OUTCOME (ACCEPTED vs SUPERSEDED) ── */}
        <g transform="translate(635, 42)">
          {/* Top Accepted Block: ADR-002 Active (Verified Emerald - Stable, Zero Shifting) */}
          <g>
            <rect x="0" y="0" width="205" height="54" rx="8" className="fill-white dark:fill-[#18181b] stroke-emerald-600 dark:stroke-emerald-400" strokeWidth="2"/>
            <circle cx="30" cy="27" r="11" className="fill-emerald-600 dark:fill-emerald-500"/>
            <polyline points="25,27 29,31 36,23" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <text x="52" y="25" className="fill-slate-900 dark:fill-white font-mono text-[13px] font-bold">ADR-002</text>
            <text x="52" y="42" className="fill-emerald-600 dark:fill-emerald-400 font-mono text-[10.5px] font-bold">VERIFIED ACTIVE</text>
          </g>

          {/* Bottom Superseded Block: ADR-001 Stale */}
          <rect x="0" y="74" width="205" height="54" rx="8" className="fill-slate-50 dark:fill-[#121214] stroke-rose-400 dark:stroke-rose-600" strokeWidth="1.5" strokeDasharray="5 4"/>
          <circle cx="30" cy="101" r="11" className="fill-rose-100 dark:fill-rose-950/40 stroke-rose-500 dark:stroke-rose-600" strokeWidth="1.5"/>
          <line x1="25" y1="96" x2="35" y2="106" className="stroke-rose-600 dark:stroke-rose-400" strokeWidth="2"/>
          <line x1="35" y1="96" x2="25" y2="106" className="stroke-rose-600 dark:stroke-rose-400" strokeWidth="2"/>
          <text x="52" y="99" className="fill-slate-600 dark:fill-slate-400 font-mono text-[12px] font-medium">ADR-001</text>
          <text x="52" y="116" className="fill-rose-600 dark:fill-rose-400 font-mono text-[10px] font-bold">SUPERSEDED (STALE)</text>
        </g>
      </svg>
    </div>
  );
}

/* ─── Infographic 2: FalkorDB GraphBLAS Engine (Rubik's Cube Discrete Matrix Swaps & Multigraph Bus) ─ */
function WidescreenVisualGraphBLAS() {
  // 16 persistent tiles in 4x4 matrix, each with unique ID, position, and binary value
  const initialTiles = [
    { id: 0, r: 0, c: 0, val: 1 },
    { id: 1, r: 0, c: 1, val: 0 },
    { id: 2, r: 0, c: 2, val: 1 },
    { id: 3, r: 0, c: 3, val: 0 },
    { id: 4, r: 1, c: 0, val: 0 },
    { id: 5, r: 1, c: 1, val: 1 },
    { id: 6, r: 1, c: 2, val: 0 },
    { id: 7, r: 1, c: 3, val: 1 },
    { id: 8, r: 2, c: 0, val: 1 },
    { id: 9, r: 2, c: 1, val: 0 },
    { id: 10, r: 2, c: 2, val: 0 },
    { id: 11, r: 2, c: 3, val: 1 },
    { id: 12, r: 3, c: 0, val: 0 },
    { id: 13, r: 3, c: 1, val: 1 },
    { id: 14, r: 3, c: 2, val: 1 },
    { id: 15, r: 3, c: 3, val: 0 },
  ];
  const [tiles, setTiles] = useState(initialTiles);
  const [activeTileIds, setActiveTileIds] = useState([]);

  useEffect(() => {
    // Discrete adjacent pairs swap like a Rubik's cube slice, permanently updating grid coordinates
    const swapPairs = [
      { r1: 0, c1: 0, r2: 0, c2: 1 },
      { r1: 1, c1: 1, r2: 2, c2: 1 },
      { r1: 0, c1: 2, r2: 0, c2: 3 },
      { r1: 2, c1: 3, r2: 3, c2: 3 },
      { r1: 3, c1: 1, r2: 3, c2: 2 },
      { r1: 1, c1: 2, r2: 1, c2: 3 },
      { r1: 1, c1: 0, r2: 2, c2: 0 },
      { r1: 3, c1: 0, r2: 3, c2: 1 },
      { r1: 2, c1: 1, r2: 2, c2: 2 },
      { r1: 0, c1: 1, r2: 1, c2: 1 },
      { r1: 2, c1: 2, r2: 3, c2: 2 },
      { r1: 1, c1: 3, r2: 2, c2: 3 },
    ];
    let step = 0;

    const interval = setInterval(() => {
      const pair = swapPairs[step % swapPairs.length];
      step++;

      setTiles((prev) => {
        const next = [...prev];
        const idxA = next.findIndex((t) => t.r === pair.r1 && t.c === pair.c1);
        const idxB = next.findIndex((t) => t.r === pair.r2 && t.c === pair.c2);
        if (idxA !== -1 && idxB !== -1) {
          const tileA = next[idxA];
          const tileB = next[idxB];
          next[idxA] = { ...tileA, r: pair.r2, c: pair.c2 };
          next[idxB] = { ...tileB, r: pair.r1, c: pair.c1 };
          setActiveTileIds([tileA.id, tileB.id]);
        }
        return next;
      });
    }, 500); // 0.5s interval exactly as user instructed

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      <svg className="w-full h-full max-h-[360px]" viewBox="0 0 900 260" fill="none">
        {/* ── LEFT: PERMANENTLY SWAPPING RUBIK'S CUBE SPARSE MATRIX ── */}
        <g transform="translate(70, 35)">
          <rect x="0" y="0" width="160" height="155" rx="10" className="fill-white dark:fill-[#18181b] stroke-amber-600 dark:stroke-[#d9a353]" strokeWidth="1.5"/>
          
          {/* Subtle Matrix Calibration Guide */}
          <line x1="8" y1="14" x2="152" y2="14" className="stroke-slate-200 dark:stroke-[#27272a]" strokeWidth="0.8" />
          
          {/* 4x4 Matrix Blocks: Permanent Rubik's Tile Slides every 0.5s */}
          {tiles.map((tile) => {
            const isActivelySwapping = activeTileIds.includes(tile.id);
            const targetX = 16 + tile.c * 33;
            const targetY = 18 + tile.r * 32;

            return (
              <motion.g
                key={`tile-${tile.id}`}
                animate={{
                  x: targetX,
                  y: targetY,
                }}
                transition={{
                  duration: 0.35,
                  ease: [0.25, 1, 0.5, 1], // Smooth professional Rubik's slide
                }}
                style={{ zIndex: isActivelySwapping ? 20 : 5 }}
              >
                {tile.val === 1 ? (
                  <g>
                    <rect
                      width="25"
                      height="24"
                      rx="4"
                      className={
                        isActivelySwapping
                          ? "fill-amber-200 dark:fill-[#fef08a] stroke-amber-600 dark:stroke-[#fef08a]"
                          : "fill-amber-100 dark:fill-[#d9a353] stroke-amber-500 dark:stroke-[#fef08a]"
                      }
                      strokeWidth="1.2"
                    />
                    <text
                      x="12.5"
                      y="16"
                      textAnchor="middle"
                      fontFamily="'SF Mono', Consolas, monospace"
                      fontSize="12"
                      fontWeight="bold"
                      className="fill-amber-950 dark:fill-[#000000]"
                    >
                      1
                    </text>
                  </g>
                ) : (
                  <g>
                    <rect
                      width="25"
                      height="24"
                      rx="4"
                      className="fill-slate-50 dark:fill-[#27272a] stroke-slate-200 dark:stroke-[#3f3f46]"
                      strokeWidth="1"
                    />
                    <text
                      x="12.5"
                      y="16"
                      textAnchor="middle"
                      fontFamily="'SF Mono', Consolas, monospace"
                      fontSize="12"
                      fontWeight="bold"
                      className="fill-slate-400 dark:fill-[#71717a]"
                    >
                      0
                    </text>
                  </g>
                )}
              </motion.g>
            );
          })}

          <text x="80" y="180" textAnchor="middle" className="fill-amber-700 dark:fill-[#d9a353] font-mono text-[11px] font-bold">
            SPARSE MATRIX [A]
          </text>
        </g>

        {/* Connecting Arrow 1 & Animated Data Packet */}
        <motion.line
          x1="245" y1="110" x2="350" y2="110"
          className="stroke-amber-600 dark:stroke-[#d9a353]"
          strokeWidth="2.5"
          strokeDasharray="6 4"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
        <polygon points="350,110 340,104 340,116" className="fill-amber-600 dark:fill-[#d9a353]"/>
        <motion.circle
          r="4"
          className="fill-amber-600 dark:fill-[#fef08a]"
          animate={{ cx: [245, 350], opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          cy="110"
        />

        {/* ── CENTER: PROMINENT ROTATING SEMIRING CORE ── */}
        <g transform="translate(425, 110)">
          {/* Outer Calibration Ring */}
          <circle r="52" className="fill-white dark:fill-[#18181b] stroke-amber-600 dark:stroke-[#d9a353]" strokeWidth="2" strokeDasharray="8 6"/>
          <circle r="38" className="fill-slate-50 dark:fill-[#27272a] stroke-amber-600 dark:stroke-[#d9a353]" strokeWidth="1.5"/>
          
          {/* Smooth Kinetic Rotating Semiring Operator */}
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
          >
            <text x="0" y="8" textAnchor="middle" fontFamily="'SF Mono', Consolas, monospace" fontSize="24" fontWeight="900" className="fill-amber-800 dark:fill-[#d9a353]">
              ⊕.⊗
            </text>
          </motion.g>
          <text x="0" y="75" textAnchor="middle" className="fill-amber-700 dark:fill-[#d9a353] font-mono text-[11px] font-bold">
            SEMIRING KERNEL
          </text>
        </g>

        {/* Connecting Arrow 2 & Gold Theme-Matched Results Packet */}
        <motion.line
          x1="495" y1="110" x2="600" y2="110"
          className="stroke-amber-600 dark:stroke-[#d9a353]"
          strokeWidth="2.5"
          strokeDasharray="6 4"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
        <polygon points="600,110 590,104 590,116" className="fill-amber-600 dark:fill-[#d9a353]"/>
        <motion.circle
          r="4.5"
          className="fill-amber-500 dark:fill-[#fbbf24]"
          animate={{ cx: [495, 600], opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: 0.75 }}
          cy="110"
        />

        {/* ── RIGHT: GIANT 1.84ms BENCHMARK WITH ANIMATED MULTIGRAPH BUS ── */}
        <g transform="translate(615, 35)">
          <rect x="0" y="0" width="220" height="155" rx="10" className="fill-white dark:fill-[#18181b] stroke-amber-600 dark:stroke-[#d9a353]" strokeWidth="2"/>
          <rect x="15" y="15" width="190" height="75" rx="6" className="fill-slate-50 dark:fill-[#121214] stroke-slate-200 dark:stroke-[#27272a]" strokeWidth="1"/>
          
          {/* Giant Benchmark Readout */}
          <text
            x="110" y="65"
            textAnchor="middle"
            fontFamily="'SF Mono', Consolas, monospace"
            fontSize="42"
            fontWeight="900"
            className="fill-slate-900 dark:fill-[#ffffff]"
          >
            1.84ms
          </text>
          
          <text x="110" y="112" textAnchor="middle" className="fill-amber-700 dark:fill-[#d9a353] font-mono text-[11.5px] font-bold">
            TRAVERSAL LATENCY
          </text>
          
          {/* Animated Multigraph Convergence Bus (Smooth, Calibrated, Zero Jerk) */}
          <g transform="translate(34, 122)">
            {/* 3 Parallel Inflow Traces with Kinetic Dash Conveyor */}
            <motion.path
              d="M 0 3 L 14 3 L 26 8 L 42 8"
              className="stroke-amber-600 dark:stroke-[#d9a353]"
              strokeWidth="1.4"
              fill="none"
              strokeDasharray="5 3"
              animate={{ strokeDashoffset: [0, -16] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            />
            <motion.path
              d="M 0 8 L 42 8"
              className="stroke-amber-600 dark:stroke-[#d9a353]"
              strokeWidth="1.8"
              fill="none"
              strokeDasharray="6 3"
              animate={{ strokeDashoffset: [0, -18] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            />
            <motion.path
              d="M 0 13 L 14 13 L 26 8 L 42 8"
              className="stroke-amber-600 dark:stroke-[#d9a353]"
              strokeWidth="1.4"
              fill="none"
              strokeDasharray="5 3"
              animate={{ strokeDashoffset: [0, -16] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
            />
            
            {/* 3 Diamond Input Vertices with Gentle Opacity Pulse (Zero Scale Jerking) */}
            <motion.polygon
              points="0,3 3,0 6,3 3,6"
              className="fill-amber-600 dark:fill-[#d9a353]"
              animate={{ opacity: [0.75, 1, 0.75] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.polygon
              points="0,8 3,5 6,8 3,11"
              className="fill-amber-600 dark:fill-[#d9a353]"
              animate={{ opacity: [0.75, 1, 0.75] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.25 }}
            />
            <motion.polygon
              points="0,13 3,10 6,13 3,16"
              className="fill-amber-600 dark:fill-[#d9a353]"
              animate={{ opacity: [0.75, 1, 0.75] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            />
            
            {/* Central Unified Convergence Hub with Subtle Ambient Glow */}
            <motion.polygon
              points="26,8 30,4 34,8 30,12"
              className="fill-amber-500 dark:fill-[#fbbf24]"
              animate={{
                filter: [
                  'drop-shadow(0 0 1px rgba(251,191,36,0.3))',
                  'drop-shadow(0 0 3px rgba(251,191,36,0.7))',
                  'drop-shadow(0 0 1px rgba(251,191,36,0.3))',
                ],
              }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
            
            <text x="48" y="11" className="fill-slate-600 dark:fill-[#a1a1aa] font-mono text-[10.5px] font-semibold">
              100,000+ Vertices
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}

/* ─── Infographic 3: Enclosed MCP Protocol Firewall (Minimalist Bench Padlock) ─ */
function WidescreenVisualMcpGate() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      <svg className="w-full h-full max-h-[360px]" viewBox="0 0 900 260" fill="none">
        {/* ── LEFT: MINIMALIST AGENT MUTATION TERMINAL PROMPT ── */}
        <g transform="translate(70, 50)">
          <rect x="0" y="0" width="210" height="120" rx="10" className="fill-white dark:fill-[#18181b] stroke-slate-300 dark:stroke-[#71717a]" strokeWidth="1.5"/>
          
          {/* Clean Minimalist Command Terminal Badge */}
          <g transform="translate(18, 18)">
            <rect width="26" height="26" rx="6" className="fill-slate-100 dark:fill-[#27272a] stroke-slate-300 dark:stroke-[#52525b]" strokeWidth="1.2" />
            <path d="M 7 9 L 12 13 L 7 17" fill="none" className="stroke-slate-800 dark:stroke-slate-200" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <motion.line
              x1="15" y1="17" x2="21" y2="17"
              className="stroke-rose-600 dark:stroke-[#f43f5e]"
              strokeWidth="2.2"
              strokeLinecap="round"
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.85, repeat: Infinity }}
            />
          </g>

          <text x="54" y="35" className="fill-slate-900 dark:fill-white font-mono text-[12px] font-bold">AGENT MUTATION</text>
          <line x1="15" y1="55" x2="195" y2="55" className="stroke-slate-200 dark:stroke-[#3f3f46]" strokeWidth="1"/>
          <text x="20" y="80" className="fill-slate-800 dark:fill-white font-mono text-[12.5px] font-bold">apply_code_change()</text>
          
          <motion.text
            x="20" y="100"
            className="fill-rose-600 dark:fill-[#f43f5e] font-mono text-[10.5px] font-bold"
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            GROUNDING: STALE [ADR-001]
          </motion.text>
        </g>

        {/* Connecting Line to Firewall & Blocked Traveling Packet */}
        <motion.line
          x1="295" y1="110" x2="380" y2="110"
          className="stroke-rose-500 dark:stroke-[#f43f5e]"
          strokeWidth="2.5"
          strokeDasharray="6 4"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
        <polygon points="380,110 370,104 370,116" className="fill-rose-500 dark:fill-[#f43f5e]"/>
        <motion.circle
          r="4.5"
          className="fill-rose-600 dark:fill-[#f43f5e]"
          animate={{ cx: [295, 380], opacity: [0, 1, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeIn' }}
          cy="110"
        />

        {/* ── CENTER: MINIMALIST GUILLOTINE GATE WITH SLEEK ISOMETRIC PADLOCK ── */}
        <g transform="translate(435, 110)">
          {/* Heavy Dual Pillars */}
          <rect x="-65" y="-60" width="18" height="120" rx="3" className="fill-slate-100 dark:fill-[#27272a] stroke-slate-300 dark:stroke-[#71717a]" strokeWidth="1.5"/>
          <rect x="47" y="-60" width="18" height="120" rx="3" className="fill-slate-100 dark:fill-[#27272a] stroke-slate-300 dark:stroke-[#71717a]" strokeWidth="1.5"/>
          {/* Top Crossbar */}
          <rect x="-70" y="-70" width="140" height="20" rx="4" className="fill-slate-200 dark:fill-[#3f3f46] stroke-slate-400 dark:stroke-[#71717a]" strokeWidth="1.5"/>

          {/* Interlock Hexagonal Valve Chamber */}
          <polygon points="0,-45 42,-22 42,22 0,45 -42,22 -42,-22" className="fill-white dark:fill-[#18181b] stroke-rose-600 dark:stroke-[#f43f5e]" strokeWidth="2.5"/>
          
          {/* Bench-Instrument Precision Padlock with Chamfer Plate & Authentic Kinematics */}
          <g transform="translate(0, 4)">
            {/* Shackle: Pivots open on heel (-15,-10), swings closed, and plunges into lock body */}
            <motion.g
              style={{ transformOrigin: '-15px -10px' }}
              animate={{
                rotate: [-35, -35, 0, 0, 0, 0, -35],
                y: [-16, -16, -16, 2, -1, 0, -16],
              }}
              transition={{
                duration: 3.6,
                repeat: Infinity,
                times: [0, 0.28, 0.48, 0.54, 0.58, 0.84, 1],
                ease: ['easeInOut', 'easeInOut', 'easeIn', 'easeOut', 'linear', 'easeInOut'],
              }}
            >
              {/* Hardened Monoline Steel Shackle */}
              <path
                d="M -15 10 V -18 A 15 15 0 0 1 15 -18 V 2"
                className="stroke-slate-800 dark:stroke-white"
                strokeWidth="3.6"
                strokeLinecap="round"
                fill="none"
              />
            </motion.g>

            {/* Solid Milled Padlock Body with Chamfer Plate, Corner Screws & Impact Recoil */}
            <motion.g
              animate={{ y: [0, 0, 0, 1.2, -0.4, 0, 0] }}
              transition={{
                duration: 3.6,
                repeat: Infinity,
                times: [0, 0.48, 0.52, 0.55, 0.59, 0.63, 1],
              }}
            >
              {/* Solid Milled Lock Chassis */}
              <rect x="-24" y="-10" width="48" height="38" rx="6" className="fill-rose-600 dark:fill-[#be123c] stroke-rose-700 dark:stroke-[#f43f5e]" strokeWidth="1.6"/>
              
              {/* Chamfered Inner Face Plate (Hardware Bench Instrument) */}
              <rect x="-20" y="-6" width="40" height="30" rx="3" className="fill-rose-700 dark:fill-[#9f1239]" opacity="0.65"/>
              
              {/* Precision Instrument Corner Screws */}
              <circle cx="-16.5" cy="-2.5" r="1.2" fill="#ffffff" opacity="0.8"/>
              <circle cx="16.5" cy="-2.5" r="1.2" fill="#ffffff" opacity="0.8"/>
              <circle cx="-16.5" cy="20.5" r="1.2" fill="#ffffff" opacity="0.8"/>
              <circle cx="16.5" cy="20.5" r="1.2" fill="#ffffff" opacity="0.8"/>

              {/* Shackle Bore Bushing Collars */}
              <ellipse cx="-15" cy="-10" rx="3.5" ry="1.8" className="fill-rose-950 dark:fill-[#3a040e]" />
              <ellipse cx="15" cy="-10" rx="3.5" ry="1.8" className="fill-rose-950 dark:fill-[#3a040e]" />

              {/* Center Keyhole */}
              <circle cx="0" cy="7" r="2.8" className="fill-white" />
              <line x1="0" y1="7" x2="0" y2="15" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            </motion.g>
          </g>

          <text x="0" y="78" textAnchor="middle" className="fill-rose-600 dark:fill-[#f43f5e] font-mono text-[11.5px] font-black tracking-wider">
            MCP GATE: LOCKED
          </text>
        </g>

        {/* Broken / Blocked Air Gap Line */}
        <path d="M 515 110 L 610 110" className="stroke-rose-400 dark:stroke-[#f43f5e]" strokeWidth="2" strokeDasharray="3 4"/>
        <line x1="560" y1="95" x2="560" y2="125" className="stroke-rose-600 dark:stroke-[#f43f5e]" strokeWidth="2"/>
        <text x="560" y="88" textAnchor="middle" className="fill-rose-600 dark:fill-[#f43f5e] font-mono text-[9px] font-bold">BLOCKED</text>

        {/* ── RIGHT: HARD 403 REJECTION (CLEAN UNBOXED RED STATUS TEXT) ── */}
        <g transform="translate(630, 50)">
          <rect x="0" y="0" width="200" height="120" rx="10" className="fill-white dark:fill-[#121214] stroke-slate-300 dark:stroke-white/25" strokeWidth="1.5"/>
          
          {/* Unboxed Bold Monospace Red 403 Typography */}
          <text x="100" y="42" textAnchor="middle" fontFamily="'SF Mono', Consolas, monospace" fontSize="19" fontWeight="900" letterSpacing="0.06em" className="fill-rose-600 dark:fill-[#f43f5e]">
            403 FORBIDDEN
          </text>
          
          <line x1="32" y1="56" x2="168" y2="56" className="stroke-slate-200 dark:stroke-zinc-700" strokeWidth="1" />
          
          <text x="100" y="80" textAnchor="middle" className="fill-slate-900 dark:fill-white font-mono text-[11.5px] font-bold tracking-wider">
            0 BYTES WRITTEN
          </text>
          <text x="100" y="98" textAnchor="middle" className="fill-slate-500 dark:fill-[#a1a1aa] font-mono text-[10px]">
            Disk Remains Pure
          </text>
        </g>
      </svg>
    </div>
  );
}

/* ─── Infographic 4: Continuous Revalidation Loop (Monochromatic Architectural with Crisp High-Contrast Outlines & Emerald Verification) */
function WidescreenVisualRevalidation() {
  return (
    <div className="w-full h-full relative flex items-center justify-center p-4 sm:p-6 overflow-hidden select-none">
      <svg className="w-full h-full max-h-[360px]" viewBox="0 0 900 260" fill="none">
        {/* ── LEFT: PROMINENT CONTINUOUS CLOSED LOOP (FEEDBACK) ── */}
        <g transform="translate(48, 40)">
          <rect x="0" y="0" width="220" height="140" rx="10" className="fill-white dark:fill-[#121214] stroke-slate-300 dark:stroke-white/25" strokeWidth="1.5"/>
          
          {/* Clean Unboxed Monospace Labels */}
          <text x="16" y="24" className="fill-slate-900 dark:fill-white font-mono text-[11.5px] font-bold tracking-wider">
            ADR-002
          </text>
          <text x="204" y="24" textAnchor="end" className="fill-slate-500 dark:fill-[#a1a1aa] font-mono text-[11.5px] font-bold tracking-wider">
            DEC-103
          </text>

          {/* Clean Solid Oval Cycle Track Base */}
          <ellipse cx="110" cy="74" rx="75" ry="34" className="stroke-slate-200 dark:stroke-zinc-700" strokeWidth="4.5" fill="none"/>
          
          {/* Continuous circulating closed-loop repair track (Mathematically seamless: 28px dash cycle * 4 = -112 delta) */}
          <motion.ellipse
            cx="110" cy="74" rx="75" ry="34"
            className="stroke-slate-500 dark:stroke-zinc-400"
            strokeWidth="2.5"
            strokeDasharray="16 12"
            fill="none"
            animate={{ strokeDashoffset: [0, -112] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
          />

          {/* Dimensionally Solid Calibration Pucks (Zero Pulsing Dots) */}
          <circle cx="35" cy="74" r="7.5" className="fill-slate-700 dark:fill-zinc-300 stroke-white dark:stroke-[#121214]" strokeWidth="2"/>
          <circle cx="185" cy="74" r="7.5" className="fill-slate-700 dark:fill-zinc-300 stroke-white dark:stroke-[#121214]" strokeWidth="2"/>

          <text x="110" y="127" textAnchor="middle" className="fill-slate-700 dark:fill-zinc-300 font-mono text-[10.5px] font-bold">
            CLOSED-LOOP REPAIR
          </text>
        </g>

        {/* Connecting Arrow 1 & Animated Flow Packet */}
        <motion.line
          x1="282" y1="110" x2="364" y2="110"
          className="stroke-slate-400 dark:stroke-zinc-500"
          strokeWidth="2.5"
          strokeDasharray="6 4"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
        <polygon points="364,110 354,104 354,116" className="fill-slate-500 dark:fill-zinc-400"/>
        <motion.circle
          r="4"
          className="fill-slate-500 dark:fill-zinc-300"
          animate={{ cx: [282, 364], opacity: [0, 1, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
          cy="110"
        />

        {/* ── CENTER: SELF-HEALING RE-SYNTHESIS CORE (BALANCED AT X=450 WITH OPTICALLY CENTERED TICK) ── */}
        <g transform="translate(450, 110)">
          {/* Rotating Dashed Calibration Ring (Radius 55 = bounds [395, 505], leaving symmetric 31px gaps to arrows) */}
          <motion.circle
            r="55"
            className="fill-white dark:fill-[#121214] stroke-slate-300 dark:stroke-white/25"
            strokeWidth="2"
            strokeDasharray="8 6"
            animate={{ rotate: 360 }}
            transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
          />
          <circle r="45" className="fill-slate-50 dark:fill-[#18181b] stroke-slate-300 dark:stroke-zinc-600" strokeWidth="1.5"/>
          
          {/* Console Act 4 Revalidation Approved Indicator Proudly Enlarged inside core with optically centered tick */}
          <foreignObject x="-43" y="-43" width="86" height="86" className="overflow-visible pointer-events-none">
            <div className="w-full h-full flex items-center justify-center">
              <CavdaxAgentStateIndicator status="verified" loopVerified={true} size={86} strokeWidth={3.8} />
            </div>
          </foreignObject>
          
          <text x="0" y="78" textAnchor="middle" className="fill-slate-800 dark:fill-[#e4e4e7] font-mono text-[11.5px] font-bold">
            SELF-HEALED
          </text>
          <text x="0" y="93" textAnchor="middle" className="fill-slate-500 dark:fill-[#a1a1aa] font-mono text-[9.5px]">
            Causal Proof Validated
          </text>
        </g>

        {/* Connecting Arrow 2 & Animated Flow Packet (Starts at 536, leaving symmetric 31px clear gap from core ring) */}
        <motion.line
          x1="536" y1="110" x2="618" y2="110"
          className="stroke-slate-400 dark:stroke-zinc-500"
          strokeWidth="2.5"
          strokeDasharray="6 4"
          animate={{ strokeDashoffset: [0, -20] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
        <polygon points="618,110 608,104 608,116" className="fill-slate-500 dark:fill-zinc-400"/>
        <motion.circle
          r="4"
          className="fill-slate-500 dark:fill-zinc-300"
          animate={{ cx: [536, 618], opacity: [0, 1, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'linear', delay: 0.8 }}
          cy="110"
        />

        {/* ── RIGHT: APPROVED 200 OK & SIGNED AUDIT LOG (CLEAN BALANCED AT X=636) ── */}
        <g transform="translate(636, 40)">
          <rect x="0" y="0" width="200" height="140" rx="10" className="fill-white dark:fill-[#121214] stroke-slate-300 dark:stroke-white/25" strokeWidth="1.5"/>
          
          {/* Clean Unboxed Bold Emerald Green 200 OK Monospace Typography */}
          <text x="100" y="44" textAnchor="middle" fontFamily="'SF Mono', Consolas, monospace" fontSize="22" fontWeight="900" letterSpacing="0.06em" className="fill-emerald-600 dark:fill-[#10b981]">
            200 OK
          </text>
          
          <line x1="32" y1="60" x2="168" y2="60" className="stroke-slate-200 dark:stroke-zinc-700" strokeWidth="1" />
          
          <text x="100" y="86" textAnchor="middle" className="fill-slate-900 dark:fill-white font-mono text-[11.5px] font-bold tracking-wider">
            DISK MUTATED
          </text>
          
          <text x="100" y="108" textAnchor="middle" className="fill-slate-500 dark:fill-[#a1a1aa] font-mono text-[10px] font-semibold tracking-wide">
            Signed Audit Log
          </text>
        </g>
      </svg>
    </div>
  );
}

export default function CausalSolutionScroller() {
  const containerRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  const [card1Trigger, setCard1Trigger] = useState(0);

  // Trigger Card 1 stroke path animation once when arriving from another card
  useEffect(() => {
    if (activeStep === 0) {
      setCard1Trigger(prev => prev + 1);
    }
  }, [activeStep]);
  const [isLocked, setIsLocked] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [scrollImpulse, setScrollImpulse] = useState(0);

  // 15-Second Auto-Scroll Timer & Direction Cue State
  const [autoProgress, setAutoProgress] = useState(0);
  const [autoDirection, setAutoDirection] = useState(1); // +1 = 01->04 (Down), -1 = 04->01 (Up)
  const [isHovered, setIsHovered] = useState(false);
  const autoTimerRef = useRef(0);

  // Smooth scroll-driven backdrop opacity: Fades in early as user approaches section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  // Precise, smooth blur & opacity envelope (Smooth in & out transition)
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

  const backdropVisibility = useTransform(
    backdropOpacity,
    (val) => (val > 0.002 ? 'visible' : 'hidden')
  );

  // Strict Lock, Direction, and Transition Refs
  const isLockedRef = useRef(false);
  const exitAttemptRef = useRef(false);
  const isExitingRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const activeStepRef = useRef(0);
  const lastScrollYRef = useRef(typeof window !== 'undefined' ? window.scrollY : 0);
  const touchStartYRef = useRef(0);
  const touchStartXRef = useRef(0);

  // Keep activeStepRef in sync with state
  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);

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

  // 1. Precise Viewport Docking: Lock IN when reached, lock OUT only after seeing all cards
  useEffect(() => {
    const handleScrollCheck = () => {
      // Programmatic Navigation Guard: Never hijack or dock when the user clicked a button/cue/scroll-to-top to navigate elsewhere
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

      // If user has scrolled completely out of view of the section, clear flags
      if (rect.bottom < -100 || rect.top > viewportHeight + 100) {
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

      // Check if section is centered / docked in viewport with expanded catch window
      const sectionCenter = rect.top + rect.height / 2;
      const viewportCenter = viewportHeight / 2;
      const isDocked = (Math.abs(sectionCenter - viewportCenter) < viewportHeight * 0.45) ||
                       (rect.top <= viewportHeight * 0.45 && rect.bottom >= viewportHeight * 0.55);

      if (!isLockedRef.current && isDocked) {
        isLockedRef.current = true;
        setIsLocked(true);
        exitAttemptRef.current = false;
        autoTimerRef.current = 0;
        setAutoProgress(0);
        if (scrollingDown) {
          // Approaching from TOP (Bento -> Causal): Start at Card 01, auto-scroll forward
          setAutoDirection(1);
          setActiveStep(0);
        } else {
          // Approaching from BOTTOM (FAQ -> Causal): Start at Card 04, auto-scroll reverse
          setAutoDirection(-1);
          setActiveStep(SOLUTION_STEPS.length - 1);
        }
        if (window.__lenis) {
          window.__lenis.isLocked = true;
          window.__lenis.stop();
          window.__lenis.scrollTo(el, {
            duration: 0.6,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            force: true,
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
      }
    };
  }, []);

  // Auto-Scroll Timer (10 Seconds per Card, Direction-Aware, Hover-Paused)
  useEffect(() => {
    if (!isLocked) {
      setAutoProgress(0);
      autoTimerRef.current = 0;
      return;
    }

    const DURATION = 10000;
    const TICK = 60;

    const timer = setInterval(() => {
      // Pause timer when user hovers over cards or during active transitions
      if (isHovered || isTransitioningRef.current || isExitingRef.current) {
        return;
      }

      autoTimerRef.current += TICK;
      const progress = Math.min(1, autoTimerRef.current / DURATION);
      setAutoProgress(progress);

      if (autoTimerRef.current >= DURATION) {
        autoTimerRef.current = 0;
        setAutoProgress(0);
        isTransitioningRef.current = true;
        setScrollImpulse(autoDirection);

        setActiveStep((prev) => {
          if (autoDirection === 1) {
            // Forward cycle: 01 -> 02 -> 03 -> 04 -> 01
            return (prev + 1) % SOLUTION_STEPS.length;
          } else {
            // Reverse cycle: 04 -> 03 -> 02 -> 01 -> 04
            return (prev - 1 + SOLUTION_STEPS.length) % SOLUTION_STEPS.length;
          }
        });

        setTimeout(() => {
          setScrollImpulse(0);
          isTransitioningRef.current = false;
        }, 380);
      }
    }, TICK);

    return () => clearInterval(timer);
  }, [isLocked, isHovered, autoDirection]);

  // 2. Guaranteed Step Lock-In & Natural Directional Exit (Wheel, Touchpad, Touch)
  useEffect(() => {
    const exitDownward = () => {
      if (isExitingRef.current) return;
      isTransitioningRef.current = true;
      isExitingRef.current = true;
      isLockedRef.current = false;
      setIsLocked(false);

      if (window.__lenis) {
        window.__lenis.start();
        window.__lenis.isLocked = false;
        window.__lenis.scrollTo('#faq-section', {
          duration: 0.85,
          force: true,
          onComplete: () => {
            isExitingRef.current = false;
            isTransitioningRef.current = false;
          },
        });
      } else {
        document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' });
      }
      setTimeout(() => {
        isExitingRef.current = false;
        isTransitioningRef.current = false;
      }, 950);
    };

    const exitUpward = () => {
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
          onComplete: () => {
            isExitingRef.current = false;
            isTransitioningRef.current = false;
          },
        });
      } else {
        window.scrollTo({ top: targetY, behavior: 'smooth' });
      }
      setTimeout(() => {
        isExitingRef.current = false;
        isTransitioningRef.current = false;
      }, 950);
    };

    const handleWheel = (e) => {
      if (isExitingRef.current) return;

      const isHorizontalSwipe = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const dominantDelta = isHorizontalSwipe ? e.deltaX : e.deltaY;
      if (Math.abs(dominantDelta) < 10) return;

      if (isLockedRef.current) {
        if (e.cancelable) e.preventDefault();
        if (isTransitioningRef.current) return;

        const current = activeStepRef.current;

        if (dominantDelta > 10) {
          // Scrolling DOWN / Swiping LEFT: 01 -> 02 -> 03 -> 04
          autoTimerRef.current = 0;
          setAutoProgress(0);
          setAutoDirection(1);
          if (current < SOLUTION_STEPS.length - 1) {
            isTransitioningRef.current = true;
            exitAttemptRef.current = false;
            setScrollImpulse(1);
            setActiveStep((prev) => Math.min(SOLUTION_STEPS.length - 1, prev + 1));
            setTimeout(() => {
              setScrollImpulse(0);
              isTransitioningRef.current = false;
            }, 420);
          } else {
            // On Card 04: Require deliberate secondary scroll impulse to exit downward (prevents inertia blow-through)
            if (!exitAttemptRef.current) {
              exitAttemptRef.current = true;
              setTimeout(() => { exitAttemptRef.current = false; }, 650);
            } else {
              exitDownward();
            }
          }
        } else if (dominantDelta < -10) {
          // Scrolling UP / Swiping RIGHT: 04 -> 03 -> 02 -> 01
          autoTimerRef.current = 0;
          setAutoProgress(0);
          setAutoDirection(-1);
          if (current > 0) {
            isTransitioningRef.current = true;
            exitAttemptRef.current = false;
            setScrollImpulse(-1);
            setActiveStep((prev) => Math.max(0, prev - 1));
            setTimeout(() => {
              setScrollImpulse(0);
              isTransitioningRef.current = false;
            }, 420);
          } else {
            // On Card 01: Require deliberate secondary scroll impulse to exit upward (prevents inertia blow-through)
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
      if (isExitingRef.current || !isLockedRef.current || isTransitioningRef.current) return;
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = touchStartYRef.current - currentY;
      const diffX = touchStartXRef.current - currentX;

      const isHorizontal = Math.abs(diffX) > Math.abs(diffY);
      const diff = isHorizontal ? diffX : diffY;
      if (Math.abs(diff) < 30) return;

      const current = activeStepRef.current;

      if (diff > 30) {
        // Swipe UP / Scroll DOWN
        if (current < SOLUTION_STEPS.length - 1) {
          if (e.cancelable) e.preventDefault();
          isTransitioningRef.current = true;
          setActiveStep((prev) => Math.min(SOLUTION_STEPS.length - 1, prev + 1));
          setTimeout(() => {
            isTransitioningRef.current = false;
          }, 360);
        } else {
          if (e.cancelable) e.preventDefault();
          exitDownward();
        }
      } else if (diff < -30) {
        // Swipe DOWN / Scroll UP
        if (current > 0) {
          if (e.cancelable) e.preventDefault();
          isTransitioningRef.current = true;
          setActiveStep((prev) => Math.max(0, prev - 1));
          setTimeout(() => {
            isTransitioningRef.current = false;
          }, 360);
        } else {
          if (e.cancelable) e.preventDefault();
          exitUpward();
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

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

      if (!isLockedRef.current) return;
      const current = activeStepRef.current;

      // Dedicated Horizontal Card Navigation (Left / Right Arrow)
      if (e.key === 'ArrowRight') {
        if (current < SOLUTION_STEPS.length - 1) {
          e.preventDefault();
          setScrollImpulse(1);
          setActiveStep((prev) => Math.min(SOLUTION_STEPS.length - 1, prev + 1));
          setTimeout(() => setScrollImpulse(0), 380);
        }
      } else if (e.key === 'ArrowLeft') {
        if (current > 0) {
          e.preventDefault();
          setScrollImpulse(-1);
          setActiveStep((prev) => Math.max(0, prev - 1));
          setTimeout(() => setScrollImpulse(0), 380);
        }
      }
      // Vertical Keyboard Browsing (ArrowDown, PageDown, Space)
      else if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault();
        if (current < SOLUTION_STEPS.length - 1) {
          setScrollImpulse(1);
          setActiveStep((prev) => Math.min(SOLUTION_STEPS.length - 1, prev + 1));
          setTimeout(() => setScrollImpulse(0), 380);
        } else {
          // Lock OUT downward to FAQ
          isExitingRef.current = true;
          isLockedRef.current = false;
          setIsLocked(false);

          if (window.__lenis) {
            window.__lenis.start();
            window.__lenis.isLocked = false;
            window.__lenis.scrollTo('#faq-section', {
              duration: 0.85,
              force: true,
              onComplete: () => {
                isExitingRef.current = false;
              },
            });
          } else {
            document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' });
          }
          setTimeout(() => {
            isExitingRef.current = false;
          }, 950);
        }
      }
      // Vertical Keyboard Browsing (ArrowUp, PageUp, Shift+Space)
      else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault();
        if (current > 0) {
          setScrollImpulse(-1);
          setActiveStep((prev) => Math.max(0, prev - 1));
          setTimeout(() => setScrollImpulse(0), 380);
        } else {
          // Lock OUT upward to Bento
          const el = containerRef.current;
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
              onComplete: () => {
                isExitingRef.current = false;
              },
            });
          } else {
            window.scrollTo({ top: targetY, behavior: 'smooth' });
          }
          setTimeout(() => {
            isExitingRef.current = false;
          }, 950);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Defensively clamp activeStep to ensure it never indexes outside [0, SOLUTION_STEPS.length - 1]
  const safeStep = Math.max(0, Math.min(SOLUTION_STEPS.length - 1, typeof activeStep === 'number' && !isNaN(activeStep) ? activeStep : 0));
  const currentStep = SOLUTION_STEPS[safeStep] || SOLUTION_STEPS[0];

  const renderVisual = (index) => {
    switch (index) {
      case 0: return <WidescreenVisualIngestion triggerKey={card1Trigger} />;
      case 1: return <WidescreenVisualGraphBLAS />;
      case 2: return <WidescreenVisualMcpGate />;
      case 3: return <WidescreenVisualRevalidation />;
      default: return null;
    }
  };

  return (
    <section
      ref={containerRef}
      id="causal-loop-section"
      tabIndex={0}
      role="region"
      aria-label="Causal Architecture Steps"
      className="relative w-full min-h-screen py-10 sm:py-16 px-4 sm:px-8 flex flex-col items-center justify-center z-[60] border-none overflow-hidden outline-none focus:outline-none"
    >
      {/* ── Fixed Heavy Dimming & Blur Backdrop (Navbar & Page Fully Disappear) ── */}
      <motion.div 
        style={{
          opacity: backdropOpacity,
          visibility: backdropVisibility,
          backdropFilter,
          WebkitBackdropFilter: backdropFilter,
        }}
        className="fixed inset-0 z-[70] bg-white/94 dark:bg-[#07090b]/96 pointer-events-none will-change-[opacity,backdrop-filter]"
      />

      {/* ── Fullscreen Open Stage Container ── */}
      <div className="relative w-full min-h-[82vh] max-w-[1400px] 2xl:max-w-[1600px] flex flex-col justify-between items-center z-[80] my-auto">

        {/* ── Top HUD Navigation: Active Stage Name & Pill Jumpers (Single Cue) ── */}
        <div className="w-full flex items-center justify-between border-b border-slate-200/80 dark:border-white/5 pb-4">
          <span className="font-mono text-xs font-bold text-slate-950 dark:text-white tracking-widest uppercase">
            {currentStep?.title || ''}
          </span>

          {/* Minimal Numbered Tags (01, 02, 03, 04) with Inner 15s Timer Fill */}
          <div className="flex items-center gap-1.5">
            {SOLUTION_STEPS.map((step, idx) => {
              const isActive = idx === activeStep;
              return (
                <button
                  key={step.id}
                  onClick={() => {
                    autoTimerRef.current = 0;
                    setAutoProgress(0);
                    setActiveStep(idx);
                  }}
                  className={`relative overflow-hidden px-3.5 py-1 rounded-full font-mono text-xs font-semibold transition-all duration-200 select-none ${
                    isActive 
                      ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-xs' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                  title={isActive ? (isHovered ? 'Timer Paused (Hovered)' : `Auto-scrolls in ${(10 * (1 - autoProgress)).toFixed(0)}s`) : undefined}
                >
                  {/* Inner auto-scroll timer progress fill layer */}
                  {isActive && (
                    <span 
                      className="absolute inset-y-0 left-0 bg-white/25 dark:bg-slate-950/25 pointer-events-none transition-[width] duration-75 ease-linear rounded-full"
                      style={{ width: `${Math.min(100, autoProgress * 100)}%` }}
                    />
                  )}
                  <span className="relative z-10">{step.indexStr}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Center Stage: 3D Rolling Cylindrical Sliding Window (Tilted Grid Hero Model) ── */}
        <div className="w-full flex-1 flex flex-col items-center justify-center my-4 relative">
          
          {/* Subtle Ambient Specular Glow Behind Center Stage (Theme Calibrated) */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-10 dark:opacity-20 transition-all duration-700 blur-3xl -z-10"
            style={{
              background: `radial-gradient(circle at 50% 50%, var(--tw-prose-accent, ${currentStep?.accentDark || '#38bdf8'}) 0%, transparent 65%)`
            }}
          />

          {/* Desktop 3D Perspective Rolling Stage Container (Hidden on < md screens) */}
          <div 
            onMouseEnter={() => setIsHovered(true)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const xNorm = (e.clientX - rect.left) / rect.width - 0.5;
              const yNorm = (e.clientY - rect.top) / rect.height - 0.5;
              setTilt({ x: -(yNorm * 6), y: xNorm * 9 });
            }}
            onMouseLeave={() => {
              setIsHovered(false);
              setTilt({ x: 0, y: 0 });
            }}
            className="hidden md:flex w-full h-[380px] sm:h-[420px] relative items-center justify-center overflow-visible"
            style={{
              perspective: '1200px',
              perspectiveOrigin: '50% 50%',
            }}
          >
            {SOLUTION_STEPS.map((step, idx) => {
              const offset = idx - activeStep;
              const isCenter = offset === 0;

              let xPos = '0%';
              let zPos = 0;
              let rotateY = 0;
              let rotateX = 0;
              let scale = 1;
              let opacity = 0;
              let zIndex = 10;
              let pointerEvents = 'none';

              if (offset === 0) {
                xPos = '0%';
                zPos = scrollImpulse !== 0 ? -15 : 20;
                rotateY = tilt.y;
                rotateX = tilt.x;
                scale = 1.0;
                opacity = 1;
                zIndex = 30;
                pointerEvents = 'auto';
              } else if (offset === 1) {
                xPos = '68%';
                zPos = -100;
                rotateY = -24 + tilt.y * 0.4;
                rotateX = tilt.x * 0.4;
                scale = 0.84;
                opacity = 0.85;
                zIndex = 20;
                pointerEvents = 'auto';
              } else if (offset === -1) {
                xPos = '-68%';
                zPos = -100;
                rotateY = 24 + tilt.y * 0.4;
                rotateX = tilt.x * 0.4;
                scale = 0.84;
                opacity = 0.85;
                zIndex = 20;
                pointerEvents = 'auto';
              } else if (offset > 1) {
                xPos = '125%';
                zPos = -240;
                rotateY = -35;
                scale = 0.65;
                opacity = 0;
                zIndex = 5;
              } else if (offset < -1) {
                xPos = '-125%';
                zPos = -240;
                rotateY = 35;
                scale = 0.65;
                opacity = 0;
                zIndex = 5;
              }

              return (
                <motion.div
                  key={step.id}
                  animate={{
                    x: xPos,
                    z: zPos,
                    rotateY,
                    rotateX,
                    scale,
                    opacity,
                    zIndex,
                  }}
                  whileHover={{
                    y: isCenter ? -6 : 0,
                    scale: isCenter ? 1.0 : 0.86,
                    z: isCenter ? 16 : -80,
                    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
                  }}
                  onMouseEnter={() => {
                    if (idx === 0) {
                      setCard1Trigger(prev => prev + 1);
                    }
                  }}
                  transition={{
                    duration: 0.65,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{
                    transformStyle: 'preserve-3d',
                    pointerEvents,
                    WebkitFontSmoothing: 'antialiased',
                  }}
                  onClick={(e) => {
                    if (!isCenter) {
                      e.stopPropagation();
                      setActiveStep(idx);
                    } else {
                      // Center card: clicking right side advances; clicking left side retreats
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      if (clickX > rect.width * 0.65 && activeStep < SOLUTION_STEPS.length - 1) {
                        setActiveStep((prev) => Math.min(SOLUTION_STEPS.length - 1, prev + 1));
                      } else if (clickX < rect.width * 0.35 && activeStep > 0) {
                        setActiveStep((prev) => Math.max(0, prev - 1));
                      }
                    }
                  }}
                  className="absolute w-full max-w-[920px] h-[330px] sm:h-[370px] rounded-2xl bg-white dark:bg-[#0c0e14] border border-slate-200/80 dark:border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_80px_-20px_rgba(0,0,0,0.85)] hover:shadow-[0_30px_90px_-15px_rgba(0,0,0,0.22)] dark:hover:shadow-[0_35px_100px_-15px_rgba(0,0,0,0.95)] hover:border-slate-300 dark:hover:border-white/25 transition-all duration-300 flex items-center justify-center p-3 sm:p-6 cursor-pointer select-none"
                >
                  {/* Multi-Plane Parallax Layer for Graphic Content */}
                  <div
                    className="w-full h-full flex items-center justify-center pointer-events-none"
                    style={{
                      transform: isCenter ? 'translateZ(28px)' : 'translateZ(0px)',
                      transformStyle: 'preserve-3d',
                      transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    {renderVisual(idx)}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Mobile Touch-Optimized Snap & Swipe Card Stage (Visible on < md screens) */}
          <div className="flex md:hidden w-full flex-col items-center justify-center px-1 my-2">
            <div 
              onTouchStart={(e) => {
                touchStartXRef.current = e.touches[0].clientX;
              }}
              onTouchEnd={(e) => {
                if (touchStartXRef.current === null) return;
                const touchEndX = e.changedTouches[0].clientX;
                const diffX = touchStartXRef.current - touchEndX;
                if (diffX > 40 && activeStep < SOLUTION_STEPS.length - 1) {
                  playClick();
                  setActiveStep(prev => prev + 1);
                } else if (diffX < -40 && activeStep > 0) {
                  playClick();
                  setActiveStep(prev => prev - 1);
                }
                touchStartXRef.current = null;
              }}
              className="w-full max-w-[420px] min-h-[350px] rounded-2xl bg-white dark:bg-[#0c0e14] border border-slate-300 dark:border-white/20 shadow-xl flex flex-col justify-between p-3.5 relative overflow-hidden select-none transition-all"
            >
              {/* Card Header & Step Label */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/10">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {currentStep.eyebrow}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10">
                  {currentStep.indexStr} / 04
                </span>
              </div>

              {/* Graphic Visual Layer */}
              <div className="w-full flex-1 flex items-center justify-center my-2 overflow-x-auto">
                <div className="w-full min-w-[280px] flex items-center justify-center scale-95">
                  {renderVisual(safeStep)}
                </div>
              </div>

              {/* Card Footer Navigation & Indicator */}
              <div className="pt-2 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                <button
                  onClick={() => {
                    playClick();
                    setActiveStep(prev => Math.max(0, prev - 1));
                  }}
                  disabled={activeStep === 0}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400 disabled:opacity-25 hover:text-slate-950 dark:hover:text-white cursor-pointer"
                >
                  ← PREV
                </button>

                <div className="flex items-center gap-1.5">
                  {SOLUTION_STEPS.map((s, idx) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        playClick();
                        setActiveStep(idx);
                      }}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        idx === activeStep 
                          ? 'w-5 bg-slate-950 dark:bg-white' 
                          : 'w-2 bg-slate-300 dark:bg-white/20'
                      }`}
                      aria-label={`Jump to step ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => {
                    playClick();
                    setActiveStep(prev => Math.min(SOLUTION_STEPS.length - 1, prev + 1));
                  }}
                  disabled={activeStep === SOLUTION_STEPS.length - 1}
                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-slate-950 dark:text-white disabled:opacity-25 cursor-pointer"
                >
                  NEXT →
                </button>
              </div>
            </div>
          </div>

          {/* Heading positioned BELOW the rolling sliding window */}
          <div className="text-center max-w-4xl mx-auto mt-6 mb-1">
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-950 dark:text-white tracking-tight flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-950 via-slate-700 to-slate-950 dark:from-white dark:via-slate-200 dark:to-slate-400">
                Graph-Grounded
              </span>
              <span className="text-slate-400 dark:text-slate-600 font-light select-none">→</span>
              <span className="text-slate-950 dark:text-white">
                Decision Execution
              </span>
            </h2>
          </div>
        </div>

        {/* ── Bottom HUD Bar: Pure Single Line Fading Punchline (Zero Clutter) ── */}
        <div className="w-full flex items-center justify-center border-t border-slate-200/80 dark:border-white/5 pt-4 min-h-[44px]">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentStep?.id || 0}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 font-sans tracking-normal text-center max-w-3xl"
            >
              {currentStep?.punchline || ''}
            </motion.p>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}