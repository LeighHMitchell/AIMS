import * as React from "react"
import { CheckCircle, Loader2 } from "lucide-react"

/**
 * React component for the completion checkmark
 */
export function TabCompletionIndicator({ 
  isComplete, 
  isInProgress 
}: { 
  isComplete: boolean
  isInProgress: boolean 
}) {
  if (isComplete) {
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }
  
  if (isInProgress) {
    return <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
  }
  
  return null
}




