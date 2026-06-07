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
  endAdornment?: React.ReactNode // Element rendered at the right end of the trigger
  open?: boolean // Controlled open state (takes precedence over dropdownId/local state)
  onOpenChange?: (open: boolean) => void // Controlled open change handler
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
  endAdornment,
  open: controlledOpen,
  onOpenChange,
}: DatePickerProps) {
  // Use shared dropdown state if dropdownId is provided
  const sharedState = useDropdownState(dropdownId || 'date-picker-default')
  const [localOpen, setLocalOpen] = React.useState(false)

  const isControlled = controlledOpen !== undefined

  // Controlled open takes precedence, then shared state (dropdownId), then local state
  const open = isControlled ? controlledOpen : dropdownId ? sharedState.isOpen : localOpen
  const setOpen = isControlled
    ? (next: boolean) => onOpenChange?.(next)
    : dropdownId
    ? sharedState.setOpen
    : setLocalOpen

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
          "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-body ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          endAdornment ? "justify-between" : "justify-start",
          !date && "text-muted-foreground",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        disabled={disabled}
      >
        <span className="flex items-center whitespace-nowrap">
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          {date ? format(date, "d MMMM yyyy") : <span>{placeholder}</span>}
        </span>
        {endAdornment && <span className="flex-shrink-0 ml-2">{endAdornment}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
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