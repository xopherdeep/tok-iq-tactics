'use client';

import Image, {type StaticImageData} from 'next/image';
import {
  Award,
  Flame,
  FlaskConical,
  Heart,
  Shield,
  Sparkles,
  Swords,
  Wind,
} from 'lucide-react';
import ironHalberdAsset from '@/src/assets/images/weapon_iron_halberd_1795098655879.jpg';
import royalEdgeAsset from '@/src/assets/images/weapon_royal_edge_1795098656334.jpg';
import sunlitLanceAsset from '@/src/assets/images/weapon_sunlit_lance_1795098656474.jpg';
import astralGrimoireAsset from '@/src/assets/images/weapon_astral_grimoire_1795098656539.jpg';
import longshotBowAsset from '@/src/assets/images/weapon_longshot_bow_1795098655509.jpg';
import dawnCenserAsset from '@/src/assets/images/weapon_dawn_censer_1795098656733.jpg';
import sniperArbalestAsset from '@/src/assets/images/weapon_sniper_arbalest_1795119319471.jpg';
import seraphStaffAsset from '@/src/assets/images/weapon_seraph_staff_1795119319184.jpg';
import ironSwordAsset from '@/src/assets/images/weapon_iron_sword_1795123669207.jpg';
import leatherShieldAsset from '@/src/assets/images/armor_leather_shield_1795123669641.jpg';
import steelBroadswordAsset from '@/src/assets/images/weapon_steel_broadsword_1795123668071.jpg';
import hawkCloakAsset from '@/src/assets/images/armor_hawk_cloak_1795123669240.jpg';
import type {ConsumableType, EquipmentSlot} from '@/lib/tactics/types';

type ItemIconSize = 'xs' | 'sm' | 'md' | 'lg';

interface ArmoryItemIconProps {
  itemId: string | null;
  itemName?: string;
  emptySlot?: EquipmentSlot;
  size?: ItemIconSize;
}

const WEAPON_ART_MAP: Record<string, StaticImageData> = {
  'iron-sword': ironSwordAsset,
  'steel-broadsword': steelBroadswordAsset,
  'iron-halberd': ironHalberdAsset,
  'sovereign-blade': royalEdgeAsset,
  'sunlit-lance': sunlitLanceAsset,
  'astral-grimoire': astralGrimoireAsset,
  'longshot-bow': longshotBowAsset,
  'dawn-censer': dawnCenserAsset,
  'sniper-arbalest': sniperArbalestAsset,
  'seraph-staff': seraphStaffAsset,
  'leather-shield': leatherShieldAsset,
  'hawk-cloak': hawkCloakAsset,
};

const WEAPON_BORDER_MAP: Record<string, string> = {
  'iron-sword': 'border-slate-400/50 shadow-slate-500/15',
  'steel-broadsword': 'border-sky-300/60 shadow-sky-400/20',
  'iron-halberd': 'border-sky-400/45 shadow-sky-500/15',
  'sovereign-blade': 'border-amber-400/55 shadow-amber-500/20',
  'sunlit-lance': 'border-amber-300/55 shadow-amber-400/20',
  'astral-grimoire': 'border-violet-400/55 shadow-violet-500/20',
  'longshot-bow': 'border-emerald-400/50 shadow-emerald-500/20',
  'dawn-censer': 'border-emerald-300/55 shadow-emerald-400/20',
  'sniper-arbalest': 'border-cyan-400/55 shadow-cyan-500/20',
  'seraph-staff': 'border-teal-300/55 shadow-teal-400/20',
  'leather-shield': 'border-amber-500/50 shadow-amber-700/20',
  'hawk-cloak': 'border-teal-400/55 shadow-teal-500/20',
};

const SIZE_CLASSES: Record<
  ItemIconSize,
  {frame: string; glyph: string; imageSizes: string}
> = {
  xs: {frame: 'w-5 h-5 rounded', glyph: 'w-3 h-3', imageSizes: '20px'},
  sm: {frame: 'w-7 h-7 rounded-md', glyph: 'w-3.5 h-3.5', imageSizes: '28px'},
  md: {frame: 'w-11 h-11 rounded-xl', glyph: 'w-5 h-5', imageSizes: '44px'},
  lg: {frame: 'w-14 h-14 rounded-xl', glyph: 'w-6 h-6', imageSizes: '56px'},
};

