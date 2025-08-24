# Transaction Sectors Tab - Implementation Specification

## Overview

This specification outlines the implementation of a new "Transaction Sectors" tab within the existing transaction form interface. The feature enables users to allocate sector percentages at the transaction level, reusing existing Activity-level sector UI patterns while ensuring IATI v2.03+ compliance for export/import operations.

## Current State Analysis

### Current Transaction Structure
- **TransactionForm.tsx**: Single form with collapsible sections (no tabs currently)
- **TransactionModal.tsx**: Dialog wrapper containing the form
- **Database**: Single `sector_code` and `sector_vocabulary` fields in transactions table
- **API**: Basic transaction CRUD at `/api/transactions`

### Current Activity Sectors Pattern
- **Components**: `ImprovedSectorAllocationForm.tsx`, `SectorAllocationForm.tsx`, `SimpleSectorAllocationForm.tsx`
- **Features**: DAC sector search, percentage validation, badges, auto-distribution
- **Database**: Full percentage allocation support in `activity_sectors` table
- **API**: `/api/activities/[id]/sectors` with PUT/GET operations

## Implementation Status

✅ **COMPLETED:**
- Database migration for `transaction_sector_lines` table
- API endpoints for transaction sectors CRUD operations
- Server-side validation functions for sector allocations
- TypeScript interfaces for transaction sector lines
- Custom hook `use-transaction-sectors` for state management
- `TransactionSectorsTab` component with full UI

🚧 **IN PROGRESS:**
- Tab structure integration in TransactionForm

⏳ **PENDING:**
- Copy from activity functionality testing
- Client-side validation and error handling refinement
- Comprehensive testing suite

## Database Schema (Implemented)

```sql
CREATE TABLE transaction_sector_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES transactions(uuid) ON DELETE CASCADE,
    sector_vocabulary TEXT NOT NULL DEFAULT '1',
    sector_code TEXT NOT NULL,
    sector_name TEXT NOT NULL,
    percentage NUMERIC(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
    amount_minor INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    UNIQUE(transaction_id, sector_vocabulary, sector_code, deleted_at)
);
```

## API Endpoints (Implemented)

### GET /api/transactions/[transactionId]/sectors
Returns sector lines and validation metadata for a transaction.

### PUT /api/transactions/[transactionId]/sectors
Updates all sector lines for a transaction with validation.

### POST /api/transactions/[transactionId]/sectors/copy-from-activity
Copies sector allocations from the parent activity.

### DELETE /api/transactions/[transactionId]/sectors/[sectorLineId]
Deletes an individual sector line.

## Component Architecture (Implemented)

### TransactionSectorsTab Component
- **Location**: `/frontend/src/components/transactions/TransactionSectorsTab.tsx`
- **Features**:
  - Sector allocation table with percentage inputs
  - Real-time validation and progress indicators
  - Copy from Activity functionality
  - Auto-distribution and manual entry
  - Empty state with helpful guidance
  - Responsive design for mobile/tablet

### Custom Hook: use-transaction-sectors
- **Location**: `/frontend/src/hooks/use-transaction-sectors.ts`
- **Features**:
  - State management for sector lines
  - CRUD operations with API integration
  - Client-side validation
  - Auto-save with debouncing
  - Error handling and loading states

## Tab Integration Plan

The TransactionForm will be restructured to use a tabbed interface:

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌─────────┬─────────┬──────────────────┬─────────────────────┐  │
│ │ General │ Parties │ Transaction      │ Notes & System Info │  │
│ │         │         │ Sectors          │                     │  │
│ └─────────┴─────────┴──────────────────┴─────────────────────┘  │
│                                                                 │
│ [Active Tab Content]                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Tab Contents:
1. **General**: Transaction type, date, value, currency, status, value date
2. **Parties**: Provider and receiver organizations
3. **Transaction Sectors**: Sector allocation interface (disabled for new transactions)
4. **Notes**: Description, advanced fields, system information

## Validation Rules (Implemented)

