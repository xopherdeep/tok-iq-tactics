import {BOARD_MODE_META, PALETTE, TERRAIN_CONFIG, UNIT_ARCHETYPES} from './constants';
import {
  buildCombatForecast,
  getManhattanDistance,
  hasAdjacentSovereignAura,
  isDistanceInAttackRange,
} from './combat';
import {getIqRankTier, hasSharpStrategistSightline} from './iqSystem';
import {chooseBestEnemyDecision} from './enemyAi';
import {calculateCombatXp, calculateSupportHealXp} from './leveling';
import {renderBattleScene} from './battleRenderer';
import {
  drawTerrainTile,
  drawUnitClassGlyph,
  drawUnitPiece,
  traceRoundedRect,
} from './canvasGlyphs';
import {renderDialogueOverlay} from './dialogueRenderer';
import {
  coordToKey,
  getUnitAtCoord,
  isTileInEnemyZoneOfControl,
} from './pathfinding';
import {computeUnitEquipmentBonuses} from './rpgCatalog';
import {spriteAtlas} from './spriteAtlas';
import type {
  CombatForecast,
  GameSnapshot,
  GridCoord,
  HitBoxRect,
  Unit,
  UnitClass,
} from './types';

export interface BoardMetrics {
  canvasWidth: number;
  canvasHeight: number;
  boardX: number;
  boardY: number;
  boardWidth: number;
  boardHeight: number;
  cols: number;
  rows: number;
  tileSize: number;
}

export function computeBoardMetrics(
  canvasWidth: number,
  canvasHeight: number,
  cols = 8,
  rows = 8,
): BoardMetrics {
  const isCompactViewport = canvasWidth < 560;
  const topAllowance = isCompactViewport ? 32 : 46;
  const bottomAllowance = isCompactViewport ? 16 : 36;
  const sideAllowance = isCompactViewport ? 10 : 28;
  const availableWidth = Math.max(220, canvasWidth - sideAllowance * 2);
  const availableHeight = Math.max(
    220,
    canvasHeight - topAllowance - bottomAllowance,
  );
  const tileSize = Math.floor(
    Math.min(availableWidth / Math.max(1, cols), availableHeight / Math.max(1, rows)),
  );
  const boardWidth = tileSize * cols;
  const boardHeight = tileSize * rows;
  const boardX = Math.floor((canvasWidth - boardWidth) / 2);
  const boardY = Math.floor(
    topAllowance + (availableHeight - boardHeight) / 2,
  );

  return {
    canvasWidth,
    canvasHeight,
    boardX,
    boardY,
    boardWidth,
    boardHeight,
    cols,
    rows,
    tileSize,
  };
}

export function pointToBoardCoord(
  x: number,
  y: number,
  metrics: BoardMetrics,
): GridCoord | null {
  const relX = x - metrics.boardX;
  const relY = y - metrics.boardY;
  const outsideBoard =
    relX < 0 ||
    relY < 0 ||
    relX >= metrics.boardWidth ||
    relY >= metrics.boardHeight;
  if (outsideBoard) {
    return null;
  }
  return {
    col: Math.floor(relX / metrics.tileSize),
    row: Math.floor(relY / metrics.tileSize),
  };
}

