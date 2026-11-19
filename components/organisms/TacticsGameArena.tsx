'use client';

import {useCallback, useEffect, useRef, useState} from 'react';
import {TacticalActionDock} from '@/components/molecules/TacticalActionDock';
import {TacticalHudBar} from '@/components/molecules/TacticalHudBar';
import {WeaponTriangleStrip} from '@/components/molecules/WeaponTriangleStrip';
import {CharacterInfoModal} from '@/components/organisms/CharacterInfoModal';
import {PartyPrepScreen} from '@/components/organisms/PartyPrepScreen';
import {WorldMapScreen} from '@/components/organisms/WorldMapScreen';
import {tacticalAudio} from '@/lib/tactics/audio';
import {
  computeBoardMetrics,
  pointToBoardCoord,
  renderTacticsCanvas,
} from '@/lib/tactics/canvasRenderer';
import {CAMPAIGN_CHAPTERS} from '@/lib/tactics/chapters';
import {
  TacticsGameController,
  type HudSummary,
} from '@/lib/tactics/gameController';
import {INITIAL_CONSUMABLES, STARTING_GOLD} from '@/lib/tactics/rpgCatalog';
import {spriteAtlas} from '@/lib/tactics/spriteAtlas';
import type {
  ConsumableType,
  DifficultyMode,
  EquipmentSlot,
  HitBoxRect,
} from '@/lib/tactics/types';

function findHitBoxAtPoint(
  hitBoxes: HitBoxRect[],
  x: number,
  y: number,
): HitBoxRect | undefined {
  return hitBoxes.find(
    (box) =>
      x >= box.x &&
      x <= box.x + box.width &&
      y >= box.y &&
      y <= box.y + box.height,
  );
}

const DEFAULT_HUD: HudSummary = {
  screen: 'title',
  stageNumber: 1,
  stageTitle: 'Chapter 1 · Riverrun at the Hall',
  boardCols: 8,
  boardRows: 8,
  turnNumber: 1,
  phase: 'player',
  canUndoMove: false,
  canWaitSelected: false,
  canSelfHealSelected: false,
  canUseItemSelected: false,
  selectedUnitNeedsHeal: false,
  readyPlayerUnits: 0,
  totalPlayerUnits: 0,
  aliveEnemies: 0,
  adaptationNote: 'Storm Doctrine: Balanced Monsoon Front',
  acquiredUpgradeTitles: [],
  isAnimating: false,
  inspectedUnit: null,
  difficulty: 'story',
  gold: STARTING_GOLD,
  activeChapterId: CAMPAIGN_CHAPTERS[0].id,
  completedChapterIds: [],
  campaignRoster: [],
  deployedUnitIds: [],
  inventoryEquipmentIds: [],
  consumables: {...INITIAL_CONSUMABLES},
  recruitedTavernIds: [],
  lastVictoryReward: null,
  twinCommanders: [],
};

