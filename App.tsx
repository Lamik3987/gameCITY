/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Grid, TileData, BuildingType, BuildingCategory, CityStats, NewsItem, FloatingTextData } from './types';
import { GRID_SIZE, CHUNK_SIZE, BUILDINGS, DAY_MS, INITIAL_MONEY, MILESTONES, EconomyConfig } from './constants';
import { wouldFormRoadBlock } from './roadUtils';
import IsoMap from './components/IsoMap';
import UIOverlay from './components/UIOverlay';
import StartScreen from './components/StartScreen';
import { sounds } from './components/soundEngine';
import { yandexSDK } from './yandexSDK';
import { safeGetItem, safeSetItem, safeRemoveItem } from './components/storage';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'white', background: 'red', padding: 20, zIndex: 99999, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const createInitialGrid = (): Grid => {
  const grid: Grid = [];
  const centerChunkX = Math.floor((GRID_SIZE / CHUNK_SIZE) / 2);
  const centerChunkY = Math.floor((GRID_SIZE / CHUNK_SIZE) / 2);

  for (let y = 0; y < GRID_SIZE; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      const cx = Math.floor(x / CHUNK_SIZE);
      const cy = Math.floor(y / CHUNK_SIZE);
      // unlock center chunk
      const isUnlocked = Math.abs(cx - centerChunkX) <= 0 && Math.abs(cy - centerChunkY) <= 0;
      row.push({ x, y, buildingType: BuildingType.None, unlocked: isUnlocked });
    }
    grid.push(row);
  }
  return grid;
};

