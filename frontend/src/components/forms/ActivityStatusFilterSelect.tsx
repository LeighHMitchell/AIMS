"use client"

import React from "react"
import {
  EnhancedSelect,
  EnhancedSelectContent,
  EnhancedSelectItem,
  EnhancedSelectTrigger,
  EnhancedSelectValue,
} from "@/components/ui/enhanced-select"

interface ActivityStatusFilterOption {
  value: string
  label: string
  description: string
}

const activityStatusFilterOptions: ActivityStatusFilterOption[] = [
  {
    value: "all",
    label: "All Activity Status",
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
  // Find the selected option to display its label in the trigger
  const selectedOption = activityStatusFilterOptions.find(option => option.value === value)
  
  return (
    <EnhancedSelect value={value} onValueChange={onValueChange} disabled={disabled}>
      <EnhancedSelectTrigger className={className}>
        <EnhancedSelectValue placeholder={placeholder}>
          {selectedOption?.label || placeholder}
        </EnhancedSelectValue>
      </EnhancedSelectTrigger>
      <EnhancedSelectContent>
        {activityStatusFilterOptions.map((option) => (
          <EnhancedSelectItem
            key={option.value}
            value={option.value}
            label={option.label}
            description={option.description}
          />
        ))}
      </EnhancedSelectContent>
    </EnhancedSelect>
  )
}

// Export the options for use elsewhere if needed
export { activityStatusFilterOptions }
export type { ActivityStatusFilterOption }