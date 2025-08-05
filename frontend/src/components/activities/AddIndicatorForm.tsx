'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { MEASURE_TYPE_LABELS, MeasureType } from '@/types/results';

interface AddIndicatorFormProps {
  resultId: string;
  activityId: string;
  defaultLanguage?: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export function AddIndicatorForm({ 
  resultId,
  activityId, 
  defaultLanguage = 'en', 
  onCancel, 
  onSuccess 
}: AddIndicatorFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: { [defaultLanguage]: '' },
    description: { [defaultLanguage]: '' },
    measure: 'unit' as MeasureType,
    ascending: true,
    aggregation_status: false,
    reference_vocab: '',
    reference_code: '',
    reference_uri: ''
  });

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.title[defaultLanguage]?.trim()) {
      toast.error('Please provide an indicator title');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/activities/${activityId}/results/${resultId}/indicators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          measure: formData.measure,
          ascending: formData.ascending,
          aggregation_status: formData.aggregation_status,
          reference_vocab: formData.reference_vocab || null,
          reference_code: formData.reference_code || null,
          reference_uri: formData.reference_uri || null
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Failed to create indicator');
      }

      toast.success('Indicator created successfully');
      onSuccess();
    } catch (error) {
      console.error('[AddIndicatorForm] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create indicator');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Add New Indicator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="indicator-title">Indicator Title *</Label>
          <Input
            id="indicator-title"
            value={formData.title[defaultLanguage]}
            onChange={(e) => 
              setFormData(prev => ({
                ...prev,
                title: { ...prev.title, [defaultLanguage]: e.target.value }
              }))
            }
            placeholder="e.g., Number of people trained"
            className="w-full"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="indicator-description">Description</Label>
          <Textarea
            id="indicator-description"
            value={formData.description[defaultLanguage]}
            onChange={(e) => 
              setFormData(prev => ({
                ...prev,
                description: { ...prev.description, [defaultLanguage]: e.target.value }
              }))
            }
            placeholder="Describe what this indicator measures..."
            rows={2}
            className="w-full"
          />
        </div>

        {/* Settings Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Measure Type */}
          <div className="space-y-2">
            <Label htmlFor="measure-type">Measure Type</Label>
            <Select 
              value={formData.measure} 
              onValueChange={(value: MeasureType) => 
                setFormData(prev => ({ ...prev, measure: value }))
              }
            >
              <SelectTrigger id="measure-type">
                <SelectValue placeholder="Select measure type" />
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

          {/* Switches */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="ascending"
                checked={formData.ascending}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, ascending: checked }))
                }
              />
              <Label htmlFor="ascending" className="text-sm">
                Ascending (higher is better)
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="aggregation-status"
                checked={formData.aggregation_status}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, aggregation_status: checked }))
                }
              />
              <Label htmlFor="aggregation-status" className="text-sm">
                Aggregation Status
              </Label>
            </div>
          </div>
        </div>

        {/* Reference Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="reference-vocab">Reference Vocabulary</Label>
            <Input
              id="reference-vocab"
              value={formData.reference_vocab}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, reference_vocab: e.target.value }))
              }
              placeholder="e.g., 1, 99"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-code">Reference Code</Label>
            <Input
              id="reference-code"
              value={formData.reference_code}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, reference_code: e.target.value }))
              }
              placeholder="Reference code"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference-uri">Reference URI</Label>
            <Input
              id="reference-uri"
              value={formData.reference_uri}
              onChange={(e) => 
                setFormData(prev => ({ ...prev, reference_uri: e.target.value }))
              }
              placeholder="http://..."
              className="w-full"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4">
          <Button 
            onClick={handleSubmit}
            disabled={loading || !formData.title[defaultLanguage]?.trim()}
            className="flex items-center gap-2"
          >
            <Save className="h-3 w-3" />
            {loading ? 'Creating...' : 'Create Indicator'}
          </Button>
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <X className="h-3 w-3" />
            Cancel
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
          <p><strong>Tip:</strong> After creating the indicator, you can add a baseline and define periods with targets and actual values to track progress over time.</p>
        </div>
      </CardContent>
    </Card>
  );
}