"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

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
        dropdown: "appearance-none bg-white border border-gray-200 rounded-md px-2 py-1 text-sm font-medium cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
        months_dropdown: "appearance-none bg-white border border-gray-200 rounded-md px-2 py-1 pr-6 text-sm font-medium cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
        years_dropdown: "appearance-none bg-white border border-gray-200 rounded-md px-2 py-1 pr-6 text-sm font-medium cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
        // Table and day styles
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-9 h-9 font-normal text-[0.8rem] flex items-center justify-center",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative flex items-center justify-center",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-full"
        ),
        range_end: "day-range-end",
        selected: "bg-black text-white hover:bg-black hover:text-white focus:bg-black focus:text-white rounded-full",
        today: "bg-gray-100 text-gray-900 font-semibold rounded-full",
        outside: "text-gray-400 opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
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
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"
export { Calendar } 