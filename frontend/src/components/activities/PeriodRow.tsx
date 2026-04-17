'use client';

import React, { useState } from 'react';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Pencil,
  Trash2, 
  Save, 
  X,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock
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

interface PeriodRowProps {
  period: IndicatorPeriod;
  indicator: ResultIndicator;
  readOnly?: boolean;
  onUpdate?: () => void;
}

export function PeriodRow({ 
  period, 
  indicator, 
  readOnly = false, 
  onUpdate 
}: PeriodRowProps) {
  const { updatePeriod, deletePeriod } = usePeriods();
  const { confirm, ConfirmDialog } = useConfirmDialog();

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
    if (await confirm({ title: 'Delete this period?', description: 'This action cannot be undone. The period and all its data will be permanently removed.', confirmLabel: 'Delete', cancelLabel: 'Cancel' })) {
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
    return Math.round((actual || 0) / target * 100);
  };

  // Get status based on achievement rate
  const getStatus = () => {
    const rate = calculateAchievementRate();
    
    if (rate === 0) {
      return { color: 'gray', icon: Clock, label: 'No progress' };
    } else if (rate >= STATUS_THRESHOLDS.GREEN) {
      return { color: 'green', icon: CheckCircle, label: 'On track' };
    } else if (rate >= STATUS_THRESHOLDS.YELLOW) {
      return { color: 'yellow', icon: AlertCircle, label: 'Attention needed' };
    } else {
      return { color: 'red', icon: XCircle, label: 'Off track' };
    }
  };

  // Format date range
  const formatDateRange = (start: string, end: string): string => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    const formatOptions: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric',
      year: startDate.getFullYear() !== endDate.getFullYear() ? 'numeric' : undefined
    };
    
    const startFormatted = startDate.toLocaleDateString('en-US', formatOptions);
    const endFormatted = endDate.toLocaleDateString('en-US', formatOptions);
    
    return `${startFormatted} – ${endFormatted}`;
  };

  const status = getStatus();
  const StatusIcon = status.icon;
  const achievementRate = calculateAchievementRate();

  if (isEditing && !readOnly) {
    // Edit mode
    return (
      <div className="grid grid-cols-6 gap-2 items-center px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
        {/* Facet */}
        <div>
          <Input
            value={editForm.facet}
            onChange={(e) => setEditForm(prev => ({ ...prev, facet: e.target.value }))}
            className="h-8 text-xs"
            placeholder="Total"
          />
        </div>

        {/* Baseline (read-only) */}
        <div className="text-xs text-muted-foreground">
          {indicator.baseline ? formatValue(indicator.baseline.value, indicator.measure) : '—'}
        </div>

        {/* Target */}
        <div>
          <Input
            type="number"
            step="0.01"
            value={editForm.target_value || ''}
            onChange={(e) => setEditForm(prev => ({ 
              ...prev, 
              target_value: parseFloat(e.target.value) || undefined 
            }))}
            className="h-8 text-xs"
            placeholder="0"
          />
        </div>

        {/* Actual */}
        <div>
          <Input
            type="number"
            step="0.01"
            value={editForm.actual_value || ''}
            onChange={(e) => setEditForm(prev => ({ 
              ...prev, 
              actual_value: parseFloat(e.target.value) || undefined 
            }))}
            className="h-8 text-xs"
            placeholder="0"
          />
        </div>

        {/* Percentage (calculated) */}
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
            className="h-6 w-6 p-0"
          >
            <Save className="h-3 w-3" />
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setIsEditing(false)}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  // View mode
  return (
    <>
    <div className={cn(
      "grid grid-cols-6 gap-2 items-center px-3 py-2 rounded-lg hover:bg-muted transition-colors",
      status.color === 'green' && "bg-green-50 border border-green-200",
      status.color === 'yellow' && "bg-yellow-50 border border-yellow-200", 
      status.color === 'red' && "bg-destructive/10 border border-red-200",
      status.color === 'gray' && "bg-muted border border-border"
    )}>
      {/* Facet */}
      <div className="text-xs font-medium">
        {period.facet}
      </div>

      {/* Baseline */}
      <div className="text-xs text-muted-foreground">
        {indicator.baseline ? formatValue(indicator.baseline.value, indicator.measure) : '—'}
      </div>

      {/* Target */}
      <div className="text-xs">
        <div className="font-medium">
          {formatValue(period.target_value, indicator.measure)}
        </div>
        {period.target_comment && (
          <div className="text-muted-foreground truncate" title={period.target_comment}>
            {period.target_comment}
          </div>
        )}
      </div>

      {/* Actual */}
      <div className="text-xs">
        <div className="font-medium">
          {formatValue(period.actual_value, indicator.measure)}
        </div>
        {period.actual_comment && (
          <div className="text-muted-foreground truncate" title={period.actual_comment}>
            {period.actual_comment}
          </div>
        )}
      </div>

      {/* Achievement Percentage */}
      <div className="flex items-center gap-1">
        <StatusIcon className={cn(
          "h-3 w-3",
          status.color === 'green' && "text-[hsl(var(--success-icon))]",
          status.color === 'yellow' && "text-yellow-600",
          status.color === 'red' && "text-destructive",
          status.color === 'gray' && "text-muted-foreground"
        )} />
        <span className={cn(
          "text-xs font-medium",
          status.color === 'green' && "text-green-700",
          status.color === 'yellow' && "text-yellow-700",
          status.color === 'red' && "text-destructive",
          status.color === 'gray' && "text-muted-foreground"
        )}>
          {achievementRate > 0 ? `${achievementRate}%` : '—'}
        </span>
      </div>

      {/* Period & Actions */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {formatDateRange(period.period_start, period.period_end)}
        </div>
        
        {!readOnly && (
          <div className="flex items-center gap-1">
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={handleDeletePeriod}
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        )}
      </div>
    </div>
    <ConfirmDialog />
    </>
  );
}