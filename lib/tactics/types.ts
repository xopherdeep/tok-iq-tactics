export type TerrainType = 'plains' | 'forest' | 'fortress' | 'chasm';

export type UnitClass =
  | 'vanguard'
  | 'striker'
  | 'arcanist'
  | 'sovereign'
  | 'cleric'
  | 'ranger'
  | 'marksman'
  | 'healer';

export type Faction = 'player' | 'enemy';

export type BoardMode = 'dynamic' | 'classic64';

export type DeploymentPhase = 'CHI_SWAP' | 'ACTIVE';

export type HeroCharacterId =
  | 'black-knight'
  | 'gaea'
  | 'x-keeper'
  | 'luna'
  | 'sol'
  | 'night'
  | 'infinidee';

export type TrenChessGlyph = '♔' | '♕' | '♘' | '♖' | '♗' | '✦';

export type ChampionSkillId =
  | 'abyssalStrike'
  | 'soulDrain'
  | 'shadowBarrier'
  | 'voidNova'
  | 'lanternRally'
  | 'sanctuaryPulse'
  | 'chronoWarp';

export interface ChampionSkillSpec {
  id: ChampionSkillId;
  name: string;
  description: string;
  hpCostPercent: number;
  targetType: 'singleEnemy' | 'self' | 'aoeSelf3x3';
  unlockedAtLevel: number;
}

export interface IqEventRecord {
  delta: number;
  reason: string;
  turnNumber: number;
}

export interface IqRankTier {
  label: string;
  shortLabel: string;
  minIq: number;
  accentHex: string;
  perkSummary: string;
}

export interface IqRatingState {
  current: number;
  peak: number;
  chronoUsedThisBattle: boolean;
  lastDelta: number | null;
  lastReason: string | null;
  history: IqEventRecord[];
}

export interface EnemySightlinePreview {
  enemyId: string;
  enemyName: string;
  targetId: string | null;
  targetName: string | null;
  from: GridCoord;
  destination: GridCoord;
  target: GridCoord | null;
  actionType: 'attack' | 'heal' | 'wait';
}

export interface InitiativeQueueItem {
  unitId: string;
  name: string;
  unitClass: UnitClass;
  faction: Faction;
  speed: number;
  currentHp: number;
  maxHp: number;
  isActive: boolean;
}

export interface ChronoRewindSnapshot {
  units: Unit[];
  turnNumber: number;
  phase: TurnPhase;
  turnQueue: string[];
  activeUnitId: string | null;
  chronoRewindCharges: number;
  playstyle: PlaystyleProfile;
  consumables: ConsumableInventory;
  stats: {
    enemiesDefeated: number;
    stagesCleared: number;
    turnsElapsed: number;
  };
  iqCurrent: number;
  iqPeak: number;
  iqHistory: IqEventRecord[];
}

export type ViewportOrientation = 'landscape' | 'portrait';

export type VoicePitch = 'high' | 'mid' | 'low';

export type BattleProjectileStyle = 'arcane' | 'arrow' | 'radiant' | 'sniper';

export type DifficultyMode = 'story' | 'tactical';

export type EquipmentSlot = 'weapon' | 'accessory';

export type ConsumableType = 'potion' | 'hiPotion' | 'powerTonic';

export type ConsumableInventory = Record<ConsumableType, number>;

export interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipmentSlot;
  price: number;
  summary: string;
  allowedClasses?: UnitClass[];
  attackBonus: number;
  defenseBonus: number;
  moveBonus: number;
  maxHpBonus: number;
  healBonus: number;
  rangeBonus: number;
  critBonus?: number;
  speedBonus?: number;
}

export interface ConsumableItemSpec {
  id: ConsumableType;
  name: string;
  price: number;
  summary: string;
  healAmount: number;
  tempAttackBonus: number;
}

export interface TavernRecruitOffer {
  id: string;
  name: string;
  title: string;
  unitClass: UnitClass;
  cost: number;
  summary: string;
}

export interface ChapterDefinition {
  id: string;
  order: number;
  chapterLabel: string;
  title: string;
  region: string;
  subtitle: string;
  isSkirmish: boolean;
  stageNumber: number;
  recommendedLevel: number;
  maxDeployCount: number;
  goldReward: number;
  mapX: number;
  mapY: number;
  unlockedByChapterId?: string;
  rewardEquipmentId?: string;
  recruitReward?: {
    id: string;
    name: string;
    unitClass: UnitClass;
    title: string;
  };
}

