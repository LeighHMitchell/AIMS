"use client"

import * as React from "react"
import * as HoverCardPrimitive from "@radix-ui/react-hover-card"

import { cn } from "@/lib/utils"

const HoverCard = HoverCardPrimitive.Root

const HoverCardTrigger = HoverCardPrimitive.Trigger

const HoverCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCardPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content> & { style?: React.CSSProperties }
>(({ className, align = "center", sideOffset = 4, style, children, ...props }, ref) => (
  <HoverCardPrimitive.Portal>
    <HoverCardPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      data-radix-hover-card-content=""
      className={cn(
        "z-50 w-64 rounded-md border p-4 text-popover-foreground shadow-md outline-none",
        className
      )}
      style={{
        backgroundColor: '#f6f5f3',
        opacity: 1,
        isolation: 'isolate',
        ...style,
      }}
      {...props}
    >
      <div
        style={{
          backgroundColor: '#f6f5f3',
          borderRadius: 'inherit',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </HoverCardPrimitive.Content>
  </HoverCardPrimitive.Portal>
))
HoverCardContent.displayName = HoverCardPrimitive.Content.displayName

export { HoverCard, HoverCardTrigger, HoverCardContent }









