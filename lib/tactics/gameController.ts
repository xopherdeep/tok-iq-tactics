import {tacticalAudio, type SoundCue} from './audio';
import {
  getClassAttackChoreography,
  resolveVfxPaletteForAction,
} from './battleAnimationEngine';
import {
  CAMPAIGN_CHAPTERS,
  getChapterById,
  isChapterUnlocked,
} from './chapters';
import {
  buildCombatForecast,
  computeCriticalDamage,
  getManhattanDistance,
  hasAdjacentSovereignAura,
  hasBrotherhoodPactBond,
} from './combat';
import {
  createUnitFromArchetype,
  INITIAL_PLAYSTYLE,
  INITIAL_UPGRADE_EFFECTS,
  PALETTE,
  TERRAIN_CONFIG,
  UNIT_ARCHETYPES,
  UPGRADE_CATALOG,
} from './constants';
import {
  getBossEngagementDialogue,
  getStageIntroDialogue,
  getStageVictoryDialogue,
} from './dialogueScripts';
import {chooseBestEnemyDecision} from './enemyAi';
import {
  createInitialIqState,
  describeIqCounterDoctrine,
  evaluatePlayerCombatIq,
  evaluatePlayerHealIq,
  evaluatePlayerPositioningIq,
  getIqRankTier,
  hasSharpStrategistSightline,
  recordIqDelta,
} from './iqSystem';
import {applyCombatXpToUnit, applySupportXpToUnit} from './leveling';
import {
  canUnitEquipItem,
  computeUnitEquipmentBonuses,
  CONSUMABLE_CATALOG,
  getEquipmentById,
  getUnitEffectiveStats,
  INITIAL_CONSUMABLES,
  INITIAL_EQUIPMENT_INVENTORY,
  STARTING_GOLD,
  TAVERN_RECRUITS,
} from './rpgCatalog';
import {
  computeReachableTiles,
  computeTotalThreatenedTileKeys,
  coordToKey,
  getAttackableEnemiesFromPosition,
  getHealableAlliesFromPosition,
  getUnitAtCoord,
} from './pathfinding';
import {
  buildStageBlueprint,
  describeAdaptation,
  determineDominantDoctrine,
} from './stages';
import type {
  BattleCombatantState,
  BattleProjectileStyle,
  BattleSceneState,
  BoardMode,
  CampaignSaveData,
  ChronoRewindSnapshot,
  CombatForecast,
  ConsumableInventory,
  ConsumableType,
  DeploymentPhase,
  DialogueLine,
  DifficultyMode,
  EquipmentSlot,
  GameSnapshot,
  GridCoord,
  InspectedUnitDetails,
  MoveAnimation,
  TerrainType,
  Unit,
  UpgradeOption,
  ViewportOrientation,
} from './types';

const CAMPAIGN_STORAGE_KEY = 'tox_brotherhood_campaign_v1';

export interface TwinCommanderStatus {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  bonded: boolean;
}

export interface VictoryRewardBanner {
  chapterTitle: string;
  goldEarned: number;
  rewardItemName: string | null;
  recruitName: string | null;
}

interface PendingBattleContext {
  attacker: Unit;
  defender: Unit;
  primaryApplied: boolean;
  counterApplied: boolean;
  xpApplied: boolean;
  forecast?: CombatForecast;
  allyHpBeforeHeal?: number;
  counterDamageTaken: number;
  onComplete: () => void;
}

export interface HudSummary {
  screen: GameSnapshot['screen'];
  boardMode: BoardMode;
  deploymentPhase: DeploymentPhase;
  stageNumber: number;
  stageTitle: string;
  boardCols: number;
  boardRows: number;
  turnNumber: number;
  phase: GameSnapshot['phase'];
  canUndoMove: boolean;
  canWaitSelected: boolean;
  canSelfHealSelected: boolean;
  canUseItemSelected: boolean;
  selectedUnitNeedsHeal: boolean;
  readyPlayerUnits: number;
  totalPlayerUnits: number;
  aliveEnemies: number;
  adaptationNote: string;
  acquiredUpgradeTitles: string[];
  isAnimating: boolean;
  inspectedUnit: InspectedUnitDetails | null;
  difficulty: DifficultyMode;
  gold: number;
  activeChapterId: string;
  completedChapterIds: string[];
  campaignRoster: Unit[];
  deployedUnitIds: string[];
  inventoryEquipmentIds: string[];
  consumables: ConsumableInventory;
  recruitedTavernIds: string[];
  lastVictoryReward: VictoryRewardBanner | null;
  twinCommanders: TwinCommanderStatus[];
  iqCurrent: number;
  iqPeak: number;
  iqRankLabel: string;
  iqRankAccent: string;
  iqLastDelta: number | null;
  iqLastReason: string | null;
  canChronoRewind: boolean;
  chronoUsedThisBattle: boolean;
}

function readSavedCampaign(): CampaignSaveData | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(CAMPAIGN_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CampaignSaveData;
    const isValidSave =
      typeof parsed?.stageNumber === 'number' &&
      Array.isArray(parsed?.roster) &&
      parsed.roster.length > 0;
    return isValidSave ? parsed : null;
  } catch {
    return null;
  }
}

function writeSavedCampaign(data: CampaignSaveData): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(data));
  } catch {
    return;
  }
}

function getMovementSoundCue(unit: Unit): SoundCue {
  if (unit.canFly) {
    return 'wingFlap';
  }
  if (unit.unitClass === 'vanguard') {
    return 'stepHeavy';
  }
  return 'stepLight';
}

function getProjectileStyleForUnit(unit: Unit): BattleProjectileStyle | null {
  if (unit.unitClass === 'arcanist') {
    return 'arcane';
  }
  if (unit.unitClass === 'ranger') {
    return 'arrow';
  }
  if (unit.unitClass === 'marksman') {
    return 'sniper';
  }
  if (unit.unitClass === 'cleric' || unit.unitClass === 'healer') {
    return 'radiant';
  }
  return null;
}

function resolveProjectileBeamColor(
  projectileStyle: BattleProjectileStyle,
  faction: Unit['faction'],
): string {
  if (projectileStyle === 'arrow') {
    return PALETTE.rangerColor;
  }
  if (projectileStyle === 'sniper') {
    return PALETTE.marksmanColor;
  }
  if (projectileStyle === 'radiant') {
    return PALETTE.healColor;
  }
  return faction === 'player' ? PALETTE.playerPrimary : PALETTE.enemyPrimary;
}

function getVoiceBlipCue(pitch: DialogueLine['voicePitch']): SoundCue {
  if (pitch === 'high') {
    return 'dialogueBlipHigh';
  }
  if (pitch === 'low') {
    return 'dialogueBlipLow';
  }
  return 'dialogueBlipMid';
}

export class TacticsGameController {
  private snapshot: GameSnapshot;
  private activeMoveAnimation: MoveAnimation | null = null;
  private battleContext: PendingBattleContext | null = null;
  private onDialogueComplete: (() => void) | null = null;
  private bossDialogueShownThisStage = false;
  private pendingTimeouts: number[] = [];
  private nextUnitCounter = 10;
  private nextEffectCounter = 1;
  private isBusy = false;
  private inspectedUnitId: string | null = null;
  private difficulty: DifficultyMode = 'story';
  private gold = STARTING_GOLD;
  private activeChapterId = CAMPAIGN_CHAPTERS[0].id;
  private completedChapterIds: string[] = [];
  private campaignRoster: Unit[] = [];
  private deployedUnitIds: string[] = [];
  private inventoryEquipmentIds: string[] = [];
  private consumables: ConsumableInventory = {...INITIAL_CONSUMABLES};
  private recruitedTavernIds: string[] = [];
  private lastVictoryReward: VictoryRewardBanner | null = null;
  private chronoSnapshot: ChronoRewindSnapshot | null = null;
  private onHudChange: (hud: HudSummary) => void;

  constructor(onHudChange: (hud: HudSummary) => void) {
    this.onHudChange = onHudChange;
    const saved = readSavedCampaign();
    const initialMode: BoardMode = saved?.boardMode ?? 'dynamic';
    const initialIqState = createInitialIqState(saved?.iqRating, saved?.peakIq);
    const initialOrientation: ViewportOrientation =
      typeof window !== 'undefined' &&
      window.innerHeight > window.innerWidth * 1.05
        ? 'portrait'
        : 'landscape';
    const initialBlueprint = buildStageBlueprint(
      1,
      INITIAL_PLAYSTYLE,
      initialMode,
      initialOrientation,
    );
    this.snapshot = {
      screen: 'title',
      boardMode: initialMode,
      viewportOrientation: initialOrientation,
      hasSavedCampaign: saved !== null,
      stageNumber: 1,
      stageTitle: initialBlueprint.title,
      turnNumber: 1,
      phase: 'player',
      board: initialBlueprint.board,
      boardCols: initialBlueprint.boardCols,
      boardRows: initialBlueprint.boardRows,
      units: [],
      selectedUnitId: null,
      hoveredTile: null,
      reachableTiles: new Map(),
      threatenedTileKeys: new Set(),
      attackableEnemyIds: new Set(),
      healableAllyIds: new Set(),
      pendingMove: null,
      effects: {...INITIAL_UPGRADE_EFFECTS},
      acquiredUpgradeTitles: [],
      playstyle: {...INITIAL_PLAYSTYLE},
      dominantDoctrine: 'balanced',
      adaptationNote: describeIqCounterDoctrine(
        'balanced',
        initialIqState.current,
      ),
      stageCallout: initialBlueprint.calloutText,
      upgradeChoices: [],
      hoveredCanvasButtonId: null,
      floatingCallouts: [],
      projectiles: [],
      particles: [],
      shockwaves: [],
      slashTrails: [],
      phaseBanner: null,
      activeEnemyAction: null,
      dialogueScene: null,
      battleScene: null,
      shakeMagnitude: 0,
      deploymentPhase: 'ACTIVE',
      deploymentSpawns: [],
      iqState: initialIqState,
      enemySightline: null,
      canChronoRewind: false,
      stats: {
        enemiesDefeated: 0,
        stagesCleared: 0,
        turnsElapsed: 0,
      },
    };
  }

  public getSnapshot(): GameSnapshot {
    return this.snapshot;
  }

  public isInBattleScene(): boolean {
    return this.snapshot.battleScene !== null;
  }

  public isInDialogueScene(): boolean {
    return this.snapshot.dialogueScene !== null;
  }

  public getHudSummary(): HudSummary {
    const playerUnits = this.snapshot.units.filter(
      (unit) => unit.faction === 'player' && unit.hp > 0,
    );
    const enemyUnits = this.snapshot.units.filter(
      (unit) => unit.faction === 'enemy' && unit.hp > 0,
    );
    const readyPlayerUnits = playerUnits.filter((unit) => !unit.hasActed).length;
    const selectedUnit = this.getSelectedUnit();
    const isInteractiveTurn =
      this.snapshot.screen === 'playing' &&
      this.snapshot.phase === 'player' &&
      this.snapshot.deploymentPhase === 'ACTIVE' &&
      !this.isBusy &&
      this.snapshot.dialogueScene === null;
    const isReadyPlayerSelected =
      selectedUnit !== undefined &&
      selectedUnit.faction === 'player' &&
      !selectedUnit.hasActed;
    const canWaitSelected = isInteractiveTurn && isReadyPlayerSelected;
    const selectedUnitNeedsHeal =
      isReadyPlayerSelected && selectedUnit.hp < selectedUnit.maxHp;
    const canSelfHealSelected =
      canWaitSelected &&
      selectedUnit !== undefined &&
      selectedUnit.canHeal &&
      selectedUnitNeedsHeal;
    const hasAnyConsumable =
      this.consumables.potion > 0 ||
      this.consumables.hiPotion > 0 ||
      this.consumables.powerTonic > 0;
    const canUseItemSelected = canWaitSelected && hasAnyConsumable;

    const twinCommanders: TwinCommanderStatus[] = this.snapshot.units
      .filter(
        (unit) => unit.faction === 'player' && unit.unitClass === 'sovereign',
      )
      .map((unit) => ({
        id: unit.id,
        name: unit.name.split(',')[0],
        hp: Math.max(0, unit.hp),
        maxHp: unit.maxHp,
        bonded:
          unit.hp > 0 &&
          hasBrotherhoodPactBond(unit, unit, this.snapshot.units),
      }));

    const iqTier = getIqRankTier(this.snapshot.iqState.current);
    const canChronoRewind =
      isInteractiveTurn &&
      this.chronoSnapshot !== null &&
      !this.snapshot.iqState.chronoUsedThisBattle &&
      this.snapshot.iqState.current >= 10;
    this.snapshot.canChronoRewind = canChronoRewind;

    return {
      screen: this.snapshot.screen,
      boardMode: this.snapshot.boardMode,
      deploymentPhase: this.snapshot.deploymentPhase,
      stageNumber: this.snapshot.stageNumber,
      stageTitle: this.snapshot.stageTitle,
      boardCols: this.snapshot.boardCols,
      boardRows: this.snapshot.boardRows,
      turnNumber: this.snapshot.turnNumber,
      phase: this.snapshot.phase,
      canUndoMove: isInteractiveTurn && this.snapshot.pendingMove !== null,
      canWaitSelected,
      canSelfHealSelected,
      canUseItemSelected,
      selectedUnitNeedsHeal,
      readyPlayerUnits,
      totalPlayerUnits: playerUnits.length,
      aliveEnemies: enemyUnits.length,
      adaptationNote: this.snapshot.adaptationNote,
      acquiredUpgradeTitles: this.snapshot.acquiredUpgradeTitles,
      isAnimating: this.isBusy || this.snapshot.dialogueScene !== null,
      inspectedUnit: this.buildInspectedUnitDetails(),
      difficulty: this.difficulty,
      gold: this.gold,
      activeChapterId: this.activeChapterId,
      completedChapterIds: [...this.completedChapterIds],
      campaignRoster: this.campaignRoster.map((unit) => ({...unit})),
      deployedUnitIds: [...this.deployedUnitIds],
      inventoryEquipmentIds: [...this.inventoryEquipmentIds],
      consumables: {...this.consumables},
      recruitedTavernIds: [...this.recruitedTavernIds],
      lastVictoryReward: this.lastVictoryReward,
      twinCommanders,
      iqCurrent: this.snapshot.iqState.current,
      iqPeak: this.snapshot.iqState.peak,
      iqRankLabel: iqTier.label,
      iqRankAccent: iqTier.accentHex,
      iqLastDelta: this.snapshot.iqState.lastDelta,
      iqLastReason: this.snapshot.iqState.lastReason,
      canChronoRewind,
      chronoUsedThisBattle: this.snapshot.iqState.chronoUsedThisBattle,
    };
  }

  public dismissInspectedUnit(): void {
    if (!this.inspectedUnitId) {
      return;
    }
    this.inspectedUnitId = null;
    tacticalAudio.play('cancel');
    this.emitHud();
  }

