import React, { useState, useEffect, useRef } from 'react';

/**
 * ThanosTypewriterHeadline
 * 
 * Two-phase kinetic headline:
 * 1. Typewriter: Characters appear one-by-one with terminal precision.
 * 2. Hold: Readable pause.
 * 3. Thanos Dust Fade: Characters disintegrate into particulate dust (blur + translate + ash dissolution).
 * 4. Next phrase types in cleanly.
 * 
 * Features:
 * - Permanent invisible baseline sizers to guarantee ZERO layout shift.
 * - Optical baseline alignment with adjacent text.
 * - Monochromatic theme-adaptive gradient.
 */
export default function ThanosTypewriterHeadline({
  phrases = [
    "Coding Agents?",
    "Autonomous Writes?",
    "Temporal Decisions?",
    "Production Repos?"
  ],
  className = ''
}) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [phase, setPhase] = useState('typing'); // 'typing' | 'holding' | 'dissolving'
  const currentPhrase = phrases[phraseIndex] || phrases[0];

  useEffect(() => {
    let timeoutId;

    if (phase === 'typing') {
      if (displayedText.length < currentPhrase.length) {
        timeoutId = setTimeout(() => {
          setDisplayedText(currentPhrase.slice(0, displayedText.length + 1));
        }, 55);
      } else {
        // Finished typing, hold for reading
        timeoutId = setTimeout(() => {
          setPhase('holding');
        }, 100);
      }
    } else if (phase === 'holding') {
      timeoutId = setTimeout(() => {
        setPhase('dissolving');
      }, 1600);
    } else if (phase === 'dissolving') {
      timeoutId = setTimeout(() => {
        // Move to next phrase
        setDisplayedText('');
        setPhase('typing');
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
      }, 750);
    }

    return () => clearTimeout(timeoutId);
  }, [phase, displayedText, currentPhrase, phrases.length]);

  return (
    <span className={`inline-grid grid-cols-1 grid-rows-1 relative align-baseline shrink-0 overflow-visible text-left ${className}`}>
      {/* Permanent invisible baseline sizers: Locks container width to the widest phrase + cursor to eliminate ALL layout shift */}
      {phrases.map((phrase, pIdx) => (
        <span
          key={pIdx}
          aria-hidden="true"
          className="invisible opacity-0 select-none pointer-events-none col-start-1 row-start-1 whitespace-nowrap font-black flex items-baseline"
        >
          <span>{phrase}</span>
          <span className="inline-block w-[2px] sm:w-[3px] ml-1" />
        </span>
      ))}

      {/* Active Phase Display */}
      <span className="col-start-1 row-start-1 whitespace-nowrap inline-flex items-baseline font-black relative w-full">
        {phase === 'dissolving' ? (
          // Thanos Dust Dissolution: Characters disperse like particles into the air inside an absolute container so bounding box never shifts
          <span className="absolute inset-0 inline-flex items-baseline pointer-events-none">
            {currentPhrase.split('').map((char, cIdx) => {
              // Deterministic pseudo-random scatter vector for each letter
              const dx = ((cIdx % 4) - 1.5) * 16 + (cIdx * 2.5);
              const dy = -18 - ((cIdx % 3) * 12);
              const rot = ((cIdx % 2 === 0 ? 1 : -1) * (15 + (cIdx * 4)));
              const delay = (cIdx * 0.025).toFixed(3);

              return (
                <span
                  key={cIdx}
                  className="inline-block will-change-transform text-[#b45309] dark:text-[#d9a353]"
                  style={{
                    animation: `thanosDustDissolve 0.68s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
                    animationDelay: `${delay}s`,
                    textShadow: '0 0 12px rgba(217, 163, 83, 0.45)',
                    '--dx': `${dx}px`,
                    '--dy': `${dy}px`,
                    '--dr': `${rot}deg`
                  }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </span>
              );
            })}
          </span>
        ) : (
          // Typewriter Mode: Display typed substring. Cursor only shows while actively typing — never after phrase completes.
          <span className="inline-flex items-baseline">
            <span className="text-[#b45309] dark:text-[#d9a353] font-black" style={{ textShadow: '0 0 10px rgba(217, 163, 83, 0.3)' }}>
              {displayedText}
            </span>
            {phase === 'typing' && (
              <span
                className="inline-block w-[2px] sm:w-[3px] h-[0.85em] ml-1 bg-[#b45309] dark:bg-[#d9a353] shadow-[0_0_8px_rgba(217,163,83,0.7)] self-center opacity-100"
              />
            )}
          </span>
        )}
      </span>
    </span>
  );
}
