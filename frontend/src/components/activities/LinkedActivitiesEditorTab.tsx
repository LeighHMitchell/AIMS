'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Link2, Plus, X, ExternalLink, AlertCircle, Edit2, Trash2, ArrowRight, ArrowLeft, ArrowUpDown, CheckCircle, Loader2, FileCode } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedSearchableSelect } from '@/components/ui/enhanced-searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { IATI_RELATIONSHIP_TYPES, getRelationshipTypeName } from '@/data/iati-relationship-types';
import { fetchBasicActivityWithCache } from '@/lib/activity-cache';
import LinkedActivitiesGraph from './LinkedActivitiesGraph';
import { cn } from '@/lib/utils';
import { CreateRelationshipsTableGuide } from './CreateRelationshipsTableGuide';
import { LinkExternalActivityModal } from '@/components/modals/LinkExternalActivityModal';

interface LinkedActivity {
  id: string;
  activityId: string | null;
  activityTitle: string;
  acronym?: string;
  otherIdentifier?: string;
  iatiIdentifier: string;
  relationshipType: string;
  relationshipTypeLabel: string;
  narrative?: string;
  isExternal: boolean;
  createdBy: string;
  createdByEmail?: string;
  createdAt: string;
  direction: 'incoming' | 'outgoing';
  organizationName?: string;
  organizationAcronym?: string;
  icon?: string;
  status?: string;
}

interface Activity {
  id: string;
  title: string;
  acronym?: string;
  otherIdentifier?: string;
  iatiIdentifier: string;
  status: string;
  organizationName?: string;
  organizationAcronym?: string;
  icon?: string | null;
}

interface LinkedActivitiesEditorTabProps {
  activityId: string;
  currentUserId?: string;
  canEdit: boolean;
  onCountChange?: (count: number) => void;
}