  private buildInspectedUnitDetails(): InspectedUnitDetails | null {
    const canShowInspector =
      this.snapshot.screen === 'playing' &&
      this.snapshot.dialogueScene === null &&
      this.snapshot.battleScene === null &&
      this.inspectedUnitId !== null;
    if (!canShowInspector) {
      return null;
    }

    const unit = this.snapshot.units.find(
      (candidate) => candidate.id === this.inspectedUnitId && candidate.hp > 0,
    );
    if (!unit) {
      return null;
    }

    const tile = this.snapshot.board[unit.row]?.[unit.col];
    const terrain: TerrainType = tile?.terrain ?? 'plains';
    const terrainMeta = TERRAIN_CONFIG[terrain];
    const hasAura = hasAdjacentSovereignAura(unit, unit, this.snapshot.units);
    const gear = computeUnitEquipmentBonuses(unit);
    const effectiveStats = getUnitEffectiveStats(unit, this.snapshot.effects);
    const weapon = getEquipmentById(unit.weaponId);
    const accessory = getEquipmentById(unit.accessoryId);

    const auraAttack = hasAura
      ? unit.faction === 'player'
        ? this.snapshot.effects.sovereignAuraAttack
        : 1
      : 0;
    const bonusAttack = auraAttack + effectiveStats.equipmentAttackBonus;
    const isSelected = this.snapshot.selectedUnitId === unit.id;
    const isPlayerInteractive =
      this.snapshot.phase === 'player' &&
      !this.isBusy &&
      unit.faction === 'player' &&
      !unit.hasActed;
    const canCommand = isPlayerInteractive && isSelected;
    const canSelfHeal = canCommand && unit.canHeal && unit.hp < unit.maxHp;

    return {
      id: unit.id,
      name: unit.name,
      unitClass: unit.unitClass,
      faction: unit.faction,
      level: unit.level,
      hp: unit.hp,
      maxHp: unit.maxHp,
      xp: unit.xp,
      xpToNextLevel: unit.xpToNextLevel,
      attack: unit.attack,
      bonusAttack,
      defense: unit.defense,
      terrainDefense: terrainMeta.defenseBonus,
      terrainEvasion: terrainMeta.evasionBonus,
      move: effectiveStats.move,
      minRange: unit.minRange,
      maxRange: effectiveStats.maxRange,
      canFly: unit.canFly,
      canHeal: unit.canHeal,
      canSelfHeal,
      healPower: effectiveStats.healPower,
      critChance: effectiveStats.critChance,
      bonusVsFlyers: unit.bonusVsFlyers,
      ignoresTerrainDefense: unit.ignoresTerrainDefense,
      ignoresTerrainEvasion: unit.ignoresTerrainEvasion,
      exertsZoneOfControl: unit.exertsZoneOfControl,
      hasAura,
      hasActed: unit.hasActed,
      hasMoved: unit.hasMoved,
      isSelected,
      canCommand,
      terrain,
      weaponId: weapon?.id ?? null,
      weaponName: weapon?.name ?? null,
      accessoryId: accessory?.id ?? null,
      accessoryName: accessory?.name ?? null,
      tempAttackBonus: unit.tempAttackBonus ?? 0,
      equipmentAttackBonus: gear.attackBonus,
      equipmentDefenseBonus: gear.defenseBonus,
      equipmentMoveBonus: gear.moveBonus,
      equipmentMaxHpBonus: gear.maxHpBonus,
      equipmentHealBonus: gear.healBonus,
      equipmentRangeBonus: gear.rangeBonus,
      equipmentCritBonus: gear.critBonus,
      canEditEquipment: isPlayerInteractive,
    };
  }

  public dispose(): void {
    this.clearScheduledTimeouts();
  }

  private emitHud(): void {
    this.onHudChange(this.getHudSummary());
  }

  private schedule(callback: () => void, delayMs: number): void {
    const handle = window.setTimeout(() => {
      this.pendingTimeouts = this.pendingTimeouts.filter((id) => id !== handle);
      callback();
    }, delayMs);
    this.pendingTimeouts.push(handle);
  }

  private clearScheduledTimeouts(): void {
    for (const handle of this.pendingTimeouts) {
      window.clearTimeout(handle);
    }
    this.pendingTimeouts = [];
  }

  private getSelectedUnit(): Unit | undefined {
    if (!this.snapshot.selectedUnitId) {
      return undefined;
    }
    return this.snapshot.units.find(
      (unit) => unit.id === this.snapshot.selectedUnitId && unit.hp > 0,
    );
  }

  private persistCampaignCheckpoint(): void {
    const savePayload: CampaignSaveData = {
      boardMode: this.snapshot.boardMode,
      difficulty: this.difficulty,
      stageNumber: this.snapshot.stageNumber,
      activeChapterId: this.activeChapterId,
      completedChapterIds: [...this.completedChapterIds],
      gold: this.gold,
      inventoryEquipmentIds: [...this.inventoryEquipmentIds],
      consumables: {...this.consumables},
      deployedUnitIds: [...this.deployedUnitIds],
      recruitedTavernIds: [...this.recruitedTavernIds],
      effects: {...this.snapshot.effects},
      acquiredUpgradeTitles: [...this.snapshot.acquiredUpgradeTitles],
      playstyle: {...this.snapshot.playstyle},
      nextUnitCounter: this.nextUnitCounter,
      stats: {...this.snapshot.stats},
      iqRating: this.snapshot.iqState.current,
      peakIq: this.snapshot.iqState.peak,
      roster: this.campaignRoster.map((unit) => ({
        ...unit,
        tempAttackBonus: 0,
      })),
    };
    writeSavedCampaign(savePayload);
    this.snapshot.hasSavedCampaign = true;
  }

  public setBoardMode(mode: BoardMode): void {
    if (this.snapshot.boardMode === mode) {
      return;
    }
    this.snapshot.boardMode = mode;
    tacticalAudio.play('select');
    if (this.campaignRoster.length > 0) {
      this.persistCampaignCheckpoint();
    }
    this.emitHud();
  }

  public setViewportOrientation(orientation: ViewportOrientation): void {
    if (this.snapshot.viewportOrientation === orientation) {
      return;
    }
    this.snapshot.viewportOrientation = orientation;
  }

  public returnToTitle(): void {
    this.clearScheduledTimeouts();
    this.activeMoveAnimation = null;
    this.battleContext = null;
    this.onDialogueComplete = null;
    this.snapshot.battleScene = null;
    this.snapshot.dialogueScene = null;
    this.inspectedUnitId = null;
    this.isBusy = false;
    this.snapshot.screen = 'title';
    this.snapshot.hasSavedCampaign = readSavedCampaign() !== null;
    tacticalAudio.play('cancel');
    this.emitHud();
  }

  public setDifficulty(difficulty: DifficultyMode): void {
    if (this.difficulty === difficulty) {
      return;
    }
    this.difficulty = difficulty;
    tacticalAudio.play('select');
    this.persistCampaignCheckpoint();
    this.emitHud();
  }

  public selectChapter(chapterId: string): void {
    const chapter = getChapterById(chapterId);
    if (!isChapterUnlocked(chapter, this.completedChapterIds)) {
      tacticalAudio.play('cancel');
      return;
    }
    this.activeChapterId = chapter.id;
    this.ensureValidDeploymentForChapter(chapter.maxDeployCount);
    tacticalAudio.play('select');
    this.persistCampaignCheckpoint();
    this.emitHud();
  }

  public openWorldMap(): void {
    this.clearScheduledTimeouts();
    this.activeMoveAnimation = null;
    this.battleContext = null;
    this.onDialogueComplete = null;
    this.snapshot.battleScene = null;
    this.snapshot.dialogueScene = null;
    this.inspectedUnitId = null;
    this.isBusy = false;
    this.snapshot.screen = 'worldMap';
    this.emitHud();
  }

  public openPartyPrep(chapterId?: string): void {
    if (chapterId) {
      const chapter = getChapterById(chapterId);
      if (isChapterUnlocked(chapter, this.completedChapterIds)) {
        this.activeChapterId = chapter.id;
      }
    }
    const chapter = getChapterById(this.activeChapterId);
    this.ensureValidDeploymentForChapter(chapter.maxDeployCount);
    this.lastVictoryReward = null;
    this.snapshot.screen = 'partyPrep';
    tacticalAudio.play('select');
    this.emitHud();
  }

  public dismissVictoryRewardBanner(): void {
    this.lastVictoryReward = null;
    this.emitHud();
  }

  public toggleUnitDeployment(unitId: string): void {
    const unit = this.campaignRoster.find((item) => item.id === unitId);
    if (!unit || unit.unitClass === 'sovereign') {
      tacticalAudio.play('cancel');
      return;
    }

    const chapter = getChapterById(this.activeChapterId);
    const isCurrentlyDeployed = this.deployedUnitIds.includes(unitId);

    if (isCurrentlyDeployed) {
      this.deployedUnitIds = this.deployedUnitIds.filter((id) => id !== unitId);
      tacticalAudio.play('cancel');
    } else if (this.deployedUnitIds.length < chapter.maxDeployCount) {
      this.deployedUnitIds = [...this.deployedUnitIds, unitId];
      tacticalAudio.play('select');
    } else {
      tacticalAudio.play('cancel');
      return;
    }

    this.persistCampaignCheckpoint();
    this.emitHud();
  }

  public moveDeploymentOrder(unitId: string, direction: -1 | 1): void {
    const index = this.deployedUnitIds.indexOf(unitId);
    const targetIndex = index + direction;
    const isValidSwap =
      index >= 0 &&
      targetIndex >= 0 &&
      targetIndex < this.deployedUnitIds.length;
    if (!isValidSwap) {
      return;
    }

    const nextOrder = [...this.deployedUnitIds];
    const currentId = nextOrder[index];
    nextOrder[index] = nextOrder[targetIndex];
    nextOrder[targetIndex] = currentId;
    this.deployedUnitIds = nextOrder;
    tacticalAudio.play('select');
    this.persistCampaignCheckpoint();
    this.emitHud();
  }

  private canModifyUnitEquipment(unitId: string): boolean {
    if (this.snapshot.screen !== 'playing') {
      return true;
    }
    const isInteractivePlayerPhase =
      this.snapshot.phase === 'player' &&
      !this.isBusy &&
      this.snapshot.dialogueScene === null &&
      this.snapshot.battleScene === null;
    if (!isInteractivePlayerPhase) {
      return false;
    }
    const liveUnit = this.snapshot.units.find(
      (candidate) => candidate.id === unitId && candidate.hp > 0,
    );
    return (
      liveUnit !== undefined &&
      liveUnit.faction === 'player' &&
      !liveUnit.hasActed
    );
  }

  private applyEquipmentChangeToBattleUnit(
    unitId: string,
    nextWeaponId: string | null,
    nextAccessoryId: string | null,
    equippedLabel: string | null,
  ): void {
    if (this.snapshot.screen !== 'playing') {
      return;
    }
    const liveUnit = this.snapshot.units.find(
      (candidate) => candidate.id === unitId && candidate.hp > 0,
    );
    if (!liveUnit) {
      return;
    }

    const previousGear = computeUnitEquipmentBonuses(liveUnit);
    const wasAtFullHp = liveUnit.hp >= liveUnit.maxHp;
    liveUnit.weaponId = nextWeaponId;
    liveUnit.accessoryId = nextAccessoryId;

    const nextGear = computeUnitEquipmentBonuses(liveUnit);
    const maxHpDelta = nextGear.maxHpBonus - previousGear.maxHpBonus;
    if (maxHpDelta !== 0) {
      const nextMaxHp = Math.max(1, liveUnit.maxHp + maxHpDelta);
      liveUnit.maxHp = nextMaxHp;
      if (wasAtFullHp && maxHpDelta > 0) {
        liveUnit.hp = nextMaxHp;
      } else {
        liveUnit.hp = Math.min(nextMaxHp, liveUnit.hp);
      }
    }

    if (this.snapshot.selectedUnitId === liveUnit.id) {
      if (!liveUnit.hasMoved) {
        this.snapshot.reachableTiles = computeReachableTiles(
          liveUnit,
          this.snapshot.board,
          this.snapshot.units,
          this.snapshot.effects,
        );
        this.snapshot.threatenedTileKeys = computeTotalThreatenedTileKeys(
          liveUnit,
          this.snapshot.reachableTiles,
          this.snapshot.board,
        );
      }
      if (liveUnit.faction === 'player' && !liveUnit.hasActed) {
        const enemies = getAttackableEnemiesFromPosition(
          liveUnit,
          liveUnit,
          this.snapshot.units,
        );
        const healAllies = getHealableAlliesFromPosition(
          liveUnit,
          liveUnit,
          this.snapshot.units,
        );
        this.snapshot.attackableEnemyIds = new Set(
          enemies.map((enemy) => enemy.id),
        );
        this.snapshot.healableAllyIds = new Set(
          healAllies.map((ally) => ally.id),
        );
      }
    }

    if (equippedLabel) {
      this.spawnFloatingCallout(
        liveUnit.col,
        liveUnit.row,
        equippedLabel,
        PALETTE.auraColor,
      );
      this.spawnShockwave(liveUnit.col, liveUnit.row, PALETTE.playerPrimary);
    }
  }

  public equipItemOnUnit(unitId: string, equipmentId: string): void {
    if (!this.canModifyUnitEquipment(unitId)) {
      tacticalAudio.play('cancel');
      return;
    }

    const unitIndex = this.campaignRoster.findIndex((item) => item.id === unitId);
    const item = getEquipmentById(equipmentId);
    const inventoryIndex = this.inventoryEquipmentIds.indexOf(equipmentId);
    if (unitIndex < 0 || !item || inventoryIndex < 0) {
      tacticalAudio.play('cancel');
      return;
    }

    const unit = this.campaignRoster[unitIndex];
    if (!canUnitEquipItem(unit, item)) {
      tacticalAudio.play('cancel');
      return;
    }

    const nextInventory = [...this.inventoryEquipmentIds];
    nextInventory.splice(inventoryIndex, 1);

    const previousItemId =
      item.slot === 'weapon' ? unit.weaponId : unit.accessoryId;
    if (previousItemId) {
      nextInventory.push(previousItemId);
    }

    const updatedUnit: Unit =
      item.slot === 'weapon'
        ? {...unit, weaponId: item.id}
        : {...unit, accessoryId: item.id};

    this.campaignRoster[unitIndex] = updatedUnit;
    this.inventoryEquipmentIds = nextInventory;
    this.applyEquipmentChangeToBattleUnit(
      unitId,
      updatedUnit.weaponId,
      updatedUnit.accessoryId,
      item.name,
    );
    tacticalAudio.play('upgradePick');
    this.persistCampaignCheckpoint();
    this.emitHud();
  }

  public unequipSlotFromUnit(unitId: string, slot: EquipmentSlot): void {
    if (!this.canModifyUnitEquipment(unitId)) {
      tacticalAudio.play('cancel');
      return;
    }

    const unitIndex = this.campaignRoster.findIndex((item) => item.id === unitId);
    if (unitIndex < 0) {
      return;
    }
    const unit = this.campaignRoster[unitIndex];
    const currentItemId = slot === 'weapon' ? unit.weaponId : unit.accessoryId;
    if (!currentItemId) {
      return;
    }

    const updatedUnit: Unit =
      slot === 'weapon'
        ? {...unit, weaponId: null}
        : {...unit, accessoryId: null};

    this.inventoryEquipmentIds = [...this.inventoryEquipmentIds, currentItemId];
    this.campaignRoster[unitIndex] = updatedUnit;
    this.applyEquipmentChangeToBattleUnit(
      unitId,
      updatedUnit.weaponId,
      updatedUnit.accessoryId,
      null,
    );
    tacticalAudio.play('cancel');
    this.persistCampaignCheckpoint();
    this.emitHud();
  }

  public buyEquipmentItem(equipmentId: string): void {
    const item = getEquipmentById(equipmentId);
    if (!item || this.gold < item.price) {
      tacticalAudio.play('cancel');
      return;
    }
    this.gold -= item.price;
    this.inventoryEquipmentIds = [...this.inventoryEquipmentIds, item.id];
    tacticalAudio.play('upgradePick');
    this.persistCampaignCheckpoint();
    this.emitHud();
  }

  public buyAndEquipEquipmentItem(unitId: string, equipmentId: string): void {
    const unitIndex = this.campaignRoster.findIndex(
      (candidate) => candidate.id === unitId,
    );
    const item = getEquipmentById(equipmentId);
    if (unitIndex < 0 || !item || this.gold < item.price) {
      tacticalAudio.play('cancel');
      return;
    }

    const unit = this.campaignRoster[unitIndex];
    if (!canUnitEquipItem(unit, item)) {
      tacticalAudio.play('cancel');
      return;
    }

    const previousItemId =
      item.slot === 'weapon' ? unit.weaponId : unit.accessoryId;
    const nextInventory = previousItemId
      ? [...this.inventoryEquipmentIds, previousItemId]
      : [...this.inventoryEquipmentIds];
    const updatedUnit: Unit =
      item.slot === 'weapon'
        ? {...unit, weaponId: item.id}
        : {...unit, accessoryId: item.id};

    this.gold -= item.price;
    this.campaignRoster[unitIndex] = updatedUnit;
    this.inventoryEquipmentIds = nextInventory;
    tacticalAudio.play('levelUp');
    this.persistCampaignCheckpoint();
    this.emitHud();
  }

  public buyConsumableItem(consumableId: ConsumableType): void {
    const spec = CONSUMABLE_CATALOG[consumableId];
    if (!spec || this.gold < spec.price) {
      tacticalAudio.play('cancel');
      return;
    }
    this.gold -= spec.price;
    this.consumables = {
      ...this.consumables,
      [consumableId]: this.consumables[consumableId] + 1,
    };
    tacticalAudio.play('upgradePick');
    this.persistCampaignCheckpoint();
    this.emitHud();
  }

