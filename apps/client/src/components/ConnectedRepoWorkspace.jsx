import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  GitBranch, FolderGit2, FileText, RefreshCw, Terminal, GitPullRequest,
  CheckCircle2, AlertTriangle, ExternalLink, Trash2, Loader2, ChevronDown, Check, Search, Plus, Copy, X, Code2, Cpu } from 'lucide-react';
import GraphCanvas from './GraphCanvas';
import SubsystemErrorBoundary from './SubsystemErrorBoundary';
import McpActionPlayground from './McpActionPlayground';
import { playClick, playApprovalChime, playRejectBuzz } from '../utils/soundFx';

/**
 * ConnectedRepoWorkspace.jsx — Live view of a connected GitHub repository.
 *
 * Flow:
 *   1. Scan   GET  /api/github/repos/:owner/:repo/adrs   reads the default branch, parses ADRs, returns the graph.
 *   2. Empty  POST /api/github/repos/:owner/:repo/init-adr   opens a pull request with a starter ADR.
 *             Nothing is committed to the default branch; the owner reviews and merges on GitHub.
 *   3. Rescan after merge, the real ADR graph renders.
 */

const btnBase =
  'h-9 px-3 rounded-xl border text-xs font-mono font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0';
const btnSecondary =
  `${btnBase} border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white`;
const btnPrimary =
  `${btnBase} border-slate-900 dark:border-white bg-slate-950 text-white dark:bg-white dark:text-slate-950 hover:opacity-90`;

const ERROR_COPY = {
  AUTH_REQUIRED: 'Your GitHub session has expired. Sign in again to continue.',
  AUTH_EXPIRED: 'Your GitHub session has expired. Sign in again to continue.',
  NOT_FOUND: 'This repository was not found, or your GitHub account cannot access it.',
  FORBIDDEN: 'GitHub denied the request. Opening a pull request needs write access to this repository.',
  REPO_EMPTY: 'This repository has no commits yet. Push a first commit, then scan again.',
  RATE_LIMITED: 'Too many requests. Wait a few minutes and try again.',
  ADRS_EXIST: 'This repository already has ADRs. Scan again to load them.'
};

function splitFullName(fullName = '') {
  const [owner, ...rest] = fullName.split('/');
  return { owner, name: rest.join('/') };
}

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

