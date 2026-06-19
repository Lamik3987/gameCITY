/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef, useState } from 'react';
import { Rnd } from 'react-rnd';
import { BuildingType, CityStats, NewsItem, BuildingCategory } from '../types';
import { BUILDINGS, MILESTONES } from '../constants';
import { TutorialManager } from './TutorialManager';
import { Maximize2, Minimize2, X, AlertCircle, ShoppingBag, Tv, Zap, Check, ChevronUp, ChevronDown, Settings, Home, Building2, Factory, Store, TreePine, Map, Trash2, Target, RotateCcw, RotateCw } from 'lucide-react';

interface UIOverlayProps {
  stats: CityStats;
  selectedTool: BuildingType | null;
  onSelectTool: (type: BuildingType | null) => void;
  newsFeed: NewsItem[];
  onAdReward: (reward: string) => void;
  setStats: React.Dispatch<React.SetStateAction<CityStats>>;
}

const CATEGORIES = [
  { id: BuildingCategory.Infrastructure, name: 'Дороги и Земля' },
  { id: BuildingCategory.Residential, name: 'Жилье' },
  { id: BuildingCategory.Commercial, name: 'Коммерция' },
  { id: BuildingCategory.Industrial, name: 'Промышленность' },
  { id: BuildingCategory.Decorations, name: 'Благоустройство' }
];

