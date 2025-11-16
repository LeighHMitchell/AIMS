# IATI Import - Quick Fix Checklist

**Priority-ordered list of fixes with exact code changes**

---

## ✅ PHASE 1: Already Fixed Today
- [x] Default Currency
- [x] Default Tied Status
- [x] Tags
- [x] Country Budget Items
- [x] CRS Channel Code

---

## 🔧 PHASE 2: Simple Field Mappings (15 minutes)

### File: `src/app/api/activities/[id]/import-iati/route.ts`

**Location**: Lines 154-169 (fieldMappings object)

**Add these lines**:
```typescript
const fieldMappings: Record<string, string> = {
  title_narrative: 'title_narrative',
  description_narrative: 'description_narrative',
  activity_status: 'activity_status',
  activity_date_start_planned: 'planned_start_date',
  activity_date_start_actual: 'actual_start_date',
  activity_date_end_planned: 'planned_end_date',
  activity_date_end_actual: 'actual_end_date',
  default_aid_type: 'default_aid_type',
  flow_type: 'default_flow_type',
  collaboration_type: 'collaboration_type',
  default_finance_type: 'default_finance_type',
  default_currency: 'default_currency',
  default_tied_status: 'default_tied_status',
  capital_spend_percentage: 'capital_spend_percentage',

  // ADD THESE 8 LINES:
  activity_scope: 'activity_scope',                       // ← NEW
  hierarchy: 'hierarchy',                                 // ← NEW
  language: 'language',                                   // ← NEW
  budget_not_provided: 'budget_not_provided',            // ← NEW
  linked_data_uri: 'linked_data_uri',                    // ← NEW
  description_objectives: 'description_objectives',       // ← NEW
  description_target_groups: 'description_target_groups', // ← NEW
  description_other: 'description_other'                  // ← NEW
};
```
I
**Test**: Re-import IATI XML and verify these fields are saved.

---

## 🔧 PHASE 3: Related Activities Handler (30 minutes)

### Step 1: Create Database Table

**File**: Create new migration `sql/migrations/20250114000000_add_related_activities.sql`

```sql
-- Related Activities Table
CREATE TABLE IF NOT EXISTS related_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  related_activity_ref VARCHAR(255) NOT NULL,
  related_activity_uuid UUID REFERENCES activities(id) ON DELETE SET NULL,
  relationship_type VARCHAR(2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_related_activities_activity_id ON related_activities(activity_id);
CREATE INDEX idx_related_activities_ref ON related_activities(related_activity_ref);
CREATE INDEX idx_related_activities_uuid ON related_activities(related_activity_uuid);

-- RLS Policies
ALTER TABLE related_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated users" ON related_activities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated users" ON related_activities
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" ON related_activities
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow delete for authenticated users" ON related_activities
  FOR DELETE TO authenticated USING (true);
```

**Run**:
```bash
psql $DATABASE_URL -f sql/migrations/20250114000000_add_related_activities.sql
```

### Step 2: Add Backend Handler

**File**: `src/app/api/activities/[id]/import-iati/route.ts`

**Location**: After line 1518 (after country budget items handler)

**Add**:
```typescript
    // Handle related activities if selected
    if (fields.related_activities && iati_data.relatedActivities) {
      console.log('[IATI Import] Updating related activities');

      try {
        // Clear existing related activities
        await supabase
          .from('related_activities')
          .delete()
          .eq('activity_id', activityId);

        // Insert new related activities
        if (Array.isArray(iati_data.relatedActivities) && iati_data.relatedActivities.length > 0) {
          for (const relatedActivity of iati_data.relatedActivities) {
            // Try to find the related activity by IATI identifier
            let relatedActivityUuid = null;
            if (relatedActivity.ref) {
              const { data: relatedActivityData } = await supabase
                .from('activities')
                .select('id')
                .eq('iati_identifier', relatedActivity.ref)
                .maybeSingle();

              relatedActivityUuid = relatedActivityData?.id || null;
            }

            // Insert related activity record
            await supabase
              .from('related_activities')
              .insert({
                activity_id: activityId,
                related_activity_ref: relatedActivity.ref,
                related_activity_uuid: relatedActivityUuid,
                relationship_type: relatedActivity.type
              });
          }

          updatedFields.push('related_activities');
          console.log(`[IATI Import] ✓ Imported ${iati_data.relatedActivities.length} related activities`);
        }
      } catch (error) {
        console.error('[IATI Import] Error importing related activities:', error);
      }
    }
```

