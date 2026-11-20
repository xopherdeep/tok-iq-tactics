import type {
  BoardMode,
  DominantDoctrine,
  GridCoord,
  PlaystyleProfile,
  StageBlueprint,
  TerrainType,
  Tile,
  UnitClass,
  ViewportOrientation,
} from './types';

function createBoardFromAscii(rows: string[]): Tile[][] {
  const charToTerrain: Record<string, TerrainType> = {
    '.': 'plains',
    F: 'forest',
    R: 'fortress',
    W: 'chasm',
  };

  const rowCount = rows.length;
  const colCount = rows[0]?.length ?? 8;

  return Array.from({length: rowCount}, (_, row) =>
    Array.from({length: colCount}, (_, col) => {
      const glyph = rows[row]?.[col] ?? '.';
      return {
        col,
        row,
        terrain: charToTerrain[glyph] ?? 'plains',
      };
    }),
  );
}

export function determineDominantDoctrine(
  profile: PlaystyleProfile,
): DominantDoctrine {
  if (profile.totalPlayerActions < 3) {
    return 'balanced';
  }

  const terrainTurtlingScore =
    profile.forestEndTurns * 1.4 + profile.fortressEndTurns * 1.1;
  const rangedScore =
    profile.arcanistAttacks * 1.5 +
    profile.rangerAttacks * 1.3 +
    (profile.marksmanAttacks ?? 0) * 1.5;
  const scores: Array<{doctrine: DominantDoctrine; score: number}> = [
    {doctrine: 'arcane', score: rangedScore},
    {doctrine: 'guerrilla', score: terrainTurtlingScore},
    {doctrine: 'blitz', score: profile.strikerAttacks * 1.4},
    {doctrine: 'phalanx', score: profile.vanguardAttacks * 1.25},
  ];

  scores.sort((a, b) => b.score - a.score);
  const top = scores[0];
  return top.score >= 3 ? top.doctrine : 'balanced';
}

export function describeAdaptation(doctrine: DominantDoctrine): string {
  switch (doctrine) {
    case 'arcane':
      return 'Storm Doctrine: Flanking Coyote Shades & Lightning Eyes hunting your backline';
    case 'guerrilla':
      return 'Storm Doctrine: Dust Wraiths & Mesa Snipers piercing your saguaro cover';
    case 'blitz':
      return 'Storm Doctrine: Cinder Spines & Slumbering Brutes halting airborne raids';
    case 'phalanx':
      return 'Storm Doctrine: Dust Wraiths & Wash Spirits eroding your frontline wall';
    default:
      return 'Storm Doctrine: Balanced Monsoon Front';
  }
}

function buildAdaptiveEnemyClasses(
  stageNumber: number,
  doctrine: DominantDoctrine,
  isExpandedBoard: boolean,
): UnitClass[] {
  const maxNonSovereign = isExpandedBoard ? 7 : 5;
  const totalNonSovereign = Math.min(maxNonSovereign, 3 + stageNumber);
  const poolByDoctrine: Record<DominantDoctrine, UnitClass[]> = {
    balanced: [
      'vanguard',
      'striker',
      'arcanist',
      'marksman',
      'healer',
      'vanguard',
      'ranger',
    ],
    arcane: [
      'striker',
      'marksman',
      'striker',
      'vanguard',
      'healer',
      'ranger',
      'arcanist',
    ],
    guerrilla: [
      'arcanist',
      'marksman',
      'ranger',
      'vanguard',
      'cleric',
      'striker',
      'healer',
    ],
    blitz: [
      'ranger',
      'vanguard',
      'marksman',
      'vanguard',
      'healer',
      'arcanist',
      'striker',
    ],
    phalanx: [
      'arcanist',
      'healer',
      'arcanist',
      'striker',
      'marksman',
      'vanguard',
      'cleric',
    ],
  };

  const chosenClasses = poolByDoctrine[doctrine].slice(0, totalNonSovereign);
  return ['sovereign', ...chosenClasses];
}

