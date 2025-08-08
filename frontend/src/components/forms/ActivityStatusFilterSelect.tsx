"use client"

import React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ActivityStatusFilterOption {
  value: string
  label: string
  description: string
}

const activityStatusFilterOptions: ActivityStatusFilterOption[] = [
  {
    value: "all",
    label: "All Status Types",
    description: "Show activities with any status",
  },
  {
    value: "1",
    label: "Pipeline / Identification",
    description: "The activity is being scoped or planned",
  },
  {
    value: "2",
    label: "Implementation",
    description: "The activity is currently being implemented",
  },
  {
    value: "3",
    label: "Finalisation",
    description: "Physical activity is complete or the final disbursement has been made, but the activity remains open pending financial sign off or M&E",
  },
  {
    value: "4",
    label: "Closed",
    description: "Physical activity is complete or the final disbursement has been made",
  },
  {
    value: "5",
    label: "Cancelled",
    description: "The activity has been cancelled",
  },
  {
    value: "6",
    label: "Suspended",
    description: "The activity has been temporarily suspended",
  },
]

interface ActivityStatusFilterSelectProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ActivityStatusFilterSelect({
  value,
  onValueChange,
  placeholder = "Activity Status",
  disabled = false,
  className,
}: ActivityStatusFilterSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {activityStatusFilterOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Export the options for use elsewhere if needed
export { activityStatusFilterOptions }
export type { ActivityStatusFilterOption }