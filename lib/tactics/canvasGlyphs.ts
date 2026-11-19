import {PALETTE} from './constants';
import {spriteAtlas} from './spriteAtlas';
import type {TerrainType, Unit, UnitClass} from './types';

export function traceRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function traceOctagon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  const cut = radius * 0.42;
  ctx.beginPath();
  ctx.moveTo(cx - radius + cut, cy - radius);
  ctx.lineTo(cx + radius - cut, cy - radius);
  ctx.lineTo(cx + radius, cy - radius + cut);
  ctx.lineTo(cx + radius, cy + radius - cut);
  ctx.lineTo(cx + radius - cut, cy + radius);
  ctx.lineTo(cx - radius + cut, cy + radius);
  ctx.lineTo(cx - radius, cy + radius - cut);
  ctx.lineTo(cx - radius, cy - radius + cut);
  ctx.closePath();
}

function drawLayeredPine(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  litColor: string,
  shadedColor: string,
  crownColor: string,
): void {
  ctx.fillStyle = 'rgba(2, 6, 23, 0.48)';
  ctx.beginPath();
  ctx.ellipse(
    cx + radius * 0.14,
    cy + radius * 0.78,
    radius * 0.78,
    radius * 0.28,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.fillStyle = '#3b2f2f';
  ctx.fillRect(cx - radius * 0.12, cy + radius * 0.46, radius * 0.24, radius * 0.34);

  ctx.beginPath();
  ctx.moveTo(cx, cy - radius * 0.42);
  ctx.lineTo(cx, cy + radius * 0.62);
  ctx.lineTo(cx - radius * 0.92, cy + radius * 0.62);
  ctx.closePath();
  ctx.fillStyle = litColor;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx, cy - radius * 0.42);
  ctx.lineTo(cx + radius * 0.92, cy + radius * 0.62);
  ctx.lineTo(cx, cy + radius * 0.62);
  ctx.closePath();
  ctx.fillStyle = shadedColor;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx, cy - radius * 1.06);
  ctx.lineTo(cx, cy + radius * 0.12);
  ctx.lineTo(cx - radius * 0.68, cy + radius * 0.12);
  ctx.closePath();
  ctx.fillStyle = crownColor;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx, cy - radius * 1.06);
  ctx.lineTo(cx + radius * 0.68, cy + radius * 0.12);
  ctx.lineTo(cx, cy + radius * 0.12);
  ctx.closePath();
  ctx.fillStyle = litColor;
  ctx.fill();
}

function drawGrassTuft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
): void {
  ctx.strokeStyle = 'rgba(74, 222, 128, 0.26)';
  ctx.lineWidth = Math.max(1, scale * 0.16);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - scale * 0.45, y - scale * 0.72);
  ctx.moveTo(x, y);
  ctx.lineTo(x + scale * 0.05, y - scale * 0.92);
  ctx.moveTo(x, y);
  ctx.lineTo(x + scale * 0.52, y - scale * 0.64);
  ctx.stroke();
}

