"use client"
import React, { useState, useEffect, KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tag, TrendingUp, Users, Sparkles, Plus, X, Hash, HelpCircle, Flame, Pin, UserPlus, PenTool } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";

interface Tag {
  id: string;
  name: string;
  vocabulary: string;
  code: string;
  description?: string;
  usage_count: number;
}

interface ActivityTag {
  tag_id: string;
  tagged_by: string;
  tagged_at: string;
  tags: Tag;
}

interface TagsSectionProps {
  activityId?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  sectors?: any[];
}

export default function TagsSection({ activityId, tags, onChange, sectors = [] }: TagsSectionProps) {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [popularTags, setPopularTags] = useState<Tag[]>([]);
  const [similarActivityTags, setSimilarActivityTags] = useState<Tag[]>([]);
  const [otherUserTags, setOtherUserTags] = useState<Tag[]>([]);
  const [userCreatedTags, setUserCreatedTags] = useState<Tag[]>([]);
  const [activityTags, setActivityTags] = useState<ActivityTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch tags data
  useEffect(() => {
    fetchTags();
    if (activityId) {
      fetchActivityTags();
    }
  }, [activityId]);

  // Filter search results
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = allTags.filter(tag => 
        tag.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !tags.includes(tag.id)
      );
      setSearchResults(filtered);
      setShowSuggestions(true);
    } else {
      setSearchResults([]);
      setShowSuggestions(false);
    }
  }, [searchQuery, allTags, tags]);

  const fetchTags = async () => {
    try {
      // Fetch all tags for search
      const res = await fetch(`/api/tags?limit=200`);
      if (!res.ok) {
        if (res.status === 503) {
          const error = await res.json();
          setDatabaseError(error.details || error.error);
          return;
        }
      } else {
        const data = await res.json();
        setAllTags(data);
        setDatabaseError(null);
        
        // Identify user-created tags (vocabulary=99)
        const userTags = data.filter((tag: Tag) => tag.vocabulary === '99' && tags.includes(tag.id));
        setUserCreatedTags(userTags);
      }

      // Fetch popular tags
      const popularRes = await fetch(`/api/tags?popular=true&limit=10`);
      if (popularRes.ok) {
        const data = await popularRes.json();
        setPopularTags(data);
      }

      // TODO: Fetch similar activity tags based on sectors/location
      // For now, we'll use a subset of popular tags as a placeholder
      if (sectors && sectors.length > 0) {
        // This would ideally call an API endpoint that finds tags from similar activities
        setSimilarActivityTags(popularTags.slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const fetchActivityTags = async () => {
    try {
      const res = await fetch(`/api/tags?activityId=${activityId}`);
      if (res.ok) {
        const data = await res.json();
        setActivityTags(data.activityTags || []);
        
        // Get tags added by other users
        const otherTags = (data.activityTags || [])
          .filter((at: ActivityTag) => at.tagged_by !== user?.id)
          .map((at: ActivityTag) => at.tags)
          .filter((tag: Tag) => tag && !tags.includes(tag.id));
        
        setOtherUserTags(otherTags);
      }
    } catch (error) {
      console.error("Error fetching activity tags:", error);
    }
  };

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      
      // Check if tag already exists
      const existingTag = allTags.find(tag => 
        tag.name.toLowerCase() === searchQuery.toLowerCase()
      );
      
      if (existingTag) {
        // Add existing tag
        handleAddTag(existingTag);
      } else {
        // Create new tag
        await createNewTag(searchQuery.trim());
      }
    }
  };

  const createNewTag = async (tagName: string) => {
    setLoading(true);
    try {
      const createRes = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: tagName,
          vocabulary: '99', // Custom vocabulary for user-created tags
        }),
      });

      const result = await createRes.json();
      
      if (!createRes.ok) {
        if (createRes.status === 503) {
          setDatabaseError(result.details || result.error);
          toast.error("Tags feature not available. Please contact your administrator.");
          return;
        }
        throw new Error(result.error || 'Failed to create tag');
      }
      
      const tag = result;

      // Add tag to activity if we have an activityId
      if (activityId && user?.id) {
        console.log('[AIMS DEBUG] Creating tag-activity relationship:', { activityId, tagId: tag.id, userId: user.id });
        const tagResponse = await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'addToActivity',
            activityId,
            tagId: tag.id,
            userId: user.id,
          }),
        });
        
        if (!tagResponse.ok) {
          const error = await tagResponse.json();
          console.error('[AIMS DEBUG] Failed to create tag-activity relationship:', error);
          toast.error(`Failed to associate tag with activity: ${error.error || 'Unknown error'}`);
        } else {
          console.log('[AIMS DEBUG] Successfully created tag-activity relationship');
        }
      } else {
        console.log('[AIMS DEBUG] Skipping tag-activity relationship - missing activityId or userId:', { activityId, userId: user?.id });
      }

      // Update local state
      onChange([...tags, tag.id]);
      setSearchQuery("");
      setShowSuggestions(false);
      toast.success(`Tag "${tagName}" created successfully`);
      
      // Log tag creation and addition
      try {
        import('@/lib/activity-logger').then(({ ActivityLogger }) => {
          ActivityLogger.tagAdded(
            tagName,
            { id: activityId || 'current-activity', title: 'Current Activity' },
            { id: user?.id || 'current-user', name: user?.name || 'Current User', role: user?.role || 'user' }
          );
        });
      } catch (error) {
        console.error('Failed to log tag creation:', error);
      }
      
      // Refresh tags list
      fetchTags();
    } catch (error) {
      console.error("Error creating tag:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create tag");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = (tag: Tag) => {
    if (!tags.includes(tag.id)) {
      onChange([...tags, tag.id]);
      setSearchQuery("");
      setShowSuggestions(false);
      
      // Log tag addition
      try {
        import('@/lib/activity-logger').then(({ ActivityLogger }) => {
          ActivityLogger.tagAdded(
            tag.name,
            { id: activityId || 'current-activity', title: 'Current Activity' },
            { id: user?.id || 'current-user', name: user?.name || 'Current User', role: user?.role || 'user' }
          );
        });
      } catch (error) {
        console.error('Failed to log tag addition:', error);
      }
      
      if (activityId && user?.id) {
        // Add to activity in background
        console.log('[AIMS DEBUG] Adding existing tag to activity:', { activityId, tagId: tag.id, userId: user.id });
        fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'addToActivity',
            activityId,
            tagId: tag.id,
            userId: user.id,
          }),
        }).then(async (response) => {
          if (!response.ok) {
            const error = await response.json();
            console.error('[AIMS DEBUG] Failed to add existing tag to activity:', error);
          } else {
            console.log('[AIMS DEBUG] Successfully added existing tag to activity');
          }
        }).catch(error => {
          console.error('[AIMS DEBUG] Error adding existing tag to activity:', error);
        });
      } else {
        console.log('[AIMS DEBUG] Skipping existing tag-activity relationship - missing activityId or userId:', { activityId, userId: user?.id });
      }
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      const tagToRemove = allTags.find(tag => tag.id === tagId);
      
      if (activityId) {
        await fetch('/api/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'removeFromActivity',
            activityId,
            tagId,
          }),
        });
      }

      onChange(tags.filter(id => id !== tagId));
      
      // Log tag removal
      if (tagToRemove) {
        try {
          import('@/lib/activity-logger').then(({ ActivityLogger }) => {
            ActivityLogger.tagRemoved(
              tagToRemove.name,
              { id: activityId || 'current-activity', title: 'Current Activity' },
              { id: user?.id || 'current-user', name: user?.name || 'Current User', role: user?.role || 'user' }
            );
          });
        } catch (logError) {
          console.error('Failed to log tag removal:', logError);
        }
      }
    } catch (error) {
      console.error("Error removing tag:", error);
      toast.error("Failed to remove tag");
    }
  };

  const selectedTags = allTags.filter(tag => tags.includes(tag.id));

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Activity Tags
            </CardTitle>
            <CardDescription>
              Select existing tags or create your own. Tags help group and discover activities by theme.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {databaseError ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <HelpCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Tags Feature Not Available</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      The tags database tables have not been created yet. Please ask your administrator to run the SQL migration script:
                    </p>
                    <code className="block mt-2 text-xs bg-yellow-100 p-2 rounded">
                      sql/create_tags_tables.sql
                    </code>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Tag Input Field */}
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      placeholder="Type to search existing tags or press Enter to create new..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={loading}
                      className="pr-10"
                    />
                    {loading && (
                      <div className="absolute right-3 top-3">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                      </div>
                    )}
                  </div>

                  {/* Search Results Dropdown */}
                  {showSuggestions && searchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                      {searchResults.map(tag => (
                        <button
                          key={tag.id}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center justify-between"
                          onClick={() => handleAddTag(tag)}
                        >
                          <span>{tag.name}</span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {tag.usage_count}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected Tags */}
                  <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-lg bg-gray-50">
                    {selectedTags.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No tags selected</p>
                    ) : (
                      selectedTags.map(tag => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="gap-1 pr-1 py-1"
                        >
                          {tag.name}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                            onClick={() => handleRemoveTag(tag.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                {/* Tag Suggestion Sections */}
                <div className="space-y-6">
                  {/* Popular Tags */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-500" />
                      <h4 className="text-sm font-medium">Popular Tags Across the System</h4>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3 w-3 text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>These are the most frequently used tags across all activities.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {popularTags.map(tag => (
                        <Badge
                          key={tag.id}
                          variant={tags.includes(tag.id) ? "gray" : "outline"}
                          className={cn(
                            "cursor-pointer hover:bg-gray-200",
                            tags.includes(tag.id) && "opacity-50 cursor-not-allowed"
                          )}
                          onClick={() => !tags.includes(tag.id) && handleAddTag(tag)}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Similar Activities Tags */}
                  {similarActivityTags.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Pin className="h-4 w-4 text-blue-500" />
                        <h4 className="text-sm font-medium">Tags Used on Similar Activities</h4>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Tags from activities with similar sectors, locations, or funding.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {similarActivityTags.map(tag => (
                          <Badge
                            key={tag.id}
                            variant="blue"
                            className={cn(
                              "cursor-pointer hover:bg-blue-100",
                              tags.includes(tag.id) && "opacity-50 cursor-not-allowed"
                            )}
                            onClick={() => !tags.includes(tag.id) && handleAddTag(tag)}
                          >
                            {tag.name}
                            <span className="ml-1 text-xs opacity-60">used in 3</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Users' Tags */}
                  {activityId && otherUserTags.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-500" />
                        <h4 className="text-sm font-medium">Tags Used by Other Contributors on This Activity</h4>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Tags previously applied to this activity by other users.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {otherUserTags.map(tag => (
                          <Badge
                            key={tag.id}
                            variant="purple"
                            className={cn(
                              "cursor-pointer hover:bg-purple-100",
                              tags.includes(tag.id) && "opacity-50 cursor-not-allowed"
                            )}
                            onClick={() => !tags.includes(tag.id) && handleAddTag(tag)}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* User-Created Tags */}
                  {userCreatedTags.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <PenTool className="h-4 w-4 text-green-500" />
                        <h4 className="text-sm font-medium">User-Created Tags</h4>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-3 w-3 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>New tags you've created that don't exist in the system yet.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {userCreatedTags.map(tag => (
                          <Badge
                            key={tag.id}
                            variant="green"
                          >
                            {tag.name}
                            <span className="ml-1 text-xs bg-green-500 text-white px-1 rounded">+ New</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
} 