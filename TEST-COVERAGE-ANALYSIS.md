# Test Coverage Analysis — AIMS Codebase

**Date:** 2026-03-20
**Codebase Version:** v3.14.0

---

## Executive Summary

The AIMS codebase contains approximately **1,995 source files** but only **56 test files** (25 unit tests, 30 E2E specs, 1 Django test stub). Test coverage is heavily concentrated on IATI import/parsing and activity editor field persistence, leaving the vast majority of business logic, API routes, utility functions, and components untested.

---

## Current Test Inventory

### Unit Tests (25 files — Vitest/Jest)

| Category | Files | What's Covered |
|----------|-------|----------------|
| IATI Parsing | 7 | XML parsing, code validation, metadata parsing, document links, missing fields |
| Transaction Logic | 4 | Field persistence, sector handling, field cleaning |
| Component Tests | 3 | ActivityCard, LinkedActivityModal, XmlImportTab |
| Autosave | 1 | Basic autosave behavior |
| Default Finance Type | 1 | Default value logic |
| Supabase Field Update | 1 | Field update mechanics |
| Policy Marker Validation | 1 | Policy marker rules |
| URL Import | 1 | IATI URL import flow |
| Import Missing Sections | 1 | Import gap handling |

### E2E Tests (30 files — Playwright)

Heavily focused on the **Activity Editor**:
- Title/acronym validation and persistence (~10 specs)
- Description field save behavior (~5 specs)
- Field locking validation (~2 specs)
- General tab persistence (~1 spec)
- Contacts tab (~1 spec)
- Login flow (~1 spec)
- IATI import flow (~1 spec)
- Locations (~1 spec)
- Various debug/diagnostic specs (~8 specs)

### Django Tests (1 file)

- `django_backup/tests.py` — essentially a stub with no meaningful tests.

---

## Coverage Gap Analysis

### CRITICAL — No Tests At All

These high-impact areas have **zero test coverage**:

#### 1. API Routes (123+ endpoints, 0 unit tests)
The entire API layer is untested at the unit level. Priority targets:

| Endpoint Group | Count | Risk |
|---------------|-------|------|
| `/api/analytics/*` | 45 | Financial calculations, data aggregation |
| `/api/admin/*` | 26 | User management, role assignment, system config |
| `/api/activities/*` | 9 | Core CRUD, the heart of the application |
| `/api/budgets/*` | 6 | Budget allocation, financial data |
| `/api/transactions/*` | Multiple | Financial transaction processing |
| `/api/auth/*` | 8 | Authentication, session management |
| `/api/iati/*` | Multiple | IATI export/validation |
| `/api/cron/*` | 5 | Scheduled tasks (silent failures possible) |

#### 2. Currency Conversion (`lib/currency-converter*.ts` — 3 variants)
Financial calculations with exchange rates affect every monetary figure in the system. Zero tests for:
- Exchange rate lookups and caching
- Multi-currency conversion accuracy
- Edge cases (missing rates, stale data, division by zero)
- Enhanced vs. basic converter behavior differences

#### 3. Authentication & Authorization (`lib/auth.ts`, `hooks/use-auth.ts`, middleware)
- Login/logout flows
- Role-based access control enforcement
- Session management and token refresh
- Permission checks (`lib/activity-permissions.ts`)

#### 4. Analytics & Scoring Engine (`lib/analytics*.ts`, `lib/scoring-engine.ts`)
- Dashboard statistic calculations
- Aid effectiveness scoring
- Sector allocation math
- Transaction filtering and aggregation

#### 5. Budget & Disbursement Logic
- Budget allocation calculations
- Planned vs. actual disbursement tracking
- Sector-budget mapping service
- Auto-mapping logic (`auto-map-budget`)

#### 6. Email & Notification Services (`lib/email/*`, `lib/*-notifications.ts`)
- 7 email templates — untested rendering and content
- 4 notification services — untested trigger conditions
- Silent failures could mean users never receive critical notifications

#### 7. Export Functions (`lib/csv-export.ts`, `lib/chart-export.ts`, `lib/activity-export.ts`)
- CSV generation accuracy
- PDF report generation
- Excel export correctness
- Data formatting and encoding

---

### HIGH PRIORITY — Minimal or Fragile Coverage

#### 8. Custom React Hooks (71 hooks, 1 partially tested)
Only `use-autosave` has a test. Critical untested hooks:
- `useTransactions` — financial data fetching and state
- `useBudgets` — budget data management
- `useOptimizedActivities` — performance-critical data loading
- `useTasks` / `useTaskAnalytics` — task workflow
- `useUser` / `useUserRole` — auth context
- `useCurrencyConverter` — currency conversion hook
- `use-results` — results framework

#### 9. Activity Editor Components (~920 components, 3 tested)
The activity editor is the core UX of the application. While E2E tests cover some field persistence, there are no unit tests for:
- Form validation logic within components
- Conditional field rendering
- Tab navigation state management
- Complex dropdown behaviors (DropdownContext)
- Error boundary handling

#### 10. Data Import Pipeline
Partially tested (IATI XML parsing), but missing:
- CSV/Excel import parsing (`lib/file-parser.ts`)
- Bulk import validation rules
- Duplicate detection and merging
- Import rollback on failure

---

