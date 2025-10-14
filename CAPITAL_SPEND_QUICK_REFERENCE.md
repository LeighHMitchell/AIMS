# Capital Spend - Quick Reference Card

## 🎯 What It Does
Tracks the percentage of an activity's budget used for capital investment (infrastructure, equipment, fixed assets).

## 📍 Where to Find It
**Navigation:** Activity Editor → Funding & Delivery → Capital Spend  
**Position:** After "Results", before "Conditions"

## ✏️ How to Use

### Manual Entry
1. Open any activity
2. Navigate to: **Funding & Delivery → Capital Spend**
3. Enter percentage (0-100)
4. Click outside field to save
5. ✅ Green checkmark confirms save

### XML Import
```xml
<capital-spend percentage="88.8" />
```
1. Go to **XML Import** tab
2. Upload IATI XML file
3. Select "Capital Spend Percentage"
4. Click Import

### XML Export
Automatically included in exported IATI XML if value is set.

## ✅ Valid Values
- `0` to `100` (inclusive)
- Decimals: `25.5`, `88.75`
- Integers: `50`, `100`
- Empty (NULL) - field is optional

## ❌ Invalid Values
- Negative: `-10` ❌
- Over 100: `150` ❌
- Text: `"high"` ❌
- System rounds >2 decimals: `33.333` → `33.33`

## 💡 Examples
| Project Type | Typical Range | Example |
|-------------|---------------|---------|
| Infrastructure (roads, buildings) | 80-100% | 95% |
| Equipment procurement | 60-90% | 75% |
| Service delivery programs | 10-30% | 20% |
| Training programs | 0-10% | 5% |

## 🔐 Security
- ✅ Validated at all layers
- ✅ CHECK constraint in database
- ✅ Invalid imports rejected
- ✅ Permission-based editing

## 🐛 Troubleshooting

**Problem:** Field is read-only  
**Solution:** Check you have edit permissions

**Problem:** Import doesn't save  
**Solution:** Verify value is 0-100

**Problem:** Different decimal places  
**Solution:** System rounds to 2 decimals automatically

## 📊 Database
- **Column:** `capital_spend_percentage`
- **Type:** `DECIMAL(5,2)`
- **Table:** `activities`
- **Constraint:** `0 <= value <= 100`

## 🧪 Testing
Use provided test files:
- `test_capital_spend_import.xml` - Basic test
- `test_capital_spend_edge_cases.xml` - 10 edge cases

## 📚 Full Documentation
- `CAPITAL_SPEND_FINAL_SUMMARY.md` - Executive summary
- `CAPITAL_SPEND_IMPLEMENTATION_SUMMARY.md` - Technical details
- `CAPITAL_SPEND_SECURITY_AUDIT.md` - Security analysis

---

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Updated:** January 14, 2025

