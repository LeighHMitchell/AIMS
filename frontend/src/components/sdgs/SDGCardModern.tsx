'use client';

import React from 'react';
import Link from 'next/link';
import { Target } from 'lucide-react';
import type { SDGGoal } from '@/data/sdg-targets';
import { CardShell } from '@/components/ui/card-shell';

interface SDGCardModernProps {
  goal: SDGGoal;
  activityCount?: number;
  className?: string;
  bannerImage?: string;
}

const SDGCardModern: React.FC<SDGCardModernProps> = ({
  goal,
  activityCount = 0,
  className = '',
  bannerImage,
}) => {
  const sdgUrl = `/sdgs/${goal.id}`;

  return (
    <CardShell
      href={sdgUrl}
      ariaLabel={`SDG ${goal.id}: ${goal.name}`}
      className={className}
      bannerColor={goal.color}
      bannerImage={bannerImage}
      bannerContent={!bannerImage ? (
        <div className="h-full w-full flex items-center justify-center">
          <span className="text-6xl font-bold text-white/20">{goal.id}</span>
        </div>
      ) : undefined}
      bannerOverlay={
        <h2 className="text-lg font-bold text-white mb-1">
          <Link
            href={sdgUrl}
            className="relative z-10 hover:underline inline"
            onClick={(e) => e.stopPropagation()}
          >
            SDG {goal.id}: {goal.name}
          </Link>
        </h2>
      }
    >
      {/* Details Section */}
      <div className="relative flex-1 p-5 flex flex-col bg-card">
        <p className="text-body line-clamp-3 text-muted-foreground mb-4">
          {goal.description}
        </p>

        <div className="mt-auto flex items-center gap-2">
          <Target className="w-4 h-4 text-muted-foreground" />
          <span className="text-body font-medium">
            {activityCount} {activityCount === 1 ? 'activity' : 'activities'}
          </span>
        </div>
      </div>
    </CardShell>
  );
};

export { SDGCardModern };
export default SDGCardModern;
