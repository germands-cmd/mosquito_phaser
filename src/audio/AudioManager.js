/**
 * AudioManager.js
 * Web Audio API based procedural sound engine for "Mosquito".
 * Features:
 * - Directional 3D spatialization (HRTF PannerNode with Stereo fallback)
 * - Procedural mosquito buzzing synthesizer with pitch wobble and volume ramping
 * - Procedural tactile SFX: swat hit slap, whoosh miss, bite sting
 * - Zero external audio file dependencies
 */

export const DIRECTIONS = {
  LEFT: { name: 'LEFT', x: -1.0, y: 0.0, z: -0.5, pan: -1.0 },
  TOP_LEFT: { name: 'TOP_LEFT', x: -0.7, y: 0.7, z: -0.5, pan: -0.7 },
  TOP: { name: 'TOP', x: 0.0, y: 1.0, z: -0.5, pan: 0.0 },
  TOP_RIGHT: { name: 'TOP_RIGHT', x: 0.7, y: 0.7, z: -0.5, pan: 0.7 },
  RIGHT: { name: 'RIGHT', x: 1.0, y: 0.0, z: -0.5, pan: 1.0 }
};

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.isUnlocked = false;
    this.activeBuzz = null;
    this.masterGain = null;
  }

  /**
   * Initializes or resumes the AudioContext upon user gesture.
   */
  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.9;
        this.masterGain.connect(this.ctx.destination);

        // Position virtual listener
        if (this.ctx.listener) {
          if (this.ctx.listener.positionX) {
            this.ctx.listener.positionX.value = 0;
            this.ctx.listener.positionY.value = 0;
            this.ctx.listener.positionZ.value = 0;
            this.ctx.listener.forwardX.value = 0;
            this.ctx.listener.forwardY.value = 0;
            this.ctx.listener.forwardZ.value = -1;
            this.ctx.listener.upX.value = 0;
            this.ctx.listener.upY.value = 1;
            this.ctx.listener.upZ.value = 0;
          } else {
            this.ctx.listener.setPosition(0, 0, 0);
            this.ctx.listener.setOrientation(0, 0, -1, 0, 1, 0);
          }
        }
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isUnlocked = true;
  }

  /**
   * Starts a procedural mosquito buzz with directional spatialization.
   * @param {Object} directionObj - One of DIRECTIONS entries
   * @param {number} warningDuration - Duration in seconds (2 to 4s)
   */
  startMosquitoBuzz(directionObj, warningDuration = 3.0) {
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    // Stop any existing buzz
    this.stopMosquitoBuzz();

    const now = this.ctx.currentTime;

    // Create Spatial Panner or Stereo Panner
    let spatialNode = null;
    try {
      const panner = this.ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 10000;
      panner.rolloffFactor = 1;

      // Distance scaling factor
      const dist = 3.0;
      if (panner.positionX) {
        panner.positionX.setValueAtTime(directionObj.x * dist, now);
        panner.positionY.setValueAtTime(directionObj.y * dist, now);
        panner.positionZ.setValueAtTime(directionObj.z * dist, now);
      } else {
        panner.setPosition(directionObj.x * dist, directionObj.y * dist, directionObj.z * dist);
      }
      spatialNode = panner;
    } catch {
      // Fallback to stereo panner if HRTF unavailable
      if (this.ctx.createStereoPanner) {
        const stereo = this.ctx.createStereoPanner();
        stereo.pan.setValueAtTime(directionObj.pan, now);
        spatialNode = stereo;
      }
    }

    // Filter to shape insect buzz tone
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(directionObj.name === 'TOP' ? 3200 : 2500, now);
    filter.Q.setValueAtTime(2.5, now);

    // Gain node for volume envelope
    const gainNode = this.ctx.createGain();
    const startGain = 0.02;
    const peakGain = 0.75;
    gainNode.gain.setValueAtTime(startGain, now);
    // Smooth volume progression: increases over warning duration
    gainNode.gain.exponentialRampToValueAtTime(peakGain, now + warningDuration);

    // Primary oscillator: fundamental mosquito wing beat (280 Hz)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(285, now);

    // Secondary oscillator: harmonic (570 Hz)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(574, now);

    // LFO for frequency vibrato / jitter (organic insect buzz)
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(18, now); // 18 Hz wing flutter modulation

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(14, now); // +/- 14 Hz pitch wobble

    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    // Secondary slight AM jitter
    const amOsc = this.ctx.createOscillator();
    amOsc.type = 'triangle';
    amOsc.frequency.setValueAtTime(32, now);
    const amGain = this.ctx.createGain();
    amGain.gain.setValueAtTime(0.08, now);

    // Connect audio graph
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode);

    if (spatialNode) {
      gainNode.connect(spatialNode);
      spatialNode.connect(this.masterGain);
    } else {
      gainNode.connect(this.masterGain);
    }

    // Start oscillators
    osc1.start(now);
    osc2.start(now);
    lfo.start(now);
    amOsc.start(now);

    this.activeBuzz = {
      osc1,
      osc2,
      lfo,
      amOsc,
      gainNode,
      spatialNode,
      stop: () => {
        try {
          const stopTime = this.ctx.currentTime;
          gainNode.gain.cancelScheduledValues(stopTime);
          gainNode.gain.setValueAtTime(gainNode.gain.value, stopTime);
          gainNode.gain.linearRampToValueAtTime(0.0001, stopTime + 0.03);

          setTimeout(() => {
            try {
              osc1.stop();
              osc2.stop();
              lfo.stop();
              amOsc.stop();
              osc1.disconnect();
              osc2.disconnect();
              lfo.disconnect();
              amOsc.disconnect();
              gainNode.disconnect();
              if (spatialNode) spatialNode.disconnect();
            } catch {}
          }, 40);
        } catch {}
      }
    };

    return this.activeBuzz;
  }

  /**
   * Stops active mosquito buzz immediately.
   */
  stopMosquitoBuzz() {
    if (this.activeBuzz) {
      this.activeBuzz.stop();
      this.activeBuzz = null;
    }
  }

  /**
   * Tactile swat hit slap sound (impact noise burst + low-frequency thump).
   */
  playSwatHit() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Noise burst for slap/crack
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1400, now);
    noiseFilter.Q.setValueAtTime(1.5, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // Punchy low thump
    const thumpOsc = this.ctx.createOscillator();
    thumpOsc.type = 'sine';
    thumpOsc.frequency.setValueAtTime(180, now);
    thumpOsc.frequency.exponentialRampToValueAtTime(45, now + 0.09);

    const thumpGain = this.ctx.createGain();
    thumpGain.gain.setValueAtTime(0.7, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

    thumpOsc.connect(thumpGain);
    thumpGain.connect(this.masterGain);

    noiseSource.start(now);
    thumpOsc.start(now);
    thumpOsc.stop(now + 0.1);
  }

  /**
   * Whistle / whoosh sound on missed swat.
   */
  playSwatMiss() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(250, now + 0.12);
    filter.Q.setValueAtTime(3.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  /**
   * Sharp sting / pinch sound on mosquito bite.
   */
  playBite() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.18);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, now);
    filter.Q.setValueAtTime(2.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.19);
  }

  /**
   * Cleans up all audio nodes.
   */
  destroy() {
    this.stopMosquitoBuzz();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.ctx = null;
  }
}
