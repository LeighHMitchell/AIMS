import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = "DialogOverlay"

type DialogContentProps = React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> & {
  /**
   * Opt-in, CHARTS ONLY. When true the dialog is centred by layout (grid)
   * and animates a pure fade + scale from dead-centre — it appears in place
   * and expands, with no slide. Used by chart-expand modals in the Analytics
   * Dashboard / Activity & Org Profiles. Omit it for every other modal
   * (forms, confirmations, editors): those keep the original instant,
   * transform-centred behaviour and are intentionally NOT animated.
   */
  chart?: boolean
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, chart = false, onPointerDownOutside, onInteractOutside, onFocusOutside, ...props }, ref) => {
  // Keep popovers / dropdown menus rendered inside the dialog from closing it
  // or stealing its focus trap.
  const guard =
    (cb?: (e: any) => void) =>
    (e: any) => {
      const target = e.target as HTMLElement
      if (
        target.closest('[data-popover-content]') ||
        target.closest('[data-radix-dropdown-menu-content]') ||
        target.closest('[role="menu"]')
      ) {
        e.preventDefault()
      }
      cb?.(e)
    }
  const outsideHandlers = {
    onPointerDownOutside: guard(onPointerDownOutside),
    onInteractOutside: guard(onInteractOutside),
    onFocusOutside: guard(onFocusOutside),
  }

  if (chart) {
    return (
      <DialogPortal>
        <DialogOverlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-200" />
        {/*
          CHART EXPAND ONLY. Centred by LAYOUT (grid), never by a transform:
          tailwindcss-animate's zoom keyframe owns `transform`, so transform-
          based centring would be dropped mid-zoom and the panel would slide
          in from a corner. Here the animation touches ONLY scale + opacity —
          it appears dead-centre and expands in place, at any size. Wrapper is
          pointer-events-none so outside-clicks still reach the overlay.
        */}
        <div className="fixed inset-0 z-[10000] grid place-items-center p-4 pointer-events-none">
          <DialogPrimitive.Content
            ref={ref}
            className={cn(
              "pointer-events-auto relative grid w-full max-w-lg gap-4 border bg-background p-6 shadow-xl sm:rounded-lg max-h-[85vh] data-[state=open]:animate-in data-[state=open]:ease-out-expo data-[state=open]:duration-300 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:ease-out-expo data-[state=closed]:duration-200 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              className
            )}
            {...outsideHandlers}
            {...props}
          />
        </div>
      </DialogPortal>
    )
  }

  // DEFAULT — original behaviour, unchanged. Transform-centred, no animation.
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 z-[10000] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-xl duration-200 sm:rounded-lg max-h-[85vh]",
          className
        )}
        {...outsideHandlers}
        {...props}
      />
    </DialogPortal>
  )
})
DialogContent.displayName = "DialogContent"

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left bg-surface-muted px-6 py-4 border-b -mx-6 -mt-6 sm:rounded-t-lg", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight text-balance", className)}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-body text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} 