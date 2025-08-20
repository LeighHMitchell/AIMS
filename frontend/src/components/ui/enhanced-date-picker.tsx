"use client"

import React, { useState, useRef } from "react"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface EnhancedDatePickerProps {
  value?: Date
  onChange: (date: Date | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  format?: 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd'
}

export function EnhancedDatePicker({
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  disabled = false,
  className,
  format = 'dd/mm/yyyy'
}: EnhancedDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [displayValue, setDisplayValue] = useState('')
  const [viewDate, setViewDate] = useState(value || new Date())
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (value) {
      setDisplayValue(formatDate(value, format))
      setViewDate(value)
    } else {
      setDisplayValue('')
    }
  }, [value, format])

  // Handle clicking outside to close calendar
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const formatDate = (date: Date, format: string) => {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear())
    
    switch (format) {
      case 'dd/mm/yyyy':
        return `${day}/${month}/${year}`
      case 'mm/dd/yyyy':
        return `${month}/${day}/${year}`
      case 'yyyy-mm-dd':
        return `${year}-${month}-${day}`
      default:
        return `${day}/${month}/${year}`
    }
  }

  const parseDate = (dateString: string, format: string): Date | null => {
    if (!dateString) return null
    
    let day: number, month: number, year: number
    
    // Remove any non-digit characters except slashes and dashes
    const cleaned = dateString.replace(/[^\d\/\-]/g, '')
    
    switch (format) {
      case 'dd/mm/yyyy':
        const ddmmyyyy = cleaned.split(/[\/\-]/)
        if (ddmmyyyy.length !== 3) return null
        day = parseInt(ddmmyyyy[0])
        month = parseInt(ddmmyyyy[1]) - 1
        year = parseInt(ddmmyyyy[2])
        break
      case 'mm/dd/yyyy':
        const mmddyyyy = cleaned.split(/[\/\-]/)
        if (mmddyyyy.length !== 3) return null
        month = parseInt(mmddyyyy[0]) - 1
        day = parseInt(mmddyyyy[1])
        year = parseInt(mmddyyyy[2])
        break
      case 'yyyy-mm-dd':
        const yyyymmdd = cleaned.split(/[\/\-]/)
        if (yyyymmdd.length !== 3) return null
        year = parseInt(yyyymmdd[0])
        month = parseInt(yyyymmdd[1]) - 1
        day = parseInt(yyyymmdd[2])
        break
      default:
        return null
    }
    
    // Validate the date components
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null
    if (day < 1 || day > 31) return null
    if (month < 0 || month > 11) return null
    if (year < 1000 || year > 9999) return null
    
    const date = new Date(year, month, day)
    // Check if the date is valid (handles things like Feb 30)
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
      return null
    }
    
    return date
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setDisplayValue(value)
    
    const parsedDate = parseDate(value, format)
    if (parsedDate) {
      onChange(parsedDate)
      setViewDate(parsedDate)
    }
  }

  const handleInputBlur = () => {
    if (displayValue) {
      const parsedDate = parseDate(displayValue, format)
      if (parsedDate) {
        setDisplayValue(formatDate(parsedDate, format))
      } else {
        // Invalid date, reset to original value
        if (value) {
          setDisplayValue(formatDate(value, format))
        } else {
          setDisplayValue('')
          onChange(null)
        }
      }
    } else {
      onChange(null)
    }
  }

  const handleCalendarClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
    }
  }

  const handleDateSelect = (date: Date) => {
    onChange(date)
    setDisplayValue(formatDate(date, format))
    setIsOpen(false)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(viewDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setViewDate(newDate)
  }

  const navigateYear = (direction: 'prev' | 'next') => {
    const newDate = new Date(viewDate)
    if (direction === 'prev') {
      newDate.setFullYear(newDate.getFullYear() - 1)
    } else {
      newDate.setFullYear(newDate.getFullYear() + 1)
    }
    setViewDate(newDate)
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days: (Date | null)[] = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <CalendarIcon 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer z-20 pointer-events-auto" 
          onClick={handleCalendarClick}
        />
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onClick={(e) => {
            // Allow input editing without closing calendar
            e.stopPropagation();
          }}
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
      
      {isOpen && !disabled && (
        <div className="absolute z-50 bottom-full mb-1 p-4 bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateYear('prev')}
                className="p-1 hover:bg-gray-100 rounded"
                type="button"
              >
                <ChevronLeft className="h-3 w-3" />
                <ChevronLeft className="h-3 w-3 -ml-2" />
              </button>
              <button
                onClick={() => navigateMonth('prev')}
                className="p-1 hover:bg-gray-100 rounded"
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
            
            <div className="text-sm font-medium">
              {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth('next')}
                className="p-1 hover:bg-gray-100 rounded"
                type="button"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => navigateYear('next')}
                className="p-1 hover:bg-gray-100 rounded"
                type="button"
              >
                <ChevronRight className="h-3 w-3" />
                <ChevronRight className="h-3 w-3 -ml-2" />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-xs text-gray-500 text-center p-1">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth(viewDate).map((day, index) => (
              <button
                key={index}
                onClick={() => day && handleDateSelect(day)}
                disabled={!day}
                className={cn(
                  "p-2 text-sm rounded hover:bg-blue-100",
                  !day && "invisible",
                  day && value && day.toDateString() === value.toDateString() && "bg-blue-500 text-white hover:bg-blue-600",
                  day && (!value || day.toDateString() !== value.toDateString()) && "hover:bg-gray-100"
                )}
                type="button"
              >
                {day?.getDate()}
              </button>
            ))}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={() => {
                const today = new Date()
                handleDateSelect(today)
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
              type="button"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}