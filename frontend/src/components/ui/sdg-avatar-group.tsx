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
import { SDG_GOALS } from '@/data/sdg-targets';

interface SDGMapping {
  id?: string;
  sdgGoal: number | string;
  sdgTarget?: string;
  contributionPercent?: number;
  notes?: string;
}

interface SDGAvatarGroupProps {
  sdgMappings?: SDGMapping[];
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-11 w-11',
};

// SDG goal names mapping
const SDG_GOAL_NAMES: Record<number, string> = {
  1: 'No Poverty',
  2: 'Zero Hunger',
  3: 'Good Health and Well-being',
  4: 'Quality Education',
  5: 'Gender Equality',
  6: 'Clean Water and Sanitation',
  7: 'Affordable and Clean Energy',
  8: 'Decent Work and Economic Growth',
  9: 'Industry, Innovation and Infrastructure',
  10: 'Reduced Inequalities',
  11: 'Sustainable Cities and Communities',
  12: 'Responsible Consumption and Production',
  13: 'Climate Action',
  14: 'Life Below Water',
  15: 'Life on Land',
  16: 'Peace, Justice and Strong Institutions',
  17: 'Partnerships for the Goals'
};

/**
 * Extracts SDG number from various input formats
 */
function extractSDGNumber(goal: number | string): number | null {
  if (typeof goal === 'number') {
    return goal >= 1 && goal <= 17 ? goal : null;
  }
  
  const num = parseInt(goal.toString());
  return num >= 1 && num <= 17 ? num : null;
}

/**
 * Generates SDG icon URL for a given goal number
 */
function getSDGImageURL(goalNumber: number): string {
  const paddedNumber = goalNumber.toString().padStart(2, '0');
  return `/images/sdg/E_SDG_Icons-${paddedNumber}.jpg`;
}

export function SDGAvatarGroup({
  sdgMappings = [],
  maxDisplay = 5,
  size = 'sm',
}: SDGAvatarGroupProps) {
  const shouldReduceMotion = useReducedMotion();

  // Extract unique SDG goals from mappings
  const sdgGoals = useMemo(() => {
    const goals = sdgMappings
      .map(mapping => extractSDGNumber(mapping.sdgGoal))
      .filter((num): num is number => num !== null);

    // Remove duplicates and sort
    return Array.from(new Set(goals)).sort((a, b) => a - b);
  }, [sdgMappings]);

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

  if (sdgGoals.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const sizeClass = sizeClasses[size];
  const displaySDGs = sdgGoals.slice(0, maxDisplay);
  const remainingCount = sdgGoals.length - maxDisplay;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity">
            <motion.ul className="flex -space-x-2" role="list">
              {displaySDGs.map((goalNumber, index) => {
                const goalName = SDG_GOAL_NAMES[goalNumber];
                const imageUrl = getSDGImageURL(goalNumber);

                return (
                  <motion.li
                    key={goalNumber}
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
                    style={{ zIndex: displaySDGs.length - index }}
                  >
                    <Link
                      href={`/sdgs/${goalNumber}`}
                      onClick={(e) => e.stopPropagation()}
                      className="block"
                    >
                      <div
                        className={`${sizeClass} rounded-full border-2 border-white bg-white shadow-sm overflow-hidden`}
                      >
                        <img
                          src={imageUrl}
                          alt={`SDG ${goalNumber}: ${goalName}`}
                          className="w-full h-full object-cover rounded-full"
                          onError={(e) => {
                            // Fallback to colored circle with number
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.className = `${sizeClass} rounded-full border-2 border-white bg-blue-500 flex items-center justify-center`;
                              const span = document.createElement('span');
                              span.className = 'text-[10px] font-semibold text-white';
                              span.textContent = goalNumber.toString();
                              parent.appendChild(span);
                            }
                          }}
                        />
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
                    : { delay: 0.05 * displaySDGs.length, duration: 0.25, ease: "easeOut" }
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
              SDGs ({sdgGoals.length})
            </p>
            {sdgGoals.map((goalNumber) => {
              const goalName = SDG_GOAL_NAMES[goalNumber];
              const sdgGoal = SDG_GOALS.find(g => g.id === goalNumber);
              const mappings = sdgMappings.filter(m => extractSDGNumber(m.sdgGoal) === goalNumber);

              return (
                <div key={goalNumber} className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                    <img
                      src={getSDGImageURL(goalNumber)}
                      alt={`SDG ${goalNumber}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      Goal {goalNumber}: {goalName}
                    </span>
                    {sdgGoal?.description && (
                      <span className="text-xs text-muted-foreground">
                        {sdgGoal.description}
                      </span>
                    )}
                    {mappings.length > 0 && (
                      <span className="text-xs text-muted-foreground mt-1">
                        {mappings.length} target{mappings.length > 1 ? 's' : ''} mapped
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}




