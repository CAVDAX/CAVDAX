import React, { useState, useEffect } from 'react';
import CavdaxBrandLoader from './CavdaxBrandLoader';
import { playLoadingSound } from '../utils/soundFx';

export let isInitialSplashFinished = false;

const FULL_FORM_WORDS = [
  { prefix: '', acro: 'C', suffix: 'ontextual', delay: '0.15s' },
  { prefix: '', acro: 'A', suffix: 'ction', delay: '0.3s' },
  { prefix: '', acro: '&', suffix: '', isSymbol: true, delay: '0.45s' },
  { prefix: '', acro: 'V', suffix: 'erified', delay: '0.6s' },
  { prefix: '', acro: 'D', suffix: 'ecision', delay: '0.75s' },
  { prefix: '', acro: 'A', suffix: 'utonomous', delay: '0.9s' },
  { prefix: 'e', acro: 'X', suffix: 'ecution', delay: '1.05s' },
];

export default function SplashLoader({ isDarkTheme }) {
  // CAVDAX Architecture: All visitors see the choreographed splash cycle on boot
  // while the React tree mounts and warms behind it with zero layout flash.
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('cavdax_splash_shown') === 'true') {
      isInitialSplashFinished = true;
      return false;
    }
    return true;
  });
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);

  // Determine active theme with zero-latency fallback to localStorage
  const isDark = isDarkTheme !== undefined
    ? isDarkTheme
    : (typeof window !== 'undefined' ? localStorage.getItem('cavdax_theme') !== 'light' : true);

  const isFirstTimeRef = React.useRef(
    typeof window !== 'undefined' ? !sessionStorage.getItem('cavdax_splash_shown') : true
  );
  const isAnimationCompleteRef = React.useRef(false);

  const handleDismiss = () => {
    // First-time users MUST see the complete logo draw cycle and 100% progress bar.
    // Early dismissal is strictly locked until the full choreography finishes.
    if (isFirstTimeRef.current && !isAnimationCompleteRef.current) {
      return;
    }
    setIsFadingOut(true);
    isInitialSplashFinished = true;
    try { sessionStorage.setItem('cavdax_splash_shown', 'true'); } catch {}
  };

  useEffect(() => {
    if (!isVisible) return;
    // Snappy, high-performance animation cycle (~1.8s) so page is interactive immediately
    const drawDuration = 1800;
    const fadeDuration = 500;

    // Smooth progress tracking (0% to 100% across duration)
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / drawDuration) * 100));
      setProgress(pct);
      if (pct >= 100) {
        isAnimationCompleteRef.current = true;
        clearInterval(interval);
      }
    }, 20);

    const fadeOutTimer = setTimeout(() => {
      isAnimationCompleteRef.current = true;
      setIsFadingOut(true);
      isInitialSplashFinished = true;
      try { sessionStorage.setItem('cavdax_splash_shown', 'true'); } catch {}
      playLoadingSound();
    }, drawDuration);

    const unmountTimer = setTimeout(() => {
      setIsVisible(false);
    }, drawDuration + fadeDuration);

    const handleKeyDown = () => {
      handleDismiss();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeOutTimer);
      clearTimeout(unmountTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center ${
        isDark ? 'bg-[#050608]' : 'bg-[#F8FAFC]'
      } select-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isFadingOut ? 'opacity-0 scale-[1.03] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      <style>{`
        @keyframes splashWordFadeIn {
          0% {
            opacity: 0;
            transform: translateY(8px);
            filter: blur(5px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0px);
          }
        }

        @keyframes splashFullFormBreathe {
          0%, 100% {
            opacity: 0.85;
            text-shadow: ${isDark ? '0 0 10px rgba(255, 255, 255, 0.15)' : '0 0 8px rgba(0, 0, 0, 0.05)'};
          }
          50% {
            opacity: 1;
            text-shadow: ${isDark ? '0 0 20px rgba(255, 255, 255, 0.4)' : '0 0 16px rgba(0, 0, 0, 0.12)'};
          }
        }

        @keyframes splashBrandGlow {
          0%, 100% {
            transform: scale(0.96);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.08);
            opacity: 0.6;
          }
        }

        .splash-word-item {
          opacity: 0;
          animation: splashWordFadeIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .splash-full-form-fading {
          animation: splashFullFormBreathe 2.8s ease-in-out infinite;
        }
      `}</style>

      <div className="relative flex flex-col items-center max-w-xl px-6">
        {/* Monochromatic Specular Radial Aura behind larger logo */}
        <div
          aria-hidden="true"
          className={`absolute -top-12 w-72 h-72 sm:w-96 sm:h-96 rounded-full ${
            isDark ? 'bg-white/[0.04]' : 'bg-slate-950/[0.03]'
          } blur-3xl pointer-events-none animate-[splashBrandGlow_4.2s_ease-in-out_infinite]`}
        />

        {/* 1. Medium Minimalist Brand Logo (Sleek, Balanced & Thin Strokes) */}
        <div className="relative h-32 w-32 sm:h-36 sm:w-36 flex items-center justify-center pointer-events-none select-none">
          <CavdaxBrandLoader 
            size={135} 
            strokeWidth={3.0} 
            hairlineWidth={1.0}
            colorClassName={isDark ? "text-white" : "text-slate-950"}
          />
        </div>

        {/* 2. Acronym Title */}
        <div className="mt-3 flex items-center justify-center">
          <span className={`text-xl sm:text-2xl font-mono font-extrabold tracking-[0.35em] ${
            isDark ? 'text-white' : 'text-slate-950'
          }`}>
            CAVDAX
          </span>
        </div>

        {/* 3. Full Form with Fading Text & Staggered Reveal */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-x-2.5 gap-y-1.5 text-center font-mono text-xs sm:text-sm tracking-wider splash-full-form-fading max-w-3xl px-4">
          {/* Clause 1: Contextual Action & Verified Decision */}
          <div className="flex items-baseline justify-center gap-x-2 whitespace-nowrap">
            {FULL_FORM_WORDS.slice(0, 5).map((part, idx) => (
              <span
                key={idx}
                className="splash-word-item inline-flex items-baseline whitespace-nowrap"
                style={{ animationDelay: part.delay }}
              >
                {part.prefix && (
                  <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-xs`}>{part.prefix}</span>
                )}
                <span
                  className={
                    part.isSymbol
                      ? `${isDark ? 'text-slate-400' : 'text-slate-500'} font-semibold px-0.5`
                      : `${isDark ? 'text-white' : 'text-slate-950'} font-bold text-sm sm:text-base`
                  }
                >
                  {part.acro}
                </span>
                {part.suffix && (
                  <span className={`${isDark ? 'text-slate-300' : 'text-slate-600'} font-medium`}>
                    {part.suffix}
                  </span>
                )}
              </span>
            ))}
          </div>

          {/* Clause 2: Autonomous eXecution */}
          <div className="flex items-baseline justify-center gap-x-2 whitespace-nowrap">
            {FULL_FORM_WORDS.slice(5).map((part, idx) => (
              <span
                key={idx + 5}
                className="splash-word-item inline-flex items-baseline whitespace-nowrap"
                style={{ animationDelay: part.delay }}
              >
                {part.prefix && (
                  <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-xs`}>{part.prefix}</span>
                )}
                <span
                  className={
                    part.isSymbol
                      ? `${isDark ? 'text-slate-400' : 'text-slate-500'} font-semibold px-0.5`
                      : `${isDark ? 'text-white' : 'text-slate-950'} font-bold text-sm sm:text-base`
                  }
                >
                  {part.acro}
                </span>
                {part.suffix && (
                  <span className={`${isDark ? 'text-slate-300' : 'text-slate-600'} font-medium`}>
                    {part.suffix}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* 4. progress & Initialization Bar */}
        <div className="mt-7 w-52 sm:w-72 flex flex-col items-center gap-2">
          <div className={`w-full h-[2px] ${isDark ? 'bg-white/10' : 'bg-slate-200'} rounded-full overflow-hidden`}>
            <div
              className={`h-full ${
                isDark 
                  ? 'bg-gradient-to-r from-slate-500 via-slate-300 to-white shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                  : 'bg-gradient-to-r from-slate-400 via-slate-700 to-slate-950 shadow-[0_0_8px_rgba(0,0,0,0.15)]'
              } transition-all duration-75 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'} tracking-widest uppercase`}>
            SYNCHRONIZING GRAPH KERNEL • {progress}%
          </div>
        </div>

        {/* 5. Minimalist Dismiss Hint */}
        <div className={`mt-5 text-[9px] font-mono ${
          isDark ? 'text-slate-500/80 hover:text-slate-300' : 'text-slate-400 hover:text-slate-700'
        } tracking-widest uppercase cursor-pointer transition-colors`}>
          Press any key or tap to continue
        </div>
      </div>
    </div>
  );
}
