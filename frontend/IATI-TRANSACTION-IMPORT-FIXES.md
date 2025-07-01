# IATI Transaction Import - Critical Issues and Fixes

Based on your analysis, here are the most common reasons why IATI transactions fail to import and their solutions:

## 🚨 Critical Issue #1: Missing Currency Field

**Problem**: All transactions have `currency = None` - this is REQUIRED by the schema.

**Solution**: Ensure all `<value>` elements have a `currency` attribute:

```xml
<!-- ❌ WRONG - Missing currency -->
<value>150000</value>

<!-- ✅ CORRECT - Currency specified -->
<value currency="USD">150000</value>
```

**Database Schema**: `currency TEXT NOT NULL`

## 🚨 Critical Issue #2: Missing Activity Reference

**Problem**: Transactions reference activities by IATI ID, but the database needs the UUID.

**Solution**: 
1. Import activities BEFORE transactions
2. The system will lookup the activity UUID using the IATI ID
3. If activity doesn't exist, the transaction will fail

**Example**: 
```sql
-- The system automatically does this lookup:
SELECT id FROM activities WHERE iati_id = 'US-GOV-17-IL252631475K-247533';
```

## ⚠️ Issue #3: Enum Field Mappings

**Problem**: IATI uses numeric codes that must map to database enums.

**Current Mappings**:
- Transaction Types: 1-13 (e.g., "3" = Disbursement)
- Tied Status: "3" = Partially tied, "4" = Tied, "5" = Untied
- Flow Type: "10" = ODA, "20" = OOF, etc.
- Aid Type: "C01" = Project interventions, etc.

**Solution**: The system now handles these mappings automatically using RPC functions.

## ⚠️ Issue #4: Optional Organization Fields

**Problem**: Some transactions have missing `provider_org_name` or `receiver_org_name`.

**Solution**: These fields are now truly optional. The system will:
- Store organization names if provided
- Continue without error if missing
- Not require organization IDs

## ✅ Issue #5: Boolean Fields

**Problem**: `is_humanitarian` must be a proper boolean.

**Solution**: The system correctly handles:
- `humanitarian="1"` → `true`
- `humanitarian="true"` → `true`
- Missing or other values → `false`

## 🛠️ How the Fix Works

### 1. RPC Functions (Bypass Schema Cache)
Two RPC functions handle the schema cache issue:
- `insert_iati_transaction()` - Inserts with all IATI fields
- `get_activity_transactions()` - Retrieves with all fields

### 2. Enhanced Import Logic
The IATI import route now:
- Uses RPC functions instead of direct inserts
- Auto-creates activities for orphan transactions
- Properly maps all enum values
- Handles missing optional fields gracefully

### 3. Diagnostic Tool
Run the diagnostic to check your XML before import:
```bash
node diagnose-transactions-v2.js your-file.xml
```

## 📋 Pre-Import Checklist

Before importing transactions, verify:

- [ ] All `<value>` elements have `currency` attributes
- [ ] All transaction dates use ISO format (YYYY-MM-DD)
- [ ] Transaction types use valid codes (1-13)
- [ ] Activities exist in database OR auto-creation is enabled
- [ ] Optional fields are truly optional (no FK constraints)

## 🎯 Quick Test

Test with a minimal transaction:
```json
{
  "type": "3",
  "date": "2024-06-12",
  "value": 50000,
  "currency": "USD",
  "activityRef": "YOUR-ACTIVITY-ID"
}
```

## 🚀 Import Success Indicators

A successful import will show:
- `transactionsCreated: X` (where X > 0)
- No errors in the response
- Activities auto-created if needed

## 📞 Support

If transactions still fail after these fixes:
1. Run the diagnostic tool
2. Check for schema cache refresh (may take hours)
3. Verify RPC functions exist in database
4. Check Supabase logs for detailed errors 