class SoundManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (!this.audioContext) {
            throw new Error('Web Audio API is not supported in this browser.');
        }
        this.sounds = {}; // Store loaded sounds
        this.globalVolume = 1; // Default global volume
        this.gainNodes = {}; // Store gain nodes for each sound
        this.destination = this.audioContext.destination; // Cache destination node

        // Ensure the audio context is in a ready state
        this._ensureAudioContextReady();

        // Pre-load the first sound
        this._preloadFirstSound();
    }

    async _ensureAudioContextReady() {
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }

    async _preloadFirstSound() {
        const firstSoundPath = '/Chess-game/sounds/playerMove.mp3';
        try {
            const response = await fetch(firstSoundPath);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.sounds['playerMove'] = audioBuffer;
            this.gainNodes['playerMove'] = this.audioContext.createGain();
            this.gainNodes['playerMove'].gain.value = this.globalVolume;
        } catch (error) {
            console.error(`Failed to preload first sound from ${firstSoundPath}:`, error);
        }
    }

    async loadSounds() {
        const soundEntries = Object.entries({
            capture: '/Chess-game/sounds/capture.mp3',
            castle: '/Chess-game/sounds/castle.mp3',
            check: '/Chess-game/sounds/check.mp3',
            gameEnd: '/Chess-game/sounds/gameEnd.mp3',
            gameStart: '/Chess-game/sounds/gameStart.mp3',
            illegalMove: '/Chess-game/sounds/illegalMove.mp3',
            opponentMove: '/Chess-game/sounds/opponentMove.mp3',
            playerMove: '/Chess-game/sounds/playerMove.mp3',
            promote: '/Chess-game/sounds/promote.mp3',
        });

        for (const [name, path] of soundEntries) {
            if (name === 'playerMove') continue; // Skip preloaded sound
            try {
                const response = await fetch(path);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.sounds[name] = audioBuffer;
                this.gainNodes[name] = this.audioContext.createGain();
                this.gainNodes[name].gain.value = this.globalVolume;
                // console.log(`${name} sound loaded`); // Remove debug log
            } catch (error) {
                console.error(`Failed to load sound "${name}" from ${path}:`, error);
            }
        }
    }

    async play(sound, volume = 1) {
        // console.log(`Playing sound "${sound}"`); // Remove debug log

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

        source.start(0);
    }

    setGlobalVolume(volume) {
        if (volume < 0 || volume > 1 || volume === this.globalVolume) {
            return;
        }
        this.globalVolume = volume;
        for (const gainNode of Object.values(this.gainNodes)) {
            gainNode.gain.value = volume;
        }
    }
}

const soundManager = new SoundManager();
export default soundManager;