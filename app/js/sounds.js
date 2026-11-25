/* vbClock — tiny Web Audio sound engine (no files, works offline) */

'use strict';

let audioCtx = null;
let audioUnlocked = false;

function ensureAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  ensureAudio();
}

const SOUND_PATTERNS = {
  chime: {
    total: 2.4,
    notes: [
      [659.25, 0, 0.7, 'sine'],
      [880, 0.16, 0.7, 'sine'],
      [1046.5, 0.32, 1.1, 'sine'],
    ],
  },
  bell: {
    total: 2.6,
    notes: [
      [880, 0, 1.3, 'triangle'],
      [1320, 0, 1, 'triangle'],
      [1760, 0.02, 0.7, 'sine'],
    ],
  },
  beep: {
    total: 1.3,
    notes: [
      [880, 0, 0.13, 'square'],
      [880, 0.22, 0.13, 'square'],
      [880, 0.44, 0.13, 'square'],
    ],
  },
  digital: {
    total: 1.5,
    notes: [
      [1174.66, 0, 0.09, 'square'],
      [1567.98, 0.12, 0.09, 'square'],
      [1174.66, 0.24, 0.09, 'square'],
      [1567.98, 0.36, 0.14, 'square'],
    ],
  },
  gentle: {
    total: 3,
    notes: [
      [392, 0, 1.7, 'sine'],
      [493.88, 0.22, 1.7, 'sine'],
      [587.33, 0.44, 1.9, 'sine'],
    ],
  },
};

/**
 * Play a named pattern. Returns a stop function. `volume` is 0…1.
 */
function playSound(name, volume = 0.7, loop = false) {
  const ctx = ensureAudio();
  if (!ctx) return () => {};
  const pattern = SOUND_PATTERNS[name] || SOUND_PATTERNS.chime;
  const master = ctx.createGain();
  master.gain.value = clamp(volume, 0, 1) * 0.55;
  master.connect(ctx.destination);

  const playOnce = () => {
    if (ctx.state === 'closed') return;
    const t0 = ctx.currentTime + 0.02;
    pattern.notes.forEach(([freq, delay, dur, type]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      const start = t0 + delay;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.85, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    });
  };

  playOnce();
  const id = loop ? setInterval(playOnce, pattern.total * 1000) : null;

  return function stop() {
    if (id) clearInterval(id);
    try {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.02);
      setTimeout(() => {
        try { master.disconnect(); } catch (err) { /* already gone */ }
      }, 120);
    } catch (err) {
      /* context may be closed */
    }
  };
}

let lastTickAt = 0;

function playTick() {
  const ctx = ensureAudio();
  if (!ctx || ctx.state !== 'running') return;
  const now = Date.now();
  if (now - lastTickAt < 500) return;
  lastTickAt = now;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 1650;
    const t0 = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.05);
  } catch (err) {
    /* ignore audio hiccups */
  }
}

document.addEventListener('pointerdown', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });
