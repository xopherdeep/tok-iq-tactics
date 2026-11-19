import {computeReachableTiles} from './pathfinding';
import {computeUnitEquipmentBonuses} from './rpgCatalog';
import type {Unit} from './types';

export {computeReachableTiles};

export function isDistanceInRangeForThreat(
  unit: Unit,
  distance: number,
): boolean {
  const gear = computeUnitEquipmentBonuses(unit);
  return (
    distance >= unit.minRange && distance <= unit.maxRange + gear.rangeBonus
  );
}
