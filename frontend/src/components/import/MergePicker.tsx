'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  FileText, 
  Calendar,
  AlertCircle,
  Check
} from 'lucide-react';
import { apiFetch } from '@/lib/api-fetch';
// Native debounce implementation
const debounce = <T extends (...args: any[]) => any>(func: T, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  const debouncedFunc = ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  }) as T & { cancel: () => void };
  
  debouncedFunc.cancel = () => {
    clearTimeout(timeoutId);
  };
  
  return debouncedFunc;
};

// Inline strings for demo - in production would come from i18n
const iatiImportStrings = {
  'merge.searchPlaceholder': 'Search activities by title or IATI ID...',
  'merge.noResults': 'No activities found matching your search',
  'btn.cancel': 'Cancel'
};

export interface Activity {
  id: string;
  title: string;
  iatiId?: string;
  status?: string;
  lastModified?: string;
  reportingOrgRef?: string;
}

export interface MergePickerProps {
  onSelect: (activityId: string) => void;
  onCancel: () => void;
}

export function MergePicker({ onSelect, onCancel }: MergePickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Debounced search function
  const debouncedSearch = useMemo(
    () => debounce(async (query: string) => {
      if (!query.trim()) {
        setActivities([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch(`/api/activities/search?query=${encodeURIComponent(query)}&limit=20`
        );

        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const data = await response.json();
        setActivities(data.activities || []);
      } catch (err) {
        console.error('Search error:', err);
        setError(err instanceof Error ? err.message : 'Search failed');
        setActivities([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // Effect to trigger search when query changes
  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery, debouncedSearch]);

  // Load initial activities on mount
  useEffect(() => {
    const loadInitialActivities = async () => {
      setLoading(true);
      try {
        const response = await apiFetch('/api/activities/search?limit=10&recent=true');
        if (response.ok) {
          const data = await response.json();
          setActivities(data.activities || []);
        }
      } catch (err) {
        console.error('Failed to load initial activities:', err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialActivities();
  }, []);

  const handleActivitySelect = (activity: Activity) => {
    setSelectedId(activity.id);
  };

  const handleConfirm = () => {
    if (selectedId) {
      onSelect(selectedId);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    
    switch (status.toLowerCase()) {
      case 'active':
      case 'published':
      case 'implementation':
        return 'bg-green-100 text-green-800';
      case 'draft':
      case 'pipeline_preparation':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={iatiImportStrings['merge.searchPlaceholder']}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          autoFocus
        />
      </div>

      {/* Results Area */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          {error && (
            <div className="flex items-center gap-2 p-4 text-sm text-red-600 bg-red-50 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2 mb-2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              ))}
            </div>
          )}

          {!loading && !error && activities.length === 0 && searchQuery && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>{iatiImportStrings['merge.noResults']}</p>
            </div>
          )}

          {!loading && !error && activities.length === 0 && !searchQuery && (
            <div className="text-center py-8 text-gray-500">
              <Search className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>Start typing to search for activities...</p>
            </div>
          )}

          {!loading && !error && activities.length > 0 && (
            <div className="space-y-2">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedId === activity.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => handleActivitySelect(activity)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selectedId === activity.id}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleActivitySelect(activity);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        {selectedId === activity.id && (
                          <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        )}
                        <h3 className="font-medium text-sm truncate">
                          {activity.title}
                        </h3>
                      </div>

                      {activity.iatiId && (
                        <div className="text-xs text-gray-600 font-mono bg-muted px-2 py-1 rounded inline-block">
                          {activity.iatiId}
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getStatusColor(activity.status)}`}
                        >
                          {activity.status}
                        </Badge>
                        
                        {activity.lastModified && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(activity.lastModified)}</span>
                          </div>
                        )}

                        {activity.reportingOrgRef && (
                          <Badge variant="outline" className="text-xs">
                            {activity.reportingOrgRef}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
        >
          {iatiImportStrings['btn.cancel']}
        </Button>
        
        <Button
          onClick={handleConfirm}
          disabled={!selectedId}
        >
          Select Activity
        </Button>
      </div>
    </div>
  );
}