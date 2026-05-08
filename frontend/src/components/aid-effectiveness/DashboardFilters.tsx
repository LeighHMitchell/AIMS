"use client"

import React from 'react'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { CodedSelectItem } from '@/components/aid-effectiveness/CodedSelectItem'

interface OrgTypeOption {
  code: string
  label: string
}

interface DashboardFiltersProps {
  /** Pre-built Development Partner picker (e.g. searchable combobox). */
  donorPicker: React.ReactNode
  /** Pre-built Sector picker (e.g. SectorHierarchyFilter from Atlas). */
  sectorPicker: React.ReactNode

  orgType: string
  onOrgTypeChange: (v: string) => void
  orgTypeOptions: OrgTypeOption[]
}

export function DashboardFilters({
  donorPicker,
  sectorPicker,
  orgType, onOrgTypeChange, orgTypeOptions,
}: DashboardFiltersProps) {
  const orgTypeCleared = orgType === 'all'
  return (
    <>
      <div className="flex flex-col gap-1">
        <Label className="text-helper text-muted-foreground">Development Partner</Label>
        {donorPicker}
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-helper text-muted-foreground">Sector</Label>
        {sectorPicker}
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-helper text-muted-foreground">Organisation Type</Label>
        <div className="relative">
          <Select value={orgType} onValueChange={onOrgTypeChange}>
            <SelectTrigger className={`h-9 w-[220px] text-helper ${orgTypeCleared ? '' : 'pr-8'}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[320px]">
              <CodedSelectItem value="all" code="0">All types</CodedSelectItem>
              {orgTypeOptions.map((o) => (
                <CodedSelectItem key={o.code} value={o.code} code={o.code}>
                  {o.label}
                </CodedSelectItem>
              ))}
            </SelectContent>
          </Select>
          {!orgTypeCleared && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOrgTypeChange('all') }}
              className="absolute right-7 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-muted"
              title="Clear filter"
              aria-label="Clear filter"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
