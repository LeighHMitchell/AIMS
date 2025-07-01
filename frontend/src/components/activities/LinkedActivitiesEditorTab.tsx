'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Link2, Plus, X, ExternalLink, AlertCircle, Copy, Check, ChevronDown } from 'lucide-react';
import ActivityCard from './ActivityCard';
import LinkedActivityModal from './LinkedActivityModal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface LinkedActivity {
  id: string;
  activityId: string | null;
  activityTitle: string;
  iatiIdentifier: string;
  relationshipType: string;
  relationshipTypeLabel: string;
  isExternal: boolean;
  createdBy: string;
  createdByEmail: string;
  createdAt: string;
  direction: 'incoming' | 'outgoing';
}

interface LinkedActivitiesEditorTabProps {
  activityId: string;
  currentUserId?: string;
  canEdit: boolean;
}

const LinkedActivitiesEditorTab: React.FC<LinkedActivitiesEditorTabProps> = ({ 
  activityId, 
  currentUserId,
  canEdit 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [linkedActivities, setLinkedActivities] = useState<LinkedActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch linked activities
  const fetchLinkedActivities = useCallback(async () => {
    if (!activityId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/activities/${activityId}/linked`);
      if (!response.ok) throw new Error('Failed to fetch linked activities');
      
      const data = await response.json();
      // Ensure data is always an array
      setLinkedActivities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching linked activities:', error);
      toast.error('Failed to load linked activities');
      // Set empty array on error
      setLinkedActivities([]);
    } finally {
      setLoading(false);
    }
  }, [activityId]);

  useEffect(() => {
    fetchLinkedActivities();
  }, [fetchLinkedActivities]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Debounced search for activities
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    
    setSearching(true);
    try {
      const response = await fetch(`/api/search-activities?q=${encodeURIComponent(query)}&exclude=${activityId || ''}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search activities');
      }
      
      const activities = await response.json();
      
      // Ensure activities is an array
      const allResults = Array.isArray(activities) ? activities : [];
      
      // Only filter out already linked activities if we have linked activities
      let filteredResults = allResults;
      let filteredCount = 0;
      
      if (Array.isArray(linkedActivities) && linkedActivities.length > 0) {
        const linkedIds = new Set(linkedActivities.map(la => la.activityId).filter(Boolean));
        filteredResults = allResults.filter((a: any) => !linkedIds.has(a.id));
        filteredCount = allResults.length - filteredResults.length;
      }
      
      setSearchResults(filteredResults);
      setShowDropdown(true); // Always show dropdown to display messages
      setSelectedIndex(-1);
      
      // Store filtered count for display
      (window as any).__filteredCount = filteredCount;
      (window as any).__totalFound = allResults.length;
      
      console.log(`[LinkedActivities] Search results: ${allResults.length} found, ${filteredResults.length} after filtering`);
    } catch (error) {
      console.error('Error searching activities:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to search activities');
      setSearchResults([]);
      setShowDropdown(true); // Show dropdown to display error
    } finally {
      setSearching(false);
    }
  }, [activityId, linkedActivities]);

  // Handle search input change with debouncing
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    
    // Clear previous debounce timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set new debounce timeout
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300); // 300ms debounce
  }, [performSearch]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || searchResults.length === 0) {
      if (e.key === 'Enter' && searchQuery.trim()) {
        performSearch(searchQuery);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          selectActivity(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Select activity for linking
  const selectActivity = (activity: any) => {
    setSelectedActivity(activity);
    setShowModal(true);
    setShowDropdown(false);
    setSelectedIndex(-1);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Handle linking confirmation
  const handleLinkActivity = async (relationshipType: string) => {
    if (!selectedActivity || !activityId) return;
    
    try {
      const response = await fetch(`/api/activities/${activityId}/linked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkedActivityId: selectedActivity.id,
          relationshipType
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to link activity');
      }
      
      toast.success('Activity linked successfully');
      setShowModal(false);
      setSelectedActivity(null);
      setSearchQuery('');
      setSearchResults([]);
      setShowDropdown(false);
      setSelectedIndex(-1);
      fetchLinkedActivities();
    } catch (error: any) {
      console.error('Error linking activity:', error);
      toast.error(error.message || 'Failed to link activity');
    }
  };

  // Delete linked activity
  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to remove this link?')) return;
    
    try {
      const response = await fetch(`/api/activities/${activityId}/linked/${linkId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete link');
      
      toast.success('Link removed successfully');
      fetchLinkedActivities();
    } catch (error) {
      console.error('Error deleting link:', error);
      toast.error('Failed to remove link');
    }
  };

  // Copy IATI ID to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('IATI ID copied to clipboard');
  };

  // Relationship type labels
  const relationshipTypeLabels: Record<string, string> = {
    '1': 'Parent',
    '2': 'Child', 
    '3': 'Sibling',
    '4': 'Co-funded',
    '5': 'Third-party'
  };

  // Render linked activities
  const renderLinkedActivities = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(j => (
                  <div key={j} className="h-32 bg-gray-100 rounded-lg"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    // Ensure linkedActivities is an array before checking length
    if (!Array.isArray(linkedActivities) || linkedActivities.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No linked activities yet. Use the search above to find and link related activities.
        </div>
      );
    }
    
    // Group by relationship type - ensure we're working with valid data
    const grouped = linkedActivities.reduce((acc, la) => {
      const type = la.relationshipTypeLabel || 'Unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(la);
      return acc;
    }, {} as Record<string, LinkedActivity[]>);
    
    if (viewMode === 'list') {
      return (
        <div className="space-y-6">
          {Object.entries(grouped).map(([type, activities]) => (
            <div key={type}>
              <h3 className="font-medium text-lg mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                {type} Activities ({activities.length})
              </h3>
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IATI Identifier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Direction
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      {canEdit && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activities.map((la) => (
                      <tr key={la.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {la.isExternal ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{la.activityTitle}</span>
                              <ExternalLink className="w-3 h-3 text-gray-400" />
                            </div>
                          ) : (
                            <a
                              href={`/activities/${la.activityId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              {la.activityTitle}
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">{la.iatiIdentifier}</span>
                            <button
                              onClick={() => copyToClipboard(la.iatiIdentifier, la.id)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              title="Copy IATI ID"
                            >
                              {copiedId === la.id ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            la.direction === 'outgoing' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {la.direction}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(la.createdAt).toLocaleDateString()}
                        </td>
                        {canEdit && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleDeleteLink(la.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    // Card view
    return (
      <div className="space-y-6">
        {Object.entries(grouped).map(([type, activities]) => (
          <div key={type}>
            <h3 className="font-medium text-lg mb-3 flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              {type} Activities ({activities.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activities.map((la) => (
                <div key={la.id} className="relative">
                  {la.isExternal ? (
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{la.activityTitle}</h4>
                          <p className="text-xs text-gray-600 mt-1">
                            IATI: {la.iatiIdentifier}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-xs text-gray-500">External Activity</span>
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteLink(la.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Remove link"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <ActivityCard
                      activity={{
                        id: la.activityId!,
                        title: la.activityTitle,
                        iati_id: la.iatiIdentifier,
                        activity_status: 'active',
                        publication_status: 'published'
                      } as any}
                    />
                  )}
                  <div className="absolute top-2 right-2 flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      la.direction === 'outgoing' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {la.direction}
                    </span>
                    {canEdit && !la.isExternal && (
                      <button
                        onClick={() => handleDeleteLink(la.id)}
                        className="bg-white rounded-full p-1 shadow-sm hover:shadow-md transition-shadow text-red-500 hover:text-red-700"
                        title="Remove link"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Linked Activities</h3>
        <p className="text-sm text-gray-600 mt-1">
          Link this activity to other related activities using IATI standard relationship types.
        </p>
      </div>

      {!canEdit && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to edit linked activities. Contact the activity owner or your administrator.
          </AlertDescription>
        </Alert>
      )}

      {/* Search Section */}
      {canEdit && (
        <div className="space-y-4">
          <Label htmlFor="activity-search">Search and Link Activities</Label>
          <div className="relative" ref={dropdownRef}>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Input
                  ref={searchInputRef}
                  id="activity-search"
                  type="text"
                  placeholder="Type to search by ID, Title, or IATI Identifier..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (searchResults.length > 0) {
                      setShowDropdown(true);
                    }
                  }}
                  disabled={!activityId}
                  className="flex-1 min-w-[480px] pr-10"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  {searching ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  ) : (
                    <Search className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
            
            {/* Live Search Dropdown */}
            {showDropdown && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-80 overflow-y-auto" style={{ zIndex: 9999 }}>
                {searchResults.length > 0 ? (
                  <div className="p-2">
                    <div className="flex items-center justify-between mb-2 px-2">
                      <p className="text-xs text-gray-600 font-medium">
                        Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                      </p>
                      {(window as any).__filteredCount > 0 && (
                        <p className="text-xs text-amber-600">
                          {(window as any).__filteredCount} already linked
                        </p>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {searchResults.map((activity, index) => (
                        <div
                          key={activity.id}
                          className={`p-3 mx-1 mb-1 rounded-md cursor-pointer transition-all duration-150 ${
                            index === selectedIndex 
                              ? 'bg-blue-50 border-2 border-blue-300 shadow-sm' 
                              : 'hover:bg-gray-50 border-2 border-transparent'
                          }`}
                          onClick={() => selectActivity(activity)}
                          onMouseEnter={() => setSelectedIndex(index)}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <h5 className="font-semibold text-sm text-gray-900 line-clamp-1">
                                {activity.title || 'Untitled Activity'}
                              </h5>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {activity.id && (
                                  <p className="text-xs text-gray-500 font-mono">
                                    ID: {activity.id.slice(0, 8)}...
                                  </p>
                                )}
                                {activity.iati_id && (
                                  <p className="text-xs text-gray-600 font-medium">
                                    IATI: {activity.iati_id}
                                  </p>
                                )}
                                {activity.partner_id && (
                                  <p className="text-xs text-gray-600">
                                    Partner: {activity.partner_id}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  activity.publication_status === 'published' 
                                    ? 'bg-green-100 text-green-700' 
                                    : activity.publication_status === 'draft'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {activity.publication_status || 'unknown'}
                                </span>
                                {activity.activity_status && (
                                  <span className="text-xs text-gray-500 capitalize">
                                    {activity.activity_status}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0 pl-2">
                              <Plus className="w-5 h-5 text-blue-500" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6">
                    {!searching && searchQuery.length >= 2 ? (
                      <div className="text-center">
                        <p className="text-sm text-gray-600 font-medium">
                          {(window as any).__totalFound > 0 ? (
                            <>
                              All {(window as any).__totalFound} matching activit{(window as any).__totalFound === 1 ? 'y is' : 'ies are'} already linked
                            </>
                          ) : (
                            <>No activities found matching "{searchQuery}"</>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Try searching by: Activity ID, Title, IATI ID, or Partner ID
                        </p>
                      </div>
                    ) : searching ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                        <p className="text-sm text-gray-600">Searching...</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
            
            {/* Info message for minimum search length */}
            {searchQuery.length > 0 && searchQuery.length < 2 && (
              <div className="absolute z-50 w-full mt-1 bg-yellow-50 border border-yellow-200 rounded-lg p-3" style={{ zIndex: 9999 }}>
                <p className="text-xs text-yellow-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Please type at least 2 characters to search
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* View Mode Toggle */}
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Linked Activities</h4>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'card' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('card')}
          >
            Card View
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List View
          </Button>
        </div>
      </div>
      
      {/* Linked Activities Display */}
      {renderLinkedActivities()}
      
      {/* Link Activity Modal */}
      {showModal && selectedActivity && (
        <LinkedActivityModal
          activity={selectedActivity}
          onConfirm={handleLinkActivity}
          onCancel={() => {
            setShowModal(false);
            setSelectedActivity(null);
          }}
        />
      )}
    </div>
  );
};

export default LinkedActivitiesEditorTab; 