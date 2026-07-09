// Процедурный генератор звуков без внешних файлов!
// BGM uses Web Audio API (AudioBufferSourceNode) to avoid system media player (Yandex requirement 1.6.2.5 / 1.6.1.6)
class SoundEngine {
    private ctx: AudioContext | null = null;
    private enabled = true;
    private bgmBuffer: AudioBuffer | null = null;
    private bgmSource: AudioBufferSourceNode | null = null;
    private bgmGain: GainNode | null = null;
    private bgmVolume = 0.5;
    private sfxVolume = 0.5;
    private bgmPlaying = false;
    private bgmStartOffset = 0;
    private bgmStartTime = 0;
    private bgmLoaded = false;

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.bgmGain = this.ctx.createGain();
            this.bgmGain.connect(this.ctx.destination);
            this.bgmGain.gain.value = this.bgmVolume;
            
            // Handle Yandex Games requirement 1.3: Sound outside game
            if (typeof document !== 'undefined') {
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden) {
                        if (this.ctx?.state === 'running') this.ctx.suspend();
                    } else {
                        if (this.ctx?.state === 'suspended') this.ctx.resume();
                    }
                });
            }
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.initBGM();
    }

    private async initBGM() {
        if (this.bgmLoaded || !this.ctx) return;
        this.bgmLoaded = true; // prevent double-loading
        
        try {
            const response = await fetch('./bgm.mp3');
            const arrayBuffer = await response.arrayBuffer();
            this.bgmBuffer = await this.ctx.decodeAudioData(arrayBuffer);
            if (this.bgmVolume > 0) {
                this.startBGM();
            }
        } catch (e) {
            console.log('BGM load failed:', e);
            this.bgmLoaded = false; // allow retry
        }
    }

    private startBGM() {
        if (!this.ctx || !this.bgmBuffer || !this.bgmGain || this.bgmPlaying) return;
        
        this.bgmSource = this.ctx.createBufferSource();
        this.bgmSource.buffer = this.bgmBuffer;
        this.bgmSource.loop = true;
        this.bgmSource.connect(this.bgmGain);
        this.bgmSource.start(0, this.bgmStartOffset % this.bgmBuffer.duration);
        this.bgmStartTime = this.ctx.currentTime;
        this.bgmPlaying = true;
        
        this.bgmSource.onended = () => {
            // Only mark as not playing if we didn't intentionally stop it
            if (this.bgmPlaying) {
                this.bgmPlaying = false;
            }
        };
    }

    private stopBGM() {
        if (this.bgmSource && this.bgmPlaying && this.ctx) {
            this.bgmStartOffset += this.ctx.currentTime - this.bgmStartTime;
            try {
                this.bgmSource.stop();
            } catch (e) {
                // ignore if already stopped
            }
            this.bgmSource = null;
            this.bgmPlaying = false;
        }
    }

    setBgmVolume(v: number) {
        this.bgmVolume = Math.max(0, Math.min(1, v));
        if (this.bgmGain) {
            this.bgmGain.gain.value = this.bgmVolume;
        }
        if (this.bgmVolume > 0 && !this.bgmPlaying && this.bgmBuffer) {
            this.startBGM();
        } else if (this.bgmVolume === 0 && this.bgmPlaying) {
            this.stopBGM();
        }
        if (this.bgmVolume > 0 && !this.bgmLoaded) {
            this.initBGM();
        }
    }

    setSfxVolume(v: number) {
        this.sfxVolume = Math.max(0, Math.min(1, v));
        this.enabled = this.sfxVolume > 0;
    }

    private playTone(freq: number, type: OscillatorType, duration: number, volMultiplier = 1) {
        if (!this.enabled || !this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(this.sfxVolume * volMultiplier, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // Звук постройки (глухой "плоп")
    playBuild() {
        this.init();
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    // Звук заработка денег (дзинь!)
    playCoin() {
        this.init();
        this.playTone(1200, 'sine', 0.1, 0.5);
        setTimeout(() => this.playTone(1600, 'sine', 0.3, 0.5), 50);
    }

    // Звук ошибки (буп!)
    playError() {
        this.init();
        this.playTone(150, 'sawtooth', 0.2, 0.8);
    }

    // Уровень ап (фанфары!)
    playLevelUp() {
        this.init();
        this.playTone(400, 'square', 0.2, 0.4);
        setTimeout(() => this.playTone(500, 'square', 0.2, 0.4), 200);
        setTimeout(() => this.playTone(600, 'square', 0.4, 0.4), 400);
    }
}

export const sounds = new SoundEngine();
