import React from 'react';
import { Building2 } from 'lucide-react';

interface OrganizationLogoProps {
  logo?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6', 
  lg: 'w-8 h-8'
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5'
};

export function OrganizationLogo({ 
  logo, 
  name, 
  size = 'md', 
  className = '' 
}: OrganizationLogoProps) {
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];
  
  if (logo) {
    return (
      <div className={`${sizeClass} flex-shrink-0 ${className}`}>
        <img
          src={logo}
          alt={`${name || 'Organization'} logo`}
          className="rounded-sm object-contain w-full h-full"
          onError={(e) => {
            // Hide the image and show fallback
            (e.target as HTMLImageElement).style.display = 'none';
            const parent = (e.target as HTMLImageElement).parentElement;
            if (parent) {
              parent.innerHTML = `
                <div class="${sizeClass} bg-gray-100 rounded-sm flex items-center justify-center">
                  <svg class="${iconSize} text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                  </svg>
                </div>
              `;
            }
          }}
        />
      </div>
    );
  }
  
  // Fallback when no logo
  return (
    <div className={`${sizeClass} bg-gray-100 rounded-sm flex items-center justify-center ${className}`}>
      <Building2 className={`${iconSize} text-gray-400`} />
    </div>
  );
}
