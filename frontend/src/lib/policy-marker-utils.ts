/**
 * Shared utilities for policy marker pages (listing + profile).
 */

import {
  Sparkles,
  Leaf,
  Shield,
  Handshake,
  TreePine,
  Wind,
  Waves,
  MountainSnow,
  Baby,
  AlertCircle,
  Heart,
  Droplets,
  Wrench,
  Globe,
  Users,
  Scale,
  Sprout,
  Sun,
  CloudRain,
  Building2,
  GraduationCap,
  Stethoscope,
  HandHeart,
  Briefcase,
  Cpu,
  Recycle,
  ShieldCheck,
  Wheat,
  Accessibility,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Curated set of icons a super user can choose from in the Policy Marker editor.
 * The key is stored in policy_markers.icon; the component is resolved for display.
 */
export const POLICY_MARKER_ICON_OPTIONS: Array<{ key: string; Icon: LucideIcon }> = [
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
  POLICY_MARKER_ICON_OPTIONS.map(o => [o.key, o.Icon])
)

/**
 * Resolve a stored icon key (from policy_markers.icon) to a component.
 */
export function getIconComponent(iconKey?: string | null): LucideIcon | null {
  if (!iconKey) return null
  return ICON_BY_KEY[iconKey] || null
}

/**
 * Get the appropriate icon component for a policy marker. A super-user-chosen
 * icon (stored key) takes precedence over the IATI-code-based default.
 */
export function getIconForMarker(iatiCode?: string, storedIcon?: string | null): LucideIcon {
  const custom = getIconComponent(storedIcon)
  if (custom) return custom
  if (!iatiCode) return Wrench

  switch (iatiCode) {
    case '1': return Sparkles       // Gender Equality
    case '2': return Leaf           // Aid to Environment
    case '3': return Shield         // Good Governance
    case '4': return Handshake      // Trade Development
    case '5': return TreePine       // Biodiversity
    case '6': return Wind           // Climate Mitigation
    case '7': return Waves          // Climate Adaptation
    case '8': return MountainSnow   // Desertification
    case '9': return Baby           // RMNCH
    case '10': return AlertCircle   // Disaster Risk Reduction
    case '11': return Heart         // Disability
    case '12': return Droplets      // Nutrition
    default: return Wrench
  }
}

/**
 * Get a human-readable label for a significance level.
 */
export function getSignificanceLabel(significance: number, isRMNCH: boolean = false): string {
  if (isRMNCH) {
    switch (significance) {
      case 0: return 'Negligible or no funding'
      case 1: return 'At least a quarter of funding'
      case 2: return 'Half of the funding'
      case 3: return 'Most funding targeted'
      case 4: return 'Explicit primary objective'
      default: return 'Unknown'
    }
  } else {
    switch (significance) {
      case 0: return 'Not targeted'
      case 1: return 'Significant objective'
      case 2: return 'Principal objective'
      case 3: return 'Most funding targeted'
      case 4: return 'Explicit primary objective'
      default: return 'Unknown'
    }
  }
}

/**
 * Color map for marker types.
 */
export const MARKER_TYPE_COLORS: Record<string, string> = {
  environmental: '#16A34A',
  social_governance: '#2563EB',
  other: '#7C3AED',
  custom: '#64748B',
}

/**
 * Resolve the theme color for a marker: a super-user-chosen color takes
 * precedence over the marker-type palette, with a neutral slate fallback.
 */
export function getMarkerColor(marker: { color?: string | null; marker_type?: string | null }): string {
  return marker.color || MARKER_TYPE_COLORS[marker.marker_type || 'other'] || '#64748B'
}

/**
 * Badge style classes for marker types.
 */
export const MARKER_TYPE_BADGE_CLASSES: Record<string, string> = {
  environmental: 'bg-green-100 text-green-800 border-green-300',
  social_governance: 'bg-blue-100 text-blue-800 border-blue-300',
  other: 'bg-purple-100 text-purple-800 border-purple-300',
  custom: 'bg-muted text-foreground border-border',
}

/**
 * Get a human-readable marker type label.
 */
export function getMarkerTypeLabel(markerType: string): string {
  switch (markerType) {
    case 'environmental': return 'Environmental'
    case 'social_governance': return 'Social & Governance'
    case 'other': return 'Other'
    case 'custom': return 'Custom'
    default: return markerType
  }
}
