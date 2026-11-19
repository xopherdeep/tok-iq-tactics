import type {BoardMode, DialogueLine, DominantDoctrine} from './types';

export function getStageIntroDialogue(
  stageNumber: number,
  doctrine: DominantDoctrine,
  boardMode: BoardMode,
): DialogueLine[] {
  if (stageNumber === 1) {
    return [
      {
        speakerName: 'The River',
        speakerTitle: 'Spirit of the Dry Wash · Spring 2004',
        speakerClass: 'healer',
        speakerFaction: 'player',
        text: 'Riverrun returns to the dry wash, Keeper. When the first monsoon rises, older things than rain cross the Hall stones.',
        voicePitch: 'high',
      },
      {
        speakerName: 'X, The Keeper',
        speakerTitle: 'Twin Commander · Hall of the Gods',
        speakerClass: 'sovereign',
        speakerFaction: 'player',
        text: 'Chairs up, lamps trimmed, cistern full. The children are asleep upstairs—nothing crosses this footbridge tonight.',
        voicePitch: 'low',
      },
      {
        speakerName: 'Sol',
        speakerTitle: 'Twin Commander · Solar Paladin',
        speakerClass: 'sovereign',
        speakerFaction: 'player',
        text: 'Stand shoulder to shoulder with me, X. Our Brotherhood Pact shields us both (+ATK and +1 DEF when adjacent)—if either of us falls, the oath breaks.',
        voicePitch: 'mid',
      },
      {
        speakerName: 'Coyote Alpha',
        speakerTitle: 'Monsoon Stalker · Wash Vanguard',
        speakerClass: 'sovereign',
        speakerFaction: 'enemy',
        text: 'Two lantern-bearers on sixty-four stones! Let the dust wraiths split them apart and snuff the Hall out before dawn!',
        voicePitch: 'low',
      },
    ];
  }

  if (stageNumber === 2) {
    const scaleNote =
      boardMode === 'dynamic'
        ? 'The arroyo widens across an 80-stone crossing—lantern pylons and flooded channels cut the pass.'
        : 'Twin waystation arches hold the narrow crossing above the rising floodwaters.';

    return [
      {
        speakerName: 'Infinidee',
        speakerTitle: 'Time Mage · Sevens Night 2007',
        speakerClass: 'arcanist',
        speakerFaction: 'player',
        text: `${scaleNote} My Chrono runes slip straight past desert masonry—let the storm titans hide behind stone if they dare.`,
        voicePitch: 'high',
      },
      {
        speakerName: 'Gaea',
        speakerTitle: 'Basin Druid · Living Oak',
        speakerClass: 'healer',
        speakerFaction: 'player',
        text: 'My healing dew reaches three paces across the wash. Keep X and Sol upright—every lantern on this road depends on the Twin Pact.',
        voicePitch: 'high',
      },
      {
        speakerName: 'Slumbering Titan',
        speakerTitle: 'Awakened Stone · Arroyo Crossing',
        speakerClass: 'sovereign',
        speakerFaction: 'enemy',
        text: 'Mortals built fences and forgot the dry wash. Tonight the Flood reclaims every road and roof.',
        voicePitch: 'low',
      },
    ];
  }

  const counterSpeechByDoctrine: Record<DominantDoctrine, string> = {
    arcane:
      'Your rune-casters and crescent bows have ruled the mesa long enough. Dust Wraiths—sweep their flanks before they channel!',
    guerrilla:
      'Hiding among saguaros and waystation walls will not save the Brotherhood. Storm Cantors, burn through their cover!',
    blitz:
      'Your swift flankers think the monsoon winds belong to them. Lightning Eyes—pin them down behind our Stone Brutes!',
    phalanx:
      'Holding the Twin Pact tight behind shields? Our Storm Cantors will shatter your front while Wash Spirits mend the tide.',
    balanced:
      'The Brotherhood marches in full harmony across Xadion. Answer them with every spirit of the turning Age!',
  };

  return [
    {
      speakerName: stageNumber >= 5 ? 'Thunderhead' : 'Anvil Sentinel',
      speakerTitle:
        stageNumber >= 5
          ? 'Anvil Cloud Sovereign · Ricorso'
          : `Stage ${stageNumber} · Monsoon Herald`,
      speakerClass: 'sovereign',
      speakerFaction: 'enemy',
      text: counterSpeechByDoctrine[doctrine],
      voicePitch: 'low',
    },
    {
      speakerName: 'Luna',
      speakerTitle: 'Astral Ranger · Crescent Bow',
      speakerClass: 'marksman',
      speakerFaction: 'player',
      text: 'The anvil clouds read our last formation, Commanders. Watch their healers and keep both sovereign banners alive.',
      voicePitch: 'high',
    },
    {
      speakerName: 'X, The Keeper',
      speakerTitle: 'Twin Commander · Hall of the Gods',
      speakerClass: 'sovereign',
      speakerFaction: 'player',
      text: 'Water for strangers, and a bar for anyone who brings trouble. Sol—with me. Hold the sixty-four stones!',
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
        speakerTitle: 'Monsoon Alpha',
        speakerClass: 'sovereign',
        speakerFaction: 'enemy',
        text: 'You broke through my pack?! Face the storm front yourself, Keeper!',
        voicePitch: 'low',
      },
      {
        speakerName: 'X, The Keeper',
        speakerTitle: 'Twin Commander · Hall of the Gods',
        speakerClass: 'sovereign',
        speakerFaction: 'player',
        text: 'The Hall stands till morning. Turn back into the dry wash or fall where you stand!',
        voicePitch: 'low',
      },
    ];
  }

  return [
    {
      speakerName: enemyBossName,
      speakerTitle: 'Storm Sovereign',
      speakerClass: 'sovereign',
      speakerFaction: 'enemy',
      text: 'The Age turns back to Flood and Lightning. One broken Commander ends your Brotherhood forever!',
      voicePitch: 'low',
    },
    {
      speakerName: 'Sol',
      speakerTitle: 'Twin Commander · Solar Paladin',
      speakerClass: 'sovereign',
      speakerFaction: 'player',
      text: 'Then strike at both of us—our light does not dim in the monsoon!',
      voicePitch: 'mid',
    },
  ];
}

export function getStageVictoryDialogue(stageNumber: number): DialogueLine[] {
  if (stageNumber === 1) {
    return [
      {
        speakerName: 'The River',
        speakerTitle: 'Spirit of the Dry Wash',
        speakerClass: 'healer',
        speakerFaction: 'player',
        text: 'Dawn breaks in a rainbow over running water. The footbridge holds—yet deeper storms gather beyond the red-rock basin.',
        voicePitch: 'high',
      },
      {
        speakerName: 'X, The Keeper',
        speakerTitle: 'Twin Commander · Hall of the Gods',
        speakerClass: 'sovereign',
        speakerFaction: 'player',
        text: 'Good work, Brotherhood. Check the sleeping children, claim a boon from the wash, and rally at the Hall common room.',
        voicePitch: 'low',
      },
    ];
  }

  return [
    {
      speakerName: 'Gaea',
      speakerTitle: 'Basin Druid · Living Oak',
      speakerClass: 'healer',
      speakerFaction: 'player',
      text: `The crossing is quiet again. Let me pour rainwater dew for the wounded while X and Sol claim our next Brotherhood Boon.`,
      voicePitch: 'high',
    },
  ];
}
