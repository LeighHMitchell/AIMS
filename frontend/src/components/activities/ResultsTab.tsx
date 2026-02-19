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
  Pencil,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  PieChart,
  Activity,
  Zap,
  Settings,
  Eye,
  Table as TableIcon,
  Info,
  Link2,
  FileText,
  Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useResults, useBaselines, useIndicators } from '@/hooks/use-results';
import { supabase } from '@/lib/supabase';
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
  Tooltip as RechartsTooltip, 
  XAxis, 
  YAxis 
} from 'recharts';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { DocumentLinksManager } from './results/DocumentLinksManager';
import { ReferencesManager } from './results/ReferencesManager';
import { DimensionsManager } from './results/DimensionsManager';
import { LocationsManager } from './results/LocationsManager';
import { MeasureTypeSearchableSelect } from '@/components/forms/MeasureTypeSearchableSelect';

// Monochrome chart colors
const CHART_COLORS = {
  primary: '#111827',   // gray-900
  secondary: '#374151', // gray-700
  tertiary: '#6b7280',  // gray-500
  light: '#9ca3af',     // gray-400
  lighter: '#d1d5db',   // gray-300
  background: '#f9fafb' // gray-50
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

// Type for dummy data - includes all required fields
type DummyResult = ActivityResult & {
  indicators?: (ResultIndicator & {
    status?: { label: string; color: string; percentage: number };
  })[];
};

// Dummy data for demonstration
const DUMMY_RESULTS_DATA: DummyResult[] = [
  {
    id: 'dummy-1',
    activity_id: 'activity-1',
    type: 'outcome' as ResultType,
    title: { en: 'Improved access to clean water in rural areas' },
    description: { en: 'This outcome focuses on increasing the availability and quality of water resources for rural communities through sustainable infrastructure development.' },
    aggregation_status: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'user-1',
    indicators: [
      {
        id: 'dummy-ind-1',
        result_id: 'dummy-1',
        title: { en: 'Percentage of rural households with access to clean water' },
        description: undefined,
        measure: 'percentage' as MeasureType,
        ascending: true,
        aggregation_status: true,
        reference_vocab: undefined,
        reference_code: undefined,
        reference_uri: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'user-1',
        baseline: {
          id: 'baseline-1',
          indicator_id: 'dummy-ind-1',
          baseline_year: 2023,
          iso_date: undefined,
          value: 45,
          comment: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        periods: [
          {
            id: 'period-1',
            indicator_id: 'dummy-ind-1',
            period_start: '2024-01-01',
            period_end: '2024-06-30',
            target_value: 55,
            target_comment: undefined,
            actual_value: 52,
            actual_comment: undefined,
            facet: 'Total',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'user-1'
          },
          {
            id: 'period-2',
            indicator_id: 'dummy-ind-1',
            period_start: '2024-07-01',
            period_end: '2024-12-31',
            target_value: 65,
            target_comment: undefined,
            actual_value: 61,
            actual_comment: undefined,
            facet: 'Total',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'user-1'
          }
        ],
        status: { label: 'On Track', color: 'green', percentage: 93.8 }
      },
      {
        id: 'dummy-ind-2',
        result_id: 'dummy-1',
        title: { en: 'Number of water quality tests meeting WHO standards' },
        description: undefined,
        measure: 'unit' as MeasureType,
        ascending: true,
        aggregation_status: true,
        reference_vocab: undefined,
        reference_code: undefined,
        reference_uri: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'user-1',
        baseline: {
          id: 'baseline-2',
          indicator_id: 'dummy-ind-2',
          baseline_year: 2023,
          iso_date: undefined,
          value: 120,
          comment: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        periods: [
          {
            id: 'period-3',
            indicator_id: 'dummy-ind-2',
            period_start: '2024-01-01',
            period_end: '2024-06-30',
            target_value: 180,
            target_comment: undefined,
            actual_value: 175,
            actual_comment: undefined,
            facet: 'Total',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'user-1'
          },
          {
            id: 'period-4',
            indicator_id: 'dummy-ind-2',
            period_start: '2024-07-01',
            period_end: '2024-12-31',
            target_value: 240,
            target_comment: undefined,
            actual_value: 0,
            actual_comment: undefined,
            facet: 'Total',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'user-1'
          }
        ],
        status: { label: 'Attention Needed', color: 'yellow', percentage: 72.9 }
      }
    ]
  },
  {
    id: 'dummy-2',
    activity_id: 'activity-1',
    type: 'output' as ResultType,
    title: { en: 'Constructed community water points' },
    description: { en: 'Building and installing water infrastructure including wells, pumps, and distribution systems in underserved rural communities.' },
    aggregation_status: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'user-1',
    indicators: [
      {
        id: 'dummy-ind-3',
        result_id: 'dummy-2',
        title: { en: 'Number of water points constructed' },
        description: undefined,
        measure: 'unit' as MeasureType,
        ascending: true,
        aggregation_status: true,
        reference_vocab: undefined,
        reference_code: undefined,
        reference_uri: undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: 'user-1',
        baseline: {
          id: 'baseline-3',
          indicator_id: 'dummy-ind-3',
          baseline_year: 2023,
          iso_date: undefined,
          value: 0,
          comment: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        periods: [
          {
            id: 'period-5',
            indicator_id: 'dummy-ind-3',
            period_start: '2024-01-01',
            period_end: '2024-03-31',
            target_value: 10,
            target_comment: undefined,
            actual_value: 12,
            actual_comment: undefined,
            facet: 'Total',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'user-1'
          },
          {
            id: 'period-6',
            indicator_id: 'dummy-ind-3',
            period_start: '2024-04-01',
            period_end: '2024-06-30',
            target_value: 15,
            target_comment: undefined,
            actual_value: 14,
            actual_comment: undefined,
            facet: 'Total',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'user-1'
          },
          {
            id: 'period-7',
            indicator_id: 'dummy-ind-3',
            period_start: '2024-07-01',
            period_end: '2024-09-30',
            target_value: 20,
            target_comment: undefined,
            actual_value: 18,
            actual_comment: undefined,
            facet: 'Total',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'user-1'
          },
          {
            id: 'period-8',
            indicator_id: 'dummy-ind-3',
            period_start: '2024-10-01',
            period_end: '2024-12-31',
            target_value: 25,
            target_comment: undefined,
            actual_value: 0,
            actual_comment: undefined,
            facet: 'Total',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: 'user-1'
          }
        ],
        status: { label: 'On Track', color: 'green', percentage: 90 }
      }
    ]
  }
];

export function ResultsTab({ 
  activityId, 
  readOnly = false, 
  onResultsChange,
  defaultLanguage = 'en',
  className 
}: ResultsTabProps) {
  const { results, loading, error, createResult, updateResult, deleteResult, fetchResults } = useResults(activityId);
  const { upsertBaseline } = useBaselines();
  
  // Local state
  const [showAddResult, setShowAddResult] = useState(false);
  const [expandedResults, setExpandedResults] = useState<string[]>([]);
  const [editingResult, setEditingResult] = useState<string | null>(null);
  const [editingResultData, setEditingResultData] = useState<Record<string, any>>({});
  const [editingIndicator, setEditingIndicator] = useState<string | null>(null);
  const [editingIndicatorValues, setEditingIndicatorValues] = useState<{
    title?: string;
    baseline?: number;
    target?: number;
    actual?: number;
  }>({});
  const [showAddPeriod, setShowAddPeriod] = useState<string | null>(null);
  const [expandedPeriods, setExpandedPeriods] = useState<string[]>([]);
  const [newPeriod, setNewPeriod] = useState({
    period_start: '',
    period_end: '',
    target_value: '',
    actual_value: '',
    target_comment: '',
    actual_comment: ''
  });
  const [showAddIndicator, setShowAddIndicator] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<string>('overview');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [showDummyData, setShowDummyData] = useState(false);

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

  // Handle deleting an indicator
  const handleDeleteIndicator = async (indicatorId: string) => {
    if (window.confirm('Are you sure you want to delete this indicator? This will also delete all its periods and baseline data.')) {
      try {
        // Use direct Supabase call for now since we need a more flexible approach
        const { error } = await supabase
          .from('result_indicators')
          .delete()
          .eq('id', indicatorId);

        if (error) {
          console.error('Error deleting indicator:', error);
          toast.error('Failed to delete indicator: ' + error.message);
          return;
        }

        toast.success('Indicator deleted successfully');
        fetchResults(); // Refresh to update the UI
      } catch (err) {
        console.error('Unexpected error deleting indicator:', err);
        toast.error('Failed to delete indicator');
      }
    }
  };

  // Handle updating a single field of a result (local state only)
  const handleUpdateResultField = (resultId: string, field: string, value: any) => {
    setEditingResultData(prev => ({
      ...prev,
      [resultId]: {
        ...prev[resultId],
      [field]: value
      }
    }));
  };

  // Handle saving result edit
  const handleSaveResultEdit = async (resultId: string) => {
    const resultToUpdate = results.find(r => r.id === resultId);
    const editedData = editingResultData[resultId] || {};
    if (!resultToUpdate) return;

    // Use edited data or fallback to original
    const finalTitle = editedData.title || resultToUpdate.title;
    const finalDescription = editedData.description || resultToUpdate.description;

    if (!finalTitle?.[defaultLanguage]?.trim()) {
      toast.error('Please provide a result title');
      return;
    }

    const success = await updateResult(resultId, {
      type: resultToUpdate.type,
      aggregation_status: resultToUpdate.aggregation_status,
      title: finalTitle,
      description: finalDescription
    });

    if (success) {
      setEditingResult(null);
      setEditingResultData(prev => {
        const newData = { ...prev };
        delete newData[resultId];
        return newData;
      });
      onResultsChange?.(results);
    }
  };

  // Use dummy data if enabled and no real results
  const displayResults = showDummyData && results.length === 0 ? DUMMY_RESULTS_DATA as any : results;

  // Get status counts for overview
  const getStatusCounts = () => {
    let onTrack = 0;
    let offTrack = 0;
    let noData = 0;
    
    displayResults.forEach((result: ActivityResult) => {
      result.indicators?.forEach((indicator: ResultIndicator) => {
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
    if (activeSubTab === 'overview' || activeSubTab === 'table' || activeSubTab === 'charts') return displayResults;
    return displayResults.filter((result: ActivityResult) => result.type === activeSubTab);
  };

  // Get counts for each result type
  const getResultTypeCounts = () => {
    const counts = {
      output: 0,
      outcome: 0,
      impact: 0,
      other: 0
    };
    
    displayResults.forEach((result: ActivityResult) => {
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
      { name: 'On Track', value: statusCounts.onTrack, color: CHART_COLORS.primary },
      { name: 'Need Attention', value: statusCounts.offTrack, color: CHART_COLORS.tertiary },
      { name: 'No Data', value: statusCounts.noData, color: CHART_COLORS.lighter }
    ];

    // Progress over time data (for line chart)
    const progressData: any[] = [];
    displayResults.forEach((result: ActivityResult) => {
      result.indicators?.forEach((indicator: any) => {
        indicator.periods?.forEach((period: any) => {
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
  }, [displayResults]);

  const statusCounts = getStatusCounts();
  const resultTypeCounts = getResultTypeCounts();
  const filteredResults = getFilteredResults();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Results & Indicators</h3>
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
      {/* Simple Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            Results
                          <HelpTextTooltip>
                Results define what your activity aims to achieve. They are organized into three levels: Outputs (immediate deliverables), Outcomes (medium-term changes), and Impacts (long-term effects).
              </HelpTextTooltip>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            What changes will this activity achieve?
          </p>
        </div>
          {!readOnly && (
            <Button 
              onClick={() => setShowAddResult(true)} 
            className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-400"
            >
              <Plus className="h-4 w-4" />
              Add Result
            </Button>
          )}
      </div>

      {/* Simple Add Result Form */}
      {showAddResult && !readOnly && (
        <Card className="border-2 border-gray-400 bg-gray-50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-gray-900">What result do you want to achieve?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="space-y-2">
              <Label htmlFor="result-title" className="text-base font-medium text-gray-900">
                Result name *
              </Label>
              <Input
                id="result-title"
                value={newResult.title?.[defaultLanguage] || ''}
                onChange={(e) => 
                  setNewResult(prev => ({
                    ...prev,
                    title: { ...prev.title, [defaultLanguage]: e.target.value }
                  }))
                }
                placeholder="What change will happen? (e.g., More children can read)"
                className="w-full text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="result-type" className="text-base font-medium text-gray-900">
                What kind of result is this?
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={newResult.type === 'output' ? 'default' : 'outline'}
                  onClick={() => setNewResult(prev => ({ ...prev, type: 'output' }))}
                  className={newResult.type === 'output' ? 'bg-gray-200 text-gray-800 border-2 border-gray-400' : 'border border-gray-300'}
                >
                  Output
                  <HelpTextTooltip>Things you deliver (e.g., schools built)</HelpTextTooltip>
                </Button>
                <Button
                  type="button"
                  variant={newResult.type === 'outcome' ? 'default' : 'outline'}
                  onClick={() => setNewResult(prev => ({ ...prev, type: 'outcome' }))}
                  className={newResult.type === 'outcome' ? 'bg-gray-200 text-gray-800 border-2 border-gray-400' : 'border border-gray-300'}
                >
                  Outcome
                  <HelpTextTooltip>Changes that happen (e.g., literacy improved)</HelpTextTooltip>
                </Button>
                <Button
                  type="button"
                  variant={newResult.type === 'impact' ? 'default' : 'outline'}
                  onClick={() => setNewResult(prev => ({ ...prev, type: 'impact' }))}
                  className={newResult.type === 'impact' ? 'bg-gray-200 text-gray-800 border-2 border-gray-400' : 'border border-gray-300'}
                >
                  Impact
                  <HelpTextTooltip>Long-term effects (e.g., poverty reduced)</HelpTextTooltip>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="result-description" className="text-base font-medium text-gray-900">
                Add more details
              </Label>
              <Textarea
                id="result-description"
                value={newResult.description?.[defaultLanguage] || ''}
                onChange={(e) => 
                  setNewResult(prev => ({
                    ...prev,
                    description: { ...prev.description, [defaultLanguage]: e.target.value }
                  }))
                }
                placeholder="Explain how this result will be achieved..."
                rows={2}
                className="w-full text-base"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleCreateResult}
                disabled={!newResult.title?.[defaultLanguage]?.trim()}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-400 px-6"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Result
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setShowAddResult(false)}
                className="text-gray-600"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content - Simple List */}
      {displayResults.length === 0 && !showDummyData ? (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No results yet</h4>
              <p className="text-gray-600 mb-4">
            Start by adding what changes you want this activity to achieve
              </p>
              {!readOnly && (
            <Button 
              onClick={() => setShowAddResult(true)} 
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-400"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Result
                </Button>
              )}
            </div>
      ) : (
        <div className="space-y-6">
          {/* Enhanced Tabs for Different Views */}
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="timeline">Timeline View</TabsTrigger>
              <TabsTrigger value="charts">Progress Charts</TabsTrigger>
              <TabsTrigger value="table">Data Table</TabsTrigger>
            </TabsList>

            {/* Overview Tab - Default View */}
            <TabsContent value="overview" className="space-y-6">
          {/* Simple Results List */}
              {filteredResults.map((result: ActivityResult, index: number) => (
            <div key={result.id} className="bg-white rounded-lg border-2 border-gray-200 p-6">
              {/* Result Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-bold text-gray-900">{index + 1}.</span>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {(result.title as any)[defaultLanguage] || Object.values(result.title)[0]}
                    </h3>
                    <Badge variant="outline" className={`${
                      result.type === 'output' ? 'bg-gray-200 text-gray-700 border-gray-400' :
                      result.type === 'outcome' ? 'bg-gray-100 text-gray-800 border-gray-400' :
                      'bg-gray-50 text-gray-900 border-gray-500'
                    }`}>
                                  {RESULT_TYPE_LABELS[result.type]}
                                </Badge>
                              </div>
                              {result.description && (
                    <p className="text-gray-600 ml-10">
                      {(result.description as any)[defaultLanguage] || Object.values(result.description)[0]}
                                </p>
                              )}
                          </div>
                          
                          {!readOnly && (
                  <div className="flex items-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setEditingResult(editingResult === result.id ? null : result.id)}
                      className="text-gray-600"
                              >
                      <Pencil className="h-4 w-4 text-slate-500 ring-1 ring-slate-300 rounded-sm" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteResult(result.id)}
                      className="text-gray-600"
                              >
                      <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </div>

              {/* Simple Edit Form */}
                        {editingResult === result.id && !readOnly && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
                                <Input
                    value={
                      editingResultData[result.id]?.title?.[defaultLanguage] ?? 
                      (result.title as any)[defaultLanguage] ?? ''
                    }
                                  onChange={(e) => 
                                    handleUpdateResultField(result.id, 'title', {
                                      ...(editingResultData[result.id]?.title || result.title),
                                      [defaultLanguage]: e.target.value
                                    })
                                  }
                    placeholder="Result name"
                    className="text-lg font-medium"
                                />
                                <Textarea
                    value={
                      editingResultData[result.id]?.description?.[defaultLanguage] ?? 
                      ((result.description as any)?.[defaultLanguage]) ?? ''
                    }
                                  onChange={(e) => 
                                    handleUpdateResultField(result.id, 'description', {
                                      ...(editingResultData[result.id]?.description || result.description),
                                      [defaultLanguage]: e.target.value
                                    })
                                  }
                    placeholder="Add details..."
                    rows={2}
                                  className="w-full"
                                />
                                
                                {/* Aggregation Status Toggle */}
                                <div className="flex items-center gap-3 py-2">
                                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                    Aggregation Status
                                    <HelpTextTooltip>
                                      Enable if this result can be aggregated across multiple activities
                                    </HelpTextTooltip>
                                  </Label>
                                  <Switch
                                    checked={editingResultData[result.id]?.aggregation_status ?? result.aggregation_status}
                                    onCheckedChange={(checked) =>
                                      handleUpdateResultField(result.id, 'aggregation_status', checked)
                                    }
                                  />
                                </div>

                                <Separator />

                                {/* Result References */}
                                <ReferencesManager
                                  entityType="result"
                                  entityId={result.id}
                                  references={result.references || []}
                                  onUpdate={fetchResults}
                                  readOnly={readOnly}
                                />

                                <Separator />

                                {/* Result Documents */}
                                <DocumentLinksManager
                                  entityType="result"
                                  entityId={result.id}
                                  documents={result.document_links || []}
                                  onUpdate={fetchResults}
                                  readOnly={readOnly}
                                  defaultLanguage={defaultLanguage}
                                />
                                
                              <div className="flex items-center gap-2">
                                <Button 
                                  onClick={() => handleSaveResultEdit(result.id)}
                      size="sm"
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-400"
                                >
                      Save
                                </Button>
                                <Button 
                      variant="ghost" 
                      size="sm"
                                  onClick={() => {
                                    setEditingResult(null);
                                    setEditingResultData(prev => {
                                      const newData = { ...prev };
                                      delete newData[result.id];
                                      return newData;
                                    });
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                </div>
              )}
              {/* Indicators Section - Simplified */}
              <div className="ml-10 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-medium text-gray-900">How will we measure this?</h4>
                            {!readOnly && (
                              <Button 
                                size="sm"
                                onClick={() => setShowAddIndicator(result.id)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-400"
                              >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Measure
                              </Button>
                            )}
                          </div>

                {/* Simple Add Indicator Form */}
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
                  <div className="space-y-3">
                    {result.indicators.map((indicator, idx) => (
                      <div key={indicator.id} className="bg-gray-50 p-4 rounded-lg">
                        {/* Show edit form in full width when editing */}
                        {editingIndicator === indicator.id && !readOnly ? (
                          <div className="space-y-4">
                            <h5 className="font-medium text-gray-900 mb-2">
                              Edit Indicator {idx + 1}
                            </h5>
                            {/* Full Width Indicator Editing */}
                            <div className="space-y-4">
                              {/* Title Editing */}
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700">Indicator Name</Label>
                              <Input
                                value={editingIndicatorValues.title || ''}
                                onChange={(e) => {
                                  setEditingIndicatorValues(prev => ({
                                    ...prev,
                                    title: e.target.value
                                  }));
                                }}
                                  placeholder="Indicator name"
                                  className="font-medium"
                              />
                              </div>

                              {/* Indicator Description */}
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700">Description</Label>
                                <Textarea
                                  value={editingIndicatorValues.description || ''}
                                  onChange={(e) => {
                                    setEditingIndicatorValues(prev => ({
                                      ...prev,
                                      description: e.target.value
                                    }));
                                  }}
                                  placeholder="Detailed description of this indicator"
                                  rows={2}
                                  className="text-sm"
                                />
                              </div>

                              {/* Measure Type */}
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                  Measure Type
                                  <HelpTextTooltip>
                                    How this indicator is measured (unit, percentage, nominal, ordinal, or qualitative)
                                  </HelpTextTooltip>
                                </Label>
                                <MeasureTypeSearchableSelect
                                  value={editingIndicatorValues.measure || indicator.measure || '1'}
                                  onValueChange={(value) => {
                                    setEditingIndicatorValues(prev => ({
                                      ...prev,
                                      measure: value as MeasureType
                                    }));
                                  }}
                                  placeholder="Select measure type..."
                                  className="max-w-lg"
                                />
                              </div>

                              {/* Ascending Toggle */}
                              <div className="flex items-center justify-between py-2">
                                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                  Ascending Values
                                  <HelpTextTooltip>
                                    Enable if higher values indicate better performance (e.g., literacy rate). Disable for negative indicators (e.g., mortality rate).
                                  </HelpTextTooltip>
                                </Label>
                                <Switch
                                  checked={editingIndicatorValues.ascending ?? indicator.ascending ?? true}
                                  onCheckedChange={(checked) => {
                                    setEditingIndicatorValues(prev => ({
                                      ...prev,
                                      ascending: checked
                                    }));
                                  }}
                                />
                              </div>

                              {/* Aggregation Status Toggle */}
                              <div className="flex items-center gap-3 py-2">
                                <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                  Aggregation Status
                                  <HelpTextTooltip>
                                    Enable if this indicator can be aggregated or compared across activities
                                  </HelpTextTooltip>
                                </Label>
                                <Switch
                                  checked={editingIndicatorValues.aggregation_status ?? indicator.aggregation_status ?? false}
                                  onCheckedChange={(checked) => {
                                    setEditingIndicatorValues(prev => ({
                                      ...prev,
                                      aggregation_status: checked
                                    }));
                                  }}
                                />
                            </div>
                            
                              <Separator />

                              {/* Indicator References */}
                              <ReferencesManager
                                entityType="indicator"
                                entityId={indicator.id}
                                references={indicator.references || []}
                                onUpdate={fetchResults}
                                readOnly={readOnly}
                              />

                              <Separator />

                              {/* Indicator Documents */}
                              <DocumentLinksManager
                                entityType="indicator"
                                entityId={indicator.id}
                                documents={indicator.document_links || []}
                                onUpdate={fetchResults}
                                readOnly={readOnly}
                                defaultLanguage={defaultLanguage}
                              />

                              <Separator />

                              {/* Baseline Section */}
                              <div className="space-y-4 p-4 bg-gray-100 rounded-lg">
                                <h6 className="text-sm font-semibold text-gray-900">Baseline Information</h6>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                      Baseline Value
                                      <HelpTextTooltip>
                                        The starting value before your activity began
                                      </HelpTextTooltip>
                                    </Label>
                              <Input
                                      type="number"
                                      step="any"
                                      value={editingIndicatorValues.baseline || ''}
                                onChange={(e) => {
                                  setEditingIndicatorValues(prev => ({
                                    ...prev,
                                          baseline: parseFloat(e.target.value) || undefined
                                  }));
                                }}
                                      placeholder="Starting value"
                                      className="text-sm"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">Baseline Year</Label>
                                    <Input
                                      type="number"
                                      min="1900"
                                      max="2100"
                                      value={editingIndicatorValues.baseline_year || ''}
                                      onChange={(e) => {
                                        setEditingIndicatorValues(prev => ({
                                          ...prev,
                                          baseline_year: parseInt(e.target.value) || undefined
                                        }));
                                      }}
                                      placeholder="e.g., 2020"
                                      className="text-sm"
                                    />
                                  </div>
                              </div>

                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-700">Baseline Date</Label>
                                  <Input
                                    type="date"
                                    value={editingIndicatorValues.baseline_iso_date || ''}
                                    onChange={(e) => {
                                      setEditingIndicatorValues(prev => ({
                                        ...prev,
                                        baseline_iso_date: e.target.value
                                      }));
                                    }}
                                    className="text-sm max-w-xs"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-sm font-medium text-gray-700">Baseline Comment</Label>
                                  <Textarea
                                    value={editingIndicatorValues.baseline_comment || ''}
                                    onChange={(e) => {
                                      setEditingIndicatorValues(prev => ({
                                        ...prev,
                                        baseline_comment: e.target.value
                                      }));
                                    }}
                                    placeholder="Explanation of baseline measurement"
                                    rows={2}
                                    className="text-sm"
                                  />
                                </div>

                                {indicator.baseline?.id && (
                                  <>
                                    <Separator />
                                    
                                    {/* Baseline Locations */}
                                    <LocationsManager
                                      entityType="baseline"
                                      entityId={indicator.baseline.id}
                                      locations={indicator.baseline.locations || []}
                                      onUpdate={fetchResults}
                                      readOnly={readOnly}
                                    />

                                    <Separator />

                                    {/* Baseline Dimensions */}
                                    <DimensionsManager
                                      entityType="baseline"
                                      entityId={indicator.baseline.id}
                                      dimensions={indicator.baseline.dimensions || []}
                                      onUpdate={fetchResults}
                                      readOnly={readOnly}
                                    />

                                    <Separator />

                                    {/* Baseline Documents */}
                                    <DocumentLinksManager
                                      entityType="baseline"
                                      entityId={indicator.baseline.id}
                                      documents={indicator.baseline.document_links || []}
                                      onUpdate={fetchResults}
                                      readOnly={readOnly}
                                      defaultLanguage={defaultLanguage}
                                    />
                                  </>
                                )}
                              </div>

                               {/* Period Management */}
                               <div className="space-y-3">
                                 <div className="flex items-center justify-between">
                                   <Label className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                     <Clock className="h-4 w-4" />
                                     Progress Tracking Periods
                                    <HelpTextTooltip>
                                       Add multiple time periods to track progress monthly, quarterly, or at custom intervals
                                    </HelpTextTooltip>
                                  </Label>
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     onClick={() => setShowAddPeriod(indicator.id)}
                                     className="text-xs"
                                   >
                                     <Plus className="h-3 w-3 mr-1" />
                                     Add Period
                                   </Button>
                                 </div>

                                 {/* Add New Period Form */}
                                 {showAddPeriod === indicator.id && (
                                   <div className="bg-gray-50 p-3 rounded border space-y-3">
                                     <div className="grid grid-cols-2 gap-3">
                                       <div>
                                         <Label className="text-xs text-gray-600">Period Start</Label>
                                         <Input
                                           type="date"
                                           value={newPeriod.period_start}
                                           onChange={(e) => setNewPeriod(prev => ({ ...prev, period_start: e.target.value }))}
                                           className="text-xs"
                                         />
                                       </div>
                                       <div>
                                         <Label className="text-xs text-gray-600">Period End</Label>
                                         <Input
                                           type="date"
                                           value={newPeriod.period_end}
                                           onChange={(e) => setNewPeriod(prev => ({ ...prev, period_end: e.target.value }))}
                                           className="text-xs"
                                         />
                                       </div>
                                     </div>
                                     
                                     <div className="grid grid-cols-2 gap-3">
                                       <div>
                                         <Label className="text-xs text-gray-600">Target Value</Label>
                                  <Input
                                    type="number"
                                    step="any"
                                           value={newPeriod.target_value}
                                           onChange={(e) => setNewPeriod(prev => ({ ...prev, target_value: e.target.value }))}
                                           placeholder="Target for this period"
                                           className="text-xs"
                                  />
                                </div>
                                <div>
                                         <Label className="text-xs text-gray-600">Actual Value</Label>
                                  <Input
                                    type="number"
                                    step="any"
                                           value={newPeriod.actual_value}
                                           onChange={(e) => setNewPeriod(prev => ({ ...prev, actual_value: e.target.value }))}
                                           placeholder="Actual achieved"
                                           className="text-xs"
                                  />
                                </div>
                              </div>

                                    <div className="space-y-3">
                                     <div>
                                        <Label className="text-xs text-gray-600">Target Comment</Label>
                                        <Textarea
                                          value={newPeriod.target_comment}
                                          onChange={(e) => setNewPeriod(prev => ({ ...prev, target_comment: e.target.value }))}
                                          placeholder="Notes about the target"
                                          rows={2}
                                         className="text-xs"
                                       />
                                      </div>
                                      
                                      <div>
                                        <Label className="text-xs text-gray-600">Actual Comment</Label>
                                        <Textarea
                                          value={newPeriod.actual_comment}
                                          onChange={(e) => setNewPeriod(prev => ({ ...prev, actual_comment: e.target.value }))}
                                          placeholder="Notes about the actual achievement"
                                          rows={2}
                                          className="text-xs"
                                        />
                                      </div>
                                     </div>
                              
                              <div className="flex items-center gap-2">
                                <Button 
                                  size="sm"
                                  onClick={async () => {
                                           if (!newPeriod.period_start || !newPeriod.period_end) {
                                             toast.error('Please provide period start and end dates');
                                             return;
                                           }

                                           try {
                                             const { error } = await supabase
                                               .from('indicator_periods')
                                               .insert({
                                        indicator_id: indicator.id,
                                                 period_start: newPeriod.period_start,
                                                 period_end: newPeriod.period_end,
                                                 target_value: newPeriod.target_value ? parseFloat(newPeriod.target_value) : null,
                                                 actual_value: newPeriod.actual_value ? parseFloat(newPeriod.actual_value) : null,
                                                target_comment: newPeriod.target_comment ? { [defaultLanguage]: newPeriod.target_comment } : null,
                                                actual_comment: newPeriod.actual_comment ? { [defaultLanguage]: newPeriod.actual_comment } : null,
                                                 facet: 'Total'
                                               });

                                             if (error) {
                                               console.error('Error adding period:', error);
                                               toast.error('Failed to add period');
                                               return;
                                             }

                                             toast.success('Period added successfully');
                                             setNewPeriod({
                                               period_start: '',
                                               period_end: '',
                                               target_value: '',
                                               actual_value: '',
                                              target_comment: '',
                                              actual_comment: ''
                                             });
                                             setShowAddPeriod(null);
                                        await fetchResults();
                                           } catch (err) {
                                             console.error('Unexpected error:', err);
                                             toast.error('Failed to add period');
                                           }
                                         }}
                                         className="bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-400"
                                       >
                                         Add Period
                                       </Button>
                                       <Button
                                         size="sm"
                                         variant="ghost"
                                         onClick={() => {
                                           setShowAddPeriod(null);
                                           setNewPeriod({
                                             period_start: '',
                                             period_end: '',
                                             target_value: '',
                                             actual_value: '',
                                            target_comment: '',
                                            actual_comment: ''
                                           });
                                         }}
                                       >
                                         Cancel
                                       </Button>
                                     </div>
                                   </div>
                                 )}

                                 {/* Existing Periods List */}
                                 {indicator.periods && indicator.periods.length > 0 && (
                                   <div className="space-y-2">
                                    {indicator.periods.map((period: any, index: number) => {
                                      const isExpanded = expandedPeriods.includes(period.id);
                                      
                                      return (
                                        <div key={period.id || index} className="bg-white rounded border">
                                          {/* Period Header */}
                                          <div className="flex items-center justify-between p-3">
                                         <div className="flex-1">
                                              <div className="flex items-center gap-2">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => {
                                                    setExpandedPeriods(prev =>
                                                      isExpanded
                                                        ? prev.filter(id => id !== period.id)
                                                        : [...prev, period.id]
                                                    );
                                                  }}
                                                  className="h-6 w-6 p-0"
                                                >
                                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </Button>
                                                <div className="text-sm">
                                                  <div className="font-medium text-gray-900">
                                             {new Date(period.period_start).toLocaleDateString()} - {new Date(period.period_end).toLocaleDateString()}
                                           </div>
                                                  <div className="text-xs text-gray-600">
                                             Target: {period.target_value?.toLocaleString() || 'Not set'} | 
                                             Actual: {period.actual_value?.toLocaleString() || 'Not set'}
                                             {period.target_value && period.actual_value && (
                                                      <span className="ml-2 font-medium text-gray-900">
                                                 ({Math.round((period.actual_value / period.target_value) * 100)}%)
                                               </span>
                                             )}
                                           </div>
                                         </div>
                                              </div>
                                            </div>
                                            {!readOnly && (
                                         <Button
                                           size="sm"
                                           variant="ghost"
                                           onClick={async () => {
                                             if (window.confirm('Delete this period?')) {
                                               try {
                                                 const { error } = await supabase
                                                   .from('indicator_periods')
                                                   .delete()
                                                   .eq('id', period.id);

                                                 if (error) {
                                                   toast.error('Failed to delete period');
                                                   return;
                                                 }

                                                 toast.success('Period deleted');
                                                 await fetchResults();
                                               } catch (err) {
                                                 toast.error('Failed to delete period');
                                               }
                                             }
                                           }}
                                           className="text-red-600 hover:text-red-800"
                                         >
                                           <Trash2 className="h-3 w-3 text-red-500" />
                                         </Button>
                                            )}
                                       </div>

                                          {/* Period Metadata - Collapsible */}
                                          {isExpanded && (
                                            <div className="px-3 pb-3 space-y-3 border-t pt-3">
                                              {/* Comments Display */}
                                              {(period.target_comment || period.actual_comment) && (
                                                <div className="space-y-2 text-xs">
                                                  {period.target_comment && (
                                                    <div>
                                                      <span className="font-medium text-gray-700">Target: </span>
                                                      <span className="text-gray-600">
                                                        {typeof period.target_comment === 'string' 
                                                          ? period.target_comment 
                                                          : period.target_comment[defaultLanguage] || Object.values(period.target_comment)[0]}
                                                      </span>
                                                    </div>
                                                  )}
                                                  {period.actual_comment && (
                                                    <div>
                                                      <span className="font-medium text-gray-700">Actual: </span>
                                                      <span className="text-gray-600">
                                                        {typeof period.actual_comment === 'string'
                                                          ? period.actual_comment
                                                          : period.actual_comment[defaultLanguage] || Object.values(period.actual_comment)[0]}
                                                      </span>
                                                    </div>
                                                  )}
                                                </div>
                                              )}

                                              <Separator />

                                              {/* Target Locations */}
                                              <LocationsManager
                                                entityType="period"
                                                entityId={period.id}
                                                locations={period.locations || []}
                                                locationType="target"
                                                onUpdate={fetchResults}
                                                readOnly={readOnly}
                                              />

                                              {/* Actual Locations */}
                                              <LocationsManager
                                                entityType="period"
                                                entityId={period.id}
                                                locations={period.locations || []}
                                                locationType="actual"
                                                onUpdate={fetchResults}
                                                readOnly={readOnly}
                                              />

                                              <Separator />

                                              {/* Target Dimensions */}
                                              <DimensionsManager
                                                entityType="period"
                                                entityId={period.id}
                                                dimensions={period.dimensions || []}
                                                dimensionType="target"
                                                onUpdate={fetchResults}
                                                readOnly={readOnly}
                                              />

                                              {/* Actual Dimensions */}
                                              <DimensionsManager
                                                entityType="period"
                                                entityId={period.id}
                                                dimensions={period.dimensions || []}
                                                dimensionType="actual"
                                                onUpdate={fetchResults}
                                                readOnly={readOnly}
                                              />

                                              <Separator />

                                              {/* Target Documents */}
                                              <DocumentLinksManager
                                                entityType="period"
                                                entityId={period.id}
                                                documents={period.document_links || []}
                                                linkType="target"
                                                onUpdate={fetchResults}
                                                readOnly={readOnly}
                                                defaultLanguage={defaultLanguage}
                                              />

                                              {/* Actual Documents */}
                                              <DocumentLinksManager
                                                entityType="period"
                                                entityId={period.id}
                                                documents={period.document_links || []}
                                                linkType="actual"
                                                onUpdate={fetchResults}
                                                readOnly={readOnly}
                                                defaultLanguage={defaultLanguage}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                   </div>
                                 )}

                                 {/* Quick Add Buttons */}
                                 <div className="flex gap-2">
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     onClick={() => {
                                       const now = new Date();
                                       const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                                       const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                                       
                                       setNewPeriod({
                                         period_start: monthStart.toISOString().split('T')[0],
                                         period_end: monthEnd.toISOString().split('T')[0],
                                         target_value: '',
                                         actual_value: '',
                                        target_comment: `Target for ${monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
                                        actual_comment: ''
                                       });
                                       setShowAddPeriod(indicator.id);
                                     }}
                                     className="text-xs"
                                   >
                                     + This Month
                                </Button>
                                <Button 
                                  size="sm"
                                     variant="outline"
                                     onClick={() => {
                                       const now = new Date();
                                       const quarter = Math.floor(now.getMonth() / 3);
                                       const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
                                       const quarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
                                       
                                       setNewPeriod({
                                         period_start: quarterStart.toISOString().split('T')[0],
                                         period_end: quarterEnd.toISOString().split('T')[0],
                                         target_value: '',
                                         actual_value: '',
                                        target_comment: `Target for Q${quarter + 1} ${now.getFullYear()}`,
                                        actual_comment: ''
                                       });
                                       setShowAddPeriod(indicator.id);
                                     }}
                                     className="text-xs"
                                   >
                                     + This Quarter
                                </Button>
                                 </div>
                              </div>
                                
                                <div className="flex items-center gap-2 pt-2">
                                <Button 
                                  size="sm"
                                  onClick={async () => {
                                    if (!editingIndicatorValues.title?.trim()) {
                                      toast.error('Please provide an indicator name');
                                      return;
                                    }

                                    try {
                                      // Build update object for indicator
                                      const updateData: any = {
                                        updated_at: new Date().toISOString()
                                      };

                                      // Update title if changed
                                      if (editingIndicatorValues.title !== (indicator.title as any)[defaultLanguage]) {
                                        updateData.title = { [defaultLanguage]: editingIndicatorValues.title };
                                      }

                                      // Update description if changed
                                      if (editingIndicatorValues.description !== undefined && 
                                          editingIndicatorValues.description !== ((indicator.description as any)?.[defaultLanguage] || '')) {
                                        updateData.description = { [defaultLanguage]: editingIndicatorValues.description };
                                      }

                                      // Update measure type if changed
                                      if (editingIndicatorValues.measure && editingIndicatorValues.measure !== indicator.measure) {
                                        updateData.measure = editingIndicatorValues.measure;
                                      }

                                      // Update ascending if changed
                                      if (editingIndicatorValues.ascending !== undefined && editingIndicatorValues.ascending !== indicator.ascending) {
                                        updateData.ascending = editingIndicatorValues.ascending;
                                      }

                                      // Update aggregation status if changed
                                      if (editingIndicatorValues.aggregation_status !== undefined && 
                                          editingIndicatorValues.aggregation_status !== indicator.aggregation_status) {
                                        updateData.aggregation_status = editingIndicatorValues.aggregation_status;
                                      }

                                      // Save indicator updates if there are any changes
                                      if (Object.keys(updateData).length > 1) { // More than just updated_at
                                        const { error: indicatorError } = await supabase
                                          .from('result_indicators')
                                          .update(updateData)
                                          .eq('id', indicator.id);

                                        if (indicatorError) {
                                          toast.error('Failed to update indicator');
                                          return;
                                        }
                                      }

                                      // Save baseline if provided
                                      if (editingIndicatorValues.baseline !== undefined) {
                                        const baselineData: any = {
                                          indicator_id: indicator.id,
                                          value: editingIndicatorValues.baseline
                                        };
                                        
                                        // Add baseline year if provided
                                        if (editingIndicatorValues.baseline_year) {
                                          baselineData.baseline_year = editingIndicatorValues.baseline_year;
                                        }
                                        
                                        // Add baseline ISO date if provided
                                        if (editingIndicatorValues.baseline_iso_date) {
                                          baselineData.iso_date = editingIndicatorValues.baseline_iso_date;
                                        }
                                        
                                        // Add baseline comment if provided
                                        if (editingIndicatorValues.baseline_comment) {
                                          baselineData.comment = { [defaultLanguage]: editingIndicatorValues.baseline_comment };
                                        }
                                        
                                        await upsertBaseline(baselineData);
                                      }
                                      
                                      toast.success('Indicator updated');
                                      setEditingIndicator(null);
                                      setEditingIndicatorValues({});
                                      await fetchResults();
                                    } catch (err) {
                                      console.error('Error saving indicator:', err);
                                      toast.error('Failed to save indicator');
                                    }
                                  }}
                                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-400"
                                >
                                  Save
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => {
                                    setEditingIndicator(null);
                                    setEditingIndicatorValues({});
                                  }}
                                >
                                  Cancel
                                </Button>
                            </div>
                                </div>
                                 </div>
                        ) : (
                          <>
                            {/* Normal View - Not Editing */}
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className="font-medium text-gray-900">
                                    {idx + 1}. {(indicator.title as any)[defaultLanguage] || Object.values(indicator.title)[0]}
                                  </h5>
                                  
                                  {/* Measure Type Badge */}
                                  <Badge variant="outline" className="text-xs">
                                    {MEASURE_TYPE_LABELS[indicator.measure as MeasureType] || indicator.measure}
                                  </Badge>
                                  
                                  {/* Ascending Indicator */}
                                  {indicator.ascending === false && (
                                    <Badge variant="outline" className="text-xs bg-yellow-50">
                                      Descending
                                    </Badge>
                                  )}
                                  
                                  {/* Metadata Badges */}
                                  {indicator.references && indicator.references.length > 0 && (
                                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                                      <Link2 className="h-3 w-3" />
                                      {indicator.references.length}
                                    </Badge>
                                  )}
                                  
                                  {indicator.document_links && indicator.document_links.length > 0 && (
                                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                                      <FileText className="h-3 w-3" />
                                      {indicator.document_links.length}
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* Indicator Description */}
                                {indicator.description && (
                                  <p className="text-sm text-gray-600 mb-2">
                                    {(indicator.description as any)[defaultLanguage] || Object.values(indicator.description)[0]}
                                  </p>
                                )}
                              </div>
                          
                          {!readOnly && (
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  if (editingIndicator === indicator.id) {
                                    setEditingIndicator(null);
                                    setEditingIndicatorValues({});
                                  } else {
                                    setEditingIndicator(indicator.id);
                                    setEditingIndicatorValues({
                                      title: (indicator.title as any)[defaultLanguage] || '',
                                      description: (indicator.description as any)?.[defaultLanguage] || '',
                                      measure: indicator.measure || 'unit',
                                      ascending: indicator.ascending ?? true,
                                      aggregation_status: indicator.aggregation_status ?? false,
                                      baseline: indicator.baseline?.value,
                                      baseline_year: indicator.baseline?.baseline_year,
                                      baseline_iso_date: indicator.baseline?.iso_date,
                                      baseline_comment: (indicator.baseline?.comment as any)?.[defaultLanguage] || '',
                                      target: indicator.periods?.[indicator.periods.length - 1]?.target_value,
                                      actual: indicator.periods?.[indicator.periods.length - 1]?.actual_value
                                    });
                                  }
                                }}
                              >
                                <Pencil className="h-3 w-3 text-slate-500 ring-1 ring-slate-300 rounded-sm" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteIndicator(indicator.id)}
                              >
                                <Trash2 className="h-3 w-3 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        {/* Progress Chart - Separate Sub-Card */}
                        {(indicator.baseline?.value || (indicator.periods && indicator.periods.length > 0)) && (
                          <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
                            <h6 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              Progress Visualization
                            </h6>
                            <div className="flex gap-6">
                              {/* Left side - Progress values stacked */}
                              <div className="flex flex-col gap-4 justify-center min-w-[120px]">
                                <div>
                                  <span className="text-gray-600 text-sm flex items-center gap-1">
                                    Start:
                                    <HelpTextTooltip>
                                      Baseline value - the starting point before the activity began
                                    </HelpTextTooltip>
                                  </span>
                                  <p className="font-semibold text-lg text-gray-900">{indicator.baseline?.value || 'Not set'}</p>
                                </div>
                                <div>
                                  <span className="text-gray-600 text-sm flex items-center gap-1">
                                    Target:
                                    <HelpTextTooltip>
                                      Target value to achieve by the end of the period
                                    </HelpTextTooltip>
                                  </span>
                                  <p className="font-semibold text-lg text-gray-900">
                                    {indicator.periods?.[indicator.periods.length - 1]?.target_value || 'Not set'}
                                  </p>
                                </div>
                                <div>
                                  <span className="text-gray-600 text-sm flex items-center gap-1">
                                    Current:
                                    <HelpTextTooltip>
                                      Current/actual value achieved so far
                                    </HelpTextTooltip>
                                  </span>
                                  <p className="font-semibold text-lg text-gray-900">
                                    {indicator.periods?.[indicator.periods.length - 1]?.actual_value || 'Not set'}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Right side - Chart */}
                              <div className="flex-1">
                                <ResponsiveContainer width="100%" height={240}>
                                  <BarChart 
                                    data={[
                                      {
                                        name: 'Baseline',
                                        value: indicator.baseline?.value || 0
                                      },
                                      {
                                        name: 'Target',
                                        value: indicator.periods && indicator.periods.length > 0 
                                          ? indicator.periods[indicator.periods.length - 1]?.target_value || 0
                                          : 0
                                      },
                                      {
                                        name: 'Actual',
                                        value: indicator.periods && indicator.periods.length > 0
                                          ? indicator.periods[indicator.periods.length - 1]?.actual_value || 0
                                          : 0
                                      }
                                    ]}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
                                    <YAxis 
                                      stroke="#64748b" 
                                      fontSize={12}
                                    />
                                    <RechartsTooltip 
                                      content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                          const data = payload[0].payload;
                                          return (
                                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                              <p className="font-semibold text-gray-900 mb-1">{data.name}</p>
                                              <p className="text-lg font-bold text-gray-900">{Number(data.value || 0).toLocaleString()}</p>
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    <Bar dataKey="value" fill="#64748b" barSize={32} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>
                        )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No measures added yet</p>
                )}
              </div>
            </div>
          ))}
            </TabsContent>

            {/* Timeline View Tab */}
            <TabsContent value="timeline" className="space-y-6">
              <div className="bg-white rounded-lg border p-6">
                <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Results Progress Over Time
                  <HelpTextTooltip>
                    This timeline shows how your results have progressed throughout the activity lifecycle, displaying actual achievements against targets for each time period.
                  </HelpTextTooltip>
                </h4>
                
                {chartData.progressData.length > 0 ? (
                  <div className="space-y-6">
                    {/* Overall Progress Chart */}
                    <ResponsiveContainer width="100%" height={400}>
                      <RechartsLineChart data={chartData.progressData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#6B7280"
                          fontSize={12}
                        />
                        <YAxis 
                          stroke="#6B7280"
                          fontSize={12}
                          label={{ value: 'Value', angle: -90, position: 'insideLeft' }}
                        />
                        <RechartsTooltip 
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="target" 
                          stroke={CHART_COLORS.secondary}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="Target"
                          dot={{ fill: CHART_COLORS.secondary, strokeWidth: 2, r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="actual" 
                          stroke={CHART_COLORS.primary}
                          strokeWidth={3}
                          name="Actual"
                          dot={{ fill: CHART_COLORS.primary, strokeWidth: 2, r: 5 }}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>

                    {/* Individual Indicator Progress Charts */}
                    <div className="space-y-4">
                      <h5 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Individual Indicator Progress
                        <HelpTextTooltip>
                          Each chart shows how a specific indicator has progressed over time toward its target.
                        </HelpTextTooltip>
                      </h5>
                      
                      {filteredResults.map((result: ActivityResult) => 
                        result.indicators?.map((indicator: ResultIndicator) => {
                          // Create time series data for this specific indicator
                          const indicatorData: any[] = [];
                          
                          // Add baseline point if available
                          if (indicator.baseline?.value) {
                            indicatorData.push({
                              date: `Baseline`,
                              value: indicator.baseline.value,
                              type: 'baseline'
                            });
                          }
                          
                          // Add period data points
                          indicator.periods?.forEach((period: any) => {
                            const date = new Date(period.period_end).toLocaleDateString('en-US', { 
                              month: 'short', 
                              year: 'numeric' 
                            });
                            
                            if (period.target_value) {
                              indicatorData.push({
                                date,
                                target: period.target_value,
                                actual: period.actual_value || 0,
                                type: 'period'
                              });
                            }
                          });
                          
                          // Sort by date
                          indicatorData.sort((a, b) => {
                            if (a.type === 'baseline') return -1;
                            if (b.type === 'baseline') return 1;
                            return new Date(a.date).getTime() - new Date(b.date).getTime();
                          });
                          
                          if (indicatorData.length === 0) return null;
                          
                          const latestTarget = indicator.periods?.[indicator.periods.length - 1]?.target_value || 0;
                          const latestActual = indicator.periods?.[indicator.periods.length - 1]?.actual_value || 0;
                          const achievementRate = latestTarget > 0 ? Math.round((latestActual / latestTarget) * 100) : 0;
                          
                          return (
                            <div key={indicator.id} className="bg-white p-4 rounded-lg border">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h6 className="font-medium text-gray-900">
                                    {(indicator.title as any)[defaultLanguage] || Object.values(indicator.title)[0]}
                                  </h6>
                                  <p className="text-sm text-gray-600">
                                    Result: {(result.title as any)[defaultLanguage] || Object.values(result.title)[0]}
                                  </p>
        </div>
                                <div className="text-right">
                                  <div className="text-lg font-semibold text-gray-900">{achievementRate}%</div>
                                  <div className="text-sm text-gray-500">Achievement</div>
                                </div>
                              </div>
                              
                              <ResponsiveContainer width="100%" height={200}>
                                <RechartsLineChart data={indicatorData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                  <XAxis 
                                    dataKey="date" 
                                    stroke="#6B7280"
                                    fontSize={11}
                                  />
                                  <YAxis 
                                    stroke="#6B7280"
                                    fontSize={11}
                                  />
                                  <RechartsTooltip 
                                    contentStyle={{
                                      backgroundColor: '#fff',
                                      border: '1px solid #E5E7EB',
                                      borderRadius: '8px'
                                    }}
                                  />
                                  {indicatorData.some(d => d.target) && (
                                    <Line 
                                      type="monotone" 
                                      dataKey="target" 
                                      stroke={CHART_COLORS.secondary}
                                      strokeWidth={2}
                                      strokeDasharray="3 3"
                                      name="Target"
                                      dot={{ fill: CHART_COLORS.secondary, strokeWidth: 2, r: 3 }}
                                    />
                                  )}
                                  {indicatorData.some(d => d.actual !== undefined) && (
                                    <Line 
                                      type="monotone" 
                                      dataKey="actual" 
                                      stroke={CHART_COLORS.primary}
                                      strokeWidth={2}
                                      name="Actual"
                                      dot={{ fill: CHART_COLORS.primary, strokeWidth: 2, r: 4 }}
                                    />
                                  )}
                                  {indicatorData.some(d => d.value !== undefined) && (
                                    <Line 
                                      type="monotone" 
                                      dataKey="value" 
                                      stroke={CHART_COLORS.tertiary}
                                      strokeWidth={2}
                                      name="Baseline"
                                      dot={{ fill: CHART_COLORS.tertiary, strokeWidth: 2, r: 3 }}
                                    />
                                  )}
                                </RechartsLineChart>
                              </ResponsiveContainer>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>No time series data available yet</p>
                    <p className="text-sm">Add indicator periods with dates to see progress over time</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Charts Tab */}
            <TabsContent value="charts" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Distribution */}
                <div className="bg-white rounded-lg border p-6">
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Results Status Distribution
                  </h4>
                  {chartData.statusDistribution.some(d => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={chartData.statusDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                        >
                          {chartData.statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>No indicators to analyze yet</p>
                    </div>
                  )}
                </div>

                {/* Result Type Distribution */}
                <div className="bg-white rounded-lg border p-6">
                  <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Result Types
                  </h4>
                  {chartData.typeDistribution.some(d => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData.typeDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
                        <YAxis stroke="#6B7280" fontSize={12} />
                        <RechartsTooltip />
                        <Bar dataKey="value" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Target className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>No results to categorize yet</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Data Table Tab */}
            <TabsContent value="table" className="space-y-6">
              <div className="bg-white rounded-lg border">
                <div className="p-6 border-b">
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <TableIcon className="h-5 w-5" />
                    Results & Indicators Data
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Result</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Indicators</TableHead>
                        <TableHead>Latest Target</TableHead>
                        <TableHead>Latest Actual</TableHead>
                        <TableHead>Achievement Rate</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map((result: ActivityResult) => (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">
                            {(result.title as any)[defaultLanguage] || Object.values(result.title)[0]}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{RESULT_TYPE_LABELS[result.type as ResultType]}</Badge>
                          </TableCell>
                          <TableCell>{result.indicators?.length || 0}</TableCell>
                          <TableCell>
                            {result.indicators?.reduce((sum: number, ind: ResultIndicator) => sum + (ind.totalTarget || 0), 0) || '-'}
                          </TableCell>
                          <TableCell>
                            {result.indicators?.reduce((sum: number, ind: ResultIndicator) => sum + (ind.latestActual || 0), 0) || '-'}
                          </TableCell>
                          <TableCell>
                            {result.indicators && result.indicators.length > 0 ? (
                              (() => {
                                const totalTarget = result.indicators!.reduce((sum: number, ind: ResultIndicator) => sum + (ind.totalTarget || 0), 0);
                                const totalActual = result.indicators!.reduce((sum: number, ind: ResultIndicator) => sum + (ind.latestActual || 0), 0);
                                const rate = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
                                return `${rate}%`;
                              })()
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {result.indicators && result.indicators.length > 0 ? (
                              (() => {
                                const totalTarget = result.indicators!.reduce((sum: number, ind: ResultIndicator) => sum + (ind.totalTarget || 0), 0);
                                const totalActual = result.indicators!.reduce((sum: number, ind: ResultIndicator) => sum + (ind.latestActual || 0), 0);
                                const rate = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
                                
                                if (rate >= 80) return <Badge className="bg-gray-900 text-white">On Track</Badge>;
                                if (rate >= 50) return <Badge className="bg-gray-600 text-white">Attention Needed</Badge>;
                                if (rate > 0) return <Badge className="bg-gray-400 text-white">Off Track</Badge>;
                                return <Badge variant="outline">No Data</Badge>;
                              })()
                            ) : <Badge variant="outline">No Data</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}