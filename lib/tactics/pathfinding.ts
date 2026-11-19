import {TERRAIN_CONFIG} from './constants';
import {getManhattanDistance, isDistanceInAttackRange} from './combat';
import {computeUnitEquipmentBonuses} from './rpgCatalog';
import type {GridCoord, Tile, Unit, UpgradeEffects} from './types';

export function coordToKey(col: number, row: number): string {
  return `${col},${row}`;
}

export function getBoardRows(board: Tile[][]): number {
  return board.length;
}

export function getBoardCols(board: Tile[][]): number {
  return board[0]?.length ?? 0;
}

export function isInsideBoard(
  col: number,
  row: number,
  board: Tile[][],
): boolean {
  const rows = getBoardRows(board);
  const cols = getBoardCols(board);
  return col >= 0 && col < cols && row >= 0 && row < rows;
}

export function getUnitAtCoord(
  units: Unit[],
  col: number,
  row: number,
): Unit | undefined {
  return units.find(
    (unit) => unit.hp > 0 && unit.col === col && unit.row === row,
  );
}

export function isTileInEnemyZoneOfControl(
  mover: Unit,
  col: number,
  row: number,
  units: Unit[],
): boolean {
  if (mover.canFly) {
    return false;
  }

  return units.some((other) => {
    const isHostileVanguard =
      other.hp > 0 &&
      other.faction !== mover.faction &&
      other.exertsZoneOfControl;
    if (!isHostileVanguard) {
      return false;
    }
    return getManhattanDistance({col, row}, other) === 1;
  });
}

function getTileMoveCost(
  unit: Unit,
  tile: Tile,
  effects: UpgradeEffects,
): number {
  if (unit.canFly) {
    return 1;
  }
  const terrainMeta = TERRAIN_CONFIG[tile.terrain];
  if (!terrainMeta.groundPassable) {
    return Infinity;
  }
  const hasForestStride =
    unit.faction === 'player' &&
    effects.forestStrideEnabled &&
    tile.terrain === 'forest';
  return hasForestStride ? 1 : terrainMeta.moveCost;
}

const CARDINAL_DELTAS: GridCoord[] = [
  {col: 1, row: 0},
  {col: -1, row: 0},
  {col: 0, row: 1},
  {col: 0, row: -1},
];

export function computeReachableTiles(
  unit: Unit,
  board: Tile[][],
  units: Unit[],
  effects: UpgradeEffects,
): Map<string, GridCoord[]> {
  const bestCost = new Map<string, number>();
  const paths = new Map<string, GridCoord[]>();
  const startKey = coordToKey(unit.col, unit.row);
  const startPath: GridCoord[] = [{col: unit.col, row: unit.row}];

  bestCost.set(startKey, 0);
  paths.set(startKey, startPath);

  const queue: Array<{
    col: number;
    row: number;
    spent: number;
    path: GridCoord[];
  }> = [{col: unit.col, row: unit.row, spent: 0, path: startPath}];

  while (queue.length > 0) {
    queue.sort((a, b) => a.spent - b.spent);
    const current = queue.shift()!;
    const currentKey = coordToKey(current.col, current.row);
    const knownCost = bestCost.get(currentKey) ?? Infinity;
    if (current.spent > knownCost) {
      continue;
    }

    const isNotOrigin = current.col !== unit.col || current.row !== unit.row;
    const lockedByZoneOfControl =
      isNotOrigin &&
      isTileInEnemyZoneOfControl(unit, current.col, current.row, units);
    if (lockedByZoneOfControl) {
      continue;
    }

    for (const delta of CARDINAL_DELTAS) {
      const nextCol = current.col + delta.col;
      const nextRow = current.row + delta.row;
      if (!isInsideBoard(nextCol, nextRow, board)) {
        continue;
      }

      const occupant = getUnitAtCoord(units, nextCol, nextRow);
      const blockedByEnemy =
        occupant !== undefined && occupant.faction !== unit.faction;
      if (blockedByEnemy) {
        continue;
      }

      const stepCost = getTileMoveCost(unit, board[nextRow][nextCol], effects);
      const nextSpent = current.spent + stepCost;
      const effectiveMove = unit.move + computeUnitEquipmentBonuses(unit).moveBonus;
      if (nextSpent > effectiveMove) {
        continue;
      }

      const nextKey = coordToKey(nextCol, nextRow);
      const existingBest = bestCost.get(nextKey) ?? Infinity;
      if (nextSpent < existingBest) {
        const nextPath = [...current.path, {col: nextCol, row: nextRow}];
        bestCost.set(nextKey, nextSpent);
        paths.set(nextKey, nextPath);
        queue.push({col: nextCol, row: nextRow, spent: nextSpent, path: nextPath});
      }
    }
  }

  const validDestinations = new Map<string, GridCoord[]>();
  paths.forEach((path, key) => {
    const finalStep = path[path.length - 1];
    const occupant = getUnitAtCoord(units, finalStep.col, finalStep.row);
    const isFreeOrSelf = occupant === undefined || occupant.id === unit.id;
    if (isFreeOrSelf) {
      validDestinations.set(key, path);
    }
  });

  return validDestinations;
}

export function getAttackableEnemiesFromPosition(
  attacker: Unit,
  position: GridCoord,
  units: Unit[],
): Unit[] {
  return units.filter((target) => {
    const isAliveEnemy = target.hp > 0 && target.faction !== attacker.faction;
    if (!isAliveEnemy) {
      return false;
    }
    const distance = getManhattanDistance(position, target);
    return isDistanceInAttackRange(attacker, distance);
  });
}

export function getHealableAlliesFromPosition(
  healer: Unit,
  position: GridCoord,
  units: Unit[],
): Unit[] {
  if (!healer.canHeal) {
    return [];
  }
  return units.filter((ally) => {
    const isInjuredAlly =
      ally.hp > 0 &&
      ally.hp < ally.maxHp &&
      ally.faction === healer.faction &&
      ally.id !== healer.id;
    if (!isInjuredAlly) {
      return false;
    }
    const distance = getManhattanDistance(position, ally);
    return isDistanceInAttackRange(healer, distance);
  });
}

export function computeThreatenedCoordsFromPosition(
  unit: Unit,
  position: GridCoord,
  board: Tile[][],
): GridCoord[] {
  const coords: GridCoord[] = [];
  const rows = getBoardRows(board);
  const cols = getBoardCols(board);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const distance = getManhattanDistance(position, {col, row});
      if (isDistanceInAttackRange(unit, distance)) {
        coords.push({col, row});
      }
    }
  }
  return coords;
}

export function computeTotalThreatenedTileKeys(
  unit: Unit,
  reachableTiles: Map<string, GridCoord[]>,
  board: Tile[][],
): Set<string> {
  const threatened = new Set<string>();
  const rows = getBoardRows(board);
  const cols = getBoardCols(board);
  const gear = computeUnitEquipmentBonuses(unit);
  const maxReach = unit.maxRange + gear.rangeBonus;

  reachableTiles.forEach((path) => {
    const destination = path[path.length - 1];
    const minRow = Math.max(0, destination.row - maxReach);
    const maxRow = Math.min(rows - 1, destination.row + maxReach);
    const minCol = Math.max(0, destination.col - maxReach);
    const maxCol = Math.min(cols - 1, destination.col + maxReach);

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const distance = getManhattanDistance(destination, {col, row});
        if (isDistanceInAttackRange(unit, distance)) {
          threatened.add(coordToKey(col, row));
        }
      }
    }
  });

  return threatened;
}
