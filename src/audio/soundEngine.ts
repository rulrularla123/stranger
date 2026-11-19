const STORAGE_KEY = 'stranger2_audio_settings_v1';

interface AudioSettings {
  sfxVolume: number;
  bgmVolume: number;
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private bgmPlaying = false;
  private bgmTimer: number | null = null;
  private settings: AudioSettings = { sfxVolume: 70, bgmVolume: 45 };
  private lastStepAt = 0;

  constructor() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.sfxVolume === 'number') this.settings.sfxVolume = Math.max(0, Math.min(100, parsed.sfxVolume));
        if (typeof parsed.bgmVolume === 'number') this.settings.bgmVolume = Math.max(0, Math.min(100, parsed.bgmVolume));
      }
    } catch {
      // ignore storage issues
    }
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  setSfxVolume(vol: number) {
    this.settings.sfxVolume = Math.max(0, Math.min(100, Math.round(vol)));
    this.save();
  }

  setBgmVolume(vol: number) {
    this.settings.bgmVolume = Math.max(0, Math.min(100, Math.round(vol)));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime((this.settings.bgmVolume / 100) * 0.08, this.ctx.currentTime, 0.05);
    }
    this.save();
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // ignore
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  startAmbientBgm() {
    if (this.bgmPlaying) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.bgmPlaying = true;
    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.value = (this.settings.bgmVolume / 100) * 0.08;
    this.bgmGain.connect(ctx.destination);

    // Subtle museum mystery chord pulse (D minor / Dorian atmospheric arpeggio)
    const notes = [146.83, 220.0, 261.63, 293.66, 220.0, 329.63, 261.63, 196.0];
    let step = 0;
    const tick = () => {
      if (!this.bgmPlaying || !this.ctx || !this.bgmGain) return;
      if (this.settings.bgmVolume > 0 && this.ctx.state === 'running') {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const env = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(notes[step % notes.length], now);
        env.gain.setValueAtTime(0.0001, now);
        env.gain.linearRampToValueAtTime(0.35, now + 0.06);
        env.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
        osc.connect(env);
        env.connect(this.bgmGain);
        osc.start(now);
        osc.stop(now + 0.9);
        step++;
      }
      this.bgmTimer = window.setTimeout(tick, 950);
    };
    tick();
  }

  private playTone(
    freq: number,
    duration = 0.09,
    type: OscillatorType = 'square',
    gainMul = 0.14,
    slideTo?: number,
    delay = 0
  ) {
    if (this.settings.sfxVolume <= 0) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
    const amp = (this.settings.sfxVolume / 100) * gainMul;
    gain.gain.setValueAtTime(Math.max(0.001, amp), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playStep() {
    const now = performance.now();
    if (now - this.lastStepAt < 250) return;
    this.lastStepAt = now;
    this.playTone(135, 0.035, 'triangle', 0.07, 90);
  }

  playClick() {
    this.playTone(540, 0.045, 'square', 0.08, 660);
  }

  playPortalTransition() {
    this.playTone(280, 0.16, 'sine', 0.14, 480);
    this.playTone(420, 0.14, 'triangle', 0.11, 560, 0.06);
  }

  playRadio() {
    this.playTone(760, 0.06, 'square', 0.09);
    this.playTone(1040, 0.08, 'square', 0.09, undefined, 0.065);
  }

  playError() {
    this.playTone(210, 0.12, 'sawtooth', 0.1, 155);
  }

  playSolve() {
    this.playTone(523.25, 0.1, 'triangle', 0.15);
    this.playTone(659.25, 0.1, 'triangle', 0.15, undefined, 0.08);
    this.playTone(783.99, 0.16, 'triangle', 0.18, undefined, 0.16);
    this.playTone(1046.5, 0.25, 'sine', 0.18, undefined, 0.24);
  }

  playPowerOn() {
    this.playTone(110, 0.28, 'sawtooth', 0.14, 320);
    this.playTone(440, 0.22, 'triangle', 0.16, 880, 0.18);
    this.playTone(660, 0.35, 'sine', 0.16, undefined, 0.32);
  }

  playCoronation() {
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 987.77, 1046.5];
    fanfare.forEach((f, idx) => {
      this.playTone(f, idx === fanfare.length - 1 ? 0.55 : 0.14, 'triangle', 0.17, undefined, idx * 0.13);
    });
  }
}

export const soundEngine = new SoundEngine();
