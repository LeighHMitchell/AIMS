"use client";

import React, { useState } from 'react';
import { X, Users, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { WORKING_GROUPS, groupWorkingGroupsBySector, WorkingGroup } from '@/lib/workingGroups';

interface WorkingGroupMapping {
  code: string;
  label: string;
  vocabulary: string;
}

interface WorkingGroupsSectionProps {
  activityId?: string;
  workingGroups: WorkingGroupMapping[];
  onChange: (workingGroups: WorkingGroupMapping[]) => void;
}

export default function WorkingGroupsSection({ activityId, workingGroups, onChange }: WorkingGroupsSectionProps) {
  const [selectedGroups, setSelectedGroups] = useState<string[]>(
    workingGroups.map(wg => wg.code)
  );
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false);
  const groupedWGs = groupWorkingGroupsBySector();

  // Toggle a working group selection
  const toggleWorkingGroup = (code: string) => {
    const wg = WORKING_GROUPS.find(w => w.code === code);
    if (!wg) return;

    const isSelected = selectedGroups.includes(code);
    let newSelection: string[];
    
    if (isSelected) {
      newSelection = selectedGroups.filter(c => c !== code);
      toast.success(`Removed from ${wg.label}`);
    } else {
      newSelection = [...selectedGroups, code];
      toast.success(`Added to ${wg.label}`);
    }
    
    setSelectedGroups(newSelection);
    
    // Convert to WorkingGroupMapping format
    const mappings: WorkingGroupMapping[] = newSelection.map(code => {
      const wg = WORKING_GROUPS.find(w => w.code === code)!;
      return {
        code: wg.code,
        label: wg.label,
        vocabulary: "99" // Custom vocabulary as per IATI standard
      };
    });
    
    onChange(mappings);
  };

  // Remove a working group
  const removeWorkingGroup = (code: string) => {
    const wg = WORKING_GROUPS.find(w => w.code === code);
    if (!wg) return;
    
    const newSelection = selectedGroups.filter(c => c !== code);
    setSelectedGroups(newSelection);
    
    const mappings: WorkingGroupMapping[] = newSelection.map(code => {
      const wg = WORKING_GROUPS.find(w => w.code === code)!;
      return {
        code: wg.code,
        label: wg.label,
        vocabulary: "99"
      };
    });
    
    onChange(mappings);
    toast.success(`Removed from ${wg.label}`);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Working Group Mapping
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Map this activity to relevant Technical or Sector Working Groups for coordination and reporting
        </p>
      </div>

      {/* Multi-select Dropdown */}
      <div className="space-y-4">
        <Label htmlFor="working-groups">Select Working Groups</Label>
        <div className="relative">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setIsMultiSelectOpen(!isMultiSelectOpen)}
          >
            <span className="text-left">
              {selectedGroups.length === 0 
                ? "Select working groups..." 
                : `${selectedGroups.length} group${selectedGroups.length !== 1 ? 's' : ''} selected`}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isMultiSelectOpen ? 'rotate-180' : ''}`} />
          </Button>
          
          {isMultiSelectOpen && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-96 overflow-y-auto">
              <div className="p-4">
                {Object.entries(groupedWGs).map(([sector, groups]) => (
                  <div key={sector} className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">{sector}</h4>
                    <div className="space-y-2 pl-4">
                      {groups.map((wg) => (
                        <label
                          key={wg.code}
                          className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                        >
                          <Checkbox
                            checked={selectedGroups.includes(wg.code)}
                            onCheckedChange={() => toggleWorkingGroup(wg.code)}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{wg.label}</div>
                            {wg.description && (
                              <div className="text-xs text-gray-500 mt-0.5">{wg.description}</div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t p-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setIsMultiSelectOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Select all relevant working groups. These will be stored as IATI tags with vocabulary="99"
        </p>
      </div>

      {/* Selected Working Groups */}
      <div className="space-y-4">
        <Label>Selected Working Groups ({selectedGroups.length})</Label>
        {selectedGroups.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedGroups.map((code) => {
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

      {/* IATI Compliance Notice */}
      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-sm">
          <strong>IATI Compliance:</strong> Working groups are stored as custom tags with vocabulary="99" 
          as per IATI standard 2.03. Each working group code (e.g., TWG-Health) serves as the tag code, 
          with the label as the narrative text.
        </AlertDescription>
      </Alert>

      {/* Working Group Guidelines */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Working Group Guidelines</h4>
        <ul className="text-xs text-gray-700 space-y-1">
          <li>• Select all working groups relevant to this activity</li>
          <li>• TWG = Technical Working Group (sector-wide coordination)</li>
          <li>• SWG = Sub-Working Group (focused on specific themes)</li>
          <li>• Working groups facilitate coordination between development partners</li>
          <li>• This mapping helps with sector reporting and meeting invitations</li>
        </ul>
      </div>
    </div>
  );
} 