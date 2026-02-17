/**
 * ActivityEditorWithProperIndicators.tsx
 * 
 * Example implementation showing how to use the new save indicator system
 * with proper behavior for all Activity Editor fields.
 * 
 * This demonstrates the correct save indicator behavior:
 * 1. No indicator while typing (field is focused)
 * 2. Orange spinner on blur while saving
 * 3. Green tick only after successful save with non-empty value
 * 4. No indicator for empty/blank saved values
 * 5. Prefilled fields (Activity Status, Activity Scope) show green tick initially
 */

import React, { useState } from 'react';
import { AutosaveInput, AutosaveTextarea } from '@/components/ui/autosave-input';
import { AutosaveSelect } from '@/components/ui/autosave-select';
import { AutosaveBannerUpload, AutosaveIconUpload } from '@/components/ui/autosave-upload';
import { PrefilledFieldWrapper } from '@/components/ui/prefilled-field-wrapper';
import { useFieldAutosave } from '@/hooks/use-field-autosave-new';
import { HelpTextTooltip } from '@/components/ui/help-text-tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const ACRONYM_FILLER_WORDS = new Set([
  'of', 'the', 'and', 'for', 'in', 'to', 'a', 'an', 'on', 'at', 'by'
]);

function generateAcronym(title: string): string {
  return title
    .split(/\s+/)
    .filter(w => w.length > 0 && !ACRONYM_FILLER_WORDS.has(w.toLowerCase()))
    .map(w => w[0].toUpperCase())
    .join('');
}

// IATI Activity Status codes
const ACTIVITY_STATUSES = [
  { value: '1', label: 'Pipeline' },
  { value: '2', label: 'Implementation' },
  { value: '3', label: 'Finalisation' },
  { value: '4', label: 'Closed' },
  { value: '5', label: 'Cancelled' },
  { value: '6', label: 'Suspended' }
];

// IATI Activity Scope codes
const ACTIVITY_SCOPES = [
  { value: '1', label: 'Global' },
  { value: '2', label: 'Regional' },
  { value: '3', label: 'Multi-national' },
  { value: '4', label: 'National' },
  { value: '5', label: 'Sub-national: Multi-first-level administrative areas' },
  { value: '6', label: 'Sub-national: Single first-level administrative area' },
  { value: '7', label: 'Sub-national: Single second-level administrative area' },
  { value: '8', label: 'Single location' }
];

// IATI Collaboration Type codes
const COLLABORATION_TYPES = [
  { value: '1', label: 'Bilateral' },
  { value: '2', label: 'Multilateral (inflows)' },
  { value: '3', label: 'Multilateral (outflows)' },
  { value: '4', label: 'Bilateral, core contributions to NGOs' },
  { value: '6', label: 'Private sector outflows' },
  { value: '7', label: 'Bilateral, ex-post reporting on NGOs' },
  { value: '8', label: 'Bilateral, triangular co-operation' }
];

interface ActivityEditorProps {
  activityId: string;
  userId: string;
  initialData?: {
    title?: string;
    acronym?: string;
    activityId?: string;
    iatiIdentifier?: string;
    uuid?: string; // UUID is always generated and read-only
    description?: string;
    descriptionObjectives?: string;
    descriptionTargetGroups?: string;
    descriptionOther?: string;
    collaborationType?: string;
    activityStatus?: string;
    activityScope?: string;
    banner?: string | null;
    icon?: string | null;
  };
}

