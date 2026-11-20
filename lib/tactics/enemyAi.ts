import {
  buildCombatForecast,
  getManhattanDistance,
  hasAdjacentSovereignAura,
} from './combat';
import {
  computeReachableTiles,
  getAttackableEnemiesFromPosition,
  getHealableAlliesFromPosition,
} from './pathfinding';
import type {
  DominantDoctrine,
  GridCoord,
  Tile,
  Unit,
  UpgradeEffects,
} from './types';

export interface EnemyDecision {
  unitId: string;
  destination: GridCoord;
  path: GridCoord[];
  actionType: 'wait' | 'attack' | 'heal';
  targetId: string | null;
  score: number;
}

function countIncomingThreats(
  position: GridCoord,
  playerUnits: Unit[],
): number {
  let threatCount = 0;
  for (const playerUnit of playerUnits) {
    if (playerUnit.hp <= 0) {
      continue;
    }
    const maxThreatReach = playerUnit.move + playerUnit.maxRange;
    const distance = getManhattanDistance(position, playerUnit);
    if (distance <= maxThreatReach) {
      threatCount += 1;
    }
  }
  return threatCount;
}

function scoreTerrainPosition(
  unit: Unit,
  position: GridCoord,
  board: Tile[][],
  units: Unit[],
  playerUnits: Unit[],
): number {
  const tile = board[position.row][position.col];
  let score = 0;

  const isLowHealth = unit.hp <= unit.maxHp * 0.6;
  const playerHasArcanist = playerUnits.some(
    (candidate) => candidate.hp > 0 && candidate.unitClass === 'arcanist',
  );

  if (tile.terrain === 'fortress') {
    score += isLowHealth ? 32 : 18;
  } else if (tile.terrain === 'forest') {
    score += playerHasArcanist ? 6 : 13;
  }

  const receivesAura = hasAdjacentSovereignAura(unit, position, units);
  if (receivesAura) {
    score += 8;
  }

  const incomingThreats = countIncomingThreats(position, playerUnits);
  const isFragileBackliner =
    unit.unitClass === 'arcanist' ||
    unit.unitClass === 'ranger' ||
    unit.unitClass === 'marksman' ||
    unit.unitClass === 'cleric' ||
    unit.unitClass === 'healer';

  if (unit.unitClass === 'sovereign') {
    score -= incomingThreats * 14;
  } else if (unit.unitClass === 'healer' || unit.unitClass === 'marksman') {
    score -= incomingThreats * 10;
  } else if (isFragileBackliner) {
    score -= incomingThreats * 7;
  }

  return score;
}

function scoreDoctrineTargetPriority(
  attacker: Unit,
  target: Unit,
  doctrine: DominantDoctrine,
): number {
  const hasTauntBarrier = (target.shadowBarrierTurns ?? 0) > 0;
  if (hasTauntBarrier) {
    return 100;
  }
  if (target.unitClass === 'sovereign') {
    return 18;
  }
  const isAntiAirUnit =
    attacker.unitClass === 'ranger' || attacker.unitClass === 'marksman';
  if (isAntiAirUnit && target.canFly) {
    return 24;
  }
  if (target.unitClass === 'healer') {
    return 18;
  }
  if (target.unitClass === 'cleric') {
    return 14;
  }
  const isRangedBacklineTarget =
    target.unitClass === 'arcanist' ||
    target.unitClass === 'ranger' ||
    target.unitClass === 'marksman';
  if (doctrine === 'arcane' && isRangedBacklineTarget) {
    return 16;
  }
  if (doctrine === 'blitz' && target.unitClass === 'striker') {
    return 14;
  }
  if (doctrine === 'phalanx' && target.unitClass === 'vanguard') {
    return 12;
  }
  return 0;
}

function getNearestUnitDistance(
  position: GridCoord,
  candidates: Unit[],
): number {
  let nearest = Infinity;
  for (const unit of candidates) {
    if (unit.hp <= 0) {
      continue;
    }
    const distance = getManhattanDistance(position, unit);
    if (distance < nearest) {
      nearest = distance;
    }
  }
  return nearest;
}

