import React from 'react'
import { 
  FileEdit, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Globe, 
  Eye, 
  EyeOff,
  Waypoints,
  Activity,
  CheckCircle2,
  Lock,
  Ban,
  CircleSlash
} from "lucide-react"

export interface StatusIconConfig {
  icon: React.ReactNode
  tooltip: string
}

export const getSubmissionStatusIcon = (status: string): StatusIconConfig => {
  switch (status) {
    case 'draft': 
      return { 
        icon: <FileEdit className="h-4 w-4 text-black" />, 
        tooltip: "Draft - In progress" 
      }
    case 'submitted': 
      return { 
        icon: <Clock className="h-4 w-4 text-black" />, 
        tooltip: "Submitted - Awaiting validation" 
      }
    case 'validated': 
      return { 
        icon: <CheckCircle className="h-4 w-4 text-black" />, 
        tooltip: "Validated - Approved for publication" 
      }
    case 'rejected': 
      return { 
        icon: <XCircle className="h-4 w-4 text-black" />, 
        tooltip: "Rejected - Requires revision" 
      }
    case 'published': 
      return { 
        icon: <Globe className="h-4 w-4 text-black" />, 
        tooltip: "Published - Publicly visible" 
      }
    default: 
      return { 
        icon: <FileEdit className="h-4 w-4 text-black" />, 
        tooltip: "Unknown status" 
      }
  }
}

export const getPublicationStatusIcon = (status: string): StatusIconConfig => {
  switch (status) {
    case 'draft': 
      return { 
        icon: <EyeOff className="h-4 w-4 text-black" />, 
        tooltip: "Draft - Not published" 
      }
    case 'published': 
      return { 
        icon: <Eye className="h-4 w-4 text-black" />, 
        tooltip: "Published - Publicly visible" 
      }
    default: 
      return { 
        icon: <EyeOff className="h-4 w-4 text-black" />, 
        tooltip: "Unknown status" 
      }
  }
}

export const getActivityStatusIcon = (status: string): StatusIconConfig => {
  switch (status) {
    // Text-based statuses
    case 'planning': 
    case 'pipeline':
      return { 
        icon: <Waypoints className="h-4 w-4 text-foreground" />, 
        tooltip: "Pipeline/Identification" 
      }
    case 'implementation':
    case 'active': 
      return { 
        icon: <Activity className="h-4 w-4 text-foreground" />, 
        tooltip: "Implementation" 
      }
    case 'completed': 
    case 'finalisation':
      return { 
        icon: <CheckCircle2 className="h-4 w-4 text-foreground" />, 
        tooltip: "Finalisation" 
      }
    case 'closed': 
      return { 
        icon: <Lock className="h-4 w-4 text-foreground" />, 
        tooltip: "Closed" 
      }
    case 'cancelled': 
      return { 
        icon: <Ban className="h-4 w-4 text-foreground" />, 
        tooltip: "Cancelled" 
      }
    case 'suspended': 
      return { 
        icon: <CircleSlash className="h-4 w-4 text-foreground" />, 
        tooltip: "Suspended" 
      }
    
    // IATI numeric codes
    case '1': 
      return { 
        icon: <Waypoints className="h-4 w-4 text-foreground" />, 
        tooltip: "Pipeline/Identification" 
      }
    case '2': 
      return { 
        icon: <Activity className="h-4 w-4 text-foreground" />, 
        tooltip: "Implementation" 
      }
    case '3': 
      return { 
        icon: <CheckCircle2 className="h-4 w-4 text-foreground" />, 
        tooltip: "Finalisation" 
      }
    case '4': 
      return { 
        icon: <Lock className="h-4 w-4 text-foreground" />, 
        tooltip: "Closed" 
      }
    case '5': 
      return { 
        icon: <Ban className="h-4 w-4 text-foreground" />, 
        tooltip: "Cancelled" 
      }
    case '6': 
      return { 
        icon: <CircleSlash className="h-4 w-4 text-foreground" />, 
        tooltip: "Suspended" 
      }
    
    default: 
      return { 
        icon: <Waypoints className="h-4 w-4 text-foreground" />, 
        tooltip: "Pipeline/Identification" 
      }
  }
}