function App() {
  // --- Game State ---
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
     yandexSDK.init().then(async () => {
         try {
             const parsed = await yandexSDK.loadData();
             if (parsed && parsed.stats && parsed.grid) {
                let loadedGrid = parsed.grid;
                
                // If the grid size changed, we need to adapt the old grid to the new dimensions
                let oldHeight = loadedGrid.length;
                let oldWidth = loadedGrid[0] ? loadedGrid[0].length : 0;
                if (oldHeight !== GRID_SIZE || oldWidth !== GRID_SIZE) {
                    const newGrid = createInitialGrid();
                    
                    // Calculate offset to recenter the old city into the new grid
                    const offsetY = Math.floor((GRID_SIZE - oldHeight) / 2);
                    const offsetX = Math.floor((GRID_SIZE - oldWidth) / 2);
                    
                    for (let y = 0; y < oldHeight; y++) {
                      for (let x = 0; x < oldWidth; x++) {
                        const ny = y + offsetY;
                        const nx = x + offsetX;
                        if (ny >= 0 && ny < GRID_SIZE && nx >= 0 && nx < GRID_SIZE) {
                          if (loadedGrid[y] && loadedGrid[y][x]) {
                              let bType = loadedGrid[y][x].buildingType;
                              // Map legacy inline
                              if (bType === 'Residential') bType = 'HouseSmall';
                              if (bType === 'Commercial') bType = 'ShopSmall';
                              if (bType === 'Industrial') bType = 'FactorySmall';
                              if (bType === 'Park') bType = 'ParkSmall';
                              
                              newGrid[ny][nx].buildingType = bType;
                              newGrid[ny][nx].unlocked = loadedGrid[y][x].unlocked;
                          }
                        }
                      }
                    }
                    loadedGrid = newGrid;
                } else {
                    // Map legacy building types
                    loadedGrid.forEach((row: any) => row && row.forEach((t: any) => {
                      if (!t) return;
                      if (t.buildingType === 'Residential') { t.buildingType = 'HouseSmall'; }
                      if (t.buildingType === 'Commercial') { t.buildingType = 'ShopSmall'; }
                      if (t.buildingType === 'Industrial') { t.buildingType = 'FactorySmall'; }
                      if (t.buildingType === 'Park') { t.buildingType = 'ParkSmall'; }
                    }));
                }

                const isTutorialGloballyDone = safeGetItem('polycity_tutorial_completed') === 'true';
                const isDone = isTutorialGloballyDone || parsed.stats.tutorialCompleted || false;
                
                setStats({ 
                   ...parsed.stats, 
                   tutorialCompleted: isDone,
                   tutorialStep: isDone ? 0 : (parsed.stats.tutorialStep ?? 1),
                   currentMissionIndex: parsed.stats.currentMissionIndex ?? 0
                });
                setGrid(loadedGrid);
             }
         } catch (e) {
             console.error("Failed to load save from Yandex Cloud", e);
         }
     });
  }, []);

  const [grid, setGrid] = useState<Grid>(createInitialGrid);
  const [stats, setStats] = useState<CityStats>(() => {
    const isTutorialGloballyDone = safeGetItem('polycity_tutorial_completed') === 'true';
    return { 
      money: INITIAL_MONEY, 
      population: 0, 
      day: 1,
      level: 1,
      timeOfDay: 0,
      happiness: 50,
      upgrades: { taxBoost: 0, roadDiscount: 0, parkBoost: 0 },
      tutorialStep: isTutorialGloballyDone ? 0 : 1,
      tutorialCompleted: isTutorialGloballyDone,
      currentMissionIndex: 0
    };
  });
  const [selectedTool, setSelectedTool] = useState<BuildingType | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextData[]>([]);
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>([]);
  const [showLevelUp, setShowLevelUp] = useState<number | null>(null);
  const [isNightMode, setIsNightMode] = useState(() => safeGetItem('polycity_night_mode') === 'true');
  
  const [moneyError, setMoneyError] = useState(false);
  const moneyErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerMoneyError = useCallback(() => {
    setMoneyError(true);
    sounds.playError();
    if (moneyErrorTimeoutRef.current) clearTimeout(moneyErrorTimeoutRef.current);
    moneyErrorTimeoutRef.current = setTimeout(() => setMoneyError(false), 1000);
  }, []);

  const actualLandCost = useMemo(() => {
    let unlockedCount = 0;
    for (let j = 0; j < Math.ceil(GRID_SIZE / CHUNK_SIZE); j++) {
      for (let i = 0; i < Math.ceil(GRID_SIZE / CHUNK_SIZE); i++) {
        if (grid[j * CHUNK_SIZE]?.[i * CHUNK_SIZE]?.unlocked) {
          unlockedCount++;
        }
      }
    }
    const baseExp = Math.max(0, unlockedCount - 1);
    return Math.round(500 * Math.pow(1.35, baseExp));
  }, [grid]);

  const dynamicCosts = useMemo(() => ({
    [BuildingType.BuyLand]: actualLandCost
  }), [actualLandCost]);

  // Refs for accessing state inside intervals without dependencies
  const gridRef = useRef(grid);
  const statsRef = useRef(stats);
  const lastTimeRef = useRef(performance.now());

  // Sync refs
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { statsRef.current = stats; }, [stats]);

  // --- Logic Wrappers ---

  const addNewsItem = useCallback((item: NewsItem) => {
    setNewsFeed(prev => [...prev.slice(-12), item]); // Keep last few
  }, []);

  // --- Load / Save ---
  useEffect(() => {
    if (!gameStarted) return;
    const saveInterval = setInterval(() => {
       yandexSDK.saveData({ grid: gridRef.current, stats: statsRef.current });
    }, 10000);
    return () => clearInterval(saveInterval);
  }, [gameStarted]);

  // --- Initial Setup ---
  useEffect(() => {
    if (!gameStarted) return;

    addNewsItem({ id: Date.now().toString(), text: "Добро пожаловать в SkyCity. Строительство разрешено.", type: 'positive' });
    lastTimeRef.current = performance.now();
  }, [gameStarted, addNewsItem]);

  // --- Game Loop ---
  useEffect(() => {
    if (!gameStarted) return;
    // Fast start, slow down as level increases.
    const currentLevel = stats.level;
    const dynamicDayMs = Math.min(5000, 1000 + currentLevel * 1000);

    const intervalId = setInterval(() => {
      // Пауза, если вкладка не активна (свернута)
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      const prev = statsRef.current;
      const currentGrid = gridRef.current;

      let dailyIncome = EconomyConfig.passiveSubsidy;
      let dailyPopGrowth = 0;
      let buildingCounts: Record<string, number> = {};
      let totalHappinessImpact = 0;

      let houses: {x: number, y: number}[] = [];
      let factories: {x: number, y: number, impact: number}[] = [];
      let parks: {x: number, y: number, impact: number}[] = [];
      
      let popups: Omit<FloatingTextData, 'id'>[] = [];

      currentGrid.forEach((row, y) => {
         row.forEach((tile, x) => {
            if (tile.buildingType !== BuildingType.None && tile.unlocked) {
               // Only process logic once per building instance
               if (tile.originX !== undefined && (tile.originX !== x || tile.originY !== y)) {
                  return;
               }

               const config = BUILDINGS[tile.buildingType];
               if (config) {
                 dailyPopGrowth += config.popGen || 0;
                 buildingCounts[tile.buildingType] = (buildingCounts[tile.buildingType] || 0) + 1;

                 if (config.category === BuildingCategory.Residential) {
                     houses.push({x, y});
                 } else if (tile.buildingType === BuildingType.FactorySmall) {
                     factories.push({x, y, impact: -((config.incomeGen / 5) + 5)});
                     const inc = EconomyConfig.factorySmallIncome * (1 + prev.upgrades.taxBoost);
                     dailyIncome += inc;
                     popups.push({ x, y, text: `+$${Math.floor(inc)}`, color: '#4ade80' });
                 } else if (tile.buildingType === BuildingType.FactoryLarge) {
                     factories.push({x, y, impact: -((config.incomeGen / 5) + 5)});
                     const inc = EconomyConfig.factoryLargeIncome * (1 + prev.upgrades.taxBoost);
                     dailyIncome += inc;
                     popups.push({ x, y, text: `+$${Math.floor(inc)}`, color: '#4ade80' });
                 } else if (tile.buildingType === BuildingType.ChemicalPlant) {
                     factories.push({x, y, impact: -((config.incomeGen / 5) + 15)});
                     const inc = EconomyConfig.chemicalPlantIncome * (1 + prev.upgrades.taxBoost);
                     dailyIncome += inc;
                     popups.push({ x, y, text: `+$${Math.floor(inc)}`, color: '#4ade80' });
                 } else if (tile.buildingType === BuildingType.HighTechFactory) {
                     factories.push({x, y, impact: -((config.incomeGen / 5) + 2)});
                     const inc = EconomyConfig.highTechFactoryIncome * (1 + prev.upgrades.taxBoost);
                     dailyIncome += inc;
                     popups.push({ x, y, text: `+$${Math.floor(inc)}`, color: '#4ade80' });
                 } else if (tile.buildingType === BuildingType.ParkSmall || tile.buildingType === BuildingType.ParkLarge || tile.buildingType === BuildingType.AquaPark || tile.buildingType === BuildingType.AmusementPark) {
                     parks.push({x, y, impact: (config.popGen || 5) + prev.upgrades.parkBoost});
                 } else if (tile.buildingType === BuildingType.ShopSmall) {
                     if (prev.population > 0) {
                        const inc = EconomyConfig.shopSmallIncome * (1 + prev.upgrades.taxBoost);
                        dailyIncome += inc;
                        popups.push({ x, y, text: `+$${Math.floor(inc)}`, color: '#4ade80' });
                     }
                 } else if (tile.buildingType === BuildingType.ShopLarge) {
                     if (prev.population > 0) {
                        const inc = EconomyConfig.shopLargeIncome * (1 + prev.upgrades.taxBoost);
                        dailyIncome += inc;
                        popups.push({ x, y, text: `+$${Math.floor(inc)}`, color: '#4ade80' });
                     }
                 } else if (tile.buildingType === BuildingType.Mall) {
                     if (prev.population > 0) {
                        const inc = EconomyConfig.mallIncome * (1 + prev.upgrades.taxBoost);
                        dailyIncome += inc;
                        popups.push({ x, y, text: `+$${Math.floor(inc)}`, color: '#4ade80' });
                     }
                 } else if (tile.buildingType === BuildingType.FinancialCenter) {
                     if (prev.population > 0) {
                        const inc = EconomyConfig.financialCenterIncome * (1 + prev.upgrades.taxBoost);
                        dailyIncome += inc;
                        popups.push({ x, y, text: `+$${Math.floor(inc)}`, color: '#4ade80' });
                     }
                 }
               }
            }
         });
      });

      // Add basic tax income
      const taxIncome = prev.population * EconomyConfig.taxPerPerson * (1 + prev.upgrades.taxBoost);
      dailyIncome += taxIncome;
      if (taxIncome > 0 && houses.length > 0) {
          const perHouse = taxIncome / houses.length;
          houses.forEach(h => {
             popups.push({ x: h.x, y: h.y, text: `+$${Math.floor(perHouse)}`, color: '#4ade80' });
          });
      }

      // Proximity calculations targetting Houses
      houses.forEach(house => {
          factories.forEach(factory => {
              const dist = Math.max(Math.abs(house.x - factory.x), Math.abs(house.y - factory.y));
              if (dist <= 4) {
                  totalHappinessImpact += factory.impact;
              }
          });
          parks.forEach(park => {
              const dist = Math.max(Math.abs(house.x - park.x), Math.abs(house.y - park.y));
              if (dist <= 4) {
                  totalHappinessImpact += park.impact;
              }
          });
      });

      // Update Happiness
      let targetHappiness = 50 + totalHappinessImpact;
      targetHappiness = Math.max(0, Math.min(100, targetHappiness)); // 0 to 100
      let newHappiness = prev.happiness + (targetHappiness - prev.happiness) * 0.1;

      // Growth modifiers based on happiness
      if (newHappiness < 30) dailyPopGrowth = -Math.max(1, Math.floor(prev.population * 0.02)); 
      else if (newHappiness < 50) dailyPopGrowth = Math.floor(dailyPopGrowth * 0.5);
      else if (newHappiness > 80) dailyPopGrowth = Math.floor(dailyPopGrowth * 1.5);

      const smallHouses = buildingCounts[BuildingType.HouseSmall] || 0;
      const medHouses = buildingCounts[BuildingType.HouseMedium] || 0;
      const largeHouses = buildingCounts[BuildingType.HouseLarge] || 0;
      const maxPop = smallHouses * 6 + medHouses * 18 + largeHouses * 35;

      let newPop = prev.population + dailyPopGrowth;
      if (newPop > maxPop) newPop = maxPop; 
      if (maxPop === 0 && prev.population > 0) newPop = Math.max(0, prev.population - 5); 

      // Move in bonus
      let actualGrowth = newPop - prev.population;
      if (actualGrowth > 0) {
          const moveInIncome = actualGrowth * EconomyConfig.moveInBonus;
          dailyIncome += moveInIncome;
      }

      let newLevel = prev.level;
      const nextMilestone = MILESTONES.find(m => m.level === prev.level + 1);
      if (nextMilestone && newPop >= nextMilestone.requiredPop) {
        newLevel = nextMilestone.level;
        setShowLevelUp(newLevel);
        sounds.playLevelUp();
        addNewsItem({ id: Date.now().toString(), text: `Уровень повышен! Добро пожаловать: ${nextMilestone.name}`, type: 'positive' });
      }

      // Random Events
      if (Math.random() < 0.05) {
         const events = [];
         events.push({ text: "Жители наслаждаются прогулками по городу.", type: "neutral" });
         if (buildingCounts[BuildingType.Road]) {
             if (newPop / buildingCounts[BuildingType.Road] > 20) {
                 events.push({ text: "На дорогах пробки! Жители жалуются на нехватку транспортных путей.", type: "negative" });
             } else {
                 events.push({ text: "Движение на дорогах свободное.", type: "positive" });
             }
         }
         if (newPop >= maxPop && maxPop > 0) {
             events.push({ text: "Не хватает жилых домов! Новым жителям негде жить.", type: "negative" });
         }
         if (newHappiness >= 80) {
             events.push({ text: "Мэр, ваш рейтинг на высоте! Парки и благоустройство радуют горожан.", type: "positive" });
         } else if (newHappiness < 40) {
             let reason = "Жители крайне недовольны качеством жизни.";
             if (totalHappinessImpact < -10) reason = "Экология в упадке! Счастье падает из-за грязных заводов рядом с домами.";
             else if (newPop >= maxPop && maxPop > 0) reason = "Жителям не хватает жизненного пространства!";
             events.push({ text: reason, type: "negative" });
         }
         
         if (newHappiness < 30 && prev.happiness >= 30) {
             addNewsItem({ id: Date.now().toString() + Math.random(), text: "ВНИМАНИЕ: Счастье упало ниже 30%! Люди собирают вещи и уезжают!", type: "negative" });
         }
         if (buildingCounts[BuildingType.FactoryLarge] || buildingCounts[BuildingType.FactorySmall]) {
            events.push({ text: "Промышленные районы стабильно производят товары.", type: "neutral" });
         }

         if (events.length > 0) {
             const pickedEvent = events[Math.floor(Math.random() * events.length)];
             addNewsItem({ id: Date.now().toString() + Math.random(), text: pickedEvent.text, type: pickedEvent.type as 'positive' | 'negative' | 'neutral' });
         }
      }

      if (Math.random() < 0.02 && !window.document.getElementById('ad-popup-container')) {
         window.dispatchEvent(new CustomEvent('trigger-ad-popup'));
      }

      setStats(p => ({
        ...p,
        money: p.money + Math.floor(dailyIncome),
        population: newPop,
        day: p.day + 1,
        happiness: newHappiness,
        level: newLevel
      }));

      // Generate popups
      if (popups.length > 0) {
         const startId = Date.now().toString();
         const newPopups = popups.map((p, i) => ({ ...p, id: startId + '-' + i }));
         setFloatingTexts(current => [...current, ...newPopups]);
         setTimeout(() => {
             setFloatingTexts(current => current.filter(t => !newPopups.find(np => np.id === t.id)));
         }, 1500); // Dissolve after 1.5s
      }

    }, dynamicDayMs);

    return () => clearInterval(intervalId);
  }, [gameStarted, addNewsItem, stats.level]);


  // --- Interaction Logic ---

  const unlockChunk = useCallback((x: number, y: number) => {
     const cx = Math.floor(x / CHUNK_SIZE);
     const cy = Math.floor(y / CHUNK_SIZE);
     
     // Count unlocked chunks for exponential cost
     let unlockedCount = 0;
     const gridCurrent = gridRef.current;
     for (let j = 0; j < Math.ceil(GRID_SIZE / CHUNK_SIZE); j++) {
       for (let i = 0; i < Math.ceil(GRID_SIZE / CHUNK_SIZE); i++) {
         if (gridCurrent[j * CHUNK_SIZE]?.[i * CHUNK_SIZE]?.unlocked) {
           unlockedCount++;
         }
       }
     }
     
     // Base $500. Exponential increase based on chunks unlocked
     const baseExp = Math.max(0, unlockedCount - 1); // center chunk is 1
     const cost = Math.round(500 * Math.pow(1.35, baseExp));

     if (statsRef.current.money < cost) {
       addNewsItem({id: Date.now().toString(), text: `Недостаточно средств на территорию. Нужно: $${cost}.`, type: 'negative'});
       triggerMoneyError();
       return;
     }

     let isAdjacent = false;
     for (let j = 0; j < GRID_SIZE; j++) {
       for (let i = 0; i < GRID_SIZE; i++) {
         if (gridCurrent[j][i].unlocked) {
           const cx2 = Math.floor(i / CHUNK_SIZE);
           const cy2 = Math.floor(j / CHUNK_SIZE);
           if (Math.abs(cx - cx2) <= 1 && Math.abs(cy - cy2) <= 1 && !(cx===cx2 && cy===cy2)) {
             isAdjacent = true;
           }
         }
       }
     }

     if (!isAdjacent) {
       addNewsItem({id: Date.now().toString(), text: `Территория должна прилегать к вашим владениям!`, type: 'negative'});
       return;
     }

     setStats(prev => ({...prev, money: prev.money - cost}));
     setGrid(prev => prev.map((row, rY) => row.map((t, rX) => {
        if (Math.floor(rX / CHUNK_SIZE) === cx && Math.floor(rY / CHUNK_SIZE) === cy) {
           return { ...t, unlocked: true };
        }
        return t;
     })));
     sounds.playCoin();
     addNewsItem({id: Date.now().toString(), text: `Владения расширены (Куплено за $${cost})!`, type: 'positive'});
  }, [addNewsItem]);

  const handleTileClick = useCallback((x: number, y: number, rotation: number = 0) => {
    if (!gameStarted) return;

    const currentGrid = gridRef.current;
    const currentStats = statsRef.current;
    const tool = selectedTool;
    
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;

    if (tool === null) return;

    const currentTile = currentGrid[y][x];

    if (tool === BuildingType.BuyLand) {
       if (!currentTile.unlocked) {
          unlockChunk(x, y);
       }
       return;
    }

    if (!currentTile.unlocked) {
       addNewsItem({id: Date.now().toString() + Math.random(), text: `Сначала нужно купить эту территорию.`, type: 'neutral'});
       return;
    }

    const buildingConfig = BUILDINGS[tool];
    if (buildingConfig && currentStats.level < buildingConfig.minLevel) {
       addNewsItem({id: Date.now().toString() + Math.random(), text: `Здание доступно с ${buildingConfig.minLevel} уровня.`, type: 'neutral'});
       return;
    }

    // Bulldoze logic
    if (tool === BuildingType.None) {
      if (currentTile.buildingType !== BuildingType.None) {
        const demolishCost = 10;
        if (currentStats.money >= demolishCost) {
            const actualConfig = BUILDINGS[currentTile.buildingType];
            const originX = currentTile.originX ?? x;
            const originY = currentTile.originY ?? y;
            const isRotated = Math.abs(Math.sin(currentTile.rotation || 0)) > 0.5;
            const bWidth = isRotated ? (actualConfig?.height || 1) : (actualConfig?.width || 1);
            const bHeight = isRotated ? (actualConfig?.width || 1) : (actualConfig?.height || 1);

            const newGrid = currentGrid.map(row => [...row]);
            
            // Remove all tiles of this building
            for (let dy = 0; dy < bHeight; dy++) {
              for (let dx = 0; dx < bWidth; dx++) {
                const ty = originY + dy;
                const tx = originX + dx;
                if (ty >= 0 && ty < GRID_SIZE && tx >= 0 && tx < GRID_SIZE) {
                  const t = newGrid[ty][tx];
                  if (t.buildingType === currentTile.buildingType && t.originX === originX && t.originY === originY) {
                    newGrid[ty][tx] = { x: tx, y: ty, buildingType: BuildingType.None, unlocked: t.unlocked };
                  }
                }
              }
            }
            
            setGrid(newGrid);
            sounds.playBuild();
            setStats(prev => ({ ...prev, money: Math.floor(prev.money - demolishCost) }));
        } else {
            addNewsItem({id: Date.now().toString(), text: `Снос стоит $${demolishCost}.`, type: 'negative'});
            triggerMoneyError();
        }
      }
      return;
    }

    // Placement Logic
      const isRotated = Math.abs(Math.sin(rotation)) > 0.5;
      const bWidth = isRotated ? (buildingConfig.height || 1) : (buildingConfig.width || 1);
      const bHeight = isRotated ? (buildingConfig.width || 1) : (buildingConfig.height || 1);

      // Check boundaries
      if (x + bWidth > GRID_SIZE || y + bHeight > GRID_SIZE) {
        addNewsItem({id: Date.now().toString() + Math.random(), text: `Здание выходит за пределы карты.`, type: 'negative'});
        sounds.playError();
        return;
      }

    // Road 3x3 restriction logic
    if (tool === BuildingType.Road) {
        if (wouldFormRoadBlock(currentGrid, x, y)) {
            addNewsItem({id: Date.now().toString() + Math.random(), text: `Максимальная ширина дороги - 2 полосы!`, type: 'negative'});
            return;
        }
    }

    // Check space
    let canPlace = true;
    for (let dy = 0; dy < bHeight; dy++) {
       for (let dx = 0; dx < bWidth; dx++) {
          const t = currentGrid[y + dy][x + dx];
          if (t.buildingType !== BuildingType.None || !t.unlocked) {
             canPlace = false;
          }
       }
    }

    if (canPlace) {
      const isRoad = tool === BuildingType.Road;
      const discount = isRoad ? currentStats.upgrades.roadDiscount : 0;
      const cost = Math.floor(buildingConfig.cost * (1 - discount));

      if (currentStats.money >= cost) {
        setStats(prev => {
             return { ...prev, money: prev.money - cost };
        });
        
        const newGrid = currentGrid.map(row => [...row]);
        for (let dy = 0; dy < bHeight; dy++) {
           for (let dx = 0; dx < bWidth; dx++) {
              newGrid[y + dy][x + dx] = { 
                  ...newGrid[y + dy][x + dx], 
                  buildingType: tool,
                  originX: x,
                  originY: y,
                  rotation: rotation
              };
           }
        }
        sounds.playBuild();
        setGrid(newGrid);
      } else {
        addNewsItem({id: Date.now().toString() + Math.random(), text: `В казне недостаточно средств: ${buildingConfig.name}.`, type: 'negative'});
        triggerMoneyError();
      }
    } else {
        addNewsItem({id: Date.now().toString() + Math.random(), text: `Место занято или не куплено!`, type: 'negative'});
    }
  }, [selectedTool, addNewsItem, gameStarted, unlockChunk]);

  const handleStart = () => {
    sounds.init();
    const vol = parseInt(safeGetItem('polycity_bgm_vol') || '50', 10);
    sounds.setBgmVolume(0);
    yandexSDK.showFullscreenAd(() => {
        sounds.setBgmVolume(vol / 100);
        setGameStarted(true);
    });
  };

  const handleAdReward = (rewardStr: string) => {
     sounds.setBgmVolume(0); // Pause music

     yandexSDK.showRewardedVideo(
         // onRewarded
         () => {
             sounds.playCoin();
             if (rewardStr === 'AD_MONEY') {
                 const adRewardMoney = Math.round(1000 * Math.pow(2.2, statsRef.current.level - 1));
                 setStats(prev => ({...prev, money: prev.money + adRewardMoney}));
                 addNewsItem({id: Date.now().toString(), text: `Спонсорская помощь! Получена награда: $${adRewardMoney.toLocaleString()}`, type: 'positive'});
             } else if (rewardStr === 'TAX_BOOST') {
                 addNewsItem({id: Date.now().toString(), text: "Спонсорская помощь! Активирован буст налогов!", type: 'positive'});
                 setStats(prev => ({...prev, upgrades: {...prev.upgrades, taxBoost: 1}}));
                 setTimeout(() => {
                    setStats(prev => ({...prev, upgrades: {...prev.upgrades, taxBoost: 0}}));
                    addNewsItem({id: Date.now().toString(), text: "Эффект удвоения налогов завершен.", type: 'neutral'});
                 }, 180000); // 3 minutes
             }
         },
         // onOpen
         undefined,
         // onClose
         () => {
             const vol = parseInt(safeGetItem('polycity_bgm_vol') || '50', 10);
             sounds.setBgmVolume(vol / 100);
         },
         // onError
         (e) => {
             const vol = parseInt(safeGetItem('polycity_bgm_vol') || '50', 10);
             sounds.setBgmVolume(vol / 100);
             addNewsItem({id: Date.now().toString(), text: "Ошибка загрузки рекламы. Попробуйте позже.", type: 'negative'});
         }
     );
  };

  return (
    <ErrorBoundary>
    <div className="relative w-screen h-[100dvh] overflow-hidden selection:bg-transparent selection:text-transparent bg-sky-900 pb-safe">
      {/* 3D Rendering Layer - Always visible now, providing background for start screen */}
      <IsoMap 
        grid={grid} 
        onTileClick={handleTileClick} 
        hoveredTool={selectedTool}
        stats={stats}
        floatingTexts={floatingTexts}
        isNightMode={isNightMode}
      />
      
      {/* Start Screen Overlay */}
      {!gameStarted && (
        <StartScreen onStart={handleStart} />
      )}

      {/* UI Layer */}
      {gameStarted && (
        <>
          <UIOverlay
            stats={stats}
            selectedTool={selectedTool}
            onSelectTool={setSelectedTool}
            newsFeed={newsFeed}
            onAdReward={handleAdReward}
            setStats={setStats}
            dynamicCosts={dynamicCosts}
            moneyError={moneyError}
            grid={grid}
            isNightMode={isNightMode}
            onToggleNightMode={() => {
                const newMode = !isNightMode;
                setIsNightMode(newMode);
                safeSetItem('polycity_night_mode', newMode.toString());
            }}
          />
          {showLevelUp && (
             <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center animate-fade-in backdrop-blur-sm pointer-events-auto">
               <div className="bg-sky-900 border-2 border-cyan-400 p-8 rounded-2xl shadow-2xl text-center max-w-md w-full mx-4">
                 <h2 className="text-4xl justify-center font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 mb-2 drop-shadow-md">Новый Уровень!</h2>
                 <div className="text-6xl my-4">🎉</div>
                 <p className="text-white text-xl font-bold mb-1">Вы достигли {showLevelUp} уровня!</p>
                 <p className="text-cyan-200 text-sm mb-6">Продолжайте строить, чтобы открыть еще больше зданий.</p>
                 <button onClick={() => {
                     setShowLevelUp(null);
                     const vol = parseInt(safeGetItem('polycity_bgm_vol') || '50', 10);
                     sounds.setBgmVolume(0);
                     yandexSDK.showFullscreenAd(() => {
                         sounds.setBgmVolume(vol / 100);
                     });
                  }} className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95">Продолжить</button>
               </div>
             </div>
          )}
        </>
      )}

      {/* CSS for animations and utility */}
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fade-in { animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .mask-image-b { -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 15%); mask-image: linear-gradient(to bottom, transparent 0%, black 15%); }
        
        /* Vertical text for toolbar label */
        .writing-mode-vertical { writing-mode: vertical-rl; text-orientation: mixed; }
        
        /* Custom scrollbar for news */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }

        /* Hide scrollbars for toolbars */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
    </ErrorBoundary>
  );
}

export default App;
