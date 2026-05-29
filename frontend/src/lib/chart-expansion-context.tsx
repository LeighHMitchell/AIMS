"use client"

import React, { createContext, useContext } from 'react'

interface ChartExpansionValue {
  isExpanded: boolean
}

const ChartExpansionContext = createContext<ChartExpansionValue>({ isExpanded: false })

export function ChartExpansionProvider({
  isExpanded,
  children,
}: {
  isExpanded: boolean
  children: React.ReactNode
}) {
  return (
    <ChartExpansionContext.Provider value={{ isExpanded }}>
      {children}
    </ChartExpansionContext.Provider>
  )
}

/**
 * Hook returning whether the surrounding chart card is in expanded (full-screen / modal) view.
 * Charts use this to switch tooltip currency formatting:
 *   - compact view: $23.2m / $1.2b
 *   - expanded view: full $23,234,567 (no decimals)
 * Defaults to `false` when used outside any provider.
 */
export function useChartExpansion(): boolean {
  return useContext(ChartExpansionContext).isExpanded
}

/**
 * Renders its children only when inside an expanded (modal) chart card.
 * Lets a chart that renders its OWN card wrapper keep filters/controls out of
 * the collapsed view — collapsed then shows just the chart plus the card's
 * ƒ / expand buttons. Must be rendered as a descendant of the card (inside its
 * ChartExpansionProvider) to read the right value.
 */
export function ExpandedOnly({ children }: { children: React.ReactNode }) {
  return useChartExpansion() ? <>{children}</> : null
}
