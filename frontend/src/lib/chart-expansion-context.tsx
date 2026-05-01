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
