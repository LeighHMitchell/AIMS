"use client"

import React from 'react'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { CodedSelectItem } from '@/components/aid-effectiveness/CodedSelectItem'

interface DonorOption {
  id: string
  name: string
  acronym?: string | null
}

interface SectorOption {
  code: string
  label: string
}

interface OrgTypeOption {
  code: string
  label: string
}

interface DashboardFiltersProps {
  donor: string
  onDonorChange: (v: string) => void
  donorOptions: DonorOption[]

  sector: string
  onSectorChange: (v: string) => void
  sectorOptions: SectorOption[]

  orgType: string
  onOrgTypeChange: (v: string) => void
  orgTypeOptions: OrgTypeOption[]
}

interface FilterFieldProps {
  label: string
  triggerWidthClass: string
  value: string
  onChange: (v: string) => void
  onClear: () => void
  children: React.ReactNode
}

function FilterField({ label, triggerWidthClass, value, onChange, onClear, children }: FilterFieldProps) {
  const isCleared = value === 'all'
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-helper text-muted-foreground">{label}</Label>
      <div className="relative">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className={`h-9 ${triggerWidthClass} text-helper ${isCleared ? '' : 'pr-8'}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[320px]">
            {children}
          </SelectContent>
        </Select>
        {!isCleared && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClear() }}
            className="absolute right-7 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-muted"
            title="Clear filter"
            aria-label="Clear filter"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

export function DashboardFilters({
  donor, onDonorChange, donorOptions,
  sector, onSectorChange, sectorOptions,
  orgType, onOrgTypeChange, orgTypeOptions,
}: DashboardFiltersProps) {
  return (
    <>
      <FilterField
        label="Donor"
        triggerWidthClass="w-[320px]"
        value={donor}
        onChange={onDonorChange}
        onClear={() => onDonorChange('all')}
      >
        <CodedSelectItem value="all" code="0">All donors</CodedSelectItem>
        {donorOptions.map((o, i) => (
          <CodedSelectItem key={o.id} value={o.id} code={String(i + 1)}>
            {o.name}{o.acronym ? ` (${o.acronym})` : ''}
          </CodedSelectItem>
        ))}
      </FilterField>

      <FilterField
        label="Sector"
        triggerWidthClass="w-[260px]"
        value={sector}
        onChange={onSectorChange}
        onClear={() => onSectorChange('all')}
      >
        <CodedSelectItem value="all" code="0">All sectors</CodedSelectItem>
        {sectorOptions.map((s) => (
          <CodedSelectItem key={s.code} value={s.code} code={s.code}>
            {s.label}
          </CodedSelectItem>
        ))}
      </FilterField>

      <FilterField
        label="Organisation Type"
        triggerWidthClass="w-[220px]"
        value={orgType}
        onChange={onOrgTypeChange}
        onClear={() => onOrgTypeChange('all')}
      >
        <CodedSelectItem value="all" code="0">All types</CodedSelectItem>
        {orgTypeOptions.map((o) => (
          <CodedSelectItem key={o.code} value={o.code} code={o.code}>
            {o.label}
          </CodedSelectItem>
        ))}
      </FilterField>
    </>
  )
}