export type GameScreen =
  | 'title'
  | 'worldMap'
  | 'partyPrep'
  | 'playing'
  | 'upgrade'
  | 'victory'
  | 'defeat';

export type TurnPhase = 'player' | 'enemy';

export type TriangleOutcome = 'advantage' | 'disadvantage' | 'neutral';

export type DominantDoctrine =
  | 'balanced'
  | 'arcane'
  | 'guerrilla'
  | 'blitz'
  | 'phalanx';

export interface GridCoord {
  col: number;
  row: number;
}

export interface Tile {
  col: number;
  row: number;
  terrain: TerrainType;
}

export interface Unit {
  id: string;
  name: string;
  unitClass: UnitClass;
  faction: Faction;
  col: number;
  row: number;
  renderX: number;
  renderY: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  move: number;
  speed: number;
  minRange: number;
  maxRange: number;
  canFly: boolean;
  ignoresTerrainDefense: boolean;
  ignoresTerrainEvasion: boolean;
  exertsZoneOfControl: boolean;
  canHeal: boolean;
  healPower: number;
  bonusVsFlyers: number;
  critChance: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  hasMoved: boolean;
  hasActed: boolean;
  tilesMovedThisTurn: number;
  hitFlashTimer: number;
  lungeOffsetX: number;
  lungeOffsetY: number;
  weaponId: string | null;
  accessoryId: string | null;
  tempAttackBonus: number;
  heroId?: HeroCharacterId;
  trenChessGlyph?: TrenChessGlyph;
  hasBloodAndVoid?: boolean;
  shadowBarrierTurns?: number;
  activeSkillId?: ChampionSkillId | null;
}

export interface InspectedUnitDetails {
  id: string;
  name: string;
  unitClass: UnitClass;
  faction: Faction;
  level: number;
  hp: number;
  maxHp: number;
  xp: number;
  xpToNextLevel: number;
  attack: number;
  bonusAttack: number;
  defense: number;
  terrainDefense: number;
  terrainEvasion: number;
  move: number;
  speed: number;
  minRange: number;
  maxRange: number;
  canFly: boolean;
  canHeal: boolean;
  canSelfHeal: boolean;
  healPower: number;
  bonusVsFlyers: number;
  critChance: number;
  ignoresTerrainDefense: boolean;
  ignoresTerrainEvasion: boolean;
  exertsZoneOfControl: boolean;
  hasAura: boolean;
  hasActed: boolean;
  hasMoved: boolean;
  isSelected: boolean;
  canCommand: boolean;
  terrain: TerrainType;
  weaponId: string | null;
  weaponName: string | null;
  accessoryId: string | null;
  accessoryName: string | null;
  tempAttackBonus: number;
  equipmentAttackBonus: number;
  equipmentDefenseBonus: number;
  equipmentMoveBonus: number;
  equipmentSpeedBonus: number;
  equipmentMaxHpBonus: number;
  equipmentHealBonus: number;
  equipmentRangeBonus: number;
  equipmentCritBonus: number;
  canEditEquipment: boolean;
  heroId?: HeroCharacterId;
  trenChessGlyph?: TrenChessGlyph;
  hasBloodAndVoid?: boolean;
  shadowBarrierTurns?: number;
  activeSkillId?: ChampionSkillId | null;
  skills?: ChampionSkillSpec[];
}

export interface CombatForecast {
  attackerId: string;
  defenderId: string;
  attackerDamage: number;
  attackerHitChance: number;
  attackerCritChance: number;
  attackerDeadeyeBonus: number;
  attackerOutcome: TriangleOutcome;
  attackerHasAura: boolean;
  attackerPierceBonus: number;
  attackerAntiAirBonus: number;
  defenderCanCounter: boolean;
  defenderDamage: number;
  defenderHitChance: number;
  defenderCritChance: number;
  defenderWillDie: boolean;
  attackerWillDie: boolean;
  defenderTerrainDefense: number;
  defenderTerrainEvasion: number;
  ignoresTerrain: boolean;
}

export interface PendingMoveSnapshot {
  unitId: string;
  originCol: number;
  originRow: number;
}

