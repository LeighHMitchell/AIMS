"use client"

import React from 'react'
import { SelectItem } from '@/components/ui/select'

interface CodedSelectItemProps {
  value: string
  code: string | number
  children: React.ReactNode
}

export function CodedSelectItem({ value, code, children }: CodedSelectItemProps) {
  return (
    <SelectItem value={value}>
      <span className="inline-flex items-center gap-2">
        <code className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
          {code}
        </code>
        <span>{children}</span>
      </span>
    </SelectItem>
  )
}
