import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Github, 
  Linkedin, 
  ArrowUpRight, 
  Cpu, 
  Workflow, 
  SlidersHorizontal,
  X,
  Code2,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import CurvyArrow from './CurvyArrow';
import ShimmerImage from './ui/ShimmerImage';
import { TEAM_MEMBERS, TEAM_DETAILS, SYSTEM_CREDITS } from '../data/teamData';
import { playClick } from '../utils/soundFx';

/**
 * TeamPage — Team Contrarians Presentation
 * Built with full fidelity to CAVDAX Team Page:
 * - CurvyArrow with mathematically seamless infinite dash-march pointing to CONTRARIANS
 * - Golden-amber atmospheric radial aura halo behind Team Name & Header
 * - Golden outline ring with luminous amber glow on member profile avatars
 * - Corner fan geometric accents and neo-glass card elevation
 * - Interactive 3D mouse-tracking tilt Lightbox photo viewer
 * - Monochromatic Swiss typography with zero emojis
 */
export default function TeamPage({ onLaunchConsole }) {
  const [lightboxMember, setLightboxMember] = useState(null);
  const [lightboxTilt, setLightboxTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && lightboxMember) {
        playClick();
        setLightboxMember(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxMember]);

  // Lock body scroll when lightbox is open to prevent background viewport displacement
  useEffect(() => {
    if (lightboxMember) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [lightboxMember]);

  return (
    <div className="w-full flex-1 flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-200 select-none relative overflow-hidden pt-24 sm:pt-28 pb-20 px-4 sm:px-6">
      {/* 0. Monumental Background Typography Watermark - High Visibility Contrast like CAVDAX */}
      <div 
        aria-hidden="true" 
        className="absolute inset-0 pointer-events-none flex items-center justify-center select-none -z-0 overflow-hidden"
      >
        <span className="text-[16vw] font-black tracking-tighter text-slate-950/[0.04] dark:text-white/[0.03] leading-none font-mono">
          CONTRARIANS
        </span>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto w-full relative z-10 flex flex-col items-center">
        
        {/* 1. Hero Section with Soft Golden Amber Glow & CurvyArrow */}
        <div id="team-intro" className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 relative flex flex-col items-center">
          
          {/* Premium golden-amber aura halo behind hero (luminous on dark, subtle on light) */}
          <div
            aria-hidden="true"
            className="absolute -top-12 left-1/2 -translate-x-1/2 w-[380px] sm:w-[580px] h-[240px] sm:h-[320px] bg-[radial-gradient(ellipse_at_center,_rgba(217,163,83,0.22),_rgba(217,119,6,0.08),_transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,_rgba(217,163,83,0.28),_rgba(217,119,6,0.12),_transparent_70%)] rounded-full blur-2xl sm:blur-3xl pointer-events-none -z-0"
          />

          {/* Curvy Arrow pointing to Team Contrarians with seamless infinite dash */}
          <CurvyArrow direction="top-right" className="-right-10 top-2 sm:top-4 hidden sm:inline-flex" label="CONTRARIANS" />

          {/* Team Logo Emblem - Luminous Spherical Orb Circle (Interactive 3D Lightbox Viewer) */}
          <button
            type="button"
            onClick={() => {
              playClick();
              setLightboxMember({
                name: `Team ${TEAM_DETAILS.name}`,
                title: TEAM_DETAILS.tagline,
                avatar: TEAM_DETAILS.logo,
                fallbackAvatar: TEAM_DETAILS.logo,
                isEmblem: true,
              });
            }}
            className="w-20 h-20 sm:w-24 sm:h-24 mb-5 relative flex items-center justify-center rounded-full p-1.5 group/orb cursor-zoom-in select-none focus:outline-none"
            title={`View Team ${TEAM_DETAILS.name} Emblem`}
            aria-label={`View Team ${TEAM_DETAILS.name} Emblem`}
          >
            {/* Ambient Halo Glow */}
            <div 
              aria-hidden="true" 
              className="absolute inset-0 rounded-full bg-slate-900/10 dark:bg-amber-400/20 blur-md pointer-events-none transition-all duration-500 group-hover/orb:scale-110" 
            />
            {/* Spherical Orb Vessel */}
            <div className="relative w-full h-full rounded-full overflow-hidden border border-slate-300/80 dark:border-amber-400/40 bg-gradient-to-b from-white via-slate-50 to-slate-200/90 dark:from-white/10 dark:via-black/50 dark:to-black/90 shadow-[0_8px_24px_rgba(15,23,42,0.10)] dark:shadow-[0_0_35px_rgba(245,158,11,0.22)] ring-1 ring-slate-900/10 dark:ring-amber-400/30 flex items-center justify-center">
              {/* Glass Specular Curved Highlight */}
              <div 
                aria-hidden="true" 
                className="absolute inset-x-2 top-0.5 h-1/3 rounded-t-full bg-gradient-to-b from-white/40 dark:from-white/20 to-transparent pointer-events-none z-10" 
              />
              <ShimmerImage 
                src={TEAM_DETAILS.logo} 
                alt={TEAM_DETAILS.name} 
                containerClassName="h-full w-full rounded-full"
                className="h-full w-full object-cover rounded-full filter dark:brightness-105 select-none pointer-events-none transition-transform duration-500 group-hover/orb:scale-105"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </button>

          {/* Headline with Soft Glow Typography */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-950 dark:text-white mb-4 text-balance relative">
            Team {TEAM_DETAILS.name}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal text-balance max-w-3xl mx-auto relative">
            <span className="block">{TEAM_DETAILS.tagline}.</span>
            <span className="block mt-1 sm:whitespace-nowrap">Architecting deterministic causal verification for autonomous coding agents.</span>
          </p>
        </div>

        {/* 2. Team Member Bento Grid (2 Columns Symmetrical, CAVDAX Style) */}
        <div id="team-roster" className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-14">
          {TEAM_MEMBERS.map((member) => (
            <div 
              key={member.id}
              className="meet-clusterguilders-card team-member-card neo-glass-card p-6 sm:p-8 flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
            >
              {/* Corner Fan Accent from CAVDAX */}
              <div 
                aria-hidden="true" 
                className="absolute top-0 right-0 w-28 h-28 bg-slate-950/5 dark:bg-white/5 rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-125"
              />

              <div>
                {/* Avatar & Social Row */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setLightboxMember(member);
                      }}
                      className="block group/avatar cursor-zoom-in focus:outline-none rounded-2xl"
                      title={`View photo of ${member.name}`}
                      aria-label={`View photo of ${member.name}`}
                    >
                      <ShimmerImage 
                        src={member.avatar} 
                        alt={member.name}
                        loading="lazy"
                        containerClassName="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = member.fallbackAvatar;
                        }}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-transparent ring-0 shadow-md transition-all duration-300 group-hover/avatar:scale-105 group-hover/avatar:border-slate-900/60 dark:group-hover/avatar:border-amber-400/40 group-hover/avatar:ring-1 group-hover/avatar:ring-slate-900/25 dark:group-hover/avatar:ring-amber-400/30 group-hover/avatar:shadow-[0_4px_16px_rgba(15,23,42,0.18)] dark:group-hover/avatar:shadow-[0_0_12px_rgba(217,163,83,0.20)]"
                      />
                    </button>
                    {/* Role Corner Badge from CAVDAX */}
                    <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-slate-950 text-white dark:bg-white dark:text-slate-950 flex items-center justify-center font-mono text-[9px] font-bold shadow-xs">
                      {member.role === 'Team Leader' ? 'LEAD' : 'DEV'}
                    </div>
                  </div>

                  {/* Circular Social Links */}
                  <div className="flex items-center space-x-1.5 text-slate-400 shrink-0">
                    {member.github && (
                      <a 
                        href={member.github} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white transition"
                        title={`${member.name} on GitHub`}
                      >
                        <Github size={15} />
                      </a>
                    )}
                    {member.linkedin && (
                      <a 
                        href={member.linkedin} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white transition"
                        title={`${member.name} on LinkedIn`}
                      >
                        <Linkedin size={15} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Info Block */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white tracking-tight min-w-0">
                    {member.name}
                  </h3>
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-bold uppercase whitespace-nowrap">
                    {member.role}
                  </span>
                </div>

                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">
                  {member.title}
                </div>
                <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5 mb-3">
                  {member.domain}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  {member.bio}
                </p>

                {/* Key Architectural Contributions */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-white/15 space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold mb-1">
                    Key Contributions:
                  </div>
                  {member.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <span className="text-[#d9a353] dark:text-[#d9a353] font-mono mt-0.5">•</span>
                      <span className="text-balance [text-wrap:balance]">{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/15 flex flex-wrap gap-1.5">
                {member.tags.map((tag) => (
                  <span 
                    key={tag}
                    className="font-mono text-[9px] px-2 py-0.5 rounded-md bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-white/15"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 3. Platform & System Provenance Credits Bar */}
        <div className="w-full neo-glass-card p-6 sm:p-8 mb-10">
          <div className="flex items-center gap-2 mb-5 pb-3.5 border-b border-slate-200 dark:border-white/15">
            <Cpu size={16} className="text-slate-700 dark:text-slate-300" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-950 dark:text-white">
              System Provenance & Open Source Attribution
            </h3>
          </div>

          {/* Spacious 2-Column Bento Grid: Provides each card >500px width so details fit on a single line with zero orphans/lonely children */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {SYSTEM_CREDITS.map((item, idx) => (
              <div 
                key={idx} 
                className="p-4 sm:p-5 rounded-xl bg-slate-100/60 dark:bg-white/[0.03] border border-slate-200 dark:border-white/15 hover:border-slate-900/30 dark:hover:border-amber-400/30 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                    {item.label}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-950 dark:text-white font-mono whitespace-nowrap">
                    {item.value}
                  </span>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-normal whitespace-normal sm:whitespace-nowrap overflow-hidden text-ellipsis">
                  {item.detail}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Bottom Action CTA */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => {
              playClick();
              if (onLaunchConsole) onLaunchConsole();
            }}
            className="btn-primary group tactile-btn inline-flex items-center justify-center gap-2 text-xs"
          >
            <SlidersHorizontal size={14} />
            <span>Launch Causal Verification Console</span>
          </button>
          
          <a
            href={TEAM_DETAILS.githubRepo}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary group tactile-btn inline-flex items-center justify-center gap-2 text-xs"
          >
            <Github size={14} />
            <span>View GitHub Repository</span>
            <ExternalLink size={12} className="opacity-60" />
          </a>
        </div>
      </div>

      {/* 5. Interactive 3D Tilt Lightbox Modal (Hoisted via createPortal to break free from containing block) */}
      {lightboxMember && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-8 bg-black/80 dark:bg-black/92 backdrop-blur-md"
          onClick={() => {
            playClick();
            setLightboxMember(null);
          }}
          role="dialog"
          aria-modal="true"
          aria-label={`View photo of ${lightboxMember.name}`}
        >
          <div
            className="relative max-w-sm sm:max-w-md w-full rounded-3xl overflow-hidden bg-white dark:bg-[#121217] border border-slate-200 dark:border-white/15 shadow-2xl shadow-black/40 dark:shadow-[0_0_50px_rgba(255,255,255,0.06)] transition-transform duration-300 ease-out"
            style={{ transform: `perspective(800px) rotateX(${lightboxTilt.y}deg) rotateY(${lightboxTilt.x}deg) scale(1.015)` }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
              const y = -((e.clientY - rect.top) / rect.height - 0.5) * 14;
              setLightboxTilt({ x, y });
            }}
            onMouseLeave={() => setLightboxTilt({ x: 0, y: 0 })}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-3 right-3 z-10">
              <button
                type="button"
                onClick={() => {
                  playClick();
                  setLightboxMember(null);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer border border-slate-200 dark:border-white/15 shadow-xs"
                title="Close photo"
                aria-label="Close photo"
              >
                <X size={15} />
              </button>
            </div>
            <div className={`w-full aspect-square relative flex items-center justify-center overflow-hidden ${
              lightboxMember.isEmblem ? 'p-8 sm:p-12 bg-slate-50 dark:bg-black/60' : 'bg-slate-100 dark:bg-white/5'
            }`}>
              {lightboxMember.isEmblem && (
                <div 
                  aria-hidden="true" 
                  className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.08),_transparent_70%)] pointer-events-none" 
                />
              )}
              <ShimmerImage
                src={lightboxMember.avatar}
                alt={lightboxMember.name}
                containerClassName="w-full h-full flex items-center justify-center"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = lightboxMember.fallbackAvatar;
                }}
                className={`w-full h-full ${
                  lightboxMember.isEmblem 
                    ? 'object-contain filter dark:brightness-105 drop-shadow-[0_12px_24px_rgba(0,0,0,0.25)] relative z-10' 
                    : 'object-cover'
                }`}
              />
            </div>
            <div className="p-5 text-center border-t border-slate-200/70 dark:border-white/15">
              <h3 className="text-base font-bold text-slate-950 dark:text-white">{lightboxMember.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">{lightboxMember.title}</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
