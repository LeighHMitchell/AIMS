# Finance Type Display Logic - Correct Implementation

## Display Rules

### GRAYED OUT (Inherited)
**Condition:** Transaction has **NO** finance_type at transaction level, inherited from activity default

**Database State:**
- `transactions.finance_type` = populated from `activities.default_finance_type`
- `transactions.finance_type_inherited` = `TRUE`

**Visual:**
- Text color: `text-gray-400`
- Opacity: `opacity-70`
- Tooltip: "Inherited from activity's default finance type (code {code} – {name})"

**Example:** Activity has default finance type "110", transaction XML has no `<finance-type>` element → Shows "110 - Standard grant" in gray

---

### BLACK (Explicit)
**Condition:** Transaction **HAS** finance_type at transaction level (explicitly set)

**Database State:**
- `transactions.finance_type` = value from transaction data
- `transactions.finance_type_inherited` = `FALSE` or `NULL`

**Visual:**
- Normal text color and opacity
- Standard tooltip showing code and name

**Example Cases:**
1. Activity has default "110", transaction XML has `<finance-type code="410"/>` → Shows "410 - Aid loan" in black
2. Activity has default "110", transaction XML has `<finance-type code="110"/>` → Shows "110 - Standard grant" in black (matches but explicit)
3. Activity has no default, transaction XML has `<finance-type code="110"/>` → Shows "110 - Standard grant" in black

---

## Implementation Details

### Import Logic (XmlImportTab.tsx)
```typescript
const hasExplicitFinanceType = !!transaction.financeType;
const effectiveFinanceType = transaction.financeType || currentActivityData?.defaultFinanceType;

const transactionData = {
  // ... other fields
  finance_type: effectiveFinanceType,
  finance_type_inherited: !hasExplicitFinanceType && !!effectiveFinanceType
};
```

**Logic:**
- If transaction has financeType → Use it, inherited = FALSE → BLACK
- If transaction has NO financeType but activity has default → Use default, inherited = TRUE → GRAY
- If neither has financeType → NULL, inherited = FALSE → Shows dash

### Import API Logic (import-enhanced/route.ts)
```typescript
let effectiveFinanceType = financeType;
let financeTypeInherited = false;

if (!financeType) {
  // Fetch activity's default finance type
  const { data: activityData } = await getSupabaseAdmin()
    .from('activities')
    .select('default_finance_type')
    .eq('id', activityId)
    .single();
  
  if (activityData?.default_finance_type) {
    effectiveFinanceType = activityData.default_finance_type;
    financeTypeInherited = true;
  }
}
```

### Backfill Logic (SQL Scripts)
```sql
-- ONLY populate NULL finance_type values and mark as inherited
UPDATE transactions t
SET 
  finance_type = a.default_finance_type::finance_type_enum,
  finance_type_inherited = TRUE
FROM activities a
WHERE 
  t.activity_id = a.id
  AND t.finance_type IS NULL  -- Key: only NULL values
  AND a.default_finance_type IS NOT NULL;
```

**Important:** Does NOT mark existing transaction-level finance types as inherited, even if they match the activity default.

### Manual Edit Logic (Smart Logic)
When a user edits a transaction via the form:
```typescript
if ('finance_type' in updateData) {
  if (currentTransaction?.finance_type === updateData.finance_type && 
      currentTransaction?.finance_type_inherited === true) {
    // User didn't change the value and it was inherited - keep as inherited (GRAY)
    updateData.finance_type_inherited = true;
  } else {
    // User changed it or it's a new transaction - mark as explicit (BLACK)
    updateData.finance_type_inherited = false;
  }
}
```

This ensures:
- **Changed values** always show in BLACK (user confirmation)
- **Unchanged inherited values** stay GRAY (still system-inferred)
- **New manual entries** show in BLACK (user confirmation)

---

## Example Scenarios

### Scenario 1: IATI Import with Activity Default Only
**Setup:**
- Activity XML: `<default-finance-type code="110"/>`
- Transaction XML: No `<finance-type>` element

**Result:**
- Database: `finance_type = '110'`, `finance_type_inherited = TRUE`
- Display: "110 - Standard grant" in **GRAY**

### Scenario 2: IATI Import with Transaction Level Finance Type
**Setup:**
- Activity XML: `<default-finance-type code="110"/>`
- Transaction XML: `<finance-type code="410"/>`

**Result:**
- Database: `finance_type = '410'`, `finance_type_inherited = FALSE`
- Display: "410 - Aid loan" in **BLACK**

### Scenario 3: Both Levels Have Same Finance Type
**Setup:**
- Activity XML: `<default-finance-type code="110"/>`
- Transaction XML: `<finance-type code="110"/>`

**Result:**
- Database: `finance_type = '110'`, `finance_type_inherited = FALSE`
- Display: "110 - Standard grant" in **BLACK** (transaction level takes precedence)

### Scenario 4: Backfill Existing Data
**Before Backfill:**
- Database: `finance_type = NULL`
- Activity has: `default_finance_type = '110'`

**After Backfill:**
- Database: `finance_type = '110'`, `finance_type_inherited = TRUE`
- Display: "110 - Standard grant" in **GRAY**

### Scenario 5: Edit Inherited Transaction Without Changes
**Setup:**
- Transaction has: `finance_type = '110'`, `finance_type_inherited = TRUE`
- User opens edit form, sees "110" prepopulated, saves without changing

**Result:**
- Database: `finance_type = '110'`, `finance_type_inherited = TRUE` (unchanged)
- Display: "110 - Standard grant" in **GRAY** (stays inherited)

### Scenario 6: Manual Entry with Prepopulated Default
**Setup:**
- Activity has: `default_finance_type = '110'`
- User creates new transaction, finance type field prepopulated with "110"
- User saves without changing

**Result:**
- Database: `finance_type = '110'`, `finance_type_inherited = FALSE`
- Display: "110 - Standard grant" in **BLACK** (user saw and confirmed)

---

## Key Principles

### 1. Import vs Manual Entry Distinction

**Import (System Inferred) → GRAY:**
- Transaction XML has no `<finance-type>` element
- System fills in activity's default
- User never saw or confirmed this value
- Shows as GRAY to indicate it's a guess

**Manual Entry (User Confirmed) → BLACK:**
- User creates transaction via form
- Finance type field prepopulated for convenience
- By saving, user confirms the value
- Shows as BLACK to indicate user confirmation

### 2. Smart Edit Preservation

**Edit Without Change → Stays GRAY:**
- Transaction has `inherited = TRUE`
- User edits but doesn't change finance type
- Value stays GRAY (still system-inferred)

**Edit With Change → Becomes BLACK:**
- User actually changes the finance type
- Becomes BLACK (now user-confirmed)

### 3. IATI Compliance

**Transaction-level data always takes precedence.**

This matches IATI standards where transaction-level classifications override activity-level defaults.

### 4. User Experience Rationale

- **Prepopulated = Convenience** (saves typing)
- **GRAY = Uncertainty** (system made an educated guess)
- **BLACK = Confidence** (user saw and confirmed)

This visual distinction helps users identify which finance types should be reviewed/verified.

