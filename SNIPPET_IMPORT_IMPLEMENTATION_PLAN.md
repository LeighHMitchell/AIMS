# IATI Snippet Import Implementation Plan

## Overview
Add snippet import capability to the IATI XML import tool, allowing users to paste XML snippets (transactions, organizations, locations, sectors, etc.) instead of requiring full XML files.

## Architecture

### 1. Backend Components

#### A. Snippet Parser API (`/api/iati/parse-snippet/route.ts`)
**Purpose**: Parse XML snippets and intelligently detect element types

**Key Features**:
- Auto-detect snippet type (transaction, organization, location, sector, etc.)
- Wrap incomplete snippets in valid IATI XML structure
- Parse and extract data from snippets
- Return standardized format matching existing parse API

**Supported Snippet Types**:
- `<transaction>` - Financial transactions
- `<participating-org>` / `<reporting-org>` - Organizations
- `<location>` - Geographic location data
- `<sector>` - Sector allocations
- `<recipient-country>` / `<recipient-region>` - Geographic targeting
- `<policy-marker>` - Policy markers
- `<budget>` - Budget information
- `<result>` - Results/indicators
- `<iati-activity>` - Full or partial activities

**Detection Logic**:
```typescript
function detectSnippetType(xmlContent: string): string {
  const content = xmlContent.trim();
  
  if (content.includes('<transaction')) return 'transaction';
  if (content.includes('<participating-org') || content.includes('<reporting-org')) return 'organization';
  if (content.includes('<location')) return 'location';
  if (content.includes('<sector')) return 'sector';
  if (content.includes('<recipient-country')) return 'recipient-country';
  if (content.includes('<recipient-region')) return 'recipient-region';
  if (content.includes('<policy-marker')) return 'policy-marker';
  if (content.includes('<budget')) return 'budget';
  if (content.includes('<result')) return 'result';
  if (content.includes('<iati-activity')) return 'full-activity';
  
  return 'unknown';
}
```

**Wrapping Strategy**:
- If snippet lacks `<iati-activities>` root, wrap in minimal structure
- Add required elements (`<iati-identifier>`, `<title>`) if missing
- Preserve original snippet data integrity

### 2. Frontend Components

#### A. Updated Import Page (`/app/iati-import/page.tsx`)

**New State Variables**:
```typescript
const [importMethod, setImportMethod] = useState<'file' | 'url' | 'snippet'>('file')
const [snippetContent, setSnippetContent] = useState('')
const [snippetType, setSnippetType] = useState<string | null>(null)
```

**New UI Components**:
1. **Three-tab selector** in upload step:
   - Upload File (existing)
   - From URL (existing/future)
   - Paste Snippet (new)

2. **Snippet textarea** with:
   - Large text area for pasting (min-height: 300px)
   - Monospace font for readability
   - Syntax-friendly display
   - Character/line counter (optional)

3. **Snippet info alert** showing:
   - Supported element types
   - Example snippets
   - Auto-detection info

**Parsing Handler**:
```typescript
const parseSnippet = useCallback(async () => {
  if (!snippetContent.trim()) {
    toast.error('Please paste some XML content')
    return
  }

  setStep('parse')
  setParsing(true)
  setParsingProgress(10)

  try {
    const response = await fetch('/api/iati/parse-snippet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ xmlContent: snippetContent })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.details || 'Failed to parse snippet')
    }

    const data = await response.json()
    
    // Transform to match existing data structure
    const transformedData = {
      activities: data.activities || [],
      organizations: data.organizations || [],
      transactions: data.transactions || [],
      locations: data.locations || [],
      sectors: data.sectors || [],
      snippetType: data.snippetType,
      unmapped: { activities: [], organizations: [], transactions: [] }
    }
    
    setParsedData(transformedData)
    setSnippetType(data.snippetType)
    
    toast.success(`Parsed ${data.snippetType} snippet successfully!`)
    setStep('summary')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to parse snippet')
    setStep('upload')
  } finally {
    setParsing(false)
  }
}, [snippetContent])
```

#### B. Textarea Component (`/components/ui/textarea.tsx`)
Standard shadcn/ui textarea component for text input

## Implementation Phases

### Phase 1: Backend API (Day 1)
**Status**: Pending

**Tasks**:
1. ✅ Create `/api/iati/parse-snippet/route.ts`
2. ✅ Implement snippet type detection
3. ✅ Implement XML wrapping logic
4. ✅ Implement snippet parsing for all types
5. ✅ Add error handling and validation
6. ✅ Test with sample snippets

