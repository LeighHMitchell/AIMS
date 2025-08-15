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
  CircleSlash,
  HandCoins,
  CreditCard,
  GraduationCap,
  Repeat,
  TrendingUp
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

export const getActivityStatusIcon = (status: string, isPublished?: boolean): StatusIconConfig => {
  const strokeWeight = isPublished ? 2.5 : 1.5;
  const iconSize = isPublished ? "h-5 w-5" : "h-4 w-4";
  
  switch (status) {
    // Text-based statuses
    case 'planning': 
    case 'pipeline':
      return { 
        icon: <Waypoints className={`${iconSize} text-foreground`} strokeWidth={strokeWeight} />, 
        tooltip: "Pipeline/Identification" 
      }
    case 'implementation':
    case 'active': 
      return { 
        icon: <Activity className={`${iconSize} text-foreground`} strokeWidth={strokeWeight} />, 
        tooltip: "Implementation" 
      }
    case 'completed': 
    case 'finalisation':
      return { 
        icon: <CheckCircle2 className={`${iconSize} text-foreground`} strokeWidth={strokeWeight} />, 
        tooltip: "Finalisation" 
      }
    case 'closed': 
      return { 
        icon: <Lock className={`${iconSize} text-foreground`} strokeWidth={strokeWeight} />, 
        tooltip: "Closed" 
      }
    case 'cancelled': 
      return { 
        icon: <Ban className={`${iconSize} text-foreground`} strokeWidth={strokeWeight} />, 
        tooltip: "Cancelled" 
      }
    case 'suspended': 
      return { 
        icon: <CircleSlash className={`${iconSize} text-foreground`} strokeWidth={strokeWeight} />, 
        tooltip: "Suspended" 
      }
    
    // IATI numeric codes
    case '1': 
      return { 
        icon: <Waypoints className={`${iconSize} text-foreground`} strokeWidth={strokeWeight} />, 
        tooltip: "Pipeline/Identification" 
      }
    case '2': 
      return { 
        icon: <Activity className={`${iconSize} text-foreground`} strokeWidth={strokeWeight} />, 
        tooltip: "Implementation" 
      }
    case '3': 
      return { 
        icon: <CheckCircle2 className={`${iconSize} text-foreground`} strokeWidth={strokeWeight} />, 
        tooltip: "Finalisation" 
      }
    case '4': 
      return { 
        icon: <Lock className={`${iconSize} text-foreground`} strokeWidth={strokeWeight} />, 
        tooltip: "Closed" 
      }
    case '5': 
      return { 
        icon: <Ban className={`${iconSize} text-foreground`} strokeWidth={strokeWeight} />, 
        tooltip: "Cancelled" 
      }
    case '6': 
      return { 
        icon: <CircleSlash className={`${iconSize} text-foreground`} strokeWidth={strokeWeight} />, 
        tooltip: "Suspended" 
      }
    
    default: 
      return { 
        icon: <Waypoints className={`${iconSize} text-foreground`} strokeWidth={strokeWeight} />, 
        tooltip: "Pipeline/Identification" 
      }
  }
}

export const getDefaultAidModalityIcon = (modality: string, isPublished?: boolean): StatusIconConfig => {
  const strokeWeight = isPublished ? 2.5 : 1.5;
  const iconSize = isPublished ? "h-5 w-5" : "h-4 w-4";
  
  switch (modality) {
    case '1': 
      return { 
        icon: <HandCoins className={`${iconSize} text-foreground`} strokeWidth={strokeWeight} />, 
        tooltip: "Grant – Non-repayable funds, typically public sector support" 
      }
    case '2': 
      return { 
        icon: <CreditCard className={`${iconSize} text-foreground`} strokeWidth={strokeWeight} />, 
        tooltip: "Loan – Repayable funds with terms and conditions" 
      }
    case '3': 
      return { 
        icon: <GraduationCap className={`${iconSize} text-foreground`} strokeWidth={strokeWeight} />, 
        tooltip: "Technical Assistance – Personnel, training, or capacity support" 
      }
    case '4': 
      return { 
        icon: <Repeat className={`${iconSize} text-foreground`} strokeWidth={strokeWeight} />, 
        tooltip: "Reimbursable Grant or Other – Partial repayment or hybrid arrangement" 
      }
    case '5': 
      return { 
        icon: <TrendingUp className={`${iconSize} text-foreground`} strokeWidth={strokeWeight} />, 
        tooltip: "Investment/Guarantee – Risk capital or financial instruments without cash transfer" 
      }
    
    default: 
      return { 
        icon: <HandCoins className={`${iconSize} text-foreground`} strokeWidth={strokeWeight} />, 
        tooltip: "Grant – Non-repayable funds, typically public sector support" 
      }
  }
}