import React, { useState, useEffect, useRef, useCallback } from 'react';
import Lenis from 'lenis';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, RotateCcw, Cable, GitBranch, ChevronDown, Plus, Check, SlidersHorizontal, Unlink, Zap, AlertTriangle, X } from 'lucide-react';
import Header from './components/Header.jsx';
import SplashLoader from './components/SplashLoader.jsx';
import CavdaxBrandLoader from './components/CavdaxBrandLoader.jsx';
import LandingPage from './components/LandingPage.jsx';
import McpCableConnectionSvg from './components/McpCableConnectionSvg.jsx';
import NotFoundPage from './components/NotFoundPage.jsx';
import StoryStepper from './components/StoryStepper.jsx';
import TerminalView from './components/TerminalView.jsx';
import GraphCanvas from './components/GraphCanvas.jsx';
import ArchitecturalRailScrubber from './components/ArchitecturalRailScrubber.jsx';
import Tooltip from './components/Tooltip.jsx';
import SubsystemErrorBoundary from './components/SubsystemErrorBoundary.jsx';
import { fetchClientIp, isIpAuthorized, isUserAuthorized, fetchGlobalWhitelistedIps, fetchGlobalDevRoster, getActiveDevSession } from './services/devAuth.js';

// Route-level code splitting for secondary tabs & modals
const ConnectMcpPage = React.lazy(() => import('./components/ConnectMcpPage.jsx'));
const ProjectVideoPage = React.lazy(() => import('./components/ProjectVideoPage.jsx'));
const TeamPage = React.lazy(() => import('./components/TeamPage.jsx'));
const AuditPage = React.lazy(() => import('./components/AuditPage.jsx'));
const DevConsolePage = React.lazy(() => import('./components/DevConsolePage.jsx'));
const DevTeamPanel = React.lazy(() => import('./components/DevTeamPanel.jsx'));
const ProfilePage = React.lazy(() => import('./components/ProfilePage.jsx'));
const SupportPage = React.lazy(() => import('./components/SupportPage.jsx'));
const ConnectedRepoWorkspace = React.lazy(() => import('./components/ConnectedRepoWorkspace.jsx'));
import PreferencesModal from './components/PreferencesModal.jsx';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal.jsx';
import McpConnectModal from './components/McpConnectModal.jsx';
import ConnectRepoModal from './components/ConnectRepoModal.jsx';
import TourGuide from './components/TourGuide.jsx';

// Intelligent Route Prefetch Registry (Option 2: Intelligent Background Prefetching)
const ROUTE_PREFETCH_LOADERS = {
  project: () => import('./components/ProjectVideoPage.jsx'),
  mcp: () => import('./components/ConnectMcpPage.jsx'),
  team: () => import('./components/TeamPage.jsx'),
  audit: () => import('./components/AuditPage.jsx'),
  support: () => import('./components/SupportPage.jsx'),
  profile: () => import('./components/ProfilePage.jsx'),
  dev: () => import('./components/DevConsolePage.jsx'),
  devteam: () => import('./components/DevTeamPanel.jsx'),
  repo: () => import('./components/ConnectedRepoWorkspace.jsx')
};

const prefetchedRoutes = new Set();

function prefetchRoute(tabKey) {
  if (!tabKey || prefetchedRoutes.has(tabKey)) return;
  const loader = ROUTE_PREFETCH_LOADERS[tabKey];
  if (loader) {
    prefetchedRoutes.add(tabKey);
    try {
      loader();
    } catch {}
  }
}

function prefetchAllRoutes() {
  const schedule = typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (cb) => window.requestIdleCallback(cb, { timeout: 4000 })
    : (cb) => setTimeout(cb, 600);

  schedule(() => {
    Object.entries(ROUTE_PREFETCH_LOADERS).forEach(([key, loader], idx) => {
      setTimeout(() => {
        if (!prefetchedRoutes.has(key)) {
          prefetchedRoutes.add(key);
          try {
            loader();
          } catch {}
        }
      }, idx * 75);
    });
  });
}

import SEOHead from './components/SEOHead.jsx';
import PageAscentTransition from './components/PageAscentTransition.jsx';
import { playClick, playRejectBuzz, playApprovalChime, initGlobalClickSound, playAlert } from './utils/soundFx.js';

// Helper function to resolve tab from clean URL path with fallback to hash
function resolveTabFromUrl() {
  if (typeof window === 'undefined') return 'landing';

  // 1. Clean Path Routing: /overview, /console, /mcp, /project, /team, /404
  const rawPath = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (rawPath === '/' || rawPath === '/overview') return 'landing';
  if (rawPath === '/console') return 'console';
  if (rawPath === '/mcp') return 'mcp';
  if (rawPath === '/project' || rawPath === '/demo' || rawPath === '/walkthrough') return 'project';
  if (rawPath === '/team') return 'team';
  if (rawPath === '/audit') return 'audit';
  if (rawPath === '/dev') return 'dev';
  if (rawPath === '/devteam') return 'devteam';
  if (rawPath === '/profile') return 'profile';
  if (rawPath === '/support' || rawPath === '/sponsor') return 'support';
  if (rawPath === '/404') return '404';

  // 2. Hash routing fallback ONLY if on root '/'
  if (rawPath === '/') {
    const h = window.location.hash.toLowerCase();
    if (h === '#console') return 'console';
    if (h === '#mcp') return 'mcp';
    if (h === '#project' || h === '#demo' || h === '#walkthrough') return 'project';
    if (h === '#team') return 'team';
    if (h === '#profile') return 'profile';
    if (h === '#support' || h === '#sponsor') return 'support';
    if (h === '#overview' || h === '' || h === '#') return 'landing';
    if (h === '#404') return '404';
  }

  // 3. Any unmapped pathname -> 404
  return '404';
}

const TAB_TO_PATH = {
  landing: '/overview',
  console: '/console',
  mcp: '/mcp',
  project: '/walkthrough',
  team: '/team',
  audit: '/audit',
  dev: '/dev',
  devteam: '/devteam',
  profile: '/profile',
  support: '/support',
  '404': '/404',
};