  public recruitTavernHero(offerId: string): void {
    const offer = TAVERN_RECRUITS.find((entry) => entry.id === offerId);
    const alreadyRecruited = this.recruitedTavernIds.includes(offerId);
    if (!offer || alreadyRecruited || this.gold < offer.cost) {
      tacticalAudio.play('cancel');
      return;
    }

    this.gold -= offer.cost;
    this.recruitedTavernIds = [...this.recruitedTavernIds, offer.id];

    const averageLevel = Math.max(
      1,
      Math.floor(
        this.campaignRoster.reduce((sum, unit) => sum + unit.level, 0) /
          Math.max(1, this.campaignRoster.length),
      ),
    );
    const recruit = createUnitFromArchetype(
      `p-tavern-${this.nextUnitCounter++}`,
      offer.name,
      offer.unitClass,
      'player',
      0,
      0,
      this.snapshot.effects,
    );
    const bonusLevels = Math.max(0, averageLevel - 1);
    recruit.level = 1 + bonusLevels;
    recruit.maxHp += bonusLevels * 2;
    recruit.hp = recruit.maxHp;
    recruit.attack += Math.floor((bonusLevels + 1) / 2);
    recruit.defense += Math.floor(bonusLevels / 2);
    if (recruit.unitClass === 'marksman') {
      recruit.critChance += bonusLevels * 2;
    }
    if (recruit.canHeal) {
      recruit.healPower += bonusLevels;
    }

    this.campaignRoster = [...this.campaignRoster, recruit];
    const chapter = getChapterById(this.activeChapterId);
    if (this.deployedUnitIds.length < chapter.maxDeployCount) {
      this.deployedUnitIds = [...this.deployedUnitIds, recruit.id];
    }

    tacticalAudio.play('levelUp');
    this.persistCampaignCheckpoint();
    this.emitHud();
  }

  public deployActiveChapter(): void {
    const chapter = getChapterById(this.activeChapterId);
    this.ensureValidDeploymentForChapter(chapter.maxDeployCount);
    const deployedRoster = this.deployedUnitIds
      .map((id) => this.campaignRoster.find((unit) => unit.id === id))
      .filter((unit): unit is Unit => unit !== undefined);

    this.lastVictoryReward = null;
    tacticalAudio.play('newGame');
    this.loadStage(chapter.stageNumber, deployedRoster, chapter.title);
  }

  public retryCurrentChapter(): void {
    this.deployActiveChapter();
  }

  private ensureValidDeploymentForChapter(maxDeployCount: number): void {
    const validIds = this.deployedUnitIds.filter((id) =>
      this.campaignRoster.some((unit) => unit.id === id),
    );
    const twinCommanders = this.campaignRoster.filter(
      (unit) => unit.unitClass === 'sovereign',
    );
    const nextIds: string[] = [];
    for (const commander of twinCommanders) {
      if (!nextIds.includes(commander.id) && nextIds.length < maxDeployCount) {
        nextIds.push(commander.id);
      }
    }
    for (const id of validIds) {
      if (!nextIds.includes(id) && nextIds.length < maxDeployCount) {
        nextIds.push(id);
      }
    }
    for (const unit of this.campaignRoster) {
      if (!nextIds.includes(unit.id) && nextIds.length < maxDeployCount) {
        nextIds.push(unit.id);
      }
    }
    this.deployedUnitIds = nextIds;
  }

  public startNewCampaign(): void {
    this.clearScheduledTimeouts();
    this.activeMoveAnimation = null;
    this.battleContext = null;
    this.onDialogueComplete = null;
    this.snapshot.battleScene = null;
    this.snapshot.dialogueScene = null;
    this.inspectedUnitId = null;
    this.isBusy = false;
    this.nextUnitCounter = 10;

    this.difficulty = 'story';
    this.gold = STARTING_GOLD;
    this.activeChapterId = CAMPAIGN_CHAPTERS[0].id;
    this.completedChapterIds = [];
    this.inventoryEquipmentIds = [...INITIAL_EQUIPMENT_INVENTORY];
    this.consumables = {...INITIAL_CONSUMABLES};
    this.recruitedTavernIds = [];
    this.lastVictoryReward = null;

    this.snapshot.effects = {...INITIAL_UPGRADE_EFFECTS};
    this.snapshot.acquiredUpgradeTitles = [];
    this.snapshot.playstyle = {...INITIAL_PLAYSTYLE};
    this.snapshot.dominantDoctrine = 'balanced';
    this.snapshot.iqState = createInitialIqState();
    this.chronoSnapshot = null;
    this.snapshot.canChronoRewind = false;
    this.snapshot.adaptationNote = describeIqCounterDoctrine(
      'balanced',
      this.snapshot.iqState.current,
    );
    this.snapshot.stats = {
      enemiesDefeated: 0,
      stagesCleared: 0,
      turnsElapsed: 0,
    };

    this.campaignRoster = [
      createUnitFromArchetype(
        'p-commander-x',
        'X, The Keeper',
        'sovereign',
        'player',
        3,
        7,
        this.snapshot.effects,
      ),
      createUnitFromArchetype(
        'p-commander-sol',
        'Sol',
        'sovereign',
        'player',
        4,
        7,
        this.snapshot.effects,
      ),
      createUnitFromArchetype(
        'p-gaea',
        'Gaea',
        'healer',
        'player',
        2,
        7,
        this.snapshot.effects,
      ),
      createUnitFromArchetype(
        'p-luna',
        'Luna',
        'marksman',
        'player',
        5,
        7,
        this.snapshot.effects,
      ),
      createUnitFromArchetype(
        'p-night',
        'Night',
        'striker',
        'player',
        5,
        6,
        this.snapshot.effects,
      ),
      createUnitFromArchetype(
        'p-mender',
        'Mender',
        'cleric',
        'player',
        1,
        7,
        this.snapshot.effects,
      ),
    ];
    this.deployedUnitIds = this.campaignRoster
      .slice(0, CAMPAIGN_CHAPTERS[0].maxDeployCount)
      .map((unit) => unit.id);
    this.persistCampaignCheckpoint();

    tacticalAudio.play('newGame');
    this.snapshot.screen = 'worldMap';
    this.emitHud();
  }

  public continueSavedCampaign(): void {
    const saved = readSavedCampaign();
    if (!saved) {
      this.startNewCampaign();
      return;
    }

    this.clearScheduledTimeouts();
    this.activeMoveAnimation = null;
    this.battleContext = null;
    this.onDialogueComplete = null;
    this.snapshot.battleScene = null;
    this.snapshot.dialogueScene = null;
    this.inspectedUnitId = null;
    this.isBusy = false;

    this.snapshot.boardMode = saved.boardMode ?? 'dynamic';
    this.difficulty = saved.difficulty ?? 'story';
    this.gold = typeof saved.gold === 'number' ? saved.gold : STARTING_GOLD;
    this.activeChapterId = saved.activeChapterId ?? CAMPAIGN_CHAPTERS[0].id;
    this.completedChapterIds = Array.isArray(saved.completedChapterIds)
      ? [...saved.completedChapterIds]
      : [];
    this.inventoryEquipmentIds = Array.isArray(saved.inventoryEquipmentIds)
      ? [...saved.inventoryEquipmentIds]
      : [];
    this.consumables = saved.consumables
      ? {...INITIAL_CONSUMABLES, ...saved.consumables}
      : {...INITIAL_CONSUMABLES};
    this.recruitedTavernIds = Array.isArray(saved.recruitedTavernIds)
      ? [...saved.recruitedTavernIds]
      : [];
    this.snapshot.effects = {...INITIAL_UPGRADE_EFFECTS, ...saved.effects};
    this.snapshot.acquiredUpgradeTitles = [...saved.acquiredUpgradeTitles];
    this.snapshot.playstyle = {...INITIAL_PLAYSTYLE, ...saved.playstyle};
    this.snapshot.stats = {...saved.stats};
    this.snapshot.iqState = createInitialIqState(saved.iqRating, saved.peakIq);
    this.chronoSnapshot = null;
    this.snapshot.canChronoRewind = false;
    this.nextUnitCounter = saved.nextUnitCounter ?? 10;
    this.campaignRoster = saved.roster.map((unit) => ({
      ...unit,
      critChance:
        unit.critChance ?? UNIT_ARCHETYPES[unit.unitClass].critChance,
      weaponId: unit.weaponId ?? null,
      accessoryId: unit.accessoryId ?? null,
      tempAttackBonus: 0,
    }));
    this.deployedUnitIds = Array.isArray(saved.deployedUnitIds)
      ? [...saved.deployedUnitIds]
      : this.campaignRoster.map((unit) => unit.id);
    this.lastVictoryReward = null;

    const chapter = getChapterById(this.activeChapterId);
    this.ensureValidDeploymentForChapter(chapter.maxDeployCount);

    tacticalAudio.play('newGame');
    this.snapshot.screen = 'worldMap';
    this.emitHud();
  }

  private startDialogueSequence(
    lines: DialogueLine[],
    sceneLabel: string,
    onComplete: () => void,
  ): void {
    if (lines.length === 0) {
      onComplete();
      return;
    }
    this.onDialogueComplete = onComplete;
    this.snapshot.dialogueScene = {
      lines,
      currentIndex: 0,
      revealedChars: 0,
      charTimer: 0,
      blipCooldown: 0,
      sceneLabel,
    };
    this.emitHud();
  }

  public advanceDialogue(): void {
    const scene = this.snapshot.dialogueScene;
    if (!scene) {
      return;
    }

    const currentLine = scene.lines[scene.currentIndex];
    if (!currentLine) {
      this.finishDialogueScene();
      return;
    }

    const isStillTyping = scene.revealedChars < currentLine.text.length;
    if (isStillTyping) {
      scene.revealedChars = currentLine.text.length;
      tacticalAudio.play('select');
      return;
    }

    const hasNextLine = scene.currentIndex + 1 < scene.lines.length;
    if (hasNextLine) {
      scene.currentIndex += 1;
      scene.revealedChars = 0;
      scene.charTimer = 0;
      tacticalAudio.play('dialogueAdvance');
      return;
    }

    tacticalAudio.play('dialogueAdvance');
    this.finishDialogueScene();
  }

  public skipDialogue(): void {
    if (!this.snapshot.dialogueScene) {
      return;
    }
    tacticalAudio.play('cancel');
    this.finishDialogueScene();
  }

  private finishDialogueScene(): void {
    const callback = this.onDialogueComplete;
    this.snapshot.dialogueScene = null;
    this.onDialogueComplete = null;
    this.emitHud();
    if (callback) {
      callback();
    }
  }

  private loadStage(
    stageNumber: number,
    deployedRoster: Unit[],
    chapterTitle?: string,
  ): void {
    this.clearScheduledTimeouts();
    this.activeMoveAnimation = null;
    this.battleContext = null;
    this.onDialogueComplete = null;
    this.snapshot.battleScene = null;
    this.snapshot.dialogueScene = null;
    this.inspectedUnitId = null;
    this.bossDialogueShownThisStage = false;
    this.isBusy = false;

    const blueprint = buildStageBlueprint(
      stageNumber,
      this.snapshot.playstyle,
      this.snapshot.boardMode,
      this.snapshot.viewportOrientation,
    );

    const deployedPlayers = deployedRoster.map((unit, index) => {
      const spawn = blueprint.playerSpawns[index] ?? {
        col: index % blueprint.boardCols,
        row: blueprint.boardRows - 1,
      };
      const gearBonuses = computeUnitEquipmentBonuses(unit);
      const battleMaxHp = unit.maxHp + gearBonuses.maxHpBonus;
      return {
        ...unit,
        col: spawn.col,
        row: spawn.row,
        renderX: spawn.col,
        renderY: spawn.row,
        maxHp: battleMaxHp,
        hp: battleMaxHp,
        tempAttackBonus: 0,
        hasMoved: false,
        hasActed: false,
        tilesMovedThisTurn: 0,
        hitFlashTimer: 0,
        lungeOffsetX: 0,
        lungeOffsetY: 0,
      };
    });

    const isStoryMode = this.difficulty === 'story';
    const baseHpScaling = stageNumber >= 3 ? (stageNumber - 2) * 2 : 0;
    const baseAttackScaling =
      stageNumber >= 4 ? Math.floor((stageNumber - 2) / 2) : 0;
    const storyHpOffset = isStoryMode ? (stageNumber <= 2 ? -3 : -1) : 0;
    const storyAttackOffset = isStoryMode ? -1 : 0;
    const finalHpScaling = baseHpScaling + storyHpOffset;
    const finalAttackScaling = baseAttackScaling + storyAttackOffset;

    const deployedEnemies = blueprint.enemySquad.map((spec, index) => {
      const enemy = createUnitFromArchetype(
        `e-${stageNumber}-${index}`,
        spec.name,
        spec.unitClass,
        'enemy',
        spec.col,
        spec.row,
        this.snapshot.effects,
        finalHpScaling,
        finalAttackScaling,
      );
      enemy.maxHp = Math.max(10, enemy.maxHp);
      enemy.hp = enemy.maxHp;
      enemy.attack = Math.max(4, enemy.attack);
      return enemy;
    });

    const doctrine = determineDominantDoctrine(this.snapshot.playstyle);
    const activeChapter = getChapterById(this.activeChapterId);
    const resolvedTitle = chapterTitle
      ? `${activeChapter.chapterLabel} · ${chapterTitle}`
      : blueprint.title;

    this.snapshot.screen = 'playing';
    this.snapshot.stageNumber = stageNumber;
    this.snapshot.stageTitle = resolvedTitle;
    this.snapshot.turnNumber = 1;
    this.snapshot.phase = 'player';
    this.snapshot.board = blueprint.board;
    this.snapshot.boardCols = blueprint.boardCols;
    this.snapshot.boardRows = blueprint.boardRows;
    this.snapshot.units = [...deployedPlayers, ...deployedEnemies];
    this.snapshot.selectedUnitId = null;
    this.snapshot.reachableTiles = new Map();
    this.snapshot.threatenedTileKeys = new Set();
    this.snapshot.attackableEnemyIds = new Set();
    this.snapshot.healableAllyIds = new Set();
    this.snapshot.pendingMove = null;
    this.snapshot.dominantDoctrine = doctrine;
    this.snapshot.iqState = {
      ...this.snapshot.iqState,
      chronoUsedThisBattle: false,
      lastDelta: null,
      lastReason: null,
      history: [],
    };
    this.chronoSnapshot = null;
    this.snapshot.canChronoRewind = false;
    this.snapshot.deploymentPhase = 'CHI_SWAP';
    this.snapshot.deploymentSpawns = deployedPlayers.map((unit) => ({
      col: unit.col,
      row: unit.row,
    }));
    this.snapshot.enemySightline = null;
    this.snapshot.adaptationNote = describeIqCounterDoctrine(
      doctrine,
      this.snapshot.iqState.current,
    );
    this.snapshot.stageCallout = blueprint.calloutText;
    this.snapshot.floatingCallouts = [];
    this.snapshot.projectiles = [];
    this.snapshot.particles = [];
    this.snapshot.shockwaves = [];
    this.snapshot.slashTrails = [];
    this.snapshot.phaseBanner = null;
    this.snapshot.activeEnemyAction = null;

    const introLines = getStageIntroDialogue(
      stageNumber,
      doctrine,
      this.snapshot.boardMode,
    );
    this.startDialogueSequence(
      introLines,
      `STAGE ${stageNumber} BRIEFING`,
      () => {
        tacticalAudio.play('turnPlayer');
        this.snapshot.phaseBanner = {
          title: 'χ CHI FORMATION',
          subtitle: 'Swap allies on glowing waystones, then Begin Turn 1',
          accentColor: PALETTE.healColor,
          age: 0,
          duration: 1.55,
        };
        this.emitHud();
      },
    );
  }

  public confirmChiDeployment(): void {
    if (
      this.snapshot.screen !== 'playing' ||
      this.snapshot.deploymentPhase !== 'CHI_SWAP' ||
      this.snapshot.dialogueScene !== null ||
      this.isBusy
    ) {
      return;
    }
    this.snapshot.deploymentPhase = 'ACTIVE';
    this.snapshot.selectedUnitId = null;
    this.inspectedUnitId = null;
    tacticalAudio.play('turnPlayer');
    this.snapshot.phaseBanner = {
      title: 'TURN 1 · PLAYER PHASE',
      subtitle: `${this.snapshot.stageTitle} · ${this.snapshot.adaptationNote}`,
      accentColor: PALETTE.playerPrimary,
      age: 0,
      duration: 1.35,
    };
    this.emitHud();
  }