export default function ConnectedRepoWorkspace({
  repo,
  isDarkTheme,
  onUpdateRepo,
  onDisconnectRepo
}) {
  const { owner, name } = splitFullName(repo.full_name);
  const apiBase = `/api/github/repos/${encodeURIComponent(owner || '')}/${encodeURIComponent(name || '')}`;

  const [phase, setPhase] = useState('scanning'); // scanning | ready | error
  const [scan, setScan] = useState(null);
  const [error, setError] = useState(null);
  const [isOpeningPr, setIsOpeningPr] = useState(false);
  const [showInitConfirmModal, setShowInitConfirmModal] = useState(false);
  const [syncingTarget, setSyncingTarget] = useState(null);
  const [showAgentSetupModal, setShowAgentSetupModal] = useState(false);
  const [showCiGateModal, setShowCiGateModal] = useState(false);
  const [showProposeAdrModal, setShowProposeAdrModal] = useState(false);
  const [showPlaygroundModal, setShowPlaygroundModal] = useState(false);
  const [agentSetupTab, setAgentSetupTab] = useState('cursor');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const agentPill = usePillTracker(agentSetupTab, showAgentSetupModal);

  // Pause Lenis global smooth-scroll while any modal is mounted to guarantee native mouse wheel scrolling in code editors & modal cards
  const anyModalOpen = showInitConfirmModal || showAgentSetupModal || showCiGateModal || showProposeAdrModal || showPlaygroundModal;
  useEffect(() => {
    if (anyModalOpen) {
      if (window.__lenis) {
        window.__lenis.stop();
      }
      return () => {
        if (window.__lenis) {
          window.__lenis.start();
        }
      };
    }
  }, [anyModalOpen]);

  const [isOpeningCiGatePr, setIsOpeningCiGatePr] = useState(false);
  const [ciGatePrResult, setCiGatePrResult] = useState(null);
  const [isProposingAdr, setIsProposingAdr] = useState(false);
  const [proposeAdrResult, setProposeAdrResult] = useState(null);
  const [proposeForm, setProposeForm] = useState({
    title: '',
    context: '',
    decision: '',
    consequences: '',
    supersedes: ''
  });
  const [selectedNode, setSelectedNode] = useState(null);
  const [expandedAdrId, setExpandedAdrId] = useState(null);
  const [selectedProbeDecisionId, setSelectedProbeDecisionId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(() => {
    try {
      const saved = localStorage.getItem(`cavdax.selected_branch.${repo.full_name}`);
      if (saved) return saved;
    } catch {}
    return repo.selected_branch || repo.default_branch || 'main';
  });
  const [branches, setBranches] = useState([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [branchSearch, setBranchSearch] = useState('');
  const [highlightedBranchIndex, setHighlightedBranchIndex] = useState(0);
  const branchDropdownRef = useRef(null);
  const branchListRef = useRef(null);
  const branchItemRefs = useRef([]);
  const [leftWidthPercent, setLeftWidthPercent] = useState(() => {
    try {
      const saved = localStorage.getItem('cavdax.repo.splitter.width');
      return saved ? Math.min(65, Math.max(25, parseFloat(saved))) : 41.666;
    } catch {
      return 41.666;
    }
  });
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const splitContainerRef = useRef(null);

  // Load repository branches for the branch selector
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingBranches(true);
    fetch(`${apiBase}/branches`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (!isCancelled && data.success && Array.isArray(data.branches)) {
          setBranches(data.branches);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setIsLoadingBranches(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [apiBase]);

  // Click-outside listener to close branch dropdown
  useEffect(() => {
    if (!isBranchDropdownOpen) return;
    const handleOutsideClick = (e) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target)) {
        setIsBranchDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [isBranchDropdownOpen]);

  // A11y: Escape key listener to close open modals and dropdowns
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowAgentSetupModal(false);
        setShowCiGateModal(false);
        setShowProposeAdrModal(false);
        setShowPlaygroundModal(false);
        setShowInitConfirmModal(false);
        setIsBranchDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Live MCP Tool Interception Stream via SSE
  useEffect(() => {
    let es;
    try {
      es = new EventSource('/api/events');
      es.addEventListener('MCP_TOOL_INTERCEPTED', (e) => {
        try {
          const parsed = JSON.parse(e.data);
          const payload = parsed.data || parsed;
          if (payload.repo === repo.full_name) {
            const isApproved = payload.verdict === 'APPROVED';
            setLogs((prev) => [
              ...prev.slice(-35),
              {
                time: new Date().toLocaleTimeString(),
                component: isApproved ? 'GATE_APPROVE' : 'GATE_BLOCK',
                text: `Live Agent Intercept: '${payload.toolName}' on ${payload.targetFile || payload.decisionId} -> ${payload.verdict} (${payload.latencyMs || '<15'}ms)`
              }
            ]);
            if (payload.decisionId) {
              setSelectedProbeDecisionId(payload.decisionId);
              setTimeout(() => setSelectedProbeDecisionId(null), 2500);
            }
          }
        } catch {}
      });
    } catch {}
    return () => {
      if (es) es.close();
    };
  }, [repo.full_name]);

  const handleSplitterMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
  }, []);

  useEffect(() => {
    if (!isDraggingSplitter) return;

    const handleMouseMove = (e) => {
      if (!splitContainerRef.current) return;
      const rect = splitContainerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const newPercent = Math.min(65, Math.max(25, (currentX / rect.width) * 100));
      setLeftWidthPercent(newPercent);
    };

    const handleMouseUp = () => {
      setIsDraggingSplitter(false);
      try {
        localStorage.setItem('cavdax.repo.splitter.width', String(leftWidthPercent));
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplitter, leftWidthPercent]);
  const logsEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Keep the latest props in refs so scan() does not change identity when the parent updates the repo.
  const repoRef = useRef(repo);
  repoRef.current = repo;
  const onUpdateRepoRef = useRef(onUpdateRepo);
  onUpdateRepoRef.current = onUpdateRepo;
  const selectedBranchRef = useRef(selectedBranch);
  selectedBranchRef.current = selectedBranch;

  const addLog = useCallback((component, text, type = 'INFO') => {
    setLogs(prev => [...prev, { component, text, type, time: new Date().toLocaleTimeString() }]);
  }, []);

  const failWith = useCallback((data, fallback) => {
    const message = ERROR_COPY[data?.code] || data?.error || fallback;
    setError({ code: data?.code || 'ERROR', message });
    setPhase('error');
    playRejectBuzz();
    addLog('GITHUB', message, 'GATE_BLOCK');
  }, [addLog]);

  const runScan = useCallback(async (branchOverride) => {
    const targetBranch = branchOverride || selectedBranchRef.current || repoRef.current?.default_branch || 'main';
    setPhase('scanning');
    setError(null);
    addLog('SCAN', `Reading ADRs from ${repoRef.current.full_name} on branch ${targetBranch}.`);
    try {
      const res = await fetch(`${apiBase}/adrs?branch=${encodeURIComponent(targetBranch)}&_t=${Date.now()}`, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        failWith(data, 'Could not read this repository.');
        return;
      }
      setScan(data);
      if (data.branch) {
        setSelectedBranch(data.branch);
        selectedBranchRef.current = data.branch;
        try {
          localStorage.setItem(`cavdax.selected_branch.${repo.full_name}`, data.branch);
        } catch {}
        if (onUpdateRepoRef.current && repoRef.current?.selected_branch !== data.branch) {
          onUpdateRepoRef.current({ ...repoRef.current, selected_branch: data.branch });
        }
      }
      setPhase('ready');
      addLog('PARSER', `Found ${data.count} ADR file${data.count === 1 ? '' : 's'} on branch ${data.branch}.`, data.count ? 'CASCADE' : 'INFO');
      if (data.count > 0) {
        addLog('GRAPH', `Built ${data.graph.nodes.length} nodes and ${data.graph.edges.length} edges from the ADRs.`);
        playApprovalChime();
      } else {
        addLog('GITHUB', `0 ADR files detected on branch ${data.branch}. If you recently merged a pull request, GitHub edge caches take ~10-15s to update. Please wait a moment and click Rescan.`, 'INFO');
      }
      const current = repoRef.current;
      const hasAdrs = data.count > 0;
      if (onUpdateRepoRef.current && current.hasAdrs !== hasAdrs) {
        onUpdateRepoRef.current({ ...current, hasAdrs });
      }
    } catch {
      failWith(null, 'Could not reach the CAVDAX server. Check your connection and try again.');
    }
  }, [apiBase, addLog, failWith]);

  const runScanRef = useRef(runScan);
  runScanRef.current = runScan;

  // Scan once per repository. Keyed on full_name so branch changes never retrigger it.
  useEffect(() => {
    let initialBranch = repo.default_branch || 'main';
    try {
      const saved = localStorage.getItem(`cavdax.selected_branch.${repo.full_name}`);
      if (saved) {
        initialBranch = saved;
      } else if (repo.selected_branch) {
        initialBranch = repo.selected_branch;
      }
    } catch {}

    setSelectedBranch(initialBranch);
    selectedBranchRef.current = initialBranch;
    setScan(null);
    setSelectedNode(null);
    setLogs([]);
    runScanRef.current(initialBranch);
  }, [repo.full_name, repo.default_branch]);

  const openPullRequest = async () => {
    playClick();
    setIsOpeningPr(true);
    setError(null);
    addLog('PULL_REQUEST', 'Creating a branch and opening a pull request with a starter ADR.');
    try {
      const res = await fetch(`${apiBase}/init-adr`, { method: 'POST', credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        failWith(data, 'Could not open the pull request.');
        return;
      }
      const pr = data.pullRequest;
      playApprovalChime();
      addLog('PULL_REQUEST', `${pr.reused ? 'Pull request already open' : 'Opened pull request'} #${pr.number} from ${pr.branch}.`, 'CASCADE');
      if (pr.detected?.length) addLog('DETECT', `Detected ${pr.detected.join(', ')} from the repository manifest.`);
      if (onUpdateRepo) {
        onUpdateRepo({ ...repo, adrPr: { number: pr.number, url: pr.url, branch: pr.branch } });
      }
      setPhase('ready');
    } catch {
      failWith(null, 'Could not reach the CAVDAX server. Check your connection and try again.');
    } finally {
      setIsOpeningPr(false);
    }
  };

  const forgetPullRequest = () => {
    playClick();
    if (onUpdateRepo) {
      const { adrPr, ...rest } = repo;
      onUpdateRepo(rest);
    }
  };

  const openSyncPullRequest = async (targetId, supersedingId) => {
    playClick();
    setSyncingTarget(targetId);
    setError(null);
    addLog('SYNC_PR', `Creating branch and opening pull request to mark ${targetId} superseded by ${supersedingId}.`);
    try {
      const res = await fetch(`${apiBase}/sync-adr-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ targetId, supersedingId })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        failWith(data, 'Could not open the sync pull request.');
        return;
      }
      const pr = data.pullRequest;
      playApprovalChime();
      addLog('SYNC_PR', `${pr.reused ? 'Sync pull request already open' : 'Opened sync pull request'} #${pr.number} on branch ${pr.branch}.`, 'CASCADE');
      setScan(prev => prev ? {
        ...prev,
        unsynced: (prev.unsynced || []).filter(u => u.targetId !== targetId)
      } : prev);
    } catch {
      failWith(null, 'Could not reach the CAVDAX server. Check your connection.');
    } finally {
      setSyncingTarget(null);
    }
  };

  const handleCreateCiGatePr = async () => {
    playClick();
    setIsOpeningCiGatePr(true);
    setError(null);
    addLog('CI_GATE', 'Drafting .github/workflows/cavdax-gate.yml and opening pull request.');
    try {
      const res = await fetch(`${apiBase}/ci-gate-pr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        failWith(data, 'Could not open CI Gate pull request.');
        return;
      }
      playApprovalChime();
      setCiGatePrResult(data.pr);
      addLog('CI_GATE', `Opened CI Gate pull request #${data.pr.number} on branch ${data.pr.branch}.`, 'CASCADE');
    } catch {
      failWith(null, 'Could not reach the CAVDAX server.');
    } finally {
      setIsOpeningCiGatePr(false);
    }
  };

  const handleProposeAdrSubmit = async (e) => {
    if (e) e.preventDefault();
    playClick();
    if (!proposeForm.title.trim()) return;
    setIsProposingAdr(true);
    setError(null);
    addLog('PROPOSE_ADR', `Drafting new ADR: "${proposeForm.title.trim()}"`);
    try {
      const res = await fetch(`${apiBase}/propose-adr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: proposeForm.title.trim(),
          context: proposeForm.context.trim(),
          decision: proposeForm.decision.trim(),
          consequences: proposeForm.consequences.trim(),
          supersedes: proposeForm.supersedes ? proposeForm.supersedes.trim() : null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        failWith(data, 'Could not propose ADR pull request.');
        return;
      }
      playApprovalChime();
      setProposeAdrResult(data.pr);
      addLog('PROPOSE_ADR', `Opened pull request #${data.pr.number} proposing ${data.pr.adrId}.`, 'CASCADE');
      setProposeForm({ title: '', context: '', decision: '', consequences: '', supersedes: '' });
    } catch {
      failWith(null, 'Could not reach the CAVDAX server.');
    } finally {
      setIsProposingAdr(false);
    }
  };

  const [verifyingDecisionId, setVerifyingDecisionId] = useState(null);

  const testDecision = async (targetDecisionIdOrWantValid) => {
    const decisions = (scan?.graph?.nodes || []).filter(n => n.label === 'Decision');
    if (decisions.length === 0) {
      addLog('MCP_GATE', 'No architectural decisions found in this repository yet.');
      return;
    }

    let target = null;
    if (typeof targetDecisionIdOrWantValid === 'string') {
      target = decisions.find(d => d.id === targetDecisionIdOrWantValid) || decisions[0];
    } else if (typeof targetDecisionIdOrWantValid === 'boolean') {
      target = decisions.find(d => (targetDecisionIdOrWantValid ? d.status === 'VALID' : (d.status === 'INVALIDATED_NEEDS_REVALIDATION' || d.status === 'SUPERSEDED')));
      if (!target) {
        addLog('MCP_GATE', targetDecisionIdOrWantValid
          ? 'No valid decision found in repository graph.'
          : 'No superseded decision found. Merge an ADR that supersedes an existing one to test gate rejection.');
        return;
      }
    } else {
      target = decisions[0];
    }

    const adrNode = (scan?.graph?.nodes || []).find(n => n.label === 'Source' && (n.id === target.id || n.id === target.source_adr || n.id === target.from));
    const targetFile = target.target_file || target.file || target.adr_path || adrNode?.file || null;

    setVerifyingDecisionId(target.id);
    const clientStart = performance.now();

    try {
      const res = await fetch(`/api/github/repos/${repo.full_name}/verify-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          decisionId: target.id,
          targetFile,
          branch: scan?.branch || selectedBranch || repo.default_branch || 'main'
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const latencyMs = data.latency_ms ?? parseFloat((performance.now() - clientStart).toFixed(2));
      const actionNode = data.action;
      const actionEdge = data.edge;

      setScan(prev => {
        if (!prev || !prev.graph) return prev;
        const existingAction = prev.graph.nodes.find(n => n.label === 'AgentAction' && (n.decision_id === target.id || n.id === actionNode.id));
        const previousCount = existingAction?.probe_count || 0;
        const probeCount = previousCount + 1;

        const updatedActionNode = {
          ...actionNode,
          probe_count: probeCount,
          last_probed_at: Date.now(),
          title: `ACT: ${actionNode.status === 'APPROVED' ? 'Verified Write' : 'Blocked Write'} (${target.id})${probeCount > 1 ? ` (${probeCount}x)` : ''}`
        };

        const otherNodes = prev.graph.nodes.filter(n => !(n.label === 'AgentAction' && (n.decision_id === target.id || n.id === actionNode.id)));
        const otherEdges = prev.graph.edges.filter(e => !(e.type === 'GROUNDED_IN' && e.target === target.id));
        return {
          ...prev,
          graph: {
            nodes: [...otherNodes, updatedActionNode],
            edges: [...otherEdges, actionEdge]
          }
        };
      });

      if (data.is_approved) {
        playApprovalChime();
        addLog('MCP_GATE', `Agent write to ${data.target_file} APPROVED (grounded in ${target.id}: VALID). Verified in ${latencyMs}ms.`, 'GATE_APPROVE');
      } else {
        playRejectBuzz();
        addLog('MCP_GATE', `Agent write to ${data.target_file} BLOCKED: grounded in ${target.id} whose source was superseded. Verified in ${latencyMs}ms.`, 'GATE_BLOCK');
      }
    } catch (err) {
      playRejectBuzz();
      addLog('MCP_GATE', `Gate verification error: ${err.message}. (Authentic verification requires active server connection)`, 'GATE_BLOCK');
    } finally {
      setVerifyingDecisionId(null);
    }
  };

  const hasAdrs = phase === 'ready' && scan && scan.count > 0;
  const noAdrs = phase === 'ready' && scan && scan.count === 0;
  const pr = repo.adrPr;

  const decisions = (scan?.graph?.nodes || []).filter(n => n.label === 'Decision');
  const validDecisions = decisions.filter(d => d.status === 'VALID');
  const staleDecisions = decisions.filter(d => d.status === 'INVALIDATED_NEEDS_REVALIDATION' || d.status === 'SUPERSEDED');

  const selectedDecision = selectedNode?.label === 'Decision'
    ? selectedNode
    : (selectedNode?.label === 'Source' ? decisions.find(d => d.source_adr === selectedNode.id || d.id === selectedNode.id) : null);

  const activeValidDecision = (selectedDecision && selectedDecision.status === 'VALID')
    ? selectedDecision
    : (validDecisions[0] || null);

  const activeStaleDecision = (selectedDecision && (selectedDecision.status === 'INVALIDATED_NEEDS_REVALIDATION' || selectedDecision.status === 'SUPERSEDED'))
    ? selectedDecision
    : (staleDecisions[0] || null);

  const handleSelectBranch = (branchName) => {
    if (!branchName || branchName === selectedBranch) {
      setIsBranchDropdownOpen(false);
      return;
    }
    playClick();
    setSelectedBranch(branchName);
    selectedBranchRef.current = branchName;
    try {
      localStorage.setItem(`cavdax.selected_branch.${repo.full_name}`, branchName);
    } catch {}
    if (onUpdateRepo && repo.selected_branch !== branchName) {
      onUpdateRepo({ ...repo, selected_branch: branchName });
    }
    setIsBranchDropdownOpen(false);
    setBranchSearch('');
    runScan(branchName);
  };

  const handleBranchKeyDown = (e) => {
    if (!isBranchDropdownOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedBranchIndex(prev => Math.min(prev + 1, Math.max(0, flattenedFilteredBranches.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedBranchIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flattenedFilteredBranches.length > 0 && flattenedFilteredBranches[highlightedBranchIndex]) {
        handleSelectBranch(flattenedFilteredBranches[highlightedBranchIndex].name);
      } else if (branchSearch.trim()) {
        handleSelectBranch(branchSearch.trim());
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsBranchDropdownOpen(false);
    }
  };

  useEffect(() => {
    if (isBranchDropdownOpen && branchItemRefs.current[highlightedBranchIndex]) {
      branchItemRefs.current[highlightedBranchIndex].scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedBranchIndex, isBranchDropdownOpen]);

  useEffect(() => {
    setHighlightedBranchIndex(0);
  }, [branchSearch, isBranchDropdownOpen]);

  const { groupedBranches, flattenedFilteredBranches } = useMemo(() => {
    const query = branchSearch.toLowerCase().trim();
    const list = (!branches.length)
      ? [{ name: selectedBranch, isDefault: true }]
      : (!branches.some(b => b.name === selectedBranch) && selectedBranch)
        ? [{ name: selectedBranch, isDefault: false }, ...branches]
        : branches;

    const filtered = query
      ? list.filter(b => b.name.toLowerCase().includes(query))
      : list;

    const defaultGroup = [];
    const prGroup = [];
    const otherGroup = [];

    const prBranchName = repo.adrPr?.branch;

    filtered.forEach(b => {
      const isDefault = b.isDefault || b.name === (repo.default_branch || 'main');
      const isPr = Boolean(prBranchName && b.name === prBranchName);

      if (isDefault) {
        defaultGroup.push({ ...b, isDefault: true, isPr });
      } else if (isPr) {
        prGroup.push({ ...b, isPr: true });
      } else {
        otherGroup.push(b);
      }
    });

    otherGroup.sort((a, b) => a.name.localeCompare(b.name));

    const groups = [];
    if (defaultGroup.length > 0) {
      groups.push({ id: 'default', title: 'Default Branch', items: defaultGroup });
    }
    if (prGroup.length > 0) {
      groups.push({ id: 'pr', title: 'Active Pull Request', items: prGroup });
    }
    if (otherGroup.length > 0) {
      groups.push({ id: 'other', title: 'All Branches', items: otherGroup });
    }

    const flat = groups.flatMap(g => g.items);

    return {
      groupedBranches: groups,
      flattenedFilteredBranches: flat
    };
  }, [branches, selectedBranch, branchSearch, repo.default_branch, repo.adrPr]);

  return (
    <div className="flex-1 min-h-0 flex flex-col font-mono select-none">
      {/* Repository ribbon */}
      <div data-tour="repo-ribbon" className="flex-shrink-0 py-2 px-3 sm:px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-slate-200/80 dark:bg-white/10 border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 flex items-center justify-center shrink-0">
            <GitBranch className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-950 dark:text-white truncate block">{repo.full_name}</span>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <div className="relative" ref={branchDropdownRef}>
                <button
                  type="button"
                  onClick={() => { playClick(); setIsBranchDropdownOpen(prev => !prev); }}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/15 transition-colors cursor-pointer"
                  title="Switch branch"
                  aria-expanded={isBranchDropdownOpen}
                >
                  <GitBranch className="w-3 h-3 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span className="font-bold truncate max-w-[140px]">{selectedBranch}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-0.5" />
                </button>

                {isBranchDropdownOpen && (
                  <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 max-w-[90vw] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c0c0e] shadow-xl z-50 overflow-hidden text-left flex flex-col font-sans">
                    <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-white/[0.02]">
                      <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-slate-900 dark:text-slate-100 mb-1.5 px-1 font-mono">
                        <span>Switch branch</span>
                        {isLoadingBranches && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
                      </div>
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={branchSearch}
                          onChange={(e) => setBranchSearch(e.target.value)}
                          onKeyDown={handleBranchKeyDown}
                          placeholder="Filter branches..."
                          className="w-full pl-7 pr-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-white/30 font-mono"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div 
                      ref={branchListRef}
                      data-lenis-prevent
                      tabIndex={0}
                      onKeyDown={handleBranchKeyDown}
                      className="max-h-60 overflow-y-auto overscroll-contain has-scrubbar divide-y divide-slate-100 dark:divide-white/5 py-1 focus:outline-none"
                    >
                      {groupedBranches.length > 0 ? (
                        groupedBranches.map(group => (
                          <div key={group.id} className="py-1 first:pt-0 last:pb-0">
                            <div className="px-3 py-1 text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-white/[0.02]">
                              {group.title}
                            </div>
                            {group.items.map(b => {
                              const isCurrent = b.name === selectedBranch;
                              const globalIdx = flattenedFilteredBranches.findIndex(fb => fb.name === b.name);
                              const isHighlighted = globalIdx === highlightedBranchIndex;
                              const isBranchPr = pr && pr.branch === b.name;

                              return (
                                <div
                                  key={b.name}
                                  ref={el => { if (globalIdx >= 0) branchItemRefs.current[globalIdx] = el; }}
                                  onMouseEnter={() => { if (globalIdx >= 0) setHighlightedBranchIndex(globalIdx); }}
                                  onClick={() => handleSelectBranch(b.name)}
                                  className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                    isHighlighted ? 'bg-slate-200/70 dark:bg-white/15' : 'hover:bg-slate-100/80 dark:hover:bg-white/[0.05]'
                                  } ${isCurrent ? 'font-bold text-slate-950 dark:text-white' : ''}`}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <GitBranch className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                                    <span className="truncate font-mono text-[11px] text-slate-800 dark:text-slate-200">{b.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {b.isDefault && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider font-mono font-semibold bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-300">default</span>
                                    )}
                                    {isBranchPr && (
                                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-300/80 dark:border-white/15">
                                        <GitPullRequest className="w-2.5 h-2.5 text-slate-500 dark:text-slate-400" />
                                        PR #{pr.number}
                                      </span>
                                    )}
                                    {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                                    <a
                                      href={`https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/tree/${encodeURIComponent(b.name)}`}
                                      target="_blank"
                                      rel="noreferrer noopener"
                                      onClick={e => e.stopPropagation()}
                                      className="p-1 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-white/10 transition-colors"
                                      title={`Open "${b.name}" on GitHub`}
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-xs text-slate-500 font-mono">
                          {branchSearch.trim() ? (
                            <div>
                              <p className="mb-2">No matching branch found.</p>
                              <button
                                type="button"
                                onClick={() => handleSelectBranch(branchSearch.trim())}
                                className="px-2 py-1 rounded bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-[11px] text-slate-900 dark:text-white transition-colors cursor-pointer"
                              >
                                Scan &quot;{branchSearch.trim()}&quot; anyway
                              </button>
                            </div>
                          ) : (
                            'No branches available'
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Immediate header-level "Rescan Branch" button */}
              <button
                type="button"
                onClick={() => { playClick(); runScan(); }}
                disabled={phase === 'scanning'}
                className="inline-flex items-center justify-center h-[22px] w-[22px] rounded-md bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/15 transition-colors cursor-pointer disabled:opacity-50"
                title={`Rescan branch "${selectedBranch}"`}
              >
                <RefreshCw className={`w-3 h-3 ${phase === 'scanning' ? 'animate-spin' : ''}`} />
              </button>

              {/* Quick Jump "View Branch on GitHub" link button */}
              <a
                href={`https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/tree/${encodeURIComponent(selectedBranch)}`}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center justify-center h-[22px] w-[22px] rounded-md bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/15 transition-colors"
                title={`View branch "${selectedBranch}" on GitHub`}
              >
                <ExternalLink className="w-3 h-3" />
              </a>

              {/* Open Pull Request Association badge */}
              {pr && pr.branch === selectedBranch && (
                <a
                  href={pr.url || `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pull/${pr.number}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border border-slate-300 dark:border-white/15 bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 transition-colors"
                  title={`View Pull Request #${pr.number} on GitHub`}
                >
                  <GitPullRequest className="w-3 h-3 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>PR #{pr.number}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                </a>
              )}

              {/* Causal Divergence / Decision Count Indicator */}
              {phase === 'ready' && scan && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-white/[0.04]"
                  title={`${scan.count} Architecture Decision Records indexed on branch "${selectedBranch}"`}
                >
                  <FileText className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span>{scan.count} {scan.count === 1 ? 'ADR' : 'ADRs'}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              playClick();
              setShowAgentSetupModal(true);
            }}
            className={btnSecondary}
            title="Configure Cursor, Claude Code, Cline, or Windsurf for this repository"
          >
            <Terminal className="w-4 h-4 text-slate-700 dark:text-slate-300" strokeWidth={2} />
            <span>Agent Setup</span>
          </button>
          <button
            onClick={() => {
              playClick();
              setShowCiGateModal(true);
            }}
            className={btnSecondary}
            title="1-click GitHub Actions CI/CD architectural verification gate"
          >
            <GitBranch className="w-4 h-4 text-slate-700 dark:text-slate-300" strokeWidth={2} />
            <span>CI Gate</span>
          </button>
          <button onClick={() => { playClick(); runScan(); }} disabled={phase === 'scanning'} className={btnSecondary}>
            <RefreshCw className={`w-4 h-4 ${phase === 'scanning' ? 'animate-spin' : ''}`} strokeWidth={2} />
            <span>Rescan</span>
          </button>
          {onDisconnectRepo && (
            <button
              onClick={() => { playClick(); onDisconnectRepo(repo.id); }}
              className={`${btnSecondary} hover:bg-rose-500/10 hover:border-rose-500/30`}
              title="Disconnect this repository"
            >
              <Trash2 className="w-4 h-4" strokeWidth={2} />
              <span>Disconnect</span>
            </button>
          )}
        </div>
      </div>

      {/* Stage */}
      {phase === 'scanning' && (
        <StateCard icon={<RefreshCw className="w-6 h-6 text-slate-700 dark:text-slate-300 animate-spin" />}
          title="Scanning repository"
          body={<>Reading ADR files from <strong className="font-mono text-slate-950 dark:text-white">{repo.full_name}</strong> on branch <strong className="font-mono">{scan?.branch || repo.default_branch || 'main'}</strong>.</>} />
      )}

      {phase === 'error' && (
        <StateCard icon={<AlertTriangle className="w-6 h-6 text-rose-500" />}
          title="Could not complete the request"
          body={error?.message}
          actions={
            <div className="grid grid-cols-2 gap-2">
              {error?.code === 'AUTH_REQUIRED' || error?.code === 'AUTH_EXPIRED' ? (
                <a href={`/api/auth/github?returnTo=${encodeURIComponent('/console')}`} className={`${btnPrimary} no-underline`}>Sign in</a>
              ) : (
                <button onClick={() => { playClick(); runScan(); }} className={btnPrimary}>Try again</button>
              )}
              <button onClick={() => { playClick(); onDisconnectRepo?.(repo.id); }} className={btnSecondary}>Disconnect</button>
            </div>
          } />
      )}

      {noAdrs && !pr && (
        <StateCard icon={<FolderGit2 className="w-6 h-6 text-slate-700 dark:text-slate-300" />}
          title="No Architecture Decision Records found"
          body={<>No ADRs found in <strong className="font-mono text-slate-950 dark:text-white">{repo.full_name}</strong>. Initialize will inspect your stack and open a starter ADR-001 pull request without committing directly to <strong className="font-mono">{scan.branch}</strong>.</>}
          actions={
            <button onClick={() => { playClick(); setShowInitConfirmModal(true); }} disabled={isOpeningPr} className={`${btnPrimary} w-full cursor-pointer`}>
              {isOpeningPr ? <Loader2 className="w-4 h-4 animate-spin shrink-0" strokeWidth={2} /> : <GitPullRequest className="w-4 h-4 shrink-0" strokeWidth={2} />}
              <span>{isOpeningPr ? 'Opening pull request' : 'Open pull request with ADR-001'}</span>
            </button>
          }
          footnote={<>Already have ADRs? Put them in <code className="font-mono bg-slate-200 dark:bg-white/10 px-1 py-0.5 rounded">docs/adrs</code>, <code className="font-mono bg-slate-200 dark:bg-white/10 px-1 py-0.5 rounded">docs/adr</code>, root <code className="font-mono bg-slate-200 dark:bg-white/10 px-1 py-0.5 rounded">ADR-*.md</code> or <code className="font-mono bg-slate-200 dark:bg-white/10 px-1 py-0.5 rounded">docs/decisions</code> and rescan.</>} />
      )}

      {noAdrs && pr && (
        <StateCard icon={<GitPullRequest className="w-6 h-6 text-slate-700 dark:text-slate-300" />}
          title={`Pull request #${pr.number} is waiting for review`}
          body={<>Review the starter ADR on GitHub and merge it into <strong className="font-mono text-slate-950 dark:text-white">{scan?.branch || selectedBranch}</strong>. Then rescan and CAVDAX will build the decision graph from it.</>}
          actions={
            <div className="grid grid-cols-2 gap-2">
              <a href={pr.url} target="_blank" rel="noopener noreferrer" className={`${btnPrimary} no-underline`}>
                <ExternalLink className="w-4 h-4" strokeWidth={2} />
                <span>View on GitHub</span>
              </a>
              <button
                onClick={() => { playClick(); runScan(); }}
                disabled={phase === 'scanning'}
                className={`${btnSecondary} cursor-pointer disabled:opacity-50`}
              >
                <RefreshCw className={`w-4 h-4 ${phase === 'scanning' ? 'animate-spin' : ''}`} strokeWidth={2} />
                <span>{phase === 'scanning' ? 'Rescanning repository...' : 'I merged it, rescan'}</span>
              </button>
            </div>
          }
          footnote={<>Closed the pull request? <button onClick={forgetPullRequest} className="underline cursor-pointer text-slate-700 dark:text-slate-200">Open a new one</button>.</>} />
      )}

      {hasAdrs && (
        <div ref={splitContainerRef} className={`flex-1 min-h-0 flex flex-col lg:flex-row rounded-2xl overflow-hidden border border-slate-300 dark:border-white/15 shadow-sm ${isDraggingSplitter ? "select-none cursor-col-resize" : ""}`}>
          {/* Left: ADR files and activity — Adaptive theme styling for complete visual harmony */}
          <div data-tour="repo-adrs" style={{ flex: `0 0 ${leftWidthPercent}%` }} className="h-full overflow-hidden flex flex-col bg-white dark:bg-[#0c0c0e] text-slate-800 dark:text-slate-200 border-b lg:border-b-0 border-slate-200 dark:border-slate-800 min-w-[280px] max-w-full lg:max-w-[70%]">
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs font-mono bg-slate-50/80 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span className="font-bold text-slate-950 dark:text-white">ADRs in this repository</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">({scan.count} files)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setProposeAdrResult(null);
                  setShowProposeAdrModal(true);
                }}
                className="px-2 py-1 rounded-lg text-[10.5px] font-mono font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-950 hover:opacity-90 flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                title="Draft a new Architecture Decision Record (ADR) and open a pull request"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Propose ADR</span>
              </button>
            </div>

            <div data-lenis-prevent className="max-h-24 overflow-y-auto overscroll-contain border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-transparent select-text [direction:rtl]">
            <div className="[direction:ltr] divide-y divide-slate-100 dark:divide-white/5">
              {scan.adrs.map(a => {
                const gitAdrUrl = repo?.full_name ? `https://github.com/${repo.full_name}/blob/${scan?.branch || selectedBranch || repo.default_branch || 'main'}/${a.path.replace(/^\.?\//, '')}` : null;
                // Find downstream impacted decisions and code files for this ADR
                const associatedDecisions = (scan?.graph?.nodes || []).filter(n => n.label === 'Decision' && (n.source_adr === a.id || n.adr_path === a.path));
                const targetFiles = Array.from(new Set(associatedDecisions.map(d => d.target_file).filter(Boolean)));
                const isExpanded = expandedAdrId === a.id;

                return (
                  <div key={a.path} className="px-3 py-2 text-[11px] leading-snug hover:bg-slate-100/60 dark:hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="text-slate-900 dark:text-slate-100 font-semibold truncate flex items-center gap-1.5 min-w-0">
                        <span>{a.id}: {a.title}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {targetFiles.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              playClick();
                              setExpandedAdrId(prev => prev === a.id ? null : a.id);
                            }}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                            title="Toggle impacted target files dropdown"
                          >
                            <span>{targetFiles.length} file{targetFiles.length === 1 ? '' : 's'}</span>
                            <span className="text-[9px]">{isExpanded ? '▲' : '▼'}</span>
                          </button>
                        )}
                        {gitAdrUrl && (
                          <a
                            href={gitAdrUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={playClick}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
                            title={`Open ${a.path} on GitHub`}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 truncate text-[10px] font-mono mt-0.5">{a.path}</div>

                    {/* Impacted Target Files Dropdown */}
                    {isExpanded && targetFiles.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-white/10 space-y-1">
                        <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between">
                          <span>Impacted Target Code Files</span>
                          <span>GitHub Links</span>
                        </div>
                        {targetFiles.map((tf, tfIdx) => {
                          const tfUrl = repo?.full_name ? `https://github.com/${repo.full_name}/blob/${scan?.branch || repo.default_branch || 'main'}/${tf.replace(/^\.?\//, '')}` : null;
                          return tfUrl ? (
                            <a
                              key={tfIdx}
                              href={tfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={playClick}
                              className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-slate-100/80 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white text-[10.5px] transition-colors no-underline group"
                              title={`Open ${tf} on GitHub`}
                            >
                              <span className="truncate underline underline-offset-2">{tf}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white shrink-0 opacity-70 group-hover:opacity-100" />
                            </a>
                          ) : (
                            <div key={tfIdx} className="px-2 py-1 rounded bg-slate-100/50 dark:bg-white/[0.02] text-slate-600 dark:text-slate-400 text-[10.5px] truncate">
                              {tf}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            </div>

            {scan.unsynced && scan.unsynced.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/30 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{scan.unsynced.length} ADR Status Drift Detected</span>
                </div>
                <div className="text-[11px] text-amber-900/90 dark:text-amber-200/80 leading-relaxed font-sans">
                  {scan.unsynced.map(u => (
                    <div key={u.targetId} className="flex flex-col gap-1.5 mt-1 pt-1 border-t border-amber-200 dark:border-amber-500/20 first:border-0 first:pt-0">
                      <div>
                        <strong className="font-mono text-amber-950 dark:text-amber-200">{u.targetId}</strong> is superseded by <strong className="font-mono text-amber-950 dark:text-amber-200">{u.supersedingId}</strong> in the graph, but its file status is still <code className="px-1 rounded bg-amber-200/60 dark:bg-amber-400/20 text-amber-900 dark:text-amber-300">{u.currentStatus}</code>.
                      </div>
                      <button
                        onClick={() => openSyncPullRequest(u.targetId, u.supersedingId)}
                        disabled={syncingTarget === u.targetId}
                        className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded bg-amber-400 text-slate-950 font-bold font-mono text-[11px] hover:bg-amber-300 transition-colors disabled:opacity-50 cursor-pointer self-start shadow-xs"
                      >
                        {syncingTarget === u.targetId ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> : <GitPullRequest className="w-3.5 h-3.5 shrink-0" />}
                        <span>{syncingTarget === u.targetId ? 'Opening PR...' : `Open PR: Mark ${u.targetId} Superseded`}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Decision-Aware Intent Verification Panel */}
            <div data-tour="repo-gate" className="p-3 bg-slate-50/70 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono font-bold">
                  Intent Verification Gate
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  {decisions.length} {decisions.length === 1 ? 'Decision' : 'Decisions'}
                </span>
              </div>

              {decisions.length === 0 ? (
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 py-1">
                  Initialize an ADR baseline to verify agent writes against repository constraints.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Primary Valid Decision Probe */}
                    {activeValidDecision ? (
                      <button
                        disabled={Boolean(verifyingDecisionId)}
                        onClick={() => testDecision(activeValidDecision.id)}
                        className={`${btnBase} border-slate-900 dark:border-white/20 bg-slate-900 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-40 shadow-xs cursor-pointer`}
                        title={`Click to test agent code write grounded in ${activeValidDecision.id}`}
                      >
                        {verifyingDecisionId === activeValidDecision.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" strokeWidth={2} />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                        )}
                        <span className="truncate">Verify: {activeValidDecision.id} (Valid)</span>
                      </button>
                    ) : (
                      <div className="p-1.5 rounded-lg border border-dashed border-slate-300 dark:border-white/10 text-[10px] font-mono text-slate-400 text-center">
                        No valid decision
                      </div>
                    )}

                    {/* Stale/Invalidated Decision Probe */}
                    {activeStaleDecision ? (
                      <button
                        disabled={Boolean(verifyingDecisionId)}
                        onClick={() => testDecision(activeStaleDecision.id)}
                        className={`${btnBase} border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 disabled:opacity-40 cursor-pointer`}
                        title={`Click to test gate rejection on invalidated decision ${activeStaleDecision.id}`}
                      >
                        {verifyingDecisionId === activeStaleDecision.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-rose-600 dark:text-rose-400" strokeWidth={2} />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                        )}
                        <span className="truncate">Verify: {activeStaleDecision.id} (Stale)</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className={`${btnBase} border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-white/[0.02] text-slate-400 dark:text-slate-500 cursor-not-allowed`}
                        title="Repository has no invalidated decisions. Merge a superseding ADR to test gate blocking."
                      >
                        <AlertTriangle className="w-3.5 h-3.5 opacity-40 shrink-0" strokeWidth={2} />
                        <span className="truncate">0 Stale Decisions</span>
                      </button>
                    )}
                  </div>

                  {/* Interactive Custom Tool Action Simulator Probe */}
                  <button
                    type="button"
                    onClick={() => { playClick(); setShowPlaygroundModal(true); }}
                    className="w-full mt-1.5 h-8 px-2.5 rounded-lg border border-dashed border-slate-300 dark:border-white/15 hover:border-slate-400 dark:hover:border-white/30 bg-slate-50/60 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 text-[11px] font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Open interactive custom tool execution bench (test arbitrary decision IDs, file paths, and code snippets)"
                  >
                    <Cpu className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Custom Action Simulator</span>
                  </button>

                  {staleDecisions.length === 0 && validDecisions.length > 0 && (
                    <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 leading-normal pt-0.5">
                      All decisions currently valid. Select a decision node on the canvas to inspect or probe its gate clearance.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div data-lenis-prevent className="flex-1 min-h-0 p-3 overflow-y-auto has-scrubbar space-y-2 text-xs select-text bg-white dark:bg-[#09090b]">
              {logs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-slate-400 dark:text-slate-500 text-[10px] shrink-0 mt-0.5 font-mono">{log.time}</span>
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 font-mono ${
                    log.type === 'CASCADE' ? 'bg-amber-400/20 text-amber-700 dark:text-amber-400 border border-amber-300/40 dark:border-transparent' :
                    log.type === 'GATE_APPROVE' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300/40 dark:border-transparent' :
                    log.type === 'GATE_BLOCK' ? 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-300/40 dark:border-transparent' :
                    'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-transparent'
                  }`}>{log.component}</span>
                  <span className="text-slate-800 dark:text-slate-200 text-[11px] break-words min-w-0 font-mono">{log.text}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Right: graph built from this repository's ADRs */}
          {/* Draggable Splitter Handle */}
          <div
            onMouseDown={handleSplitterMouseDown}
            className={`hidden lg:flex w-2.5 -mx-1 shrink-0 z-20 cursor-col-resize items-center justify-center transition-colors group ${
              isDraggingSplitter ? 'bg-slate-400/20 dark:bg-white/10' : 'hover:bg-slate-300/40 dark:hover:bg-white/10'
            }`}
            title="Drag to adjust ADR Panel and Graph width"
          >
            <div className={`w-1 h-10 rounded-full transition-colors ${
              isDraggingSplitter ? 'bg-slate-900 dark:bg-white' : 'bg-slate-300 dark:bg-white/20 group-hover:bg-slate-400 dark:group-hover:bg-white/40'
            }`} />
          </div>

          <div data-tour="repo-canvas" style={{ flex: '1 1 0%' }} className="h-full relative overflow-hidden bg-slate-50 dark:bg-slate-950 min-w-[320px]">
            <SubsystemErrorBoundary name="Repository Knowledge Graph Canvas">
              <GraphCanvas
                title={`Repository Decision Graph · ${repo.full_name || 'Connected Repository'}`}
                graphData={scan.graph}
                onSelectNode={setSelectedNode}
                selectedNodeId={selectedNode?.id}
                selectedNode={selectedNode}
                onCloseNode={() => setSelectedNode(null)}
                isDarkTheme={isDarkTheme}
                isDemo={false}
                repo={repo}
                branch={scan?.branch || repo.default_branch || 'main'}
                unsyncedList={scan?.unsynced || []}
                onOpenSyncPr={(node) => {
                  const driftItem = (scan?.unsynced || []).find(u => u.targetId === node.id);
                  if (driftItem) {
                    openSyncPullRequest(driftItem.targetId, driftItem.supersedingId);
                  }
                }}
                onTestDecision={testDecision}
                isVerifyingAction={Boolean(verifyingDecisionId)}
              />
            </SubsystemErrorBoundary>
          </div>
        </div>
      )}

      {/* Confirmation modal before opening starter PR on external repo (Hoisted via createPortal) */}
      {showInitConfirmModal && typeof document !== 'undefined' && createPortal(
        <div onClick={(e) => { if (e.target === e.currentTarget) { playClick(); setShowInitConfirmModal(false); } }} data-lenis-prevent className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-mono animate-in fade-in">
          <div data-lenis-prevent className="max-w-md w-full bg-white dark:bg-[#0c0d11] border border-slate-300 dark:border-white/15 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white">
              <GitPullRequest className="w-5 h-5 text-slate-900 dark:text-white shrink-0" strokeWidth={2} />
              <h3 className="font-bold text-sm">Confirm Starter Pull Request</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
              CAVDAX will create branch <code className="font-mono px-1 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200">cavdax/init-adr</code> and open a starter Pull Request on repository <strong className="font-mono text-slate-900 dark:text-white">{repo.full_name}</strong>.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
              Detected ecosystem manifests will be parsed to draft your initial Architecture Decision Record (ADR-001). Nothing is committed to <strong className="font-mono text-slate-800 dark:text-slate-200">{scan?.branch || repo.default_branch || 'main'}</strong> until you review and merge on GitHub.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => {
                  playClick();
                  setShowInitConfirmModal(false);
                }}
                className={btnSecondary}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowInitConfirmModal(false);
                  openPullRequest();
                }}
                disabled={isOpeningPr}
                className={btnPrimary}
              >
                <GitPullRequest className="w-4 h-4 shrink-0" />
                <span>Confirm & Open PR</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}


      {/* 1. Contextual 1-Click Agent Setup Modal (Hoisted via createPortal) */}
      {showAgentSetupModal && typeof document !== 'undefined' && createPortal(
        <div onClick={(e) => { if (e.target === e.currentTarget) { playClick(); setShowAgentSetupModal(false); } }} data-lenis-prevent className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div data-lenis-prevent className="max-w-3xl w-full p-6 rounded-2xl bg-white dark:bg-[#0f1015] border border-slate-200 dark:border-white/10 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-slate-900 dark:text-white shrink-0" strokeWidth={2} />
                <h3 className="font-bold text-sm text-slate-950 dark:text-white">Connect Autonomous AI Agent</h3>
              </div>
              <button
                onClick={() => { playClick(); setShowAgentSetupModal(false); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
              Equip Cursor, Claude Code, Cline, or Windsurf with real-time architectural graph constraints for <strong className="font-mono text-slate-900 dark:text-white">{repo.full_name}</strong> on branch <strong className="font-mono">{selectedBranch}</strong>.
            </p>

            {/* Platform Selector Tabs with Container-Relative Slider Tracker (Locked Y-Bounds, No Downward Shift) */}
            <div className="relative flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono">
              {agentPill.position.ready && (
                <motion.div
                  initial={false}
                  animate={{
                    x: agentPill.position.x,
                    width: agentPill.position.width,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  className="absolute top-1 bottom-1 left-0 bg-white dark:bg-white/15 rounded-lg shadow-xs border border-slate-300/60 dark:border-white/10 pointer-events-none"
                />
              )}
              {[
                { id: 'cursor', label: 'Cursor' },
                { id: 'claude', label: 'Claude Code' },
                { id: 'cline', label: 'Cline' },
                { id: 'windsurf', label: 'Windsurf' }
              ].map((tab) => {
                const isActive = agentSetupTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => { if (el) agentPill.refs.current[tab.id] = el; }}
                    type="button"
                    onClick={() => { playClick(); setAgentSetupTab(tab.id); setCopiedSnippet(false); }}
                    className={`relative flex-1 py-1.5 px-2 rounded-lg text-center transition-colors cursor-pointer font-bold z-10 ${
                      isActive
                        ? 'text-slate-950 dark:text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span>{tab.id.toUpperCase()}</span>
                  </button>
                );
              })}
            </div>

            {/* Snippet Display — Header bar with format indicator & Copy button completely eliminates text overlap */}
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
              <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800/80 bg-slate-900/90 text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-2 min-w-0">
                  {agentSetupTab === 'claude' ? (
                    <Terminal className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  ) : (
                    <Code2 className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-200 truncate">
                    {agentSetupTab === 'claude'
                      ? 'Terminal CLI Command'
                      : agentSetupTab === 'cursor'
                      ? 'Configuration File · .cursor/mcp.json'
                      : agentSetupTab === 'cline'
                      ? 'Configuration File · cline_mcp_settings.json'
                      : 'Configuration File · mcp_config.json'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    const snippet = agentSetupTab === 'claude'
                      ? `claude mcp add cavdax npx -y @cavdax/mcp-server@1.2.5 --repo ${repo.full_name} --branch ${selectedBranch} -e CAVDAX_SERVER_URL=${window.location.origin}`
                      : JSON.stringify({
                          mcpServers: {
                            cavdax: {
                              command: "npx",
                              args: ["-y", "@cavdax/mcp-server@1.2.5", "--repo", repo.full_name, "--branch", selectedBranch],
                              env: {
                                CAVDAX_SERVER_URL: window.location.origin
                              }
                            }
                          }
                        }, null, 2);
                    navigator.clipboard.writeText(snippet);
                    setCopiedSnippet(true);
                    setTimeout(() => setCopiedSnippet(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[10.5px] font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shrink-0"
                >
                  {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <pre
                tabIndex={0}
                data-lenis-prevent
                className="h-60 p-4 text-slate-100 text-[11px] font-mono overflow-x-auto overflow-y-auto has-scrubbar leading-relaxed select-text focus:outline-none focus:ring-1 focus:ring-white/20"
              >
                {agentSetupTab === 'cursor' && JSON.stringify({
                  mcpServers: {
                    cavdax: {
                      command: "npx",
                      args: ["-y", "@cavdax/mcp-server@1.2.5", "--repo", repo.full_name, "--branch", selectedBranch],
                      env: {
                        CAVDAX_SERVER_URL: typeof window !== 'undefined' ? window.location.origin : 'https://cavdax.sahnirmaan.live'
                      }
                    }
                  }
                }, null, 2)}

                {agentSetupTab === 'claude' && (
                  `claude mcp add cavdax npx -y @cavdax/mcp-server@1.2.5 --repo ${repo.full_name} --branch ${selectedBranch} -e CAVDAX_SERVER_URL=${typeof window !== 'undefined' ? window.location.origin : 'https://cavdax.sahnirmaan.live'}\n\n# Registered Tools Enclosed Behind FalkorDB GraphBLAS Gate:\n# • check_intent_clearance           Pre-flight architectural radar before token burn\n# • check_file_status                Real-time active ADR governance and boundary status\n# • apply_code_change                Enclosed diff execution rejected on superseded ADRs\n# • get_architectural_blast_radius   Transitive downstream impact graph traversal\n# • revalidate_decision              GraphBLAS cache invalidation on superseding ADR\n# • get_active_invariants            Fetch active machine-verifiable rules for repo`
                )}

                {agentSetupTab === 'cline' && JSON.stringify({
                  mcpServers: {
                    cavdax: {
                      command: "npx",
                      args: ["-y", "@cavdax/mcp-server@1.2.5", "--repo", repo.full_name, "--branch", selectedBranch],
                      env: {
                        CAVDAX_SERVER_URL: typeof window !== 'undefined' ? window.location.origin : 'https://cavdax.sahnirmaan.live'
                      }
                    }
                  }
                }, null, 2)}

                {agentSetupTab === 'windsurf' && JSON.stringify({
                  mcpServers: {
                    cavdax: {
                      command: "npx",
                      args: ["-y", "@cavdax/mcp-server@1.2.5", "--repo", repo.full_name, "--branch", selectedBranch],
                      env: {
                        CAVDAX_SERVER_URL: typeof window !== 'undefined' ? window.location.origin : 'https://cavdax.sahnirmaan.live'
                      }
                    }
                  }
                }, null, 2)}
              </pre>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 2. 1-Click CI Gate Modal (Hoisted via createPortal) */}
      {showCiGateModal && typeof document !== 'undefined' && createPortal(
        <div onClick={(e) => { if (e.target === e.currentTarget) { playClick(); setShowCiGateModal(false); setCiGatePrResult(null); } }} data-lenis-prevent className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div data-lenis-prevent className="max-w-3xl w-full p-6 rounded-2xl bg-white dark:bg-[#0f1015] border border-slate-200 dark:border-white/10 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <GitBranch className="w-5 h-5 text-slate-900 dark:text-white shrink-0" strokeWidth={2} />
                <h3 className="font-bold text-sm text-slate-950 dark:text-white">GitHub Actions CI/CD Invariant Gate</h3>
              </div>
              <button
                onClick={() => { playClick(); setShowCiGateModal(false); setCiGatePrResult(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed space-y-1">
              <p>Enforce architectural boundaries as a mandatory Status Check on Pull Requests.</p>
              <p>Blocks rogue AI agents and breaking changes before code reaches <strong className="font-mono text-slate-900 dark:text-white">{scan?.branch || repo.default_branch || 'main'}</strong>.</p>
            </div>

            {ciGatePrResult ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold font-mono">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pull Request #{ciGatePrResult.number} Opened Successfully</span>
                </div>
                <p className="text-xs text-emerald-900/90 dark:text-emerald-200/80 font-sans">
                  The workflow was committed to branch <code className="font-mono font-bold">{ciGatePrResult.branch}</code> at <code className="font-mono">{ciGatePrResult.path}</code>.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={ciGatePrResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={playClick}
                    className={`${btnPrimary} no-underline inline-flex items-center gap-1.5`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Pull Request #{ciGatePrResult.number}</span>
                  </a>
                  <button
                    onClick={() => { playClick(); setShowCiGateModal(false); setCiGatePrResult(null); }}
                    className={btnSecondary}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
                  <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800/80 bg-slate-900/90 text-[11px] font-mono text-slate-400">
                    <div className="flex items-center gap-2 min-w-0">
                      <Code2 className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span className="font-semibold text-slate-200 truncate">.github/workflows/cavdax-gate.yml</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        const yaml = `name: CAVDAX Architectural Gate\n\non:\n  pull_request:\n    branches: [ main, master, develop ]\n\njobs:\n  cavdax-gate:\n    name: Verify Architectural Invariants\n    runs-on: ubuntu-latest\n    steps:\n      - name: Checkout code\n        uses: actions/checkout@v4\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: 20\n\n      - name: Run CAVDAX Invariant Gate Check\n        run: npx -y @cavdax/mcp-server@1.2.5 gate --repo=\${{ github.repository }} --sha=\${{ github.event.pull_request.head.sha }}\n        env:\n          CAVDAX_API_KEY: \${{ secrets.CAVDAX_API_KEY }}\n          CAVDAX_SERVER_URL: ${window.location.origin}`;
                        navigator.clipboard.writeText(yaml);
                        setCopiedSnippet(true);
                        setTimeout(() => setCopiedSnippet(false), 2000);
                      }}
                      className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[10.5px] font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shrink-0"
                    >
                      {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedSnippet ? 'Copied' : 'Copy YAML'}</span>
                    </button>
                  </div>
                  <pre
                    tabIndex={0}
                    className="p-4 text-slate-100 text-[11px] font-mono overflow-x-auto overflow-y-auto has-scrubbar max-h-80 sm:max-h-96 leading-relaxed select-text focus:outline-none focus:ring-1 focus:ring-white/20"
                  >
{`name: CAVDAX Architectural Gate

on:
  pull_request:
    branches: [ main, master, develop ]

jobs:
  cavdax-gate:
    name: Verify Architectural Invariants
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run CAVDAX Invariant Gate Check
        run: npx -y @cavdax/mcp-server@1.2.5 gate --repo=\${{ github.repository }} --sha=\${{ github.event.pull_request.head.sha }}
        env:
          CAVDAX_API_KEY: \${{ secrets.CAVDAX_API_KEY }}
          CAVDAX_SERVER_URL: ${typeof window !== 'undefined' ? window.location.origin : 'https://cavdax.sahnirmaan.live'}`}
                  </pre>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <span className="text-[10px] font-mono text-slate-500 truncate min-w-0">
                    File: .github/workflows/cavdax-gate.yml
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => { playClick(); setShowCiGateModal(false); }}
                      className={btnSecondary}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateCiGatePr}
                      disabled={isOpeningCiGatePr}
                      className={btnPrimary}
                    >
                      {isOpeningCiGatePr ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Opening PR...</span>
                        </>
                      ) : (
                        <>
                          <GitPullRequest className="w-3.5 h-3.5" />
                          <span>Create Pull Request</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 3. In-Console ADR Authoring & Supersession Modal (Hoisted via createPortal) */}
      {showProposeAdrModal && typeof document !== 'undefined' && createPortal(
        <div onClick={(e) => { if (e.target === e.currentTarget) { playClick(); setShowProposeAdrModal(false); setProposeAdrResult(null); } }} data-lenis-prevent className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div data-lenis-prevent className="max-w-xl w-full p-6 rounded-2xl bg-white dark:bg-[#0f1015] border border-slate-200 dark:border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-slate-900 dark:text-white shrink-0" strokeWidth={2} />
                <h3 className="font-bold text-sm text-slate-950 dark:text-white">Propose Architecture Decision Record (ADR)</h3>
              </div>
              <button
                onClick={() => { playClick(); setShowProposeAdrModal(false); setProposeAdrResult(null); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {proposeAdrResult ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-bold font-mono">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Pull Request #{proposeAdrResult.number} Opened: {proposeAdrResult.adrId}</span>
                </div>
                <p className="text-xs text-emerald-900/90 dark:text-emerald-200/80 font-sans">
                  The drafted ADR was committed to branch <code className="font-mono font-bold">{proposeAdrResult.branch}</code> at <code className="font-mono">{proposeAdrResult.path}</code>.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={proposeAdrResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={playClick}
                    className={`${btnPrimary} no-underline inline-flex items-center gap-1.5`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Pull Request #{proposeAdrResult.number}</span>
                  </a>
                  <button
                    onClick={() => { playClick(); setShowProposeAdrModal(false); setProposeAdrResult(null); }}
                    className={btnSecondary}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProposeAdrSubmit} className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1 font-mono">
                    Decision Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={proposeForm.title}
                    onChange={(e) => setProposeForm({ ...proposeForm, title: e.target.value })}
                    placeholder="e.g. Migrate Session Store to Redis"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1 font-mono">
                      Supersedes (Optional)
                    </label>
                    <select
                      value={proposeForm.supersedes}
                      onChange={(e) => setProposeForm({ ...proposeForm, supersedes: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-sky-500 cursor-pointer"
                    >
                      <option value="">None (New Decision)</option>
                      {(scan?.adrs || []).map((adr) => (
                        <option key={adr.id} value={adr.id}>
                          {adr.id}: {adr.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1 font-mono">
                      Target Branch
                    </label>
                    <div className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 text-slate-500 text-xs font-mono">
                      {scan?.branch || repo.default_branch || 'main'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1 font-mono">
                    Context & Problem Statement
                  </label>
                  <textarea
                    rows={2}
                    value={proposeForm.context}
                    onChange={(e) => setProposeForm({ ...proposeForm, context: e.target.value })}
                    placeholder="Describe the architectural driving force or friction point..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-sans focus:outline-none focus:border-sky-500 resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1 font-mono">
                    Decision Outcome *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={proposeForm.decision}
                    onChange={(e) => setProposeForm({ ...proposeForm, decision: e.target.value })}
                    placeholder="We will adopt..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-sans focus:outline-none focus:border-sky-500 resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1 font-mono">
                    Consequences & Invariants
                  </label>
                  <textarea
                    rows={2}
                    value={proposeForm.consequences}
                    onChange={(e) => setProposeForm({ ...proposeForm, consequences: e.target.value })}
                    placeholder="Active boundaries, impacted files, or required configuration..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-xs font-sans focus:outline-none focus:border-sky-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { playClick(); setShowProposeAdrModal(false); }}
                    className={btnSecondary}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProposingAdr}
                    className={btnPrimary}
                  >
                    {isProposingAdr ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Opening PR...</span>
                      </>
                    ) : (
                      <>
                        <GitPullRequest className="w-3.5 h-3.5" />
                        <span>Create Branch & Open PR</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}



            {/* 4. Interactive Custom MCP Action Simulator Modal (Hoisted via createPortal) */}
      {showPlaygroundModal && typeof document !== 'undefined' && createPortal(
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              playClick();
              setShowPlaygroundModal(false);
            }
          }}
          data-lenis-prevent
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div data-lenis-prevent className="max-w-2xl w-full my-auto">
            <McpActionPlayground
              repo={repo}
              decisions={decisions}
              onClose={() => {
                playClick();
                setShowPlaygroundModal(false);
              }}
              onRunCustomAction={(actionData) => {
                const isClearance = Boolean(actionData.clearance_granted || actionData.gate_verdict === 'APPROVED');
                addLog(
                  'MCP-SIM',
                  `Custom Simulator executed: verdict=${actionData.gate_verdict || (isClearance ? 'APPROVED' : 'BLOCKED')} (${actionData.latency_ms || '<15'}ms)`,
                  isClearance ? 'APPROVED' : 'BLOCKED'
                );
              }}
            />
          </div>
        </div>,
        document.body
      )}



      {/* Activity log for the empty and error states */}
      {!hasAdrs && phase !== 'scanning' && logs.length > 0 && (
        <div className="flex-shrink-0 mt-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-2.5 max-h-24 overflow-y-auto space-y-1">
          {logs.slice(-4).map((log, idx) => (
            <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <Terminal className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
              <span className="font-bold uppercase text-[10px] shrink-0">{log.component}</span>
              <span className="break-words min-w-0">{log.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StateCard({ icon, title, body, actions, footnote }) {
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center p-4">
      <div className="max-w-xl w-full p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] shadow-xl text-center space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-slate-200/80 dark:bg-white/10 border border-slate-300 dark:border-white/15 flex items-center justify-center mx-auto">
          {icon}
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-950 dark:text-white mb-1.5">{title}</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-sans leading-relaxed max-w-md mx-auto">{body}</p>
        </div>
        {actions && <div className="pt-1 max-w-sm mx-auto">{actions}</div>}
        {footnote && <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">{footnote}</div>}
      </div>
    </div>
  );
}
