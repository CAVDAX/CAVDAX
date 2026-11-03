/**
 * Standalone SVG Graph Renderer for CAVDAX Causal DAGs
 * Generates standards-compliant, self-contained SVG images for:
 * 1. cavdax_export_graph_image MCP tool (enables AI agents to embed causal DAGs into GitHub PRs)
 * 2. GET /api/graph/export-image (direct web/badge endpoint)
 * 3. Blast-radius and high-contrast Vision OCR annotations
 */

export function computeBlastRadius(nodes, edges, rootNodeId) {
  if (!rootNodeId) {
    return { blastNodeIds: new Set(), summary: { facts: 0, decisions: 0, actions: 0, files: [] } };
  }

  const blastNodeIds = new Set();
  const queue = [rootNodeId];

  // In causal DAGs:
  // (f:Fact)-[:EXTRACTED_FROM]->(s:Source)
  // (d:Decision)-[:DEPENDS_ON]->(f:Fact)
  // (a:AgentAction)-[:GROUNDED_IN]->(d:Decision)
  // Dependents point TO their dependency.
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
    const current = queue.shift();
    const dependents = dependentMap.get(current) || [];
    for (const depId of dependents) {
      if (!blastNodeIds.has(depId)) {
        blastNodeIds.add(depId);
        queue.push(depId);
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
      if (n.target_file && !files.includes(n.target_file)) {
        files.push(n.target_file);
      }
    }
  }

  return { blastNodeIds, summary: { facts, decisions, actions, files } };
}

