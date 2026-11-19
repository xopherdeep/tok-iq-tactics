import arenaBackdropAsset from '@/src/assets/images/battle_backdrop_arena_1795079826769.jpg';
import chasmBackdropAsset from '@/src/assets/images/battle_backdrop_chasm_1795082628721.jpg';
import forestBackdropAsset from '@/src/assets/images/battle_backdrop_forest_1795082628605.jpg';
import fortressBackdropAsset from '@/src/assets/images/battle_backdrop_fortress_1795082627343.jpg';
import arcanistSheetAsset from '@/src/assets/images/sheet_arcanist_1795096766049.jpg';
import clericSheetAsset from '@/src/assets/images/sheet_cleric_1795096763748.jpg';
import healerSheetAsset from '@/src/assets/images/sheet_healer_1795119321792.jpg';
import marksmanSheetAsset from '@/src/assets/images/sheet_marksman_1795119320762.jpg';
import rangerSheetAsset from '@/src/assets/images/sheet_ranger_1795096764235.jpg';
import sovereignSheetAsset from '@/src/assets/images/sheet_sovereign_1795096764344.jpg';
import strikerSheetAsset from '@/src/assets/images/sheet_striker_1795096764334.jpg';
import vanguardSheetAsset from '@/src/assets/images/sheet_vanguard_1795096763828.jpg';
import type {Faction, TerrainType, UnitClass} from './types';

export type SpriteAnimationPose = 'idle' | 'move' | 'windup' | 'attack';

export interface AnimatedSpriteFrame {
  canvas: HTMLCanvasElement;
  relativeHeight: number;
}

interface ProcessedPoseVariants {
  player: HTMLCanvasElement;
  playerExhausted: HTMLCanvasElement;
  enemy: HTMLCanvasElement;
  enemyExhausted: HTMLCanvasElement;
  relativeHeight: number;
}

type ProcessedSpriteSheet = Record<SpriteAnimationPose, ProcessedPoseVariants>;

interface SpriteSheetSpec {
  src: string;
  facesRightNatively: boolean;
}

const POSES_IN_ORDER: SpriteAnimationPose[] = [
  'idle',
  'move',
  'windup',
  'attack',
];

const SPRITE_SHEET_SOURCES: Record<UnitClass, SpriteSheetSpec> = {
  vanguard: {src: vanguardSheetAsset.src, facesRightNatively: true},
  striker: {src: strikerSheetAsset.src, facesRightNatively: true},
  arcanist: {src: arcanistSheetAsset.src, facesRightNatively: true},
  sovereign: {src: sovereignSheetAsset.src, facesRightNatively: true},
  cleric: {src: clericSheetAsset.src, facesRightNatively: true},
  ranger: {src: rangerSheetAsset.src, facesRightNatively: true},
  marksman: {src: marksmanSheetAsset.src, facesRightNatively: true},
  healer: {src: healerSheetAsset.src, facesRightNatively: true},
};

const BACKDROP_SOURCES: Record<TerrainType, string> = {
  plains: arenaBackdropAsset.src,
  forest: forestBackdropAsset.src,
  fortress: fortressBackdropAsset.src,
  chasm: chasmBackdropAsset.src,
};

const SHEET_PROCESS_WIDTH = 1280;
const SHEET_PROCESS_HEIGHT = 720;

function isNearWhiteBackdrop(
  red: number,
  green: number,
  blue: number,
): boolean {
  const minChannel = Math.min(red, green, blue);
  const maxChannel = Math.max(red, green, blue);
  const saturationSpread = maxChannel - minChannel;
  const isPureLightBackdrop = minChannel >= 224 && saturationSpread <= 32;
  const isVeryPaleEdge = minChannel >= 238 && saturationSpread <= 42;
  return isPureLightBackdrop || isVeryPaleEdge;
}

