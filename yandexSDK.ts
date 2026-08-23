declare global {
    interface Window {
        YaGames: any;
        ysdk: any;
    }
}
import { safeGetItem, safeSetItem, safeRemoveItem } from './components/storage';
import { setLang } from './i18n';

class YandexSDKWrapper {
    private ysdk: any = null;
    private player: any = null;
    private initialized = false;
    private initPromise: Promise<void> | null = null;
    private gameplayRequested = false;
    private gameplayStartPending = false;
    private platformPaused = false;
    private platformEventListenersBound = false;
    private platformPauseListeners = new Set<(paused: boolean) => void>();
    private gameReadyReported = false;
    private pendingCloudSave: any = null;
    private cloudSaveTimer: ReturnType<typeof setTimeout> | null = null;

    private notifyPlatformPause(paused: boolean) {
        this.platformPaused = paused;
        for (const listener of this.platformPauseListeners) {
            try {
                listener(paused);
            } catch (e) {
                console.error('Platform pause listener failed:', e);
            }
        }
        if (!paused && this.gameplayStartPending && this.gameplayRequested && !document.hidden) {
            this.gameplayStartPending = false;
            this.applyGameplayState(true);
        }
    }

    private bindPlatformEvents() {
        if (this.platformEventListenersBound || typeof this.ysdk?.on !== 'function') return;
        this.ysdk.on('game_api_pause', () => this.notifyPlatformPause(true));
        this.ysdk.on('game_api_resume', () => this.notifyPlatformPause(false));
        this.platformEventListenersBound = true;
    }

    onPlatformPauseChange(listener: (paused: boolean) => void): () => void {
        this.platformPauseListeners.add(listener);
        listener(this.platformPaused);
        return () => this.platformPauseListeners.delete(listener);
    }

    private applyGameplayState(active: boolean) {
        const gameplayAPI = this.ysdk?.features?.GameplayAPI;
        if (!gameplayAPI) return;
        try {
            if (active) gameplayAPI.start();
            else gameplayAPI.stop();
        } catch (e) {
            console.warn('Failed to update Yandex GameplayAPI state:', e);
        }
    }

    startGameplay() {
        this.gameplayRequested = true;
        if (!this.platformPaused && (typeof document === 'undefined' || !document.hidden)) {
            this.gameplayStartPending = false;
            this.applyGameplayState(true);
        } else {
            this.gameplayStartPending = true;
        }
    }

    stopGameplay() {
        this.gameplayRequested = false;
        this.gameplayStartPending = false;
        this.applyGameplayState(false);
    }

    private loadSDKScript(): Promise<void> {
        if (window.YaGames) return Promise.resolve();
        return new Promise((resolve, reject) => {
            const existing = document.querySelector<HTMLScriptElement>('script[data-yandex-games-sdk]');
            if (existing) {
                existing.addEventListener('load', () => resolve(), { once: true });
                existing.addEventListener('error', () => reject(new Error('Yandex Games SDK failed to load')), { once: true });
                return;
            }
            const script = document.createElement('script');
            // Games uploaded as an archive must use the platform-proxied SDK path.
            // See: https://yandex.ru/dev/games/doc/ru/sdk/sdk-about#install
            script.src = '/sdk.js';
            script.async = true;
            script.dataset.yandexGamesSdk = 'true';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Yandex Games SDK failed to load'));
            document.head.appendChild(script);
        });
    }

    async init() {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = this.initialize();
        try {
            await this.initPromise;
        } finally {
            this.initPromise = null;
        }
    }

    private async initialize() {

        try {
            // Check URL for lang parameter for local testing
            const urlParams = new URLSearchParams(window.location.search);
            const urlLang = urlParams.get('lang');
            if (urlLang) {
                setLang(urlLang);
            }

            const isLocalStandalone = (
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1'
            ) && window.self === window.top;

            if (isLocalStandalone) {
                console.info('Yandex Games SDK disabled for standalone local preview.');
                return;
            }

            await this.loadSDKScript();

            if (typeof window !== 'undefined' && window.YaGames) {
                this.ysdk = await window.YaGames.init();
                window.ysdk = this.ysdk; // expose globally if needed
                this.initialized = true;
                console.log('Yandex Games SDK initialized');
                this.bindPlatformEvents();
                
                if (!urlLang && this.ysdk.environment && this.ysdk.environment.i18n) {
                    setLang(this.ysdk.environment.i18n.lang);
                }
                if (this.gameplayRequested && !this.platformPaused && !document.hidden) {
                    this.applyGameplayState(true);
                }
                try {
                    this.player = await this.ysdk.getPlayer();
                    console.log('Yandex Player initialized');
                } catch(e) {
                    console.warn('Failed to init Yandex Player (auth maybe required):', e);
                }
            } else {
                console.warn('YaGames SDK script not loaded or not running in Yandex environment.');
            }
        } catch (e) {
            console.error('Failed to initialize Yandex Games SDK:', e);
        }
    }

