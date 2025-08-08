import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { EnhancedActivityComments } from './EnhancedActivityComments';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';
import { LinkedActivityTitle } from '@/components/ui/linked-activity-title';
import {
  Save,
  Calendar,
  DollarSign,
  MapPin,
  Target,
  FileText,
  MessageSquare,
  Users,
  Settings,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// IATI Collaboration Type codes
const COLLABORATION_TYPES = [
  { value: '1', label: 'Bilateral' },
  { value: '2', label: 'Multilateral (inflows)' },
  { value: '3', label: 'Multilateral (outflows)' },
  { value: '4', label: 'Bilateral, core contributions to NGOs and other private bodies' },
  { value: '6', label: 'Private sector outflows' },
  { value: '7', label: 'Bilateral, ex-post reporting on NGOs\' activities funded through core contributions' },
  { value: '8', label: 'Bilateral, triangular co-operation' }
];

// IATI Activity Status codes
const ACTIVITY_STATUSES = [
  { value: '1', label: 'Pipeline/identification' },
  { value: '2', label: 'Implementation' },
  { value: '3', label: 'Finalisation' },
  { value: '4', label: 'Closed' },
  { value: '5', label: 'Cancelled' },
  { value: '6', label: 'Suspended' }
];

interface EnhancedActivityEditorProps {
  activityId: string;
  initialData?: {
    title?: string;
    description?: string;
    collaboration_type?: string;
    activity_status?: string;
    planned_start_date?: string;
    planned_end_date?: string;
    actual_start_date?: string;
    actual_end_date?: string;
  };
}

export default function EnhancedActivityEditor({ activityId, initialData = {} }: EnhancedActivityEditorProps) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('basic');
  const [commentsContext, setCommentsContext] = useState({ section: '', field: '' });
  
  // Form state
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    description: initialData.description || '',
    collaboration_type: initialData.collaboration_type || '',
    activity_status: initialData.activity_status || '1',
    planned_start_date: initialData.planned_start_date || '',
    planned_end_date: initialData.planned_end_date || '',
    actual_start_date: initialData.actual_start_date || '',
    actual_end_date: initialData.actual_end_date || ''
  });

  // Loading states for individual fields
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [lastSaved, setLastSaved] = useState<Record<string, Date>>({});

  // Utility function to update a single field in Supabase
  const updateField = async (fieldName: string, value: string, displayName: string) => {
    setSaving(prev => ({ ...prev, [fieldName]: true }));
    
    try {
      const { error } = await supabase
        .from('activities')
        .update({ 
          [fieldName]: value || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', activityId);

      if (error) throw error;
      
      setLastSaved(prev => ({ ...prev, [fieldName]: new Date() }));
      toast.success(`${displayName} saved successfully`, {
        position: 'top-right',
        duration: 2000
      });
    } catch (error) {
      console.error(`Error saving ${fieldName}:`, error);
      toast.error(`Failed to save ${displayName}`, {
        position: 'top-right',
        duration: 3000
      });
    } finally {
      setSaving(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  // Individual update functions
  const updateTitle = async (title: string) => {
    await updateField('title_narrative', title, 'Activity Title');
  };

  const updateDescription = async (description: string) => {
    await updateField('description_narrative', description, 'Activity Description');
  };

  const updateCollaborationType = async (collaborationType: string) => {
    await updateField('collaboration_type', collaborationType, 'Collaboration Type');
  };

  const updateActivityStatus = async (status: string) => {
    await updateField('activity_status', status, 'Activity Status');
  };

  const updateDate = async (dateField: string, value: string, displayName: string) => {
    await updateField(dateField, value, displayName);
  };

  // Handle form changes with optimistic updates
  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  };

  // Handle field blur events for saving
  const handleFieldBlur = async (fieldName: string, value: string) => {
    switch (fieldName) {
      case 'title':
        await updateTitle(value);
        break;
      case 'description':
        await updateDescription(value);
        break;
      case 'collaboration_type':
        await updateCollaborationType(value);
        break;
      case 'activity_status':
        await updateActivityStatus(value);
        break;
      case 'planned_start_date':
        await updateDate('planned_start_date', value, 'Planned Start Date');
        break;
      case 'planned_end_date':
        await updateDate('planned_end_date', value, 'Planned End Date');
        break;
      case 'actual_start_date':
        await updateDate('actual_start_date', value, 'Actual Start Date');
        break;
      case 'actual_end_date':
        await updateDate('actual_end_date', value, 'Actual End Date');
        break;
    }
  };

  // Context-aware commenting helper
  const setContextForComments = (section: string, field?: string) => {
    setCommentsContext({ section, field: field || '' });
    setActiveTab('comments');
  };

  // Save indicator component
  const SaveIndicator = ({ fieldName }: { fieldName: string }) => {
    const isSaving = saving[fieldName];
    const lastSave = lastSaved[fieldName];
    
    if (isSaving) {
      return (
        <div className="flex items-center gap-1 text-blue-600 text-xs">
          <Clock className="h-3 w-3 animate-spin" />
          Saving...
        </div>
      );
    }
    
    if (lastSave) {
      return (
        <div className="flex items-center gap-1 text-green-600 text-xs">
          <CheckCircle className="h-3 w-3" />
          Saved {lastSave.toLocaleTimeString()}
        </div>
      );
    }
    
    return null;
  };

  // Field wrapper with comment integration
  const FieldWrapper = ({ 
    children, 
    section, 
    field, 
    label,
    showCommentButton = true 
  }: { 
    children: React.ReactNode; 
    section: string; 
    field?: string; 
    label: string;
    showCommentButton?: boolean;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {showCommentButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setContextForComments(section, field)}
            className="h-6 px-2 text-xs"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Comment
          </Button>
        )}
      </div>
      {children}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white">
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4">
          <LinkedActivityTitle
            title="Enhanced Activity Editor"
            activityId={activityId}
            className="text-2xl font-bold text-gray-900"
            fallbackElement="h1"
          />
          <p className="text-sm text-gray-600 mt-1">
            All changes are saved automatically • Comments are context-aware
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="dates" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dates
            </TabsTrigger>
            <TabsTrigger value="finances" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Finances
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Locations
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="partners" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Partners
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments
            </TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Activity Title */}
                <FieldWrapper section="basic_info" field="title" label="Activity Title *">
                  <div className="space-y-1">
                    <Input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      onBlur={(e) => handleFieldBlur('title', e.target.value)}
                      disabled={saving.title}
                      placeholder="Enter activity title..."
                      className="w-full"
                    />
                    <SaveIndicator fieldName="title" />
                  </div>
                </FieldWrapper>

                {/* Activity Description */}
                <FieldWrapper section="basic_info" field="description" label="Activity Description">
                  <div className="space-y-1">
                    <Textarea
                      rows={4}
                      value={formData.description}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      onBlur={(e) => handleFieldBlur('description', e.target.value)}
                      disabled={saving.description}
                      placeholder="Describe the activity objectives, scope, and expected outcomes..."
                      className="resize-none"
                    />
                    <SaveIndicator fieldName="description" />
                  </div>
                </FieldWrapper>

                {/* Activity Status */}
                <FieldWrapper section="basic_info" field="status" label="Activity Status">
                  <div className="space-y-1">
                    <Select
                      value={formData.activity_status}
                      onValueChange={(value) => {
                        handleFieldChange('activity_status', value);
                        handleFieldBlur('activity_status', value);
                      }}
                      disabled={saving.activity_status}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <SaveIndicator fieldName="activity_status" />
                  </div>
                </FieldWrapper>

                {/* Collaboration Type */}
                <FieldWrapper section="basic_info" field="collaboration_type" label="Collaboration Type">
                  <div className="space-y-1">
                    <Select
                      value={formData.collaboration_type}
                      onValueChange={(value) => {
                        handleFieldChange('collaboration_type', value);
                        handleFieldBlur('collaboration_type', value);
                      }}
                      disabled={saving.collaboration_type}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select collaboration type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {COLLABORATION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <SaveIndicator fieldName="collaboration_type" />
                  </div>
                </FieldWrapper>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Dates Tab */}
          <TabsContent value="dates" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Activity Dates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Planned Start Date */}
                  <FieldWrapper section="dates" field="planned_start" label="Planned Start Date">
                    <div className="space-y-1">
                      <Input
                        type="date"
                        value={formData.planned_start_date || ''}
                        onChange={(e) => {
                          handleFieldChange('planned_start_date', e.target.value);
                          handleFieldBlur('planned_start_date', e.target.value);
                        }}
                        disabled={saving.planned_start_date}
                      />
                      <SaveIndicator fieldName="planned_start_date" />
                    </div>
                  </FieldWrapper>

                  {/* Planned End Date */}
                  <FieldWrapper section="dates" field="planned_end" label="Planned End Date">
                    <div className="space-y-1">
                      <Input
                        type="date"
                        value={formData.planned_end_date || ''}
                        onChange={(e) => {
                          handleFieldChange('planned_end_date', e.target.value);
                          handleFieldBlur('planned_end_date', e.target.value);
                        }}
                        disabled={saving.planned_end_date}
                      />
                      <SaveIndicator fieldName="planned_end_date" />
                    </div>
                  </FieldWrapper>

                  {/* Actual Start Date */}
                  <FieldWrapper section="dates" field="actual_start" label="Actual Start Date">
                    <div className="space-y-1">
                      <Input
                        type="date"
                        value={formData.actual_start_date || ''}
                        onChange={(e) => {
                          handleFieldChange('actual_start_date', e.target.value);
                          handleFieldBlur('actual_start_date', e.target.value);
                        }}
                        disabled={saving.actual_start_date}
                      />
                      <SaveIndicator fieldName="actual_start_date" />
                    </div>
                  </FieldWrapper>

                  {/* Actual End Date */}
                  <FieldWrapper section="dates" field="actual_end" label="Actual End Date">
                    <div className="space-y-1">
                      <Input
                        type="date"
                        value={formData.actual_end_date || ''}
                        onChange={(e) => {
                          handleFieldChange('actual_end_date', e.target.value);
                          handleFieldBlur('actual_end_date', e.target.value);
                        }}
                        disabled={saving.actual_end_date}
                      />
                      <SaveIndicator fieldName="actual_end_date" />
                    </div>
                  </FieldWrapper>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Finances Tab */}
          <TabsContent value="finances" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <FieldWrapper section="finances" label="Budget & Transactions" showCommentButton={true}>
                    <div className="text-sm text-gray-600 p-4 border border-gray-200 rounded">
                      <p>Financial information section will include:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Default finance types and aid types</li>
                        <li>Currency settings</li>
                        <li>Transaction management</li>
                        <li>Budget allocations</li>
                      </ul>
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          onClick={() => setContextForComments('finances', 'budget')}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Comment on Budget
                        </Button>
                      </div>
                    </div>
                  </FieldWrapper>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Locations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FieldWrapper section="locations" label="Activity Locations">
                  <div className="text-sm text-gray-600 p-4 border border-gray-200 rounded">
                    <p>Location management will include:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Country and region selection</li>
                      <li>Administrative divisions</li>
                      <li>Geographic coordinates</li>
                      <li>Location descriptions</li>
                    </ul>
                  </div>
                </FieldWrapper>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Results & Indicators
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FieldWrapper section="results" label="Results Framework">
                  <div className="text-sm text-gray-600 p-4 border border-gray-200 rounded">
                    <p>Results section will include:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Result hierarchies (Impact, Outcome, Output)</li>
                      <li>Indicators and targets</li>
                      <li>Baseline and actual values</li>
                      <li>Progress tracking</li>
                    </ul>
                  </div>
                </FieldWrapper>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Partners Tab */}
          <TabsContent value="partners" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Partners & Organizations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FieldWrapper section="partners" label="Participating Organizations">
                  <div className="text-sm text-gray-600 p-4 border border-gray-200 rounded">
                    <p>Partners section will include:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Funding organizations</li>
                      <li>Implementing partners</li>
                      <li>Accountable organizations</li>
                      <li>Organization roles and relationships</li>
                    </ul>
                  </div>
                </FieldWrapper>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Activity Comments
                  {commentsContext.section && (
                    <Badge variant="outline" className="ml-2">
                      {commentsContext.section}
                      {commentsContext.field && ` → ${commentsContext.field}`}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <EnhancedActivityComments
                  activityId={activityId}
                  contextSection={commentsContext.section}
                  contextField={commentsContext.field}
                  allowContextSwitch={true}
                  showInline={false}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Changes are automatically saved when you finish editing each field.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Enhanced Editor with Context-Aware Comments
              </Badge>
              {user && (
                <Badge variant="secondary" className="text-xs">
                  Editing as {user.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}