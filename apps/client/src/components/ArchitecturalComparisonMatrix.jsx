import React from 'react';



const COMPARISON_DATA = [

  {

    capability: 'Underlying Data Model',

    description: 'Structure of stored architecture decisions',

    staticAdrs: 'Flat Markdown Files',

    vectorRag: '1536d Float Vectors',

    astLinters: 'Compiled AST / Bytecode',

    cavdax: 'Directed Causal DAG (FalkorDB)'

  },

  {

    capability: 'Invalidation Latency',

    description: 'Time to compute superseded decisions',

    staticAdrs: 'Manual / None',

    vectorRag: (

      <>

        O(N log N){' '}<span className="text-rose-500/80 dark:text-rose-400/80 font-medium">(Re-index Lag)</span>

      </>

    ),

    astLinters: 'Compile-Time Scan',

    cavdax: '< 2.8ms GraphBLAS Traversal'

  },

  {

    capability: 'Causal Blast Radius',

    description: 'Downstream transitive dependency tracking',

    staticAdrs: (

      <>

        None{' '}<span className="text-rose-500/80 dark:text-rose-400/80 font-medium">(Isolated Files)</span>

      </>

    ),

    vectorRag: (

      <>

        Top-K Cosine Similarity{' '}<span className="text-rose-500/80 dark:text-rose-400/80 font-medium">(Blind)</span>

      </>

    ),

    astLinters: 'File-Scoped AST Rules',

    cavdax: 'Multi-Hop Reachability Matrix'

  },

  {

    capability: 'Agent Write Interception',

    description: 'Physical interception of agent file writes',

    staticAdrs: (

      <>

        Passive{' '}<span className="text-rose-500/80 dark:text-rose-400/80 font-medium">(Ignored)</span>

      </>

    ),

    vectorRag: 'Advisory Prompt Context',

    astLinters: 'Post-Facto CI Bot Check',

    cavdax: 'Enclosed MCP Gate (Hard 403 Halt)'

  },

  {

    capability: 'Multi-Agent Concurrency',

    description: 'Collision prevention across autonomous agents',

    staticAdrs: (

      <>

        None{' '}<span className="text-rose-500/80 dark:text-rose-400/80 font-medium">(Git Conflicts)</span>

      </>

    ),

    vectorRag: (

      <>

        None{' '}<span className="text-rose-500/80 dark:text-rose-400/80 font-medium">(Silent Overwrites)</span>

      </>

    ),

    astLinters: 'None',

    cavdax: 'Distributed Mutex Leases'

  },

  {

    capability: 'Three-Tier Hermetic Gate',

    description: 'Defense-in-depth across MCP, git, and CI',

    staticAdrs: (

      <>

        None{' '}<span className="text-rose-500/80 dark:text-rose-400/80 font-medium">(Passive Docs)</span>

      </>

    ),

    vectorRag: (

      <>

        None{' '}<span className="text-rose-500/80 dark:text-rose-400/80 font-medium">(Advisory Prompt)</span>

      </>

    ),

    astLinters: 'CI Only (Post-Facto)',

    cavdax: 'Three-Tier (MCP + Hook + CI Gate)'

  },

  {

    capability: 'Verification Invariant',

    description: 'Grounding guarantee for generated code',

    staticAdrs: 'Manual Peer Review',

    vectorRag: 'Probabilistic Guessing',

    astLinters: 'Syntactic AST Match',

    cavdax: 'Deterministic Graph Provenance'

  },

  {

    capability: 'Open Source & Provenance',

    description: 'Enterprise distribution & build provenance',

    staticAdrs: 'MIT / GPL (Varies)',

    vectorRag: 'Closed Proprietary SaaS',

    astLinters: 'Apache-2.0 / LGPL',

    cavdax: 'Apache-2.0 / BSL-1.1 + Sigstore SLSA-3'

  }

];



