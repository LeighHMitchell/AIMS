import React from 'react';
import { Info, CheckCircle, CircleDashed } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InfoTooltipWithSaveIndicatorProps {
  text: string;
  isSaving?: boolean;
  isSaved?: boolean;
  hasValue?: boolean;
  className?: string;
}

export function InfoTooltipWithSaveIndicator({ 
  text, 
  isSaving = false, 
  isSaved = false, 
  hasValue = false,
  className = "" 
}: InfoTooltipWithSaveIndicatorProps) {
  // Show green tick if actively saved OR if field has existing data
  const showGreenTick = isSaved || hasValue;
  
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {/* Help text tooltip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3 w-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{text}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Save indicator - shows after the help text icon */}
      {isSaving && (
        <CircleDashed className="w-3 h-3 text-orange-600 animate-spin" />
      )}
      {!isSaving && showGreenTick && (
        <CheckCircle className="w-3 h-3 text-green-600" />
      )}
    </div>
  );
}

// Enhanced label component that includes the InfoTooltip with save indicator
interface LabelWithInfoAndSaveProps {
  children: React.ReactNode;
  helpText: string;
  isSaving?: boolean;
  isSaved?: boolean;
  hasValue?: boolean;
  className?: string;
}

export function LabelWithInfoAndSave({ 
  children, 
  helpText, 
  isSaving = false, 
  isSaved = false, 
  hasValue = false,
  className = "" 
}: LabelWithInfoAndSaveProps) {
  return (
    <label className={`text-sm font-medium flex items-center gap-2 ${className}`}>
      {children}
      <InfoTooltipWithSaveIndicator 
        text={helpText}
        isSaving={isSaving}
        isSaved={isSaved}
        hasValue={hasValue}
      />
    </label>
  );
}
