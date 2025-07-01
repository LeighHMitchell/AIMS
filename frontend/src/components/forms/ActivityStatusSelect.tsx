"use client"

import React from "react"
import {
  EnhancedSelect,
  EnhancedSelectContent,
  EnhancedSelectItem,
  EnhancedSelectTrigger,
  EnhancedSelectValue,
} from "@/components/ui/enhanced-select"

interface ActivityStatusOption {
  value: string
  label: string
  description: string
}

const activityStatusOptions: ActivityStatusOption[] = [
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
  // Find the selected option to display its label in the trigger
  const selectedOption = activityStatusOptions.find(option => option.value === value)
  
  return (
    <div className="w-full">
      <EnhancedSelect value={value} onValueChange={onValueChange} disabled={disabled}>
      <EnhancedSelectTrigger id={id}>
        <EnhancedSelectValue placeholder={placeholder}>
          {selectedOption?.label || placeholder}
        </EnhancedSelectValue>
      </EnhancedSelectTrigger>
      <EnhancedSelectContent>
        {activityStatusOptions.map((option) => (
          <EnhancedSelectItem
            key={option.value}
            value={option.value}
            label={option.label}
            description={option.description}
          />
        ))}
      </EnhancedSelectContent>
    </EnhancedSelect>
    </div>
  )
}

// Export the options for use elsewhere if needed
export { activityStatusOptions }
export type { ActivityStatusOption }