export function ActivityEditorWithProperIndicators({
  activityId,
  userId,
  initialData = {}
}: ActivityEditorProps) {
  // Form state
  const [formData, setFormData] = useState({
    title: initialData.title || '',
    acronym: initialData.acronym || '',
    activityIdField: initialData.activityId || '',
    iatiIdentifier: initialData.iatiIdentifier || '',
    uuid: initialData.uuid || 'ACT-' + Math.random().toString(36).substring(2, 15), // Auto-generated UUID
    description: initialData.description || '',
    descriptionObjectives: initialData.descriptionObjectives || '',
    descriptionTargetGroups: initialData.descriptionTargetGroups || '',
    descriptionOther: initialData.descriptionOther || '',
    collaborationType: initialData.collaborationType || '',
    activityStatus: initialData.activityStatus || '1', // Prefilled with Pipeline
    activityScope: initialData.activityScope || '4', // Prefilled with National
    banner: initialData.banner || null,
    icon: initialData.icon || null,
  });

  // Initialize autosave hooks for each field
  const titleAutosave = useFieldAutosave('title', {
    activityId,
    userId,
    immediate: true,
    debounceMs: 500
  });

  const acronymAutosave = useFieldAutosave('acronym', {
    activityId,
    userId,
    debounceMs: 1000
  });

  const activityIdFieldAutosave = useFieldAutosave('otherIdentifier', {
    activityId,
    userId,
    debounceMs: 1000
  });

  const iatiIdentifierAutosave = useFieldAutosave('iatiIdentifier', {
    activityId,
    userId,
    debounceMs: 1000
  });

  const descriptionAutosave = useFieldAutosave('description', {
    activityId,
    userId,
    debounceMs: 2000
  });

  const descriptionObjectivesAutosave = useFieldAutosave('descriptionObjectives', {
    activityId,
    userId,
    debounceMs: 2000
  });

  const descriptionTargetGroupsAutosave = useFieldAutosave('descriptionTargetGroups', {
    activityId,
    userId,
    debounceMs: 2000
  });

  const descriptionOtherAutosave = useFieldAutosave('descriptionOther', {
    activityId,
    userId,
    debounceMs: 2000
  });

  const collaborationTypeAutosave = useFieldAutosave('collaborationType', {
    activityId,
    userId,
    immediate: true
  });

  const activityStatusAutosave = useFieldAutosave('activityStatus', {
    activityId,
    userId,
    immediate: true
  });

  const activityScopeAutosave = useFieldAutosave('activityScope', {
    activityId,
    userId,
    immediate: true
  });

  const bannerAutosave = useFieldAutosave('banner', {
    activityId,
    userId,
    debounceMs: 500 // Quick save for images
  });

  const iconAutosave = useFieldAutosave('icon', {
    activityId,
    userId,
    debounceMs: 500 // Quick save for images
  });

  const uuidAutosave = useFieldAutosave('uuid', {
    activityId,
    userId,
    immediate: false // UUID doesn't need to save immediately, it's auto-generated
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Activity Editor - Proper Save Indicators</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            This example demonstrates the correct save indicator behavior for all field types including uploads.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visual Assets Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Visual Assets</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Activity Banner - takes up 3 columns */}
              <div className="lg:col-span-3">
                <AutosaveBannerUpload
                  id="banner"
                  currentImage={formData.banner}
                  onImageChange={(image) => setFormData(prev => ({ ...prev, banner: image }))}
                  label="Activity Banner"
                  helpText={
                    <HelpTextTooltip>
                      Upload a banner image for this activity (16:9 aspect ratio recommended).
                    </HelpTextTooltip>
                  }
                  autosaveState={bannerAutosave.state}
                  triggerSave={bannerAutosave.triggerFieldSave}
                  disabled={!activityId || activityId === 'NEW'}
                />
              </div>

              {/* Activity Icon/Logo - takes up 1 column */}
              <div>
                <AutosaveIconUpload
                  id="icon"
                  currentImage={formData.icon}
                  onImageChange={(image) => setFormData(prev => ({ ...prev, icon: image }))}
                  label="Activity Icon/Logo"
                  helpText={
                    <HelpTextTooltip>
                      Upload a square icon or logo for this activity.
                    </HelpTextTooltip>
                  }
                  autosaveState={iconAutosave.state}
                  triggerSave={iconAutosave.triggerFieldSave}
                  disabled={!activityId || activityId === 'NEW'}
                />
              </div>
            </div>
            
            {(!activityId || activityId === 'NEW') && (
              <p className="text-sm text-amber-600 mt-2">
                Note: Banner and icon uploads will be enabled after the activity is created (after saving the title).
              </p>
            )}
          </div>

          <div className="border-t pt-6" />

          {/* Basic Information Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Activity Title - Shows indicator properly */}
              <AutosaveInput
                id="title"
                value={formData.title}
                onChange={(value) => setFormData(prev => ({ ...prev, title: value }))}
                placeholder="Enter activity title..."
                label="Activity Title"
                helpText={
                  <HelpTextTooltip>
                    The title of the activity. This should be concise and descriptive.
                  </HelpTextTooltip>
                }
                required
                autosaveState={titleAutosave.state}
                triggerSave={titleAutosave.triggerFieldSave}
                saveOnBlur={true}
              />

              {/* Activity Acronym */}
              <AutosaveInput
                id="acronym"
                value={formData.acronym}
                onChange={(value) => setFormData(prev => ({ ...prev, acronym: value }))}
                placeholder="Enter acronym..."
                label="Activity Acronym"
                helpText={
                  <HelpTextTooltip>
                    A short abbreviation or acronym for the activity.
                  </HelpTextTooltip>
                }
                autosaveState={acronymAutosave.state}
                triggerSave={acronymAutosave.triggerFieldSave}
                saveOnBlur={true}
                endAdornment={
                  formData.title.split(/\s+/).filter(w => w.length > 0 && !ACRONYM_FILLER_WORDS.has(w.toLowerCase())).length >= 2 ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            const acronym = generateAcronym(formData.title);
                            setFormData(prev => ({ ...prev, acronym }));
                            acronymAutosave.triggerFieldSave(acronym);
                          }}
                        >
                          <Wand2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Generate from title</TooltipContent>
                    </Tooltip>
                  ) : undefined
                }
              />

              {/* Activity ID */}
              <AutosaveInput
                id="activityId"
                value={formData.activityIdField}
                onChange={(value) => setFormData(prev => ({ ...prev, activityIdField: value }))}
                placeholder="Enter activity ID..."
                label="Activity ID"
                helpText={
                  <HelpTextTooltip>
                    Your organization's internal ID for this activity.
                  </HelpTextTooltip>
                }
                autosaveState={activityIdFieldAutosave.state}
                triggerSave={activityIdFieldAutosave.triggerFieldSave}
                saveOnBlur={true}
              />

              {/* IATI Identifier */}
              <AutosaveInput
                id="iatiIdentifier"
                value={formData.iatiIdentifier}
                onChange={(value) => setFormData(prev => ({ ...prev, iatiIdentifier: value }))}
                placeholder="Enter IATI identifier..."
                label="IATI Identifier"
                helpText={
                  <HelpTextTooltip>
                    The IATI activity identifier following IATI standards.
                  </HelpTextTooltip>
                }
                autosaveState={iatiIdentifierAutosave.state}
                triggerSave={iatiIdentifierAutosave.triggerFieldSave}
                saveOnBlur={true}
              />
            </div>
            
            {/* UUID Field - Read-only, always shows green tick */}
            <div className="md:col-span-2">
              <PrefilledFieldWrapper
                label="Activity UUID"
                helpText={
                  <HelpTextTooltip>
                    Auto-generated unique identifier for this activity (read-only).
                  </HelpTextTooltip>
                }
                showGreenByDefault={true}
                hasValue={!!formData.uuid}
                autosaveState={uuidAutosave.state}
              >
                <Input
                  id="uuid"
                  value={formData.uuid}
                  readOnly={true}
                  className="bg-gray-50 cursor-default"
                />
              </PrefilledFieldWrapper>
            </div>
          </div>

          {/* Description Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Activity Description</h3>
            
            <div className="space-y-4">
              {/* Main Description */}
              <AutosaveTextarea
                id="description"
                value={formData.description}
                onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                placeholder="Describe the activity..."
                label="Activity Description"
                helpText={
                  <HelpTextTooltip>
                    A detailed description of the activity's purpose and scope.
                  </HelpTextTooltip>
                }
                rows={3}
                autosaveState={descriptionAutosave.state}
                triggerSave={descriptionAutosave.triggerFieldSave}
                saveOnBlur={true}
              />

              {/* Objectives */}
              <AutosaveTextarea
                id="descriptionObjectives"
                value={formData.descriptionObjectives}
                onChange={(value) => setFormData(prev => ({ ...prev, descriptionObjectives: value }))}
                placeholder="Describe the objectives..."
                label="Activity Objectives"
                helpText={
                  <HelpTextTooltip>
                    The specific objectives this activity aims to achieve.
                  </HelpTextTooltip>
                }
                rows={3}
                autosaveState={descriptionObjectivesAutosave.state}
                triggerSave={descriptionObjectivesAutosave.triggerFieldSave}
                saveOnBlur={true}
              />

              {/* Target Groups */}
              <AutosaveTextarea
                id="descriptionTargetGroups"
                value={formData.descriptionTargetGroups}
                onChange={(value) => setFormData(prev => ({ ...prev, descriptionTargetGroups: value }))}
                placeholder="Describe the target groups..."
                label="Target Groups"
                helpText={
                  <HelpTextTooltip>
                    The beneficiaries or target groups of this activity.
                  </HelpTextTooltip>
                }
                rows={3}
                autosaveState={descriptionTargetGroupsAutosave.state}
                triggerSave={descriptionTargetGroupsAutosave.triggerFieldSave}
                saveOnBlur={true}
              />

              {/* Other Description */}
              <AutosaveTextarea
                id="descriptionOther"
                value={formData.descriptionOther}
                onChange={(value) => setFormData(prev => ({ ...prev, descriptionOther: value }))}
                placeholder="Any other relevant information..."
                label="Other Information"
                helpText={
                  <HelpTextTooltip>
                    Any additional information about the activity.
                  </HelpTextTooltip>
                }
                rows={3}
                autosaveState={descriptionOtherAutosave.state}
                triggerSave={descriptionOtherAutosave.triggerFieldSave}
                saveOnBlur={true}
              />
            </div>
          </div>

          {/* Classification Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Activity Classification</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Collaboration Type */}
              <AutosaveSelect
                id="collaborationType"
                value={formData.collaborationType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, collaborationType: value }))}
                placeholder="Select collaboration type..."
                label="Collaboration Type"
                helpText={
                  <HelpTextTooltip>
                    The type of collaboration for this activity.
                  </HelpTextTooltip>
                }
                options={COLLABORATION_TYPES}
                autosaveState={collaborationTypeAutosave.state}
                triggerSave={collaborationTypeAutosave.triggerFieldSave}
                initialHasValue={false}
              />

              {/* Activity Status - Prefilled with Pipeline */}
              <PrefilledFieldWrapper
                label="Activity Status"
                helpText={
                  <HelpTextTooltip>
                    The current status of the activity. Default: Pipeline.
                  </HelpTextTooltip>
                }
                showGreenByDefault={true}
                hasValue={!!formData.activityStatus}
                autosaveState={activityStatusAutosave.state}
              >
                <Select
                  value={formData.activityStatus}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, activityStatus: value }));
                    activityStatusAutosave.triggerFieldSave(value);
                  }}
                >
                  <SelectTrigger id="activityStatus">
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PrefilledFieldWrapper>

              {/* Activity Scope - Prefilled with National */}
              <PrefilledFieldWrapper
                label="Activity Scope"
                helpText={
                  <HelpTextTooltip>
                    The geographic scope of the activity. Default: National.
                  </HelpTextTooltip>
                }
                showGreenByDefault={true}
                hasValue={!!formData.activityScope}
                autosaveState={activityScopeAutosave.state}
              >
                <Select
                  value={formData.activityScope}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, activityScope: value }));
                    activityScopeAutosave.triggerFieldSave(value);
                  }}
                >
                  <SelectTrigger id="activityScope">
                    <SelectValue placeholder="Select scope..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_SCOPES.map((scope) => (
                      <SelectItem key={scope.value} value={scope.value}>
                        {scope.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PrefilledFieldWrapper>
            </div>
          </div>

          {/* Behavior Examples */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Save Indicator Behavior:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• **Text fields**: No indicator while typing, orange on blur, green after save</li>
              <li>• **Select fields**: Save immediately on selection with brief orange indicator</li>
              <li>• **Upload fields**: Orange while processing, **green tick after successful backend save**</li>
              <li>• **Empty values**: No indicator shown for blank/removed values</li>
              <li>• **Prefilled defaults**: UUID (auto-generated), Activity Status (Pipeline), and Activity Scope (National) **show green ticks immediately**</li>
              <li>• **Image removal**: Shows orange while saving removal, then no indicator</li>
              <li>• **Read-only fields**: UUID field always shows green tick since it's always valid</li>
            </ul>
            
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <h5 className="font-medium text-green-800 mb-1">Fields with immediate green ticks:</h5>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• **UUID** - Auto-generated, always valid ✅</li>
                <li>• **Activity Status** - Prefilled with "Pipeline" ✅</li>
                <li>• **Activity Scope** - Prefilled with "National" ✅</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}