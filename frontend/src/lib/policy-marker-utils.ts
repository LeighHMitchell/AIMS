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
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/**
 * Get the appropriate icon component for an IATI policy marker code.
 */
export function getIconForMarker(iatiCode?: string): LucideIcon {
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
