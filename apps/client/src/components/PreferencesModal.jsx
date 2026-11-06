import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, 
  PauseCircle, 
  X, 
  Volume2, 
  VolumeX, 
  ChevronDown, 
  Check, 
  Activity, 
  MousePointer, 
  Waves, 
  Layers,
  Terminal,
  Keyboard as KeyboardIcon
} from 'lucide-react';
import { playClick, playLoadingSound, isSoundEnabled, toggleSound, playAlert } from '../utils/soundFx';
import { Bell, Mail, Zap, CheckCheck, Monitor, Compass, RotateCcw, Loader2 } from 'lucide-react';
import { isPushSupported, subscribeToPushNotifications, unsubscribeFromPushNotifications, getCurrentPushSubscription } from '../services/webPush';

/**
 * High-Precision ToggleSwitch Component
 * Ported from CAVDAX: clean semantic React button slider with zero outline artifacts.
 */
function ToggleSwitch({ checked, onChange, disabled = false, size = 'md', ariaLabel = 'Toggle setting' }) {
  const isSmall = size === 'sm';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && onChange) onChange(!checked);
      }}
      className={`relative inline-flex items-center rounded-full transition-colors duration-300 focus:outline-none cursor-pointer select-none border-transparent ${
        isSmall ? 'w-9 h-5 p-0.5' : 'w-11 h-6 p-0.5'
      } ${
        checked 
          ? 'bg-slate-950 dark:bg-white' 
          : 'bg-slate-200 dark:bg-white/20'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-flex items-center justify-center rounded-full pointer-events-none shadow-xs border border-transparent transition-all duration-300 ${
          isSmall ? 'w-4 h-4' : 'w-5 h-5'
        } ${
          checked 
            ? 'bg-white dark:bg-black text-slate-950 dark:text-white' 
            : 'bg-white dark:bg-neutral-300 text-slate-400 dark:text-neutral-600'
        }`}
        style={{
          transform: checked 
            ? (isSmall ? 'translateX(16px)' : 'translateX(20px)') 
            : 'translateX(0px)',
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <svg
          viewBox="0 0 12 12"
          className={`w-2.5 h-2.5 transition-all duration-300 transform ${
            checked ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-45 opacity-0'
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 6.5L4.5 8.5L9.5 3.5" />
        </svg>
      </span>
    </button>
  );
}

/**
 * PreferencesModal
 * Replicates CAVDAX's luxury monochromatic settings modal:
 * - Bare unboxed rotating Settings gear SVG
 * - Display appearance theme toggle (Obsidian Dark / Porcelain Light)
 * - Sensory Sound FX with expandable accordion & live micro-click testing
 * - Motion Kinetics with expandable accordion for kinetic rolling and particles
 * - Interactive Verification Tour launcher (direct jump to 4-act tour)
 * - Platform cache reset & simulation re-initialization
 * - Monochromatic design system with executive amber accents
 */
export default function PreferencesModal({ 
  isOpen, 
  onClose, 
  isDarkTheme, 
  onToggleTheme,
  onStartTour,
  onResetDemo,
  onOpenShortcuts
}) {
  const [soundsActive, setSoundsActive] = useState(() => isSoundEnabled());
  const [clickSoundActive, setClickSoundActive] = useState(() => localStorage.getItem('cavdax_sound_click') !== 'off');
  const [splashSoundActive, setSplashSoundActive] = useState(() => localStorage.getItem('cavdax_sound_splash') !== 'off');
  const [motionActive, setMotionActive] = useState(() => localStorage.getItem('cavdax_motion') !== 'off');
  const [particlesActive, setParticlesActive] = useState(() => localStorage.getItem('cavdax_particles') !== 'off');
  const [kineticActive, setKineticActive] = useState(() => localStorage.getItem('cavdax_kinetic') !== 'off');

  // Single-group accordion expansion: 'sounds' | 'motion' | null
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  
  // Notification preferences state
  const [alertsMasterActive, setAlertsMasterActive] = useState(true);
  const [emailAlertsActive, setEmailAlertsActive] = useState(true);
  const [browserAlertsActive, setBrowserAlertsActive] = useState(true);
  const [desktopPushActive, setDesktopPushActive] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState(null);
  const [tourResetStatus, setTourResetStatus] = useState(null);

  useEffect(() => {
    if (isOpen && isPushSupported()) {
      getCurrentPushSubscription().then(sub => {
        setDesktopPushActive(Boolean(sub));
      });
    }
  }, [isOpen]);

  const handleToggleDesktopPush = async (val) => {
    spinGear();
    playClick();
    setPushStatusMessage(null);
    if (val) {
      setPushStatusMessage('Requesting OS push permissions...');
      const res = await subscribeToPushNotifications();
      if (res.success) {
        setDesktopPushActive(true);
        setPushStatusMessage('Desktop background push active!');
        setTimeout(() => setPushStatusMessage(null), 3000);
      } else {
        setDesktopPushActive(false);
        setPushStatusMessage(res.error === 'PERMISSION_DENIED' ? 'Permission denied by OS/browser.' : 'Push setup failed.');
      }
    } else {
      await unsubscribeFromPushNotifications();
      setDesktopPushActive(false);
      setPushStatusMessage('Desktop push disabled.');
      setTimeout(() => setPushStatusMessage(null), 3000);
    }
  };
  const [targetEmail, setTargetEmail] = useState('');
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [isSimulatingAlert, setIsSimulatingAlert] = useState(false);
  const [simulateStatus, setSimulateStatus] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/user/notification-preferences', { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
          if (data && data.preferences) {
            setEmailAlertsActive(data.preferences.emailAlerts !== false);
            setBrowserAlertsActive(data.preferences.browserAlerts !== false);
            setAlertsMasterActive(data.preferences.emailAlerts !== false || data.preferences.browserAlerts !== false);
            if (data.preferences.targetEmail) {
              setTargetEmail(data.preferences.targetEmail);
            } else if (data.userEmail) {
              setTargetEmail(data.userEmail);
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleSaveAlertPreferences = async (e) => {
    if (e) e.preventDefault();
    playClick();
    setIsSavingPrefs(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/user/notification-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          emailAlerts: alertsMasterActive && emailAlertsActive,
          browserAlerts: alertsMasterActive && browserAlertsActive,
          targetEmail: targetEmail.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus('Preferences saved successfully.');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('Failed to save preferences.');
      }
    } catch {
      setSaveStatus('Connection error saving preferences.');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const isEmailValid = /^[^s@]+@[^s@]+.[^s@]+$/.test(targetEmail.trim());

  const handleSimulateAlert = async () => {
    playClick();
    const trimmedEmail = targetEmail.trim();
    if (!trimmedEmail) {
      setSimulateStatus('Please enter a target recipient email address above.');
      return;
    }
    if (!/^[^s@]+@[^s@]+.[^s@]+$/.test(trimmedEmail)) {
      setSimulateStatus('Please enter a valid email address.');
      return;
    }

    setIsSimulatingAlert(true);
    setSimulateStatus(null);
    try {
      const res = await fetch('/api/alerts/simulate-invalidation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetEmail: trimmedEmail
        })
      });
      const data = await res.json();
      if (data.success) {
        playAlert();
        setSimulateStatus(`Dispatched divergence alert to ${data.recipient}!`);
      } else {
        setSimulateStatus('Simulation failed: ' + (data.error || 'Server error'));
      }
    } catch {
      setSimulateStatus('Simulation request failed.');
    } finally {
      setIsSimulatingAlert(false);
    }
  };
  const [gearRotation, setGearRotation] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setGearRotation(prev => prev + 180);
      setExpandedGroupId(null);
      document.documentElement.classList.add('lightbox-active');
    } else {
      document.documentElement.classList.remove('lightbox-active');
    }
    return () => document.documentElement.classList.remove('lightbox-active');
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const spinGear = () => {
    setGearRotation(prev => prev + 90);
  };

  const handleToggleGroup = (groupId) => {
    playClick();
    spinGear();
    setExpandedGroupId(prev => (prev === groupId ? null : groupId));
  };

  const handleMasterSoundToggle = (val) => {
    setSoundsActive(val);
    toggleSound();
    spinGear();
    if (val) playClick();
    else if (expandedGroupId === 'sounds') setExpandedGroupId(null);
  };

  const handleClickSoundToggle = (val) => {
    setClickSoundActive(val);
    localStorage.setItem('cavdax_sound_click', val ? 'on' : 'off');
    spinGear();
    if (val) playClick();
  };

  const handleSplashSoundToggle = (val) => {
    setSplashSoundActive(val);
    localStorage.setItem('cavdax_sound_splash', val ? 'on' : 'off');
    spinGear();
    if (val) playClick();
  };

  const handleMasterMotionToggle = (val) => {
    setMotionActive(val);
    localStorage.setItem('cavdax_motion', val ? 'on' : 'off');
    spinGear();
    if (val) playClick();
    else if (expandedGroupId === 'motion') setExpandedGroupId(null);
  };

  const handleKineticToggle = (val) => {
    setKineticActive(val);
    localStorage.setItem('cavdax_kinetic', val ? 'on' : 'off');
    spinGear();
    if (val) playClick();
  };

  const handleParticlesToggle = (val) => {
    setParticlesActive(val);
    localStorage.setItem('cavdax_particles', val ? 'on' : 'off');
    spinGear();
    if (val) playClick();
  };

  const getAccordionStyle = (isExpanded, openHeight) => ({
    maxHeight: isExpanded ? openHeight : '0px',
    opacity: isExpanded ? 1 : 0,
    marginTop: isExpanded ? '0.75rem' : '0px',
    pointerEvents: isExpanded ? 'auto' : 'none',
    transition: isExpanded
      ? 'max-height 0.65s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), margin-top 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
      : 'max-height 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease, margin-top 0.25s ease'
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6"
        >
          {/* Backdrop Blur matching KeyboardShortcutsModal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              playClick();
              onClose();
            }}
            className="absolute inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md"
          />

          {/* Modal Dialog Card with smooth spring physics entry and exit */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            className="relative w-full max-w-lg max-h-[92dvh] sm:max-h-[90dvh] overflow-y-auto custom-scrollbar bg-white/95 dark:bg-[#0A0D12] border border-slate-200/90 dark:border-white/15 rounded-2xl sm:rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl p-4 sm:p-7 z-10"
          >
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-7 sm:w-8 h-7 sm:h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition cursor-pointer"
          aria-label="Close preferences"
        >
          <X size={15} />
        </button>

        {/* Modal Header: Bare Unboxed Rotating Gear */}
        <div className="border-b border-slate-200/80 dark:border-white/10 pb-3 sm:pb-4 mb-4 sm:mb-5 pr-8">
          <div className="flex items-center space-x-2.5 mb-1">
            <Settings 
              size={19} 
              className="text-slate-950 dark:text-white flex-shrink-0"
              style={{
                transform: `rotate(${gearRotation}deg)`,
                transition: 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)'
              }}
            />
            <h2 className="text-base sm:text-xl font-bold tracking-tight text-slate-950 dark:text-white font-sans">
              System Preferences
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 ml-7 leading-snug">
            Sensory feedback, kinetics, and system controls.
          </p>
        </div>

        {/* Settings Grid Structure */}
        <div className="space-y-3 font-sans">
          
          {/* 2. Audio & Sensory Sound FX (Expandable Accordion) */}
          <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/15 transition-all">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5 sm:space-x-3 flex-1 min-w-0">
                {soundsActive ? (
                  <Volume2 size={16} className="text-slate-900 dark:text-white flex-shrink-0" />
                ) : (
                  <VolumeX size={16} className="text-slate-400 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-semibold text-slate-950 dark:text-white leading-snug">
                    Sensory Audio &amp; Sound FX
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    Tactile micro-click audio pool &amp; loading chime
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <ToggleSwitch 
                  checked={soundsActive} 
                  onChange={handleMasterSoundToggle} 
                  ariaLabel="Toggle all sound effects"
                />

                <button
                  type="button"
                  onClick={() => handleToggleGroup('sounds')}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition cursor-pointer"
                  title="Configure sound channels"
                >
                  <ChevronDown 
                    size={15} 
                    className="transition-transform duration-300" 
                    style={{ transform: expandedGroupId === 'sounds' ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>
              </div>
            </div>

            {/* Sub-Accordion */}
            <div 
              className={`space-y-2 border-l-2 border-slate-300 dark:border-white/20 ml-2.5 pl-3.5 overflow-hidden ${
                !soundsActive ? 'opacity-40 pointer-events-none' : ''
              }`}
              style={getAccordionStyle(expandedGroupId === 'sounds', '160px')}
            >
              {/* Sound Sub 1: Tactile Button Clicks */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <MousePointer size={13} className={`transition-colors ${clickSoundActive && soundsActive ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-600 opacity-40"}`} />
                  <span className="text-[11px] text-slate-700 dark:text-slate-300">Tactile Micro-Clicks</span>
                </div>
                <ToggleSwitch 
                  checked={clickSoundActive} 
                  onChange={handleClickSoundToggle} 
                  size="sm"
                  disabled={!soundsActive}
                  ariaLabel="Toggle button click sound"
                />
              </div>

              {/* Sound Sub 2: Loading Splash Chime */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Waves size={13} className={`transition-colors ${splashSoundActive && soundsActive ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-600 opacity-40"}`} />
                  <span className="text-[11px] text-slate-700 dark:text-slate-300">Loading Splash Chime</span>
                </div>
                <ToggleSwitch 
                  checked={splashSoundActive} 
                  onChange={handleSplashSoundToggle} 
                  size="sm"
                  disabled={!soundsActive}
                  ariaLabel="Toggle loading sound"
                />
              </div>
            </div>
          </div>

          {/* 3. Motion & Animation Dynamics (Expandable Accordion) */}
          <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/15 transition-all">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5 sm:space-x-3 flex-1 min-w-0">
                {motionActive ? (
                  <Activity size={16} className="text-slate-900 dark:text-white flex-shrink-0" />
                ) : (
                  <PauseCircle size={16} className="text-slate-400 dark:text-slate-500 flex-shrink-0 opacity-60" />
                )}
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-semibold text-slate-950 dark:text-white leading-snug">
                    Motion &amp; Visual Kinetics
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    Spring physics, kinetic word rolling, and dust dissolution
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <ToggleSwitch 
                  checked={motionActive} 
                  onChange={handleMasterMotionToggle} 
                  ariaLabel="Toggle motion and animations"
                />

                <button
                  type="button"
                  onClick={() => handleToggleGroup('motion')}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition cursor-pointer"
                  title="Configure motion features"
                >
                  <ChevronDown 
                    size={15} 
                    className="transition-transform duration-300" 
                    style={{ transform: expandedGroupId === 'motion' ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>
              </div>
            </div>

            {/* Sub-Accordion */}
            <div 
              className={`space-y-2 border-l-2 border-slate-300 dark:border-white/20 ml-2.5 pl-3.5 overflow-hidden ${
                !motionActive ? 'opacity-40 pointer-events-none' : ''
              }`}
              style={getAccordionStyle(expandedGroupId === 'motion', '160px')}
            >
              {/* Motion Sub 1: Kinetic Rolling Headlines */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Layers size={13} className={`transition-colors ${kineticActive && motionActive ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-600 opacity-40"}`} />
                  <span className="text-[11px] text-slate-700 dark:text-slate-300">Kinetic Rolling Headlines</span>
                </div>
                <ToggleSwitch 
                  checked={kineticActive} 
                  onChange={handleKineticToggle} 
                  size="sm"
                  disabled={!motionActive}
                  ariaLabel="Toggle kinetic rolling headlines"
                />
              </div>

              {/* Motion Sub 2: Particle Typography */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Layers size={13} className={`transition-colors ${particlesActive && motionActive ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-600 opacity-40"}`} />
                  <span className="text-[11px] text-slate-700 dark:text-slate-300">Pointillism Particles</span>
                </div>
                <ToggleSwitch 
                  checked={particlesActive} 
                  onChange={handleParticlesToggle} 
                  size="sm"
                  disabled={!motionActive}
                  ariaLabel="Toggle particle effect"
                />
              </div>
            </div>
          </div>

          


          {/* 4. Architectural Divergence Alerts & Notifications */}
          <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/15 transition-all">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5 sm:space-x-3 flex-1 min-w-0">
                <Bell size={16} className={`shrink-0 transition-colors ${alertsMasterActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`} />
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-semibold text-slate-950 dark:text-white leading-snug flex items-center gap-1.5">
                    <span>Divergence Invalidation Alerts</span>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 truncate">
                    {alertsMasterActive
                      ? (targetEmail ? `Email dispatch configured for ${targetEmail}` : 'In-HUD & email divergence alerts active')
                      : 'All divergence alerts paused'}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-shrink-0">
                <ToggleSwitch 
                  checked={alertsMasterActive} 
                  onChange={(val) => {
                    setAlertsMasterActive(val);
                    spinGear();
                    if (val) playClick();
                  }}
                  ariaLabel="Toggle divergence invalidation alerts"
                />

                <button
                  type="button"
                  onClick={() => handleToggleGroup('alerts')}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition cursor-pointer"
                  title="Configure notification channels and recipient"
                >
                  <ChevronDown 
                    size={15} 
                    className="transition-transform duration-300" 
                    style={{ transform: expandedGroupId === 'alerts' ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>
              </div>
            </div>

            {/* Sub-Accordion */}
            <div 
              className={`space-y-2.5 border-l-2 border-slate-300 dark:border-white/20 ml-2.5 pl-3.5 overflow-hidden ${
                !alertsMasterActive ? 'opacity-40 pointer-events-none' : ''
              }`}
              style={getAccordionStyle(expandedGroupId === 'alerts', '320px')}
            >
              {/* Channel 1: In-HUD Audio/Visual Chimes */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Bell size={13} className={`transition-colors ${browserAlertsActive && alertsMasterActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600 opacity-40'}`} />
                  <span className="text-[11px] text-slate-700 dark:text-slate-300">In-HUD Audio &amp; Visual Alerts</span>
                </div>
                <ToggleSwitch 
                  checked={browserAlertsActive} 
                  onChange={(val) => {
                    setBrowserAlertsActive(val);
                    spinGear();
                    if (val) playClick();
                  }} 
                  size="sm"
                  disabled={!alertsMasterActive}
                  ariaLabel="Toggle in-HUD browser alerts"
                />
              </div>

              {/* Channel 2: Asynchronous Email Dispatches via Resend */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Mail size={13} className={`transition-colors ${emailAlertsActive && alertsMasterActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600 opacity-40'}`} />
                  <span className="text-[11px] text-slate-700 dark:text-slate-300">Email Invalidation Dispatch</span>
                </div>
                <ToggleSwitch 
                  checked={emailAlertsActive} 
                  onChange={(val) => {
                    setEmailAlertsActive(val);
                    spinGear();
                    if (val) playClick();
                  }} 
                  size="sm"
                  disabled={!alertsMasterActive}
                  ariaLabel="Toggle email alerts"
                />
              </div>

              {/* Recipient Email Address Input */}
              <div className="pt-1 border-t border-slate-200/60 dark:border-white/10">
                <label className="block text-[10px] uppercase font-mono tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Target Recipient Email
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="email"
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    placeholder="developer@example.com"
                    className="flex-1 h-7 px-2.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-black/40 text-slate-900 dark:text-white text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
                  />
                  <button
                    type="button"
                    onClick={handleSaveAlertPreferences}
                    disabled={isSavingPrefs}
                    className="h-7 px-2.5 rounded-lg border border-slate-300 dark:border-white/20 bg-slate-900 text-white dark:bg-white dark:text-slate-950 text-[10px] font-mono font-bold uppercase tracking-wider hover:opacity-90 transition cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isSavingPrefs ? 'Saving...' : 'Save'}
                  </button>
                </div>
                {saveStatus && (
                  <p className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {saveStatus}
                  </p>
                )}
              </div>

              {/* Live Invalidation Simulation Trigger */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-mono font-semibold text-slate-800 dark:text-slate-200">
                    Pitch Showcase Trigger
                  </div>
                  <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                    Send real test invalidation email to your inbox
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSimulateAlert}
                  disabled={isSimulatingAlert || !isEmailValid}
                  className="h-7 px-2.5 rounded-lg border border-slate-300 dark:border-white/15 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white text-[10px] font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-xs"
                  title={
                    !targetEmail.trim()
                      ? "Enter a target recipient email above to dispatch a test alert"
                      : !isEmailValid
                      ? "Enter a valid email address above to dispatch a test alert"
                      : "Send a sample invalidation alert to your configured email"
                  }
                >
                  {isSimulatingAlert ? (
                    <Loader2 size={11} className="animate-spin text-slate-500 dark:text-slate-400 shrink-0" />
                  ) : (
                    <Mail size={11} className="text-slate-500 dark:text-slate-400 shrink-0" />
                  )}
                  <span>{isSimulatingAlert ? 'Dispatching...' : 'Dispatch Test Alert'}</span>
                </button>
              </div>
              {simulateStatus && (
                <p className="text-[10px] font-mono text-slate-600 dark:text-slate-400 mt-1">
                  {simulateStatus}
                </p>
              )}
            </div>
          </div>

          {/* 5. Keyboard Navigation & Tactical Shortcuts */}
          <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/90 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/15 transition-all">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5 sm:space-x-3 flex-1 min-w-0">
                <KeyboardIcon size={16} className="shrink-0 text-slate-900 dark:text-white" />
                <div className="min-w-0">
                  <div className="text-[11px] sm:text-xs font-semibold text-slate-950 dark:text-white leading-snug flex items-center gap-1.5">
                    <span>Keyboard Navigation</span>
                    <kbd className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-300 font-bold">
                      ?
                    </kbd>
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 truncate">
                    Universal HUD, view switching & tactical keybindings
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  spinGear();
                  playClick();
                  if (onOpenShortcuts) onOpenShortcuts();
                }}
                className="h-7 px-3 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white text-[10px] font-mono font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
                title="Open Keyboard Shortcuts Panel (?)"
              >
                <span>View Shortcuts</span>
              </button>
            </div>
          </div>


        </div>

      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
}
