import React from 'react';
import { Check, Minus, ShieldCheck, Zap, Lock, Cpu, GitBranch, Terminal } from 'lucide-react';

const COMPARISON_DATA = [
  {
    capability: 'Underlying Data Model',
    description: 'Structure of stored architecture decisions',
    staticAdrs: 'Flat Markdown Files',
    vectorRag: 'High-Dim Float Vectors',
    astLinters: 'Compiled AST / Bytecode',
    cavdax: 'Directed Causal Property Graph (DAG)',
    cavdaxHighlight: true
  },
  {
    capability: 'Invalidation Latency',
    description: 'Time required to compute superseded decisions',
    staticAdrs: 'Manual / None',
    vectorRag: 'O(N) Full Re-embedding',
    astLinters: 'Compile-Time Step',
    cavdax: '< 2.8ms GraphBLAS Traversal',
    cavdaxHighlight: true
  },
  {
    capability: 'Causal Blast Radius',
    description: 'Downstream transitive dependency tracking',
    staticAdrs: 'None (Isolated Docs)',
    vectorRag: 'Top-K Cosine Similarity',
    astLinters: 'File-Scoped Syntax Rules',
    cavdax: 'Multi-Hop Reachability Matrix',
    cavdaxHighlight: true
  },
  {
    capability: 'Agent Write Interception',
    description: 'Physical interception of AI agent file writes',
    staticAdrs: 'Passive (Ignored)',
    vectorRag: 'Advisory Prompt Context',
    astLinters: 'Post-Facto CI Bot Check',
    cavdax: 'Enclosed MCP Gate (Hard 403 Halt)',
    cavdaxHighlight: true
  },
  {
    capability: 'Multi-Agent Concurrency',
    description: 'Collision prevention across autonomous agents',
    staticAdrs: 'None (Git Merge Conflict)',
    vectorRag: 'None (Silent Overwrites)',
    astLinters: 'None',
    cavdax: 'Distributed Mutex Leases',
    cavdaxHighlight: true
  },
  {
    capability: 'Three-Tier Hermetic Gate',
    description: 'Multi-layer defense: MCP socket, git pre-commit, and CI gate',
    staticAdrs: 'None (Passive Docs)',
    vectorRag: 'None (Advisory Prompt)',
    astLinters: 'CI Only (Post-Facto)',
    cavdax: 'Tier 1 (MCP) + Tier 2 (Git Hook) + Tier 3 (CI Gate)',
    cavdaxHighlight: true
  },
  {
    capability: 'Verification Invariant',
    description: 'Grounding guarantee for written code',
    staticAdrs: 'Manual Peer Review',
    vectorRag: 'Probabilistic Token Guessing',
    astLinters: 'Syntactic Pattern Match',
    cavdax: 'Deterministic Graph Provenance',
    cavdaxHighlight: true
  },
  {
    capability: 'Open Source License & Provenance',
    description: 'Enterprise software distribution and cryptographic build verification',
    staticAdrs: 'MIT / GPL (Varies)',
    vectorRag: 'Proprietary Closed SaaS',
    astLinters: 'Apache-2.0 / LGPL',
    cavdax: 'Apache-2.0 / BSL-1.1 + Sigstore SLSA-3',
    cavdaxHighlight: true
  }
];

export default function ArchitecturalComparisonMatrix() {
  return (
    <section id="comparison-matrix" className="w-full py-20 px-6 max-w-6xl mx-auto border-t border-slate-300 dark:border-white/10">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-[11px] font-mono text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4">
          <Terminal className="w-3.5 h-3.5 text-amber-500" />
          <span>Architectural Taxonomy &amp; Differentiation</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight">
          How CAVDAX Outclasses Static Docs &amp; Vector RAG
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mt-3 font-sans leading-relaxed">
          A side-by-side technical evaluation across runtime interception, causal blast radius computation, and deterministic multi-agent concurrency.
        </p>
      </div>

      {/* Comparison Table Container */}
      <div className="relative rounded-2xl border border-slate-300/80 dark:border-white/10 bg-white/70 dark:bg-[#11141B]/70 backdrop-blur-md shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02]">
                <th className="py-4 px-5 text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-1/4">
                  Architectural Metric
                </th>
                <th className="py-4 px-4 text-xs font-mono font-medium text-slate-600 dark:text-slate-400 w-1/5">
                  Static ADRs
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-sans font-normal">adr-tools / Log4brains</span>
                </th>
                <th className="py-4 px-4 text-xs font-mono font-medium text-slate-600 dark:text-slate-400 w-1/5">
                  Vector RAG
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-sans font-normal">Cursor @codebase / Mneme / LangChain</span>
                </th>
                <th className="py-4 px-4 text-xs font-mono font-medium text-slate-600 dark:text-slate-400 w-1/5">
                  Static Linters
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-sans font-normal">ArchUnit / Semgrep / CodeRabbit</span>
                </th>
                <th className="py-4 px-5 text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/[0.06] dark:bg-amber-400/[0.04] border-l border-r border-amber-500/20 dark:border-amber-400/20 w-1/4">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    <span>CAVDAX Causal Gate</span>
                  </div>
                  <span className="block text-[10px] text-amber-600/80 dark:text-amber-400/80 font-sans font-normal">FalkorDB GraphBLAS + MCP</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-xs">
              {COMPARISON_DATA.map((row, idx) => (
                <tr 
                  key={idx}
                  className="hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-slate-900 dark:text-white font-mono text-[13px]">
                      {row.capability}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                      {row.description}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                    <span className="inline-flex items-center gap-1.5">
                      <Minus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{row.staticAdrs}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                    <span className="inline-flex items-center gap-1.5">
                      <Minus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{row.vectorRag}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                    <span className="inline-flex items-center gap-1.5">
                      <Minus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{row.astLinters}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-5 font-mono text-[12px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/[0.06] dark:bg-amber-400/[0.04] border-l border-r border-amber-500/20 dark:border-amber-400/20">
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>{row.cavdax}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer note inside card */}
        <div className="p-3 px-5 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-sans">
          <span>Grounded in peer-reviewed architectural erosion research (Perry &amp; Wolf, 1992; Nygard, 2011).</span>
          <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">GRAPHBLAS LINEAR ALGEBRA</span>
        </div>
      </div>
    </section>
  );
}
