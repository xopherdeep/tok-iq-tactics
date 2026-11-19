'use client';

import {useEffect, useRef} from 'react';
import {drawUnitClassGlyph} from '@/lib/tactics/canvasGlyphs';
import {PALETTE} from '@/lib/tactics/constants';
import {spriteAtlas} from '@/lib/tactics/spriteAtlas';
import type {Faction, UnitClass} from '@/lib/tactics/types';

interface UnitSpritePortraitProps {
  unitClass: UnitClass;
  faction?: Faction;
  size?: number;
}

export function UnitSpritePortrait({
  unitClass,
  faction = 'player',
  size = 56,
}: UnitSpritePortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let frameId = 0;
    const startTime = performance.now();

    const drawFrame = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pixelSize = Math.floor(size * dpr);
      if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
        canvas.width = pixelSize;
        canvas.height = pixelSize;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const elapsed = (now - startTime) / 1000;
      const bob = Math.sin(elapsed * 3.1) * 1.4;
      const pose = Math.floor(elapsed * 1.4) % 3 === 0 ? 'move' : 'idle';
      const frame = spriteAtlas.getUnitFrame(unitClass, faction, pose, false);

      if (frame) {
        const sprite = frame.canvas;
        const maxH = size * 0.88;
        const maxW = size * 0.88;
        const aspect = sprite.width / Math.max(1, sprite.height);
        let drawH = maxH;
        let drawW = drawH * aspect;
        if (drawW > maxW) {
          drawW = maxW;
          drawH = drawW / aspect;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(
          sprite,
          (size - drawW) * 0.5,
          size - drawH - 2 + bob,
          drawW,
          drawH,
        );
      } else {
        const fillColor =
          faction === 'player' ? PALETTE.playerPrimary : PALETTE.enemyPrimary;
        const highlightColor =
          faction === 'player'
            ? PALETTE.playerHighlight
            : PALETTE.enemyHighlight;
        drawUnitClassGlyph(
          ctx,
          unitClass,
          size * 0.5,
          size * 0.5 + bob,
          size * 0.32,
          fillColor,
          highlightColor,
          elapsed,
        );
      }

      frameId = window.requestAnimationFrame(drawFrame);
    };

    frameId = window.requestAnimationFrame(drawFrame);
    return () => window.cancelAnimationFrame(frameId);
  }, [unitClass, faction, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{width: `${size}px`, height: `${size}px`}}
      aria-label={`${unitClass} sprite`}
      className="block shrink-0"
    />
  );
}