  private captureChronoSnapshot(): void {
    this.chronoSnapshot = {
      units: this.snapshot.units.map((unit) => ({...unit})),
      turnNumber: this.snapshot.turnNumber,
      phase: this.snapshot.phase,
      playstyle: {...this.snapshot.playstyle},
      consumables: {...this.consumables},
      stats: {...this.snapshot.stats},
      iqCurrent: this.snapshot.iqState.current,
      iqPeak: this.snapshot.iqState.peak,
      iqHistory: this.snapshot.iqState.history.map((entry) => ({...entry})),
    };
    this.snapshot.canChronoRewind =
      !this.snapshot.iqState.chronoUsedThisBattle &&
      this.snapshot.iqState.current >= 10;
  }

  public triggerChronoRewind(): void {
    const canRewind =
      this.snapshot.screen === 'playing' &&
      this.snapshot.phase === 'player' &&
      this.snapshot.deploymentPhase === 'ACTIVE' &&
      !this.isBusy &&
      this.snapshot.dialogueScene === null &&
      this.chronoSnapshot !== null &&
      !this.snapshot.iqState.chronoUsedThisBattle &&
      this.snapshot.iqState.current >= 10;
    if (!canRewind || !this.chronoSnapshot) {
      tacticalAudio.play('cancel');
      return;
    }

    const snap = this.chronoSnapshot;
    this.clearScheduledTimeouts();
    this.activeMoveAnimation = null;
    this.battleContext = null;
    this.snapshot.battleScene = null;
    this.snapshot.units = snap.units.map((unit) => ({
      ...unit,
      renderX: unit.col,
      renderY: unit.row,
      lungeOffsetX: 0,
      lungeOffsetY: 0,
      hitFlashTimer: 0,
    }));
    this.snapshot.turnNumber = snap.turnNumber;
    this.snapshot.phase = 'player';
    this.snapshot.playstyle = {...snap.playstyle};
    this.consumables = {...snap.consumables};
    this.snapshot.stats = {...snap.stats};
    this.snapshot.pendingMove = null;
    this.snapshot.selectedUnitId = null;
    this.inspectedUnitId = null;
    this.snapshot.reachableTiles = new Map();
    this.snapshot.threatenedTileKeys = new Set();
    this.snapshot.attackableEnemyIds = new Set();
    this.snapshot.healableAllyIds = new Set();
    this.snapshot.enemySightline = null;
    this.chronoSnapshot = null;

    const restoredIqState = {
      ...this.snapshot.iqState,
      current: snap.iqCurrent,
      peak: snap.iqPeak,
      history: snap.iqHistory,
      chronoUsedThisBattle: true,
    };
    this.snapshot.iqState = recordIqDelta(
      restoredIqState,
      -10,
      'Chrono Rewind',
      this.snapshot.turnNumber,
    );
    this.snapshot.canChronoRewind = false;
    this.snapshot.adaptationNote = describeIqCounterDoctrine(
      this.snapshot.dominantDoctrine,
      this.snapshot.iqState.current,
    );

    const anchorUnit = this.snapshot.units.find(
      (unit) => unit.faction === 'player' && unit.hp > 0,
    );
    if (anchorUnit) {
      this.spawnShockwave(anchorUnit.col, anchorUnit.row, PALETTE.healColor);
      this.spawnFloatingCallout(
        anchorUnit.col,
        anchorUnit.row,
        '-10 IQ · CHRONO',
        PALETTE.healColor,
      );
    }

    tacticalAudio.play('chronoRewind');
    this.snapshot.phaseBanner = {
      title: 'CHRONO REWIND',
      subtitle: '-10 IQ · Timeline restored before your last action',
      accentColor: PALETTE.healColor,
      age: 0,
      duration: 1.4,
    };
    this.emitHud();
  }

  private applyIqAdjustment(
    delta: number,
    reason: string,
    anchorCoord?: GridCoord,
  ): void {
    if (delta === 0) {
      return;
    }
    this.snapshot.iqState = recordIqDelta(
      this.snapshot.iqState,
      delta,
      reason,
      this.snapshot.turnNumber,
    );
    this.snapshot.adaptationNote = describeIqCounterDoctrine(
      this.snapshot.dominantDoctrine,
      this.snapshot.iqState.current,
    );
    tacticalAudio.play(delta > 0 ? 'iqSurge' : 'iqDrop');
    if (anchorCoord) {
      const sign = delta > 0 ? '+' : '';
      this.spawnFloatingCallout(
        anchorCoord.col,
        anchorCoord.row,
        `${sign}${delta} IQ · ${reason}`,
        delta > 0 ? PALETTE.healColor : PALETTE.enemyPrimary,
      );
    }
    this.emitHud();
  }

  public setHoveredTile(coord: GridCoord | null): void {
    this.snapshot.hoveredTile = coord;
    if (
      !coord ||
      this.snapshot.screen !== 'playing' ||
      this.snapshot.dialogueScene !== null ||
      this.snapshot.battleScene !== null ||
      !hasSharpStrategistSightline(this.snapshot.iqState.current)
    ) {
      this.snapshot.enemySightline = null;
      return;
    }

    const hoveredEnemy = getUnitAtCoord(
      this.snapshot.units,
      coord.col,
      coord.row,
    );
    if (!hoveredEnemy || hoveredEnemy.faction !== 'enemy' || hoveredEnemy.hp <= 0) {
      this.snapshot.enemySightline = null;
      return;
    }

    const decision = chooseBestEnemyDecision(
      hoveredEnemy,
      this.snapshot.board,
      this.snapshot.units,
      this.snapshot.effects,
      this.snapshot.dominantDoctrine,
      this.snapshot.iqState.current,
    );
    const targetUnit = decision.targetId
      ? this.snapshot.units.find(
          (unit) => unit.id === decision.targetId && unit.hp > 0,
        )
      : undefined;
    this.snapshot.enemySightline = {
      enemyId: hoveredEnemy.id,
      enemyName: hoveredEnemy.name,
      targetId: targetUnit?.id ?? null,
      targetName: targetUnit?.name ?? null,
      from: {col: hoveredEnemy.col, row: hoveredEnemy.row},
      destination: decision.destination,
      target: targetUnit ? {col: targetUnit.col, row: targetUnit.row} : null,
      actionType: decision.actionType,
    };
  }

  public setHoveredCanvasButton(buttonId: string | null): void {
    const didChangeToNewButton =
      buttonId !== null &&
      buttonId !== this.snapshot.hoveredCanvasButtonId &&
      buttonId !== 'dialogue:advance';
    if (didChangeToNewButton) {
      tacticalAudio.play('menuHover');
    }
    this.snapshot.hoveredCanvasButtonId = buttonId;
  }

  public handleCanvasButtonClick(buttonId: string): void {
    if (buttonId === 'dialogue:skip') {
      this.skipDialogue();
      return;
    }

    if (buttonId === 'dialogue:advance') {
      this.advanceDialogue();
      return;
    }

    if (buttonId === 'mode:dynamic') {
      this.setBoardMode('dynamic');
      return;
    }

    if (buttonId === 'mode:classic64') {
      this.setBoardMode('classic64');
      return;
    }

    if (buttonId === 'new-game' || buttonId === 'deploy') {
      this.startNewCampaign();
      return;
    }

    if (buttonId === 'restart') {
      this.retryCurrentChapter();
      return;
    }

    if (buttonId === 'continue-game') {
      this.continueSavedCampaign();
      return;
    }

    if (buttonId === 'return-title') {
      if (this.snapshot.screen === 'defeat') {
        this.openWorldMap();
        return;
      }
      this.returnToTitle();
      return;
    }

    if (buttonId === 'chi:begin') {
      this.confirmChiDeployment();
      return;
    }

    if (buttonId.startsWith('upgrade:')) {
      const upgradeId = buttonId.slice('upgrade:'.length);
      this.selectUpgradeById(upgradeId);
    }
  }

  public selectUpgradeByIndex(index: number): void {
    if (this.snapshot.screen !== 'upgrade') {
      return;
    }
    const choice = this.snapshot.upgradeChoices[index];
    if (choice) {
      this.selectUpgradeById(choice.id);
    }
  }

  private selectUpgradeById(upgradeId: string): void {
    const choice = this.snapshot.upgradeChoices.find(
      (item) => item.id === upgradeId,
    );
    if (!choice) {
      return;
    }

    const result = choice.apply(
      this.campaignRoster,
      this.snapshot.effects,
      this.nextUnitCounter,
    );

    this.campaignRoster = result.units.map((unit) => ({
      ...unit,
      hp: unit.maxHp,
      tempAttackBonus: 0,
    }));
    this.snapshot.effects = result.effects;
    this.nextUnitCounter = result.nextUnitCounter;
    this.snapshot.acquiredUpgradeTitles = [
      ...this.snapshot.acquiredUpgradeTitles,
      choice.title,
    ];
    const activeChapter = getChapterById(this.activeChapterId);
    this.ensureValidDeploymentForChapter(activeChapter.maxDeployCount);
    this.persistCampaignCheckpoint();
    tacticalAudio.play('upgradePick');
    this.openWorldMap();
  }

  public handleBoardClick(coord: GridCoord): void {
    if (this.snapshot.dialogueScene) {
      this.advanceDialogue();
      return;
    }

    const canAcceptPlayerClick =
      this.snapshot.screen === 'playing' &&
      this.snapshot.phase === 'player' &&
      !this.isBusy;
    if (!canAcceptPlayerClick) {
      return;
    }

    const clickedUnit = getUnitAtCoord(
      this.snapshot.units,
      coord.col,
      coord.row,
    );
    const selectedUnit = this.getSelectedUnit();

    if (this.snapshot.deploymentPhase === 'CHI_SWAP') {
      if (clickedUnit && clickedUnit.faction === 'player') {
        if (!selectedUnit || selectedUnit.faction !== 'player') {
          this.snapshot.selectedUnitId = clickedUnit.id;
          tacticalAudio.play('select');
          this.emitHud();
          return;
        }
        if (selectedUnit.id === clickedUnit.id) {
          this.inspectedUnitId = clickedUnit.id;
          tacticalAudio.play('select');
          this.emitHud();
          return;
        }
        const prevCol = selectedUnit.col;
        const prevRow = selectedUnit.row;
        selectedUnit.col = clickedUnit.col;
        selectedUnit.row = clickedUnit.row;
        selectedUnit.renderX = clickedUnit.col;
        selectedUnit.renderY = clickedUnit.row;
        clickedUnit.col = prevCol;
        clickedUnit.row = prevRow;
        clickedUnit.renderX = prevCol;
        clickedUnit.renderY = prevRow;
        this.snapshot.selectedUnitId = null;
        this.inspectedUnitId = null;
        tacticalAudio.play('chiSwap');
        this.spawnShockwave(selectedUnit.col, selectedUnit.row, PALETTE.healColor);
        this.spawnShockwave(clickedUnit.col, clickedUnit.row, PALETTE.auraColor);
        this.spawnFloatingCallout(
          selectedUnit.col,
          selectedUnit.row,
          'χ SWAP',
          PALETTE.healColor,
        );
        this.emitHud();
        return;
      }

      const isSpawnTile = this.snapshot.deploymentSpawns.some(
        (spawn) => spawn.col === coord.col && spawn.row === coord.row,
      );
      if (
        isSpawnTile &&
        !clickedUnit &&
        selectedUnit &&
        selectedUnit.faction === 'player'
      ) {
        selectedUnit.col = coord.col;
        selectedUnit.row = coord.row;
        selectedUnit.renderX = coord.col;
        selectedUnit.renderY = coord.row;
        this.snapshot.selectedUnitId = null;
        tacticalAudio.play('chiSwap');
        this.spawnShockwave(coord.col, coord.row, PALETTE.healColor);
        this.emitHud();
        return;
      }

      if (clickedUnit && clickedUnit.faction === 'enemy') {
        this.inspectedUnitId = clickedUnit.id;
        tacticalAudio.play('select');
        this.emitHud();
        return;
      }

      this.snapshot.selectedUnitId = null;
      this.inspectedUnitId = null;
      this.emitHud();
      return;
    }

    const isReadyPlayerSelected =
      selectedUnit !== undefined &&
      selectedUnit.faction === 'player' &&
      !selectedUnit.hasActed;

    if (
      isReadyPlayerSelected &&
      clickedUnit &&
      this.snapshot.healableAllyIds.has(clickedUnit.id)
    ) {
      this.captureChronoSnapshot();
      this.inspectedUnitId = null;
      this.executeHealSequence(selectedUnit, clickedUnit, () => {
        this.finalizePlayerUnitTurn(selectedUnit, false, true);
      });
      return;
    }

    if (
      isReadyPlayerSelected &&
      clickedUnit &&
      this.snapshot.attackableEnemyIds.has(clickedUnit.id)
    ) {
      this.captureChronoSnapshot();
      this.inspectedUnitId = null;
      const startCombat = () => {
        this.executeCombatSequence(selectedUnit, clickedUnit, () => {
          this.finalizePlayerUnitTurn(selectedUnit, true, false);
        });
      };

      const shouldShowBossBanter =
        clickedUnit.unitClass === 'sovereign' && !this.bossDialogueShownThisStage;
      if (shouldShowBossBanter) {
        this.bossDialogueShownThisStage = true;
        const banterLines = getBossEngagementDialogue(
          this.snapshot.stageNumber,
          clickedUnit.name,
        );
        this.startDialogueSequence(banterLines, 'COMMANDER CLASH', startCombat);
      } else {
        startCombat();
      }
      return;
    }

    const clickedAlreadySelectedUnit =
      selectedUnit !== undefined && clickedUnit?.id === selectedUnit.id;
    if (clickedAlreadySelectedUnit && clickedUnit) {
      this.inspectedUnitId = clickedUnit.id;
      tacticalAudio.play('select');
      this.emitHud();
      return;
    }

    if (isReadyPlayerSelected && !selectedUnit.hasMoved) {
      const tileKey = coordToKey(coord.col, coord.row);
      const movePath = this.snapshot.reachableTiles.get(tileKey);
      const isDifferentTile =
        coord.col !== selectedUnit.col || coord.row !== selectedUnit.row;
      if (movePath && isDifferentTile) {
        this.inspectedUnitId = null;
        this.movePlayerUnitAlongPath(selectedUnit, movePath);
        return;
      }
    }

    if (clickedUnit) {
      const clickedReadyAlly =
        clickedUnit.faction === 'player' && !clickedUnit.hasActed;
      if (!this.snapshot.pendingMove) {
        this.inspectedUnitId = null;
        if (clickedReadyAlly) {
          this.selectPlayerUnit(clickedUnit);
        } else {
          this.selectPreviewUnit(clickedUnit);
        }
        return;
      }

      this.inspectedUnitId = clickedUnit.id;
      tacticalAudio.play('select');
      this.emitHud();
      return;
    }

    this.inspectedUnitId = null;
    if (!this.snapshot.pendingMove) {
      this.clearSelection();
    } else {
      this.emitHud();
    }
  }

  private selectPlayerUnit(unit: Unit): void {
    this.snapshot.selectedUnitId = unit.id;
    const reachableTiles = computeReachableTiles(
      unit,
      this.snapshot.board,
      this.snapshot.units,
      this.snapshot.effects,
    );
    this.snapshot.reachableTiles = reachableTiles;
    this.snapshot.threatenedTileKeys = computeTotalThreatenedTileKeys(
      unit,
      reachableTiles,
      this.snapshot.board,
    );
    const enemies = getAttackableEnemiesFromPosition(
      unit,
      unit,
      this.snapshot.units,
    );
    const healAllies = getHealableAlliesFromPosition(
      unit,
      unit,
      this.snapshot.units,
    );
    this.snapshot.attackableEnemyIds = new Set(enemies.map((enemy) => enemy.id));
    this.snapshot.healableAllyIds = new Set(healAllies.map((ally) => ally.id));
    tacticalAudio.play('select');
    this.emitHud();
  }

  private selectPreviewUnit(unit: Unit): void {
    this.snapshot.selectedUnitId = unit.id;
    const reachableTiles = computeReachableTiles(
      unit,
      this.snapshot.board,
      this.snapshot.units,
      this.snapshot.effects,
    );
    this.snapshot.reachableTiles = reachableTiles;
    this.snapshot.threatenedTileKeys = computeTotalThreatenedTileKeys(
      unit,
      reachableTiles,
      this.snapshot.board,
    );
    this.snapshot.attackableEnemyIds = new Set();
    this.snapshot.healableAllyIds = new Set();
    tacticalAudio.play('select');
    this.emitHud();
  }

