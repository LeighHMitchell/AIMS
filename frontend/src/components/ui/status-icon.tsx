import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getSubmissionStatusIcon, getPublicationStatusIcon, getActivityStatusIcon } from "@/utils/status-icons"

interface StatusIconProps {
  type: 'submission' | 'publication' | 'activity'
  status: string
  className?: string
}

export function StatusIcon({ type, status, className = "" }: StatusIconProps) {
  const { icon, tooltip } = type === 'submission' 
    ? getSubmissionStatusIcon(status)
    : type === 'publication'
    ? getPublicationStatusIcon(status)
    : getActivityStatusIcon(status)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center justify-center ${className}`}>
            {icon}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}