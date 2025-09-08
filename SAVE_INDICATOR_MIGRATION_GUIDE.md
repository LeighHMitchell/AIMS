# Save Indicator Migration Guide

## Overview
This guide explains how to migrate Activity Editor fields to use the new standardized save indicator system that provides consistent and correct behavior across all fields.

## The Problem
Current implementation issues:
- Activity Title shows green tick immediately when typing (incorrect)
- Activity Acronym shows green tick as soon as a character is entered (incorrect)
- Several fields show green → orange → green sequence (incorrect)
- Inconsistent behavior across different field types

## The Solution
A centralized save indicator system that ensures:
1. **No indicator while typing** (field is focused)
2. **Orange spinner on blur** while saving
3. **Green tick after successful save** (only for non-empty values)
4. **No indicator for empty/blank values**
5. **Prefilled fields** (Activity Status, Activity Scope) show green tick initially

## New Components

### 1. `useSaveIndicator` Hook
Located at: `/frontend/src/hooks/useSaveIndicator.ts`
- Centralized save state management
- Handles focus/blur states properly
- Validates empty vs non-empty values

### 2. `FieldSaveStatus` Component
Located at: `/frontend/src/components/ui/field-save-status.tsx`
- Displays the correct indicator based on state
- Supports different sizes and error states

### 3. `AutosaveInput` Component
Located at: `/frontend/src/components/ui/autosave-input.tsx`
- Wrapper for text inputs with integrated save indicators
- Handles focus/blur automatically
- Shows indicators in the label

### 4. `AutosaveTextarea` Component
Located at: `/frontend/src/components/ui/autosave-input.tsx`
- Similar to AutosaveInput but for textareas
- Same save indicator behavior

### 5. `AutosaveSelect` Component
Located at: `/frontend/src/components/ui/autosave-select.tsx`
- Wrapper for select dropdowns
- Handles prefilled values (Activity Status, Activity Scope)
- Shows green tick by default for prefilled fields
- Saves immediately on selection

### 6. `AutosaveUpload` Component
Located at: `/frontend/src/components/ui/autosave-upload.tsx`
- Base component for file uploads with save indicators
- Handles drag-and-drop and click-to-upload
- Shows processing state during upload

### 7. `AutosaveBannerUpload` Component
Located at: `/frontend/src/components/ui/autosave-upload.tsx`
- Specialized for banner images (wide aspect ratio)
- 5MB file size limit

### 8. `AutosaveIconUpload` Component  
Located at: `/frontend/src/components/ui/autosave-upload.tsx`
- Specialized for icon/logo images (square aspect ratio)
- 2MB file size limit

### 9. `PrefilledFieldWrapper` Component
Located at: `/frontend/src/components/ui/prefilled-field-wrapper.tsx`
- Wrapper for fields that should show green tick by default
- Handles UUID, Activity Status, Activity Scope cases
- Simple, direct approach for prefilled values

### 10. Updated `LabelSaveIndicator` Component
Located at: `/frontend/src/components/ui/save-indicator.tsx`
- Now accepts `isFocused` prop to hide indicators while typing
- Properly handles the display logic

## Migration Steps

### Step 1: Update Text Input Fields

**Before:**
```tsx
<div className="space-y-2">
  <LabelSaveIndicator
    isSaving={titleAutosave.state.isSaving}
    isSaved={titleAutosave.state.isPersistentlySaved}
    hasValue={!!general.title}
    className="text-gray-700"
  >
    Activity Title
  </LabelSaveIndicator>
  <Input
    value={general.title}
    onChange={(e) => {
      setGeneral(prev => ({ ...prev, title: e.target.value }));
      titleAutosave.triggerFieldSave(e.target.value);
    }}
    onBlur={() => titleAutosave.triggerFieldSave(general.title)}
    placeholder="Enter activity title..."
  />
</div>
```

**After:**
```tsx
<AutosaveInput
  id="title"
  value={general.title}
  onChange={(value) => setGeneral(prev => ({ ...prev, title: value }))}
  placeholder="Enter activity title..."
  label="Activity Title"
  helpText={<HelpTextTooltip>The title of the activity</HelpTextTooltip>}
  required
  autosaveState={titleAutosave.state}
  triggerSave={titleAutosave.triggerFieldSave}
  saveOnBlur={true}
/>
```

### Step 2: Update Textarea Fields

**Before:**
```tsx
<div className="space-y-2">
  <LabelSaveIndicator
    isSaving={descriptionAutosave.state.isSaving}
    isSaved={descriptionAutosave.state.isPersistentlySaved}
  >
    Activity Description
  </LabelSaveIndicator>
  <Textarea
    value={general.description}
    onChange={(e) => setGeneral(prev => ({ ...prev, description: e.target.value }))}
    onBlur={() => descriptionAutosave.triggerFieldSave(general.description)}
  />
</div>
```

**After:**
```tsx
<AutosaveTextarea
  id="description"
  value={general.description}
  onChange={(value) => setGeneral(prev => ({ ...prev, description: value }))}
  placeholder="Describe the activity..."
  label="Activity Description"
  rows={4}
  autosaveState={descriptionAutosave.state}
  triggerSave={descriptionAutosave.triggerFieldSave}
  saveOnBlur={true}
/>
```

### Step 3: Update Select Fields (with Prefilled Values)

**For Activity Status (prefilled with "Pipeline"):**
```tsx
<AutosaveSelect
  id="activityStatus"
  value={general.activityStatus}
  onValueChange={(value) => setGeneral(prev => ({ ...prev, activityStatus: value }))}
  placeholder="Select status..."
  label="Activity Status"
  options={ACTIVITY_STATUSES}
  autosaveState={activityStatusAutosave.state}
  triggerSave={activityStatusAutosave.triggerFieldSave}
  initialHasValue={true} // Shows green tick initially
/>
```