  private clearSelection(): void {
    if (this.snapshot.selectedUnitId) {
      tacticalAudio.play('cancel');
    }
    this.snapshot.selectedUnitId = null;
    this.snapshot.reachableTiles = new Map();
    this.snapshot.threatenedTileKeys = new Set();
    this.snapshot.attackableEnemyIds = new Set();
    this.snapshot.healableAllyIds = new Set();
    this.emitHud();
  }

  private movePlayerUnitAlongPath(unit: Unit, path: GridCoord[]): void {
    this.isBusy = true;
    const originCol = unit.col;
    const originRow = unit.row;
    const destination = path[path.length - 1];
    const tilesMoved = Math.max(0, path.length - 1);

    tacticalAudio.play(getMovementSoundCue(unit));
    this.activeMoveAnimation = {
      unitId: unit.id,
      path,
      segmentIndex: 0,
      segmentProgress: 0,
      onComplete: () => {
        unit.col = destination.col;
        unit.row = destination.row;
        unit.renderX = destination.col;
        unit.renderY = destination.row;
        unit.hasMoved = true;
        unit.tilesMovedThisTurn = tilesMoved;

        this.snapshot.pendingMove = {
          unitId: unit.id,
          originCol,
          originRow,
        };
        this.snapshot.reachableTiles = new Map();
        this.snapshot.threatenedTileKeys = new Set();
        const targets = getAttackableEnemiesFromPosition(
          unit,
          destination,
          this.snapshot.units,
        );
        const healAllies = getHealableAlliesFromPosition(
          unit,
          destination,
          this.snapshot.units,
        );
        this.snapshot.attackableEnemyIds = new Set(
          targets.map((enemy) => enemy.id),
        );
        this.snapshot.healableAllyIds = new Set(
          healAllies.map((ally) => ally.id),
        );
        this.isBusy = false;

        if (this.snapshot.stageNumber === 1) {
          this.snapshot.stageCallout =
            healAllies.length > 0
              ? 'Click a glowing emerald ally to cast Radiant Mend, strike a coral foe, or Wait.'
              : targets.length > 0
                ? 'Hover a glowing enemy for Combat Forecast, click to strike, or click Undo Move.'
                : 'Click the moved unit for Info & Gear, press Wait (Space) to hold, or Undo Move.';
        }

        this.emitHud();
      },
    };
    this.emitHud();
  }

  public handleRightClickCancel(): void {
    if (this.snapshot.pendingMove !== null) {
      this.undoPendingMove();
      return;
    }
    if (this.inspectedUnitId !== null) {
      this.dismissInspectedUnit();
      return;
    }
    const canClearSelection =
      this.snapshot.screen === 'playing' &&
      this.snapshot.phase === 'player' &&
      !this.isBusy &&
      this.snapshot.dialogueScene === null &&
      this.snapshot.selectedUnitId !== null;
    if (canClearSelection) {
      this.clearSelection();
    }
  }

  public undoPendingMove(): void {
    const canUndo =
      this.snapshot.screen === 'playing' &&
      this.snapshot.phase === 'player' &&
      !this.isBusy &&
      this.snapshot.dialogueScene === null &&
      this.snapshot.pendingMove !== null;
    if (!canUndo || !this.snapshot.pendingMove) {
      return;
    }

    const {unitId, originCol, originRow} = this.snapshot.pendingMove;
    const unit = this.snapshot.units.find((item) => item.id === unitId);
    if (!unit) {
      return;
    }

    unit.col = originCol;
    unit.row = originRow;
    unit.renderX = originCol;
    unit.renderY = originRow;
    unit.hasMoved = false;
    unit.tilesMovedThisTurn = 0;

    this.snapshot.pendingMove = null;
    this.inspectedUnitId = null;
    tacticalAudio.play('undo');
    this.selectPlayerUnit(unit);
  }

  public waitSelectedUnit(): void {
    const selectedUnit = this.getSelectedUnit();
    const canWait =
      this.snapshot.screen === 'playing' &&
      this.snapshot.phase === 'player' &&
      !this.isBusy &&
      this.snapshot.dialogueScene === null &&
      selectedUnit !== undefined &&
      selectedUnit.faction === 'player' &&
      !selectedUnit.hasActed;
    if (!canWait || !selectedUnit) {
      return;
    }

    this.inspectedUnitId = null;
    tacticalAudio.play('select');
    this.finalizePlayerUnitTurn(selectedUnit, false, false);
  }

  public selfHealSelectedUnit(): void {
    const selectedUnit = this.getSelectedUnit();
    const canSelfHeal =
      this.snapshot.screen === 'playing' &&
      this.snapshot.phase === 'player' &&
      !this.isBusy &&
      this.snapshot.dialogueScene === null &&
      selectedUnit !== undefined &&
      selectedUnit.faction === 'player' &&
      !selectedUnit.hasActed &&
      selectedUnit.canHeal &&
      selectedUnit.hp < selectedUnit.maxHp;
    if (!canSelfHeal || !selectedUnit) {
      return;
    }

    this.captureChronoSnapshot();
    this.inspectedUnitId = null;
    const gear = computeUnitEquipmentBonuses(selectedUnit);
    const healPower = selectedUnit.healPower + gear.healBonus;
    const missingHp = Math.max(0, selectedUnit.maxHp - selectedUnit.hp);
    const restored = Math.min(missingHp, healPower);
    selectedUnit.hp += restored;

    tacticalAudio.play('heal');
    this.spawnFloatingCallout(
      selectedUnit.col,
      selectedUnit.row,
      `+${restored} HP`,
      PALETTE.healColor,
    );
    this.spawnShockwave(selectedUnit.col, selectedUnit.row, PALETTE.healColor);
    this.spawnParticleBurst(
      selectedUnit.col,
      selectedUnit.row,
      PALETTE.healColor,
      14,
    );
    if (selectedUnit.unitClass === 'healer') {
      this.applySanctuaryPulseSplash(selectedUnit, selectedUnit);
    }

    const xpOutcome = applySupportXpToUnit(selectedUnit, restored);
    if (xpOutcome.xpGained > 0) {
      this.spawnFloatingCallout(
        selectedUnit.col,
        selectedUnit.row - 0.35,
        `+${xpOutcome.xpGained} XP`,
        PALETTE.xpColor,
      );
    }
    if (xpOutcome.levelUps.length > 0) {
      tacticalAudio.play('levelUp');
      this.spawnFloatingCallout(
        selectedUnit.col,
        selectedUnit.row - 0.65,
        `LEVEL ${selectedUnit.level}!`,
        PALETTE.auraColor,
      );
    }

    this.finalizePlayerUnitTurn(selectedUnit, false, true);
  }

  public useConsumableOnSelectedUnit(consumableId: ConsumableType): void {
    const selectedUnit = this.getSelectedUnit();
    const spec = CONSUMABLE_CATALOG[consumableId];
    const availableCount = this.consumables[consumableId] ?? 0;
    const canUse =
      this.snapshot.screen === 'playing' &&
      this.snapshot.phase === 'player' &&
      !this.isBusy &&
      this.snapshot.dialogueScene === null &&
      selectedUnit !== undefined &&
      selectedUnit.faction === 'player' &&
      !selectedUnit.hasActed &&
      spec !== undefined &&
      availableCount > 0;
    if (!canUse || !selectedUnit) {
      return;
    }

    const isHealingItem = spec.healAmount > 0;
    if (isHealingItem && selectedUnit.hp >= selectedUnit.maxHp) {
      tacticalAudio.play('cancel');
      return;
    }

    this.captureChronoSnapshot();
    this.inspectedUnitId = null;
    this.consumables = {
      ...this.consumables,
      [consumableId]: availableCount - 1,
    };

    if (isHealingItem) {
      const missingHp = Math.max(0, selectedUnit.maxHp - selectedUnit.hp);
      const restored = Math.min(missingHp, spec.healAmount);
      selectedUnit.hp += restored;
      tacticalAudio.play('heal');
      this.spawnFloatingCallout(
        selectedUnit.col,
        selectedUnit.row,
        `+${restored} HP`,
        PALETTE.healColor,
      );
      this.spawnShockwave(selectedUnit.col, selectedUnit.row, PALETTE.healColor);
      this.spawnParticleBurst(
        selectedUnit.col,
        selectedUnit.row,
        PALETTE.healColor,
        14,
      );
    } else if (spec.tempAttackBonus > 0) {
      selectedUnit.tempAttackBonus =
        (selectedUnit.tempAttackBonus ?? 0) + spec.tempAttackBonus;
      tacticalAudio.play('levelUp');
      this.spawnFloatingCallout(
        selectedUnit.col,
        selectedUnit.row,
        `+${spec.tempAttackBonus} ATK!`,
        PALETTE.auraColor,
      );
      this.spawnShockwave(selectedUnit.col, selectedUnit.row, PALETTE.auraColor);
      this.spawnParticleBurst(
        selectedUnit.col,
        selectedUnit.row,
        PALETTE.auraColor,
        14,
      );
    }

    this.persistCampaignCheckpoint();
    this.finalizePlayerUnitTurn(selectedUnit, false, isHealingItem);
  }

  private recordPlayerActionTelemetry(
    unit: Unit,
    attacked: boolean,
    healed: boolean,
  ): void {
    this.snapshot.playstyle.totalPlayerActions += 1;
    if (healed) {
      this.snapshot.playstyle.clericHeals += 1;
    }
    if (attacked) {
      if (unit.unitClass === 'arcanist') {
        this.snapshot.playstyle.arcanistAttacks += 1;
      } else if (unit.unitClass === 'striker') {
        this.snapshot.playstyle.strikerAttacks += 1;
      } else if (unit.unitClass === 'vanguard') {
        this.snapshot.playstyle.vanguardAttacks += 1;
      } else if (unit.unitClass === 'ranger') {
        this.snapshot.playstyle.rangerAttacks += 1;
      } else if (unit.unitClass === 'marksman') {
        this.snapshot.playstyle.marksmanAttacks =
          (this.snapshot.playstyle.marksmanAttacks ?? 0) + 1;
      }
    }

    const standingTerrain = this.snapshot.board[unit.row]?.[unit.col]?.terrain;
    if (standingTerrain === 'forest') {
      this.snapshot.playstyle.forestEndTurns += 1;
    } else if (standingTerrain === 'fortress') {
      this.snapshot.playstyle.fortressEndTurns += 1;
    }

    const doctrine = determineDominantDoctrine(this.snapshot.playstyle);
    this.snapshot.dominantDoctrine = doctrine;
    this.snapshot.adaptationNote = describeIqCounterDoctrine(
      doctrine,
      this.snapshot.iqState.current,
    );
  }

  private finalizePlayerUnitTurn(
    unit: Unit,
    attacked = false,
    healed = false,
  ): void {
    unit.hasMoved = true;
    unit.hasActed = true;
    this.snapshot.pendingMove = null;
    this.snapshot.selectedUnitId = null;
    this.snapshot.reachableTiles = new Map();
    this.snapshot.threatenedTileKeys = new Set();
    this.snapshot.attackableEnemyIds = new Set();
    this.snapshot.healableAllyIds = new Set();

    if (unit.hp > 0) {
      this.recordPlayerActionTelemetry(unit, attacked, healed);
      const posIqEval = evaluatePlayerPositioningIq(
        unit,
        this.snapshot.board,
        this.snapshot.units,
        this.snapshot.effects,
        this.snapshot.iqState.current,
      );
      if (posIqEval) {
        this.applyIqAdjustment(posIqEval.delta, posIqEval.reason, unit);
      }
    }

    if (this.checkBattleOutcome()) {
      return;
    }

    const hasRemainingReadyAllies = this.snapshot.units.some(
      (candidate) =>
        candidate.faction === 'player' &&
        candidate.hp > 0 &&
        !candidate.hasActed,
    );

    this.emitHud();
    if (!hasRemainingReadyAllies) {
      this.schedule(() => this.beginEnemyPhase(), 320);
    }
  }

  public endPlayerTurn(): void {
    const canEndTurn =
      this.snapshot.screen === 'playing' &&
      this.snapshot.phase === 'player' &&
      this.snapshot.deploymentPhase === 'ACTIVE' &&
      !this.isBusy &&
      this.snapshot.dialogueScene === null;
    if (!canEndTurn) {
      return;
    }

    this.captureChronoSnapshot();
    for (const unit of this.snapshot.units) {
      if (unit.faction === 'player' && unit.hp > 0 && !unit.hasActed) {
        this.recordPlayerActionTelemetry(unit, false, false);
        unit.hasActed = true;
        unit.hasMoved = true;
      }
    }

    this.snapshot.pendingMove = null;
    this.snapshot.selectedUnitId = null;
    this.inspectedUnitId = null;
    this.snapshot.reachableTiles = new Map();
    this.snapshot.threatenedTileKeys = new Set();
    this.snapshot.attackableEnemyIds = new Set();
    this.snapshot.healableAllyIds = new Set();
    this.beginEnemyPhase();
  }

  private applyFortressHealingForFaction(faction: 'player' | 'enemy'): void {
    let anyHealed = false;
    for (const unit of this.snapshot.units) {
      const isEligible =
        unit.hp > 0 && unit.hp < unit.maxHp && unit.faction === faction;
      if (!isEligible) {
        continue;
      }
      const tile = this.snapshot.board[unit.row]?.[unit.col];
      if (!tile) {
        continue;
      }
      const healRatio = TERRAIN_CONFIG[tile.terrain].healRatio;
      if (healRatio <= 0) {
        continue;
      }
      const healAmount = Math.max(2, Math.ceil(unit.maxHp * healRatio));
      unit.hp = Math.min(unit.maxHp, unit.hp + healAmount);
      this.spawnFloatingCallout(
        unit.col,
        unit.row,
        `+${healAmount} HP`,
        PALETTE.healColor,
      );
      anyHealed = true;
    }
    if (anyHealed) {
      tacticalAudio.play('fortressHeal');
    }
  }

  private beginEnemyPhase(): void {
    if (this.snapshot.screen !== 'playing') {
      return;
    }

    this.snapshot.phase = 'enemy';
    this.snapshot.activeEnemyAction = null;
    this.isBusy = true;
    for (const unit of this.snapshot.units) {
      if (unit.faction === 'enemy' && unit.hp > 0) {
        unit.hasMoved = false;
        unit.hasActed = false;
        unit.tilesMovedThisTurn = 0;
      }
    }

    tacticalAudio.play('turnEnemy');
    this.applyFortressHealingForFaction('enemy');
    this.snapshot.phaseBanner = {
      title: 'ENEMY PHASE',
      subtitle: `Turn ${this.snapshot.turnNumber} · ${this.snapshot.adaptationNote}`,
      accentColor: PALETTE.enemyPrimary,
      age: 0,
      duration: 1.05,
    };
    this.emitHud();

    const activeEnemies = this.snapshot.units
      .filter((unit) => unit.faction === 'enemy' && unit.hp > 0)
      .map((unit) => unit.id);

    this.schedule(() => this.processNextEnemyUnit(activeEnemies, 0), 750);
  }

