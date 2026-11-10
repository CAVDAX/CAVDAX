import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertOctagon, Loader2, X } from 'lucide-react';
import { playClick } from '../utils/soundFx';

/**
 * Accessible Murphy's Law Confirmation Dialog
 *
 * Strict Compliance with docs/UI_DESIGN_SYSTEM.md:
 * - §1.9: Strict Ban on generic shield icons (Uses AlertOctagon / AlertTriangle)
 * - §59.2: Modal Portal Hoisting to document.body via createPortal
 * - §68.1: Universal Spring-Loaded Dialog Physics (<AnimatePresence> + 0.95 scale + 12px y)
 * - §14: Continuous Super-Ellipse Curvature (n = 4.4)
 * - §16: Defensive Murphy's Law Friction (Focus on Cancel, typed matching, Escape dismissal)
 *
 * @param {boolean} isOpen - Whether the dialog is visible
 * @param {() => void} onClose - Safe dismissal callback
 * @param {() => Promise<void> | void} onConfirm - Action callback
 * @param {string} title - Dialog title
 * @param {string} description - Explanation of destructive consequences
 * @param {string} [requireMatch] - Optional string user must type to enable confirm
 * @param {string} [confirmLabel='Confirm Action'] - Label for destructive button
 * @param {'danger' | 'warning' | 'neutral'} [severity='danger'] - Visual tone
 */
export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  requireMatch,
  confirmLabel = 'Confirm Action',
  severity = 'danger',
}) {
  const [inputValue, setInputValue] = useState('');
  const [isPending, setIsPending] = useState(false);
  const cancelBtnRef = useRef(null);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);

  // Lock body scroll while dialog is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setInputValue('');
    setIsPending(false);

    // Defensive focus: input if match required, otherwise Cancel button (NEVER destructive action)
    const timer = setTimeout(() => {
      if (requireMatch && inputRef.current) {
        inputRef.current.focus();
      } else if (cancelBtnRef.current) {
        cancelBtnRef.current.focus();
      }
    }, 50);

    return () => {
      document.body.style.overflow = prevOverflow;
      clearTimeout(timer);
    };
  }, [isOpen, requireMatch]);

  // Keyboard Escape & Focus Trapping
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isPending) {
        e.preventDefault();
        playClick();
        onClose();
        return;
      }

      // Trap Tab key focus inside dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
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
  }, [isOpen, isPending, onClose]);

  const canConfirm = requireMatch ? inputValue.trim() === requireMatch.trim() : true;

  const handleConfirmClick = async () => {
    if (!canConfirm || isPending) return;
    playClick();
    setIsPending(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('[ConfirmationDialog] Action execution failed:', err);
    } finally {
      setIsPending(false);
    }
  };

  const isDanger = severity === 'danger';

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
                onClose();
              }
            }}
          />

          {/* Modal Window with High-Damped Spring (§68.1 & §59.2) */}
          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl"
            style={{
              borderRadius: '24px', // Continuous Super-Ellipse optical curvature
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => {
                playClick();
                onClose();
              }}
              disabled={isPending}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              aria-label="Cancel and close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-3.5 mb-3.5">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  isDanger
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}
              >
                {/* Clean Precision Icons (§1.9: No ShieldAlert) */}
                {isDanger ? <AlertOctagon className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              </div>
              <div className="pr-6">
                <h2 id="confirm-dialog-title" className="text-base font-semibold text-slate-900 dark:text-white">
                  {title}
                </h2>
                <p id="confirm-dialog-desc" className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {description}
                </p>
              </div>
            </div>

            {/* Typed Confirmation Friction */}
            {requireMatch && (
              <div className="my-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80">
                <label className="block text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1.5">
                  Type <span className="font-bold text-slate-900 dark:text-white select-all">{requireMatch}</span> to confirm:
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={requireMatch}
                  disabled={isPending}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 dark:focus:ring-rose-400/30"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canConfirm && !isPending) {
                      e.preventDefault();
                      handleConfirmClick();
                    }
                  }}
                />
              </div>
            )}

            {/* Action Buttons: Cancel is safely placed first in keyboard navigation */}
            <div className="mt-6 flex items-center justify-end gap-3 pt-2">
              <button
                ref={cancelBtnRef}
                type="button"
                onClick={() => {
                  playClick();
                  onClose();
                }}
                disabled={isPending}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmClick}
                disabled={!canConfirm || isPending}
                className={`px-4 py-2 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 ${
                  canConfirm && !isPending
                    ? isDanger
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer'
                      : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm cursor-pointer'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-transparent'
                }`}
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{confirmLabel}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
}
