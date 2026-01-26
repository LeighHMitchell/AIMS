'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { apiFetch } from '@/lib/api-fetch';

interface Activity {
  id: string;
  title_narrative?: string;
  title?: string;
  acronym?: string;
  iati_identifier?: string;
  created_by_org_name?: string;
  created_by_org_acronym?: string;
  icon?: string;
}

interface ActivityComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  fallbackIatiId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ActivityCombobox({
  value,
  onValueChange,
  placeholder = 'Select activity...',
  className,
  disabled = false,
  fallbackIatiId,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: ActivityComboboxProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  // Use external state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedActivity, setSelectedActivity] = React.useState<Activity | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus search input when popover opens
  React.useEffect(() => {
    if (open) {
      // Small timeout to ensure the popover is rendered
      const timeoutId = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [open]);

  // Fetch the selected activity when value changes
  React.useEffect(() => {
    console.log('[ActivityCombobox] Value changed to:', value);
    const fetchSelectedActivity = async () => {
      if (!value) {
        console.log('[ActivityCombobox] No value, clearing selection');
        setSelectedActivity(null);
        return;
      }

      // Check if activity is already in the list
      const activityInList = activities.find(a => a.id === value);
      if (activityInList) {
        console.log('[ActivityCombobox] Found activity in list:', activityInList.title_narrative || activityInList.title);
        setSelectedActivity(activityInList);
        return;
      }

      // Fetch the specific activity
      console.log('[ActivityCombobox] Fetching activity:', value);
      try {
        const response = await apiFetch(`/api/activities/${value}`);
        if (response.ok) {
          const activity = await response.json();
          console.log('[ActivityCombobox] Fetched activity:', activity.title_narrative || activity.title);
          setSelectedActivity(activity);
        }
      } catch (error) {
        console.error('Error fetching selected activity:', error);
      }
    };

    fetchSelectedActivity();
  }, [value, activities]);

  // Fetch activities based on search query
  React.useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const url = searchQuery 
          ? `/api/activities/search?q=${encodeURIComponent(searchQuery)}&limit=50`
          : `/api/activities?limit=50`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch activities');
        
        const data = await response.json();
        
        // Handle both search API response and regular activities list
        const activityList = data.activities || data;
        setActivities(activityList);
      } catch (error) {
        console.error('Error fetching activities:', error);
        setActivities([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchActivities();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const getActivityTitle = (activity: Activity) => {
    return activity.title_narrative || activity.title || 'Untitled Activity';
  };

  const getActivityDisplayName = (activity: Activity) => {
    const title = getActivityTitle(activity);
    const acronym = activity.acronym;
    return acronym ? `${title} (${acronym})` : title;
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange('');
  };

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild className="w-full">
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between font-normal h-10 px-4 py-2 text-base border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 hover:text-gray-900',
              !value && 'text-muted-foreground',
              className
            )}
            disabled={disabled}
          >
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            {selectedActivity ? (
              <>
                {selectedActivity.icon && (
                  <img 
                    src={selectedActivity.icon} 
                    alt="" 
                    className="w-6 h-6 rounded flex-shrink-0 mt-0.5"
                  />
                )}
                <div className="flex-1 min-w-0 text-left">
                  <span className="font-normal text-sm inline">
                    {getActivityTitle(selectedActivity)}
                    {selectedActivity.acronym && (
                      <span className="text-gray-500 ml-1">
                        ({selectedActivity.acronym})
                      </span>
                    )}
                    {selectedActivity.iati_identifier && (
                      <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded hover:text-gray-600 ml-2">
                        {selectedActivity.iati_identifier}
                      </span>
                    )}
                  </span>
                </div>
              </>
            ) : fallbackIatiId ? (
              <span className="text-gray-500 truncate">
                {fallbackIatiId}
              </span>
            ) : (
              <span className="text-gray-400 text-base leading-relaxed">{placeholder}</span>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            {selectedActivity && (
              <button
                type="button"
                onClick={handleClear}
                className="h-4 w-4 rounded-full hover:bg-gray-200 flex items-center justify-center transition-colors"
                aria-label="Clear selection"
                tabIndex={-1}
              >
                <X className="h-3 w-3 text-gray-500" />
              </button>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[600px]"
        align="start"
      >
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={searchInputRef}
              placeholder="Search activities by title, IATI ID, or acronym..."
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searchQuery && (
            <CommandEmpty>
              {loading ? 'Searching...' : 'No activities found.'}
            </CommandEmpty>
          )}
          <CommandGroup className="max-h-[300px] overflow-auto">
            {activities.map((activity) => {
              const title = getActivityTitle(activity);
              const orgName = activity.created_by_org_name || activity.created_by_org_acronym || 'Unknown Org';
              
              return (
                <CommandItem
                  key={activity.id}
                  value={activity.id}
                  onSelect={() => {
                    console.log('[ActivityCombobox] Selected activity:', activity.id, activity.title_narrative || activity.title);
                    onValueChange(activity.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        value === activity.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {activity.icon && (
                        <img 
                          src={activity.icon} 
                          alt="" 
                          className="w-6 h-6 rounded mt-0.5 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="font-normal text-sm inline">
                          {title}
                          {activity.acronym && (
                            <span className="text-gray-500 ml-1">
                              ({activity.acronym})
                            </span>
                          )}
                          {activity.iati_identifier && (
                            <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded hover:text-gray-600 ml-2">
                              {activity.iati_identifier}
                            </span>
                          )}
                          {(activity.created_by_org_name || activity.created_by_org_acronym) && (
                            <span className="text-xs text-gray-400 ml-2">
                              {activity.created_by_org_acronym || activity.created_by_org_name}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
    </div>
  );
}