  private processNextEnemyUnit(enemyIds: string[], index: number): void {
    if (this.snapshot.screen !== 'playing') {
      return;
    }

    if (index >= enemyIds.length) {
      this.snapshot.activeEnemyAction = null;
      this.beginPlayerPhase();
      return;
    }

    const enemy = this.snapshot.units.find(
      (unit) => unit.id === enemyIds[index] && unit.hp > 0,
    );
    if (!enemy) {
      this.processNextEnemyUnit(enemyIds, index + 1);
      return;
    }

    const decision = chooseBestEnemyDecision(
      enemy,
      this.snapshot.board,
      this.snapshot.units,
      this.snapshot.effects,
      this.snapshot.dominantDoctrine,
      this.snapshot.iqState.current,
    );

    const plannedTarget = decision.targetId
      ? this.snapshot.units.find(
          (unit) => unit.id === decision.targetId && unit.hp > 0,
        )
      : undefined;
    const originCoord = {col: enemy.col, row: enemy.row};
    const hasMovement = decision.path.length > 1;
    const telegraphActionType =
      decision.actionType === 'attack' || decision.actionType === 'heal'
        ? decision.actionType
        : 'move';

    this.snapshot.activeEnemyAction = {
      actorId: enemy.id,
      actorName: enemy.name,
      actorClass: enemy.unitClass,
      actionType: telegraphActionType,
      origin: originCoord,
      destination: decision.destination,
      path: decision.path,
      targetId: plannedTarget?.id ?? null,
      targetName: plannedTarget?.name ?? null,
      targetCoord: plannedTarget
        ? {col: plannedTarget.col, row: plannedTarget.row}
        : null,
      phase: hasMovement ? 'moving' : 'targeting',
    };

    if (hasMovement) {
      this.snapshot.stageCallout = plannedTarget
        ? decision.actionType === 'heal'
          ? `${enemy.name} moves to mend ${plannedTarget.name}.`
          : `${enemy.name} advances to attack ${plannedTarget.name}!`
        : `${enemy.name} repositions across the battlefield.`;
    }

    const executeAfterMove = () => {
      enemy.col = decision.destination.col;
      enemy.row = decision.destination.row;
      enemy.renderX = decision.destination.col;
      enemy.renderY = decision.destination.row;
      enemy.hasMoved = true;
      enemy.tilesMovedThisTurn = Math.max(0, decision.path.length - 1);

      const target = decision.targetId
        ? this.snapshot.units.find(
            (unit) => unit.id === decision.targetId && unit.hp > 0,
          )
        : undefined;

      if (decision.actionType === 'heal' && target) {
        this.snapshot.activeEnemyAction = {
          actorId: enemy.id,
          actorName: enemy.name,
          actorClass: enemy.unitClass,
          actionType: 'heal',
          origin: originCoord,
          destination: decision.destination,
          path: decision.path,
          targetId: target.id,
          targetName: target.name,
          targetCoord: {col: target.col, row: target.row},
          phase: 'targeting',
        };
        this.snapshot.stageCallout = `${enemy.name} casts Radiant Mend on ${target.name}!`;
        tacticalAudio.play('select');
        this.spawnShockwave(enemy.col, enemy.row, PALETTE.healColor);
        this.spawnShockwave(target.col, target.row, PALETTE.healColor);

        this.schedule(() => {
          this.executeHealSequence(enemy, target, () => {
            enemy.hasActed = true;
            this.snapshot.activeEnemyAction = null;
            this.schedule(
              () => this.processNextEnemyUnit(enemyIds, index + 1),
              300,
            );
          });
        }, 620);
      } else if (decision.actionType === 'attack' && target) {
        this.snapshot.activeEnemyAction = {
          actorId: enemy.id,
          actorName: enemy.name,
          actorClass: enemy.unitClass,
          actionType: 'attack',
          origin: originCoord,
          destination: decision.destination,
          path: decision.path,
          targetId: target.id,
          targetName: target.name,
          targetCoord: {col: target.col, row: target.row},
          phase: 'targeting',
        };
        this.snapshot.stageCallout = `${enemy.name} targets ${target.name}!`;
        tacticalAudio.play('select');
        this.spawnShockwave(enemy.col, enemy.row, PALETTE.enemyPrimary);
        this.spawnShockwave(target.col, target.row, PALETTE.auraColor);

        this.schedule(() => {
          this.executeCombatSequence(enemy, target, () => {
            enemy.hasActed = true;
            this.snapshot.activeEnemyAction = null;
            if (this.checkBattleOutcome()) {
              return;
            }
            this.schedule(
              () => this.processNextEnemyUnit(enemyIds, index + 1),
              340,
            );
          });
        }, 740);
      } else {
        enemy.hasActed = true;
        this.schedule(() => {
          this.snapshot.activeEnemyAction = null;
          this.processNextEnemyUnit(enemyIds, index + 1);
        }, 260);
      }
    };

    if (hasMovement) {
      tacticalAudio.play(getMovementSoundCue(enemy));
      this.activeMoveAnimation = {
        unitId: enemy.id,
        path: decision.path,
        segmentIndex: 0,
        segmentProgress: 0,
        onComplete: executeAfterMove,
      };
    } else {
      executeAfterMove();
    }
  }

  private beginPlayerPhase(): void {
    if (this.snapshot.screen !== 'playing') {
      return;
    }

    this.snapshot.phase = 'player';
    this.snapshot.activeEnemyAction = null;
    this.snapshot.turnNumber += 1;
    this.snapshot.stats.turnsElapsed += 1;
    this.snapshot.stageCallout =
      'Select a blue unit to move, attack, or inspect.';
    this.isBusy = false;

    for (const unit of this.snapshot.units) {
      if (unit.faction === 'player' && unit.hp > 0) {
        unit.hasMoved = false;
        unit.hasActed = false;
        unit.tilesMovedThisTurn = 0;
      }
    }

    tacticalAudio.play('turnPlayer');
    this.applyFortressHealingForFaction('player');
    this.snapshot.phaseBanner = {
      title: 'PLAYER PHASE',
      subtitle: `Turn ${this.snapshot.turnNumber} · ${this.snapshot.stageTitle}`,
      accentColor: PALETTE.playerPrimary,
      age: 0,
      duration: 1.0,
    };
    this.emitHud();
  }

  private resolveBattleTerrain(attacker: Unit, defender: Unit): TerrainType {
    const defenderTerrain =
      this.snapshot.board[defender.row]?.[defender.col]?.terrain ?? 'plains';
    const attackerTerrain =
      this.snapshot.board[attacker.row]?.[attacker.col]?.terrain ?? 'plains';
    if (defenderTerrain === 'chasm' || attackerTerrain === 'chasm') {
      return 'chasm';
    }
    return defenderTerrain;
  }

  private buildBattleCombatant(unit: Unit): BattleCombatantState {
    const tile = this.snapshot.board[unit.row]?.[unit.col];
    return {
      unitId: unit.id,
      name: unit.name,
      unitClass: unit.unitClass,
      faction: unit.faction,
      level: unit.level,
      displayHp: unit.hp,
      targetHp: unit.hp,
      maxHp: unit.maxHp,
      displayXp: unit.xp,
      targetXp: unit.xp,
      xpToNextLevel: unit.xpToNextLevel,
      terrain: tile?.terrain ?? 'plains',
      offsetX: 0,
      offsetY: 0,
      hitFlash: 0,
      dissolveProgress: 0,
      isDefeated: false,
    };
  }

  private executeHealSequence(
    healer: Unit,
    ally: Unit,
    onDone: () => void,
  ): void {
    this.isBusy = true;
    const gear = computeUnitEquipmentBonuses(healer);
    const totalHealPower = healer.healPower + gear.healBonus;
    const missingHp = Math.max(0, ally.maxHp - ally.hp);
    const effectiveHeal = Math.min(missingHp, totalHealPower);
    const battleTerrain = this.resolveBattleTerrain(healer, ally);

    const isSanctuaryHealer = healer.unitClass === 'healer';

    this.snapshot.battleScene = {
      step: 'intro',
      stepAge: 0,
      transitionAlpha: 0,
      battleTerrain,
      isHealScene: true,
      healAmount: effectiveHeal,
      playerSide: this.buildBattleCombatant(healer),
      enemySide: this.buildBattleCombatant(ally),
      attackerFaction: healer.faction,
      primaryDamage: 0,
      primaryHit: true,
      primaryCrit: false,
      primaryTag: isSanctuaryHealer ? 'SANCTUARY PULSE' : 'RADIANT MEND',
      primaryOutcome: 'neutral',
      hasCounter: false,
      counterDamage: 0,
      counterHit: false,
      counterCrit: false,
      xpGained: 0,
      levelUpLabels: [],
      headline: isSanctuaryHealer
        ? `${healer.name} weaves Sanctuary Pulse on ${ally.name}`
        : `${healer.name} casts Radiant Mend on ${ally.name}`,
      subline: isSanctuaryHealer
        ? `Restoring +${effectiveHeal} HP (+4 HP to adjacent allies)`
        : `Restoring +${effectiveHeal} HP`,
      shakeMagnitude: 0,
      hitStopTimer: 0,
      activeStepDuration: 0.34,
      slashProgress: 0,
      slashTargetFaction: null,
      vfxActorClass: null,
      vfxPalette: 'heal',
      vfxProgress: 0,
      vfxTargetFaction: null,
      beamProgress: 0,
      beamDirection: null,
      beamColor: PALETTE.healColor,
      beamStyle: 'radiant',
      healHaloAge: 0,
      levelUpPillarAge: 0,
      xpTickCooldown: 0,
      floatingNumbers: [],
      sparks: [],
    };

    this.battleContext = {
      attacker: healer,
      defender: ally,
      primaryApplied: false,
      counterApplied: true,
      xpApplied: false,
      allyHpBeforeHeal: ally.hp,
      counterDamageTaken: 0,
      onComplete: onDone,
    };

    tacticalAudio.play('select');
    this.emitHud();
  }

  private executeCombatSequence(
    attacker: Unit,
    defender: Unit,
    onDone: () => void,
  ): void {
    this.isBusy = true;
    const playerIq = this.snapshot.iqState.current;
    const forecast = buildCombatForecast(
      attacker,
      attacker,
      defender,
      this.snapshot.board,
      this.snapshot.units,
      this.snapshot.effects,
      attacker.tilesMovedThisTurn,
      playerIq,
    );

    const primaryHit =
      forecast.attackerHitChance >= 100 ||
      Math.random() * 100 <= forecast.attackerHitChance;
    const primaryCrit =
      primaryHit && Math.random() * 100 < forecast.attackerCritChance;
    const actualPrimaryDamage = primaryHit
      ? primaryCrit
        ? computeCriticalDamage(forecast.attackerDamage)
        : forecast.attackerDamage
      : 0;
    const defenderSurvivesPrimary = defender.hp - actualPrimaryDamage > 0;
    const canCounterAfterRoll =
      defenderSurvivesPrimary && forecast.defenderCanCounter;
    const counterHit =
      canCounterAfterRoll &&
      (forecast.defenderHitChance >= 100 ||
        Math.random() * 100 <= forecast.defenderHitChance);
    const counterCrit =
      counterHit && Math.random() * 100 < forecast.defenderCritChance;
    const actualCounterDamage = counterHit
      ? counterCrit
        ? computeCriticalDamage(forecast.defenderDamage)
        : forecast.defenderDamage
      : 0;

    const playerUnit = attacker.faction === 'player' ? attacker : defender;
    const enemyUnit = attacker.faction === 'enemy' ? attacker : defender;
    const battleTerrain = this.resolveBattleTerrain(attacker, defender);

    const primaryTag = primaryCrit
      ? 'CRITICAL HIT!'
      : forecast.attackerAntiAirBonus > 0
        ? 'ANTI-AIR SHOT!'
        : forecast.attackerPierceBonus > 0
          ? 'PIERCING DASH!'
          : forecast.attackerOutcome === 'advantage'
            ? 'WEAPON ADVANTAGE!'
            : null;

    const isHighIqLethal =
      attacker.faction === 'player' &&
      playerIq >= 125 &&
      !defenderSurvivesPrimary;
    const cutInText = primaryCrit
      ? attacker.faction === 'player'
        ? `${attacker.name.toUpperCase()} · EQUINOX CRIT!`
        : `${attacker.name.toUpperCase()} · STORM CRIT!`
      : isHighIqLethal
        ? `${attacker.name.toUpperCase()} · CLEAN LETHAL (+3 IQ)`
        : null;
    const cutInTone: 'gold' | 'cyan' | null = primaryCrit
      ? 'gold'
      : isHighIqLethal
        ? 'cyan'
        : null;

    const matchupSubline = primaryCrit
      ? forecast.attackerDeadeyeBonus > 0
        ? `Deadeye Focus Critical (${forecast.attackerCritChance}% CRIT · 1.5x DMG)`
        : `Critical Strike (${forecast.attackerCritChance}% CRIT · 1.5x DMG)`
      : forecast.attackerAntiAirBonus > 0
        ? `Anti-Air Bonus (+${forecast.attackerAntiAirBonus} ATK vs Flyer)`
        : forecast.attackerOutcome === 'advantage'
          ? `${attacker.name} holds Weapon Advantage (+2 ATK)`
          : forecast.attackerOutcome === 'disadvantage'
            ? `${defender.name} holds Weapon Advantage`
            : `${attacker.name} engages ${defender.name}`;

    const projectileStyle = getProjectileStyleForUnit(attacker) ?? 'arcane';

    this.snapshot.battleScene = {
      step: 'intro',
      stepAge: 0,
      transitionAlpha: 0,
      battleTerrain,
      isHealScene: false,
      healAmount: 0,
      playerSide: this.buildBattleCombatant(playerUnit),
      enemySide: this.buildBattleCombatant(enemyUnit),
      attackerFaction: attacker.faction,
      primaryDamage: actualPrimaryDamage,
      primaryHit,
      primaryCrit,
      primaryTag,
      primaryOutcome: forecast.attackerOutcome,
      hasCounter: canCounterAfterRoll,
      counterDamage: actualCounterDamage,
      counterHit,
      counterCrit,
      xpGained: 0,
      levelUpLabels: [],
      headline: `${attacker.name} attacks ${defender.name}`,
      subline: matchupSubline,
      shakeMagnitude: 0,
      hitStopTimer: 0,
      activeStepDuration: 0.34,
      slashProgress: 0,
      slashTargetFaction: null,
      vfxActorClass: null,
      vfxPalette: resolveVfxPaletteForAction(attacker.faction, false),
      vfxProgress: 0,
      vfxTargetFaction: null,
      beamProgress: 0,
      beamDirection: null,
      beamColor: resolveProjectileBeamColor(projectileStyle, attacker.faction),
      beamStyle: projectileStyle,
      healHaloAge: 0,
      levelUpPillarAge: 0,
      xpTickCooldown: 0,
      floatingNumbers: [],
      cutInText,
      cutInTone,
      sparks: [],
    };

    this.battleContext = {
      attacker,
      defender,
      primaryApplied: false,
      counterApplied: false,
      xpApplied: false,
      forecast,
      counterDamageTaken: actualCounterDamage,
      onComplete: onDone,
    };

    tacticalAudio.play('select');
    this.emitHud();
  }

  public skipBattleScene(): void {
    const scene = this.snapshot.battleScene;
    const ctx = this.battleContext;
    if (!scene || !ctx) {
      return;
    }

    this.applyPrimaryCombatOutcome(scene, ctx, true);
    if (scene.hasCounter) {
      this.applyCounterCombatOutcome(scene, ctx, true);
    }
    this.applyBattleXpOutcome(scene, ctx, true);
    this.finishBattleScene();
  }

  private spawnBattleSparks(
    scene: BattleSceneState,
    xRatio: number,
    yRatio: number,
    color: string,
    count: number,
  ): void {
    for (let index = 0; index < count; index++) {
      const angle = (Math.PI * 2 * index) / count + Math.random() * 0.45;
      const speed = 0.22 + Math.random() * 0.45;
      scene.sparks.push({
        x: xRatio,
        y: yRatio,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.12,
        size: 4 + Math.random() * 5,
        color,
        age: 0,
        duration: 0.42 + Math.random() * 0.22,
      });
    }
  }

  private playImpactSound(
    attacker: Unit,
    defender: Unit,
    damage: number,
    isCritical: boolean,
  ): void {
    if (defender.hp === 0) {
      tacticalAudio.play('heavyHit');
      tacticalAudio.play('unitDefeat');
      return;
    }
    if (attacker.unitClass === 'ranger' || attacker.unitClass === 'marksman') {
      tacticalAudio.play('arrowImpact');
      if (isCritical) {
        tacticalAudio.play('criticalSlash');
        if (attacker.unitClass === 'marksman') {
          tacticalAudio.play('heavyHit');
        }
      }
      return;
    }
    if (defender.unitClass === 'vanguard' && damage <= 5) {
      tacticalAudio.play('shieldBlock');
      return;
    }
    if (isCritical || damage >= 9) {
      tacticalAudio.play('criticalSlash');
      tacticalAudio.play('heavyHit');
      return;
    }
    tacticalAudio.play(damage >= 7 ? 'heavyHit' : 'hit');
  }

