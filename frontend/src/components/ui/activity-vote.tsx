"use client"

import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useActivityVote, VoteValue } from '@/hooks/use-activity-vote'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ActivityVoteProps {
  activityId: string
  userId?: string | null
  initialScore?: number
  initialUserVote?: VoteValue
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'compact' | 'horizontal'
  showCounts?: boolean
  className?: string
}

/**
 * Reddit-style upvote/downvote component for activities
 *
 * Features:
 * - Optimistic UI updates
 * - Smooth animations
 * - Keyboard accessible
 * - Multiple size variants
 */
export function ActivityVote({
  activityId,
  userId,
  initialScore = 0,
  initialUserVote = 0,
  size = 'default',
  variant = 'default',
  showCounts = false,
  className
}: ActivityVoteProps) {
  const {
    score,
    upvoteCount,
    downvoteCount,
    userVote,
    isLoading,
    isVoting,
    error,
    upvote,
    downvote
  } = useActivityVote({
    activityId,
    userId,
    initialScore,
    initialUserVote
  })

  // Size configurations
  const sizeConfig = {
    sm: {
      button: 'w-6 h-6',
      icon: 'h-4 w-4',
      score: 'text-xs min-w-[24px]',
      gap: 'gap-0.5'
    },
    default: {
      button: 'w-8 h-8',
      icon: 'h-5 w-5',
      score: 'text-sm min-w-[32px]',
      gap: 'gap-1'
    },
    lg: {
      button: 'w-10 h-10',
      icon: 'h-6 w-6',
      score: 'text-base min-w-[40px]',
      gap: 'gap-1.5'
    }
  }

  const config = sizeConfig[size]
  const isHorizontal = variant === 'horizontal'

  const handleUpvote = useCallback(async () => {
    if (!userId || isVoting) return
    await upvote()
  }, [userId, isVoting, upvote])

  const handleDownvote = useCallback(async () => {
    if (!userId || isVoting) return
    await downvote()
  }, [userId, isVoting, downvote])

  // Format score for display
  const formatScore = (value: number): string => {
    if (value === 0) return '0'
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}k`
    }
    return value.toString()
  }

  // Determine score color
  const getScoreColor = () => {
    if (userVote === 1) return 'text-primary font-semibold'
    if (userVote === -1) return 'text-red-500 font-semibold'
    if (score > 0) return 'text-slate-700'
    if (score < 0) return 'text-slate-500'
    return 'text-slate-500'
  }

  if (isLoading) {
    return (
      <div className={cn(
        'flex items-center',
        isHorizontal ? 'flex-row gap-2' : 'flex-col',
        config.gap,
        className
      )}>
        <div className={cn('rounded bg-slate-100 animate-pulse', config.button)} />
        <div className={cn('rounded bg-slate-100 animate-pulse h-4 w-6')} />
        <div className={cn('rounded bg-slate-100 animate-pulse', config.button)} />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex items-center',
          isHorizontal ? 'flex-row' : 'flex-col',
          config.gap,
          className
        )}
        role="group"
        aria-label="Vote on this activity"
      >
        {/* Upvote Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={handleUpvote}
              disabled={!userId || isVoting}
              className={cn(
                'flex items-center justify-center rounded-md transition-colors',
                config.button,
                userVote === 1
                  ? 'bg-primary/10 text-primary hover:bg-primary/20'
                  : 'text-slate-400 hover:text-primary hover:bg-slate-100',
                (!userId || isVoting) && 'opacity-50 cursor-not-allowed',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-1'
              )}
              whileTap={{ scale: 0.9 }}
              aria-pressed={userVote === 1}
              aria-label="Upvote this activity"
            >
              <motion.div
                animate={{
                  y: userVote === 1 ? -2 : 0,
                  scale: userVote === 1 ? 1.1 : 1
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <ThumbsUp className={config.icon} strokeWidth={userVote === 1 ? 3 : 2} />
              </motion.div>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side={isHorizontal ? 'top' : 'right'}>
            <p>{userId ? 'Upvote this activity' : 'Log in to vote'}</p>
            {showCounts && <p className="text-xs text-muted-foreground">{upvoteCount} upvotes</p>}
          </TooltipContent>
        </Tooltip>

        {/* Score Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={score}
            initial={{ opacity: 0, y: isHorizontal ? 0 : -10, x: isHorizontal ? -10 : 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: isHorizontal ? 0 : 10, x: isHorizontal ? 10 : 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'text-center font-medium tabular-nums',
              config.score,
              getScoreColor()
            )}
            aria-live="polite"
            aria-atomic="true"
          >
            {formatScore(score)}
          </motion.div>
        </AnimatePresence>

        {/* Downvote Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={handleDownvote}
              disabled={!userId || isVoting}
              className={cn(
                'flex items-center justify-center rounded-md transition-colors',
                config.button,
                userVote === -1
                  ? 'bg-red-50 text-red-500 hover:bg-red-100'
                  : 'text-slate-400 hover:text-red-500 hover:bg-slate-100',
                (!userId || isVoting) && 'opacity-50 cursor-not-allowed',
                'focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-1'
              )}
              whileTap={{ scale: 0.9 }}
              aria-pressed={userVote === -1}
              aria-label="Downvote this activity"
            >
              <motion.div
                animate={{
                  y: userVote === -1 ? 2 : 0,
                  scale: userVote === -1 ? 1.1 : 1
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <ThumbsDown className={config.icon} strokeWidth={userVote === -1 ? 3 : 2} />
              </motion.div>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side={isHorizontal ? 'bottom' : 'right'}>
            <p>{userId ? 'Downvote this activity' : 'Log in to vote'}</p>
            {showCounts && <p className="text-xs text-muted-foreground">{downvoteCount} downvotes</p>}
          </TooltipContent>
        </Tooltip>

        {/* Error indicator (subtle) */}
        {error && (
          <div className="absolute -bottom-1 -right-1 w-2 h-2 rounded-full bg-red-500" title={error} />
        )}
      </div>
    </TooltipProvider>
  )
}

/**
 * Compact inline version showing just score with vote buttons
 */
export function ActivityVoteInline({
  activityId,
  userId,
  initialScore = 0,
  initialUserVote = 0,
  className
}: Omit<ActivityVoteProps, 'size' | 'variant' | 'showCounts'>) {
  return (
    <ActivityVote
      activityId={activityId}
      userId={userId}
      initialScore={initialScore}
      initialUserVote={initialUserVote}
      size="sm"
      variant="horizontal"
      className={className}
    />
  )
}
