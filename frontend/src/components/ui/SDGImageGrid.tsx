'use client';

import React from 'react';
import Image from 'next/image';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SDG_GOALS } from '@/data/sdg-targets';

interface SDGImageGridProps {
  /** Array of SDG codes (e.g., ['SDG 1', 'SDG 3', 'SDG 13'] or [1, 3, 13] or ['1', '3', '13']) */
  sdgCodes: (string | number)[];
  /** Size of each SDG image */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Custom className for the container */
  className?: string;
  /** Whether to show tooltips with goal descriptions */
  showTooltips?: boolean;
  /** Maximum number of SDGs to display before showing "+" indicator */
  maxDisplay?: number;
}

// SDG goal names mapping for quick lookup
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
 * Supports: "SDG 1", "1", 1, "Goal 1", etc.
 */
function extractSDGNumber(code: string | number): number | null {
  if (typeof code === 'number') {
    return code >= 1 && code <= 17 ? code : null;
  }
  
  const str = code.toString().toLowerCase();
  
  // Match patterns like "SDG 1", "Goal 1", "sdg1", etc.
  const match = str.match(/(?:sdg|goal)\s*(\d{1,2})|^(\d{1,2})$/);
  if (match) {
    const num = parseInt(match[1] || match[2]);
    return num >= 1 && num <= 17 ? num : null;
  }
  
  return null;
}

/**
 * Generates UN SDG icon URL for a given goal number
 */
function getSDGImageURL(goalNumber: number): string {
  const paddedNumber = goalNumber.toString().padStart(2, '0');
  return `https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-${paddedNumber}.jpg`;
}

/**
 * Size configurations for SDG images
 */
const sizeConfig = {
  sm: { width: 32, height: 32, containerClass: 'w-8 h-8' },
  md: { width: 48, height: 48, containerClass: 'w-12 h-12' },
  lg: { width: 64, height: 64, containerClass: 'w-16 h-16' },
  xl: { width: 96, height: 96, containerClass: 'w-24 h-24' },
  '2xl': { width: 128, height: 128, containerClass: 'w-32 h-32' }
};

export function SDGImageGrid({
  sdgCodes,
  size = 'md',
  className = '',
  showTooltips = true,
  maxDisplay
}: SDGImageGridProps) {
  // Parse and validate SDG codes
  const validSDGs = sdgCodes
    .map(extractSDGNumber)
    .filter((num): num is number => num !== null)
    .filter((num, index, arr) => arr.indexOf(num) === index) // Remove duplicates
    .sort((a, b) => a - b); // Sort numerically

  if (validSDGs.length === 0) {
    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-md text-sm text-gray-500 bg-gray-100 border border-dashed border-gray-300 ${className}`}>
        No SDG assigned
      </div>
    );
  }

  const { width, height, containerClass } = sizeConfig[size];
  const displaySDGs = maxDisplay ? validSDGs.slice(0, maxDisplay) : validSDGs;
  const remainingCount = maxDisplay && validSDGs.length > maxDisplay 
    ? validSDGs.length - maxDisplay 
    : 0;

  const SDGImage = ({ goalNumber }: { goalNumber: number }) => {
    const goalName = SDG_GOAL_NAMES[goalNumber];
    const altText = `SDG ${goalNumber}: ${goalName}`;
    const imageUrl = getSDGImageURL(goalNumber);
    
    const imageElement = (
      <div className={`${containerClass} relative overflow-hidden rounded-md shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200`}>
        <Image
          src={imageUrl}
          alt={altText}
          width={width}
          height={height}
          className="object-cover w-full h-full hover:scale-105 transition-transform duration-200"
          unoptimized // Since these are external UN images
        />
      </div>
    );

    if (!showTooltips) {
      return imageElement;
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {imageElement}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="text-center">
              <div className="font-semibold">Goal {goalNumber}: {goalName}</div>
              {SDG_GOALS.find(g => g.id === goalNumber)?.description && (
                <div className="text-xs text-gray-600 mt-1">
                  {SDG_GOALS.find(g => g.id === goalNumber)?.description}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className={`grid grid-cols-6 gap-3 max-w-fit ${className}`}>
      {displaySDGs.map((goalNumber) => (
        <SDGImage key={goalNumber} goalNumber={goalNumber} />
      ))}
      
      {remainingCount > 0 && (
        <div className={`${containerClass} flex items-center justify-center bg-gray-100 text-gray-600 text-sm font-medium rounded-md border border-gray-200`}>
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

export default SDGImageGrid;