function removeWhiteBackdropInPlace(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): void {
  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  let head = 0;
  let tail = 0;

  const enqueueIfBackdrop = (x: number, y: number) => {
    const idx = y * width + x;
    if (visited[idx]) {
      return;
    }
    const offset = idx * 4;
    if (
      isNearWhiteBackdrop(pixels[offset], pixels[offset + 1], pixels[offset + 2])
    ) {
      visited[idx] = 1;
      queue[tail++] = idx;
    }
  };

  for (let x = 0; x < width; x++) {
    enqueueIfBackdrop(x, 0);
    enqueueIfBackdrop(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    enqueueIfBackdrop(0, y);
    enqueueIfBackdrop(width - 1, y);
  }

  while (head < tail) {
    const idx = queue[head++];
    pixels[idx * 4 + 3] = 0;

    const x = idx % width;
    const y = (idx - x) / width;
    if (x > 0) enqueueIfBackdrop(x - 1, y);
    if (x < width - 1) enqueueIfBackdrop(x + 1, y);
    if (y > 0) enqueueIfBackdrop(x, y - 1);
    if (y < height - 1) enqueueIfBackdrop(x, y + 1);
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const alpha = pixels[idx * 4 + 3];
      if (alpha === 0) {
        continue;
      }
      const touchesTransparent =
        pixels[(idx - 1) * 4 + 3] === 0 ||
        pixels[(idx + 1) * 4 + 3] === 0 ||
        pixels[(idx - width) * 4 + 3] === 0 ||
        pixels[(idx + width) * 4 + 3] === 0;
      if (!touchesTransparent) {
        continue;
      }
      const r = pixels[idx * 4];
      const g = pixels[idx * 4 + 1];
      const b = pixels[idx * 4 + 2];
      const brightness = (r + g + b) / 3;
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      if (brightness > 205 && spread < 40) {
        pixels[idx * 4 + 3] = Math.round(alpha * 0.25);
      }
    }
  }
}

function findFourFrameHorizontalBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Array<{startX: number; endX: number}> {
  const columnInk = new Int32Array(width);
  for (let x = 0; x < width; x++) {
    let inkCount = 0;
    for (let y = 0; y < height; y++) {
      if (pixels[(y * width + x) * 4 + 3] > 28) {
        inkCount += 1;
      }
    }
    columnInk[x] = inkCount;
  }

  const dividers: number[] = [0];
  const searchMargin = Math.floor(width * 0.085);

  for (let quarter = 1; quarter <= 3; quarter++) {
    const idealX = Math.floor((width * quarter) / 4);
    const minX = Math.max(1, idealX - searchMargin);
    const maxX = Math.min(width - 2, idealX + searchMargin);

    let bestX = idealX;
    let bestScore = Infinity;

    for (let x = minX; x <= maxX; x++) {
      const distancePenalty = Math.abs(x - idealX) * 0.02;
      const score = columnInk[x] + distancePenalty;
      if (score < bestScore) {
        bestScore = score;
        bestX = x;
      }
    }
    dividers.push(bestX);
  }
  dividers.push(width);

  return [0, 1, 2, 3].map((index) => ({
    startX: dividers[index],
    endX: dividers[index + 1],
  }));
}

