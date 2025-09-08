# Field Save Indicator Behavior Summary

## Overview
This document summarizes exactly how each Activity Editor field should behave with save indicators.

## ✅ Fields That Show Green Tick Immediately (On Load)

### 1. UUID Field
- **Why**: Auto-generated, always has a valid value
- **Behavior**: Shows green tick on initial render, read-only
- **Implementation**: `alwaysShowSaved={true}` + `readOnly={true}`

### 2. Activity Status
- **Why**: Prefilled with "Pipeline" by default
- **Behavior**: Shows green tick on initial render
- **Implementation**: `initialHasValue={true}` with value="1"

### 3. Activity Scope
- **Why**: Prefilled with "National" by default  
- **Behavior**: Shows green tick on initial render
- **Implementation**: `initialHasValue={true}` with value="4"

## 🟠 Fields That Show Save Indicators After User Action

### Text Input Fields
All these fields show **no indicator → orange while saving → green after save**:
- Activity Title
- Activity Acronym  
- Activity ID
- IATI Identifier

**Behavior**:
- No indicator while typing (focused)
- Orange spinner on blur while saving
- Green tick after successful save (non-empty values only)
- No indicator for empty/blank values

### Textarea Fields  
Same behavior as text inputs:
- Activity Description
- Activity Description: Objectives
- Activity Description: Target Groups
- Activity Description: Other

### Select Fields (No Prefill)
- Collaboration Type

**Behavior**:
- No indicator while dropdown open
- Orange spinner immediately on selection
- Green tick after successful save

### Upload Fields
- Activity Banner
- Activity Icon/Logo

**Behavior**:
- No indicator while selecting/dragging files
- Orange spinner during processing AND backend save
- **Green tick only after successful backend save** (not just upload)
- Orange spinner when removing → no indicator after removal saved

## 🔄 State Transitions

### Standard Text/Textarea Flow:
```
Initial: No indicator
↓ User types
Focus: No indicator (hidden while typing)
↓ User blurs field
Blur: Orange spinner (saving to backend)
↓ Save completes
Success: Green tick (if non-empty) OR No indicator (if empty)
```

### Prefilled Select Flow (Activity Status/Scope):
```
Initial: Green tick (has prefilled value)
↓ User opens dropdown  
Open: No indicator (focused state)
↓ User selects value
Selection: Orange spinner (saving immediately)
↓ Save completes
Success: Green tick
```

### Upload Flow:
```
Initial: No indicator (no image)
↓ User drags/selects file
Processing: Orange spinner (processing file)
↓ File processed, save triggered
Saving: Orange spinner (saving to backend)
↓ Backend save completes
Success: Green tick (image saved) 
```

### UUID Flow (Always Saved):
```
Initial: Green tick (auto-generated value)
↓ User clicks field (read-only)
Focused: Green tick remains (read-only, no focus change)
```

## 🚫 Never Show Green Tick

### Empty/Blank Values
- Empty text fields after successful save
- Removed images after successful removal
- Cleared select fields after successful save

### While User is Actively Editing
- Text fields while focused (typing)
- Dropdowns while open
- Upload areas while dragging files

## ⚠️ Error States

All fields can show:
- Red X icon with error message on save failure
- Error persists until user corrects and successfully saves

## 🧪 Test Scenarios

### For UUID, Activity Status, Activity Scope:
1. ✅ Load page → Should see green ticks immediately
2. ✅ UUID: Click field → Green tick remains (read-only)
3. ✅ Status/Scope: Open dropdown → Green tick hides
4. ✅ Status/Scope: Close without selecting → Green tick returns

### For Text Fields:
1. ✅ Start typing → No indicator
2. ✅ Blur field → Orange spinner
3. ✅ Save succeeds (non-empty) → Green tick
4. ✅ Save succeeds (empty) → No indicator

### For Uploads:
1. ✅ Select file → Orange spinner during processing
2. ✅ File processed → Orange continues during backend save  
3. ✅ Backend save succeeds → Green tick
4. ✅ Remove image → Orange during removal save
5. ✅ Removal saved → No indicator

## 📝 Implementation Notes

- Use `initialHasValue={true}` for prefilled selects
- Use `alwaysShowSaved={true}` for always-valid fields like UUID
- Use `readOnly={true}` for UUID to prevent focus changes
- Banner/Icon uploads use existing autosave hooks that handle backend saving
- All components respect the `isFocused` state to hide indicators during interaction