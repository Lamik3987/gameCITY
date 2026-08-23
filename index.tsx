/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import ReactDOM from 'react-dom/client';
import { getLang } from './i18n';
import { getGameTitle } from './branding';
import { yandexSDK } from './yandexSDK';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const bootstrap = async () => {
  // Resolve the Yandex language before loading modules that create localized data.
  await yandexSDK.init();
  document.documentElement.lang = getLang();
  document.title = getGameTitle();

  const { default: App } = await import('./App');
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

void bootstrap().catch((error) => {
  console.error('Failed to start the game:', error);
  rootElement.textContent = '';
  rootElement.className = 'boot-failed';
});