function extractTrimmedFrame(
  sheetCanvas: HTMLCanvasElement,
  pixels: Uint8ClampedArray,
  sheetWidth: number,
  sheetHeight: number,
  startX: number,
  endX: number,
  flipHorizontal: boolean,
): HTMLCanvasElement {
  let minX = endX;
  let minY = sheetHeight;
  let maxX = startX;
  let maxY = 0;

  for (let y = 0; y < sheetHeight; y++) {
    for (let x = startX; x < endX; x++) {
      const alpha = pixels[(y * sheetWidth + x) * 4 + 3];
      if (alpha > 20) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const hasContent = maxX > minX && maxY > minY;
  const pad = 4;
  const cropX = hasContent ? Math.max(startX, minX - pad) : startX;
  const cropY = hasContent ? Math.max(0, minY - pad) : 0;
  const cropW = hasContent
    ? Math.min(endX - cropX, maxX - minX + 1 + pad * 2)
    : Math.max(1, endX - startX);
  const cropH = hasContent
    ? Math.min(sheetHeight - cropY, maxY - minY + 1 + pad * 2)
    : sheetHeight;

  const trimmed = document.createElement('canvas');
  trimmed.width = cropW;
  trimmed.height = cropH;
  const trimCtx = trimmed.getContext('2d');
  if (trimCtx) {
    trimCtx.save();
    if (flipHorizontal) {
      trimCtx.translate(cropW, 0);
      trimCtx.scale(-1, 1);
    }
    trimCtx.drawImage(
      sheetCanvas,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH,
    );
    trimCtx.restore();
  }
  return trimmed;
}

function createEnemyRecoloredSprite(
  source: HTMLCanvasElement,
): HTMLCanvasElement {
  const target = document.createElement('canvas');
  target.width = source.width;
  target.height = source.height;
  const ctx = target.getContext('2d', {willReadFrequently: true});
  if (!ctx) {
    return target;
  }

  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, target.width, target.height);
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha === 0) {
      continue;
    }
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];

    const isCyanAccent = b > r + 14 && g >= r + 4;
    const isGreenCloak = g > r + 10 && g > b + 6;
    const isBlueTone = b > r + 10;

    if (isCyanAccent) {
      data[index] = Math.min(255, Math.round(b * 1.06 + 18));
      data[index + 1] = Math.min(255, Math.round(g * 0.44 + r * 0.15));
      data[index + 2] = Math.min(255, Math.round(r * 0.5 + 48));
    } else if (isGreenCloak) {
      data[index] = Math.min(255, Math.round(g * 1.05 + 14));
      data[index + 1] = Math.min(255, Math.round(r * 0.72));
      data[index + 2] = Math.min(255, Math.round(b * 0.92 + 12));
    } else if (isBlueTone) {
      data[index] = Math.min(255, Math.round(b * 0.85 + r * 0.25));
      data[index + 1] = Math.min(255, Math.round(g * 0.65));
      data[index + 2] = Math.min(255, Math.round(r * 0.85 + 16));
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return target;
}

function createExhaustedVariant(source: HTMLCanvasElement): HTMLCanvasElement {
  const target = document.createElement('canvas');
  target.width = source.width;
  target.height = source.height;
  const ctx = target.getContext('2d', {willReadFrequently: true});
  if (!ctx) {
    return target;
  }

  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, target.width, target.height);
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) {
      continue;
    }
    const lum = Math.round(
      data[index] * 0.3 + data[index + 1] * 0.59 + data[index + 2] * 0.11,
    );
    data[index] = Math.round(lum * 0.72);
    data[index + 1] = Math.round(lum * 0.76);
    data[index + 2] = Math.round(lum * 0.84);
  }

  ctx.putImageData(imageData, 0, 0);
  return target;
}