export interface UpgradeEffects {
  vanguardBonusMove: number;
  counterBonusDamage: number;
  arcanistBonusAttack: number;
  sovereignAuraAttack: number;
  strikerPierceBonus: number;
  clericBonusHeal: number;
  rangerBonusAttack: number;
  marksmanBonusAttack: number;
  marksmanBonusCrit: number;
  forestStrideEnabled: boolean;
  bonusMaxHp: number;
}

export interface UpgradeOption {
  id: string;
  title: string;
  summary: string;
  tag: string;
  apply: (
    units: Unit[],
    effects: UpgradeEffects,
    nextUnitCounter: number,
  ) => {units: Unit[]; effects: UpgradeEffects; nextUnitCounter: number};
}

export interface PlaystyleProfile {
  arcanistAttacks: number;
  strikerAttacks: number;
  vanguardAttacks: number;
  rangerAttacks: number;
  marksmanAttacks: number;
  clericHeals: number;
  forestEndTurns: number;
  fortressEndTurns: number;
  totalPlayerActions: number;
}

export interface DialogueLine {
  speakerName: string;
  speakerTitle: string;
  speakerClass: UnitClass;
  speakerFaction: Faction;
  text: string;
  voicePitch: VoicePitch;
}

export interface DialogueSceneState {
  lines: DialogueLine[];
  currentIndex: number;
  revealedChars: number;
  charTimer: number;
  blipCooldown: number;
  sceneLabel: string;
}

export interface FloatingCallout {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  age: number;
  duration: number;
}

export interface ProjectileEffect {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  age: number;
  duration: number;
}

export interface ParticleBurst {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  age: number;
  duration: number;
}

export interface ShockwaveRing {
  id: string;
  x: number;
  y: number;
  maxRadius: number;
  color: string;
  age: number;
  duration: number;
}

export interface SlashTrail {
  id: string;
  x: number;
  y: number;
  angle: number;
  color: string;
  age: number;
  duration: number;
}

export interface PhaseBanner {
  title: string;
  subtitle: string;
  accentColor: string;
  age: number;
  duration: number;
}

export interface MoveAnimation {
  unitId: string;
  path: GridCoord[];
  segmentIndex: number;
  segmentProgress: number;
  onComplete: () => void;
}

export type EnemyTelegraphActionType = 'attack' | 'heal' | 'move';

export interface ActiveEnemyActionTelegraph {
  actorId: string;
  actorName: string;
  actorClass: UnitClass;
  actionType: EnemyTelegraphActionType;
  origin: GridCoord;
  destination: GridCoord;
  path: GridCoord[];
  targetId: string | null;
  targetName: string | null;
  targetCoord: GridCoord | null;
  phase: 'moving' | 'targeting';
}

export type ObjectiveType = 'rout' | 'defeatBoss' | 'defend' | 'escape';

export interface StageBlueprint {
  stageNumber: number;
  title: string;
  subtitle: string;
  board: Tile[][];
  boardCols: number;
  boardRows: number;
  playerSpawns: GridCoord[];
  enemySquad: Array<{unitClass: UnitClass; col: number; row: number; name: string}>;
  calloutText: string;
  objectiveType?: ObjectiveType;
  defendTurns?: number;
  escapeRow?: number;
}

export interface HitBoxRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type BattlePhaseStep =
  | 'intro'
  | 'primaryDash'
  | 'primaryImpact'
  | 'primaryReturn'
  | 'counterDash'
  | 'counterImpact'
  | 'counterReturn'
  | 'xpSummary'
  | 'outro';

export interface BattleCombatantState {
  unitId: string;
  name: string;
  unitClass: UnitClass;
  faction: Faction;
  level: number;
  displayHp: number;
  targetHp: number;
  maxHp: number;
  displayXp: number;
  targetXp: number;
  xpToNextLevel: number;
  terrain: TerrainType;
  offsetX: number;
  offsetY: number;
  hitFlash: number;
  dissolveProgress: number;
  isDefeated: boolean;
}

export interface BattleFloatingNumber {
  xRatio: number;
  yRatio: number;
  text: string;
  color: string;
  age: number;
  duration: number;
  isHeadline?: boolean;
}

