'use client';

import React, { useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EnhancedSearchableSelect } from '@/components/ui/enhanced-searchable-select';
import { toast } from 'sonner';
import { IATI_RELATIONSHIP_TYPES } from '@/data/iati-relationship-types';

interface LinkExternalActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activityId: string;
  onSuccess: () => void;
}

export function LinkExternalActivityModal({
  isOpen,
  onClose,
  onSuccess,
  activityId,
}: LinkExternalActivityModalProps) {
  const [externalIatiId, setExternalIatiId] = useState('');
  const [externalTitle, setExternalTitle] = useState('');
  const [relationshipType, setRelationshipType] = useState('');
  const [narrative, setNarrative] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    // Validation
    if (!externalIatiId.trim()) {
      toast.error('Please enter an IATI identifier');
      return;
    }

    if (!relationshipType) {
      toast.error('Please select a relationship type');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        relationship_type: relationshipType,
        narrative: narrative.trim() || null,
        external_iati_identifier: externalIatiId.trim(),
        external_activity_title: externalTitle.trim() || null,
      };

      const response = await fetch(
        `/api/activities/${activityId}/related-activities`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create link');
      }

      toast.success('External activity link created successfully');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error creating link:', error);
      toast.error(error.message || 'Failed to create link');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setExternalIatiId('');
    setExternalTitle('');
    setRelationshipType('');
    setNarrative('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <ExternalLink className="h-5 w-5" />
            Link External Activity
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Link this activity to an external IATI activity that doesn't exist in your database yet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* IATI Identifier */}
          <div className="space-y-2">
            <Label htmlFor="external-iati-id">
              IATI Identifier <span className="text-red-500">*</span>
            </Label>
            <Input
              id="external-iati-id"
              placeholder="e.g., GB-GOV-1-12345"
              value={externalIatiId}
              onChange={(e) => setExternalIatiId(e.target.value)}
              className="border-gray-300 focus:border-gray-500"
            />
            <p className="text-xs text-gray-500">
              The unique IATI identifier of the related activity
            </p>
          </div>

          {/* Activity Title */}
          <div className="space-y-2">
            <Label htmlFor="external-title">Activity Title (Optional)</Label>
            <Input
              id="external-title"
              placeholder="Enter activity title for reference"
              value={externalTitle}
              onChange={(e) => setExternalTitle(e.target.value)}
              className="border-gray-300 focus:border-gray-500"
            />
            <p className="text-xs text-gray-500">
              Optional title to help identify this activity
            </p>
          </div>

          {/* Relationship Type */}
          <div className="space-y-2">
            <Label htmlFor="relationship-type">
              Relationship Type <span className="text-red-500">*</span>
            </Label>
            <div className="w-full">
              <EnhancedSearchableSelect
                groups={[{
                  label: "",
                  options: IATI_RELATIONSHIP_TYPES.map(type => ({
                    code: type.code,
                    name: type.name
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
            <Label htmlFor="narrative">Narrative (Optional)</Label>
            <Textarea
              id="narrative"
              placeholder="Add additional context about this relationship..."
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              className="resize-none border-gray-300 focus:border-gray-500"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={saving}
            className="border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !relationshipType || !externalIatiId.trim()}
            className="bg-gray-900 text-white hover:bg-gray-800"
          >
            {saving && (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            )}
            {saving ? 'Creating Link...' : 'Create Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