const CLASSIC_STAGE_THREE_MAPS: string[][] = [
  [
    '........',
    '.F.R..F.',
    '..WW.WW.',
    '.F....F.',
    '....R...',
    '.WW..WW.',
    '.F....F.',
    '........',
  ],
  [
    '........',
    '..F..R..',
    '.W.FF.W.',
    'R......R',
    '..W..W..',
    '.F.FF.F.',
    '....R...',
    '........',
  ],
  [
    '........',
    '.R.FF.R.',
    '....W...',
    '.WW...W.',
    '.F..R.F.',
    '...WW...',
    '.F....F.',
    '........',
  ],
];

const EXPANDED_LANDSCAPE_STAGE_THREE_MAPS: string[][] = [
  [
    '............',
    '..F..RR..F..',
    '.FF......FF.',
    '..WWW..WWW..',
    '.F...RR...F.',
    '..F..FF..F..',
    '..WWW..WWW..',
    '.F..R..R..F.',
    '............',
    '............',
  ],
  [
    '............',
    '.R..F..F..R.',
    '..W..FF..W..',
    '.WW......WW.',
    '..F..RR..F..',
    '..F..RR..F..',
    '.WW......WW.',
    '..W..FF..W..',
    '.R..F..F..R.',
    '............',
  ],
  [
    '............',
    '..F.R..R.F..',
    '....WWWW....',
    '.FF......FF.',
    '.R..F..F..R.',
    '..W..RR..W..',
    '.FF......FF.',
    '...W....W...',
    '..F......F..',
    '............',
  ],
];

const EXPANDED_PORTRAIT_STAGE_THREE_MAPS: string[][] = [
  [
    '........',
    '.F.RR.F.',
    '........',
    '.WW..WW.',
    '.F....F.',
    '..R..R..',
    '..F..F..',
    '.WW..WW.',
    '.F.RR.F.',
    '........',
    '..F..F..',
    '........',
  ],
  [
    '........',
    '..F..F..',
    '.R.FF.R.',
    'W......W',
    '.WW..WW.',
    '..F..F..',
    '..R..R..',
    '.WW..WW.',
    'W......W',
    '.R.FF.R.',
    '........',
    '........',
  ],
  [
    '........',
    '.R....R.',
    '..F..F..',
    '..WWWW..',
    '.F.RR.F.',
    '........',
    '.F.FF.F.',
    'WW....WW',
    '..R..R..',
    '.F....F.',
    '........',
    '........',
  ],
];

const ENEMY_NAMES: Record<UnitClass, string[]> = {
  sovereign: ['Coyote Alpha', 'Slumbering Titan', 'Thunderhead'],
  vanguard: ['Slumbering Brute', 'Basalt Titan', 'Grit Bulwark'],
  striker: ['Coyote Shade', 'Monsoon Talon', 'Gale Wraith'],
  arcanist: ['Dust Wraith', 'Static Weaver', 'Grit Phantom'],
  cleric: ['Storm Cantor', 'Rain Wraith', 'Dusk Conduit'],
  ranger: ['Cinder Spine', 'Mesa Stalker', 'Grit Fletcher'],
  marksman: ['Lightning Eye', 'Anvil Bolt', 'Red-Rock Sniper'],
  healer: ['Mist Siphon', 'Veil Tide', 'Wash Spirit'],
};

function deduplicateValidSlots(
  candidates: GridCoord[],
  board: Tile[][],
): GridCoord[] {
  const seen = new Set<string>();
  const valid: GridCoord[] = [];
  const rows = board.length;
  const cols = board[0]?.length ?? 8;

  for (const slot of candidates) {
    const inside =
      slot.col >= 0 && slot.col < cols && slot.row >= 0 && slot.row < rows;
    if (!inside) {
      continue;
    }
    const key = `${slot.col},${slot.row}`;
    if (seen.has(key)) {
      continue;
    }
    if (board[slot.row][slot.col].terrain === 'chasm') {
      continue;
    }
    seen.add(key);
    valid.push(slot);
  }
  return valid;
}