### Client-Side Validation
- Percentage sum must equal 100%
- No duplicate sector codes per vocabulary
- Individual percentages between 0.01% and 100%
- Amount reconciliation with transaction value

### Server-Side Validation
- Same rules as client-side
- Foreign key constraints
- RLS policy enforcement
- Rounding reconciliation

## IATI Compliance Strategy

### Export Behavior
For transactions with sector allocations, generate multiple `<transaction>` elements in IATI XML:

```xml
<!-- Original transaction with 60% education, 40% health -->
<transaction>
  <value currency="USD">60000</value>
  <sector vocabulary="1" code="11220" />
  <!-- Other transaction fields -->
</transaction>
<transaction>
  <value currency="USD">40000</value>
  <sector vocabulary="1" code="12240" />
  <!-- Other transaction fields -->
</transaction>
```

### Import Behavior
Group transactions by business key (excluding sector) and merge into single UI transaction with multiple sector lines.

## Feature Flags

```typescript
export const FEATURE_FLAGS = {
  TRANSACTION_SECTORING_ENABLED: process.env.NEXT_PUBLIC_ENABLE_TRANSACTION_SECTORS === 'true',
  TRANSACTION_SECTORS_REQUIRED: process.env.NEXT_PUBLIC_REQUIRE_TRANSACTION_SECTORS === 'true',
  COPY_FROM_ACTIVITY_DEFAULT: process.env.NEXT_PUBLIC_TRANSACTION_SECTORS_AUTO_COPY === 'true'
};
```

## User Experience

### Empty State
When no sectors are allocated, users see:
- Helpful explanation of transaction sectors
- "Add First Sector" button
- "Copy from Activity" quick action
- Clear value proposition

### Active State
When sectors are allocated:
- Table showing sector code, name, percentage, calculated amount
- Real-time validation with progress bar
- Add/remove sector functionality
- Distribute equally option
- Validation errors with specific guidance

### Disabled State
For new transactions (no UUID yet):
- Tab is disabled with tooltip explanation
- Users must save transaction first to access sectors
- Clear messaging about the requirement

## Analytics Impact

### Database Views
New view `v_transaction_sector_analytics` provides:
- Transaction-level sector data with fallback to activity-level
- Priority logic for reporting (transaction > activity > none)
- Proper amount calculations for sector-specific reporting

### Chart Integration
Existing analytics components will be updated to:
- Use transaction-level sectors when available
- Fall back to activity-level sectors when transaction sectors don't exist
- Maintain backwards compatibility

## Testing Strategy

### Unit Tests
- Validation functions
- Rounding reconciliation logic
- API endpoint responses
- Component rendering

### Integration Tests
- Database operations with RLS
- API authentication/authorization
- Form submission workflows

### End-to-End Tests
- Complete user workflows
- Tab navigation
- Copy from activity functionality
- Error handling scenarios

## Deployment Plan

### Phase 1: Backend Foundation ✅
- Database migration
- API endpoints
- Server-side validation

### Phase 2: Frontend Core ✅
- Component development
- Custom hook implementation
- Basic UI functionality

### Phase 3: Integration 🚧
- Tab structure in TransactionForm
- Complete user workflows
- Error handling refinement

### Phase 4: Testing & Polish ⏳
- Comprehensive testing
- Performance optimization
- Documentation updates

### Phase 5: Rollout ⏳
- Feature flag configuration
- Staged deployment
- User training materials

## Known Limitations

1. **New Transactions**: Sectors tab disabled until transaction is saved (requires UUID)
2. **Rounding**: Minor rounding differences handled automatically
3. **Performance**: Large numbers of sector lines (>20) may impact UI performance
4. **Mobile**: Complex table may require horizontal scrolling on small screens

## Success Metrics

- **Adoption**: % of transactions with sector allocations after 30 days
- **Accuracy**: Reduction in sector allocation errors vs activity-level only
- **Performance**: Page load time impact < 100ms
- **User Satisfaction**: Positive feedback on sector allocation workflow

---

**Status**: Implementation 80% Complete  
**Next Steps**: Complete tab integration, testing, and deployment  
**Estimated Completion**: 1-2 weeks

