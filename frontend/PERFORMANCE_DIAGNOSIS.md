# AIMS Performance Diagnosis Report

## Baseline Measurements (2026-01-15)

| Endpoint | Mean | P95 | Response Size | Status |
|----------|------|-----|---------------|--------|
| Activities List (20) | 1226ms | 1573ms | 3.1MB | 🔴 CRITICAL |
| Activities List (50) | 1178ms | 1403ms | 3.1MB | 🔴 CRITICAL |
| Transactions (50) | 896ms | 1213ms | 5.5MB | 🔴 BAD |
| Activities Search | 830ms | 1259ms | 600KB | 🔴 BAD |
| Transactions (20) | 743ms | 1077ms | 1.5MB | 🔴 BAD |
| Organizations | 18ms | 20ms | 0.4KB | 🟢 GOOD |
| Dashboard Actions | 22ms | 25ms | 0KB | 🟢 GOOD |

---

## Top 5 Identified Bottlenecks

### 1. CRITICAL: Massive Response Payload (153KB per activity)

**Location**: `/api/activities-optimized/route.ts`

**Evidence**: 3.1MB for 20 activities = ~153KB per activity

**Root Cause**: The endpoint returns comprehensive data for each activity including:
- All activity fields (not just list-view essentials)
- `sdgMappings[]` - SDG goal mappings
- `sectors[]` - activity sectors with full details
- `fundingOrgs[]`, `extendingOrgs[]`, `implementingOrgs[]`, `accountableOrgs[]` - 4 org arrays
- `locations.site_locations[]`, `locations.broad_coverage_locations[]`
- `policyMarkers[]` - full policy marker details
- `creatorProfile` - user profile data

**Hypothesis**: For a list view, only 5-10 essential fields are needed. The detailed data should be lazy-loaded when viewing a single activity.

**Expected Impact**: 80-90% reduction in response size → faster serialization, network transfer, and client parsing.

---

### 2. CRITICAL: N+1 Query Pattern (7-9 DB round trips)

**Location**: `/api/activities-optimized/route.ts:294-561`

**Evidence**: After main activities query, code executes:
1. `activity_budgets` query
2. `planned_disbursements` query
3. `activity_participating_organizations` query
4. `transactions` query
5. `subnational_breakdowns` query
6. `activity_policy_markers` query
7. `organizations` lookup (follow-up for participating orgs)
8. `policy_markers` lookup (follow-up for marker details)
9. `users` lookup (for creator profiles)

**Hypothesis**: Using Supabase's relation embedding (`.select('*, related_table(*)')`) or a database RPC function can reduce this to 1-2 queries.

**Expected Impact**: 60-70% reduction in query time by eliminating network round trips.

---

### 3. HIGH: Per-Activity Logging in Hot Path

**Location**: `/api/activities-optimized/route.ts:591`
```typescript
console.log(`[AIMS Optimized] Activity ${activity.id} summary:`, summary);
```

**Evidence**: This logs for EVERY activity returned (20-50 times per request).

**Hypothesis**: Console.log in hot paths adds measurable latency, especially with object serialization.

**Expected Impact**: 5-10% improvement in response time.

---

### 4. MEDIUM: No Response Caching

**Location**: `/api/activities-optimized/route.ts:18-19`
```typescript
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

**Evidence**: Every request hits the database fresh, even for identical queries within seconds.

**Hypothesis**: Short-term caching (30-60 seconds) for read-only list endpoints would significantly reduce load.

**Expected Impact**: 90%+ improvement for repeated requests within cache window.

---

### 5. MEDIUM: Inefficient Transform Loop

**Location**: `/api/activities-optimized/route.ts:565-684`

**Evidence**: 120-line transform function runs for each activity, creating many new objects.

**Hypothesis**: Streamlining the transform and reducing object allocations will improve performance.

**Expected Impact**: 10-15% improvement in response generation time.

---

## Recommended Fixes (Priority Order)

### Phase 1: Quick Wins (Expected 40-50% improvement)

1. **Create a "slim" list endpoint** that returns only essential fields:
   ```typescript
   .select(`
     id, iati_identifier, title_narrative, activity_status,
     submission_status, publication_status, created_at, updated_at
   `)
   ```

2. **Remove per-activity logging** from the hot path

3. **Add short-term caching** with `revalidate = 30` for list endpoints

### Phase 2: Query Optimization (Expected 30-40% improvement)

4. **Consolidate queries** using Supabase relation embedding:
   ```typescript
   .select(`
     *,
     activity_budgets!activity_id (value, usd_value),
     transactions (value_usd, transaction_type)
   `)
   ```

5. **Create database view or RPC function** for activity list with pre-aggregated totals

### Phase 3: Architecture (Expected 20-30% improvement)

6. **Implement lazy-loading** for detailed activity data (sectors, orgs, locations)

7. **Add response compression verification** and optimize JSON serialization

---

## Testing Strategy

1. Run benchmark after each change: `npm run benchmark`
2. Compare against baseline: `npm run perf:report`
3. Commit successful changes with performance delta in commit message
4. Flag any regressions immediately

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/api/activities-optimized/route.ts` | Main optimization target |
| `src/app/api/activities-list/route.ts` | New slim endpoint (to create) |
| `src/hooks/use-optimized-activities.ts` | Update to use new endpoint |
| `supabase/migrations/` | Database function for aggregated list |
