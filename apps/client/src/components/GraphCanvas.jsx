import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw, Database, Scan, Activity, Download, Layers, CheckCheck, AlertTriangle, Search, PanelLeftOpen, Share2, ChevronDown, Check } from 'lucide-react';
import { playClick } from '../utils/soundFx';
import NodeInspector from './NodeInspector';
import CommandPalette from './CommandPalette';
import Tooltip from './Tooltip';

// Container-Relative Slider Tracker Hook (Immune to scroll jumps, unmount morphs, and cross-screen Y-flying)
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

function computeDownstreamBlast(nodes, edges, rootNodeId) {
  if (!rootNodeId) return { blastNodeIds: new Set(), summary: { facts: 0, decisions: 0, actions: 0, files: [] } };
  const blastNodeIds = new Set();
  const queue = [rootNodeId];
  const dependentMap = new Map();

  for (const edge of edges) {
    if (['EXTRACTED_FROM', 'DEPENDS_ON', 'GROUNDED_IN', 'ACTION_ON'].includes(edge.type)) {
      if (!dependentMap.has(edge.target)) dependentMap.set(edge.target, []);
      dependentMap.get(edge.target).push(edge.source);
    }
    if (edge.type === 'SUPERSEDES') {
      if (!dependentMap.has(edge.source)) dependentMap.set(edge.source, []);
      dependentMap.get(edge.source).push(edge.target);
    }
  }

  while (queue.length > 0) {
    const curr = queue.shift();
    const deps = dependentMap.get(curr) || [];
    for (const d of deps) {
      if (!blastNodeIds.has(d)) {
        blastNodeIds.add(d);
        queue.push(d);
      }
    }
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const files = [];
  let facts = 0;
  let decisions = 0;
  let actions = 0;

  for (const id of blastNodeIds) {
    const n = nodeMap.get(id);
    if (!n) continue;
    if (n.label === 'Fact') facts++;
    else if (n.label === 'Decision') decisions++;
    else if (n.label === 'AgentAction') {
      actions++;
      if (n.target_file && !files.includes(n.target_file)) files.push(n.target_file);
    }
  }

  return { blastNodeIds, summary: { facts, decisions, actions, files } };
}

export default function GraphCanvas({
  graphData,
  onSelectNode,
  selectedNodeId,
  selectedNode,
  onCloseNode,
  isDarkTheme = true,
  title = 'FalkorDB Temporal Causal Graph',
  repo,
  branch = 'main',
  unsyncedList = [],
  onOpenSyncPr,
  isDemo = false,
  onTestDecision,
  isVerifyingAction = false,
  isSidebarCollapsed = false,
  onToggleSidebar
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const [isCopiedPermalink, setIsCopiedPermalink] = useState(false);
  const zoomMenuRef = useRef(null);
  const containerRef = useRef(null);
  const [canvasWidth, setCanvasWidth] = useState(1000);
  const [simulatedBlastNode, setSimulatedBlastNode] = useState(null);
  const [driftFilter, setDriftFilter] = useState('ALL'); // 'ALL' | 'GROUNDED' | 'DRIFTED'
  const driftPill = usePillTracker(driftFilter, canvasWidth);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const searchKbd = isMac ? '⌘K' : 'Ctrl+K';

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect && entry.contentRect.width) {
          setCanvasWidth(entry.contentRect.width);
        }
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        playClick();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNodeSelectAndCenter = (node) => {
    if (onSelectNode) onSelectNode(node);
    if (node && node.x !== undefined && node.y !== undefined && containerRef.current) {
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      setPan({ x: cw / 2 - node.x * zoom, y: ch / 2 - node.y * zoom });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    playClick();
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Dismiss zoom preset popover on outside click or Escape
  useEffect(() => {
    if (!isZoomMenuOpen) return;
    const handleClickOutside = (e) => {
      if (zoomMenuRef.current && !zoomMenuRef.current.contains(e.target)) {
        setIsZoomMenuOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsZoomMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isZoomMenuOpen]);

  const handleFitToScreen = () => {
    if (containerRef.current) {
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const scaleX = (cw - 48) / 880;
      const scaleY = (ch - 64) / Math.max(canvasHeight, 440);
      const fitScale = Math.max(0.4, Math.min(1.4, Math.min(scaleX, scaleY)));
      setZoom(Number(fitScale.toFixed(2)));
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };

  const handleSharePermalink = () => {
    playClick();
    let url = window.location.href;
    try {
      const parsed = new URL(window.location.href);
      if (selectedNodeId) {
        parsed.searchParams.set('node', selectedNodeId);
      } else {
        parsed.searchParams.delete('node');
      }
      url = parsed.toString();
    } catch {
      // fallback
    }
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setIsCopiedPermalink(true);
        setTimeout(() => setIsCopiedPermalink(false), 2000);
      }).catch(() => {
        setIsCopiedPermalink(true);
        setTimeout(() => setIsCopiedPermalink(false), 2000);
      });
    } else {
      setIsCopiedPermalink(true);
      setTimeout(() => setIsCopiedPermalink(false), 2000);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = -e.deltaY * 0.0012;
    setZoom((prev) => Math.max(0.5, Math.min(2.5, prev + zoomFactor)));
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const rawNodes = graphData?.nodes || [];
  const rawEdges = graphData?.edges || [];

  // Compute blast radius reachability when a node simulation is active
  const { blastNodeIds, summary: blastSummary } = useMemo(() => {
    return computeDownstreamBlast(rawNodes, rawEdges, simulatedBlastNode?.id);
  }, [rawNodes, rawEdges, simulatedBlastNode?.id]);

  // Dynamic Hierarchical Columnar Layout Engine (Memoized across theme and state toggles)
  const { nodes, edges, canvasHeight } = useMemo(() => {
    const filteredRawNodes = rawNodes.filter(node => {
      if (driftFilter === 'GROUNDED') {
        const isStale = node.status === 'SUPERSEDED' || node.status === 'INVALIDATED_NEEDS_REVALIDATION' || node.is_stale;
        const isBlockedAction = (node.label === 'AgentAction' || node.id?.startsWith('act-')) && (node.status === 'BLOCKED' || node.status === 'BLOCKED_SUPERSEDED_SOURCE');
        return !isStale && !isBlockedAction;
      }
      if (driftFilter === 'DRIFTED') {
        const isStale = node.status === 'SUPERSEDED' || node.status === 'INVALIDATED_NEEDS_REVALIDATION' || node.is_stale;
        const isBlockedAction = (node.label === 'AgentAction' || node.id?.startsWith('act-')) && (node.status === 'BLOCKED' || node.status === 'BLOCKED_SUPERSEDED_SOURCE');
        const hasDrift = unsyncedList.some(u => u.targetId === node.id);
        return isStale || isBlockedAction || hasDrift || blastNodeIds.has(node.id);
      }
      return true;
    });

    const LAYER_X = {
      Source: 95,
      Fact: 295,
      Decision: 495,
      AgentAction: 715
    };

    const sources = filteredRawNodes
      .filter(n => n.label === 'Source')
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

    const facts = filteredRawNodes.filter(n => n.label === 'Fact');
    const decisions = filteredRawNodes.filter(n => n.label === 'Decision');
    const actions = filteredRawNodes.filter(n => n.label === 'AgentAction' || n.id?.startsWith('act-'));

    const maxColumnItems = Math.max(sources.length, facts.length, decisions.length, actions.length, 1);
    const computedHeight = Math.max(440, maxColumnItems * 95 + 40);

    function getColumnYPositions(count, totalHeight) {
      if (count <= 0) return [];
      if (count === 1) return [totalHeight / 2];
      if (count === 2) return [145, 295];
      if (count === 3) return [95, 220, 345];
      if (count === 4) return [60, 160, 260, 360];
      const topPadding = 55;
      const bottomPadding = 55;
      const usable = totalHeight - topPadding - bottomPadding;
      const step = usable / (count - 1);
      return Array.from({ length: count }, (_, i) => Math.round(topPadding + i * step));
    }

    const sourceYs = getColumnYPositions(sources.length, computedHeight);
    const factYs = getColumnYPositions(facts.length, computedHeight);
    const decYs = getColumnYPositions(decisions.length, computedHeight);

    const calculatedPositions = new Map();

    sources.forEach((s, idx) => {
      calculatedPositions.set(s.id, { x: LAYER_X.Source, y: sourceYs[idx] });
    });

    facts.forEach((f, idx) => {
      calculatedPositions.set(f.id, { x: LAYER_X.Fact, y: factYs[idx] });
    });

    decisions.forEach((d, idx) => {
      calculatedPositions.set(d.id, { x: LAYER_X.Decision, y: decYs[idx] });
    });

    // Align AgentAction nodes with their target Decision whenever possible
    const actionYs = getColumnYPositions(actions.length, computedHeight);
    actions.forEach((act, idx) => {
      const groundedEdge = rawEdges.find(e => (e.source === act.id && e.type === 'GROUNDED_IN') || (e.type === 'ACTION_ON' && e.source === act.id));
      const targetDecId = groundedEdge?.target || act.decision_id;
      const targetDecPos = targetDecId ? calculatedPositions.get(targetDecId) : null;
      const posY = targetDecPos ? targetDecPos.y : actionYs[idx];
      calculatedPositions.set(act.id, { x: LAYER_X.AgentAction, y: posY });
    });

    const computedNodes = filteredRawNodes.map((node) => {
      const pos = calculatedPositions.get(node.id) || { x: LAYER_X[node.label] || 495, y: 220 };
      return { ...node, ...pos };
    });

    const nodeMap = new Map(computedNodes.map(n => [n.id, n]));

    const computedEdges = rawEdges.map(edge => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      return { ...edge, sourceNode, targetNode };
    }).filter(e => e.sourceNode && e.targetNode);

    return { nodes: computedNodes, edges: computedEdges, canvasHeight: computedHeight };
  }, [rawNodes, rawEdges, driftFilter, blastNodeIds, unsyncedList]);

  // Auto-center on deep-linked node (?node=xyz) if provided
  useEffect(() => {
    if (typeof window === 'undefined' || !nodes || nodes.length === 0) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const targetNodeId = params.get('node');
      if (targetNodeId && (!selectedNodeId || selectedNodeId !== targetNodeId)) {
        const found = nodes.find(n => n.id === targetNodeId);
        if (found) {
          handleNodeSelectAndCenter(found);
        }
      }
    } catch {
      // ignore
    }
  }, [graphData]);

  function getNodeColors(node) {
    const inBlast = blastNodeIds.has(node.id);
    if (inBlast) {
      return {
        fill: isDarkTheme ? '#2A0B12' : '#FFF1F2',
        stroke: '#F43F5E',
        glow: 'rgba(244, 63, 94, 0.5)',
        text: isDarkTheme ? '#FECDD3' : '#9F1239',
        badge: 'BLAST_IMPACT'
      };
    }

    if (isDarkTheme) {
      if (node.label === 'Source') {
        if (node.status === 'SUPERSEDED') {
          return {
            fill: '#240B10',
            stroke: '#FB7185',
            glow: 'rgba(251, 113, 133, 0.3)',
            text: '#FECDD3',
            badge: 'SUPERSEDED'
          };
        }
        return {
          fill: '#11141B',
          stroke: '#FFFFFF',
          glow: 'rgba(255, 255, 255, 0.25)',
          text: '#FFFFFF',
          badge: 'ACTIVE'
        };
      }

      if (node.label === 'Fact') {
        if (node.is_stale) {
          return {
            fill: '#240B10',
            stroke: '#FB7185',
            glow: 'rgba(251, 113, 133, 0.3)',
            text: '#FECDD3',
            badge: 'STALE'
          };
        }
        return {
          fill: '#11141B',
          stroke: '#94A3B8',
          glow: 'rgba(148, 163, 184, 0.2)',
          text: '#FFFFFF',
          badge: 'ACTIVE'
        };
      }

      if (node.label === 'Decision') {
        if (node.status === 'INVALIDATED_NEEDS_REVALIDATION') {
          return {
            fill: '#240B10',
            stroke: '#FB7185',
            glow: 'rgba(251, 113, 133, 0.3)',
            text: '#FECDD3',
            badge: 'INVALIDATED'
          };
        }
        if (node.status === 'REPLACED_ARCHIVED') {
          return {
            fill: '#0F1218',
            stroke: '#475569',
            glow: 'none',
            text: '#94A3B8',
            badge: 'ARCHIVED'
          };
        }
        return {
          fill: '#18130B',
          stroke: '#F59E0B',
          glow: 'rgba(245, 158, 11, 0.3)',
          text: '#FEF3C7',
          badge: 'VALID'
        };
      }

      if (node.label === 'AgentAction' || node.id?.startsWith('act-')) {
        if (node.status === 'APPROVED' || node.status === 'EXECUTED') {
          return {
            fill: '#061D15',
            stroke: '#10B981',
            glow: 'rgba(16, 185, 129, 0.35)',
            text: '#A7F3D0',
            badge: 'APPROVED'
          };
        }
        return {
          fill: '#240B10',
          stroke: '#FB7185',
          glow: 'rgba(251, 113, 133, 0.35)',
          text: '#FECDD3',
          badge: 'BLOCKED'
        };
      }

      return {
        fill: '#11141B',
        stroke: '#475569',
        glow: 'none',
        text: '#94A3B8',
        badge: 'UNKNOWN'
      };
    } else {
      if (node.label === 'Source') {
        if (node.status === 'SUPERSEDED') {
          return {
            fill: '#FFF1F2',
            stroke: '#F43F5E',
            glow: 'rgba(244, 63, 94, 0.25)',
            text: '#9F1239',
            badge: 'SUPERSEDED'
          };
        }
        return {
          fill: '#FFFFFF',
          stroke: '#0F172A',
          glow: 'rgba(15, 23, 42, 0.15)',
          text: '#0F172A',
          badge: 'ACTIVE'
        };
      }

      if (node.label === 'Fact') {
        if (node.is_stale) {
          return {
            fill: '#FFF1F2',
            stroke: '#F43F5E',
            glow: 'rgba(244, 63, 94, 0.25)',
            text: '#9F1239',
            badge: 'STALE'
          };
        }
        return {
          fill: '#FFFFFF',
          stroke: '#64748B',
          glow: 'rgba(100, 116, 139, 0.15)',
          text: '#0F172A',
          badge: 'ACTIVE'
        };
      }

      if (node.label === 'Decision') {
        if (node.status === 'INVALIDATED_NEEDS_REVALIDATION') {
          return {
            fill: '#FFF1F2',
            stroke: '#F43F5E',
            glow: 'rgba(244, 63, 94, 0.25)',
            text: '#9F1239',
            badge: 'INVALIDATED'
          };
        }
        if (node.status === 'REPLACED_ARCHIVED') {
          return {
            fill: '#F8FAFC',
            stroke: '#94A3B8',
            glow: 'none',
            text: '#64748B',
            badge: 'ARCHIVED'
          };
        }
        return {
          fill: '#FFFDF5',
          stroke: '#D97706',
          glow: 'rgba(217, 119, 6, 0.2)',
          text: '#78350F',
          badge: 'VALID'
        };
      }

      if (node.label === 'AgentAction' || node.id?.startsWith('act-')) {
        if (node.status === 'APPROVED' || node.status === 'EXECUTED') {
          return {
            fill: '#ECFDF5',
            stroke: '#059669',
            glow: 'rgba(5, 150, 105, 0.25)',
            text: '#065F46',
            badge: 'APPROVED'
          };
        }
        return {
          fill: '#FFF1F2',
          stroke: '#F43F5E',
          glow: 'rgba(244, 63, 94, 0.25)',
          text: '#9F1239',
          badge: 'BLOCKED'
        };
      }

      return {
        fill: '#FFFFFF',
        stroke: '#CBD5E1',
        glow: 'none',
        text: '#64748B',
        badge: 'UNKNOWN'
      };
    }
  }

  // Client-Side Standalone Vector SVG Serializer:
  // Exports 100% of the live graph DAG with dynamic height bounding box,
  // preventing small-window viewport clipping and preserving all connected repo nodes & blast annotations.
  const handleDownloadGraph = () => {
    playClick();
    try {
      const exportWidth = 880;
      const exportHeight = canvasHeight + 70;
      const bgFill = isDarkTheme ? '#060709' : '#F8FAFC';
      const textMain = isDarkTheme ? '#F8FAFC' : '#0F172A';
      const textMuted = isDarkTheme ? '#94A3B8' : '#64748B';
      const repoName = repo?.name || repo?.full_name || 'Demo Sandbox';

      // 1. Vector Marker Defs
      const defs = `
        <defs>
          <marker id="dl-arrow-default" viewBox="0 0 10 10" refX="38" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="${isDarkTheme ? '#475569' : '#94A3B8'}" />
          </marker>
          <marker id="dl-arrow-supersedes" viewBox="0 0 10 10" refX="38" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#FB7185" />
          </marker>
          <marker id="dl-arrow-blast" viewBox="0 0 10 10" refX="38" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#F43F5E" />
          </marker>
          <marker id="dl-arrow-decision" viewBox="0 0 10 10" refX="44" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="${isDarkTheme ? "#475569" : "#94A3B8"}" />
          </marker>
          <marker id="dl-arrow-intracolumn-default" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="${isDarkTheme ? "#475569" : "#94A3B8"}" />
          </marker>
          <marker id="dl-arrow-intracolumn-supersedes" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#FB7185" />
          </marker>
          <marker id="dl-arrow-intracolumn-replaces" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="${isDarkTheme ? "#FFFFFF" : "#0F172A"}" />
          </marker>
          <marker id="dl-arrow-intracolumn-blast" viewBox="0 0 10 10" refX="7.5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#F43F5E" />
          </marker>
        </defs>
      `;

      // 2. Vector Edges with Opaque Shield Badges
      const edgesSvg = edges.map((edge) => {
        const isSupersedes = edge.type === 'SUPERSEDES';
        const isReplaces = edge.type === 'REPLACES';
        const isBlast = blastNodeIds.has(edge.source) || blastNodeIds.has(edge.target) || edge.source === simulatedBlastNode?.id;

        let strokeColor = isDarkTheme ? '#334155' : '#CBD5E1';
        let marker = 'url(#dl-arrow-default)';
        let dashAttr = '';

        if (isBlast) {
          strokeColor = '#F43F5E';
          marker = 'url(#dl-arrow-blast)';
          dashAttr = 'stroke-dasharray="5,3"';
        } else if (isSupersedes) {
          strokeColor = '#FB7185';
          marker = 'url(#dl-arrow-supersedes)';
          dashAttr = 'stroke-dasharray="4,3"';
        } else if (isReplaces) {
          strokeColor = isDarkTheme ? '#FFFFFF' : '#0F172A';
          dashAttr = 'stroke-dasharray="5,3"';
        }

        const isIntraColumn = Math.abs(edge.sourceNode.x - edge.targetNode.x) < 30;
        const badgeBg = isDarkTheme ? '#0B0D13' : '#FFFFFF';
        const badgeBorder = isBlast ? '#F43F5E' : (isSupersedes ? '#FB7185' : (isDarkTheme ? '#334155' : '#CBD5E1'));
        const labelColor = isBlast ? '#F43F5E' : (isSupersedes ? '#FB7185' : (isDarkTheme ? '#94A3B8' : '#475569'));
        const badgeW = Math.max(edge.type.length * 5.4 + 12, 44);
        const badgeH = 14;

        const sy = edge.sourceNode.y + 45;
        const ty = edge.targetNode.y + 45;

        if (isIntraColumn) {
          const isSrcDecision = edge.sourceNode.label === "Decision";
          const isTgtDecision = edge.targetNode.label === "Decision";
          const srcX = isSrcDecision ? edge.sourceNode.x - 40 : edge.sourceNode.x - 32;
          const tgtX = isTgtDecision ? edge.targetNode.x - 40 : edge.targetNode.x - 32;
          const arcOffset = 45;
          const pathD = `M ${srcX} ${sy} C ${srcX - arcOffset} ${sy}, ${tgtX - arcOffset} ${ty}, ${tgtX} ${ty}`;
          const midX = Math.min(srcX, tgtX) - arcOffset / 2;
          const midY = (sy + ty) / 2;
          const dlIntraMarker = isBlast
            ? "url(#dl-arrow-intracolumn-blast)"
            : isSupersedes
            ? "url(#dl-arrow-intracolumn-supersedes)"
            : isReplaces
            ? "url(#dl-arrow-intracolumn-replaces)"
            : "url(#dl-arrow-intracolumn-default)";

          return `
            <g>
              <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="${isBlast ? 2.4 : 1.8}" ${dashAttr} marker-end="${dlIntraMarker}" />
              <rect x="${midX - badgeW / 2}" y="${midY - badgeH / 2}" width="${badgeW}" height="${badgeH}" rx="3.5" ry="3.5" fill="${badgeBg}" stroke="${badgeBorder}" stroke-width="1" />
              <text x="${midX}" y="${midY + 3.5}" text-anchor="middle" fill="${labelColor}" font-size="7" font-family="monospace" font-weight="bold">${edge.type}</text>
            </g>
          `;
        }

        const midX = (edge.sourceNode.x + edge.targetNode.x) / 2;
        const midY = (sy + ty) / 2;
        return `
          <g>
            <line x1="${edge.sourceNode.x}" y1="${sy}" x2="${edge.targetNode.x}" y2="${ty}" stroke="${strokeColor}" stroke-width="${isBlast ? 2.4 : (isSupersedes || isReplaces ? 1.8 : 1.2)}" ${dashAttr} marker-end="${marker}" />
            <rect x="${midX - badgeW / 2}" y="${midY - badgeH / 2}" width="${badgeW}" height="${badgeH}" rx="3.5" ry="3.5" fill="${badgeBg}" stroke="${badgeBorder}" stroke-width="1" />
            <text x="${midX}" y="${midY + 3.5}" text-anchor="middle" fill="${labelColor}" font-size="7.5" font-family="monospace" font-weight="bold">${edge.type}</text>
          </g>
        `;
      }).join('\n');

      // 3. Vector Nodes with High-Contrast Bezel and Status Badges
      const nodesSvg = nodes.map((node) => {
        const colors = getNodeColors(node);
        const inBlast = blastNodeIds.has(node.id);
        const isSimRoot = simulatedBlastNode?.id === node.id;
        const ny = node.y + 45;

        let badgeBg = isDarkTheme ? '#1E293B' : '#E2E8F0';
        let badgeFg = colors.text;
        if (inBlast) {
          badgeBg = '#E11D48';
          badgeFg = '#FFFFFF';
        } else if (node.status === 'SUPERSEDED' || node.status === 'INVALIDATED_NEEDS_REVALIDATION' || node.is_stale) {
          badgeBg = isDarkTheme ? '#4C0519' : '#FFE4E6';
          badgeFg = '#FB7185';
        }

        const badgeText = colors.badge || node.status || 'ACTIVE';
        const displayLabel = node.label || (node.id?.startsWith('act-') ? 'AgentAction' : 'Node');
        const shortId = node.id.length > 12 ? node.id.slice(0, 11) + '…' : node.id;

        const isDecision = node.label === 'Decision';
        if (isDecision) {
          return `
            <g transform="translate(${node.x}, ${ny})">
              <!-- Outer Glow Halo (Diamond) -->
              <polygon points="0,-36 46,0 0,36 -46,0" fill="none" stroke="${colors.stroke}" stroke-width="${inBlast || isSimRoot ? 2.5 : 1.2}" opacity="${inBlast || isSimRoot ? 0.95 : 0.3}" />
              <!-- Node Double-Bezel Body (Diamond) -->
              <polygon points="0,-31 40,0 0,31 -40,0" fill="${colors.fill}" stroke="${isSimRoot ? '#38BDF8' : colors.stroke}" stroke-width="${isSimRoot ? 2.5 : 1.6}" stroke-linejoin="round" />
              <!-- Core Node ID -->
              <text x="0" y="-3" text-anchor="middle" fill="${colors.text}" font-size="9" font-family="monospace" font-weight="bold">${shortId}</text>
              <!-- High-Contrast Status Badge -->
              <rect x="-22" y="4" width="44" height="12" rx="3" ry="3" fill="${badgeBg}" />
              <text x="0" y="13" text-anchor="middle" fill="${badgeFg}" font-size="6.5" font-family="monospace" font-weight="bold">${badgeText}</text>
              <!-- Label Indicator -->
              <text x="0" y="40" text-anchor="middle" fill="${textMuted}" font-size="8" font-family="monospace">:${displayLabel}</text>
            </g>
          `;
        }

        return `
          <g transform="translate(${node.x}, ${ny})">
            <!-- Outer Glow Halo -->
            <rect x="-36" y="-26" width="72" height="52" rx="10" ry="10" fill="none" stroke="${colors.stroke}" stroke-width="${inBlast || isSimRoot ? 2.5 : 1.2}" opacity="${inBlast || isSimRoot ? 0.95 : 0.3}" />
            <!-- Node Double-Bezel Body -->
            <rect x="-32" y="-22" width="64" height="44" rx="8" ry="8" fill="${colors.fill}" stroke="${isSimRoot ? '#38BDF8' : colors.stroke}" stroke-width="${isSimRoot ? 2.5 : 1.6}" />
            <!-- Core Node ID -->
            <text x="0" y="-3" text-anchor="middle" fill="${colors.text}" font-size="9.5" font-family="monospace" font-weight="bold">${shortId}</text>
            <!-- High-Contrast Status Badge -->
            <rect x="-24" y="4" width="48" height="12" rx="3" ry="3" fill="${badgeBg}" />
            <text x="0" y="13" text-anchor="middle" fill="${badgeFg}" font-size="6.5" font-family="monospace" font-weight="bold">${badgeText}</text>
            <!-- Label Indicator -->
            <text x="0" y="32" text-anchor="middle" fill="${textMuted}" font-size="8" font-family="monospace">:${displayLabel}</text>
          </g>
        `;
      }).join('\n');

      // 4. Optional Blast Radius Simulation Banner
      let blastBanner = '';
      if (simulatedBlastNode) {
        blastBanner = `
          <g transform="translate(40, 48)">
            <rect width="800" height="26" rx="6" fill="#881337" stroke="#F43F5E" stroke-width="1.2" opacity="0.95" />
            <text x="16" y="17" fill="#FFE4E6" font-family="monospace" font-size="10.5" font-weight="bold">
              [WHAT-IF SIMULATION]: Invalidation of ${simulatedBlastNode.id} impacts ${blastSummary?.decisions || 0} Decisions, ${blastSummary?.facts || 0} Facts, ${blastSummary?.actions || 0} Actions
            </text>
          </g>
        `;
      }

      // 5. Complete Standalone Vector SVG Document
      const fullSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${exportWidth} ${exportHeight}" width="${exportWidth}" height="${exportHeight}">
  <style>
    text { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
  </style>
  ${defs}
  <!-- Canvas Background -->
  <rect width="${exportWidth}" height="${exportHeight}" fill="${bgFill}" />

  <!-- Top Title Ribbon -->
  <text x="32" y="28" fill="${textMain}" font-size="13" font-weight="bold">CAVDAX • ${title} [${repoName}]</text>
  <text x="${exportWidth - 32}" y="28" text-anchor="end" fill="${textMuted}" font-size="10.5">Nodes: ${nodes.length} • Edges: ${edges.length} • FalkorDB GraphBLAS Provenance DAG</text>

  <!-- Optional Blast Radius Banner -->
  ${blastBanner}

  <!-- Column Stage Headers -->
  <text x="95" y="${simulatedBlastNode ? 88 : 50}" text-anchor="middle" fill="${textMuted}" font-size="9.5" font-weight="bold">[SOURCES]</text>
  <text x="295" y="${simulatedBlastNode ? 88 : 50}" text-anchor="middle" fill="${textMuted}" font-size="9.5" font-weight="bold">[FACTS]</text>
  <text x="495" y="${simulatedBlastNode ? 88 : 50}" text-anchor="middle" fill="${textMuted}" font-size="9.5" font-weight="bold">[DECISIONS]</text>
  <text x="715" y="${simulatedBlastNode ? 88 : 50}" text-anchor="middle" fill="${textMuted}" font-size="9.5" font-weight="bold">[ACTIONS / WRITES]</text>

  <!-- Vector Edges -->
  ${edgesSvg}

  <!-- Vector Nodes -->
  ${nodesSvg}
</svg>`;

      const blob = new Blob([fullSvg], { type: 'image/svg+xml;charset=utf-8' });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `cavdax-causal-graph-${(repo?.name || 'topology').toLowerCase()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Failed to export full vector SVG:', err);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`h-full flex flex-col bg-slate-50 dark:bg-[#060709] relative overflow-hidden select-none${isFullscreen && isDarkTheme ? ' dark' : ''}`}
    >
      {/* Canvas Top Bar: Balanced 3-Zone Optical Layout */}
      <div className="h-10 px-3 sm:px-4 bg-slate-100 dark:bg-[#08090A] border-b border-slate-300 dark:border-white/15 flex items-center justify-between text-xs text-slate-800 dark:text-slate-300 gap-2 sm:gap-3">
        {/* Zone 1: Identity & Context (Left Anchored) */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          {isSidebarCollapsed && onToggleSidebar && (
            <Tooltip content="Expand Sidebar (Restore Split View)" position="bottom">
              <button
                type="button"
                onClick={onToggleSidebar}
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                aria-label="Expand Sidebar"
              >
                <PanelLeftOpen className="w-3.5 h-3.5 stroke-[1.75]" />
              </button>
            </Tooltip>
          )}
          <Database className="w-3.5 h-3.5 text-slate-900 dark:text-white shrink-0" />
          <Tooltip content={title} position="bottom" disabled={canvasWidth >= 720}>
            <span 
              className="font-mono font-semibold text-slate-900 dark:text-white truncate cursor-default" 
              style={{ maxWidth: canvasWidth < 720 ? "120px" : "220px" }}
            >
              {title}
            </span>
          </Tooltip>
          <div className="w-px h-3.5 bg-slate-300 dark:bg-white/15 mx-1 hidden sm:block shrink-0" />
        </div>

        {/* Zone 2: Centered Command Omnibar (Fluid Width, Center-Anchored) */}
        {canvasWidth < 720 ? (
          <Tooltip content="Search DAG Nodes" shortcut={searchKbd} position="bottom">
            <button
              type="button"
              onClick={() => { playClick(); setIsCommandPaletteOpen(true); }}
              className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-100/70 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-all duration-200 tactile-btn cursor-pointer shadow-2xs font-mono shrink-0"
              aria-label={`Search DAG Nodes (${searchKbd})`}
            >
              <Search className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            </button>
          </Tooltip>
        ) : (
          <div className="flex-1 flex justify-center max-w-[180px] sm:max-w-xs md:max-w-sm lg:max-w-md mx-auto">
            <button
              type="button"
              onClick={() => { playClick(); setIsCommandPaletteOpen(true); }}
              className="flex items-center justify-between w-full h-7 px-2.5 rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-100/70 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-all duration-200 tactile-btn cursor-pointer shadow-2xs font-mono"
              aria-label={`Search DAG Nodes (${searchKbd})`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="text-[11px] font-sans text-slate-500 dark:text-slate-400 truncate">Search nodes...</span>
              </div>
              <kbd className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-white/10 border border-slate-300 dark:border-white/10 text-slate-500 dark:text-slate-400 shrink-0">
                {searchKbd}
              </kbd>
            </button>
          </div>
        )}

        {/* Zone 3: Canvas Controls & Actions (Right Anchored) */}
        <div className="flex items-center gap-2 shrink-0 font-mono">
          {/* Monochromatic Architectural Drift Filter (Container-Relative Slider Tracking — Perfectly Centered) */}
          <div className="relative flex items-center bg-slate-200/60 dark:bg-white/5 border border-slate-300/70 dark:border-white/10 rounded-lg p-0.5 text-[10px] select-none">
            {driftPill.position.ready && (
              <motion.div
                className="absolute top-0 left-0 rounded-md bg-white dark:bg-white/15 shadow-xs border border-slate-300/60 dark:border-white/10 pointer-events-none"
                initial={false}
                animate={{
                  x: driftPill.position.x,
                  y: driftPill.position.y,
                  width: driftPill.position.width,
                  height: driftPill.position.height,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            {[
              { id: 'ALL', label: 'All', icon: Layers },
              { id: 'GROUNDED', label: 'Grounded', icon: CheckCheck, iconClass: 'text-emerald-500' },
              { id: 'DRIFTED', label: 'Drifted', icon: AlertTriangle, iconClass: 'text-amber-500' },
            ].map((tab) => {
              const active = driftFilter === tab.id;
              const Icon = tab.icon;
              return (
                <Tooltip
                  key={tab.id}
                  content={tab.label}
                  position="bottom"
                  disabled={canvasWidth >= 900}
                >
                  <button
                    ref={(el) => { if (el) driftPill.refs.current[tab.id] = el; }}
                    onClick={() => { playClick(); setDriftFilter(tab.id); }}
                    className={`relative px-2 py-0.5 rounded-md transition-colors cursor-pointer z-10 flex items-center gap-1.5 ${
                      active
                        ? 'text-slate-950 dark:text-white font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-3 h-3 shrink-0 ${tab.iconClass || 'text-current'}`} />
                    {canvasWidth >= 900 && <span>{tab.label}</span>}
                  </button>
                </Tooltip>
              );
            })}
          </div>

          {/* Functional Divider */}
          {canvasWidth >= 540 && <div className="w-px h-3.5 bg-slate-300 dark:bg-white/15 mx-0.5 shrink-0" />}

          {/* Action Tools Cluster: Direct SVG Download & Node Permalink Sharing */}
          {canvasWidth >= 540 && (
            <div className="flex items-center gap-0.5">
            <Tooltip content="Download Vector Graph (SVG)" position="bottom">
              <button
                type="button"
                onClick={handleDownloadGraph}
                className="p-1.5 rounded-md hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors tactile-btn cursor-pointer"
                aria-label="Download Vector Graph (SVG)"
              >
                <Download className="w-3.5 h-3.5 text-current transition-colors" />
              </button>
            </Tooltip>

            <Tooltip
              content={
                isCopiedPermalink
                  ? "Permalink copied to clipboard!"
                  : selectedNodeId
                  ? `Copy Node Permalink (${selectedNodeId})`
                  : "Copy Graph View Link"
              }
              position="bottom"
            >
              <button
                type="button"
                onClick={handleSharePermalink}
                className={`p-1.5 rounded-md hover:bg-slate-200/80 dark:hover:bg-white/10 transition-colors tactile-btn cursor-pointer ${
                  isCopiedPermalink
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                    : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
                }`}
                aria-label="Copy Graph Permalink"
              >
                {isCopiedPermalink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Share2 className="w-3.5 h-3.5 text-current transition-colors" />
                )}
              </button>
            </Tooltip>
          </div>
          )}

          {/* Functional Divider */}
          {canvasWidth >= 540 && <div className="w-px h-3.5 bg-slate-300 dark:bg-white/15 mx-0.5 shrink-0" />}

          {/* Segmented Zoom Readout Pill with Linear/Figma Preset Dropdown */}
          <div className="relative flex items-center bg-slate-200/60 dark:bg-white/[0.04] p-0.5 rounded-lg border border-slate-300/80 dark:border-white/10 shadow-xs">
            <Tooltip content="Zoom Out" position="bottom">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setZoom(z => Math.max(0.4, Number((z - 0.1).toFixed(2))));
                }}
                className="p-1 rounded hover:bg-white dark:hover:bg-white/10 text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors tactile-btn cursor-pointer"
                aria-label="Zoom Out"
              >
                <ZoomOut className="w-3 h-3 text-current transition-colors" />
              </button>
            </Tooltip>

            <div ref={zoomMenuRef} className="relative">
              <Tooltip content="Zoom Presets & Framing" position="bottom" disabled={isZoomMenuOpen}>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setIsZoomMenuOpen(v => !v);
                  }}
                  className="px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-white dark:hover:bg-white/10 text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
                  aria-label="Zoom Presets & Framing"
                >
                  <span className="text-[10px] font-mono font-semibold w-7 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <ChevronDown className="w-2.5 h-2.5 text-slate-400 dark:text-slate-500" />
                </button>
              </Tooltip>

              <AnimatePresence>
              {isZoomMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 top-full mt-1.5 w-32 py-1 bg-white dark:bg-[#12161f] border border-slate-200 dark:border-white/10 rounded-lg shadow-xl z-50 font-mono text-[11px]"
                >
                  {[
                    { label: '50%', value: 0.5 },
                    { label: '75%', value: 0.75 },
                    { label: '100%', value: 1.0 },
                    { label: '125%', value: 1.25 },
                    { label: '150%', value: 1.5 },
                    { label: '200%', value: 2.0 },
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        playClick();
                        setZoom(preset.value);
                        setIsZoomMenuOpen(false);
                      }}
                      className={`w-full px-2.5 py-1 text-left flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer ${
                        Math.round(zoom * 100) === Math.round(preset.value * 100)
                          ? 'text-cyan-600 dark:text-cyan-400 font-bold'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{preset.label}</span>
                      {Math.round(zoom * 100) === Math.round(preset.value * 100) && (
                        <Check className="w-3 h-3 text-cyan-500" />
                      )}
                    </button>
                  ))}
                  <div className="h-px bg-slate-200 dark:bg-white/10 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      handleFitToScreen();
                      setIsZoomMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-1 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer font-sans"
                  >
                    Fit to Screen
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Tooltip content="Zoom In" position="bottom">
            <button
              type="button"
              onClick={() => {
                playClick();
                setZoom(z => Math.min(2.5, Number((z + 0.1).toFixed(2))));
                }}
                className="p-1 rounded hover:bg-white dark:hover:bg-white/10 text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors tactile-btn cursor-pointer"
                aria-label="Zoom In"
              >
                <ZoomIn className="w-3 h-3 text-current transition-colors" />
              </button>
            </Tooltip>
          </div>

          {/* Reset & Fullscreen Controls */}
          <div className="flex items-center gap-0.5">
            <Tooltip content="Reset View" position="bottom">
              <button
                onClick={() => {
                  playClick();
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors tactile-btn cursor-pointer"
                aria-label="Reset View"
              >
                <RotateCcw className="w-3.5 h-3.5 text-current transition-colors" />
              </button>
            </Tooltip>
            <Tooltip content={isFullscreen ? "Exit Fullscreen" : "Fullscreen Graph"} position="bottom">
              <button
                onClick={toggleFullscreen}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors tactile-btn cursor-pointer"
                aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen Graph"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5 text-current transition-colors" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5 text-current transition-colors" />
                )}
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* SVG Interactive Canvas with Wheel Zoom & Drag-Pan */}
      <div 
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 relative overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${isDarkTheme ? '#334155' : '#94A3B8'} 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* What-If Blast Radius Simulation Notification Banner */}
        {simulatedBlastNode && (
          <div className="absolute top-3 left-3 right-3 sm:right-auto z-20 flex items-center justify-between gap-3 p-2.5 rounded-xl bg-rose-500/15 dark:bg-rose-950/80 border border-rose-500/40 text-rose-800 dark:text-rose-200 backdrop-blur-md shadow-lg animate-in fade-in max-w-xs sm:max-w-sm md:max-w-md font-mono text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Activity className="w-4 h-4 text-rose-500 animate-pulse shrink-0" />
              <div className="min-w-0 leading-tight">
                <span className="font-bold uppercase tracking-wider block text-[10px] text-rose-600 dark:text-rose-400">What-If Blast Radius</span>
                <span className="truncate block text-[11px]">
                  Deprecating <strong>{simulatedBlastNode.id}</strong> impacts <strong>{blastSummary.decisions}</strong> Decisions, <strong>{blastSummary.facts}</strong> Facts, <strong>{blastSummary.actions}</strong> Actions, and <strong>{blastSummary.files.length}</strong> Target Files.
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                playClick();
                setSimulatedBlastNode(null);
              }}
              className="px-2 py-1 text-[10px] font-bold rounded bg-rose-500 text-white hover:bg-rose-600 transition-colors shrink-0 cursor-pointer shadow-xs"
            >
              Clear
            </button>
          </div>
        )}

        <svg
          className="w-full h-full"
          viewBox={`0 0 880 ${canvasHeight}`}
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.12s ease-out'
          }}
        >
          <defs>
            <marker
              id="arrow-default"
              viewBox="0 0 10 10"
              refX="38"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 1.5 L 8 5 L 0 8.5 z"
                fill={isDarkTheme ? '#475569' : '#94A3B8'}
              />
            </marker>

            <marker
              id="arrow-supersedes"
              viewBox="0 0 10 10"
              refX="38"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#FB7185" />
            </marker>

            <marker
              id="arrow-blast"
              viewBox="0 0 10 10"
              refX="38"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#F43F5E" />
            </marker>

            <marker
              id="arrow-decision"
              viewBox="0 0 10 10"
              refX="44"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 1.5 L 8 5 L 0 8.5 z"
                fill={isDarkTheme ? "#475569" : "#94A3B8"}
              />
            </marker>

            <marker
              id="arrow-intracolumn-default"
              viewBox="0 0 10 10"
              refX="7.5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 1.5 L 8 5 L 0 8.5 z"
                fill={isDarkTheme ? "#475569" : "#94A3B8"}
              />
            </marker>

            <marker
              id="arrow-intracolumn-supersedes"
              viewBox="0 0 10 10"
              refX="7.5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#FB7185" />
            </marker>

            <marker
              id="arrow-intracolumn-replaces"
              viewBox="0 0 10 10"
              refX="7.5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={isDarkTheme ? "#FFFFFF" : "#0F172A"} />
            </marker>

            <marker
              id="arrow-intracolumn-blast"
              viewBox="0 0 10 10"
              refX="7.5"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#F43F5E" />
            </marker>
          </defs>

          {/* Render Edges */}
          {edges.map((edge, idx) => {
            const isSupersedes = edge.type === 'SUPERSEDES';
            const isReplaces = edge.type === 'REPLACES';
            const isBlast = blastNodeIds.has(edge.source) || blastNodeIds.has(edge.target) || edge.source === simulatedBlastNode?.id;

            let strokeColor = isDarkTheme ? '#334155' : '#CBD5E1';
            let marker = 'url(#arrow-default)';
            let dash = undefined;

            if (isBlast) {
              strokeColor = '#F43F5E';
              marker = 'url(#arrow-blast)';
              dash = '5 3';
            } else if (isSupersedes) {
              strokeColor = '#FB7185';
              marker = 'url(#arrow-supersedes)';
              dash = '4 3';
            } else if (isReplaces) {
              strokeColor = isDarkTheme ? '#FFFFFF' : '#0F172A';
              marker = 'url(#arrow-default)';
              dash = '5 3';
            }

            const isIntraColumn = Math.abs(edge.sourceNode.x - edge.targetNode.x) < 30;
            const badgeBg = isDarkTheme ? '#0B0D13' : '#FFFFFF';
            const badgeBorder = isBlast
              ? '#F43F5E'
              : (isSupersedes ? '#FB7185' : (isDarkTheme ? '#334155' : '#CBD5E1'));
            const labelColor = isBlast
              ? '#F43F5E'
              : (isSupersedes ? '#FB7185' : (isDarkTheme ? '#94A3B8' : '#475569'));
            const badgeW = Math.max(edge.type.length * 5.4 + 12, 44);
            const badgeH = 14;

            if (isIntraColumn) {
              // Smooth bezier curve looping on the left to avoid crossing intermediate nodes
              const isSrcDecision = edge.sourceNode.label === "Decision";
              const isTgtDecision = edge.targetNode.label === "Decision";
              const srcX = isSrcDecision ? edge.sourceNode.x - 40 : edge.sourceNode.x - 32;
              const tgtX = isTgtDecision ? edge.targetNode.x - 40 : edge.targetNode.x - 32;
              const arcOffset = 45;
              const pathD = `M ${srcX} ${edge.sourceNode.y} C ${srcX - arcOffset} ${edge.sourceNode.y}, ${tgtX - arcOffset} ${edge.targetNode.y}, ${tgtX} ${edge.targetNode.y}`;
              const midX = Math.min(srcX, tgtX) - arcOffset / 2;
              const midY = (edge.sourceNode.y + edge.targetNode.y) / 2;

              const liveIntraMarker = isBlast
                ? "url(#arrow-intracolumn-blast)"
                : isSupersedes
                ? "url(#arrow-intracolumn-supersedes)"
                : isReplaces
                ? "url(#arrow-intracolumn-replaces)"
                : "url(#arrow-intracolumn-default)";

              return (
                <g key={`edge-${idx}`}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isBlast ? 2.4 : 1.8}
                    strokeDasharray={dash}
                    markerEnd={liveIntraMarker}
                    className="transition-all duration-300"
                  />
                  {/* Opaque pill badge shields text from path line overlap / strikethrough */}
                  <rect
                    x={midX - badgeW / 2}
                    y={midY - badgeH / 2}
                    width={badgeW}
                    height={badgeH}
                    rx="3.5"
                    ry="3.5"
                    fill={badgeBg}
                    stroke={badgeBorder}
                    strokeWidth="1"
                    className="pointer-events-none"
                  />
                  <text
                    x={midX}
                    y={midY + 0.5}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={labelColor}
                    fontSize="7"
                    fontFamily="monospace"
                    fontWeight="700"
                    className="select-none pointer-events-none tracking-tight"
                  >
                    {edge.type}
                  </text>
                </g>
              );
            }

            const midX = (edge.sourceNode.x + edge.targetNode.x) / 2;
            const midY = (edge.sourceNode.y + edge.targetNode.y) / 2;

            const isTargetDecision = edge.targetNode.label === "Decision";
            const lineMarker = (isTargetDecision && !isBlast && !isSupersedes && !isReplaces)
              ? "url(#arrow-decision)"
              : marker;

            return (
              <g key={`edge-${idx}`}>
                <line
                  x1={edge.sourceNode.x}
                  y1={edge.sourceNode.y}
                  x2={edge.targetNode.x}
                  y2={edge.targetNode.y}
                  stroke={strokeColor}
                  strokeWidth={isBlast ? 2.4 : (isSupersedes || isReplaces ? 1.8 : 1.2)}
                  strokeDasharray={dash}
                  markerEnd={lineMarker}
                  className="transition-all duration-300"
                />
                {/* Opaque pill badge shields text from arrow line overlap / strikethrough */}
                <rect
                  x={midX - badgeW / 2}
                  y={midY - badgeH / 2}
                  width={badgeW}
                  height={badgeH}
                  rx="3.5"
                  ry="3.5"
                  fill={badgeBg}
                  stroke={badgeBorder}
                  strokeWidth="1"
                  className="pointer-events-none"
                />
                <text
                  x={midX}
                  y={midY + 0.5}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={labelColor}
                  fontSize="7.5"
                  fontFamily="monospace"
                  fontWeight="700"
                  className="select-none pointer-events-none tracking-tight"
                >
                  {edge.type}
                </text>
              </g>
            );
          })}

          {/* Render Nodes */}
          {nodes.map((node) => {
            const colors = getNodeColors(node);
            const isSelected = selectedNodeId === node.id;
            const inBlast = blastNodeIds.has(node.id);
            const isSimRoot = simulatedBlastNode?.id === node.id;
            const isDecision = node.label === 'Decision';

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => {
                  playClick();
                  onSelectNode(node);
                }}
                className="cursor-pointer group graph-node"
              >
                {isDecision ? (
                  <>
                    {/* Diamond Transparent Hit Area */}
                    <polygon
                      points="0,-38 48,0 0,38 -48,0"
                      fill="transparent"
                      className="cursor-pointer"
                    />

                    {/* Diamond Outer Glow Halo */}
                    <polygon
                      points="0,-36 46,0 0,36 -46,0"
                      fill="none"
                      stroke={colors.stroke}
                      strokeWidth={isSelected || inBlast || isSimRoot ? 2.5 : 1.2}
                      opacity={isSelected || inBlast || isSimRoot ? 0.95 : 0.25}
                      className={`transition-all duration-150 group-hover:opacity-95 ${inBlast ? 'animate-pulse' : ''}`}
                      style={{ filter: `drop-shadow(0 0 10px ${colors.glow})` }}
                    />

                    {/* Diamond Double-Bezel Body */}
                    <polygon
                      points="0,-31 40,0 0,31 -40,0"
                      fill={colors.fill}
                      stroke={isSimRoot ? '#38BDF8' : colors.stroke}
                      strokeWidth={isSelected || isSimRoot ? "2.5" : "1.6"}
                      strokeLinejoin="round"
                      className="transition-all duration-150 group-hover:brightness-95 dark:group-hover:brightness-110"
                    />

                    {/* Diamond Luminous Pulse Feedback Ring */}
                    {node.last_probed_at && (Date.now() - node.last_probed_at < 2500) && (
                      <polygon
                        points="0,-38 48,0 0,38 -48,0"
                        fill="none"
                        stroke={colors.stroke}
                        strokeWidth="2.5"
                        className="animate-pulse"
                        style={{ filter: `drop-shadow(0 0 10px ${colors.glow})` }}
                      />
                    )}
                  </>
                ) : (
                  <>
                    {/* Rect Transparent Hit Area */}
                    <rect
                      x="-38"
                      y="-28"
                      width="76"
                      height="56"
                      rx="12"
                      ry="12"
                      fill="transparent"
                      className="cursor-pointer"
                    />

                    {/* Rect Outer Glow Halo */}
                    <rect
                      x="-36"
                      y="-26"
                      width="72"
                      height="52"
                      rx="10"
                      ry="10"
                      fill="none"
                      stroke={colors.stroke}
                      strokeWidth={isSelected || inBlast || isSimRoot ? 2.5 : 1.2}
                      opacity={isSelected || inBlast || isSimRoot ? 0.95 : 0.25}
                      className={`transition-all duration-150 group-hover:opacity-95 ${inBlast ? 'animate-pulse' : ''}`}
                      style={{ filter: `drop-shadow(0 0 10px ${colors.glow})` }}
                    />

                    {/* Rect Double-Bezel Body */}
                    <rect
                      x="-32"
                      y="-22"
                      width="64"
                      height="44"
                      rx="8"
                      ry="8"
                      fill={colors.fill}
                      stroke={isSimRoot ? '#38BDF8' : colors.stroke}
                      strokeWidth={isSelected || isSimRoot ? "2.5" : "1.6"}
                      className="transition-all duration-150 group-hover:brightness-95 dark:group-hover:brightness-110"
                    />

                    {/* Rect Luminous Pulse Feedback Ring */}
                    {node.last_probed_at && (Date.now() - node.last_probed_at < 2500) && (
                      <rect
                        x="-38"
                        y="-28"
                        width="76"
                        height="56"
                        rx="12"
                        ry="12"
                        fill="none"
                        stroke={colors.stroke}
                        strokeWidth="2.5"
                        className="animate-pulse"
                        style={{ filter: `drop-shadow(0 0 10px ${colors.glow})` }}
                      />
                    )}
                  </>
                )}

                {/* Node ID Label */}
                <text
                  textAnchor="middle"
                  dy="-3"
                  fill={colors.text}
                  fontSize={isDecision ? "9" : "9.5"}
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="select-none pointer-events-none"
                >
                  {node.id.length > 9 ? node.id.slice(0, 8) + '…' : node.id}
                </text>

                {/* Status Subtitle Badge */}
                <text
                  textAnchor="middle"
                  dy="11"
                  fill={inBlast ? '#F43F5E' : (isDarkTheme ? '#94A3B8' : '#64748B')}
                  fontSize="7.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="select-none pointer-events-none"
                >
                  {colors.badge}{node.probe_count && node.probe_count > 1 ? ` (${node.probe_count}x)` : ''}
                </text>

                {/* Node Type Label */}
                <text
                  textAnchor="middle"
                  dy={isDecision ? "42" : "36"}
                  fill={isDarkTheme ? '#94A3B8' : '#64748B'}
                  fontSize="8.5"
                  fontFamily="monospace"
                  className="select-none pointer-events-none"
                >
                  :{node.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Unified Canvas HUD: Telemetry Counter + Monospace Topology Legend */}
        <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-[#0B0D11]/90 border border-slate-300 dark:border-white/15 rounded-lg px-3 py-1.5 text-[9px] sm:text-[10px] font-mono backdrop-blur-md shadow-md dark:shadow-xl pointer-events-none z-10 hidden sm:flex items-center gap-2.5">
          <span className="text-slate-950 dark:text-white font-bold tracking-tight flex items-center gap-2">
            <span>{nodes.length} Nodes</span>
            <span className="w-px h-2.5 bg-slate-300 dark:bg-white/20 shrink-0" aria-hidden="true" />
            <span>{edges.length} Edges</span>
          </span>
          <span className="w-px h-3 bg-slate-300 dark:bg-white/20 shrink-0" aria-hidden="true" />
          <span className="text-slate-500 dark:text-slate-400 font-semibold">TOPOLOGY:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-slate-900 dark:bg-white" />
            <span className="text-slate-700 dark:text-slate-300">:Source</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-slate-400" />
            <span className="text-slate-700 dark:text-slate-300">:Fact</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-[7px] h-[7px] rotate-45 rounded-[0.5px] bg-amber-500 dark:bg-amber-400 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300">:Decision</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-emerald-500" />
            <span className="text-slate-700 dark:text-slate-300">:Action</span>
          </div>
        </div>
      </div>

      {/* Selected Node Inspector Drawer */}
      {selectedNode && (
        <NodeInspector
          node={selectedNode}
          graphData={graphData}
          onClose={onCloseNode}
          repo={repo}
          branch={branch}
          isDarkTheme={isDarkTheme}
          isFalkorDB={Boolean(isDemo || (typeof title === 'string' && title.includes('FalkorDB')))}
          onToggleSimulate={(n) => setSimulatedBlastNode(curr => curr?.id === n.id ? null : n)}
          isSimulating={simulatedBlastNode?.id === selectedNode.id}
          onOpenSyncPr={onOpenSyncPr}
          hasDrift={Boolean(unsyncedList?.some(u => u.targetId === selectedNode.id))}
          onTestDecision={onTestDecision}
          isVerifyingAction={isVerifyingAction}
          isFullscreen={isFullscreen}
          hasBlastBanner={Boolean(simulatedBlastNode)}
          containerRef={containerRef}
        />
      )}

      {/* Command Palette (Cmd+K / Ctrl+K) & Large DAG Search */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        nodes={nodes}
        onSelectNode={handleNodeSelectAndCenter}
      />
    </div>
  );
}