**Files to Create**:
- `/frontend/src/app/api/iati/parse-snippet/route.ts` (new)

**Dependencies**:
- `fast-xml-parser` (existing)
- `@/lib/supabase` (existing)

### Phase 2: Frontend UI Components (Day 1-2)
**Status**: Pending

**Tasks**:
1. ✅ Create/verify Textarea component exists
2. ✅ Add ClipboardPaste icon import
3. ✅ Add state variables for snippet handling
4. ✅ Create three-tab layout in upload step
5. ✅ Design snippet input UI
6. ✅ Add helpful documentation/examples

**Files to Modify**:
- `/frontend/src/app/iati-import/page.tsx` (modify)
- `/frontend/src/components/ui/textarea.tsx` (create if needed)

### Phase 3: Integration & Handler Logic (Day 2)
**Status**: Pending

**Tasks**:
1. ✅ Implement `parseSnippet` handler
2. ✅ Connect to backend API
3. ✅ Transform response to match existing format
4. ✅ Update import flow to handle snippets
5. ✅ Add loading states and progress indicators

### Phase 4: Testing (Day 2-3)
**Status**: Pending

**Test Cases**:

#### Transaction Snippets
```xml
<transaction>
  <transaction-type code="2"/>
  <transaction-date iso-date="2024-01-15"/>
  <value currency="USD" value-date="2024-01-15">50000</value>
  <description>
    <narrative>Quarterly disbursement</narrative>
  </description>
  <provider-org ref="US-GOV">
    <narrative>US Government</narrative>
  </provider-org>
</transaction>
```

#### Organization Snippets
```xml
<participating-org role="1" type="10" ref="MM-GOV-001">
  <narrative>Ministry of Planning</narrative>
</participating-org>
```

#### Location Snippets
```xml
<location>
  <location-reach code="1"/>
  <name>
    <narrative>Yangon</narrative>
  </name>
  <point srsName="http://www.opengis.net/def/crs/EPSG/0/4326">
    <pos>16.8661 96.1951</pos>
  </point>
</location>
```

#### Sector Snippets
```xml
<sector vocabulary="1" code="11220" percentage="60">
  <narrative>Primary education</narrative>
</sector>
<sector vocabulary="1" code="12220" percentage="40">
  <narrative>Basic health care</narrative>
</sector>
```

#### Multiple Elements
```xml
<transaction>
  <transaction-type code="2"/>
  <transaction-date iso-date="2024-01-15"/>
  <value currency="USD">50000</value>
</transaction>
<transaction>
  <transaction-type code="3"/>
  <transaction-date iso-date="2024-02-15"/>
  <value currency="USD">75000</value>
</transaction>
```

**Tasks**:
1. ✅ Test each snippet type individually
2. ✅ Test multiple elements of same type
3. ✅ Test mixed element types
4. ✅ Test invalid XML
5. ✅ Test empty/whitespace input
6. ✅ Test very large snippets
7. ✅ Test malformed IATI elements

### Phase 5: Error Handling & UX (Day 3)
**Status**: Pending

**Error Scenarios**:
1. Empty snippet
2. Invalid XML syntax
3. Unknown IATI elements
4. Missing required attributes
5. Network errors
6. Server errors

**User Feedback**:
- Clear error messages
- Suggestions for fixing issues
- Show detected snippet type
- Progress indicators during parsing
- Success confirmations with summary

**Tasks**:
1. ✅ Add comprehensive error handling
2. ✅ Add user-friendly error messages
3. ✅ Add loading states
4. ✅ Add success confirmations
5. ✅ Add snippet type indicator

### Phase 6: Documentation (Day 3)
**Status**: Pending

**Documentation Needs**:
1. User guide for snippet import
2. Supported snippet types reference
3. Example snippets library
4. Troubleshooting guide
5. API documentation

**Tasks**:
1. ✅ Create user documentation
2. ✅ Add inline help text
3. ✅ Create example snippet library
4. ✅ Document API endpoint
5. ✅ Update main README

### Phase 7: Deployment (Day 4)
**Status**: Pending

**Pre-deployment Checklist**:
- [ ] All tests passing
- [ ] Code review completed
- [ ] Documentation complete
- [ ] Error handling verified
- [ ] Performance tested
- [ ] Security reviewed
- [ ] Backup plan ready

**Deployment Steps**:
1. Merge to development branch
2. Deploy to staging environment
3. Run integration tests
4. UAT (User Acceptance Testing)
5. Deploy to production
6. Monitor for errors
7. Gather user feedback

