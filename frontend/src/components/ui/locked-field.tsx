"use client"

import * as React from "react"
import { Lock, Unlock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface LockedFieldProps {
  label: string
  value: string
  onChange?: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  isSuperUser?: boolean
  lockTooltip?: string
  unlockTooltip?: string
  children?: React.ReactNode
}

export function LockedField({
  label,
  value,
  onChange,
  disabled = false,
  placeholder,
  className,
  isSuperUser = false,
  lockTooltip = "This field is locked. Only super users can unlock it.",
  unlockTooltip = "Click to unlock this field for editing",
  children
}: LockedFieldProps) {
  const [isUnlocked, setIsUnlocked] = React.useState(false)

  const handleToggleLock = () => {
    if (isSuperUser) {
      setIsUnlocked(!isUnlocked)
    }
  }

  const isFieldDisabled = disabled || (!isSuperUser || !isUnlocked)

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className={cn(
          "text-sm font-medium",
          isFieldDisabled && "text-gray-400"
        )}>
          {label}
        </Label>
        {isSuperUser && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleLock}
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                >
                  {isUnlocked ? (
                    <Unlock className="h-3 w-3 text-green-600" />
                  ) : (
                    <Lock className="h-3 w-3 text-gray-500" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isUnlocked ? "Click to lock field" : unlockTooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {!isSuperUser && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-6 w-6 flex items-center justify-center">
                  <Lock className="h-3 w-3 text-gray-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{lockTooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      {children ? (
        React.cloneElement(children as React.ReactElement, {
          disabled: isFieldDisabled,
          className: cn(
            (children as React.ReactElement).props?.className,
            isFieldDisabled && "bg-gray-50 text-gray-400 cursor-not-allowed"
          )
        })
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={isFieldDisabled}
          placeholder={placeholder}
          className={cn(
            isFieldDisabled && "bg-gray-50 text-gray-400 cursor-not-allowed"
          )}
        />
      )}
      
      {isFieldDisabled && (
        <p className="text-xs text-gray-400 mt-1">
          {isSuperUser ? "Unlock to edit this field" : "This field can only be edited by super users"}
        </p>
      )}
    </div>
  )
}
