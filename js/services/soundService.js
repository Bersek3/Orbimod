/**
 * NEXUS MOD DECK — AUDIO FEEDBACK SERVICE (Web Audio API)
 * Zero external assets required, rich synthesized sound design
 */

class SoundService {
  constructor() {
    this.audioCtx = null;
    this.enabled = true;
    this.volume = 0.5;
    this._keepAliveNode = null;
  }

  _init() {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    } catch (e) {}
  }

  /**
   * Starts a silent background keep-alive audio signal.
   * This signals the OS and browser (Chromium/WebKit/Gecko) that the tab is
   * an active audio/video media workstation, preventing streams and WebSockets
   * from pausing or being throttled when switching tabs or minimizing the window.
   */
  startBackgroundPlaybackKeepAlive() {
    this._init();
    if (!this.audioCtx) return;

    try {
      if (!this._keepAliveNode) {
        const silentBuffer = this.audioCtx.createBuffer(1, this.audioCtx.sampleRate * 2, this.audioCtx.sampleRate);
        const source = this.audioCtx.createBufferSource();
        source.buffer = silentBuffer;
        source.loop = true;

        const gainNode = this.audioCtx.createGain();
        gainNode.gain.value = 0.00001; // Inaudible keep-alive heartbeat

        source.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        source.start();

        this._keepAliveNode = source;
      }
    } catch (e) {
      console.warn('[KeepAlive] AudioContext keep alive error', e);
    }
  }

  toggleSound(forceState) {
    if (forceState !== undefined) {
      this.enabled = forceState;
    } else {
      this.enabled = !this.enabled;
    }
    return this.enabled;
  }

  // Deep ban thump
  playBanSound() {
    if (!this.enabled) return;
    this._init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const now = this.audioCtx.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

      gain.gain.setValueAtTime(this.volume * 0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  // Tech timeout chirp
  playTimeoutSound() {
    if (!this.enabled) return;
    this._init();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const now = this.audioCtx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.18);

      gain.gain.setValueAtTime(this.volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.19);
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  // AutoMod flagged queue alert
  playFlagAlert() {
    if (!this.enabled) return;
    this._init();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      [659.25, 880].forEach((freq, i) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const startTime = now + (i * 0.08);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(this.volume * 0.5, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.16);
      });
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }

  // Incoming Raid fanfare
  playRaidAlert() {
    if (!this.enabled) return;
    this._init();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        const startTime = now + (i * 0.09);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(this.volume * 0.45, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.23);
      });
    } catch (e) {
      console.warn('Audio play error', e);
    }
  }
}

export const soundService = new SoundService();
