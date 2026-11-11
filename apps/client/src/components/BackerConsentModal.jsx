import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, UserCheck, Heart, Lock, Check, X, Loader2 } from 'lucide-react';
import { playClick } from '../utils/soundFx';

/**
 * Backer Recognition & Consent Modal
 *
 * Strict Compliance with docs/UI_DESIGN_SYSTEM.md:
 * - §1.2: Strict Ban on Gemini Sparkles (Uses Heart & Clean SVGs)
 * - §1.9: Strict Ban on generic shield SVGs (Uses Lock for private mode)
 * - §59.2: Modal Portal Hoisting to document.body via createPortal
 * - §68.1: Universal Spring-Loaded Dialog Physics (<AnimatePresence> + high-damped spring)
 * - §80.1: Clean Modal Header Typography (Zero floating bracketed badges)
 * - §14: Continuous Super-Ellipse Geometry (Gabriel Lamé n=4.4 feel)
 *
 * Enforces explicit patron consent (GDPR / DPDP compliance) before
 * featuring backer profiles or quotes on the public Backer Sphere.
 */
export default function BackerConsentModal({
  isOpen,
  onClose,
  backer,
  onSave,
}) {
  const [visibility, setVisibility] = useState('public');
  const [displayName, setDisplayName] = useState('');
  const [quote, setQuote] = useState('');
  const [isPending, setIsPending] = useState(false);
  const saveBtnRef = useRef(null);
  const modalRef = useRef(null);

  // Sync backer data on open
  useEffect(() => {
    if (!isOpen || !backer) return;
    setVisibility(backer.visibility || 'public');
    setDisplayName(backer.name || backer.backer_name || '');
    setQuote(backer.quote || '');
    setIsPending(false);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      if (saveBtnRef.current) {
        saveBtnRef.current.focus();
      }
    }, 50);

    return () => {
      document.body.style.overflow = prevOverflow;
      clearTimeout(timer);
    };
  }, [isOpen, backer]);

  // Escape Key & Focus Trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isPending) {
        e.preventDefault();
        playClick();
        // Safe default: anonymous presentation if dismissed
        handleSavePayload('anonymous');
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPending, visibility, displayName, quote, backer]);

  const handleSavePayload = async (overrideVisibility) => {
    const finalVisibility = overrideVisibility || visibility;
    setIsPending(true);
    try {
      const payload = {
        backer_id: backer?.id || backer?.sponsorId,
        sponsorId: backer?.id || backer?.sponsorId,
        visibility: finalVisibility,
        display_name: displayName.trim() || backer?.name || 'Anonymous Patron',
        displayName: displayName.trim() || backer?.name || 'Anonymous Patron',
        backer_message: quote.trim().slice(0, 60),
        quote: quote.trim().slice(0, 60),
      };

      if (onSave) {
        await onSave(payload);
      }
      onClose();
    } catch (err) {
      console.error('[BackerConsentModal] Consent saving failed:', err);
    } finally {
      setIsPending(false);
    }
  };

  const tierTitle = backer?.tierName || (backer?.tier_id === 3 ? 'Core Patron' : backer?.tier_id === 2 ? '2 Cups' : 'Cookie');

  const modalNode = (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4"
          aria-hidden="false"
        >
          {/* Backdrop with 200ms opacity fade (§68.1) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/75 dark:bg-black/80 backdrop-blur-md"
            onClick={() => {
              if (!isPending) {
                playClick();
                handleSavePayload('anonymous');
              }
            }}
          />

          {/* Modal Window with High-Damped Spring (§68.1 & §59.2) */}
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="consent-modal-title"
            aria-describedby="consent-modal-desc"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative z-10 w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-6 sm:p-7 shadow-2xl select-text"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Dismiss Button */}
            <button
              onClick={() => {
                playClick();
                handleSavePayload('anonymous');
              }}
              disabled={isPending}
              className="absolute top-5 right-5 w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              aria-label="Close and save as anonymous"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Modal Header: Clean Monochromatic Architecture */}
            <div className="flex items-start gap-3 mb-6 pr-6">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-900 dark:text-white shrink-0 mt-0.5">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 id="consent-modal-title" className="text-base sm:text-lg font-mono font-bold text-slate-950 dark:text-white tracking-tight">
                  Backer Recognition
                </h2>
                <p id="consent-modal-desc" className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-sans">
                  Choose how your contribution as a {tierTitle} is attributed across the verified community showcase.
                </p>
              </div>
            </div>

            {/* Options Substrate */}
            <div className="space-y-2.5 mb-6">
              {/* Option 1: Public Recognition */}
              <div
                className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  visibility === 'public'
                    ? 'border-slate-950 dark:border-white bg-slate-100/60 dark:bg-white/[0.04] shadow-xs'
                    : 'border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-transparent'
                }`}
                onClick={() => {
                  playClick();
                  setVisibility('public');
                }}
              >
                <div className="flex items-start gap-3">
                  {/* Custom Minimalist Radio Indicator */}
                  <div className="pt-0.5">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      visibility === 'public'
                        ? 'border-slate-950 dark:border-white bg-slate-950 dark:bg-white'
                        : 'border-slate-300 dark:border-white/30 bg-transparent'
                    }`}>
                      {visibility === 'public' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-950" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5 text-slate-900 dark:text-white shrink-0" />
                      <span className="text-xs font-mono font-semibold text-slate-950 dark:text-white">
                        Public Backer Sphere
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal font-sans">
                      Display your name, avatar, and optional note on our verified 3D backer sphere showcase.
                    </p>

                    {/* Expandable fields for Public profile */}
                    {visibility === 'public' && (
                      <div
                        className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-white/10 space-y-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div>
                          <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                            Display Name
                          </label>
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="e.g. Satoshi or @github_handle"
                            maxLength={40}
                            className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-slate-950 dark:text-white focus:outline-none focus:border-slate-950 dark:focus:border-white transition-colors"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                              Public Note
                            </label>
                            <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                              {quote.length}/60
                            </span>
                          </div>
                          <input
                            type="text"
                            value={quote}
                            onChange={(e) => setQuote(e.target.value)}
                            placeholder="e.g. Supporting open-source causal engineering"
                            maxLength={60}
                            className="w-full px-3 py-1.5 text-xs font-mono rounded-lg bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/20 text-slate-950 dark:text-white focus:outline-none focus:border-slate-950 dark:focus:border-white transition-colors"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Option 2: Anonymous */}
              <div
                className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  visibility === 'anonymous'
                    ? 'border-slate-950 dark:border-white bg-slate-100/60 dark:bg-white/[0.04] shadow-xs'
                    : 'border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-transparent'
                }`}
                onClick={() => {
                  playClick();
                  setVisibility('anonymous');
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-0.5">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      visibility === 'anonymous'
                        ? 'border-slate-950 dark:border-white bg-slate-950 dark:bg-white'
                        : 'border-slate-300 dark:border-white/30 bg-transparent'
                    }`}>
                      {visibility === 'anonymous' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-950" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <EyeOff className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
                      <span className="text-xs font-mono font-semibold text-slate-950 dark:text-white">
                        Anonymous Backer
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal font-sans">
                      Display on the 3D sphere as "Anonymous Patron" with your tier badge. Avatar and identity remain hidden.
                    </p>
                  </div>
                </div>
              </div>

              {/* Option 3: Private */}
              <div
                className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  visibility === 'private'
                    ? 'border-slate-950 dark:border-white bg-slate-100/60 dark:bg-white/[0.04] shadow-xs'
                    : 'border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-transparent'
                }`}
                onClick={() => {
                  playClick();
                  setVisibility('private');
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="pt-0.5">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      visibility === 'private'
                        ? 'border-slate-950 dark:border-white bg-slate-950 dark:bg-white'
                        : 'border-slate-300 dark:border-white/30 bg-transparent'
                    }`}>
                      {visibility === 'private' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-950" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
                      <span className="text-xs font-mono font-semibold text-slate-950 dark:text-white">
                        Private (Do Not List)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal font-sans">
                      Completely unlisted from the public 3D sphere. In-app features and tier access remain fully active.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions: Monochromatic High-Contrast */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  handleSavePayload('anonymous');
                }}
                disabled={isPending}
                className="px-3.5 py-2 text-xs font-mono text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
              >
                Remain Anonymous
              </button>

              <button
                ref={saveBtnRef}
                type="button"
                onClick={() => handleSavePayload()}
                disabled={isPending}
                className="px-4 py-2 text-xs font-mono font-semibold rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Preference</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
}
