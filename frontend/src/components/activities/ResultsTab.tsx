'use client';

import React, { useState, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  Target, 
  TrendingUp, 
  BarChart3,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  PieChart,
  Activity,
  Zap,
  Settings,
  Eye,
  Table as TableIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResults } from '@/hooks/use-results';
import { toast } from 'sonner';
import { 
  ActivityResult, 
  ResultType, 
  CreateResultData,
  RESULT_TYPE_LABELS,
  ResultsTabProps,
  ResultIndicator,
  MeasureType,
  MEASURE_TYPE_LABELS
} from '@/types/results';
import { IndicatorCard } from './IndicatorCard';
import { AddIndicatorForm } from './AddIndicatorForm';
import { 
  Bar, 
  BarChart, 
  CartesianGrid, 
  Cell, 
  Legend, 
  Line, 
  LineChart as RechartsLineChart, 
  Pie, 
  PieChart as RechartsPieChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis 
} from 'recharts';

// Chart colors
const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  gray: '#6b7280'
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
  const [activeSubTab, setActiveSubTab] = useState<string>('overview');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedResult, setSelectedResult] = useState<string | null>(null);

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

  // Handle updating a single field of a result
  const handleUpdateResultField = (resultId: string, field: string, value: any) => {
    const resultToUpdate = results.find(r => r.id === resultId);
    if (!resultToUpdate) return;
    
    updateResult(resultId, {
      ...resultToUpdate,
      [field]: value
    });
  };

  // Handle saving result edit
  const handleSaveResultEdit = async (resultId: string) => {
    const resultToUpdate = results.find(r => r.id === resultId);
    if (!resultToUpdate) return;

    if (!resultToUpdate.title?.[defaultLanguage]?.trim()) {
      toast.error('Please provide a result title');
      return;
    }

    const success = await updateResult(resultId, {
      type: resultToUpdate.type,
      aggregation_status: resultToUpdate.aggregation_status,
      title: resultToUpdate.title,
      description: resultToUpdate.description
    });

    if (success) {
      setEditingResult(null);
      onResultsChange?.(results);
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

  // Filter results by type
  const getFilteredResults = () => {
    if (activeSubTab === 'overview' || activeSubTab === 'table' || activeSubTab === 'charts') return results;
    return results.filter(result => result.type === activeSubTab);
  };

  // Get counts for each result type
  const getResultTypeCounts = () => {
    const counts = {
      output: 0,
      outcome: 0,
      impact: 0,
      other: 0
    };
    
    results.forEach(result => {
      counts[result.type]++;
    });
    
    return counts;
  };

  // Prepare data for charts
  const chartData = useMemo(() => {
    // Result type distribution data
    const typeDistribution = Object.entries(getResultTypeCounts()).map(([type, count]) => ({
      name: RESULT_TYPE_LABELS[type as ResultType],
      value: count,
      type
    }));

    // Status distribution data
    const statusCounts = getStatusCounts();
    const statusDistribution = [
      { name: 'On Track', value: statusCounts.onTrack, color: CHART_COLORS.success },
      { name: 'Need Attention', value: statusCounts.offTrack, color: CHART_COLORS.warning },
      { name: 'No Data', value: statusCounts.noData, color: CHART_COLORS.gray }
    ];

    // Progress over time data (for line chart)
    const progressData: any[] = [];
    results.forEach(result => {
      result.indicators?.forEach(indicator => {
        indicator.periods?.forEach(period => {
          const date = new Date(period.period_end).toLocaleDateString('en-US', { 
            month: 'short', 
            year: 'numeric' 
          });
          
          const existingData = progressData.find(d => d.date === date);
          if (existingData) {
            existingData.target += period.target_value || 0;
            existingData.actual += period.actual_value || 0;
          } else {
            progressData.push({
              date,
              target: period.target_value || 0,
              actual: period.actual_value || 0
            });
          }
        });
      });
    });

    // Sort by date
    progressData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return { typeDistribution, statusDistribution, progressData };
  }, [results]);

  const statusCounts = getStatusCounts();
  const resultTypeCounts = getResultTypeCounts();
  const filteredResults = getFilteredResults();

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
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-md">
            <Button
              size="sm"
              variant={viewMode === 'cards' ? 'default' : 'ghost'}
              onClick={() => setViewMode('cards')}
              className="h-8 px-3"
            >
              <Eye className="h-3 w-3 mr-1" />
              Cards
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              onClick={() => setViewMode('table')}
              className="h-8 px-3"
            >
              <TableIcon className="h-3 w-3 mr-1" />
              Table
            </Button>
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

      {/* Main Content */}
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
        <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-3 w-3" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-2">
              <TableIcon className="h-3 w-3" />
              Table View
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <PieChart className="h-3 w-3" />
              Charts
            </TabsTrigger>
            <TabsTrigger value="output" className="flex items-center gap-2">
              <Target className="h-3 w-3" />
              Outputs ({resultTypeCounts.output})
            </TabsTrigger>
            <TabsTrigger value="outcome" className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3" />
              Outcomes ({resultTypeCounts.outcome})
            </TabsTrigger>
            <TabsTrigger value="impact" className="flex items-center gap-2">
              <Zap className="h-3 w-3" />
              Impacts ({resultTypeCounts.impact})
            </TabsTrigger>
            <TabsTrigger value="other" className="flex items-center gap-2">
              <Settings className="h-3 w-3" />
              Other ({resultTypeCounts.other})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-6">
            {viewMode === 'cards' ? (
              // Card View
              filteredResults.map((result) => (
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
                                onClick={() => setEditingResult(editingResult === result.id ? null : result.id)}
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
                        
                        {/* Edit Result Form */}
                        {editingResult === result.id && !readOnly && (
                          <Card className="border-2 border-blue-200 bg-blue-50/30 mb-6">
                            <CardHeader className="pb-4">
                              <CardTitle className="text-lg">Edit Result</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-result-type">Result Type</Label>
                                  <Select 
                                    value={result.type} 
                                    onValueChange={(value: ResultType) => 
                                      handleUpdateResultField(result.id, 'type', value)
                                    }
                                  >
                                    <SelectTrigger id="edit-result-type">
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
                                    id="edit-aggregation-status"
                                    checked={result.aggregation_status || false}
                                    onCheckedChange={(checked) => 
                                      handleUpdateResultField(result.id, 'aggregation_status', checked)
                                    }
                                  />
                                  <Label htmlFor="edit-aggregation-status">Aggregation Status</Label>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="edit-result-title">Title *</Label>
                                <Input
                                  id="edit-result-title"
                                  value={result.title[defaultLanguage] || ''}
                                  onChange={(e) => 
                                    handleUpdateResultField(result.id, 'title', {
                                      ...result.title,
                                      [defaultLanguage]: e.target.value
                                    })
                                  }
                                  placeholder="Enter result title"
                                  className="w-full"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="edit-result-description">Description</Label>
                                <Textarea
                                  id="edit-result-description"
                                  value={result.description?.[defaultLanguage] || ''}
                                  onChange={(e) => 
                                    handleUpdateResultField(result.id, 'description', {
                                      ...result.description,
                                      [defaultLanguage]: e.target.value
                                    })
                                  }
                                  placeholder="Describe what this result aims to achieve..."
                                  rows={3}
                                  className="w-full"
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <Button 
                                  onClick={() => handleSaveResultEdit(result.id)}
                                  className="flex items-center gap-2"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Save Changes
                                </Button>
                                <Button 
                                  variant="outline" 
                                  onClick={() => setEditingResult(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        
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
              ))
            ) : (
              // Table View - Simplified for now
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Result</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Indicators</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Status</TableHead>
                        {!readOnly && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map((result) => {
                        const indicatorCount = result.indicators?.length || 0;
                        const onTrackCount = result.indicators?.filter(i => i.status?.color === 'green').length || 0;
                        const progress = indicatorCount > 0 ? Math.round((onTrackCount / indicatorCount) * 100) : 0;
                        
                        return (
                          <TableRow key={result.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {result.title[defaultLanguage] || Object.values(result.title)[0]}
                                </p>
                                {result.description && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {result.description[defaultLanguage] || Object.values(result.description)[0]}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {RESULT_TYPE_LABELS[result.type]}
                              </Badge>
                            </TableCell>
                            <TableCell>{indicatorCount}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={progress} className="w-20" />
                                <span className="text-sm">{progress}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {indicatorCount === 0 ? (
                                <Badge variant="secondary">No Data</Badge>
                              ) : progress >= 85 ? (
                                <Badge className="bg-green-100 text-green-800">On Track</Badge>
                              ) : progress >= 60 ? (
                                <Badge className="bg-yellow-100 text-yellow-800">Attention</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800">Off Track</Badge>
                              )}
                            </TableCell>
                            {!readOnly && (
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedResult(result.id);
                                      setViewMode('cards');
                                      setExpandedResults([result.id]);
                                    }}
                                  >
                                    <Eye className="h-3 w-3" />
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
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Table View Tab */}
          <TabsContent value="table" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Results Table View</CardTitle>
                <p className="text-sm text-gray-600">
                  Complete overview of all results and their indicators in table format
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Result</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Aggregated</TableHead>
                        <TableHead>Indicators</TableHead>
                        <TableHead>Baseline</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Actual</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Status</TableHead>
                        {!readOnly && <TableHead>Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result) => (
                        <React.Fragment key={result.id}>
                          {/* Result Row */}
                          <TableRow className="font-medium bg-gray-50">
                            <TableCell colSpan={10}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">
                                    {RESULT_TYPE_LABELS[result.type]}
                                  </Badge>
                                  <span>{result.title[defaultLanguage] || Object.values(result.title)[0]}</span>
                                </div>
                                {!readOnly && (
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => setShowAddIndicator(result.id)}
                                    >
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add Indicator
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
                            </TableCell>
                          </TableRow>
                          
                          {/* Indicator Rows */}
                          {result.indicators?.map((indicator) => {
                            const latestPeriod = indicator.periods?.[indicator.periods.length - 1];
                            const baseline = indicator.baseline?.value;
                            const target = latestPeriod?.target_value;
                            const actual = latestPeriod?.actual_value;
                            const progress = target ? Math.round((actual || 0) / target * 100) : 0;
                            
                            return (
                              <TableRow key={indicator.id}>
                                <TableCell className="pl-8">
                                  {indicator.title[defaultLanguage] || Object.values(indicator.title)[0]}
                                </TableCell>
                                <TableCell>—</TableCell>
                                <TableCell>
                                  {indicator.aggregation_status ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-gray-400" />
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-xs">
                                    {MEASURE_TYPE_LABELS[indicator.measure]}
                                  </Badge>
                                </TableCell>
                                <TableCell>{formatValue(baseline, indicator.measure)}</TableCell>
                                <TableCell>{formatValue(target, indicator.measure)}</TableCell>
                                <TableCell>{formatValue(actual, indicator.measure)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={progress} className="w-16 h-2" />
                                    <span className="text-xs">{progress}%</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {!indicator.status ? (
                                    <Badge variant="secondary">No Data</Badge>
                                  ) : indicator.status.color === 'green' ? (
                                    <Badge className="bg-green-100 text-green-800">On Track</Badge>
                                  ) : indicator.status.color === 'yellow' ? (
                                    <Badge className="bg-yellow-100 text-yellow-800">Attention</Badge>
                                  ) : (
                                    <Badge className="bg-red-100 text-red-800">Off Track</Badge>
                                  )}
                                </TableCell>
                                {!readOnly && (
                                  <TableCell>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => {
                                        setActiveSubTab('overview');
                                        setViewMode('cards');
                                        setExpandedResults([result.id]);
                                      }}
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                          
                          {/* Empty indicator row */}
                          {(!result.indicators || result.indicators.length === 0) && (
                            <TableRow>
                              <TableCell colSpan={10} className="text-center text-gray-500 italic">
                                No indicators defined for this result
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Charts Tab */}
          <TabsContent value="charts" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Result Type Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Result Type Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={chartData.typeDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.typeDistribution.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.type === 'output' ? CHART_COLORS.primary :
                              entry.type === 'outcome' ? CHART_COLORS.success :
                              entry.type === 'impact' ? CHART_COLORS.warning :
                              CHART_COLORS.gray
                            } 
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Indicator Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Indicator Status Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={chartData.statusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {chartData.statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Progress Over Time */}
            {chartData.progressData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Progress Over Time</CardTitle>
                  <p className="text-sm text-gray-600">
                    Aggregated target vs actual values across all indicators
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <RechartsLineChart data={chartData.progressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="target" 
                        stroke={CHART_COLORS.primary} 
                        name="Target"
                        strokeWidth={2}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="actual" 
                        stroke={CHART_COLORS.success} 
                        name="Actual"
                        strokeWidth={2}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Indicator Progress by Result */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Indicator Progress by Result</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={results.map(result => ({
                      name: result.title[defaultLanguage] || Object.values(result.title)[0],
                      indicators: result.indicators?.length || 0,
                      onTrack: result.indicators?.filter(i => i.status?.color === 'green').length || 0,
                      offTrack: result.indicators?.filter(i => i.status?.color === 'red' || i.status?.color === 'yellow').length || 0,
                      noData: result.indicators?.filter(i => !i.status).length || 0
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="onTrack" stackId="a" fill={CHART_COLORS.success} name="On Track" />
                    <Bar dataKey="offTrack" stackId="a" fill={CHART_COLORS.warning} name="Off Track" />
                    <Bar dataKey="noData" stackId="a" fill={CHART_COLORS.gray} name="No Data" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Result Type Tabs (Output, Outcome, Impact, Other) */}
          {['output', 'outcome', 'impact', 'other'].map((type) => (
            <TabsContent key={type} value={type} className="space-y-4 mt-6">
              {filteredResults.length === 0 ? (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        No {RESULT_TYPE_LABELS[type as ResultType]} Results
                      </h4>
                      <p className="text-gray-600 mb-4">
                        Add {type} results to track progress for this activity.
                      </p>
                      {!readOnly && (
                        <Button 
                          onClick={() => {
                            setNewResult(prev => ({ ...prev, type: type as ResultType }));
                            setShowAddResult(true);
                          }} 
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add {RESULT_TYPE_LABELS[type as ResultType]} Result
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredResults.map((result) => (
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
                                  onClick={() => setEditingResult(editingResult === result.id ? null : result.id)}
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
                          
                          {/* Edit Result Form */}
                          {editingResult === result.id && !readOnly && (
                            <Card className="border-2 border-blue-200 bg-blue-50/30 mb-6">
                              <CardHeader className="pb-4">
                                <CardTitle className="text-lg">Edit Result</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="edit-result-type">Result Type</Label>
                                    <Select 
                                      value={result.type} 
                                      onValueChange={(value: ResultType) => 
                                        handleUpdateResultField(result.id, 'type', value)
                                      }
                                    >
                                      <SelectTrigger id="edit-result-type">
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
                                      id="edit-aggregation-status"
                                      checked={result.aggregation_status || false}
                                      onCheckedChange={(checked) => 
                                        handleUpdateResultField(result.id, 'aggregation_status', checked)
                                      }
                                    />
                                    <Label htmlFor="edit-aggregation-status">Aggregation Status</Label>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="edit-result-title">Title *</Label>
                                  <Input
                                    id="edit-result-title"
                                    value={result.title[defaultLanguage] || ''}
                                    onChange={(e) => 
                                      handleUpdateResultField(result.id, 'title', {
                                        ...result.title,
                                        [defaultLanguage]: e.target.value
                                      })
                                    }
                                    placeholder="Enter result title"
                                    className="w-full"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="edit-result-description">Description</Label>
                                  <Textarea
                                    id="edit-result-description"
                                    value={result.description?.[defaultLanguage] || ''}
                                    onChange={(e) => 
                                      handleUpdateResultField(result.id, 'description', {
                                        ...result.description,
                                        [defaultLanguage]: e.target.value
                                      })
                                    }
                                    placeholder="Describe what this result aims to achieve..."
                                    rows={3}
                                    className="w-full"
                                  />
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button 
                                    onClick={() => handleSaveResultEdit(result.id)}
                                    className="flex items-center gap-2"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    Save Changes
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => setEditingResult(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                          
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
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}