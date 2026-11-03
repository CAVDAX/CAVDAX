/**
 * CAVDAX Tactile Audio Synthesizer & SoundFx Engine
 * Procedural Web Audio API sound synthesis with fallback HTMLAudioElement pool.
 * Zero external sound dependency required for crisp, tactile UI feedback.
 */

const STORAGE_KEY = 'cavdax_sounds_muted';
const CLICK_SOUND_PATH = '/sounds/click.mp3';
const LOADING_SOUND_PATH = '/sounds/Loading_Screen.mp3';

const clickAudioPool = [];
const POOL_SIZE = 6;
let poolIndex = 0;
let isAudioPoolInitialized = false;
let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function isSoundEnabled() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) !== 'true';
}

export function toggleSound() {
  if (typeof window === 'undefined') return false;
  const current = isSoundEnabled();
  localStorage.setItem(STORAGE_KEY, current ? 'true' : 'false');
  return !current;
}

export function initAudioPool() {
  if (typeof window === 'undefined' || isAudioPoolInitialized) return;
  isAudioPoolInitialized = true;
  for (let i = 0; i < POOL_SIZE; i++) {
    try {
      const audio = new Audio(CLICK_SOUND_PATH);
      audio.volume = 0.35;
      audio.load();
      clickAudioPool.push(audio);
    } catch (e) {
      console.warn('Failed to initialize click audio:', e);
    }
  }
}

/**
 * Initializes global click audio listener and unlocks browser audio context on first interaction
 */
export function initGlobalClickSound() {
  if (typeof window === 'undefined') return;
  if (document.documentElement.dataset.soundInit === '1') return;
  document.documentElement.dataset.soundInit = '1';

  // Defer audio pool instantiation until the first user gesture
  const unlockAudio = () => {
    initAudioPool();
    window.removeEventListener('pointerdown', unlockAudio, { capture: true });
    window.removeEventListener('keydown', unlockAudio, { capture: true });
  };
  window.addEventListener('pointerdown', unlockAudio, { capture: true, once: true });
  window.addEventListener('keydown', unlockAudio, { capture: true, once: true });
}

/**
 * Tactile micro-click sound copied directly from CAVDAX audio pool
 */
export function playClick() {
  if (!isSoundEnabled()) return;

  initAudioPool();
  try {
    if (clickAudioPool.length > 0) {
      const sound = clickAudioPool[poolIndex];
      sound.currentTime = 0;
      sound.volume = 0.35;
      const playPromise = sound.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
      poolIndex = (poolIndex + 1) % clickAudioPool.length;
      return;
    }
  } catch (err) {
    console.warn('Error playing click sound:', err);
  }
}

/**
 * Loading screen ambient chime copied directly from CAVDAX
 */
export function playLoadingSound() {
  if (!isSoundEnabled()) return;

  try {
    const audio = new Audio(LOADING_SOUND_PATH);
    audio.volume = 0.45;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  } catch (err) {
    console.warn('Error playing loading sound:', err);
  }
}

/**
 * Hard reject alarm for Act 3 MCP Gate Invalidation
 */
export function playRejectBuzz() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.setValueAtTime(140, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.23);
  } catch {
    // Silent fail
  }
}

/**
 * Emerald approval chime for Act 4 MCP Gate Verification
 */
export function playApprovalChime() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.06, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.26);
    });
  } catch {
    // Silent fail
  }
}
/**
 * Dual-tone architectural divergence warning alarm
 */
export function playAlert() {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    [440, 330].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.12, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.24);
    });
  } catch {}
}
