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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Target, 
  TrendingUp, 
  BarChart3,
  Info,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResults } from '@/hooks/use-results';
import { 
  ActivityResult, 
  ResultType, 
  CreateResultData,
  RESULT_TYPE_LABELS,
  ResultsTabProps 
} from '@/types/results';
import { IndicatorCard } from './IndicatorCard';
import { AddIndicatorForm } from './AddIndicatorForm';

export function ResultsTab({ 
  activityId, 
  readOnly = false, 
  onResultsChange,
  defaultLanguage = 'en',
  className 
}: ResultsTabProps) {
  const { results, loading, error, createResult, updateResult, deleteResult, fetchResults } = useResults(activityId);
  
  // Local state
  const [showAddResult, setShowAddResult] = useState(false);
  const [expandedResults, setExpandedResults] = useState<string[]>([]);
  const [editingResult, setEditingResult] = useState<string | null>(null);
  const [showAddIndicator, setShowAddIndicator] = useState<string | null>(null);

  // Add result form state
  const [newResult, setNewResult] = useState<Partial<CreateResultData>>({
    activity_id: activityId,
    type: 'output',
    aggregation_status: false,
    title: { [defaultLanguage]: '' },
    description: { [defaultLanguage]: '' }
  });

  // Handle expanding/collapsing results
  const toggleResult = (resultId: string) => {
    setExpandedResults(prev => 
      prev.includes(resultId) 
        ? prev.filter(id => id !== resultId)
        : [...prev, resultId]
    );
  };

  // Handle creating a new result
  const handleCreateResult = async () => {
    if (!newResult.title?.[defaultLanguage]?.trim()) {
      return;
    }

    const success = await createResult(newResult as CreateResultData);
    if (success) {
      setNewResult({
        activity_id: activityId,
        type: 'output',
        aggregation_status: false,
        title: { [defaultLanguage]: '' },
        description: { [defaultLanguage]: '' }
      });
      setShowAddResult(false);
      onResultsChange?.(results);
    }
  };

  // Handle deleting a result
  const handleDeleteResult = async (resultId: string) => {
    if (window.confirm('Are you sure you want to delete this result? This will also delete all its indicators and data.')) {
      const success = await deleteResult(resultId);
      if (success) {
        onResultsChange?.(results);
      }
    }
  };

  // Get status counts for overview
  const getStatusCounts = () => {
    let onTrack = 0;
    let offTrack = 0;
    let noData = 0;
    
    results.forEach(result => {
      result.indicators?.forEach(indicator => {
        if (!indicator.status) {
          noData++;
        } else if (indicator.status.color === 'green') {
          onTrack++;
        } else if (indicator.status.color === 'red' || indicator.status.color === 'yellow') {
          offTrack++;
        } else {
          noData++;
        }
      });
    });

    return { onTrack, offTrack, noData };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Results & Indicators</h3>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Results & Indicators</h3>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load results: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Results & Indicators</h3>
          <p className="text-sm text-gray-600 mt-1">
            Track outputs, outcomes, and impact indicators for this activity
          </p>
        </div>
        {!readOnly && (
          <Button 
            onClick={() => setShowAddResult(true)} 
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Result
          </Button>
        )}
      </div>

      {/* Overview Stats */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Total Results</p>
                  <p className="text-2xl font-bold">{results.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Total Indicators</p>
                  <p className="text-2xl font-bold">
                    {results.reduce((sum, r) => sum + (r.indicators?.length || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">On Track</p>
                  <p className="text-2xl font-bold text-green-600">{statusCounts.onTrack}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Need Attention</p>
                  <p className="text-2xl font-bold text-red-600">{statusCounts.offTrack}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add New Result Form */}
      {showAddResult && !readOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add New Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="result-type">Result Type</Label>
                <Select 
                  value={newResult.type} 
                  onValueChange={(value: ResultType) => 
                    setNewResult(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger id="result-type">
                    <SelectValue placeholder="Select result type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RESULT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="aggregation-status"
                  checked={newResult.aggregation_status || false}
                  onCheckedChange={(checked) => 
                    setNewResult(prev => ({ ...prev, aggregation_status: checked }))
                  }
                />
                <Label htmlFor="aggregation-status">Aggregation Status</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="result-title">Result Title</Label>
              <Input
                id="result-title"
                value={newResult.title?.[defaultLanguage] || ''}
                onChange={(e) => 
                  setNewResult(prev => ({
                    ...prev,
                    title: { ...prev.title, [defaultLanguage]: e.target.value }
                  }))
                }
                placeholder="Enter result title..."
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="result-description">Result Description</Label>
              <Textarea
                id="result-description"
                value={newResult.description?.[defaultLanguage] || ''}
                onChange={(e) => 
                  setNewResult(prev => ({
                    ...prev,
                    description: { ...prev.description, [defaultLanguage]: e.target.value }
                  }))
                }
                placeholder="Describe what this result aims to achieve..."
                rows={3}
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button 
                onClick={handleCreateResult}
                disabled={!newResult.title?.[defaultLanguage]?.trim()}
              >
                Create Result
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAddResult(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results List */}
      {results.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Results Yet</h4>
              <p className="text-gray-600 mb-4">
                Add your first result to start tracking progress and indicators for this activity.
              </p>
              {!readOnly && (
                <Button onClick={() => setShowAddResult(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add First Result
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <Card key={result.id} className="border border-gray-200">
              <Collapsible 
                open={expandedResults.includes(result.id)}
                onOpenChange={() => toggleResult(result.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {expandedResults.includes(result.id) ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {RESULT_TYPE_LABELS[result.type]}
                            </Badge>
                            {result.aggregation_status && (
                              <Badge variant="secondary" className="text-xs">
                                Aggregated
                              </Badge>
                            )}
                            <span className="text-xs text-gray-500">
                              {result.indicators?.length || 0} indicators
                            </span>
                          </div>
                          <CardTitle className="text-base mt-1">
                            {result.title[defaultLanguage] || Object.values(result.title)[0]}
                          </CardTitle>
                          {result.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {result.description[defaultLanguage] || Object.values(result.description)[0]}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {!readOnly && (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setEditingResult(result.id)}
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteResult(result.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <Separator className="mb-6" />
                    
                    {/* Indicators */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Indicators</h4>
                        {!readOnly && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowAddIndicator(result.id)}
                            className="flex items-center gap-2"
                          >
                            <Plus className="h-3 w-3" />
                            Add Indicator
                          </Button>
                        )}
                      </div>

                      {/* Add Indicator Form */}
                      {showAddIndicator === result.id && !readOnly && (
                        <AddIndicatorForm
                          resultId={result.id}
                          activityId={activityId}
                          defaultLanguage={defaultLanguage}
                          onCancel={() => setShowAddIndicator(null)}
                          onSuccess={() => {
                            setShowAddIndicator(null);
                            fetchResults();
                          }}
                        />
                      )}

                      {result.indicators && result.indicators.length > 0 ? (
                        result.indicators.map((indicator) => (
                          <IndicatorCard
                            key={indicator.id}
                            indicator={indicator}
                            readOnly={readOnly}
                            defaultLanguage={defaultLanguage}
                            onUpdate={fetchResults}
                          />
                        ))
                      ) : (
                        <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg">
                          <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">No indicators yet</p>
                          {!readOnly && (
                            <p className="text-xs text-gray-500 mt-1">
                              Click "Add Indicator" to start tracking progress toward this result
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}