const ToolButton: React.FC<{
  type: BuildingType;
  isSelected: boolean;
  onClick: () => void;
  money: number;
  level: number;
  setToastMsg: (msg: string) => void;
  dynamicCost?: number;
}> = ({ type, isSelected, onClick, money, level, setToastMsg, dynamicCost }) => {
  const config = BUILDINGS[type];
  const actualCost = dynamicCost !== undefined ? dynamicCost : config.cost;
  const canAfford = money >= actualCost;
  const isBulldoze = type === BuildingType.None;
  const isLocked = !isBulldoze && config.minLevel > level;
  
  const bgColor = isBulldoze ? config.color : config.color;

  const handleClick = () => {
    if (isLocked) {
      setToastMsg(`Доступно на ${config.minLevel} уровне`);
      return;
    }
    onClick();
  };

  const getIcon = () => {
    if (isBulldoze) return <Trash2 size={20} className="text-white" />;
    if (type === BuildingType.Road) return <Map size={20} className="text-white" />;
    switch(config.category) {
      case BuildingCategory.Residential: return <Home size={20} className="text-white drop-shadow-md" />;
      case BuildingCategory.Commercial: return <Store size={20} className="text-white drop-shadow-md" />;
      case BuildingCategory.Industrial: return <Factory size={20} className="text-white drop-shadow-md" />;
      case BuildingCategory.Decorations: return <TreePine size={20} className="text-white drop-shadow-md" />;
      default: return <Building2 size={20} className="text-white drop-shadow-md" />;
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={(!isBulldoze && !canAfford) && !isLocked}
      className={`
        relative flex flex-col items-center justify-center rounded-xl border-2 transition-all shadow-lg backdrop-blur-sm flex-shrink-0
        w-16 h-16 md:w-20 md:h-20 overflow-hidden px-1
        ${isSelected ? 'border-white bg-white/20 scale-110 z-10' : 'border-gray-600 bg-gray-900/80 hover:bg-gray-800'}
        ${!isBulldoze && !canAfford && !isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      title={isLocked ? `Заблокировано до ур. ${config.minLevel}` : config.description}
    >
      <div className="w-8 h-8 rounded-full mb-1 flex items-center justify-center shadow-inner" style={{ backgroundColor: isBulldoze ? '#ef4444' : bgColor }}>
        {getIcon()}
      </div>
      <span className="text-[8px] md:text-[9px] font-bold text-white uppercase tracking-wider drop-shadow-md leading-tight text-center break-words w-full px-1 max-h-[2.4em] overflow-hidden">{config.name}</span>
      {actualCost > 0 && !isLocked && (
        <span className={`text-[9px] md:text-[10px] font-black leading-none mt-0.5 ${canAfford ? 'text-green-400' : 'text-red-400'}`}>${actualCost}</span>
      )}
      
      {isLocked && (
        <div className="absolute inset-0 bg-red-900/60 backdrop-blur-[2px] flex items-center justify-center z-20">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
      )}
    </button>
  );
};

const UIOverlay: React.FC<UIOverlayProps & { dynamicCosts?: Record<string, number>; moneyError?: boolean; }> = ({
  stats,
  selectedTool,
  onSelectTool,
  newsFeed,
  onAdReward,
  setStats,
  dynamicCosts,
  moneyError
}) => {
  const newsRef = useRef<HTMLDivElement>(null);
  
  const [upgradesVisible, setUpgradesVisible] = useState(false);
  const [newsVisible, setNewsVisible] = useState(true);
  const [newsMinimized, setNewsMinimized] = useState(false);
  const [missionsExpanded, setMissionsExpanded] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [newsSize, setNewsSize] = useState({ width: 320, height: 200 });
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [adPopupVisible, setAdPopupVisible] = useState(false);
  const [volume, setVolume] = useState(50);
  const [sfxVolume, setSfxVolume] = useState(50);
  const [newsZ, setNewsZ] = useState(10);
  const [activeCategory, setActiveCategory] = useState<BuildingCategory>(BuildingCategory.Infrastructure);
  const [toolbarExpanded, setToolbarExpanded] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const tutorialStep = stats.tutorialStep || 0;
  const currentTutorial = TutorialManager.getStep(tutorialStep);

  const getHighlightClass = (area: string) => {
    if (currentTutorial && currentTutorial.highlightArea === area) {
      return "z-50 ring-4 ring-yellow-400 rounded-2xl bg-black/20 shadow-[0_0_20px_rgba(250,204,21,0.5)] transition-all duration-300";
    }
    return "z-10 transition-all duration-300";
  };

  useEffect(() => {
    if (toastMsg) {
      const t = setTimeout(() => setToastMsg(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toastMsg]);

  const completeTutorial = () => {
     setStats(prev => ({ ...prev, tutorialStep: 0, tutorialCompleted: true }));
  };

  const nextTutorialStep = () => {
     setStats(prev => ({ ...prev, tutorialStep: (prev.tutorialStep || 0) + 1 }));
  };

  const prevTutorialStep = () => {
     setStats(prev => ({ ...prev, tutorialStep: Math.max(1, (prev.tutorialStep || 0) - 1) }));
  };

  const handleRotate = (dir: 1 | -1) => {
    window.dispatchEvent(new CustomEvent('rotateCamera', { detail: { dir } }));
  };

  useEffect(() => {
    const handleTriggerAd = () => {
       if (!adPopupVisible && !upgradesVisible && !settingsVisible) {
          setAdPopupVisible(true);
       }
    };
    
    window.addEventListener('trigger-ad-popup', handleTriggerAd);
    return () => {
       window.removeEventListener('trigger-ad-popup', handleTriggerAd);
    };
  }, [adPopupVisible, upgradesVisible, settingsVisible]);

  const performUpgrade = (type: 'tax' | 'road' | 'park', cost: number) => {
    if (stats.money >= cost) {
       setStats(prev => {
          let ups = {...prev.upgrades};
          if (type==='tax') ups.taxBoost += 0.1;
          if (type==='road') ups.roadDiscount += 0.2;
          if (type==='park') ups.parkBoost += 5;
          return { ...prev, money: prev.money - cost, upgrades: ups };
       });
    }
  };

  useEffect(() => {
    if (newsRef.current) {
      newsRef.current.scrollTop = newsRef.current.scrollHeight;
    }
  }, [newsFeed, newsMinimized]);

  const activeTools = Object.values(BUILDINGS)
     .filter(b => b.category === activeCategory)
     .map(b => b.type);

  const currentMilestone = MILESTONES.find(m => m.level === stats.level);
  const nextMilestone = MILESTONES.find(m => m.level === stats.level + 1);
  let levelProgress = 100;
  if (currentMilestone && nextMilestone) {
      const popDiff = Math.max(0, stats.population - currentMilestone.requiredPop);
      const reqDiff = Math.max(1, nextMilestone.requiredPop - currentMilestone.requiredPop);
      levelProgress = Math.min(100, (popDiff / reqDiff) * 100);
  }

  return (
    <div className="absolute inset-0 pointer-events-none p-2 md:p-4 font-sans z-10 overflow-hidden">
      
      {/* Dark Backdrop for Tutorial */}
      {currentTutorial && (
        <div className="absolute inset-0 z-40 bg-black/60 pointer-events-auto transition-opacity duration-500 backdrop-blur-sm" />
      )}

      <div className="absolute top-2 left-2 md:top-4 md:left-4 pointer-events-auto flex flex-col gap-2 z-40">
        <div className={`relative ${getHighlightClass('stats')} bg-gray-900/95 text-white p-1.5 md:p-3 rounded-xl border border-gray-700 shadow-xl backdrop-blur-md flex gap-2 md:gap-6 items-center w-full md:w-auto overflow-hidden`}>
          <div className={`flex flex-col ${moneyError ? 'animate-money-error' : ''} relative px-1`}>
            <span className="text-[7px] md:text-[10px] text-gray-400 uppercase font-bold tracking-widest leading-none">Казна</span>
            <span className={`text-base md:text-2xl font-black font-mono drop-shadow-md transition-colors ${moneyError ? 'text-red-500' : 'text-green-400'} leading-tight`}>${Math.floor(stats.money).toLocaleString()}</span>
            <span className="absolute -bottom-2 md:-bottom-3 left-1 text-[8px] md:text-[9px] font-black text-green-500">+{Math.floor(stats.population * 2 * (stats.happiness / 50) * (1 + (stats.upgrades?.taxBoost || 0)))}/д</span>
          </div>
          <div className="w-px h-5 md:h-8 bg-gray-700"></div>
          <div className="flex flex-col relative min-w-[70px]">
            <span className="text-[8px] md:text-[10px] text-gray-400 uppercase font-bold tracking-widest">{currentMilestone?.name || 'Город'} (Ур. {stats.level})</span>
            <span className="text-sm md:text-xl font-bold text-blue-300 font-mono drop-shadow-md leading-tight">{stats.population.toLocaleString()}</span>
            {nextMilestone && (
              <div className="w-full h-1 bg-gray-700 mt-0.5 rounded-full overflow-hidden absolute -bottom-1 md:-bottom-2" title={`До следующего уровня: ${stats.population} / ${nextMilestone.requiredPop}`}>
                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${levelProgress}%` }}></div>
              </div>
            )}
          </div>
          <div className="w-px h-5 md:h-8 bg-gray-700"></div>
          <div className="flex flex-col items-center">
             <span className="text-[7px] md:text-[10px] text-gray-400 uppercase font-bold tracking-widest leading-none">Счастье</span>
             <span className={`text-sm md:text-lg font-bold font-mono leading-tight ${stats.happiness > 70 ? 'text-green-400' : stats.happiness < 40 ? 'text-red-400' : 'text-yellow-400'}`}>{Math.floor(stats.happiness)}%</span>
          </div>
          <div className="w-px h-5 md:h-8 bg-gray-700"></div>
          <div className="flex flex-col items-end px-1">
             <span className="text-[7px] md:text-[10px] text-gray-400 uppercase font-bold tracking-widest leading-none">День</span>
             <span className="text-sm md:text-lg font-bold text-white font-mono leading-tight">{stats.day}</span>
          </div>
        </div>
        
        <div className={`relative ${getHighlightClass('top-buttons')} flex flex-col md:flex-row gap-2 items-start mt-1 p-0.5`}>
           <button 
             onPointerDown={(e) => { e.stopPropagation(); setUpgradesVisible(true); }}
             className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold p-2 md:py-2 md:px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 border border-purple-400/50 transition-transform active:scale-95 text-xs"
             title="Улучшения"
           >
             <ShoppingBag size={14} /> <span className="hidden md:inline">Улучшения</span>
           </button>
           {!newsVisible && (
            <button onPointerDown={(e) => { e.stopPropagation(); setNewsVisible(true); }} title="Новости" className="bg-gray-800 hover:bg-gray-700 text-white text-xs p-2 md:px-3 md:py-1.5 rounded-xl md:rounded-full shadow-lg flex items-center gap-1 border border-gray-600 transition-colors">
              <AlertCircle size={14} /> <span className="hidden md:inline">Открыть Новости</span>
            </button>
          )}
        </div>
      </div>

      {/* Quests / Starter Goals */}
      <div className={`absolute top-[130px] md:top-52 left-2 md:left-4 z-40 bg-gray-900/95 text-white p-2 md:p-3 rounded-xl border-l-4 border-l-indigo-500 shadow-xl backdrop-blur-md transition-all animate-fade-in ${missionsExpanded ? 'w-48' : 'w-auto'} ${getHighlightClass('center')}`}>
          <div 
             className={`flex items-center gap-2 ${missionsExpanded ? 'mb-2 border-b border-gray-700 pb-1' : ''} cursor-pointer select-none`}
             onPointerDown={(e) => { e.stopPropagation(); setMissionsExpanded(!missionsExpanded); }}
          >
             <Target size={14} className="text-indigo-400"/>
             {missionsExpanded && <span className="text-xs font-bold uppercase tracking-wider flex-1">Миссии</span>}
             {!missionsExpanded && <span className="text-[10px] font-bold text-indigo-300">Миссии</span>}
             {missionsExpanded && (
                <div className="p-0.5 hover:bg-gray-700 rounded"><ChevronUp size={12} className="text-gray-400" /></div>
             )}
          </div>
          {missionsExpanded && (
            <>
              {stats.population < 15 ? (
                  <div className="text-[10px] space-y-1">
                     <div className="flex justify-between items-center">
                        <span>Постройте дома</span>
                        <span className="text-indigo-300 font-bold">{stats.population}/15</span>
                     </div>
                     <div className="w-full bg-gray-700 h-1 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full transition-all" style={{width: `${Math.min(100, (stats.population/15)*100)}%`}}></div>
                     </div>
                     <div className="text-green-400 font-bold text-right pt-1 mt-1 border-t border-gray-800">Награда: $500</div>
                  </div>
              ) : stats.level < 2 ? (
                  <div className="text-[10px] space-y-1">
                     <div className="flex justify-between items-center">
                        <span>Достигните 2 ур.</span>
                        <span className="text-indigo-300 font-bold">{stats.level}/2</span>
                     </div>
                     <div className="w-full bg-gray-700 h-1 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full transition-all" style={{width: `${stats.level >= 2 ? 100 : 50}%`}}></div>
                     </div>
                     <div className="text-green-400 font-bold text-right pt-1 mt-1 border-t border-gray-800">Награда: $1500</div>
                  </div>
              ) : (
                  <div className="text-[10px] space-y-1">
                     <div className="flex justify-between items-center">
                        <span>Счастье &gt; 80%</span>
                        <span className="text-indigo-300 font-bold">{Math.floor(stats.happiness)}%</span>
                     </div>
                     <div className="w-full bg-gray-700 h-1 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full transition-all" style={{width: `${Math.min(100, stats.happiness)}%`}}></div>
                     </div>
                     <div className="text-green-400 font-bold text-right pt-1 mt-1 border-t border-gray-800">Ежедневный доход +50%</div>
                  </div>
              )}
            </>
          )}
      </div>

      {/* Camera Rotation Controls */}
      <div className="absolute top-1/2 -translate-y-1/2 w-full px-2 md:px-6 pointer-events-none flex justify-between z-30">
        <button onPointerDown={(e) => { e.stopPropagation(); handleRotate(1); }} className="pointer-events-auto bg-black/40 hover:bg-black/60 text-white/80 hover:text-white p-3 md:p-4 rounded-full backdrop-blur-md border border-white/20 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] active:scale-90">
           <RotateCcw size={24} />
        </button>
        <button onPointerDown={(e) => { e.stopPropagation(); handleRotate(-1); }} className="pointer-events-auto bg-black/40 hover:bg-black/60 text-white/80 hover:text-white p-3 md:p-4 rounded-full backdrop-blur-md border border-white/20 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] active:scale-90">
           <RotateCw size={24} />
        </button>
      </div>

      {/* Dynamic Tutorial Modal - Replaced with Help button logic if needed, but keeping existing for now with help toggle */}
      {currentTutorial && (
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-md px-4 pointer-events-none">
           <div className="bg-slate-900 border-2 border-indigo-500 p-5 rounded-2xl shadow-[0_10px_40px_-10px_rgba(99,102,241,0.5)] text-center pointer-events-auto transform animate-bounce-slight relative overflow-hidden">

             
             {/* Skip button */}
             <button onPointerDown={(e) => { e.stopPropagation(); completeTutorial(); }} className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs">
               <X size={14} /> Пропустить
             </button>

             <div className="mb-3 mt-4 flex justify-center">
                <div className="bg-indigo-500 p-3 rounded-full shadow-lg shadow-indigo-500/30">
                  <Tv className="text-white" size={28} />
                </div>
             </div>
             
             <h2 className="text-xl font-black text-white mb-2">{currentTutorial.title}</h2>
             <p className="text-sm text-slate-300 mb-6 leading-relaxed">{currentTutorial.text}</p>
             
             {/* Navigation Buttons */}
             <div className="flex gap-2">
               {tutorialStep > 1 && (
                 <button onPointerDown={(e) => { e.stopPropagation(); prevTutorialStep(); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl text-sm transition-all active:scale-95">
                   Назад
                 </button>
               )}
               
               {tutorialStep < 5 ? (
                 <button onPointerDown={(e) => { e.stopPropagation(); nextTutorialStep(); }} className="flex-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-sm shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all active:scale-95">
                   Далее
                 </button>
               ) : (
                 <button onPointerDown={(e) => { e.stopPropagation(); completeTutorial(); }} className="flex-2 w-full bg-green-500 hover:bg-green-400 text-white font-black py-3 rounded-xl text-sm shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all active:scale-95">
                   Начать Игру!
                 </button>
               )}
             </div>

             {/* Progress dots */}
             <div className="flex justify-center gap-2 mt-4">
                {[1,2,3,4,5].map(step => (
                   <div key={step} className={`w-2 h-2 rounded-full ${tutorialStep === step ? 'bg-indigo-400' : 'bg-slate-700'}`}></div>
                ))}
             </div>
           </div>
         </div>
      )}

      {/* Upgrades Modal */}
      {upgradesVisible && (
        <div className="absolute inset-0 bg-black/60 z-[100] flex items-center justify-center animate-fade-in backdrop-blur-sm pointer-events-auto">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-2">
               <h2 className="text-2xl font-black text-white flex items-center gap-2"><ShoppingBag className="text-purple-400"/> Исследования и Бусты</h2>
               <button onClick={() => setUpgradesVisible(false)} className="text-slate-400 hover:text-white"><X /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">Налоги +10%</h3>
                    <p className="text-xs text-slate-400 mt-1">Доход от всех зданий увеличивается навсегда.</p>
                  </div>
                  <button onClick={() => performUpgrade('tax', 1000 + (stats.upgrades.taxBoost*10000))} disabled={stats.money < 1000 + (stats.upgrades.taxBoost*10000)} className="mt-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-700 text-white text-xs py-2 rounded-lg font-bold">
                    Купить за ${1000 + (stats.upgrades.taxBoost*10000)}
                  </button>
               </div>
               
               <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">Дешевые дороги (-20%)</h3>
                    <p className="text-xs text-slate-400 mt-1">Снижает стоимость строительства дорог.</p>
                  </div>
                  <button onClick={() => performUpgrade('road', 500 + (stats.upgrades.roadDiscount*5000))} disabled={stats.money < 500 + (stats.upgrades.roadDiscount*5000) || stats.upgrades.roadDiscount >= 0.8} className="mt-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:bg-slate-700 text-white text-xs py-2 rounded-lg font-bold">
                    {stats.upgrades.roadDiscount >= 0.8 ? 'Максимум' : `Купить за $${500 + (stats.upgrades.roadDiscount*5000)}`}
                  </button>
               </div>
               
               <div className="bg-slate-800/80 p-4 rounded-xl border border-green-700/50 flex flex-col justify-between col-span-1 md:col-span-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-green-600 text-[9px] uppercase font-bold px-2 py-0.5 rounded-bl-lg text-white">Реклама</div>
                  <div className="flex items-center gap-3 relative z-10">
                     <div className="bg-black/30 p-2 rounded-lg"><Tv className="text-green-400" size={24} /></div>
                     <div>
                       <h3 className="font-bold text-white text-sm">Грант от спонсоров</h3>
                       <p className="text-xs text-slate-400">Посмотрите небольшой ролик, чтобы получить $5000 в казну моментально.</p>
                     </div>
                  </div>
                  <button onClick={() => { onAdReward('$5000'); setUpgradesVisible(false); }} className="mt-4 bg-green-600 hover:bg-green-500 text-white text-xs py-2 rounded-lg font-bold shadow-lg shadow-green-900/50">
                    Смотреть рекламу
                  </button>
               </div>
               
               <div className="bg-slate-800/80 p-4 rounded-xl border border-yellow-700/50 flex flex-col justify-between col-span-1 md:col-span-2 relative overflow-hidden">
                   <div className="absolute top-0 right-0 bg-yellow-600 text-[9px] uppercase font-bold px-2 py-0.5 rounded-bl-lg text-white">Реклама</div>
                   <div className="flex items-center gap-3 relative z-10">
                     <div className="bg-black/30 p-2 rounded-lg"><Zap className="text-yellow-400" size={24} /></div>
                     <div>
                       <h3 className="font-bold text-white text-sm">Золотая Лихорадка!</h3>
                       <p className="text-xs text-slate-400">Удвойте весь доход города на 3 минуты.</p>
                     </div>
                  </div>
                  <button onClick={() => { onAdReward('TAX_BOOST'); setUpgradesVisible(false); }} disabled={stats.upgrades.taxBoost > 0.5} className="mt-4 bg-yellow-600 hover:bg-yellow-500 text-white text-xs py-2 rounded-lg font-bold shadow-lg shadow-yellow-900/50 disabled:opacity-50">
                    Активировать
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Ad Popup Trigger Modal */}
      {adPopupVisible && (
        <div id="ad-popup-container" className="absolute top-24 right-4 pointer-events-auto animate-bounce z-40">
           <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-4 rounded-2xl shadow-[0_0_20px_rgba(234,179,8,0.4)] border border-yellow-300 w-64">
              <button onClick={() => setAdPopupVisible(false)} className="absolute top-1 right-1 text-yellow-100 hover:text-white"><X size={16}/></button>
              <div className="flex gap-3 items-center">
                 <div className="bg-white/20 p-2 rounded-full"><Zap className="text-yellow-100" /></div>
                 <div>
                    <h3 className="text-white font-bold text-sm leading-tight">Спонсорская помощь!</h3>
                    <p className="text-yellow-100 text-[10px] mt-1 leading-tight">Посмотрите видео, чтобы получить солидный буст.</p>
                 </div>
              </div>
              <button onClick={() => { setAdPopupVisible(false); setUpgradesVisible(true); }} className="w-full mt-3 bg-white text-orange-600 hover:bg-yellow-50 font-bold py-1.5 rounded-lg text-xs shadow-md">
                 Открыть Улучшения
              </button>
           </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsVisible && (
        <div className="absolute inset-0 bg-black/60 z-[100] flex items-center justify-center animate-fade-in backdrop-blur-sm pointer-events-auto">
           <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-xs w-full mx-4">
              <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-2">
                 <h2 className="text-xl font-black text-white flex items-center gap-2"><Settings className="text-gray-400" size={20}/> Настройки</h2>
                 <button onClick={() => setSettingsVisible(false)} className="text-slate-400 hover:text-white"><X /></button>
              </div>
              <div className="space-y-6">
                 <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Громкость музыки ({volume}%)</label>
                    <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-full accent-indigo-500" />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Звуковые эффекты ({sfxVolume}%)</label>
                    <input type="range" min="0" max="100" value={sfxVolume} onChange={(e) => setSfxVolume(Number(e.target.value))} className="w-full accent-indigo-500" />
                 </div>
                 
                 <div className="pt-4 border-t border-slate-800">
                    <button onClick={() => { localStorage.removeItem('polycity_save'); window.location.reload(); }} className="w-full border border-red-500/50 hover:bg-red-500/20 text-red-400 font-bold py-2 rounded-xl text-sm transition-colors">
                       Сбросить прогресс
                    </button>
                    <p className="text-[10px] text-center text-slate-500 mt-2">Осторожно, это удалит весь ваш город!</p>
                 </div>
              </div>
              <button onClick={() => setSettingsVisible(false)} className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-xl text-sm">
                 Закрыть
              </button>
           </div>
        </div>
      )}

      {/* News Feed Panel */}
      {newsVisible && (
        <Rnd
          default={{
            x: window.innerWidth > 768 ? window.innerWidth - 340 : 16,
            y: window.innerWidth > 768 ? window.innerHeight - 250 : window.innerHeight - 350,
            width: 320,
            height: 200,
          }}
          size={{ width: newsSize.width, height: newsMinimized ? 40 : newsSize.height }}
          enableResizing={!newsMinimized}
          minWidth={250}
          minHeight={newsMinimized ? 40 : 150}
          bounds="parent"
          onResize={(e, direction, ref) => {
            setNewsSize({
              width: parseInt(ref.style.width, 10),
              height: parseInt(ref.style.height, 10),
            });
          }}
          dragHandleClassName="handle-news"
          onMouseDown={() => { setNewsZ(20); }}
          className="pointer-events-auto shadow-2xl"
          style={{ zIndex: newsZ }}
        >
          <div className="w-full h-full bg-black/80 text-white rounded-xl border border-gray-700/80 backdrop-blur-xl flex flex-col overflow-hidden relative">
            <div className="handle-news cursor-move bg-gray-800/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-300 border-b border-gray-600 flex justify-between items-center select-none">
              <div className="flex items-center gap-2">
                 <span>Новости</span>
              </div>
              <div className="flex items-center gap-2">
                <button onPointerDown={(e)=>{e.stopPropagation(); setNewsMinimized(!newsMinimized);}} className="hover:bg-white/20 p-1 rounded transition-colors text-white z-50">
                   {newsMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
                </button>
                <button onPointerDown={(e)=>{e.stopPropagation(); setNewsVisible(false);}} className="hover:bg-red-500/50 p-1 rounded transition-colors text-white z-50">
                   <X size={12} />
                </button>
              </div>
            </div>
            
            {!newsMinimized && (
              <>
                <div className="absolute top-8 left-0 right-0 pointer-events-none bg-[linear-gradient(to_bottom,rgba(255,255,255,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-30 z-20 flex-1"></div>
                
                <div ref={newsRef} className="flex-1 overflow-y-auto p-2 md:p-3 space-y-2 text-[10px] md:text-xs font-mono scroll-smooth mask-image-b z-10 custom-scrollbar">
                  {newsFeed.length === 0 && <div className="text-gray-500 italic text-center mt-10">Нет активных новостей.</div>}
                  {newsFeed.map((news) => (
                    <div key={news.id} className={`
                      border-l-2 pl-2 py-1 transition-all animate-fade-in leading-tight relative pr-10
                      ${news.type === 'positive' ? 'border-green-500 text-green-200 bg-green-900/20' : ''}
                      ${news.type === 'negative' ? 'border-red-500 text-red-200 bg-red-900/20' : ''}
                      ${news.type === 'neutral' ? 'border-blue-400 text-blue-100 bg-blue-900/20' : ''}
                    `}>
                      <span className="opacity-70 text-[8px] absolute top-1 right-1">{new Date(Number(news.id.split('.')[0])).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      {news.text}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Rnd>
      )}

      {/* Global Cancel Tool Button */}
      {selectedTool !== null && (
        <div className="absolute bottom-[160px] md:bottom-4 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-4 z-50 pointer-events-auto mb-safe transition-all animate-fade-in">
          <button 
            onClick={() => onSelectTool(null)} 
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 md:px-4 md:py-3 rounded-2xl shadow-[0_0_20px_rgba(220,38,38,0.8)] border-2 border-red-400 backdrop-blur-md font-bold text-sm"
          >
            <X size={18} />
            <span>Отменить выбор</span>
          </button>
        </div>
      )}

      <div className={`${getHighlightClass('toolbar')} absolute bottom-0 left-0 right-0 pointer-events-auto flex flex-col items-center pb-2 md:pb-4 px-2`}>
        
        {/* Category Tabs */}
        {toolbarExpanded && (
          <div className="flex gap-1 md:gap-2 mb-2 bg-gray-900/90 py-1 px-2 rounded-full border border-gray-700 backdrop-blur-md shadow-lg max-w-[90vw] overflow-x-auto custom-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${activeCategory === cat.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Selected Category Buildings */}
        <div className="flex bg-gray-900/90 p-1 md:p-2 rounded-2xl border border-gray-600/50 backdrop-blur-xl shadow-2xl relative">
          
          {/* Collapse/Expand Toggle */}
          <button 
             onClick={() => setToolbarExpanded(!toolbarExpanded)}
             className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600 rounded-full p-0.5 text-gray-400 hover:text-white shadow-md z-20"
          >
             {toolbarExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>

          {toolbarExpanded ? (
            <div className="flex gap-1 md:gap-2 px-1 max-w-[90vw] overflow-x-auto custom-scrollbar py-2">
              {activeTools.map((type) => (
                <ToolButton
                  key={type}
                  type={type}
                  isSelected={selectedTool === type}
                  onClick={() => onSelectTool(selectedTool === type ? null : type)}
                  money={stats.money}
                  level={stats.level}
                  setToastMsg={setToastMsg}
                  dynamicCost={dynamicCosts?.[type]}
                />
              ))}
            </div>
          ) : (
             <div className="px-6 py-1 text-[10px] font-bold text-gray-400 tracking-widest uppercase">Стройка свернута</div>
          )}
        </div>
      </div>
      
      {/* Footer info & Settings btn */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 pointer-events-auto mb-safe z-[60]">
        <button 
          onClick={(e) => { e.stopPropagation(); setSettingsVisible(true); }} 
          onPointerDown={(e) => { e.stopPropagation(); setSettingsVisible(true); }}
          className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-xl shadow-lg border border-gray-600 transition-colors pointer-events-auto cursor-pointer"
        >
          <Settings size={18} />
        </button>
        <div className="text-[8px] md:text-[9px] text-white/30 font-mono text-right hover:text-white/60 transition-colors">
          <a href="https://x.com/ammaar" target="_blank" rel="noreferrer">Создано @ammaar</a>
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;