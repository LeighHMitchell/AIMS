'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Tag, X } from 'lucide-react';
import { useDimensions } from '@/hooks/use-results';
import { Dimension, DIMENSION_TEMPLATES } from '@/types/results';

interface DimensionsManagerProps {
  entityType: 'baseline' | 'period';
  entityId: string;
  dimensions: Dimension[];
  dimensionType?: 'target' | 'actual'; // For periods only
  onUpdate: () => void;
  readOnly?: boolean;
}

export function DimensionsManager({
  entityType,
  entityId,
  dimensions = [],
  dimensionType,
  onUpdate,
  readOnly = false
}: DimensionsManagerProps) {
  const { createDimension, deleteDimension, loading } = useDimensions();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    value: '',
    useTemplate: false
  });

  // Filter dimensions by type if specified (for periods)
  const filteredDimensions = dimensionType
    ? dimensions.filter(dim => dim.dimension_type === dimensionType)
    : dimensions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.value) {
      return;
    }

    const data = {
      name: formData.name,
      value: formData.value,
      dimension_type: dimensionType
    };

    const success = await createDimension(entityType, entityId, data);
    
    if (success) {
      setFormData({
        name: '',
        value: '',
        useTemplate: false
      });
      setShowAddForm(false);
      onUpdate();
    }
  };

  const handleDelete = async (dimensionId: string) => {
    if (window.confirm('Delete this dimension?')) {
      const success = await deleteDimension(entityType, entityId, dimensionId);
      if (success) {
        onUpdate();
      }
    }
  };

  const handleTemplateSelect = (templateName: string) => {
    setFormData(prev => ({
      ...prev,
      name: templateName,
      value: '',
      useTemplate: true
    }));
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Disaggregation Dimensions {dimensionType && `(${dimensionType})`}
        </Label>
        {!readOnly && !showAddForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(true)}
            className="text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Dimension
          </Button>
        )}
      </div>

      {/* Add Dimension Form */}
      {showAddForm && !readOnly && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded border space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">Add Dimension</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-700">Use Template (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(DIMENSION_TEMPLATES).map((template) => (
                <Button
                  key={template}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTemplateSelect(template)}
                  className={`text-xs ${formData.name === template ? 'bg-gray-200 border-gray-400' : ''}`}
                >
                  {template}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-700">Dimension Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value, useTemplate: false }))}
              placeholder="e.g., sex, age, disability"
              required
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-700">Value *</Label>
            {formData.useTemplate && formData.name && DIMENSION_TEMPLATES[formData.name as keyof typeof DIMENSION_TEMPLATES] ? (
              <Select
                value={formData.value}
                onValueChange={(value) => setFormData(prev => ({ ...prev, value }))}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select value" />
                </SelectTrigger>
                <SelectContent>
                  {DIMENSION_TEMPLATES[formData.name as keyof typeof DIMENSION_TEMPLATES].map((value) => (
                    <SelectItem key={value} value={value} className="text-sm">
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={formData.value}
                onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                placeholder="e.g., female, 18-24, urban"
                required
                className="text-sm"
              />
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="submit"
              size="sm"
              disabled={loading || !formData.name || !formData.value}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-400"
            >
              Add Dimension
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Dimensions List */}
      {filteredDimensions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filteredDimensions.map((dim) => (
            <div
              key={dim.id}
              className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border text-sm"
            >
              <Tag className="h-3 w-3 text-gray-500" />
              <span className="font-medium text-gray-700">{dim.name}:</span>
              <span className="text-gray-900">{dim.value}</span>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(dim.id)}
                  className="text-red-600 hover:text-red-800 h-5 w-5 p-0 ml-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {filteredDimensions.length === 0 && !showAddForm && (
        <p className="text-xs text-gray-500 italic">No disaggregation dimensions</p>
      )}
    </div>
  );
}

