"use client";

let ctx: AudioContext | null = null;

function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

/** Beep d'urgence simple — tick rouge */
export function playUrgencyTick() {
  try {
    const ac = audio();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "square";
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
    osc.stop(ac.currentTime + 0.12);
  } catch {
    /* ignore */
  }
}

export function playGuessConfirm() {
  try {
    const ac = audio();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = 520;
    gain.gain.value = 0.1;
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.frequency.linearRampToValueAtTime(780, ac.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25);
    osc.stop(ac.currentTime + 0.25);
  } catch {
    /* ignore */
  }
}
