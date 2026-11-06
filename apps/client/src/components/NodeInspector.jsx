import { motion } from 'framer-motion';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, GripHorizontal, Zap, AlertTriangle, CheckCircle2, Database, Clock, ExternalLink, Activity, GitPullRequest, Loader2, FileCode2, ChevronDown, Search } from 'lucide-react';
import { playClick } from '../utils/soundFx';

export default function NodeInspector({
  node,
  graphData,
  onClose,
  isFalkorDB,
  repo,
  branch = 'main',
  onToggleSimulate,
  isSimulating = false,
  onOpenSyncPr,
  hasDrift = false,
  onTestDecision,
  isVerifyingAction = false,
  isFullscreen = false,
  hasBlastBanner = false,
  containerRef
}) {
  if (!node) return null;

  const [customSize, setCustomSize] = useState(null); // { width, height }
  const [isResizing, setIsResizing] = useState(false);
  const [isFilesComboboxOpen, setIsFilesComboboxOpen] = useState(false);
  const [fileFilter, setFileFilter] = useState('');
  const filesComboboxRef = useRef(null);

  useEffect(() => {
    setIsFilesComboboxOpen(false);
    setFileFilter('');
  }, [node?.id]);

  useEffect(() => {
    if (!isFilesComboboxOpen) return;
    const handleOutsideClick = (e) => {
      if (filesComboboxRef.current && !filesComboboxRef.current.contains(e.target)) {
        setIsFilesComboboxOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isFilesComboboxOpen]);
  const inspectorCardRef = useRef(null);

  const handleResizeMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const currentRect = inspectorCardRef.current?.getBoundingClientRect();
    const startW = currentRect ? currentRect.width : (isFullscreen ? 320 : 288);
    const startH = currentRect ? currentRect.height : 360;

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const newWidth = Math.max(260, Math.min(680, startW + deltaX));
      const newHeight = Math.max(200, Math.min(window.innerHeight * 0.85, startH + deltaY));
      setCustomSize({ width: newWidth, height: newHeight });
    };

    const onMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Discover all target code files associated with this node (directly or through DAG lineage)
  const supersessionDiff = useMemo(() => {
    if (!node || !graphData?.edges || !graphData?.nodes) return null;
    const nodeMap = new Map(graphData.nodes.map(n => [n.id, n]));

    // Check if this node is superseded by another
    const supersedingEdge = graphData.edges.find(e => e.type === 'SUPERSEDES' && (e.target === node.id || e.target?.id === node.id));
    if (supersedingEdge) {
      const activeId = typeof supersedingEdge.source === 'object' ? supersedingEdge.source.id : supersedingEdge.source;
      const activeNode = nodeMap.get(activeId);
      if (activeNode) {
        return {
          type: 'SUPERSEDED_BY',
          deprecatedNode: node,
          activeNode: activeNode
        };
      }
    }

    // Check if this node supersedes an older node
    const supersededEdge = graphData.edges.find(e => e.type === 'SUPERSEDES' && (e.source === node.id || e.source?.id === node.id));
    if (supersededEdge) {
      const depId = typeof supersededEdge.target === 'object' ? supersededEdge.target.id : supersededEdge.target;
      const depNode = nodeMap.get(depId);
      if (depNode) {
        return {
          type: 'SUPERSEDES',
          deprecatedNode: depNode,
          activeNode: node
        };
      }
    }

    // Check REPLACES for decisions
    const replacingEdge = graphData.edges.find(e => e.type === 'REPLACES' && (e.target === node.id || e.target?.id === node.id));
    if (replacingEdge) {
      const activeId = typeof replacingEdge.source === 'object' ? replacingEdge.source.id : replacingEdge.source;
      const activeNode = nodeMap.get(activeId);
      if (activeNode) {
        return {
          type: 'SUPERSEDED_BY',
          deprecatedNode: node,
          activeNode: activeNode
        };
      }
    }

    const replacedEdge = graphData.edges.find(e => e.type === 'REPLACES' && (e.source === node.id || e.source?.id === node.id));
    if (replacedEdge) {
      const depId = typeof replacedEdge.target === 'object' ? replacedEdge.target.id : replacedEdge.target;
      const depNode = nodeMap.get(depId);
      if (depNode) {
        return {
          type: 'SUPERSEDES',
          deprecatedNode: depNode,
          activeNode: node
        };
      }
    }

    return null;
  }, [node, graphData]);

  const affectedCodeFiles = useMemo(() => {
    if (!node) return [];
    const filesSet = new Set();

    const addFile = (f) => {
      if (!f || typeof f !== 'string') return;
      const parts = f.includes(',') ? f.split(',') : [f];
      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed && !trimmed.endsWith('.md')) {
          filesSet.add(trimmed);
        }
      }
    };

    // 1. Direct targets on this node
    if (Array.isArray(node.target_files)) node.target_files.forEach(addFile);
    if (Array.isArray(node.files)) node.files.forEach(addFile);
    addFile(node.target_file);

    // 2. Discover related target files in graphData
    if (graphData && Array.isArray(graphData.nodes) && Array.isArray(graphData.edges)) {
      // If Source (ADR): gather all target files from downstream Decisions and AgentActions
      if (node.label === 'Source') {
        const factIds = new Set(
          graphData.edges
            .filter(e => e.type === 'EXTRACTED_FROM' && (e.target === node.id || e.source === node.id))
            .map(e => (e.target === node.id ? e.source : e.target))
        );
        const decisionIds = new Set(
          graphData.edges
            .filter(e => e.type === 'DEPENDS_ON' && factIds.has(e.target))
            .map(e => e.source)
        );

        graphData.nodes.forEach(n => {
          if (n.source_adr === node.id || n.from === node.id || decisionIds.has(n.id)) {
            addFile(n.target_file);
            if (Array.isArray(n.target_files)) n.target_files.forEach(addFile);
            decisionIds.add(n.id);
          }
        });

        const actionIds = new Set(
          graphData.edges
            .filter(e => e.type === 'GROUNDED_IN' && decisionIds.has(e.target))
            .map(e => e.source)
        );
        graphData.nodes.forEach(n => {
          if (actionIds.has(n.id) || decisionIds.has(n.decision_id)) {
            addFile(n.target_file);
          }
        });
      }

      // If Decision: gather its target file and any grounded AgentAction files
      if (node.label === 'Decision') {
        const actionIds = new Set(
          graphData.edges
            .filter(e => e.type === 'GROUNDED_IN' && e.target === node.id)
            .map(e => e.source)
        );
        graphData.nodes.forEach(n => {
          if (actionIds.has(n.id) || n.decision_id === node.id) {
            addFile(n.target_file);
          }
        });
      }
    }

    return Array.from(filesSet);
  }, [node, graphData]);

  const isStale =
    node.status === 'SUPERSEDED' ||
    node.status === 'INVALIDATED_NEEDS_REVALIDATION' ||
    node.is_stale;

  // Strict Truth-in-Data: differentiate live FalkorDB demo vs GitHub ADR AST without fuzzy guessing
  const isFalkor = isFalkorDB !== undefined
    ? Boolean(isFalkorDB)
    : Boolean(node.is_demo === true || (node.id?.startsWith('act-') && !node.repo));

  // Dynamic path resolution directly from scanned repository AST
  const adrFilePath = node.file || node.adr_path || (node.ref && !node.ref.includes('://') ? node.ref : null);

  // Target code file path (distinct from ADR markdown)
  const codeFilePath = (node.target_file && !node.target_file.endsWith('.md')) ? node.target_file : null;

  const adrGitUrl = (repo?.full_name && adrFilePath)
    ? `https://github.com/${repo.full_name}/blob/${branch}/${adrFilePath.replace(/^\.?\//, '')}`
    : null;

  const codeGitUrl = (repo?.full_name && codeFilePath)
    ? `https://github.com/${repo.full_name}/blob/${branch}/${codeFilePath.replace(/^\.?\//, '')}`
    : null;

  return (
    <motion.div
      ref={inspectorCardRef}
      drag
      dragMomentum={false}
      dragConstraints={containerRef || false}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      style={{
        width: customSize ? `${customSize.width}px` : undefined,
        height: customSize ? `${customSize.height}px` : undefined,
      }}
      className={`absolute ${hasBlastBanner ? 'top-16' : 'top-12'} right-3 sm:right-4 ${
        customSize ? '' : (isFullscreen ? 'w-76 sm:w-80' : 'w-68 sm:w-72')
      } max-w-[calc(100%-1.5rem)] max-h-[calc(100%-4rem)] overflow-x-auto overflow-y-auto has-scrubbar bg-white/95 dark:bg-[#0B0D11]/95 border border-slate-300 dark:border-white/15 rounded-2xl p-3 sm:p-3.5 shadow-2xl backdrop-blur-xl z-30 font-mono text-xs select-text ${
        isResizing ? 'select-none cursor-nwse-resize' : ''
      }`}
      data-lenis-prevent
    >
      {/* Header with Draggable Handle */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/15 pb-2 mb-2.5">
        <div className="flex items-center gap-1.5 min-w-0 cursor-grab active:cursor-grabbing" title="Drag to reposition inspector card">
          <GripHorizontal className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 hover:text-slate-800 dark:hover:text-white transition-colors" />
          {isStale ? (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
          )}
          <span className="font-bold text-slate-800 dark:text-slate-100 truncate text-[11px]">
            Node: <span className="text-slate-950 dark:text-white font-bold">{node.id}</span>
          </span>
        </div>
        <button
          onClick={() => {
            playClick();
            if (onClose) onClose();
          }}
          className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors tactile-btn shrink-0 cursor-pointer"
          aria-label="Close Inspector"
        >
          <X className="w-3.5 h-3.5 text-current transition-colors" />
        </button>
      </div>

      {/* Node Properties Grid */}
      <div className="space-y-2">
        {/* Double-bezel inner metadata card */}
        <div className="bezel-inner p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Graph Label</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#161B22] border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-300 font-bold text-[10px]">
              :{node.label}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Causal Status</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                isStale
                  ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/40'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/40'
              }`}
            >
              {node.status || (node.is_stale ? 'STALE' : 'ACTIVE')}
            </span>
          </div>

          {node.verified !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Grounded In DAG</span>
              <span className={`text-[10px] font-bold ${node.verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {node.verified ? 'TRUE' : 'FALSE'}
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        {node.title && (
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
              Title / Directive
            </span>
            <div className="text-slate-800 dark:text-slate-200 font-sans text-xs bg-slate-50 dark:bg-[#060709] p-2.5 rounded-lg border border-slate-200 dark:border-white/15 leading-relaxed">
              {node.title}
            </div>
          </div>
        )}

        {node.claim && (
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
              Extracted Fact Claim
            </span>
            <div className="text-slate-800 dark:text-slate-200 font-sans text-xs bg-slate-50 dark:bg-[#060709] p-2.5 rounded-lg border border-slate-200 dark:border-white/15 leading-relaxed italic">
              "{node.claim}"
            </div>
          </div>
        )}

        {affectedCodeFiles.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                {affectedCodeFiles.length > 1 ? `Impacted Code Files (${affectedCodeFiles.length})` : 'Target Code File'}
              </span>
              {affectedCodeFiles.length > 1 && (
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold">
                  Multi-File Impact
                </span>
              )}
            </div>
            {affectedCodeFiles.length === 1 ? (
              repo?.full_name ? (
                <a
                  href={`https://github.com/${repo.full_name}/blob/${branch}/${affectedCodeFiles[0].replace(/^\.?\//, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={playClick}
                  className="flex items-center gap-1.5 text-slate-800 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white font-mono truncate text-[11px] group transition-colors no-underline"
                  title={`Open ${affectedCodeFiles[0]} on GitHub`}
                >
                  <FileCode2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white shrink-0" />
                  <span className="truncate underline underline-offset-2">{affectedCodeFiles[0]}</span>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white shrink-0 ml-auto opacity-70 group-hover:opacity-100" />
                </a>
              ) : (
                <span className="text-slate-800 hover:text-black dark:text-slate-200 dark:hover:text-white font-mono truncate block text-[11px]" title={affectedCodeFiles[0]}>
                  {affectedCodeFiles[0]}
                </span>
              )
            ) : affectedCodeFiles.length <= 3 ? (
              /* 2 to 3 files: Direct compact list with zero friction */
              <div className="space-y-1 max-h-24 overflow-y-auto has-scrubbar pr-1">
                {affectedCodeFiles.map((file, fIdx) => {
                  const fileUrl = repo?.full_name
                    ? `https://github.com/${repo.full_name}/blob/${branch}/${file.replace(/^\.?\//, '')}`
                    : null;
                  return fileUrl ? (
                    <a
                      key={fIdx}
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={playClick}
                      className="flex items-center justify-between gap-1.5 text-[10.5px] font-mono text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/10 px-2 py-1 rounded border border-slate-200 dark:border-white/10 transition-colors no-underline group"
                      title={`Open ${file} on GitHub`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileCode2 className="w-3 h-3 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white shrink-0" />
                        <span className="truncate">{file}</span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white shrink-0 opacity-70 group-hover:opacity-100" />
                    </a>
                  ) : (
                    <div key={fIdx} className="flex items-center gap-1.5 text-[10.5px] font-mono text-slate-700 dark:text-slate-300 truncate bg-slate-50 dark:bg-white/[0.03] px-2 py-1 rounded border border-slate-200 dark:border-white/10" title={file}>
                      <FileCode2 className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{file}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* > 3 files: Searchable combobox dropdown to prevent card bloat */
              <div className="relative" ref={filesComboboxRef}>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setIsFilesComboboxOpen(prev => !prev);
                  }}
                  className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 font-mono text-[11px] transition-colors cursor-pointer"
                  title="Browse impacted target files"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileCode2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                    <span className="truncate font-semibold">{affectedCodeFiles.length} Impacted Files</span>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform duration-150 ${isFilesComboboxOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                {isFilesComboboxOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -4 }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute left-0 top-full mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111318] shadow-xl z-50 overflow-hidden text-left flex flex-col font-sans"
                  >
                    <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-white/[0.02]">
                      <div className="relative">
                        <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={fileFilter}
                          onChange={(e) => setFileFilter(e.target.value)}
                          placeholder={`Filter ${affectedCodeFiles.length} files...`}
                          className="w-full pl-6 pr-2 py-1 text-[11px] rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 font-mono"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-40 overflow-y-auto has-scrubbar divide-y divide-slate-100 dark:divide-white/5 p-1">
                      {filteredFiles.length > 0 ? (
                        filteredFiles.map((file, fIdx) => {
                          const fileUrl = repo?.full_name
                            ? `https://github.com/${repo.full_name}/blob/${branch}/${file.replace(/^\.?\//, '')}`
                            : null;
                          return fileUrl ? (
                            <a
                              key={fIdx}
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={playClick}
                              className="flex items-center justify-between gap-1.5 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-white/10 text-[10.5px] font-mono text-slate-800 dark:text-slate-200 transition-colors no-underline group"
                              title={`Open ${file} on GitHub`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <FileCode2 className="w-3 h-3 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white shrink-0" />
                                <span className="truncate">{file}</span>
                              </div>
                              <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white shrink-0 opacity-70 group-hover:opacity-100" />
                            </a>
                          ) : (
                            <div
                              key={fIdx}
                              className="flex items-center justify-between gap-1.5 p-1.5 text-[10.5px] font-mono text-slate-700 dark:text-slate-300"
                              title={file}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <FileCode2 className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate">{file}</span>
                              </div>
                              <span className="text-[9px] uppercase px-1 rounded bg-slate-200 dark:bg-white/10 text-slate-500 font-bold shrink-0">Demo</span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-2 text-center text-[10.5px] text-slate-400 font-mono">
                          No matching files found
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {node.ref && (
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">
              Source File Provenance
            </span>
            <span className="text-slate-800 hover:text-black dark:text-slate-200 dark:hover:text-white font-mono truncate block text-[11px]">
              {node.ref}
            </span>
          </div>
        )}

        {node.latency_ms !== undefined && (
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Gate Latency:</span>
            <span className="font-bold text-slate-900 dark:text-white">{node.latency_ms}ms</span>
          </div>
        )}

        {/* Interactive Actions Suite: Blast Radius Simulation & Git Actions */}
        <div className="pt-2 border-t border-slate-200 dark:border-white/15 space-y-2">
          {node.label === 'Decision' && onTestDecision && (
            <button
              onClick={() => {
                playClick();
                onTestDecision(node.id);
              }}
              disabled={isVerifyingAction}
              className="w-full py-1.5 px-3 rounded-lg border border-slate-900 dark:border-white bg-slate-900 dark:bg-white text-white dark:text-slate-950 text-[11px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer tactile-btn shadow-xs disabled:opacity-50"
            >
              {isVerifyingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" strokeWidth={2} /> : <Zap className="w-3.5 h-3.5 shrink-0" />}
              <span>{isVerifyingAction ? 'Verifying Gate...' : `Verify Agent Write on ${node.id}`}</span>
            </button>
          )}
          {onToggleSimulate && (
            <button
              onClick={() => {
                playClick();
                onToggleSimulate(node);
              }}
              className={`w-full py-1.5 px-3 rounded-lg border text-[11px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer tactile-btn ${
                isSimulating
                  ? 'bg-rose-500 text-white border-rose-600 shadow-sm animate-pulse'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/60 hover:bg-amber-100 dark:hover:bg-amber-900/50'
              }`}
            >
              <Activity className="w-3.5 h-3.5 shrink-0" />
              <span>{isSimulating ? 'Stop Blast Simulation' : 'Simulate Invalidation (What-If)'}</span>
            </button>
          )}

          {adrGitUrl && (
            <a
              href={adrGitUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={playClick}
              className="w-full py-1.5 px-3 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 text-[11px] font-bold font-mono transition-colors flex items-center justify-center gap-1.5 cursor-pointer tactile-btn no-underline"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-600 dark:text-slate-400" />
              <span>{node.label === 'Source' ? 'View ADR on GitHub' : 'View Source ADR on GitHub'}</span>
            </a>
          )}

          {hasDrift && onOpenSyncPr && (
            <button
              onClick={() => {
                playClick();
                onOpenSyncPr(node);
              }}
              className="w-full py-1.5 px-3 rounded-lg border border-amber-400 bg-amber-400/20 hover:bg-amber-400/30 text-amber-900 dark:text-amber-200 text-[11px] font-bold font-mono transition-colors flex items-center justify-center gap-1.5 cursor-pointer tactile-btn"
            >
              <GitPullRequest className="w-3.5 h-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
              <span>Open Status Sync PR</span>
            </button>
          )}
        </div>

        {/* Footer Info — Genuine storage provenance per Section 37 Truth in Data */}
        <div className="pt-2.5 border-t border-slate-200 dark:border-white/15 text-[10px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1 font-mono">
            <Database className="w-3 h-3 text-slate-800 dark:text-white" />
            {isFalkor ? 'FalkorDB GraphBLAS' : 'GitHub ADR AST'}
          </span>
          <span className="flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            {isFalkor ? 'Live Synced' : 'Branch Head (Git)'}
          </span>
        </div>
      </div>

      {/* Corner Resize Grip */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5 z-40 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        title="Drag corner to resize inspector"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="shrink-0 pointer-events-none">
          <path d="M7 1L1 7M7 4L4 7M7 7H7.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
    </motion.div>
  );
}
