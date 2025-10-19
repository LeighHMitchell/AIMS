# Humanitarian Tab Styling Improvements

## Overview
Updated the HumanitarianTab component with enhanced styling and improved UI components based on user feedback.

## Key Improvements

### 1. Red Card Styling (Transaction Modal Style)
The humanitarian toggle now uses a distinctive red color scheme matching the transaction modal:
- **Red card background**: `border-red-200 bg-red-50/50`
- **Red switch**: `bg-red-600` when checked, `bg-red-200` when unchecked
- **Heart icon**: Filled red heart (`text-red-500 fill-red-500`)
- **Red text**: `text-red-900` for titles, `text-red-700` for descriptions

This creates visual consistency across the application and makes humanitarian activities immediately recognizable.

### 2. Vocabulary Selector Enhancement
Created **HumanitarianVocabularySelect** component styled like CollaborationTypeSelect:
- **Code**: Displayed in monospaced font with badge (e.g., `1-2`)
- **Name**: Primary display text (e.g., "Glide")
- **Description**: Detailed explanation shown below name
- **URL**: Clickable external links to official vocabularies
  - GLIDE: http://glidenumber.net/glide/public/search/search.jsp
  - Humanitarian Plan: https://fts.unocha.org/plan-code-list-iati
- **Searchable**: Type to filter by code, name, or description
- **Clear button**: Easy reset of selection

### 3. Language Selector Enhancement
Created **LanguageSelect** component with improved UX:
- **Format**: "EN - English" (code + full name)
- **25 Common Languages**: Covers major development/humanitarian regions
- **Searchable**: Find languages quickly by code or name
- **ISO 639-1 Compliant**: Standard 2-letter language codes

### 4. Display Improvements
When viewing saved humanitarian scopes:
- Language codes displayed as "EN - English" instead of just "EN"
- Vocabulary shown with code and name (e.g., "1-2 • Glide")
- URLs for vocabularies are clickable

## New Files Created

1. **`frontend/src/components/forms/HumanitarianVocabularySelect.tsx`**
   - Searchable vocabulary combobox
   - Shows code, name, description, and URLs
   - Consistent with other select components

2. **`frontend/src/components/forms/LanguageSelect.tsx`**
   - Searchable language combobox
   - Format: "CODE - Name"
   - 25 common languages

3. **`frontend/src/data/language-codes.ts`**
   - ISO 639-1 language code definitions
   - Helper functions: `getLanguageName()`, `formatLanguageDisplay()`
   - Covers major humanitarian/development languages

## Files Modified

1. **`frontend/src/components/activities/HumanitarianTab.tsx`**
   - Red card styling for humanitarian toggle
   - Integrated HumanitarianVocabularySelect
   - Integrated LanguageSelect
   - Improved narrative display with formatted language codes

2. **`frontend/src/data/humanitarian-codelists.ts`**
   - Updated vocabulary URLs to official sources
   - Changed "GLIDE" to "Glide" (consistent naming)
   - Changed "Humanitarian Response Plan" to "Humanitarian Plan" (concise)

## Visual Comparison

### Before
- Plain white card for humanitarian toggle
- Default switch colors (blue/gray)
- Simple dropdown for vocabulary
- Text input for language code
- Language displayed as raw code (e.g., "en")

### After
- **Red-themed card** with heart icon
- **Red switch** (red-600/red-200)
- **Searchable vocabulary selector** with URLs
- **Searchable language selector** with full names
- Language displayed as **"EN - English"**

## User Benefits

1. **Visual Consistency**: Matches transaction modal humanitarian styling
2. **Improved Discoverability**: Red theme makes humanitarian activities stand out
3. **Better UX**: Searchable selectors reduce clicks and improve data entry speed
4. **IATI Compliance**: Direct links to official vocabulary sources
5. **Internationalization**: Clear language display format ("EN - English")
6. **Accessibility**: Proper labeling and help text throughout

## Testing

All components pass linter checks with no errors. The interface is fully functional and ready for user testing.

