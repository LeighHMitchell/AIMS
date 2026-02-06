"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useDropdownState } from "@/contexts/DropdownContext"

interface DatePickerProps {
  value?: string
  onChange?: (value: string) => void
  onBlur?: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  id?: string
  dropdownId?: string // Unique ID for exclusive open behavior
}

export function DatePicker({
  value,
  onChange,
  onBlur,
  disabled,
  className,
  placeholder = "Pick a date",
  id,
  dropdownId,
}: DatePickerProps) {
  // Use shared dropdown state if dropdownId is provided
  const sharedState = useDropdownState(dropdownId || 'date-picker-default')
  const [localOpen, setLocalOpen] = React.useState(false)

  // Use shared state when dropdownId is provided, otherwise use local state
  const open = dropdownId ? sharedState.isOpen : localOpen
  const setOpen = dropdownId ? sharedState.setOpen : setLocalOpen

  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  )

  const handleSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    const dateString = selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""
    onChange?.(dateString)
    onBlur?.(dateString)
    setOpen(false)
  }

  // Update internal state when external value changes
  React.useEffect(() => {
    if (value) {
      const newDate = new Date(value)
      setDate(newDate)
    } else {
      setDate(undefined)
    }
  }, [value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        className={cn(
          "flex h-10 w-full items-center justify-start rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          !date && "text-muted-foreground",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        disabled={disabled}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {date ? format(date, "dd/MM/yyyy") : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          captionLayout="dropdown"
          startMonth={new Date(1990, 0)}
          endMonth={new Date(2060, 11)}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
} 