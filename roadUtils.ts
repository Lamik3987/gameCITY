/**
 * Road autotiling utilities using bitmask-based adjacency checks.
 *
 * Bitmask layout (4-bit, 16 configurations):
 *   bit 0 (1) = North neighbor (y-1)
 *   bit 1 (2) = East neighbor  (x+1)
 *   bit 2 (4) = South neighbor (y+1)
 *   bit 3 (8) = West neighbor  (x-1)
 *
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BuildingType, Grid } from './types';
import { GRID_SIZE } from './constants';

// --- Direction constants ---
export const ROAD_N = 1;
export const ROAD_E = 2;
export const ROAD_S = 4;
export const ROAD_W = 8;

/** Check if a building type is any kind of road. */
export function isRoadTile(type: BuildingType): boolean {
  return type === BuildingType.Road;
}

/**
 * Compute 4-bit adjacency bitmask for a road tile.
 * Each set bit means there is a road neighbor in that direction.
 */
export function getRoadBitmask(grid: Grid, x: number, y: number): number {
  let mask = 0;
  if (y > 0 && isRoadTile(grid[y - 1][x].buildingType)) mask |= ROAD_N;
  if (x < GRID_SIZE - 1 && isRoadTile(grid[y][x + 1].buildingType)) mask |= ROAD_E;
  if (y < GRID_SIZE - 1 && isRoadTile(grid[y + 1][x].buildingType)) mask |= ROAD_S;
  if (x > 0 && isRoadTile(grid[y][x - 1].buildingType)) mask |= ROAD_W;
  return mask;
}

/**
 * Compute boulevard bond bitmask.
 *
 * A boulevard bond exists between two adjacent road tiles when both share
 * connections along the perpendicular axis (forming a dual-lane highway).
 *
 * Example: tiles (x,y) and (x+1,y) are side-by-side (E-W adjacency).
 * If both have N or S connections, they form a N-S boulevard, and
 * the E bond at (x,y) / W bond at (x+1,y) is a boulevard bond.
 *
 * Returns a bitmask where each set bit is a boulevard bond direction.
 */
export function getBoulevardBonds(grid: Grid, x: number, y: number): number {
  let bonds = 0;

  // East bond: (x,y)↔(x+1,y) — boulevard if both have N-S connections
  if (x < GRID_SIZE - 1 && isRoadTile(grid[y][x + 1].buildingType)) {
    const selfNS =
      (y > 0 && isRoadTile(grid[y - 1][x].buildingType)) ||
      (y < GRID_SIZE - 1 && isRoadTile(grid[y + 1][x].buildingType));
    const peerNS =
      (y > 0 && isRoadTile(grid[y - 1][x + 1].buildingType)) ||
      (y < GRID_SIZE - 1 && isRoadTile(grid[y + 1][x + 1].buildingType));
    if (selfNS && peerNS) bonds |= ROAD_E;
  }

  // West bond: (x,y)↔(x-1,y)
  if (x > 0 && isRoadTile(grid[y][x - 1].buildingType)) {
    const selfNS =
      (y > 0 && isRoadTile(grid[y - 1][x].buildingType)) ||
      (y < GRID_SIZE - 1 && isRoadTile(grid[y + 1][x].buildingType));
    const peerNS =
      (y > 0 && isRoadTile(grid[y - 1][x - 1].buildingType)) ||
      (y < GRID_SIZE - 1 && isRoadTile(grid[y + 1][x - 1].buildingType));
    if (selfNS && peerNS) bonds |= ROAD_W;
  }

  // South bond: (x,y)↔(x,y+1) — boulevard if both have E-W connections
  if (y < GRID_SIZE - 1 && isRoadTile(grid[y + 1][x].buildingType)) {
    const selfEW =
      (x > 0 && isRoadTile(grid[y][x - 1].buildingType)) ||
      (x < GRID_SIZE - 1 && isRoadTile(grid[y][x + 1].buildingType));
    const peerEW =
      (x > 0 && isRoadTile(grid[y + 1][x - 1].buildingType)) ||
      (x < GRID_SIZE - 1 && isRoadTile(grid[y + 1][x + 1].buildingType));
    if (selfEW && peerEW) bonds |= ROAD_S;
  }

  // North bond: (x,y)↔(x,y-1)
  if (y > 0 && isRoadTile(grid[y - 1][x].buildingType)) {
    const selfEW =
      (x > 0 && isRoadTile(grid[y][x - 1].buildingType)) ||
      (x < GRID_SIZE - 1 && isRoadTile(grid[y][x + 1].buildingType));
    const peerEW =
      (x > 0 && isRoadTile(grid[y - 1][x - 1].buildingType)) ||
      (x < GRID_SIZE - 1 && isRoadTile(grid[y - 1][x + 1].buildingType));
    if (selfEW && peerEW) bonds |= ROAD_N;
  }

  return bonds;
}

/**
 * Check if placing a road at (x,y) would form a 3×3 block of roads.
 * Returns true if placement should be BLOCKED.
 */
export function wouldFormRoadBlock(grid: Grid, x: number, y: number): boolean {
  for (let cy = y - 2; cy <= y; cy++) {
    for (let cx = x - 2; cx <= x; cx++) {
      let allRoads = true;
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          const checkX = cx + dx;
          const checkY = cy + dy;
          if (
            checkX < 0 || checkX >= GRID_SIZE ||
            checkY < 0 || checkY >= GRID_SIZE
          ) {
            allRoads = false;
            break;
          }
          // The tile being placed is treated as road
          if (checkX !== x || checkY !== y) {
            if (!isRoadTile(grid[checkY][checkX].buildingType)) {
              allRoads = false;
              break;
            }
          }
        }
        if (!allRoads) break;
      }
      if (allRoads) return true;
    }
  }
  return false;
}
