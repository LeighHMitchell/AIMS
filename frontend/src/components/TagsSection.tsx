"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { X, Hash } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { useUser } from '@/hooks/useUser';

interface Tag {
  id: string;
  name: string;
  created_by?: string;
}

interface TagsSectionProps {
  activityId?: string;
  tags: Tag[];
  onChange: (tags: Tag[]) => void;
}

export default function TagsSection({ activityId, tags, onChange }: TagsSectionProps) {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [apiAvailable, setApiAvailable] = useState(true);

  // Fetch available tags with debounce
  const fetchTags = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tags?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const data = await response.json();
      setAvailableTags(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching tags:', error);
      setApiAvailable(false);
      setAvailableTags([]);
      // Only show error toast if we haven't already shown it
      if (apiAvailable) {
        toast.warning('Tags API unavailable. You can still create tags manually.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        fetchTags(searchQuery);
      } else {
        fetchTags(''); // Fetch recent/popular tags when no query
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchTags]);

  // Add a tag
  const addTag = async (tagName: string) => {
    const normalizedName = tagName.toLowerCase().trim();
    
    // Check if tag already exists in selection
    if (tags.some(t => t.name.toLowerCase() === normalizedName)) {
      toast.error('Tag already added');
      return;
    }

    // Check if tag exists in available tags
    const existingTag = availableTags.find(t => t.name.toLowerCase() === normalizedName);
    
    if (existingTag) {
      onChange([...tags, existingTag]);
      toast.success('Tag added');
    } else {
      // Create new tag
      if (apiAvailable) {
        try {
          const response = await fetch('/api/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: normalizedName })
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }
          
          const newTag = await response.json();
          onChange([...tags, newTag]);
          toast.success('New tag created and added');
          
          // Refresh available tags
          fetchTags('');
        } catch (error) {
          console.error('Error creating tag:', error);
          setApiAvailable(false);
          // Fall back to local creation
          const localTag: Tag = {
            id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: normalizedName
          };
          onChange([...tags, localTag]);
          toast.warning('Tag created locally. Save activity to persist to database.');
        }
      } else {
        // Create local tag when API is unavailable
        const localTag: Tag = {
          id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: normalizedName
        };
        onChange([...tags, localTag]);
        toast.success('Tag added (local mode)');
      }
    }
    
    setInputValue('');
    setSearchQuery('');
    setOpen(false);
  };

  // Remove a tag
  const removeTag = (tagId: string) => {
    onChange(tags.filter(t => t.id !== tagId));
    toast.success('Tag removed');
  };

  // Handle Enter key in input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Hash className="w-5 h-5" />
          Tags
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Add custom tags to categorize and improve searchability of this activity
        </p>
      </div>

      {/* Tag Input */}
      <div className="space-y-4">
        <Label htmlFor="tag-input">Add Tags</Label>
        <div className="flex gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger className="flex-1">
              <Input
                id="tag-input"
                placeholder="Type to search or create tags..."
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setSearchQuery(e.target.value);
                  setOpen(true);
                }}
                onKeyDown={handleKeyDown}
                className="w-full"
              />
            </PopoverTrigger>
            <PopoverContent className="p-0 w-full" align="start">
              <Command>
                <CommandList>
                  {loading ? (
                    <CommandEmpty>Loading...</CommandEmpty>
                  ) : (
                    <>
                      {availableTags.length > 0 ? (
                        <CommandGroup>
                          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                            Existing Tags
                          </div>
                          {availableTags.map((tag) => (
                            <CommandItem
                              key={tag.id}
                              onSelect={() => {
                                addTag(tag.name);
                              }}
                              className="cursor-pointer"
                            >
                              <Hash className="mr-2 h-4 w-4" />
                              {tag.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ) : null}
                      
                      {inputValue.trim() && !availableTags.some(t => 
                        t.name.toLowerCase() === inputValue.toLowerCase().trim()
                      ) && (
                        <CommandGroup>
                          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                            Create New
                          </div>
                          <CommandItem
                            onSelect={() => addTag(inputValue)}
                            className="cursor-pointer"
                          >
                            <Hash className="mr-2 h-4 w-4" />
                            Create "{inputValue.trim()}"
                          </CommandItem>
                        </CommandGroup>
                      )}
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          
          <Button
            onClick={() => inputValue.trim() && addTag(inputValue)}
            disabled={!inputValue.trim()}
          >
            Add Tag
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          Press Enter to add a tag, or select from suggestions
        </p>
      </div>

      {/* Selected Tags */}
      <div className="space-y-4">
        <Label>Selected Tags ({tags.length})</Label>
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="pl-2 pr-1 py-1 flex items-center gap-1"
              >
                <Hash className="w-3 h-3" />
                {tag.name}
                <button
                  onClick={() => removeTag(tag.id)}
                  className="ml-1 hover:bg-gray-300 rounded-full p-0.5 transition-colors"
                  aria-label={`Remove ${tag.name} tag`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No tags added yet</p>
        )}
      </div>

      {/* API Status Notice */}
      {!apiAvailable && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">Offline Mode</h4>
          <p className="text-xs text-yellow-800">
            Tags API is currently unavailable. You can still create tags locally, and they will be saved when you save the activity.
          </p>
        </div>
      )}

      {/* Tag Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Tagging Guidelines</h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Use descriptive, specific tags (e.g., "water-infrastructure" instead of just "water")</li>
          <li>• Tags are case-insensitive and will be stored in lowercase</li>
          <li>• Reuse existing tags when possible for consistency</li>
          <li>• Tags help with searching and reporting across activities</li>
        </ul>
      </div>
    </div>
  );
}