function assignEnemySquadPositions(
  classes: UnitClass[],
  board: Tile[][],
): Array<{unitClass: UnitClass; col: number; row: number; name: string}> {
  const cols = board[0]?.length ?? 8;
  const midCol = Math.floor(cols / 2);

  const candidateSlots: GridCoord[] = [
    {col: midCol, row: 0},
    {col: Math.max(0, midCol - 2), row: 1},
    {col: Math.min(cols - 1, midCol + 1), row: 1},
    {col: Math.max(0, midCol - 1), row: 0},
    {col: Math.min(cols - 1, midCol + 1), row: 0},
    {col: Math.max(0, midCol - 2), row: 0},
    {col: Math.min(cols - 1, midCol + 2), row: 1},
    {col: midCol, row: 1},
    {col: Math.max(0, midCol - 1), row: 1},
    {col: Math.min(cols - 1, midCol + 2), row: 0},
  ];

  const validSlots = deduplicateValidSlots(candidateSlots, board);

  return classes.map((unitClass, index) => {
    const slot = validSlots[index] ?? {col: index % cols, row: 0};
    const pool = ENEMY_NAMES[unitClass];
    const name = pool[index % pool.length];
    return {unitClass, col: slot.col, row: slot.row, name};
  });
}

function buildPlayerSpawnSlots(board: Tile[][]): GridCoord[] {
  const rows = board.length;
  const cols = board[0]?.length ?? 8;
  const bottomRow = rows - 1;
  const frontRow = rows - 2;
  const midCol = Math.floor(cols / 2);

  const candidates: GridCoord[] = [
    {col: Math.max(0, midCol - 1), row: bottomRow},
    {col: Math.max(0, midCol - 2), row: frontRow},
    {col: Math.min(cols - 1, midCol + 1), row: frontRow},
    {col: midCol, row: bottomRow},
    {col: Math.max(0, midCol - 2), row: bottomRow},
    {col: Math.min(cols - 1, midCol + 1), row: bottomRow},
    {col: midCol, row: frontRow},
    {col: Math.max(0, midCol - 1), row: frontRow},
  ];

  return deduplicateValidSlots(candidates, board);
}

