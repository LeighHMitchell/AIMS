'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Edit3, 
  Trash2, 
  Save, 
  X,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePeriods } from '@/hooks/use-results';
import { 
  IndicatorPeriod, 
  ResultIndicator, 
  MeasureType,
  UpdatePeriodData,
  STATUS_THRESHOLDS
} from '@/types/results';
import { Progress } from '@/components/ui/progress';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';

interface PeriodRowEnhancedProps {
  period: IndicatorPeriod;
  indicator: ResultIndicator;
  readOnly?: boolean;
  onUpdate?: () => void;
}

export function PeriodRowEnhanced({ 
  period, 
  indicator, 
  readOnly = false, 
  onUpdate 
}: PeriodRowEnhancedProps) {
  const { updatePeriod, deletePeriod } = usePeriods();

  // Local state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    target_value: period.target_value,
    actual_value: period.actual_value,
    target_comment: period.target_comment || '',
    actual_comment: period.actual_comment || '',
    facet: period.facet
  });

  // Handle saving period changes
  const handleSavePeriod = async () => {
    const success = await updatePeriod(period.id, editForm);
    if (success) {
      setIsEditing(false);
      onUpdate?.();
    }
  };

  // Handle deleting period
  const handleDeletePeriod = async () => {
    if (window.confirm('Are you sure you want to delete this period?')) {
      const success = await deletePeriod(period.id);
      if (success) {
        onUpdate?.();
      }
    }
  };

  // Format value based on measure type
  const formatValue = (value: number | undefined, measure: MeasureType): string => {
    if (value === undefined || value === null) return '—';
    
    switch (measure) {
      case 'percentage':
        return `${value}%`;
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'unit':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  // Calculate achievement percentage
  const calculateAchievementRate = (): number => {
    const target = period.target_value;
    const actual = period.actual_value;
    
    if (!target || target === 0) return 0;
    
    // For descending indicators, invert the calculation
    if (!indicator.ascending) {
      if (!actual || actual === 0) return 100;
      return Math.round((target / actual) * 100);
    }
    
    return Math.round((actual || 0) / target * 100);
  };

  // Get status based on achievement rate - monochrome
  const getStatus = () => {
    const rate = calculateAchievementRate();
    
    if (!period.actual_value) {
      return { color: 'gray', label: 'Not reported', icon: Clock };
    }
    
    if (rate >= STATUS_THRESHOLDS.GREEN) {
      return { color: 'gray-900', label: 'On track', icon: CheckCircle2 };
    } else if (rate >= STATUS_THRESHOLDS.YELLOW) {
      return { color: 'gray-600', label: 'Needs attention', icon: AlertCircle };
    } else {
      return { color: 'gray-500', label: 'Off track', icon: XCircle };
    }
  };

  // Calculate progress from baseline
  const calculateProgressFromBaseline = () => {
    if (!indicator.baseline?.value || !period.actual_value) return null;
    
    const baseline = indicator.baseline.value;
    const current = period.actual_value;
    const change = current - baseline;
    const percentChange = (change / baseline) * 100;
    
    return {
      change,
      percentChange,
      isPositive: indicator.ascending ? change > 0 : change < 0
    };
  };

  const status = getStatus();
  const progress = calculateProgressFromBaseline();
  const achievementRate = calculateAchievementRate();

  // Format date range
  const formatDateRange = () => {
    const start = new Date(period.period_start).toLocaleDateString('en-US', { 
      month: 'short', 
      year: '2-digit' 
    });
    const end = new Date(period.period_end).toLocaleDateString('en-US', { 
      month: 'short', 
      year: '2-digit' 
    });
    return `${start} - ${end}`;
  };

  // Edit mode
  if (isEditing && !readOnly) {
    return (
      <div className="grid grid-cols-6 gap-2 items-center px-3 py-2 bg-gray-100 rounded-lg border border-gray-300">
        {/* Facet */}
        <div className="text-xs font-medium">
          {period.facet}
        </div>

        {/* Start Value (Baseline) - Read only */}
        <div className="text-xs text-gray-600">
          {indicator.baseline ? formatValue(indicator.baseline.value, indicator.measure) : '—'}
        </div>

        {/* Target */}
        <div className="space-y-1">
          <Input
            type="number"
            step="any"
            value={editForm.target_value ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              setEditForm(prev => ({ 
                ...prev, 
                target_value: value === '' ? undefined : parseFloat(value) 
              }));
            }}
            className="h-7 text-xs"
            placeholder="Target"
          />
          <Input
            value={editForm.target_comment}
            onChange={(e) => 
              setEditForm(prev => ({ ...prev, target_comment: e.target.value }))
            }
            className="h-6 text-xs"
            placeholder="Comment"
          />
        </div>

        {/* Actual/Current */}
        <div className="space-y-1">
          <Input
            type="number"
            step="any"
            value={editForm.actual_value ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              setEditForm(prev => ({ 
                ...prev, 
                actual_value: value === '' ? undefined : parseFloat(value) 
              }));
            }}
            className="h-7 text-xs"
            placeholder="Current"
          />
          <Input
            value={editForm.actual_comment}
            onChange={(e) => 
              setEditForm(prev => ({ ...prev, actual_comment: e.target.value }))
            }
            className="h-6 text-xs"
            placeholder="Comment"
          />
        </div>

        {/* Achievement % - Auto calculated */}
        <div className="text-xs">
          {editForm.target_value && editForm.actual_value 
            ? `${Math.round((editForm.actual_value / editForm.target_value) * 100)}%`
            : '—'
          }
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button 
            size="sm" 
            onClick={handleSavePeriod}
            className="h-7 px-2"
          >
            <Save className="h-3 w-3 mr-1" />
            Save
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setIsEditing(false)}
            className="h-7 px-2"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // View mode
  return (
    <div className={cn(
      "grid grid-cols-6 gap-2 items-center px-3 py-3 rounded-lg hover:bg-gray-50 transition-all group",
      status.color === 'gray-900' && "bg-gray-100 border border-gray-300 hover:bg-gray-200",
      status.color === 'gray-600' && "bg-gray-50 border border-gray-200 hover:bg-gray-100", 
      status.color === 'gray-500' && "bg-gray-50 border border-gray-200 hover:bg-gray-100",
      status.color === 'gray' && "bg-gray-50 border border-gray-200"
    )}>
      {/* Facet */}
      <div className="text-xs font-medium">
        {period.facet}
      </div>

      {/* Start Value (Baseline) */}
      <div className="text-xs">
        <div className="font-medium text-gray-700">
          {indicator.baseline ? formatValue(indicator.baseline.value, indicator.measure) : '—'}
        </div>
        {indicator.baseline && (
          <div className="text-gray-500">Baseline</div>
        )}
      </div>

      {/* Target */}
      <div className="text-xs">
        <div className="font-medium text-gray-900">
          {formatValue(period.target_value, indicator.measure)}
        </div>
        {period.target_comment && (
          <div className="text-gray-500 truncate" title={period.target_comment}>
            {period.target_comment}
          </div>
        )}
      </div>

      {/* Current */}
      <div className="text-xs">
        <div className="font-medium text-gray-900 flex items-center gap-1">
          {formatValue(period.actual_value, indicator.measure)}
          {progress && (
            <>
              {progress.isPositive ? (
                <TrendingUp className="h-3 w-3 text-gray-700" />
              ) : (
                <TrendingDown className="h-3 w-3 text-gray-500" />
              )}
            </>
          )}
        </div>
        {period.actual_comment && (
          <div className="text-gray-500 truncate" title={period.actual_comment}>
            {period.actual_comment}
          </div>
        )}
        {progress && (
          <HelpTextTooltip>
            <div className={cn(
              "text-xs",
              progress.isPositive ? "text-gray-700" : "text-gray-600"
            )}>
              {progress.isPositive ? '+' : ''}{progress.percentChange.toFixed(1)}% from baseline
            </div>
          </HelpTextTooltip>
        )}
      </div>

      {/* Achievement Percentage */}
      <div className="flex flex-col items-start gap-1">
        <div className="flex items-center gap-2">
            {React.createElement(status.icon, { 
              className: cn(
                "h-4 w-4",
                status.color === 'gray-900' && "text-gray-900",
                status.color === 'gray-600' && "text-gray-600",
                status.color === 'gray-500' && "text-gray-500",
                status.color === 'gray' && "text-gray-400"
              )
            })}
            <span className={cn(
              "text-xs font-medium",
              status.color === 'gray-900' && "text-gray-900",
              status.color === 'gray-600' && "text-gray-700",
              status.color === 'gray-500' && "text-gray-600",
              status.color === 'gray' && "text-gray-500"
            )}>
              {achievementRate > 0 ? `${achievementRate}%` : '—'}
            </span>
          </div>
        <Progress 
          value={achievementRate} 
          className={cn(
            "h-1 w-full",
            status.color === 'gray-900' && "[&>div]:bg-gray-900",
            status.color === 'gray-600' && "[&>div]:bg-gray-600",
            status.color === 'gray-500' && "[&>div]:bg-gray-400",
            status.color === 'gray' && "[&>div]:bg-gray-300"
          )}
        />
        <span className={cn(
          "text-xs",
          status.color === 'gray-900' && "text-gray-700",
          status.color === 'gray-600' && "text-gray-600",
          status.color === 'gray-500' && "text-gray-500",
          status.color === 'gray' && "text-gray-400"
        )}>
          {status.label}
        </span>
      </div>

      {/* Period */}
      <div className="flex items-center justify-between">
        <div className="text-xs">
          <div className="font-medium text-gray-700">
            {formatDateRange()}
          </div>
          <div className="text-gray-500">
            {Math.ceil((new Date(period.period_end).getTime() - new Date(period.period_start).getTime()) / (1000 * 60 * 60 * 24 * 30))} months
          </div>
        </div>
        
        {!readOnly && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-6 w-6 p-0"
            >
              <Edit3 className="h-3 w-3" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleDeletePeriod}
              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
