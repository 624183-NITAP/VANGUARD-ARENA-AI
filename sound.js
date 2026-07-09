/**
 * Audio synthesis engine for retro dashboard alerts.
 */
"use strict";

/**
 * Plays a synthesized retro sound using Web Audio API oscillator and gain nodes.
 * Does not play sound if accessibility mode is enabled.
 * @param {string} type The sound type identifier ('beep', 'boop', 'warn', 'success').
 */
export function playRetroSound(type) {
  if (document.body.classList.contains('accessibility-mode')) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    if (type === 'beep') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'boop') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(450, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'warn') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(550, now);
      osc.frequency.setValueAtTime(750, now + 0.12);
      osc.frequency.setValueAtTime(550, now + 0.24);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.start(now);
      osc.stop(now + 0.38);
    } else if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.setValueAtTime(500, now + 0.06);
      osc.frequency.setValueAtTime(650, now + 0.12);
      osc.frequency.setValueAtTime(900, now + 0.18);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    }
  } catch (e) {
    console.warn("Web Audio API synthesis failed", e);
  }
}