export function renderGraphToSvg(graphData, options = {}) {
  const {
    nodeId = null,
    highlightBlastRadius = false,
    isDarkTheme = true,
    title = 'CAVDAX Causal Provenance DAG',
    width = 960,
    height = 500
  } = options;

  const rawNodes = graphData?.nodes || [];
  const rawEdges = graphData?.edges || [];

  const { blastNodeIds, summary } = (nodeId && highlightBlastRadius)
    ? computeBlastRadius(rawNodes, rawEdges, nodeId)
    : { blastNodeIds: new Set(), summary: { facts: 0, decisions: 0, actions: 0, files: [] } };

  // Layout columns
  const layerXMap = {
    Source: 120,
    Fact: 360,
    Decision: 600,
    AgentAction: 820
  };

  const colCounters = { Source: 0, Fact: 0, Decision: 0, AgentAction: 0, Other: 0 };
  const positionedNodes = rawNodes.map((n) => {
    const layer = layerXMap[n.label] ? n.label : (n.id?.startsWith('act-') ? 'AgentAction' : 'Other');
    const x = layerXMap[layer] || 600;
    const idx = colCounters[layer] || 0;
    colCounters[layer] = idx + 1;
    const y = 110 + idx * 95;
    return { ...n, x, y };
  });

  const maxInCol = Math.max(
    colCounters.Source,
    colCounters.Fact,
    colCounters.Decision,
    colCounters.AgentAction,
    colCounters.Other,
    1
  );
  const calculatedHeight = Math.max(height, 130 + maxInCol * 95 + 40);

  const nodeMap = new Map(positionedNodes.map(n => [n.id, n]));
  const validEdges = rawEdges.map(e => ({
    ...e,
    sourceNode: nodeMap.get(e.source),
    targetNode: nodeMap.get(e.target)
  })).filter(e => e.sourceNode && e.targetNode);

  const bgFill = isDarkTheme ? '#08090C' : '#F8FAFC';
  const textMain = isDarkTheme ? '#F8FAFC' : '#0F172A';
  const textMuted = isDarkTheme ? '#94A3B8' : '#64748B';
  const borderDefault = isDarkTheme ? '#1E293B' : '#CBD5E1';

  let bannerSvg = '';
  if (highlightBlastRadius && nodeId) {
    bannerSvg = `
      <g transform="translate(40, 50)">
        <rect width="${width - 80}" height="32" rx="8" fill="#881337" stroke="#F43F5E" stroke-width="1.5" opacity="0.9" />
        <text x="20" y="21" fill="#FFE4E6" font-family="monospace" font-size="11" font-weight="bold">
          [WHAT-IF BLAST RADIUS]: Invalidating ${escapeXml(nodeId)} impacts ${summary.decisions} Decisions, ${summary.facts} Facts, ${summary.actions} Actions, ${summary.files.length} Target Files
        </text>
      </g>
    `;
  }

  const edgesSvg = validEdges.map(e => {
    const isSupersedes = e.type === 'SUPERSEDES';
    const isBlast = blastNodeIds.has(e.source) || blastNodeIds.has(e.target) || e.source === nodeId;
    const stroke = isBlast ? '#F43F5E' : (isSupersedes ? '#FB7185' : (isDarkTheme ? '#475569' : '#94A3B8'));
    const strokeWidth = isBlast ? '2.5' : (isSupersedes ? '2' : '1.5');
    const strokeDash = isSupersedes ? 'stroke-dasharray="4,4"' : (isBlast ? 'stroke-dasharray="6,3"' : '');
    const marker = isBlast || isSupersedes ? 'url(#arrow-red)' : 'url(#arrow-slate)';

    return `
      <line x1="${e.sourceNode.x}" y1="${e.sourceNode.y}" x2="${e.targetNode.x}" y2="${e.targetNode.y}"
            stroke="${stroke}" stroke-width="${strokeWidth}" ${strokeDash} marker-end="${marker}" />
    `;
  }).join('\n');

  const nodesSvg = positionedNodes.map(n => {
    const isSelected = n.id === nodeId;
    const inBlast = blastNodeIds.has(n.id);
    const isStale = n.status === 'SUPERSEDED' || n.status === 'INVALIDATED_NEEDS_REVALIDATION' || n.is_stale;

    let fill = isDarkTheme ? '#11141B' : '#FFFFFF';
    let stroke = borderDefault;
    let badgeText = n.status || (isStale ? 'STALE' : 'ACTIVE');
    let badgeBg = isDarkTheme ? '#1E293B' : '#E2E8F0';
    let badgeFg = textMuted;

    if (inBlast) {
      fill = isDarkTheme ? '#2A0B12' : '#FFF1F2';
      stroke = '#F43F5E';
      badgeText = 'BLAST_IMPACT';
      badgeBg = '#E11D48';
      badgeFg = '#FFFFFF';
    } else if (isStale) {
      fill = isDarkTheme ? '#240B10' : '#FFF1F2';
      stroke = '#FB7185';
      badgeBg = isDarkTheme ? '#4C0519' : '#FFE4E6';
      badgeFg = '#FB7185';
    } else if (n.label === 'AgentAction') {
      stroke = n.status === 'APPROVED' ? '#10B981' : '#F43F5E';
    }

    if (isSelected) {
      stroke = '#38BDF8';
    }

    const shortId = n.id.length > 12 ? n.id.slice(0, 11) + '…' : n.id;

    return `
      <g transform="translate(${n.x}, ${n.y})">
        <!-- Node Box with High Contrast Double Border -->
        <rect x="-48" y="-28" width="96" height="56" rx="10" fill="${fill}" stroke="${stroke}" stroke-width="${isSelected || inBlast ? '2.5' : '1.5'}" />
        
        <!-- High-Contrast Vision OCR Badge Header -->
        <rect x="-42" y="-22" width="84" height="15" rx="4" fill="${badgeBg}" />
        <text x="0" y="-11" text-anchor="middle" fill="${badgeFg}" font-family="monospace" font-size="8.5" font-weight="bold">
          ${escapeXml(badgeText)}
        </text>

        <!-- Core Node ID -->
        <text x="0" y="8" text-anchor="middle" fill="${textMain}" font-family="monospace" font-size="11" font-weight="bold">
          ${escapeXml(shortId)}
        </text>

        <!-- Node Class -->
        <text x="0" y="21" text-anchor="middle" fill="${textMuted}" font-family="monospace" font-size="8">
          :${escapeXml(n.label || 'Node')}
        </text>
      </g>
    `;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${calculatedHeight}" width="${width}" height="${calculatedHeight}">
  <style>
    text { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
  </style>
  <defs>
    <marker id="arrow-slate" viewBox="0 0 10 10" refX="48" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="${isDarkTheme ? '#64748B' : '#94A3B8'}" />
    </marker>
    <marker id="arrow-red" viewBox="0 0 10 10" refX="48" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#F43F5E" />
    </marker>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${calculatedHeight}" fill="${bgFill}" />

  <!-- Title Ribbon -->
  <text x="40" y="32" fill="${textMain}" font-size="14" font-weight="bold">${escapeXml(title)}</text>
  <text x="${width - 40}" y="32" text-anchor="end" fill="${textMuted}" font-size="11">Nodes: ${rawNodes.length} • Edges: ${rawEdges.length} • Generated by CAVDAX</text>

  <!-- Optional Blast Radius Banner -->
  ${bannerSvg}

  <!-- Layer Column Guides -->
  <text x="120" y="90" text-anchor="middle" fill="${textMuted}" font-size="10" font-weight="bold">[SOURCES]</text>
  <text x="360" y="90" text-anchor="middle" fill="${textMuted}" font-size="10" font-weight="bold">[FACTS]</text>
  <text x="600" y="90" text-anchor="middle" fill="${textMuted}" font-size="10" font-weight="bold">[DECISIONS]</text>
  <text x="820" y="90" text-anchor="middle" fill="${textMuted}" font-size="10" font-weight="bold">[ACTIONS / WRITES]</text>

  <!-- Graph Edges -->
  ${edgesSvg}

  <!-- Graph Nodes -->
  ${nodesSvg}
</svg>`;
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
