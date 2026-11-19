import {
  drawChargeAuraSpriteFrame,
  drawImpactVfxSpriteFrame,
  evaluateBattleCombatantTween,
  resolveVfxPaletteForAction,
  type EvaluatedCombatantTween,
} from './battleAnimationEngine';
import {PALETTE, TERRAIN_CONFIG, UNIT_ARCHETYPES} from './constants';
import {drawUnitClassGlyph, traceRoundedRect} from './canvasGlyphs';
import {spriteAtlas} from './spriteAtlas';
import type {
  BattleCombatantState,
  BattleSceneState,
  TerrainType,
} from './types';

function drawTerrainAtmosphereParticles(
  ctx: CanvasRenderingContext2D,
  terrain: TerrainType,
  stageX: number,
  stageY: number,
  stageWidth: number,
  arenaHeight: number,
  timeSeconds: number,
): void {
  ctx.save();
  if (terrain === 'forest') {
    for (let index = 0; index < 14; index++) {
      const x =
        stageX +
        ((((index * 89 + 17) % 100) / 100) * stageWidth +
          Math.sin(timeSeconds * 0.9 + index) * 18);
      const y =
        stageY +
        ((((index * 61 + 23) % 100) / 100) * arenaHeight +
          Math.cos(timeSeconds * 1.1 + index * 1.3) * 12);
      const alpha = 0.28 + Math.sin(timeSeconds * 2.5 + index) * 0.24;
      ctx.fillStyle = `rgba(110, 231, 183, ${Math.max(0.05, alpha).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(x, y, 2.2 + (index % 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (terrain === 'fortress') {
    for (let index = 0; index < 14; index++) {
      const seedX = ((index * 73 + 19) % 100) / 100;
      const x = stageX + seedX * stageWidth + Math.sin(timeSeconds * 2 + index) * 10;
      const y =
        stageY +
        arenaHeight -
        ((timeSeconds * (26 + (index % 4) * 10) + index * 37) % arenaHeight);
      const alpha = 0.3 + Math.sin(timeSeconds * 4 + index) * 0.2;
      ctx.fillStyle = `rgba(251, 191, 36, ${Math.max(0.06, alpha).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.8 + (index % 2) * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (terrain === 'chasm') {
    for (let index = 0; index < 12; index++) {
      const seedY = 0.4 + (((index * 47) % 55) / 100);
      const x =
        stageX +
        ((timeSeconds * (18 + (index % 3) * 8) + index * 97) % (stageWidth + 60)) -
        30;
      const y = stageY + seedY * arenaHeight;
      ctx.fillStyle = 'rgba(125, 211, 252, 0.14)';
      ctx.beginPath();
      ctx.ellipse(x, y, 42, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawBattleCombatant(
  ctx: CanvasRenderingContext2D,
  combatant: BattleCombatantState,
  tween: EvaluatedCombatantTween,
  anchorX: number,
  groundY: number,
  stageWidth: number,
  stageHeight: number,
  timeSeconds: number,
  isHealScene: boolean,
  faceRightOverride = false,
): void {
  const isPlayer = combatant.faction === 'player';
  const shouldMirror = faceRightOverride ? true : !isPlayer;
  const frame = spriteAtlas.getUnitFrame(
    combatant.unitClass,
    combatant.faction,
    tween.pose,
    false,
  );

  const baseSpriteHeight = Math.min(stageHeight * 0.44, stageWidth * 0.28);
  const spriteHeight = frame
    ? baseSpriteHeight * frame.relativeHeight
    : baseSpriteHeight;
  const stanceWave = Math.sin(
    timeSeconds * (combatant.unitClass === 'striker' ? 4.4 : 3.0) +
      (isPlayer ? 0 : 1.7),
  );
  const isTweenElevated = Math.abs(tween.offsetY) > 0.015;
  const idleBob =
    combatant.unitClass === 'striker'
      ? stanceWave * 7 - 14
      : isTweenElevated
        ? stanceWave * 1.5
        : stanceWave * 3;

  const drawX = anchorX + (combatant.offsetX + tween.offsetX) * stageWidth;
  const drawY =
    groundY + (combatant.offsetY + tween.offsetY) * stageHeight + idleBob;
  const alpha = Math.max(0, 1 - combatant.dissolveProgress);

  ctx.save();
  ctx.globalAlpha = alpha;

  const elevationRatio = Math.max(0, Math.min(1, (groundY - drawY) / (stageHeight * 0.35)));
  const shadowScale = 1 - elevationRatio * 0.38;
  const shadowWidth = baseSpriteHeight * 0.36 * shadowScale;
  const shadowHeight = Math.max(8, baseSpriteHeight * 0.085 * shadowScale);
  ctx.fillStyle = `rgba(2, 6, 23, ${(0.62 - elevationRatio * 0.25).toFixed(2)})`;
  ctx.beginPath();
  ctx.ellipse(drawX, groundY + 6, shadowWidth, shadowHeight, 0, 0, Math.PI * 2);
  ctx.fill();

  if (tween.chargeGlow > 0.05) {
    const chargePalette = resolveVfxPaletteForAction(
      combatant.faction,
      isHealScene,
    );
    drawChargeAuraSpriteFrame(
      ctx,
      combatant.unitClass,
      chargePalette,
      tween.chargeProgress,
      tween.chargeGlow,
      drawX,
      drawY - baseSpriteHeight * 0.48,
      baseSpriteHeight * 0.92,
    );
  }

  const breathScale =
    tween.pose === 'attack' || isTweenElevated ? 0 : stanceWave * 0.024;
  const scaleX = tween.scaleX * (1 - breathScale);
  const scaleY = tween.scaleY * (1 + breathScale);
  const totalRotation =
    tween.rotation +
    (tween.pose === 'idle' ? stanceWave * 0.02 : 0);

  const renderSpriteAt = (
    x: number,
    y: number,
    opacity: number,
    tintBoost: boolean,
  ) => {
    ctx.save();
    ctx.globalAlpha = alpha * opacity;
    ctx.translate(x, y);
    ctx.rotate(totalRotation);
    ctx.scale((shouldMirror ? -1 : 1) * scaleX, scaleY);

    if (frame) {
      const sprite = frame.canvas;
      const drawWidth = spriteHeight * (sprite.width / Math.max(1, sprite.height));
      if (combatant.hitFlash > 0) {
        ctx.filter = 'brightness(2.6) contrast(1.2)';
      } else if (tintBoost) {
        ctx.filter = isPlayer
          ? 'brightness(1.4) saturate(1.4)'
          : 'brightness(1.35) saturate(1.4)';
      }
      ctx.drawImage(sprite, -drawWidth / 2, -spriteHeight, drawWidth, spriteHeight);
      ctx.filter = 'none';
    } else {
      const color = isPlayer ? PALETTE.playerPrimary : PALETTE.enemyPrimary;
      drawUnitClassGlyph(
        ctx,
        combatant.unitClass,
        0,
        -spriteHeight * 0.5,
        spriteHeight * 0.3,
        combatant.hitFlash > 0 ? '#ffffff' : color,
        '#ffffff',
        timeSeconds,
      );
    }
    ctx.restore();
  };

  if (tween.afterimageAlpha > 0.06) {
    const trailDir = shouldMirror ? -1 : 1;
    const ghostCount = tween.afterimageAlpha > 0.65 ? 3 : 2;
    for (let index = ghostCount; index >= 1; index--) {
      const spacing = index * 18;
      const ghostOpacity = tween.afterimageAlpha * (0.48 / index);
      renderSpriteAt(
        drawX + trailDir * spacing,
        drawY + index * 3,
        ghostOpacity,
        true,
      );
    }
  }

  renderSpriteAt(drawX, drawY, 1, false);
  ctx.restore();
}

function drawProjectileEffect(
  ctx: CanvasRenderingContext2D,
  scene: BattleSceneState,
  leftX: number,
  rightX: number,
  midY: number,
): void {
  if (!scene.beamDirection || scene.beamProgress <= 0) {
    return;
  }

  const goingLeft = scene.beamDirection === 'rightToLeft';
  const fromX = goingLeft ? rightX - 38 : leftX + 38;
  const toX = goingLeft ? leftX : rightX;
  const progress = Math.min(1, scene.beamProgress);
  const headX = fromX + (toX - fromX) * progress;
  const tailX = fromX + (toX - fromX) * Math.max(0, progress - 0.35);

  ctx.save();

  if (scene.beamStyle === 'arrow') {
    const arcLift = Math.sin(progress * Math.PI) * 34;
    const currentY = midY - arcLift;
    const prevProgress = Math.max(0, progress - 0.08);
    const prevX = fromX + (toX - fromX) * prevProgress;
    const prevY = midY - Math.sin(prevProgress * Math.PI) * 34;
    const angle = Math.atan2(currentY - prevY, headX - prevX);

    ctx.strokeStyle = 'rgba(134, 239, 172, 0.45)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, midY - Math.sin(Math.max(0, progress - 0.35) * Math.PI) * 34);
    ctx.lineTo(headX, currentY);
    ctx.stroke();

    ctx.translate(headX, currentY);
    ctx.rotate(angle);
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = 16;

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-36, 0);
    ctx.lineTo(14, 0);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(8, -7);
    ctx.lineTo(12, 0);
    ctx.lineTo(8, 7);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-34, 0);
    ctx.lineTo(-42, -7);
    ctx.moveTo(-34, 0);
    ctx.lineTo(-42, 7);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (scene.beamStyle === 'sniper') {
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 22;

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(fromX, midY);
    ctx.lineTo(headX, midY);
    ctx.stroke();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(tailX, midY);
    ctx.lineTo(headX, midY);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(tailX, midY);
    ctx.lineTo(headX, midY);
    ctx.stroke();

    const direction = goingLeft ? -1 : 1;
    for (let ring = 0; ring < 2; ring++) {
      const ringX = headX - direction * (16 + ring * 26);
      const ringRadius = 11 + ring * 6;
      ctx.strokeStyle = ring === 0 ? '#fef08a' : '#7dd3fc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(ringX, midY, 4.5, ringRadius, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(headX + direction * 18, midY);
    ctx.lineTo(headX - direction * 8, midY - 6);
    ctx.lineTo(headX - direction * 2, midY);
    ctx.lineTo(headX - direction * 8, midY + 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  if (scene.beamStyle === 'radiant') {
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 24;
    ctx.strokeStyle = scene.beamColor;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, midY);
    ctx.lineTo(headX, midY);
    ctx.stroke();

    ctx.fillStyle = '#fef9c3';
    ctx.beginPath();
    ctx.arc(headX, midY, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(headX, midY, 18 + Math.sin(progress * Math.PI) * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.shadowColor = scene.beamColor;
  ctx.shadowBlur = 24;

  ctx.strokeStyle = scene.beamColor;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(tailX, midY);
  ctx.lineTo(headX, midY);
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(tailX, midY);
  ctx.lineTo(headX, midY);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(headX, midY, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = scene.beamColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(fromX, midY, 22 + Math.sin(progress * Math.PI) * 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawHealHaloEffect(
  ctx: CanvasRenderingContext2D,
  targetX: number,
  groundY: number,
  arenaHeight: number,
  age: number,
): void {
  if (age <= 0 || age >= 0.95) {
    return;
  }
  const progress = age / 0.95;
  const alpha = progress < 0.25 ? progress / 0.25 : (1 - progress) / 0.75;
  const pillarWidth = 112 + Math.sin(progress * Math.PI) * 28;

  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha * 0.72);
  const grad = ctx.createLinearGradient(
    targetX - pillarWidth / 2,
    0,
    targetX + pillarWidth / 2,
    0,
  );
  grad.addColorStop(0, 'rgba(52, 211, 153, 0)');
  grad.addColorStop(0.5, 'rgba(110, 231, 183, 0.85)');
  grad.addColorStop(1, 'rgba(52, 211, 153, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(
    targetX - pillarWidth / 2,
    groundY - arenaHeight * 0.56,
    pillarWidth,
    arenaHeight * 0.58,
  );

  ctx.strokeStyle = '#6ee7b7';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(
    targetX,
    groundY + 4 - progress * 90,
    46 + progress * 24,
    13,
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
  ctx.restore();
}

function drawClassImpactSpriteSheetEffect(
  ctx: CanvasRenderingContext2D,
  scene: BattleSceneState,
  enemyX: number,
  playerX: number,
  midY: number,
  arenaHeight: number,
): void {
  if (!scene.vfxActorClass || !scene.vfxTargetFaction || scene.vfxProgress <= 0) {
    return;
  }

  const targetX = scene.vfxTargetFaction === 'enemy' ? enemyX : playerX;
  const mirrorHorizontal = scene.vfxTargetFaction === 'enemy';
  const vfxSize = Math.min(240, Math.max(150, arenaHeight * 0.58));

  drawImpactVfxSpriteFrame(
    ctx,
    scene.vfxActorClass,
    scene.vfxPalette,
    scene.vfxProgress,
    targetX,
    midY,
    vfxSize,
    mirrorHorizontal,
  );
}

function drawLevelUpPillar(
  ctx: CanvasRenderingContext2D,
  playerX: number,
  groundY: number,
  stageHeight: number,
  age: number,
): void {
  if (age <= 0 || age >= 1.1) {
    return;
  }
  const progress = age / 1.1;
  const alpha = progress < 0.25 ? progress / 0.25 : (1 - progress) / 0.75;
  const pillarWidth = 94 + Math.sin(progress * Math.PI) * 34;

  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha * 0.65);
  const grad = ctx.createLinearGradient(
    playerX - pillarWidth / 2,
    0,
    playerX + pillarWidth / 2,
    0,
  );
  grad.addColorStop(0, 'rgba(251, 191, 36, 0)');
  grad.addColorStop(0.5, 'rgba(254, 240, 138, 0.85)');
  grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(
    playerX - pillarWidth / 2,
    groundY - stageHeight * 0.62,
    pillarWidth,
    stageHeight * 0.65,
  );

  ctx.strokeStyle = PALETTE.auraColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(
    playerX,
    groundY + 4,
    38 + progress * 78,
    12 + progress * 20,
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
  ctx.restore();
}

function drawBattleStatusCard(
  ctx: CanvasRenderingContext2D,
  combatant: BattleCombatantState,
  x: number,
  y: number,
  width: number,
  height: number,
  showXpBar: boolean,
): void {
  const isPlayer = combatant.faction === 'player';
  const accent = isPlayer ? PALETTE.playerPrimary : PALETTE.enemyPrimary;
  const archetype = UNIT_ARCHETYPES[combatant.unitClass];
  const terrainMeta = TERRAIN_CONFIG[combatant.terrain];

  ctx.save();
  traceRoundedRect(ctx, x, y, width, height, 10);
  ctx.fillStyle = 'rgba(11, 18, 34, 0.94)';
  ctx.fill();
  ctx.strokeStyle = isPlayer
    ? 'rgba(56, 189, 248, 0.55)'
    : 'rgba(251, 113, 133, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = PALETTE.textPrimary;
  ctx.fillText(combatant.name, x + 14, y + 12, width - 102);

  ctx.textAlign = 'right';
  ctx.font = '700 11px "JetBrains Mono", monospace';
  ctx.fillStyle = PALETTE.auraColor;
  ctx.fillText(`LV ${combatant.level} · ${archetype.label}`, x + width - 14, y + 14);

  const hpShown = Math.max(0, Math.round(combatant.displayHp));
  const hpRatio = Math.max(0, Math.min(1, combatant.displayHp / combatant.maxHp));

  ctx.textAlign = 'left';
  ctx.font = '600 12px "JetBrains Mono", monospace';
  ctx.fillStyle = accent;
  ctx.fillText(`HP ${hpShown} / ${combatant.maxHp}`, x + 14, y + 36);

  ctx.textAlign = 'right';
  ctx.font = '500 11px "JetBrains Mono", monospace';
  ctx.fillStyle = PALETTE.textMuted;
  ctx.fillText(terrainMeta.label, x + width - 14, y + 36);

  const barX = x + 14;
  const barY = y + 56;
  const barW = width - 28;
  const barH = 10;
  traceRoundedRect(ctx, barX, barY, barW, barH, 4);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.stroke();

  if (hpRatio > 0) {
    traceRoundedRect(
      ctx,
      barX + 1,
      barY + 1,
      Math.max(4, (barW - 2) * hpRatio),
      barH - 2,
      3,
    );
    ctx.fillStyle =
      isPlayer && hpRatio <= 0.35 ? PALETTE.enemyAmber : accent;
    ctx.fill();
  }

  if (showXpBar) {
    const xpRatio = Math.max(
      0,
      Math.min(1, combatant.displayXp / Math.max(1, combatant.xpToNextLevel)),
    );
    ctx.textAlign = 'left';
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillStyle = PALETTE.xpColor;
    ctx.fillText(
      `XP ${Math.round(combatant.displayXp)} / ${combatant.xpToNextLevel}`,
      x + 14,
      y + 73,
    );

    const xpBarX = x + 104;
    const xpBarY = y + 76;
    const xpBarW = width - 118;
    traceRoundedRect(ctx, xpBarX, xpBarY, xpBarW, 6, 3);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    if (xpRatio > 0) {
      traceRoundedRect(
        ctx,
        xpBarX,
        xpBarY,
        Math.max(4, xpBarW * xpRatio),
        6,
        3,
      );
      ctx.fillStyle = PALETTE.xpColor;
      ctx.fill();
    }
  } else {
    ctx.textAlign = 'left';
    ctx.font = '500 10px "JetBrains Mono", monospace';
    ctx.fillStyle = PALETTE.textMuted;
    ctx.fillText(terrainMeta.summary, x + 14, y + 73, width - 28);
  }

  ctx.restore();
}

export function renderBattleScene(
  ctx: CanvasRenderingContext2D,
  scene: BattleSceneState,
  canvasWidth: number,
  canvasHeight: number,
  timeSeconds: number,
): void {
  const isCompactMobile = canvasWidth < 560;
  const stageMarginX = isCompactMobile
    ? 8
    : Math.max(16, Math.floor((canvasWidth - 960) / 2));
  const stageMarginY = isCompactMobile ? 8 : 14;
  const stageWidth = canvasWidth - stageMarginX * 2;
  const stageHeight = canvasHeight - stageMarginY * 2;
  const stageX = stageMarginX;
  const stageY = stageMarginY;

  const hudHeight = isCompactMobile ? 196 : 104;
  const arenaHeight = Math.max(200, stageHeight - hudHeight - 10);
  const groundY = stageY + arenaHeight * 0.84;
  const leftAnchorX = stageX + stageWidth * 0.26;
  const rightAnchorX = stageX + stageWidth * 0.74;
  const combatMidY = groundY - Math.min(stageHeight * 0.18, 95);

  const shakeX =
    scene.shakeMagnitude > 0.2
      ? (Math.random() - 0.5) * 2 * scene.shakeMagnitude
      : 0;
  const shakeY =
    scene.shakeMagnitude > 0.2
      ? (Math.random() - 0.5) * 2 * scene.shakeMagnitude
      : 0;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, scene.transitionAlpha));

  ctx.fillStyle = 'rgba(4, 9, 20, 0.88)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.save();
  ctx.translate(shakeX, shakeY);

  traceRoundedRect(ctx, stageX, stageY, stageWidth, arenaHeight, 12);
  ctx.save();
  ctx.clip();

  const backdrop = spriteAtlas.getBattleBackdrop(scene.battleTerrain);
  if (backdrop) {
    const imgRatio = backdrop.width / Math.max(1, backdrop.height);
    const boxRatio = stageWidth / Math.max(1, arenaHeight);
    let drawW = stageWidth;
    let drawH = arenaHeight;
    let drawX = stageX;
    let drawY = stageY;

    if (boxRatio > imgRatio) {
      drawH = stageWidth / imgRatio;
      drawY = stageY + (arenaHeight - drawH) * 0.65;
    } else {
      drawW = arenaHeight * imgRatio;
      drawX = stageX + (stageWidth - drawW) / 2;
    }
    ctx.drawImage(backdrop, drawX, drawY, drawW, drawH);
  } else {
    const fallbackGrad = ctx.createLinearGradient(
      stageX,
      stageY,
      stageX,
      stageY + arenaHeight,
    );
    fallbackGrad.addColorStop(0, '#0f172a');
    fallbackGrad.addColorStop(0.7, '#1e293b');
    fallbackGrad.addColorStop(1, '#0b1222');
    ctx.fillStyle = fallbackGrad;
    ctx.fillRect(stageX, stageY, stageWidth, arenaHeight);
  }

  drawTerrainAtmosphereParticles(
    ctx,
    scene.battleTerrain,
    stageX,
    stageY,
    stageWidth,
    arenaHeight,
    timeSeconds,
  );

  const floorScrim = ctx.createLinearGradient(
    0,
    stageY + arenaHeight * 0.55,
    0,
    stageY + arenaHeight,
  );
  floorScrim.addColorStop(0, 'rgba(8, 13, 26, 0)');
  floorScrim.addColorStop(1, 'rgba(8, 13, 26, 0.54)');
  ctx.fillStyle = floorScrim;
  ctx.fillRect(stageX, stageY, stageWidth, arenaHeight);

  if (scene.healHaloAge > 0) {
    drawHealHaloEffect(ctx, leftAnchorX, groundY, arenaHeight, scene.healHaloAge);
  }

  if (scene.levelUpPillarAge > 0) {
    drawLevelUpPillar(
      ctx,
      rightAnchorX,
      groundY,
      arenaHeight,
      scene.levelUpPillarAge,
    );
  }

  const enemyTween = evaluateBattleCombatantTween(scene, false, timeSeconds);
  const playerTween = evaluateBattleCombatantTween(scene, true, timeSeconds);

  const playerIsActing =
    scene.isHealScene ||
    (scene.attackerFaction === 'player' &&
      (scene.step === 'primaryDash' || scene.step === 'primaryImpact')) ||
    (scene.attackerFaction === 'enemy' &&
      (scene.step === 'counterDash' || scene.step === 'counterImpact'));

  if (playerIsActing) {
    drawBattleCombatant(
      ctx,
      scene.enemySide,
      enemyTween,
      leftAnchorX,
      groundY,
      stageWidth,
      arenaHeight,
      timeSeconds,
      scene.isHealScene,
      scene.isHealScene,
    );
    drawBattleCombatant(
      ctx,
      scene.playerSide,
      playerTween,
      rightAnchorX,
      groundY,
      stageWidth,
      arenaHeight,
      timeSeconds,
      scene.isHealScene,
      false,
    );
  } else {
    drawBattleCombatant(
      ctx,
      scene.playerSide,
      playerTween,
      rightAnchorX,
      groundY,
      stageWidth,
      arenaHeight,
      timeSeconds,
      scene.isHealScene,
      false,
    );
    drawBattleCombatant(
      ctx,
      scene.enemySide,
      enemyTween,
      leftAnchorX,
      groundY,
      stageWidth,
      arenaHeight,
      timeSeconds,
      scene.isHealScene,
      scene.isHealScene,
    );
  }

  drawProjectileEffect(ctx, scene, leftAnchorX, rightAnchorX, combatMidY);
  drawClassImpactSpriteSheetEffect(
    ctx,
    scene,
    leftAnchorX,
    rightAnchorX,
    combatMidY,
    arenaHeight,
  );

  for (const spark of scene.sparks) {
    const alpha = Math.max(0, 1 - spark.age / spark.duration);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = spark.color;
    ctx.translate(stageX + spark.x * stageWidth, stageY + spark.y * arenaHeight);
    ctx.rotate(spark.age * 9);
    ctx.fillRect(-spark.size / 2, -spark.size / 2, spark.size, spark.size);
    ctx.restore();
  }

  for (const num of scene.floatingNumbers) {
    const progress = Math.min(1, num.age / num.duration);
    const bounce =
      progress < 0.2
        ? Math.sin((progress / 0.2) * Math.PI) * 20
        : progress * 24;
    const alpha = progress < 0.72 ? 1 : (1 - progress) / 0.28;
    const px = stageX + num.xRatio * stageWidth;
    const py = stageY + num.yRatio * arenaHeight - bounce;

    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = num.isHeadline
      ? '700 22px "Plus Jakarta Sans", sans-serif'
      : '700 28px "JetBrains Mono", monospace';
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.94)';
    ctx.strokeText(num.text, px, py);
    ctx.fillStyle = num.color;
    ctx.fillText(num.text, px, py);
    ctx.restore();
  }

  const terrainMeta = TERRAIN_CONFIG[scene.battleTerrain];
  const bannerW = Math.min(stageWidth - 32, 500);
  const bannerH = 48;
  const bannerX = stageX + (stageWidth - bannerW) / 2;
  const bannerY = stageY + 14;
  traceRoundedRect(ctx, bannerX, bannerY, bannerW, bannerH, 8);
  ctx.fillStyle = 'rgba(8, 13, 26, 0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = PALETTE.textPrimary;
  ctx.fillText(scene.headline, stageX + stageWidth / 2, bannerY + 16, bannerW - 24);

  ctx.font = '500 10px "JetBrains Mono", monospace';
  ctx.fillStyle = PALETTE.auraColor;
  ctx.fillText(
    `${terrainMeta.battlefieldTitle} · ${scene.subline}`,
    stageX + stageWidth / 2,
    bannerY + 35,
    bannerW - 24,
  );

  ctx.textAlign = 'right';
  ctx.font = '500 10px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(203, 213, 225, 0.72)';
  ctx.fillText(
    'Click or Space to skip',
    stageX + stageWidth - 14,
    stageY + arenaHeight - 14,
  );

  ctx.restore();

  traceRoundedRect(ctx, stageX, stageY, stageWidth, arenaHeight, 12);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const hudY = stageY + arenaHeight + 10;
  if (isCompactMobile) {
    const cardGap = 8;
    const stackedCardHeight = Math.floor((hudHeight - cardGap) / 2);
    drawBattleStatusCard(
      ctx,
      scene.enemySide,
      stageX,
      hudY,
      stageWidth,
      stackedCardHeight,
      false,
    );
    drawBattleStatusCard(
      ctx,
      scene.playerSide,
      stageX,
      hudY + stackedCardHeight + cardGap,
      stageWidth,
      stackedCardHeight,
      scene.playerSide.faction === 'player',
    );
  } else {
    const gap = 12;
    const cardWidth = Math.floor((stageWidth - gap) / 2);

    drawBattleStatusCard(
      ctx,
      scene.enemySide,
      stageX,
      hudY,
      cardWidth,
      hudHeight,
      false,
    );
    drawBattleStatusCard(
      ctx,
      scene.playerSide,
      stageX + cardWidth + gap,
      hudY,
      cardWidth,
      hudHeight,
      scene.playerSide.faction === 'player',
    );
  }

  ctx.restore();
  ctx.restore();
}
