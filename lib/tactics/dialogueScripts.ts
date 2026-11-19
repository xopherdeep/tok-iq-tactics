import type {BoardMode, DialogueLine, DominantDoctrine} from './types';

export function getStageIntroDialogue(
  stageNumber: number,
  doctrine: DominantDoctrine,
  boardMode: BoardMode,
): DialogueLine[] {
  if (stageNumber === 1) {
    const doctrineNote =
      boardMode === 'classic64'
        ? 'Under Tau Doctrine (τ), all sixty-four waystones lock into the classic 8×8 crossing.'
        : 'Swap your formation on the χ waystones before Turn 1—every clean lethal raises our Tactics IQ.';
    return [
      {
        speakerName: 'The River',
        speakerTitle: 'Spirit of the Dry Wash · Spring 2004',
        speakerClass: 'healer',
        speakerFaction: 'player',
        text: 'Riverrun returns to the dry wash, Keeper. The Ricorso monsoon gathers above the Hall—sixty-four waystones stand between the storm and your sleeping children.',
        voicePitch: 'high',
      },
      {
        speakerName: 'X, The Keeper',
        speakerTitle: 'Equinox Sovereign · Hall of the Gods',
        speakerClass: 'sovereign',
        speakerFaction: 'player',
        text: `Chairs up, lamps trimmed, cistern full. ${doctrineNote}`,
        voicePitch: 'low',
      },
      {
        speakerName: 'Sol',
        speakerTitle: 'Twin Commander · Solar Paladin',
        speakerClass: 'sovereign',
        speakerFaction: 'player',
        text: 'Stand beside me for Lantern Rally (+2 ATK, +10% HIT) and our Twin Pact shield (+1 DEF). If either Commander falls, the Brotherhood breaks.',
        voicePitch: 'mid',
      },
      {
        speakerName: 'Coyote Alpha',
        speakerTitle: 'Monsoon Stalker · Wash Vanguard',
        speakerClass: 'sovereign',
        speakerFaction: 'enemy',
        text: 'Two lanterns on sixty-four stones! Let the dust wraiths split them apart before the Sevens Night storm even arrives!',
        voicePitch: 'low',
      },
    ];
  }

  if (stageNumber === 2) {
    const scaleNote =
      boardMode === 'dynamic'
        ? 'The Campaign of the Wash widens across an 80-stone crossing—lantern pylons and flooded channels cut the pass.'
        : 'Tau Doctrine (τ) holds the narrow 64-stone ramparts above the rising floodwaters.';

    return [
      {
        speakerName: 'Infinidee',
        speakerTitle: 'Light Seer (♗) · Sevens Night 2007',
        speakerClass: 'arcanist',
        speakerFaction: 'player',
        text: `${scaleNote} My Chrono runes pierce desert masonry, and once per battle I can anchor a Chrono Rewind (-10 IQ) if the line buckles.`,
        voicePitch: 'high',
      },
      {
        speakerName: 'Gaea',
        speakerTitle: 'Sacred Mender (❀) · Living Oak',
        speakerClass: 'healer',
        speakerFaction: 'player',
        text: 'My Healing Dew reaches across the wash. Save a comrade below 35% HP for a Tactical Save (+2 IQ), and never leave our line exposed on open sand.',
        voicePitch: 'high',
      },
      {
        speakerName: 'Black Knight',
        speakerTitle: 'Void Dread Vanguard · Sevens Night',
        speakerClass: 'sovereign',
        speakerFaction: 'enemy',
        text: 'Mortals built fences and forgot the dry wash. Test your sharpest strategy against obsidian steel!',
        voicePitch: 'low',
      },
    ];
  }

  const counterSpeechByDoctrine: Record<DominantDoctrine, string> = {
    arcane:
      'Your Light Seers and Thornbows have dictated the wash long enough. Dust Wraiths—sweep their flanks before they channel!',
    guerrilla:
      'Hiding in the Saguaro Groves will not save the Brotherhood. Storm Cantors, burn through their cover!',
    blitz:
      'Your Shadow Dragoons think the twilight skies belong to them. Lightning Eyes—pin them down behind our Stone Brutes!',
    phalanx:
      'Holding the Twin Pact tight behind Twilight Wardens? Our Storm Cantors will shatter your wall while Wash Spirits mend the tide.',
    balanced:
      'Your Tactics IQ climbs across Xadion. Answer the Brotherhood with every counter-doctrine of the turning Age!',
  };

  return [
    {
      speakerName: stageNumber >= 5 ? 'Thunderhead' : 'Anvil Sentinel',
      speakerTitle:
        stageNumber >= 5
          ? 'Anvil Cloud Sovereign · Ricorso'
          : `Stage ${stageNumber} · Storm Tactician`,
      speakerClass: 'sovereign',
      speakerFaction: 'enemy',
      text: counterSpeechByDoctrine[doctrine],
      voicePitch: 'low',
    },
    {
      speakerName: 'Luna',
      speakerTitle: 'Shadow Dragoon (♘) · Crescent Lance',
      speakerClass: 'striker',
      speakerFaction: 'player',
      text: 'At 115 IQ we read their sightlines before they strike; at 130 IQ our Grandmaster precision breaks any storm wall.',
      voicePitch: 'high',
    },
    {
      speakerName: 'X, The Keeper',
      speakerTitle: 'Equinox Sovereign (♔) · Hall of the Gods',
      speakerClass: 'sovereign',
      speakerFaction: 'player',
      text: 'Water for strangers, and a bar for anyone who brings trouble. Outsmart the storm—hold the sixty-four waystones!',
      voicePitch: 'low',
    },
  ];
}

