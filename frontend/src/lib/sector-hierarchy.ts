/**
 * Sector hierarchy utilities — parse SectorGroup.json into a navigable tree.
 */

import sectorData from '@/data/SectorGroup.json'

interface SectorEntry {
  code: string
  name: string
  'codeforiati:category-code': string
  'codeforiati:category-name': string
  'codeforiati:group-code': string
  'codeforiati:group-name': string
  status: string
}

export type SectorLevel = 'group' | 'category' | 'sector'

/**
 * OECD DAC "broad category" tier — the level above `group` (e.g. 100 Social
 * Infrastructure & Services, 200 Economic Infrastructure). This tier is NOT
 * encoded in SectorGroup.json, so we derive it from a fixed standard mapping.
 * The three non-sector-allocable groups (910/930/998) are folded into a single
 * "900 Other / Non-Sector Allocable" heading.
 */
export interface BroadCategory {
  code: string
  name: string
}

export const BROAD_CATEGORY_ORDER: BroadCategory[] = [
  { code: '100', name: 'Social Infrastructure & Services' },
  { code: '200', name: 'Economic Infrastructure & Services' },
  { code: '300', name: 'Production Sectors' },
  { code: '400', name: 'Multi-Sector / Cross-Cutting' },
  { code: '500', name: 'Commodity Aid / General Programme Assistance' },
  { code: '600', name: 'Action Relating to Debt' },
  { code: '700', name: 'Humanitarian Aid' },
  { code: '900', name: 'Other / Non-Sector Allocable' },
]

const GROUP_TO_BROAD: Record<string, string> = {
  '110': '100', '120': '100', '130': '100', '140': '100', '150': '100', '160': '100',
  '210': '200', '220': '200', '230': '200', '240': '200', '250': '200',
  '310': '300', '320': '300', '330': '300', '331': '300', '332': '300',
  '410': '400', '430': '400',
  '510': '500', '520': '500', '530': '500',
  '600': '600',
  '700': '700', '720': '700', '730': '700', '740': '700',
  '910': '900', '930': '900', '998': '900',
}

/**
 * Map a 3-digit DAC group code (e.g. 120) to its broad OECD category
 * (e.g. 100 Social Infrastructure & Services). Falls back to 900 (Other) for
 * any unmapped code.
 */
export function getBroadCategoryForGroup(groupCode: string): BroadCategory {
  const code = GROUP_TO_BROAD[String(groupCode)] || '900'
  const meta = BROAD_CATEGORY_ORDER.find(b => b.code === code)
  return meta || { code: '900', name: 'Other / Non-Sector Allocable' }
}

/**
 * Map ANY DAC sector code (1-digit broad, 3-digit group/category, or 5-digit
 * purpose code) to its broad OECD category. The broad category is the code's
 * first digit (1-7 → x00); everything else (the 9xx non-sector-allocable codes,
 * blanks) folds into 900 Other. Single source of truth for broad-tier names.
 */
export function getBroadCategoryForCode(code: string): BroadCategory {
  const first = String(code || '').charAt(0)
  const broadCode = ['1', '2', '3', '4', '5', '6', '7'].includes(first) ? `${first}00` : '900'
  const meta = BROAD_CATEGORY_ORDER.find(b => b.code === broadCode)
  return meta || { code: '900', name: 'Other / Non-Sector Allocable' }
}

export interface SectorInfo {
  code: string
  name: string
  description?: string
  level: SectorLevel
  groupCode: string
  groupName: string
  categoryCode?: string
  categoryName?: string
}

export interface SectorTreeNode {
  code: string
  name: string
  level: SectorLevel
  children?: SectorTreeNode[]
}

const entries: SectorEntry[] = (sectorData as any).data.filter(
  (d: SectorEntry) => d.status === 'active'
)

// Build lookup maps
const sectorMap = new Map<string, SectorEntry>()
entries.forEach(e => sectorMap.set(e.code, e))

// Unique groups and categories
const groupMap = new Map<string, string>()
const categoryMap = new Map<string, { name: string; groupCode: string; groupName: string }>()

