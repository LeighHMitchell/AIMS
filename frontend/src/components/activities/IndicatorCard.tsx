'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Target, 
  TrendingUp, 
  Calendar,
  Pencil,
  Trash2,
  Save,
  X,
  Info,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { useIndicators, useBaselines, usePeriods } from '@/hooks/use-results';
import { 
  ResultIndicator, 
  MeasureType, 
  CreateIndicatorData,
  CreateBaselineData,
  CreatePeriodData,
  MEASURE_TYPE_LABELS,
  REFERENCE_VOCABULARIES
} from '@/types/results';
import { PeriodRow } from './PeriodRow';
import { ResultVocabularySearchableSelect } from '@/components/forms/ResultVocabularySearchableSelect';

interface IndicatorCardProps {
  indicator: ResultIndicator;
  readOnly?: boolean;
  defaultLanguage?: string;
  onUpdate?: () => void;
}

export function IndicatorCard({ 
  indicator, 
  readOnly = false, 
  defaultLanguage = 'en',
  onUpdate 
}: IndicatorCardProps) {
  const { createIndicator, updateIndicator, deleteIndicator } = useIndicators(indicator.result_id);
  const { upsertBaseline, deleteBaseline } = useBaselines();
  const { createPeriod } = usePeriods();

  // Local state
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [showBaselineForm, setShowBaselineForm] = useState(false);

  // Form state for editing indicator
  const [editForm, setEditForm] = useState({
    title: indicator.title,
    description: indicator.description || {},
    measure: indicator.measure,
    ascending: indicator.ascending,
    aggregation_status: indicator.aggregation_status,
    reference_vocab: indicator.reference_vocab || '',
    reference_code: indicator.reference_code || '',
    reference_uri: indicator.reference_uri || ''
  });

  // Form state for new period
  const [newPeriod, setNewPeriod] = useState<Partial<CreatePeriodData>>({
    indicator_id: indicator.id,
    period_start: '',
    period_end: '',
    target_value: undefined,
    actual_value: undefined,
    target_comment: '',
    actual_comment: '',
    facet: 'Total'
  });

  // Form state for baseline
  const [baselineForm, setBaselineForm] = useState({
    baseline_year: indicator.baseline?.baseline_year || new Date().getFullYear(),
    iso_date: indicator.baseline?.iso_date || '',
    value: indicator.baseline?.value || undefined,
    comment: indicator.baseline?.comment || ''
  });

  // Handle saving indicator changes
  const handleSaveIndicator = async () => {
    const success = await updateIndicator(indicator.id, editForm);
    if (success) {
      setIsEditing(false);
      onUpdate?.();
    }
  };

  // Handle deleting indicator
  const handleDeleteIndicator = async () => {
    if (window.confirm('Are you sure you want to delete this indicator? This will also delete all its periods and baseline data.')) {
      const success = await deleteIndicator(indicator.id);
      if (success) {
        onUpdate?.();
      }
    }
  };

  // Handle creating new period
  const handleCreatePeriod = async () => {
    if (!newPeriod.period_start || !newPeriod.period_end) {
      return;
    }

    const success = await createPeriod(newPeriod as CreatePeriodData);
    if (success) {
      setNewPeriod({
        indicator_id: indicator.id,
        period_start: '',
        period_end: '',
        target_value: undefined,
        actual_value: undefined,
        target_comment: '',
        actual_comment: '',
        facet: 'Total'
      });
      setShowAddPeriod(false);
      onUpdate?.();
    }
  };

  // Handle saving baseline
  const handleSaveBaseline = async () => {
    const baselineData: CreateBaselineData = {
      indicator_id: indicator.id,
      baseline_year: baselineForm.baseline_year,
      iso_date: baselineForm.iso_date || undefined,
      value: baselineForm.value,
      comment: baselineForm.comment || undefined
    };

    const success = await upsertBaseline(baselineData);
    if (success) {
      setShowBaselineForm(false);
      onUpdate?.();
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

  // Get status icon component
  const getStatusIcon = () => {
    if (!indicator.status) {
      return <Clock className="h-4 w-4 text-gray-400" />;
    }

    switch (indicator.status.color) {
      case 'green':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'yellow':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'red':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="border border-gray-200 bg-white">
      <Collapsible open={true}>
          <CardHeader className="hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon()}
                    <Badge variant="outline" className="text-xs text-gray-800">
                      {MEASURE_TYPE_LABELS[indicator.measure]}
                    </Badge>
                    {indicator.ascending && (
                      <Badge variant="secondary" className="text-xs">
                        Ascending
                      </Badge>
                    )}
                    <span className="text-xs text-gray-500">
                      {indicator.periods?.length || 0} periods
                    </span>
                  </div>
                  
                  <CardTitle className="text-sm">
                    {indicator.title[defaultLanguage] || Object.values(indicator.title)[0]}
                  </CardTitle>
                  
                  {indicator.description && (
                    <p className="text-xs text-gray-600 mt-1">
                      {indicator.description[defaultLanguage] || Object.values(indicator.description)[0]}
                    </p>
                  )}
                  
                  {/* Progress bar */}
                  {indicator.status && indicator.status.percentage > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>Progress: {indicator.status.label}</span>
                        <span>{indicator.status.percentage}%</span>
                      </div>
                      <Progress 
                        value={indicator.status.percentage} 
                        className={cn(
                          "h-1",
                          indicator.status.color === 'green' && "[&>div]:bg-gray-800",
                          indicator.status.color === 'yellow' && "[&>div]:bg-gray-500",
                          indicator.status.color === 'red' && "[&>div]:bg-gray-400"
                        )}
                      />
                    </div>
                  )}
                </div>

              {!readOnly && (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-gray-800 hover:bg-gray-100"
                  >
                    <Pencil className="h-3 w-3 text-slate-500 ring-1 ring-slate-300 rounded-sm" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={handleDeleteIndicator}
                    className="text-gray-800 hover:bg-gray-100"
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Separator className="mb-4" />

            {/* Edit Form */}
            {isEditing && !readOnly && (
              <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium">Edit Indicator</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-gray-800">
                      Measure Type
                      <HelpTextTooltip>
                        The unit or way this indicator is measured.
                      </HelpTextTooltip>
                    </Label>
                    <Select 
                      value={editForm.measure} 
                      onValueChange={(value: MeasureType) => 
                        setEditForm(prev => ({ ...prev, measure: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(MEASURE_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editForm.ascending}
                        onCheckedChange={(checked) => 
                          setEditForm(prev => ({ ...prev, ascending: checked }))
                        }
                      />
                      <Label>Ascending (higher is better)</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-gray-800">
                    Indicator Title
                    <HelpTextTooltip>
                      How you will measure this result, e.g., “% of girls completing secondary school”.
                    </HelpTextTooltip>
                  </Label>
                  <Input
                    value={editForm.title[defaultLanguage] || ''}
                    onChange={(e) => 
                      setEditForm(prev => ({
                        ...prev,
                        title: { ...prev.title, [defaultLanguage]: e.target.value }
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-gray-800">
                    Description
                    <HelpTextTooltip>
                      Brief narrative describing what this indicator captures.
                    </HelpTextTooltip>
                  </Label>
                  <Textarea
                    value={editForm.description[defaultLanguage] || ''}
                    onChange={(e) => 
                      setEditForm(prev => ({
                        ...prev,
                        description: { ...prev.description, [defaultLanguage]: e.target.value }
                      }))
                    }
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Result Vocabulary</Label>
                    <ResultVocabularySearchableSelect
                      value={editForm.reference_vocab || '99'}
                      onValueChange={(value) => 
                        setEditForm(prev => ({ ...prev, reference_vocab: value }))
                      }
                      placeholder="Select result vocabulary..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Reference Code</Label>
                    <Input
                      value={editForm.reference_code}
                      onChange={(e) => 
                        setEditForm(prev => ({ ...prev, reference_code: e.target.value }))
                      }
                      placeholder="Reference code"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={handleSaveIndicator}>
                    <Save className="h-3 w-3 mr-1" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Baseline Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  Baseline
                  <HelpTextTooltip>
                    The starting point before the project began.
                  </HelpTextTooltip>
                </h4>
                {!readOnly && !indicator.baseline && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowBaselineForm(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Baseline
                  </Button>
                )}
              </div>

              {indicator.baseline ? (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Year:</span> {indicator.baseline.baseline_year}
                    </div>
                    <div>
                      <span className="font-medium">Value:</span> {formatValue(indicator.baseline.value, indicator.measure)}
                    </div>
                    <div>
                      <span className="font-medium">Date:</span> {indicator.baseline.iso_date || '—'}
                    </div>
                    <div className="md:col-span-1">
                      {!readOnly && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setShowBaselineForm(true)}
                        >
                          <Pencil className="h-3 w-3 text-slate-500 ring-1 ring-slate-300 rounded-sm" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {indicator.baseline.comment && (
                    <p className="text-xs text-gray-600 mt-2">{indicator.baseline.comment}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No baseline set</p>
              )}

              {/* Baseline Form */}
              {showBaselineForm && !readOnly && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <h5 className="font-medium">Baseline Information</h5>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Baseline Year</Label>
                      <Input
                        type="number"
                        value={baselineForm.baseline_year}
                        onChange={(e) => 
                          setBaselineForm(prev => ({ ...prev, baseline_year: parseInt(e.target.value) }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>ISO Date</Label>
                      <Input
                        type="date"
                        value={baselineForm.iso_date}
                        onChange={(e) => 
                          setBaselineForm(prev => ({ ...prev, iso_date: e.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Baseline Value</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={baselineForm.value || ''}
                        onChange={(e) => 
                          setBaselineForm(prev => ({ ...prev, value: parseFloat(e.target.value) || undefined }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Comment</Label>
                    <Textarea
                      value={baselineForm.comment}
                      onChange={(e) => 
                        setBaselineForm(prev => ({ ...prev, comment: e.target.value }))
                      }
                      rows={2}
                      placeholder="Additional context about the baseline..."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button onClick={handleSaveBaseline}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Baseline
                    </Button>
                    <Button variant="outline" onClick={() => setShowBaselineForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Separator className="my-6" />

            {/* Periods Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  Periods & Targets
                  <HelpTextTooltip>
                    Define targets and record actuals for each reporting period.
                  </HelpTextTooltip>
                </h4>
                {!readOnly && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowAddPeriod(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Period
                  </Button>
                )}
              </div>

              {/* Add Period Form */}
              {showAddPeriod && !readOnly && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <h5 className="font-medium">Add New Period</h5>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Period Start</Label>
                      <Input
                        type="date"
                        value={newPeriod.period_start}
                        onChange={(e) => 
                          setNewPeriod(prev => ({ ...prev, period_start: e.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Period End</Label>
                      <Input
                        type="date"
                        value={newPeriod.period_end}
                        onChange={(e) => 
                          setNewPeriod(prev => ({ ...prev, period_end: e.target.value }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Target Value</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newPeriod.target_value || ''}
                        onChange={(e) => 
                          setNewPeriod(prev => ({ ...prev, target_value: parseFloat(e.target.value) || undefined }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Actual Value</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={newPeriod.actual_value || ''}
                        onChange={(e) => 
                          setNewPeriod(prev => ({ ...prev, actual_value: parseFloat(e.target.value) || undefined }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={handleCreatePeriod}
                      disabled={!newPeriod.period_start || !newPeriod.period_end}
                    >
                      Add Period
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddPeriod(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Periods Table */}
              {indicator.periods && indicator.periods.length > 0 ? (
                <div className="space-y-2">
                  {/* Table Header */}
                  <div className="grid grid-cols-6 gap-2 text-xs font-medium text-gray-600 px-3 py-2 bg-gray-100 rounded-lg">
                    <div>FACET</div>
                    <div>BASELINE</div>
                    <div>TARGET</div>
                    <div>ACTUAL</div>
                    <div>%</div>
                    <div>PERIOD</div>
                  </div>
                  
                  {/* Period Rows */}
                  {indicator.periods.map((period) => (
                    <PeriodRow
                      key={period.id}
                      period={period}
                      indicator={indicator}
                      readOnly={readOnly}
                      onUpdate={onUpdate}
                    />
                  ))}

                  {/* Inline mini chart for progress over time */}
                  <div className="h-36 mt-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={indicator.periods.map(p => ({
                        date: new Date(p.period_end).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                        target: p.target_value || 0,
                        actual: p.actual_value || 0
                      }))} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                        <RechartsTooltip />
                        <Line type="monotone" dataKey="target" stroke="#9ca3af" strokeWidth={2} dot={{ r: 2 }} />
                        <Line type="monotone" dataKey="actual" stroke="#111827" strokeWidth={2} dot={{ r: 2 }} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                  <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No periods defined</p>
                  {!readOnly && (
                    <p className="text-xs text-gray-500 mt-1">
                      Add periods to track progress over time
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}