### MEDIUM PRIORITY — Functional But Untested

#### 11. Organization Management (`lib/organization-*.ts` — 6 files)
- Org reference normalization
- Alias validation
- Type mappings
- Export functionality

#### 12. Utility Functions (`utils/` — 20 files)
- `calculateFinancialCompleteness.ts` — completeness scoring
- `period-allocation.ts` / `year-allocation.ts` — time-based allocation
- `transaction-grouping.ts` — grouping logic
- `defaultFieldsValidation.ts` — validation rules
- `tab-completion.ts` — tab completion logic

#### 13. Search Functionality
- `lib/search-normalizer.ts` — query normalization
- `lib/search-highlighting.ts` — result highlighting
- `lib/search-cache.ts` — caching behavior
- `/api/search/` endpoint — search accuracy

#### 14. Geolocation Services
- `lib/geo/nominatim.ts` — external API integration
- `lib/myanmar-admin-lookup.ts` — admin unit resolution
- Map component data loading

#### 15. Security Utilities (`lib/security-utils.ts`, `lib/sanitize*.ts`)
- Input sanitization rules
- XSS prevention
- Content security policy enforcement

---

## Recommended Test Implementation Plan

### Phase 1 — Foundation (Highest ROI)

**Target: API route handlers and core business logic**

1. **Currency conversion tests** — Add comprehensive tests for all 3 converter variants with edge cases (missing rates, zero amounts, same-currency, historical dates)

2. **API route tests for `/api/activities`** — Test CRUD operations, authorization checks, input validation, error handling

3. **API route tests for `/api/transactions` and `/api/budgets`** — Financial endpoints need correctness guarantees

4. **Authentication tests** — Test login, role checks, session expiry, unauthorized access patterns

### Phase 2 — Financial Accuracy

5. **Analytics calculation tests** — Verify dashboard numbers, sector allocations, aid effectiveness scoring

6. **Export function tests** — Verify CSV/Excel/PDF output correctness with known inputs

7. **Budget allocation tests** — Period allocation, year allocation, auto-mapping logic

8. **`calculateFinancialCompleteness` tests** — This drives UI indicators; verify scoring accuracy

### Phase 3 — Data Integrity

9. **Import pipeline tests** — CSV/Excel parsing, validation, duplicate detection

10. **Organization normalization tests** — Ref normalization, alias validation, type mapping

11. **Search functionality tests** — Normalization, highlighting, caching

12. **Notification/email tests** — Template rendering, trigger conditions

### Phase 4 — UI Reliability

13. **Hook tests** — `useTransactions`, `useBudgets`, `useUser`, `useCurrencyConverter`

14. **Form validation component tests** — Activity editor field validation rules

15. **Error boundary tests** — Graceful degradation scenarios

---

## Suggested Testing Patterns

### API Route Tests (Vitest)
```typescript
// Example: /api/activities/[id]/route.test.ts
import { GET, PUT, DELETE } from './route'
import { createMockRequest } from '@/test-utils'

describe('GET /api/activities/[id]', () => {
  it('returns 401 for unauthenticated requests', async () => { ... })
  it('returns 404 for non-existent activity', async () => { ... })
  it('returns the activity with all relations', async () => { ... })
  it('respects role-based field visibility', async () => { ... })
})
```

### Utility Function Tests (Vitest)
```typescript
// Example: lib/currency-converter.test.ts
describe('CurrencyConverter', () => {
  it('converts between two currencies using rates', () => { ... })
  it('returns original amount when source equals target', () => { ... })
  it('throws when exchange rate is unavailable', () => { ... })
  it('handles historical date lookups', () => { ... })
})
```

### Hook Tests (Vitest + React Testing Library)
```typescript
// Example: hooks/useTransactions.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useTransactions } from './useTransactions'

describe('useTransactions', () => {
  it('fetches transactions for an activity', async () => { ... })
  it('handles empty transaction list', async () => { ... })
  it('recalculates totals on currency change', async () => { ... })
})
```

---

## Metrics

| Metric | Current | Target (Phase 1) | Target (All Phases) |
|--------|---------|-------------------|---------------------|
| Test files | 56 | ~80 | ~130+ |
| Unit tests | 25 | ~50 | ~100+ |
| API route coverage | 0% | ~30% (core routes) | ~70% |
| Utility/lib coverage | ~8% | ~25% | ~60% |
| Hook coverage | ~1% | ~10% | ~40% |
| Component coverage | <1% | ~5% | ~15% |

---

## Quick Wins (Immediate Value)

These can be implemented quickly and catch real bugs:

1. **`currency-converter.test.ts`** — Pure functions, easy to test, high financial risk
2. **`calculateFinancialCompleteness.test.ts`** — Pure function, drives UI indicators
3. **`period-allocation.test.ts` / `year-allocation.test.ts`** — Pure math, easy to verify
4. **`search-normalizer.test.ts`** — Pure string transformations
5. **`policy-marker-validation.test.ts`** — Already exists but could be expanded
6. **`organization-helpers.test.ts`** — Pure data transformations
7. **`date-utils.test.ts` / `fiscal-year-utils.test.ts`** — Date logic is notoriously error-prone
8. **`sanitize.test.ts`** — Security-critical, easy to test with known XSS vectors
