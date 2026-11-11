/**
 * SubsystemErrorBoundary.jsx — CAVDAX Global React 18 Error Boundary
 *
 * Roadmap §6.2 & OWASP Error Handling Invariant:
 * Every top-level view (AuditPage, DevConsolePage, GraphCanvas, ConnectMcpPage,
 * SupportPage, SponsorsPage, TierBenefitsPage) is isolated in a localized Error Boundary:
 *
 * 1. Hosted Web App (Production / Vercel / Remote):
 *    - Strict Information Leakage Prevention: Raw stack traces, source file paths, and internal
 *      state logs are completely suppressed from the UI (logged safely to client console).
 *    - Displays Remco Stoeten's interactive EmptyState (21st.dev/@remcostoeten/components/interactive-empty-state/error)
 *      with animated 3-icon triad and tactile "Restore Subsystem" recovery action.
 *
 * 2. Localhost Environment (Development):
 *    - Developer Diagnostics: Retains the double-bezel developer recovery card with collapsible
 *      technical details and live component stack trace for immediate root-cause inspection.
 *
 * In both modes:
 *    - Header and navigation stay fully operational.
 *    - Page does not crash or blank out.
 *    - Local state resets without a destructive browser reload.
 */

import React from 'react';
import { AlertTriangle, RotateCcw, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import EmptyState from './ui/EmptyState';

export default class SubsystemErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to console for dev telemetry — never expose un-sanitized internal stacks in hosted UI
    console.error(`[CAVDAX SubsystemErrorBoundary] Caught in "${this.props.name || 'subsystem'}":`, error, errorInfo);
  }

  handleReloadView = () => {
    // Reset boundary state — React will re-render the children from scratch
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.silentFallback) {
      return null;
    }

    if (this.props.fallback) {
      return typeof this.props.fallback === 'function' ? this.props.fallback(this.state.error, this.handleReloadView) : this.props.fallback;
    }

    const { name = 'Subsystem' } = this.props;
    const { error, errorInfo, showDetails } = this.state;

    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '::1');

    const isDark =
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark');

    // ── Hosted Production Web App Mode: Interactive EmptyState (Zero Information Leakage) ──
    if (!isLocalhost) {
      return (
        <div className="flex-1 min-h-[460px] flex items-center justify-center p-6 bg-[var(--bg-main,#ffffff)] dark:bg-[#0d0d0f] select-none">
          <EmptyState
            theme={isDark ? 'dark' : 'light'}
            variant="error"
            title={`${name} Temporarily Unavailable`}
            description={`An unexpected operational event was safely isolated within the ${name} module. Navigation and other subsystems remain fully operational.`}
            icons={[
              <AlertCircle className="w-5 h-5 text-rose-500/80" />,
              <AlertTriangle className="w-5 h-5 text-amber-500/80" />,
              <RotateCcw className="w-5 h-5 text-slate-500/80" />
            ]}
            action={{
              label: 'Restore Subsystem',
              icon: <RotateCcw className="w-3.5 h-3.5" />,
              onClick: this.handleReloadView
            }}
            size="default"
            className="max-w-md w-full shadow-xl border border-slate-200/80 dark:border-white/10"
          />
        </div>
      );
    }

    // ── Localhost Development Mode: Technical Diagnostics Card ──
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[var(--bg-main,#ffffff)] dark:bg-[#0d0d0f]">
        {/* Outer bezel */}
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B0D11] p-1 shadow-sm">
          {/* Inner bezel */}
          <div className="rounded-xl border border-slate-100 dark:border-white/[0.06] bg-slate-50 dark:bg-[#0E1118] p-6">

            {/* Header */}
            <div className="flex items-start gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-mono">
                  Subsystem Recovered (Localhost Dev Mode)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">
                  {name} encountered an unexpected rendering error. Local state reset required.
                </div>
              </div>
            </div>

            {/* Primary action */}
            <button
              onClick={this.handleReloadView}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                         bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100
                         text-white dark:text-slate-950 text-[12px] font-mono font-semibold
                         transition-colors mb-4 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reload View
            </button>

            {/* Collapsible technical details */}
            <button
              onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg
                         text-[10px] font-mono text-slate-400 hover:text-slate-600
                         dark:text-slate-600 dark:hover:text-slate-400
                         border border-slate-200 dark:border-white/[0.06]
                         bg-transparent hover:bg-slate-50 dark:hover:bg-white/[0.02]
                         transition-colors cursor-pointer"
            >
              <span>Technical Details</span>
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showDetails && (
              <div className="mt-2 p-3 rounded-lg bg-slate-950/5 dark:bg-black/30
                              border border-slate-200 dark:border-white/[0.06]
                              max-h-40 overflow-y-auto">
                <pre className="text-[9px] font-mono text-slate-500 dark:text-slate-500
                                whitespace-pre-wrap break-all leading-relaxed">
                  {error?.toString()}
                  {errorInfo?.componentStack}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
