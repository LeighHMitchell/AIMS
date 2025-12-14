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

interface DatePickerProps {
  value?: string
  onChange?: (value: string) => void
  onBlur?: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
  id?: string
}

export function DatePicker({
  value,
  onChange,
  onBlur,
  disabled,
  className,
  placeholder = "Pick a date",
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
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
        {date ? format(date, "PPP") : <span>{placeholder}</span>}
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