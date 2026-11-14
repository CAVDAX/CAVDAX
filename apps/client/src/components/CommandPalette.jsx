import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Search, FileText, CheckCircle2, AlertTriangle, Cpu, Terminal, ArrowRight, CornerDownLeft, X } from 'lucide-react';
import { playClick } from '../utils/soundFx';

export default function CommandPalette({
  isOpen,
  onClose,
  nodes = [],
  onSelectNode
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Filter nodes matching query across ID, title, claim, or target file
  const filteredNodes = useMemo(() => {
    if (!query.trim()) return nodes.slice(0, 20);
    const q = query.toLowerCase().trim();
    return nodes.filter(n => {
      const idMatch = n.id?.toLowerCase().includes(q);
      const titleMatch = n.title?.toLowerCase().includes(q);
      const claimMatch = n.claim?.toLowerCase().includes(q);
      const fileMatch = n.target_file?.toLowerCase().includes(q);
      const labelMatch = n.label?.toLowerCase().includes(q);
      return idMatch || titleMatch || claimMatch || fileMatch || labelMatch;
    }).slice(0, 25);
  }, [nodes, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredNodes]);

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        playClick();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredNodes.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredNodes.length) % Math.max(1, filteredNodes.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredNodes[selectedIndex]) {
          playClick();
          onSelectNode(filteredNodes[selectedIndex]);
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredNodes, selectedIndex, onSelectNode, onClose]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen || typeof document === 'undefined') return null;

  const getNodeIcon = (label, isStale) => {
    if (isStale) return <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
    switch (label) {
      case 'Source':
        return <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />;
      case 'Decision':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
      case 'Fact':
        return <Terminal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />;
      case 'AgentAction':
        return <Cpu className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
    }
  };

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          playClick();
          onClose();
        }
      }}
      data-lenis-prevent
      className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 px-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -8 }}
        transition={{ duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-xl bg-white dark:bg-[#0f1015] border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden font-mono text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Omnibar Input */}
        <div className="flex items-center gap-2.5 px-3.5 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search DAG nodes, decisions, ADRs, or target files..."
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-mono text-xs focus:outline-none select-text cursor-text"
            autoFocus
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
              <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 font-sans">ESC</kbd>
            </div>
          )}
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-72 overflow-y-auto has-scrubbar p-1.5 space-y-0.5 select-none">
          {filteredNodes.length === 0 ? (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs font-sans">
              No matching nodes found for "{query}".
            </div>
          ) : (
            filteredNodes.map((n, idx) => {
              const isSelected = idx === selectedIndex;
              const isStale = Boolean(n.is_stale || n.status === 'SUPERSEDED' || n.status === 'INVALIDATED_NEEDS_REVALIDATION');

              return (
                <div
                  key={n.id || idx}
                  data-index={idx}
                  onClick={() => {
                    playClick();
                    onSelectNode(n);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold'
                      : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    {getNodeIcon(n.label, isStale)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[11px] truncate">{n.id}</span>
                        <span className={`text-[9px] uppercase tracking-wider px-1 py-0.2 rounded border ${
                          isSelected
                            ? 'border-white/30 text-white/90 dark:border-slate-950/30 dark:text-slate-950/90'
                            : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-white/[0.02]'
                        }`}>
                          :{n.label}
                        </span>
                        {n.status && (
                          <span className={`text-[9px] uppercase tracking-wider px-1 py-0.2 rounded font-bold ${
                            isStale
                              ? isSelected ? 'text-rose-200' : 'text-rose-600 dark:text-rose-400'
                              : isSelected ? 'text-emerald-200' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {n.status}
                          </span>
                        )}
                      </div>
                      <div className={`text-[10.5px] truncate font-sans ${isSelected ? 'text-white/80 dark:text-slate-950/80 font-normal' : 'text-slate-500 dark:text-slate-400'}`}>
                        {n.title || n.claim || n.target_file || n.description || 'DAG Invariant Node'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 opacity-60">
                    <CornerDownLeft className="w-3 h-3" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="flex items-center justify-between px-3.5 py-2 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-[10px] text-slate-400 dark:text-slate-500 font-sans">
          <div className="flex items-center gap-2">
            <span>Use <kbd className="font-mono px-1 py-0.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30">↑</kbd> <kbd className="font-mono px-1 py-0.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30">↓</kbd> to navigate</span>
            <span className="h-2.5 w-px bg-slate-300 dark:bg-white/15 shrink-0 self-center select-none" aria-hidden="true" />
            <span><kbd className="font-mono px-1 py-0.5 rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30">ENTER</kbd> to select & center</span>
          </div>
          <span className="font-mono text-[9px]">{filteredNodes.length} nodes indexed</span>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