    async markGameReady(): Promise<void> {
        if (this.gameReadyReported || !this.initialized || !this.ysdk) return;

        const loadingAPI = this.ysdk.features?.LoadingAPI;
        if (!loadingAPI?.ready) {
            console.warn('Yandex LoadingAPI is unavailable.');
            return;
        }

        try {
            await Promise.resolve(loadingAPI.ready());
            this.gameReadyReported = true;
            console.log('Yandex LoadingAPI ready called after the game became interactive');
        } catch (e) {
            console.error('Failed to report Yandex Game Ready:', e);
        }
    }

    /**
     * Показывает полноэкранную рекламу.
     */
    showFullscreenAd(onClose?: (wasShown: boolean) => void) {
        if (!this.initialized || !this.ysdk) {
            console.log('[Dev] Mocking Yandex Fullscreen Ad');
            if (onClose) onClose(false);
            return;
        }

        this.ysdk.adv.showFullscreenAdv({
            callbacks: {
                onClose: (wasShown: boolean) => {
                    console.log('Fullscreen ad closed, wasShown:', wasShown);
                    if (onClose) onClose(wasShown);
                },
                onError: (error: any) => {
                    console.error('Error while opening fullscreen ad:', error);
                }
            }
        });
    }

    private async persistPendingCloudSave(flush: boolean): Promise<void> {
        if (!this.player || !this.pendingCloudSave) return;
        const data = this.pendingCloudSave;
        this.pendingCloudSave = null;
        try {
            await this.player.setData(data, flush);
            console.log('Data saved to Yandex Cloud');
        } catch (e) {
            console.error('Failed to save to Yandex Cloud', e);
            // Preserve the newest unsaved state for the next attempt.
            if (!this.pendingCloudSave || (this.pendingCloudSave.__savedAt ?? 0) < data.__savedAt) {
                this.pendingCloudSave = data;
            }
        }
    }

    async saveData(data: any, flush = false): Promise<void> {
        const stampedData = { ...data, __savedAt: Date.now() };
        // Local persistence is synchronous, so an immediate reload cannot lose the last action.
        safeSetItem('polycity_save', JSON.stringify(stampedData));

        if (!this.player) return;
        this.pendingCloudSave = stampedData;

        if (flush) {
            if (this.cloudSaveTimer) {
                clearTimeout(this.cloudSaveTimer);
                this.cloudSaveTimer = null;
            }
            await this.persistPendingCloudSave(true);
            return;
        }

        // Coalesce rapid simulation changes and remain below the SDK limit of 100 calls per 5 minutes.
        if (!this.cloudSaveTimer) {
            this.cloudSaveTimer = setTimeout(() => {
                this.cloudSaveTimer = null;
                void this.persistPendingCloudSave(false);
            }, 4000);
        }
    }

    async loadData(): Promise<any> {
        let localData: any = null;
        const local = safeGetItem('polycity_save');
        if (local) {
            try {
                localData = JSON.parse(local);
            } catch (e) {
                console.warn('Failed to parse local save:', e);
            }
        }

        if (this.player) {
            try {
                const cloudData = await this.player.getData();
                if (cloudData && Object.keys(cloudData).length > 0) {
                    const cloudTimestamp = cloudData.__savedAt ?? 0;
                    const localTimestamp = localData?.__savedAt ?? 0;
                    return localData && localTimestamp > cloudTimestamp ? localData : cloudData;
                }
            } catch (e) {
                console.error('Failed to load from Yandex Cloud', e);
            }
        }
        return localData;
    }

    async clearData(): Promise<void> {
        if (this.cloudSaveTimer) {
            clearTimeout(this.cloudSaveTimer);
            this.cloudSaveTimer = null;
        }
        this.pendingCloudSave = null;
        safeRemoveItem('polycity_save');
        if (!this.player) return;
        try {
            await this.player.setData({}, true);
        } catch (e) {
            console.error('Failed to clear Yandex Cloud save', e);
        }
    }

    /**
     * Показывает рекламу за вознаграждение.
     */
    showRewardedVideo(
        onRewarded: () => void,
        onOpen?: () => void,
        onClose?: () => void,
        onError?: (err: any) => void
    ) {
        if (!this.initialized || !this.ysdk) {
            // Если мы тестируем локально вне Яндекса, просто выдаем награду (mock)
            console.log('[Dev] Mocking Yandex Rewarded Video');
            if (onOpen) onOpen();
            setTimeout(() => {
                onRewarded();
                if (onClose) onClose();
            }, 1500);
            return;
        }

        this.ysdk.adv.showRewardedVideo({
            callbacks: {
                onOpen: () => {
                    console.log('Video ad open.');
                    if (onOpen) onOpen();
                },
                onRewarded: () => {
                    console.log('Rewarded!');
                    onRewarded();
                },
                onClose: () => {
                    console.log('Video ad closed.');
                    if (onClose) onClose();
                },
                onError: (e: any) => {
                    console.error('Error while opening video ad:', e);
                    
                    // Если мы тестируем локально или на тестовом сервере, и реклама не грузится, выдаем тестовую награду
                    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.includes('onrender')) {
                        console.log('[Dev] Fallback on error: Mocking reward.');
                        onRewarded();
                        if (onClose) onClose();
                        return;
                    }

                    if (onError) onError(e);
                }
            }
        });
    }
}

export const yandexSDK = new YandexSDKWrapper();
