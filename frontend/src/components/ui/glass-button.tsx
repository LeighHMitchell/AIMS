'use client'

import * as React from 'react'

import type { VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

import { Button, type buttonVariants } from '@/components/ui/button'

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: VariantProps<typeof buttonVariants>['size']
  children: React.ReactNode
  className?: string
  asChild?: boolean
}

function GlassButton({ children, size, asChild = false, className, ...props }: GlassButtonProps) {
  return (
    <Button
      size={size}
      asChild={asChild}
      className={cn(
        'glass-button',
        size === 'lg' && 'text-base',
        'relative inline-flex shrink-0 rounded-lg !text-white',

        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

export { GlassButton, type GlassButtonProps }
