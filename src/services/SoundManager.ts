import { getBasePath } from "../utils/paths";
import logger from "../utils/logger";

const SOUND_NAMES = [
  "capture",
  "castle",
  "check",
  "gameEnd",
  "gameStart",
  "illegalMove",
  "opponentMove",
  "playerMove",
  "premove",
  "promote",
];

class SoundManager {
  audioContext: AudioContext;
  audioBuffers: Map<string, AudioBuffer>;
  preloaded: boolean;
  globalVolume: number;

  constructor() {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext)();
    } catch {
      logger.warn("Web Audio API is not supported in this browser. Sound will be disabled.");
      // Create a dummy context that does nothing
      this.audioContext = null as unknown as AudioContext;
    }
    this.audioBuffers = new Map();
    this.preloaded = false;
    this.globalVolume = 1;
  }

  async _ensureAudioContextReady(): Promise<void> {
    if (!this.audioContext || this.audioContext.state === "suspended") {
      if (this.audioContext) {
        await this.audioContext.resume();
      }
    }
  }

  async preloadAllSounds(): Promise<void> {
    if (this.preloaded) return;
    const basePath = getBasePath();
    await Promise.all(
      SOUND_NAMES.map(async (name) => {
        try {
          const response = await fetch(`${basePath}/sounds/${name}.mp3`);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
          this.audioBuffers.set(name, audioBuffer);
        } catch (error) {
          logger.error(`Failed to load sound: ${name}`, error);
        }
      })
    );
    this.preloaded = true;
  }

  async play(name: string, volume: number = 1): Promise<void> {
    if (!this.audioContext) return;
    await this._ensureAudioContextReady();
    if (!this.preloaded) await this.preloadAllSounds();

    const buffer = this.audioBuffers.get(name);
    if (!buffer) {
      logger.error(`Sound "${name}" not loaded.`);
      return;
    }

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume * this.globalVolume;

    source.buffer = buffer;
    source.connect(gainNode).connect(this.audioContext.destination);
    source.start();
  }

  setGlobalVolume(volume: number): void {
    if (volume < 0 || volume > 1 || volume === this.globalVolume) return;
    this.globalVolume = volume;
  }

  playMoveSound(
    moveType:
      | "capture"
      | "castle"
      | "check"
      | "checkmate"
      | "gameEnd"
      | "gameStart"
      | "illegalMove"
      | "opponentMove"
      | "playerMove"
      | "premove"
      | "promote"
  ): void {
    if (moveType === "checkmate") {
      this.play("check", 1);
      this.play("gameEnd", 1);
      return;
    }
    const sound = SOUND_NAMES.includes(moveType) ? moveType : "playerMove";
    this.play(sound, 1);
  }

  playGameStateSound(state: "start" | "end" | "draw"): void {
    switch (state) {
      case "start":
        this.play("gameStart", 1);
        break;
      case "end":
      case "draw":
        this.play("gameEnd", 1);
        break;
    }
  }
}

const soundManager = new SoundManager();
export default soundManager;
