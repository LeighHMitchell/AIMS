import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast from 'react-hot-toast';
import { CommentsDrawer } from './activities/CommentsDrawer';

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

interface ActivityEditorProps {
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

export default function ActivityEditor({ activityId, initialData = {} }: ActivityEditorProps) {
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

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Activity Editor</h1>
          <p className="text-sm text-gray-600 mt-1">
            All changes are saved automatically
          </p>
        </div>

        {/* Activity Title */}
        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Activity Title *
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            onBlur={(e) => handleFieldBlur('title', e.target.value)}
            disabled={saving.title}
            placeholder="Enter activity title..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {saving.title && (
            <p className="text-xs text-blue-600">Saving...</p>
          )}
        </div>

        {/* Activity Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Activity Description
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            onBlur={(e) => handleFieldBlur('description', e.target.value)}
            disabled={saving.description}
            placeholder="Describe the activity objectives, scope, and expected outcomes..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
          />
          {saving.description && (
            <p className="text-xs text-blue-600">Saving...</p>
          )}
        </div>

        {/* Activity Status */}
        <div className="space-y-2">
          <label htmlFor="activity_status" className="block text-sm font-medium text-gray-700">
            Activity Status
          </label>
          <select
            id="activity_status"
            value={formData.activity_status}
            onChange={(e) => {
              handleFieldChange('activity_status', e.target.value);
              handleFieldBlur('activity_status', e.target.value);
            }}
            disabled={saving.activity_status}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Select status...</option>
            {ACTIVITY_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          {saving.activity_status && (
            <p className="text-xs text-blue-600">Saving...</p>
          )}
        </div>

        {/* Collaboration Type */}
        <div className="space-y-2">
          <label htmlFor="collaboration_type" className="block text-sm font-medium text-gray-700">
            Collaboration Type
          </label>
          <select
            id="collaboration_type"
            value={formData.collaboration_type}
            onChange={(e) => {
              handleFieldChange('collaboration_type', e.target.value);
              handleFieldBlur('collaboration_type', e.target.value);
            }}
            disabled={saving.collaboration_type}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Select collaboration type...</option>
            {COLLABORATION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {saving.collaboration_type && (
            <p className="text-xs text-blue-600">Saving...</p>
          )}
        </div>

        {/* Date Fields */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Activity Dates</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Planned Start Date */}
            <div className="space-y-2">
              <label htmlFor="planned_start_date" className="block text-sm font-medium text-gray-700">
                Planned Start Date
              </label>
              <input
                type="date"
                id="planned_start_date"
                value={formData.planned_start_date || ''}
                onChange={(e) => {
                  handleFieldChange('planned_start_date', e.target.value);
                  handleFieldBlur('planned_start_date', e.target.value);
                }}
                disabled={saving.planned_start_date}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {saving.planned_start_date && (
                <p className="text-xs text-blue-600">Saving...</p>
              )}
            </div>

            {/* Planned End Date */}
            <div className="space-y-2">
              <label htmlFor="planned_end_date" className="block text-sm font-medium text-gray-700">
                Planned End Date
              </label>
              <input
                type="date"
                id="planned_end_date"
                value={formData.planned_end_date || ''}
                onChange={(e) => {
                  handleFieldChange('planned_end_date', e.target.value);
                  handleFieldBlur('planned_end_date', e.target.value);
                }}
                disabled={saving.planned_end_date}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {saving.planned_end_date && (
                <p className="text-xs text-blue-600">Saving...</p>
              )}
            </div>

            {/* Actual Start Date */}
            <div className="space-y-2">
              <label htmlFor="actual_start_date" className="block text-sm font-medium text-gray-700">
                Actual Start Date
              </label>
              <input
                type="date"
                id="actual_start_date"
                value={formData.actual_start_date || ''}
                onChange={(e) => {
                  handleFieldChange('actual_start_date', e.target.value);
                  handleFieldBlur('actual_start_date', e.target.value);
                }}
                disabled={saving.actual_start_date}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {saving.actual_start_date && (
                <p className="text-xs text-blue-600">Saving...</p>
              )}
            </div>

            {/* Actual End Date */}
            <div className="space-y-2">
              <label htmlFor="actual_end_date" className="block text-sm font-medium text-gray-700">
                Actual End Date
              </label>
              <input
                type="date"
                id="actual_end_date"
                value={formData.actual_end_date || ''}
                onChange={(e) => {
                  handleFieldChange('actual_end_date', e.target.value);
                  handleFieldBlur('actual_end_date', e.target.value);
                }}
                disabled={saving.actual_end_date}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              {saving.actual_end_date && (
                <p className="text-xs text-blue-600">Saving...</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Changes are automatically saved when you finish editing each field.
            </p>
            <CommentsDrawer activityId={activityId}>
              <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                💬 Comments
              </button>
            </CommentsDrawer>
          </div>
        </div>
      </div>
    </div>
  );
} 