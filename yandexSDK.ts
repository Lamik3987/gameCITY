declare global {
    interface Window {
        YaGames: any;
        ysdk: any;
    }
}
import { safeGetItem, safeSetItem } from './components/storage';
import { setLang } from './i18n';

class YandexSDKWrapper {
    private ysdk: any = null;
    private player: any = null;
    private initialized = false;

    async init() {
        if (this.initialized) return;

        try {
            // Check URL for lang parameter for local testing
            const urlParams = new URLSearchParams(window.location.search);
            const urlLang = urlParams.get('lang');
            if (urlLang) {
                setLang(urlLang);
            }

            if (typeof window !== 'undefined' && window.YaGames) {
                this.ysdk = await window.YaGames.init();
                window.ysdk = this.ysdk; // expose globally if needed
                this.initialized = true;
                console.log('Yandex Games SDK initialized');
                
                if (!urlLang && this.ysdk.environment && this.ysdk.environment.i18n) {
                    setLang(this.ysdk.environment.i18n.lang);
                }
                if (this.ysdk.features && this.ysdk.features.LoadingAPI) {
                    this.ysdk.features.LoadingAPI.ready();
                    console.log('Yandex LoadingAPI ready called');
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
                    if (onClose) onClose(false);
                }
            }
        });
    }

    async saveData(data: any): Promise<void> {
        if (this.player) {
            try {
                await this.player.setData(data);
                console.log('Data saved to Yandex Cloud');
            } catch (e) {
                console.error('Failed to save to Yandex Cloud', e);
                safeSetItem('polycity_save', JSON.stringify(data));
            }
        } else {
            safeSetItem('polycity_save', JSON.stringify(data));
        }
    }

    async loadData(): Promise<any> {
        if (this.player) {
            try {
                const data = await this.player.getData();
                if (data && Object.keys(data).length > 0) {
                    return data;
                }
            } catch (e) {
                console.error('Failed to load from Yandex Cloud', e);
            }
        }
        const local = safeGetItem('polycity_save');
        return local ? JSON.parse(local) : null;
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
                    // Если ошибка, мы можем закрыть диалог или вызвать onClose
                    if (onClose) onClose();
                }
            }
        });
    }
}

export const yandexSDK = new YandexSDKWrapper();
