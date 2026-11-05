import React, { useState, useEffect, useRef } from 'react';
import {
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  X,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { playClick, playApprovalChime } from '../utils/soundFx';

/**
 * DevPatLoginModal.jsx — Local Personal Access Token (PAT) Authentication Modal
 *
 * Provides full localhost / offline development capability without requiring
 * an external GitHub OAuth application registration.
 *
 * Adheres strictly to UI_DESIGN_SYSTEM.md:
 * - 0 Unicode emojis (strictly Lucide icons)
 * - Monochromatic palette with calibrated semantic tints
 * - Fast kinetic physics (100–150ms)
 * - Accessible keyboard navigation & focus states
 */
export default function DevPatLoginModal({
  isOpen,
  onClose,
  onSuccess
}) {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      setToken('');
      setShowToken(false);
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        playClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanToken = token.trim();
    if (!cleanToken) {
      setErrorMessage('Please enter a GitHub Personal Access Token.');
      return;
    }

    if (cleanToken.length < 10) {
      setErrorMessage('Token is too short to be a valid GitHub token.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    playClick();

    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ token: cleanToken })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || data.error || 'Authentication failed. Please verify your token.');
        setIsLoading(false);
        return;
      }

      playApprovalChime();

      const user = data.user;
      try {
        localStorage.setItem(
          'cavdax_user_session',
          JSON.stringify({
            username: user.login,
            name: user.name,
            avatarUrl: user.avatarUrl,
            connectedAt: new Date().toISOString()
          })
        );
      } catch {}

      window.dispatchEvent(
        new CustomEvent('cavdax:user-changed', {
          detail: {
            login: user.login,
            name: user.name || user.login,
            avatarUrl: user.avatarUrl || '',
            role: 'user'
          }
        })
      );

      if (onSuccess) {
        onSuccess(user);
      }
      onClose();
    } catch (err) {
      setErrorMessage('Failed to connect to authentication server: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150"
      onClick={() => {
        playClick();
        onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/15 shadow-2xl overflow-hidden flex flex-col font-mono select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950 flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-950 dark:text-white">
                Dev PAT Authentication
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                Localhost gateway for personal access tokens
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playClick();
              onClose();
            }}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          <div className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Offline / Localhost Capability</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
              Bypasses GitHub OAuth redirect restrictions by authenticating directly with a personal token. Required scope: <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-[10px]">repo</code>.
            </p>
            <div className="pt-1">
              <a
                href="https://github.com/settings/tokens/new?scopes=repo&description=CAVDAX%20Local%20Dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white underline decoration-slate-300 dark:decoration-white/20 inline-flex items-center gap-1 font-mono transition-colors"
              >
                <span>Generate token on GitHub</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* Token Input */}
          <div className="space-y-1.5">
            <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-400">
              Personal Access Token
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showToken ? 'text' : 'password'}
                placeholder="ghp_... or github_pat_..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
                spellCheck="false"
                className="w-full h-9 pl-3 pr-10 rounded-lg border border-slate-200 dark:border-white/15 bg-slate-100/60 dark:bg-white/5 text-xs text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-white/30 font-mono select-text cursor-text"
              />
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setShowToken(!showToken);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                aria-label={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-lg border border-rose-500/25 bg-rose-500/5 dark:bg-rose-500/10 flex items-start gap-2 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="font-sans leading-normal">{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                playClick();
                onClose();
              }}
              disabled={isLoading}
              className="px-3.5 h-8 rounded-lg text-xs font-mono font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !token.trim()}
              className="px-4 h-8 rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-mono font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Validating...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Authenticate Token</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