## File Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── iati/
│   │   │       └── parse-snippet/
│   │   │           └── route.ts          [NEW] Snippet parser API
│   │   └── iati-import/
│   │       └── page.tsx                  [MODIFIED] Add snippet tab
│   └── components/
│       └── ui/
│           └── textarea.tsx              [NEW/VERIFY] Textarea component
└── docs/
    └── SNIPPET_IMPORT_GUIDE.md          [NEW] User documentation
```

## API Specifications

### POST /api/iati/parse-snippet

**Request**:
```typescript
{
  xmlContent: string  // Raw XML snippet
}
```

**Response (Success)**:
```typescript
{
  snippetType: string                    // Detected type
  message: string                        // Status message
  activities: Array<Activity>            // Parsed activities
  organizations: Array<Organization>     // Parsed organizations
  transactions: Array<Transaction>       // Parsed transactions
  locations: Array<Location>             // Parsed locations
  sectors: Array<Sector>                 // Parsed sectors
  recipientCountries: Array<Country>     // Parsed countries
  recipientRegions: Array<Region>        // Parsed regions
  policyMarkers: Array<PolicyMarker>     // Parsed policy markers
  budgets: Array<Budget>                 // Parsed budgets
}
```

**Response (Error)**:
```typescript
{
  error: string       // Error type
  details: string     // Detailed error message
  snippetType: string // Detected type (if available)
}
```

## Security Considerations

1. **Input Validation**:
   - Limit snippet size (max 10MB)
   - Sanitize XML content
   - Validate against XML injection

2. **Rate Limiting**:
   - Limit API calls per user
   - Implement throttling for large snippets

3. **Error Handling**:
   - Don't expose internal errors
   - Log security events
   - Sanitize error messages

## Performance Considerations

1. **Parsing Optimization**:
   - Stream large snippets
   - Cache parsed results
   - Timeout for long-running parses

2. **Frontend Optimization**:
   - Debounce snippet input
   - Show character count warning
   - Lazy load examples

## Rollout Strategy

### Week 1: Internal Testing
- Deploy to staging
- Internal team testing
- Bug fixes and refinements

### Week 2: Beta Testing
- Enable for selected power users
- Gather feedback
- Monitor usage and errors

### Week 3: Gradual Rollout
- Enable for 25% of users
- Monitor performance and errors
- Adjust based on feedback

### Week 4: Full Rollout
- Enable for all users
- Monitor adoption
- Provide support documentation

## Success Metrics

1. **Adoption**:
   - % of users trying snippet import
   - % of imports using snippets vs files
   - Repeat usage rate

2. **Quality**:
   - Success rate of snippet parsing
   - Error rate by snippet type
   - User satisfaction score

3. **Performance**:
   - Average parse time
   - API response time
   - Error handling effectiveness

## Rollback Plan

If issues arise:

1. **Quick Disable**:
   - Feature flag to hide snippet tab
   - Redirect to file upload only

2. **Partial Rollback**:
   - Disable specific snippet types
   - Limit to certain users

3. **Full Rollback**:
   - Revert frontend changes
   - Disable API endpoint
   - Restore previous version

## Support & Monitoring

1. **Monitoring**:
   - API endpoint metrics
   - Error tracking
   - Usage analytics
   - Performance metrics

2. **Support**:
   - User documentation
   - Video tutorials
   - FAQ section
   - Support tickets

3. **Iteration**:
   - Weekly review of metrics
   - Monthly feature improvements
   - Quarterly major updates

## Future Enhancements

1. **Snippet Library**:
   - Pre-built snippet templates
   - Save custom snippets
   - Share snippets between users

2. **Live Preview**:
   - Show parsed data before import
   - Syntax highlighting
   - Validation as you type

3. **Batch Operations**:
   - Import multiple snippets at once
   - Merge snippets into activity
   - Split activity into snippets

4. **AI Assistance**:
   - Suggest missing fields
   - Auto-complete values
   - Validate against IATI standards

## Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Backend API | 1 day | Pending |
| Phase 2: Frontend UI | 1-2 days | Pending |
| Phase 3: Integration | 1 day | Pending |
| Phase 4: Testing | 1-2 days | Pending |
| Phase 5: Error Handling | 1 day | Pending |
| Phase 6: Documentation | 1 day | Pending |
| Phase 7: Deployment | 1 day | Pending |
| **Total** | **7-10 days** | **Not Started** |

## Next Steps

1. Review and approve this plan
2. Allocate resources
3. Create task tickets
4. Begin Phase 1: Backend API development
5. Set up monitoring and testing infrastructure

