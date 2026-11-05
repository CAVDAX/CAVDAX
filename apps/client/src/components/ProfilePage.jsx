import React, { useState, useEffect } from 'react';
import {
  Compass, User, Copy, Check, CheckCircle2, Lock, Terminal,
  SlidersHorizontal, Key, HardDrive, AlertTriangle, RefreshCw, Heart, ExternalLink, LogOut, Github, Eye, EyeOff,
  ShieldCheck, Award, Gauge, KeyRound, Cable
} from 'lucide-react';
import { playClick } from '../utils/soundFx';
import { isUserAuthorized, getActiveDevSession } from '../services/devAuth';
import ShimmerImage from './ui/ShimmerImage';
import DevPatLoginModal from './DevPatLoginModal';


function getStoredUser() {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('cavdax_user_session') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.username || parsed?.login) {
        return {
          login: parsed.username || parsed.login,
          name: parsed.name || parsed.username || parsed.login,
          avatarUrl: parsed.avatarUrl || parsed.avatar_url || ''
        };
      }
    }
  } catch {}
  return null;
}

// ProfilePage handles OAuth callback params if the user connected GitHub from
// this page (server redirects back to /profile?connected=1 when returnTo=/profile).
function consumeOAuthCallbackParams(onUserResolved) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('connected') === '1') {
    const login = params.get('login');
    const name = params.get('name') || login;
    const avatarUrl = params.get('avatar') || '';
    const githubId = params.get('githubId') || '';
    if (login) {
      const userObj = { login, name, avatarUrl, githubId };
      try {
        localStorage.setItem('cavdax_user_session', JSON.stringify({
          username: login, name, avatarUrl, githubId,
          connectedAt: new Date().toISOString()
        }));
      } catch {}
      window.dispatchEvent(new CustomEvent('cavdax:user-changed', { detail: userObj }));
      onUserResolved(userObj, { type: 'success', text: 'GitHub account connected successfully.' });
    }
    window.history.replaceState({}, '', '/profile');
    return true;
  } else if (params.get('oauth_error')) {
    const errCode = params.get('oauth_error');
    onUserResolved(null, { type: 'error', text: `GitHub OAuth failed: ${errCode}` });
    window.history.replaceState({}, '', '/profile');
    return true;
  }
  return false;
}

/**
 * ProfilePage.jsx — Developer Identity, Architecture Tiers & Quota Management
 * 
 * Complies with CAVDAX Design System:
 * - Single-page contained layout (zero vertical scrollbar / overflow).
 * - Frameless centered avatar with concentric tier ring.
 * - Solid premium purple background on active Enterprise card with tailored Active button.
 * - Gated Pro & Enterprise tiers for unauthenticated sandbox users with auth toast.
 * - Zero emojis, no bracketed tags, clean typography.
 */
// Dynamically loads Razorpay checkout.js script once
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}


const LARGE_DISPLAY_QUERY = "(min-width: 1537px), (min-height: 875px) and (min-width: 1280px)";

