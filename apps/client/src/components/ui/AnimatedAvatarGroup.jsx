import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * AnimatedAvatarGroup - Production-grade Overlapping Animated Avatar Stack
 *
 * Implements the SmoothUI & MagicUI / 21st.dev specifications.
 * - Staggered spring physics on hover
 * - Configurable max count with "+N" indicator
 * - Full accessibility (role="group", aria-label, alt tags)
 * - Motion preferences respected (useReducedMotion)
 * - 100% theme adaptive (Dark/Light)
 */

export default function AnimatedAvatarGroup({
  avatars = [],
  max = 5,
  size = 36,
  overlap = 10,
  hoverExpand = true,
  className = '',
  onAvatarClick = null,
}) {
  const [isGroupHovered, setIsGroupHovered] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const shouldReduceMotion = useReducedMotion();

  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = Math.max(0, avatars.length - max);

  return (
    <div
      role="group"
      aria-label="Community backers and contributor group"
      className={`inline-flex items-center select-none py-1 ${className}`}
      onMouseEnter={() => setIsGroupHovered(true)}
      onMouseLeave={() => {
        setIsGroupHovered(false);
        setHoveredIndex(null);
      }}
    >
      <div className="flex items-center">
        {visibleAvatars.map((avatar, index) => {
          const isHovered = hoveredIndex === index;
          const marginLeft = index === 0 ? 0 : isGroupHovered && hoverExpand && !shouldReduceMotion ? 4 : -overlap;

          return (
            <motion.div
              key={avatar.id || index}
              className="relative shrink-0 cursor-pointer"
              style={{
                zIndex: isHovered ? 40 : visibleAvatars.length - index,
              }}
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      marginLeft,
                      scale: isHovered ? 1.15 : 1,
                      y: isHovered ? -3 : 0,
                    }
              }
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 26,
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => {
                if (onAvatarClick) onAvatarClick(avatar);
              }}
            >
              <div
                className="rounded-full overflow-hidden border-2 border-slate-50 dark:border-slate-950 shadow-sm ring-1 ring-slate-900/10 dark:ring-white/10 transition-colors bg-slate-200 dark:bg-slate-800"
                style={{ width: `${size}px`, height: `${size}px` }}
              >
                {avatar.src || avatar.avatar_url ? (
                  <img
                    src={avatar.src || avatar.avatar_url}
                    alt={avatar.name || avatar.alt || 'Contributor'}
                    className="w-full h-full object-cover pointer-events-none"
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
                    {(avatar.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Tooltip on Hover */}
              {isHovered && avatar.name && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 2 }}
                  transition={{ duration: 0.15 }}
                  className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-mono whitespace-nowrap shadow-md pointer-events-none z-50"
                >
                  <span>{avatar.name}</span>
                  {avatar.tier && (
                    <span className="opacity-70 ml-1">({avatar.tier})</span>
                  )}
                </motion.div>
              )}
            </motion.div>
          );
        })}

        {/* Overflow "+N" indicator badge */}
        {remainingCount > 0 && (
          <motion.div
            className="relative shrink-0 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-950 text-slate-700 dark:text-slate-300 font-mono font-bold text-[11px] shadow-sm ring-1 ring-slate-900/10 dark:ring-white/10"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              marginLeft: isGroupHovered && hoverExpand && !shouldReduceMotion ? 4 : -overlap,
              zIndex: 1,
            }}
            animate={
              shouldReduceMotion
                ? {}
                : {
                    marginLeft: isGroupHovered && hoverExpand ? 4 : -overlap,
                  }
            }
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 26,
            }}
          >
            <span>+{remainingCount}</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
