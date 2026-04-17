"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function YearGridDropdown({ value, onChange, options, className, ...props }: any) {
  const [showGrid, setShowGrid] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const gridRef = React.useRef<HTMLDivElement>(null)

  // Determine if this is the year dropdown (options have 4-digit numeric values)
  const isYearDropdown = options?.length > 0 && options[0]?.value >= 1900

  React.useEffect(() => {
    if (showGrid && gridRef.current) {
      const selected = gridRef.current.querySelector('[data-selected="true"]')
      if (selected) {
        selected.scrollIntoView({ block: 'center', behavior: 'instant' })
      }
    }
  }, [showGrid])

  React.useEffect(() => {
    if (!showGrid) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowGrid(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showGrid])

  if (!isYearDropdown) {
    // Month dropdown — keep as native select
    return (
      <select value={value} onChange={onChange} className={className} {...props}>
        {options?.map((opt: any) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    )
  }

  const selectedLabel = options?.find((opt: any) => String(opt.value) === String(value))?.label || value

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setShowGrid(!showGrid)}
        className={cn(className, "text-center")}
      >
        {selectedLabel}
      </button>
      {showGrid && (
        <div
          ref={gridRef}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-white border border-border rounded-lg shadow-lg p-2 max-h-[200px] overflow-y-auto overscroll-contain"
          style={{ width: '270px' }}
        >
          <div className="grid grid-cols-5 gap-1">
            {options?.map((opt: any) => (
              <button
                key={opt.value}
                type="button"
                data-selected={String(opt.value) === String(value)}
                onClick={() => {
                  onChange?.({ target: { value: String(opt.value) } } as any)
                  setShowGrid(false)
                }}
                className={cn(
                  "px-1 py-1.5 text-xs rounded-md text-center transition-colors",
                  String(opt.value) === String(value)
                    ? "bg-black text-white font-semibold"
                    : "hover:bg-muted text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout,
  ...props
}: CalendarProps) {
  const isDropdown = captionLayout === "dropdown";

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center h-9",
        caption_label: cn("text-sm font-medium", isDropdown && "hidden"),
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1"
        ),
        // Dropdown styles for month/year navigation
        dropdowns: "flex gap-2 items-center justify-center",
        dropdown: "appearance-none bg-white border border-border rounded-md px-2 py-1 text-sm font-medium cursor-pointer hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
        months_dropdown: "appearance-none bg-white border border-border rounded-md px-2 py-1 pr-6 text-sm font-medium cursor-pointer hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
        years_dropdown: "appearance-none bg-white border border-border rounded-md px-2 py-1 pr-6 text-sm font-medium cursor-pointer hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
        // Table and day styles
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-9 h-9 font-normal text-[0.8rem] flex items-center justify-center",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative flex items-center justify-center",
        day_button: "h-9 w-9 p-0 font-normal rounded-full inline-flex items-center justify-center whitespace-nowrap text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-accent hover:text-accent-foreground aria-selected:!bg-black aria-selected:!text-white aria-selected:hover:!bg-black/80 aria-selected:hover:!text-white aria-selected:opacity-100",
        range_end: "day-range-end",
        selected: "bg-black text-white hover:bg-black hover:text-white focus:bg-black focus:text-white rounded-full",
        today: "bg-muted text-foreground font-semibold rounded-full",
        outside: "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ?
            <ChevronLeft className="h-4 w-4" /> :
            <ChevronRight className="h-4 w-4" />,
        ...(isDropdown ? { Dropdown: YearGridDropdown } : {}),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"
export { Calendar }
