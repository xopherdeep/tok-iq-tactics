export type SoundCue =
  | 'menuHover'
  | 'select'
  | 'cancel'
  | 'newGame'
  | 'dialogueBlipHigh'
  | 'dialogueBlipMid'
  | 'dialogueBlipLow'
  | 'dialogueAdvance'
  | 'turnPlayer'
  | 'turnEnemy'
  | 'move'
  | 'stepLight'
  | 'stepHeavy'
  | 'wingFlap'
  | 'undo'
  | 'swordSwing'
  | 'shieldBlock'
  | 'arrowLoose'
  | 'arrowImpact'
  | 'arcane'
  | 'arcaneCharge'
  | 'radiantCast'
  | 'hit'
  | 'heavyHit'
  | 'criticalSlash'
  | 'miss'
  | 'unitDefeat'
  | 'heal'
  | 'fortressHeal'
  | 'xpTick'
  | 'levelUp'
  | 'upgradePick'
  | 'chronoRewind'
  | 'iqSurge'
  | 'iqDrop'
  | 'chiSwap'
  | 'victory'
  | 'defeat';

class TacticalAudioEngine {
  private context: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') {
      return null;
    }
    if (!this.context) {
      const AudioCtor =
        window.AudioContext ||
        (window as unknown as {webkitAudioContext: typeof AudioContext})
          .webkitAudioContext;
      if (!AudioCtor) {
        return null;
      }
      this.context = new AudioCtor();
    }
    if (this.context.state === 'suspended') {
      void this.context.resume();
    }
    return this.context;
  }

  private ensureNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const sampleCount = Math.floor(ctx.sampleRate * 0.6);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index++) {
      channel[index] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private playTone(
    frequency: number,
    endFrequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) {
      return;
    }

    const startTime = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(35, endFrequency),
      startTime + duration,
    );

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + Math.min(0.014, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }

  private playFilteredNoise(
    filterType: BiquadFilterType,
    startFreq: number,
    endFreq: number,
    duration: number,
    volume: number,
    q = 1.4,
    delay = 0,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) {
      return;
    }

    const startTime = ctx.currentTime + delay;
    const source = ctx.createBufferSource();
    source.buffer = this.ensureNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.setValueAtTime(q, startTime);
    filter.frequency.setValueAtTime(startFreq, startTime);
    filter.frequency.exponentialRampToValueAtTime(
      Math.max(80, endFreq),
      startTime + duration,
    );

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + Math.min(0.012, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(startTime);
    source.stop(startTime + duration + 0.02);
  }

  public play(cue: SoundCue): void {
    switch (cue) {
      case 'menuHover':
        this.playTone(620, 740, 0.035, 'sine', 0.03);
        break;
      case 'select':
        this.playTone(540, 720, 0.065, 'triangle', 0.08);
        this.playTone(810, 960, 0.045, 'sine', 0.04, 0.025);
        break;
      case 'cancel':
        this.playTone(390, 250, 0.08, 'triangle', 0.065);
        break;
      case 'newGame':
        this.playTone(392, 392, 0.14, 'triangle', 0.1, 0);
        this.playTone(493.88, 493.88, 0.14, 'triangle', 0.1, 0.08);
        this.playTone(587.33, 587.33, 0.16, 'triangle', 0.11, 0.16);
        this.playTone(783.99, 783.99, 0.36, 'sine', 0.13, 0.24);
        break;
      case 'dialogueBlipHigh': {
        const jitter = (Math.random() - 0.5) * 45;
        this.playTone(710 + jitter, 755 + jitter, 0.036, 'triangle', 0.045);
        break;
      }
      case 'dialogueBlipMid': {
        const jitter = (Math.random() - 0.5) * 35;
        this.playTone(480 + jitter, 515 + jitter, 0.04, 'triangle', 0.048);
        break;
      }
      case 'dialogueBlipLow': {
        const jitter = (Math.random() - 0.5) * 28;
        this.playTone(250 + jitter, 220 + jitter, 0.048, 'sawtooth', 0.04);
        break;
      }
      case 'dialogueAdvance':
        this.playTone(660, 880, 0.06, 'sine', 0.06);
        break;
      case 'turnPlayer':
        this.playTone(440, 440, 0.12, 'triangle', 0.09, 0);
        this.playTone(659.25, 659.25, 0.24, 'sine', 0.1, 0.09);
        break;
      case 'turnEnemy':
        this.playTone(220, 196, 0.16, 'sawtooth', 0.075, 0);
        this.playTone(164.81, 146.83, 0.28, 'sawtooth', 0.08, 0.12);
        break;
      case 'move':
      case 'stepLight':
        this.playFilteredNoise('bandpass', 720, 320, 0.06, 0.07, 1.8);
        this.playTone(240, 170, 0.055, 'triangle', 0.045);
        break;
      case 'stepHeavy':
        this.playTone(135, 68, 0.09, 'triangle', 0.11);
        this.playFilteredNoise('lowpass', 420, 150, 0.085, 0.09, 1.2);
        break;
      case 'wingFlap':
        this.playFilteredNoise('bandpass', 540, 1180, 0.14, 0.085, 1.1);
        this.playFilteredNoise('bandpass', 620, 980, 0.12, 0.06, 1.2, 0.09);
        break;
      case 'undo':
        this.playTone(440, 290, 0.085, 'triangle', 0.07);
        this.playTone(300, 220, 0.07, 'sine', 0.04, 0.04);
        break;
      case 'swordSwing':
        this.playFilteredNoise('bandpass', 1800, 420, 0.15, 0.11, 2.2);
        this.playTone(540, 190, 0.11, 'sawtooth', 0.065);
        break;
      case 'shieldBlock':
        this.playTone(920, 610, 0.16, 'square', 0.075);
        this.playTone(1380, 990, 0.12, 'triangle', 0.06, 0.015);
        this.playFilteredNoise('highpass', 1600, 900, 0.11, 0.075);
        break;
      case 'arrowLoose':
        this.playTone(310, 520, 0.07, 'triangle', 0.08);
        this.playFilteredNoise('bandpass', 2400, 980, 0.13, 0.095, 2.8, 0.02);
        break;
      case 'arrowImpact':
        this.playTone(240, 95, 0.09, 'triangle', 0.11);
        this.playFilteredNoise('bandpass', 1400, 460, 0.08, 0.1, 1.8);
        break;
      case 'arcaneCharge':
        this.playTone(340, 780, 0.18, 'sine', 0.075);
        this.playTone(510, 1020, 0.18, 'triangle', 0.055, 0.03);
        break;
      case 'arcane':
        this.playTone(620, 1040, 0.16, 'sine', 0.09);
        this.playTone(880, 420, 0.22, 'triangle', 0.08, 0.05);
        this.playFilteredNoise('highpass', 2200, 900, 0.16, 0.06, 1.5, 0.03);
        break;
      case 'radiantCast':
        this.playTone(587.33, 880, 0.16, 'sine', 0.085, 0);
        this.playTone(880, 1174.66, 0.18, 'triangle', 0.07, 0.06);
        this.playTone(1174.66, 1567.98, 0.22, 'sine', 0.055, 0.12);
        break;
      case 'hit':
        this.playTone(215, 78, 0.13, 'sawtooth', 0.11);
        this.playFilteredNoise('bandpass', 1100, 260, 0.11, 0.095, 1.4);
        break;
      case 'heavyHit':
        this.playTone(148, 44, 0.25, 'sawtooth', 0.15);
        this.playTone(310, 82, 0.18, 'square', 0.095);
        this.playFilteredNoise('lowpass', 950, 180, 0.22, 0.13, 1.1);
        break;
      case 'criticalSlash':
        this.playFilteredNoise('bandpass', 2600, 600, 0.19, 0.12, 2.0);
        this.playTone(760, 180, 0.18, 'sawtooth', 0.12);
        this.playTone(1140, 320, 0.16, 'triangle', 0.09, 0.04);
        break;
      case 'miss':
        this.playFilteredNoise('bandpass', 1300, 680, 0.12, 0.065, 2.4);
        this.playTone(360, 230, 0.11, 'sine', 0.045);
        break;
      case 'unitDefeat':
        this.playTone(260, 62, 0.34, 'sawtooth', 0.12);
        this.playFilteredNoise('bandpass', 1800, 220, 0.36, 0.11, 1.3, 0.04);
        this.playTone(520, 140, 0.28, 'triangle', 0.08, 0.08);
        break;
      case 'heal':
        this.playTone(523.25, 659.25, 0.15, 'sine', 0.085, 0);
        this.playTone(659.25, 783.99, 0.16, 'sine', 0.08, 0.08);
        this.playTone(783.99, 1046.5, 0.22, 'triangle', 0.08, 0.16);
        break;
      case 'fortressHeal':
        this.playTone(392, 523.25, 0.16, 'sine', 0.07, 0);
        this.playTone(587.33, 783.99, 0.22, 'sine', 0.065, 0.09);
        break;
      case 'xpTick':
        this.playTone(880, 980, 0.028, 'sine', 0.032);
        break;
      case 'levelUp':
        this.playTone(523.25, 523.25, 0.11, 'triangle', 0.11, 0);
        this.playTone(659.25, 659.25, 0.11, 'triangle', 0.11, 0.08);
        this.playTone(783.99, 783.99, 0.12, 'triangle', 0.12, 0.16);
        this.playTone(987.77, 987.77, 0.13, 'triangle', 0.12, 0.24);
        this.playTone(1046.5, 1046.5, 0.34, 'sine', 0.14, 0.33);
        break;
      case 'upgradePick':
        this.playTone(440, 587.33, 0.12, 'triangle', 0.09, 0);
        this.playTone(587.33, 880, 0.24, 'sine', 0.1, 0.09);
        break;
      case 'chronoRewind':
        this.playFilteredNoise('bandpass', 2400, 320, 0.28, 0.09, 2.2, 0);
        this.playTone(980, 320, 0.22, 'sine', 0.095, 0);
        this.playTone(340, 880, 0.24, 'triangle', 0.085, 0.14);
        this.playTone(659.25, 1318.5, 0.2, 'sine', 0.06, 0.24);
        break;
      case 'iqSurge':
        this.playTone(659.25, 880, 0.09, 'sine', 0.075, 0);
        this.playTone(987.77, 1318.5, 0.14, 'triangle', 0.065, 0.05);
        break;
      case 'iqDrop':
        this.playTone(310, 210, 0.14, 'triangle', 0.065, 0);
        break;
      case 'chiSwap':
        this.playTone(420, 630, 0.065, 'triangle', 0.075, 0);
        this.playTone(630, 840, 0.075, 'sine', 0.06, 0.04);
        break;
      case 'victory':
        this.playTone(440, 440, 0.14, 'triangle', 0.1, 0);
        this.playTone(554.37, 554.37, 0.14, 'triangle', 0.1, 0.11);
        this.playTone(659.25, 659.25, 0.16, 'triangle', 0.11, 0.22);
        this.playTone(880, 880, 0.38, 'sine', 0.13, 0.34);
        break;
      case 'defeat':
        this.playTone(329.63, 277.18, 0.22, 'sawtooth', 0.09, 0);
        this.playTone(246.94, 185, 0.24, 'sawtooth', 0.095, 0.18);
        this.playTone(174.61, 110, 0.42, 'sawtooth', 0.1, 0.36);
        break;
    }
  }
}

export const tacticalAudio = new TacticalAudioEngine();