**Test**: Import activity with `<related-activity>` elements.

---

## 🔧 PHASE 4: Results Framework Handler (2-3 hours)

### Add Backend Handler

**File**: `src/app/api/activities/[id]/import-iati/route.ts`

**Location**: After related activities handler (after line ~1560)

**Add**:
```typescript
    // Handle results if selected
    if (fields.results && iati_data.results) {
      console.log('[IATI Import] Updating results');

      try {
        // Clear existing results (cascades to indicators, baselines, periods)
        await supabase
          .from('activity_results')
          .delete()
          .eq('activity_id', activityId);

        // Insert new results
        if (Array.isArray(iati_data.results) && iati_data.results.length > 0) {
          for (const result of iati_data.results) {
            // Insert result
            const { data: newResult, error: resultError } = await supabase
              .from('activity_results')
              .insert({
                activity_id: activityId,
                type: result.type || null,
                aggregation_status: result.aggregationStatus ? parseInt(result.aggregationStatus) : null,
                title: result.title || null,
                description: result.description || null
              })
              .select('id')
              .single();

            if (resultError || !newResult) {
              console.error('[IATI Import] Error creating result:', resultError);
              continue;
            }

            const resultId = newResult.id;

            // Insert indicators for this result
            if (result.indicators && result.indicators.length > 0) {
              for (const indicator of result.indicators) {
                const { data: newIndicator, error: indicatorError } = await supabase
                  .from('result_indicators')
                  .insert({
                    result_id: resultId,
                    measure: indicator.measure || null,
                    ascending: indicator.ascending !== undefined ? indicator.ascending : null,
                    aggregation_status: indicator.aggregationStatus ? parseInt(indicator.aggregationStatus) : null,
                    title: indicator.title || null,
                    description: indicator.description || null
                  })
                  .select('id')
                  .single();

                if (indicatorError || !newIndicator) {
                  console.error('[IATI Import] Error creating indicator:', indicatorError);
                  continue;
                }

                const indicatorId = newIndicator.id;

                // Insert baseline
                if (indicator.baseline) {
                  await supabase
                    .from('indicator_baselines')
                    .insert({
                      indicator_id: indicatorId,
                      year: indicator.baseline.year || null,
                      iso_date: indicator.baseline.isoDate || null,
                      value: indicator.baseline.value !== undefined ? indicator.baseline.value : null,
                      comment: indicator.baseline.comment || null
                    });
                }

                // Insert periods
                if (indicator.periods && indicator.periods.length > 0) {
                  for (const period of indicator.periods) {
                    await supabase
                      .from('indicator_periods')
                      .insert({
                        indicator_id: indicatorId,
                        period_start: period.periodStart || null,
                        period_end: period.periodEnd || null,
                        target_value: period.target?.value !== undefined ? period.target.value : null,
                        target_comment: period.target?.comment || null,
                        actual_value: period.actual?.value !== undefined ? period.actual.value : null,
                        actual_comment: period.actual?.comment || null
                      });
                  }
                }
              }
            }
          }

          updatedFields.push('results');
          console.log(`[IATI Import] ✓ Imported ${iati_data.results.length} results`);
        }
      } catch (error) {
        console.error('[IATI Import] Error importing results:', error);
      }
    }
```

**Test**: Import activity with complete `<result>` elements.

---

## 🔧 PHASE 5: Display Missing Fields (1-2 days)

### 5A. Display Contacts

**File**: Create `src/components/activities/ContactsTab.tsx`

