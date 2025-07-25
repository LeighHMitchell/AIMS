"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface PopoverContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PopoverContext = React.createContext<PopoverContextValue | undefined>(undefined)

interface PopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Popover = ({ open = false, onOpenChange = () => {}, children }: PopoverProps) => {
  return (
    <PopoverContext.Provider value={{ open, onOpenChange }}>
      <div className="relative w-full">
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

const PopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ children, onClick, className, ...props }, ref) => {
  const context = React.useContext(PopoverContext)
  if (!context) throw new Error("PopoverTrigger must be used within Popover")

  return (
    <button
      ref={ref}
      onClick={(e) => {
        onClick?.(e)
        context.onOpenChange(!context.open)
      }}
      className={cn("w-full", className)}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
})
PopoverTrigger.displayName = "PopoverTrigger"

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end"
  sideOffset?: number
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, align = "center", sideOffset = 4, ...props }, ref) => {
    const context = React.useContext(PopoverContext)
    const contentRef = React.useRef<HTMLDivElement | null>(null)
    
    if (!context) throw new Error("PopoverContent must be used within Popover")

    // Combine refs
    const combinedRef = React.useCallback((node: HTMLDivElement | null) => {
      contentRef.current = node
      if (typeof ref === "function") {
        ref(node)
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
      }
    }, [ref])

    // Handle outside clicks
    React.useEffect(() => {
      if (!context.open) return

             function handleClickOutside(event: MouseEvent) {
         const target = event.target as Element
         if (
           contentRef.current &&
           !contentRef.current.contains(target) &&
           // Also check if click is not on the trigger (to avoid conflicts)
           !target.closest('[data-popover-trigger]')
         ) {
           context?.onOpenChange(false)
         }
       }

      // Use a small delay to avoid immediate closure when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside)
      }, 0)

      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener("mousedown", handleClickOutside)
      }
    }, [context.open, context])

    // Handle escape key
    React.useEffect(() => {
      if (!context.open) return

             function handleEscape(event: KeyboardEvent) {
         if (event.key === "Escape") {
           context?.onOpenChange(false)
         }
       }

       document.addEventListener("keydown", handleEscape)
       return () => document.removeEventListener("keydown", handleEscape)
     }, [context?.open, context])

    if (!context.open) return null

    // Check if className contains positioning classes
    const hasCustomPosition = className?.includes('bottom-full') || className?.includes('top-full')

    return (
      <div
        ref={combinedRef}
        className={cn(
          "absolute z-50 w-72 rounded-md border bg-white p-4 text-gray-900 shadow-md outline-none",
          align === "start" && "left-0",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "end" && "right-0",
          className
        )}
        style={!hasCustomPosition ? { top: `calc(100% + ${sideOffset}px)` } : undefined}
        {...props}
      />
    )
  }
)
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent } 