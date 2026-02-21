'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { MEASURE_TYPE_LABELS, MeasureType, REFERENCE_VOCABULARIES } from '@/types/results';
import { MeasureTypeSearchableSelect } from '@/components/forms/MeasureTypeSearchableSelect';
import { ResultVocabularySearchableSelect } from '@/components/forms/ResultVocabularySearchableSelect';
import { apiFetch } from '@/lib/api-fetch';

interface AddIndicatorFormProps {
  open: boolean;
  resultId: string;
  activityId: string;
  defaultLanguage?: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export function AddIndicatorForm({
  open,
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
    measure: '1' as string, // Default to Unit (code 1)
    ascending: true,
    aggregation_status: false,
    reference_vocab: '99', // Default to Reporting Organisation
    reference_code: '',
    reference_uri: '',
    // Baseline fields
    baseline: '',
    baseline_year: '',
    baseline_iso_date: '',
    baseline_comment: ''
  });

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.title[defaultLanguage]?.trim()) {
      toast.error('Please provide an indicator title');
      return;
    }

    setLoading(true);
    try {
      const response = await apiFetch(`/api/activities/${activityId}/results/${resultId}/indicators`, {
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

      // Create baseline if provided (including 0 as a valid value)
      const parsedBaseline = parseFloat(formData.baseline);
      if (formData.baseline !== '' && !isNaN(parsedBaseline)) {
        const baselineData: any = {
          indicator_id: responseData.id,
          value: parsedBaseline
        };

        // Add baseline year if provided
        if (formData.baseline_year) {
          baselineData.baseline_year = parseInt(formData.baseline_year);
        }

        // Add baseline ISO date if provided
        if (formData.baseline_iso_date) {
          baselineData.iso_date = formData.baseline_iso_date;
        }

        // Add baseline comment if provided
        if (formData.baseline_comment) {
          baselineData.comment = { [defaultLanguage]: formData.baseline_comment };
        }

        try {
          const baselineResponse = await apiFetch(`/api/activities/${activityId}/results/${resultId}/indicators/${responseData.id}/baseline`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(baselineData),
          });

          if (!baselineResponse.ok) {
            console.warn('Baseline creation failed, but indicator was created successfully');
          }
        } catch (error) {
          console.warn('Baseline creation failed, but indicator was created successfully:', error);
        }
      }

      onSuccess();
    } catch (error) {
      console.error('[AddIndicatorForm] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create indicator');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Indicator</DialogTitle>
          <DialogDescription>
            You can set a baseline now or add it later. After creating the indicator, you can define periods with targets and actual values to track progress over time.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-10rem)]">
          <div className="space-y-4 pr-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="indicator-title">Indicator Title <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
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
                <MeasureTypeSearchableSelect
                  value={formData.measure}
                  onValueChange={(value) =>
                    setFormData(prev => ({ ...prev, measure: value }))
                  }
                  placeholder="Select measure type..."
                />
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
                <Label htmlFor="reference-vocab">Result Vocabulary</Label>
                <ResultVocabularySearchableSelect
                  value={formData.reference_vocab}
                  onValueChange={(value) =>
                    setFormData(prev => ({ ...prev, reference_vocab: value }))
                  }
                  placeholder="Select result vocabulary..."
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

            {/* Baseline Section */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-900">Baseline</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseline">Baseline Value</Label>
                  <Input
                    id="baseline"
                    type="number"
                    step="any"
                    value={formData.baseline}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, baseline: e.target.value }))
                    }
                    placeholder="e.g., 10"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baseline-year">Baseline Year</Label>
                  <Input
                    id="baseline-year"
                    type="number"
                    min="1900"
                    max="2100"
                    value={formData.baseline_year}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, baseline_year: e.target.value }))
                    }
                    placeholder="e.g., 2023"
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="baseline-date">Baseline Date</Label>
                  <Input
                    id="baseline-date"
                    type="date"
                    value={formData.baseline_iso_date}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, baseline_iso_date: e.target.value }))
                    }
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="baseline-comment">Baseline Comment</Label>
                  <Textarea
                    id="baseline-comment"
                    value={formData.baseline_comment}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, baseline_comment: e.target.value }))
                    }
                    placeholder="Additional context about the baseline..."
                    rows={2}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.title[defaultLanguage]?.trim()}
          >
            <Save className="h-3 w-3 mr-2" />
            {loading ? 'Creating...' : 'Create Indicator'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