**Code**:
```typescript
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Contact {
  id: string;
  type: string;
  organisation: string;
  person_name?: string;
  job_title?: string;
  email?: string;
  phone?: string;
  website?: string;
  mailing_address?: string;
}

interface ContactsTabProps {
  contacts: Contact[];
}

export function ContactsTab({ contacts }: ContactsTabProps) {
  if (!contacts || contacts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">No contacts available</p>
        </CardContent>
      </Card>
    );
  }

  const contactTypeLabels: Record<string, string> = {
    '1': 'General Enquiries',
    '2': 'Project Management',
    '3': 'Financial Management',
    '4': 'Communications'
  };

  return (
    <div className="space-y-4">
      {contacts.map((contact, index) => (
        <Card key={contact.id || index}>
          <CardHeader>
            <CardTitle className="text-base">
              {contactTypeLabels[contact.type] || 'Contact'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contact.organisation && (
              <div>
                <span className="text-sm font-medium">Organization: </span>
                <span className="text-sm">{contact.organisation}</span>
              </div>
            )}
            {contact.person_name && (
              <div>
                <span className="text-sm font-medium">Name: </span>
                <span className="text-sm">{contact.person_name}</span>
              </div>
            )}
            {contact.job_title && (
              <div>
                <span className="text-sm font-medium">Position: </span>
                <span className="text-sm">{contact.job_title}</span>
              </div>
            )}
            {contact.email && (
              <div>
                <span className="text-sm font-medium">Email: </span>
                <a href={`mailto:${contact.email}`} className="text-sm text-blue-600 hover:underline">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.phone && (
              <div>
                <span className="text-sm font-medium">Phone: </span>
                <span className="text-sm">{contact.phone}</span>
              </div>
            )}
            {contact.website && (
              <div>
                <span className="text-sm font-medium">Website: </span>
                <a href={contact.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  {contact.website}
                </a>
              </div>
            )}
            {contact.mailing_address && (
              <div>
                <span className="text-sm font-medium">Address: </span>
                <span className="text-sm whitespace-pre-line">{contact.mailing_address}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Integration**: Add to `src/app/activities/[id]/page.tsx`

### 5B. Display Conditions

**File**: Add to existing conditions section or create new tab

**Code**:
```typescript
// In appropriate location
{activity.conditions && activity.conditions.length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle>Conditions</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {activity.conditions.map((condition: any, index: number) => (
          <div key={index} className="border-l-4 border-yellow-400 pl-4">
            <div className="text-sm font-medium mb-1">
              {condition.type === '1' ? 'Policy Condition' : 'Performance Condition'}
            </div>
            <div className="text-sm text-muted-foreground">
              {condition.narrative}
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)}
```

### 5C. Display Humanitarian Scopes

**Code**: Add to humanitarian section
```typescript
// In humanitarian section
{activity.humanitarian_scopes && activity.humanitarian_scopes.length > 0 && (
  <div className="mt-4">
    <h4 className="text-sm font-semibold mb-2">Emergency/Appeal Details</h4>
    <div className="space-y-2">
      {activity.humanitarian_scopes.map((scope: any, index: number) => (
        <div key={index} className="text-sm">
          <span className="font-medium">{scope.code}</span>
          {scope.narratives && scope.narratives.length > 0 && (
            <span className="ml-2 text-muted-foreground">
              {scope.narratives[0].text}
            </span>
          )}
        </div>
      ))}
    </div>
  </div>
)}
```

### 5D. Display Country Budget Items

**Code**: Add to BudgetsTab
```typescript
// Add section in BudgetsTab component
{countryBudgetItems && countryBudgetItems.length > 0 && (
  <Card className="mt-4">
    <CardHeader>
      <CardTitle>Government Budget Alignment</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {countryBudgetItems.map((cbi: any, index: number) => (
          <div key={index}>
            <div className="text-sm font-medium mb-2">
              Vocabulary: {cbi.vocabulary}
            </div>
            <div className="space-y-1">
              {cbi.budget_items?.map((item: any, itemIndex: number) => (
                <div key={itemIndex} className="flex justify-between text-sm">
                  <span>{item.code}</span>
                  <span>{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)}
```

---

## ✅ Testing After Each Phase

**Script**: `scripts/check-activity-data.ts`

```bash
npx tsx scripts/check-activity-data.ts <activity-id>
```

**Manual Tests**:
1. Import comprehensive IATI XML
2. Check browser console for errors
3. Verify all fields saved in database
4. Check all display tabs
5. Re-import - should show "already imported"

---

## 📋 Implementation Order

**Week 1**:
- ✅ Phase 1 (Already done today)
- 🔧 Phase 2 (Field mappings - 15 mins)

**Week 2**:
- 🔧 Phase 3 (Related Activities - 30 mins)
- 🔧 Phase 4 (Results - 2-3 hours)

**Week 3**:
- 🔧 Phase 5 (Display components - 1-2 days)

---

**Total Estimated Time**: 3-4 days
**Priority**: High (Results) → Medium (Related Activities, Display) → Low (Other fields)
