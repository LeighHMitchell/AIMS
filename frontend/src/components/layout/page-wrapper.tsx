"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface PageWrapperProps {
  children: React.ReactNode
  className?: string
  withPadding?: boolean
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "7xl" | "full"
}

const maxWidthClasses = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-screen-2xl",
  "7xl": "max-w-7xl",
  full: "max-w-full"
}

export function PageWrapper({ 
  children, 
  className,
  withPadding = true,
  maxWidth = "7xl"
}: PageWrapperProps) {
  return (
    <div className={cn(
      "min-h-screen bg-background",
      className
    )}>
      <div className={cn(
        "mx-auto",
        maxWidthClasses[maxWidth],
        withPadding && "px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
      )}>
        {children}
      </div>
    </div>
  )
} 