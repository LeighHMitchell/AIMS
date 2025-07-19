"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { X, Hash, Edit2, Check, AlertCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useUser } from '@/hooks/useUser';

// Enhanced Tag interface with metadata
interface Tag {
  id: string;
  name: string;
  created_by?: string;
  created_at?: string;
  addedBy?: {
    id: string;
    name: string;
  };
  addedAt?: string;
}

interface TagsSectionProps {
  activityId?: string;
  tags: Tag[];
  onChange: (tags: Tag[]) => void;
}

// High contrast color variants for tags
const TAG_COLOR_VARIANTS = [
  'blue', 'purple', 'green', 'cyan', 'indigo', 'pink', 'rose', 'orange', 
  'amber', 'lime', 'emerald', 'teal', 'sky', 'violet', 'fuchsia'
] as const;

// Function to get tag color variant based on hash
const getTagColorVariant = (tag: Tag, index: number) => {
  // Use hash-based color assignment for consistent coloring
  const hash = tag.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return TAG_COLOR_VARIANTS[hash % TAG_COLOR_VARIANTS.length];
};

// Format date for tooltip display
const formatTooltipDate = (dateString?: string) => {
  if (!dateString) return 'Unknown date';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  } catch {
    return 'Unknown date';
  }
};

export default function TagsSection({ activityId, tags, onChange }: TagsSectionProps) {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [apiAvailable, setApiAvailable] = useState(true);
  
  // Inline editing state
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingOpen, setEditingOpen] = useState(false);

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
      
      // Enhance tags with metadata if available
      const enhancedTags = data.map((tag: any) => ({
        ...tag,
        addedBy: tag.created_by ? { id: tag.created_by, name: 'Unknown User' } : undefined,
        addedAt: tag.created_at
      }));
      
      setAvailableTags(Array.isArray(enhancedTags) ? enhancedTags : []);
    } catch (error) {
      console.error('Error fetching tags:', error);
      setApiAvailable(false);
      setAvailableTags([]);
      if (apiAvailable) {
        toast.warning('Tags API unavailable. You can still create tags manually.');
      }
    } finally {
      setLoading(false);
    }
  }, [apiAvailable]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        fetchTags(searchQuery);
      } else {
        fetchTags('');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchTags]);

  // Add a new tag
  const addTag = async (tagName: string) => {
    const normalizedName = tagName.toLowerCase().trim();
    
    if (!normalizedName) {
      toast.error('Tag name cannot be empty');
      return;
    }

    if (tags.some(t => t.name.toLowerCase() === normalizedName)) {
      toast.warning('Tag already exists');
      return;
    }

    if (apiAvailable && activityId) {
      try {
        // Step 1: Create or get the tag
        const response = await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: normalizedName,
            created_by: user?.id 
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`);
        }

        const newTag = await response.json();
        
        // Check if tag is already linked to this activity
        const existingTag = tags.find(t => t.id === newTag.id);
        if (existingTag) {
          toast.warning('Tag is already added to this activity');
          return;
        }
        
        // Step 2: Link the tag to the activity
        const linkResponse = await fetch(`/api/activities/${activityId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            tag_id: newTag.id 
          })
        });

        if (!linkResponse.ok) {
          const linkErrorData = await linkResponse.json().catch(() => ({}));
          // Handle the specific constraint violation error gracefully
          if (linkErrorData.details?.includes('duplicate key value violates unique constraint')) {
            toast.warning('Tag is already added to this activity');
            return;
          }
          throw new Error(linkErrorData.details || linkErrorData.error || `Failed to link tag to activity`);
        }

        const enhancedTag: Tag = {
          ...newTag,
          addedBy: user ? { id: user.id, name: user.name || user.email } : undefined,
          addedAt: new Date().toISOString()
        };
        
        onChange([...tags, enhancedTag]);
        toast.success('Tag added successfully');
      } catch (error) {
        console.error('Error creating tag:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to create tag: ${errorMessage}`);
      }
    } else {
      // Local mode or no activity ID - just update local state
      const localTag: Tag = {
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: normalizedName,
        addedBy: user ? { id: user.id, name: user.name || user.email } : undefined,
        addedAt: new Date().toISOString()
      };
      onChange([...tags, localTag]);
      toast.success('Tag added (local mode)');
    }
    
    setInputValue('');
    setSearchQuery('');
    setOpen(false);
  };

  // Start editing a tag
  const startEditing = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditingValue(tag.name);
    setEditingOpen(true);
  };

  // Save edited tag
  const saveEdit = async () => {
    if (!editingTagId || !editingValue.trim()) {
      toast.error('Tag name cannot be empty');
      return;
    }

    const normalizedName = editingValue.toLowerCase().trim();
    
    // Check for duplicates
    if (tags.some(t => t.id !== editingTagId && t.name.toLowerCase() === normalizedName)) {
      toast.warning('Tag with this name already exists');
      return;
    }

    const updatedTags = tags.map(tag => 
      tag.id === editingTagId 
        ? { 
            ...tag, 
            name: normalizedName
          }
        : tag
    );
    
    onChange(updatedTags);
    toast.success('Tag updated successfully');
    
    setEditingTagId(null);
    setEditingValue('');
    setEditingOpen(false);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingTagId(null);
    setEditingValue('');
    setEditingOpen(false);
  };

  // Remove a tag
  const removeTag = async (tagId: string) => {
    if (apiAvailable && activityId && !tagId.startsWith('local-')) {
      try {
        // Remove the tag-activity relationship
        const response = await fetch(`/api/activities/${activityId}/tags/${tagId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.details || errorData.error || 'Failed to remove tag');
        }

        onChange(tags.filter(t => t.id !== tagId));
        toast.success('Tag removed');
      } catch (error) {
        console.error('Error removing tag:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error(`Failed to remove tag: ${errorMessage}`);
      }
    } else {
      // Local mode or local tag - just update local state
      onChange(tags.filter(t => t.id !== tagId));
      toast.success('Tag removed');
    }
  };

  // Handle Enter key in input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  // Handle Enter key in edit input
  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  return (
    <TooltipProvider>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Hash className="w-5 h-5" />
            Tags
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <div className="space-y-2">
                  <p className="font-medium text-sm">Tagging Guidelines</p>
                  <ul className="text-xs space-y-1">
                    <li>• Use descriptive, specific tags (e.g., "water-infrastructure" instead of just "water")</li>
                    <li>• Tags are case-insensitive and will be stored in lowercase</li>
                    <li>• Reuse existing tags when possible for consistency</li>
                    <li>• Tags help with searching and reporting across activities</li>
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Add custom tags to categorize and improve searchability of this activity. Click tags to edit them inline.
          </p>
        </div>

        {/* Tag Input */}
        <div className="space-y-2">
          <Label htmlFor="tag-input">Add Tags</Label>
          <div className="relative">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger className="w-full">
                <Input
                  id="tag-input"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setSearchQuery(e.target.value);
                    setOpen(true);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type to search or add new tags..."
                  className="w-full pr-10"
                />
              </PopoverTrigger>
              <Hash className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
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
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              onClick={() => inputValue.trim() && addTag(inputValue)}
              disabled={!inputValue.trim()}
            >
              Add Tag
            </Button>
          </div>
        </div>

        {/* Selected Tags */}
        <div className="space-y-4">
          <Label>Selected Tags ({tags.length})</Label>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => {
                const isEditing = editingTagId === tag.id;
                
                return (
                  <div key={tag.id} className="relative">
                    {isEditing ? (
                      // Inline editing mode
                      <div className="inline-flex items-center gap-1 bg-white border border-blue-300 rounded-md px-2 py-1">
                        <Hash className="w-3 h-3 text-blue-600" />
                        <Input
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          className="h-6 w-20 text-xs border-none p-0 focus:ring-0"
                          autoFocus
                        />
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={saveEdit}
                            className="h-5 w-5 p-0 hover:bg-green-100"
                          >
                            <Check className="w-3 h-3 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEdit}
                            className="h-5 w-5 p-0 hover:bg-red-100"
                          >
                            <X className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Normal display mode with tooltip
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant={getTagColorVariant(tag, index)}
                            className="pl-2 pr-1 py-1 flex items-center gap-1 hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => startEditing(tag)}
                          >
                            <Hash className="w-3 h-3" />
                            {tag.name}
                            <div className="flex items-center gap-1 ml-1">
                              <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-slate-700" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeTag(tag.id);
                                }}
                                className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
                                aria-label={`Remove ${tag.name} tag`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            {tag.addedBy ? (
                              <p>Added by {tag.addedBy.name}</p>
                            ) : (
                              <p>Added by Unknown User</p>
                            )}
                            <p className="text-gray-500">
                              {formatTooltipDate(tag.addedAt)}
                            </p>
                            <p className="text-gray-400 mt-1 italic">
                              Click to edit
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No tags added yet</p>
          )}
        </div>

        {/* API Status Notice */}
        {!apiAvailable && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-900 mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Offline Mode
            </h4>
            <p className="text-xs text-yellow-800">
              Tags API is currently unavailable. You can still create and edit tags locally, and they will be saved when you save the activity.
            </p>
          </div>
        )}

      </div>
    </TooltipProvider>
  );
}