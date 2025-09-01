"use client";

import React, { useState } from 'react';
import { X, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { WORKING_GROUPS } from '@/lib/workingGroups';
import { WorkingGroupsSearchableSelect } from '@/components/forms/WorkingGroupsSearchableSelect';
import { useWorkingGroupsAutosave } from '@/hooks/use-working-groups-autosave';
import { useUser } from '@/hooks/useUser';

interface WorkingGroupMapping {
  code: string;
  label: string;
  vocabulary: string;
}

interface WorkingGroupsSectionProps {
  activityId?: string;
  workingGroups: WorkingGroupMapping[];
  onChange: (workingGroups: WorkingGroupMapping[]) => void;
  setHasUnsavedChanges?: (hasChanges: boolean) => void;
}

export default function WorkingGroupsSection({ activityId, workingGroups, onChange, setHasUnsavedChanges }: WorkingGroupsSectionProps) {
  const { user } = useUser();
  const selectedCodes = workingGroups.map(wg => wg.code);
  const workingGroupsAutosave = useWorkingGroupsAutosave(activityId, user?.id);

  // Handle working group selection changes
  const handleWorkingGroupsChange = (codes: string[]) => {
    // Convert to WorkingGroupMapping format
    const mappings: WorkingGroupMapping[] = codes.map(code => {
      const wg = WORKING_GROUPS.find(w => w.code === code)!;
      return {
        code: wg.code,
        label: wg.label,
        vocabulary: "99" // Custom vocabulary as per IATI standard
      };
    });
    
    onChange(mappings);
    setHasUnsavedChanges?.(true);
    
    // Trigger autosave
    if (activityId && user?.id) {
      workingGroupsAutosave.triggerFieldSave(mappings);
    }
    
    // Show toast for user feedback
    if (codes.length > selectedCodes.length) {
      const addedCode = codes.find(code => !selectedCodes.includes(code));
      const addedGroup = WORKING_GROUPS.find(wg => wg.code === addedCode);
      if (addedGroup) {
        toast.success(`Added to ${addedGroup.label}`);
      }
    } else if (codes.length < selectedCodes.length) {
      const removedCode = selectedCodes.find(code => !codes.includes(code));
      const removedGroup = WORKING_GROUPS.find(wg => wg.code === removedCode);
      if (removedGroup) {
        toast.success(`Removed from ${removedGroup.label}`);
      }
    }
  };

  // Remove a working group
  const removeWorkingGroup = (code: string) => {
    const newCodes = selectedCodes.filter(c => c !== code);
    handleWorkingGroupsChange(newCodes);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
      {/* Working Groups Searchable Select */}
      <div className="space-y-4">
        <Label htmlFor="working-groups">Select Working Groups</Label>
        <WorkingGroupsSearchableSelect
          value={selectedCodes}
          onValueChange={handleWorkingGroupsChange}
          placeholder="Select working groups..."
          disabled={false}
        />

      </div>

      {/* Selected Working Groups */}
      <div className="space-y-4">
        {selectedCodes.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedCodes.map((code) => {
              const wg = WORKING_GROUPS.find(w => w.code === code);
              if (!wg) return null;
              
              return (
                <Badge
                  key={code}
                  variant="cyan"
                  className="pl-2 pr-1 py-1 flex items-center gap-1 hover:shadow-sm transition-shadow"
                >
                  <Users className="w-3 h-3" />
                  <span className="text-xs">{wg.label}</span>
                  <button
                    onClick={() => removeWorkingGroup(code)}
                    className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
                    aria-label={`Remove ${wg.label}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No working groups selected yet</p>
        )}
      </div>




    </div>
  );
} 