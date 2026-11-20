import type {ChapterDefinition} from './types';

export const CAMPAIGN_CHAPTERS: ChapterDefinition[] = [
  {
    id: 'ch-1-glade',
    order: 1,
    chapterLabel: 'Chapter 1',
    title: 'Riverrun at the Hall',
    region: 'Hall of the Gods · Spring 2004',
    subtitle:
      'Monsoon rain breaks over the dry wash. Hold the crossroads beside X and Gaea while the sleeping children rest upstairs.',
    isSkirmish: false,
    stageNumber: 1,
    recommendedLevel: 1,
    maxDeployCount: 3,
    goldReward: 95,
    mapX: 35,
    mapY: 50,
    rewardEquipmentId: 'iron-halberd',
    recruitReward: {
      id: 'p-luna',
      name: 'Luna',
      unitClass: 'striker',
      title: 'Sky Dragoon · Knight ♘',
    },
  },
  {
    id: 'sk-1-river',
    order: 2,
    chapterLabel: 'Skirmish I',
    title: 'Red-Rock Arroyo',
    region: 'Western Saguaro Flats',
    subtitle:
      'Repeatable desert patrol against Coyote Shades and Dust Wraiths to earn Gold and train recruits.',
    isSkirmish: true,
    stageNumber: 1,
    recommendedLevel: 1,
    maxDeployCount: 3,
    goldReward: 75,
    mapX: 22,
    mapY: 62,
    unlockedByChapterId: 'ch-1-glade',
  },
  {
    id: 'ch-2-bridge',
    order: 3,
    chapterLabel: 'Chapter 2',
    title: 'The Seven Lanterns',
    region: 'Dry Wash Footbridge · Sevens Night 2007',
    subtitle:
      'Deep indigo night and lantern gold. Hold the twin stone spans as The River rises beneath the bridge.',
    isSkirmish: false,
    stageNumber: 2,
    recommendedLevel: 2,
    maxDeployCount: 3,
    goldReward: 130,
    mapX: 49,
    mapY: 66,
    unlockedByChapterId: 'ch-1-glade',
    rewardEquipmentId: 'aegis-buckler',
    recruitReward: {
      id: 'p-sol',
      name: 'Sol',
      unitClass: 'vanguard',
      title: 'Solar Paladin · Rook ♖',
    },
  },
  {
    id: 'ch-3-ridge',
    order: 4,
    chapterLabel: 'Chapter 3',
    title: 'Drowning Wash',
    region: 'Sunken Basin Bluffs · Flood 2012',
    subtitle:
      'Cold teal floodwaters carve the canyon floor while awakened Slumbering Brutes stalk the red-rock ridges.',
    isSkirmish: false,
    stageNumber: 3,
    recommendedLevel: 3,
    maxDeployCount: 4,
    goldReward: 155,
    mapX: 59,
    mapY: 48,
    unlockedByChapterId: 'ch-2-bridge',
    rewardEquipmentId: 'gale-boots',
    recruitReward: {
      id: 'p-night',
      name: 'Night',
      unitClass: 'arcanist',
      title: 'Void Arcanist · Bishop ♗',
    },
  },
  {
    id: 'sk-2-crossroads',
    order: 5,
    chapterLabel: 'Skirmish II',
    title: 'Sunscorched Pass',
    region: 'Eastern Mesa Cave · Dust 2016',
    subtitle:
      'Repeatable veteran drill through amber drought winds for extra Gold and XP before the final climb.',
    isSkirmish: true,
    stageNumber: 2,
    recommendedLevel: 3,
    maxDeployCount: 4,
    goldReward: 110,
    mapX: 73,
    mapY: 72,
    unlockedByChapterId: 'ch-2-bridge',
  },
  {
    id: 'ch-4-bastion',
    order: 6,
    chapterLabel: 'Chapter 4',
    title: 'Anvil of the Storm',
    region: 'Telluric Mesa Ramparts · Green 2014',
    subtitle:
      'Storm the lightning-charged masonry above the basin and shatter the vanguard guarding the spire road.',
    isSkirmish: false,
    stageNumber: 4,
    recommendedLevel: 4,
    maxDeployCount: 6,
    goldReward: 190,
    mapX: 78,
    mapY: 36,
    unlockedByChapterId: 'ch-3-ridge',
    rewardEquipmentId: 'sovereign-blade',
    recruitReward: {
      id: 'p-infinidee',
      name: 'Infinidee',
      unitClass: 'arcanist',
      title: 'Chrono Seer · Specialist ✦',
    },
  },
  {
    id: 'ch-5-citadel',
    order: 7,
    chapterLabel: 'Chapter 5',
    title: 'Crown of the Thunderhead',
    region: 'Obsidian Mesa Spire · Rebuilt 2026',
    subtitle:
      'Warm gold breaks over violet storm clouds. Ascend the obsidian peak with the full champion vanguard to face Thunderhead.',
    isSkirmish: false,
    stageNumber: 5,
    recommendedLevel: 5,
    maxDeployCount: 6,
    goldReward: 260,
    mapX: 61,
    mapY: 18,
    unlockedByChapterId: 'ch-4-bastion',
    rewardEquipmentId: 'tactician-crest',
  },
];

export function getChapterById(id: string): ChapterDefinition {
  return (
    CAMPAIGN_CHAPTERS.find((chapter) => chapter.id === id) ??
    CAMPAIGN_CHAPTERS[0]
  );
}

export function isChapterUnlocked(
  chapter: ChapterDefinition,
  completedChapterIds: string[],
): boolean {
  if (!chapter.unlockedByChapterId) {
    return true;
  }
  return completedChapterIds.includes(chapter.unlockedByChapterId);
}
