"use client";

import React, { useState, useEffect } from "react";
import { X, Search, Link2, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { RELATIONSHIP_TYPES } from "@/data/iati-relationship-types";

interface Activity {
  id: string;
  title_narrative: string;
  acronym?: string;
  iati_identifier?: string;
  activity_status?: string;
}

interface AddLinkedActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityId: string;
  onSuccess: () => void;
  initialMode?: "internal" | "external";
  preSelectedActivity?: Activity | null;
}

export function AddLinkedActivityModal({
  isOpen,
  onClose,
  onSuccess,
  activityId,
  initialMode = "internal",
  preSelectedActivity = null,
}: AddLinkedActivityModalProps) {
  const [linkType, setLinkType] = useState<"internal" | "external">(initialMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Activity[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [relationshipType, setRelationshipType] = useState("1");
  const [narrative, setNarrative] = useState("");
  const [saving, setSaving] = useState(false);

  // External link fields
  const [externalIatiId, setExternalIatiId] = useState("");
  const [externalTitle, setExternalTitle] = useState("");

  // Sync linkType with initialMode when modal opens
  useEffect(() => {
    if (isOpen) {
      setLinkType(initialMode);
    }
  }, [isOpen, initialMode]);

  // Populate selectedActivity when preSelectedActivity is provided
  useEffect(() => {
    if (isOpen && preSelectedActivity) {
      setSelectedActivity(preSelectedActivity);
    }
  }, [isOpen, preSelectedActivity]);

  // Search for activities in the database
  useEffect(() => {
    if (searchQuery.length < 2 || linkType !== "internal") {
      setSearchResults([]);
      return;
    }

    const searchActivities = async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/activities/search?q=${encodeURIComponent(searchQuery)}&limit=10`
        );
        if (response.ok) {
          const data = await response.json();
          // Handle both response formats (array or {activities: array})
          const activities = Array.isArray(data) ? data : (data.activities || []);
          // Filter out the current activity
          setSearchResults(activities.filter((a: Activity) => a.id !== activityId));
        }
      } catch (error) {
        console.error("Error searching activities:", error);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchActivities, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, activityId, linkType]);

  const handleSave = async () => {
    // Validation
    if (linkType === "internal" && !selectedActivity) {
      toast.error("Please select an activity to link");
      return;
    }

    if (linkType === "external" && !externalIatiId.trim()) {
      toast.error("Please enter an IATI identifier");
      return;
    }

    if (!relationshipType) {
      toast.error("Please select a relationship type");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        relationship_type: relationshipType,
        narrative: narrative.trim() || null,
        ...(linkType === "internal"
          ? { related_activity_id: selectedActivity!.id }
          : {
              external_iati_identifier: externalIatiId.trim(),
              external_activity_title: externalTitle.trim() || null,
            }),
      };

      const response = await fetch(
        `/api/activities/${activityId}/related-activities`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create link");
      }

      toast.success(
        linkType === "internal"
          ? "Activity linked successfully"
          : "External activity link created successfully"
      );
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Error creating link:", error);
      toast.error(error.message || "Failed to create link");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    // Reset to initialMode instead of hardcoded "internal"
    setLinkType(initialMode);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedActivity(null);
    setRelationshipType("1");
    setNarrative("");
    setExternalIatiId("");
    setExternalTitle("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Add Linked Activity
          </DialogTitle>
          <DialogDescription>
            Link this activity to another activity in your database or to an external
            IATI activity
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Link Type Selection */}
          <div className="space-y-2">
            <Label>Link Type</Label>
            <div className="grid grid-cols-2 gap-4">
              <Button
                type="button"
                variant={linkType === "internal" ? "default" : "outline"}
                onClick={() => setLinkType("internal")}
                className="w-full"
              >
                <Search className="h-4 w-4 mr-2" />
                Activity in Database
              </Button>
              <Button
                type="button"
                variant={linkType === "external" ? "default" : "outline"}
                onClick={() => setLinkType("external")}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                External IATI Activity
              </Button>
            </div>
          </div>

          {/* Internal Link - Search Activities */}
          {linkType === "internal" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="search">Search for Activity</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by title, acronym, or IATI ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Selected Activity */}
              {selectedActivity && (
                <div className="p-3 border rounded-md bg-blue-50 border-blue-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {selectedActivity.title_narrative}
                      </div>
                      {selectedActivity.iati_identifier && (
                        <code className="text-xs bg-white px-1.5 py-0.5 rounded mt-1 inline-block">
                          {selectedActivity.iati_identifier}
                        </code>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedActivity(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Search Results */}
              {!selectedActivity && searchQuery.length >= 2 && (
                <div className="border rounded-md max-h-64 overflow-y-auto">
                  {searching && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Searching...
                    </div>
                  )}
                  {!searching && searchResults.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No activities found
                    </div>
                  )}
                  {!searching &&
                    searchResults.map((activity) => (
                      <button
                        key={activity.id}
                        onClick={() => setSelectedActivity(activity)}
                        className="w-full p-3 text-left hover:bg-accent transition-colors border-b last:border-b-0"
                      >
                        <div className="font-medium text-sm">
                          {activity.title_narrative}
                        </div>
                        {activity.iati_identifier && (
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded mt-1 inline-block">
                            {activity.iati_identifier}
                          </code>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* External Link - IATI ID Input */}
          {linkType === "external" && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Enter the IATI identifier of an activity that doesn't exist in your
                  database yet. You can sync this link later when the activity is added.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="external-iati-id">
                  IATI Identifier <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="external-iati-id"
                  placeholder="e.g., GB-GOV-1-12345"
                  value={externalIatiId}
                  onChange={(e) => setExternalIatiId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The unique IATI identifier of the related activity
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="external-title">Activity Title (Optional)</Label>
                <Input
                  id="external-title"
                  placeholder="Enter activity title for reference"
                  value={externalTitle}
                  onChange={(e) => setExternalTitle(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Optional title to help identify this activity
                </p>
              </div>
            </div>
          )}

          {/* Relationship Type */}
          <div className="space-y-2">
            <Label htmlFor="relationship-type">
              Relationship Type <span className="text-red-500">*</span>
            </Label>
            <Select value={relationshipType} onValueChange={setRelationshipType}>
              <SelectTrigger id="relationship-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map((type) => (
                  <SelectItem key={type.code} value={type.code}>
                    <div>
                      <div className="font-medium">{type.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {type.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Narrative */}
          <div className="space-y-2">
            <Label htmlFor="narrative">Description (Optional)</Label>
            <Textarea
              id="narrative"
              placeholder="Describe the relationship between these activities..."
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Creating Link..." : "Create Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