**For Activity Status (prefilled with "Pipeline") - RECOMMENDED APPROACH:**
```tsx
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
```

**For Activity Scope (prefilled with "National") - RECOMMENDED APPROACH:**
```tsx
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
```

**Alternative using AutosaveSelect:**
```tsx
<AutosaveSelect
  id="activityScope"
  value={general.activityScope}
  onValueChange={(value) => setGeneral(prev => ({ ...prev, activityScope: value }))}
  placeholder="Select scope..."
  label="Activity Scope"
  options={ACTIVITY_SCOPES}
  autosaveState={activityScopeAutosave.state}
  triggerSave={activityScopeAutosave.triggerFieldSave}
  initialHasValue={true} // Shows green tick initially
/>
```

### Step 4: Update Upload Fields (Banner and Icon)

**For Activity Banner:**
```tsx
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
```

**For Activity Icon/Logo:**
```tsx
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
```

**For UUID Field (read-only with always-green behavior) - RECOMMENDED APPROACH:**
```tsx
<PrefilledFieldWrapper
  label="Activity UUID"
  helpText={
    <HelpTextTooltip>
      Auto-generated unique identifier (read-only).
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
```

**Alternative using AutosaveInput:**
```tsx
<AutosaveInput
  id="uuid"
  value={formData.uuid}
  onChange={() => {}} // No-op since it's read-only
  readOnly={true}
  label="Activity UUID"
  helpText={
    <HelpTextTooltip>
      Auto-generated unique identifier (read-only).
    </HelpTextTooltip>
  }
  autosaveState={uuidAutosave.state}
  alwaysShowSaved={true} // Always show green tick since UUID is always valid
/>
```

### Step 5: Update Fields with Custom Focus Handling

If you need to keep the existing structure but add proper focus tracking:

```tsx
const [isFocused, setIsFocused] = useState(false);

<div className="space-y-2">
  <LabelSaveIndicator
    isSaving={titleAutosave.state.isSaving}
    isSaved={titleAutosave.state.isPersistentlySaved}
    hasValue={!!general.title}
    isFocused={isFocused} // Add this prop
    className="text-gray-700"
  >
    Activity Title
  </LabelSaveIndicator>
  <Input
    value={general.title}
    onFocus={() => setIsFocused(true)}
    onBlur={() => {
      setIsFocused(false);
      titleAutosave.triggerFieldSave(general.title);
    }}
    onChange={(e) => setGeneral(prev => ({ ...prev, title: e.target.value }))}
    placeholder="Enter activity title..."
  />
</div>
```

## Fields to Update

### Text Input Fields:
- ✅ Activity Title
- ✅ Activity Acronym
- ✅ Activity ID
- ✅ IATI Identifier
- ✅ UUID (read-only, always shows green tick when has value)

### Textarea Fields:
- ✅ Activity Description
- ✅ Activity Description: Other
- ✅ Activity Description: Target Groups
- ✅ Activity Description: Objectives

### Select Fields:
- ✅ Collaboration Type
- ✅ Activity Status (prefilled with "Pipeline" - use `initialHasValue={true}`)
- ✅ Activity Scope (prefilled with "National" - use `initialHasValue={true}`)

### Upload Fields:
- ✅ Activity Banner
- ✅ Activity Icon/Logo

## Testing Checklist

After implementing the changes, verify each field:

### For Text/Textarea Fields:
- [ ] No indicator shows while typing (field is focused)
- [ ] Orange spinner appears on blur
- [ ] Green tick appears after successful save (non-empty value)
- [ ] No indicator appears after saving empty/blank value
- [ ] Deleting all text and saving shows no indicator

### For Select Fields:
- [ ] No indicator while dropdown is open
- [ ] Orange spinner briefly appears after selection
- [ ] Green tick appears after save completes
- [ ] Activity Status shows green tick on initial render
- [ ] Activity Scope shows green tick on initial render

### For Upload Fields:
- [ ] No indicator shows while selecting/dragging file
- [ ] Orange spinner appears while processing/uploading
- [ ] Green tick appears after successful backend save (not just upload)
- [ ] Banner uploads show green tick after save to backend
- [ ] Icon uploads show green tick after save to backend
- [ ] Removing image shows orange while saving, then no indicator
- [ ] Error states show red indicator with message

### For Read-Only/Prefilled Fields:
- [ ] UUID field shows green tick immediately (auto-generated, always valid)
- [ ] Activity Status shows green tick initially (prefilled with Pipeline)
- [ ] Activity Scope shows green tick initially (prefilled with National)
- [ ] Read-only fields don't change focus state when clicked

### Edge Cases:
- [ ] Rapid typing and blur shows correct sequence (orange → green)
- [ ] Network errors show red error indicator
- [ ] Concurrent saves are handled properly (no duplicate saves)
- [ ] Large image uploads show processing state correctly

## Example Implementation

See the complete example at:
`/frontend/src/components/activities/ActivityEditorWithProperIndicators.tsx`

This file demonstrates all the correct patterns and can be used as a reference.

## Benefits of Migration

1. **Consistent UX**: All fields behave the same way
2. **Clear Feedback**: Users always know the save state
3. **No False Positives**: Green tick only shows for actual saved values
4. **Better Performance**: Centralized state management reduces re-renders
5. **Accessibility**: Proper ARIA labels and focus management

## Rollback Plan

If issues arise, the original components are still available. The new components are additive and don't break existing functionality. You can migrate fields incrementally.

## Support

For questions or issues with the migration:
1. Check the example implementation
2. Review the component source code
3. Test in development environment first
4. Ensure all autosave hooks are properly initialized