  private applySanctuaryPulseSplash(caster: Unit, anchorUnit: Unit): void {
    const pulseBonus = 4;
    const adjacentAllies = this.snapshot.units.filter(
      (candidate) =>
        candidate.faction === anchorUnit.faction &&
        candidate.id !== anchorUnit.id &&
        candidate.hp > 0 &&
        candidate.hp < candidate.maxHp &&
        getManhattanDistance(anchorUnit, candidate) === 1,
    );

    for (const ally of adjacentAllies) {
      const missingHp = ally.maxHp - ally.hp;
      const restored = Math.min(missingHp, pulseBonus);
      if (restored <= 0) {
        continue;
      }
      ally.hp += restored;
      this.spawnFloatingCallout(
        ally.col,
        ally.row,
        `+${restored} HP PULSE`,
        PALETTE.healerColor,
      );
      this.spawnShockwave(ally.col, ally.row, PALETTE.healerColor);
    }

    if (adjacentAllies.length > 0 && caster.faction === 'player') {
      this.snapshot.stageCallout = `${caster.name}'s Sanctuary Pulse restored adjacent allies!`;
    }
  }

  private applyPrimaryCombatOutcome(
    scene: BattleSceneState,
    ctx: PendingBattleContext,
    silent: boolean,
  ): void {
    if (ctx.primaryApplied) {
      return;
    }
    ctx.primaryApplied = true;

    if (scene.isHealScene) {
      ctx.defender.hp = Math.min(
        ctx.defender.maxHp,
        ctx.defender.hp + scene.healAmount,
      );
      scene.enemySide.targetHp = ctx.defender.hp;
      if (ctx.attacker.unitClass === 'healer') {
        this.applySanctuaryPulseSplash(ctx.attacker, ctx.defender);
      }
      if (!silent) {
        tacticalAudio.play('heal');
        scene.healHaloAge = 0.01;
        scene.vfxActorClass = ctx.attacker.unitClass;
        scene.vfxPalette = 'heal';
        scene.vfxTargetFaction = 'enemy';
        scene.vfxProgress = 0.01;
        this.spawnBattleSparks(scene, 0.27, 0.54, PALETTE.healColor, 22);
        scene.floatingNumbers.push({
          xRatio: 0.27,
          yRatio: 0.44,
          text: `+${scene.healAmount} HP`,
          color: PALETTE.healColor,
          age: 0,
          duration: 1.0,
        });
      }
      return;
    }

    const defenderSide =
      ctx.defender.faction === 'player' ? scene.playerSide : scene.enemySide;
    const defenderX = ctx.defender.faction === 'player' ? 0.73 : 0.27;

    if (!scene.primaryHit) {
      if (!silent) {
        tacticalAudio.play('miss');
        scene.floatingNumbers.push({
          xRatio: defenderX,
          yRatio: 0.48,
          text: 'EVADED',
          color: PALETTE.textSecondary,
          age: 0,
          duration: 0.85,
        });
      }
      return;
    }

    ctx.defender.hp = Math.max(0, ctx.defender.hp - scene.primaryDamage);
    defenderSide.targetHp = ctx.defender.hp;
    defenderSide.hitFlash = 0.22;
    defenderSide.isDefeated = ctx.defender.hp === 0;

    if (ctx.defender.hp === 0 && ctx.defender.faction === 'enemy') {
      this.snapshot.stats.enemiesDefeated += 1;
    }

    if (!silent) {
      const choreography = getClassAttackChoreography(ctx.attacker.unitClass);
      const isHeavy = scene.primaryDamage >= 8 || ctx.defender.hp === 0;
      const isCritical = scene.primaryCrit || scene.primaryTag !== null;
      const baseShake = ctx.defender.hp === 0 ? 13 : isHeavy ? 8 : 5;
      scene.shakeMagnitude = baseShake + (scene.primaryCrit ? 4 : 0);
      scene.hitStopTimer =
        choreography.hitStopDuration +
        (scene.primaryCrit ? 0.045 : isCritical || isHeavy ? 0.025 : 0);
      this.playImpactSound(
        ctx.attacker,
        ctx.defender,
        scene.primaryDamage,
        isCritical,
      );
      scene.slashTargetFaction = ctx.defender.faction;
      scene.slashProgress = 0.01;
      scene.vfxActorClass = ctx.attacker.unitClass;
      scene.vfxPalette = resolveVfxPaletteForAction(ctx.attacker.faction, false);
      scene.vfxTargetFaction = ctx.defender.faction;
      scene.vfxProgress = 0.01;
      const sparkColor = scene.primaryCrit
        ? PALETTE.critColor
        : ctx.attacker.faction === 'player'
          ? PALETTE.playerPrimary
          : PALETTE.enemyPrimary;
      const sparkCount =
        ctx.defender.hp === 0 ? 28 : scene.primaryCrit ? 24 : 14;
      this.spawnBattleSparks(scene, defenderX, 0.58, sparkColor, sparkCount);
      scene.floatingNumbers.push({
        xRatio: defenderX,
        yRatio: 0.46,
        text: scene.primaryCrit
          ? `-${scene.primaryDamage}!`
          : `-${scene.primaryDamage}`,
        color: scene.primaryCrit
          ? PALETTE.critColor
          : ctx.attacker.faction === 'player'
            ? PALETTE.playerHighlight
            : PALETTE.enemyPrimary,
        age: 0,
        duration: 0.95,
      });
      if (scene.primaryTag) {
        scene.floatingNumbers.push({
          xRatio: defenderX,
          yRatio: 0.36,
          text: scene.primaryTag,
          color: scene.primaryCrit ? PALETTE.critColor : PALETTE.auraColor,
          age: 0,
          duration: 0.95,
          isHeadline: true,
        });
      }
    }
  }

  private applyCounterCombatOutcome(
    scene: BattleSceneState,
    ctx: PendingBattleContext,
    silent: boolean,
  ): void {
    if (ctx.counterApplied || !scene.hasCounter) {
      return;
    }
    ctx.counterApplied = true;

    const attackerSide =
      ctx.attacker.faction === 'player' ? scene.playerSide : scene.enemySide;
    const attackerX = ctx.attacker.faction === 'player' ? 0.73 : 0.27;

    if (!scene.counterHit) {
      if (!silent) {
        tacticalAudio.play('miss');
        scene.floatingNumbers.push({
          xRatio: attackerX,
          yRatio: 0.48,
          text: 'EVADED',
          color: PALETTE.textSecondary,
          age: 0,
          duration: 0.85,
        });
      }
      return;
    }

    ctx.attacker.hp = Math.max(0, ctx.attacker.hp - scene.counterDamage);
    attackerSide.targetHp = ctx.attacker.hp;
    attackerSide.hitFlash = 0.22;
    attackerSide.isDefeated = ctx.attacker.hp === 0;

    if (ctx.attacker.hp === 0 && ctx.attacker.faction === 'enemy') {
      this.snapshot.stats.enemiesDefeated += 1;
    }

    if (!silent) {
      const choreography = getClassAttackChoreography(ctx.defender.unitClass);
      const isHeavy = scene.counterDamage >= 8 || ctx.attacker.hp === 0;
      const baseShake = ctx.attacker.hp === 0 ? 13 : isHeavy ? 8 : 5;
      scene.shakeMagnitude = baseShake + (scene.counterCrit ? 4 : 0);
      scene.hitStopTimer =
        choreography.hitStopDuration +
        (scene.counterCrit ? 0.045 : isHeavy ? 0.02 : 0);
      this.playImpactSound(
        ctx.defender,
        ctx.attacker,
        scene.counterDamage,
        scene.counterCrit,
      );
      scene.slashTargetFaction = ctx.attacker.faction;
      scene.slashProgress = 0.01;
      scene.vfxActorClass = ctx.defender.unitClass;
      scene.vfxPalette = resolveVfxPaletteForAction(ctx.defender.faction, false);
      scene.vfxTargetFaction = ctx.attacker.faction;
      scene.vfxProgress = 0.01;
      const sparkColor = scene.counterCrit
        ? PALETTE.critColor
        : ctx.defender.faction === 'player'
          ? PALETTE.playerPrimary
          : PALETTE.enemyPrimary;
      const sparkCount =
        ctx.attacker.hp === 0 ? 28 : scene.counterCrit ? 24 : 14;
      this.spawnBattleSparks(scene, attackerX, 0.58, sparkColor, sparkCount);
      scene.floatingNumbers.push({
        xRatio: attackerX,
        yRatio: 0.46,
        text: scene.counterCrit
          ? `-${scene.counterDamage}!`
          : `-${scene.counterDamage}`,
        color: scene.counterCrit
          ? PALETTE.critColor
          : ctx.defender.faction === 'player'
            ? PALETTE.playerHighlight
            : PALETTE.enemyPrimary,
        age: 0,
        duration: 0.95,
      });
      if (scene.counterCrit) {
        scene.floatingNumbers.push({
          xRatio: attackerX,
          yRatio: 0.36,
          text: 'CRITICAL HIT!',
          color: PALETTE.critColor,
          age: 0,
          duration: 0.95,
          isHeadline: true,
        });
      }
    }
  }

  private applyBattleXpOutcome(
    scene: BattleSceneState,
    ctx: PendingBattleContext,
    silent: boolean,
  ): void {
    if (ctx.xpApplied) {
      return;
    }
    ctx.xpApplied = true;

    if (scene.isHealScene) {
      if (ctx.attacker.faction !== 'player' || scene.healAmount <= 0) {
        return;
      }
      const result = applySupportXpToUnit(ctx.attacker, scene.healAmount);
      this.presentXpResultInScene(scene, ctx.attacker, result, silent);
      return;
    }

    const playerIsAttacker = ctx.attacker.faction === 'player';
    const playerUnit = playerIsAttacker ? ctx.attacker : ctx.defender;
    const enemyUnit = playerIsAttacker ? ctx.defender : ctx.attacker;
    const damageByPlayer = playerIsAttacker
      ? scene.primaryDamage
      : scene.counterDamage;
    const enemyWasKilled = enemyUnit.hp === 0;

    if (playerUnit.hp <= 0 || damageByPlayer <= 0) {
      return;
    }

    const result = applyCombatXpToUnit(
      playerUnit,
      damageByPlayer,
      enemyWasKilled,
    );
    this.presentXpResultInScene(scene, playerUnit, result, silent);
  }

  private presentXpResultInScene(
    scene: BattleSceneState,
    playerUnit: Unit,
    result: {xpGained: number; levelUps: Array<{label: string}>},
    silent: boolean,
  ): void {
    scene.xpGained = result.xpGained;
    scene.levelUpLabels = result.levelUps.map((item) => item.label);
    scene.playerSide.level = playerUnit.level;
    scene.playerSide.maxHp = playerUnit.maxHp;
    scene.playerSide.targetHp = playerUnit.hp;
    scene.playerSide.xpToNextLevel = playerUnit.xpToNextLevel;
    scene.playerSide.targetXp = playerUnit.xp;

    if (!silent && result.xpGained > 0) {
      scene.headline = `${playerUnit.name} gained +${result.xpGained} XP`;
      scene.subline =
        result.levelUps.length > 0
          ? `LEVEL UP! ${scene.levelUpLabels.join(' · ')}`
          : `XP ${playerUnit.xp} / ${playerUnit.xpToNextLevel}`;

      scene.floatingNumbers.push({
        xRatio: 0.73,
        yRatio: 0.36,
        text: `+${result.xpGained} XP`,
        color: PALETTE.xpColor,
        age: 0,
        duration: 1.0,
        isHeadline: true,
      });

      if (result.levelUps.length > 0) {
        tacticalAudio.play('levelUp');
        scene.levelUpPillarAge = 0.01;
        this.spawnBattleSparks(scene, 0.73, 0.54, PALETTE.auraColor, 26);
        scene.floatingNumbers.push({
          xRatio: 0.73,
          yRatio: 0.26,
          text: `LEVEL UP! ${scene.levelUpLabels[0]}`,
          color: PALETTE.auraColor,
          age: 0,
          duration: 1.2,
          isHeadline: true,
        });
      }
    }
  }

  private finishBattleScene(): void {
    const ctx = this.battleContext;
    const wasHealScene = this.snapshot.battleScene?.isHealScene ?? false;
    this.snapshot.battleScene = null;
    this.battleContext = null;
    this.isBusy = false;

    if (ctx && ctx.attacker.faction === 'player') {
      if (wasHealScene) {
        const healEval = evaluatePlayerHealIq(
          ctx.attacker,
          ctx.defender,
          ctx.allyHpBeforeHeal ?? ctx.defender.hp,
        );
        if (healEval) {
          this.applyIqAdjustment(healEval.delta, healEval.reason, ctx.defender);
        }
      } else if (ctx.forecast) {
        const attackerTile =
          this.snapshot.board[ctx.attacker.row]?.[ctx.attacker.col];
        const combatEval = evaluatePlayerCombatIq(
          ctx.attacker,
          ctx.defender,
          ctx.forecast,
          ctx.defender.hp <= 0,
          ctx.counterDamageTaken,
          attackerTile,
        );
        if (combatEval) {
          this.applyIqAdjustment(
            combatEval.delta,
            combatEval.reason,
            ctx.attacker,
          );
        }
      }
    }

    this.emitHud();
    if (ctx) {
      ctx.onComplete();
    }
  }

  private playAttackInitiationSound(
    unit: Unit,
    projectileStyle: BattleProjectileStyle | null,
  ): void {
    if (projectileStyle === 'arrow' || projectileStyle === 'sniper') {
      tacticalAudio.play('arrowLoose');
      return;
    }
    if (projectileStyle === 'arcane') {
      tacticalAudio.play('arcane');
      return;
    }
    if (projectileStyle === 'radiant') {
      tacticalAudio.play('radiantCast');
      return;
    }
    if (unit.canFly) {
      tacticalAudio.play('wingFlap');
    }
    tacticalAudio.play('swordSwing');
  }

