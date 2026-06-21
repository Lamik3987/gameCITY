// Процедурный генератор звуков без внешних файлов!
class SoundEngine {
    private ctx: AudioContext | null = null;
    private enabled = true;
    private bgm: HTMLAudioElement | null = null;
    private bgmVolume = 0.5;
    private sfxVolume = 0.5;

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            
            // Handle Yandex Games requirement 1.3: Sound outside game
            if (typeof document !== 'undefined') {
                document.addEventListener('visibilitychange', () => {
                    if (document.hidden) {
                        if (this.ctx?.state === 'running') this.ctx.suspend();
                        if (this.bgm && !this.bgm.paused) this.bgm.pause();
                    } else {
                        if (this.ctx?.state === 'suspended') this.ctx.resume();
                        if (this.bgm && this.bgmVolume > 0) this.bgm.play().catch(() => {});
                    }
                });
            }
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.initBGM();
    }

    private initBGM() {
        if (!this.bgm) {
            this.bgm = new Audio('./bgm.mp3');
            this.bgm.loop = true;
            this.bgm.volume = this.bgmVolume;
        }
        if (this.bgm.paused && this.bgmVolume > 0) {
            this.bgm.play().catch(e => console.log('BGM wait interaction:', e));
        }
    }

    setBgmVolume(v: number) {
        this.bgmVolume = Math.max(0, Math.min(1, v));
        if (this.bgm) {
            this.bgm.volume = this.bgmVolume;
            if (this.bgmVolume > 0 && this.bgm.paused) {
                this.bgm.play().catch(e => {});
            }
        } else if (this.bgmVolume > 0) {
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