function useIsLargeDisplay() {
  const [isLarge, setIsLarge] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(LARGE_DISPLAY_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(LARGE_DISPLAY_QUERY);
    const onChange = (e) => setIsLarge(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isLarge;
}

export default function ProfilePage({
  user,
  tier = 'free',
  onSelectTier,
  onLaunchConsole,
  onOpenMcpPage,
  onOpenSupportPage
}) {
  const [currentTier, setCurrentTier] = useState(tier);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isSponsorHovered, setIsSponsorHovered] = useState(false);
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  const [isGithubHovered, setIsGithubHovered] = useState(false);
  const [isDevPatModalOpen, setIsDevPatModalOpen] = useState(false);
  const [isDevPatHovered, setIsDevPatHovered] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [isHackathonMode, setIsHackathonMode] = useState(() => {
    return typeof window !== 'undefined' && localStorage.getItem('cavdax_hackathon_mode') === 'true';
  });

  useEffect(() => {
    const handleMode = (e) => {
      setIsHackathonMode(Boolean(e.detail?.enabled));
    };
    window.addEventListener('cavdax:hackathon-mode-changed', handleMode);

    fetch('/api/system/hackathon-mode')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.enabled === 'boolean') {
          setIsHackathonMode(data.enabled);
        }
      })
      .catch(() => {});

    return () => window.removeEventListener('cavdax:hackathon-mode-changed', handleMode);
  }, []);
  const [toastMsg, setToastMsg] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [isRevokedNotice, setIsRevokedNotice] = useState(false);
  const [isLoadingKey, setIsLoadingKey] = useState(true);
  const [isKeyRevealed, setIsKeyRevealed] = useState(false);
  const [hoveredTierBtn, setHoveredTierBtn] = useState(null);
  const [quotaData, setQuotaData] = useState(null);
  const [connectedRepoCount, setConnectedRepoCount] = useState(0);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [currency, setCurrency] = useState(() => {
    try {
      const saved = localStorage.getItem('cavdax_currency');
      if (saved === 'USD' || saved === 'INR') return saved;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const lang = navigator.language || '';
      if (tz.includes('Calcutta') || tz.includes('Kolkata') || lang.includes('en-IN') || lang.includes('hi')) {
        return 'INR';
      }
    } catch {}
    return 'USD';
  });

  const toggleCurrency = (newCurr) => {
    setCurrency(newCurr);
    try {
      localStorage.setItem('cavdax_currency', newCurr);
      window.dispatchEvent(new CustomEvent('cavdax:currency-changed', { detail: { currency: newCurr } }));
    } catch {}
  };

  useEffect(() => {
    const handleCurrencyChange = (e) => {
      const next = e.detail?.currency || localStorage.getItem('cavdax_currency');
      if (next && (next === 'USD' || next === 'INR')) {
        setCurrency(next);
      }
    };
    window.addEventListener('cavdax:currency-changed', handleCurrencyChange);
    return () => window.removeEventListener('cavdax:currency-changed', handleCurrencyChange);
  }, []);

  useEffect(() => {
    let isMounted = true;
    async function fetchApiKey() {
      if (!user) {
        if (isMounted) {
          setApiKey('');
          setIsRevokedNotice(false);
          setIsLoadingKey(false);
        }
        return;
      }
      try {
        setIsLoadingKey(true);
        const res = await fetch('/api/user/api-key', { credentials: 'include' });
        const data = await res.json();
        if (isMounted) {
          if (res.status === 401 || (data && data.authenticated === false)) {
            setApiKey('');
            setIsRevokedNotice(false);
            try { localStorage.removeItem('cavdax_user_session'); } catch {}
            window.dispatchEvent(new CustomEvent('cavdax:user-changed', { detail: null }));
            return;
          }
          if (data.success && data.apiKey) {
            setApiKey(data.apiKey);
            setIsRevokedNotice(false);
          } else if (data.revoked) {
            setApiKey('');
            setIsRevokedNotice(true);
          }
        }
      } catch (err) {
        console.warn('[CAVDAX] Could not fetch user API key:', err);
      } finally {
        if (isMounted) setIsLoadingKey(false);
      }
    }
    fetchApiKey();

    const handleKeysRevoked = () => {
      if (isMounted) {
        setApiKey('');
        setIsRevokedNotice(true);
      }
    };
    window.addEventListener('cavdax:keys-revoked', handleKeysRevoked);

    return () => {
      isMounted = false;
      window.removeEventListener('cavdax:keys-revoked', handleKeysRevoked);
    };
  }, [user]);


  const handleRazorpayUpgrade = async () => {
    if (!user) {
      showToast("Please connect your GitHub account to proceed — we’ll bind your tier to your verified identity.");
      return;
    }
    if (isUpgrading) return;
    setIsUpgrading(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        showToast('Could not load payment gateway. Check your connection.');
        setIsUpgrading(false);
        return;
      }

      const orderRes = await fetch('/api/billing/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount_paise: 33900, // ₹339 = $4/mo
          receipt: `cavdax_pro_${Date.now()}`
        })
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.success) {
        showToast(orderData?.error?.message || 'Failed to create subscription order.');
        setIsUpgrading(false);
        return;
      }

      const keyId = orderData.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || '';
      if (!keyId) {
        showToast('Payment gateway key is not configured.');
        setIsUpgrading(false);
        return;
      }

            const handleRazorpayPaymentVerify = async (response) => {
        try {
          const verifyRes = await fetch('/api/billing/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              tier: 'pro'
            })
          });
          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            setCurrentTier('pro');
            try {
              localStorage.setItem('cavdax_tier', 'pro');
              window.dispatchEvent(new CustomEvent('cavdax:tier-changed', { detail: { tier: 'pro' } }));
            } catch {}
            if (onSelectTier) onSelectTier('pro');
            showToast('Payment verified! Welcome to Pro Autonomous tier.');
          } else {
            showToast('Signature verification failed. Contact support with payment ID.');
          }
        } catch {
          showToast('Verification request failed. Contact support.');
        } finally {
          setIsUpgrading(false);
        }
      };

      const options = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'CAVDAX',
        description: 'Pro Autonomous Tier ($4/mo) — Causal Verification Engine',
        image: `${window.location.origin}/cavdax-brand-logo.jpg`,
        order_id: orderData.order_id,
        theme: { color: '#F59E0B' },
        modal: {
          ondismiss: () => setIsUpgrading(false)
        },
        handler: handleRazorpayPaymentVerify
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        showToast(`Payment failed: ${resp.error?.description || 'Transaction declined'}`);
        setIsUpgrading(false);
      });
      rzp.open();
    } catch (err) {
      showToast('Payment initiation failed. Please try again.');
      setIsUpgrading(false);
    }
  };

  // Consume OAuth callback params on mount — handles ?connected=1 or ?oauth_error=
  // when GitHub redirected back here after authentication initiated from this page.
  useEffect(() => {
    consumeOAuthCallbackParams((resolvedUser, msg) => {
      if (msg) {
        setToastMsg(msg.text);
        setTimeout(() => setToastMsg(null), 3500);
      }
      // The cavdax:user-changed event already updates App.jsx's githubUser state;
      // the `user` prop will re-render this component with the correct value.
    });
  }, []);

  // Load real user quota metrics and connected repository count
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cavdax_connected_repos');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setConnectedRepoCount(parsed.length);
        }
      }
    } catch {}

    const fetchQuota = async () => {
      try {
        const res = await fetch(`/api/user/quota?tier=${currentTier}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setQuotaData(data);
        }
      } catch (err) {
        console.warn('[CAVDAX Profile] Could not fetch server quota:', err);
      }
    };

    fetchQuota();
  }, [currentTier]);

  const [isSponsor, setIsSponsor] = useState(() => {
    try {
      return localStorage.getItem('cavdax_is_sponsor') === 'true';
    } catch {
      return false;
    }
  });
  const [sponsorTierLabel, setSponsorTierLabel] = useState(() => {
    try {
      return localStorage.getItem('cavdax_sponsor_tier') || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (quotaData?.is_sponsor || user?.is_sponsor) {
      setIsSponsor(true);
      if (quotaData?.sponsor_tier || user?.sponsor_tier) {
        setSponsorTierLabel(quotaData?.sponsor_tier || user?.sponsor_tier);
      }
    }
    const handleSponsorRegistered = (e) => {
      setIsSponsor(true);
      if (e.detail?.tier_label) {
        setSponsorTierLabel(e.detail.tier_label);
      }
    };
    window.addEventListener('cavdax:sponsor-registered', handleSponsorRegistered);
    return () => window.removeEventListener('cavdax:sponsor-registered', handleSponsorRegistered);
  }, [quotaData, user]);

  // Check if current user is an authorized devteam member or has active dev enclave session
  const activeUser = user || getStoredUser() || getActiveDevSession();
  const isAuthorizedDev = Boolean(
    isUserAuthorized(activeUser) || getActiveDevSession()
  );
  // Full unrestricted access granted for core developers or global Hackathon Evaluation Mode
  const hasEvaluationPass = Boolean(isAuthorizedDev || (isHackathonMode && Boolean(activeUser)));
  
  // Set default flagship tier (Enterprise) when Hackathon Mode transitions, allowing free tier exploration
  const prevHackathonModeRef = React.useRef(isHackathonMode);

  useEffect(() => {
    // When Hackathon Mode transitions from OFF -> ON, elevate to Enterprise only if authenticated
    if (isHackathonMode && !prevHackathonModeRef.current && activeUser) {
      setCurrentTier('enterprise');
      try {
        localStorage.setItem('cavdax_tier', 'enterprise');
        window.dispatchEvent(new CustomEvent('cavdax:tier-changed', { detail: { tier: 'enterprise' } }));
      } catch {}
      if (onSelectTier) onSelectTier('enterprise');
    } else if (!isHackathonMode && prevHackathonModeRef.current) {
      // When Hackathon Mode is disengaged, revert standard visitors back to Community tier
      if (!isAuthorizedDev) {
        setCurrentTier('free');
        try {
          localStorage.setItem('cavdax_tier', 'free');
          window.dispatchEvent(new CustomEvent('cavdax:tier-changed', { detail: { tier: 'free' } }));
          if (localStorage.getItem('cavdax_sponsor_is_evaluation') === 'true') {
            localStorage.removeItem('cavdax_is_sponsor');
            localStorage.removeItem('cavdax_sponsor_tier');
            localStorage.removeItem('cavdax_evaluation_sponsor_tier');
            localStorage.removeItem('cavdax_sponsor_is_evaluation');
            setSponsorTierLabel(null);
            window.dispatchEvent(new CustomEvent('cavdax:sponsor-registered', { detail: null }));
          }
        } catch {}
        if (onSelectTier) onSelectTier('free');
      }
    }
    prevHackathonModeRef.current = isHackathonMode;
  }, [isHackathonMode, isAuthorizedDev, activeUser, onSelectTier]);

  // Sync external tier prop changes into local state
  useEffect(() => {
    if (tier && tier !== currentTier) {
      setCurrentTier(tier);
    }
  }, [tier]);

  const showToast = (msg, duration = 3500) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, duration);
  };

  useEffect(() => {
    if (isHackathonMode) {
      showToast('Hackathon Evaluation Window Active · Enterprise Capabilities Unlocked for Hackathon Review', 5000);
    }
  }, [isHackathonMode]);

  const handleTierSwitch = (newTier) => {
    playClick();

    if (newTier === 'free') {
      setCurrentTier('free');
      try {
        localStorage.setItem('cavdax_tier', 'free');
        window.dispatchEvent(new CustomEvent('cavdax:tier-changed', { detail: { tier: 'free' } }));
      } catch {}
      if (onSelectTier) onSelectTier('free');
      showToast('Active Plan: COMMUNITY Tier');
      return;
    }

    // Enforce GitHub / Dev authentication even during Evaluation Mode:
    // Tiers, API keys, and quotas must always bind to a verified identity.
    const activeUser = user || getActiveDevSession();
    if (!activeUser) {
      playClick();
      window.location.href = '/api/auth/github?returnTo=/profile';
      return;
    }

    // Authorized developer or Hackathon Evaluation Pass bypass (allows switching to any tier without payment once authenticated)
    if (hasEvaluationPass) {
      setCurrentTier(newTier);
      try {
        localStorage.setItem('cavdax_tier', newTier);
        window.dispatchEvent(new CustomEvent('cavdax:tier-changed', { detail: { tier: newTier } }));
      } catch {}
      if (onSelectTier) onSelectTier(newTier);
      showToast(
        isHackathonMode
          ? `Activated ${newTier.toUpperCase()} Tier (Evaluation Pass)`
          : `Switched to ${newTier.toUpperCase()} Tier (Dev Override)`
      );
      return;
    }

    if (newTier === 'pro') {
      handleRazorpayUpgrade();
      return;
    }
    const planName = 'Enterprise Mesh';
    showToast(`${planName} requires custom contract deployment. Contact sales at contact@cavdax.live`);
    return;
  };

  const handleLogout = async () => {
    playClick();
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    try {
      localStorage.removeItem('cavdax_user_session');
      localStorage.setItem('cavdax_tier', 'free');
    } catch {}
    setCurrentTier('free');
    window.dispatchEvent(new CustomEvent('cavdax:user-changed', { detail: null }));
    window.dispatchEvent(new CustomEvent('cavdax:tier-changed', { detail: { tier: 'free' } }));
    if (onSelectTier) onSelectTier('free');
    showToast('Signed out of GitHub session.');
  };

  const handleCardPointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  const handleCardPointerLeave = (e) => {
    e.currentTarget.style.setProperty('--mouse-x', '-999px');
    e.currentTarget.style.setProperty('--mouse-y', '-999px');
  };

  const handleCopyApiKey = () => {
    playClick();
    if (!user || !apiKey) {
      showToast('Authentication required: Sign in with GitHub to copy your API key.');
      return;
    }
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    showToast('Cryptographic API Key copied to clipboard.');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleRotateKey = async () => {
    playClick();
    setIsRotating(true);
    try {
      const res = await fetch('/api/user/rotate-api-key', {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.status === 401 || (data && data.authenticated === false)) {
        try { localStorage.removeItem('cavdax_user_session'); } catch {}
        window.dispatchEvent(new CustomEvent('cavdax:user-changed', { detail: null }));
        showToast('Session expired after server update. Reconnect GitHub to rotate keys.');
        return;
      }
      if (data.success && data.apiKey) {
        setApiKey(data.apiKey);
        setIsRevokedNotice(false);
        showToast('Cryptographic API Key successfully rotated.');
      } else {
        showToast('Failed to rotate API Key.');
      }
    } catch (err) {
      showToast(`Error rotating key: ${err.message}`);
    } finally {
      setTimeout(() => setIsRotating(false), 400);
    }
  };

  // Concentric avatar ring specifications
  const ROLE_RING = {
    free: 'ring-2 ring-slate-400/60 dark:ring-white/30',
    pro: 'ring-2 ring-amber-400/90 shadow-[0_0_12px_rgba(251,191,36,0.35)]',
    enterprise: 'ring-2 ring-purple-600/90 shadow-[0_0_12px_rgba(147,51,234,0.35)]',
  };
  const tierRingStyles = ROLE_RING;
  const userInitial = (activeUser?.name || user?.login || 'C').replace(/^@/, '').trim().charAt(0).toUpperCase() || 'C';

  // Calculate dynamic quota metrics based on active tier and real server/local state
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const defaultDaysRemaining = Math.max(1, endOfMonth.getDate() - now.getDate());
  const defaultResetsOn = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const daysRemaining = quotaData?.cycle?.days_remaining ?? defaultDaysRemaining;
  const resetsOn = quotaData?.cycle?.resets_on ?? defaultResetsOn;
  // Count user-created / connected ADR decisions (strictly excluding the canonical 4-Act demo graph)
  const userDecisionsCount = quotaData?.usage?.user_decisions ?? 0;
  const decisionsCapacity = currentTier === 'free' ? 50 : (currentTier === 'pro' ? 1000 : -1);
  const capacityPct = decisionsCapacity === -1 
    ? 0 
    : Math.min(100, Math.round((userDecisionsCount / decisionsCapacity) * 100));

  const repoLimit = currentTier === 'free' ? '1' : (currentTier === 'pro' ? '10' : 'Unlimited');
  const mcpRateLimit = currentTier === 'free' ? '30 rpm' : (currentTier === 'pro' ? '100 rpm' : 'Unlimited');

  const isLargeDisplay = useIsLargeDisplay();

  // 1. Spacious Layout (Preserved from pre-compact commit 3e35dc6 for 27-inch monitors & large displays)
  if (isLargeDisplay) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto pt-10 sm:pt-12 lg:pt-14 pb-12 sm:pb-16 px-4 sm:px-6 max-w-6xl mx-auto w-full select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        
        {/* ── 1. Top Identity & Account State (Frameless, Spacious, Centered Elegance) ── */}
        <section className="text-center mt-6 sm:mt-8 md:mt-10 pt-4 pb-4 sm:pb-6 relative flex flex-col items-center">
          {/* Large Concentric Avatar (Centered, Frameless, Tier-Ring Halo) */}
          <div className="relative mb-3 sm:mb-4 flex justify-center">
            <div className="relative">
              <div className={`w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full overflow-hidden transition-all duration-500 bg-slate-100 dark:bg-white/5 ${tierRingStyles[currentTier] || tierRingStyles.free}`}>
                {(activeUser?.avatar_url || activeUser?.avatarUrl || activeUser?.avatar) ? (
                  <ShimmerImage
                    src={activeUser?.avatar_url || activeUser?.avatarUrl || activeUser?.avatar}
                    alt={user.login || 'User Avatar'}
                    containerClassName="h-full w-full rounded-full"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-mono font-bold text-slate-400 text-2xl sm:text-3xl">
                    {userInitial}
                  </div>
                )}
              </div>
  
              {/* Micro Tier Badge Floating Over Bottom-Right of Avatar (Authentic Tier SVGs) */}
              <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-1 shadow-sm border border-slate-200/80 dark:border-white/15">
                <div className="w-5 h-5 rounded-full flex items-center justify-center">
                  {currentTier === 'enterprise' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-purple-500 dark:text-purple-400 shrink-0 transform -rotate-45" aria-hidden="true">
                      <path d="M3 18h18l-2-11-4.5 4.5L12 4l-2.5 7.5L5 7l-2 11z" fill="currentColor" fillOpacity="0.25" />
                      <line x1="4" y1="20" x2="20" y2="20" strokeWidth="1.8" />
                      <circle cx="12" cy="4" r="1.3" fill="currentColor" />
                    </svg>
                  ) : currentTier === 'pro' ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0 transform -rotate-45" aria-hidden="true">
                      <polygon points="6 3 18 3 22 9 12 22 2 9 6 3" fill="currentColor" fillOpacity="0.25" />
                      <line x1="2" y1="9" x2="22" y2="9" />
                      <line x1="10" y1="9" x2="12" y2="22" />
                      <line x1="14" y1="9" x2="12" y2="22" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-3 h-3 text-slate-600 dark:text-slate-400 shrink-0 transform -rotate-45"
                      aria-hidden="true"
                    >
                      <path d="M7 8h10" />
                      <path d="M8.5 8c0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5" />
                      <circle cx="5" cy="11" r="1.75" />
                      <path d="M2.5 17c0-2 1.5-3 3-3 .8 0 1.5.3 2 .8" />
                      <circle cx="19" cy="11" r="1.75" />
                      <path d="M21.5 17c0-2-1.5-3-3-3-.8 0-1.5.3-2 .8" />
                      <path d="M9 16c0-1.8 1.3-2.5 3-2.5s3 .7 3 2.5" />
                      <rect x="5" y="18" width="14" height="4.5" rx="1" fill="currentColor" fillOpacity="0.25" />
                      <line x1="8" y1="20" x2="8.01" y2="20" strokeWidth="2" />
                      <line x1="11" y1="20" x2="11.01" y2="20" strokeWidth="2" />
                      <line x1="14" y1="20" x2="14.01" y2="20" strokeWidth="2" />
                      <line x1="16.5" y1="20" x2="16.51" y2="20" strokeWidth="2" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
  
          {/* Identity & Verified Handle */}
          <h1 className="text-base sm:text-lg font-bold font-mono tracking-tight text-slate-950 dark:text-white leading-tight">
            {activeUser?.name || activeUser?.login || 'Local Contributor'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
            {activeUser ? `@${activeUser.login} • GitHub Verified` : 'Unauthenticated Sandbox Session'}
          </p>

          
  
          {/* Centered Actions Row: Support Us & Account State (Sleek, Wave Fill Cohesion) */}
          <div className="mt-3 sm:mt-4 flex items-center justify-center gap-4 flex-wrap">
            {/* Support Us Button with Rose Fluid Wave Fill */}
            <button
              onClick={() => {
                playClick();
                if (onOpenSupportPage) onOpenSupportPage();
              }}
              onMouseEnter={() => setIsSponsorHovered(true)}
              onMouseLeave={() => setIsSponsorHovered(false)}
              className={`relative overflow-hidden group h-9 min-w-[140px] px-5 flex items-center justify-center gap-2 rounded-lg border text-xs font-mono font-semibold transition-all duration-500 cursor-pointer tactile-btn shadow-xs select-none ${
                isSponsorHovered
                  ? 'border-rose-500 dark:border-rose-400 text-white shadow-rose-500/20'
                  : 'bg-slate-100 dark:bg-white/5 border-slate-300/80 dark:border-white/20 text-slate-700 dark:text-slate-300 hover:border-rose-400 dark:hover:border-rose-400'
              }`}
              title="Support the CAVDAX open-source project"
            >
              {/* Fluid Water Fill Layer */}
              <div
                aria-hidden="true"
                style={{
                  transform: isSponsorHovered ? 'translateY(0%)' : 'translateY(105%)',
                  opacity: isSponsorHovered ? 1 : 0,
                  transition: isSponsorHovered
                    ? 'transform 1000ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 200ms ease-out'
                    : 'opacity 250ms ease-out, transform 0s 250ms'
                }}
                className="absolute left-[-15%] right-[-15%] bottom-0 h-[260%] flex flex-col pointer-events-none z-0"
              >
                <svg
                  viewBox="0 0 320 48"
                  preserveAspectRatio="none"
                  className="w-full h-6 shrink-0 text-rose-500 dark:text-rose-600 fill-current block"
                >
                  <path d="M 0 24 Q 40 8, 80 20 T 160 15 T 240 22 T 320 12 L 320 48 L 0 48 Z" />
                  <circle cx="80" cy="20" r="4.5" />
                  <circle cx="120" cy="12" r="3.5" />
                  <circle cx="160" cy="15" r="5" />
                  <circle cx="200" cy="13" r="3.5" />
                  <circle cx="240" cy="22" r="4.5" />
                  <line x1="80" y1="20" x2="120" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                  <line x1="120" y1="12" x2="160" y2="15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                  <line x1="160" y1="15" x2="200" y2="13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                  <line x1="200" y1="13" x2="240" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                </svg>
                <div className="flex-1 w-full bg-rose-500 dark:bg-rose-600" />
              </div>
  
              <Heart className={`w-3.5 h-3.5 relative z-10 transition-colors duration-500 ${
                isSponsorHovered ? 'text-white fill-white' : 'text-rose-500'
              }`} />
              <span className={`relative z-10 transition-colors duration-500 ${
                isSponsorHovered ? 'text-white' : ''
              }`}>
                Support Us
              </span>
            </button>
  
            {/* Account Action: Log Out (if user) OR Connect GitHub (with Monochrome Fluid Wave Fill) */}
            {activeUser ? (
            <button
              onClick={handleLogout}
                onMouseEnter={() => setIsLogoutHovered(true)}
                onMouseLeave={() => setIsLogoutHovered(false)}
                className={`relative overflow-hidden group h-9 min-w-[130px] px-5 rounded-lg border text-xs font-mono font-semibold transition-all duration-500 cursor-pointer tactile-btn shadow-xs select-none flex items-center justify-center gap-2 ${
                  isLogoutHovered
                    ? 'border-rose-500 dark:border-rose-400 text-white shadow-rose-500/20'
                    : 'border-rose-500/50 dark:border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
                }`}
                title="Sign out of current GitHub session"
              >
                {/* Fluid Water Fill Layer */}
                <div
                  aria-hidden="true"
                  style={{
                    transform: isLogoutHovered ? 'translateY(0%)' : 'translateY(105%)',
                    opacity: isLogoutHovered ? 1 : 0,
                    transition: isLogoutHovered
                      ? 'transform 1000ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 200ms ease-out'
                      : 'opacity 250ms ease-out, transform 0s 250ms'
                  }}
                  className="absolute left-[-15%] right-[-15%] bottom-0 h-[260%] flex flex-col pointer-events-none z-0"
                >
                  <svg
                    viewBox="0 0 320 48"
                    preserveAspectRatio="none"
                    className="w-full h-6 shrink-0 text-rose-600 fill-current block"
                  >
                    <path d="M 0 24 Q 40 8, 80 20 T 160 15 T 240 22 T 320 12 L 320 48 L 0 48 Z" />
                    <circle cx="80" cy="20" r="4.5" />
                    <circle cx="120" cy="12" r="3.5" />
                    <circle cx="160" cy="15" r="5" />
                    <circle cx="200" cy="13" r="3.5" />
                    <circle cx="240" cy="22" r="4.5" />
                    <line x1="80" y1="20" x2="120" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="120" y1="12" x2="160" y2="15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="160" y1="15" x2="200" y2="13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="200" y1="13" x2="240" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                  </svg>
                  <div className="flex-1 w-full bg-rose-600" />
                </div>
  
                <LogOut className={`w-3.5 h-3.5 relative z-10 transition-colors duration-500 ${
                  isLogoutHovered ? 'text-white' : 'text-rose-600 dark:text-rose-400'
                }`} />
                <span className={`relative z-10 transition-colors duration-500 ${
                  isLogoutHovered ? 'text-white' : ''
                }`}>
                  Log Out
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    playClick();
                    window.location.href = '/api/auth/github?returnTo=/profile';
                  }}
                  onMouseEnter={() => setIsGithubHovered(true)}
                  onMouseLeave={() => setIsGithubHovered(false)}
                  className={`relative overflow-hidden group h-9 min-w-[140px] px-4 rounded-lg border text-xs font-mono font-semibold transition-all duration-500 cursor-pointer tactile-btn shadow-xs select-none flex items-center justify-center gap-2 ${
                    isGithubHovered
                      ? 'border-slate-950 dark:border-white text-white dark:text-slate-950 shadow-slate-950/20 dark:shadow-white/20'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-300/80 dark:border-white/20 text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-white/40'
                  }`}
                  title="Connect with GitHub OAuth"
                >
                  {/* Fluid Water Fill Layer (Monochrome Obsidian / Porcelain) */}
                  <div
                    aria-hidden="true"
                    style={{
                      transform: isGithubHovered ? 'translateY(0%)' : 'translateY(105%)',
                      opacity: isGithubHovered ? 1 : 0,
                      transition: isGithubHovered
                        ? 'transform 1000ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 200ms ease-out'
                        : 'opacity 250ms ease-out, transform 0s 250ms'
                    }}
                    className="absolute left-[-15%] right-[-15%] bottom-0 h-[260%] flex flex-col pointer-events-none z-0"
                  >
                    <svg
                      viewBox="0 0 320 48"
                      preserveAspectRatio="none"
                      className="w-full h-6 shrink-0 text-slate-950 dark:text-white fill-current block"
                    >
                      <path d="M 0 24 Q 40 8, 80 20 T 160 15 T 240 22 T 320 12 L 320 48 L 0 48 Z" />
                      <circle cx="80" cy="20" r="4.5" />
                      <circle cx="120" cy="12" r="3.5" />
                      <circle cx="160" cy="15" r="5" />
                      <circle cx="200" cy="13" r="3.5" />
                      <circle cx="240" cy="22" r="4.5" />
                      <line x1="80" y1="20" x2="120" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                      <line x1="120" y1="12" x2="160" y2="15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                      <line x1="160" y1="15" x2="200" y2="13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                      <line x1="200" y1="13" x2="240" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    </svg>
                    <div className="flex-1 w-full bg-slate-950 dark:bg-white" />
                  </div>

                  <Github className={`w-3.5 h-3.5 relative z-10 transition-colors duration-500 ${
                    isGithubHovered ? 'text-white dark:text-slate-950' : 'text-slate-800 dark:text-slate-200'
                  }`} />
                  <span className={`relative z-10 transition-colors duration-500 ${
                    isGithubHovered ? 'text-white dark:text-slate-950' : ''
                  }`}>
                    Connect GitHub
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setIsDevPatModalOpen(true);
                  }}
                  onMouseEnter={() => setIsDevPatHovered(true)}
                  onMouseLeave={() => setIsDevPatHovered(false)}
                  className={`relative overflow-hidden group h-9 px-3.5 rounded-lg border text-xs font-mono font-semibold transition-all duration-500 cursor-pointer tactile-btn shadow-xs select-none flex items-center justify-center gap-1.5 shrink-0 ${
                    isDevPatHovered
                      ? 'border-slate-950 dark:border-white text-white dark:text-slate-950 shadow-slate-950/20 dark:shadow-white/20'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-300/80 dark:border-white/20 text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-white/40'
                  }`}
                  title="Use Personal Access Token (for local development)"
                >
                  {/* Fluid Water Fill Layer */}
                  <div
                    aria-hidden="true"
                    style={{
                      transform: isDevPatHovered ? 'translateY(0%)' : 'translateY(105%)',
                      opacity: isDevPatHovered ? 1 : 0,
                      transition: isDevPatHovered
                        ? 'transform 1000ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 200ms ease-out'
                        : 'opacity 250ms ease-out, transform 0s 250ms'
                    }}
                    className="absolute left-[-15%] right-[-15%] bottom-0 h-[260%] flex flex-col pointer-events-none z-0"
                  >
                    <svg
                      viewBox="0 0 320 48"
                      preserveAspectRatio="none"
                      className="w-full h-6 shrink-0 text-slate-950 dark:text-white fill-current block"
                    >
                      <path d="M 0 24 Q 40 8, 80 20 T 160 15 T 240 22 T 320 12 L 320 48 L 0 48 Z" />
                      <circle cx="80" cy="20" r="4.5" />
                      <circle cx="120" cy="12" r="3.5" />
                      <circle cx="160" cy="15" r="5" />
                      <circle cx="200" cy="13" r="3.5" />
                      <circle cx="240" cy="22" r="4.5" />
                      <line x1="80" y1="20" x2="120" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                      <line x1="120" y1="12" x2="160" y2="15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                      <line x1="160" y1="15" x2="200" y2="13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                      <line x1="200" y1="13" x2="240" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    </svg>
                    <div className="flex-1 w-full bg-slate-950 dark:bg-white" />
                  </div>

                  <KeyRound className={`w-3.5 h-3.5 relative z-10 transition-colors duration-500 ${
                    isDevPatHovered ? 'text-white dark:text-slate-950' : 'text-slate-800 dark:text-slate-200'
                  }`} />
                  <span className={`relative z-10 transition-colors duration-500 ${
                    isDevPatHovered ? 'text-white dark:text-slate-950' : ''
                  }`}>
                    Use PAT
                  </span>
                </button>
              </div>
            )}
          </div>
        </section>
  
        {/* ── 2. Architecture Tiers & Quotas (Exact 4 Benefits per Tier) ── */}
        <section data-tour="profile-tiers" className="mt-0 mb-0">
          <div className="flex items-center justify-between mb-3.5 sm:mb-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Subscription Tiers
            </span>
  
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  window.dispatchEvent(new CustomEvent('cavdax:open-tour', { detail: { mode: 'profile' } }));
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/15 text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white text-[11px] font-mono transition-colors cursor-pointer group shadow-xs"
                title="Launch interactive tour for Profile & Quotas (Press T)"
              >
                <Compass className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 group-hover:rotate-45 transition-transform duration-300" />
                <span>Tour</span>
              </button>

              {/* Monochromatic Subtle Currency Switcher (USD / INR) */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/15 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => toggleCurrency('USD')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  currency === 'USD'
                    ? 'bg-white dark:bg-white/15 text-slate-950 dark:text-white font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => toggleCurrency('INR')}
                className={`px-2 py-0.5 rounded-md transition-all ${
                  currency === 'INR'
                    ? 'bg-white dark:bg-white/15 text-slate-950 dark:text-white font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                INR (₹)
              </button>
            </div>
            </div>
          </div>
  
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 lg:gap-8 items-stretch">
            {/* Tier 1: Community (Calm, Neutral Surface De-escalation) */}
            <div
              onPointerMove={handleCardPointerMove}
              onPointerLeave={handleCardPointerLeave}
              className={`group/card relative p-5 sm:p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                currentTier === 'free'
                  ? 'bg-slate-50/50 dark:bg-white/[0.02] border-slate-200 dark:border-white/15'
                  : 'bg-transparent border-slate-200 dark:border-white/15 hover:border-slate-400 dark:hover:border-white/30'
              }`}
            >
              {/* ── Substrate Specular Spotlight & Fine Blueprint Matrix ── */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden z-0" aria-hidden="true">
                <div
                  className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
                  style={{
                    maskImage: 'radial-gradient(190px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), black 0%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(190px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), black 0%, transparent 100%)',
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#64748b_1.2px,transparent_1.2px)] [background-size:14px_14px] opacity-20 dark:opacity-45" />
                </div>
                <div
                  className="absolute inset-0 opacity-0 group-hover/card:opacity-35 dark:group-hover/card:opacity-90 transition-opacity duration-300"
                  style={{
                    background: 'radial-gradient(220px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(255,255,255,0.06), transparent 70%)'
                  }}
                />
              </div>

              <div className="relative z-10">
                <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {/* 45-Degree Tilted Community Hackers / Group With Hat & Keyboard SVG */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0 transform -rotate-45"
                    aria-hidden="true"
                  >
                    <path d="M7 8h10" />
                    <path d="M8.5 8c0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5" />
                    <circle cx="5" cy="11" r="1.75" />
                    <path d="M2.5 17c0-2 1.5-3 3-3 .8 0 1.5.3 2 .8" />
                    <circle cx="19" cy="11" r="1.75" />
                    <path d="M21.5 17c0-2-1.5-3-3-3-.8 0-1.5.3-2 .8" />
                    <path d="M9 16c0-1.8 1.3-2.5 3-2.5s3 .7 3 2.5" />
                    <rect x="5" y="18" width="14" height="4.5" rx="1" fill="currentColor" fillOpacity="0.12" />
                    <line x1="8" y1="20" x2="8.01" y2="20" strokeWidth="2" />
                    <line x1="11" y1="20" x2="11.01" y2="20" strokeWidth="2" />
                    <line x1="14" y1="20" x2="14.01" y2="20" strokeWidth="2" />
                    <line x1="16.5" y1="20" x2="16.51" y2="20" strokeWidth="2" />
                  </svg>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Community
                  </span>
                </div>
                {currentTier === 'free' && (
                  <span className="text-[9px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-300/40 dark:border-white/10">
                    CURRENT PLAN
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold font-mono text-slate-950 dark:text-white mb-1">
                {currency === 'INR' ? '₹0' : '$0'} <span className="text-xs font-normal text-slate-500 font-sans">/ mo</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-medium mb-3">
                Free Forever · No Credit Card
              </div>
              <ul className="text-xs font-mono space-y-2 mb-6 text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>1 Connected repository</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>50 Causal verifications / mo</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>Read-only graph inspector</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>Standard stdio MCP protocol gate</span>
                </li>
              </ul>
              </div>
              <div className="relative z-10">
              <button
                onClick={() => handleTierSwitch('free')}
                disabled={currentTier === 'free'}
                onMouseEnter={() => setHoveredTierBtn('free')}
                onMouseLeave={() => setHoveredTierBtn(null)}
                className={`relative overflow-hidden group w-full h-9 flex items-center justify-center rounded-lg border text-xs font-mono font-semibold transition-all duration-300 ${
                  currentTier === 'free'
                    ? 'bg-slate-100 dark:bg-white/5 border-transparent text-slate-500 dark:text-slate-400 cursor-default'
                    : (hoveredTierBtn === 'free'
                        ? 'border-slate-600 dark:border-slate-400 text-white cursor-pointer shadow-xs'
                        : 'bg-transparent border-slate-300 dark:border-white/20 hover:border-slate-600 dark:hover:border-slate-400 text-slate-900 dark:text-white cursor-pointer')
                }`}
              >
                {currentTier !== 'free' && (
                  <div
                    aria-hidden="true"
                    style={{
                      transform: hoveredTierBtn === 'free' ? 'translateY(0%)' : 'translateY(105%)',
                      opacity: hoveredTierBtn === 'free' ? 1 : 0,
                      transition: hoveredTierBtn === 'free'
                        ? 'transform 900ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 200ms ease-out'
                        : 'opacity 250ms ease-out, transform 0s 250ms'
                    }}
                    className="absolute left-[-15%] right-[-15%] bottom-0 h-[260%] flex flex-col pointer-events-none z-0"
                  >
                    <svg viewBox="0 0 320 48" preserveAspectRatio="none" className="w-full h-6 shrink-0 text-slate-600 dark:text-slate-400 fill-current block">
                      <path d="M 0 24 Q 40 8, 80 20 T 160 15 T 240 22 T 320 12 L 320 48 L 0 48 Z" />
                      <circle cx="80" cy="20" r="4.5" />
                      <circle cx="120" cy="12" r="3.5" />
                      <circle cx="160" cy="15" r="5" />
                      <circle cx="200" cy="13" r="3.5" />
                      <circle cx="240" cy="22" r="4.5" />
                      <line x1="80" y1="20" x2="120" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                      <line x1="120" y1="12" x2="160" y2="15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                      <line x1="160" y1="15" x2="200" y2="13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                      <line x1="200" y1="13" x2="240" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    </svg>
                    <div className="flex-1 w-full bg-slate-600 dark:bg-slate-500" />
                  </div>
                )}
                <span className="relative z-10 transition-colors duration-300">
                  {currentTier === 'free' ? 'Current Plan' : (hasEvaluationPass ? (isHackathonMode ? 'Switch to Community' : 'Switch (Dev)') : 'Switch to Community')}
                </span>
              </button>
              </div>
            </div>
  
            {/* Tier 2: Pro Autonomous (Gated if unauthenticated, Elevated Featured Card) */}
            <div
              onPointerMove={handleCardPointerMove}
              onPointerLeave={handleCardPointerLeave}
              className={`group/card p-5 sm:p-6 xl:p-7 rounded-2xl border transition-all duration-300 xl:scale-[1.035] xl:-translate-y-2.5 xl:hover:-translate-y-4 relative z-10 flex flex-col justify-between shadow-[0_14px_38px_rgba(245,158,11,0.22)] hover:shadow-[0_24px_54px_rgba(245,158,11,0.30)] dark:shadow-[0_0_36px_rgba(245,158,11,0.18)] dark:hover:shadow-[0_0_50px_rgba(245,158,11,0.26)] ${
                currentTier === 'pro'
                  ? 'bg-amber-500/[0.04] dark:bg-[#1A150B] border-amber-400 ring-2 ring-amber-400/50'
                  : 'bg-slate-50/60 dark:bg-[#1A150B]/60 border-amber-400/80 ring-1 ring-amber-400/30 hover:border-amber-400'
              }`}
            >
              {/* ── Substrate Specular Spotlight & Fine Blueprint Matrix ── */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden z-0" aria-hidden="true">
                <div
                  className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
                  style={{
                    maskImage: 'radial-gradient(190px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), black 0%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(190px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), black 0%, transparent 100%)',
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#64748b_1.2px,transparent_1.2px)] [background-size:14px_14px] opacity-20 dark:opacity-45" />
                </div>
                <div
                  className="absolute inset-0 opacity-0 group-hover/card:opacity-35 dark:group-hover/card:opacity-90 transition-opacity duration-300"
                  style={{
                    background: 'radial-gradient(220px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(245,158,11,0.08), transparent 70%)'
                  }}
                />
              </div>

              {/* Top Floating Popular Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[9px] font-extrabold uppercase tracking-widest shadow-md flex items-center gap-1 z-20">
                <span>POPULAR</span>
              </div>
              <div className="relative z-10">
                <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {/* 45-Degree Tilted Premium Diamond SVG */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 transform -rotate-45"
                    aria-hidden="true"
                  >
                    <polygon points="6 3 18 3 22 9 12 22 2 9 6 3" fill="currentColor" fillOpacity="0.15" />
                    <line x1="2" y1="9" x2="22" y2="9" />
                    <line x1="6" y1="3" x2="10" y2="9" />
                    <line x1="18" y1="3" x2="14" y2="9" />
                    <line x1="10" y1="9" x2="12" y2="22" />
                    <line x1="14" y1="9" x2="12" y2="22" />
                    <circle cx="12" cy="22" r="1" fill="currentColor" />
                    <circle cx="6" cy="3" r="0.8" fill="currentColor" />
                    <circle cx="18" cy="3" r="0.8" fill="currentColor" />
                  </svg>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Pro Autonomous
                  </span>
                </div>
                {hasEvaluationPass ? (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-600/40 dark:border-amber-500/30">
                    {isHackathonMode ? 'EVALUATION PASS' : 'DEV ACCESS'}
                  </span>
                ) : (
                  <Lock className="w-3 h-3 text-slate-400" />
                )}
              </div>
              <div className="text-2xl font-bold font-mono text-slate-950 dark:text-white mb-1">
                {currency === 'INR' ? '₹320' : '$4'} <span className="text-xs font-normal text-slate-500 font-sans">/ mo</span>
              </div>
              <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-semibold mb-3">
                Includes 7-Day Free Pro Trial
              </div>
              <ul className="text-xs font-mono space-y-2 mb-6 text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>10 Connected repositories</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>1,000 Causal verifications / mo</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>CI/CD intercept &amp; pre-commit scanners</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Write-interception &amp; guided repair</span>
                </li>
              </ul>
              </div>
              <div className="relative z-10">
              <button
                onClick={() => handleTierSwitch('pro')}
                disabled={currentTier === 'pro'}
                onMouseEnter={() => setHoveredTierBtn('pro')}
                onMouseLeave={() => setHoveredTierBtn(null)}
                className={`relative overflow-hidden group w-full h-9 flex items-center justify-center rounded-lg border text-xs font-mono font-semibold transition-all duration-300 ${
                  currentTier === 'pro'
                    ? 'bg-amber-400/20 border-transparent text-amber-700 dark:text-amber-400 cursor-default'
                    : (hoveredTierBtn === 'pro'
                        ? 'border-amber-400 text-slate-950 font-bold cursor-pointer shadow-xs'
                        : 'bg-transparent border-slate-300 dark:border-white/20 hover:border-amber-400 text-slate-900 dark:text-white cursor-pointer')
                }`}
              >
                {currentTier !== 'pro' && (
                  <div
                    aria-hidden="true"
                    style={{
                      transform: hoveredTierBtn === 'pro' ? 'translateY(0%)' : 'translateY(105%)',
                      opacity: hoveredTierBtn === 'pro' ? 1 : 0,
                      transition: hoveredTierBtn === 'pro'
                        ? 'transform 900ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 200ms ease-out'
                        : 'opacity 250ms ease-out, transform 0s 250ms'
                    }}
                    className="absolute left-[-15%] right-[-15%] bottom-0 h-[260%] flex flex-col pointer-events-none z-0"
                  >
                    <svg viewBox="0 0 320 48" preserveAspectRatio="none" className="w-full h-6 shrink-0 text-amber-400 fill-current block">
                      <path d="M 0 24 Q 40 8, 80 20 T 160 15 T 240 22 T 320 12 L 320 48 L 0 48 Z" />
                      <circle cx="80" cy="20" r="4.5" />
                      <circle cx="120" cy="12" r="3.5" />
                      <circle cx="160" cy="15" r="5" />
                      <circle cx="200" cy="13" r="3.5" />
                      <circle cx="240" cy="22" r="4.5" />
                      <line x1="80" y1="20" x2="120" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                      <line x1="120" y1="12" x2="160" y2="15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                      <line x1="160" y1="15" x2="200" y2="13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                      <line x1="200" y1="13" x2="240" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    </svg>
                    <div className="flex-1 w-full bg-amber-400" />
                  </div>
                )}
                <span className="relative z-10 transition-colors duration-300 flex items-center gap-1.5">
                  {(!activeUser || !hasEvaluationPass) && currentTier !== 'pro' && <Lock className="w-3 h-3" />}
                  <span>
                    {currentTier === 'pro'
                      ? 'Current Plan'
                      : (isUpgrading
                          ? 'Connecting...'
                          : (hasEvaluationPass
                              ? (isHackathonMode ? 'Switch to Pro' : 'Switch (Dev)')
                              : (!activeUser ? 'Sign In to Activate'
                                  : `Upgrade (${currency === 'INR' ? '₹320' : '$4'}/mo)`)))}
                  </span>
                </span>
              </button>
              </div>
            </div>
  
            {/* Tier 3: Enterprise Mesh (Solid Deep Obsidian Purple Card Background) */}
            <div
              onPointerMove={handleCardPointerMove}
              onPointerLeave={handleCardPointerLeave}
              className={`group/card relative p-5 sm:p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                currentTier === 'enterprise'
                  ? 'bg-[#150a26] dark:bg-[#0f051d] border-purple-700/60 dark:border-purple-600/50 ring-1 ring-purple-500/30 shadow-sm'
                  : 'bg-transparent border-slate-200 dark:border-white/15 hover:border-purple-400/40'
              }`}
            >
              {/* ── Substrate Specular Spotlight & Fine Blueprint Matrix ── */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden z-0" aria-hidden="true">
                <div
                  className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
                  style={{
                    maskImage: 'radial-gradient(190px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), black 0%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(190px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), black 0%, transparent 100%)',
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#64748b_1.2px,transparent_1.2px)] [background-size:14px_14px] opacity-20 dark:opacity-45" />
                </div>
                <div
                  className="absolute inset-0 opacity-0 group-hover/card:opacity-35 dark:group-hover/card:opacity-90 transition-opacity duration-300"
                  style={{
                    background: 'radial-gradient(220px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(168,85,247,0.09), transparent 70%)'
                  }}
                />
              </div>

              <div className="relative z-10">
                <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {/* 45-Degree Tilted King Crown SVG */}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3.5 h-3.5 text-purple-400 shrink-0 transform -rotate-45"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 18h18l-2-11-4.5 4.5L12 4l-2.5 7.5L5 7l-2 11z"
                      fill="currentColor"
                      fillOpacity="0.2"
                    />
                    <line x1="4" y1="20" x2="20" y2="20" strokeWidth="1.8" />
                    <circle cx="12" cy="4" r="1.3" fill="currentColor" />
                    <circle cx="5" cy="7" r="1.1" fill="currentColor" />
                    <circle cx="19" cy="7" r="1.1" fill="currentColor" />
                  </svg>
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-400">
                    Enterprise Mesh
                  </span>
                </div>
                {hasEvaluationPass ? (
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    currentTier === 'enterprise'
                      ? 'bg-purple-500/25 text-purple-200 border-purple-400/40'
                      : 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40 dark:border-purple-500/30'
                  }`}>
                    {isHackathonMode ? 'EVALUATION PASS' : 'DEV ACCESS'}
                  </span>
                ) : (
                  <Lock className="w-3 h-3 text-slate-400" />
                )}
              </div>
              <div className={`text-2xl font-bold font-mono mb-1 ${
                currentTier === 'enterprise' ? 'text-white' : 'text-slate-950 dark:text-white'
              }`}>
                Custom <span className={`text-xs font-normal font-sans ${
                  currentTier === 'enterprise' ? 'text-purple-200/80' : 'text-slate-500'
                }`}>/ SLA</span>
              </div>
              <div className={`text-[10px] font-mono font-medium mb-3 ${
                currentTier === 'enterprise' ? 'text-purple-200/70' : 'text-purple-500 dark:text-purple-400'
              }`}>
                Tailored Infrastructure &amp; Multi-Tenant Keyspace
              </div>
              <ul className={`text-xs font-mono space-y-2 mb-6 ${
                currentTier === 'enterprise' ? 'text-purple-100/90' : 'text-slate-600 dark:text-slate-300'
              }`}>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Unlimited connected repositories</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Isolated tenant graph keyspace</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Org OAuth &amp; signed audit ledger</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>High-availability SLA &amp; team support</span>
                </li>
              </ul>
              </div>
              <div className="relative z-10">
              <button
                onClick={() => handleTierSwitch('enterprise')}
                disabled={currentTier === 'enterprise'}
                onMouseEnter={() => setHoveredTierBtn('enterprise')}
                onMouseLeave={() => setHoveredTierBtn(null)}
                className={`relative overflow-hidden group w-full h-9 flex items-center justify-center rounded-lg border text-xs font-mono font-semibold transition-all duration-300 ${
                  currentTier === 'enterprise'
                    ? 'bg-purple-600/30 border-purple-400/60 text-purple-100 font-semibold cursor-default shadow-xs'
                    : (hoveredTierBtn === 'enterprise'
                        ? 'border-purple-600 dark:border-purple-400 text-white cursor-pointer shadow-xs'
                        : 'bg-transparent border-slate-300 dark:border-white/20 hover:border-slate-950 dark:hover:border-white text-slate-900 dark:text-white cursor-pointer')
                }`}
              >
                {currentTier !== 'enterprise' && (
                  <div
                    aria-hidden="true"
                    style={{
                      transform: hoveredTierBtn === 'enterprise' ? 'translateY(0%)' : 'translateY(105%)',
                      opacity: hoveredTierBtn === 'enterprise' ? 1 : 0,
                      transition: hoveredTierBtn === 'enterprise'
                        ? 'transform 900ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 200ms ease-out'
                        : 'opacity 250ms ease-out, transform 0s 250ms'
                    }}
                    className="absolute left-[-15%] right-[-15%] bottom-0 h-[260%] flex flex-col pointer-events-none z-0"
                  >
                    <svg viewBox="0 0 320 48" preserveAspectRatio="none" className="w-full h-6 shrink-0 text-purple-400 fill-current block">
                      <path d="M 0 24 Q 40 8, 80 20 T 160 15 T 240 22 T 320 12 L 320 48 L 0 48 Z" />
                      <circle cx="80" cy="20" r="4.5" />
                      <circle cx="120" cy="12" r="3.5" />
                      <circle cx="160" cy="15" r="5" />
                      <circle cx="200" cy="13" r="3.5" />
                      <circle cx="240" cy="22" r="4.5" />
                      <line x1="80" y1="20" x2="120" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                      <line x1="120" y1="12" x2="160" y2="15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                      <line x1="160" y1="15" x2="200" y2="13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                      <line x1="200" y1="13" x2="240" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    </svg>
                    <div className="flex-1 w-full bg-[#1e1035] dark:bg-[#180b2d]" />
                  </div>
                )}
                <span className="relative z-10 transition-colors duration-300 flex items-center gap-1.5">
                  {(!activeUser || !hasEvaluationPass) && currentTier !== 'enterprise' && <Lock className="w-3 h-3" />}
                  <span>
                    {currentTier === 'enterprise'
                      ? 'Current Plan'
                      : (hasEvaluationPass
                          ? (isHackathonMode ? 'Switch to Enterprise' : 'Switch (Dev)')
                          : (!activeUser ? 'Sign In to Activate'
                              : 'Upgrade (Custom)'))}
                  </span>
                </span>
              </button>
              </div>
            </div>
          </div>
        </section>
  
        {/* ── 3. Real-Time Metrics & API Credentials ── */}
        <section className="mt-6 sm:mt-8 lg:mt-10 xl:mt-14 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 mb-3 sm:mb-4">
          {/* Plan Quota & Consumption */}
          <div data-tour="profile-quotas" className="p-4 sm:p-4.5 lg:p-5 rounded-xl border border-slate-200/80 dark:border-white/15 bg-slate-900/[0.02] dark:bg-white/[0.02] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Gauge className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Plan Quota &amp; Usage
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-700 dark:text-slate-300 font-medium">
                  {decisionsCapacity === -1
                    ? 'Unlimited Capacity (SLA)'
                    : `${capacityPct}% Capacity (${userDecisionsCount}/${decisionsCapacity.toLocaleString()})`}
                </span>
              </div>
  
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden mb-3 sm:mb-3.5">
                <div
                  className="h-full rounded-full bg-slate-950 dark:bg-white transition-all duration-500"
                  style={{ width: decisionsCapacity === -1 ? '100%' : `${capacityPct}%` }}
                />
              </div>
            </div>
  
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs font-mono">
              <div className="py-1.5 sm:py-2 px-2.5 rounded-lg border border-slate-200/60 dark:border-white/5 bg-slate-100/60 dark:bg-white/[0.02] flex flex-col justify-center">
                <span className="text-[8px] text-slate-500 uppercase tracking-tight block mb-0.5">Repos</span>
                <span className="text-xs font-bold text-slate-950 dark:text-white leading-tight">
                  {connectedRepoCount} <span className="text-[10px] font-normal text-slate-500">/ {repoLimit}</span>
                </span>
              </div>
              <div className="py-1.5 sm:py-2 px-2.5 rounded-lg border border-slate-200/60 dark:border-white/5 bg-slate-100/60 dark:bg-white/[0.02] flex flex-col justify-center">
                <span className="text-[8px] text-slate-500 uppercase tracking-tight block mb-0.5">Decisions</span>
                <span className="text-xs font-bold text-slate-950 dark:text-white leading-tight">
                  {userDecisionsCount} <span className="text-[10px] font-normal text-slate-500">/ {decisionsCapacity === -1 ? '∞' : decisionsCapacity.toLocaleString()}</span>
                </span>
              </div>
              <div className="py-1.5 sm:py-2 px-2.5 rounded-lg border border-slate-200/60 dark:border-white/5 bg-slate-100/60 dark:bg-white/[0.02] flex flex-col justify-center">
                <span className="text-[8px] text-slate-500 uppercase tracking-tight block mb-0.5">MCP Gate</span>
                <span className="text-xs font-bold text-slate-950 dark:text-white leading-tight truncate">{mcpRateLimit}</span>
              </div>
              <div className="py-1.5 sm:py-2 px-2.5 rounded-lg border border-slate-200/60 dark:border-white/5 bg-slate-100/60 dark:bg-white/[0.02] flex flex-col justify-center">
                <span className="text-[8px] text-slate-500 uppercase tracking-tight block mb-0.5">Cycle</span>
                <span className="text-xs font-bold text-slate-950 dark:text-white leading-tight">
                  {daysRemaining}d <span className="text-[10px] font-normal text-slate-500">left</span>
                </span>
              </div>
            </div>
          </div>
  
          {/* API Credentials */}
          <div data-tour="profile-api-key" className="p-4 sm:p-4.5 lg:p-5 rounded-xl border border-slate-200/80 dark:border-white/15 bg-slate-900/[0.02] dark:bg-white/[0.02] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <KeyRound className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    MCP Agent API Key
                  </span>
                </div>
                {user && (
                  <div className="flex items-center text-[10px] font-mono text-slate-500">
                    <button
                      onClick={handleRotateKey}
                      className="hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                      title="Rotate API Key"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${isRotating ? 'animate-spin' : ''}`} />
                      <span>Rotate Key</span>
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-sans mb-2.5 sm:mb-3 truncate">
                Bearer authentication key for Cursor, Claude Code, and Windsurf MCP connections.
              </p>
            </div>
  
            {isRevokedNotice && user && (
              <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 shadow-xs">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-700 dark:text-rose-300">
                  <span className="font-bold">Emergency Revocation Notice:</span> All credentials across the network were invalidated by administrator emergency response. Please click <button onClick={handleRotateKey} className="font-bold underline hover:text-rose-950 dark:hover:text-white cursor-pointer">Rotate Key</button> to generate a replacement token.
                </div>
              </div>
            )}
  
            {!user ? (
              <div className="py-2.5 px-3.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-dashed border-slate-300 dark:border-white/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate">
                    Sign in to access your API key
                  </span>
                </div>
                <button
                  onClick={() => {
                    playClick();
                    window.location.href = '/api/auth/github?returnTo=/profile';
                  }}
                  className="h-7 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 tactile-btn shadow-xs"
                >
                  <Github className="w-3 h-3" />
                  <span>Connect GitHub</span>
                </button>
              </div>
            ) : (
              <div className="py-2.5 px-3.5 rounded-xl bg-slate-900 text-white font-mono text-xs border border-slate-800 flex items-center justify-between gap-3 shadow-inner">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span className="text-slate-500 select-none text-[11px] font-mono">$</span>
                  <code className="truncate text-[11px] font-bold text-amber-300 tracking-wide font-mono">
                    {isLoadingKey
                      ? 'Retrieving cryptographic key...'
                      : (isRevokedNotice && !apiKey
                          ? 'REVOKED — Action Required: Rotate Key'
                          : (isKeyRevealed
                              ? apiKey
                              : (apiKey ? `${apiKey.slice(0, 16)}••••••••••••••••${apiKey.slice(-4)}` : 'No key generated')))}
                  </code>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {apiKey && (
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setIsKeyRevealed(!isKeyRevealed);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                      title={isKeyRevealed ? "Mask Key" : "Reveal Key"}
                    >
                      {isKeyRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button
                    onClick={handleCopyApiKey}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0"
                    title="Copy API Key"
                  >
                    {copiedKey ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">COPIED</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>COPY</span>
                      </>
                    )}
                  </button>
                  {onOpenMcpPage && (
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        onOpenMcpPage();
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0"
                      title="Open MCP Setup Guide"
                      aria-label="Open MCP Setup Guide"
                    >
                      <Cable className="w-3 h-3 text-slate-400" />
                      <span>SETUP</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
  
        {/* Monochromatic Fading Toast */}
        {toastMsg && (
          <div
            role="status"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-mono font-semibold shadow-2xl border border-slate-800 dark:border-white/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 pointer-events-none"
          >
            <span>{toastMsg}</span>
          </div>
        )}
      </div>
    );
  }

  // 2. Compact Layout (Optimized for HP Victus 1536x864 & laptops with height <= 864px)
  return (
    <div className="flex-1 min-h-0 overflow-y-auto pt-14 sm:pt-16 pb-4 sm:pb-6 px-4 sm:px-6 max-w-6xl mx-auto w-full select-none flex flex-col justify-between [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      
      {/* ── 1. Top Identity & Account State (Frameless, Spacious, Centered Elegance) ── */}
      <section className="text-center mt-0 sm:mt-1 pt-1 pb-2 sm:pb-2.5 relative flex flex-col items-center shrink-0">
        {/* Large Concentric Avatar (Centered, Frameless, Tier-Ring Halo) */}
        <div className="relative mt-2 sm:mt-3 mb-1.5 sm:mb-2 flex justify-center">
          <div className="relative">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 lg:w-16 lg:h-16 xl:w-20 xl:h-20 rounded-full overflow-hidden transition-all duration-500 bg-slate-100 dark:bg-white/5 ${tierRingStyles[currentTier] || tierRingStyles.free}`}>
              {(activeUser?.avatar_url || activeUser?.avatarUrl || activeUser?.avatar) ? (
                <ShimmerImage
                  src={activeUser?.avatar_url || activeUser?.avatarUrl || activeUser?.avatar}
                  alt={user.login || 'User Avatar'}
                  containerClassName="h-full w-full rounded-full"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-mono font-bold text-slate-400 text-2xl sm:text-3xl">
                  {userInitial}
                </div>
              )}
            </div>

            {/* Micro Tier Badge Floating Over Bottom-Right of Avatar (Authentic Tier SVGs) */}
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-1 shadow-sm border border-slate-200/80 dark:border-white/15">
              <div className="w-5 h-5 rounded-full flex items-center justify-center">
                {currentTier === 'enterprise' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-purple-500 dark:text-purple-400 shrink-0 transform -rotate-45" aria-hidden="true">
                    <path d="M3 18h18l-2-11-4.5 4.5L12 4l-2.5 7.5L5 7l-2 11z" fill="currentColor" fillOpacity="0.25" />
                    <line x1="4" y1="20" x2="20" y2="20" strokeWidth="1.8" />
                    <circle cx="12" cy="4" r="1.3" fill="currentColor" />
                  </svg>
                ) : currentTier === 'pro' ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0 transform -rotate-45" aria-hidden="true">
                    <polygon points="6 3 18 3 22 9 12 22 2 9 6 3" fill="currentColor" fillOpacity="0.25" />
                    <line x1="2" y1="9" x2="22" y2="9" />
                    <line x1="10" y1="9" x2="12" y2="22" />
                    <line x1="14" y1="9" x2="12" y2="22" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3 h-3 text-slate-600 dark:text-slate-400 shrink-0 transform -rotate-45"
                    aria-hidden="true"
                  >
                    <path d="M7 8h10" />
                    <path d="M8.5 8c0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5" />
                    <circle cx="5" cy="11" r="1.75" />
                    <path d="M2.5 17c0-2 1.5-3 3-3 .8 0 1.5.3 2 .8" />
                    <circle cx="19" cy="11" r="1.75" />
                    <path d="M21.5 17c0-2-1.5-3-3-3-.8 0-1.5.3-2 .8" />
                    <path d="M9 16c0-1.8 1.3-2.5 3-2.5s3 .7 3 2.5" />
                    <rect x="5" y="18" width="14" height="4.5" rx="1" fill="currentColor" fillOpacity="0.25" />
                    <line x1="8" y1="20" x2="8.01" y2="20" strokeWidth="2" />
                    <line x1="11" y1="20" x2="11.01" y2="20" strokeWidth="2" />
                    <line x1="14" y1="20" x2="14.01" y2="20" strokeWidth="2" />
                    <line x1="16.5" y1="20" x2="16.51" y2="20" strokeWidth="2" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Identity & Verified Handle */}
        <h1 className="text-sm sm:text-base font-bold font-mono tracking-tight text-slate-950 dark:text-white leading-tight">
          {activeUser?.name || activeUser?.login || 'Local Contributor'}
        </h1>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
          {activeUser ? `@${activeUser.login} • GitHub Verified` : 'Unauthenticated Sandbox Session'}
        </p>

        

        {/* Centered Actions Row: Support Us & Account State (Sleek, Wave Fill Cohesion) */}
        <div className="mt-1.5 sm:mt-2 flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
          {/* Support Us Button with Rose Fluid Wave Fill */}
          <button
            onClick={() => {
              playClick();
              if (onOpenSupportPage) onOpenSupportPage();
            }}
            onMouseEnter={() => setIsSponsorHovered(true)}
            onMouseLeave={() => setIsSponsorHovered(false)}
            className={`relative overflow-hidden group h-8 sm:h-8.5 min-w-[125px] sm:min-w-[135px] px-3.5 sm:px-4 flex items-center justify-center gap-2 rounded-lg border text-[11px] sm:text-xs font-mono font-semibold transition-all duration-500 cursor-pointer tactile-btn shadow-xs select-none ${
              isSponsorHovered
                ? 'border-rose-500 dark:border-rose-400 text-white shadow-rose-500/20'
                : 'bg-slate-100 dark:bg-white/5 border-slate-300/80 dark:border-white/20 text-slate-700 dark:text-slate-300 hover:border-rose-400 dark:hover:border-rose-400'
            }`}
            title="Support the CAVDAX open-source project"
          >
            {/* Fluid Water Fill Layer */}
            <div
              aria-hidden="true"
              style={{
                transform: isSponsorHovered ? 'translateY(0%)' : 'translateY(105%)',
                opacity: isSponsorHovered ? 1 : 0,
                transition: isSponsorHovered
                  ? 'transform 1000ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 200ms ease-out'
                  : 'opacity 250ms ease-out, transform 0s 250ms'
              }}
              className="absolute left-[-15%] right-[-15%] bottom-0 h-[260%] flex flex-col pointer-events-none z-0"
            >
              <svg
                viewBox="0 0 320 48"
                preserveAspectRatio="none"
                className="w-full h-6 shrink-0 text-rose-500 dark:text-rose-600 fill-current block"
              >
                <path d="M 0 24 Q 40 8, 80 20 T 160 15 T 240 22 T 320 12 L 320 48 L 0 48 Z" />
                <circle cx="80" cy="20" r="4.5" />
                <circle cx="120" cy="12" r="3.5" />
                <circle cx="160" cy="15" r="5" />
                <circle cx="200" cy="13" r="3.5" />
                <circle cx="240" cy="22" r="4.5" />
                <line x1="80" y1="20" x2="120" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                <line x1="120" y1="12" x2="160" y2="15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                <line x1="160" y1="15" x2="200" y2="13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                <line x1="200" y1="13" x2="240" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
              </svg>
              <div className="flex-1 w-full bg-rose-500 dark:bg-rose-600" />
            </div>

            <Heart className={`w-3.5 h-3.5 relative z-10 transition-colors duration-500 ${
              isSponsorHovered ? 'text-white fill-white' : 'text-rose-500'
            }`} />
            <span className={`relative z-10 transition-colors duration-500 ${
              isSponsorHovered ? 'text-white' : ''
            }`}>
              Support Us
            </span>
          </button>

          {/* Account Action: Log Out (if user) OR Connect GitHub (with Monochrome Fluid Wave Fill) */}
          {activeUser ? (
            <button
              onClick={handleLogout}
              onMouseEnter={() => setIsLogoutHovered(true)}
              onMouseLeave={() => setIsLogoutHovered(false)}
              className={`relative overflow-hidden group h-8 sm:h-8.5 min-w-[120px] sm:min-w-[130px] px-3.5 sm:px-4 rounded-lg border text-[11px] sm:text-xs font-mono font-semibold transition-all duration-500 cursor-pointer tactile-btn shadow-xs select-none flex items-center justify-center gap-2 ${
                isLogoutHovered
                  ? 'border-rose-500 dark:border-rose-400 text-white shadow-rose-500/20'
                  : 'border-rose-500/50 dark:border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
              title="Sign out of current GitHub session"
            >
              {/* Fluid Water Fill Layer */}
              <div
                aria-hidden="true"
                style={{
                  transform: isLogoutHovered ? 'translateY(0%)' : 'translateY(105%)',
                  opacity: isLogoutHovered ? 1 : 0,
                  transition: isLogoutHovered
                    ? 'transform 1000ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 200ms ease-out'
                    : 'opacity 250ms ease-out, transform 0s 250ms'
                }}
                className="absolute left-[-15%] right-[-15%] bottom-0 h-[260%] flex flex-col pointer-events-none z-0"
              >
                <svg
                  viewBox="0 0 320 48"
                  preserveAspectRatio="none"
                  className="w-full h-6 shrink-0 text-rose-600 fill-current block"
                >
                  <path d="M 0 24 Q 40 8, 80 20 T 160 15 T 240 22 T 320 12 L 320 48 L 0 48 Z" />
                  <circle cx="80" cy="20" r="4.5" />
                  <circle cx="120" cy="12" r="3.5" />
                  <circle cx="160" cy="15" r="5" />
                  <circle cx="200" cy="13" r="3.5" />
                  <circle cx="240" cy="22" r="4.5" />
                  <line x1="80" y1="20" x2="120" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                  <line x1="120" y1="12" x2="160" y2="15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                  <line x1="160" y1="15" x2="200" y2="13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                  <line x1="200" y1="13" x2="240" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                </svg>
                <div className="flex-1 w-full bg-rose-600" />
              </div>

              <LogOut className={`w-3.5 h-3.5 relative z-10 transition-colors duration-500 ${
                isLogoutHovered ? 'text-white' : 'text-rose-600 dark:text-rose-400'
              }`} />
              <span className={`relative z-10 transition-colors duration-500 ${
                isLogoutHovered ? 'text-white' : ''
              }`}>
                Log Out
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  playClick();
                  window.location.href = '/api/auth/github?returnTo=/profile';
                }}
                onMouseEnter={() => setIsGithubHovered(true)}
                onMouseLeave={() => setIsGithubHovered(false)}
                className={`relative overflow-hidden group h-8 sm:h-8.5 min-w-[125px] px-3 rounded-lg border text-[11px] sm:text-xs font-mono font-semibold transition-all duration-500 cursor-pointer tactile-btn shadow-xs select-none flex items-center justify-center gap-1.5 ${
                  isGithubHovered
                    ? 'border-slate-950 dark:border-white text-white dark:text-slate-950 shadow-slate-950/20 dark:shadow-white/20'
                    : 'bg-slate-100 dark:bg-white/5 border-slate-300/80 dark:border-white/20 text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-white/40'
                }`}
                title="Connect with GitHub OAuth"
              >
                <div
                  aria-hidden="true"
                  style={{
                    transform: isGithubHovered ? 'translateY(0%)' : 'translateY(105%)',
                    opacity: isGithubHovered ? 1 : 0,
                    transition: isGithubHovered
                      ? 'transform 1000ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 200ms ease-out'
                      : 'opacity 250ms ease-out, transform 0s 250ms'
                  }}
                  className="absolute left-[-15%] right-[-15%] bottom-0 h-[260%] flex flex-col pointer-events-none z-0"
                >
                  <svg
                    viewBox="0 0 320 48"
                    preserveAspectRatio="none"
                    className="w-full h-6 shrink-0 text-slate-950 dark:text-white fill-current block"
                  >
                    <path d="M 0 24 Q 40 8, 80 20 T 160 15 T 240 22 T 320 12 L 320 48 L 0 48 Z" />
                    <circle cx="80" cy="20" r="4.5" />
                    <circle cx="120" cy="12" r="3.5" />
                    <circle cx="160" cy="15" r="5" />
                    <circle cx="200" cy="13" r="3.5" />
                    <circle cx="240" cy="22" r="4.5" />
                    <line x1="80" y1="20" x2="120" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="120" y1="12" x2="160" y2="15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="160" y1="15" x2="200" y2="13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="200" y1="13" x2="240" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                  </svg>
                  <div className="flex-1 w-full bg-slate-950 dark:bg-white" />
                </div>

                <Github className={`w-3.5 h-3.5 relative z-10 transition-colors duration-500 ${
                  isGithubHovered ? 'text-white dark:text-slate-950' : 'text-slate-800 dark:text-slate-200'
                }`} />
                <span className={`relative z-10 transition-colors duration-500 ${
                  isGithubHovered ? 'text-white dark:text-slate-950' : ''
                }`}>
                  Connect GitHub
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClick();
                  setIsDevPatModalOpen(true);
                }}
                onMouseEnter={() => setIsDevPatHovered(true)}
                onMouseLeave={() => setIsDevPatHovered(false)}
                className={`relative overflow-hidden group h-8 sm:h-8.5 px-3 rounded-lg border text-[11px] sm:text-xs font-mono font-semibold transition-all duration-500 cursor-pointer tactile-btn shadow-xs select-none flex items-center justify-center gap-1.5 shrink-0 ${
                  isDevPatHovered
                    ? 'border-slate-950 dark:border-white text-white dark:text-slate-950 shadow-slate-950/20 dark:shadow-white/20'
                    : 'bg-slate-100 dark:bg-white/5 border-slate-300/80 dark:border-white/20 text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-white/40'
                }`}
                title="Use Personal Access Token (for local development)"
              >
                <div
                  aria-hidden="true"
                  style={{
                    transform: isDevPatHovered ? 'translateY(0%)' : 'translateY(105%)',
                    opacity: isDevPatHovered ? 1 : 0,
                    transition: isDevPatHovered
                      ? 'transform 1000ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 200ms ease-out'
                      : 'opacity 250ms ease-out, transform 0s 250ms'
                  }}
                  className="absolute left-[-15%] right-[-15%] bottom-0 h-[260%] flex flex-col pointer-events-none z-0"
                >
                  <svg
                    viewBox="0 0 320 48"
                    preserveAspectRatio="none"
                    className="w-full h-6 shrink-0 text-slate-950 dark:text-white fill-current block"
                  >
                    <path d="M 0 24 Q 40 8, 80 20 T 160 15 T 240 22 T 320 12 L 320 48 L 0 48 Z" />
                    <circle cx="80" cy="20" r="4.5" />
                    <circle cx="120" cy="12" r="3.5" />
                    <circle cx="160" cy="15" r="5" />
                    <circle cx="200" cy="13" r="3.5" />
                    <circle cx="240" cy="22" r="4.5" />
                    <line x1="80" y1="20" x2="120" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="120" y1="12" x2="160" y2="15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="160" y1="15" x2="200" y2="13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="200" y1="13" x2="240" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                  </svg>
                  <div className="flex-1 w-full bg-slate-950 dark:bg-white" />
                </div>

                <KeyRound className={`w-3.5 h-3.5 relative z-10 transition-colors duration-500 ${
                  isDevPatHovered ? 'text-white dark:text-slate-950' : 'text-slate-800 dark:text-slate-200'
                }`} />
                <span className={`relative z-10 transition-colors duration-500 ${
                  isDevPatHovered ? 'text-white dark:text-slate-950' : ''
                }`}>
                  Use PAT
                </span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── 2. Architecture Tiers & Quotas (Exact 4 Benefits per Tier) ── */}
      <section data-tour="profile-tiers" className="mt-0 mb-0">
        <div className="flex items-center justify-between mb-2 sm:mb-2.5">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Subscription Tiers
          </span>

          {/* Monochromatic Subtle Currency Switcher (USD / INR) */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/15 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => toggleCurrency('USD')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                currency === 'USD'
                  ? 'bg-white dark:bg-white/15 text-slate-950 dark:text-white font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              USD ($)
            </button>
            <button
              type="button"
              onClick={() => toggleCurrency('INR')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                currency === 'INR'
                  ? 'bg-white dark:bg-white/15 text-slate-950 dark:text-white font-bold shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              INR (₹)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-4 xl:gap-5 items-stretch">
          {/* Tier 1: Community (Calm, Neutral Surface De-escalation) */}
          <div
            onPointerMove={handleCardPointerMove}
            onPointerLeave={handleCardPointerLeave}
            className={`group/card relative p-3.5 sm:p-4 lg:p-4 xl:p-4.5 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between ${
              currentTier === 'free'
                ? 'bg-slate-50/50 dark:bg-white/[0.02] border-slate-200 dark:border-white/10'
                : 'bg-transparent border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30'
            }`}
          >
              {/* ── Substrate Specular Spotlight & Fine Blueprint Matrix ── */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden z-0" aria-hidden="true">
                <div
                  className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
                  style={{
                    maskImage: 'radial-gradient(190px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), black 0%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(190px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), black 0%, transparent 100%)',
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#64748b_1.2px,transparent_1.2px)] [background-size:14px_14px] opacity-20 dark:opacity-45" />
                </div>
                <div
                  className="absolute inset-0 opacity-0 group-hover/card:opacity-35 dark:group-hover/card:opacity-90 transition-opacity duration-300"
                  style={{
                    background: 'radial-gradient(220px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(255,255,255,0.06), transparent 70%)'
                  }}
                />
              </div>

            <div className="relative z-10">
              <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {/* 45-Degree Tilted Community Hackers / Group With Hat & Keyboard SVG */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400 shrink-0 transform -rotate-45"
                  aria-hidden="true"
                >
                  <path d="M7 8h10" />
                  <path d="M8.5 8c0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5" />
                  <circle cx="5" cy="11" r="1.75" />
                  <path d="M2.5 17c0-2 1.5-3 3-3 .8 0 1.5.3 2 .8" />
                  <circle cx="19" cy="11" r="1.75" />
                  <path d="M21.5 17c0-2-1.5-3-3-3-.8 0-1.5.3-2 .8" />
                  <path d="M9 16c0-1.8 1.3-2.5 3-2.5s3 .7 3 2.5" />
                  <rect x="5" y="18" width="14" height="4.5" rx="1" fill="currentColor" fillOpacity="0.12" />
                  <line x1="8" y1="20" x2="8.01" y2="20" strokeWidth="2" />
                  <line x1="11" y1="20" x2="11.01" y2="20" strokeWidth="2" />
                  <line x1="14" y1="20" x2="14.01" y2="20" strokeWidth="2" />
                  <line x1="16.5" y1="20" x2="16.51" y2="20" strokeWidth="2" />
                </svg>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Community
                </span>
              </div>
              {currentTier === 'free' && (
                <span className="text-[9px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-300/40 dark:border-white/10">
                  CURRENT PLAN
                </span>
              )}
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-950 dark:text-white mb-0.5">
              {currency === 'INR' ? '₹0' : '$0'} <span className="text-xs font-normal text-slate-500 font-sans">/ mo</span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-medium mb-2 sm:mb-2.5">
              Free Forever · No Credit Card
            </div>
            <ul className="text-[11px] sm:text-xs font-mono space-y-1 sm:space-y-1.5 mb-3 sm:mb-4 text-slate-600 dark:text-slate-300 flex-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>1 Connected repository</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>50 Causal verifications / mo</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>Read-only graph inspector</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <span>Standard stdio MCP protocol gate</span>
              </li>
            </ul>
            </div>
            <div className="relative z-10">
            <button
              onClick={() => handleTierSwitch('free')}
              disabled={currentTier === 'free'}
              onMouseEnter={() => setHoveredTierBtn('free')}
              onMouseLeave={() => setHoveredTierBtn(null)}
              className={`relative overflow-hidden group w-full h-8 flex items-center justify-center rounded-lg border text-[11px] sm:text-xs font-mono font-semibold transition-all duration-300 ${
                currentTier === 'free'
                  ? 'bg-slate-100 dark:bg-white/5 border-transparent text-slate-500 dark:text-slate-400 cursor-default'
                  : (hoveredTierBtn === 'free'
                      ? 'border-slate-600 dark:border-slate-400 text-white cursor-pointer shadow-xs'
                      : 'bg-transparent border-slate-300 dark:border-white/20 hover:border-slate-600 dark:hover:border-slate-400 text-slate-900 dark:text-white cursor-pointer')
              }`}
            >
              {currentTier !== 'free' && (
                <div
                  aria-hidden="true"
                  style={{
                    transform: hoveredTierBtn === 'free' ? 'translateY(0%)' : 'translateY(105%)',
                    opacity: hoveredTierBtn === 'free' ? 1 : 0,
                    transition: hoveredTierBtn === 'free'
                      ? 'transform 900ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 200ms ease-out'
                      : 'opacity 250ms ease-out, transform 0s 250ms'
                  }}
                  className="absolute left-[-15%] right-[-15%] bottom-0 h-[260%] flex flex-col pointer-events-none z-0"
                >
                  <svg viewBox="0 0 320 48" preserveAspectRatio="none" className="w-full h-6 shrink-0 text-slate-600 dark:text-slate-400 fill-current block">
                    <path d="M 0 24 Q 40 8, 80 20 T 160 15 T 240 22 T 320 12 L 320 48 L 0 48 Z" />
                    <circle cx="80" cy="20" r="4.5" />
                    <circle cx="120" cy="12" r="3.5" />
                    <circle cx="160" cy="15" r="5" />
                    <circle cx="200" cy="13" r="3.5" />
                    <circle cx="240" cy="22" r="4.5" />
                    <line x1="80" y1="20" x2="120" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="120" y1="12" x2="160" y2="15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="160" y1="15" x2="200" y2="13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="200" y1="13" x2="240" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                  </svg>
                  <div className="flex-1 w-full bg-slate-600 dark:bg-slate-500" />
                </div>
              )}
              <span className="relative z-10 transition-colors duration-300">
                {currentTier === 'free' ? 'Current Plan' : (hasEvaluationPass ? (isHackathonMode ? 'Switch to Community' : 'Switch (Dev)') : 'Switch to Community')}
              </span>
            </button>
            </div>
          </div>

          {/* Tier 2: Pro Autonomous (Gated if unauthenticated, Elevated Featured Card) */}
          <div
            onPointerMove={handleCardPointerMove}
            onPointerLeave={handleCardPointerLeave}
            className={`group/card p-3.5 sm:p-4 lg:p-4 xl:p-4.5 rounded-xl sm:rounded-2xl border transition-all duration-300 xl:scale-[1.015] xl:-translate-y-1 xl:hover:-translate-y-2 relative z-10 flex flex-col justify-between shadow-[0_14px_38px_rgba(245,158,11,0.22)] hover:shadow-[0_24px_54px_rgba(245,158,11,0.30)] dark:shadow-[0_0_36px_rgba(245,158,11,0.18)] dark:hover:shadow-[0_0_50px_rgba(245,158,11,0.26)] ${
              currentTier === 'pro'
                ? 'bg-amber-500/[0.04] dark:bg-[#1A150B] border-amber-400 ring-2 ring-amber-400/50'
                : 'bg-slate-50/60 dark:bg-[#1A150B]/60 border-amber-400/80 ring-1 ring-amber-400/30 hover:border-amber-400'
            }`}
          >
              {/* ── Substrate Specular Spotlight & Fine Blueprint Matrix ── */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden z-0" aria-hidden="true">
                <div
                  className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
                  style={{
                    maskImage: 'radial-gradient(190px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), black 0%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(190px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), black 0%, transparent 100%)',
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#64748b_1.2px,transparent_1.2px)] [background-size:14px_14px] opacity-20 dark:opacity-45" />
                </div>
                <div
                  className="absolute inset-0 opacity-0 group-hover/card:opacity-35 dark:group-hover/card:opacity-90 transition-opacity duration-300"
                  style={{
                    background: 'radial-gradient(220px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(245,158,11,0.08), transparent 70%)'
                  }}
                />
              </div>

            {/* Top Floating Popular Badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[9px] font-extrabold uppercase tracking-widest shadow-md flex items-center gap-1 z-20">
              <span>POPULAR</span>
            </div>
            <div className="relative z-10">
              <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {/* 45-Degree Tilted Premium Diamond SVG */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 transform -rotate-45"
                  aria-hidden="true"
                >
                  <polygon points="6 3 18 3 22 9 12 22 2 9 6 3" fill="currentColor" fillOpacity="0.15" />
                  <line x1="2" y1="9" x2="22" y2="9" />
                  <line x1="6" y1="3" x2="10" y2="9" />
                  <line x1="18" y1="3" x2="14" y2="9" />
                  <line x1="10" y1="9" x2="12" y2="22" />
                  <line x1="14" y1="9" x2="12" y2="22" />
                  <circle cx="12" cy="22" r="1" fill="currentColor" />
                  <circle cx="6" cy="3" r="0.8" fill="currentColor" />
                  <circle cx="18" cy="3" r="0.8" fill="currentColor" />
                </svg>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Pro Autonomous
                </span>
              </div>
              {hasEvaluationPass ? (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-600/40 dark:border-amber-500/30">
                  {isHackathonMode ? 'EVALUATION PASS' : 'DEV ACCESS'}
                </span>
              ) : (
                <Lock className="w-3 h-3 text-slate-400" />
              )}
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-950 dark:text-white mb-0.5">
              {currency === 'INR' ? '₹320' : '$4'} <span className="text-xs font-normal text-slate-500 font-sans">/ mo</span>
            </div>
            <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-semibold mb-2 sm:mb-2.5">
              Includes 7-Day Free Pro Trial
            </div>
            <ul className="text-[11px] sm:text-xs font-mono space-y-1 sm:space-y-1.5 mb-3 sm:mb-4 text-slate-600 dark:text-slate-300 flex-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>10 Connected repositories</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>1,000 Causal verifications / mo</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>CI/CD intercept &amp; pre-commit scanners</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Write-interception &amp; guided repair</span>
              </li>
            </ul>
            </div>
            <div className="relative z-10">
            <button
              onClick={() => handleTierSwitch('pro')}
              disabled={currentTier === 'pro'}
              onMouseEnter={() => setHoveredTierBtn('pro')}
              onMouseLeave={() => setHoveredTierBtn(null)}
              className={`relative overflow-hidden group w-full h-8 flex items-center justify-center rounded-lg border text-[11px] sm:text-xs font-mono font-semibold transition-all duration-300 ${
                currentTier === 'pro'
                  ? 'bg-amber-400/20 border-transparent text-amber-700 dark:text-amber-400 cursor-default'
                  : (hoveredTierBtn === 'pro'
                      ? 'border-amber-400 text-slate-950 font-bold cursor-pointer shadow-xs'
                      : 'bg-transparent border-slate-300 dark:border-white/20 hover:border-amber-400 text-slate-900 dark:text-white cursor-pointer')
              }`}
            >
              {currentTier !== 'pro' && (
                <div
                  aria-hidden="true"
                  style={{
                    transform: hoveredTierBtn === 'pro' ? 'translateY(0%)' : 'translateY(105%)',
                    opacity: hoveredTierBtn === 'pro' ? 1 : 0,
                    transition: hoveredTierBtn === 'pro'
                      ? 'transform 900ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 200ms ease-out'
                      : 'opacity 250ms ease-out, transform 0s 250ms'
                  }}
                  className="absolute left-[-15%] right-[-15%] bottom-0 h-[260%] flex flex-col pointer-events-none z-0"
                >
                  <svg viewBox="0 0 320 48" preserveAspectRatio="none" className="w-full h-6 shrink-0 text-amber-400 fill-current block">
                    <path d="M 0 24 Q 40 8, 80 20 T 160 15 T 240 22 T 320 12 L 320 48 L 0 48 Z" />
                    <circle cx="80" cy="20" r="4.5" />
                    <circle cx="120" cy="12" r="3.5" />
                    <circle cx="160" cy="15" r="5" />
                    <circle cx="200" cy="13" r="3.5" />
                    <circle cx="240" cy="22" r="4.5" />
                    <line x1="80" y1="20" x2="120" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="120" y1="12" x2="160" y2="15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="160" y1="15" x2="200" y2="13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="200" y1="13" x2="240" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                  </svg>
                  <div className="flex-1 w-full bg-amber-400" />
                </div>
              )}
              <span className="relative z-10 transition-colors duration-300 flex items-center gap-1.5">
                {(!activeUser || !hasEvaluationPass) && currentTier !== 'pro' && <Lock className="w-3 h-3" />}
                <span>
                  {currentTier === 'pro'
                    ? 'Current Plan'
                    : (isUpgrading
                        ? 'Connecting...'
                        : (hasEvaluationPass
                            ? (isHackathonMode ? 'Switch to Pro' : 'Switch (Dev)')
                            : (!activeUser ? 'Sign In to Activate'
                                : `Upgrade (${currency === 'INR' ? '₹320' : '$4'}/mo)`)))}
                </span>
              </span>
            </button>
            </div>
          </div>

          {/* Tier 3: Enterprise Mesh (Solid Deep Obsidian Purple Card Background) */}
          <div
            onPointerMove={handleCardPointerMove}
            onPointerLeave={handleCardPointerLeave}
            className={`group/card relative p-3.5 sm:p-4 lg:p-4 xl:p-4.5 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between ${
              currentTier === 'enterprise'
                ? 'bg-[#150a26] dark:bg-[#0f051d] border-purple-700/60 dark:border-purple-600/50 ring-1 ring-purple-500/30 shadow-sm'
                : 'bg-transparent border-slate-200 dark:border-white/15 hover:border-purple-400/40'
            }`}
          >
              {/* ── Substrate Specular Spotlight & Fine Blueprint Matrix ── */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden z-0" aria-hidden="true">
                <div
                  className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"
                  style={{
                    maskImage: 'radial-gradient(190px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), black 0%, transparent 100%)',
                    WebkitMaskImage: 'radial-gradient(190px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), black 0%, transparent 100%)',
                  }}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#64748b_1.2px,transparent_1.2px)] [background-size:14px_14px] opacity-20 dark:opacity-45" />
                </div>
                <div
                  className="absolute inset-0 opacity-0 group-hover/card:opacity-35 dark:group-hover/card:opacity-90 transition-opacity duration-300"
                  style={{
                    background: 'radial-gradient(220px circle at var(--mouse-x, -999px) var(--mouse-y, -999px), rgba(168,85,247,0.09), transparent 70%)'
                  }}
                />
              </div>

            <div className="relative z-10">
              <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {/* 45-Degree Tilted King Crown SVG */}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5 text-purple-400 shrink-0 transform -rotate-45"
                  aria-hidden="true"
                >
                  <path
                    d="M3 18h18l-2-11-4.5 4.5L12 4l-2.5 7.5L5 7l-2 11z"
                    fill="currentColor"
                    fillOpacity="0.2"
                  />
                  <line x1="4" y1="20" x2="20" y2="20" strokeWidth="1.8" />
                  <circle cx="12" cy="4" r="1.3" fill="currentColor" />
                  <circle cx="5" cy="7" r="1.1" fill="currentColor" />
                  <circle cx="19" cy="7" r="1.1" fill="currentColor" />
                </svg>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-400">
                  Enterprise Mesh
                </span>
              </div>
              {hasEvaluationPass ? (
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                  currentTier === 'enterprise'
                    ? 'bg-purple-500/25 text-purple-200 border-purple-400/40'
                    : 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/40 dark:border-purple-500/30'
                }`}>
                  {isHackathonMode ? 'EVALUATION PASS' : 'DEV ACCESS'}
                </span>
              ) : (
                <Lock className="w-3 h-3 text-slate-400" />
              )}
            </div>
            <div className={`text-xl sm:text-2xl font-bold font-mono mb-0.5 ${
              currentTier === 'enterprise' ? 'text-white' : 'text-slate-950 dark:text-white'
            }`}>
              Custom <span className={`text-xs font-normal font-sans ${
                currentTier === 'enterprise' ? 'text-purple-200/80' : 'text-slate-500'
              }`}>/ SLA</span>
            </div>
            <div className={`text-[10px] font-mono font-medium mb-2 sm:mb-2.5 ${
              currentTier === 'enterprise' ? 'text-purple-200/70' : 'text-purple-500 dark:text-purple-400'
            }`}>
              Tailored Infrastructure &amp; Multi-Tenant Keyspace
            </div>
            <ul className={`text-[11px] sm:text-xs font-mono space-y-1 sm:space-y-1.5 mb-3 sm:mb-4 flex-1 ${
              currentTier === 'enterprise' ? 'text-purple-100/90' : 'text-slate-600 dark:text-slate-300'
            }`}>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Unlimited connected repositories</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Isolated tenant graph keyspace</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Org OAuth &amp; signed audit ledger</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>High-availability SLA &amp; team support</span>
              </li>
            </ul>
            </div>
            <div className="relative z-10">
            <button
              onClick={() => handleTierSwitch('enterprise')}
              disabled={currentTier === 'enterprise'}
              onMouseEnter={() => setHoveredTierBtn('enterprise')}
              onMouseLeave={() => setHoveredTierBtn(null)}
              className={`relative overflow-hidden group w-full h-8 flex items-center justify-center rounded-lg border text-[11px] sm:text-xs font-mono font-semibold transition-all duration-300 ${
                currentTier === 'enterprise'
                  ? 'bg-purple-600/30 border-purple-400/60 text-purple-100 font-semibold cursor-default shadow-xs'
                  : (hoveredTierBtn === 'enterprise'
                      ? 'border-purple-600 dark:border-purple-400 text-white cursor-pointer shadow-xs'
                      : 'bg-transparent border-slate-300 dark:border-white/20 hover:border-slate-950 dark:hover:border-white text-slate-900 dark:text-white cursor-pointer')
              }`}
            >
              {currentTier !== 'enterprise' && (
                <div
                  aria-hidden="true"
                  style={{
                    transform: hoveredTierBtn === 'enterprise' ? 'translateY(0%)' : 'translateY(105%)',
                    opacity: hoveredTierBtn === 'enterprise' ? 1 : 0,
                    transition: hoveredTierBtn === 'enterprise'
                      ? 'transform 900ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 200ms ease-out'
                      : 'opacity 250ms ease-out, transform 0s 250ms'
                  }}
                  className="absolute left-[-15%] right-[-15%] bottom-0 h-[260%] flex flex-col pointer-events-none z-0"
                >
                  <svg viewBox="0 0 320 48" preserveAspectRatio="none" className="w-full h-6 shrink-0 text-purple-400 fill-current block">
                    <path d="M 0 24 Q 40 8, 80 20 T 160 15 T 240 22 T 320 12 L 320 48 L 0 48 Z" />
                    <circle cx="80" cy="20" r="4.5" />
                    <circle cx="120" cy="12" r="3.5" />
                    <circle cx="160" cy="15" r="5" />
                    <circle cx="200" cy="13" r="3.5" />
                    <circle cx="240" cy="22" r="4.5" />
                    <line x1="80" y1="20" x2="120" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="120" y1="12" x2="160" y2="15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="160" y1="15" x2="200" y2="13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="200" y1="13" x2="240" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                  </svg>
                  <div className="flex-1 w-full bg-[#1e1035] dark:bg-[#180b2d]" />
                </div>
              )}
              <span className="relative z-10 transition-colors duration-300 flex items-center gap-1.5">
                {(!activeUser || !hasEvaluationPass) && currentTier !== 'enterprise' && <Lock className="w-3 h-3" />}
                <span>
                  {currentTier === 'enterprise'
                    ? 'Current Plan'
                    : (hasEvaluationPass
                        ? (isHackathonMode ? 'Switch to Enterprise' : 'Switch (Dev)')
                        : (!activeUser ? 'Sign In to Activate'
                            : 'Upgrade (Custom)'))}
                </span>
              </span>
            </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Real-Time Metrics & API Credentials ── */}
      <section className="mt-3 sm:mt-3.5 lg:mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-1 sm:mb-2 shrink-0">
        {/* Plan Quota & Consumption */}
        <div data-tour="profile-quotas" className="p-3 sm:p-3.5 lg:p-3.5 rounded-xl border border-slate-200/80 dark:border-white/15 bg-slate-900/[0.02] dark:bg-white/[0.02] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Gauge className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Plan Quota &amp; Usage
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-700 dark:text-slate-300 font-medium">
                {decisionsCapacity === -1
                  ? 'Unlimited Capacity (SLA)'
                  : `${capacityPct}% Capacity (${userDecisionsCount}/${decisionsCapacity.toLocaleString()})`}
              </span>
            </div>

            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden mb-2 sm:mb-2.5">
              <div
                className="h-full rounded-full bg-slate-950 dark:bg-white transition-all duration-500"
                style={{ width: decisionsCapacity === -1 ? '100%' : `${capacityPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-xs font-mono">
            <div className="py-1 sm:py-1.5 px-2 rounded-lg border border-slate-200/60 dark:border-white/5 bg-slate-100/60 dark:bg-white/[0.02] flex flex-col justify-center">
              <span className="text-[8px] text-slate-500 uppercase tracking-tight block mb-0.5">Repos</span>
              <span className="text-xs font-bold text-slate-950 dark:text-white leading-tight">
                {connectedRepoCount} <span className="text-[10px] font-normal text-slate-500">/ {repoLimit}</span>
              </span>
            </div>
            <div className="py-1 sm:py-1.5 px-2 rounded-lg border border-slate-200/60 dark:border-white/5 bg-slate-100/60 dark:bg-white/[0.02] flex flex-col justify-center">
              <span className="text-[8px] text-slate-500 uppercase tracking-tight block mb-0.5">Decisions</span>
              <span className="text-xs font-bold text-slate-950 dark:text-white leading-tight">
                {userDecisionsCount} <span className="text-[10px] font-normal text-slate-500">/ {decisionsCapacity === -1 ? '∞' : decisionsCapacity.toLocaleString()}</span>
              </span>
            </div>
            <div className="py-1 sm:py-1.5 px-2 rounded-lg border border-slate-200/60 dark:border-white/5 bg-slate-100/60 dark:bg-white/[0.02] flex flex-col justify-center">
              <span className="text-[8px] text-slate-500 uppercase tracking-tight block mb-0.5">MCP Gate</span>
              <span className="text-xs font-bold text-slate-950 dark:text-white leading-tight truncate">{mcpRateLimit}</span>
            </div>
            <div className="py-1 sm:py-1.5 px-2 rounded-lg border border-slate-200/60 dark:border-white/5 bg-slate-100/60 dark:bg-white/[0.02] flex flex-col justify-center">
              <span className="text-[8px] text-slate-500 uppercase tracking-tight block mb-0.5">Cycle</span>
              <span className="text-xs font-bold text-slate-950 dark:text-white leading-tight">
                {daysRemaining}d <span className="text-[10px] font-normal text-slate-500">left</span>
              </span>
            </div>
          </div>
        </div>

        {/* API Credentials */}
        <div data-tour="profile-api-key" className="p-3 sm:p-3.5 lg:p-3.5 rounded-xl border border-slate-200/80 dark:border-white/15 bg-slate-900/[0.02] dark:bg-white/[0.02] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <KeyRound className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  MCP Agent API Key
                </span>
              </div>
              {user && (
                <div className="flex items-center text-[10px] font-mono text-slate-500">
                  <button
                    onClick={handleRotateKey}
                    className="hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                    title="Rotate API Key"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isRotating ? 'animate-spin' : ''}`} />
                    <span>Rotate Key</span>
                  </button>
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans mb-2 truncate">
              Bearer authentication key for Cursor, Claude Code, and Windsurf MCP connections.
            </p>
          </div>

          {isRevokedNotice && user && (
            <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-700 dark:text-rose-300">
                <span className="font-bold">Emergency Revocation Notice:</span> All credentials across the network were invalidated by administrator emergency response. Please click <button onClick={handleRotateKey} className="font-bold underline hover:text-rose-950 dark:hover:text-white cursor-pointer">Rotate Key</button> to generate a replacement token.
              </div>
            </div>
          )}

          {!user ? (
            <div className="py-2.5 px-3.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-dashed border-slate-300 dark:border-white/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate">
                  Sign in to access your API key
                </span>
              </div>
              <button
                onClick={() => {
                  playClick();
                  window.location.href = '/api/auth/github?returnTo=/profile';
                }}
                className="h-7 px-3 rounded-lg bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 tactile-btn shadow-xs"
              >
                <Github className="w-3 h-3" />
                <span>Connect GitHub</span>
              </button>
            </div>
          ) : (
            <div className="py-1.5 sm:py-2 px-3 rounded-lg bg-slate-900 text-white font-mono text-xs border border-slate-800 flex items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span className="text-slate-500 select-none text-[11px] font-mono">$</span>
                <code className="truncate text-[11px] font-bold text-amber-300 tracking-wide font-mono">
                  {isLoadingKey
                    ? 'Retrieving cryptographic key...'
                    : (isRevokedNotice && !apiKey
                        ? 'REVOKED — Action Required: Rotate Key'
                        : (isKeyRevealed
                            ? apiKey
                            : (apiKey ? `${apiKey.slice(0, 16)}••••••••••••••••${apiKey.slice(-4)}` : 'No key generated')))}
                </code>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {apiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setIsKeyRevealed(!isKeyRevealed);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title={isKeyRevealed ? "Mask Key" : "Reveal Key"}
                  >
                    {isKeyRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                )}
                <button
                  onClick={handleCopyApiKey}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0"
                  title="Copy API Key"
                >
                  {copiedKey ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>COPY</span>
                    </>
                  )}
                </button>
                {onOpenMcpPage && (
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      onOpenMcpPage();
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0"
                    title="Open MCP Setup Guide"
                    aria-label="Open MCP Setup Guide"
                  >
                    <Cable className="w-3 h-3 text-slate-400" />
                    <span>SETUP</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Monochromatic Fading Toast */}
      {toastMsg && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-mono font-semibold shadow-2xl border border-slate-800 dark:border-white/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 pointer-events-none"
        >
          <span>{toastMsg}</span>
        </div>
      )}
          {/* Dev PAT Login Modal for Local Development Authentication */}
      <DevPatLoginModal
        isOpen={isDevPatModalOpen}
        onClose={() => setIsDevPatModalOpen(false)}
        onLoginSuccess={(userData) => {
          setUser(userData);
          setIsDevPatModalOpen(false);
          showToast(`Signed in as ${userData.login || 'Local Contributor'} via Dev PAT`);
        }}
      />
    </div>
  );
}