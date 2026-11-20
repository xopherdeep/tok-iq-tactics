import type {BoardMode, DialogueLine, DominantDoctrine} from './types';

export function getStageIntroDialogue(
  stageNumber: number,
  doctrine: DominantDoctrine,
  boardMode: BoardMode,
): DialogueLine[] {
  if (stageNumber === 1) {
    const doctrineNote =
      boardMode === 'classic64'
        ? 'Under Tau Doctrine, all sixty-four waystones lock into the classic 8x8 crossing.'
        : 'Swap your formation on the χ waystones before Turn 1. Every clean lethal raises our Tactics IQ.';
    return [
      {
        speakerName: 'The River',
        speakerTitle: 'Spirit of the Dry Wash · Spring 2004',
        speakerClass: 'healer',
        speakerFaction: 'player',
        text: 'Riverrun returns to the dry wash, Keeper. The Ricorso monsoon gathers above the Hall: sixty-four waystones stand between the storm and your sleeping children.',
        voicePitch: 'high',
      },
      {
        speakerName: 'The Black Knight',
        speakerTitle: 'Dread Vanguard (♔) · Amnesiac Hero',
        speakerClass: 'vanguard',
        speakerFaction: 'player',
        text: 'My past is shrouded in dark mist, but my black steel remembers how to fight. Let the void inside me guard the crossroads.',
        voicePitch: 'low',
      },
      {
        speakerName: 'Gaea',
        speakerTitle: 'Earth Geomancer (♕) · Living Shrine',
        speakerClass: 'healer',
        speakerFaction: 'player',
        text: 'Do not burn away your life force recklessly, Knight. Stay within reach of my Sanctuary pulses.',
        voicePitch: 'high',
      },
      {
        speakerName: 'X, The Keeper',
        speakerTitle: 'Equinox Mentor (♔) · Hall of the Gods',
        speakerClass: 'sovereign',
        speakerFaction: 'player',
        text: `Chairs up, lamps trimmed, cistern full. ${doctrineNote}`,
        voicePitch: 'low',
      },
      {
        speakerName: 'Coyote Alpha',
        speakerTitle: 'Monsoon Stalker · Wash Vanguard',
        speakerClass: 'sovereign',
        speakerFaction: 'enemy',
        text: 'Three defenders on sixty-four stones! Dust wraiths, tear through their frontline before dawn breaks!',
        voicePitch: 'low',
      },
    ];
  }

  if (stageNumber === 2) {
    const scaleNote =
      boardMode === 'dynamic'
        ? 'The Campaign of the Wash widens across an 80-stone crossing: lantern pylons and flooded channels cut the pass.'
        : 'Tau Doctrine holds the narrow 64-stone ramparts above the rising floodwaters.';

    return [
      {
        speakerName: 'Luna',
        speakerTitle: 'Sky Dragoon (♘) · Crescent Lance',
        speakerClass: 'striker',
        speakerFaction: 'player',
        text: 'The River rises around the Seven Lanterns! My aerial vault lets me leap the flooded wash to hunt their snipers.',
        voicePitch: 'high',
      },
      {
        speakerName: 'The Black Knight',
        speakerTitle: 'Dread Vanguard (♔) · Blood & Void',
        speakerClass: 'vanguard',
        speakerFaction: 'player',
        text: 'Hold the twin spans. My Blood & Void stance grows more lethal as my wounds deepen.',
        voicePitch: 'low',
      },
      {
        speakerName: 'Gaea',
        speakerTitle: 'Sacred Mender (♕) · Living Shrine',
        speakerClass: 'healer',
        speakerFaction: 'player',
        text: 'Save a comrade below 35% HP for a Tactical Save (+2 IQ), and never leave our line exposed on open sand.',
        voicePitch: 'high',
      },
      {
        speakerName: 'Dust Alpha',
        speakerTitle: 'Wraith Sovereign · Sevens Night',
        speakerClass: 'sovereign',
        speakerFaction: 'enemy',
        text: `${scaleNote} Mortals forgot the riverbed. Sunder their bridge and drown the lanterns!`,
        voicePitch: 'low',
      },
    ];
  }

  if (stageNumber === 3) {
    return [
      {
        speakerName: 'Sol',
        speakerTitle: 'Solar Paladin (♖) · Sun Fortress',
        speakerClass: 'vanguard',
        speakerFaction: 'player',
        text: 'The Slumbering Titan stirs in Drowning Wash! I will plant my tower shield as an unyielding fortress anchor.',
        voicePitch: 'mid',
      },
      {
        speakerName: 'The Black Knight',
        speakerTitle: 'Dread Vanguard (♔) · Blood & Void',
        speakerClass: 'vanguard',
        speakerFaction: 'player',
        text: 'Sol holds the center, I will draw their aggression with Shadow Barrier. Strike when they commit!',
        voicePitch: 'low',
      },
      {
        speakerName: 'Slumbering Titan',
        speakerTitle: 'Red-Rock Colossus · Basin Ancient',
        speakerClass: 'sovereign',
        speakerFaction: 'enemy',
        text: 'Canyon floor belongs to stone! Crush the intruders under red-rock avalanche!',
        voicePitch: 'low',
      },
    ];
  }

  if (stageNumber === 4) {
    return [
      {
        speakerName: 'Night',
        speakerTitle: 'Void Arcanist (♗) · Abyssal Weaver',
        speakerClass: 'arcanist',
        speakerFaction: 'player',
        text: 'Telluric lightning courses along the ramparts. My void artillery can pierce through stone battlements from afar.',
        voicePitch: 'high',
      },
      {
        speakerName: 'Infinidee',
        speakerTitle: 'Chrono Seer (✦) · Time Weaver',
        speakerClass: 'arcanist',
        speakerFaction: 'player',
        text: 'If our assault falters against the storm gates, my Chrono Rewind (-10 IQ) can reset the initiative timeline.',
        voicePitch: 'high',
      },
      {
        speakerName: 'The Black Knight',
        speakerTitle: 'Dread Vanguard (♔) · Blood & Void',
        speakerClass: 'vanguard',
        speakerFaction: 'player',
        text: 'Breach the gate! Once we secure the upper terrace, the spire road opens before us.',
        voicePitch: 'low',
      },
    ];
  }

  const counterSpeechByDoctrine: Record<DominantDoctrine, string> = {
    arcane:
      'Your arcanists have controlled the wash long enough. Dust Wraiths, sweep their flanks before they channel!',
    guerrilla:
      'Hiding in saguaro groves will not save you. Storm Cantors, incinerate their cover!',
    blitz:
      'Your Dragoons think the skies belong to them. Lightning Eyes, pin them down behind our brutes!',
    phalanx:
      'Turtling behind tower shields? Our lightning will shatter your frontline while wash spirits rise!',
    balanced:
      'Your Tactics IQ climbs across Xadion. Answer the final trial with every counter-doctrine of the Age!',
  };

  return [
    {
      speakerName: 'Thunderhead',
      speakerTitle: 'Astral Void Fiend · Ricorso Sovereign',
      speakerClass: 'sovereign',
      speakerFaction: 'enemy',
      text: counterSpeechByDoctrine[doctrine],
      voicePitch: 'low',
    },
    {
      speakerName: 'The Black Knight',
      speakerTitle: 'Dread Vanguard (♔) · Champion of Xadion',
      speakerClass: 'vanguard',
      speakerFaction: 'player',
      text: 'I remember who I was, and who I choose to be. The Black Knight stands with Xadion: Void Nova will tear through your storm!',
      voicePitch: 'low',
    },
    {
      speakerName: 'Luna',
      speakerTitle: 'Sky Dragoon (♘) · Crescent Lance',
      speakerClass: 'striker',
      speakerFaction: 'player',
      text: 'At 115 IQ we read their sightlines before they strike; at 130 IQ our Grandmaster precision breaks any storm wall!',
      voicePitch: 'high',
    },
    {
      speakerName: 'X, The Keeper',
      speakerTitle: 'Equinox Mentor (♔) · Hall of the Gods',
      speakerClass: 'sovereign',
      speakerFaction: 'player',
      text: 'All six champions stand together on sixty-four stones. Outsmart the storm; claim the dawn!',
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
        text: 'You broke through my pack?! Face the storm front yourself, mortals!',
        voicePitch: 'low',
      },
      {
        speakerName: 'The Black Knight',
        speakerTitle: 'Dread Vanguard · Blood & Void',
        speakerClass: 'vanguard',
        speakerFaction: 'player',
        text: 'Turn back into the wash or be consumed by abyssal steel!',
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
        text: 'Your tactics mean nothing against primordial desert fury!',
        voicePitch: 'low',
      },
      {
        speakerName: 'The Black Knight',
        speakerTitle: 'Dread Vanguard · Blood & Void',
        speakerClass: 'vanguard',
        speakerFaction: 'player',
        text: 'Every blow you land only feeds the Void within me.',
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
      text: 'The Age returns to Flood and Lightning! Fall before the Thunderhead!',
      voicePitch: 'low',
    },
    {
      speakerName: 'The Black Knight',
      speakerTitle: 'Dread Vanguard · King of the Board',
      speakerClass: 'vanguard',
      speakerFaction: 'player',
      text: 'Strike me down if you can; you will only release the Nova!',
      voicePitch: 'low',
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
        text: 'The anvil clouds part over sixty-four sunlit waystones. Every champion who defended this realm (King, Queen, Knight, Rook, Bishop, Specialist) now remembers their true purpose.',
        voicePitch: 'high',
      },
      {
        speakerName: 'The Black Knight',
        speakerTitle: 'Dread Vanguard (♔) · Redeemed Sovereign',
        speakerClass: 'vanguard',
        speakerFaction: 'player',
        text: 'The darkness in my chest has turned into resolve. The Hall of the Gods is safe, and the children may rest.',
        voicePitch: 'low',
      },
      {
        speakerName: 'X, The Keeper',
        speakerTitle: 'Equinox Mentor (♔) · Hall of the Gods',
        speakerClass: 'sovereign',
        speakerFaction: 'player',
        text: 'Carve these sixty-four stones in memory of this campaign: this is where TrenChess begins.',
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
        text: 'Dawn breaks in rainbow light over running water. The crossroads hold; Luna has arrived from the northern crags.',
        voicePitch: 'high',
      },
      {
        speakerName: 'The Black Knight',
        speakerTitle: 'Dread Vanguard · Blood & Void',
        speakerClass: 'vanguard',
        speakerFaction: 'player',
        text: 'A clean victory. Let us review our Tactics IQ report and prepare for the crossing ahead.',
        voicePitch: 'low',
      },
    ];
  }

  return [
    {
      speakerName: 'Gaea',
      speakerTitle: 'Sacred Mender · Living Shrine',
      speakerClass: 'healer',
      speakerFaction: 'player',
      text: 'The wash grows peaceful beneath lantern gold. Rest now, champions, while our next recruit joins the vanguard.',
      voicePitch: 'high',
    },
  ];
}
