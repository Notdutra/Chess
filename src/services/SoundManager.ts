import { getBasePath } from '../utils/paths';

class SoundManager {
  audioContext: AudioContext;
  sounds: Record<string, AudioBuffer>;
  globalVolume: number;
  gainNodes: Record<string, GainNode>;
  destination: AudioDestinationNode;

  constructor() {
    this.audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    if (!this.audioContext) {
      throw new Error('Web Audio API is not supported in this browser.');
    }
    this.sounds = {};
    this.globalVolume = 1;
    this.gainNodes = {};
    this.destination = this.audioContext.destination;
    this._ensureAudioContextReady();
    this._preloadFirstSound();
  }

  async _ensureAudioContextReady(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  async _preloadFirstSound(): Promise<void> {
    const basePath = getBasePath();
    const firstSoundPath = `${basePath}/sounds/playerMove.mp3`;
    try {
      const response = await fetch(firstSoundPath);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.sounds['playerMove'] = audioBuffer;
      this.gainNodes['playerMove'] = this.audioContext.createGain();
      this.gainNodes['playerMove'].gain.value = this.globalVolume;
    } catch (error) {
      console.error(
        `Failed to preload first sound from ${firstSoundPath}:`,
        error
      );
    }
  }

  async loadSounds(): Promise<void> {
    const basePath = getBasePath();
    const soundEntries = Object.entries({
      capture: `${basePath}/sounds/capture.mp3`,
      castle: `${basePath}/sounds/castle.mp3`,
      check: `${basePath}/sounds/check.mp3`,
      gameEnd: `${basePath}/sounds/gameEnd.mp3`,
      gameStart: `${basePath}/sounds/gameStart.mp3`,
      illegalMove: `${basePath}/sounds/illegalMove.mp3`,
      opponentMove: `${basePath}/sounds/opponentMove.mp3`,
      playerMove: `${basePath}/sounds/playerMove.mp3`,
      promote: `${basePath}/sounds/promote.mp3`,
    });

    for (const [name, path] of soundEntries) {
      if (name === 'playerMove') continue;
      try {
        const response = await fetch(path);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(
          arrayBuffer
        );
        this.sounds[name] = audioBuffer;
        this.gainNodes[name] = this.audioContext.createGain();
        this.gainNodes[name].gain.value = this.globalVolume;
      } catch (error) {
        console.error(`Failed to load sound "${name}" from ${path}:`, error);
      }
    }
  }

  async play(
    sound: string,
    volume: number = 1.5,
    delay: number = 0
  ): Promise<void> {
    await this._ensureAudioContextReady();

    const audioBuffer = this.sounds[sound];
    if (!audioBuffer) {
      console.error(`Sound "${sound}" not loaded.`);
      return;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNodes[sound]);
    this.gainNodes[sound].gain.value = volume * this.globalVolume;
    this.gainNodes[sound].connect(this.destination);

    // Use current time plus delay for precise timing
    source.start(this.audioContext.currentTime + delay);

    // Return a promise that resolves when the sound finishes playing
    return new Promise((resolve) => {
      source.onended = () => resolve();
      // Also resolve after the expected duration plus a small buffer
      setTimeout(resolve, audioBuffer.duration * 1000 + 100);
    });
  }

  /**
   * Play multiple sounds in sequence with precise timing
   */
  async playSequence(
    sounds: Array<{ name: string; volume?: number; delay?: number }>
  ): Promise<void> {
    let totalDelay = 0;
    for (const sound of sounds) {
      await this.play(sound.name, sound.volume || 1.5, totalDelay);
      totalDelay += sound.delay || 0.2; // Default 200ms between sounds
    }
  }

  setGlobalVolume(volume: number): void {
    if (volume < 0 || volume > 1 || volume === this.globalVolume) {
      return;
    }
    this.globalVolume = volume;
    for (const gainNode of Object.values(this.gainNodes)) {
      gainNode.gain.value = volume;
    }
  }

  /**
   * Play appropriate sound for a move based on move type
   */
  playMoveSound(
    moveType:
      | 'normal'
      | 'capture'
      | 'castle'
      | 'promotion'
      | 'en-passant'
      | 'check'
      | 'checkmate'
      | 'illegal'
  ): void {
    switch (moveType) {
      case 'capture':
        this.play('capture', 1.7);
        break;
      case 'castle':
        this.play('castle', 1.5);
        break;
      case 'promotion':
        this.play('promote', 1.6);
        break;
      case 'check':
        this.play('check', 1.7);
        break;
      case 'checkmate':
        this.playSequence([
          { name: 'check', volume: 1.5 },
          { name: 'gameEnd', volume: 1.8, delay: 0.3 },
        ]);
        break;
      case 'illegal':
        this.play('illegalMove', 1.0);
        break;
      case 'en-passant':
        this.play('capture', 1.6);
        break;
      case 'normal':
      default:
        this.play('playerMove', 1.5);
        break;
    }
  }

  /**
   * Play contextual game state sounds
   */
  playGameStateSound(state: 'start' | 'end' | 'draw'): void {
    switch (state) {
      case 'start':
        this.play('gameStart', 1.7);
        break;
      case 'end':
        this.play('gameEnd', 1.7);
        break;
      case 'draw':
        this.play('gameEnd', 1.3);
        break;
    }
  }

  /**
   * Play a very subtle hover sound effect when hovering over chess pieces
   */
  playHoverSound(volume: number = 0.08): void {
    if (!this.sounds['playerMove']) return;

    // Don't play the hover sound too frequently
    const now = Date.now();
    if (now - (this._lastHoverSound || 0) < 150) return;
    this._lastHoverSound = now;

    const source = this.audioContext.createBufferSource();
    source.buffer = this.sounds['playerMove'];

    // Create a gain node for this specific sound
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume * this.globalVolume * 0.3; // Very low volume

    // Create a filter for higher pitch
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;

    // Connect the nodes
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.destination);

    // Play a very short segment
    source.start(0, 0, 0.05); // Play only the first 50ms
  }

  // Track the last time a hover sound was played to prevent sound spamming
  private _lastHoverSound: number = 0;
}

const soundManager = new SoundManager();
export default soundManager;
