/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { getGameTitle } from '../branding';
import { t } from '../i18n';

interface StartScreenProps {
  onStart: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart }) => {
  const gameTitle = getGameTitle();
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 text-white font-sans p-4 md:p-6 bg-black/30 backdrop-blur-sm transition-all duration-1000">
      <div className="max-w-md w-full bg-slate-900/90 p-5 sm:p-8 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-xl relative overflow-hidden animate-fade-in">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10">
            <h1 className="inline-block max-w-full text-3xl sm:text-4xl md:text-5xl font-black leading-[1.18] pb-2 mb-5 sm:mb-7 bg-gradient-to-br from-white via-cyan-200 to-blue-400 bg-clip-text text-transparent tracking-tight overflow-visible break-words" aria-label={gameTitle}>
            {gameTitle}
            </h1>

            <button 
            onClick={onStart}
            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/20 transform transition-all hover:scale-[1.02] active:scale-[0.98] text-lg tracking-wide"
            >
            {t('start_button')}
            </button>

        </div>
      </div>
    </div>
  );
};

export default StartScreen;