export interface BattleSceneState {
  step: BattlePhaseStep;
  stepAge: number;
  transitionAlpha: number;
  battleTerrain: TerrainType;
  isHealScene: boolean;
  healAmount: number;
  playerSide: BattleCombatantState;
  enemySide: BattleCombatantState;
  attackerFaction: Faction;
  primaryDamage: number;
  primaryHit: boolean;
  primaryCrit: boolean;
  primaryTag: string | null;
  primaryOutcome: TriangleOutcome;
  hasCounter: boolean;
  counterDamage: number;
  counterHit: boolean;
  counterCrit: boolean;
  xpGained: number;
  levelUpLabels: string[];
  headline: string;
  subline: string;
  shakeMagnitude: number;
  hitStopTimer: number;
  activeStepDuration: number;
  slashProgress: number;
  slashTargetFaction: Faction | null;
  vfxActorClass: UnitClass | null;
  vfxPalette: 'player' | 'enemy' | 'heal';
  vfxProgress: number;
  vfxTargetFaction: Faction | null;
  beamProgress: number;
  beamDirection: 'leftToRight' | 'rightToLeft' | null;
  beamColor: string;
  beamStyle: BattleProjectileStyle;
  healHaloAge: number;
  levelUpPillarAge: number;
  xpTickCooldown: number;
  floatingNumbers: BattleFloatingNumber[];
  cutInText?: string | null;
  cutInTone?: 'gold' | 'cyan' | null;
  sparks: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    age: number;
    duration: number;
  }>;
}

export interface CampaignSaveData {
  boardMode: BoardMode;
  difficulty: DifficultyMode;
  stageNumber: number;
  activeChapterId: string;
  completedChapterIds: string[];
  gold: number;
  inventoryEquipmentIds: string[];
  consumables: ConsumableInventory;
  deployedUnitIds: string[];
  recruitedTavernIds: string[];
  effects: UpgradeEffects;
  acquiredUpgradeTitles: string[];
  playstyle: PlaystyleProfile;
  nextUnitCounter: number;
  stats: {
    enemiesDefeated: number;
    stagesCleared: number;
    turnsElapsed: number;
  };
  iqRating?: number;
  peakIq?: number;
  roster: Unit[];
}

export interface GameSnapshot {
  screen: GameScreen;
  boardMode: BoardMode;
  viewportOrientation: ViewportOrientation;
  hasSavedCampaign: boolean;
  stageNumber: number;
  stageTitle: string;
  turnNumber: number;
  phase: TurnPhase;
  board: Tile[][];
  boardCols: number;
  boardRows: number;
  units: Unit[];
  selectedUnitId: string | null;
  hoveredTile: GridCoord | null;
  reachableTiles: Map<string, GridCoord[]>;
  threatenedTileKeys: Set<string>;
  attackableEnemyIds: Set<string>;
  healableAllyIds: Set<string>;
  pendingMove: PendingMoveSnapshot | null;
  effects: UpgradeEffects;
  acquiredUpgradeTitles: string[];
  playstyle: PlaystyleProfile;
  dominantDoctrine: DominantDoctrine;
  adaptationNote: string;
  stageCallout: string | null;
  upgradeChoices: UpgradeOption[];
  hoveredCanvasButtonId: string | null;
  floatingCallouts: FloatingCallout[];
  projectiles: ProjectileEffect[];
  particles: ParticleBurst[];
  shockwaves: ShockwaveRing[];
  slashTrails: SlashTrail[];
  phaseBanner: PhaseBanner | null;
  activeEnemyAction: ActiveEnemyActionTelegraph | null;
  dialogueScene: DialogueSceneState | null;
  battleScene: BattleSceneState | null;
  shakeMagnitude: number;
  deploymentPhase: DeploymentPhase;
  deploymentSpawns: GridCoord[];
  iqState: IqRatingState;
  enemySightline: EnemySightlinePreview | null;
  canChronoRewind: boolean;
  chronoRewindCharges: number;
  maxChronoRewindCharges: number;
  activeUnitId: string | null;
  initiativeQueue: InitiativeQueueItem[];
  objectiveType?: ObjectiveType;
  objectiveSummary?: string;
  defendTurnsRemaining?: number;
  stats: {
    enemiesDefeated: number;
    stagesCleared: number;
    turnsElapsed: number;
  };
}
