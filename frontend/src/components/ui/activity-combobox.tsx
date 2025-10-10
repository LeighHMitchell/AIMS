'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
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
}

export function ActivityCombobox({
  value,
  onValueChange,
  placeholder = 'Select activity...',
  className,
  disabled = false,
  fallbackIatiId,
}: ActivityComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedActivity, setSelectedActivity] = React.useState<Activity | null>(null);

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
        const response = await fetch(`/api/activities/${value}`);
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal h-auto min-h-[2.5rem]',
            !value && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-start gap-2 overflow-hidden py-1 flex-1">
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
                  <div className="font-medium truncate">
                    {getActivityTitle(selectedActivity)}
                    {selectedActivity.acronym && (
                      <span className="text-gray-500 ml-1">
                        ({selectedActivity.acronym})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {selectedActivity.iati_identifier && (
                      <span>{selectedActivity.iati_identifier}</span>
                    )}
                    {selectedActivity.iati_identifier && (selectedActivity.created_by_org_name || selectedActivity.created_by_org_acronym) && (
                      <span> • </span>
                    )}
                    {(selectedActivity.created_by_org_name || selectedActivity.created_by_org_acronym) && (
                      <span>{selectedActivity.created_by_org_name || selectedActivity.created_by_org_acronym}</span>
                    )}
                  </div>
                </div>
              </>
            ) : fallbackIatiId ? (
              <span className="text-gray-500 truncate">
                {fallbackIatiId}
              </span>
            ) : (
              placeholder
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder="Search activities by title, IATI ID, or acronym..."
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <CommandEmpty>
            {loading ? 'Searching...' : 'No activities found.'}
          </CommandEmpty>
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
                        <div className="font-medium truncate">
                          {title}
                          {activity.acronym && (
                            <span className="text-gray-500 ml-1">
                              ({activity.acronym})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {activity.iati_identifier && (
                            <span>{activity.iati_identifier} • </span>
                          )}
                          {orgName}
                        </div>
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
  );
}