  private tickBattleScene(dt: number): void {
    const scene = this.snapshot.battleScene;
    const ctx = this.battleContext;
    if (!scene || !ctx) {
      return;
    }

    if (scene.shakeMagnitude > 0.1) {
      scene.shakeMagnitude *= Math.pow(0.001, dt);
    } else {
      scene.shakeMagnitude = 0;
    }

    const combatants = [scene.playerSide, scene.enemySide];
    for (const side of combatants) {
      if (side.hitFlash > 0) {
        side.hitFlash = Math.max(0, side.hitFlash - dt);
      }
      const hpDiff = side.targetHp - side.displayHp;
      if (Math.abs(hpDiff) > 0.05) {
        side.displayHp += hpDiff * Math.min(1, dt * 11);
      } else {
        side.displayHp = side.targetHp;
      }
      const xpDiff = side.targetXp - side.displayXp;
      if (Math.abs(xpDiff) > 0.2) {
        side.displayXp += xpDiff * Math.min(1, dt * 8);
        scene.xpTickCooldown -= dt;
        if (scene.xpTickCooldown <= 0) {
          tacticalAudio.play('xpTick');
          scene.xpTickCooldown = 0.085;
        }
      } else {
        side.displayXp = side.targetXp;
      }
      if (side.isDefeated && side.dissolveProgress < 1) {
        side.dissolveProgress = Math.min(1, side.dissolveProgress + dt * 2.2);
      }
    }

    if (scene.slashProgress > 0) {
      scene.slashProgress += dt / 0.28;
      if (scene.slashProgress >= 1) {
        scene.slashProgress = 0;
        scene.slashTargetFaction = null;
      }
    }

    if (scene.vfxProgress > 0) {
      scene.vfxProgress += dt / 0.38;
      if (scene.vfxProgress >= 1) {
        scene.vfxProgress = 0;
        scene.vfxActorClass = null;
        scene.vfxTargetFaction = null;
      }
    }

    if (scene.healHaloAge > 0) {
      scene.healHaloAge += dt;
    }

    if (scene.levelUpPillarAge > 0) {
      scene.levelUpPillarAge += dt;
    }

    scene.floatingNumbers = scene.floatingNumbers.filter((item) => {
      item.age += dt;
      return item.age < item.duration;
    });

    scene.sparks = scene.sparks.filter((spark) => {
      spark.age += dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.vy += 0.55 * dt;
      return spark.age < spark.duration;
    });

    if (scene.hitStopTimer > 0) {
      scene.hitStopTimer = Math.max(0, scene.hitStopTimer - dt);
      return;
    }

    scene.stepAge += dt;

    const primaryChoreography = getClassAttackChoreography(ctx.attacker.unitClass);
    const counterChoreography = getClassAttackChoreography(ctx.defender.unitClass);
    const primaryProjectile = scene.isHealScene
      ? 'radiant'
      : getProjectileStyleForUnit(ctx.attacker);
    const counterProjectile = getProjectileStyleForUnit(ctx.defender);
    const primaryIsRanged = primaryProjectile !== null;
    const counterIsRanged = counterProjectile !== null;

    if (scene.step === 'intro') {
      scene.activeStepDuration = 0.34;
      scene.transitionAlpha = Math.min(1, scene.stepAge / 0.22);
      if (scene.stepAge >= 0.34) {
        scene.transitionAlpha = 1;
        scene.step = 'primaryDash';
        scene.stepAge = 0;
        scene.activeStepDuration = primaryChoreography.approachDuration;
        this.playAttackInitiationSound(ctx.attacker, primaryProjectile);
        if (primaryProjectile) {
          scene.beamStyle = primaryProjectile;
          scene.beamDirection = scene.isHealScene
            ? 'rightToLeft'
            : ctx.attacker.faction === 'player'
              ? 'rightToLeft'
              : 'leftToRight';
          scene.beamColor = resolveProjectileBeamColor(
            primaryProjectile,
            ctx.attacker.faction,
          );
        }
      }
      return;
    }

    if (scene.step === 'primaryDash') {
      const duration = primaryChoreography.approachDuration;
      scene.activeStepDuration = duration;
      const progress = Math.min(1, scene.stepAge / duration);

      if (primaryIsRanged) {
        const launchStart = primaryChoreography.projectileLaunchRatio;
        if (progress >= launchStart) {
          const flightProgress =
            (progress - launchStart) / Math.max(0.05, 1 - launchStart);
          scene.beamProgress = 1 - Math.pow(1 - Math.min(1, flightProgress), 2.2);
        } else {
          scene.beamProgress = 0;
        }
      }

      if (progress >= 1) {
        scene.beamProgress = 0;
        scene.beamDirection = null;
        this.applyPrimaryCombatOutcome(scene, ctx, false);
        scene.step = 'primaryImpact';
        scene.stepAge = 0;
        scene.activeStepDuration = scene.isHealScene
          ? 0.54
          : primaryChoreography.impactDuration;
      }
      return;
    }

    if (scene.step === 'primaryImpact') {
      const impactHold = scene.isHealScene
        ? 0.54
        : primaryChoreography.impactDuration;
      scene.activeStepDuration = impactHold;
      if (scene.stepAge >= impactHold) {
        scene.step = 'primaryReturn';
        scene.stepAge = 0;
        scene.activeStepDuration = primaryChoreography.returnDuration;
      }
      return;
    }

    if (scene.step === 'primaryReturn') {
      const duration = primaryChoreography.returnDuration;
      scene.activeStepDuration = duration;
      const progress = Math.min(1, scene.stepAge / duration);

      if (progress >= 1) {
        if (scene.hasCounter) {
          scene.step = 'counterDash';
          scene.stepAge = 0;
          scene.activeStepDuration = counterChoreography.approachDuration;
          scene.headline = `${ctx.defender.name} counter-attacks!`;
          scene.subline = 'Riposte strike initiated';
          this.playAttackInitiationSound(ctx.defender, counterProjectile);
          if (counterProjectile) {
            scene.beamStyle = counterProjectile;
            scene.beamDirection =
              ctx.defender.faction === 'player' ? 'rightToLeft' : 'leftToRight';
            scene.beamColor = resolveProjectileBeamColor(
              counterProjectile,
              ctx.defender.faction,
            );
          }
        } else {
          this.applyBattleXpOutcome(scene, ctx, false);
          scene.step = scene.xpGained > 0 ? 'xpSummary' : 'outro';
          scene.stepAge = 0;
          scene.activeStepDuration =
            scene.levelUpLabels.length > 0 ? 1.15 : 0.65;
        }
      }
      return;
    }

    if (scene.step === 'counterDash') {
      const duration = counterChoreography.approachDuration;
      scene.activeStepDuration = duration;
      const progress = Math.min(1, scene.stepAge / duration);

      if (counterIsRanged) {
        const launchStart = counterChoreography.projectileLaunchRatio;
        if (progress >= launchStart) {
          const flightProgress =
            (progress - launchStart) / Math.max(0.05, 1 - launchStart);
          scene.beamProgress = 1 - Math.pow(1 - Math.min(1, flightProgress), 2.2);
        } else {
          scene.beamProgress = 0;
        }
      }

      if (progress >= 1) {
        scene.beamProgress = 0;
        scene.beamDirection = null;
        this.applyCounterCombatOutcome(scene, ctx, false);
        scene.step = 'counterImpact';
        scene.stepAge = 0;
        scene.activeStepDuration = counterChoreography.impactDuration;
      }
      return;
    }

    if (scene.step === 'counterImpact') {
      const duration = counterChoreography.impactDuration;
      scene.activeStepDuration = duration;
      if (scene.stepAge >= duration) {
        scene.step = 'counterReturn';
        scene.stepAge = 0;
        scene.activeStepDuration = counterChoreography.returnDuration;
      }
      return;
    }

    if (scene.step === 'counterReturn') {
      const duration = counterChoreography.returnDuration;
      scene.activeStepDuration = duration;
      const progress = Math.min(1, scene.stepAge / duration);

      if (progress >= 1) {
        this.applyBattleXpOutcome(scene, ctx, false);
        scene.step = scene.xpGained > 0 ? 'xpSummary' : 'outro';
        scene.stepAge = 0;
        scene.activeStepDuration =
          scene.levelUpLabels.length > 0 ? 1.15 : 0.65;
      }
      return;
    }

    if (scene.step === 'xpSummary') {
      const holdDuration = scene.levelUpLabels.length > 0 ? 1.15 : 0.65;
      scene.activeStepDuration = holdDuration;
      if (scene.stepAge >= holdDuration) {
        scene.step = 'outro';
        scene.stepAge = 0;
        scene.activeStepDuration = 0.22;
      }
      return;
    }

    if (scene.step === 'outro') {
      scene.activeStepDuration = 0.22;
      scene.transitionAlpha = Math.max(0, 1 - scene.stepAge / 0.22);
      if (scene.stepAge >= 0.22) {
        this.finishBattleScene();
      }
    }
  }

  private tickDialogueScene(dt: number): void {
    const scene = this.snapshot.dialogueScene;
    if (!scene) {
      return;
    }

    const activeLine = scene.lines[scene.currentIndex];
    if (!activeLine || scene.revealedChars >= activeLine.text.length) {
      return;
    }

    const prevChars = Math.floor(scene.revealedChars);
    scene.revealedChars = Math.min(
      activeLine.text.length,
      scene.revealedChars + dt * 52,
    );
    scene.blipCooldown = Math.max(0, scene.blipCooldown - dt);

    const nextChars = Math.floor(scene.revealedChars);
    if (nextChars > prevChars && scene.blipCooldown <= 0) {
      const newestChar = activeLine.text[nextChars - 1] ?? '';
      const isSpeakableChar = /[a-zA-Z0-9]/.test(newestChar);
      if (isSpeakableChar) {
        tacticalAudio.play(getVoiceBlipCue(activeLine.voicePitch));
        scene.blipCooldown = 0.055;
      }
    }
  }

  private syncDeployedRosterProgress(): void {
    const battleUnitsById = new Map<string, Unit>();
    for (const unit of this.snapshot.units) {
      if (unit.faction === 'player') {
        battleUnitsById.set(unit.id, unit);
      }
    }

    this.campaignRoster = this.campaignRoster.map((rosterUnit) => {
      const battleVersion = battleUnitsById.get(rosterUnit.id);
      if (!battleVersion) {
        return rosterUnit;
      }
      const gear = computeUnitEquipmentBonuses(rosterUnit);
      const baseMaxHp = Math.max(
        rosterUnit.maxHp,
        battleVersion.maxHp - gear.maxHpBonus,
      );
      return {
        ...rosterUnit,
        level: battleVersion.level,
        xp: battleVersion.xp,
        xpToNextLevel: battleVersion.xpToNextLevel,
        maxHp: baseMaxHp,
        hp: baseMaxHp,
        attack: battleVersion.attack,
        defense: battleVersion.defense,
        move: battleVersion.move,
        healPower: battleVersion.healPower,
        critChance: battleVersion.critChance,
        tempAttackBonus: 0,
      };
    });
  }

  private checkBattleOutcome(): boolean {
    const playerCommanders = this.snapshot.units.filter(
      (unit) => unit.faction === 'player' && unit.unitClass === 'sovereign',
    );
    const brotherhoodPactBroken =
      playerCommanders.length === 0 ||
      playerCommanders.some((commander) => commander.hp <= 0);

    if (brotherhoodPactBroken) {
      this.clearScheduledTimeouts();
      this.syncDeployedRosterProgress();
      this.persistCampaignCheckpoint();
      this.isBusy = false;
      this.snapshot.screen = 'defeat';
      tacticalAudio.play('defeat');
      this.emitHud();
      return true;
    }

    const enemySovereignAlive = this.snapshot.units.some(
      (unit) =>
        unit.faction === 'enemy' &&
        unit.unitClass === 'sovereign' &&
        unit.hp > 0,
    );
    const anyEnemyAlive = this.snapshot.units.some(
      (unit) => unit.faction === 'enemy' && unit.hp > 0,
    );

    const stageWon = !enemySovereignAlive || !anyEnemyAlive;
    if (stageWon) {
      this.clearScheduledTimeouts();
      this.isBusy = false;
      this.snapshot.stats.stagesCleared += 1;
      tacticalAudio.play('victory');

      this.syncDeployedRosterProgress();

      const chapter = getChapterById(this.activeChapterId);
      const isFirstClear = !this.completedChapterIds.includes(chapter.id);
      if (isFirstClear) {
        this.completedChapterIds = [...this.completedChapterIds, chapter.id];
      }

      this.gold += chapter.goldReward;

      let rewardItemName: string | null = null;
      if (isFirstClear && chapter.rewardEquipmentId) {
        const rewardItem = getEquipmentById(chapter.rewardEquipmentId);
        if (rewardItem) {
          this.inventoryEquipmentIds = [
            ...this.inventoryEquipmentIds,
            rewardItem.id,
          ];
          rewardItemName = rewardItem.name;
        }
      }

      let recruitName: string | null = null;
      if (isFirstClear && chapter.recruitReward) {
        const alreadyInRoster = this.campaignRoster.some(
          (unit) => unit.id === chapter.recruitReward?.id,
        );
        if (!alreadyInRoster) {
          const newHero = createUnitFromArchetype(
            chapter.recruitReward.id,
            chapter.recruitReward.name,
            chapter.recruitReward.unitClass,
            'player',
            0,
            0,
            this.snapshot.effects,
          );
          this.campaignRoster = [...this.campaignRoster, newHero];
          recruitName = newHero.name;
        }
      }

      const nextStoryChapter = CAMPAIGN_CHAPTERS.find(
        (candidate) =>
          !candidate.isSkirmish &&
          !this.completedChapterIds.includes(candidate.id) &&
          isChapterUnlocked(candidate, this.completedChapterIds),
      );
      if (nextStoryChapter) {
        this.activeChapterId = nextStoryChapter.id;
        this.ensureValidDeploymentForChapter(nextStoryChapter.maxDeployCount);
      } else {
        this.ensureValidDeploymentForChapter(chapter.maxDeployCount);
      }

      this.lastVictoryReward = {
        chapterTitle: `${chapter.chapterLabel}: ${chapter.title}`,
        goldEarned: chapter.goldReward,
        rewardItemName,
        recruitName,
      };
      this.persistCampaignCheckpoint();

      const victoryLines = getStageVictoryDialogue(this.snapshot.stageNumber);
      this.startDialogueSequence(
        victoryLines,
        `${chapter.chapterLabel.toUpperCase()} VICTORY`,
        () => {
          if (chapter.isSkirmish) {
            this.openWorldMap();
          } else {
            this.snapshot.upgradeChoices = this.rollUpgradeDraftChoices();
            this.snapshot.screen = 'upgrade';
            this.emitHud();
          }
        },
      );
      return true;
    }

    return false;
  }

  private rollUpgradeDraftChoices(): UpgradeOption[] {
    const eligible = UPGRADE_CATALOG.filter((upgrade) => {
      if (
        upgrade.id === 'forest-stride' &&
        this.snapshot.effects.forestStrideEnabled
      ) {
        return false;
      }
      return true;
    });

    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  private spawnFloatingCallout(
    x: number,
    y: number,
    text: string,
    color: string,
  ): void {
    this.snapshot.floatingCallouts.push({
      id: `callout-${this.nextEffectCounter++}`,
      x,
      y,
      text,
      color,
      age: 0,
      duration: 0.95,
    });
  }

  private spawnShockwave(x: number, y: number, color: string): void {
    this.snapshot.shockwaves.push({
      id: `shock-${this.nextEffectCounter++}`,
      x,
      y,
      maxRadius: 0.75,
      color,
      age: 0,
      duration: 0.45,
    });
  }

  private spawnParticleBurst(
    x: number,
    y: number,
    color: string,
    count: number,
  ): void {
    for (let index = 0; index < count; index++) {
      const angle = (Math.PI * 2 * index) / Math.max(1, count);
      const speed = 1.2 + (index % 3) * 0.45;
      this.snapshot.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + (index % 2),
        color,
        age: 0,
        duration: 0.55,
      });
    }
  }

  public tick(deltaSeconds: number): void {
    const dt = Math.min(0.05, deltaSeconds);

    if (this.snapshot.battleScene) {
      this.tickBattleScene(dt);
      return;
    }

    if (this.snapshot.dialogueScene) {
      this.tickDialogueScene(dt);
    }

    if (this.snapshot.shakeMagnitude > 0.05) {
      this.snapshot.shakeMagnitude *= Math.pow(0.0015, dt);
    } else {
      this.snapshot.shakeMagnitude = 0;
    }

    for (const unit of this.snapshot.units) {
      if (unit.hitFlashTimer > 0) {
        unit.hitFlashTimer = Math.max(0, unit.hitFlashTimer - dt);
      }
    }

    if (this.activeMoveAnimation) {
      const anim = this.activeMoveAnimation;
      const unit = this.snapshot.units.find((item) => item.id === anim.unitId);
      if (!unit || anim.path.length < 2) {
        this.activeMoveAnimation = null;
      } else {
        const segmentDuration = 0.11;
        anim.segmentProgress += dt / segmentDuration;
        while (
          anim.segmentProgress >= 1 &&
          anim.segmentIndex < anim.path.length - 2
        ) {
          anim.segmentProgress -= 1;
          anim.segmentIndex += 1;
          if (!unit.canFly) {
            tacticalAudio.play(getMovementSoundCue(unit));
          }
        }

        const from = anim.path[anim.segmentIndex];
        const to = anim.path[anim.segmentIndex + 1];
        const clampedT = Math.min(1, anim.segmentProgress);
        const easedT = 1 - Math.pow(1 - clampedT, 3);

        unit.renderX = from.col + (to.col - from.col) * easedT;
        unit.renderY = from.row + (to.row - from.row) * easedT;

        const finishedPath =
          anim.segmentIndex >= anim.path.length - 2 && anim.segmentProgress >= 1;
        if (finishedPath) {
          const finalCoord = anim.path[anim.path.length - 1];
          unit.renderX = finalCoord.col;
          unit.renderY = finalCoord.row;
          const finishCallback = anim.onComplete;
          this.activeMoveAnimation = null;
          finishCallback();
        }
      }
    }

    this.snapshot.floatingCallouts = this.snapshot.floatingCallouts.filter(
      (item) => {
        item.age += dt;
        return item.age < item.duration;
      },
    );

    this.snapshot.projectiles = this.snapshot.projectiles.filter((item) => {
      item.age += dt;
      return item.age < item.duration;
    });

    this.snapshot.particles = this.snapshot.particles.filter((item) => {
      item.age += dt;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.vx *= Math.pow(0.08, dt);
      item.vy *= Math.pow(0.08, dt);
      return item.age < item.duration;
    });

    this.snapshot.shockwaves = this.snapshot.shockwaves.filter((item) => {
      item.age += dt;
      return item.age < item.duration;
    });

    this.snapshot.slashTrails = this.snapshot.slashTrails.filter((item) => {
      item.age += dt;
      return item.age < item.duration;
    });

    if (this.snapshot.phaseBanner) {
      this.snapshot.phaseBanner.age += dt;
      if (this.snapshot.phaseBanner.age >= this.snapshot.phaseBanner.duration) {
        this.snapshot.phaseBanner = null;
      }
    }
  }
}
