"use client"

import * as React from "react"
import { Lock, Unlock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { OrganizationSearchableSelect, Organization } from "@/components/ui/organization-searchable-select"

interface LockedOrganizationFieldProps {
  label: string
  value: string
  onChange?: (value: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  isSuperUser?: boolean
  lockTooltip?: string
  unlockTooltip?: string
  organizations: Organization[]
  onSave?: (value: string) => Promise<void>
  saving?: boolean
}

export function LockedOrganizationField({
  label,
  value,
  onChange,
  disabled = false,
  placeholder,
  className,
  isSuperUser = false,
  lockTooltip = "This field is locked. Only super users can unlock it.",
  unlockTooltip = "Click to unlock this field for editing",
  organizations,
  onSave,
  saving = false
}: LockedOrganizationFieldProps) {
  const [isUnlocked, setIsUnlocked] = React.useState(false)
  const [localValue, setLocalValue] = React.useState(value)

  // Reset local value when external value changes
  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleToggleLock = () => {
    // Allow all users to unlock (removed super user restriction)
    if (isUnlocked) {
      // Locking - save any changes
      if (localValue !== value && onSave) {
        onSave(localValue)
      }
    }
    setIsUnlocked(!isUnlocked)
  }

  const handleValueChange = (newValue: string) => {
    setLocalValue(newValue)
    onChange?.(newValue)
  }

  const handleSave = async () => {
    if (onSave && localValue !== value) {
      await onSave(localValue)
      setIsUnlocked(false) // Lock after saving
    }
  }

  // Allow all users to edit (removed super user restriction)
  const isFieldDisabled = disabled || !isUnlocked

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className={cn(
          "text-sm font-medium",
          isFieldDisabled && "text-gray-400"
        )}>
          {label}
        </Label>
        <div className="flex items-center gap-2">
          {isUnlocked && localValue !== value && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-6 px-2 text-xs"
            >
              Save
            </Button>
          )}
          {/* Allow all users to unlock (removed super user restriction) */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleLock}
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                  disabled={saving}
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
        </div>
      </div>
      
      <OrganizationSearchableSelect
        organizations={organizations}
        value={localValue}
        onValueChange={handleValueChange}
        placeholder={placeholder}
        disabled={isFieldDisabled}
        className={cn(
          isFieldDisabled && "bg-gray-50 text-gray-400 cursor-not-allowed opacity-50"
        )}
      />
      
      {isFieldDisabled && (
        <p className="text-xs text-gray-400 mt-1">
          Unlock to edit this field
        </p>
      )}
    </div>
  )
}
