import {PALETTE, UNIT_ARCHETYPES} from './constants';
import {drawUnitClassGlyph, traceRoundedRect} from './canvasGlyphs';
import {spriteAtlas} from './spriteAtlas';
import type {DialogueSceneState, HitBoxRect} from './types';

function drawWrappedDialogueLines(
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

export function renderDialogueOverlay(
  ctx: CanvasRenderingContext2D,
  scene: DialogueSceneState,
  canvasWidth: number,
  canvasHeight: number,
  hoveredButtonId: string | null,
  timeSeconds: number,
): HitBoxRect[] {
  const activeLine = scene.lines[scene.currentIndex];
  if (!activeLine) {
    return [];
  }

  const isPlayerSpeaker = activeLine.speakerFaction === 'player';
  const accentColor = isPlayerSpeaker
    ? PALETTE.playerPrimary
    : PALETTE.enemyPrimary;
  const revealedText = activeLine.text.slice(0, Math.floor(scene.revealedChars));
  const isLineFullyRevealed = revealedText.length >= activeLine.text.length;

  ctx.save();

  const scrimGrad = ctx.createLinearGradient(0, canvasHeight * 0.45, 0, canvasHeight);
  scrimGrad.addColorStop(0, 'rgba(4, 9, 20, 0.25)');
  scrimGrad.addColorStop(0.55, 'rgba(4, 9, 20, 0.78)');
  scrimGrad.addColorStop(1, 'rgba(4, 9, 20, 0.94)');
  ctx.fillStyle = scrimGrad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const isCompactMobile = canvasWidth < 540;
  const panelWidth = Math.min(780, canvasWidth - (isCompactMobile ? 16 : 28));
  const panelHeight = isCompactMobile
    ? Math.min(182, Math.max(150, canvasHeight * 0.29))
    : Math.min(168, Math.max(138, canvasHeight * 0.27));
  const panelX = Math.floor((canvasWidth - panelWidth) / 2);
  const panelY = canvasHeight - panelHeight - (isCompactMobile ? 10 : 18);

  const portraitSize = isCompactMobile
    ? 76
    : Math.min(126, panelHeight - 24);
  const portraitPad = isCompactMobile ? 10 : 14;
  const portraitX = isPlayerSpeaker
    ? panelX + portraitPad
    : panelX + panelWidth - portraitSize - portraitPad;
  const portraitY = isCompactMobile
    ? panelY + 14
    : panelY + Math.floor((panelHeight - portraitSize) / 2);

  ctx.save();
  ctx.shadowColor = 'rgba(2, 6, 23, 0.85)';
  ctx.shadowBlur = 24;
  traceRoundedRect(ctx, panelX, panelY, panelWidth, panelHeight, 12);
  const panelGrad = ctx.createLinearGradient(
    panelX,
    panelY,
    panelX,
    panelY + panelHeight,
  );
  panelGrad.addColorStop(0, 'rgba(15, 23, 42, 0.97)');
  panelGrad.addColorStop(1, 'rgba(8, 13, 26, 0.98)');
  ctx.fillStyle = panelGrad;
  ctx.fill();
  ctx.restore();

  traceRoundedRect(ctx, panelX, panelY, panelWidth, panelHeight, 12);
  ctx.strokeStyle = isPlayerSpeaker
    ? 'rgba(56, 189, 248, 0.58)'
    : 'rgba(251, 113, 133, 0.58)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  traceRoundedRect(
    ctx,
    portraitX,
    portraitY,
    portraitSize,
    portraitSize,
    10,
  );
  const portraitBg = ctx.createRadialGradient(
    portraitX + portraitSize / 2,
    portraitY + portraitSize * 0.4,
    8,
    portraitX + portraitSize / 2,
    portraitY + portraitSize / 2,
    portraitSize * 0.72,
  );
  portraitBg.addColorStop(
    0,
    isPlayerSpeaker ? 'rgba(14, 165, 233, 0.34)' : 'rgba(244, 63, 94, 0.34)',
  );
  portraitBg.addColorStop(1, '#080e1d');
  ctx.fillStyle = portraitBg;
  ctx.fill();

  ctx.save();
  traceRoundedRect(
    ctx,
    portraitX,
    portraitY,
    portraitSize,
    portraitSize,
    10,
  );
  ctx.clip();

  const sprite = spriteAtlas.getUnitSprite(
    activeLine.speakerClass,
    activeLine.speakerFaction,
    false,
  );
  const breathBob = Math.sin(timeSeconds * 3.1) * 2.2;

  if (sprite) {
    const drawH = portraitSize * 1.18;
    const drawW = drawH * (sprite.width / Math.max(1, sprite.height));
    ctx.save();
    ctx.translate(
      portraitX + portraitSize / 2,
      portraitY + portraitSize * 0.08 + breathBob,
    );
    if (isPlayerSpeaker) {
      ctx.scale(-1, 1);
    }
    ctx.drawImage(sprite, -drawW / 2, 0, drawW, drawH);
    ctx.restore();
  } else {
    drawUnitClassGlyph(
      ctx,
      activeLine.speakerClass,
      portraitX + portraitSize / 2,
      portraitY + portraitSize / 2,
      portraitSize * 0.3,
      accentColor,
      '#ffffff',
      timeSeconds,
    );
  }
  ctx.restore();

  traceRoundedRect(
    ctx,
    portraitX,
    portraitY,
    portraitSize,
    portraitSize,
    10,
  );
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  const textAreaX = isPlayerSpeaker
    ? portraitX + portraitSize + (isCompactMobile ? 12 : 18)
    : panelX + (isCompactMobile ? 12 : 20);
  const textAreaWidth =
    panelWidth - portraitSize - portraitPad * 2 - (isCompactMobile ? 14 : 24);
  const headerY = panelY + (isCompactMobile ? 12 : 16);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = isCompactMobile
    ? '700 14px "Plus Jakarta Sans", sans-serif'
    : '700 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = accentColor;
  ctx.fillText(activeLine.speakerName, textAreaX, headerY, textAreaWidth);

  const archetypeLabel = UNIT_ARCHETYPES[activeLine.speakerClass].label;
  ctx.font = '500 10px "JetBrains Mono", monospace';
  ctx.fillStyle = PALETTE.textMuted;
  ctx.fillText(
    `${activeLine.speakerTitle} · ${archetypeLabel}`,
    textAreaX,
    headerY + (isCompactMobile ? 18 : 21),
    textAreaWidth,
  );

  ctx.font = isCompactMobile
    ? '400 12.5px "Plus Jakarta Sans", sans-serif'
    : '400 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = PALETTE.textPrimary;
  drawWrappedDialogueLines(
    ctx,
    revealedText,
    textAreaX,
    headerY + (isCompactMobile ? 38 : 46),
    textAreaWidth,
    isCompactMobile ? 18 : 22,
  );

  const footerY = panelY + panelHeight - 20;
  ctx.font = '500 10px "JetBrains Mono", monospace';
  ctx.fillStyle = PALETTE.textMuted;
  ctx.textAlign = 'left';
  ctx.fillText(
    `${scene.sceneLabel} · ${scene.currentIndex + 1}/${scene.lines.length}`,
    panelX + portraitPad,
    footerY,
  );

  const pulseOffset = isLineFullyRevealed
    ? Math.sin(timeSeconds * 6.5) * 3
    : 0;
  ctx.textAlign = 'right';
  ctx.fillStyle = isLineFullyRevealed ? PALETTE.auraColor : PALETTE.textSecondary;
  ctx.fillText(
    isLineFullyRevealed ? 'Continue ▼' : 'Tap / Space',
    panelX + panelWidth - portraitPad,
    footerY + pulseOffset * 0.4,
  );

  const skipW = 74;
  const skipH = 24;
  const skipX = isPlayerSpeaker
    ? panelX + panelWidth - skipW - 14
    : panelX + 14;
  const skipY = panelY - skipH - 8;
  const isSkipHovered = hoveredButtonId === 'dialogue:skip';

  traceRoundedRect(ctx, skipX, skipY, skipW, skipH, 6);
  ctx.fillStyle = isSkipHovered
    ? 'rgba(30, 41, 59, 0.96)'
    : 'rgba(15, 23, 42, 0.88)';
  ctx.fill();
  ctx.strokeStyle = isSkipHovered ? PALETTE.playerPrimary : '#334155';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 11px "JetBrains Mono", monospace';
  ctx.fillStyle = isSkipHovered ? PALETTE.textPrimary : PALETTE.textSecondary;
  ctx.fillText('Skip', skipX + skipW / 2, skipY + skipH / 2);

  ctx.restore();

  return [
    {
      id: 'dialogue:skip',
      x: skipX,
      y: skipY,
      width: skipW,
      height: skipH,
    },
    {
      id: 'dialogue:advance',
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
    },
  ];
}
