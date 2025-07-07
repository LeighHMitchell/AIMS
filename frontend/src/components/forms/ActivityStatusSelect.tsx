"use client"

import React from "react"
import { EnhancedSearchableSelect } from "@/components/ui/enhanced-searchable-select"
import { ACTIVITY_STATUS_GROUPS } from "@/data/activity-status-types"

interface ActivityStatusSelectProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
}

export function ActivityStatusSelect({
  value,
  onValueChange,
  placeholder = "Select Activity Status",
  disabled = false,
  id,
}: ActivityStatusSelectProps) {
  return (
    <EnhancedSearchableSelect
      groups={ACTIVITY_STATUS_GROUPS}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
      searchPlaceholder="Search status..."
      disabled={disabled}
      className="w-full"
    />
  )
}