export default function ArchitecturalComparisonMatrix() {

  return (

    <section id="comparison-matrix" className="w-full min-h-screen flex flex-col justify-center py-4 sm:py-6 pro-27:py-10 px-3 sm:px-6 pro-27:px-8 max-w-[1380px] mx-auto border-t border-slate-300 dark:border-white/10">

      {/* Header: Pure Typography, Zero Generic Eyebrow Pills */}

      <div className="text-center mb-2.5 sm:mb-4 pro-27:mb-10">

        <h2 className="text-xl sm:text-2xl lg:text-3xl pro-27:text-4xl font-extrabold text-slate-950 dark:text-white tracking-tight">

          How CAVDAX Outclasses Static Docs &amp; Vector RAG

        </h2>

        <p className="text-[10.5px] sm:text-xs pro-27:text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mt-1 pro-27:mt-2 font-sans leading-snug pro-27:leading-relaxed">

          A side-by-side technical evaluation across runtime interception, causal blast radius computation, and deterministic multi-agent concurrency.

        </p>

      </div>



      {/* Comparison Table Container */}

      <div className="relative rounded-2xl border border-slate-300/80 dark:border-white/10 bg-white/70 dark:bg-[#11141B]/70 backdrop-blur-md shadow-sm overflow-hidden">

        <div className="overflow-x-auto scrollbar-thin">

          <table className="w-full text-left border-collapse min-w-[960px]">

            <thead>

              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02]">

                <th className="py-2 pro-27:py-3.5 px-3 sm:px-4 pro-27:px-5 text-[10px] sm:text-[10.5px] pro-27:text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-[24%] whitespace-nowrap">

                  Architectural Metric

                </th>

                <th className="py-2 pro-27:py-3.5 px-3 sm:px-4 pro-27:px-5 text-[10px] sm:text-[10.5px] pro-27:text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400 w-[15%] whitespace-nowrap">

                  Static ADRs

                  <span className="block text-[8.5px] pro-27:text-[9.5px] text-slate-400 dark:text-slate-500 font-sans font-normal mt-0.5 whitespace-nowrap">adr-tools / Log4brains</span>

                </th>

                <th className="py-2 pro-27:py-3.5 px-3 sm:px-4 pro-27:px-5 text-[10px] sm:text-[10.5px] pro-27:text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400 w-[17%] whitespace-nowrap">

                  Vector RAG

                  <span className="block text-[8.5px] pro-27:text-[9.5px] text-slate-400 dark:text-slate-500 font-sans font-normal mt-0.5 whitespace-nowrap">Cursor @codebase / LangChain</span>

                </th>

                <th className="py-2 pro-27:py-3.5 px-3 sm:px-4 pro-27:px-5 text-[10px] sm:text-[10.5px] pro-27:text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400 w-[16%] whitespace-nowrap">

                  Static Linters

                  <span className="block text-[8.5px] pro-27:text-[9.5px] text-slate-400 dark:text-slate-500 font-sans font-normal mt-0.5 whitespace-nowrap">ArchUnit / Semgrep / CodeRabbit</span>

                </th>

                {/* Elevated Solitary CAVDAX Column Header */}

                <th className="py-2 pro-27:py-3.5 px-3 sm:px-4 pro-27:px-5 text-[10.5px] sm:text-[11px] pro-27:text-[11.5px] font-mono font-bold text-slate-950 dark:text-white bg-slate-100/90 dark:bg-[#161B22]/90 border-l border-r border-slate-300 dark:border-white/20 border-t-2 border-t-[#d9a353] shadow-md z-10 w-[28%] whitespace-nowrap">

                  <div className="flex items-start gap-1.5">

                    <span className="text-[#d9a353] font-mono select-none leading-tight mt-0.5">•</span>

                    <div>

                      <div className="leading-tight">CAVDAX Causal Gate</div>

                      <div className="text-[8.5px] pro-27:text-[9.5px] text-slate-500 dark:text-slate-400 font-sans font-normal mt-0.5 whitespace-nowrap leading-tight">

                        FalkorDB GraphBLAS + MCP

                      </div>

                    </div>

                  </div>

                </th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-xs">

              {COMPARISON_DATA.map((row, idx) => (

                <tr 

                  key={idx}

                  className="hover:bg-slate-100/40 dark:hover:bg-white/[0.015] transition-colors"

                >

                  <td className="py-1.5 sm:py-2 pro-27:py-3.5 px-3 sm:px-4 pro-27:px-5 whitespace-nowrap">

                    <div className="font-semibold text-slate-900 dark:text-white font-mono text-[11px] sm:text-[11.5px] pro-27:text-[12px] whitespace-nowrap">

                      {row.capability}

                    </div>

                    <div className="text-[8.5px] sm:text-[9px] pro-27:text-[10px] text-slate-500 dark:text-slate-400 font-sans mt-0.5 whitespace-nowrap">

                      {row.description}

                    </div>

                  </td>

                  <td className="py-1.5 sm:py-2 pro-27:py-3.5 px-3 sm:px-4 pro-27:px-5 text-slate-600 dark:text-slate-400 font-mono text-[10.5px] sm:text-[11px] pro-27:text-[11.5px] whitespace-nowrap">

                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">

                      <span className="text-slate-400 dark:text-slate-500 select-none">—</span>

                      <span>{row.staticAdrs}</span>

                    </span>

                  </td>

                  <td className="py-1.5 sm:py-2 pro-27:py-3.5 px-3 sm:px-4 pro-27:px-5 text-slate-600 dark:text-slate-400 font-mono text-[10.5px] sm:text-[11px] pro-27:text-[11.5px] whitespace-nowrap">

                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">

                      <span className="text-slate-400 dark:text-slate-500 select-none">—</span>

                      <span>{row.vectorRag}</span>

                    </span>

                  </td>

                  <td className="py-1.5 sm:py-2 pro-27:py-3.5 px-3 sm:px-4 pro-27:px-5 text-slate-600 dark:text-slate-400 font-mono text-[10.5px] sm:text-[11px] pro-27:text-[11.5px] whitespace-nowrap">

                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">

                      <span className="text-slate-400 dark:text-slate-500 select-none">—</span>

                      <span>{row.astLinters}</span>

                    </span>

                  </td>

                  {/* Elevated Solitary CAVDAX Cell */}

                  <td className="py-1.5 sm:py-2 pro-27:py-3.5 px-3 sm:px-4 pro-27:px-5 font-mono text-[11px] sm:text-[11.5px] pro-27:text-[12px] font-bold text-slate-950 dark:text-white bg-slate-100/90 dark:bg-[#161B22]/90 border-l border-r border-slate-300 dark:border-white/20 shadow-md z-10 whitespace-nowrap">

                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">

                      <span className="text-[#d9a353] dark:text-[#d9a353] font-mono select-none shrink-0">•</span>

                      <span>{row.cavdax}</span>

                    </span>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>



        {/* Clean, Non-AI Understated Bottom Bar */}

        <div className="py-1.5 sm:py-2 pro-27:p-3 px-3 sm:px-4 pro-27:px-5 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between text-[10px] sm:text-[10.5px] pro-27:text-[11px] text-slate-500 dark:text-slate-400 font-sans">

          <span>Evaluated deterministically via Boolean Semiring adjacency reachability.</span>

          <span className="font-mono text-[9px] sm:text-[9.5px] pro-27:text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider">Formal GraphBLAS Gate</span>

        </div>

      </div>

    </section>

  );

}

