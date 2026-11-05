import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Github, Search, Plus, Check,
  X, RefreshCw, Lock, Globe, ExternalLink, AlertCircle, KeyRound
} from 'lucide-react';
import { playClick, playApprovalChime } from '../utils/soundFx';
import DevPatLoginModal from './DevPatLoginModal';

/**
 * ConnectRepoModal.jsx — GitHub Repository Connection Modal
 *
 * Minimalist, production-grade repository connector:
 * - Lists authenticated user's real GitHub repositories via /api/github/repos.
 * - Allows linking public repository URLs.
 * - Zero sample/demo placeholder clutter.
 * - Zero pulsing dots or unnecessary tags.
 */
export default function ConnectRepoModal({
  isOpen,
  onClose,
  user,
  onConnectRepo,
  onDisconnectRepo,
  connectedRepoIds = [],
  returnTo = '/console'
}) {
  const githubAuthUrl = `/api/auth/github?returnTo=${encodeURIComponent(`${returnTo}?connected=1&openConnectRepo=1`)}`;
  const [repos, setRepos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authExpired, setAuthExpired] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customRepoUrl, setCustomRepoUrl] = useState('');
  const [isDevPatModalOpen, setIsDevPatModalOpen] = useState(false);

  // Architectural Scroll Cue & Rail Scrubber (Enclosed MCP Terminal Parity)
  const listContainerRef = useRef(null);
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const isHoldingRef = useRef(false);
  const rafIdRef = useRef(null);
  const [isHolding, setIsHolding] = useState(false);
  const [hasScroll, setHasScroll] = useState(false);

  // Pause Lenis smooth-scroll while modal is open so native mouse wheel & trackpad scrolling is 100% responsive
  useEffect(() => {
    if (isOpen) {
      if (window.__lenis) {
        window.__lenis.stop();
      }
      return () => {
        if (window.__lenis) {
          window.__lenis.start();
        }
      };
    }
  }, [isOpen]);

  // Direct mouse wheel / trackpad scroll handler to guarantee instant scrolling without needing to hold scrubber
  const handleListWheel = (e) => {
    if (!listContainerRef.current) return;
    const el = listContainerRef.current;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) return;

    el.scrollTop += e.deltaY;
    updateScrollProgress();
    e.stopPropagation();
  };

  // Keyboard navigation listener (ArrowUp, ArrowDown, PageUp, PageDown, Home, End)
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      // If user is focused on the search input, ArrowDown or Enter transfers focus to the repository list
      if (isInput) {
        if (activeEl.getAttribute('data-search-input') === 'true' && (e.key === 'ArrowDown' || e.key === 'Enter')) {
          if (listContainerRef.current) {
            e.preventDefault();
            listContainerRef.current.focus();
          }
        }
        return;
      }

      // If outside inputs or focused on list container, arrow keys / page keys scroll the repository list
      if (!listContainerRef.current) return;
      const el = listContainerRef.current;
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) return;

      const scrollStep = 52;
      const pageStep = 208;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        el.scrollTop = Math.min(maxScroll, el.scrollTop + scrollStep);
        updateScrollProgress();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        el.scrollTop = Math.max(0, el.scrollTop - scrollStep);
        updateScrollProgress();
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        el.scrollTop = Math.min(maxScroll, el.scrollTop + pageStep);
        updateScrollProgress();
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        el.scrollTop = Math.max(0, el.scrollTop - pageStep);
        updateScrollProgress();
      } else if (e.key === 'Home') {
        e.preventDefault();
        el.scrollTop = 0;
        updateScrollProgress();
      } else if (e.key === 'End') {
        e.preventDefault();
        el.scrollTop = maxScroll;
        updateScrollProgress();
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [isOpen, onClose]);

  const updateScrollProgress = () => {
    if (!listContainerRef.current) return;
    const el = listContainerRef.current;
    const maxScroll = el.scrollHeight - el.clientHeight;
    const canScroll = maxScroll > 8;
    setHasScroll(canScroll);
    if (!canScroll) return;
    const ratio = Math.min(1, Math.max(0, el.scrollTop / maxScroll));
    if (thumbRef.current && !isHoldingRef.current) {
      thumbRef.current.style.top = `${Math.min(92, Math.max(8, ratio * 100))}%`;
    }
  };

  const handleScroll = () => {
    if (!isHoldingRef.current) {
      updateScrollProgress();
    }
  };

  const scrollToRatio = (ratio) => {
    if (!listContainerRef.current) return;
    const el = listContainerRef.current;
    const maxScroll = el.scrollHeight - el.clientHeight;
    el.scrollTop = ratio * maxScroll;
    if (thumbRef.current) {
      thumbRef.current.style.top = `${Math.min(92, Math.max(8, ratio * 100))}%`;
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
    if (!isOpen) return;

    if (user?.login) {
      setAuthExpired(false);
      fetchUserRepos();
    } else {
      setRepos([]);
      setAuthExpired(false);
    }
  }, [isOpen, user]);

  const fetchUserRepos = async () => {
    setIsLoading(true);
    setAuthExpired(false);
    try {
      const res = await fetch('/api/github/repos', { credentials: 'include' });
      if (res.status === 401) {
        setAuthExpired(true);
        setRepos([]);
        try { localStorage.removeItem('cavdax_user_session'); } catch {}
        window.dispatchEvent(new CustomEvent('cavdax:user-changed', { detail: null }));
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data && data.authenticated === false) {
          setAuthExpired(true);
          setRepos([]);
          try { localStorage.removeItem('cavdax_user_session'); } catch {}
          window.dispatchEvent(new CustomEvent('cavdax:user-changed', { detail: null }));
          return;
        }
        if (data.repos && Array.isArray(data.repos)) {
          setRepos(data.repos);
        } else {
          setRepos([]);
        }
      } else {
        setRepos([]);
      }
    } catch {
      setRepos([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRepo = (repo) => {
    playApprovalChime();
    onConnectRepo({
      id: String(repo.id),
      name: repo.name,
      full_name: repo.full_name || `${repo.owner || 'user'}/${repo.name}`,
      owner: repo.owner || (user?.login || 'user'),
      private: Boolean(repo.private),
      default_branch: repo.default_branch || 'main',
      description: repo.description || 'Connected repository workspace',
      connectedAt: Date.now(),
      hasAdrs: false
    });
    onClose();
  };

  const handleConnectCustom = (e) => {
    e.preventDefault();
    const rawInput = customRepoUrl.trim();
    if (!rawInput) return;

    playApprovalChime();

    // Robust extraction supporting:
    // - https://github.com/owner/repo
    // - http://github.com/owner/repo
    // - github.com/owner/repo
    // - www.github.com/owner/repo
    // - owner/repo
    // - trailing slashes or subpaths (e.g. /tree/main)
    let owner = '';
    let repoName = '';

    const cleanInput = rawInput.replace(/\.git$/i, '').trim();
    const githubUrlMatch = cleanInput.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/\s]+)\/([^\/\s\?#]+)/i);

    if (githubUrlMatch) {
      owner = githubUrlMatch[1];
      repoName = githubUrlMatch[2];
    } else {
      const stripped = cleanInput.replace(/^https?:\/\//i, '').replace(/^\/+|\/+$/g, '');
      const segments = stripped.split('/').filter(Boolean);
      if (segments.length >= 2) {
        owner = segments[0];
        repoName = segments[1];
      } else if (segments.length === 1) {
        owner = 'workspace';
        repoName = segments[0];
      } else {
        owner = 'custom';
        repoName = 'repo';
      }
    }

    const fullName = `${owner}/${repoName}`;

    onConnectRepo({
      id: `custom-${Date.now()}`,
      name: repoName,
      full_name: fullName,
      owner: owner,
      private: false,
      default_branch: 'main',
      description: 'Custom linked git workspace',
      connectedAt: Date.now(),
      hasAdrs: false
    });
    setCustomRepoUrl('');
    onClose();
  };

  const filteredRepos = repos.filter(r =>
    r.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      updateScrollProgress();
    }, 60);
    return () => clearTimeout(timer);
  }, [filteredRepos.length, isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <>
    <div
      data-lenis-prevent
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playClick();
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Connect GitHub Repository"
        data-lenis-prevent
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] font-mono select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950 flex items-center justify-center shrink-0">
              <Github className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                Connect GitHub Repository
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                Link a repository to generate an enclosed causal verification graph.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div data-lenis-prevent className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
          {user ? (
            <>
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  data-search-input="true"
                  placeholder="Search your repositories... (Press ↓ to navigate)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-100/60 dark:bg-white/5 text-xs text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-white/30"
                />
              </div>

              {/* Repository List */}
              <div>
                <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                  <span>Your Repositories</span>
                  {isLoading && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
                </div>

                <div className="relative">
                  <style>{`
                    /* Pure Mini Scroll Cue Only: Browser scrollbars completely suppressed */
                    .repo-cue-only-scroll {
                      scrollbar-width: none;
                      -ms-overflow-style: none;
                    }
                    .repo-cue-only-scroll::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>

                  {/* Universal Architectural Scroll Cue & Rail Scrubber (Enclosed MCP Terminal Parity) */}
                  {hasScroll && (
                    <div
                      ref={trackRef}
                      onWheel={handleListWheel}
                      onPointerDown={handlePointerDown}
                      className={`absolute right-0.5 top-1 bottom-1 w-3 z-30 transition-all duration-200 select-none cursor-pointer flex justify-center ${
                        isHolding
                          ? 'opacity-100 bg-slate-900/10 dark:bg-white/5 border border-slate-300 dark:border-white/15 rounded-full backdrop-blur-xs'
                          : 'opacity-40 hover:opacity-90 bg-transparent'
                      }`}
                      title="Hold to scrub repository list"
                      aria-label="Repository scroll cue and rail scrubber"
                    >
                      {/* Thumb / Cue Indicator:
                          - In resting state: Discrete floating scroll cue pill (w-1.5 h-5 rounded-full bg-slate-500/60 dark:bg-white/40).
                          - In holding state: Morphs smoothly into the architectural luminous draggable scrubber thumb.
                      */}
                      <div
                        ref={thumbRef}
                        className={`absolute left-1/2 -translate-x-1/2 transition-all pointer-events-none ${
                          isHolding
                            ? 'w-2 h-7 rounded-full bg-slate-950 dark:bg-white shadow-[0_0_10px_rgba(255,255,255,0.4)] ring-1 ring-slate-400 dark:ring-white/80'
                            : 'w-1.5 h-5 rounded-full bg-slate-500/60 dark:bg-white/40 shadow-xs'
                        }`}
                        style={{ top: '8%' }}
                      />
                    </div>
                  )}

                  <div
                    ref={listContainerRef}
                    data-lenis-prevent
                    tabIndex={0}
                    role="region"
                    aria-label="GitHub Repositories List"
                    onWheel={handleListWheel}
                    onScroll={handleScroll}
                    onClick={() => listContainerRef.current?.focus()}
                    className={`space-y-1.5 max-h-60 overflow-y-auto repo-cue-only-scroll focus:outline-none focus:ring-1 focus:ring-slate-300 dark:focus:ring-white/20 rounded-xl transition-all ${hasScroll ? 'pr-3.5' : 'pr-1'}`}
                  >
                    {filteredRepos.length > 0 ? (
                    filteredRepos.map((repo) => {
                      const isConnected = connectedRepoIds.includes(String(repo.id));
                      return (
                        <div
                          key={repo.id}
                          className="p-2.5 rounded-xl border border-slate-200/80 dark:border-white/15 bg-slate-50/50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20 transition-all flex items-center justify-between gap-3 group"
                        >
                          <div className="min-w-0 flex items-start gap-2.5">
                            <div className="mt-0.5 w-6 h-6 rounded-md bg-slate-200 dark:bg-white/10 flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
                              {repo.private ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-950 dark:text-white truncate block">
                                {repo.full_name}
                              </span>
                              {repo.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans truncate mt-0.5">
                                  {repo.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {isConnected ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1 bg-slate-200/60 dark:bg-white/10">
                                <Check className="w-3 h-3 text-slate-800 dark:text-slate-200" />
                                <span>Linked</span>
                              </span>
                              {onDisconnectRepo && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    playClick();
                                    onDisconnectRepo(repo.id);
                                  }}
                                  className="px-2 py-1 rounded-md text-[11px] font-mono text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/80 dark:hover:bg-white/10 border border-slate-300/80 dark:border-white/15 transition-colors cursor-pointer"
                                  title="Disconnect repository"
                                >
                                  Disconnect
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSelectRepo(repo)}
                              className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer bg-slate-950 text-white dark:bg-white dark:text-slate-950 hover:opacity-90 shadow-xs"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Connect</span>
                            </button>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-white/15 rounded-xl">
                      {authExpired ? (
                      <div className="p-4 text-center border border-amber-500/25 bg-amber-500/5 dark:bg-amber-500/10 rounded-xl space-y-2">
                        <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-mono font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Session Expired After Server Update</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                          Your backend session was reset during deployment. Reconnect GitHub to load your repositories.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <a
                            href={githubAuthUrl}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-mono font-semibold hover:opacity-90 transition-opacity"
                          >
                            <Github className="w-3 h-3" />
                            <span>Reconnect GitHub</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              playClick();
                              setIsDevPatModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-mono text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Use Token</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-white/15 rounded-xl">
                        {isLoading ? 'Loading repositories...' : 'No repositories found.'}
                      </div>
                    )}
                    </div>
                  )}
                  </div>
                </div>

                {/* Organization Access Escape Hatch Link */}
                <div className="pt-2 text-[11px] font-sans text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Missing an organization repository?</span>
                  <a
                    href="https://github.com/settings/connections/applications"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white underline decoration-slate-400/50 hover:decoration-current transition-colors inline-flex items-center gap-1"
                  >
                    <span>Review GitHub organization access</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </>
          ) : (
            /* Unauthenticated Prompt */
            <div className="p-5 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50/50 dark:bg-white/[0.02] text-center space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-400 font-sans">
                Sign in with GitHub or use a personal token to view and connect your private and public repositories.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <a
                  href={githubAuthUrl}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-mono font-semibold hover:opacity-90 transition-opacity"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>Connect with GitHub</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setIsDevPatModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Use Personal Access Token</span>
                </button>
              </div>
            </div>
          )}

          {/* Manual URL Link */}
          <form onSubmit={handleConnectCustom} className="pt-3 border-t border-slate-200 dark:border-white/15">
            <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1.5">
              Link Public Repository URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. github.com/owner/repository"
                value={customRepoUrl}
                onChange={(e) => setCustomRepoUrl(e.target.value)}
                className="flex-1 h-8 px-3 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-100/60 dark:bg-white/5 text-xs text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-white/30"
              />
              <button
                type="submit"
                disabled={!customRepoUrl.trim()}
                className="px-3 h-8 rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-mono font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer"
              >
                <span>Add</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <DevPatLoginModal
      isOpen={isDevPatModalOpen}
      onClose={() => setIsDevPatModalOpen(false)}
      onSuccess={() => {
        fetchUserRepos();
      }}
    />
  </>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
