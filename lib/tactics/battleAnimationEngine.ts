import type {SpriteAnimationPose} from './spriteAtlas';
import type {BattleSceneState, Faction, UnitClass} from './types';

export type TweenEasing =
  | 'linear'
  | 'easeOutCubic'
  | 'easeInCubic'
  | 'easeInOutQuad'
  | 'easeOutBack'
  | 'easeOutExpo'
  | 'easeInBack';

export type BattleVfxPaletteKey = 'player' | 'enemy' | 'heal';

export interface CombatantKeyframe {
  time: number;
  pose: SpriteAnimationPose;
  offsetX: number;
  offsetY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  afterimageAlpha: number;
  chargeGlow: number;
  easing?: TweenEasing;
}

export interface EvaluatedCombatantTween {
  pose: SpriteAnimationPose;
  offsetX: number;
  offsetY: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  afterimageAlpha: number;
  chargeGlow: number;
  chargeProgress: number;
}

export interface ClassAttackChoreography {
  isRanged: boolean;
  approachDuration: number;
  impactDuration: number;
  returnDuration: number;
  projectileLaunchRatio: number;
  hitStopDuration: number;
  approachFrames: CombatantKeyframe[];
  impactFrames: CombatantKeyframe[];
  returnFrames: CombatantKeyframe[];
}

interface VfxColorTheme {
  primary: string;
  secondary: string;
  core: string;
  glow: string;
}

const IMPACT_FRAME_COUNT = 8;
const IMPACT_FRAME_SIZE = 192;
const CHARGE_FRAME_COUNT = 6;
const CHARGE_FRAME_SIZE = 144;