function drawAtmosphericBackdrop(
  ctx: CanvasRenderingContext2D,
  metrics: BoardMetrics,
  timeSeconds: number,
): void {
  const centerX = metrics.canvasWidth / 2;
  const centerY = metrics.canvasHeight / 2;
  const maxRadius = Math.max(metrics.canvasWidth, metrics.canvasHeight) * 0.72;

  const radial = ctx.createRadialGradient(
    centerX,
    centerY,
    24,
    centerX,
    centerY,
    maxRadius,
  );
  radial.addColorStop(0, '#162542');
  radial.addColorStop(0.55, '#0f172a');
  radial.addColorStop(1, '#080d1a');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, metrics.canvasWidth, metrics.canvasHeight);

  ctx.save();
  for (let index = 0; index < 18; index++) {
    const seedX = ((index * 197 + 43) % 100) / 100;
    const seedY = ((index * 131 + 29) % 100) / 100;
    const px =
      (seedX * metrics.canvasWidth +
        Math.sin(timeSeconds * 0.35 + index * 1.4) * 18 +
        metrics.canvasWidth) %
      metrics.canvasWidth;
    const py =
      (seedY * metrics.canvasHeight -
        timeSeconds * (6 + (index % 5) * 2) +
        metrics.canvasHeight * 10) %
      metrics.canvasHeight;
    const alpha = 0.08 + (Math.sin(timeSeconds * 1.4 + index) * 0.5 + 0.5) * 0.14;
    ctx.fillStyle =
      index % 3 === 0
        ? `rgba(56, 189, 248, ${alpha.toFixed(2)})`
        : `rgba(148, 163, 184, ${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(px, py, 1.2 + (index % 2) * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBoardFrame(
  ctx: CanvasRenderingContext2D,
  metrics: BoardMetrics,
): void {
  const isCompactViewport = metrics.canvasWidth < 560;
  const pad = isCompactViewport ? 4 : 9;

  ctx.save();
  ctx.shadowColor = 'rgba(2, 6, 23, 0.75)';
  ctx.shadowBlur = isCompactViewport ? 14 : 28;
  ctx.shadowOffsetY = isCompactViewport ? 6 : 12;

  traceRoundedRect(
    ctx,
    metrics.boardX - pad,
    metrics.boardY - pad,
    metrics.boardWidth + pad * 2,
    metrics.boardHeight + pad * 2,
    isCompactViewport ? 7 : 11,
  );
  const frameGrad = ctx.createLinearGradient(
    metrics.boardX - pad,
    metrics.boardY - pad,
    metrics.boardX + metrics.boardWidth + pad,
    metrics.boardY + metrics.boardHeight + pad,
  );
  frameGrad.addColorStop(0, '#1e293b');
  frameGrad.addColorStop(0.5, '#0b1222');
  frameGrad.addColorStop(1, '#172540');
  ctx.fillStyle = frameGrad;
  ctx.fill();
  ctx.restore();

  traceRoundedRect(
    ctx,
    metrics.boardX - pad,
    metrics.boardY - pad,
    metrics.boardWidth + pad * 2,
    metrics.boardHeight + pad * 2,
    isCompactViewport ? 7 : 11,
  );
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  const cornerLen = isCompactViewport ? 10 : 14;
  const fx = metrics.boardX - pad;
  const fy = metrics.boardY - pad;
  const fw = metrics.boardWidth + pad * 2;
  const fh = metrics.boardHeight + pad * 2;
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(fx, fy + cornerLen);
  ctx.lineTo(fx, fy);
  ctx.lineTo(fx + cornerLen, fy);
  ctx.moveTo(fx + fw - cornerLen, fy);
  ctx.lineTo(fx + fw, fy);
  ctx.lineTo(fx + fw, fy + cornerLen);
  ctx.moveTo(fx, fy + fh - cornerLen);
  ctx.lineTo(fx, fy + fh);
  ctx.lineTo(fx + cornerLen, fy + fh);
  ctx.moveTo(fx + fw - cornerLen, fy + fh);
  ctx.lineTo(fx + fw, fy + fh);
  ctx.lineTo(fx + fw, fy + fh - cornerLen);
  ctx.stroke();
}

function drawBoardCoordinates(
  ctx: CanvasRenderingContext2D,
  metrics: BoardMetrics,
): void {
  const hasRoomForLabels = metrics.boardX >= 22;
  if (!hasRoomForLabels) {
    return;
  }

  const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  ctx.fillStyle = PALETTE.textMuted;
  ctx.font = '500 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let col = 0; col < metrics.cols; col++) {
    const fileX = metrics.boardX + col * metrics.tileSize + metrics.tileSize / 2;
    ctx.fillText(
      files[col] ?? String(col + 1),
      fileX,
      metrics.boardY + metrics.boardHeight + 17,
    );
  }

  for (let row = 0; row < metrics.rows; row++) {
    const rankY = metrics.boardY + row * metrics.tileSize + metrics.tileSize / 2;
    ctx.fillText(String(metrics.rows - row), metrics.boardX - 17, rankY);
  }
}

function drawMoveHighlights(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  metrics: BoardMetrics,
  selectedUnit: Unit,
  timeSeconds: number,
): void {
  const isEnemyPreview = selectedUnit.faction === 'enemy';
  const isActedAllyPreview =
    selectedUnit.faction === 'player' && selectedUnit.hasActed;
  if (!isEnemyPreview && !isActedAllyPreview && selectedUnit.hasMoved) {
    return;
  }

  snapshot.threatenedTileKeys.forEach((tileKey) => {
    if (snapshot.reachableTiles.has(tileKey)) {
      return;
    }
    const [colStr, rowStr] = tileKey.split(',');
    const col = Number(colStr);
    const row = Number(rowStr);
    const tileX = metrics.boardX + col * metrics.tileSize;
    const tileY = metrics.boardY + row * metrics.tileSize;
    const pulse =
      0.16 + Math.sin(timeSeconds * 3.8 - (col + row) * 0.4) * 0.05;

    if (isEnemyPreview) {
      ctx.fillStyle = `rgba(249, 115, 22, ${(pulse + 0.06).toFixed(3)})`;
      ctx.fillRect(
        tileX + 1,
        tileY + 1,
        metrics.tileSize - 2,
        metrics.tileSize - 2,
      );
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.72)';
      ctx.lineWidth = 1.25;
      ctx.strokeRect(
        tileX + 3,
        tileY + 3,
        metrics.tileSize - 6,
        metrics.tileSize - 6,
      );
    } else if (isActedAllyPreview) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.09)';
      ctx.fillRect(
        tileX + 2,
        tileY + 2,
        metrics.tileSize - 4,
        metrics.tileSize - 4,
      );
    } else {
      ctx.fillStyle = selectedUnit.canHeal
        ? 'rgba(52, 211, 153, 0.1)'
        : 'rgba(251, 113, 133, 0.1)';
      ctx.fillRect(
        tileX + 2,
        tileY + 2,
        metrics.tileSize - 4,
        metrics.tileSize - 4,
      );
      ctx.strokeStyle = selectedUnit.canHeal
        ? 'rgba(52, 211, 153, 0.34)'
        : 'rgba(251, 113, 133, 0.32)';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        tileX + 3,
        tileY + 3,
        metrics.tileSize - 6,
        metrics.tileSize - 6,
      );
    }
  });

  snapshot.reachableTiles.forEach((path) => {
    const destination = path[path.length - 1];
    const isOrigin =
      destination.col === selectedUnit.col &&
      destination.row === selectedUnit.row;
    if (isOrigin) {
      return;
    }

    const tileX = metrics.boardX + destination.col * metrics.tileSize;
    const tileY = metrics.boardY + destination.row * metrics.tileSize;
    const shimmer =
      0.21 +
      Math.sin(timeSeconds * 3.4 - (destination.col + destination.row) * 0.45) *
        0.06;

    if (isEnemyPreview) {
      ctx.fillStyle = `rgba(244, 63, 94, ${(shimmer + 0.04).toFixed(3)})`;
    } else if (isActedAllyPreview) {
      ctx.fillStyle = `rgba(148, 163, 184, ${(shimmer * 0.72).toFixed(3)})`;
    } else {
      ctx.fillStyle = `rgba(56, 189, 248, ${shimmer.toFixed(3)})`;
    }
    ctx.fillRect(tileX + 1, tileY + 1, metrics.tileSize - 2, metrics.tileSize - 2);

    const tick = Math.max(5, metrics.tileSize * 0.14);
    ctx.strokeStyle = isEnemyPreview
      ? 'rgba(251, 113, 133, 0.85)'
      : isActedAllyPreview
        ? 'rgba(148, 163, 184, 0.65)'
        : PALETTE.moveStroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tileX + 4, tileY + 4 + tick);
    ctx.lineTo(tileX + 4, tileY + 4);
    ctx.lineTo(tileX + 4 + tick, tileY + 4);
    ctx.moveTo(tileX + metrics.tileSize - 4 - tick, tileY + metrics.tileSize - 4);
    ctx.lineTo(tileX + metrics.tileSize - 4, tileY + metrics.tileSize - 4);
    ctx.lineTo(tileX + metrics.tileSize - 4, tileY + metrics.tileSize - 4 - tick);
    ctx.stroke();

    const stopsAtZoneOfControl = isTileInEnemyZoneOfControl(
      selectedUnit,
      destination.col,
      destination.row,
      snapshot.units,
    );
    if (stopsAtZoneOfControl) {
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.78)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(
        tileX + 4,
        tileY + 4,
        metrics.tileSize - 8,
        metrics.tileSize - 8,
      );
    }
  });

  if (isEnemyPreview) {
    const dangerPulse = 0.72 + Math.sin(timeSeconds * 6.2) * 0.25;
    const pad = 4 + Math.sin(timeSeconds * 6) * 1.1;
    for (const unit of snapshot.units) {
      const isThreatenedPlayer =
        unit.hp > 0 &&
        unit.faction === 'player' &&
        snapshot.threatenedTileKeys.has(coordToKey(unit.col, unit.row));
      if (!isThreatenedPlayer) {
        continue;
      }
      const tileX = metrics.boardX + unit.col * metrics.tileSize;
      const tileY = metrics.boardY + unit.row * metrics.tileSize;
      drawTacticalTileBrackets(
        ctx,
        tileX,
        tileY,
        metrics.tileSize,
        `rgba(251, 191, 36, ${dangerPulse.toFixed(2)})`,
        pad,
        2.3,
      );
    }
  }
}

function drawHoveredPathPreview(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  metrics: BoardMetrics,
  selectedUnit: Unit,
): void {
  const isEnemyPreview = selectedUnit.faction === 'enemy';
  const isReadyPlayer =
    selectedUnit.faction === 'player' &&
    !selectedUnit.hasActed &&
    !selectedUnit.hasMoved;
  if (!snapshot.hoveredTile || (!isReadyPlayer && !isEnemyPreview)) {
    return;
  }
  const hoverKey = coordToKey(snapshot.hoveredTile.col, snapshot.hoveredTile.row);
  const path = snapshot.reachableTiles.get(hoverKey);
  if (!path || path.length < 2) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = isEnemyPreview
    ? 'rgba(244, 63, 94, 0.45)'
    : 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = Math.max(6, metrics.tileSize * 0.14);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  path.forEach((step, index) => {
    const cx = metrics.boardX + step.col * metrics.tileSize + metrics.tileSize / 2;
    const cy = metrics.boardY + step.row * metrics.tileSize + metrics.tileSize / 2;
    if (index === 0) {
      ctx.moveTo(cx, cy);
    } else {
      ctx.lineTo(cx, cy);
    }
  });
  ctx.stroke();

  const arrowColor = isEnemyPreview ? '#fb7185' : PALETTE.playerHighlight;
  ctx.strokeStyle = arrowColor;
  ctx.lineWidth = Math.max(2.2, metrics.tileSize * 0.055);
  ctx.stroke();

  const prev = path[path.length - 2];
  const last = path[path.length - 1];
  const endX = metrics.boardX + last.col * metrics.tileSize + metrics.tileSize / 2;
  const endY = metrics.boardY + last.row * metrics.tileSize + metrics.tileSize / 2;
  const angle = Math.atan2(last.row - prev.row, last.col - prev.col);
  const headLen = Math.max(6, metrics.tileSize * 0.16);

  ctx.translate(endX, endY);
  ctx.rotate(angle);
  ctx.fillStyle = arrowColor;
  ctx.beginPath();
  ctx.moveTo(headLen * 0.65, 0);
  ctx.lineTo(-headLen * 0.55, -headLen * 0.58);
  ctx.lineTo(-headLen * 0.3, 0);
  ctx.lineTo(-headLen * 0.55, headLen * 0.58);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawActionHighlights(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  metrics: BoardMetrics,
  selectedUnit: Unit,
  timeSeconds: number,
): void {
  const isReadyPlayer =
    selectedUnit.faction === 'player' && !selectedUnit.hasActed;
  if (!isReadyPlayer) {
    return;
  }

  const pulse = 0.72 + Math.sin(timeSeconds * 6.5) * 0.25;

  for (let row = 0; row < metrics.rows; row++) {
    for (let col = 0; col < metrics.cols; col++) {
      const distance = getManhattanDistance(selectedUnit, {col, row});
      if (!isDistanceInAttackRange(selectedUnit, distance)) {
        continue;
      }

      const occupant = getUnitAtCoord(snapshot.units, col, row);
      const isTargetableEnemy =
        occupant !== undefined && snapshot.attackableEnemyIds.has(occupant.id);
      const isHealableAlly =
        occupant !== undefined && snapshot.healableAllyIds.has(occupant.id);

      const tileX = metrics.boardX + col * metrics.tileSize;
      const tileY = metrics.boardY + row * metrics.tileSize;

      if (isTargetableEnemy || isHealableAlly) {
        ctx.fillStyle = isHealableAlly ? PALETTE.healFill : PALETTE.attackFill;
        ctx.fillRect(tileX + 1, tileY + 1, metrics.tileSize - 2, metrics.tileSize - 2);

        const bracket = Math.max(7, metrics.tileSize * 0.22);
        const pad = 4 + Math.sin(timeSeconds * 6) * 1.2;
        ctx.strokeStyle = isHealableAlly
          ? `rgba(52, 211, 153, ${pulse.toFixed(2)})`
          : `rgba(251, 113, 133, ${pulse.toFixed(2)})`;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(tileX + pad, tileY + pad + bracket);
        ctx.lineTo(tileX + pad, tileY + pad);
        ctx.lineTo(tileX + pad + bracket, tileY + pad);

        ctx.moveTo(tileX + metrics.tileSize - pad - bracket, tileY + pad);
        ctx.lineTo(tileX + metrics.tileSize - pad, tileY + pad);
        ctx.lineTo(tileX + metrics.tileSize - pad, tileY + pad + bracket);

        ctx.moveTo(tileX + pad, tileY + metrics.tileSize - pad - bracket);
        ctx.lineTo(tileX + pad, tileY + metrics.tileSize - pad);
        ctx.lineTo(tileX + pad + bracket, tileY + metrics.tileSize - pad);

        ctx.moveTo(
          tileX + metrics.tileSize - pad - bracket,
          tileY + metrics.tileSize - pad,
        );
        ctx.lineTo(tileX + metrics.tileSize - pad, tileY + metrics.tileSize - pad);
        ctx.lineTo(
          tileX + metrics.tileSize - pad,
          tileY + metrics.tileSize - pad - bracket,
        );
        ctx.stroke();
      } else if (selectedUnit.hasMoved) {
        ctx.fillStyle = selectedUnit.canHeal
          ? 'rgba(52, 211, 153, 0.1)'
          : 'rgba(251, 113, 133, 0.1)';
        ctx.fillRect(tileX + 2, tileY + 2, metrics.tileSize - 4, metrics.tileSize - 4);
      }
    }
  }
}

function drawTacticalTileBrackets(
  ctx: CanvasRenderingContext2D,
  tileX: number,
  tileY: number,
  tileSize: number,
  color: string,
  pad: number,
  lineWidth: number,
): void {
  const bracket = Math.max(7, tileSize * 0.24);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(tileX + pad, tileY + pad + bracket);
  ctx.lineTo(tileX + pad, tileY + pad);
  ctx.lineTo(tileX + pad + bracket, tileY + pad);

  ctx.moveTo(tileX + tileSize - pad - bracket, tileY + pad);
  ctx.lineTo(tileX + tileSize - pad, tileY + pad);
  ctx.lineTo(tileX + tileSize - pad, tileY + pad + bracket);

  ctx.moveTo(tileX + pad, tileY + tileSize - pad - bracket);
  ctx.lineTo(tileX + pad, tileY + tileSize - pad);
  ctx.lineTo(tileX + pad + bracket, tileY + tileSize - pad);

  ctx.moveTo(tileX + tileSize - pad - bracket, tileY + tileSize - pad);
  ctx.lineTo(tileX + tileSize - pad, tileY + tileSize - pad);
  ctx.lineTo(tileX + tileSize - pad, tileY + tileSize - pad - bracket);
  ctx.stroke();
}

function drawEnemyActionTileHighlights(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  metrics: BoardMetrics,
  timeSeconds: number,
): void {
  const action = snapshot.activeEnemyAction;
  if (!action || snapshot.phase !== 'enemy' || snapshot.screen !== 'playing') {
    return;
  }

  const isHeal = action.actionType === 'heal';
  const isTargeting = action.phase === 'targeting';
  const pulseWave = Math.sin(timeSeconds * 9) * 0.5 + 0.5;
  const actorUnit = snapshot.units.find((unit) => unit.id === action.actorId);
  const actorTileCol =
    action.phase === 'moving' && actorUnit
      ? Math.round(actorUnit.renderX)
      : action.destination.col;
  const actorTileRow =
    action.phase === 'moving' && actorUnit
      ? Math.round(actorUnit.renderY)
      : action.destination.row;

  ctx.save();

  const hasMovePath = action.path.length > 1;
  if (hasMovePath) {
    const originX = metrics.boardX + action.origin.col * metrics.tileSize;
    const originY = metrics.boardY + action.origin.row * metrics.tileSize;
    ctx.fillStyle = isHeal
      ? 'rgba(52, 211, 153, 0.14)'
      : 'rgba(244, 63, 94, 0.16)';
    ctx.fillRect(originX + 2, originY + 2, metrics.tileSize - 4, metrics.tileSize - 4);
    ctx.strokeStyle = isHeal
      ? 'rgba(52, 211, 153, 0.45)'
      : 'rgba(251, 113, 133, 0.48)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(
      originX + 3,
      originY + 3,
      metrics.tileSize - 6,
      metrics.tileSize - 6,
    );
    ctx.setLineDash([]);

    ctx.strokeStyle = isHeal
      ? 'rgba(52, 211, 153, 0.62)'
      : 'rgba(251, 113, 133, 0.68)';
    ctx.lineWidth = Math.max(3, metrics.tileSize * 0.08);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    action.path.forEach((step, index) => {
      const cx = metrics.boardX + (step.col + 0.5) * metrics.tileSize;
      const cy = metrics.boardY + (step.row + 0.5) * metrics.tileSize;
      if (index === 0) {
        ctx.moveTo(cx, cy);
      } else {
        ctx.lineTo(cx, cy);
      }
    });
    ctx.stroke();
  }

  const actorX = metrics.boardX + actorTileCol * metrics.tileSize;
  const actorY = metrics.boardY + actorTileRow * metrics.tileSize;
  const actorAlpha = isTargeting ? 0.28 + pulseWave * 0.18 : 0.22 + pulseWave * 0.1;
  ctx.fillStyle = isHeal
    ? `rgba(16, 185, 129, ${actorAlpha.toFixed(3)})`
    : `rgba(244, 63, 94, ${actorAlpha.toFixed(3)})`;
  ctx.fillRect(actorX + 1, actorY + 1, metrics.tileSize - 2, metrics.tileSize - 2);

  ctx.strokeStyle = isHeal ? '#34d399' : '#fb7185';
  ctx.lineWidth = isTargeting ? 2.8 : 2;
  ctx.strokeRect(
    actorX + 2,
    actorY + 2,
    metrics.tileSize - 4,
    metrics.tileSize - 4,
  );
  drawTacticalTileBrackets(
    ctx,
    actorX,
    actorY,
    metrics.tileSize,
    isHeal ? '#a7f3d0' : '#fecdd3',
    4,
    2.2,
  );

  if (action.targetCoord) {
    const targetX = metrics.boardX + action.targetCoord.col * metrics.tileSize;
    const targetY = metrics.boardY + action.targetCoord.row * metrics.tileSize;
    const targetAlpha = isTargeting
      ? 0.34 + pulseWave * 0.22
      : 0.18 + pulseWave * 0.12;

    ctx.fillStyle = isHeal
      ? `rgba(52, 211, 153, ${targetAlpha.toFixed(3)})`
      : `rgba(251, 191, 36, ${targetAlpha.toFixed(3)})`;
    ctx.fillRect(targetX + 1, targetY + 1, metrics.tileSize - 2, metrics.tileSize - 2);

    if (!isHeal) {
      ctx.fillStyle = `rgba(244, 63, 94, ${(targetAlpha * 0.72).toFixed(3)})`;
      ctx.fillRect(
        targetX + 3,
        targetY + 3,
        metrics.tileSize - 6,
        metrics.tileSize - 6,
      );
    }

    ctx.strokeStyle = isHeal ? '#34d399' : '#fbbf24';
    ctx.lineWidth = isTargeting ? 3 : 2;
    ctx.strokeRect(
      targetX + 2,
      targetY + 2,
      metrics.tileSize - 4,
      metrics.tileSize - 4,
    );

    const animatedPad = isTargeting ? 3 + (1 - pulseWave) * 3.2 : 5;
    drawTacticalTileBrackets(
      ctx,
      targetX,
      targetY,
      metrics.tileSize,
      isHeal ? '#6ee7b7' : '#fef08a',
      animatedPad,
      isTargeting ? 2.8 : 2,
    );

    if (isTargeting) {
      const centerX = targetX + metrics.tileSize / 2;
      const centerY = targetY + metrics.tileSize / 2;
      const ringRadius = metrics.tileSize * (0.36 + pulseWave * 0.12);
      ctx.strokeStyle = isHeal
        ? 'rgba(110, 231, 183, 0.85)'
        : 'rgba(251, 191, 36, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawTileRoleFlag(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  topY: number,
  label: string,
  fillColor: string,
  borderColor: string,
  textColor: string,
  metrics: BoardMetrics,
): void {
  ctx.save();
  ctx.font = '700 10px "JetBrains Mono", monospace';
  const textWidth = ctx.measureText(label).width;
  const badgeW = textWidth + 12;
  const badgeH = 18;
  const clampedX = Math.max(
    6,
    Math.min(metrics.canvasWidth - badgeW - 6, centerX - badgeW / 2),
  );
  const clampedY = Math.max(30, topY - badgeH - 4);

  ctx.shadowColor = 'rgba(2, 6, 23, 0.85)';
  ctx.shadowBlur = 8;
  traceRoundedRect(ctx, clampedX, clampedY, badgeW, badgeH, 5);
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.restore();

  ctx.save();
  traceRoundedRect(ctx, clampedX, clampedY, badgeW, badgeH, 5);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.font = '700 10px "JetBrains Mono", monospace';
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, clampedX + badgeW / 2, clampedY + badgeH / 2 + 0.5);
  ctx.restore();
}

function drawEnemyActionTargetingOverlay(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  metrics: BoardMetrics,
  timeSeconds: number,
): void {
  const action = snapshot.activeEnemyAction;
  if (
    !action ||
    snapshot.phase !== 'enemy' ||
    snapshot.screen !== 'playing' ||
    snapshot.battleScene
  ) {
    return;
  }

  const actorUnit = snapshot.units.find((unit) => unit.id === action.actorId);
  const startGridX = actorUnit ? actorUnit.renderX : action.destination.col;
  const startGridY = actorUnit ? actorUnit.renderY : action.destination.row;
  const startX = metrics.boardX + (startGridX + 0.5) * metrics.tileSize;
  const startY = metrics.boardY + (startGridY + 0.5) * metrics.tileSize;
  const isHeal = action.actionType === 'heal';
  const isTargeting = action.phase === 'targeting';

  if (action.targetCoord) {
    const endX =
      metrics.boardX + (action.targetCoord.col + 0.5) * metrics.tileSize;
    const endY =
      metrics.boardY + (action.targetCoord.row + 0.5) * metrics.tileSize;
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.hypot(dx, dy);

    if (distance > 4) {
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;
      const archLift = Math.min(34, Math.max(12, distance * 0.22));
      const controlX = midX;
      const controlY = midY - archLift;

      const lineColor = isHeal ? '#34d399' : '#fb7185';
      const coreColor = isHeal ? '#a7f3d0' : '#fde047';

      ctx.save();
      ctx.globalAlpha = isTargeting ? 0.95 : 0.55;
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = isTargeting ? 14 : 6;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = isTargeting ? 5 : 3;
      ctx.lineCap = 'round';
      ctx.setLineDash([10, 7]);
      ctx.lineDashOffset = -timeSeconds * 48;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.quadraticCurveTo(controlX, controlY, endX, endY);
      ctx.stroke();

      ctx.strokeStyle = coreColor;
      ctx.lineWidth = isTargeting ? 2.2 : 1.4;
      ctx.stroke();
      ctx.setLineDash([]);

      const travelT = (timeSeconds * 1.9) % 1;
      const invT = 1 - travelT;
      const pulseX =
        invT * invT * startX +
        2 * invT * travelT * controlX +
        travelT * travelT * endX;
      const pulseY =
        invT * invT * startY +
        2 * invT * travelT * controlY +
        travelT * travelT * endY;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pulseX, pulseY, isTargeting ? 4.5 : 3, 0, Math.PI * 2);
      ctx.fill();

      const tangentX = endX - controlX;
      const tangentY = endY - controlY;
      const arrowAngle = Math.atan2(tangentY, tangentX);
      const headLen = isTargeting ? 13 : 9;
      ctx.translate(endX, endY);
      ctx.rotate(arrowAngle);
      ctx.fillStyle = coreColor;
      ctx.beginPath();
      ctx.moveTo(2, 0);
      ctx.lineTo(-headLen, -headLen * 0.56);
      ctx.lineTo(-headLen * 0.65, 0);
      ctx.lineTo(-headLen, headLen * 0.56);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const actorTopY = metrics.boardY + startGridY * metrics.tileSize;
    const targetTopY = metrics.boardY + action.targetCoord.row * metrics.tileSize;
    drawTileRoleFlag(
      ctx,
      startX,
      actorTopY,
      isHeal ? 'CASTING' : 'ATTACKING',
      isHeal ? 'rgba(6, 78, 59, 0.95)' : 'rgba(136, 19, 55, 0.95)',
      isHeal ? '#34d399' : '#fb7185',
      '#f8fafc',
      metrics,
    );
    drawTileRoleFlag(
      ctx,
      endX,
      targetTopY,
      isHeal ? 'MEND' : 'TARGET',
      isHeal ? 'rgba(6, 95, 70, 0.96)' : 'rgba(120, 53, 15, 0.96)',
      isHeal ? '#6ee7b7' : '#fbbf24',
      isHeal ? '#ecfdf5' : '#fef3c7',
      metrics,
    );
  }
}

function drawSovereignAuraLinks(
  ctx: CanvasRenderingContext2D,
  units: Unit[],
  metrics: BoardMetrics,
  timeSeconds: number,
): void {
  const sovereigns = units.filter(
    (unit) => unit.hp > 0 && unit.unitClass === 'sovereign',
  );
  ctx.save();

  for (const sovereign of sovereigns) {
    const sovX =
      metrics.boardX + (sovereign.renderX + 0.5) * metrics.tileSize;
    const sovY =
      metrics.boardY + (sovereign.renderY + 0.5) * metrics.tileSize;

    for (const ally of units) {
      const receivesAura =
        ally.hp > 0 &&
        ally.faction === sovereign.faction &&
        ally.id !== sovereign.id &&
        getManhattanDistance(sovereign, ally) === 1;
      if (!receivesAura) {
        continue;
      }

      const allyX = metrics.boardX + (ally.renderX + 0.5) * metrics.tileSize;
      const allyY = metrics.boardY + (ally.renderY + 0.5) * metrics.tileSize;
      const isTwinPactBond =
        sovereign.faction === 'player' && ally.unitClass === 'sovereign';

      if (isTwinPactBond) {
        if (sovereign.id > ally.id) {
          continue;
        }
        const pulse = 0.72 + Math.sin(timeSeconds * 4.5) * 0.22;
        ctx.save();
        ctx.setLineDash([]);
        ctx.shadowColor = 'rgba(251, 191, 36, 0.75)';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = `rgba(251, 191, 36, ${pulse})`;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(sovX, sovY);
        ctx.lineTo(allyX, allyY);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -timeSeconds * 26;
        ctx.strokeStyle = 'rgba(254, 249, 195, 0.95)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(sovX, sovY);
        ctx.lineTo(allyX, allyY);
        ctx.stroke();
        ctx.restore();
        continue;
      }

      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = -timeSeconds * 18;
      ctx.lineWidth = 1.6;
      ctx.strokeStyle =
        sovereign.faction === 'player'
          ? 'rgba(251, 191, 36, 0.58)'
          : 'rgba(251, 113, 133, 0.42)';
      ctx.beginPath();
      ctx.moveTo(sovX, sovY);
      ctx.lineTo(allyX, allyY);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawEffectsLayer(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  metrics: BoardMetrics,
): void {
  for (const ring of snapshot.shockwaves) {
    const progress = Math.min(1, ring.age / ring.duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const radius = eased * ring.maxRadius * metrics.tileSize;
    const alpha = Math.max(0, 1 - progress);
    const cx = metrics.boardX + (ring.x + 0.5) * metrics.tileSize;
    const cy = metrics.boardY + (ring.y + 0.5) * metrics.tileSize;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = Math.max(1.5, (1 - progress) * 4.5);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  for (const slash of snapshot.slashTrails) {
    const progress = Math.min(1, slash.age / slash.duration);
    const alpha = Math.max(0, 1 - progress);
    const cx = metrics.boardX + (slash.x + 0.5) * metrics.tileSize;
    const cy = metrics.boardY + (slash.y + 0.5) * metrics.tileSize;
    const arcRadius = metrics.tileSize * 0.42;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(slash.angle);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = slash.color;
    ctx.lineWidth = Math.max(2, (1 - progress) * 5.5);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, arcRadius, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();
    ctx.restore();
  }

  for (const bolt of snapshot.projectiles) {
    const progress = Math.min(1, bolt.age / bolt.duration);
    const currentX =
      metrics.boardX +
      (bolt.fromX + (bolt.toX - bolt.fromX) * progress + 0.5) * metrics.tileSize;
    const currentY =
      metrics.boardY +
      (bolt.fromY + (bolt.toY - bolt.fromY) * progress + 0.5) * metrics.tileSize;
    const tailProgress = Math.max(0, progress - 0.3);
    const tailX =
      metrics.boardX +
      (bolt.fromX + (bolt.toX - bolt.fromX) * tailProgress + 0.5) *
        metrics.tileSize;
    const tailY =
      metrics.boardY +
      (bolt.fromY + (bolt.toY - bolt.fromY) * tailProgress + 0.5) *
        metrics.tileSize;

    ctx.save();
    ctx.shadowColor = bolt.color;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = bolt.color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(currentX, currentY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (const particle of snapshot.particles) {
    const alpha = Math.max(0, 1 - particle.age / particle.duration);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    const px = metrics.boardX + particle.x * metrics.tileSize;
    const py = metrics.boardY + particle.y * metrics.tileSize;
    ctx.translate(px, py);
    ctx.rotate(particle.age * 7);
    ctx.fillRect(
      -particle.size / 2,
      -particle.size / 2,
      particle.size,
      particle.size,
    );
    ctx.restore();
  }

  for (const callout of snapshot.floatingCallouts) {
    const progress = Math.min(1, callout.age / callout.duration);
    const alpha = progress < 0.72 ? 1 : (1 - progress) / 0.28;
    const popScale = progress < 0.14 ? 0.8 + (progress / 0.14) * 0.3 : 1;
    const px = metrics.boardX + (callout.x + 0.5) * metrics.tileSize;
    const py =
      metrics.boardY +
      (callout.y + 0.28) * metrics.tileSize -
      progress * metrics.tileSize * 0.72;

    ctx.save();
    ctx.translate(px, py);
    ctx.scale(popScale, popScale);
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = '700 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.92)';
    ctx.strokeText(callout.text, 0, 0);
    ctx.fillStyle = callout.color;
    ctx.fillText(callout.text, 0, 0);
    ctx.restore();
  }
}

function drawStageCalloutRibbon(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  metrics: BoardMetrics,
): void {
  if (!snapshot.stageCallout) {
    return;
  }

  const isCompactViewport = metrics.canvasWidth < 560;
  const ribbonWidth = isCompactViewport
    ? metrics.canvasWidth - 16
    : Math.min(metrics.canvasWidth - 32, metrics.boardWidth + 60);
  const ribbonHeight = isCompactViewport ? 22 : 28;
  const ribbonX = Math.floor((metrics.canvasWidth - ribbonWidth) / 2);
  const ribbonY = isCompactViewport ? 4 : 8;

  const activeEnemyAction = snapshot.activeEnemyAction;
  const isEnemyAttackLock =
    activeEnemyAction !== null && activeEnemyAction.actionType === 'attack';
  const isEnemyHealLock =
    activeEnemyAction !== null && activeEnemyAction.actionType === 'heal';

  ctx.save();
  traceRoundedRect(ctx, ribbonX, ribbonY, ribbonWidth, ribbonHeight, 6);
  ctx.fillStyle = isEnemyAttackLock
    ? 'rgba(136, 19, 55, 0.94)'
    : isEnemyHealLock
      ? 'rgba(6, 78, 59, 0.94)'
      : 'rgba(15, 23, 42, 0.9)';
  ctx.fill();
  ctx.strokeStyle = isEnemyAttackLock
    ? '#fb7185'
    : isEnemyHealLock
      ? '#34d399'
      : '#1e293b';
  ctx.lineWidth = isEnemyAttackLock || isEnemyHealLock ? 1.5 : 1;
  ctx.stroke();

  ctx.fillStyle = isEnemyAttackLock
    ? '#fff1f2'
    : isEnemyHealLock
      ? '#ecfdf5'
      : '#cbd5e1';
  ctx.font = isCompactViewport
    ? isEnemyAttackLock || isEnemyHealLock
      ? '700 11px "Plus Jakarta Sans", sans-serif'
      : '500 11px "Plus Jakarta Sans", sans-serif'
    : isEnemyAttackLock || isEnemyHealLock
      ? '700 12px "Plus Jakarta Sans", sans-serif'
      : '500 12px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    snapshot.stageCallout,
    metrics.canvasWidth / 2,
    ribbonY + ribbonHeight / 2,
    ribbonWidth - 16,
  );
  ctx.restore();
}

function computeTooltipPosition(
  anchorTile: GridCoord,
  cardWidth: number,
  cardHeight: number,
  metrics: BoardMetrics,
): {x: number; y: number} {
  const isCompactViewport = metrics.canvasWidth < 540;
  if (isCompactViewport) {
    const centeredX = Math.max(
      8,
      Math.floor((metrics.canvasWidth - cardWidth) / 2),
    );
    const tileInUpperHalf = anchorTile.row < metrics.rows / 2;
    const pinnedY = tileInUpperHalf
      ? metrics.canvasHeight - cardHeight - 10
      : 32;
    return {x: centeredX, y: pinnedY};
  }

  const tileCenterX = metrics.boardX + (anchorTile.col + 0.5) * metrics.tileSize;
  const tileCenterY = metrics.boardY + (anchorTile.row + 0.5) * metrics.tileSize;

  let x = tileCenterX + metrics.tileSize * 0.65;
  if (x + cardWidth > metrics.canvasWidth - 12) {
    x = tileCenterX - metrics.tileSize * 0.65 - cardWidth;
  }
  x = Math.max(12, Math.min(metrics.canvasWidth - cardWidth - 12, x));

  const y = Math.max(
    44,
    Math.min(metrics.canvasHeight - cardHeight - 12, tileCenterY - cardHeight / 2),
  );
  return {x, y};
}

function resolveForecastForHover(
  snapshot: GameSnapshot,
  selectedUnit: Unit | undefined,
  hoveredUnit: Unit | undefined,
): CombatForecast | null {
  const canPreviewAttack =
    selectedUnit !== undefined &&
    selectedUnit.faction === 'player' &&
    !selectedUnit.hasActed &&
    hoveredUnit !== undefined &&
    hoveredUnit.faction === 'enemy' &&
    snapshot.attackableEnemyIds.has(hoveredUnit.id);

  if (!canPreviewAttack || !selectedUnit || !hoveredUnit) {
    return null;
  }

  return buildCombatForecast(
    selectedUnit,
    selectedUnit,
    hoveredUnit,
    snapshot.board,
    snapshot.units,
    snapshot.effects,
    selectedUnit.tilesMovedThisTurn,
    snapshot.iqState.current,
  );
}

function drawHealForecastCard(
  ctx: CanvasRenderingContext2D,
  healer: Unit,
  ally: Unit,
  anchorTile: GridCoord,
  metrics: BoardMetrics,
): void {
  const cardWidth = Math.min(246, metrics.canvasWidth - 16);
  const cardHeight = 114;
  const {x, y} = computeTooltipPosition(anchorTile, cardWidth, cardHeight, metrics);

  const missingHp = ally.maxHp - ally.hp;
  const effectiveHeal = Math.min(missingHp, healer.healPower);
  const projectedHp = ally.hp + effectiveHeal;
  const expectedXp = calculateSupportHealXp(effectiveHeal);

  ctx.save();
  ctx.shadowColor = 'rgba(2, 6, 23, 0.72)';
  ctx.shadowBlur = 16;
  traceRoundedRect(ctx, x, y, cardWidth, cardHeight, 9);
  ctx.fillStyle = PALETTE.panelSurface;
  ctx.fill();
  ctx.restore();

  ctx.save();
  traceRoundedRect(ctx, x, y, cardWidth, cardHeight, 9);
  ctx.strokeStyle = PALETTE.healColor;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  const isSanctuaryHealer = healer.unitClass === 'healer';
  const healTitle = isSanctuaryHealer ? 'SANCTUARY PULSE' : 'RADIANT MEND';
  const healFooter = isSanctuaryHealer
    ? 'Pulse: +4 HP to adjacent allies'
    : 'Click ally to cast healing light';

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '700 11px "JetBrains Mono", monospace';
  ctx.fillStyle = PALETTE.healColor;
  ctx.fillText(healTitle, x + 12, y + 10);

  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.xpColor;
  ctx.fillText(`+${expectedXp} XP`, x + cardWidth - 12, y + 10);

  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 29);
  ctx.lineTo(x + cardWidth - 12, y + 29);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = PALETTE.textPrimary;
  ctx.fillText(ally.name, x + 12, y + 38);

  ctx.textAlign = 'right';
  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.fillStyle = PALETTE.healColor;
  ctx.fillText(`+${effectiveHeal} HP`, x + cardWidth - 12, y + 38);

  ctx.textAlign = 'left';
  ctx.font = '500 11px "JetBrains Mono", monospace';
  ctx.fillStyle = PALETTE.textSecondary;
  ctx.fillText(
    `HP: ${ally.hp} → ${projectedHp} / ${ally.maxHp}`,
    x + 12,
    y + 62,
  );

  ctx.fillStyle = isSanctuaryHealer ? PALETTE.healerColor : PALETTE.textMuted;
  ctx.fillText(healFooter, x + 12, y + 86);
  ctx.restore();
}

function drawCombatForecastCard(
  ctx: CanvasRenderingContext2D,
  forecast: CombatForecast,
  attacker: Unit,
  defender: Unit,
  anchorTile: GridCoord,
  metrics: BoardMetrics,
): void {
  const cardWidth = Math.min(276, metrics.canvasWidth - 16);
  const cardHeight = 184;
  const {x, y} = computeTooltipPosition(anchorTile, cardWidth, cardHeight, metrics);

  ctx.save();
  ctx.shadowColor = 'rgba(2, 6, 23, 0.72)';
  ctx.shadowBlur = 18;
  traceRoundedRect(ctx, x, y, cardWidth, cardHeight, 9);
  ctx.fillStyle = PALETTE.panelSurface;
  ctx.fill();
  ctx.restore();

  ctx.save();
  traceRoundedRect(ctx, x, y, cardWidth, cardHeight, 9);
  ctx.strokeStyle = PALETTE.enemyPrimary;
  ctx.lineWidth = 1.25;
  ctx.stroke();

  ctx.font = '700 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = PALETTE.textSecondary;
  ctx.fillText('COMBAT FORECAST', x + 12, y + 10);

  const outcomeLabel =
    forecast.attackerAntiAirBonus > 0
      ? `ANTI-AIR +${forecast.attackerAntiAirBonus}`
      : forecast.attackerOutcome === 'advantage'
        ? 'ADVANTAGE +2'
        : forecast.attackerOutcome === 'disadvantage'
          ? 'DISADVANTAGE -2'
          : 'NEUTRAL';
  const outcomeColor =
    forecast.attackerAntiAirBonus > 0 || forecast.attackerOutcome === 'advantage'
      ? PALETTE.healColor
      : forecast.attackerOutcome === 'disadvantage'
        ? PALETTE.enemyPrimary
        : PALETTE.textMuted;

  ctx.textAlign = 'right';
  ctx.fillStyle = outcomeColor;
  ctx.fillText(outcomeLabel, x + cardWidth - 12, y + 10);

  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 29);
  ctx.lineTo(x + cardWidth - 12, y + 29);
  ctx.stroke();

  const projectedDefenderHp = Math.max(0, defender.hp - forecast.attackerDamage);
  ctx.textAlign = 'left';
  ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = PALETTE.playerPrimary;
  ctx.fillText(`${attacker.name} · Lv ${attacker.level}`, x + 12, y + 38);

  ctx.textAlign = 'right';
  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.fillStyle = forecast.defenderWillDie ? PALETTE.healColor : PALETTE.textPrimary;
  const strikeSummary = forecast.defenderWillDie
    ? `${forecast.attackerDamage} DMG · LETHAL`
    : `${forecast.attackerDamage} DMG · ${forecast.attackerHitChance}%`;
  ctx.fillText(strikeSummary, x + cardWidth - 12, y + 38);

  ctx.textAlign = 'left';
  ctx.font = '500 11px "JetBrains Mono", monospace';
  ctx.fillStyle = PALETTE.textSecondary;
  ctx.fillText(
    `${defender.name} HP: ${defender.hp} → ${projectedDefenderHp}`,
    x + 12,
    y + 58,
  );

  const expectedXp = calculateCombatXp(
    forecast.attackerDamage,
    forecast.defenderWillDie,
  );
  const willLevelUp = attacker.xp + expectedXp >= attacker.xpToNextLevel;
  ctx.textAlign = 'right';
  ctx.fillStyle = willLevelUp ? PALETTE.auraColor : PALETTE.xpColor;
  ctx.fillText(
    willLevelUp ? `+${expectedXp} XP · LVL UP` : `+${expectedXp} XP`,
    x + cardWidth - 12,
    y + 58,
  );

  const hasHighAttackerCrit = forecast.attackerCritChance >= 30;
  ctx.textAlign = 'left';
  ctx.fillStyle = hasHighAttackerCrit ? PALETTE.critColor : PALETTE.textSecondary;
  ctx.fillText(`CRIT ${forecast.attackerCritChance}%`, x + 12, y + 76);

  const bonusParts: string[] = [];
  if (forecast.attackerDeadeyeBonus > 0) {
    bonusParts.push(`Deadeye +${forecast.attackerDeadeyeBonus}%`);
  }
  if (forecast.attackerHasAura) {
    bonusParts.push('Aura');
  }
  if (forecast.attackerPierceBonus > 0) {
    bonusParts.push(`Pierce +${forecast.attackerPierceBonus}`);
  }
  if (forecast.attackerAntiAirBonus > 0) {
    bonusParts.push(`Anti-Air +${forecast.attackerAntiAirBonus}`);
  }
  if (forecast.ignoresTerrain) {
    bonusParts.push('Ignores Terrain');
  }
  if (bonusParts.length > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.auraColor;
    ctx.fillText(bonusParts.join(' · '), x + cardWidth - 12, y + 76, cardWidth - 104);
  }

  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 100);
  ctx.lineTo(x + cardWidth - 12, y + 100);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = PALETTE.enemyPrimary;
  ctx.fillText('Counter-Attack', x + 12, y + 112);

  ctx.textAlign = 'right';
  ctx.font = '700 12px "JetBrains Mono", monospace';
  if (!forecast.defenderCanCounter) {
    ctx.fillStyle = PALETTE.healColor;
    ctx.fillText('NO COUNTER', x + cardWidth - 12, y + 112);
  } else {
    ctx.fillStyle = forecast.attackerWillDie
      ? PALETTE.enemyPrimary
      : PALETTE.enemyAmber;
    const counterLabel = forecast.attackerWillDie
      ? `${forecast.defenderDamage} DMG · FATAL`
      : `${forecast.defenderDamage} DMG · ${forecast.defenderHitChance}%`;
    ctx.fillText(counterLabel, x + cardWidth - 12, y + 112);
  }

  const projectedAttackerHp = forecast.defenderCanCounter
    ? Math.max(0, attacker.hp - forecast.defenderDamage)
    : attacker.hp;
  ctx.textAlign = 'left';
  ctx.font = '500 11px "JetBrains Mono", monospace';
  ctx.fillStyle = PALETTE.textSecondary;
  ctx.fillText(
    `Your HP: ${attacker.hp} → ${projectedAttackerHp}`,
    x + 12,
    y + 136,
  );

  if (forecast.defenderCanCounter && forecast.defenderCritChance >= 20) {
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.critColor;
    ctx.fillText(`CRIT ${forecast.defenderCritChance}%`, x + cardWidth - 12, y + 136);
  }
  ctx.restore();
}

function drawTacticalReadSightline(
  ctx: CanvasRenderingContext2D,
  enemy: Unit,
  target: Unit,
  metrics: BoardMetrics,
  timeSeconds: number,
): void {
  const startX = metrics.boardX + (enemy.col + 0.5) * metrics.tileSize;
  const startY = metrics.boardY + (enemy.row + 0.5) * metrics.tileSize;
  const endX = metrics.boardX + (target.col + 0.5) * metrics.tileSize;
  const endY = metrics.boardY + (target.row + 0.5) * metrics.tileSize;

  ctx.save();
  ctx.setLineDash([8, 5]);
  ctx.lineDashOffset = -timeSeconds * 35;
  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#f43f5e';
  ctx.shadowBlur = 9;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  const radius = metrics.tileSize * 0.42;
  ctx.beginPath();
  ctx.arc(endX, endY, radius, 0, Math.PI * 2);
  ctx.stroke();

  const crossOffset = radius + 4;
  ctx.beginPath();
  ctx.moveTo(endX - crossOffset, endY);
  ctx.lineTo(endX - radius + 2, endY);
  ctx.moveTo(endX + crossOffset, endY);
  ctx.lineTo(endX + radius - 2, endY);
  ctx.moveTo(endX, endY - crossOffset);
  ctx.lineTo(endX, endY - radius + 2);
  ctx.moveTo(endX, endY + crossOffset);
  ctx.lineTo(endX, endY + radius - 2);
  ctx.stroke();

  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const tagWidth = 152;
  const tagHeight = 22;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 1;
  traceRoundedRect(
    ctx,
    midX - tagWidth / 2,
    midY - tagHeight / 2,
    tagWidth,
    tagHeight,
    5,
  );
  ctx.fill();
  ctx.stroke();

  ctx.font = '700 10px monospace';
  ctx.fillStyle = '#fef08a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`READ: TARGETS ${target.name.toUpperCase()}`, midX, midY + 1);

  ctx.restore();
}

function drawUnitAndTerrainTooltip(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  hoveredTile: GridCoord,
  hoveredUnit: Unit | undefined,
  metrics: BoardMetrics,
): void {
  const tile = snapshot.board[hoveredTile.row]?.[hoveredTile.col];
  if (!tile) {
    return;
  }
  const terrainMeta = TERRAIN_CONFIG[tile.terrain];
  const isPlayerUnit = hoveredUnit?.faction === 'player';
  const cardWidth = Math.min(262, metrics.canvasWidth - 16);
  const cardHeight = hoveredUnit ? (isPlayerUnit ? 160 : 138) : 54;
  const {x, y} = computeTooltipPosition(hoveredTile, cardWidth, cardHeight, metrics);

  ctx.save();
  ctx.shadowColor = 'rgba(2, 6, 23, 0.72)';
  ctx.shadowBlur = 16;
  traceRoundedRect(ctx, x, y, cardWidth, cardHeight, 9);
  ctx.fillStyle = PALETTE.panelSurface;
  ctx.fill();
  ctx.restore();

  ctx.save();
  traceRoundedRect(ctx, x, y, cardWidth, cardHeight, 9);
  ctx.strokeStyle = PALETTE.panelBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  if (hoveredUnit) {
    const archetype = UNIT_ARCHETYPES[hoveredUnit.unitClass];
    const hasAura = hasAdjacentSovereignAura(
      hoveredUnit,
      hoveredUnit,
      snapshot.units,
    );

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = isPlayerUnit ? PALETTE.playerPrimary : PALETTE.enemyPrimary;
    ctx.fillText(hoveredUnit.name, x + 12, y + 10);

    ctx.textAlign = 'right';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillStyle = PALETTE.auraColor;
    ctx.fillText(
      `LV ${hoveredUnit.level} · ${archetype.label}`,
      x + cardWidth - 12,
      y + 12,
    );

    ctx.textAlign = 'left';
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillStyle = PALETTE.textPrimary;
    const gear = computeUnitEquipmentBonuses(hoveredUnit);
    const effectiveMaxRange = hoveredUnit.maxRange + gear.rangeBonus;
    const effectiveMove = hoveredUnit.move + gear.moveBonus;
    const effectiveAttack =
      hoveredUnit.attack + gear.attackBonus + (hoveredUnit.tempAttackBonus ?? 0);
    const effectiveDefense = hoveredUnit.defense + gear.defenseBonus;
    const effectiveHeal = hoveredUnit.healPower + gear.healBonus;
    const effectiveCrit = Math.min(
      95,
      (hoveredUnit.critChance ?? 5) + gear.critBonus,
    );
    const rangeLabel =
      hoveredUnit.minRange === effectiveMaxRange
        ? `${effectiveMaxRange}`
        : `${hoveredUnit.minRange}-${effectiveMaxRange}`;
    const auraSuffix = hasAura
      ? `+${isPlayerUnit ? snapshot.effects.sovereignAuraAttack : 1}`
      : '';
    const statLine = hoveredUnit.canHeal
      ? `HP ${hoveredUnit.hp}/${hoveredUnit.maxHp} · HEAL ${effectiveHeal} · DEF ${effectiveDefense}`
      : `HP ${hoveredUnit.hp}/${hoveredUnit.maxHp} · ATK ${effectiveAttack}${auraSuffix} · DEF ${effectiveDefense}`;
    ctx.fillText(statLine, x + 12, y + 32, cardWidth - 24);
    ctx.fillStyle = PALETTE.textSecondary;
    const mobilityLine = `MOV ${effectiveMove} · RNG ${rangeLabel} · CRIT ${effectiveCrit}%${hoveredUnit.canFly ? ' · Flyer' : ''}`;
    ctx.fillText(mobilityLine, x + 12, y + 50, cardWidth - 24);

    ctx.font = '400 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(archetype.traitSummary, x + 12, y + 69, cardWidth - 24);

    let dividerY = y + 90;
    if (isPlayerUnit) {
      const xpRatio = Math.max(
        0,
        Math.min(1, hoveredUnit.xp / hoveredUnit.xpToNextLevel),
      );
      ctx.font = '500 10px "JetBrains Mono", monospace';
      ctx.fillStyle = PALETTE.xpColor;
      ctx.fillText(
        `XP ${hoveredUnit.xp}/${hoveredUnit.xpToNextLevel}`,
        x + 12,
        y + 89,
      );

      const barX = x + 98;
      const barY = y + 92;
      const barW = cardWidth - 110;
      const barH = 6;
      traceRoundedRect(ctx, barX, barY, barW, barH, 3);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      if (xpRatio > 0) {
        traceRoundedRect(ctx, barX, barY, Math.max(4, barW * xpRatio), barH, 3);
        ctx.fillStyle = PALETTE.xpColor;
        ctx.fill();
      }
      dividerY = y + 111;
    }

    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(x + 12, dividerY);
    ctx.lineTo(x + cardWidth - 12, dividerY);
    ctx.stroke();

    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillStyle = PALETTE.textMuted;
    ctx.fillText(
      `${terrainMeta.label}: ${terrainMeta.summary}`,
      x + 12,
      dividerY + 8,
      cardWidth - 24,
    );

    const isSelectedUnit = snapshot.selectedUnitId === hoveredUnit.id;
    const interactionHint = isPlayerUnit
      ? isSelectedUnit
        ? 'Click again for Info & Gear'
        : 'Click to select · Click again for Info'
      : isSelectedUnit
        ? 'Move & Threat shown · Click again for Info'
        : 'Click to preview Move & Threat Range';
    ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = isSelectedUnit
      ? isPlayerUnit
        ? '#7dd3fc'
        : '#fda4af'
      : isPlayerUnit
        ? '#94a3b8'
        : '#fbbf24';
    ctx.fillText(interactionHint, x + 12, dividerY + 25, cardWidth - 24);
  } else {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = PALETTE.textPrimary;
    ctx.fillText(terrainMeta.label, x + 12, y + 10);

    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillStyle = PALETTE.textSecondary;
    ctx.fillText(terrainMeta.summary, x + 12, y + 30, cardWidth - 24);
  }

  ctx.restore();
}

function drawPhaseBanner(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  metrics: BoardMetrics,
): void {
  const banner = snapshot.phaseBanner;
  if (!banner) {
    return;
  }

  const progress = banner.age / banner.duration;
  const fadeIn = Math.min(1, progress / 0.18);
  const fadeOut = progress > 0.75 ? Math.max(0, (1 - progress) / 0.25) : 1;
  const alpha = fadeIn * fadeOut;

  ctx.save();
  ctx.globalAlpha = alpha;
  const height = 76;
  const y = metrics.boardY + metrics.boardHeight / 2 - height / 2;

  const grad = ctx.createLinearGradient(
    metrics.boardX,
    y,
    metrics.boardX + metrics.boardWidth,
    y,
  );
  grad.addColorStop(0, 'rgba(2, 6, 23, 0.25)');
  grad.addColorStop(0.2, 'rgba(2, 6, 23, 0.92)');
  grad.addColorStop(0.8, 'rgba(2, 6, 23, 0.92)');
  grad.addColorStop(1, 'rgba(2, 6, 23, 0.25)');
  ctx.fillStyle = grad;
  ctx.fillRect(metrics.boardX, y, metrics.boardWidth, height);

  ctx.fillStyle = banner.accentColor;
  ctx.fillRect(metrics.boardX, y, metrics.boardWidth, 2);
  ctx.fillRect(metrics.boardX, y + height - 2, metrics.boardWidth, 2);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = PALETTE.textPrimary;
  ctx.fillText(banner.title, metrics.boardX + metrics.boardWidth / 2, y + 29);

  ctx.font = '500 12px "JetBrains Mono", monospace';
  ctx.fillStyle = banner.accentColor;
  ctx.fillText(banner.subtitle, metrics.boardX + metrics.boardWidth / 2, y + 53);
  ctx.restore();
}

function drawTitleOverlay(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  metrics: BoardMetrics,
  timeSeconds: number,
): HitBoxRect[] {
  drawAtmosphericBackdrop(ctx, metrics, timeSeconds);

  const backdrop = spriteAtlas.getBattleBackdrop('plains');
  if (backdrop) {
    ctx.save();
    ctx.globalAlpha = 0.34;
    const imgRatio = backdrop.width / Math.max(1, backdrop.height);
    const boxRatio = metrics.canvasWidth / Math.max(1, metrics.canvasHeight);
    let drawW = metrics.canvasWidth;
    let drawH = metrics.canvasHeight;
    let drawX = 0;
    let drawY = 0;
    if (boxRatio > imgRatio) {
      drawH = metrics.canvasWidth / imgRatio;
      drawY = (metrics.canvasHeight - drawH) * 0.55;
    } else {
      drawW = metrics.canvasHeight * imgRatio;
      drawX = (metrics.canvasWidth - drawW) / 2;
    }
    ctx.drawImage(backdrop, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  const gridSize = Math.min(metrics.canvasWidth, metrics.canvasHeight) * 0.86;
  const cell = gridSize / 8;
  const startX = (metrics.canvasWidth - gridSize) / 2;
  const startY = (metrics.canvasHeight - gridSize) / 2;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const wave =
        Math.sin(timeSeconds * 1.1 + col * 0.55 + row * 0.45) * 0.5 + 0.5;
      const isDark = (col + row) % 2 === 1;
      const baseAlpha = isDark ? 0.1 : 0.18;
      ctx.fillStyle = `rgba(30, 41, 59, ${(baseAlpha + wave * 0.1).toFixed(3)})`;
      ctx.fillRect(
        startX + col * cell + 1.5,
        startY + row * cell + 1.5,
        cell - 3,
        cell - 3,
      );
    }
  }

  const scrimGradient = ctx.createRadialGradient(
    metrics.canvasWidth / 2,
    metrics.canvasHeight / 2,
    40,
    metrics.canvasWidth / 2,
    metrics.canvasHeight / 2,
    Math.max(metrics.canvasWidth, metrics.canvasHeight) * 0.68,
  );
  scrimGradient.addColorStop(0, 'rgba(11, 18, 34, 0.72)');
  scrimGradient.addColorStop(1, 'rgba(6, 10, 22, 0.94)');
  ctx.fillStyle = scrimGradient;
  ctx.fillRect(0, 0, metrics.canvasWidth, metrics.canvasHeight);

  const centerX = metrics.canvasWidth / 2;
  const centerY = metrics.canvasHeight / 2;
  const isCompactPortrait = metrics.canvasWidth < 580;
  const isPortraitMode = snapshot.viewportOrientation === 'portrait';

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 11px "JetBrains Mono", monospace';
  ctx.fillStyle = PALETTE.auraColor;
  ctx.fillText(
    'TALES OF XADION × TRENCHESS · SPRING 2004 / SEVENS NIGHT 2007',
    centerX,
    isCompactPortrait ? Math.max(22, centerY - 232) : Math.max(24, centerY - 208),
    metrics.canvasWidth - 24,
  );

  ctx.font = isCompactPortrait
    ? '700 30px "Plus Jakarta Sans", sans-serif'
    : '700 42px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = PALETTE.textPrimary;
  ctx.fillText(
    'TALES OF XADION: IQ TACTICS',
    centerX,
    isCompactPortrait ? Math.max(54, centerY - 196) : Math.max(58, centerY - 168),
    metrics.canvasWidth - 28,
  );

  ctx.font = isCompactPortrait
    ? '400 12px "Plus Jakarta Sans", sans-serif'
    : '400 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = PALETTE.textSecondary;
  ctx.fillText(
    'Sixty-four waystones in the wash. Outsmart the storm. Forge the TrenChess.',
    centerX,
    isCompactPortrait ? Math.max(84, centerY - 162) : Math.max(94, centerY - 128),
    metrics.canvasWidth - 28,
  );

  const classes: Array<{unitClass: UnitClass; label: string; role: string}> = [
    {unitClass: 'sovereign', label: '♔ Equinox King', role: 'Lantern Rally'},
    {unitClass: 'vanguard', label: '♖ Twilight Rook', role: 'Zone Lock'},
    {unitClass: 'striker', label: '♘ Shadow Knight', role: 'Piercing Dash'},
    {unitClass: 'arcanist', label: '♗ Light Seer', role: 'Arcane Pierce'},
    {unitClass: 'ranger', label: '⟁ Thornbow', role: 'True Sight'},
    {unitClass: 'healer', label: '❀ Sacred Mender', role: 'Healing Dew'},
    {unitClass: 'marksman', label: '◎ Deadeye', role: 'Rng 3–5 Crit'},
    {unitClass: 'cleric', label: '✦ Cistern Oracle', role: 'Radiant Mend'},
  ];

  const colSpacing = isCompactPortrait
    ? Math.min(92, (metrics.canvasWidth - 20) / 4)
    : Math.min(168, (metrics.canvasWidth - 64) / 4);
  const gridStartX = centerX - colSpacing * 1.5;
  const topRowY = isCompactPortrait
    ? Math.max(142, centerY - 94)
    : Math.max(146, centerY - 66);
  const rowSpacing = isCompactPortrait ? 90 : 88;
  const spriteHeight = isCompactPortrait ? 46 : 54;
  const spriteMaxWidth = isCompactPortrait ? 54 : 64;
  const shadowOffsetY = isCompactPortrait ? 20 : 22;

  classes.forEach((item, index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const ix = gridStartX + col * colSpacing;
    const iy = topRowY + row * rowSpacing;
    const sprite = spriteAtlas.getUnitSprite(item.unitClass, 'player', false);

    if (sprite) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.58)';
      ctx.beginPath();
      ctx.ellipse(
        ix,
        iy + shadowOffsetY,
        isCompactPortrait ? 16 : 20,
        5,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      const w = Math.min(
        spriteMaxWidth,
        spriteHeight * (sprite.width / Math.max(1, sprite.height)),
      );
      const drawH = w * (sprite.height / Math.max(1, sprite.width));
      const bob = Math.sin(timeSeconds * 2.4 + index * 0.9) * 2.2;
      ctx.drawImage(
        sprite,
        ix - w / 2,
        iy + shadowOffsetY - drawH + bob,
        w,
        drawH,
      );
    } else {
      ctx.beginPath();
      ctx.arc(ix, iy, isCompactPortrait ? 16 : 20, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(12, 74, 110, 0.48)';
      ctx.fill();
      drawUnitClassGlyph(
        ctx,
        item.unitClass,
        ix,
        iy,
        isCompactPortrait ? 11 : 12,
        PALETTE.playerPrimary,
        PALETTE.playerHighlight,
        timeSeconds,
      );
    }

    ctx.font = isCompactPortrait
      ? '600 10.5px "Plus Jakarta Sans", sans-serif'
      : '600 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = PALETTE.textPrimary;
    ctx.fillText(item.label, ix, iy + shadowOffsetY + 14, colSpacing - 6);
    ctx.font = isCompactPortrait
      ? '500 8.5px "JetBrains Mono", monospace'
      : '500 9.5px "JetBrains Mono", monospace';
    ctx.fillStyle = PALETTE.textMuted;
    ctx.fillText(item.role, ix, iy + shadowOffsetY + 27, colSpacing - 6);
  });

  const hitBoxes: HitBoxRect[] = [];
  const modeY = isCompactPortrait
    ? Math.min(metrics.canvasHeight - 118, Math.max(topRowY + rowSpacing + 56, centerY + 88))
    : Math.min(metrics.canvasHeight - 116, Math.max(topRowY + rowSpacing + 58, centerY + 94));
  const modeGap = 10;
  const modeBtnW = Math.min(206, (metrics.canvasWidth - 36) / 2);
  const modeBtnH = 40;
  const modeStartX = centerX - modeBtnW - modeGap / 2;

  const modeOptions: Array<{
    id: string;
    mode: 'dynamic' | 'classic64';
    title: string;
    detail: string;
  }> = [
    {
      id: 'mode:dynamic',
      mode: 'dynamic',
      title: `${BOARD_MODE_META.dynamic.glyph} ${BOARD_MODE_META.dynamic.title}`,
      detail: isPortraitMode ? '6×10 → 7×11 → 8×12' : '8×8 → 10×8 → 12×10',
    },
    {
      id: 'mode:classic64',
      mode: 'classic64',
      title: `${BOARD_MODE_META.classic64.glyph} ${BOARD_MODE_META.classic64.title}`,
      detail: 'Strict 8×8 Waystones',
    },
  ];

  modeOptions.forEach((opt, index) => {
    const bx = modeStartX + index * (modeBtnW + modeGap);
    const isActive = snapshot.boardMode === opt.mode;
    const isHovered = snapshot.hoveredCanvasButtonId === opt.id;

    traceRoundedRect(ctx, bx, modeY, modeBtnW, modeBtnH, 8);
    ctx.fillStyle = isActive
      ? 'rgba(14, 165, 233, 0.22)'
      : isHovered
        ? 'rgba(30, 41, 59, 0.88)'
        : 'rgba(15, 23, 42, 0.78)';
    ctx.fill();
    ctx.strokeStyle = isActive
      ? PALETTE.playerPrimary
      : isHovered
        ? '#64748b'
        : '#334155';
    ctx.lineWidth = isActive ? 1.6 : 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = isCompactPortrait
      ? '600 11px "Plus Jakarta Sans", sans-serif'
      : '600 12px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = isActive ? PALETTE.playerHighlight : PALETTE.textSecondary;
    ctx.fillText(opt.title, bx + modeBtnW / 2, modeY + 14, modeBtnW - 10);

    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillStyle = isActive ? PALETTE.playerPrimary : PALETTE.textMuted;
    ctx.fillText(opt.detail, bx + modeBtnW / 2, modeY + 29, modeBtnW - 10);

    hitBoxes.push({
      id: opt.id,
      x: bx,
      y: modeY,
      width: modeBtnW,
      height: modeBtnH,
    });
  });

  const actionY = modeY + modeBtnH + 14;
  const buttonGap = 10;
  const buttonWidth = snapshot.hasSavedCampaign
    ? Math.min(186, (metrics.canvasWidth - 36) / 2)
    : Math.min(220, metrics.canvasWidth - 48);
  const buttonHeight = 46;
  const startButtonX = snapshot.hasSavedCampaign
    ? centerX - buttonWidth - buttonGap / 2
    : centerX - buttonWidth / 2;

  const isNewHovered = snapshot.hoveredCanvasButtonId === 'new-game';
  ctx.save();
  ctx.shadowColor = 'rgba(56, 189, 248, 0.35)';
  ctx.shadowBlur = isNewHovered ? 22 : 12;
  traceRoundedRect(ctx, startButtonX, actionY, buttonWidth, buttonHeight, 9);
  ctx.fillStyle = isNewHovered ? '#7dd3fc' : PALETTE.playerPrimary;
  ctx.fill();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = isCompactPortrait
    ? '700 14px "Plus Jakarta Sans", sans-serif'
    : '700 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#082f49';
  ctx.fillText(
    'Start New Game',
    startButtonX + buttonWidth / 2,
    actionY + buttonHeight / 2,
    buttonWidth - 12,
  );

  hitBoxes.push({
    id: 'new-game',
    x: startButtonX,
    y: actionY,
    width: buttonWidth,
    height: buttonHeight,
  });

  if (snapshot.hasSavedCampaign) {
    const continueX = startButtonX + buttonWidth + buttonGap;
    const isContHovered = snapshot.hoveredCanvasButtonId === 'continue-game';
    traceRoundedRect(ctx, continueX, actionY, buttonWidth, buttonHeight, 9);
    ctx.fillStyle = isContHovered
      ? 'rgba(30, 41, 59, 0.96)'
      : 'rgba(15, 23, 42, 0.9)';
    ctx.fill();
    ctx.strokeStyle = isContHovered ? PALETTE.auraColor : '#475569';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.font = isCompactPortrait
      ? '600 13px "Plus Jakarta Sans", sans-serif'
      : '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = isContHovered ? '#fef08a' : PALETTE.textPrimary;
    ctx.fillText(
      'Continue',
      continueX + buttonWidth / 2,
      actionY + buttonHeight / 2,
      buttonWidth - 12,
    );

    hitBoxes.push({
      id: 'continue-game',
      x: continueX,
      y: actionY,
      width: buttonWidth,
      height: buttonHeight,
    });
  }

  return hitBoxes;
}

function drawUpgradeOverlay(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  metrics: BoardMetrics,
): HitBoxRect[] {
  ctx.fillStyle = 'rgba(8, 13, 26, 0.92)';
  ctx.fillRect(0, 0, metrics.canvasWidth, metrics.canvasHeight);

  const centerX = metrics.canvasWidth / 2;
  const topY = Math.max(46, metrics.canvasHeight * 0.14);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 12px "JetBrains Mono", monospace';
  ctx.fillStyle = PALETTE.healColor;
  ctx.fillText(`STAGE ${snapshot.stageNumber} CLEARED`, centerX, topY);

  ctx.font = '700 28px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = PALETTE.textPrimary;
  ctx.fillText('Claim a Brotherhood Boon', centerX, topY + 34);

  const iqTier = getIqRankTier(snapshot.iqState.current);
  ctx.font = '600 12px "JetBrains Mono", monospace';
  ctx.fillStyle = iqTier.accentHex;
  ctx.fillText(
    `IQ REPORT · Final IQ ${snapshot.iqState.current} · Peak IQ ${snapshot.iqState.peak} · ${iqTier.label}`,
    centerX,
    topY + 60,
    metrics.canvasWidth - 40,
  );

  ctx.font = '400 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = PALETTE.textSecondary;
  const bestPlay = snapshot.iqState.history.find((entry) => entry.delta > 0);
  const reportSubline = bestPlay
    ? `Standout Play: +${bestPlay.delta} IQ (${bestPlay.reason}) · ${snapshot.adaptationNote}`
    : snapshot.adaptationNote;
  ctx.fillText(
    reportSubline,
    centerX,
    topY + 80,
    metrics.canvasWidth - 48,
  );

  const hitBoxes: HitBoxRect[] = [];
  const choices = snapshot.upgradeChoices;
  const stacked = metrics.canvasWidth < 680;
  const cardWidth = stacked
    ? Math.min(340, metrics.canvasWidth - 40)
    : Math.min(204, (metrics.canvasWidth - 88) / 3);
  const cardHeight = stacked ? 98 : 196;
  const gap = 16;

  choices.forEach((choice, index) => {
    const id = `upgrade:${choice.id}`;
    const isHovered = snapshot.hoveredCanvasButtonId === id;
    const x = stacked
      ? centerX - cardWidth / 2
      : centerX - (cardWidth * 3 + gap * 2) / 2 + index * (cardWidth + gap);
    const y = stacked ? topY + 96 + index * (cardHeight + 12) : topY + 104;

    traceRoundedRect(ctx, x, y, cardWidth, cardHeight, 10);
    ctx.fillStyle = isHovered ? '#1e293b' : '#131d33';
    ctx.fill();
    ctx.strokeStyle = isHovered ? PALETTE.playerPrimary : '#334155';
    ctx.lineWidth = isHovered ? 2 : 1;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillStyle = PALETTE.playerPrimary;
    ctx.fillText(`${index + 1} · ${choice.tag}`, x + 16, y + 16);

    ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = PALETTE.textPrimary;
    ctx.fillText(choice.title, x + 16, y + 38, cardWidth - 32);

    ctx.font = '400 13px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = PALETTE.textSecondary;
    drawWrappedText(
      ctx,
      choice.summary,
      x + 16,
      y + (stacked ? 62 : 70),
      cardWidth - 32,
      19,
    );

    if (!stacked) {
      ctx.font = '600 12px "JetBrains Mono", monospace';
      ctx.fillStyle = isHovered ? PALETTE.playerHighlight : PALETTE.textMuted;
      ctx.fillText('Click to Draft →', x + 16, y + cardHeight - 30);
    }

    hitBoxes.push({id, x, y, width: cardWidth, height: cardHeight});
  });

  return hitBoxes;
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const candidate = line.length > 0 ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line.length > 0) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = candidate;
    }
  }
  if (line.length > 0) {
    ctx.fillText(line, x, currentY);
  }
}

function drawEndScreenOverlay(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  metrics: BoardMetrics,
): HitBoxRect[] {
  ctx.fillStyle = 'rgba(8, 13, 26, 0.9)';
  ctx.fillRect(0, 0, metrics.canvasWidth, metrics.canvasHeight);

  const centerX = metrics.canvasWidth / 2;
  const centerY = metrics.canvasHeight / 2;
  const isVictory = snapshot.screen === 'victory';

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 36px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = isVictory ? PALETTE.playerPrimary : PALETTE.enemyPrimary;
  ctx.fillText(
    isVictory ? 'Age Reborn' : 'Brotherhood Pact Broken',
    centerX,
    centerY - 76,
    metrics.canvasWidth - 36,
  );

  ctx.font = '400 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = PALETTE.textSecondary;
  ctx.fillText(
    isVictory
      ? 'The Champions held Xadion from the Hall of the Gods to the Crown of the Thunderhead.'
      : `The Black Knight must survive the crossing · Stage ${snapshot.stageNumber} · Turn ${snapshot.turnNumber}`,
    centerX,
    centerY - 34,
    metrics.canvasWidth - 48,
  );

  const endIqTier = getIqRankTier(snapshot.iqState.current);
  ctx.font = '600 13px "JetBrains Mono", monospace';
  ctx.fillStyle = endIqTier.accentHex;
  ctx.fillText(
    `Final IQ ${snapshot.iqState.current}  ·  Peak IQ ${snapshot.iqState.peak}  ·  ${endIqTier.label}`,
    centerX,
    centerY - 4,
    metrics.canvasWidth - 48,
  );

  ctx.font = '500 12px "JetBrains Mono", monospace';
  ctx.fillStyle = PALETTE.textPrimary;
  ctx.fillText(
    `Stages Cleared: ${snapshot.stats.stagesCleared}  ·  Foes Defeated: ${snapshot.stats.enemiesDefeated}  ·  Turns: ${snapshot.stats.turnsElapsed}`,
    centerX,
    centerY + 22,
    metrics.canvasWidth - 48,
  );

  const buttonWidth = 176;
  const buttonHeight = 46;
  const gap = 14;
  const replayX = centerX - buttonWidth - gap / 2;
  const titleX = centerX + gap / 2;
  const buttonY = centerY + 52;
  const isReplayHovered = snapshot.hoveredCanvasButtonId === 'restart';
  const isTitleHovered = snapshot.hoveredCanvasButtonId === 'return-title';

  traceRoundedRect(ctx, replayX, buttonY, buttonWidth, buttonHeight, 8);
  ctx.fillStyle = isReplayHovered ? '#7dd3fc' : PALETTE.playerPrimary;
  ctx.fill();

  ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#082f49';
  ctx.fillText(
    'Retry Chapter',
    replayX + buttonWidth / 2,
    buttonY + buttonHeight / 2,
  );

  traceRoundedRect(ctx, titleX, buttonY, buttonWidth, buttonHeight, 8);
  ctx.fillStyle = isTitleHovered ? '#1e293b' : '#0f172a';
  ctx.fill();
  ctx.strokeStyle = isTitleHovered ? PALETTE.playerPrimary : '#475569';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = PALETTE.textPrimary;
  ctx.fillText(
    'World Map',
    titleX + buttonWidth / 2,
    buttonY + buttonHeight / 2,
  );

  return [
    {
      id: 'restart',
      x: replayX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
    },
    {
      id: 'return-title',
      x: titleX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
    },
  ];
}

export function renderTacticsCanvas(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  metrics: BoardMetrics,
  timeSeconds: number,
): HitBoxRect[] {
  ctx.clearRect(0, 0, metrics.canvasWidth, metrics.canvasHeight);

  if (snapshot.screen === 'title') {
    return drawTitleOverlay(ctx, snapshot, metrics, timeSeconds);
  }

  drawAtmosphericBackdrop(ctx, metrics, timeSeconds);

  const shakeX =
    snapshot.shakeMagnitude > 0.2
      ? (Math.random() - 0.5) * 2 * snapshot.shakeMagnitude
      : 0;
  const shakeY =
    snapshot.shakeMagnitude > 0.2
      ? (Math.random() - 0.5) * 2 * snapshot.shakeMagnitude
      : 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawBoardFrame(ctx, metrics);

  for (let row = 0; row < metrics.rows; row++) {
    for (let col = 0; col < metrics.cols; col++) {
      const tile = snapshot.board[row]?.[col];
      if (!tile) {
        continue;
      }
      const tileX = metrics.boardX + col * metrics.tileSize;
      const tileY = metrics.boardY + row * metrics.tileSize;
      drawTerrainTile(
        ctx,
        tile.terrain,
        tileX,
        tileY,
        metrics.tileSize,
        col,
        row,
        timeSeconds,
      );

      ctx.strokeStyle = PALETTE.gridBorder;
      ctx.lineWidth = 1;
      ctx.strokeRect(
        tileX + 0.5,
        tileY + 0.5,
        metrics.tileSize - 1,
        metrics.tileSize - 1,
      );
    }
  }

  drawBoardCoordinates(ctx, metrics);

  const selectedUnit = snapshot.units.find(
    (unit) => unit.id === snapshot.selectedUnitId && unit.hp > 0,
  );

  if (
    snapshot.screen === 'playing' &&
    snapshot.deploymentPhase === 'CHI_SWAP' &&
    !snapshot.dialogueScene
  ) {
    const pulse = 0.55 + Math.sin(timeSeconds * 4) * 0.25;
    ctx.save();
    for (const spawn of snapshot.deploymentSpawns) {
      const sx = metrics.boardX + spawn.col * metrics.tileSize;
      const sy = metrics.boardY + spawn.row * metrics.tileSize;
      ctx.fillStyle = `rgba(45, 212, 191, ${(0.16 * pulse).toFixed(2)})`;
      ctx.fillRect(sx + 2, sy + 2, metrics.tileSize - 4, metrics.tileSize - 4);
      ctx.strokeStyle = `rgba(245, 158, 11, ${(0.72 * pulse).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 3, sy + 3, metrics.tileSize - 6, metrics.tileSize - 6);
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(45, 212, 191, 0.85)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('χ', sx + 6, sy + 5);
    }
    ctx.restore();
  }

  if (
    selectedUnit &&
    snapshot.phase === 'player' &&
    snapshot.deploymentPhase === 'ACTIVE' &&
    snapshot.screen === 'playing' &&
    !snapshot.dialogueScene
  ) {
    drawMoveHighlights(ctx, snapshot, metrics, selectedUnit, timeSeconds);
    drawActionHighlights(ctx, snapshot, metrics, selectedUnit, timeSeconds);
    drawHoveredPathPreview(ctx, snapshot, metrics, selectedUnit);
  }

  drawEnemyActionTileHighlights(ctx, snapshot, metrics, timeSeconds);

  if (
    snapshot.hoveredTile &&
    snapshot.screen === 'playing' &&
    !snapshot.dialogueScene
  ) {
    const hoverX = metrics.boardX + snapshot.hoveredTile.col * metrics.tileSize;
    const hoverY = metrics.boardY + snapshot.hoveredTile.row * metrics.tileSize;
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.52)';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(
      hoverX + 1.5,
      hoverY + 1.5,
      metrics.tileSize - 3,
      metrics.tileSize - 3,
    );
  }

  drawSovereignAuraLinks(ctx, snapshot.units, metrics, timeSeconds);

  for (const unit of snapshot.units) {
    if (unit.hp <= 0) {
      continue;
    }
    const tileX = metrics.boardX + unit.renderX * metrics.tileSize;
    const tileY = metrics.boardY + unit.renderY * metrics.tileSize;
    const hasAura = hasAdjacentSovereignAura(unit, unit, snapshot.units);
    const isHighlightedEnemyActor =
      snapshot.activeEnemyAction?.actorId === unit.id;
    drawUnitPiece(
      ctx,
      unit,
      tileX,
      tileY,
      metrics.tileSize,
      unit.id === snapshot.selectedUnitId ||
        isHighlightedEnemyActor ||
        unit.id === snapshot.activeUnitId,
      hasAura,
      timeSeconds,
    );
  }

  if (
    snapshot.enemySightline &&
    snapshot.screen === 'playing' &&
    !snapshot.dialogueScene &&
    !snapshot.battleScene
  ) {
    const sight = snapshot.enemySightline;
    const fromX = metrics.boardX + (sight.from.col + 0.5) * metrics.tileSize;
    const fromY = metrics.boardY + (sight.from.row + 0.5) * metrics.tileSize;
    const destX =
      metrics.boardX + (sight.destination.col + 0.5) * metrics.tileSize;
    const destY =
      metrics.boardY + (sight.destination.row + 0.5) * metrics.tileSize;
    ctx.save();
    ctx.setLineDash([7, 5]);
    ctx.lineDashOffset = -timeSeconds * 28;
    ctx.lineWidth = 2.4;
    ctx.strokeStyle =
      sight.actionType === 'attack'
        ? 'rgba(225, 29, 72, 0.92)'
        : 'rgba(45, 212, 191, 0.85)';
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(destX, destY);
    if (sight.target) {
      const targetX =
        metrics.boardX + (sight.target.col + 0.5) * metrics.tileSize;
      const targetY =
        metrics.boardY + (sight.target.row + 0.5) * metrics.tileSize;
      ctx.lineTo(targetX, targetY);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(targetX, targetY, metrics.tileSize * 0.34, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.95)';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      const label = `TACTICAL READ → ${sight.targetName ?? 'TARGET'}`;
      ctx.font = '700 10px "JetBrains Mono", monospace';
      const labelW = Math.min(metrics.boardWidth - 12, ctx.measureText(label).width + 14);
      const labelX = Math.max(
        metrics.boardX + 4,
        Math.min(metrics.boardX + metrics.boardWidth - labelW - 4, targetX - labelW / 2),
      );
      const labelY = Math.max(metrics.boardY + 4, targetY - metrics.tileSize * 0.55 - 14);
      traceRoundedRect(ctx, labelX, labelY, labelW, 18, 5);
      ctx.fillStyle = 'rgba(11, 16, 33, 0.94)';
      ctx.fill();
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = '#2dd4bf';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, labelX + labelW / 2, labelY + 9);
    } else {
      ctx.stroke();
    }
    ctx.restore();
  }

  drawEnemyActionTargetingOverlay(ctx, snapshot, metrics, timeSeconds);
  drawEffectsLayer(ctx, snapshot, metrics);
  ctx.restore();

  drawStageCalloutRibbon(ctx, snapshot, metrics);
  drawPhaseBanner(ctx, snapshot, metrics);

  if (snapshot.battleScene) {
    renderBattleScene(
      ctx,
      snapshot.battleScene,
      metrics.canvasWidth,
      metrics.canvasHeight,
      timeSeconds,
    );
    return [];
  }

  if (snapshot.dialogueScene) {
    return renderDialogueOverlay(
      ctx,
      snapshot.dialogueScene,
      metrics.canvasWidth,
      metrics.canvasHeight,
      snapshot.hoveredCanvasButtonId,
      timeSeconds,
    );
  }

  if (snapshot.screen === 'playing' && snapshot.hoveredTile) {
    const hoveredUnit = getUnitAtCoord(
      snapshot.units,
      snapshot.hoveredTile.col,
      snapshot.hoveredTile.row,
    );

    if (
      hoveredUnit &&
      hoveredUnit.faction === 'enemy' &&
      hasSharpStrategistSightline(snapshot.iqState.current)
    ) {
      const decision = chooseBestEnemyDecision(
        hoveredUnit,
        snapshot.board,
        snapshot.units,
        snapshot.effects,
        snapshot.dominantDoctrine,
        snapshot.iqState.current,
      );
      if (decision.targetId) {
        const targetUnit = snapshot.units.find(
          (candidate) => candidate.id === decision.targetId && candidate.hp > 0,
        );
        if (targetUnit) {
          drawTacticalReadSightline(
            ctx,
            hoveredUnit,
            targetUnit,
            metrics,
            timeSeconds,
          );
        }
      }
    }

    const isHealableHover =
      selectedUnit !== undefined &&
      hoveredUnit !== undefined &&
      snapshot.healableAllyIds.has(hoveredUnit.id);
    const forecast = resolveForecastForHover(snapshot, selectedUnit, hoveredUnit);

    if (isHealableHover && selectedUnit && hoveredUnit) {
      drawHealForecastCard(
        ctx,
        selectedUnit,
        hoveredUnit,
        snapshot.hoveredTile,
        metrics,
      );
    } else if (forecast && selectedUnit && hoveredUnit) {
      drawCombatForecastCard(
        ctx,
        forecast,
        selectedUnit,
        hoveredUnit,
        snapshot.hoveredTile,
        metrics,
      );
    } else {
      drawUnitAndTerrainTooltip(
        ctx,
        snapshot,
        snapshot.hoveredTile,
        hoveredUnit,
        metrics,
      );
    }
  }

  if (snapshot.screen === 'upgrade') {
    return drawUpgradeOverlay(ctx, snapshot, metrics);
  }

  if (snapshot.screen === 'victory' || snapshot.screen === 'defeat') {
    return drawEndScreenOverlay(ctx, snapshot, metrics);
  }

  return [];
}