export function getBossEngagementDialogue(
  stageNumber: number,
  enemyBossName: string,
): DialogueLine[] {
  if (stageNumber === 1) {
    return [
      {
        speakerName: enemyBossName,
        speakerTitle: 'Monsoon Alpha · Commander Clash',
        speakerClass: 'sovereign',
        speakerFaction: 'enemy',
        text: 'You broke through my pack?! Face the storm front yourself, Keeper!',
        voicePitch: 'low',
      },
      {
        speakerName: 'X, The Keeper',
        speakerTitle: 'Equinox Sovereign · Hall of the Gods',
        speakerClass: 'sovereign',
        speakerFaction: 'player',
        text: 'The Hall stands till morning. Turn back into the dry wash or fall where you stand!',
        voicePitch: 'low',
      },
    ];
  }

  if (stageNumber === 2 || stageNumber === 3) {
    return [
      {
        speakerName: enemyBossName,
        speakerTitle: 'Sevens Night Commander Clash',
        speakerClass: 'sovereign',
        speakerFaction: 'enemy',
        text: 'Your IQ tactics mean nothing when obsidian steel cleaves the crossing!',
        voicePitch: 'low',
      },
      {
        speakerName: 'X, The Keeper',
        speakerTitle: 'Equinox Sovereign · Hall of the Gods',
        speakerClass: 'sovereign',
        speakerFaction: 'player',
        text: 'Every stone we hold tonight becomes a piece on a greater board. Stand fast, Sol!',
        voicePitch: 'low',
      },
    ];
  }

  return [
    {
      speakerName: enemyBossName,
      speakerTitle: 'Ricorso Storm Sovereign · Commander Clash',
      speakerClass: 'sovereign',
      speakerFaction: 'enemy',
      text: 'The Age turns back to Flood and Lightning! One fallen Commander shatters your Brotherhood forever!',
      voicePitch: 'low',
    },
    {
      speakerName: 'Sol',
      speakerTitle: 'Twin Commander · Solar Paladin',
      speakerClass: 'sovereign',
      speakerFaction: 'player',
      text: 'Then strike at both of us—our lantern light outlasts every monsoon in Xadion!',
      voicePitch: 'mid',
    },
  ];
}

export function getStageVictoryDialogue(stageNumber: number): DialogueLine[] {
  if (stageNumber >= 5) {
    return [
      {
        speakerName: 'The River',
        speakerTitle: 'Spirit of the Dry Wash · Epilogue',
        speakerClass: 'healer',
        speakerFaction: 'player',
        text: 'The anvil clouds part over sixty-four sunlit waystones. Every crossing you defended—King, Rook, Knight, Bishop, Jumper, and Queen—now remembers its shape.',
        voicePitch: 'high',
      },
      {
        speakerName: 'X, The Keeper',
        speakerTitle: 'Equinox Sovereign · Forge of TrenChess',
        speakerClass: 'sovereign',
        speakerFaction: 'player',
        text: 'Let the children wake to running water and clear skies. Carve these sixty-four stones in memory of the Brotherhood—this is where TrenChess begins.',
        voicePitch: 'low',
      },
    ];
  }

  if (stageNumber === 1) {
    return [
      {
        speakerName: 'The River',
        speakerTitle: 'Spirit of the Dry Wash',
        speakerClass: 'healer',
        speakerFaction: 'player',
        text: 'Dawn breaks in a rainbow over running water. The footbridge holds—yet Sevens Night gathers beyond the red-rock basin.',
        voicePitch: 'high',
      },
      {
        speakerName: 'X, The Keeper',
        speakerTitle: 'Equinox Sovereign · Hall of the Gods',
        speakerClass: 'sovereign',
        speakerFaction: 'player',
        text: 'Well played, Brotherhood. Review our IQ report, claim a boon from the wash, and rally at the Hall common room.',
        voicePitch: 'low',
      },
    ];
  }

  return [
    {
      speakerName: 'Gaea',
      speakerTitle: 'Sacred Mender · Living Oak',
      speakerClass: 'healer',
      speakerFaction: 'player',
      text: 'The wash grows calm beneath lantern gold. Let me pour Healing Dew for the squad while X and Sol claim our next Brotherhood Boon.',
      voicePitch: 'high',
    },
  ];
}