export function TacticsGameArena() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controllerRef = useRef<TacticsGameController | null>(null);
  const hitBoxesRef = useRef<HitBoxRect[]>([]);
  const canvasSizeRef = useRef<{width: number; height: number}>({
    width: 800,
    height: 640,
  });

  const [hud, setHud] = useState<HudSummary>(DEFAULT_HUD);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    spriteAtlas.preload();

    const controller = new TacticsGameController((nextHud) => {
      setHud(nextHud);
    });
    controllerRef.current = controller;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return () => controller.dispose();
    }

    const syncCanvasResolution = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) {
        return;
      }
      const cssWidth = Math.max(300, Math.floor(rect.width));
      const cssHeight = Math.max(340, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      canvasSizeRef.current = {width: cssWidth, height: cssHeight};

      const isPortrait = cssHeight > cssWidth * 1.05;
      controller.setViewportOrientation(isPortrait ? 'portrait' : 'landscape');

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    syncCanvasResolution();
    const resizeObserver = new ResizeObserver(syncCanvasResolution);
    resizeObserver.observe(container);

    let frameId = 0;
    let lastTimestamp = performance.now();

    const animateFrame = (now: number) => {
      const deltaSeconds = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      controller.tick(deltaSeconds);

      const snapshot = controller.getSnapshot();
      const usesCanvasView =
        snapshot.screen !== 'worldMap' && snapshot.screen !== 'partyPrep';
      if (usesCanvasView) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const {width, height} = canvasSizeRef.current;
          const metrics = computeBoardMetrics(
            width,
            height,
            snapshot.boardCols,
            snapshot.boardRows,
          );
          hitBoxesRef.current = renderTacticsCanvas(
            ctx,
            snapshot,
            metrics,
            now / 1000,
          );
        }
      }

      frameId = window.requestAnimationFrame(animateFrame);
    };

    frameId = window.requestAnimationFrame(animateFrame);

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (controller.isInBattleScene()) {
        if (key === ' ' || key === 'enter' || key === 'escape') {
          event.preventDefault();
          controller.skipBattleScene();
        }
        return;
      }

      if (controller.isInDialogueScene()) {
        if (key === ' ' || key === 'enter') {
          event.preventDefault();
          controller.advanceDialogue();
        } else if (key === 'escape') {
          event.preventDefault();
          controller.skipDialogue();
        }
        return;
      }

      if (key === 'escape') {
        controller.dismissInspectedUnit();
        return;
      }

      if (key === 'z') {
        controller.undoPendingMove();
      } else if (key === ' ') {
        event.preventDefault();
        controller.waitSelectedUnit();
      } else if (key === 'e') {
        controller.endPlayerTurn();
      } else if (key === '1' || key === '2' || key === '3') {
        controller.selectUpgradeByIndex(Number(key) - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', handleKeyDown);
      resizeObserver.disconnect();
      controller.dispose();
    };
  }, []);

  const getPointerCoords = useCallback(
    (clientX: number, clientY: number): {x: number; y: number} | null => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return null;
      }
      const rect = canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    [],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const controller = controllerRef.current;
      const point = getPointerCoords(event.clientX, event.clientY);
      if (!controller || !point) {
        return;
      }

      if (controller.isInBattleScene()) {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.style.cursor = 'pointer';
        }
        return;
      }

      const hoveredHitBox = findHitBoxAtPoint(
        hitBoxesRef.current,
        point.x,
        point.y,
      );
      controller.setHoveredCanvasButton(hoveredHitBox ? hoveredHitBox.id : null);

      const snapshot = controller.getSnapshot();
      const {width, height} = canvasSizeRef.current;
      const metrics = computeBoardMetrics(
        width,
        height,
        snapshot.boardCols,
        snapshot.boardRows,
      );
      const boardCoord = pointToBoardCoord(point.x, point.y, metrics);
      controller.setHoveredTile(boardCoord);

      const canvas = canvasRef.current;
      if (canvas) {
        const isInteractive = hoveredHitBox !== undefined || boardCoord !== null;
        canvas.style.cursor = isInteractive ? 'pointer' : 'default';
      }
    },
    [getPointerCoords],
  );

  const handlePointerLeave = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) {
      return;
    }
    controller.setHoveredTile(null);
    controller.setHoveredCanvasButton(null);
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (event.button === 2) {
        return;
      }
      const controller = controllerRef.current;
      if (!controller) {
        return;
      }

      if (controller.isInBattleScene()) {
        controller.skipBattleScene();
        return;
      }

      const point = getPointerCoords(event.clientX, event.clientY);
      if (!point) {
        return;
      }

      const clickedHitBox = findHitBoxAtPoint(
        hitBoxesRef.current,
        point.x,
        point.y,
      );
      if (clickedHitBox) {
        controller.handleCanvasButtonClick(clickedHitBox.id);
        return;
      }

      const snapshot = controller.getSnapshot();
      const {width, height} = canvasSizeRef.current;
      const metrics = computeBoardMetrics(
        width,
        height,
        snapshot.boardCols,
        snapshot.boardRows,
      );
      const boardCoord = pointToBoardCoord(point.x, point.y, metrics);
      if (boardCoord) {
        controller.setHoveredTile(boardCoord);
        controller.handleBoardClick(boardCoord);
      }
    },
    [getPointerCoords],
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      controllerRef.current?.handleRightClickCancel();
    },
    [],
  );

  const handleUndoMove = useCallback(() => {
    controllerRef.current?.undoPendingMove();
  }, []);

  const handleWaitUnit = useCallback(() => {
    controllerRef.current?.waitSelectedUnit();
  }, []);

  const handleEndTurn = useCallback(() => {
    controllerRef.current?.endPlayerTurn();
  }, []);

  const handleSelfHealUnit = useCallback(() => {
    controllerRef.current?.selfHealSelectedUnit();
  }, []);

  const handleUseConsumable = useCallback((consumableId: ConsumableType) => {
    controllerRef.current?.useConsumableOnSelectedUnit(consumableId);
  }, []);

  const handleDismissInspectedUnit = useCallback(() => {
    controllerRef.current?.dismissInspectedUnit();
  }, []);

  const handleOpenWorldMap = useCallback(() => {
    controllerRef.current?.openWorldMap();
  }, []);

  const handleSelectChapter = useCallback((chapterId: string) => {
    controllerRef.current?.selectChapter(chapterId);
  }, []);

  const handleOpenPartyPrep = useCallback((chapterId?: string) => {
    controllerRef.current?.openPartyPrep(chapterId);
  }, []);

  const handleDeployActiveChapter = useCallback(() => {
    controllerRef.current?.deployActiveChapter();
  }, []);

  const handleSetDifficulty = useCallback((difficulty: DifficultyMode) => {
    controllerRef.current?.setDifficulty(difficulty);
  }, []);

  const handleDismissRewardBanner = useCallback(() => {
    controllerRef.current?.dismissVictoryRewardBanner();
  }, []);

  const handleToggleDeploy = useCallback((unitId: string) => {
    controllerRef.current?.toggleUnitDeployment(unitId);
  }, []);

  const handleMoveDeployOrder = useCallback(
    (unitId: string, direction: -1 | 1) => {
      controllerRef.current?.moveDeploymentOrder(unitId, direction);
    },
    [],
  );

  const handleEquipItem = useCallback((unitId: string, equipmentId: string) => {
    controllerRef.current?.equipItemOnUnit(unitId, equipmentId);
  }, []);

  const handleUnequipSlot = useCallback(
    (unitId: string, slot: EquipmentSlot) => {
      controllerRef.current?.unequipSlotFromUnit(unitId, slot);
    },
    [],
  );

  const handleBuyEquipment = useCallback((equipmentId: string) => {
    controllerRef.current?.buyEquipmentItem(equipmentId);
  }, []);

  const handleBuyAndEquip = useCallback(
    (unitId: string, equipmentId: string) => {
      controllerRef.current?.buyAndEquipEquipmentItem(unitId, equipmentId);
    },
    [],
  );

  const handleBuyConsumable = useCallback((consumableId: ConsumableType) => {
    controllerRef.current?.buyConsumableItem(consumableId);
  }, []);

  const handleRecruitHero = useCallback((offerId: string) => {
    controllerRef.current?.recruitTavernHero(offerId);
  }, []);

  const handleReturnTitle = useCallback(() => {
    controllerRef.current?.returnToTitle();
  }, []);

  const handleRestart = useCallback(() => {
    controllerRef.current?.startNewCampaign();
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = tacticalAudio.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  const isWorldMapScreen = hud.screen === 'worldMap';
  const isPartyPrepScreen = hud.screen === 'partyPrep';
  const isCanvasVisible = !isWorldMapScreen && !isPartyPrepScreen;

  return (
    <div className="min-h-screen h-dvh w-full bg-[#0f172a] text-slate-100 flex flex-col overflow-hidden">
      <TacticalHudBar
        hud={hud}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenWorldMap={handleOpenWorldMap}
        onReturnTitle={handleReturnTitle}
        onRestart={handleRestart}
      />

      {isWorldMapScreen && (
        <WorldMapScreen
          hud={hud}
          onSelectChapter={handleSelectChapter}
          onOpenPartyPrep={handleOpenPartyPrep}
          onDeployActiveChapter={handleDeployActiveChapter}
          onSetDifficulty={handleSetDifficulty}
          onDismissRewardBanner={handleDismissRewardBanner}
        />
      )}

      {isPartyPrepScreen && (
        <PartyPrepScreen
          hud={hud}
          onBackToMap={handleOpenWorldMap}
          onDeployChapter={handleDeployActiveChapter}
          onToggleDeploy={handleToggleDeploy}
          onMoveDeployOrder={handleMoveDeployOrder}
          onEquipItem={handleEquipItem}
          onUnequipSlot={handleUnequipSlot}
          onBuyEquipment={handleBuyEquipment}
          onBuyAndEquip={handleBuyAndEquip}
          onBuyConsumable={handleBuyConsumable}
          onRecruitHero={handleRecruitHero}
        />
      )}

      <main
        ref={containerRef}
        className={
          isCanvasVisible
            ? 'flex-1 w-full max-w-[1160px] mx-auto relative min-h-0 flex items-center justify-center'
            : 'hidden'
        }
      >
        <canvas
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerDown}
          onContextMenu={handleContextMenu}
          aria-label="Tales of Xadion: Birth of the Brotherhood tactical game board"
          className="block touch-none select-none"
        />
      </main>

      <TacticalActionDock
        hud={hud}
        onUndoMove={handleUndoMove}
        onWaitUnit={handleWaitUnit}
        onEndTurn={handleEndTurn}
        onSelfHealUnit={handleSelfHealUnit}
        onUseConsumable={handleUseConsumable}
      />

      {isCanvasVisible && (
        <WeaponTriangleStrip
          adaptationNote={hud.adaptationNote}
          acquiredUpgradeTitles={hud.acquiredUpgradeTitles}
          showActiveMeta={hud.screen !== 'title'}
        />
      )}

      <CharacterInfoModal
        unit={hud.inspectedUnit}
        inventoryEquipmentIds={hud.inventoryEquipmentIds}
        onDismiss={handleDismissInspectedUnit}
        onWaitUnit={handleWaitUnit}
        onSelfHealUnit={handleSelfHealUnit}
        onEquipItem={handleEquipItem}
        onUnequipSlot={handleUnequipSlot}
      />
    </div>
  );
}