const NEUTRAL_TWEEN: EvaluatedCombatantTween = {
  pose: 'idle',
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  scaleX: 1,
  scaleY: 1,
  afterimageAlpha: 0,
  chargeGlow: 0,
  chargeProgress: 0,
};

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function applyEasing(t: number, easing: TweenEasing): number {
  const clamped = clampUnit(t);
  if (easing === 'easeOutCubic') {
    return 1 - Math.pow(1 - clamped, 3);
  }
  if (easing === 'easeInCubic') {
    return clamped * clamped * clamped;
  }
  if (easing === 'easeInOutQuad') {
    return clamped < 0.5
      ? 2 * clamped * clamped
      : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
  }
  if (easing === 'easeOutBack') {
    const overshoot = 1.70158;
    const shifted = clamped - 1;
    return 1 + (overshoot + 1) * Math.pow(shifted, 3) + overshoot * Math.pow(shifted, 2);
  }
  if (easing === 'easeInBack') {
    const overshoot = 1.70158;
    return (overshoot + 1) * clamped * clamped * clamped - overshoot * clamped * clamped;
  }
  if (easing === 'easeOutExpo') {
    return clamped === 1 ? 1 : 1 - Math.pow(2, -10 * clamped);
  }
  return clamped;
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function sampleKeyframeTrack(
  frames: CombatantKeyframe[],
  progress: number,
  facingSign: number,
): EvaluatedCombatantTween {
  const clamped = clampUnit(progress);
  if (frames.length === 0) {
    return NEUTRAL_TWEEN;
  }
  if (frames.length === 1) {
    const single = frames[0];
    return {
      pose: single.pose,
      offsetX: single.offsetX * facingSign,
      offsetY: single.offsetY,
      rotation: single.rotation * facingSign,
      scaleX: single.scaleX,
      scaleY: single.scaleY,
      afterimageAlpha: single.afterimageAlpha,
      chargeGlow: single.chargeGlow,
      chargeProgress: clamped,
    };
  }

  let fromFrame = frames[0];
  let toFrame = frames[frames.length - 1];
  for (let index = 0; index < frames.length - 1; index++) {
    const current = frames[index];
    const next = frames[index + 1];
    if (clamped >= current.time && clamped <= next.time) {
      fromFrame = current;
      toFrame = next;
      break;
    }
  }

  const span = Math.max(0.0001, toFrame.time - fromFrame.time);
  const localProgress = clampUnit((clamped - fromFrame.time) / span);
  const eased = applyEasing(localProgress, toFrame.easing ?? 'linear');
  const activePose = localProgress >= 0.85 ? toFrame.pose : fromFrame.pose;

  return {
    pose: activePose,
    offsetX: lerp(fromFrame.offsetX, toFrame.offsetX, eased) * facingSign,
    offsetY: lerp(fromFrame.offsetY, toFrame.offsetY, eased),
    rotation: lerp(fromFrame.rotation, toFrame.rotation, eased) * facingSign,
    scaleX: lerp(fromFrame.scaleX, toFrame.scaleX, eased),
    scaleY: lerp(fromFrame.scaleY, toFrame.scaleY, eased),
    afterimageAlpha: lerp(fromFrame.afterimageAlpha, toFrame.afterimageAlpha, eased),
    chargeGlow: lerp(fromFrame.chargeGlow, toFrame.chargeGlow, eased),
    chargeProgress: clamped,
  };
}

const CLASS_CHOREOGRAPHIES: Record<UnitClass, ClassAttackChoreography> = {
  vanguard: {
    isRanged: false,
    approachDuration: 0.4,
    impactDuration: 0.44,
    returnDuration: 0.28,
    projectileLaunchRatio: 1,
    hitStopDuration: 0.075,
    approachFrames: [
      {time: 0, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0},
      {time: 0.2, pose: 'windup', offsetX: -0.02, offsetY: 0.012, rotation: -0.09, scaleX: 1.09, scaleY: 0.9, afterimageAlpha: 0.1, chargeGlow: 0.55, easing: 'easeOutCubic'},
      {time: 0.55, pose: 'move', offsetX: 0.19, offsetY: -0.14, rotation: -0.15, scaleX: 0.94, scaleY: 1.1, afterimageAlpha: 0.52, chargeGlow: 0.85, easing: 'easeOutCubic'},
      {time: 0.84, pose: 'windup', offsetX: 0.31, offsetY: -0.16, rotation: -0.2, scaleX: 0.92, scaleY: 1.12, afterimageAlpha: 0.72, chargeGlow: 1, easing: 'easeInOutQuad'},
      {time: 1, pose: 'attack', offsetX: 0.35, offsetY: 0.015, rotation: 0.17, scaleX: 1.15, scaleY: 0.86, afterimageAlpha: 0.85, chargeGlow: 0.3, easing: 'easeInCubic'},
    ],
    impactFrames: [
      {time: 0, pose: 'attack', offsetX: 0.35, offsetY: 0.018, rotation: 0.18, scaleX: 1.16, scaleY: 0.85, afterimageAlpha: 0.45, chargeGlow: 0},
      {time: 0.38, pose: 'attack', offsetX: 0.34, offsetY: 0, rotation: 0.11, scaleX: 1.04, scaleY: 0.97, afterimageAlpha: 0.12, chargeGlow: 0, easing: 'easeOutBack'},
      {time: 1, pose: 'attack', offsetX: 0.32, offsetY: 0, rotation: 0.04, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutCubic'},
    ],
    returnFrames: [
      {time: 0, pose: 'move', offsetX: 0.32, offsetY: 0, rotation: 0.04, scaleX: 1, scaleY: 1, afterimageAlpha: 0.15, chargeGlow: 0},
      {time: 0.48, pose: 'move', offsetX: 0.14, offsetY: -0.075, rotation: -0.07, scaleX: 0.96, scaleY: 1.05, afterimageAlpha: 0.25, chargeGlow: 0, easing: 'easeOutCubic'},
      {time: 1, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutBack'},
    ],
  },
  striker: {
    isRanged: false,
    approachDuration: 0.36,
    impactDuration: 0.42,
    returnDuration: 0.26,
    projectileLaunchRatio: 1,
    hitStopDuration: 0.065,
    approachFrames: [
      {time: 0, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0},
      {time: 0.28, pose: 'windup', offsetX: -0.055, offsetY: -0.22, rotation: -0.24, scaleX: 0.92, scaleY: 1.12, afterimageAlpha: 0.4, chargeGlow: 0.95, easing: 'easeOutCubic'},
      {time: 0.52, pose: 'windup', offsetX: -0.03, offsetY: -0.25, rotation: -0.14, scaleX: 0.9, scaleY: 1.14, afterimageAlpha: 0.55, chargeGlow: 1, easing: 'easeInOutQuad'},
      {time: 0.85, pose: 'move', offsetX: 0.27, offsetY: -0.09, rotation: 0.24, scaleX: 1.16, scaleY: 0.88, afterimageAlpha: 0.95, chargeGlow: 0.7, easing: 'easeInCubic'},
      {time: 1, pose: 'attack', offsetX: 0.37, offsetY: -0.02, rotation: 0.19, scaleX: 1.18, scaleY: 0.88, afterimageAlpha: 0.95, chargeGlow: 0.25, easing: 'easeOutExpo'},
    ],
    impactFrames: [
      {time: 0, pose: 'attack', offsetX: 0.37, offsetY: -0.02, rotation: 0.19, scaleX: 1.17, scaleY: 0.89, afterimageAlpha: 0.7, chargeGlow: 0},
      {time: 0.45, pose: 'attack', offsetX: 0.39, offsetY: -0.05, rotation: 0.08, scaleX: 1.03, scaleY: 0.98, afterimageAlpha: 0.25, chargeGlow: 0, easing: 'easeOutCubic'},
      {time: 1, pose: 'move', offsetX: 0.36, offsetY: -0.08, rotation: -0.04, scaleX: 1, scaleY: 1, afterimageAlpha: 0.1, chargeGlow: 0, easing: 'easeOutCubic'},
    ],
    returnFrames: [
      {time: 0, pose: 'move', offsetX: 0.36, offsetY: -0.08, rotation: -0.04, scaleX: 1, scaleY: 1, afterimageAlpha: 0.35, chargeGlow: 0},
      {time: 0.45, pose: 'move', offsetX: 0.17, offsetY: -0.19, rotation: -0.22, scaleX: 0.95, scaleY: 1.06, afterimageAlpha: 0.55, chargeGlow: 0, easing: 'easeOutCubic'},
      {time: 1, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutBack'},
    ],
  },
  arcanist: {
    isRanged: true,
    approachDuration: 0.44,
    impactDuration: 0.44,
    returnDuration: 0.24,
    projectileLaunchRatio: 0.42,
    hitStopDuration: 0.055,
    approachFrames: [
      {time: 0, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0},
      {time: 0.26, pose: 'windup', offsetX: -0.02, offsetY: -0.095, rotation: -0.09, scaleX: 0.95, scaleY: 1.09, afterimageAlpha: 0.25, chargeGlow: 0.9, easing: 'easeOutCubic'},
      {time: 0.42, pose: 'windup', offsetX: -0.025, offsetY: -0.125, rotation: -0.12, scaleX: 0.93, scaleY: 1.11, afterimageAlpha: 0.32, chargeGlow: 1, easing: 'easeInOutQuad'},
      {time: 0.62, pose: 'attack', offsetX: 0.055, offsetY: -0.09, rotation: 0.11, scaleX: 1.08, scaleY: 0.95, afterimageAlpha: 0.42, chargeGlow: 0.72, easing: 'easeOutExpo'},
      {time: 1, pose: 'attack', offsetX: 0.04, offsetY: -0.075, rotation: 0.07, scaleX: 1.03, scaleY: 0.98, afterimageAlpha: 0.18, chargeGlow: 0.25, easing: 'easeOutCubic'},
    ],
    impactFrames: [
      {time: 0, pose: 'attack', offsetX: 0.04, offsetY: -0.075, rotation: 0.07, scaleX: 1.04, scaleY: 0.97, afterimageAlpha: 0.14, chargeGlow: 0.2},
      {time: 0.55, pose: 'attack', offsetX: 0.018, offsetY: -0.045, rotation: 0.03, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutCubic'},
      {time: 1, pose: 'idle', offsetX: 0.01, offsetY: -0.025, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutCubic'},
    ],
    returnFrames: [
      {time: 0, pose: 'idle', offsetX: 0.01, offsetY: -0.025, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0},
      {time: 1, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutCubic'},
    ],
  },
  ranger: {
    isRanged: true,
    approachDuration: 0.4,
    impactDuration: 0.4,
    returnDuration: 0.24,
    projectileLaunchRatio: 0.4,
    hitStopDuration: 0.05,
    approachFrames: [
      {time: 0, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0},
      {time: 0.22, pose: 'move', offsetX: -0.055, offsetY: -0.09, rotation: -0.14, scaleX: 0.94, scaleY: 1.08, afterimageAlpha: 0.35, chargeGlow: 0.55, easing: 'easeOutCubic'},
      {time: 0.4, pose: 'windup', offsetX: -0.065, offsetY: -0.05, rotation: -0.11, scaleX: 0.93, scaleY: 1.07, afterimageAlpha: 0.25, chargeGlow: 1, easing: 'easeInOutQuad'},
      {time: 0.58, pose: 'attack', offsetX: 0.03, offsetY: -0.01, rotation: 0.09, scaleX: 1.09, scaleY: 0.94, afterimageAlpha: 0.38, chargeGlow: 0.45, easing: 'easeOutExpo'},
      {time: 1, pose: 'attack', offsetX: 0.015, offsetY: 0, rotation: 0.03, scaleX: 1.02, scaleY: 0.99, afterimageAlpha: 0.1, chargeGlow: 0, easing: 'easeOutCubic'},
    ],
    impactFrames: [
      {time: 0, pose: 'attack', offsetX: 0.015, offsetY: 0, rotation: 0.03, scaleX: 1.03, scaleY: 0.98, afterimageAlpha: 0, chargeGlow: 0},
      {time: 0.5, pose: 'attack', offsetX: 0.005, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutCubic'},
      {time: 1, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutCubic'},
    ],
    returnFrames: [
      {time: 0, pose: 'move', offsetX: 0.005, offsetY: -0.02, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0},
      {time: 1, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutCubic'},
    ],
  },
  cleric: {
    isRanged: true,
    approachDuration: 0.42,
    impactDuration: 0.5,
    returnDuration: 0.24,
    projectileLaunchRatio: 0.42,
    hitStopDuration: 0.04,
    approachFrames: [
      {time: 0, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0},
      {time: 0.3, pose: 'windup', offsetX: -0.015, offsetY: -0.08, rotation: -0.07, scaleX: 0.96, scaleY: 1.08, afterimageAlpha: 0.2, chargeGlow: 0.95, easing: 'easeOutCubic'},
      {time: 0.44, pose: 'windup', offsetX: -0.01, offsetY: -0.1, rotation: -0.08, scaleX: 0.95, scaleY: 1.09, afterimageAlpha: 0.22, chargeGlow: 1, easing: 'easeInOutQuad'},
      {time: 0.66, pose: 'attack', offsetX: 0.035, offsetY: -0.06, rotation: 0.08, scaleX: 1.05, scaleY: 0.97, afterimageAlpha: 0.26, chargeGlow: 0.7, easing: 'easeOutExpo'},
      {time: 1, pose: 'attack', offsetX: 0.025, offsetY: -0.045, rotation: 0.04, scaleX: 1.01, scaleY: 1, afterimageAlpha: 0.1, chargeGlow: 0.3, easing: 'easeOutCubic'},
    ],
    impactFrames: [
      {time: 0, pose: 'attack', offsetX: 0.025, offsetY: -0.045, rotation: 0.04, scaleX: 1.02, scaleY: 0.99, afterimageAlpha: 0, chargeGlow: 0.35},
      {time: 0.65, pose: 'attack', offsetX: 0.01, offsetY: -0.02, rotation: 0.01, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0.1, easing: 'easeOutCubic'},
      {time: 1, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutCubic'},
    ],
    returnFrames: [
      {time: 0, pose: 'idle', offsetX: 0.01, offsetY: -0.015, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0},
      {time: 1, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutCubic'},
    ],
  },
  sovereign: {
    isRanged: false,
    approachDuration: 0.36,
    impactDuration: 0.44,
    returnDuration: 0.26,
    projectileLaunchRatio: 1,
    hitStopDuration: 0.075,
    approachFrames: [
      {time: 0, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0},
      {time: 0.18, pose: 'windup', offsetX: -0.025, offsetY: 0.008, rotation: -0.11, scaleX: 1.06, scaleY: 0.94, afterimageAlpha: 0.25, chargeGlow: 0.85, easing: 'easeOutCubic'},
      {time: 0.48, pose: 'move', offsetX: 0.18, offsetY: -0.055, rotation: 0.11, scaleX: 1.08, scaleY: 0.95, afterimageAlpha: 0.8, chargeGlow: 0.95, easing: 'easeOutCubic'},
      {time: 0.78, pose: 'windup', offsetX: 0.3, offsetY: -0.075, rotation: -0.1, scaleX: 0.96, scaleY: 1.06, afterimageAlpha: 0.9, chargeGlow: 1, easing: 'easeInOutQuad'},
      {time: 1, pose: 'attack', offsetX: 0.36, offsetY: 0, rotation: 0.16, scaleX: 1.14, scaleY: 0.9, afterimageAlpha: 0.95, chargeGlow: 0.45, easing: 'easeOutExpo'},
    ],
    impactFrames: [
      {time: 0, pose: 'attack', offsetX: 0.36, offsetY: 0, rotation: 0.16, scaleX: 1.14, scaleY: 0.9, afterimageAlpha: 0.65, chargeGlow: 0.25},
      {time: 0.34, pose: 'windup', offsetX: 0.34, offsetY: -0.035, rotation: -0.09, scaleX: 0.97, scaleY: 1.05, afterimageAlpha: 0.45, chargeGlow: 0.3, easing: 'easeOutCubic'},
      {time: 0.62, pose: 'attack', offsetX: 0.38, offsetY: 0.005, rotation: 0.14, scaleX: 1.11, scaleY: 0.92, afterimageAlpha: 0.4, chargeGlow: 0.1, easing: 'easeOutExpo'},
      {time: 1, pose: 'attack', offsetX: 0.34, offsetY: 0, rotation: 0.04, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutCubic'},
    ],
    returnFrames: [
      {time: 0, pose: 'move', offsetX: 0.34, offsetY: 0, rotation: 0.04, scaleX: 1, scaleY: 1, afterimageAlpha: 0.35, chargeGlow: 0},
      {time: 0.46, pose: 'move', offsetX: 0.15, offsetY: -0.09, rotation: -0.12, scaleX: 0.95, scaleY: 1.05, afterimageAlpha: 0.48, chargeGlow: 0, easing: 'easeOutCubic'},
      {time: 1, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutBack'},
    ],
  },
  marksman: {
    isRanged: true,
    approachDuration: 0.44,
    impactDuration: 0.44,
    returnDuration: 0.24,
    projectileLaunchRatio: 0.46,
    hitStopDuration: 0.08,
    approachFrames: [
      {time: 0, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0},
      {time: 0.22, pose: 'windup', offsetX: -0.03, offsetY: 0.025, rotation: -0.05, scaleX: 1.06, scaleY: 0.93, afterimageAlpha: 0.15, chargeGlow: 0.72, easing: 'easeOutCubic'},
      {time: 0.46, pose: 'windup', offsetX: -0.04, offsetY: 0.03, rotation: -0.06, scaleX: 1.07, scaleY: 0.92, afterimageAlpha: 0.2, chargeGlow: 1, easing: 'easeInOutQuad'},
      {time: 0.62, pose: 'attack', offsetX: -0.085, offsetY: 0.008, rotation: -0.14, scaleX: 1.12, scaleY: 0.9, afterimageAlpha: 0.55, chargeGlow: 0.55, easing: 'easeOutExpo'},
      {time: 1, pose: 'attack', offsetX: -0.03, offsetY: 0.01, rotation: -0.04, scaleX: 1.02, scaleY: 0.98, afterimageAlpha: 0.12, chargeGlow: 0.1, easing: 'easeOutCubic'},
    ],
    impactFrames: [
      {time: 0, pose: 'attack', offsetX: -0.04, offsetY: 0.01, rotation: -0.05, scaleX: 1.04, scaleY: 0.97, afterimageAlpha: 0.1, chargeGlow: 0},
      {time: 0.55, pose: 'attack', offsetX: -0.012, offsetY: 0.005, rotation: -0.01, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutCubic'},
      {time: 1, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutCubic'},
    ],
    returnFrames: [
      {time: 0, pose: 'idle', offsetX: -0.01, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0},
      {time: 1, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutCubic'},
    ],
  },
  healer: {
    isRanged: true,
    approachDuration: 0.44,
    impactDuration: 0.52,
    returnDuration: 0.26,
    projectileLaunchRatio: 0.42,
    hitStopDuration: 0.04,
    approachFrames: [
      {time: 0, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0},
      {time: 0.28, pose: 'windup', offsetX: -0.015, offsetY: -0.1, rotation: -0.06, scaleX: 0.95, scaleY: 1.09, afterimageAlpha: 0.24, chargeGlow: 0.92, easing: 'easeOutCubic'},
      {time: 0.44, pose: 'windup', offsetX: -0.01, offsetY: -0.12, rotation: -0.08, scaleX: 0.94, scaleY: 1.1, afterimageAlpha: 0.28, chargeGlow: 1, easing: 'easeInOutQuad'},
      {time: 0.68, pose: 'attack', offsetX: 0.04, offsetY: -0.075, rotation: 0.08, scaleX: 1.06, scaleY: 0.96, afterimageAlpha: 0.3, chargeGlow: 0.78, easing: 'easeOutExpo'},
      {time: 1, pose: 'attack', offsetX: 0.025, offsetY: -0.05, rotation: 0.04, scaleX: 1.01, scaleY: 1, afterimageAlpha: 0.12, chargeGlow: 0.35, easing: 'easeOutCubic'},
    ],
    impactFrames: [
      {time: 0, pose: 'attack', offsetX: 0.025, offsetY: -0.05, rotation: 0.04, scaleX: 1.02, scaleY: 0.99, afterimageAlpha: 0, chargeGlow: 0.4},
      {time: 0.65, pose: 'attack', offsetX: 0.01, offsetY: -0.025, rotation: 0.01, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0.14, easing: 'easeOutCubic'},
      {time: 1, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutCubic'},
    ],
    returnFrames: [
      {time: 0, pose: 'idle', offsetX: 0.01, offsetY: -0.02, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0},
      {time: 1, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutCubic'},
    ],
  },
};

const HIT_RECOIL_FRAMES: CombatantKeyframe[] = [
  {time: 0, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0},
  {time: 0.18, pose: 'idle', offsetX: -0.06, offsetY: -0.025, rotation: -0.22, scaleX: 1.16, scaleY: 0.84, afterimageAlpha: 0.35, chargeGlow: 0, easing: 'easeOutExpo'},
  {time: 0.56, pose: 'idle', offsetX: -0.032, offsetY: 0.005, rotation: -0.1, scaleX: 0.96, scaleY: 1.05, afterimageAlpha: 0.12, chargeGlow: 0, easing: 'easeOutCubic'},
  {time: 1, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutBack'},
];

const EVADE_DODGE_FRAMES: CombatantKeyframe[] = [
  {time: 0, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0},
  {time: 0.24, pose: 'move', offsetX: -0.075, offsetY: -0.065, rotation: -0.16, scaleX: 0.93, scaleY: 1.08, afterimageAlpha: 0.65, chargeGlow: 0, easing: 'easeOutExpo'},
  {time: 0.62, pose: 'move', offsetX: -0.06, offsetY: -0.02, rotation: -0.06, scaleX: 0.97, scaleY: 1.03, afterimageAlpha: 0.25, chargeGlow: 0, easing: 'easeInOutQuad'},
  {time: 1, pose: 'idle', offsetX: 0, offsetY: 0, rotation: 0, scaleX: 1, scaleY: 1, afterimageAlpha: 0, chargeGlow: 0, easing: 'easeOutBack'},
];

export function getClassAttackChoreography(
  unitClass: UnitClass,
): ClassAttackChoreography {
  return CLASS_CHOREOGRAPHIES[unitClass];
}

export function evaluateBattleCombatantTween(
  scene: BattleSceneState,
  isPlayerSide: boolean,
  timeSeconds: number,
): EvaluatedCombatantTween {
  const combatant = isPlayerSide ? scene.playerSide : scene.enemySide;
  const facingSign = isPlayerSide ? -1 : 1;
  const duration = Math.max(0.05, scene.activeStepDuration);
  const stepProgress = clampUnit(scene.stepAge / duration);

  if (scene.isHealScene) {
    if (!isPlayerSide) {
      if (scene.step === 'primaryImpact') {
        const lift = Math.sin(stepProgress * Math.PI) * -0.03;
        return {
          ...NEUTRAL_TWEEN,
          pose: 'idle',
          offsetY: lift,
          scaleX: 1 - lift * 0.6,
          scaleY: 1 + Math.abs(lift) * 0.9,
          chargeGlow: Math.sin(stepProgress * Math.PI) * 0.6,
          chargeProgress: stepProgress,
        };
      }
      return NEUTRAL_TWEEN;
    }

    const clericTrack = CLASS_CHOREOGRAPHIES[combatant.unitClass];
    if (scene.step === 'intro') {
      return {
        ...NEUTRAL_TWEEN,
        pose: scene.stepAge > 0.16 ? 'windup' : 'idle',
        chargeGlow: scene.stepAge > 0.16 ? clampUnit((scene.stepAge - 0.16) / 0.18) * 0.5 : 0,
        chargeProgress: stepProgress,
      };
    }
    if (scene.step === 'primaryDash') {
      return sampleKeyframeTrack(clericTrack.approachFrames, stepProgress, facingSign);
    }
    if (scene.step === 'primaryImpact') {
      return sampleKeyframeTrack(clericTrack.impactFrames, stepProgress, facingSign);
    }
    if (scene.step === 'primaryReturn') {
      return sampleKeyframeTrack(clericTrack.returnFrames, stepProgress, facingSign);
    }
    if (scene.step === 'xpSummary' && scene.levelUpLabels.length > 0) {
      return {
        ...NEUTRAL_TWEEN,
        pose: 'windup',
        offsetY: -0.025 - Math.sin(timeSeconds * 7) * 0.01,
        chargeGlow: 0.75,
        chargeProgress: (timeSeconds * 1.4) % 1,
      };
    }
    return NEUTRAL_TWEEN;
  }

  const isPrimaryActor =
    (scene.attackerFaction === 'player' && isPlayerSide) ||
    (scene.attackerFaction === 'enemy' && !isPlayerSide);
  const track = CLASS_CHOREOGRAPHIES[combatant.unitClass];

  if (isPrimaryActor) {
    if (scene.step === 'intro') {
      const windupReady = scene.stepAge > 0.16;
      return {
        ...NEUTRAL_TWEEN,
        pose: windupReady ? 'windup' : 'idle',
        scaleX: windupReady ? 1.04 : 1,
        scaleY: windupReady ? 0.96 : 1,
        chargeGlow: windupReady ? clampUnit((scene.stepAge - 0.16) / 0.18) * 0.4 : 0,
        chargeProgress: stepProgress,
      };
    }
    if (scene.step === 'primaryDash') {
      return sampleKeyframeTrack(track.approachFrames, stepProgress, facingSign);
    }
    if (scene.step === 'primaryImpact') {
      return sampleKeyframeTrack(track.impactFrames, stepProgress, facingSign);
    }
    if (scene.step === 'primaryReturn') {
      return sampleKeyframeTrack(track.returnFrames, stepProgress, facingSign);
    }
    if (scene.step === 'counterImpact') {
      const reactionTrack = scene.counterHit ? HIT_RECOIL_FRAMES : EVADE_DODGE_FRAMES;
      return sampleKeyframeTrack(reactionTrack, stepProgress, facingSign);
    }
  } else {
    if (scene.step === 'primaryImpact') {
      const reactionTrack = scene.primaryHit ? HIT_RECOIL_FRAMES : EVADE_DODGE_FRAMES;
      return sampleKeyframeTrack(reactionTrack, stepProgress, facingSign);
    }
    if (scene.step === 'counterDash') {
      return sampleKeyframeTrack(track.approachFrames, stepProgress, facingSign);
    }
    if (scene.step === 'counterImpact') {
      return sampleKeyframeTrack(track.impactFrames, stepProgress, facingSign);
    }
    if (scene.step === 'counterReturn') {
      return sampleKeyframeTrack(track.returnFrames, stepProgress, facingSign);
    }
  }

  if (
    isPlayerSide &&
    scene.step === 'xpSummary' &&
    scene.levelUpLabels.length > 0
  ) {
    return {
      ...NEUTRAL_TWEEN,
      pose: 'windup',
      offsetY: -0.025 - Math.sin(timeSeconds * 7) * 0.01,
      chargeGlow: 0.75,
      chargeProgress: (timeSeconds * 1.4) % 1,
    };
  }

  const idleCyclePose: SpriteAnimationPose =
    Math.floor(timeSeconds * 1.6) % 4 === 0 ? 'move' : 'idle';
  return {
    ...NEUTRAL_TWEEN,
    pose: idleCyclePose,
  };
}

function getThemeForClassAndPalette(
  unitClass: UnitClass,
  palette: BattleVfxPaletteKey,
): VfxColorTheme {
  if (palette === 'heal') {
    return {
      primary: '#34d399',
      secondary: '#fde047',
      core: '#ffffff',
      glow: '#10b981',
    };
  }

  const isPlayer = palette === 'player';
  if (unitClass === 'arcanist') {
    return isPlayer
      ? {primary: '#a78bfa', secondary: '#38bdf8', core: '#f5f3ff', glow: '#8b5cf6'}
      : {primary: '#f43f5e', secondary: '#c084fc', core: '#fff1f2', glow: '#e11d48'};
  }
  if (unitClass === 'ranger') {
    return isPlayer
      ? {primary: '#4ade80', secondary: '#fef08a', core: '#ffffff', glow: '#22c55e'}
      : {primary: '#fb7185', secondary: '#fbbf24', core: '#ffffff', glow: '#f43f5e'};
  }
  if (unitClass === 'sovereign') {
    return isPlayer
      ? {primary: '#fbbf24', secondary: '#38bdf8', core: '#fffbeb', glow: '#f59e0b'}
      : {primary: '#fb7185', secondary: '#fbbf24', core: '#fff1f2', glow: '#e11d48'};
  }
  if (unitClass === 'striker') {
    return isPlayer
      ? {primary: '#38bdf8', secondary: '#e0f2fe', core: '#ffffff', glow: '#0ea5e9'}
      : {primary: '#fb7185', secondary: '#fda4af', core: '#ffffff', glow: '#f43f5e'};
  }
  if (unitClass === 'cleric') {
    return isPlayer
      ? {primary: '#34d399', secondary: '#fef08a', core: '#ffffff', glow: '#10b981'}
      : {primary: '#fbbf24', secondary: '#fb7185', core: '#ffffff', glow: '#f59e0b'};
  }
  if (unitClass === 'marksman') {
    return isPlayer
      ? {primary: '#38bdf8', secondary: '#facc15', core: '#ffffff', glow: '#0ea5e9'}
      : {primary: '#fb7185', secondary: '#facc15', core: '#ffffff', glow: '#e11d48'};
  }
  if (unitClass === 'healer') {
    return isPlayer
      ? {primary: '#2dd4bf', secondary: '#fef08a', core: '#ffffff', glow: '#14b8a6'}
      : {primary: '#f472b6', secondary: '#fde047', core: '#ffffff', glow: '#ec4899'};
  }
  return isPlayer
    ? {primary: '#7dd3fc', secondary: '#fbbf24', core: '#ffffff', glow: '#38bdf8'}
    : {primary: '#fb7185', secondary: '#fb923c', core: '#ffffff', glow: '#e11d48'};
}

function drawVanguardImpactFrame(
  ctx: CanvasRenderingContext2D,
  progress: number,
  theme: VfxColorTheme,
): void {
  const alpha = progress < 0.72 ? 1 : (1 - progress) / 0.28;
  ctx.globalAlpha = clampUnit(alpha);
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 18;

  const arcEnd = -Math.PI * 0.78 + progress * Math.PI * 1.18;
  const arcStart = Math.max(-Math.PI * 0.85, arcEnd - 1.35 * (1 - progress * 0.4));
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = Math.max(3, (1 - progress) * 20);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(-8, 6, 56 + progress * 16, arcStart, arcEnd);
  ctx.stroke();

  ctx.strokeStyle = theme.core;
  ctx.lineWidth = Math.max(2, (1 - progress) * 8);
  ctx.beginPath();
  ctx.arc(-8, 6, 56 + progress * 16, arcStart + 0.14, arcEnd);
  ctx.stroke();

  if (progress > 0.22) {
    const slamT = (progress - 0.22) / 0.78;
    ctx.strokeStyle = theme.secondary;
    ctx.lineWidth = Math.max(1.5, (1 - slamT) * 6);
    ctx.beginPath();
    ctx.ellipse(0, 48, 22 + slamT * 62, 7 + slamT * 14, 0, 0, Math.PI * 2);
    ctx.stroke();

    for (let shard = 0; shard < 7; shard++) {
      const spread = -1.2 + shard * 0.4;
      const dist = 16 + slamT * 62;
      const sx = Math.sin(spread) * dist;
      const sy = 44 - Math.cos(spread) * (24 + slamT * 42) + slamT * slamT * 28;
      const sz = Math.max(2, (1 - slamT) * 7);
      ctx.fillStyle = shard % 2 === 0 ? theme.secondary : theme.core;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(spread + slamT * 5);
      ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    }
  }
}

function drawStrikerImpactFrame(
  ctx: CanvasRenderingContext2D,
  progress: number,
  theme: VfxColorTheme,
): void {
  const alpha = progress < 0.7 ? 1 : (1 - progress) / 0.3;
  ctx.globalAlpha = clampUnit(alpha);
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 20;

  const thrustX = -58 + progress * 116;
  ctx.fillStyle = theme.primary;
  ctx.beginPath();
  ctx.moveTo(thrustX + 46, 0);
  ctx.lineTo(thrustX - 42, -16 * (1 - progress * 0.45));
  ctx.lineTo(thrustX - 24, 0);
  ctx.lineTo(thrustX - 42, 16 * (1 - progress * 0.45));
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = theme.core;
  ctx.beginPath();
  ctx.moveTo(thrustX + 42, 0);
  ctx.lineTo(thrustX - 24, -7 * (1 - progress * 0.4));
  ctx.lineTo(thrustX - 24, 7 * (1 - progress * 0.4));
  ctx.closePath();
  ctx.fill();

  for (let ring = 0; ring < 3; ring++) {
    const ringT = clampUnit(progress * 1.25 - ring * 0.16);
    if (ringT <= 0) {
      continue;
    }
    ctx.strokeStyle = ring === 0 ? theme.core : theme.primary;
    ctx.lineWidth = Math.max(1.5, (1 - ringT) * 5);
    ctx.beginPath();
    ctx.ellipse(
      -26 + ring * 26,
      0,
      7 + ringT * 10,
      18 + ringT * 48,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  for (let streak = -2; streak <= 2; streak++) {
    const sy = streak * 17;
    ctx.strokeStyle = streak === 0 ? theme.core : theme.secondary;
    ctx.lineWidth = streak === 0 ? 3 : 1.8;
    ctx.beginPath();
    ctx.moveTo(-74 + progress * 34, sy);
    ctx.lineTo(28 + progress * 54, sy);
    ctx.stroke();
  }
}

function drawArcanistImpactFrame(
  ctx: CanvasRenderingContext2D,
  progress: number,
  theme: VfxColorTheme,
): void {
  const alpha = progress < 0.72 ? 1 : (1 - progress) / 0.28;
  ctx.globalAlpha = clampUnit(alpha);
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 22;

  const runeRadius = 26 + progress * 56;
  ctx.save();
  ctx.rotate(progress * Math.PI * 0.9);
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = Math.max(2, (1 - progress) * 5.5);
  ctx.beginPath();
  ctx.arc(0, 0, runeRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = theme.secondary;
  ctx.lineWidth = Math.max(1.5, (1 - progress) * 3.5);
  for (let tri = 0; tri < 2; tri++) {
    ctx.beginPath();
    for (let vertex = 0; vertex < 3; vertex++) {
      const angle = (vertex * Math.PI * 2) / 3 + tri * (Math.PI / 3);
      const vx = Math.cos(angle) * runeRadius * 0.9;
      const vy = Math.sin(angle) * runeRadius * 0.9;
      if (vertex === 0) {
        ctx.moveTo(vx, vy);
      } else {
        ctx.lineTo(vx, vy);
      }
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();

  const burstScale = Math.sin(Math.min(1, progress * 1.45) * Math.PI);
  if (burstScale > 0.05) {
    ctx.fillStyle = theme.core;
    ctx.beginPath();
    for (let point = 0; point < 16; point++) {
      const angle = (point * Math.PI) / 8;
      const r = point % 2 === 0 ? 48 * burstScale : 14 * burstScale;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (point === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
  }

  for (let bolt = 0; bolt < 6; bolt++) {
    const angle = (bolt * Math.PI) / 3 + progress * 0.8;
    const len = 26 + progress * 56;
    const midAngle = angle + (bolt % 2 === 0 ? 0.22 : -0.22);
    ctx.strokeStyle = bolt % 2 === 0 ? theme.core : theme.secondary;
    ctx.lineWidth = Math.max(1.5, (1 - progress) * 3.5);
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * 10, Math.sin(angle) * 10);
    ctx.lineTo(Math.cos(midAngle) * (len * 0.56), Math.sin(midAngle) * (len * 0.56));
    ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
    ctx.stroke();
  }
}

function drawRangerImpactFrame(
  ctx: CanvasRenderingContext2D,
  progress: number,
  theme: VfxColorTheme,
): void {
  const alpha = progress < 0.74 ? 1 : (1 - progress) / 0.26;
  ctx.globalAlpha = clampUnit(alpha);
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 18;

  const reticleRadius = Math.max(12, 54 - progress * 34);
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = Math.max(2, (1 - progress) * 4.5);
  ctx.beginPath();
  ctx.arc(0, 0, reticleRadius, 0, Math.PI * 2);
  ctx.stroke();

  const crossLen = 20 + progress * 54;
  ctx.strokeStyle = theme.core;
  ctx.lineWidth = Math.max(2, (1 - progress) * 6);
  ctx.beginPath();
  ctx.moveTo(-crossLen, 0);
  ctx.lineTo(crossLen, 0);
  ctx.moveTo(0, -crossLen * 0.72);
  ctx.lineTo(0, crossLen * 0.72);
  ctx.stroke();

  ctx.save();
  ctx.rotate(Math.PI / 4);
  const diamond = 16 + progress * 46;
  ctx.strokeStyle = theme.secondary;
  ctx.lineWidth = Math.max(1.5, (1 - progress) * 4);
  ctx.strokeRect(-diamond / 2, -diamond / 2, diamond, diamond);
  ctx.restore();

  for (let feather = 0; feather < 6; feather++) {
    const angle = (feather * Math.PI) / 3 + 0.35;
    const dist = 14 + progress * 64;
    ctx.strokeStyle = feather % 2 === 0 ? theme.primary : theme.secondary;
    ctx.lineWidth = Math.max(1.5, (1 - progress) * 3.5);
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * (dist - 14), Math.sin(angle) * (dist - 14));
    ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
    ctx.stroke();
  }
}

function drawClericImpactFrame(
  ctx: CanvasRenderingContext2D,
  progress: number,
  theme: VfxColorTheme,
): void {
  const alpha = progress < 0.75 ? 1 : (1 - progress) / 0.25;
  ctx.globalAlpha = clampUnit(alpha);
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 22;

  const haloR = 20 + progress * 54;
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = Math.max(2, (1 - progress) * 6);
  ctx.beginPath();
  ctx.arc(0, 0, haloR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = theme.secondary;
  ctx.lineWidth = Math.max(1.5, (1 - progress) * 4);
  for (let petal = 0; petal < 8; petal++) {
    const angle = (petal * Math.PI) / 4 + progress * 0.4;
    const px = Math.cos(angle) * (16 + progress * 44);
    const py = Math.sin(angle) * (16 + progress * 44);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(px, py);
    ctx.stroke();
  }

  const crossSize = 18 + Math.sin(Math.min(1, progress * 1.3) * Math.PI) * 34;
  ctx.fillStyle = theme.core;
  ctx.beginPath();
  ctx.moveTo(0, -crossSize);
  ctx.lineTo(crossSize * 0.22, -crossSize * 0.22);
  ctx.lineTo(crossSize, 0);
  ctx.lineTo(crossSize * 0.22, crossSize * 0.22);
  ctx.lineTo(0, crossSize);
  ctx.lineTo(-crossSize * 0.22, crossSize * 0.22);
  ctx.lineTo(-crossSize, 0);
  ctx.lineTo(-crossSize * 0.22, -crossSize * 0.22);
  ctx.closePath();
  ctx.fill();
}

function drawSovereignImpactFrame(
  ctx: CanvasRenderingContext2D,
  progress: number,
  theme: VfxColorTheme,
): void {
  const alpha = progress < 0.74 ? 1 : (1 - progress) / 0.26;
  ctx.globalAlpha = clampUnit(alpha);
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 22;

  const firstSlashT = clampUnit(progress / 0.52);
  const firstAlpha = progress > 0.65 ? Math.max(0, 1 - (progress - 0.65) / 0.35) : 1;
  ctx.save();
  ctx.globalAlpha = alpha * firstAlpha;
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = Math.max(3, (1 - firstSlashT * 0.65) * 16);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-66, -54);
  ctx.quadraticCurveTo(
    lerp(-40, 8, firstSlashT),
    lerp(-36, -6, firstSlashT),
    lerp(-60, 68, firstSlashT),
    lerp(-48, 56, firstSlashT),
  );
  ctx.stroke();

  ctx.strokeStyle = theme.core;
  ctx.lineWidth = Math.max(2, (1 - firstSlashT * 0.65) * 6);
  ctx.stroke();
  ctx.restore();

  if (progress > 0.24) {
    const secondSlashT = clampUnit((progress - 0.24) / 0.5);
    ctx.save();
    ctx.strokeStyle = theme.secondary;
    ctx.lineWidth = Math.max(3, (1 - secondSlashT * 0.65) * 15);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(64, -54);
    ctx.quadraticCurveTo(
      lerp(40, -6, secondSlashT),
      lerp(-36, -6, secondSlashT),
      lerp(58, -68, secondSlashT),
      lerp(-48, 56, secondSlashT),
    );
    ctx.stroke();

    ctx.strokeStyle = theme.core;
    ctx.lineWidth = Math.max(2, (1 - secondSlashT * 0.65) * 6);
    ctx.stroke();
    ctx.restore();
  }

  if (progress > 0.38) {
    const crestT = clampUnit((progress - 0.38) / 0.62);
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = Math.max(1.5, (1 - crestT) * 5);
    ctx.beginPath();
    ctx.arc(0, 0, 20 + crestT * 62, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawMarksmanImpactFrame(
  ctx: CanvasRenderingContext2D,
  progress: number,
  theme: VfxColorTheme,
): void {
  const alpha = progress < 0.72 ? 1 : (1 - progress) / 0.28;
  ctx.globalAlpha = clampUnit(alpha);
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 24;

  const lockRadius = Math.max(10, 62 - progress * 46);
  ctx.strokeStyle = theme.secondary;
  ctx.lineWidth = Math.max(2, (1 - progress) * 5);
  ctx.beginPath();
  ctx.arc(0, 0, lockRadius, 0, Math.PI * 2);
  ctx.stroke();

  const beamHalf = 28 + progress * 58;
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = Math.max(3, (1 - progress) * 14);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-beamHalf, 0);
  ctx.lineTo(beamHalf, 0);
  ctx.stroke();

  ctx.strokeStyle = theme.core;
  ctx.lineWidth = Math.max(2, (1 - progress) * 6);
  ctx.beginPath();
  ctx.moveTo(-beamHalf * 0.9, 0);
  ctx.lineTo(beamHalf * 0.9, 0);
  ctx.moveTo(0, -beamHalf * 0.55);
  ctx.lineTo(0, beamHalf * 0.55);
  ctx.stroke();

  for (let shard = 0; shard < 8; shard++) {
    const angle = (shard * Math.PI) / 4 + 0.2;
    const dist = 12 + progress * 68;
    const size = Math.max(2, (1 - progress) * 7.5);
    ctx.fillStyle = shard % 2 === 0 ? theme.secondary : theme.core;
    ctx.save();
    ctx.translate(Math.cos(angle) * dist, Math.sin(angle) * dist);
    ctx.rotate(angle);
    ctx.fillRect(-size * 0.9, -size * 0.35, size * 1.8, size * 0.7);
    ctx.restore();
  }
}

function drawHealerImpactFrame(
  ctx: CanvasRenderingContext2D,
  progress: number,
  theme: VfxColorTheme,
): void {
  const alpha = progress < 0.76 ? 1 : (1 - progress) / 0.24;
  ctx.globalAlpha = clampUnit(alpha);
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 24;

  for (let ring = 0; ring < 2; ring++) {
    const ringT = clampUnit(progress * 1.15 - ring * 0.18);
    if (ringT <= 0) {
      continue;
    }
    ctx.strokeStyle = ring === 0 ? theme.primary : theme.secondary;
    ctx.lineWidth = Math.max(1.8, (1 - ringT) * 5.5);
    ctx.beginPath();
    ctx.arc(0, 0, 18 + ringT * 58, 0, Math.PI * 2);
    ctx.stroke();
  }

  const petalCount = 6;
  for (let index = 0; index < petalCount; index++) {
    const angle = (index * Math.PI * 2) / petalCount + progress * 0.55;
    const dist = 16 + progress * 48;
    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist - progress * 14;
    const r = Math.max(2.5, (1 - progress) * 8);
    ctx.fillStyle = index % 2 === 0 ? theme.primary : theme.secondary;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const starR = 16 + Math.sin(Math.min(1, progress * 1.25) * Math.PI) * 30;
  ctx.fillStyle = theme.core;
  ctx.beginPath();
  ctx.moveTo(0, -starR);
  ctx.lineTo(starR * 0.26, -starR * 0.26);
  ctx.lineTo(starR, 0);
  ctx.lineTo(starR * 0.26, starR * 0.26);
  ctx.lineTo(0, starR);
  ctx.lineTo(-starR * 0.26, starR * 0.26);
  ctx.lineTo(-starR, 0);
  ctx.lineTo(-starR * 0.26, -starR * 0.26);
  ctx.closePath();
  ctx.fill();
}

function drawChargeAuraFrame(
  ctx: CanvasRenderingContext2D,
  unitClass: UnitClass,
  progress: number,
  theme: VfxColorTheme,
): void {
  const pulse = Math.sin(progress * Math.PI);
  ctx.globalAlpha = clampUnit(0.3 + pulse * 0.7);
  ctx.shadowColor = theme.glow;
  ctx.shadowBlur = 16;

  const baseR = 24 + (1 - progress) * 26;
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, baseR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.rotate(progress * Math.PI * 1.2);
  ctx.strokeStyle = theme.secondary;
  ctx.lineWidth = 2;
  const spokes =
    unitClass === 'arcanist'
      ? 6
      : unitClass === 'cleric' || unitClass === 'healer'
        ? 8
        : 4;
  for (let index = 0; index < spokes; index++) {
    const angle = (index * Math.PI * 2) / spokes;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * (baseR * 0.55), Math.sin(angle) * (baseR * 0.55));
    ctx.lineTo(Math.cos(angle) * (baseR + 10), Math.sin(angle) * (baseR + 10));
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = theme.core;
  ctx.beginPath();
  ctx.arc(0, 0, 5 + pulse * 8, 0, Math.PI * 2);
  ctx.fill();
}

class ProceduralBattleVfxAtlas {
  private impactSheets = new Map<string, HTMLCanvasElement>();
  private chargeSheets = new Map<string, HTMLCanvasElement>();

  public getImpactSheet(
    unitClass: UnitClass,
    palette: BattleVfxPaletteKey,
  ): HTMLCanvasElement | null {
    if (typeof document === 'undefined') {
      return null;
    }
    const cacheKey = `${unitClass}:${palette}`;
    const cached = this.impactSheets.get(cacheKey);
    if (cached) {
      return cached;
    }

    const canvas = document.createElement('canvas');
    canvas.width = IMPACT_FRAME_SIZE * IMPACT_FRAME_COUNT;
    canvas.height = IMPACT_FRAME_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    const theme = getThemeForClassAndPalette(unitClass, palette);
    for (let frameIndex = 0; frameIndex < IMPACT_FRAME_COUNT; frameIndex++) {
      const progress = (frameIndex + 0.5) / IMPACT_FRAME_COUNT;
      ctx.save();
      ctx.beginPath();
      ctx.rect(
        frameIndex * IMPACT_FRAME_SIZE,
        0,
        IMPACT_FRAME_SIZE,
        IMPACT_FRAME_SIZE,
      );
      ctx.clip();
      ctx.translate(
        frameIndex * IMPACT_FRAME_SIZE + IMPACT_FRAME_SIZE / 2,
        IMPACT_FRAME_SIZE / 2,
      );

      if (unitClass === 'vanguard') {
        drawVanguardImpactFrame(ctx, progress, theme);
      } else if (unitClass === 'striker') {
        drawStrikerImpactFrame(ctx, progress, theme);
      } else if (unitClass === 'arcanist') {
        drawArcanistImpactFrame(ctx, progress, theme);
      } else if (unitClass === 'ranger') {
        drawRangerImpactFrame(ctx, progress, theme);
      } else if (unitClass === 'marksman') {
        drawMarksmanImpactFrame(ctx, progress, theme);
      } else if (unitClass === 'cleric') {
        drawClericImpactFrame(ctx, progress, theme);
      } else if (unitClass === 'healer') {
        drawHealerImpactFrame(ctx, progress, theme);
      } else {
        drawSovereignImpactFrame(ctx, progress, theme);
      }

      ctx.restore();
    }

    this.impactSheets.set(cacheKey, canvas);
    return canvas;
  }

  public getChargeSheet(
    unitClass: UnitClass,
    palette: BattleVfxPaletteKey,
  ): HTMLCanvasElement | null {
    if (typeof document === 'undefined') {
      return null;
    }
    const cacheKey = `${unitClass}:${palette}`;
    const cached = this.chargeSheets.get(cacheKey);
    if (cached) {
      return cached;
    }

    const canvas = document.createElement('canvas');
    canvas.width = CHARGE_FRAME_SIZE * CHARGE_FRAME_COUNT;
    canvas.height = CHARGE_FRAME_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }

    const theme = getThemeForClassAndPalette(unitClass, palette);
    for (let frameIndex = 0; frameIndex < CHARGE_FRAME_COUNT; frameIndex++) {
      const progress = (frameIndex + 0.5) / CHARGE_FRAME_COUNT;
      ctx.save();
      ctx.beginPath();
      ctx.rect(
        frameIndex * CHARGE_FRAME_SIZE,
        0,
        CHARGE_FRAME_SIZE,
        CHARGE_FRAME_SIZE,
      );
      ctx.clip();
      ctx.translate(
        frameIndex * CHARGE_FRAME_SIZE + CHARGE_FRAME_SIZE / 2,
        CHARGE_FRAME_SIZE / 2,
      );
      drawChargeAuraFrame(ctx, unitClass, progress, theme);
      ctx.restore();
    }

    this.chargeSheets.set(cacheKey, canvas);
    return canvas;
  }
}

export const battleVfxAtlas = new ProceduralBattleVfxAtlas();

export function drawImpactVfxSpriteFrame(
  ctx: CanvasRenderingContext2D,
  unitClass: UnitClass,
  palette: BattleVfxPaletteKey,
  progress: number,
  centerX: number,
  centerY: number,
  drawSize: number,
  mirrorHorizontal: boolean,
): void {
  const sheet = battleVfxAtlas.getImpactSheet(unitClass, palette);
  if (!sheet || progress <= 0 || progress >= 1) {
    return;
  }

  const frameIndex = Math.min(
    IMPACT_FRAME_COUNT - 1,
    Math.floor(progress * IMPACT_FRAME_COUNT),
  );
  ctx.save();
  ctx.translate(centerX, centerY);
  if (mirrorHorizontal) {
    ctx.scale(-1, 1);
  }
  ctx.drawImage(
    sheet,
    frameIndex * IMPACT_FRAME_SIZE,
    0,
    IMPACT_FRAME_SIZE,
    IMPACT_FRAME_SIZE,
    -drawSize / 2,
    -drawSize / 2,
    drawSize,
    drawSize,
  );
  ctx.restore();
}

export function drawChargeAuraSpriteFrame(
  ctx: CanvasRenderingContext2D,
  unitClass: UnitClass,
  palette: BattleVfxPaletteKey,
  progress: number,
  strength: number,
  centerX: number,
  centerY: number,
  drawSize: number,
): void {
  const sheet = battleVfxAtlas.getChargeSheet(unitClass, palette);
  if (!sheet || strength <= 0.05) {
    return;
  }

  const frameIndex = Math.min(
    CHARGE_FRAME_COUNT - 1,
    Math.floor(clampUnit(progress) * CHARGE_FRAME_COUNT),
  );
  ctx.save();
  ctx.globalAlpha = clampUnit(strength * 0.9);
  ctx.drawImage(
    sheet,
    frameIndex * CHARGE_FRAME_SIZE,
    0,
    CHARGE_FRAME_SIZE,
    CHARGE_FRAME_SIZE,
    centerX - drawSize / 2,
    centerY - drawSize / 2,
    drawSize,
    drawSize,
  );
  ctx.restore();
}

export function resolveVfxPaletteForAction(
  actorFaction: Faction,
  isHealScene: boolean,
): BattleVfxPaletteKey {
  if (isHealScene) {
    return 'heal';
  }
  return actorFaction === 'player' ? 'player' : 'enemy';
}
