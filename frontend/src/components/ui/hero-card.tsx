"use client"

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface HeroCardProps {
  title: string
  value: string | number
  subtitle?: string
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'error'
}

export function HeroCard({ 
  title, 
  value, 
  subtitle, 
  className,
  variant = 'default' 
}: HeroCardProps) {
  // All variants use the same neutral/monochrome style
  const cardClass = 'border-gray-200 bg-white';
  const valueClass = 'text-gray-900';

  return (
    <Card className={cn(cardClass, className)}>
      <CardContent className="p-4">
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={cn("text-2xl font-bold", valueClass)}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}