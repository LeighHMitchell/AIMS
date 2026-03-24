'use client';

import React from 'react';
import Link from 'next/link';
import { Target } from 'lucide-react';
import { motion } from 'framer-motion';
import type { SDGGoal } from '@/data/sdg-targets';

interface SDGCardModernProps {
  goal: SDGGoal;
  activityCount?: number;
  className?: string;
}

const SDGCardModern: React.FC<SDGCardModernProps> = ({
  goal,
  activityCount = 0,
  className = '',
}) => {
  const sdgUrl = `/sdgs/${goal.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, type: 'spring', bounce: 0.3 }}
      whileHover={{ y: -8 }}
      className={`group relative flex w-full flex-col rounded-3xl shadow-sm hover:shadow-xl transition-shadow duration-300 cursor-pointer isolate overflow-hidden border bg-card ${className}`}
      role="article"
      aria-label={`SDG ${goal.id}: ${goal.name}`}
    >
      {/* Invisible link overlay */}
      <Link
        href={sdgUrl}
        className="absolute inset-0 z-0"
        aria-label={`View SDG ${goal.id}`}
      >
        <span className="sr-only">View SDG</span>
      </Link>

      {/* Banner Section — uses the SDG's own color */}
      <div
        className="relative h-48 w-full overflow-hidden"
        style={{ backgroundColor: goal.color }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent z-10" />
        <div className="h-full w-full flex items-center justify-center">
          <span className="text-6xl font-bold text-white/20">{goal.id}</span>
        </div>

        {/* Title - Bottom of banner */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-bold text-white mb-1">
              <Link
                href={sdgUrl}
                className="relative z-10 hover:underline inline"
                onClick={(e) => e.stopPropagation()}
              >
                SDG {goal.id}: {goal.name}
              </Link>
            </h2>
          </motion.div>
        </div>
      </div>

      {/* Details Section */}
      <div className="relative flex-1 p-5 flex flex-col bg-card">
        <p className="text-sm line-clamp-3 text-muted-foreground mb-4">
          {goal.description}
        </p>

        <div className="mt-auto flex items-center gap-2">
          <Target className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {activityCount} {activityCount === 1 ? 'activity' : 'activities'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export { SDGCardModern };
export default SDGCardModern;
