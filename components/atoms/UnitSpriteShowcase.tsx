'use client';

import {useEffect, useRef, useState} from 'react';
import {drawUnitClassGlyph} from '@/lib/tactics/canvasGlyphs';
import {PALETTE} from '@/lib/tactics/constants';
import {spriteAtlas, type SpriteAnimationPose} from '@/lib/tactics/spriteAtlas';
import type {Faction, TerrainType, UnitClass} from '@/lib/tactics/types';

type ShowcaseMode = 'auto' | SpriteAnimationPose;

interface UnitSpriteShowcaseProps {
  unitClass: UnitClass;
  faction: Faction;
  terrain: TerrainType;
}

const AUTO_SEQUENCE: Array<{pose: SpriteAnimationPose; duration: number}> = [
  {pose: 'idle', duration: 1.25},
  {pose: 'move', duration: 0.85},
  {pose: 'windup', duration: 0.7},
  {pose: 'attack', duration: 1.05},
];

const TOTAL_AUTO_DURATION = AUTO_SEQUENCE.reduce(
  (sum, step) => sum + step.duration,
  0,
);

function resolveAutoPose(elapsedSeconds: number): SpriteAnimationPose {
  const cycleTime = elapsedSeconds % TOTAL_AUTO_DURATION;
  let cursor = 0;
  for (const step of AUTO_SEQUENCE) {
    cursor += step.duration;
    if (cycleTime < cursor) {
      return step.pose;
    }
  }
  return 'idle';
}

