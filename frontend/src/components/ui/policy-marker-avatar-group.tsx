'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion, type Transition } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sparkles,
  Leaf,
  Shield,
  Handshake,
  TreePine,
  Wind,
  Waves,
  MountainSnow,
  Users,
  Heart,
  Scale,
  Building2,
  LucideIcon
} from 'lucide-react';

interface PolicyMarker {
  policy_marker_id: string;
  significance?: number;
  code?: string;
  name?: string;
  iati_code?: string;
  is_iati_standard?: boolean;
}

interface PolicyMarkerAvatarGroupProps {
  policyMarkers?: PolicyMarker[];
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
};

const iconSizes = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

// Icon mapping based on IATI codes (matches activity profile page)
function getIconForMarker(iatiCode?: string | null, code?: string): LucideIcon {
  // First check IATI code
  if (iatiCode) {
    switch (iatiCode) {
      case '1': return Sparkles; // Gender Equality
      case '2': return Leaf; // Aid to Environment
      case '3': return Shield; // Good Governance (PDGG)
      case '4': return Handshake; // Trade Development
      case '5': return TreePine; // Biodiversity
      case '6': return Wind; // Climate Mitigation
      case '7': return Waves; // Climate Adaptation
      case '8': return MountainSnow; // Desertification
      case '9': return Users; // RMNCH
    }
  }

  // Fallback to code-based matching for custom markers
  if (code) {
    const lowerCode = code.toLowerCase();
    if (lowerCode.includes('gender')) return Sparkles;
    if (lowerCode.includes('environment') || lowerCode.includes('environ')) return Leaf;
    if (lowerCode.includes('governance') || lowerCode.includes('pdgg')) return Shield;
    if (lowerCode.includes('trade')) return Handshake;
    if (lowerCode.includes('biodiversity')) return TreePine;
    if (lowerCode.includes('mitigation')) return Wind;
    if (lowerCode.includes('adaptation') || lowerCode.includes('climate')) return Waves;
    if (lowerCode.includes('desertification')) return MountainSnow;
    if (lowerCode.includes('rmnch') || lowerCode.includes('health')) return Heart;
    if (lowerCode.includes('human_rights') || lowerCode.includes('rights')) return Scale;
    if (lowerCode.includes('disability')) return Users;
    if (lowerCode.includes('nutrition')) return Heart;
    if (lowerCode.includes('peace') || lowerCode.includes('conflict')) return Shield;
    if (lowerCode.includes('rural')) return Building2;
    if (lowerCode.includes('participatory')) return Users;
  }

  return Leaf; // Default icon
}

// Get significance label
function getSignificanceLabel(significance?: number): string {
  switch (significance) {
    case 0: return 'Not targeted';
    case 1: return 'Significant';
    case 2: return 'Principal';
    case 3: return 'Most funding';
    case 4: return 'Primary objective';
    default: return 'Unknown';
  }
}

export function PolicyMarkerAvatarGroup({
  policyMarkers = [],
  maxDisplay = 5,
  size = 'sm',
}: PolicyMarkerAvatarGroupProps) {
  const shouldReduceMotion = useReducedMotion();

  // Filter markers with significance > 0 and deduplicate
  const activeMarkers = useMemo(() => {
    const seen = new Set<string>();
    return policyMarkers.filter(m => {
      if (m.significance === 0) return false;
      const key = m.code || m.policy_marker_id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [policyMarkers]);

  const animationConfig = useMemo(
    () =>
      shouldReduceMotion
        ? {
            initial: { opacity: 1, x: 0, scale: 1 },
            animate: { opacity: 1, x: 0, scale: 1 },
            whileHover: { scale: 1.08, zIndex: 10 },
            transition: { duration: 0 },
          }
        : {
            initial: (index: number) => ({
              opacity: 0,
              x: -8 * index,
              scale: 0.85,
            }),
            animate: { opacity: 1, x: 0, scale: 1 },
            whileHover: { scale: 1.12, zIndex: 10 },
            transition: (index: number) => ({
              delay: 0.05 * index,
              type: "spring",
              stiffness: 320,
              damping: 24,
              mass: 0.7,
            }),
          },
    [shouldReduceMotion]
  );

  if (activeMarkers.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];
  const displayMarkers = activeMarkers.slice(0, maxDisplay);
  const remainingCount = activeMarkers.length - maxDisplay;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity">
            <motion.ul className="flex -space-x-2" role="list">
              {displayMarkers.map((marker, index) => {
                const IconComponent = getIconForMarker(marker.iati_code, marker.code);
                const markerUuid = marker.policy_marker_id;

                return (
                  <motion.li
                    key={marker.policy_marker_id || marker.code || index}
                    role="listitem"
                    initial={
                      typeof animationConfig.initial === "function"
                        ? animationConfig.initial(index)
                        : animationConfig.initial
                    }
                    animate={animationConfig.animate}
                    whileHover={animationConfig.whileHover}
                    transition={
                      (typeof animationConfig.transition === "function"
                        ? animationConfig.transition(index)
                        : animationConfig.transition) as Transition
                    }
                    className="relative"
                    style={{ zIndex: displayMarkers.length - index }}
                  >
                    <Link
                      href={`/policy-markers/${markerUuid}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block"
                    >
                      <div
                        className={`${sizeClass} rounded-full border border-slate-300 bg-slate-100 flex items-center justify-center shadow-sm hover:bg-slate-200 transition-colors`}
                        title={marker.name || marker.code}
                      >
                        <IconComponent className={`${iconSize} text-slate-600`} />
                      </div>
                    </Link>
                  </motion.li>
                );
              })}
            </motion.ul>
            {remainingCount > 0 && (
              <motion.span
                initial={{
                  opacity: shouldReduceMotion ? 1 : 0,
                  x: shouldReduceMotion ? 0 : -8,
                }}
                animate={{ opacity: 1, x: 0 }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { delay: 0.05 * displayMarkers.length, duration: 0.25, ease: "easeOut" }
                }
                className="ml-2 text-xs font-medium text-muted-foreground"
              >
                +{remainingCount}
              </motion.span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm bg-white border shadow-lg p-3">
          <div className="space-y-2">
            <p className="font-medium text-xs text-muted-foreground mb-2">
              Policy Markers ({activeMarkers.length})
            </p>
            {activeMarkers.map((marker, index) => {
              const IconComponent = getIconForMarker(marker.iati_code, marker.code);

              return (
                <div key={marker.policy_marker_id || marker.code || index} className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                    <IconComponent className="h-3 w-3 text-slate-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {marker.name || marker.code || 'Unknown Marker'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {getSignificanceLabel(marker.significance)}
                    </span>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">Click to view marker profile</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