export default function App() {
  const [activeTab, setActiveTab] = useState(() => resolveTabFromUrl());
  const [landingTarget, setLandingTarget] = useState(() => (typeof window !== 'undefined' && window.location.pathname === '/' ? 'wordmark' : 'overview'));
  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [currentAct, setCurrentAct] = useState(1);
  const [loadingAct, setLoadingAct] = useState(null);
  const currentActRef = useRef(1);
  const loadingActRef = useRef(null);
  useEffect(() => { currentActRef.current = currentAct; }, [currentAct]);
  useEffect(() => { loadingActRef.current = loadingAct; }, [loadingAct]);
  const [isResetting, setIsResetting] = useState(false);
  const [agentState, setAgentState] = useState('idle'); // 'idle' | 'reasoning' | 'executing' | 'verified' | 'rejected'
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cavdax_theme');
      if (saved) return saved === 'dark';
    }
    return true;
  });
  const workspaceRef = useRef(null);
  const [activeWorkspace, setActiveWorkspace] = useState('demo');
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  // Dismiss workspace mode dropdown on outside click or Escape
  useEffect(() => {
    if (!isWorkspaceDropdownOpen) return;

    function handleClickOutside(e) {
      if (workspaceRef.current && !workspaceRef.current.contains(e.target)) {
        setIsWorkspaceDropdownOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsWorkspaceDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isWorkspaceDropdownOpen]);

  const [isConnectRepoModalOpen, setIsConnectRepoModalOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("openConnectRepo") === "1" || params.get("connectRepo") === "1";
  });
  const [connectedRepos, setConnectedRepos] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('cavdax_connected_repos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedConnectedRepo, setSelectedConnectedRepo] = useState(null);
  const [divergenceAlert, setDivergenceAlert] = useState(null);
  const [isSimulatingAlertGlobal, setIsSimulatingAlertGlobal] = useState(false);

  // Draggable Mid-Section Divider state for Demo Sandbox (Terminal vs GraphCanvas)
  const demoSplitContainerRef = useRef(null);
  const [demoLeftWidthPercent, setDemoLeftWidthPercent] = useState(() => {
    if (typeof window === 'undefined') return 39.6;
    try {
      const saved = localStorage.getItem('cavdax.demo.splitter.width');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 25 && val <= 65) return val;
      }
    } catch {}
    return 39.6;
  });
  const [isDraggingDemoSplitter, setIsDraggingDemoSplitter] = useState(false);
  const [isDemoLeftCollapsed, setIsDemoLeftCollapsed] = useState(false);

  const handleDemoSplitterMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDraggingDemoSplitter(true);
  }, []);

  useEffect(() => {
    if (!isDraggingDemoSplitter) return;

    const handleMouseMove = (e) => {
      if (!demoSplitContainerRef.current) return;
      const rect = demoSplitContainerRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const newPercent = Math.min(65, Math.max(25, (currentX / rect.width) * 100));
      setDemoLeftWidthPercent(newPercent);
    };

    const handleMouseUp = () => {
      setIsDraggingDemoSplitter(false);
      try {
        localStorage.setItem('cavdax.demo.splitter.width', String(demoLeftWidthPercent));
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingDemoSplitter, demoLeftWidthPercent]);

  // Intelligent Background Prefetching: Download secondary route chunks during browser idle
  useEffect(() => {
    prefetchAllRoutes();
  }, []);

  const handleTriggerSimulateAlert = async () => {
    playClick();
    setIsSimulatingAlertGlobal(true);
    try {
      const res = await fetch('/api/alerts/simulate-invalidation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        playAlert();
        if (data.alert) {
          setDivergenceAlert({ ...data.alert, recipient: data.recipient });
        }
      }
    } catch (err) {
      console.error('Failed to dispatch simulated invalidation alert:', err);
    } finally {
      setIsSimulatingAlertGlobal(false);
    }
  };

  const handleConnectRepo = (newRepo) => {
    setConnectedRepos(prev => {
      const updated = [newRepo, ...prev.filter(r => r.id !== newRepo.id)];
      try { localStorage.setItem('cavdax_connected_repos', JSON.stringify(updated)); } catch {}
      window.dispatchEvent(new CustomEvent('cavdax:repos-updated', { detail: { repos: updated } }));
      return updated;
    });
    setSelectedConnectedRepo(newRepo);
    setActiveWorkspace(newRepo.id);
  };

  const handleUpdateConnectedRepo = (updatedRepo) => {
    setConnectedRepos(prev => {
      const updated = prev.map(r => r.id === updatedRepo.id ? updatedRepo : r);
      try { localStorage.setItem('cavdax_connected_repos', JSON.stringify(updated)); } catch {}
      window.dispatchEvent(new CustomEvent('cavdax:repos-updated', { detail: { repos: updated } }));
      return updated;
    });
    setSelectedConnectedRepo(updatedRepo);
  };

  const handleDisconnectRepo = (repoId) => {
    setConnectedRepos(prev => {
      const updated = prev.filter(r => String(r.id) !== String(repoId));
      try { localStorage.setItem('cavdax_connected_repos', JSON.stringify(updated)); } catch {}
      window.dispatchEvent(new CustomEvent('cavdax:repos-updated', { detail: { repos: updated } }));
      return updated;
    });
    if (activeWorkspace === repoId || selectedConnectedRepo?.id === repoId) {
      setActiveWorkspace("demo");
      setSelectedConnectedRepo(null);
    }
  };

  // Theme class toggle on <html> element
  useEffect(() => {
    initGlobalClickSound();

    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (r) => {
        try { return await r.json(); } catch { return { authenticated: false }; }
      })
      .then((d) => {
        if (d?.authenticated && d?.user) {
          setGithubUser(d.user);
          if (d.user.tier) setActiveTierKey(d.user.tier);
        } else if (d && !d.authenticated) {
          try { localStorage.removeItem('cavdax_user_session'); } catch {}
          setGithubUser(false);
        }
      })
      .catch(() => {});

    const handleTierChange = (e) => {
      if (e.detail?.tier) setActiveTierKey(e.detail.tier);
    };
    window.addEventListener('cavdax:tier-changed', handleTierChange);
    const handleHackathonChange = (e) => {
      setActiveTierKey(e.detail?.enabled ? 'enterprise' : (localStorage.getItem('cavdax_tier') || 'free'));
    };
    window.addEventListener('cavdax:hackathon-mode-changed', handleHackathonChange);
    return () => {
      window.removeEventListener('cavdax:tier-changed', handleTierChange);
      window.removeEventListener('cavdax:hackathon-mode-changed', handleHackathonChange);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkTheme) {
      root.classList.add('dark');
      try { localStorage.setItem('cavdax_theme', 'dark'); } catch {}
    } else {
      root.classList.remove('dark');
      try { localStorage.setItem('cavdax_theme', 'light'); } catch {}
    }
  }, [isDarkTheme]);

    // Tab switch handler — uses HTML5 history.pushState for clean paths (/overview, /console, /mcp, etc.)
  const handleSelectTab = (tab, options = {}) => {
    const prevTab = activeTab;
    if (tab === 'landing') {
      const target = options.target || (window.location.pathname === '/' ? 'wordmark' : 'overview');
      setLandingTarget(target);
      if (target === 'overview' && prevTab !== 'landing' && typeof window !== 'undefined') {
        const estimatedHeroY = Math.round(window.innerHeight * 1.05);
        window.scrollTo({ top: estimatedHeroY, left: 0, behavior: 'instant' });
      }
    }
    setActiveTab(tab);

    const scrollToDestination = () => {
      if (typeof window === 'undefined') return;

      if (tab === 'landing') {
        if (options.target === 'wordmark') {
          // Bring user directly to Wordmark Page (absolute top)
          if (prevTab !== 'landing') {
            if (window.__lenis) {
              window.__lenis.scrollTo(0, { immediate: true });
            }
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          } else {
            if (window.__lenis) {
              window.__lenis.scrollTo(0, { duration: 0.82, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
            } else {
              window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
            }
          }
        } else {
          // Bring user directly to Overview Page (#hero-section)
          const isSameTab = prevTab === "landing";
          const alignOverview = () => {
            const hero = document.getElementById("hero-section");
            if (!hero) return false;
            if (window.__lenis) {
              window.__lenis.resize();
              window.__lenis.scrollTo(hero.offsetTop, { immediate: !isSameTab, duration: isSameTab ? 0.82 : undefined, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
            } else {
              hero.scrollIntoView({ behavior: isSameTab ? "smooth" : "instant" });
            }
            return true;
          };

          if (!alignOverview()) {
            setTimeout(alignOverview, 50);
            setTimeout(alignOverview, 150);
          }
        }
      } else {
        // Any other tab (/console, /mcp, /project, /team): scroll to top
        if (window.__lenis) {
          try {
            window.__lenis.resize();
            window.__lenis.scrollTo(0, { immediate: true });
          } catch {}
        }
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    };

    if (prevTab === tab) {
      scrollToDestination();
    } else {
      setTimeout(scrollToDestination, 40);
    }

    try {
      localStorage.setItem('cavdax_tab', tab);
      if (typeof window !== 'undefined') {
        const targetPath = tab === 'landing'
          ? (options.target === 'wordmark' ? '/' : '/overview')
          : (TAB_TO_PATH[tab] || '/overview');
        if (window.location.pathname !== targetPath) {
          window.history.pushState({ tab }, '', targetPath);
        }
      }
      if (tab === 'console') {
        const pending = sessionStorage.getItem('cavdax.tour.pending');
        if (pending) {
          sessionStorage.removeItem('cavdax.tour.pending');
          setTimeout(() => setIsTourOpen(true), 600);
        }
      }
    } catch {}
  };
  const handleOpenTour = (targetMode) => {
    const mode = targetMode || activeTab;
    if (['console', 'dev', 'mcp', 'audit', 'profile'].includes(mode)) {
      if (mode !== activeTab && mode !== 'dev') {
        handleSelectTab(mode);
        setTimeout(() => setIsTourOpen(true), 200);
      } else {
        setIsTourOpen(true);
      }
    } else {
      handleSelectTab('console');
      setTimeout(() => setIsTourOpen(true), 200);
    }
  };

  useEffect(() => {
    const handleGlobalOpenTour = (e) => {
      const mode = e.detail?.mode || activeTab;
      handleOpenTour(mode);
    };
    window.addEventListener('cavdax:open-tour', handleGlobalOpenTour);
    return () => window.removeEventListener('cavdax:open-tour', handleGlobalOpenTour);
  }, [activeTab]);


  // Synchronize browser history (popstate / back-forward navigation) and normalize legacy hashes
  useEffect(() => {
    const handlePopState = () => {
      const tab = resolveTabFromUrl();
      if (tab === 'landing') {
        setLandingTarget(window.location.pathname === '/' ? 'wordmark' : 'overview');
      }
      setActiveTab(tab);
    };

    // If initial URL had a hash like /#console or /#team, cleanly normalize to /console or /team
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      const hashToPath = {
        '#console': '/console',
        '#mcp': '/mcp',
        '#project': '/walkthrough',
        '#demo': '/walkthrough',
        '#walkthrough': '/walkthrough',
        '#team': '/team',
        '#overview': '/overview',
        '#404': '/404'
      };
      if (hashToPath[hash]) {
        window.history.replaceState({ tab: resolveTabFromUrl() }, '', hashToPath[hash]);
      }
    }

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Initialize Lenis smooth scroll with Programmatic Navigation Guard
  useEffect(() => {
    let lenis = null;
    let rafId = null;
    let isMounted = true;
    let handleVisibilityChange = null;
    let handleUserGesture = null;
    let origWindowScrollTo = null;

    try {
      lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
      });
      window.__lenis = lenis;

      // Wrap scrollTo to flag programmatic section navigation (prevents mid-flight scroll hijacking)
      const originalScrollTo = lenis.scrollTo.bind(lenis);
      lenis.scrollTo = (target, options = {}) => {
        const isCausalDock = target === '#causal-loop-section' ||
                             target === '#enclave-hub-section' ||
                             (typeof target === 'object' && (target?.id === 'causal-loop-section' || target?.id === 'enclave-hub-section')) ||
                             Boolean(options?.isInternalDock);
        if (!isCausalDock && !options.immediate) {
          window.__isProgrammaticScroll = true;
          const dur = ((options.duration !== undefined ? options.duration : 1.2) * 1000) + 300;
          clearTimeout(window.__progScrollTimer);
          window.__progScrollTimer = setTimeout(() => {
            window.__isProgrammaticScroll = false;
          }, dur);

          const origComplete = options.onComplete;
          options.onComplete = (lenisInstance) => {
            window.__isProgrammaticScroll = false;
            if (origComplete) origComplete(lenisInstance);
          };
        }
        return originalScrollTo(target, options);
      };

      // Wrap native window.scrollTo for smooth programmatic calls (e.g. Scroll to Top)
      origWindowScrollTo = window.scrollTo.bind(window);
      window.scrollTo = (firstArg, ...rest) => {
        if (typeof firstArg === 'object' && firstArg?.behavior === 'smooth') {
          window.__isProgrammaticScroll = true;
          clearTimeout(window.__progScrollTimer);
          window.__progScrollTimer = setTimeout(() => {
            window.__isProgrammaticScroll = false;
          }, 1400);
        }
        return origWindowScrollTo(firstArg, ...rest);
      };

      // User physical manual scroll immediately clears programmatic navigation flag
      handleUserGesture = () => {
        window.__isProgrammaticScroll = false;
        clearTimeout(window.__progScrollTimer);
      };
      window.addEventListener('wheel', handleUserGesture, { passive: true });
      window.addEventListener('touchstart', handleUserGesture, { passive: true });
      window.addEventListener('touchmove', handleUserGesture, { passive: true });

      function raf(time) {
        if (!isMounted) return;
        if (!document.hidden && document.documentElement.scrollHeight > window.innerHeight + 10) {
          lenis.raf(time);
        }
        rafId = requestAnimationFrame(raf);
      }
      rafId = requestAnimationFrame(raf);

      handleVisibilityChange = () => {
        if (document.hidden) {
          if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
        } else if (isMounted && !rafId) {
          rafId = requestAnimationFrame(raf);
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
    } catch (err) {
      console.warn('[Lenis] Init error:', err);
    }

    return () => {
      isMounted = false;
      if (handleVisibilityChange) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (handleUserGesture) {
        window.removeEventListener('wheel', handleUserGesture);
        window.removeEventListener('touchstart', handleUserGesture);
        window.removeEventListener('touchmove', handleUserGesture);
      }
      if (origWindowScrollTo) {
        window.scrollTo = origWindowScrollTo;
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (lenis) {
        lenis.destroy();
        window.__lenis = null;
      }
    };
  }, []);

  // Universal HUD Keyboard Shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      // Guard: skip if focus is in any input/textarea/contenteditable
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // 1. Shortcuts Help Modal: '?' or 'Shift + /'
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        playClick();
        setIsShortcutsOpen(prev => !prev);
        return;
      }

      // 2. Escape: close any active modal
      if (e.key === 'Escape') {
        setIsShortcutsOpen(false);
        setIsPreferencesOpen(false);
        setIsMcpModalOpen(false);
        setIsTourOpen(false);
        return;
      }

      // 3. Navigation shortcuts: 1..5, W
      if (e.key === '1') {
        e.preventDefault();
        playClick();
        handleSelectTab('landing', { target: 'overview' });
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        playClick();
        handleSelectTab('console');
        return;
      }
      if (e.key === '3') {
        e.preventDefault();
        playClick();
        handleSelectTab('mcp');
        return;
      }
      if (e.key === '4') {
        e.preventDefault();
        playClick();
        handleSelectTab('project');
        return;
      }
      if (e.key === '5') {
        e.preventDefault();
        playClick();
        handleSelectTab('team');
        return;
      }
      if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        playClick();
        handleSelectTab('landing', { target: 'wordmark' });
        return;
      }

      // 4. Quick Actions: D (Theme), , (Preferences)
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        playClick();
        setIsDarkTheme(prev => !prev);
        return;
      }
      if (e.key === ',') {
        e.preventDefault();
        playClick();
        setIsPreferencesOpen(prev => !prev);
        return;
      }

      // 5. Contextual Tour Guide shortcut: T (Active ONLY on views that support a tour guide)
      if (e.key === 't' || e.key === 'T') {
        const tourSupportedTabs = ['console', 'dev', 'mcp', 'audit', 'profile'];
        if (!tourSupportedTabs.includes(activeTab)) {
          // On Overview, Walkthrough, Team, Support, etc.: Do NOT route-hijack
          return;
        }
        e.preventDefault();
        playClick();
        setIsTourOpen(prev => !prev);
        return;
      }

      // 6. Console Reset shortcut: R
      if (activeTab === 'console' && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        playClick();
        if (window.__cavdaxResetFn) window.__cavdaxResetFn();
        return;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeTab]);

  // SSE online status — shown in Header as "SSE Offline • Local Simulation Active"
  const [sseOnline, setSseOnline] = useState(false);

  // Graph state
  const [graphData, setGraphData] = useState({
    nodes: [
      { id: 'ADR-001', label: 'Source', title: 'Adopt TokenAuth v1 for Payment Gateway', status: 'ACTIVE', type: 'ADR' },
      { id: 'F-Auth-v1', label: 'Fact', claim: 'Payment services require TokenAuth v1', is_stale: false, verified: true },
      { id: 'DEC-102', label: 'Decision', title: 'Generate Checkout Service with TokenAuth v1', status: 'VALID' },
      { id: 'ADR-002', label: 'Source', title: 'Mandatory Migration to OAuth2; TokenAuth v1 Decommissioned', status: 'ACTIVE', type: 'ADR' },
      { id: 'F-OAuth2', label: 'Fact', claim: 'OAuth2 is strictly enforced; TokenAuth v1 prohibited', is_stale: false, verified: true }
    ],
    edges: [
      { source: 'F-Auth-v1', target: 'ADR-001', type: 'EXTRACTED_FROM' },
      { source: 'DEC-102', target: 'F-Auth-v1', type: 'DEPENDS_ON' },
      { source: 'F-OAuth2', target: 'ADR-002', type: 'EXTRACTED_FROM' }
    ]
  });

  const [selectedNode, setSelectedNode] = useState(null);
  const [activeVerdict, setActiveVerdict] = useState(null);
  const [latestLatency, setLatestLatency] = useState('1.84');
  const [falkorLive, setFalkorLive] = useState(false);
  const [activeTierKey, setActiveTierKey] = useState(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('cavdax_hackathon_mode') === 'true') {
        return localStorage.getItem('cavdax_tier') || 'enterprise';
      }
      return localStorage.getItem('cavdax_tier') || 'free';
    }
    return 'free';
  });
  const [githubUser, setGithubUser] = useState(() => {
    try {
      const raw = localStorage.getItem('cavdax_user_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.username || parsed?.login) {
          return {
            login: parsed.username || parsed.login,
            name: parsed.name || parsed.username || parsed.login,
            avatarUrl: parsed.avatarUrl || parsed.avatar_url || parsed.avatar || '',
            role: parsed.role || 'user'
          };
        }
      }
    } catch {}
    return null;
  });

  // Sync auth state with session cookie & listen to custom user-change events
  useEffect(() => {
    const handleUserChanged = (e) => {
      setGithubUser(e.detail || false);
    };
    window.addEventListener('cavdax:user-changed', handleUserChanged);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("connected") === "1" && params.get("login")) {
        const u = {
          login: params.get("login"),
          name: params.get("name") || params.get("login"),
          avatarUrl: params.get("avatar") || "",
          role: "user"
        };
        setGithubUser(u);
        try {
          localStorage.setItem("cavdax_user_session", JSON.stringify({
            username: u.login,
            name: u.name,
            avatarUrl: u.avatarUrl,
            connectedAt: new Date().toISOString()
          }));
        } catch {}
        if (params.get("openConnectRepo") === "1") {
          setIsConnectRepoModalOpen(true);
        }
        window.history.replaceState({}, "", window.location.pathname);
      }
    }

    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (r) => {
        try { return await r.json(); } catch { return { authenticated: false }; }
      })
      .then(d => {
        if (d?.authenticated && d?.user) {
          const u = {
            login: d.user.login,
            name: d.user.name || d.user.login,
            avatarUrl: d.user.avatarUrl || d.user.avatar_url || '',
            role: 'user'
          };
          setGithubUser(u);
          try {
            localStorage.setItem('cavdax_user_session', JSON.stringify({
              username: u.login,
              name: u.name,
              avatarUrl: u.avatarUrl,
              connectedAt: new Date().toISOString()
            }));
          } catch {}
        } else if (d && !d.authenticated) {
          try { localStorage.removeItem('cavdax_user_session'); } catch {}
          setGithubUser(false);
        }
      })
      .catch(() => {
        const raw = localStorage.getItem('cavdax_user_session');
        if (!raw) setGithubUser(false);
      });

    return () => {
      window.removeEventListener('cavdax:user-changed', handleUserChanged);
    };
  }, []);
  const [isDevAuthorized, setIsDevAuthorized] = useState(() => {
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      return isLocal;
    }
    return false;
  });
  const [devAuthEvaluating, setDevAuthEvaluating] = useState(true);

  // Evaluate dev access gate (/devteam) with Multi-Factor Pre-Challenge Cloaking
  useEffect(() => {
    // Only query protected enclave access endpoints when navigating to the dev enclave route
    if (activeTab !== 'devteam') {
      setDevAuthEvaluating(false);
      return;
    }

    let isMounted = true;
    async function checkDevAccess() {
      setDevAuthEvaluating(true);
      try {
        await Promise.all([fetchGlobalWhitelistedIps(), fetchGlobalDevRoster()]);
        const ip = await fetchClientIp();
        const ipOk = isIpAuthorized(ip);
        const userOk = isUserAuthorized(githubUser);
        const sessionOk = Boolean(getActiveDevSession());

        // Clearance requires: Authorized Team GitHub Handle OR Whitelisted Client IP OR Active Vault Session
        const clearance = userOk || ipOk || sessionOk;

        if (isMounted) {
          setIsDevAuthorized(clearance);
          setDevAuthEvaluating(false);
        }
      } catch {
        if (isMounted) {
          setIsDevAuthorized(false);
          setDevAuthEvaluating(false);
        }
      }
    }
    checkDevAccess();

    // Re-evaluate clearance from cached state without initiating recursive server fetches
    const handleSyncUpdate = () => {
      const isLocal = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '[::1]');
      const fallbackIp = isLocal ? '127.0.0.1' : 'unknown';
      const ip = (typeof window !== 'undefined' && sessionStorage.getItem('cavdax_detected_client_ip')) || fallbackIp;
      const ipOk = isIpAuthorized(ip);
      const userOk = isUserAuthorized(githubUser);
      const sessionOk = Boolean(getActiveDevSession());
      setIsDevAuthorized(userOk || ipOk || sessionOk);
    };

    window.addEventListener('cavdax:dev-roster-updated', handleSyncUpdate);
    window.addEventListener('cavdax:dev-ips-updated', handleSyncUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('cavdax:dev-roster-updated', handleSyncUpdate);
      window.removeEventListener('cavdax:dev-ips-updated', handleSyncUpdate);
    };
  }, [githubUser?.login]);

  // Terminal & Action state
  const [terminalLogs, setTerminalLogs] = useState([
    {
      component: 'KERNEL',
      time: '15:30:00',
      type: 'INFO',
      text: 'CAVDAX Causal Graph Kernel initialized. GraphBLAS Sparse Matrix ready.'
    },
    {
      component: 'INGESTION',
      time: '15:30:01',
      type: 'INFO',
      text: 'Loaded baseline ADR-001: TokenAuth v1 accepted for payment gateway.'
    },
    {
      component: 'MCP_SERVER',
      time: '15:30:02',
      type: 'INFO',
      text: 'Enclosed tool `apply_code_change` registered. Grounded verification active.'
    }
  ]);

  const [latestAction, setLatestAction] = useState({
    filePath: 'demo-repo/src/services/payment.js',
    decisionId: 'DEC-102',
    codeSnippet: `// Agent attempting to scaffold checkout route with deprecated TokenAuth v1:\napp.post('/api/checkout', (req, res) => {\n  const token = req.headers['x-tokenauth-v1'];\n  if (!TokenAuth.v1.verify(token)) return res.status(401).send();\n  // Process checkout...\n});`
  });

  // Fetch initial graph, health & check first-visit tour auto-start
  useEffect(() => {
    async function loadInitial() {
      try {
        const healthRes = await fetch('/api/health');
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          setFalkorLive(healthData.falkordb_connected);
          if (healthData.tier) {
            const hasDevOverride = typeof window !== 'undefined' && localStorage.getItem('cavdax_dev_tier_override') === 'true';
            const isHackathon = typeof window !== 'undefined' && localStorage.getItem('cavdax_hackathon_mode') === 'true';
            if (isHackathon) {
              setActiveTierKey('enterprise');
            } else if (hasDevOverride) {
              const savedTier = localStorage.getItem('cavdax_tier');
              if (savedTier) setActiveTierKey(savedTier);
            } else {
              setActiveTierKey(healthData.tier);
            }
          }
        }

        const graphRes = await fetch('/api/graph');
        if (graphRes.ok) {
          const g = await graphRes.json();
          if (g && g.nodes && g.nodes.length > 0) {
            setGraphData(g);
            // Sync currentAct with whatever state the server graph is actually in,
            // so the act indicator never lies after a reload.
            const hasD103 = g.nodes.some(n => n.id === 'DEC-103');
            const hasSupersedesEdge = g.edges && g.edges.some(e => e.type === 'SUPERSEDES');
            const hasDec102Archived = g.nodes.some(n => n.id === 'DEC-102' && (n.status === 'REPLACED_ARCHIVED' || n.status === 'ARCHIVED'));
            const hasBlockedAction = g.nodes.some(n => n.label === 'AgentAction' && n.status && n.status.includes('BLOCKED'));
            if (hasD103 || hasDec102Archived) {
              setCurrentAct(4);
            } else if (hasBlockedAction) {
              setCurrentAct(3);
            } else if (hasSupersedesEdge) {
              setCurrentAct(2);
            }
            // else: stays at 1 (default)
          }
        }
      } catch (err) {
        console.warn('Initial load fallback:', err.message);
      }
    }
    loadInitial();

    // Check first-time tour trigger — only ever fires when user navigates to console
    // Tour is strictly reserved for the operational console (§1.6)
    try {
      const tourDone = localStorage.getItem('cavdax.tour.completed');
      if (!tourDone) {
        // We store intent; the actual open is triggered by Tab switch to console (see handleSelectTab)
        sessionStorage.setItem('cavdax.tour.pending', 'true');
      }
    } catch {}

    // Setup SSE listener with exponential backoff reconnect (roadmap §6.2)
    // Retry delays: 1s → 2s → 4s → 8s → 16s → 30s ceiling with ±20% jitter.
    // Never show raw EventSource errors — just toggle the sseOnline flag.
    let evtSource = null;
    let retryDelay = 1000;
    let retryTimeout = null;
    let destroyed = false;

    function connectSse() {
      if (destroyed) return;
      try {
        evtSource = new EventSource('/api/events');

        evtSource.addEventListener('GRAPH_UPDATED', (e) => {
          try {
            const updated = JSON.parse(e.data);
            if (updated && updated.data) {
              // Multi-user conflict protection: only accept remote graph resets if current session is idle at Act 1
              if (currentActRef.current === 1 && loadingActRef.current === null) {
                setGraphData(updated.data);
              }
            }
          } catch {}
        });

        evtSource.addEventListener('DEV_ROSTER_UPDATED', (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (Array.isArray(payload?.roster)) {
              localStorage.setItem('cavdax_authorized_dev_roster', JSON.stringify(payload.roster));
              window.dispatchEvent(new CustomEvent('cavdax:dev-roster-updated', { detail: { roster: payload.roster } }));
            }
          } catch {}
        });

        evtSource.addEventListener('DEV_IPS_UPDATED', (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (Array.isArray(payload?.ips)) {
              localStorage.setItem('cavdax_authorized_dev_ips', JSON.stringify(payload.ips));
              window.dispatchEvent(new CustomEvent('cavdax:dev-ips-updated', { detail: { ips: payload.ips } }));
            }
          } catch {}
        });

        evtSource.addEventListener('HACKATHON_MODE_CHANGED', (e) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload && typeof payload.enabled === 'boolean') {
              localStorage.setItem('cavdax_hackathon_mode', String(payload.enabled));
              window.dispatchEvent(new CustomEvent('cavdax:hackathon-mode-changed', { detail: { enabled: payload.enabled } }));
            }
          } catch {}
        });

        evtSource.addEventListener('GLOBAL_KEYS_REVOKED', (e) => {
          try {
            const payload = JSON.parse(e.data);
            window.dispatchEvent(new CustomEvent('cavdax:keys-revoked', { detail: payload }));
          } catch {}
        });

        evtSource.onopen = () => {
          setSseOnline(true);
          retryDelay = 1000; // reset backoff on successful open
        };

        evtSource.onerror = () => {
          setSseOnline(false);
          try { evtSource.close(); } catch {}
          evtSource = null;
          if (!destroyed) {
            const jitter = 1 + (Math.random() * 0.4 - 0.2); // ±20%
            const delay = Math.min(retryDelay * jitter, 30000);
            retryTimeout = setTimeout(connectSse, delay);
            retryDelay = Math.min(retryDelay * 2, 30000);
          }
        };
      } catch {
        setSseOnline(false);
      }
    }

    connectSse();

    return () => {
      destroyed = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (evtSource) { try { evtSource.close(); } catch {} }
    };
  }, []);

  // -------------------------------------------------------------------------
  // ACT CONTROLLERS
  // -------------------------------------------------------------------------

  // Client-side simulation fallback — roadmap §6.2
  // When backend is offline/502, mutate in-memory state transparently with explicit offline labeling.
  function _simulateAct2() {
    setGraphData(prev => {
      const nodes = prev.nodes.map(n => {
        if (n.id === 'ADR-001') return { ...n, status: 'SUPERSEDED' };
        if (n.id === 'F-Auth-v1') return { ...n, is_stale: true };
        if (n.id === 'DEC-102') return { ...n, status: 'INVALIDATED_NEEDS_REVALIDATION' };
        return n;
      });
      const edges = [...prev.edges, { source: 'ADR-002', target: 'ADR-001', type: 'SUPERSEDES' }];
      return { nodes, edges };
    });
    return { simulated: true };
  }

  function _simulateAct3Block() {
    const actionId = `act-${Date.now()}`;
    setGraphData(prev => ({
      nodes: [...prev.nodes, { id: actionId, label: 'AgentAction', target_file: 'demo-repo/src/services/payment.js', status: 'BLOCKED_SUPERSEDED_SOURCE', timestamp: Date.now() }],
      edges: [...prev.edges, { source: actionId, target: 'DEC-102', type: 'GROUNDED_IN' }]
    }));
    return {
      gate_verdict: 'BLOCKED_SUPERSEDED_SOURCE',
      simulated: true,
      violation_paths: [['Source:ADR-001 (SUPERSEDED)', 'Fact:F-Auth-v1 (STALE)', 'Decision:DEC-102']]
    };
  }

  function _simulateAct4Approve(oauthCode) {
    setGraphData(prev => {
      const nodes = prev.nodes.map(n => n.id === 'DEC-102' ? { ...n, status: 'REPLACED_ARCHIVED' } : n);
      // Idempotency: only add DEC-103 and the EXECUTED action node if not already present
      const hasD103 = nodes.some(n => n.id === 'DEC-103');
      const hasExecutedAction = nodes.some(n => n.label === 'AgentAction' && n.status === 'EXECUTED' && n.target_file === 'demo-repo/src/services/payment.js');
      const newNodes = hasD103
        ? (hasExecutedAction ? nodes : [...nodes, { id: `act-${Date.now()}`, label: 'AgentAction', target_file: 'demo-repo/src/services/payment.js', status: 'EXECUTED', timestamp: Date.now() }])
        : [...nodes,
            { id: 'DEC-103', label: 'Decision', title: 'Scaffold Payment Gateway with OAuth2 (JWT/RS256)', status: 'VALID' },
            ...(hasExecutedAction ? [] : [{ id: `act-${Date.now()}`, label: 'AgentAction', target_file: 'demo-repo/src/services/payment.js', status: 'EXECUTED', timestamp: Date.now() }])
          ];
      const hasD103Edge = prev.edges.some(e => e.source === 'DEC-103' && e.target === 'F-OAuth2' && e.type === 'DEPENDS_ON');
      const newEdges = hasD103Edge ? prev.edges : [...prev.edges,
        { source: 'DEC-103', target: 'F-OAuth2', type: 'DEPENDS_ON' },
        { source: 'DEC-103', target: 'DEC-102', type: 'REPLACES' }
      ];
      return { nodes: newNodes, edges: newEdges };
    });
    return { gate_verdict: 'APPROVED', simulated: true };
  }

  // Core act executor — contains the actual API calls and state mutations for
  // each act. Extracted so the skip-guard in handleSelectAct can silently
  // pre-run missing prerequisite acts without duplicating code.
  // On 502/network failure, falls back to client-side simulation (roadmap §6.2).
  async function _runAct(actNumber) {
    if (actNumber === 1) {
      setAgentState('idle');
      await handleReset();
    } else if (actNumber === 2) {
      // ACT II: Ingest Commit Mutation — ADR-002 supersedes ADR-001
      setAgentState('reasoning');
      addLog('INGESTION', 'Ingesting git commit containing ADR-002 (supersedes ADR-001)...', 'CASCADE');
      let lat = null;
      let isSimulated = false;
      try {
        const res = await fetch('/api/ingest', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.graph) setGraphData(data.graph);
        if (data.simulated) isSimulated = true;
        lat = data.ingestResult?.invalidation?.latency_ms ?? null;
      } catch {
        // Backend offline — simulate in-browser (roadmap §6.2)
        _simulateAct2();
        isSimulated = true;
        addLog('SYSTEM', 'Notice: Backend server offline — running in-memory demo simulation. FalkorDB was not queried.', 'INFO');
      }
      setLatestLatency(lat);

      if (isSimulated) {
        addLog(
          'SIMULATION',
          'In-memory cascade simulated: ADR-001 -> SUPERSEDED, F-Auth-v1 -> STALE, DEC-102 -> INVALIDATED. [SIMULATION FALLBACK]',
          'CASCADE'
        );
      } else {
        addLog(
          'FALKORDB',
          `Query 2 Cascade completed in ${lat ?? '<1'}ms. SUPERSEDES edge established. ADR-001 -> SUPERSEDED, F-Auth-v1 -> STALE, DEC-102 -> INVALIDATED_NEEDS_REVALIDATION.`,
          'CASCADE'
        );
      }
      setActiveVerdict('BLOCKED');
      setAgentState('idle');
    } else if (actNumber === 3) {
      // ACT III: Agent Enclosed MCP Gate Execution Call — blocked on stale DEC-102
      setAgentState('executing');
      addLog('AGENT', 'Autonomous Coding Agent requests tool execution: `apply_code_change` with DEC-102...', 'INFO');
      setLatestAction({
        filePath: 'demo-repo/src/services/payment.js',
        decisionId: 'DEC-102',
        codeSnippet: `// AGENT PROPOSED MUTATION (STALE PROVENANCE):\napp.post('/api/checkout', (req, res) => {\n  const token = req.headers['x-tokenauth-v1'];\n  if (!TokenAuth.v1.verify(token)) return res.status(401).send();\n  res.json({ status: 'paid' });\n});`
      });

      let data;
      let isSimulated = false;
      try {
        const res = await fetch('/api/mcp/call', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolName: 'apply_code_change', args: { decision_id: 'DEC-102', file_path: 'demo-repo/src/services/payment.js', code_payload: '// TokenAuth v1 code' } })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
        if (data.simulated) isSimulated = true;
      } catch {
        data = _simulateAct3Block();
        isSimulated = true;
        addLog('SYSTEM', 'Notice: Backend offline — gate block simulated in-browser. Zero server queries executed.', 'INFO');
      }

      setLatestLatency(data.latency_ms || null);
      setActiveVerdict('BLOCKED');
      setAgentState('rejected');
      playRejectBuzz();
      if (isSimulated) {
        addLog('MCP_GATE', `ENCLOSED MCP GATE BLOCKED [SIMULATION FALLBACK]. Verdict: ${data.gate_verdict}. Write rejected. Zero files modified.`, 'GATE_BLOCK', data.violation_paths);
      } else {
        addLog('MCP_GATE', `ENCLOSED MCP GATE BLOCKED in ${data.latency_ms}ms! Verdict: ${data.gate_verdict}. Write rejected. Zero files modified.`, 'GATE_BLOCK', data.violation_paths);
      }

    } else if (actNumber === 4) {
      // ACT IV: Revalidation & Safe Execution — DEC-103 synthesized, OAuth2 written
      setAgentState('reasoning');
      addLog('AGENT', 'Act IV: Agent synthesizes Decision DEC-103 grounded in fresh Source ADR-002...', 'REVALIDATION');

      let isRevalSimulated = false;
      try {
        const revalRes = await fetch('/api/act-iv-revalidate', { method: 'POST', credentials: 'include' });
        if (!revalRes.ok) throw new Error(`HTTP ${revalRes.status}`);
        const revalData = await revalRes.json();
        if (revalData.graph) setGraphData(revalData.graph);
        if (revalData.simulated) isRevalSimulated = true;
      } catch {
        // Simulate revalidation in-browser
        isRevalSimulated = true;
        setGraphData(prev => {
          const nodes = prev.nodes.map(n => n.id === 'DEC-102' ? { ...n, status: 'REPLACED_ARCHIVED' } : n);
          const hasD103 = nodes.some(n => n.id === 'DEC-103');
          const hasD103Edge = prev.edges.some(e => e.source === 'DEC-103' && e.target === 'F-OAuth2' && e.type === 'DEPENDS_ON');
          const newEdges = hasD103Edge ? prev.edges : [
            ...prev.edges,
            { source: 'DEC-103', target: 'F-OAuth2', type: 'DEPENDS_ON' },
            { source: 'DEC-103', target: 'DEC-102', type: 'REPLACES' }
          ];
          return {
            nodes: hasD103 ? nodes : [...nodes, { id: 'DEC-103', label: 'Decision', title: 'Scaffold Payment Gateway with OAuth2 (JWT/RS256)', status: 'VALID' }],
            edges: newEdges
          };
        });
        addLog('SYSTEM', 'Notice: Backend offline — simulating revalidation in-browser.', 'INFO');
      }
      if (isRevalSimulated) {
        addLog('SIMULATION', 'In-memory revalidation simulated: DEC-103 created; DEC-102 archived. [SIMULATION FALLBACK]', 'REVALIDATION');
      } else {
        addLog('FALKORDB', 'Query 3 Revalidation complete: DEC-103 created; DEC-102 archived.', 'REVALIDATION');
      }

      setAgentState('executing');
      addLog('AGENT', 'Agent re-submits `apply_code_change` using verified DEC-103...', 'INFO');

      const oauthCode = `/**\n * Payment Gateway Service\n * Verified & Grounded in DEC-103 (ADR-002: OAuth2 JWT/RS256)\n */\nimport express from 'express';\nimport { verifyOAuth2Bearer } from './auth.js';\n\nconst app = express();\napp.use(express.json());\n\n// Verified OAuth2 Checkout Endpoint\napp.post('/api/v2/checkout', verifyOAuth2Bearer, (req, res) => {\n  res.json({ status: 'approved', authMethod: 'OAuth2-RS256' });\n});\n\nexport default app;`;

      setLatestAction({ filePath: 'demo-repo/src/services/payment.js', decisionId: 'DEC-103', codeSnippet: oauthCode });

      let execData;
      let isExecSimulated = false;
      try {
        const execRes = await fetch('/api/mcp/call', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toolName: 'apply_code_change', args: { decision_id: 'DEC-103', file_path: 'demo-repo/src/services/payment.js', code_payload: oauthCode } })
        });
        if (!execRes.ok) throw new Error(`HTTP ${execRes.status}`);
        execData = await execRes.json();
        if (execData.graph) setGraphData(execData.graph);
        if (execData.simulated) isExecSimulated = true;
      } catch {
        execData = _simulateAct4Approve(oauthCode);
        isExecSimulated = true;
        addLog('SYSTEM', 'Notice: Backend offline — gate approval simulated in-browser.', 'INFO');
      }

      setLatestLatency(execData.latency_ms || null);
      setActiveVerdict('APPROVED');
      setAgentState('verified');
      playApprovalChime();
      if (isExecSimulated) {
        addLog('MCP_GATE', `GATE APPROVED [SIMULATION FALLBACK]. Full causal provenance chain simulated. File 'payment.js' simulated in-memory.`, 'GATE_APPROVE');
      } else {
        addLog('MCP_GATE', `GATE APPROVED in ${execData.latency_ms}ms! Full causal provenance chain verified. File 'payment.js' safely written to disk.`, 'GATE_APPROVE');
      }
    }
  }

  async function handleSelectAct(actNumber) {
    playClick();

    // Idempotency guard: Act 4 is the terminal act — re-running it appends duplicate
    // AgentAction nodes to the graph. Once Act 4 is complete, clicking it again is a no-op.
    // The user must Reset (Act 1) to replay the full sequence.
    if (actNumber === 4 && currentAct === 4 && loadingAct === null) {
      return;
    }

    // Skip-guard: if the user clicks Act 3 or 4 directly without running prior acts,
    // silently run the prerequisite acts so the graph is in the correct state.
    // Act 3/4 require Act 2 (ADR-002 ingest) — without it DEC-102 is still VALID
    // and the BLOCKED verdict would be visually inconsistent.
    if (actNumber >= 3 && currentAct < 2) {
      setCurrentAct(2);
      setLoadingAct(2);
      try { await _runAct(2); } catch {}
      setLoadingAct(null);
    }
    if (actNumber === 4 && currentAct < 3) {
      setCurrentAct(3);
      setLoadingAct(3);
      try { await _runAct(3); } catch {}
      setLoadingAct(null);
    }

    setCurrentAct(actNumber);
    setLoadingAct(actNumber);

    try {
      await _runAct(actNumber);
    } catch (err) {
      console.error('Act error:', err);
      addLog('ERROR', `Error executing Act ${actNumber}: ${err.message}`, 'ERROR');
    } finally {
      setLoadingAct(null);
    }
  }

  async function handleReset() {
    playClick();
    setIsResetting(true);
    setAgentState('idle');
    try {
      const res = await fetch('/api/reset', { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.graph) setGraphData(data.graph);

      setCurrentAct(1);
      setActiveVerdict(null);
      setSelectedNode(null);

      const resetMsg = data.simulated
        ? 'Demo repository reset to Act I baseline [SIMULATION FALLBACK].'
        : 'Demo repository and FalkorDB causal graph reset to Act I baseline.';

      setTerminalLogs([
        {
          component: data.simulated ? 'SIMULATION' : 'SYSTEM',
          time: new Date().toLocaleTimeString(),
          type: 'INFO',
          text: resetMsg
        }
      ]);

      setLatestAction({
        filePath: 'demo-repo/src/services/payment.js',
        decisionId: 'DEC-102',
        codeSnippet: `// Baseline: Unimplemented checkout route awaiting agent implementation\napp.post('/api/checkout', (req, res) => {\n  res.status(501).json({ error: 'Checkout route not implemented yet.' });\n});`
      });
    } catch (err) {
      console.error('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  }

  function addLog(component, text, type = 'INFO', violationPaths = null) {
    setTerminalLogs((prev) => [
      ...prev,
      {
        component,
        time: new Date().toLocaleTimeString(),
        type,
        text,
        violationPaths,
      },
    ]);
  }

  const handleCustomMcpAction = (result) => {
    if (result.is_approved) {
      addLog(
        'MCP_GATE',
        `PLAYGROUND TEST: APPROVED in ${result.latency_ms || '< 15'}ms! Verified causal chain for ${result.decision_id || 'Decision'}. File modified safely.`,
        'GATE_APPROVE'
      );
    } else {
      addLog(
        'MCP_GATE',
        `PLAYGROUND TEST: BLOCKED in ${result.latency_ms || '< 15'}ms! Hard reject on stale provenance. Zero writes permitted.`,
        'GATE_BLOCK',
        result.violation_paths
      );
    }
  };

  return (
    <div className={`w-full flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-200 select-none ${
      activeTab === 'console' ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'
    }`}>
      {/* Dynamic Company-Grade SEO Metadata Manager */}
      <SEOHead activeTab={activeTab} />

      {/* 0. Silky Smooth Kinetic Splash Loader */}
      <SplashLoader isDarkTheme={isDarkTheme} />

      {/* 1. Monochromatic Portfolio Header (Icon mark only - NO WORDMARK) */}
      <Header
        status={{ falkorLive, latestLatency }}
        activeTab={activeTab}
        landingTarget={landingTarget}
        onSelectTab={handleSelectTab}
        onPrefetchTab={prefetchRoute}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
        isDarkTheme={isDarkTheme}
        onToggleTheme={() => setIsDarkTheme((d) => !d)}
        tier={activeTierKey}
        user={githubUser}
      />

      {/* 2. Main Viewport Switcher with Fluid Page Ascent */}
      <PageAscentTransition
        routeKey={activeTab}
        distance={22}
        duration={550}
        className="flex-1 min-h-0 flex flex-col w-full"
      >
      <React.Suspense fallback={
        <div className="flex-1 min-h-[60vh] flex flex-col items-center justify-center select-none">
          <div className="relative h-24 w-24 sm:h-28 sm:w-28 flex items-center justify-center pointer-events-none">
            <CavdaxBrandLoader
              size={92}
              strokeWidth={3.4}
              hairlineWidth={1.1}
              colorClassName={isDarkTheme ? "text-white" : "text-slate-950"}
              animateOnHover={false}
            />
          </div>
        </div>
      }>
      {activeTab === 'landing' ? (
        /* Full Product Landing Page (footer particles live here, not in console §1.6) */
        <SubsystemErrorBoundary name="Landing Viewport">
          <LandingPage
            landingTarget={landingTarget}
            onSelectTab={handleSelectTab}
            onLaunchConsole={() => handleSelectTab('console')}
            onOpenMcpPage={() => handleSelectTab('mcp')}
            onOpenMcpModal={() => setIsMcpModalOpen(true)}
            onStartTour={() => handleSelectTab('console')}
            isDarkTheme={isDarkTheme}
            onToggleTheme={() => setIsDarkTheme((d) => !d)}
          />
        </SubsystemErrorBoundary>
      ) : activeTab === 'mcp' ? (
        /* Dedicated Full-Page MCP Architecture & Agent Connection Guide */
        <SubsystemErrorBoundary name="MCP Configuration">
          <ConnectMcpPage
            user={githubUser}
            onAuthChange={(u) => setGithubUser(u)}
            onLaunchConsole={() => handleSelectTab('console')}
          />
        </SubsystemErrorBoundary>
      ) : activeTab === 'project' ? (
        /* Project & System Demo Video Page */
        <ProjectVideoPage
          onLaunchConsole={() => handleSelectTab('console')}
          onOpenMcpPage={() => handleSelectTab('mcp')}
        />
      ) : activeTab === 'team' ? (
        /* Team Contrarians Presentation Page (CAVDAX Style) */
        <TeamPage
          onLaunchConsole={() => handleSelectTab('console')}
        />
      ) : activeTab === 'audit' ? (
        /* Agent Action Audit Log — Enterprise Security & Compliance */
        <div className="flex-1 min-h-0 flex flex-col pt-20 sm:pt-22 px-3 sm:px-6 max-w-[1600px] mx-auto w-full pb-3 overflow-hidden">
          <SubsystemErrorBoundary name="Audit Ledger">
            <AuditPage />
          </SubsystemErrorBoundary>
        </div>
      ) : activeTab === 'dev' ? (
        /* Internal Developer Diagnostic Console — URL-only (/dev), no nav tab */
        <div className="flex-1 min-h-0 flex flex-col pt-20 sm:pt-22 px-3 sm:px-6 max-w-[1600px] mx-auto w-full pb-3 overflow-hidden">
          <SubsystemErrorBoundary name="Dev Console">
            <DevConsolePage />
          </SubsystemErrorBoundary>
        </div>
      ) : activeTab === 'devteam' ? (
        /* Protected Dev Team Panel (/devteam) — Multi-Factor Pre-Challenge Cloaking */
        devAuthEvaluating ? (
          <div className="flex-1 min-h-[60vh] flex items-center justify-center select-none">
            <div className="flex items-center gap-2 font-mono text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
              <span>Verifying Security Clearance...</span>
            </div>
          </div>
        ) : isDevAuthorized ? (
          <SubsystemErrorBoundary name="Dev Enclave">
            <DevTeamPanel
              githubUser={githubUser}
              onNavigateHome={() => handleSelectTab('landing')}
            />
          </SubsystemErrorBoundary>
        ) : (
          /* Silent 404 Cloaking — unauthorized accounts & non-whitelisted IPs receive 404 */
          <NotFoundPage
            onNavigateHome={() => handleSelectTab('landing')}
            onLaunchConsole={() => handleSelectTab('console')}
          />
        )
      ) : activeTab === 'profile' ? (
        /* User Profile & Account Page */
        <SubsystemErrorBoundary name="Profile & Account">
          <ProfilePage
            user={githubUser}
            tier={activeTierKey}
            onSelectTier={(newTier) => setActiveTierKey(newTier)}
            onLaunchConsole={() => handleSelectTab('console')}
            onOpenMcpPage={() => handleSelectTab('mcp')}
            onOpenSupportPage={() => handleSelectTab('support')}
          />
        </SubsystemErrorBoundary>
      ) : activeTab === 'support' ? (
        /* Open Source Sponsorship & Support Page */
        <SubsystemErrorBoundary name="Support & Sponsorship">
          <SupportPage
            user={githubUser}
            onLaunchConsole={() => handleSelectTab('console')}
            onNavigateHome={() => handleSelectTab('landing')}
          />
        </SubsystemErrorBoundary>
      ) : activeTab === '404' ? (
        /* Bespoke Error 404 Causal Node Not Found Page */
        <NotFoundPage
          onNavigateHome={() => handleSelectTab('landing')}
          onLaunchConsole={() => handleSelectTab('console')}
        />
      ) : (
        /* Operational Causal Verification Console View — Strict Zero-Overflow F11 & Desktop Containment (§Rule 14) */
        <div className="flex-1 min-h-0 flex flex-col pt-20 sm:pt-22 px-3 sm:px-6 max-w-[1600px] mx-auto w-full pb-3 overflow-hidden">
          {/* Subheader Toolbar & Metrics */}
          <div data-tour="console-ribbon" className="flex-shrink-0 mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-300 dark:border-white/10">
            <div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-slate-950 dark:text-white font-mono">
                  Interactive Causal Verification Console
                </h1>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 font-sans">
                Observe autonomous agent tool calls intercepted deterministically before execution.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Dual-Mode Workspace Dropdown (Roadmap §5.3) */}
              <div className="relative" ref={workspaceRef}>
                <Tooltip content="Switch Workspace Mode" position="bottom">
                <button
                  onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
                  className="h-7 px-2.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-900 dark:text-white text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs select-none"
                >
                  {activeWorkspace === "demo" ? (
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
                  ) : (
                    <GitBranch className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
                  )}
                  <span className="font-semibold truncate max-w-[150px] sm:max-w-[210px]">
                    {activeWorkspace === "demo"
                      ? "Workspace: Demo Sandbox"
                      : (`Repo: ${selectedConnectedRepo?.name || "Connected"}`)}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isWorkspaceDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                </Tooltip>

                <AnimatePresence>
                  {isWorkspaceDropdownOpen && (
                    <motion.div
                      key="workspace-dropdown-menu"
                      initial={{ opacity: 0, scale: 0.96, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96, y: -4 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 top-full mt-1.5 w-80 rounded-xl bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/15 shadow-2xl p-1.5 z-50 font-mono text-xs"
                    >
                      <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-white/10 mb-1">
                        <span>Workspace Mode</span>
                      </div>

                      {/* Option 1: Canonical 4-Act Demo (Permanent Sandbox) */}
                      <button
                        onClick={() => {
                          setActiveWorkspace("demo");
                          setSelectedConnectedRepo(null);
                          setIsWorkspaceDropdownOpen(false);
                          playClick();
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all cursor-pointer ${
                          activeWorkspace === "demo"
                            ? "bg-slate-100 dark:bg-white/10 text-slate-950 dark:text-white font-bold border border-slate-300 dark:border-white/20"
                            : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
                          <div className="truncate">
                            <div className="text-xs truncate">Demo: TokenAuth v1 → OAuth2</div>
                            <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">Permanent 4-Act Showcase Sandbox</div>
                          </div>
                        </div>
                        {activeWorkspace === "demo" && <Check className="w-3.5 h-3.5 text-slate-950 dark:text-white shrink-0 ml-2" />}
                      </button>

                      {/* Connected Repositories Section */}
                      {connectedRepos.length > 0 && (
                        <div className="my-1 border-t border-slate-100 dark:border-white/10 pt-1">
                          <div className="px-2 py-1 text-[9px] uppercase tracking-wider text-slate-400">
                            Connected Repositories ({connectedRepos.length})
                          </div>
                          {connectedRepos.map((repo) => (
                            <div
                              key={repo.id}
                              className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-all ${
                                activeWorkspace === repo.id
                                  ? "bg-slate-200/80 dark:bg-white/10 text-slate-950 dark:text-white font-bold border border-slate-300 dark:border-white/15"
                                  : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveWorkspace(repo.id);
                                  setSelectedConnectedRepo(repo);
                                  setIsWorkspaceDropdownOpen(false);
                                  playClick();
                                }}
                                className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                              >
                                <GitBranch className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
                                <div className="truncate">
                                  <div className="text-xs truncate">{repo.full_name || repo.name}</div>
                                  <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                                    {repo.default_branch || "main"} · {repo.hasAdrs ? "ADRs Active" : "Zero-ADR"}
                                  </div>
                                </div>
                              </button>
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                {activeWorkspace === repo.id && <Check className="w-3.5 h-3.5 text-slate-950 dark:text-white shrink-0" />}
                                <Tooltip content="Disconnect from workspace" position="left">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playClick();
                                    handleDisconnectRepo(repo.id);
                                  }}
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
                                  aria-label="Disconnect repository from workspace"
                                >
                                  <Unlink className="w-3 h-3" />
                                </button>
                                </Tooltip>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                    </motion.div>
                )}
              </AnimatePresence>
              </div>

              {/* Upfront Connect Repo Action (Eliminating Mystery Meat Navigation) */}
              <Tooltip content="Connect a live GitHub repository" position="bottom">
                <button
                  onClick={() => {
                    playClick();
                    setIsConnectRepoModalOpen(true);
                  }}
                  className="h-7 px-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs tactile-btn"
                  aria-label="Connect a live GitHub repository"
                >
                  <Plus className="w-3.5 h-3.5 text-white dark:text-slate-950 shrink-0" />
                  <span>Connect Repo</span>
                </button>
              </Tooltip>
              {/* Tour Guide Action */}
              <Tooltip content="Start interactive guided tour" shortcut="T" position="bottom">
                <button
                  onClick={() => {
                    playClick();
                    handleOpenTour(activeWorkspace === "demo" || !selectedConnectedRepo ? "console" : "repo");
                  }}
                  className="h-7 px-2.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-xs group"
                  aria-label="Start interactive guided tour (Press T)"
                >
                  <Compass className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 group-hover:rotate-45 transition-transform duration-300" />
                  <span>Tour</span>
                </button>
              </Tooltip>
            </div>
          </div>

          {/* Conditional Stage: Canonical 4-Act Demo vs Connected Tenant Repo */}
          {activeWorkspace === "demo" || !selectedConnectedRepo ? (
            <>
              {/* 4-Act Storyline Stepper */}
              <div data-tour="story-stepper" className="flex-shrink-0 rounded-xl overflow-hidden mb-2 border border-slate-300 dark:border-white/10 story-stepper-shell">
                <StoryStepper
                  currentAct={currentAct}
                  onSelectAct={handleSelectAct}
                  loadingAct={loadingAct}
                />
              </div>

              {/* Split Screen Console Container (Terminal + GraphCanvas) — Dynamic single-screen flex expansion */}
              <div
                ref={demoSplitContainerRef}
                style={{ '--demo-left-width': `${demoLeftWidthPercent}%` }}
                className="flex-1 min-h-0 flex flex-col lg:flex-row rounded-2xl overflow-hidden console-split-container select-none"
              >
                {/* Left: Terminal HUD (Resizable width on desktop, 1-click collapsible) */}
                <div
                  data-tour="terminal-view"
                  style={{
                    width: isDemoLeftCollapsed ? '0px' : `${demoLeftWidthPercent}%`,
                    flexBasis: isDemoLeftCollapsed ? '0px' : `${demoLeftWidthPercent}%`
                  }}
                  className={`h-full min-w-0 overflow-hidden border-b lg:border-b-0 border-slate-300 dark:border-white/10 shrink-0 ${
                    isDraggingDemoSplitter
                      ? 'transition-none pointer-events-none select-none'
                      : 'transition-[width,flex-basis,opacity] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-[width,flex-basis]'
                  } ${
                    isDemoLeftCollapsed ? 'border-r-0 opacity-0 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  <div className="w-full h-full min-w-[360px]">
                    <TerminalView
                      terminalLogs={terminalLogs}
                      activeVerdict={activeVerdict}
                      latestAction={latestAction}
                      currentAct={currentAct}
                      agentState={agentState}
                      onCollapseSidebar={() => setIsDemoLeftCollapsed(true)}
                    />
                  </div>
                </div>

                {/* Draggable Mid-Section Divider Holder Button with Smooth Kinetic Transition */}
                <div
                  onMouseDown={handleDemoSplitterMouseDown}
                  onDoubleClick={() => setIsDemoLeftCollapsed(prev => !prev)}
                  className={`hidden lg:flex shrink-0 z-20 cursor-col-resize items-center justify-center transition-colors group ${
                    isDemoLeftCollapsed
                      ? 'w-0 -mx-0 opacity-0 pointer-events-none overflow-hidden'
                      : `w-2.5 -mx-1 opacity-100 ${isDraggingDemoSplitter ? 'bg-slate-400/20 dark:bg-white/10' : 'hover:bg-slate-300/40 dark:hover:bg-white/10'}`
                  }`}
                  title="Drag to adjust width or double-click to collapse"
                >
                  <div
                    className={`w-1 h-10 rounded-full transition-colors ${
                      isDraggingDemoSplitter
                        ? 'bg-slate-900 dark:bg-white'
                        : 'bg-slate-300 dark:bg-white/20 group-hover:bg-slate-400 dark:group-hover:bg-white/40'
                    }`}
                  />
                </div>

                {/* Right: Graph Canvas */}
                <div data-tour="graph-canvas" className={`flex-1 min-w-0 h-full relative overflow-hidden ${isDraggingDemoSplitter ? 'pointer-events-none select-none' : ''}`}>
                  <SubsystemErrorBoundary name="Knowledge Graph Canvas">
                    <GraphCanvas
                      graphData={graphData}
                      onSelectNode={setSelectedNode}
                      selectedNodeId={selectedNode?.id}
                      selectedNode={selectedNode}
                      onCloseNode={() => setSelectedNode(null)}
                      isDarkTheme={isDarkTheme}
                      isDemo={true}
                      isSidebarCollapsed={isDemoLeftCollapsed}
                      onToggleSidebar={() => setIsDemoLeftCollapsed(prev => !prev)}
                    />
                  </SubsystemErrorBoundary>
                </div>
              </div>
            </>
          ) : (
            <ConnectedRepoWorkspace
              repo={selectedConnectedRepo}
              isDarkTheme={isDarkTheme}
              onSwitchToDemo={() => {
                setActiveWorkspace("demo");
                setSelectedConnectedRepo(null);
              }}
              onUpdateRepo={handleUpdateConnectedRepo}
              onDisconnectRepo={handleDisconnectRepo}
            />
          )}

        </div>
      )}

      </React.Suspense>
      </PageAscentTransition>

      {/* 3. System Preferences Modal (Ported from CAVDAX) */}
      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        isDarkTheme={isDarkTheme}
        onToggleTheme={() => setIsDarkTheme((d) => !d)}
        onStartTour={(requestedMode) => {
          setIsPreferencesOpen(false);
          requestAnimationFrame(() => {
            handleOpenTour(requestedMode || activeTab);
          });
        }}
        onResetDemo={handleReset}
        onOpenShortcuts={() => {
          setIsPreferencesOpen(false);
          setIsShortcutsOpen(true);
        }}
      />


      {/* Universal Hoisted Tour Guide Overlay (Console, MCP, Audit, Profile) */}
      {isTourOpen && (
        <TourGuide
          isOpen={isTourOpen}
          onClose={() => setIsTourOpen(false)}
          mode={activeTab === 'console' ? (activeWorkspace === 'demo' ? 'console' : 'repo') : (['dev', 'mcp', 'audit', 'profile'].includes(activeTab) ? activeTab : 'console')}
        />
      )}

      {/* Universal Keyboard Shortcuts Guide Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Universal Scroll Cue & Architectural Rail Scrubber — present wherever there is vertical scroll */}
      <ArchitecturalRailScrubber activeTab={activeTab} />

      {/* 4. MCP Agent Connection Configuration Modal */}
      <McpConnectModal
        isOpen={isMcpModalOpen}
        onClose={() => setIsMcpModalOpen(false)}
      />

      {/* 5. GitHub Repository Connection Modal */}
      <ConnectRepoModal
        isOpen={isConnectRepoModalOpen}
        onClose={() => setIsConnectRepoModalOpen(false)}
        user={githubUser}
        onConnectRepo={handleConnectRepo}
        connectedRepoIds={connectedRepos.map(r => r.id)}
        onDisconnectRepo={handleDisconnectRepo}
        returnTo={TAB_TO_PATH[activeTab] || "/console"}
      />
    </div>
  );
}
