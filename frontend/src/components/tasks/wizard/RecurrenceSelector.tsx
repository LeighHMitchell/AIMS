'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Repeat, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { CreateRecurrenceRequest, RecurrenceFrequency } from '@/types/task';
import {
  previewOccurrences,
  formatRecurrenceRule,
  getRecurrencePresets,
} from '@/lib/recurrence-utils';

interface RecurrenceSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: CreateRecurrenceRequest | null;
  onChange: (value: CreateRecurrenceRequest | null) => void;
}

const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const WEEKDAYS = [
  { value: 'MO', label: 'Mon' },
  { value: 'TU', label: 'Tue' },
  { value: 'WE', label: 'Wed' },
  { value: 'TH', label: 'Thu' },
  { value: 'FR', label: 'Fri' },
  { value: 'SA', label: 'Sat' },
  { value: 'SU', label: 'Sun' },
];

const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: i + 1,
  label: String(i + 1),
}));
MONTH_DAYS.push({ value: -1, label: 'Last day' });

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export function RecurrenceSelector({
  open,
  onOpenChange,
  value,
  onChange,
}: RecurrenceSelectorProps) {
  const [formData, setFormData] = useState<CreateRecurrenceRequest>({
    frequency: 'weekly',
    interval: 1,
  });

  const [endType, setEndType] = useState<'never' | 'count' | 'date'>('never');

  // Initialize form data when opening
  useEffect(() => {
    if (open && value) {
      setFormData(value);
      if (value.count) {
        setEndType('count');
      } else if (value.end_date) {
        setEndType('date');
      } else {
        setEndType('never');
      }
    } else if (open) {
      setFormData({ frequency: 'weekly', interval: 1 });
      setEndType('never');
    }
  }, [open, value]);

  const updateFormData = (updates: Partial<CreateRecurrenceRequest>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const toggleWeekday = (day: string) => {
    const current = formData.by_weekday || [];
    const index = current.indexOf(day);
    if (index === -1) {
      updateFormData({ by_weekday: [...current, day] });
    } else {
      updateFormData({ by_weekday: current.filter((d) => d !== day) });
    }
  };

  const handleSave = () => {
    const result: CreateRecurrenceRequest = {
      frequency: formData.frequency,
      interval: formData.interval || 1,
    };

    // Add weekday constraints for weekly
    if (formData.frequency === 'weekly' && formData.by_weekday?.length) {
      result.by_weekday = formData.by_weekday;
    }

    // Add day of month for monthly/quarterly/yearly
    if (['monthly', 'quarterly', 'yearly'].includes(formData.frequency) && formData.by_month_day?.length) {
      result.by_month_day = formData.by_month_day;
    }

    // Add month for yearly
    if (formData.frequency === 'yearly' && formData.by_month?.length) {
      result.by_month = formData.by_month;
    }

    // Add end condition
    if (endType === 'count' && formData.count) {
      result.count = formData.count;
    } else if (endType === 'date' && formData.end_date) {
      result.end_date = formData.end_date;
    }

    // Add generation time
    if (formData.generation_time) {
      result.generation_time = formData.generation_time;
    }

    onChange(result);
    onOpenChange(false);
  };

  const handleClear = () => {
    onChange(null);
    onOpenChange(false);
  };

  const presets = getRecurrencePresets();
  const preview = previewOccurrences(formData, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Configure Recurrence
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quick Presets */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              {presets.slice(0, 5).map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormData(preset.value);
                    setEndType('never');
                  }}
                  className={cn(
                    formatRecurrenceRule(formData) === formatRecurrenceRule(preset.value) &&
                      'border-primary bg-primary/5'
                  )}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Frequency</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) =>
                  updateFormData({
                    frequency: value as RecurrenceFrequency,
                    by_weekday: undefined,
                    by_month_day: undefined,
                    by_month: undefined,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((freq) => (
                    <SelectItem key={freq.value} value={freq.value}>
                      {freq.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Every</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={formData.interval || 1}
                  onChange={(e) => updateFormData({ interval: parseInt(e.target.value) || 1 })}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  {formData.frequency === 'daily' && 'day(s)'}
                  {formData.frequency === 'weekly' && 'week(s)'}
                  {formData.frequency === 'monthly' && 'month(s)'}
                  {formData.frequency === 'quarterly' && 'quarter(s)'}
                  {formData.frequency === 'yearly' && 'year(s)'}
                </span>
              </div>
            </div>
          </div>

          {/* Weekly: Day of Week */}
          {formData.frequency === 'weekly' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">On these days</Label>
              <div className="flex gap-1">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWeekday(day.value)}
                    className={cn(
                      'flex-1 py-2 px-1 rounded text-sm font-medium transition-colors',
                      formData.by_weekday?.includes(day.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monthly/Quarterly: Day of Month */}
          {['monthly', 'quarterly'].includes(formData.frequency) && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">On day</Label>
              <Select
                value={String(formData.by_month_day?.[0] || '')}
                onValueChange={(value) =>
                  updateFormData({ by_month_day: value ? [parseInt(value)] : undefined })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_DAYS.map((day) => (
                    <SelectItem key={day.value} value={String(day.value)}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Yearly: Month and Day */}
          {formData.frequency === 'yearly' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Month</Label>
                <Select
                  value={String(formData.by_month?.[0] || '')}
                  onValueChange={(value) =>
                    updateFormData({ by_month: value ? [parseInt(value)] : undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={String(month.value)}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Day</Label>
                <Select
                  value={String(formData.by_month_day?.[0] || '')}
                  onValueChange={(value) =>
                    updateFormData({ by_month_day: value ? [parseInt(value)] : undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_DAYS.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Generation Time */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Time of Day
            </Label>
            <Input
              type="time"
              value={formData.generation_time || '09:00'}
              onChange={(e) => updateFormData({ generation_time: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Tasks will be generated at this time
            </p>
          </div>

          {/* End Condition */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Ends</Label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={endType === 'never'}
                  onCheckedChange={() => {
                    setEndType('never');
                    updateFormData({ count: undefined, end_date: undefined });
                  }}
                />
                <span className="text-sm">Never</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={endType === 'count'}
                  onCheckedChange={() => {
                    setEndType('count');
                    updateFormData({ end_date: undefined });
                  }}
                />
                <span className="text-sm">After</span>
                {endType === 'count' && (
                  <Input
                    type="number"
                    min={1}
                    max={999}
                    value={formData.count || 10}
                    onChange={(e) => updateFormData({ count: parseInt(e.target.value) || 10 })}
                    className="w-20 h-8"
                  />
                )}
                <span className="text-sm">occurrences</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={endType === 'date'}
                  onCheckedChange={() => {
                    setEndType('date');
                    updateFormData({ count: undefined });
                  }}
                />
                <span className="text-sm">On date</span>
                {endType === 'date' && (
                  <Input
                    type="date"
                    value={formData.end_date || ''}
                    onChange={(e) => updateFormData({ end_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-40 h-8"
                  />
                )}
              </label>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Preview</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {formatRecurrenceRule(formData)}
            </p>
            {preview.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Next dates: </span>
                {preview.map((date, i) => (
                  <span key={i}>
                    {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    {i < preview.length - 1 && ', '}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" />Save Recurrence</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
