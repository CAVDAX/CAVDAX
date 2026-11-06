import { motion } from 'framer-motion';
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCcw, Database, Scan, Activity, Download, Layers, CheckCheck, AlertTriangle, Search } from 'lucide-react';
import { playClick } from '../utils/soundFx';
import NodeInspector from './NodeInspector';
import CommandPalette from './CommandPalette';

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
  isVerifyingAction = false
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [simulatedBlastNode, setSimulatedBlastNode] = useState(null);
  const [driftFilter, setDriftFilter] = useState('ALL'); // 'ALL' | 'GROUNDED' | 'DRIFTED'
  const driftPill = usePillTracker(driftFilter);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const searchKbd = isMac ? '⌘K' : 'Ctrl+K';


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


  const containerRef = useRef(null);

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
  const { blastNodeIds, summary: blastSummary } = computeDownstreamBlast(rawNodes, rawEdges, simulatedBlastNode?.id);

  // Filter nodes based on architectural drift view
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

  // Dynamic Hierarchical Columnar Layout Engine
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
  const canvasHeight = Math.max(440, maxColumnItems * 95 + 40);

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

  const sourceYs = getColumnYPositions(sources.length, canvasHeight);
  const factYs = getColumnYPositions(facts.length, canvasHeight);
  const decYs = getColumnYPositions(decisions.length, canvasHeight);

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
  const actionYs = getColumnYPositions(actions.length, canvasHeight);
  actions.forEach((act, idx) => {
    const groundedEdge = rawEdges.find(e => (e.source === act.id && e.type === 'GROUNDED_IN') || (e.type === 'ACTION_ON' && e.source === act.id));
    const targetDecId = groundedEdge?.target || act.decision_id;
    const targetDecPos = targetDecId ? calculatedPositions.get(targetDecId) : null;
    const posY = targetDecPos ? targetDecPos.y : actionYs[idx];
    calculatedPositions.set(act.id, { x: LAYER_X.AgentAction, y: posY });
  });

  const nodes = filteredRawNodes.map((node) => {
    const pos = calculatedPositions.get(node.id) || { x: LAYER_X[node.label] || 495, y: 220 };
    return { ...node, ...pos };
  });

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  const edges = rawEdges.map(edge => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    return { ...edge, sourceNode, targetNode };
  }).filter(e => e.sourceNode && e.targetNode);

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
          fill: '#11141B',
          stroke: '#FFFFFF',
          glow: 'rgba(255, 255, 255, 0.25)',
          text: '#FFFFFF',
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
          fill: '#FFFFFF',
          stroke: '#0F172A',
          glow: 'rgba(15, 23, 42, 0.15)',
          text: '#0F172A',
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
          const arcOffset = 45;
          const pathD = `M ${edge.sourceNode.x - 32} ${sy} C ${edge.sourceNode.x - arcOffset - 25} ${sy}, ${edge.targetNode.x - arcOffset - 25} ${ty}, ${edge.targetNode.x - 32} ${ty}`;
          const midX = edge.sourceNode.x - arcOffset - 20;
          const midY = (sy + ty) / 2;
          return `
            <g>
              <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="${isBlast ? 2.4 : 1.8}" ${dashAttr} marker-end="${marker}" />
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
      {/* Canvas Top Bar */}
      <div className="h-10 px-3 sm:px-4 bg-slate-100 dark:bg-[#08090A] border-b border-slate-300 dark:border-white/15 flex items-center justify-between text-xs text-slate-800 dark:text-slate-300 gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Database className="w-3.5 h-3.5 text-slate-900 dark:text-white shrink-0" />
          <span className="font-mono font-semibold text-slate-900 dark:text-white truncate" title={title}>
            {title}
          </span>

        </div>

        {/* Feature Controls: Search (Cmd+K / Ctrl+K), Drift Filter, Direct SVG Download, Zoom, Fullscreen */}
        <div className="flex items-center gap-2 shrink-0 font-mono">
          {/* Command Palette Trigger (Search primary action - precedes filters) */}
          <button
            type="button"
            onClick={() => { playClick(); setIsCommandPaletteOpen(true); }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-colors tactile-btn cursor-pointer"
            title={`Search DAG Nodes (${searchKbd})`}
            aria-label={`Search DAG Nodes (${searchKbd})`}
          >
            <Search className="w-3.5 h-3.5 text-current shrink-0" />
            <span className="text-[10px] font-mono opacity-80 hidden sm:inline">Search</span>
            <kbd className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-200/80 dark:bg-black/40 border border-slate-300 dark:border-white/10 opacity-70">
              {searchKbd}
            </kbd>
          </button>

          {/* Monochromatic Architectural Drift Filter (Container-Relative Slider Tracking — Anti-Flying Standard) */}
          <div className="relative flex items-center bg-slate-200/60 dark:bg-white/5 border border-slate-300/70 dark:border-white/10 rounded-lg p-0.5 text-[10px] select-none">
            {driftPill.position.ready && (
              <motion.div
                className="absolute top-0.5 left-0 rounded-md bg-white dark:bg-white/15 shadow-xs border border-slate-300/60 dark:border-white/10 pointer-events-none"
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
                <button
                  key={tab.id}
                  ref={(el) => { if (el) driftPill.refs.current[tab.id] = el; }}
                  onClick={() => { playClick(); setDriftFilter(tab.id); }}
                  className={`relative px-2 py-0.5 rounded-md transition-colors cursor-pointer z-10 flex items-center gap-1.5 ${
                    active
                      ? 'text-slate-950 dark:text-white font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-3 h-3 shrink-0 ${tab.iconClass || 'text-current'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Direct Graph SVG Download */}
          <button
            type="button"
            onClick={handleDownloadGraph}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors tactile-btn cursor-pointer mr-1"
            title="Download Vector Graph (SVG)"
            aria-label="Download Vector Graph (SVG)"
          >
            <Download className="w-3.5 h-3.5 text-current transition-colors" />
          </button>

          {/* Zoom & Fullscreen Controls */}
          <div className="flex items-center gap-0.5 border-l border-slate-300 dark:border-white/15 pl-1.5">
            <button
              onClick={() => {
                playClick();
                setZoom(z => Math.max(0.6, z - 0.1));
              }}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors tactile-btn"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5 text-current transition-colors" />
            </button>
            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 w-8 text-center font-semibold">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => {
                playClick();
                setZoom(z => Math.min(2.2, z + 0.1));
              }}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors tactile-btn"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5 text-current transition-colors" />
            </button>
            <button
              onClick={() => {
                playClick();
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors tactile-btn"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5 text-current transition-colors" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors tactile-btn"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Graph"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5 text-current transition-colors" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-current transition-colors" />
              )}
            </button>
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
              const arcOffset = 45;
              const pathD = `M ${edge.sourceNode.x - 32} ${edge.sourceNode.y} C ${edge.sourceNode.x - arcOffset - 25} ${edge.sourceNode.y}, ${edge.targetNode.x - arcOffset - 25} ${edge.targetNode.y}, ${edge.targetNode.x - 32} ${edge.targetNode.y}`;
              const midX = edge.sourceNode.x - arcOffset - 20;
              const midY = (edge.sourceNode.y + edge.targetNode.y) / 2;

              return (
                <g key={`edge-${idx}`}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isBlast ? 2.4 : 1.8}
                    strokeDasharray={dash}
                    markerEnd={marker}
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
                  markerEnd={marker}
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
                {/* Transparent Hit Area for 100% Reliable Pointer Events */}
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

                {/* Outer Glow Halo */}
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

                {/* Node Double-Bezel Body */}
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

                {/* Node ID Label */}
                <text
                  textAnchor="middle"
                  dy="-3"
                  fill={colors.text}
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                  className="select-none pointer-events-none"
                >
                  {node.id.length > 9 ? node.id.slice(0, 8) + '…' : node.id}
                </text>

                {/* Status Subtitle Badge */}
                {/* Luminous Pulse Feedback Ring on fresh execution */}
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
                  dy="36"
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
            <span className="w-2 h-2 rounded bg-slate-900 dark:bg-white border border-slate-400" />
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
