import React from 'react';
import { CircleDashed, CheckCircle, XCircle } from 'lucide-react';

interface SimpleSaveIndicatorProps {
  label: React.ReactNode;
  helpText?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  
  // Force specific indicator states
  forceGreenTick?: boolean;   // Always show green tick
  showOrange?: boolean;       // Show orange spinner
  showRed?: boolean;          // Show red error
  
  // Optional error message
  errorMessage?: string;
  
  className?: string;
}

/**
 * Ultra-simple save indicator that doesn't rely on complex state logic.
 * Use this when you need to guarantee specific indicator behavior.
 */
export function SimpleSaveIndicator({
  label,
  helpText,
  required = false,
  children,
  forceGreenTick = false,
  showOrange = false,
  showRed = false,
  errorMessage,
  className = ''
}: SimpleSaveIndicatorProps) {
  
  const getIndicator = () => {
    // Priority order: Red > Orange > Green
    if (showRed) {
      return <XCircle className="w-4 h-4 text-red-600 ml-2" title={errorMessage} />;
    }
    
    if (showOrange) {
      return <CircleDashed className="w-4 h-4 text-orange-600 animate-spin ml-2" />;
    }
    
    if (forceGreenTick) {
      return <CheckCircle className="w-4 h-4 text-green-600 ml-2" />;
    }
    
    return null; // No indicator
  };
  
  return (
    <div className="space-y-2">
      <label className={`text-sm font-medium flex items-center text-gray-700 ${className}`}>
        <div className="flex items-center gap-2">
          <span>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
          {helpText}
        </div>
        {getIndicator()}
      </label>
      
      <div>
        {children}
      </div>
      
      {errorMessage && showRed && (
        <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
      )}
    </div>
  );
}

/**
 * Hook to manage simple save indicator states
 */
export function useSimpleSaveIndicator() {
  const [isGreen, setIsGreen] = React.useState(false);
  const [isOrange, setIsOrange] = React.useState(false);
  const [isRed, setIsRed] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');
  
  const showGreen = () => {
    setIsGreen(true);
    setIsOrange(false);
    setIsRed(false);
    setErrorMsg('');
  };
  
  const showOrange = () => {
    setIsGreen(false);
    setIsOrange(true);
    setIsRed(false);
    setErrorMsg('');
  };
  
  const showRed = (message: string = 'Error occurred') => {
    setIsGreen(false);
    setIsOrange(false);
    setIsRed(true);
    setErrorMsg(message);
  };
  
  const showNone = () => {
    setIsGreen(false);
    setIsOrange(false);
    setIsRed(false);
    setErrorMsg('');
  };
  
  return {
    // State
    forceGreenTick: isGreen,
    showOrange: isOrange,
    showRed: isRed,
    errorMessage: errorMsg,
    
    // Actions
    showGreen,
    showOrange,
    showRed,
    showNone,
  };
}