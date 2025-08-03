'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Users, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
  prefilledDate?: string;
}

interface FormData {
  title: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string;
  related_activity_id: string;
  related_organisation_id: string;
  working_group_id: string;
  visibility: string;
}

interface Activity {
  id: string;
  title: string;
}

interface Organization {
  id: string;
  name: string;
  acronym?: string;
}

interface WorkingGroup {
  id: string;
  label: string;
}

const EVENT_TYPES = [
  'Activity Milestone',
  'Transaction',
  'Working Group Meeting',
  'Donor Conference',
  'Custom'
];

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public - Everyone can see' },
  { value: 'org-only', label: 'Organization Only - Team members only' },
  { value: 'private', label: 'Private - Only me' }
];

export default function AddEventModal({ 
  isOpen, 
  onClose, 
  onEventCreated, 
  prefilledDate 
}: AddEventModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [workingGroups, setWorkingGroups] = useState<WorkingGroup[]>([]);
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    event_type: 'Custom',
    start_date: prefilledDate || '',
    end_date: '',
    related_activity_id: '',
    related_organisation_id: '',
    working_group_id: '',
    visibility: 'public'
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  // Fetch related data for dropdowns
  useEffect(() => {
    if (!isOpen) return;

    const fetchRelatedData = async () => {
      const supabase = getSupabaseClient();

      try {
        // Fetch activities
        const { data: activitiesData } = await supabase
          .from('activities')
          .select('id, title')
          .eq('publication_status', 'published')
          .order('title');

        if (activitiesData) setActivities(activitiesData);

        // Fetch organizations
        const { data: organizationsData } = await supabase
          .from('organizations')
          .select('id, name, acronym')
          .order('name');

        if (organizationsData) setOrganizations(organizationsData);

        // Fetch working groups
        const { data: workingGroupsData } = await supabase
          .from('working_groups')
          .select('id, label')
          .order('label');

        if (workingGroupsData) setWorkingGroups(workingGroupsData);

      } catch (error) {
        console.error('Error fetching related data:', error);
      }
    };

    fetchRelatedData();
  }, [isOpen]);

  // Update start date when prefilled date changes
  useEffect(() => {
    if (prefilledDate) {
      setFormData(prev => ({ ...prev, start_date: prefilledDate }));
    }
  }, [prefilledDate]);

  const validateForm = () => {
    const newErrors: Partial<FormData> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (formData.end_date && formData.start_date && 
        new Date(formData.end_date) < new Date(formData.start_date)) {
      newErrors.end_date = 'End date cannot be before start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create events',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/calendar-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          created_by: user.id,
          // Clean up empty values
          description: formData.description.trim() || null,
          end_date: formData.end_date || null,
          related_activity_id: formData.related_activity_id || null,
          related_organisation_id: formData.related_organisation_id || null,
          working_group_id: formData.working_group_id || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event');
      }

      const data = await response.json();
      
      toast({
        title: 'Event Created!',
        description: data.message || 'Event submitted for approval. You\'ll be notified once published.',
      });

      onEventCreated();
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        event_type: 'Custom',
        start_date: '',
        end_date: '',
        related_activity_id: '',
        related_organisation_id: '',
        working_group_id: '',
        visibility: 'public'
      });

    } catch (error) {
      console.error('Error creating event:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create event',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-600" />
              Add New Event
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Enter event title"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Enter event description (optional)"
                rows={3}
              />
            </div>

            {/* Event Type */}
            <div>
              <Label htmlFor="event_type">Event Type</Label>
              <Select 
                value={formData.event_type} 
                onValueChange={(value) => handleChange('event_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  className={errors.start_date ? 'border-red-500' : ''}
                />
                {errors.start_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.start_date}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="end_date">End Date (Optional)</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  className={errors.end_date ? 'border-red-500' : ''}
                />
                {errors.end_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.end_date}</p>
                )}
              </div>
            </div>

            {/* Related Activity */}
            <div>
              <Label htmlFor="related_activity">Related Activity (Optional)</Label>
              <Select 
                value={formData.related_activity_id} 
                onValueChange={(value) => handleChange('related_activity_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Link to an activity (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {activities.map((activity) => (
                    <SelectItem key={activity.id} value={activity.id}>
                      {activity.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Related Organization */}
            <div>
              <Label htmlFor="related_organisation">Related Organization (Optional)</Label>
              <Select 
                value={formData.related_organisation_id} 
                onValueChange={(value) => handleChange('related_organisation_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Link to an organization (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} {org.acronym && `(${org.acronym})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Working Group */}
            <div>
              <Label htmlFor="working_group">Working Group (Optional)</Label>
              <Select 
                value={formData.working_group_id} 
                onValueChange={(value) => handleChange('working_group_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Link to a working group (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {workingGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Visibility */}
            <div>
              <Label htmlFor="visibility">Visibility</Label>
              <Select 
                value={formData.visibility} 
                onValueChange={(value) => handleChange('visibility', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}