export function buildStageBlueprint(
  stageNumber: number,
  profile: PlaystyleProfile,
  boardMode: BoardMode,
  orientation: ViewportOrientation = 'landscape',
): StageBlueprint {
  const isDynamicMode = boardMode === 'dynamic';
  const isPortraitLayout = orientation === 'portrait';

  if (stageNumber === 1) {
    const usePortraitSkirmish = isDynamicMode && isPortraitLayout;
    const asciiRows = usePortraitSkirmish
      ? [
          '......',
          '.F..F.',
          '......',
          'F.FF.F',
          '..F...',
          '...F..',
          'F.FF.F',
          '......',
          '.F..F.',
          '......',
        ]
      : [
          '........',
          '..F..F..',
          '........',
          '.F.FF.F.',
          '..F..F..',
          '........',
          '.F....F.',
          '........',
        ];
    const board = createBoardFromAscii(asciiRows);
    const cols = board[0].length;
    const rows = board.length;

    return {
      stageNumber: 1,
      title: 'Chapter 1 · Riverrun at the Hall',
      subtitle: `${cols}×${rows} Crossing · Rout All Enemies`,
      board,
      boardCols: cols,
      boardRows: rows,
      playerSpawns: buildPlayerSpawnSlots(board),
      enemySquad: usePortraitSkirmish
        ? [
            {unitClass: 'sovereign', col: 3, row: 0, name: 'Coyote Alpha'},
            {unitClass: 'vanguard', col: 4, row: 1, name: 'Slumbering Brute'},
            {unitClass: 'striker', col: 1, row: 1, name: 'Coyote Shade'},
            {unitClass: 'ranger', col: 5, row: 0, name: 'Cinder Spine'},
          ]
        : [
            {unitClass: 'sovereign', col: 4, row: 0, name: 'Coyote Alpha'},
            {unitClass: 'vanguard', col: 5, row: 1, name: 'Slumbering Brute'},
            {unitClass: 'striker', col: 2, row: 1, name: 'Coyote Shade'},
            {unitClass: 'ranger', col: 6, row: 0, name: 'Cinder Spine'},
          ],
      calloutText:
        'Rout all enemies. The Black Knight, Gaea, and X hold the crossroads.',
      objectiveType: 'rout',
    };
  }

  if (stageNumber === 2) {
    const asciiRows = isDynamicMode
      ? isPortraitLayout
        ? [
            '.......',
            '.F.R.F.',
            '.......',
            'WW...WW',
            '.F.R.F.',
            'W..F..W',
            '.F.R.F.',
            'WW...WW',
            '.......',
            '.F...F.',
            '.......',
          ]
        : [
            '..........',
            '..F.RR.F..',
            '.WW....WW.',
            'WWW.FF.WWW',
            '..F....F..',
            '.R..FF..R.',
            '..........',
            '..........',
          ]
      : [
          '........',
          '..F..F..',
          '.W.RR.W.',
          'WW....WW',
          '..F..F..',
          '.R....R.',
          '........',
          '........',
        ];
    const board = createBoardFromAscii(asciiRows);
    const cols = board[0].length;
    const rows = board.length;
    const gridTag = `${cols}×${rows}`;

    const stageTwoEnemyClasses: UnitClass[] = isDynamicMode
      ? ['sovereign', 'vanguard', 'striker', 'arcanist', 'marksman', 'healer']
      : ['sovereign', 'vanguard', 'striker', 'marksman', 'healer'];
    const enemySquad = assignEnemySquadPositions(stageTwoEnemyClasses, board);
    if (enemySquad[0]) {
      enemySquad[0].name = 'Dust Alpha';
    }

    return {
      stageNumber: 2,
      title: 'Chapter 2 · The Seven Lanterns',
      subtitle: `${gridTag} Dry Wash · Defeat Boss (Dust Alpha)`,
      board,
      boardCols: cols,
      boardRows: rows,
      playerSpawns: buildPlayerSpawnSlots(board),
      enemySquad,
      calloutText:
        'Defeat the Dust Alpha on the footbridge to secure the Seven Lanterns.',
      objectiveType: 'defeatBoss',
    };
  }

  const doctrine = determineDominantDoctrine(profile);
  const mapBank = isDynamicMode
    ? isPortraitLayout
      ? EXPANDED_PORTRAIT_STAGE_THREE_MAPS
      : EXPANDED_LANDSCAPE_STAGE_THREE_MAPS
    : CLASSIC_STAGE_THREE_MAPS;
  const mapIndex = (stageNumber - 3) % mapBank.length;
  const board = createBoardFromAscii(mapBank[mapIndex]);
  const cols = board[0].length;
  const rows = board.length;
  const enemyClasses = buildAdaptiveEnemyClasses(
    stageNumber,
    doctrine,
    isDynamicMode,
  );
  const enemySquad = assignEnemySquadPositions(enemyClasses, board);
  const bossTitle =
    stageNumber >= 5
      ? 'Thunderhead'
      : stageNumber === 4
        ? 'Anvil Sentinel'
        : 'Slumbering Titan';
  if (enemySquad[0]) {
    enemySquad[0].name = bossTitle;
  }

  if (stageNumber === 3) {
    return {
      stageNumber: 3,
      title: 'Chapter 3 · Drowning Wash',
      subtitle: `${cols}×${rows} Bluffs · Defend 5 Turns (${describeAdaptation(doctrine)})`,
      board,
      boardCols: cols,
      boardRows: rows,
      playerSpawns: buildPlayerSpawnSlots(board),
      enemySquad,
      calloutText:
        'Hold the high red-rock ridges for 5 turns as floodwaters rise around the Titan.',
      objectiveType: 'defend',
      defendTurns: 5,
    };
  }

  if (stageNumber === 4) {
    return {
      stageNumber: 4,
      title: 'Chapter 4 · Anvil of the Storm',
      subtitle: `${cols}×${rows} Ramparts · Breach Gate (Reach Row 0)`,
      board,
      boardCols: cols,
      boardRows: rows,
      playerSpawns: buildPlayerSpawnSlots(board),
      enemySquad,
      calloutText:
        'Breach the storm vanguard and guide The Black Knight to Row 0.',
      objectiveType: 'escape',
      escapeRow: 0,
    };
  }

  return {
    stageNumber: 5,
    title: 'Chapter 5 · Crown of the Thunderhead',
    subtitle: `${cols}×${rows} Obsidian Spire · Slay Astral Void Fiend`,
    board,
    boardCols: cols,
    boardRows: rows,
    playerSpawns: buildPlayerSpawnSlots(board),
    enemySquad,
    calloutText: 'Defeat Thunderhead to banish the storm from Xadion.',
    objectiveType: 'defeatBoss',
  };
}