interface FallbackBadgeStyle {
  frameClass: string;
  glyphClass: string;
  kind: 'shield' | 'heart' | 'wind' | 'award' | 'potion' | 'hiPotion' | 'tonic' | 'sword';
}

function resolveBadgeStyle(itemId: string): FallbackBadgeStyle {
  if (itemId === 'aegis-buckler') {
    return {
      frameClass: 'bg-sky-950/90 border-sky-400/45',
      glyphClass: 'text-sky-300',
      kind: 'shield',
    };
  }
  if (itemId === 'vitality-charm') {
    return {
      frameClass: 'bg-rose-950/90 border-rose-400/45',
      glyphClass: 'text-rose-300',
      kind: 'heart',
    };
  }
  if (itemId === 'gale-boots') {
    return {
      frameClass: 'bg-teal-950/90 border-teal-400/45',
      glyphClass: 'text-teal-300',
      kind: 'wind',
    };
  }
  if (itemId === 'tactician-crest') {
    return {
      frameClass: 'bg-amber-950/90 border-amber-400/45',
      glyphClass: 'text-amber-300',
      kind: 'award',
    };
  }
  if (itemId === ('potion' satisfies ConsumableType)) {
    return {
      frameClass: 'bg-emerald-950/90 border-emerald-400/45',
      glyphClass: 'text-emerald-300',
      kind: 'potion',
    };
  }
  if (itemId === ('hiPotion' satisfies ConsumableType)) {
    return {
      frameClass: 'bg-teal-950/90 border-emerald-300/55',
      glyphClass: 'text-emerald-200',
      kind: 'hiPotion',
    };
  }
  if (itemId === ('powerTonic' satisfies ConsumableType)) {
    return {
      frameClass: 'bg-amber-950/90 border-amber-400/50',
      glyphClass: 'text-amber-300',
      kind: 'tonic',
    };
  }
  return {
    frameClass: 'bg-slate-900 border-slate-700',
    glyphClass: 'text-slate-300',
    kind: 'sword',
  };
}

function renderFallbackGlyph(kind: FallbackBadgeStyle['kind'], className: string) {
  if (kind === 'shield') {
    return <Shield className={className} />;
  }
  if (kind === 'heart') {
    return <Heart className={className} />;
  }
  if (kind === 'wind') {
    return <Wind className={className} />;
  }
  if (kind === 'award') {
    return <Award className={className} />;
  }
  if (kind === 'potion') {
    return <FlaskConical className={className} />;
  }
  if (kind === 'hiPotion') {
    return <Sparkles className={className} />;
  }
  if (kind === 'tonic') {
    return <Flame className={className} />;
  }
  return <Swords className={className} />;
}

export function ArmoryItemIcon({
  itemId,
  itemName = 'Armory item',
  emptySlot,
  size = 'md',
}: ArmoryItemIconProps) {
  const sizeSpec = SIZE_CLASSES[size];

  if (!itemId) {
    const isAccessorySlot = emptySlot === 'accessory';
    return (
      <div
        className={`${sizeSpec.frame} shrink-0 border border-dashed border-slate-700/90 bg-slate-950/80 flex items-center justify-center text-slate-600`}
      >
        {isAccessorySlot ? (
          <Shield className={sizeSpec.glyph} />
        ) : (
          <Swords className={sizeSpec.glyph} />
        )}
      </div>
    );
  }

  const weaponArtwork = WEAPON_ART_MAP[itemId];
  if (weaponArtwork) {
    const accentBorder =
      WEAPON_BORDER_MAP[itemId] ?? 'border-slate-700 shadow-slate-950/40';
    return (
      <div
        className={`relative ${sizeSpec.frame} shrink-0 overflow-hidden bg-[#0b1120] border shadow-inner ${accentBorder}`}
      >
        <Image
          src={weaponArtwork}
          alt={itemName}
          fill
          sizes={sizeSpec.imageSizes}
          referrerPolicy="no-referrer"
          className="object-cover"
        />
      </div>
    );
  }

  const badgeStyle = resolveBadgeStyle(itemId);
  return (
    <div
      className={`${sizeSpec.frame} shrink-0 border ${badgeStyle.frameClass} flex items-center justify-center shadow-inner`}
    >
      {renderFallbackGlyph(
        badgeStyle.kind,
        `${sizeSpec.glyph} ${badgeStyle.glyphClass}`,
      )}
    </div>
  );
}