export function chooseBestEnemyDecision(
  enemy: Unit,
  board: Tile[][],
  units: Unit[],
  effects: UpgradeEffects,
  doctrine: DominantDoctrine,
  playerIq = 100,
): EnemyDecision {
  const aiIqTier = playerIq >= 130 ? 2 : playerIq >= 115 ? 1 : 0;
  const playerUnits = units.filter(
    (unit) => unit.faction === 'player' && unit.hp > 0,
  );
  const injuredAllies = units.filter(
    (unit) =>
      unit.faction === 'enemy' &&
      unit.hp > 0 &&
      unit.hp < unit.maxHp &&
      unit.id !== enemy.id,
  );
  const reachable = computeReachableTiles(enemy, board, units, effects);

  let bestDecision: EnemyDecision = {
    unitId: enemy.id,
    destination: {col: enemy.col, row: enemy.row},
    path: [{col: enemy.col, row: enemy.row}],
    actionType: 'wait',
    targetId: null,
    score: -9999,
  };

  reachable.forEach((path) => {
    const destination = path[path.length - 1];
    const tilesMoved = Math.max(0, path.length - 1);
    const terrainScore = scoreTerrainPosition(
      enemy,
      destination,
      board,
      units,
      playerUnits,
    );
    const nearestPlayer = getNearestUnitDistance(destination, playerUnits);

    let approachScore = 0;
    if (enemy.canHeal && injuredAllies.length > 0) {
      const nearestInjured = getNearestUnitDistance(destination, injuredAllies);
      approachScore = -Math.abs(nearestInjured - 2) * 5.2;
    } else if (enemy.unitClass === 'sovereign') {
      approachScore = -Math.abs(nearestPlayer - 3) * 2;
    } else {
      const idealRange =
        enemy.unitClass === 'marksman'
          ? 4.5
          : enemy.unitClass === 'ranger'
            ? 3.5
            : enemy.unitClass === 'arcanist'
              ? 3
              : enemy.unitClass === 'healer'
                ? 2.8
                : enemy.unitClass === 'cleric'
                  ? 2.5
                  : 1;
      approachScore = -Math.abs(nearestPlayer - idealRange) * 4.5;
    }

    const waitScore = terrainScore + approachScore;
    if (waitScore > bestDecision.score) {
      bestDecision = {
        unitId: enemy.id,
        destination,
        path,
        actionType: 'wait',
        targetId: null,
        score: waitScore,
      };
    }

    if (enemy.canHeal) {
      const healTargets = getHealableAlliesFromPosition(
        enemy,
        destination,
        units,
      );
      for (const ally of healTargets) {
        const missingHp = ally.maxHp - ally.hp;
        const effectiveHeal = Math.min(missingHp, enemy.healPower);
        const missingRatio = missingHp / ally.maxHp;
        const sovereignBonus = ally.unitClass === 'sovereign' ? 42 : 0;
        const sanctuaryPulseBonus =
          enemy.unitClass === 'healer'
            ? injuredAllies.filter(
                (other) =>
                  other.id !== ally.id && getManhattanDistance(ally, other) === 1,
              ).length * 22
            : 0;
        const healScore =
          terrainScore +
          effectiveHeal * 6.5 +
          missingRatio * 48 +
          sovereignBonus +
          sanctuaryPulseBonus;

        if (healScore > bestDecision.score) {
          bestDecision = {
            unitId: enemy.id,
            destination,
            path,
            actionType: 'heal',
            targetId: ally.id,
            score: healScore,
          };
        }
      }
    }

    const targets = getAttackableEnemiesFromPosition(enemy, destination, units);
    for (const target of targets) {
      const forecast = buildCombatForecast(
        enemy,
        destination,
        target,
        board,
        units,
        effects,
        tilesMoved,
        playerIq,
      );

      let attackScore = terrainScore;
      const critMultiplier = 1 + (forecast.attackerCritChance / 100) * 0.5;
      const expectedDamage =
        forecast.attackerDamage *
        critMultiplier *
        (forecast.attackerHitChance / 100);
      const expectedCounter = forecast.defenderCanCounter
        ? forecast.defenderDamage * (forecast.defenderHitChance / 100)
        : 0;

      if (forecast.defenderWillDie) {
        attackScore +=
          target.unitClass === 'sovereign'
            ? 260 + aiIqTier * 40
            : 125 + aiIqTier * 22;
      }

      if (forecast.attackerWillDie) {
        attackScore -= enemy.unitClass === 'sovereign' ? 240 : 75 + aiIqTier * 12;
      }

      if (forecast.attackerOutcome === 'advantage') {
        attackScore += 26 + aiIqTier * 8;
      } else if (forecast.attackerOutcome === 'disadvantage') {
        attackScore -= 14 + aiIqTier * 6;
      }

      if (forecast.attackerDeadeyeBonus > 0) {
        attackScore += 12 + aiIqTier * 6;
      }

      if (!forecast.defenderCanCounter) {
        attackScore += 18 + aiIqTier * 8;
      }

      if (aiIqTier >= 1) {
        const missingRatio = 1 - target.hp / Math.max(1, target.maxHp);
        attackScore += missingRatio * (aiIqTier === 2 ? 32 : 18);
        const targetTile = board[target.row]?.[target.col];
        if (targetTile && targetTile.terrain === 'plains') {
          attackScore += aiIqTier * 8;
        }
      }

      attackScore += expectedDamage * 5.2 - expectedCounter * 4.1;
      attackScore += scoreDoctrineTargetPriority(enemy, target, doctrine);

      if (attackScore > bestDecision.score) {
        bestDecision = {
          unitId: enemy.id,
          destination,
          path,
          actionType: 'attack',
          targetId: target.id,
          score: attackScore,
        };
      }
    }
  });

  return bestDecision;
}
