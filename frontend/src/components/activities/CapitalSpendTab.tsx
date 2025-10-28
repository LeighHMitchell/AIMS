'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Info, AlertCircle, ChevronDown, Building2, Repeat } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CapitalSpendTabProps {
  activityId: string;
  readOnly?: boolean;
  onCapitalSpendChange?: (percentage: number | null) => void;
}

// Donut chart component for capital spend breakdown
function CapitalSpendDonutChart({ capitalPercentage }: { capitalPercentage: number | null }) {
  if (capitalPercentage === null || capitalPercentage === undefined) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <Building2 className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Enter capital spend percentage to view breakdown</p>
        </div>
      </div>
    );
  }

  const recurrentPercentage = 100 - capitalPercentage;
  
  const data = [
    {
      name: 'Capital Spend',
      value: capitalPercentage,
      color: '#3b82f6', // blue-500
      description: 'Fixed assets, infrastructure'
    },
    {
      name: 'Recurrent Spend',
      value: recurrentPercentage,
      color: '#64748b', // slate-500
      description: 'Operational, running costs'
    }
  ].sort((a, b) => b.value - a.value); // Sort by value descending (largest first)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">{data.value.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            label={({ value }) => `${value.toFixed(1)}%`}
            labelLine={false}
            startAngle={90}
            endAngle={450}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="circle"
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '12px',
              color: '#64748b'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CapitalSpendTab({ activityId, readOnly = false, onCapitalSpendChange }: CapitalSpendTabProps) {
  const [capitalSpend, setCapitalSpend] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);

  // Load current value
  useEffect(() => {
    async function loadCapitalSpend() {
      try {
        const { data, error } = await supabase
          .from('activities')
          .select('capital_spend_percentage')
          .eq('id', activityId)
          .single();

        if (error) throw error;

        const value = data?.capital_spend_percentage;
        if (value !== null && value !== undefined) {
          setCapitalSpend(value.toString());
          // Notify parent component for tab completion (after state is set)
          setTimeout(() => onCapitalSpendChange?.(value), 0);
        } else {
          // No value in database, notify parent with null
          setTimeout(() => onCapitalSpendChange?.(null), 0);
        }
      } catch (err) {
        console.error('Error loading capital spend:', err);
        toast.error('Failed to load capital spend data');
      } finally {
        setLoading(false);
      }
    }

    loadCapitalSpend();
  }, [activityId]); // Removed onCapitalSpendChange from deps to prevent re-runs

  // Validate and save
  const handleSave = async (value: string) => {
    if (readOnly) return;

    setError(null);
    setSaved(false);

    // Handle empty value
    if (value.trim() === '') {
      try {
        setSaving(true);
        const { error } = await supabase
          .from('activities')
          .update({ capital_spend_percentage: null })
          .eq('id', activityId);

        if (error) throw error;

        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        onCapitalSpendChange?.(null); // Notify parent
      } catch (err) {
        console.error('Error saving capital spend:', err);
        setError('Failed to save. Please try again.');
        toast.error('Failed to save capital spend');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Validate numeric value
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setError('Please enter a valid number');
      return;
    }

    // Validate range
    if (numValue < 0 || numValue > 100) {
      setError('Value must be between 0 and 100');
      return;
    }

    // Round to 2 decimal places for consistency with DECIMAL(5,2)
    const roundedValue = Math.round(numValue * 100) / 100;

    // Save to database
    try {
      setSaving(true);
      const { error } = await supabase
        .from('activities')
        .update({ capital_spend_percentage: roundedValue })
        .eq('id', activityId);

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onCapitalSpendChange?.(roundedValue); // Notify parent
    } catch (err) {
      console.error('Error saving capital spend:', err);
      setError('Failed to save. Please try again.');
      toast.error('Failed to save capital spend');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCapitalSpend(e.target.value);
    setError(null);
  };

  const handleBlur = () => {
    handleSave(capitalSpend);
  };

  // Calculate recurrent spend (complement to capital spend)
  const recurrentSpend = capitalSpend && !isNaN(parseFloat(capitalSpend)) 
    ? (100 - parseFloat(capitalSpend)).toFixed(2)
    : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column - Input form */}
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-4 pt-4">
              {/* Capital Spend Input */}
              <div className="space-y-2">
                <Label htmlFor="capital-spend" className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-600" />
                  Capital Spend Percentage
                </Label>
                <div className="relative max-w-xs">
                  <Input
                    id="capital-spend"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={capitalSpend}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="e.g., 25.5"
                    disabled={readOnly || saving}
                    className={cn(
                      "pr-10",
                      error && "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    %
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Fixed assets, infrastructure
                </p>
              </div>

              {/* Recurrent Spend Display */}
              <div className="space-y-2">
                <Label htmlFor="recurrent-spend" className="text-base flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-gray-600" />
                  Recurrent Spend Percentage
                </Label>
                <div className="relative max-w-xs">
                  <Input
                    id="recurrent-spend"
                    type="text"
                    value={recurrentSpend}
                    disabled
                    className="pr-10 bg-gray-50"
                    placeholder="Auto-calculated"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    %
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Operational, running costs
                </p>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Collapsible open={showExamples} onOpenChange={setShowExamples} className="pt-4">
              <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  showExamples && "rotate-180"
                )} />
                Examples by Project Type
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside ml-4">
                  <li>Infrastructure projects (roads, buildings): typically 80-100% capital</li>
                  <li>Equipment procurement: typically 60-90% capital</li>
                  <li>Training programs: typically 0-10% capital</li>
                  <li>Service delivery programs: typically 10-30% capital</li>
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Right column - Donut chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">
              Capital Spend Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CapitalSpendDonutChart 
              capitalPercentage={capitalSpend && !isNaN(parseFloat(capitalSpend)) ? parseFloat(capitalSpend) : null} 
            />
          </CardContent>
        </Card>
      </div>

      {readOnly && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to edit this field. Contact an administrator if changes are needed.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

