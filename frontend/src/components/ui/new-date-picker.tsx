"use client"

import React, { useState } from "react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NewDatePickerProps {
  value?: Date
  onChange: (date: Date | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function NewDatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  className
}: NewDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={cn("relative", className)}>
      <DatePicker
        selected={value}
        onChange={onChange}
        placeholderText={placeholder}
        disabled={disabled}
        open={isOpen}
        onClickOutside={() => setIsOpen(false)}
        customInput={
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
            onClick={() => setIsOpen(!isOpen)}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? value.toLocaleDateString() : placeholder}
          </Button>
        }
        calendarClassName="modern-calendar"
        dateFormat="yyyy-MM-dd"
        showPopperArrow={false}
        popperClassName="date-picker-popper"
        wrapperClassName="date-picker-wrapper"
      />
      
      <style jsx global>{`
        .modern-calendar {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          padding: 16px;
          font-family: inherit;
        }

        .modern-calendar .react-datepicker__header {
          background: white;
          border: none;
          padding: 0 0 16px 0;
        }

        .modern-calendar .react-datepicker__current-month {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 16px;
        }

        .modern-calendar .react-datepicker__navigation {
          top: 16px;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modern-calendar .react-datepicker__navigation:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .modern-calendar .react-datepicker__navigation--previous {
          left: 16px;
        }

        .modern-calendar .react-datepicker__navigation--next {
          right: 16px;
        }

        .modern-calendar .react-datepicker__navigation-icon::before {
          border-color: #6b7280;
          border-width: 2px 2px 0 0;
          width: 6px;
          height: 6px;
        }

        .modern-calendar .react-datepicker__day-names {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 8px;
        }

        .modern-calendar .react-datepicker__day-name {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 500;
          color: #6b7280;
          margin: 0;
        }

        .modern-calendar .react-datepicker__week {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 4px;
        }

        .modern-calendar .react-datepicker__day {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          font-size: 14px;
          color: #374151;
          margin: 0;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .modern-calendar .react-datepicker__day:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .modern-calendar .react-datepicker__day--selected {
          background: #3b82f6 !important;
          color: white !important;
        }

        .modern-calendar .react-datepicker__day--today {
          background: #dbeafe;
          color: #1d4ed8;
          font-weight: 600;
        }

        .modern-calendar .react-datepicker__day--outside-month {
          color: #d1d5db;
        }

        .modern-calendar .react-datepicker__day--disabled {
          color: #d1d5db;
          cursor: not-allowed;
        }

        .modern-calendar .react-datepicker__day--disabled:hover {
          background: transparent;
        }

        .date-picker-popper {
          z-index: 9999;
        }

        .date-picker-wrapper {
          width: 100%;
        }
      `}</style>
    </div>
  )
} 