const LinkedActivitiesEditorTab: React.FC<LinkedActivitiesEditorTabProps> = ({ 
  activityId, 
  currentUserId,
  canEdit,
  onCountChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Activity[]>([]);
  const [searching, setSearching] = useState(false);
  const [linkedActivities, setLinkedActivities] = useState<LinkedActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState<LinkedActivity | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [relationshipType, setRelationshipType] = useState('');
  const [narrative, setNarrative] = useState('');
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [showExternalModal, setShowExternalModal] = useState(false);

  // Fetch current activity details
  const fetchCurrentActivity = useCallback(async () => {
    if (!activityId) {
      console.log('No activityId provided');
      return;
    }
    
    try {
      console.log('Fetching activity:', activityId);
      // OPTIMIZATION: Use cached basic activity data
      const data = await fetchBasicActivityWithCache(activityId);
      console.log('Activity data:', data);
      
      setCurrentActivity({
        id: data.id,
        title: data.title_narrative || data.title || 'Untitled Activity',
        iatiIdentifier: data.iati_identifier || data.iatiIdentifier || '',
        status: data.activity_status || data.activityStatus || '',
        organizationName: data.created_by_org_name || data.organizationName || ''
      });
    } catch (error) {
      console.error('Error fetching current activity:', error);
      toast.error('Failed to load activity details');
    }
  }, [activityId]);

  // Remove the fetch all activities function - we'll only search on demand

  // Fetch linked activities
  const fetchLinkedActivities = useCallback(async () => {
    if (!activityId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/activities/${activityId}/linked`);
      if (!response.ok) throw new Error('Failed to fetch linked activities');
      
      const data = await response.json();
      const items = Array.isArray(data) ? data : [];
      setLinkedActivities(items);
      onCountChange?.(items.length);
    } catch (error: any) {
      console.error('Error fetching linked activities:', error);
      // Don't show error if it's just that the table doesn't exist
      if (!error.message?.includes('does not exist')) {
        toast.error('Failed to load linked activities');
      }
      setLinkedActivities([]);
      onCountChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    fetchCurrentActivity();
    fetchLinkedActivities();
  }, [fetchCurrentActivity, fetchLinkedActivities]);

  // Search activities with debounce
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    debounceRef.current = setTimeout(async () => {
    setSearching(true);
    try {
        const response = await fetch(`/api/activities/search?q=${encodeURIComponent(query)}&limit=20`);
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        

        // Map the database field names to component field names
        const mappedActivities = (data.activities || []).map((activity: any) => ({
          id: activity.id,
          title: activity.title_narrative || activity.title || 'Untitled Activity',
          acronym: activity.acronym || '',
          otherIdentifier: activity.other_identifier || '',
          iatiIdentifier: activity.iati_identifier || activity.iatiIdentifier || '',
          status: activity.activity_status || activity.status || '',
          organizationName: activity.created_by_org_name || activity.organizationName || '',
          organizationAcronym: activity.created_by_org_acronym || activity.organizationAcronym || '',
          icon: activity.icon || null
        }));

        // Filter out current activity and already linked activities
        const linkedActivityIds = linkedActivities
          .map(la => la.activityId)
          .filter((id): id is string => id !== null);
        
        setSearchResults(mappedActivities.filter((a: Activity) => 
          a.id !== activityId && !linkedActivityIds.includes(a.id)
        ));
    } catch (error) {
        console.error('Search error:', error);
        toast.error('Search failed');
    } finally {
      setSearching(false);
    }
    }, 300);
  }, [activityId, linkedActivities]);

  // Use search results when searching, otherwise empty
  const displayActivities = searchQuery.trim() ? searchResults : [];

  // Handle activity selection from the list
  const handleActivitySelect = (activity: Activity) => {
    setSelectedActivity(activity);
    setRelationshipType('');
    setNarrative('');
    setEditingActivity(null);
    setShowModal(true);
    // Clear search after selection
    setSearchQuery('');
    setSearchResults([]);
  };

  // Handle edit
  const handleEdit = (linkedActivity: LinkedActivity) => {
    setEditingActivity(linkedActivity);
    setRelationshipType(linkedActivity.relationshipType);
    setNarrative(linkedActivity.narrative || '');
    setShowModal(true);
  };

    // Handle save (create or update)
  const handleSave = async () => {
    if (!editingActivity && !selectedActivity) return;
    if (!relationshipType) {
      toast.error('Please select a relationship type');
      return;
    }

    try {
      setSaving(true);
      
      if (editingActivity) {
        // Update existing link
        const response = await fetch(`/api/activities/${activityId}/linked/${editingActivity.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            relationshipType,
            narrative
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update link');
        }
        toast.success('Link updated successfully');
      } else if (selectedActivity) {
        // Create new link
      const response = await fetch(`/api/activities/${activityId}/linked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedActivityId: selectedActivity.id,
            relationshipType,
            narrative
        })
      });
      
      if (!response.ok) {
          const errorData = await response.json();
          console.error('Create link error:', errorData);
          if (errorData.error === 'Database table not found' || errorData.details?.includes('does not exist')) {
            setTableMissing(true);
            throw new Error('The activity_relationships table needs to be created in your database.');
          }
          throw new Error(errorData.error || 'Failed to create link');
        }
        toast.success('Activity linked successfully');
      }

      // Refresh data
      await fetchLinkedActivities();
      
      // Update last saved timestamp
      setLastSaved(new Date());
      
      // Reset modal
      setShowModal(false);
      setSelectedActivity(null);
      setEditingActivity(null);
      setRelationshipType('');
      setNarrative('');
    } catch (error: any) {
      console.error('Error saving link:', error);
      toast.error(error.message || 'Failed to save link');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (linkedActivityId: string) => {
    if (!confirm('Are you sure you want to remove this link?')) return;
    
    try {
      setSaving(true);
      
      const response = await fetch(`/api/activities/${activityId}/linked/${linkedActivityId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete link');
      
      toast.success('Link removed successfully');
      await fetchLinkedActivities();
      
      // Update last saved timestamp
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error deleting link:', error);
      toast.error('Failed to remove link');
    } finally {
      setSaving(false);
    }
  };

  // Get icon for relationship type
  const getRelationshipIcon = (type: string) => {
    switch (type) {
      case '1': return <ArrowRight className="h-4 w-4" />; // Parent
      case '2': return <ArrowLeft className="h-4 w-4" />; // Child
      case '3': return <ArrowUpDown className="h-4 w-4" />; // Sibling
      default: return <Link2 className="h-4 w-4" />;
    }
  };

  // Get badge style for relationship type
  const getRelationshipBadgeStyle = (type: string) => {
    switch (type) {
      case '1': return "border-purple-300 text-purple-700 bg-purple-50"; // Parent - Purple
      case '2': return "border-blue-300 text-blue-700 bg-blue-50"; // Child - Blue
      case '3': return "border-green-300 text-green-700 bg-green-50"; // Sibling - Green
      case '4': return "border-orange-300 text-orange-700 bg-orange-50"; // Co-funded - Orange
      case '5': return "border-teal-300 text-teal-700 bg-teal-50"; // Third Party - Teal
      default: return "border-gray-300 text-gray-700 bg-gray-50"; // Default - Gray
    }
  };

      return (
    <div className="h-[calc(100vh-16rem)] overflow-y-auto">
      <div className="space-y-6">
        {/* Search & Link Activities - Full Width */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Search & Link Activities</h3>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by title, acronym, Activity ID, IATI ID, or organisation..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-10 border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                  disabled={!canEdit}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      handleSearch('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600"
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowExternalModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Link External Activity
                </Button>
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchQuery.trim() && (
            <div className="mt-4 max-h-60 overflow-y-auto">
              <div className="space-y-2">
                            {searching ? (
                <>
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </>
              ) : displayActivities.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">
                    No activities found for "{searchQuery}"
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Try a different search term
                  </p>
                            </div>
                          ) : (
                displayActivities.map((activity) => (
                  <Card
                    key={activity.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md hover:border-gray-400",
                      "border-gray-200"
                    )}
                    onClick={() => canEdit && handleActivitySelect(activity)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Activity Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {activity.icon ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200">
                              <img 
                                src={activity.icon} 
                                alt="Activity icon" 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to default icon if image fails to load
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  target.parentElement!.innerHTML = `
                                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                      <span class="text-blue-600 font-semibold text-sm">A</span>
                                    </div>
                                  `
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">A</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Activity Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 line-clamp-1">
                            {activity.title}
                            {activity.acronym && (
                              <span className="font-medium text-gray-900"> ({activity.acronym})</span>
                            )}
                          </h4>
                          <div className="mt-1">
                            <p className="text-xs text-gray-500 truncate">
                              {[
                                activity.otherIdentifier,
                                activity.iatiIdentifier,
                                activity.organizationName && activity.organizationAcronym 
                                  ? `${activity.organizationName} (${activity.organizationAcronym})`
                                  : activity.organizationName || (activity.organizationAcronym && `(${activity.organizationAcronym})`)
                              ].filter(Boolean).join(' • ')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            </div>
          )}
        </div>

        {/* Linked Activities - Full Width */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              Established Links
              <HelpTextTooltip content="Activities linked to this one through IATI relationship types" />
              {/* Save indicator */}
              {saving && (
                <Loader2 className="h-4 w-4 text-orange-600 animate-spin" />
              )}
              {!saving && lastSaved && linkedActivities.length > 0 && (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
            </h3>
          </div>

          {tableMissing && (
            <CreateRelationshipsTableGuide />
          )}

          {!canEdit && !tableMissing && (
            <Alert className="mb-4 border-gray-300">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don't have permission to edit linked activities.
              </AlertDescription>
            </Alert>
          )}

          {/* Linked Activities List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : linkedActivities.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Link2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No linked activities yet</p>
                {canEdit && (
                  <p className="text-xs mt-1">Search for activities above to create a link</p>
                      )}
                    </div>
            ) : (
              <div className="space-y-2">
                {linkedActivities.map((link) => (
                  <div
                    key={link.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Activity Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {link.icon ? (
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200">
                              <img 
                                src={link.icon} 
                                alt="Activity icon" 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement
                                  target.style.display = 'none'
                                  target.parentElement!.innerHTML = `
                                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                      <span class="text-blue-600 font-semibold text-sm">A</span>
                                    </div>
                                  `
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">A</span>
                            </div>
                          )}
                        </div>

                        {/* Activity Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getRelationshipIcon(link.relationshipType)}
                            <h4 className="font-medium text-gray-900 text-sm leading-tight break-words">
                              {link.activityTitle}
                              {link.acronym && (
                                <span className="font-medium text-gray-900"> ({link.acronym})</span>
                              )}
                            </h4>
                            {/* Green tick to show this link is saved to backend */}
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          </div>
                          
                          <div className="space-y-1 ml-6">
                            {link.iatiIdentifier && (
                              <p className="text-xs break-words">
                                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 font-mono">
                                  {link.iatiIdentifier}
                                </code>
                              </p>
                            )}
                            {link.otherIdentifier && (
                              <p className="text-xs text-gray-500 break-words">
                                {link.otherIdentifier}
                              </p>
                            )}
                            {(link.organizationName || link.organizationAcronym) && (
                              <p className="text-xs text-gray-500 break-words">
                                {link.organizationName && link.organizationAcronym 
                                  ? `${link.organizationName} (${link.organizationAcronym})`
                                  : link.organizationName || (link.organizationAcronym && `(${link.organizationAcronym})`)}
                              </p>
                            )}
                            {link.narrative && (
                              <div className="mt-2">
                                {link.narrative.startsWith('Imported from XML') ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-md" style={{ backgroundColor: '#004F59', color: 'white' }}>
                                    <FileCode className="h-3 w-3 flex-shrink-0" />
                                    Imported from XML
                                  </span>
                                ) : (
                                  <p className="text-sm text-gray-600">{link.narrative}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant="outline" className={getRelationshipBadgeStyle(link.relationshipType)}>
                          {getRelationshipTypeName(link.relationshipType)}
                        </Badge>
                        {canEdit && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(link)}
                              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(link.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Relationship Visualization - Full Width */}
        {currentActivity && (
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Relationship Visualization</h3>
            <div className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden" style={{ height: '600px' }}>
              <LinkedActivitiesGraph
                currentActivity={currentActivity}
                linkedActivities={linkedActivities}
              />
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {editingActivity ? 'Edit Link' : 'Link Activity'}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {editingActivity 
                ? 'Update the relationship type and narrative for this link.'
                : 'Define the relationship between these activities.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Selected Activity Info */}
            {(selectedActivity || editingActivity) && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  {/* Activity Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {(selectedActivity?.icon || editingActivity?.icon) ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200">
                        <img 
                          src={selectedActivity?.icon || editingActivity?.icon} 
                          alt="Activity icon" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            target.parentElement!.innerHTML = `
                              <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span class="text-blue-600 font-semibold text-sm">A</span>
                              </div>
                            `
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">A</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Activity Details */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 text-sm leading-tight break-words">
                      {editingActivity ? editingActivity.activityTitle : selectedActivity?.title}
                      {(selectedActivity?.acronym || editingActivity?.acronym) && (
                        <span className="font-medium text-gray-900"> ({selectedActivity?.acronym || editingActivity?.acronym})</span>
                      )}
                    </h4>
                    <div className="mt-1 space-y-1">
                      <p className="text-xs text-gray-500 break-words">
                        {selectedActivity ? [
                          selectedActivity.otherIdentifier,
                          selectedActivity.iatiIdentifier
                        ].filter(Boolean).join(' • ') : (editingActivity ? [
                          editingActivity.otherIdentifier,
                          editingActivity.iatiIdentifier
                        ].filter(Boolean).join(' • ') : '')}
                      </p>
                      {((selectedActivity && (selectedActivity.organizationName || selectedActivity.organizationAcronym)) ||
                        (editingActivity && (editingActivity.organizationName || editingActivity.organizationAcronym))) && (
                        <p className="text-xs text-gray-500 break-words">
                          Reported by: {selectedActivity ? (
                            selectedActivity.organizationName && selectedActivity.organizationAcronym 
                              ? `${selectedActivity.organizationName} (${selectedActivity.organizationAcronym})`
                              : selectedActivity.organizationName || (selectedActivity.organizationAcronym && `(${selectedActivity.organizationAcronym})`)
                          ) : editingActivity ? (
                            editingActivity.organizationName && editingActivity.organizationAcronym 
                              ? `${editingActivity.organizationName} (${editingActivity.organizationAcronym})`
                              : editingActivity.organizationName || (editingActivity.organizationAcronym && `(${editingActivity.organizationAcronym})`)
                          ) : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Relationship Type */}
            <div className="space-y-2">
              <Label htmlFor="relationship-type">Relationship Type</Label>
              <div className="w-full">
                <EnhancedSearchableSelect
                  groups={[{
                    label: "Relationship Types",
                    options: IATI_RELATIONSHIP_TYPES.map(type => ({
                      code: type.code,
                      name: type.name,
                      description: type.description
                    }))
                  }]}
                  value={relationshipType}
                  onValueChange={setRelationshipType}
                  placeholder="Select relationship type..."
                  searchPlaceholder="Search relationship types..."
                  className="w-full [&_[cmdk-list]]:max-h-[400px]"
                />
              </div>
            </div>

            {/* Narrative */}
            <div className="space-y-2">
              <Label htmlFor="narrative">Narrative</Label>
              <Textarea
                id="narrative"
                value={narrative}
                onChange={(e) => setNarrative(e.target.value)}
                placeholder="Add additional context about this relationship..."
                className="resize-none border-gray-300 focus:border-gray-500"
                rows={3}
              />
            </div>
          </div>
      
          <DialogFooter>
          <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Cancel
          </Button>
          <Button
              onClick={handleSave}
              disabled={!relationshipType || saving}
              className="bg-gray-900 text-white hover:bg-gray-800"
            >
              {saving && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {saving ? 'Saving...' : `${editingActivity ? 'Update' : 'Create'} Link`}
          </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>

        {/* Link External Activity Modal */}
        <LinkExternalActivityModal
          isOpen={showExternalModal}
          onClose={() => setShowExternalModal(false)}
          activityId={activityId}
          onSuccess={() => {
            fetchLinkedActivities();
            setShowExternalModal(false);
          }}
        />
      </div>
    </div>
  );
};

export default LinkedActivitiesEditorTab; 