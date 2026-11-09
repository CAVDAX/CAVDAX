import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Search } from 'lucide-react';
import { playClick } from '../utils/soundFx.js';

/**
 * Architectural Custom Combobox & Dropdown Component
 * Follows CAVDAX UI Design System: Monochromatic precision, high tactile affordance,
 * dark theme calibrated contrast, and click-outside/Escape dismissal.
 */
export default function Combobox({
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  searchable = false,
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  disabled = false,
  ariaLabel = 'Select option'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen, searchable]);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const filteredOptions = options.filter((opt) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchLabel = (opt.label || '').toLowerCase().includes(q);
    const matchSub = (opt.sublabel || '').toLowerCase().includes(q);
    return matchLabel || matchSub;
  });

  const handleToggle = () => {
    if (disabled) return;
    playClick();
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (optVal) => {
    playClick();
    onChange(optVal);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${isOpen ? 'z-50' : 'z-auto'} ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        className={`h-8 px-3 rounded-lg border text-xs font-mono font-medium transition-all duration-150 flex items-center justify-between gap-2 shadow-xs cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed ${
          isOpen
            ? 'border-slate-800 dark:border-white/40 ring-1 ring-slate-800/10 dark:ring-white/20 bg-slate-100 dark:bg-white/10 text-slate-950 dark:text-white'
            : 'border-slate-300 dark:border-white/20 bg-white dark:bg-[#0c0d10] text-slate-800 dark:text-slate-200 hover:border-slate-400 dark:hover:border-white/35 hover:bg-slate-50 dark:hover:bg-white/5'
        } ${buttonClassName}`}
      >
        <span className="truncate max-w-[200px]">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-slate-950 dark:text-white' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="listbox"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute z-50 mt-1 min-w-[200px] w-full sm:min-w-[240px] max-w-[340px] p-1.5 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#0d0d10] shadow-2xl flex flex-col gap-1 right-0 sm:left-0 sm:right-auto ${dropdownClassName}`}
          >
          {/* Search box if enabled or more than 4 items */}
          {searchable && (
            <div className="p-1 border-b border-slate-100 dark:border-white/10 mb-1">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs">
                <Search className="w-3 h-3 text-slate-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter..."
                  className="w-full bg-transparent text-slate-900 dark:text-white font-mono text-[11px] focus:outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto space-y-0.5" data-lenis-prevent>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-center text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-mono transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-white/10 text-slate-950 dark:text-white font-bold border border-slate-300/60 dark:border-white/15 shadow-2xs'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex flex-col">
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-sans truncate">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
