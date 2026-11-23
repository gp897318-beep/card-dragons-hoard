/* audio.js — tiny WebAudio bleeps generated in code. No audio files. */
'use strict';

var audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function beep(freq, dur, type, vol, when) {
  var ctx = getAudioCtx();
  if (!ctx) return;
  var t = ctx.currentTime + (when || 0);
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(vol || 0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function playSound(name) {
  var s = window.__state;
  if (s && s.muted) return;
  if (name === 'hit') { beep(180, 0.12, 'square', 0.14); beep(90, 0.18, 'sawtooth', 0.1, 0.05); }
  else if (name === 'coin') { beep(880, 0.08, 'sine', 0.12); beep(1320, 0.12, 'sine', 0.1, 0.07); }
  else if (name === 'guard') { beep(320, 0.15, 'triangle', 0.12); }
  else if (name === 'heal') { beep(520, 0.12, 'sine', 0.1); beep(780, 0.16, 'sine', 0.1, 0.1); }
  else if (name === 'alarm') { beep(220, 0.2, 'sawtooth', 0.14); beep(220, 0.2, 'sawtooth', 0.14, 0.22); }
  else if (name === 'breath') { beep(70, 0.5, 'sawtooth', 0.18); beep(50, 0.6, 'square', 0.12, 0.1); }
  else if (name === 'shatter') { beep(1200, 0.1, 'square', 0.1); beep(900, 0.1, 'square', 0.1, 0.08); beep(600, 0.2, 'square', 0.1, 0.16); }
  else if (name === 'upgrade') { beep(660, 0.1, 'sine', 0.12); beep(880, 0.1, 'sine', 0.12, 0.09); beep(1100, 0.18, 'sine', 0.12, 0.18); }
  else if (name === 'win') { beep(523, 0.15, 'sine', 0.14); beep(659, 0.15, 'sine', 0.14, 0.14); beep(784, 0.3, 'sine', 0.14, 0.28); }
  else if (name === 'lose') { beep(400, 0.25, 'sawtooth', 0.12); beep(300, 0.25, 'sawtooth', 0.12, 0.22); beep(200, 0.5, 'sawtooth', 0.12, 0.44); }
  else if (name === 'click') { beep(600, 0.05, 'sine', 0.08); }
}
