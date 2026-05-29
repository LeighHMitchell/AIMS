"use client"

import React from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Keeps a chart mounted while its data is refetching so recharts can animate
 * from the old dataset to the new one (instead of the chart unmounting to a
 * loading placeholder and flashing back). While `loading` is true the existing
 * chart is dimmed and a small spinner overlays it.
 *
 * Use this for *refetch* loading only — the initial "no data yet" load should
 * still render a full <ChartLoadingPlaceholder/> so there's something to show.
 *
 *   if (loading && data.length === 0) return <ChartLoadingPlaceholder />
 *   ...
 *   <ChartUpdating loading={loading}>{plot}</ChartUpdating>
 */
export function ChartUpdating({
  loading,
  children,
  className,
}: {
  loading: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <div
        aria-busy={loading}
        className={cn(
          'transition-opacity duration-200 ease-out motion-reduce:transition-none',
          loading && 'opacity-50 pointer-events-none',
        )}
      >
        {children}
      </div>
      {loading && (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

/**
 * Crossfades between structurally different chart renders (e.g. bar ↔ line ↔
 * area, or chart ↔ table) instead of hard-swapping the DOM. Pass a
 * `transitionKey` that captures the chart's *structural identity* — typically
 * the chart type plus any grouping mode. When it changes the old render fades
 * out (opacity + slight scale) and the new one fades in; when only the data
 * changes (same key) the child updates in place so recharts can tween.
 *
 *   <ChartCrossfade transitionKey={`${chartType}-${groupBy}`}>
 *     <ResponsiveContainer height={400}>{chartType === 'line' ? <LineChart…/> : <BarChart…/>}</ResponsiveContainer>
 *   </ChartCrossfade>
 *
 * Note: keep the wrapped chart's height explicit (recharts ResponsiveContainer
 * `height={…}`) so the box doesn't collapse mid-transition.
 */
// Confident ease-out (ease-out-expo) — no bounce/elastic.
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function ChartCrossfade({
  transitionKey,
  children,
  className,
}: {
  transitionKey: React.Key
  children: React.ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        className={className}
        initial={reduce ? false : { opacity: 0, scale: 0.98 }}
        // Enter is a confident ease-out; exit is quicker (~75% of the duration).
        animate={{
          opacity: 1,
          scale: 1,
          transition: reduce ? { duration: 0 } : { duration: 0.2, ease: EASE_OUT_EXPO },
        }}
        exit={{
          opacity: 0,
          scale: reduce ? 1 : 0.98,
          transition: reduce ? { duration: 0 } : { duration: 0.15, ease: EASE_OUT_EXPO },
        }}
        style={{ transformOrigin: 'center' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
