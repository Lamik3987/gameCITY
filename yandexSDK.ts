declare global {
    interface Window {
        YaGames: any;
        ysdk: any;
    }
}

class YandexSDKWrapper {
    private ysdk: any = null;
    private initialized = false;

    async init() {
        if (this.initialized) return;

        try {
            if (typeof window !== 'undefined' && window.YaGames) {
                this.ysdk = await window.YaGames.init();
                window.ysdk = this.ysdk; // expose globally if needed
                this.initialized = true;
                console.log('Yandex Games SDK initialized');
                if (this.ysdk.features && this.ysdk.features.LoadingAPI) {
                    this.ysdk.features.LoadingAPI.ready();
                    console.log('Yandex LoadingAPI ready called');
                }
            } else {
                console.warn('YaGames SDK script not loaded or not running in Yandex environment.');
            }
        } catch (e) {
            console.error('Failed to initialize Yandex Games SDK:', e);
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
                    // Если ошибка, мы можем закрыть диалог или вызвать onClose
                    if (onClose) onClose();
                }
            }
        });
    }
}

export const yandexSDK = new YandexSDKWrapper();
