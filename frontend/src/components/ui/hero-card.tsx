"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, RefreshCw, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import { formatNumberWithAbbreviation } from "@/utils/format-helpers";

interface BudgetByYear {
  year: number;
  amount: number;
}

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
  helpText?: string;
  // Legacy support for simple value prop
  value?: string | number;
  // New: Budget breakdown by year for bar chart
  budgetsByYear?: BudgetByYear[];
  showChart?: boolean;
  // New: Secondary value to display below main value
  secondaryValue?: number;
  secondaryLabel?: string;
  // New: Multiple secondary values to display
  secondaryValues?: Array<{ value: number; label: string }>;
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
  helpText,
  // Legacy support
  value,
  budgetsByYear,
  showChart = false,
  secondaryValue,
  secondaryLabel,
  secondaryValues,
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
      // Format full number with 2 decimal places for USD currency
      const currencyPrefix = prefix || "US$";
      formatted = `${currencyPrefix}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (currency === "" || currency === null || currency === undefined) {
      // No currency - format as whole number for counts
      formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    } else {
      // Other currency - format full number with 2 decimal places
      const currencyPrefix = prefix || currency;
      formatted = `${currencyPrefix}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    if (suffix) {
      formatted = formatted + suffix;
    }

    return formatted;
  };

  // Variant-based styling
  const getVariantClasses = () => {
    switch (variant) {
      case 'error':
        return {
          cardClass: 'bg-red-50',
          valueClass: 'text-red-600'
        };
      case 'warning':
        return {
          cardClass: 'bg-yellow-50',
          valueClass: 'text-yellow-600'
        };
      case 'success':
        return {
          cardClass: 'bg-green-50',
          valueClass: 'text-green-600'
        };
      default:
        return {
          cardClass: 'bg-white',
          valueClass: 'text-gray-900'
        };
    }
  };
  
  const { cardClass, valueClass } = getVariantClasses();

  // Format currency for chart tooltip
  const formatChartCurrency = (value: number) => {
    return formatNumberWithAbbreviation(value, { decimals: 1 });
  };

  return (
    <TooltipProvider>
      <Card className={cn("border", cardClass, className, showChart && "overflow-hidden")}>
        <CardContent className="p-6">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium text-gray-600">{title}</p>
                {helpText && (
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="text-sm whitespace-pre-line">{helpText}</div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
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
            
            {/* Render secondary values */}
            {(secondaryValues && secondaryValues.length > 0) && (
              <div className="mt-2 pt-2 space-y-2 border-t border-gray-200">
                {secondaryValues.map((item, index) => (
                  <div key={index}>
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className={cn("text-lg font-semibold transition-all duration-500", valueClass)}>
                      {formatValue(item.value)}
                    </p>
                  </div>
                ))}
              </div>
            )}
            
            {/* Legacy: Single secondary value support */}
            {!secondaryValues && secondaryValue !== undefined && secondaryLabel && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">{secondaryLabel}</p>
                <p className={cn("text-lg font-semibold transition-all duration-500", valueClass)}>
                  {formatValue(secondaryValue)}
                </p>
              </div>
            )}
            
            {/* Bar Chart for Budget by Year */}
            {showChart && budgetsByYear && budgetsByYear.length > 0 && (
              <div className="w-full -mx-6 px-2 mt-auto pt-4">
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={budgetsByYear} margin={{ top: 0, right: 8, left: 0, bottom: 5 }}>
                    <XAxis 
                      dataKey="year" 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                      tickFormatter={(value) => {
                        return formatNumberWithAbbreviation(value, { decimals: 0 });
                      }}
                    />
                    <RechartsTooltip 
                      cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
                              <p className="text-sm font-semibold">{payload[0].payload.year}</p>
                              <p className="text-sm text-gray-600">{formatChartCurrency(payload[0].value as number)}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {budgetsByYear.map((entry, index) => {
                        const colorPalette = ['#dc2625', '#cfd0d5', '#4c5568', '#7b95a7', '#f1f4f8'];
                        return <Cell key={`cell-${index}`} fill={colorPalette[index % colorPalette.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}