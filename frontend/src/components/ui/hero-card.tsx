"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HeroCardProps<T = any> {
  title: string;
  subtitle?: string;
  data?: T[];
  valueAccessor?: (item: T) => number;
  staticValue?: number;
  currency?: string;
  prefix?: string;
  suffix?: string;
  hasWarning?: boolean;
  warningMessage?: string;
  isUpdating?: boolean;
  justUpdated?: boolean;
  className?: string;
  animate?: boolean;
  onValueChange?: (newValue: number) => void;
  variant?: 'default' | 'success' | 'warning' | 'error';
  // Legacy support for simple value prop
  value?: string | number;
}

function useCountUp(targetValue: number, duration: number = 400, animate: boolean = true) {
  const [currentValue, setCurrentValue] = useState(targetValue);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevTargetValueRef = useRef(targetValue);

  useEffect(() => {
    // Only animate if target value actually changed
    if (prevTargetValueRef.current === targetValue) return;
    
    if (!animate || Math.abs(targetValue - currentValue) < 0.01) {
      setCurrentValue(targetValue);
      prevTargetValueRef.current = targetValue;
      return;
    }

    setIsAnimating(true);
    const startValue = currentValue;
    const difference = targetValue - startValue;
    const startTime = Date.now();

    const animateValue = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      const newValue = startValue + (difference * easedProgress);
      setCurrentValue(newValue);

      if (progress < 1) {
        requestAnimationFrame(animateValue);
      } else {
        setCurrentValue(targetValue);
        setIsAnimating(false);
        prevTargetValueRef.current = targetValue;
      }
    };

    requestAnimationFrame(animateValue);
  }, [targetValue, duration, animate]); // Removed currentValue from dependencies

  return { currentValue, isAnimating };
}

export function HeroCard<T = any>({
  title,
  subtitle,
  data,
  valueAccessor,
  staticValue,
  currency = "USD",
  prefix,
  suffix,
  hasWarning = false,
  warningMessage,
  isUpdating = false,
  justUpdated = false,
  className,
  animate = true,
  onValueChange,
  variant = 'default',
  // Legacy support
  value,
}: HeroCardProps<T>) {
  // Calculate value from data or use static value or legacy value
  const calculatedValue = useMemo(() => {
    // Legacy support: if value prop is provided, use it
    if (value !== undefined) {
      return typeof value === 'number' ? value : parseFloat(value.toString()) || 0;
    }
    
    if (staticValue !== undefined) return staticValue;
    if (!data || !valueAccessor) return 0;
    
    return data.reduce((sum, item) => {
      const itemValue = valueAccessor(item);
      return sum + (itemValue || 0);
    }, 0);
  }, [data, valueAccessor, staticValue, value]);

  // Count-up animation
  const { currentValue, isAnimating } = useCountUp(calculatedValue, 400, animate);

  // Debug logging - only log when values actually change
  const prevCalculatedValueRef = useRef(calculatedValue);
  useEffect(() => {
    if (prevCalculatedValueRef.current !== calculatedValue) {
      console.log('[HeroCard]', title, 'calculatedValue:', calculatedValue, 'currentValue:', currentValue, 'staticValue:', staticValue);
      prevCalculatedValueRef.current = calculatedValue;
    }
  }, [calculatedValue, currentValue, staticValue, title]);

  // Notify parent of value changes
  useEffect(() => {
    if (onValueChange && calculatedValue !== undefined) {
      onValueChange(calculatedValue);
    }
  }, [calculatedValue, onValueChange]);

  // Format value based on props and data type
  const formatValue = (amount: number) => {
    // Legacy support: if value was a string, return as-is
    if (value !== undefined && typeof value === 'string' && isNaN(parseFloat(value))) {
      return value;
    }

    let formatted: string;
    
    if (currency === "USD") {
      // Currency formatting with decimal places
      formatted = amount.toLocaleString("en-US", { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
      if (!prefix) {
        formatted = "$" + formatted;
      }
    } else if (currency === "" || currency === null || currency === undefined) {
      // No currency - always format as whole number for counts (no decimals during animation)
      formatted = Math.round(amount).toString();
    } else {
      // Other currency or custom formatting
      formatted = amount.toLocaleString("en-US", { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    }

    if (prefix && currency !== "USD") {
      formatted = prefix + formatted;
    }
    if (suffix) {
      formatted = formatted + suffix;
    }

    return formatted;
  };

  // All variants use the same neutral/monochrome style for consistency
  const cardClass = 'border-gray-200 bg-white';
  const valueClass = 'text-gray-900';

  return (
    <TooltipProvider>
      <Card className={cn(cardClass, className)}>
        <CardContent className="p-6">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <div className="flex items-center gap-1">
                {(isUpdating || isAnimating) && (
                  <Tooltip>
                    <TooltipTrigger>
                      <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Updating totals...</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {justUpdated && !isUpdating && !isAnimating && (
                  <Tooltip>
                    <TooltipTrigger>
                      <CheckCircle className="h-4 w-4 text-green-500 animate-pulse" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total updated!</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                {hasWarning && (
                  <Tooltip>
                    <TooltipTrigger>
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{warningMessage || "Warning: Some data may be incomplete"}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
            <p className={cn(
              "text-2xl font-bold transition-all duration-500",
              valueClass,
              (isUpdating || isAnimating) && "scale-105 text-gray-900",
              justUpdated && !isUpdating && !isAnimating && "scale-105 text-green-600"
            )}>
              {formatValue(animate ? currentValue : calculatedValue)}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}