entries.forEach(e => {
  groupMap.set(e['codeforiati:group-code'], e['codeforiati:group-name'])
  categoryMap.set(e['codeforiati:category-code'], {
    name: e['codeforiati:category-name'],
    groupCode: e['codeforiati:group-code'],
    groupName: e['codeforiati:group-name'],
  })
})

/**
 * Determine the hierarchy level of a sector code.
 */
export function getSectorLevel(code: string): SectorLevel {
  const str = String(code)
  if (groupMap.has(str)) return 'group'
  if (categoryMap.has(str)) return 'category'
  return 'sector'
}

/**
 * Get detailed info about any sector code.
 */
export function getSectorInfo(code: string): SectorInfo | null {
  const str = String(code)

  // Check if it's a group code
  if (groupMap.has(str)) {
    return {
      code: str,
      name: groupMap.get(str)!,
      level: 'group',
      groupCode: str,
      groupName: groupMap.get(str)!,
    }
  }

  // Check if it's a category code
  if (categoryMap.has(str)) {
    const cat = categoryMap.get(str)!
    return {
      code: str,
      name: cat.name,
      level: 'category',
      groupCode: cat.groupCode,
      groupName: cat.groupName,
      categoryCode: str,
      categoryName: cat.name,
    }
  }

  // It's a 5-digit sector code
  const entry = sectorMap.get(str)
  if (!entry) return null

  return {
    code: entry.code,
    name: entry.name,
    level: 'sector',
    groupCode: entry['codeforiati:group-code'],
    groupName: entry['codeforiati:group-name'],
    categoryCode: entry['codeforiati:category-code'],
    categoryName: entry['codeforiati:category-name'],
  }
}

/**
 * Get child codes for a given code (group→categories, category→sectors).
 */
export function getChildCodes(code: string): string[] {
  const str = String(code)
  const level = getSectorLevel(str)

  if (level === 'group') {
    // Return unique category codes in this group
    const cats = new Set<string>()
    entries.forEach(e => {
      if (e['codeforiati:group-code'] === str) {
        cats.add(e['codeforiati:category-code'])
      }
    })
    return Array.from(cats)
  }

  if (level === 'category') {
    // Return 5-digit sector codes in this category
    return entries
      .filter(e => e['codeforiati:category-code'] === str)
      .map(e => e.code)
  }

  // A sector has no children
  return []
}

/**
 * Get all 5-digit sector codes that belong under a group or category.
 */
export function getAllSectorCodes(code: string): string[] {
  const str = String(code)
  const level = getSectorLevel(str)

  if (level === 'group') {
    return entries
      .filter(e => e['codeforiati:group-code'] === str)
      .map(e => e.code)
  }

  if (level === 'category') {
    return entries
      .filter(e => e['codeforiati:category-code'] === str)
      .map(e => e.code)
  }

  return [str]
}

/**
 * Get parent codes for a given code.
 */
export function getParentCodes(code: string): { groupCode?: string; categoryCode?: string } {
  const info = getSectorInfo(code)
  if (!info) return {}
  return {
    groupCode: info.groupCode,
    categoryCode: info.categoryCode,
  }
}

/**
 * Build the full sector tree: group → category → sector.
 */
export function buildSectorTree(): SectorTreeNode[] {
  const groups: SectorTreeNode[] = []

  const groupOrder = Array.from(groupMap.entries())

  groupOrder.forEach(([groupCode, groupName]) => {
    const groupNode: SectorTreeNode = {
      code: groupCode,
      name: groupName,
      level: 'group',
      children: [],
    }

    // Find categories in this group
    const catCodes = new Set<string>()
    entries.forEach(e => {
      if (e['codeforiati:group-code'] === groupCode) {
        catCodes.add(e['codeforiati:category-code'])
      }
    })

    Array.from(catCodes).forEach(catCode => {
      const catInfo = categoryMap.get(catCode)
      if (!catInfo) return

      const catNode: SectorTreeNode = {
        code: catCode,
        name: catInfo.name,
        level: 'category',
        children: entries
          .filter(e => e['codeforiati:category-code'] === catCode)
          .map(e => ({
            code: e.code,
            name: e.name,
            level: 'sector' as SectorLevel,
          })),
      }

      groupNode.children!.push(catNode)
    })

    groups.push(groupNode)
  })

  return groups
}
