'use client'

import React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface HierarchySegment {
  code: string
  name: string
}

interface SectorHierarchyBreadcrumbProps {
  hierarchy: {
    group?: HierarchySegment
    category?: HierarchySegment
    sector?: HierarchySegment
  }
}

export function SectorHierarchyBreadcrumb({ hierarchy }: SectorHierarchyBreadcrumbProps) {
  const segments: Array<{ label: string; href: string; isCurrent: boolean }> = [
    { label: 'All Sectors', href: '/sectors', isCurrent: false },
  ]

  if (hierarchy.group) {
    const isCurrent = !hierarchy.category && !hierarchy.sector
    segments.push({
      label: `${hierarchy.group.name} (${hierarchy.group.code})`,
      href: `/sectors/${hierarchy.group.code}`,
      isCurrent,
    })
  }

  if (hierarchy.category) {
    const isCurrent = !hierarchy.sector
    segments.push({
      label: `${hierarchy.category.name} (${hierarchy.category.code})`,
      href: `/sectors/${hierarchy.category.code}`,
      isCurrent,
    })
  }

  if (hierarchy.sector) {
    segments.push({
      label: `${hierarchy.sector.name} (${hierarchy.sector.code})`,
      href: `/sectors/${hierarchy.sector.code}`,
      isCurrent: true,
    })
  }

  return (
    <nav className="flex items-center flex-wrap gap-1 text-sm mb-4">
      {segments.map((seg, i) => (
        <React.Fragment key={seg.href}>
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />}
          {seg.isCurrent ? (
            <span className="font-medium text-slate-900 truncate max-w-xs">{seg.label}</span>
          ) : (
            <Link
              href={seg.href}
              className="text-slate-500 hover:text-slate-700 truncate max-w-xs"
            >
              {seg.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
