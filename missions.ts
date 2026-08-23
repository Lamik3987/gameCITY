import { CityStats, Grid, BuildingType } from './types';
import { t } from './i18n';

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
    get title() { return t('mission_1_title'); },
    get description() { return t('mission_1_desc'); },
    rewardText: '+$500',
    rewardValue: 500,
    check: (stats) => stats.population >= 15,
    getProgress: (stats) => ({ current: stats.population, target: 15 })
  },
  {
    id: 2,
    get title() { return t('mission_2_title'); },
    get description() { return t('mission_2_desc'); },
    rewardText: '+$1,500',
    rewardValue: 1500,
    check: (stats) => stats.level >= 2,
    getProgress: (stats) => ({ current: stats.level, target: 2 })
  },
  {
    id: 3,
    get title() { return t('mission_3_title'); },
    get description() { return t('mission_3_desc'); },
    rewardText: '+$800',
    rewardValue: 800,
    check: (_, grid) => countBuildings(grid, BuildingType.ShopSmall) >= 1,
    getProgress: (_, grid) => ({ current: countBuildings(grid, BuildingType.ShopSmall), target: 1 })
  },
  {
    id: 4,
    get title() { return t('mission_4_title'); },
    get description() { return t('mission_4_desc'); },
    rewardText: '+$1,000',
    rewardValue: 1000,
    check: (_, grid) => countBuildings(grid, BuildingType.FactorySmall) >= 1,
    getProgress: (_, grid) => ({ current: countBuildings(grid, BuildingType.FactorySmall), target: 1 })
  },
  {
    id: 5,
    get title() { return t('mission_5_title'); },
    get description() { return t('mission_5_desc'); },
    rewardText: '+$2,000',
    rewardValue: 2000,
    check: (stats) => stats.happiness >= 70,
    getProgress: (stats) => ({ current: Math.floor(stats.happiness), target: 70 })
  },
  {
    id: 6,
    get title() { return t('mission_6_title'); },
    get description() { return t('mission_6_desc'); },
    rewardText: '+$3,000',
    rewardValue: 3000,
    check: (_, grid) => countUnlockedChunks(grid) >= 3,
    getProgress: (_, grid) => ({ current: countUnlockedChunks(grid), target: 3 })
  },
  {
    id: 7,
    get title() { return t('mission_7_title'); },
    get description() { return t('mission_7_desc'); },
    rewardText: '+$5,000',
    rewardValue: 5000,
    check: (stats) => stats.level >= 4,
    getProgress: (stats) => ({ current: stats.level, target: 4 })
  },
  {
    id: 8,
    get title() { return t('mission_8_title'); },
    get description() { return t('mission_8_desc'); },
    rewardText: '+$4,000',
    rewardValue: 4000,
    check: (_, grid) => countBuildings(grid, BuildingType.ParkLarge) >= 1,
    getProgress: (_, grid) => ({ current: countBuildings(grid, BuildingType.ParkLarge), target: 1 })
  },
  {
    id: 9,
    get title() { return t('mission_9_title'); },
    get description() { return t('mission_9_desc'); },
    rewardText: '+$6,000',
    rewardValue: 6000,
    check: (_, grid) => countBuildings(grid, BuildingType.FactoryLarge) >= 1,
    getProgress: (_, grid) => ({ current: countBuildings(grid, BuildingType.FactoryLarge), target: 1 })
  },
  {
    id: 10,
    get title() { return t('mission_10_title'); },
    get description() { return t('mission_10_desc'); },
    rewardText: '+$10,000',
    rewardValue: 10000,
    check: (stats) => stats.level >= 6,
    getProgress: (stats) => ({ current: stats.level, target: 6 })
  }
];