function processSpriteSheetImage(
  image: HTMLImageElement,
  flipHorizontal: boolean,
): ProcessedSpriteSheet {
  const workCanvas = document.createElement('canvas');
  workCanvas.width = SHEET_PROCESS_WIDTH;
  workCanvas.height = SHEET_PROCESS_HEIGHT;
  const ctx = workCanvas.getContext('2d', {willReadFrequently: true});

  if (ctx) {
    ctx.drawImage(image, 0, 0, SHEET_PROCESS_WIDTH, SHEET_PROCESS_HEIGHT);
  }

  const imageData = ctx
    ? ctx.getImageData(0, 0, SHEET_PROCESS_WIDTH, SHEET_PROCESS_HEIGHT)
    : new ImageData(SHEET_PROCESS_WIDTH, SHEET_PROCESS_HEIGHT);
  const pixels = imageData.data;
  removeWhiteBackdropInPlace(pixels, SHEET_PROCESS_WIDTH, SHEET_PROCESS_HEIGHT);
  if (ctx) {
    ctx.putImageData(imageData, 0, 0);
  }

  const frameBounds = findFourFrameHorizontalBounds(
    pixels,
    SHEET_PROCESS_WIDTH,
    SHEET_PROCESS_HEIGHT,
  );
  const rawFrames = frameBounds.map((bounds) =>
    extractTrimmedFrame(
      workCanvas,
      pixels,
      SHEET_PROCESS_WIDTH,
      SHEET_PROCESS_HEIGHT,
      bounds.startX,
      bounds.endX,
      flipHorizontal,
    ),
  );

  const referenceHeight = Math.max(1, rawFrames[0]?.height ?? 1);
  const sheet = {} as ProcessedSpriteSheet;

  POSES_IN_ORDER.forEach((pose, index) => {
    const player = rawFrames[index] ?? rawFrames[0];
    const enemy = createEnemyRecoloredSprite(player);
    const playerExhausted = createExhaustedVariant(player);
    const enemyExhausted = createExhaustedVariant(enemy);
    const rawRatio = player.height / referenceHeight;
    const relativeHeight = Math.max(0.92, Math.min(1.32, rawRatio));

    sheet[pose] = {
      player,
      playerExhausted,
      enemy,
      enemyExhausted,
      relativeHeight,
    };
  });

  return sheet;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

class TacticalSpriteAtlas {
  private sheets = new Map<UnitClass, ProcessedSpriteSheet>();
  private backdrops = new Map<TerrainType, HTMLImageElement>();
  private initialized = false;

  public preload(): void {
    if (this.initialized || typeof window === 'undefined') {
      return;
    }
    this.initialized = true;

    const unitClasses: UnitClass[] = [
      'vanguard',
      'striker',
      'arcanist',
      'sovereign',
      'cleric',
      'ranger',
      'marksman',
      'healer',
    ];

    unitClasses.forEach((unitClass) => {
      const spec = SPRITE_SHEET_SOURCES[unitClass];
      void loadImageElement(spec.src)
        .then((img) => {
          const processedSheet = processSpriteSheetImage(
            img,
            spec.facesRightNatively,
          );
          this.sheets.set(unitClass, processedSheet);
        })
        .catch(() => undefined);
    });

    const terrainTypes: TerrainType[] = [
      'plains',
      'forest',
      'fortress',
      'chasm',
    ];

    terrainTypes.forEach((terrain) => {
      void loadImageElement(BACKDROP_SOURCES[terrain])
        .then((img) => {
          this.backdrops.set(terrain, img);
        })
        .catch(() => undefined);
    });
  }

  public getUnitFrame(
    unitClass: UnitClass,
    faction: Faction,
    pose: SpriteAnimationPose = 'idle',
    exhausted = false,
  ): AnimatedSpriteFrame | null {
    const sheet = this.sheets.get(unitClass);
    if (!sheet) {
      return null;
    }
    const poseEntry = sheet[pose] ?? sheet.idle;
    const canvas =
      faction === 'player'
        ? exhausted
          ? poseEntry.playerExhausted
          : poseEntry.player
        : exhausted
          ? poseEntry.enemyExhausted
          : poseEntry.enemy;

    return {
      canvas,
      relativeHeight: poseEntry.relativeHeight,
    };
  }

  public getUnitSprite(
    unitClass: UnitClass,
    faction: Faction,
    exhausted = false,
  ): HTMLCanvasElement | null {
    const frame = this.getUnitFrame(unitClass, faction, 'idle', exhausted);
    return frame ? frame.canvas : null;
  }

  public getBattleBackdrop(terrain: TerrainType = 'plains'): HTMLImageElement | null {
    return this.backdrops.get(terrain) ?? this.backdrops.get('plains') ?? null;
  }
}

export const spriteAtlas = new TacticalSpriteAtlas();