function drawCoverBackdrop(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
): void {
  const imageAspect = image.width / Math.max(1, image.height);
  const frameAspect = width / Math.max(1, height);

  let drawWidth = width;
  let drawHeight = height;
  let drawX = 0;
  let drawY = 0;

  if (imageAspect > frameAspect) {
    drawHeight = height;
    drawWidth = height * imageAspect;
    drawX = (width - drawWidth) * 0.5;
  } else {
    drawWidth = width;
    drawHeight = width / imageAspect;
    drawY = (height - drawHeight) * 0.5;
  }

  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

const MODE_OPTIONS: Array<{id: ShowcaseMode; label: string}> = [
  {id: 'auto', label: 'Auto'},
  {id: 'idle', label: 'Idle'},
  {id: 'move', label: 'Stride'},
  {id: 'windup', label: 'Charge'},
  {id: 'attack', label: 'Strike'},
];

export function UnitSpriteShowcase({
  unitClass,
  faction,
  terrain,
}: UnitSpriteShowcaseProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<ShowcaseMode>('auto');

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    let frameId = 0;
    const startTime = performance.now();

    const renderFrame = (now: number) => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(180, Math.floor(rect.width));
      const height = Math.max(180, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const expectedPixelWidth = Math.floor(width * dpr);
      const expectedPixelHeight = Math.floor(height * dpr);
      if (
        canvas.width !== expectedPixelWidth ||
        canvas.height !== expectedPixelHeight
      ) {
        canvas.width = expectedPixelWidth;
        canvas.height = expectedPixelHeight;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const elapsedSeconds = (now - startTime) / 1000;
      const activePose =
        mode === 'auto' ? resolveAutoPose(elapsedSeconds) : mode;
      const isPlayer = faction === 'player';
      const primaryGlow = isPlayer
        ? 'rgba(56, 189, 248, 0.34)'
        : 'rgba(251, 113, 133, 0.34)';
      const rimStroke = isPlayer
        ? 'rgba(56, 189, 248, 0.65)'
        : 'rgba(251, 113, 133, 0.65)';

      const backdrop = spriteAtlas.getBattleBackdrop(terrain);
      if (backdrop) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        drawCoverBackdrop(ctx, backdrop, width, height);
        ctx.restore();
      }

      const shadeGradient = ctx.createLinearGradient(0, 0, 0, height);
      shadeGradient.addColorStop(0, 'rgba(9, 14, 28, 0.45)');
      shadeGradient.addColorStop(0.55, 'rgba(9, 14, 28, 0.25)');
      shadeGradient.addColorStop(1, 'rgba(9, 14, 28, 0.9)');
      ctx.fillStyle = shadeGradient;
      ctx.fillRect(0, 0, width, height);

      const centerX = width * 0.5;
      const groundY = height * 0.78;

      const auraGradient = ctx.createRadialGradient(
        centerX,
        height * 0.48,
        8,
        centerX,
        height * 0.48,
        Math.min(width, height) * 0.54,
      );
      auraGradient.addColorStop(0, primaryGlow);
      auraGradient.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = auraGradient;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.fillStyle = 'rgba(2, 6, 23, 0.58)';
      ctx.beginPath();
      ctx.ellipse(
        centerX,
        groundY,
        width * 0.27,
        height * 0.052,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      ctx.strokeStyle = rimStroke;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(
        centerX,
        groundY,
        width * 0.31,
        height * 0.065,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
      ctx.restore();

      const breathWave = Math.sin(elapsedSeconds * 3.1);
      const breathingBob = activePose === 'attack' ? -2 : breathWave * 3.5;
      const breathScaleX = activePose === 'attack' ? 1 : 1 - breathWave * 0.022;
      const breathScaleY = activePose === 'attack' ? 1 : 1 + breathWave * 0.022;
      const frame = spriteAtlas.getUnitFrame(
        unitClass,
        faction,
        activePose,
        false,
      );

      if (frame) {
        const sprite = frame.canvas;
        const baseTargetHeight = height * 0.62;
        let drawHeight = baseTargetHeight * frame.relativeHeight;
        const spriteAspect = sprite.width / Math.max(1, sprite.height);
        let drawWidth = drawHeight * spriteAspect;
        const maxDrawWidth = width * 0.88;
        const maxDrawHeight = height * 0.74;

        if (drawWidth > maxDrawWidth) {
          drawWidth = maxDrawWidth;
          drawHeight = drawWidth / spriteAspect;
        }
        if (drawHeight > maxDrawHeight) {
          drawHeight = maxDrawHeight;
          drawWidth = drawHeight * spriteAspect;
        }

        ctx.save();
        ctx.translate(centerX, groundY + 6 + breathingBob);
        ctx.scale(breathScaleX, breathScaleY);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.shadowColor = isPlayer
          ? 'rgba(56, 189, 248, 0.45)'
          : 'rgba(251, 113, 133, 0.45)';
        ctx.shadowBlur = activePose === 'attack' ? 24 : 16;
        ctx.drawImage(
          sprite,
          -drawWidth * 0.5,
          -drawHeight,
          drawWidth,
          drawHeight,
        );
        ctx.restore();

        ctx.save();
        ctx.fillStyle = isPlayer ? '#7dd3fc' : '#fda4af';
        for (let moteIndex = 0; moteIndex < 4; moteIndex++) {
          const orbit = elapsedSeconds * 1.5 + moteIndex * (Math.PI / 2);
          const moteX = centerX + Math.cos(orbit) * width * 0.34;
          const moteY =
            height * 0.46 + Math.sin(orbit * 1.5) * height * 0.2;
          ctx.globalAlpha = 0.42 + Math.sin(orbit * 2) * 0.2;
          ctx.beginPath();
          ctx.arc(moteX, moteY, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else {
        const fillColor = isPlayer
          ? PALETTE.playerPrimary
          : PALETTE.enemyPrimary;
        const highlightColor = isPlayer
          ? PALETTE.playerHighlight
          : PALETTE.enemyHighlight;
        drawUnitClassGlyph(
          ctx,
          unitClass,
          centerX,
          height * 0.48 + breathingBob,
          Math.min(width, height) * 0.28,
          fillColor,
          highlightColor,
          elapsedSeconds,
        );
      }

      frameId = window.requestAnimationFrame(renderFrame);
    };

    frameId = window.requestAnimationFrame(renderFrame);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [unitClass, faction, terrain, mode]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[250px] sm:h-full sm:min-h-[360px] bg-slate-950 overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        aria-label={`${unitClass} animated full character sprite`}
        className="block w-full h-full"
      />
      <div className="absolute bottom-11 left-2 right-2 flex items-center justify-center gap-1">
        {MODE_OPTIONS.map((option) => {
          const isActive = mode === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm transition-colors cursor-pointer ${
                isActive
                  ? 'bg-sky-400 text-slate-950 border-sky-200'
                  : 'bg-slate-950/75 text-slate-300 border-slate-700/80 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
