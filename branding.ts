import { getLang } from './i18n';

export const GAME_TITLES = {
  ru: 'SkyCity: Построй свой город!',
  en: 'SkyCity: Build Your City!',
} as const;

export const getGameTitle = () => GAME_TITLES[getLang()];
