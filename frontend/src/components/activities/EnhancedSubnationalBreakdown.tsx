"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { HelpTextTooltip } from "@/components/ui/help-text-tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

import { MapPin, Trash2, Loader2, ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import myanmarData from '@/data/myanmar-locations.json'
import { toast } from "sonner"
import dynamic from 'next/dynamic'
import { HierarchicalAdminSelect } from "@/components/ui/hierarchical-admin-select"
import { apiFetch } from '@/lib/api-fetch';
import type { ViewLevel, AllocationLevel, AdminUnit as TypedAdminUnit } from '@/types/subnational'

// Dynamically import the map to avoid SSR issues with MapLibre
const SubnationalChoroplethMap = dynamic(
  () => import('@/components/maps/SubnationalChoroplethMap'),
  {
    ssr: false,
    loading: () => (
      <Card className="w-full h-full">
        <CardContent className="p-6 h-full flex items-center justify-center">
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading map...
          </div>
        </CardContent>
      </Card>
    ),
  }
)

// Nominatim reverse-geocoding often returns township names with admin-level
// suffixes (e.g. "Kyauktada District", "Bhamo Township") or directional
// parentheticals, whereas MIMU/myanmar-locations.json uses short names like
// "Kyauktada". This normaliser strips that noise so best-effort matches land.
function normaliseTownshipName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s*\((east|west|north|south|seikkan)\)\s*$/i, '')
    .replace(/\s+(district|township|sub[- ]township)\s*$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Known Nominatim ↔ MIMU spelling drift for Myanmar state/region names.
// Keys and values are post-normalisation (lowercase, alphanumeric-collapsed,
// suffixes already stripped). Extend as new mismatches surface.
const REGION_NAME_ALIASES: Record<string, string> = {
  naypyitaw: 'naypyidaw',
  nay_pyi_taw: 'naypyidaw',
  'nay pyi taw': 'naypyidaw',
}

function normaliseRegionName(raw: string): string {
  const base = raw
    .toLowerCase()
    .replace(/\s+(region|state|union\s+territory|division)\s*$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  return REGION_NAME_ALIASES[base] ?? base
}

interface AdminUnit {
  id: string
  name: string
  type: 'state' | 'region' | 'union-territory' | 'township'
  parentName?: string // For townships, this is the state/region name
  parentId?: string
  fullName: string // Display name with parent context
  st_pcode: string      // MIMU State/Region PCode
  ts_pcode?: string     // MIMU Township PCode (only for townships)
}

interface BreakdownEntry {
  id: string
  adminUnit: AdminUnit
  percentage: number
  allocationLevel: AllocationLevel
}

interface SuggestedTownship {
  townshipName: string
  regionName: string
}

interface EnhancedSubnationalBreakdownProps {
  activityId: string
  canEdit?: boolean
  onDataChange?: (breakdowns: Record<string, number>) => void
  suggestedRegions?: string[]  // Regions from Activity Sites to auto-add
  suggestedTownships?: SuggestedTownship[]  // Specific townships from Activity Sites
}

export function EnhancedSubnationalBreakdown({
  activityId,
  canEdit = true,
  onDataChange,
  suggestedRegions = [],
  suggestedTownships = []
}: EnhancedSubnationalBreakdownProps) {
  // entries now contains ONLY township-level entries — regions are derived
  const [entries, setEntries] = useState<BreakdownEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedUnits, setSelectedUnits] = useState<string[]>([])
  const [viewLevel, setViewLevel] = useState<ViewLevel>('township')
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())

  // Track if initial load is complete and if user has made changes
  const isInitialLoadRef = useRef(true)
  const hasUserChangedDataRef = useRef(false)

  // Myanmar-only guard. The administrative-unit dataset (states, regions,
  // townships, P-codes) is hardcoded to Myanmar. If the activity reports a
  // different country, showing Myanmar P-codes would be misleading and lead
  // to bad data. We detect the country from the countries-regions API
  // (same endpoint used by the Countries & Regions tab) and gate the form.
  // null = still checking, true = Myanmar or no countries set, false = other.
  const [isMyanmarActivity, setIsMyanmarActivity] = useState<boolean | null>(null)
  const [otherCountryName, setOtherCountryName] = useState<string | null>(null)

  // Pending delete confirmations — null when dialog closed.
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: 'region'; regionName: string; townshipCount: number; percentage: number }
    | { kind: 'township'; entryId: string; name: string; percentage: number }
    | { kind: 'clearAll' }
    | null
  >(null)

  // Track which suggested regions have been processed to avoid re-adding
  const processedSuggestedRegionsRef = useRef<Set<string>>(new Set())

  // Create flattened list of all administrative units (states/regions/union territories AND townships)
  const allAdminUnits = useMemo(() => {
    const units: AdminUnit[] = []

    // Add states/regions/union territories
    myanmarData.states.forEach((state) => {
      const stateUnit: AdminUnit = {
        id: state.id,
        name: state.name,
        type: state.type as 'state' | 'region' | 'union-territory',
        fullName: state.name,
        st_pcode: (state as any).st_pcode || ''
      }
      units.push(stateUnit)

      // Add townships under this state/region
      state.townships.forEach((township) => {
        const townshipData = township as { id: string; name: string; code: string; ts_pcode?: string; st_pcode?: string }
        units.push({
          id: townshipData.id,
          name: townshipData.name,
          type: 'township',
          parentName: state.name,
          parentId: state.id,
          fullName: `${townshipData.name}, ${state.name}`,
          st_pcode: townshipData.st_pcode || stateUnit.st_pcode,
          ts_pcode: townshipData.ts_pcode
        })
      })
    })

    return units
  }, [])

  // Track which township IDs have activity sites (for visual highlighting)
  const highlightedTownshipIds = useMemo(() => {
    const ids = new Set<string>()
    suggestedTownships.forEach(st => {
      const match = allAdminUnits.find(u =>
        u.type === 'township' &&
        u.name === st.townshipName &&
        u.parentName === st.regionName
      )
      if (match) ids.add(match.id)
    })
    return ids
  }, [suggestedTownships, allAdminUnits])

  // Filter admin units based on current view level — always show regions in the selector
  const filteredAdminUnits = useMemo(() => {
    if (viewLevel === 'region') {
      return allAdminUnits.filter(u => u.type !== 'township')
    }
    return allAdminUnits
  }, [allAdminUnits, viewLevel])

  // --- Auto-distribute helper (pure function) ---
  const autoDistributeTownships = useCallback((regionUnit: AdminUnit, regionPercentage: number = 0): {
    newEntries: BreakdownEntry[]
    townshipIds: string[]
  } => {
    const townships = allAdminUnits.filter(u => u.parentId === regionUnit.id)
    const perTownship = townships.length > 0 ? regionPercentage / townships.length : 0

    const newEntries: BreakdownEntry[] = townships.map(t => ({
      id: `entry-${Date.now()}-${t.id}`,
      adminUnit: t,
      percentage: perTownship,
      allocationLevel: 'township' as AllocationLevel,
    }))

    return { newEntries, townshipIds: townships.map(t => t.id) }
  }, [allAdminUnits])

  // --- Computed region summaries from township entries ---
  const regionSummaries = useMemo(() => {
    const map = new Map<string, { regionUnit: AdminUnit; total: number; townshipCount: number }>()

    entries.forEach(entry => {
      const parentName = entry.adminUnit.parentName
      if (!parentName) return
      const existing = map.get(parentName)
      if (existing) {
        existing.total += entry.percentage
        existing.townshipCount += 1
      } else {
        const regionUnit = allAdminUnits.find(u => u.name === parentName && u.type !== 'township')
        if (regionUnit) {
          map.set(parentName, { regionUnit, total: entry.percentage, townshipCount: 1 })
        }
      }
    })

    return map
  }, [entries, allAdminUnits])

  // Calculate totals from township entries
  const totalPercentage = entries.reduce((sum, entry) => sum + entry.percentage, 0)
  const isValidTotal = Math.abs(totalPercentage - 100) < 0.01
  const hasAnyValues = entries.some(entry => entry.percentage > 0)

  // Organize entries hierarchically for table display
  const organizedEntries = useMemo(() => {
    const result: Array<{
      type: 'region' | 'township'
      regionName: string
      regionUnit?: AdminUnit
      regionTotal?: number
      townshipCount?: number
      entry?: BreakdownEntry
    }> = []

    // Build ordered list: region header, then its townships
    const regionNames = Array.from(regionSummaries.keys()).sort()

    regionNames.forEach(regionName => {
      const summary = regionSummaries.get(regionName)
      if (!summary) return

      // Add region header row
      result.push({
        type: 'region',
        regionName,
        regionUnit: summary.regionUnit,
        regionTotal: summary.total,
        townshipCount: summary.townshipCount,
      })

      // Add township rows only in Townships view, and only when expanded.
      // Regions view shows region rows only (no chevrons, no township children).
      if (viewLevel === 'township' && expandedRegions.has(regionName)) {
        const townshipEntries = entries
          .filter(e => e.adminUnit.parentName === regionName)
          .sort((a, b) => a.adminUnit.name.localeCompare(b.adminUnit.name))

        townshipEntries.forEach(entry => {
          result.push({
            type: 'township',
            regionName,
            entry,
          })
        })
      }
    })

    return result
  }, [entries, regionSummaries, expandedRegions, viewLevel])

  // Show toast when total reaches 100% - but only after user makes changes
  useEffect(() => {
    if (isValidTotal && hasAnyValues && !loading && hasUserChangedDataRef.current) {
      toast.success('Perfect! Total allocation is 100%', {
        duration: 3000,
        description: 'Your subnational breakdown is complete.'
      })
    }
  }, [isValidTotal, hasAnyValues, loading])

  // Region-keyed breakdowns: aggregate every entry up to its parent region.
  // Used for the region/state choropleth layer and as the region-totals source
  // for the township tooltip.
  const regionBreakdowns = useMemo(() => {
    const aggregated = new Map<string, number>()

    entries.forEach((entry) => {
      const targetName = entry.adminUnit.parentName ?? entry.adminUnit.name
      const currentValue = aggregated.get(targetName)
      aggregated.set(targetName, (currentValue ?? 0) + entry.percentage)
    })

    return Object.fromEntries(aggregated.entries())
  }, [entries])

  // Township-keyed breakdowns. Keys are MIMU township pcodes (matched against
  // the GeoJSON `TS_PCODE` property). Pcodes are used instead of names because
  // township name spellings differ between the MIMU GeoJSON and our locations
  // data (e.g. "Dagon Myothit (East)" vs "East Dagon", "Kamaryut" vs "Kamayut").
  // Region-level entries are spread evenly across their child townships.
  const townshipBreakdowns = useMemo(() => {
    const aggregated: Record<string, number> = {}

    const addTo = (key: string | undefined, value: number) => {
      if (!key) return
      aggregated[key] = (aggregated[key] ?? 0) + value
    }

    entries.forEach((entry) => {
      if (entry.adminUnit.type === 'township') {
        addTo(entry.adminUnit.ts_pcode, entry.percentage)
      } else {
        const children = allAdminUnits.filter(u => u.parentId === entry.adminUnit.id)
        if (children.length === 0) return
        const share = entry.percentage / children.length
        children.forEach(child => addTo(child.ts_pcode, share))
      }
    })

    return aggregated
  }, [entries, allAdminUnits])

  const breakdownsForMap = viewLevel === 'township' ? townshipBreakdowns : regionBreakdowns

  // Load existing data
  const loadData = useCallback(async () => {

    if (!activityId || activityId === 'undefined' || activityId === 'null') {
      setLoading(false)
      return
    }

    try {
      const response = await apiFetch(`/api/activities/${activityId}/subnational-breakdown`)

      if (response.ok) {
        const data = await response.json()

        // Convert backend data to entries format
        const loadedEntries: BreakdownEntry[] = []
        const loadedSelectedUnits: string[] = []
        const regionsToExpand = new Set<string>()

        // Separate region-level and township-level rows
        const regionRows: any[] = []
        const townshipRows: any[] = []

        data.forEach((item: any) => {
          const isTownship = item.allocation_level === 'township' ||
                            item.ts_pcode ||
                            item.region_name.includes(' - ')
          if (isTownship) {
            townshipRows.push(item)
          } else {
            regionRows.push(item)
          }
        })

        // Load township rows directly
        townshipRows.forEach((item: any, index: number) => {
          const adminUnit = allAdminUnits.find(unit => {
            if (item.ts_pcode && unit.ts_pcode === item.ts_pcode) return true
            if (item.region_name.includes(' - ')) {
              const parts = item.region_name.split(' - ')
              const stateName = parts[0]
              const townshipName = parts[1]
              return unit.type === 'township' &&
                     unit.name === townshipName &&
                     unit.parentName === stateName
            }
            return false
          })

          if (adminUnit) {
            loadedEntries.push({
              id: `entry-${index}`,
              adminUnit,
              percentage: item.percentage,
              allocationLevel: 'township'
            })
            loadedSelectedUnits.push(adminUnit.id)
            if (adminUnit.parentName) {
              regionsToExpand.add(adminUnit.parentName)
              // Also add the parent region to selectedUnits
              const parentUnit = allAdminUnits.find(u => u.name === adminUnit.parentName && u.type !== 'township')
              if (parentUnit && !loadedSelectedUnits.includes(parentUnit.id)) {
                loadedSelectedUnits.push(parentUnit.id)
              }
            }
          }
        })

        // Backward compatibility: convert legacy region-level rows to distributed townships
        regionRows.forEach((item: any) => {
          const regionUnit = allAdminUnits.find(unit =>
            unit.type !== 'township' && (
              (item.st_pcode && unit.st_pcode === item.st_pcode) ||
              unit.name === item.region_name
            )
          )

          if (regionUnit) {
            // Check if we already have township entries for this region
            const hasExistingTownships = loadedEntries.some(e => e.adminUnit.parentName === regionUnit.name)

            if (!hasExistingTownships) {
              // Distribute region percentage to townships
              const { newEntries, townshipIds } = autoDistributeTownships(regionUnit, item.percentage)
              loadedEntries.push(...newEntries)
              loadedSelectedUnits.push(regionUnit.id, ...townshipIds)
              regionsToExpand.add(regionUnit.name)
            }
          }
        })

        setEntries(loadedEntries)
        setSelectedUnits(loadedSelectedUnits)
        setExpandedRegions(regionsToExpand)

      } else {
      }
    } catch (error) {
      console.error('[EnhancedSubnationalBreakdown] Error loading data:', error)
      if (error instanceof Error && !error.message.includes('404')) {
        toast.error('Couldn\u2019t load sub-national breakdown data. Refresh the page or contact support.')
      }
    } finally {
      setLoading(false)
      setTimeout(() => {
        isInitialLoadRef.current = false
      }, 500)
    }
  }, [activityId, allAdminUnits, autoDistributeTownships])

  const hasLoadedRef = useRef(false)
  useEffect(() => {
    // Prevent double-load in React strict mode from clobbering suggested region entries
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    loadData()

    const timeout = setTimeout(() => {
      setLoading(false)
    }, 10000)

    return () => clearTimeout(timeout)
  }, [activityId, loadData])

  // Myanmar-only guard: detect the activity's country from the
  // countries-regions API. If the user has picked a non-Myanmar country,
  // surface a friendly explanation instead of the Myanmar admin unit list.
  // If no country is set yet, we assume Myanmar (current data) and show the
  // form — so existing Myanmar flows keep working.
  useEffect(() => {
    if (!activityId || activityId === 'undefined' || activityId === 'null') {
      setIsMyanmarActivity(true)
      return
    }

    let cancelled = false
    apiFetch(`/api/activities/${activityId}/countries-regions`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data) return
        const countries = (data.countries || []) as Array<{ country?: { code?: string; name?: string }; code?: string; name?: string }>
        if (countries.length === 0) {
          // No country picked yet — show the form, current behavior
          setIsMyanmarActivity(true)
          return
        }
        // Myanmar ISO codes: MM (alpha-2), MMR (alpha-3). Treat as Myanmar if
        // ANY of the activity's countries include Myanmar — in mixed-country
        // activities the Myanmar admin breakdown is still useful.
        const isMyanmar = countries.some(c => {
          const code = (c.country?.code || c.code || '').toUpperCase()
          return code === 'MM' || code === 'MMR'
        })
        setIsMyanmarActivity(isMyanmar)
        if (!isMyanmar) {
          const first = countries[0]
          setOtherCountryName(first?.country?.name || first?.name || null)
        }
      })
      .catch(() => {
        // On API failure, fall back to showing the form — don't block users
        // over a transient network issue.
        if (!cancelled) setIsMyanmarActivity(true)
      })

    return () => {
      cancelled = true
    }
  }, [activityId])

  // Handle suggested regions/townships from Activity Sites
  // Only adds the specific townships where sites exist (not all townships in the region)
  useEffect(() => {
    console.log('[EnhancedSubnationalBreakdown] Suggested regions/townships effect:', {
      loading,
      suggestedRegions,
      suggestedTownships,
      processedKeys: Array.from(processedSuggestedRegionsRef.current),
      selectedUnitsCount: selectedUnits.length,
      entriesCount: entries.length,
    })

    if (loading) return
    if (!suggestedRegions?.length && !suggestedTownships?.length) return

    const allNewEntries: BreakdownEntry[] = []
    const allNewUnitIds: string[] = []
    const newExpandedRegions = new Set(expandedRegions)
    let hasChanges = false

    // Helper: match region name flexibly across Nominatim/MIMU spelling drift
    // (e.g. "Mandalay" ↔ "Mandalay Region", "Naypyitaw" ↔ "Naypyidaw Union Territory").
    const findRegionUnit = (regionName: string) => {
      const target = normaliseRegionName(regionName)
      if (!target) return undefined
      return allAdminUnits.find(u =>
        u.type !== 'township' && normaliseRegionName(u.name) === target
      )
    }

    // For each suggested region, check if there are specific townships suggested.
    // If yes: add only those townships. If no: add ALL townships in the region.
    suggestedRegions.forEach(regionName => {
      if (processedSuggestedRegionsRef.current.has(regionName)) return

      const regionUnit = findRegionUnit(regionName)
      if (!regionUnit) {
        processedSuggestedRegionsRef.current.add(regionName)
        return
      }

      // Add region to selectedUnits if not already there
      if (!selectedUnits.includes(regionUnit.id) && !allNewUnitIds.includes(regionUnit.id)) {
        allNewUnitIds.push(regionUnit.id)
      }
      newExpandedRegions.add(regionUnit.name)

      // Check if there are specific townships suggested for this region
      const regionTownships = suggestedTownships.filter(st => {
        const matchedRegion = findRegionUnit(st.regionName)
        return matchedRegion && matchedRegion.id === regionUnit.id
      })

      if (regionTownships.length > 0) {
        // Add only the specific townships with sites. Match by normalised name
        // so dirty values like "Kyauktada District" still resolve to "Kyauktada".
        let matchedInThisRegion = 0
        regionTownships.forEach(st => {
          const target = normaliseTownshipName(st.townshipName)
          const townshipUnit = target
            ? allAdminUnits.find(u =>
                u.type === 'township' &&
                u.parentId === regionUnit.id &&
                normaliseTownshipName(u.name) === target
              )
            : undefined

          if (townshipUnit && !selectedUnits.includes(townshipUnit.id) && !allNewUnitIds.includes(townshipUnit.id)) {
            const alreadyExists = entries.some(e => e.adminUnit.id === townshipUnit.id)
            if (!alreadyExists) {
              allNewEntries.push({
                id: `entry-${Date.now()}-${townshipUnit.id}`,
                adminUnit: townshipUnit,
                percentage: 0,
                allocationLevel: 'township',
              })
              allNewUnitIds.push(townshipUnit.id)
              matchedInThisRegion += 1
              hasChanges = true
            } else {
              matchedInThisRegion += 1
            }
          }
        })

        // If none of the suggested townships for this region could be resolved
        // against MIMU data, fall back to expanding the whole region at 0%.
        if (matchedInThisRegion === 0) {
          const { newEntries, townshipIds } = autoDistributeTownships(regionUnit, 0)
          newEntries.forEach((entry, i) => {
            if (!selectedUnits.includes(townshipIds[i]) && !allNewUnitIds.includes(townshipIds[i])) {
              const alreadyExists = entries.some(e => e.adminUnit.id === townshipIds[i])
              if (!alreadyExists) {
                allNewEntries.push(entry)
                allNewUnitIds.push(townshipIds[i])
                hasChanges = true
              }
            }
          })
        }
      } else {
        // No specific townships — add ALL townships in this region with equal split
        const { newEntries, townshipIds } = autoDistributeTownships(regionUnit, 0)
        // Only add townships not already present
        newEntries.forEach((entry, i) => {
          if (!selectedUnits.includes(townshipIds[i]) && !allNewUnitIds.includes(townshipIds[i])) {
            const alreadyExists = entries.some(e => e.adminUnit.id === townshipIds[i])
            if (!alreadyExists) {
              allNewEntries.push(entry)
              allNewUnitIds.push(townshipIds[i])
              hasChanges = true
            }
          }
        })
      }

      processedSuggestedRegionsRef.current.add(regionName)
    })

    if (hasChanges) {
      console.log('[EnhancedSubnationalBreakdown] Auto-adding from Activity Sites:', {
        newEntries: allNewEntries.map(e => e.adminUnit.fullName),
        newUnitIds: allNewUnitIds
      })

      // Calculate equal distribution: combine existing + new entries, then distribute
      // 100% equally across all township entries that have sites
      setSelectedUnits(prev => [...prev, ...allNewUnitIds])
      setEntries(prev => {
        const combined = [...prev, ...allNewEntries]
        // Redistribute: for each region that has suggested townships,
        // split 100% / total site townships across all site townships in all regions
        const totalSiteTownships = combined.length
        if (totalSiteTownships > 0 && !prev.some(e => e.percentage > 0)) {
          // Only auto-distribute if no existing allocations
          const perTownship = 100 / totalSiteTownships
          return combined.map(e => ({ ...e, percentage: perTownship }))
        }
        return combined
      })
      setExpandedRegions(newExpandedRegions)
    }
  }, [suggestedRegions, suggestedTownships, loading, allAdminUnits, selectedUnits, entries, expandedRegions])

  // Auto-save function — only saves township-level entries
  const autoSave = useCallback(async () => {
    if (!canEdit || !activityId) return

    setSaving(true)
    try {
      const payload = entries.map(entry => ({
        region_name: `${entry.adminUnit.parentName} - ${entry.adminUnit.name}`,
        percentage: entry.percentage || 0,
        is_nationwide: false,
        allocation_level: 'township' as AllocationLevel,
        st_pcode: entry.adminUnit.st_pcode,
        ts_pcode: entry.adminUnit.ts_pcode,
        country_code: 'MM'
      }))

      console.log('[DEBUG] Subnational autoSave payload:', {
        activityId,
        entriesCount: entries.length,
        hasNonZeroPercentages: payload.some(p => p.percentage > 0)
      });

      const response = await apiFetch(`/api/activities/${activityId}/subnational-breakdown`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const responseData = await response.json();
      console.log('[DEBUG] Subnational save response:', {
        ok: response.ok,
        status: response.status,
        data: responseData
      });

      if (response.ok) {
        if (entries.some(entry => entry.percentage > 0) && hasUserChangedDataRef.current) {
          toast.success('Breakdown saved', { duration: 2000 })
        }
      } else {
        throw new Error(`Failed to save: ${response.status}`)
      }
    } catch (error) {
      console.error('Error saving breakdown:', error)
      toast.error('Failed to save breakdown')
    } finally {
      setSaving(false)
    }
  }, [canEdit, activityId, entries])

  // Handle selection changes from HierarchicalAdminSelect
  const handleSelectionChange = (newSelectedUnits: string[]) => {
    if (!isInitialLoadRef.current) {
      hasUserChangedDataRef.current = true
    }

    const prevSelectedSet = new Set(selectedUnits)
    const newSelectedSet = new Set(newSelectedUnits)

    // Find newly added region-level units
    const addedRegions: AdminUnit[] = []
    const removedRegions: AdminUnit[] = []

    newSelectedUnits.forEach(unitId => {
      if (!prevSelectedSet.has(unitId)) {
        const unit = allAdminUnits.find(u => u.id === unitId)
        if (unit && unit.type !== 'township') {
          addedRegions.push(unit)
        }
      }
    })

    // Find removed region-level units
    selectedUnits.forEach(unitId => {
      if (!newSelectedSet.has(unitId)) {
        const unit = allAdminUnits.find(u => u.id === unitId)
        if (unit && unit.type !== 'township') {
          removedRegions.push(unit)
        }
      }
    })

    let updatedEntries = [...entries]
    let updatedSelectedUnits = [...newSelectedUnits]
    const newExpandedRegions = new Set(expandedRegions)

    // Handle newly added regions — auto-distribute townships
    addedRegions.forEach(regionUnit => {
      const { newEntries, townshipIds } = autoDistributeTownships(regionUnit, 0)
      updatedEntries.push(...newEntries)
      updatedSelectedUnits.push(...townshipIds)
      newExpandedRegions.add(regionUnit.name)
    })

    // Handle removed regions — remove all child township entries
    removedRegions.forEach(regionUnit => {
      const childTownshipIds = allAdminUnits
        .filter(u => u.parentId === regionUnit.id)
        .map(u => u.id)

      updatedEntries = updatedEntries.filter(e => !childTownshipIds.includes(e.adminUnit.id))
      updatedSelectedUnits = updatedSelectedUnits.filter(id => !childTownshipIds.includes(id))
      newExpandedRegions.delete(regionUnit.name)
    })

    // Handle individually added/removed townships (when user selects a township directly)
    newSelectedUnits.forEach(unitId => {
      if (!prevSelectedSet.has(unitId)) {
        const unit = allAdminUnits.find(u => u.id === unitId)
        if (unit && unit.type === 'township') {
          const alreadyExists = updatedEntries.some(e => e.adminUnit.id === unitId)
          if (!alreadyExists) {
            updatedEntries.push({
              id: `entry-${Date.now()}-${unitId}`,
              adminUnit: unit,
              percentage: 0,
              allocationLevel: 'township',
            })
            if (unit.parentName) {
              newExpandedRegions.add(unit.parentName)
            }
          }
        }
      }
    })

    // Remove deselected townships
    selectedUnits.forEach(unitId => {
      if (!newSelectedSet.has(unitId)) {
        const unit = allAdminUnits.find(u => u.id === unitId)
        if (unit && unit.type === 'township') {
          updatedEntries = updatedEntries.filter(e => e.adminUnit.id !== unitId)
        }
      }
    })

    setSelectedUnits(updatedSelectedUnits)
    setEntries(updatedEntries)
    setExpandedRegions(newExpandedRegions)
  }

  // Handle feature click from map — auto-distribute if region clicked
  const handleFeatureClick = (pcode: string, name: string, level: AllocationLevel) => {
    const adminUnit = allAdminUnits.find(unit => {
      if (level === 'township') {
        return unit.ts_pcode === pcode
      } else {
        return unit.st_pcode === pcode && unit.type !== 'township'
      }
    })

    if (adminUnit && !selectedUnits.includes(adminUnit.id)) {
      handleSelectionChange([...selectedUnits, adminUnit.id])
    }
  }

  // Update percentage for a specific township entry
  const updatePercentage = (entryId: string, percentage: number) => {
    if (!isInitialLoadRef.current) {
      hasUserChangedDataRef.current = true
    }

    setEntries(prev => prev.map(entry =>
      entry.id === entryId ? { ...entry, percentage } : entry
    ))
  }

  // Update region percentage — redistributes equally across its townships
  const updateRegionPercentage = (regionName: string, newTotal: number) => {
    if (!isInitialLoadRef.current) {
      hasUserChangedDataRef.current = true
    }

    setEntries(prev => {
      const townshipEntries = prev.filter(e => e.adminUnit.parentName === regionName)
      const otherEntries = prev.filter(e => e.adminUnit.parentName !== regionName)
      const perTownship = townshipEntries.length > 0 ? newTotal / townshipEntries.length : 0

      const updatedTownships = townshipEntries.map(e => ({
        ...e,
        percentage: perTownship,
      }))

      return [...otherEntries, ...updatedTownships]
    })
  }

  // Remove a region and all its township entries
  const removeRegion = (regionName: string) => {
    if (!isInitialLoadRef.current) {
      hasUserChangedDataRef.current = true
    }

    const regionUnit = allAdminUnits.find(u => u.name === regionName && u.type !== 'township')
    const childTownshipIds = allAdminUnits
      .filter(u => u.parentName === regionName)
      .map(u => u.id)
    const allIdsToRemove = new Set([...(regionUnit ? [regionUnit.id] : []), ...childTownshipIds])

    setEntries(prev => prev.filter(e => !allIdsToRemove.has(e.adminUnit.id)))
    setSelectedUnits(prev => prev.filter(id => !allIdsToRemove.has(id)))
    setExpandedRegions(prev => {
      const next = new Set(prev)
      next.delete(regionName)
      return next
    })
  }

  // Remove a single township entry
  const removeTownship = (entryId: string) => {
    if (!isInitialLoadRef.current) {
      hasUserChangedDataRef.current = true
    }

    const entry = entries.find(e => e.id === entryId)
    if (entry) {
      setSelectedUnits(prev => prev.filter(id => id !== entry.adminUnit.id))
      setEntries(prev => prev.filter(e => e.id !== entryId))
    }
  }

  // Toggle region expansion
  const toggleRegionExpansion = (regionName: string) => {
    setExpandedRegions(prev => {
      const next = new Set(prev)
      if (next.has(regionName)) {
        next.delete(regionName)
      } else {
        next.add(regionName)
      }
      return next
    })
  }

  // All region names currently represented in the allocations table. Used
  // to power the Expand All / Collapse All bulk action in township view.
  const allRegionNames = useMemo(
    () => Array.from(regionSummaries.keys()),
    [regionSummaries]
  )
  const areAllRegionsExpanded =
    allRegionNames.length > 0 &&
    allRegionNames.every(name => expandedRegions.has(name))

  const toggleExpandAll = () => {
    if (areAllRegionsExpanded) {
      setExpandedRegions(new Set())
    } else {
      setExpandedRegions(new Set(allRegionNames))
    }
  }

  // Distribute 100% equally across all township entries
  const distributeEqually = () => {
    if (entries.length === 0) return

    hasUserChangedDataRef.current = true

    const equalPercentage = 100 / entries.length
    setEntries(prev => prev.map(entry => ({
      ...entry,
      percentage: equalPercentage
    })))

    toast.success('Distributed equally', {
      description: `${equalPercentage.toFixed(2)}% allocated to each township`
    })
  }

  // Clear all percentage allocations but keep selected units
  const clearAllocations = () => {
    hasUserChangedDataRef.current = true

    setEntries(prev => prev.map(entry => ({
      ...entry,
      percentage: 0
    })))

    toast.info('Allocations cleared', {
      description: 'All percentages reset to 0%'
    })
  }

  // Notify parent when data changes
  useEffect(() => {
    if (onDataChange && !loading) {
      onDataChange(breakdownsForMap)
    }
  }, [breakdownsForMap, onDataChange, loading])

  // Auto-save when entries change
  useEffect(() => {
    if (!loading && activityId && !isInitialLoadRef.current) {
      const timeoutId = setTimeout(autoSave, 2000)
      return () => clearTimeout(timeoutId)
    }
  }, [entries, selectedUnits, loading, activityId, autoSave])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[800px]">
            <Card className="h-full">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[700px] w-full rounded-lg" />
              </CardContent>
            </Card>
          </div>

          <Card className="h-[800px] flex flex-col">
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <div className="space-y-4 mb-6">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-10 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>

              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-4" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-20" />
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>

              <div className="flex items-center justify-center mt-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading subnational breakdown data...
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Non-Myanmar activity: explain that sub-national allocation is Myanmar-
  // only for now, rather than silently showing Myanmar states/townships.
  if (isMyanmarActivity === false) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="pt-8 pb-8 space-y-4 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-muted">
            <MapPin className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">
            Sub-national allocation is currently available for Myanmar only
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {otherCountryName
              ? <>This activity is reported for <span className="font-medium text-foreground">{otherCountryName}</span>. We're working to support additional countries.</>
              : <>We're working to support additional countries.</>
            }
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Use the <span className="font-medium">Countries &amp; Regions</span> tab to record country-level allocations in the meantime.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Two-column layout: Map on left, Form on right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Map */}
        <div className="h-[800px]">
          <SubnationalChoroplethMap
            breakdowns={breakdownsForMap}
            regionTotals={regionBreakdowns}
            viewLevel={viewLevel}
            onViewLevelChange={setViewLevel}
            onFeatureClick={handleFeatureClick}
          />
        </div>

        {/* Right Column - Form */}
        <Card className="h-[800px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Sub-national Allocation
              <HelpTextTooltip content="Select states or regions to allocate budget percentages. Selecting a region automatically distributes across its townships. You can then fine-tune individual township allocations." />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 flex-1 overflow-y-auto">
            {/* Hierarchical Admin Select Dropdown */}
            <HierarchicalAdminSelect
              allAdminUnits={filteredAdminUnits}
              selected={selectedUnits}
              onChange={handleSelectionChange}
              placeholder="Select states, regions, or townships..."
              disabled={!canEdit}
            />

            {/* Action Buttons */}
            {entries.length > 0 && canEdit && (
              <div className="flex justify-end gap-2">
                {/*
                  Expand All / Collapse All — only meaningful in ADM3
                  (township) view where regions have collapsible children.
                  Hidden in ADM1 view to avoid a dead control.
                */}
                {viewLevel === 'township' && allRegionNames.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleExpandAll}
                    aria-label={areAllRegionsExpanded ? 'Collapse all regions' : 'Expand all regions'}
                  >
                    {areAllRegionsExpanded ? (
                      <>
                        <ChevronsDownUp className="h-4 w-4 mr-2" />
                        Collapse All
                      </>
                    ) : (
                      <>
                        <ChevronsUpDown className="h-4 w-4 mr-2" />
                        Expand All
                      </>
                    )}
                  </Button>
                )}
                {/*
                  Distribute Equally — uses the default outline variant.
                  The previous `bg-foreground text-white` override inverted
                  the button's color scheme, which didn't match any other
                  secondary action in the editor.
                */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={distributeEqually}
                >
                  Distribute Equally
                </Button>
                {/*
                  Clear All is destructive. Red text/icon use the
                  `destructive` token, and the button now opens a
                  confirmation instead of wiping immediately.
                */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPendingDelete({ kind: 'clearAll' })}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            )}

            {/* Percentage Allocation Table */}
            {organizedEntries.length > 0 ? (
              <div className="rounded-lg overflow-hidden border border-input shadow-sm">
                <table className="w-full">
                  <thead className="bg-surface-muted">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-sm text-foreground">Administrative Unit</th>
                      <th className="px-3 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <span className="w-20 text-right font-medium text-sm text-foreground">%</span>
                          <span className="w-8"></span>
                        </div>
                      </th>
                      {canEdit && <th className="w-10 px-3 py-2"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {organizedEntries.map((item, index) => {
                      if (item.type === 'region') {
                        const isExpanded = expandedRegions.has(item.regionName)
                        return (
                          <tr key={`region-${item.regionName}`} className="border-t bg-muted/20">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                {/*
                                  Chevron is only rendered in ADM3 (township)
                                  view, where expand/collapse is meaningful.
                                  In ADM1 view there's no placeholder spacer
                                  — region names sit flush-left with the
                                  column edge.
                                */}
                                {viewLevel === 'township' && (
                                  <button
                                    type="button"
                                    onClick={() => toggleRegionExpansion(item.regionName)}
                                    className="p-0.5 hover:bg-muted rounded"
                                    aria-label={isExpanded ? `Collapse ${item.regionName}` : `Expand ${item.regionName}`}
                                  >
                                    {isExpanded
                                      ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                      : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    }
                                  </button>
                                )}
                                <span className="text-sm font-semibold">{item.regionName}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={item.regionTotal ? parseFloat(item.regionTotal.toFixed(2)) || '' : ''}
                                  onChange={(e) => updateRegionPercentage(item.regionName, parseFloat(e.target.value) || 0)}
                                  className="w-20 text-right text-sm h-10 font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="0"
                                  disabled={!canEdit}
                                />
                                <span className="text-xs text-muted-foreground w-8 text-left">%</span>
                              </div>
                            </td>
                            {canEdit && (
                              <td className="px-3 py-2 text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setPendingDelete({
                                    kind: 'region',
                                    regionName: item.regionName,
                                    townshipCount: item.townshipCount ?? 0,
                                    percentage: item.regionTotal ?? 0,
                                  })}
                                  className="text-destructive hover:text-destructive h-7 w-7 p-0"
                                  aria-label={`Remove ${item.regionName} and its townships`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        )
                      }

                      // Township row
                      const entry = item.entry!
                      const isHighlighted = highlightedTownshipIds.has(entry.adminUnit.id)
                      return (
                        <tr key={entry.id} className={`border-t ${isHighlighted ? 'bg-emerald-50/50' : ''}`}>
                          <td className="px-3 py-2 pl-10">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-normal text-foreground">
                                {entry.adminUnit.name}
                              </span>
                              {isHighlighted && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-emerald-600 border-emerald-200">
                                  <MapPin className="h-2.5 w-2.5 mr-0.5" />
                                  Site
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={entry.percentage || ''}
                                onChange={(e) => updatePercentage(entry.id, parseFloat(e.target.value) || 0)}
                                className="w-20 text-right text-sm h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0"
                                disabled={!canEdit}
                              />
                              <span className="text-xs text-muted-foreground w-8 text-left">%</span>
                            </div>
                          </td>
                          {canEdit && (
                            <td className="px-3 py-2 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPendingDelete({
                                  kind: 'township',
                                  entryId: entry.id,
                                  name: entry.adminUnit.name,
                                  percentage: entry.percentage,
                                })}
                                className="text-destructive hover:text-destructive h-7 w-7 p-0"
                                aria-label={`Remove ${entry.adminUnit.name}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                  {hasAnyValues && (
                    <tfoot className="border-t">
                      <tr>
                        <td className="px-3 py-2 font-semibold text-sm">
                          Total
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-foreground font-semibold text-sm w-20 text-right">
                              {totalPercentage.toFixed(2)}
                            </span>
                            <span className="text-xs text-foreground font-semibold w-8 text-left">%</span>
                          </div>
                        </td>
                        {canEdit && <td className="px-3 py-2"></td>}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            ) : (
              <div className="text-center py-12 border rounded-lg">
                <img src="/images/empty-fish.webp" alt="No administrative units" className="h-32 mx-auto mb-4 opacity-50" />
                <h3 className="text-base font-medium mb-2">No sub-national areas selected</h3>
                <p className="text-muted-foreground">
                  Use the dropdown above or click the map to allocate what share of the budget reaches each region or township.
                </p>
              </div>
            )}

            {/* Save Status */}
            {entries.length > 0 && saving && (
              <div className="flex justify-end pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Saving...
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/*
        Delete / Clear-All confirmations. Destructive actions need a
        confirm step because there's no undo. For regions specifically
        the dialog names the township count that will also be removed.
      */}
      <ConfirmationDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        onConfirm={() => {
          if (!pendingDelete) return
          if (pendingDelete.kind === 'region') {
            removeRegion(pendingDelete.regionName)
          } else if (pendingDelete.kind === 'township') {
            removeTownship(pendingDelete.entryId)
          } else if (pendingDelete.kind === 'clearAll') {
            clearAllocations()
          }
          setPendingDelete(null)
        }}
        title={
          pendingDelete?.kind === 'region' ? 'Remove region and its townships?'
            : pendingDelete?.kind === 'township' ? 'Remove township?'
            : pendingDelete?.kind === 'clearAll' ? 'Clear all percentages?'
            : ''
        }
        description={(() => {
          if (!pendingDelete) return ''
          if (pendingDelete.kind === 'region') {
            return (
              <>
                This will remove <span className="font-medium text-foreground">{pendingDelete.regionName}</span> and its{' '}
                <span className="font-medium text-foreground">{pendingDelete.townshipCount} township{pendingDelete.townshipCount === 1 ? '' : 's'}</span>
                {pendingDelete.percentage > 0 && (
                  <>, releasing <span className="font-medium text-foreground">{pendingDelete.percentage.toFixed(2)}%</span> back to unallocated</>
                )}. This can't be undone.
              </>
            )
          }
          if (pendingDelete.kind === 'township') {
            return (
              <>
                This will remove <span className="font-medium text-foreground">{pendingDelete.name}</span>
                {pendingDelete.percentage > 0 && (
                  <>, releasing <span className="font-medium text-foreground">{pendingDelete.percentage.toFixed(2)}%</span> back to unallocated</>
                )}. This can't be undone.
              </>
            )
          }
          return (
            <>
              This will reset every percentage to 0% but keep the selected administrative units. You'll need to re-enter values to reach 100% again.
            </>
          )
        })()}
        confirmText={pendingDelete?.kind === 'clearAll' ? 'Clear all' : 'Remove'}
        isDestructive
      />
    </div>
  )
}
