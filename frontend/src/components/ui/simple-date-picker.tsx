"use client"

import React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SimpleDatePickerProps {
  value?: Date
  onChange: (date: Date | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function SimpleDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  className
}: SimpleDatePickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = event.target.value
    if (dateValue) {
      const date = new Date(dateValue + 'T00:00:00')
      onChange(date)
    } else {
      onChange(null)
    }
  }

  const formatDateForInput = (date: Date | undefined) => {
    if (!date) return ""
    return date.toISOString().split('T')[0]
  }

  const handleCalendarClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.showPicker?.()
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <CalendarIcon 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer z-10" 
          onClick={handleCalendarClick}
        />
        <input
          ref={inputRef}
          type="date"
          value={formatDateForInput(value)}
          onChange={handleDateChange}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "disabled:bg-gray-100 disabled:cursor-not-allowed",
            "text-sm font-normal",
            "bg-white"
          )}
        />
      </div>
    </div>
  )
} 