import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getSubmissionStatusIcon, getPublicationStatusIcon, getActivityStatusIcon, getDefaultAidModalityIcon } from "@/utils/status-icons"

interface StatusIconProps {
  type: 'submission' | 'publication' | 'activity' | 'aid-modality'
  status: string
  className?: string
  isPublished?: boolean
}

export function StatusIcon({ type, status, className = "", isPublished = false }: StatusIconProps) {
  const { icon, tooltip } = type === 'submission' 
    ? getSubmissionStatusIcon(status)
    : type === 'publication'
    ? getPublicationStatusIcon(status)
    : type === 'aid-modality'
    ? getDefaultAidModalityIcon(status, isPublished)
    : getActivityStatusIcon(status, isPublished)

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