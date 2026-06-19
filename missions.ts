import { CityStats, Grid, BuildingType } from './types';

export interface Mission {
  id: number;
  title: string;
  description: string;
  rewardText: string;
  rewardValue: number;
  check: (stats: CityStats, grid: Grid) => boolean;
  getProgress: (stats: CityStats, grid: Grid) => { current: number; target: number };
}

const countBuildings = (grid: Grid, type: BuildingType): number => {
  let count = 0;
  grid.forEach(row => {
    row.forEach(tile => {
      if (tile.buildingType === type && tile.unlocked) {
        if (tile.originX === undefined || (tile.originX === tile.x && tile.originY === tile.y)) {
          count++;
        }
      }
    });
  });
  return count;
};

const countUnlockedChunks = (grid: Grid): number => {
  const CHUNK_SIZE = 5;
  let count = 0;
  const GRID_SIZE = grid.length;
  const numChunks = Math.ceil(GRID_SIZE / CHUNK_SIZE);
  for (let j = 0; j < numChunks; j++) {
    for (let i = 0; i < numChunks; i++) {
      if (grid[j * CHUNK_SIZE]?.[i * CHUNK_SIZE]?.unlocked) {
        count++;
      }
    }
  }
  return count;
};

export const MISSIONS: Mission[] = [
  {
    id: 1,
    title: 'Первые жители',
    description: 'Постройте жилые дома и заселите жителей.',
    rewardText: '+$500',
    rewardValue: 500,
    check: (stats) => stats.population >= 15,
    getProgress: (stats) => ({ current: stats.population, target: 15 })
  },
  {
    id: 2,
    title: 'Развитие поселения',
    description: 'Повышайте население, чтобы достичь 2-го уровня.',
    rewardText: '+$1,500',
    rewardValue: 1500,
    check: (stats) => stats.level >= 2,
    getProgress: (stats) => ({ current: stats.level, target: 2 })
  },
  {
    id: 3,
    title: 'Малый бизнес',
    description: 'Постройте хотя бы один малый рынок для торговли.',
    rewardText: '+$800',
    rewardValue: 800,
    check: (_, grid) => countBuildings(grid, BuildingType.ShopSmall) >= 1,
    getProgress: (_, grid) => ({ current: countBuildings(grid, BuildingType.ShopSmall), target: 1 })
  },
  {
    id: 4,
    title: 'Первая фабрика',
    description: 'Создайте рабочие места, построив фабрику.',
    rewardText: '+$1,000',
    rewardValue: 1000,
    check: (_, grid) => countBuildings(grid, BuildingType.FactorySmall) >= 1,
    getProgress: (_, grid) => ({ current: countBuildings(grid, BuildingType.FactorySmall), target: 1 })
  },
  {
    id: 5,
    title: 'Счастливые горожане',
    description: 'Поднимите средний уровень счастья жителей до 70%.',
    rewardText: '+$2,000',
    rewardValue: 2000,
    check: (stats) => stats.happiness >= 70,
    getProgress: (stats) => ({ current: Math.floor(stats.happiness), target: 70 })
  },
  {
    id: 6,
    title: 'Новые территории',
    description: 'Купите дополнительные участки земли. Нужно открыть 3 чанка.',
    rewardText: '+$3,000',
    rewardValue: 3000,
    check: (_, grid) => countUnlockedChunks(grid) >= 3,
    getProgress: (_, grid) => ({ current: countUnlockedChunks(grid), target: 3 })
  },
  {
    id: 7,
    title: 'Растущий городок',
    description: 'Продолжайте строить, чтобы достичь 4-го уровня.',
    rewardText: '+$5,000',
    rewardValue: 5000,
    check: (stats) => stats.level >= 4,
    getProgress: (stats) => ({ current: stats.level, target: 4 })
  },
  {
    id: 8,
    title: 'Экологическая гармония',
    description: 'Постройте Городской Парк для очищения воздуха и счастья.',
    rewardText: '+$4,000',
    rewardValue: 4000,
    check: (_, grid) => countBuildings(grid, BuildingType.ParkLarge) >= 1,
    getProgress: (_, grid) => ({ current: countBuildings(grid, BuildingType.ParkLarge), target: 1 })
  },
  {
    id: 9,
    title: 'Индустриальный гигант',
    description: 'Постройте Огромный Завод для крупного производства.',
    rewardText: '+$6,000',
    rewardValue: 6000,
    check: (_, grid) => countBuildings(grid, BuildingType.FactoryLarge) >= 1,
    getProgress: (_, grid) => ({ current: countBuildings(grid, BuildingType.FactoryLarge), target: 1 })
  },
  {
    id: 10,
    title: 'Финансовый триумф',
    description: 'Развейте мегаполис и достигните 6-го уровня.',
    rewardText: '+$10,000',
    rewardValue: 10000,
    check: (stats) => stats.level >= 6,
    getProgress: (stats) => ({ current: stats.level, target: 6 })
  }
];
