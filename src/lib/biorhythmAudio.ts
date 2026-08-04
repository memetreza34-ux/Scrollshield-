/**
 * ScrollShield Endel-Style Generative Biorhythm Audio Engine
 * Uses pure HTML5 Web Audio API to synthesize Binaural Beats & Ambient Waves.
 * Zero external mp3 dependencies - works 100% offline forever.
 */

export class BiorhythmAudioEngine {
  private audioCtx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private oscLeft: OscillatorNode | null = null;
  private oscRight: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  private initAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
  }

  public startFocusSoundscape(frequencyBase: number = 216, binauralBeatFreq: number = 10) {
    this.initAudioContext();
    if (!this.audioCtx) return;

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.stopSoundscape();

    const merger = this.audioCtx.createChannelMerger(2);
    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.setValueAtTime(0.08, this.audioCtx.currentTime); // Soft background level

    // Left Ear Oscillator (e.g. 216 Hz)
    this.oscLeft = this.audioCtx.createOscillator();
    this.oscLeft.type = 'sine';
    this.oscLeft.frequency.setValueAtTime(frequencyBase, this.audioCtx.currentTime);
    this.oscLeft.connect(merger, 0, 0); // left channel

    // Right Ear Oscillator (e.g. 226 Hz -> 10Hz Alpha Waves for Focus)
    this.oscRight = this.audioCtx.createOscillator();
    this.oscRight.type = 'sine';
    this.oscRight.frequency.setValueAtTime(frequencyBase + binauralBeatFreq, this.audioCtx.currentTime);
    this.oscRight.connect(merger, 0, 1); // right channel

    merger.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);

    this.oscLeft.start();
    this.oscRight.start();
    this.isPlaying = true;
  }

  public stopSoundscape() {
    if (this.oscLeft) {
      try { this.oscLeft.stop(); } catch (e) {}
      this.oscLeft.disconnect();
      this.oscLeft = null;
    }
    if (this.oscRight) {
      try { this.oscRight.stop(); } catch (e) {}
      this.oscRight.disconnect();
      this.oscRight = null;
    }
    this.isPlaying = false;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const biorhythmAudio = new BiorhythmAudioEngine();