function drawBrazierFlame(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  flicker: number,
): void {
  const glow = ctx.createRadialGradient(cx, cy, 0.5, cx, cy, size * 2.2);
  glow.addColorStop(0, `rgba(251, 191, 36, ${(0.55 + flicker * 0.25).toFixed(2)})`);
  glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fb923c';
  ctx.beginPath();
  ctx.arc(cx, cy, size * (0.65 + flicker * 0.18), 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(cx, cy - size * 0.15, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

export function drawTerrainTile(
  ctx: CanvasRenderingContext2D,
  terrain: TerrainType,
  x: number,
  y: number,
  size: number,
  col: number,
  row: number,
  timeSeconds: number,
): void {
  const isAlternateSquare = (col + row) % 2 === 1;
  const tileSeed = (col * 37 + row * 53) % 19;

  if (terrain === 'plains') {
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    if (isAlternateSquare) {
      gradient.addColorStop(0, '#18273e');
      gradient.addColorStop(1, '#111d30');
    } else {
      gradient.addColorStop(0, '#1e304c');
      gradient.addColorStop(1, '#15243b');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, size, size);

    ctx.fillStyle = 'rgba(148, 163, 184, 0.09)';
    ctx.fillRect(x + 1, y + 1, size - 2, 1);
    ctx.fillRect(x + 1, y + 1, 1, size - 2);

    ctx.fillStyle = 'rgba(2, 6, 23, 0.22)';
    ctx.fillRect(x + 1, y + size - 2, size - 2, 1);

    if (tileSeed % 3 === 0) {
      drawGrassTuft(
        ctx,
        x + size * (0.22 + (tileSeed % 5) * 0.12),
        y + size * (0.72 + (tileSeed % 3) * 0.06),
        Math.max(4, size * 0.11),
      );
    } else if (tileSeed % 4 === 1) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.09)';
      ctx.lineWidth = 1;
      ctx.strokeRect(
        x + size * 0.16,
        y + size * 0.18,
        size * 0.36,
        size * 0.28,
      );
      ctx.strokeRect(
        x + size * 0.48,
        y + size * 0.52,
        size * 0.34,
        size * 0.26,
      );
    } else {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.beginPath();
      ctx.arc(x + size * 0.32, y + size * 0.64, Math.max(1, size * 0.025), 0, Math.PI * 2);
      ctx.arc(x + size * 0.68, y + size * 0.34, Math.max(1, size * 0.02), 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (terrain === 'forest') {
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, '#133a35');
    gradient.addColorStop(0.55, '#0e2b29');
    gradient.addColorStop(1, '#091d1d');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, size, size);

    ctx.fillStyle = 'rgba(52, 211, 153, 0.09)';
    ctx.beginPath();
    ctx.ellipse(x + size * 0.5, y + size * 0.62, size * 0.4, size * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();

    drawLayeredPine(
      ctx,
      x + size * 0.26,
      y + size * 0.56,
      size * 0.19,
      '#1e6b5c',
      '#11443c',
      '#349c85',
    );
    drawLayeredPine(
      ctx,
      x + size * 0.74,
      y + size * 0.58,
      size * 0.18,
      '#1c6254',
      '#103d36',
      '#2c8c78',
    );
    drawLayeredPine(
      ctx,
      x + size * 0.5,
      y + size * 0.42,
      size * 0.24,
      '#26806c',
      '#165146',
      '#42b89a',
    );

    const motePulse =
      0.38 + Math.sin(timeSeconds * 2.2 + col * 1.9 + row * 2.7) * 0.35;
    const moteX = x + size * (0.3 + ((col * 17 + row * 11) % 38) / 100);
    const moteY =
      y + size * 0.32 + Math.sin(timeSeconds * 1.6 + col + row) * 2.4;
    ctx.fillStyle = `rgba(110, 231, 183, ${motePulse.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(moteX, moteY, Math.max(1.3, size * 0.026), 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  if (terrain === 'fortress') {
    const baseGrad = ctx.createLinearGradient(x, y, x, y + size);
    baseGrad.addColorStop(0, '#2c3d59');
    baseGrad.addColorStop(1, '#162033');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(x, y, size, size);

    const inset = size * 0.1;
    const slabSize = size - inset * 2;
    const lipHeight = Math.max(3, size * 0.075);

    ctx.fillStyle = '#090f1d';
    ctx.fillRect(x + inset, y + inset + lipHeight, slabSize, slabSize - lipHeight * 0.2);

    const slabGrad = ctx.createLinearGradient(
      x + inset,
      y + inset,
      x + inset + slabSize,
      y + inset + slabSize,
    );
    slabGrad.addColorStop(0, '#3b4c68');
    slabGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = slabGrad;
    ctx.fillRect(x + inset, y + inset, slabSize, slabSize - lipHeight * 0.35);

    ctx.strokeStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.lineWidth = 1;
    const midY = y + inset + (slabSize - lipHeight * 0.35) * 0.5;
    ctx.beginPath();
    ctx.moveTo(x + inset + 2, midY);
    ctx.lineTo(x + inset + slabSize - 2, midY);
    ctx.moveTo(x + size * 0.5, y + inset + 2);
    ctx.lineTo(x + size * 0.5, midY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(203, 213, 225, 0.36)';
    ctx.lineWidth = 1.25;
    ctx.strokeRect(
      x + inset + 0.5,
      y + inset + 0.5,
      slabSize - 1,
      slabSize - lipHeight * 0.35 - 1,
    );

    const turret = size * 0.13;
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(x + inset - 1, y + inset - 1, turret, turret);
    ctx.fillRect(
      x + size - inset - turret + 1,
      y + inset - 1,
      turret,
      turret,
    );
    ctx.fillRect(
      x + inset - 1,
      y + size - inset - turret - 1,
      turret,
      turret,
    );
    ctx.fillRect(
      x + size - inset - turret + 1,
      y + size - inset - turret - 1,
      turret,
      turret,
    );

    const flicker = 0.5 + Math.sin(timeSeconds * 8.4 + col * 2.1 + row) * 0.5;
    drawBrazierFlame(
      ctx,
      x + inset + turret * 0.5,
      y + inset + turret * 0.5,
      Math.max(2, size * 0.045),
      flicker,
    );
    drawBrazierFlame(
      ctx,
      x + size - inset - turret * 0.5,
      y + inset + turret * 0.5,
      Math.max(2, size * 0.045),
      1 - flicker,
    );

    const pulse = 0.45 + Math.sin(timeSeconds * 2.8 + col + row) * 0.22;
    const cx = x + size * 0.5;
    const cy = y + size * 0.52;
    const glow = ctx.createRadialGradient(cx, cy, 1, cx, cy, size * 0.24);
    glow.addColorStop(0, `rgba(251, 191, 36, ${pulse.toFixed(2)})`);
    glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.24, 0, Math.PI * 2);
    ctx.fill();

    const arm = size * 0.12;
    const thick = Math.max(2, size * 0.042);
    ctx.fillStyle = `rgba(254, 240, 138, ${(pulse + 0.25).toFixed(2)})`;
    ctx.fillRect(cx - arm, cy - thick / 2, arm * 2, thick);
    ctx.fillRect(cx - thick / 2, cy - arm, thick, arm * 2);
    return;
  }

  const chasmGrad = ctx.createLinearGradient(x, y, x, y + size);
  chasmGrad.addColorStop(0, '#030814');
  chasmGrad.addColorStop(0.45, '#071429');
  chasmGrad.addColorStop(1, '#0b1e3b');
  ctx.fillStyle = chasmGrad;
  ctx.fillRect(x, y, size, size);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 1, y + 1, size - 2, size - 2);
  ctx.clip();

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x + size, y + size * 0.14);
  ctx.lineTo(x + size * 0.72, y + size * 0.19);
  ctx.lineTo(x + size * 0.45, y + size * 0.12);
  ctx.lineTo(x + size * 0.18, y + size * 0.18);
  ctx.lineTo(x, y + size * 0.13);
  ctx.closePath();
  ctx.fill();

  const waveShift = (timeSeconds * 12 + col * 7 + row * 5) % (size * 0.5);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
  ctx.lineWidth = Math.max(1.2, size * 0.026);

  for (let band = 0; band < 3; band++) {
    const baseY = y + size * 0.28 + band * size * 0.28 + waveShift * 0.42;
    ctx.beginPath();
    ctx.moveTo(x - 2, baseY);
    ctx.quadraticCurveTo(
      x + size * 0.25,
      baseY - size * 0.06,
      x + size * 0.5,
      baseY,
    );
    ctx.quadraticCurveTo(
      x + size * 0.75,
      baseY + size * 0.06,
      x + size + 2,
      baseY,
    );
    ctx.stroke();
  }

  const glintAlpha = 0.2 + Math.sin(timeSeconds * 3.1 + col * 2 + row) * 0.16;
  ctx.fillStyle = `rgba(125, 211, 252, ${glintAlpha.toFixed(2)})`;
  ctx.fillRect(x + size * 0.34, y + size * 0.55, size * 0.2, 1.5);

  ctx.strokeStyle = 'rgba(2, 6, 23, 0.92)';
  ctx.lineWidth = Math.max(2, size * 0.045);
  ctx.strokeRect(x + 1.5, y + 1.5, size - 3, size - 3);
  ctx.restore();
}

export function drawUnitClassGlyph(
  ctx: CanvasRenderingContext2D,
  unitClass: UnitClass,
  cx: number,
  cy: number,
  radius: number,
  fillColor: string,
  highlightColor: string,
  timeSeconds = 0,
): void {
  ctx.save();
  ctx.translate(cx, cy);

  if (unitClass === 'vanguard') {
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.98);
    ctx.lineTo(radius * 0.86, -radius * 0.56);
    ctx.lineTo(radius * 0.74, radius * 0.26);
    ctx.lineTo(0, radius * 0.98);
    ctx.lineTo(-radius * 0.74, radius * 0.26);
    ctx.lineTo(-radius * 0.86, -radius * 0.56);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = Math.max(1.5, radius * 0.13);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (unitClass === 'striker') {
    ctx.beginPath();
    ctx.moveTo(radius * 0.94, -radius * 0.94);
    ctx.lineTo(radius * 0.18, radius * 0.36);
    ctx.lineTo(-radius * 0.68, radius * 0.88);
    ctx.lineTo(-radius * 0.88, radius * 0.68);
    ctx.lineTo(-radius * 0.36, -radius * 0.18);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = Math.max(1.4, radius * 0.12);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (unitClass === 'arcanist') {
    ctx.save();
    ctx.rotate(timeSeconds * 0.65);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = Math.max(1, radius * 0.08);
    ctx.strokeRect(-radius * 0.56, -radius * 0.56, radius * 1.12, radius * 1.12);
    ctx.restore();

    const outer = radius * 1.02;
    const inner = radius * 0.32;
    ctx.beginPath();
    for (let index = 0; index < 8; index++) {
      const angle = (index * Math.PI) / 4 - Math.PI / 2;
      const distance = index % 2 === 0 ? outer : inner;
      const px = Math.cos(angle) * distance;
      const py = Math.sin(angle) * distance;
      if (index === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = Math.max(1.4, radius * 0.11);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (unitClass === 'cleric') {
    const arm = radius * 0.88;
    const bar = radius * 0.32;
    ctx.fillStyle = fillColor;
    ctx.fillRect(-bar / 2, -arm, bar, arm * 2);
    ctx.fillRect(-arm, -bar / 2, arm * 2, bar);
    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = Math.max(1.3, radius * 0.11);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (unitClass === 'ranger') {
    ctx.strokeStyle = fillColor;
    ctx.lineWidth = Math.max(2, radius * 0.18);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-radius * 0.2, 0, radius * 0.85, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();

    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = Math.max(1.4, radius * 0.12);
    ctx.beginPath();
    ctx.moveTo(-radius * 0.72, 0);
    ctx.lineTo(radius * 0.88, 0);
    ctx.moveTo(radius * 0.56, -radius * 0.28);
    ctx.lineTo(radius * 0.88, 0);
    ctx.lineTo(radius * 0.56, radius * 0.28);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (unitClass === 'marksman') {
    ctx.strokeStyle = fillColor;
    ctx.lineWidth = Math.max(1.8, radius * 0.16);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = Math.max(1.4, radius * 0.12);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-radius * 0.98, 0);
    ctx.lineTo(-radius * 0.36, 0);
    ctx.moveTo(radius * 0.36, 0);
    ctx.lineTo(radius * 0.98, 0);
    ctx.moveTo(0, -radius * 0.98);
    ctx.lineTo(0, -radius * 0.36);
    ctx.moveTo(0, radius * 0.36);
    ctx.lineTo(0, radius * 0.98);
    ctx.stroke();

    ctx.fillStyle = PALETTE.critColor;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2.2, radius * 0.2), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (unitClass === 'healer') {
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.moveTo(0, -radius * 0.92);
    ctx.quadraticCurveTo(radius * 0.52, -radius * 0.32, 0, radius * 0.88);
    ctx.quadraticCurveTo(-radius * 0.52, -radius * 0.32, 0, -radius * 0.92);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = highlightColor;
    ctx.lineWidth = Math.max(1.4, radius * 0.12);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-radius * 0.22, radius * 0.15);
    ctx.quadraticCurveTo(-radius * 0.98, -radius * 0.15, -radius * 0.76, -radius * 0.66);
    ctx.moveTo(radius * 0.22, radius * 0.15);
    ctx.quadraticCurveTo(radius * 0.98, -radius * 0.15, radius * 0.76, -radius * 0.66);
    ctx.stroke();

    ctx.fillStyle = highlightColor;
    ctx.beginPath();
    ctx.arc(0, -radius * 0.08, Math.max(2, radius * 0.18), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(-radius * 0.8, radius * 0.68);
  ctx.lineTo(-radius * 0.96, -radius * 0.36);
  ctx.lineTo(-radius * 0.38, radius * 0.06);
  ctx.lineTo(0, -radius * 0.92);
  ctx.lineTo(radius * 0.38, radius * 0.06);
  ctx.lineTo(radius * 0.96, -radius * 0.36);
  ctx.lineTo(radius * 0.8, radius * 0.68);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = highlightColor;
  ctx.lineWidth = Math.max(1.6, radius * 0.12);
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.fillStyle = PALETTE.auraColor;
  ctx.fillRect(-radius * 0.68, radius * 0.42, radius * 1.36, radius * 0.18);
  ctx.restore();
}

export function drawUnitPiece(
  ctx: CanvasRenderingContext2D,
  unit: Unit,
  tileX: number,
  tileY: number,
  tileSize: number,
  isSelected: boolean,
  hasAuraBonus: boolean,
  timeSeconds: number,
): void {
  const isPlayer = unit.faction === 'player';
  const isExhausted = unit.hasActed;
  const isFlashing = unit.hitFlashTimer > 0;
  const isMoving =
    Math.abs(unit.renderX - unit.col) > 0.01 ||
    Math.abs(unit.renderY - unit.row) > 0.01;
  const isLunging =
    Math.abs(unit.lungeOffsetX) > 0.01 || Math.abs(unit.lungeOffsetY) > 0.01;
  const phaseSeed = (unit.col * 1.3 + unit.row * 0.9) * 1.2;

  const strideWave = isMoving ? Math.abs(Math.sin(timeSeconds * 16)) : 0;
  const walkHop = isMoving ? -strideWave * tileSize * 0.14 : 0;
  const idleWave = Math.sin(timeSeconds * (unit.canFly ? 3.8 : 2.6) + phaseSeed);
  const idleBob = isExhausted
    ? 0
    : unit.canFly
      ? idleWave * tileSize * 0.055 - tileSize * 0.04
      : idleWave * tileSize * 0.022;

  const centerX = tileX + tileSize / 2 + unit.lungeOffsetX * tileSize;
  const centerY =
    tileY +
    tileSize / 2 +
    unit.lungeOffsetY * tileSize -
    tileSize * 0.06 +
    idleBob +
    walkHop;

  ctx.save();

  if (unit.unitClass === 'sovereign' && !isExhausted) {
    const auraPulse = 0.22 + Math.sin(timeSeconds * 2.6) * 0.1;
    const auraRadius = tileSize * 0.46;
    const auraGrad = ctx.createRadialGradient(
      centerX,
      centerY,
      tileSize * 0.22,
      centerX,
      centerY,
      auraRadius,
    );
    auraGrad.addColorStop(
      0,
      isPlayer
        ? `rgba(251, 191, 36, ${auraPulse.toFixed(2)})`
        : `rgba(251, 113, 133, ${auraPulse.toFixed(2)})`,
    );
    auraGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, auraRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  const shadowScale = (unit.canFly ? 0.25 : 0.34) * (1 - strideWave * 0.18);
  ctx.fillStyle = 'rgba(2, 6, 23, 0.56)';
  ctx.beginPath();
  ctx.ellipse(
    tileX + tileSize / 2 + unit.lungeOffsetX * tileSize,
    tileY + tileSize * 0.76 + unit.lungeOffsetY * tileSize,
    tileSize * shadowScale,
    tileSize * 0.11,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.globalAlpha = isExhausted ? 0.56 : 1;

  if (isSelected) {
    const selPulse = 0.39 + Math.sin(timeSeconds * 5.2) * 0.025;
    traceOctagon(ctx, centerX, centerY, tileSize * selPulse);
    ctx.strokeStyle = isPlayer ? PALETTE.playerHighlight : '#fb7185';
    ctx.lineWidth = Math.max(2.2, tileSize * 0.048);
    ctx.stroke();
  }

  const tokenRadius = tileSize * 0.33;
  const activePose = isLunging
    ? 'attack'
    : isMoving
      ? Math.floor(timeSeconds * 7) % 2 === 0
        ? 'move'
        : 'idle'
      : isSelected && !isExhausted
        ? Math.floor(timeSeconds * 2.2) % 2 === 0
          ? 'idle'
          : 'move'
        : 'idle';
  const frame = spriteAtlas.getUnitFrame(
    unit.unitClass,
    unit.faction,
    activePose,
    isExhausted,
  );

  if (frame) {
    const sprite = frame.canvas;
    const baseY = tileY + tileSize * 0.72 + unit.lungeOffsetY * tileSize;
    ctx.beginPath();
    ctx.ellipse(
      centerX,
      baseY,
      tileSize * 0.31,
      tileSize * 0.11,
      0,
      0,
      Math.PI * 2,
    );
    const isSupportClass =
      unit.unitClass === 'cleric' || unit.unitClass === 'healer';
    ctx.fillStyle = isExhausted
      ? 'rgba(51, 65, 85, 0.55)'
      : isPlayer
        ? isSupportClass
          ? 'rgba(52, 211, 153, 0.34)'
          : 'rgba(14, 165, 233, 0.35)'
        : 'rgba(244, 63, 94, 0.35)';
    ctx.fill();
    ctx.strokeStyle = isExhausted
      ? '#64748b'
      : isPlayer
        ? isSupportClass
          ? '#6ee7b7'
          : unit.unitClass === 'marksman'
            ? '#bae6fd'
            : '#7dd3fc'
        : unit.unitClass === 'sovereign'
          ? PALETTE.enemyAmber
          : '#fda4af';
    ctx.lineWidth = Math.max(1.2, tileSize * 0.028);
    ctx.stroke();

    const targetHeight = tileSize * 0.78 * frame.relativeHeight;
    const spriteAspect = sprite.width / Math.max(1, sprite.height);
    let spriteH = targetHeight;
    let spriteW = spriteH * spriteAspect;
    const maxTileWidth = tileSize * 1.12;
    if (spriteW > maxTileWidth) {
      spriteW = maxTileWidth;
      spriteH = spriteW / spriteAspect;
    }

    const breathStretch = isExhausted ? 0 : idleWave * 0.028;
    const walkStretch = isMoving ? strideWave * 0.06 : 0;
    const hitSquash = isFlashing ? 0.14 : 0;
    const scaleX = 1 - breathStretch - walkStretch * 0.5 + hitSquash;
    const scaleY = 1 + breathStretch + walkStretch - hitSquash;

    const idleTilt = isExhausted
      ? 0
      : Math.sin(timeSeconds * 2.1 + phaseSeed) * 0.024;
    const strideTilt = isMoving ? Math.sin(timeSeconds * 16) * 0.09 : 0;
    const lungeTilt = isLunging ? (isPlayer ? -0.1 : 0.1) : 0;
    const totalRotation = idleTilt + strideTilt + lungeTilt;

    ctx.save();
    ctx.translate(centerX, baseY + tileSize * 0.04 + idleBob + walkHop);
    ctx.rotate(totalRotation);
    ctx.scale((!isPlayer ? -1 : 1) * scaleX, scaleY);
    if (isFlashing) {
      ctx.filter = 'brightness(2.6)';
    }
    ctx.drawImage(sprite, -spriteW / 2, -spriteH, spriteW, spriteH);
    ctx.filter = 'none';
    ctx.restore();

    const hasAmbientMotes =
      !isExhausted &&
      (unit.unitClass === 'arcanist' ||
        unit.unitClass === 'cleric' ||
        unit.unitClass === 'healer' ||
        unit.unitClass === 'sovereign');
    if (hasAmbientMotes) {
      const moteColor =
        unit.unitClass === 'arcanist'
          ? '#c4b5fd'
          : unit.unitClass === 'healer'
            ? '#5eead4'
            : unit.unitClass === 'cleric'
              ? '#6ee7b7'
              : '#fde68a';
      ctx.save();
      ctx.fillStyle = moteColor;
      for (let moteIndex = 0; moteIndex < 2; moteIndex++) {
        const angle = timeSeconds * 2.4 + phaseSeed + moteIndex * Math.PI;
        const moteX = centerX + Math.cos(angle) * tileSize * 0.34;
        const moteY =
          baseY - spriteH * 0.45 + Math.sin(angle * 1.4) * tileSize * 0.14;
        ctx.globalAlpha = 0.65;
        ctx.beginPath();
        ctx.arc(moteX, moteY, Math.max(1.5, tileSize * 0.032), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  } else {
    traceOctagon(ctx, centerX, centerY, tokenRadius);
    ctx.fillStyle = isExhausted
      ? '#1e293b'
      : isPlayer
        ? '#0c4a6e'
        : '#881337';
    ctx.fill();
    ctx.strokeStyle = isExhausted
      ? '#64748b'
      : isPlayer
        ? '#7dd3fc'
        : '#fda4af';
    ctx.lineWidth = Math.max(1.5, tileSize * 0.032);
    ctx.stroke();

    drawUnitClassGlyph(
      ctx,
      unit.unitClass,
      centerX,
      centerY,
      tileSize * 0.21,
      isPlayer ? '#38bdf8' : '#fb7185',
      '#ffffff',
      timeSeconds,
    );
  }

  if (hasAuraBonus && !isExhausted) {
    const badgeX = tileX + tileSize * 0.82;
    const badgeY = tileY + tileSize * 0.18;
    const r = Math.max(3.5, tileSize * 0.075);
    ctx.beginPath();
    ctx.moveTo(badgeX, badgeY - r);
    ctx.lineTo(badgeX + r, badgeY);
    ctx.lineTo(badgeX, badgeY + r);
    ctx.lineTo(badgeX - r, badgeY);
    ctx.closePath();
    ctx.fillStyle = PALETTE.auraColor;
    ctx.fill();
  }

  if (unit.level > 1) {
    const lvX = tileX + tileSize * 0.18;
    const lvY = tileY + tileSize * 0.18;
    const lvRadius = Math.max(6.5, tileSize * 0.125);
    ctx.beginPath();
    ctx.arc(lvX, lvY, lvRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = PALETTE.auraColor;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.font = `700 ${Math.max(8, Math.floor(tileSize * 0.15))}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(unit.level), lvX, lvY + 0.5);
  }

  ctx.globalAlpha = 1;
  const barWidth = tileSize * 0.74;
  const barHeight = Math.max(4, tileSize * 0.082);
  const barX = tileX + (tileSize - barWidth) / 2;
  const barY = tileY + tileSize - barHeight - tileSize * 0.1;
  const hpRatio = Math.max(0, Math.min(1, unit.hp / unit.maxHp));

  traceRoundedRect(ctx, barX, barY, barWidth, barHeight, 2.5);
  ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.lineWidth = 0.75;
  ctx.stroke();

  if (hpRatio > 0) {
    const fillWidth = Math.max(2.5, (barWidth - 2) * hpRatio);
    traceRoundedRect(
      ctx,
      barX + 1,
      barY + 1,
      fillWidth,
      Math.max(2, barHeight - 2),
      1.8,
    );
    const barColor = isPlayer
      ? hpRatio <= 0.35
        ? '#f59e0b'
        : '#38bdf8'
      : '#fb7185';
    ctx.fillStyle = barColor;
    ctx.fill();
  }

  if (isPlayer) {
    const xpY = barY + barHeight + 1.5;
    const xpHeight = Math.max(1.8, tileSize * 0.03);
    const xpRatio = Math.max(0, Math.min(1, unit.xp / unit.xpToNextLevel));
    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.fillRect(barX, xpY, barWidth, xpHeight);
    if (xpRatio > 0) {
      ctx.fillStyle = PALETTE.xpColor;
      ctx.fillRect(barX, xpY, barWidth * xpRatio, xpHeight);
    }
  }

  ctx.restore();
}
