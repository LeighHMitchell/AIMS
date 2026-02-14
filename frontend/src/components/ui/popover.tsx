"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface PopoverContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerRef: React.RefObject<HTMLElement | null>
}

const PopoverContext = React.createContext<PopoverContextValue | undefined>(undefined)

interface PopoverProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

const Popover = ({ open: controlledOpen, defaultOpen = false, onOpenChange, children, className }: PopoverProps) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  const triggerRef = React.useRef<HTMLElement | null>(null)

  // Use controlled state if provided, otherwise use internal state
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }, [isControlled, onOpenChange])

  return (
    <PopoverContext.Provider value={{ open, onOpenChange: handleOpenChange, triggerRef }}>
      <div className={cn("relative w-full", className)}>
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

interface PopoverTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const PopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  PopoverTriggerProps
>(({ children, onClick, className, asChild, ...props }, ref) => {
  const context = React.useContext(PopoverContext)
  const internalRef = React.useRef<HTMLButtonElement>(null)
  
  if (!context) throw new Error("PopoverTrigger must be used within Popover")

  // Store the trigger element reference
  React.useEffect(() => {
    if (internalRef.current) {
      context.triggerRef.current = internalRef.current
    }
  }, [context.triggerRef])

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    context.onOpenChange(!context.open)
  }

  // Combine refs
  const combinedRef = React.useCallback((node: HTMLButtonElement | null) => {
    internalRef.current = node
    if (typeof ref === "function") {
      ref(node)
    } else if (ref) {
      (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node
    }
    if (node) {
      context.triggerRef.current = node
    }
  }, [ref, context.triggerRef])

  // If asChild is true, clone the child element and pass props to it
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ref: combinedRef,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        // Call the child's onClick if it exists
        const childOnClick = (children as React.ReactElement<any>).props?.onClick
        childOnClick?.(e)
        handleClick(e)
      },
      'data-popover-trigger': true,
      ...props,
    })
  }

  return (
    <button
      ref={combinedRef}
      onClick={handleClick}
      className={cn("w-full", className)}
      type="button"
      data-popover-trigger
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
  collisionPadding?: number
  forcePosition?: 'top' | 'bottom'
  usePortal?: boolean
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, align = "center", sideOffset = 4, collisionPadding = 8, forcePosition, usePortal = true, ...props }, ref) => {
    const context = React.useContext(PopoverContext)
    const contentRef = React.useRef<HTMLDivElement | null>(null)
    const [position, setPosition] = React.useState<'bottom' | 'top'>(forcePosition || 'bottom')
    const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0 })
    const [mounted, setMounted] = React.useState(false)
    const [portalTarget, setPortalTarget] = React.useState<HTMLElement | null>(null)

    if (!context) throw new Error("PopoverContent must be used within Popover")

    // Handle SSR and detect if inside a dialog
    React.useEffect(() => {
      setMounted(true)
    }, [])

    // Detect if trigger is inside a Radix Dialog and set portal target accordingly
    React.useEffect(() => {
      if (!context.triggerRef.current) return
      const dialogContent = context.triggerRef.current.closest('[role="dialog"]') as HTMLElement | null
      setPortalTarget(dialogContent || null)
    }, [context.triggerRef, context.open])

    // Combine refs
    const combinedRef = React.useCallback((node: HTMLDivElement | null) => {
      contentRef.current = node
      if (typeof ref === "function") {
        ref(node)
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
      }
    }, [ref])

    // Calculate position based on trigger
    React.useEffect(() => {
      if (!context.open || !context.triggerRef.current || !usePortal) return

      const updatePosition = () => {
        const trigger = context.triggerRef.current
        if (!trigger) return

        const rect = trigger.getBoundingClientRect()
        const viewportHeight = window.innerHeight

        // Calculate if content would overflow at bottom
        const contentHeight = contentRef.current?.offsetHeight || 350 // estimate
        const spaceBelow = viewportHeight - rect.bottom
        const shouldFlip = spaceBelow < contentHeight + collisionPadding && rect.top > spaceBelow

        let top: number
        if (shouldFlip && !forcePosition) {
          top = rect.top - contentHeight - sideOffset
          setPosition('top')
        } else {
          top = rect.bottom + sideOffset
          setPosition('bottom')
        }

        let left: number
        if (align === "start") {
          left = rect.left
        } else if (align === "end") {
          left = rect.right
        } else {
          left = rect.left + rect.width / 2
        }

        // If inside a dialog, adjust coords relative to the dialog element
        // (CSS transform on dialog creates a new containing block for fixed positioning)
        if (portalTarget) {
          const dialogRect = portalTarget.getBoundingClientRect()
          top = top - dialogRect.top
          left = left - dialogRect.left
        }

        setCoords({ top, left, width: rect.width })
      }

      updatePosition()

      // Update on resize and scroll
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)

      return () => {
        window.removeEventListener('resize', updatePosition)
        window.removeEventListener('scroll', updatePosition, true)
      }
    }, [context.open, context.triggerRef, align, sideOffset, collisionPadding, forcePosition, usePortal, portalTarget])

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

    // Check if w-auto is specified (don't force minWidth in that case)
    const hasAutoWidth = className?.includes('w-auto')

    // For portal rendering
    if (usePortal && mounted) {
      const content = (
        <div
          ref={combinedRef}
          data-popover-content
          className={cn(
            "fixed z-[10005] pointer-events-auto rounded-md border bg-white p-4 text-gray-900 shadow-lg outline-none dark:bg-gray-950 dark:text-gray-100 dark:border-gray-800",
            !hasAutoWidth && "min-w-[200px]",
            className
          )}
          style={{
            top: coords.top,
            left: align === "center" ? coords.left : align === "end" ? coords.left - (contentRef.current?.offsetWidth || 0) + coords.width : coords.left,
            transform: align === "center" ? 'translateX(-50%)' : undefined,
            '--radix-popover-trigger-width': `${coords.width}px`,
            ...(!hasAutoWidth && { minWidth: coords.width }),
          } as React.CSSProperties}
          {...props}
        />
      )

      // Portal into the dialog element if inside a dialog (keeps focus within dialog's scope),
      // otherwise portal to document.body
      return createPortal(content, portalTarget || document.body)
    }

    // Fallback to non-portal rendering (for SSR or when usePortal is false)
    const hasCustomPosition = className?.includes('bottom-full') || className?.includes('top-full')

    return (
      <div
        ref={combinedRef}
        className={cn(
          "absolute z-[10005] w-72 rounded-md border bg-white p-4 text-gray-900 shadow-md outline-none dark:bg-gray-950 dark:text-gray-100 dark:border-gray-800",
          align === "start" && "left-0",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "end" && "right-0",
          className
        )}
        style={!hasCustomPosition ? (
          position === 'top' 
            ? { bottom: `calc(100% + ${sideOffset}px)` }
            : { top: `calc(100% + ${sideOffset}px)` }
        ) : undefined}
        {...props}
      />
    )
  }
)
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent } 