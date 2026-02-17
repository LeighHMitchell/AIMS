'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Link2, Plus, X, ExternalLink, LayoutGrid, Table as TableIcon } from 'lucide-react';
import ActivityCard from './ActivityCard';
import LinkedActivityModal from './LinkedActivityModal';
import { apiFetch } from '@/lib/api-fetch';

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

interface LinkedActivitiesTabProps {
  activityId: string;
  currentUserId?: string;
}

const LinkedActivitiesTab: React.FC<LinkedActivitiesTabProps> = ({ 
  activityId, 
  currentUserId 
}) => {
  const [linkedActivities, setLinkedActivities] = useState<LinkedActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch linked activities
  const fetchLinkedActivities = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`/api/activities/${activityId}/linked`);
      if (!response.ok) throw new Error('Failed to fetch linked activities');
      
      const data = await response.json();
      setLinkedActivities(data || []);
    } catch (error) {
      console.error('Error fetching linked activities:', error);
      setLinkedActivities([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete link
  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to remove this link?')) return;
    
    try {
      const response = await apiFetch(`/api/activities/${activityId}/linked/${linkId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete link');
      
      // Refresh linked activities
      await fetchLinkedActivities();
    } catch (error) {
      console.error('Error deleting link:', error);
      alert('Failed to remove link');
    }
  };

  useEffect(() => {
    fetchLinkedActivities();
  }, [activityId]);

  // Debounced search for activities using the search-activities API
  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      
      setSearching(true);
      try {
        // Use the search-activities API which returns both UUID and IATI ID
        const response = await apiFetch(`/api/search-activities?q=${encodeURIComponent(query)}&exclude=${activityId}`);
        if (!response.ok) throw new Error('Search failed');
        
        const data = await response.json();
        

        // Filter out already linked activities
        const linkedIds = new Set(linkedActivities.map(la => la.activityId).filter(Boolean));
        const filtered = data.filter((act: any) => !linkedIds.has(act.id));
        
        setSearchResults(filtered);
      } catch (error) {
        console.error('Error searching activities:', error);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [activityId, linkedActivities]
  );

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSearch]);

  // Handle activity selection from search
  const handleSelectActivity = (activity: any) => {
    setSelectedActivity(activity);
    setShowModal(true);
  };

  // Handle link creation
  const handleLinkActivity = async (relationshipType: string) => {
    if (!selectedActivity) return;
    
    setIsLoading(true);
    try {
      const response = await apiFetch(`/api/activities/${activityId}/linked`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          linkedActivityId: selectedActivity.id, // Pass the UUID
          relationshipType,
          userId: currentUserId // Include the current user ID
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create link');
      }

      const result = await response.json();
      
      // Add the new link to the list
      if (result.relatedActivity) {
        setLinkedActivities(prev => [...prev, result.relatedActivity]);
      }
      
      // Reset UI
      setSelectedActivity(null);
      setShowModal(false);
      setSearchQuery('');
      setSearchResults([]);
      
    } catch (error) {
      console.error('Error creating link:', error);
      alert(error instanceof Error ? error.message : 'Failed to create activity link');
    } finally {
      setIsLoading(false);
    }
  };

  // Render search results
  const renderSearchResults = () => {
    if (!searchResults.length) {
      if (searchQuery.trim() && !searching) {
        return (
          <div className="mt-4 text-center text-gray-500 py-4">
            No activities found matching "{searchQuery}"
          </div>
        );
      }
      return null;
    }
    
    return (
      <div className="mt-4 border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
        <h4 className="font-medium mb-3">Search Results ({searchResults.length})</h4>
        <div className="space-y-2">
          {searchResults.map((activity) => (
            <div
              key={activity.id}
              className="p-3 bg-white rounded border hover:border-blue-500 cursor-pointer transition-colors"
              onClick={() => handleSelectActivity(activity)}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3 flex-1">
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
                    <h5 className="font-medium text-sm truncate">{activity.title}</h5>
                    <p className="text-xs text-gray-600 mt-1">
                      IATI ID: {activity.iati_id || 'N/A'} | 
                      Status: {activity.activity_status}
                    </p>
                  </div>
                </div>
                <Plus className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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
    
    if (!linkedActivities.length) {
      return (
        <div className="text-center py-8 text-gray-500">
          No linked activities yet. Use the search above to find and link related activities.
        </div>
      );
    }
    
    // Group by relationship type
    const grouped = linkedActivities.reduce((acc, la) => {
      const type = la.relationshipTypeLabel;
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
                  <thead className="bg-surface-muted">
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
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activities.map((la) => (
                      <tr key={la.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {la.isExternal ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{la.activityTitle}</span>
                              <ExternalLink className="w-3 h-3 text-gray-400" />
                            </div>
                          ) : (
                            <a
                              href={`/activities/${la.activityId}`}
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
                              onClick={(e) => {
                                e.preventDefault();
                                navigator.clipboard.writeText(la.iatiIdentifier);
                              }}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              title="Copy IATI ID"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
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
                          <div className="flex items-center justify-between">
                            <span>{new Date(la.createdAt).toLocaleDateString()}</span>
                            {currentUserId && (
                              <button
                                onClick={() => handleDeleteLink(la.id)}
                                className="text-red-500 hover:text-red-700 transition-colors ml-2"
                                title="Remove link"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
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
                            <span className="font-semibold">IATI Identifier:</span> {la.iatiIdentifier}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-xs text-gray-500">External Activity</span>
                        {currentUserId && (
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
                    {currentUserId && !la.isExternal && (
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
    <div className="space-y-6">
      {/* Search Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Link Related Activities</h2>
        
        <div className="flex gap-2 items-center">
          <div className="flex-1 relative min-w-[480px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by UUID, Activity ID, IATI Identifier, or Title..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => handleSearch(searchQuery)}
            disabled={searching || !searchQuery.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            {searching && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        {renderSearchResults()}
      </div>
      
      {/* View Toggle */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Linked Activities</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-l-md flex items-center gap-1 ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            <TableIcon className="h-4 w-4" />
            Table
          </button>
          <button
            onClick={() => setViewMode('card')}
            className={`px-3 py-1.5 rounded-r-md flex items-center gap-1 ${
              viewMode === 'card'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Card
          </button>
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

export default LinkedActivitiesTab; 