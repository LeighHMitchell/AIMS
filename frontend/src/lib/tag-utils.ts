/**
 * Shared utilities for tag profile pages (listing + profile + edit).
 *
 * Tags have no icon/color columns of their own — appearance overrides are
 * stored in profile_banners (profile_type='tag') and merged onto the tag object
 * by the /api/tags/[id] route. A tag with no override falls back to a
 * deterministic colour derived from its name, so the same tag always looks the
 * same without anyone having to curate it.
 */

import {
  Hash,
  Sparkles,
  Leaf,
  Shield,
  ShieldCheck,
  Handshake,
  TreePine,
  Sprout,
  Wind,
  Sun,
  Waves,
  CloudRain,
  MountainSnow,
  Baby,
  AlertCircle,
  Heart,
  HandHeart,
  Droplets,
  Wheat,
  Globe,
  Users,
  Scale,
  Building2,
  GraduationCap,
  Stethoscope,
  Briefcase,
  Cpu,
  Recycle,
  Accessibility,
  Wrench,
  Tag as TagIcon,
  Flag,
  Star,
  Bookmark,
  Target,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Curated set of icons a super user can choose from in the Tag editor.
 * The key is stored in profile_banners.icon; the component is resolved for display.
 */
export const TAG_ICON_OPTIONS: Array<{ key: string; Icon: LucideIcon }> = [
  { key: 'hash', Icon: Hash },
  { key: 'tag', Icon: TagIcon },
  { key: 'flag', Icon: Flag },
  { key: 'star', Icon: Star },
  { key: 'bookmark', Icon: Bookmark },
  { key: 'target', Icon: Target },
  { key: 'sparkles', Icon: Sparkles },
  { key: 'leaf', Icon: Leaf },
  { key: 'shield', Icon: Shield },
  { key: 'shield-check', Icon: ShieldCheck },
  { key: 'handshake', Icon: Handshake },
  { key: 'tree-pine', Icon: TreePine },
  { key: 'sprout', Icon: Sprout },
  { key: 'wind', Icon: Wind },
  { key: 'sun', Icon: Sun },
  { key: 'waves', Icon: Waves },
  { key: 'cloud-rain', Icon: CloudRain },
  { key: 'mountain-snow', Icon: MountainSnow },
  { key: 'baby', Icon: Baby },
  { key: 'alert-circle', Icon: AlertCircle },
  { key: 'heart', Icon: Heart },
  { key: 'hand-heart', Icon: HandHeart },
  { key: 'droplets', Icon: Droplets },
  { key: 'wheat', Icon: Wheat },
  { key: 'globe', Icon: Globe },
  { key: 'users', Icon: Users },
  { key: 'scale', Icon: Scale },
  { key: 'building-2', Icon: Building2 },
  { key: 'graduation-cap', Icon: GraduationCap },
  { key: 'stethoscope', Icon: Stethoscope },
  { key: 'briefcase', Icon: Briefcase },
  { key: 'cpu', Icon: Cpu },
  { key: 'recycle', Icon: Recycle },
  { key: 'accessibility', Icon: Accessibility },
  { key: 'wrench', Icon: Wrench },
]

const ICON_BY_KEY: Record<string, LucideIcon> = Object.fromEntries(
  TAG_ICON_OPTIONS.map(o => [o.key, o.Icon])
)

/**
 * Resolve a stored icon key to a component, or null when unset/unknown.
 */
export function getIconComponent(iconKey?: string | null): LucideIcon | null {
  if (!iconKey) return null
  return ICON_BY_KEY[iconKey] || null
}

/**
 * Get the icon component for a tag. A super-user-chosen icon takes precedence
 * over the default hash icon.
 */
export function getIconForTag(storedIcon?: string | null): LucideIcon {
  return getIconComponent(storedIcon) || Hash
}

/**
 * Palette of pleasant, distinguishable accent colours for the auto-generated
 * default. Deliberately avoids the IATI transaction-type palette so tag colours
 * never read as "commitment green" etc.
 */
const TAG_COLOR_PALETTE = [
  '#2563EB', // blue
  '#7C3AED', // violet
  '#DB2777', // pink
  '#16A34A', // green
  '#EA580C', // orange
  '#0891B2', // cyan
  '#CA8A04', // amber
  '#DC2626', // red
  '#4F46E5', // indigo
  '#0D9488', // teal
  '#9333EA', // purple
  '#65A30D', // lime
]

/** Stable string hash (djb2) — same input always maps to the same bucket. */
function hashString(input: string): number {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/**
 * Deterministic default colour for a tag, derived from its name (falling back
 * to its id). Used when no super-user override is set.
 */
export function getDefaultTagColor(seed: string): string {
  return TAG_COLOR_PALETTE[hashString(seed || 'tag') % TAG_COLOR_PALETTE.length]
}

/**
 * Resolve the theme colour for a tag: a super-user-chosen colour takes
 * precedence over the deterministic name-derived default.
 */
export function getTagColor(tag: { color?: string | null; name?: string | null; id?: string | null }): string {
  return tag.color || getDefaultTagColor(tag.name || tag.id || 'tag')
}

/** Human label for a tag's IATI vocabulary code. */
export function getTagVocabularyLabel(vocabulary?: string | null): string {
  switch (String(vocabulary ?? '99')) {
    case '1': return 'Agrovoc'
    case '2': return 'UN Sustainable Development Goals'
    case '3': return 'Reporting Organisation vocabulary'
    case '98': return 'Reporting Organisation vocabulary'
    case '99': return 'Custom tag'
    default: return 'Custom tag'
  }
}

/** Whether a tag is a free-text/custom tag (vocabulary 99) vs an IATI-coded one. */
export function isCustomTag(vocabulary?: string | null): boolean {
  return String(vocabulary ?? '99') === '99'
}
