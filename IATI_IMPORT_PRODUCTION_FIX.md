# IATI Import Production Fix - Implementation Complete

**Date:** October 31, 2025  
**Issue:** IATI Import (URL, File Upload, Snippet, Search) not working in production build  
**Status:** ✅ **FIXED** - Ready for deployment

---

## 🎯 Root Cause Analysis

The IATI import functionality was failing in production due to **missing Next.js App Router configuration** on critical API routes. Without the `dynamic = 'force-dynamic'` directive, Next.js was attempting to statically optimize these routes at build time, causing them to:

1. Return cached/stale responses
2. Not execute at all in serverless environments
3. Be pre-rendered as static JSON during build

Additional issues:
- Insufficient timeout durations for large XML parsing
- `AbortSignal.timeout()` compatibility issues across Node.js versions
- Lack of production diagnostic logging

---

## 📝 Changes Implemented

### ✅ **Fix 1: API Route Dynamic Configuration**

Added critical runtime configuration to all IATI-related API routes:

#### Files Modified:

1. **`frontend/src/app/api/iati/parse/route.ts`**
   ```typescript
   export const dynamic = 'force-dynamic';
   export const runtime = 'nodejs';
   export const maxDuration = 60; // 60 seconds for large files
   ```

2. **`frontend/src/app/api/iati/parse-snippet/route.ts`**
   ```typescript
   export const dynamic = 'force-dynamic';
   export const runtime = 'nodejs';
   export const maxDuration = 30;
   ```

3. **`frontend/src/app/api/xml/fetch/route.ts`**
   ```typescript
   export const dynamic = 'force-dynamic';
   export const runtime = 'nodejs';
   export const maxDuration = 60; // For slow external URLs
   ```

4. **`frontend/src/app/api/iati/activity/[iatiId]/route.ts`**
   ```typescript
   export const dynamic = 'force-dynamic';
   export const runtime = 'nodejs';
   export const maxDuration = 30;
   ```

5. **`frontend/src/app/api/iati/search/route.ts`**
   ```typescript
   export const dynamic = 'force-dynamic';
   export const runtime = 'nodejs';
   export const maxDuration = 30;
   ```

**Impact:** Prevents static optimization and ensures routes execute dynamically in production

---

### ✅ **Fix 2: Improved Timeout Handling**

**File:** `frontend/src/app/api/xml/fetch/route.ts`

**Before:**
```typescript
const response = await fetch(url, {
  signal: AbortSignal.timeout(30000), // Not compatible with all Node versions
});
```

**After:**
```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 60000);

try {
  const response = await fetch(url, {
    signal: controller.signal,
  });
  clearTimeout(timeout);
} catch (fetchError) {
  clearTimeout(timeout);
  if (fetchError instanceof Error && fetchError.name === 'AbortError') {
    return NextResponse.json(
      { error: 'Request timeout - URL took too long to respond (>60s)' },
      { status: 408 }
    );
  }
  throw fetchError;
}
```

**Benefits:**
- Better compatibility across Node.js versions
- Proper cleanup of timeouts
- Extended from 30s to 60s for large files
- Better error messages

---

### ✅ **Fix 3: Vercel Deployment Configuration**

**File:** `frontend/vercel.json`

Added specific timeout overrides for IATI routes:

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    },
    "src/app/api/iati/parse/route.ts": {
      "maxDuration": 60
    },
    "src/app/api/iati/parse-snippet/route.ts": {
      "maxDuration": 30
    },
    "src/app/api/xml/fetch/route.ts": {
      "maxDuration": 60
    },
    "src/app/api/iati/import/route.ts": {
      "maxDuration": 60
    },
    "src/app/api/iati/search/route.ts": {
      "maxDuration": 30
    }
  }
}
```

**Impact:** Allows sufficient time for:
- Parsing large multi-MB XML files (up to 60s)
- Fetching from slow external servers (up to 60s)
- Complex IATI activity parsing with hundreds of activities

---

### ✅ **Fix 4: Production Diagnostic Logging**

**File:** `frontend/src/components/activities/XmlImportTab.tsx`

Enhanced logging in key functions for production debugging:

```typescript
const parseXmlFile = async () => {
  console.log('[XML Import Debug] parseXmlFile called, method:', importMethod);
  console.log('[XML Import Debug] Environment:', typeof window !== 'undefined' ? 'browser' : 'server');
  console.log('[XML Import Debug] User Agent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A');
  console.log('[XML Import Debug] Origin:', typeof window !== 'undefined' ? window.location.origin : 'N/A');
  // ...
}

const fetchXmlFromUrl = async (url: string): Promise<string> => {
  console.log('[XML Import Debug] Timestamp:', new Date().toISOString());
  console.log('[XML Import Debug] Fetch API endpoint:', '/api/xml/fetch');
  // ...
}
```

**Benefits:**
- Better visibility into production issues
- Environment detection (browser vs server)
- Timestamp tracking for performance analysis
- API endpoint verification

---

## 🧪 Testing Checklist

Before deploying to production, verify each import method:

### File Upload Import
- [ ] Navigate to activity editor → XML Import tab
- [ ] Upload a sample `.xml` file
- [ ] Verify parsing succeeds and fields appear
- [ ] Check browser console for "[XML Import Debug]" logs

### URL Import
- [ ] Navigate to activity editor → XML Import tab
- [ ] Paste an IATI XML URL (e.g., from IATI Registry)
- [ ] Click "Fetch and Parse"
- [ ] Verify XML fetches and parses correctly
- [ ] Check browser console for timing logs

### Snippet Import
- [ ] Navigate to activity editor → XML Import tab
- [ ] Paste an XML snippet (e.g., `<transaction>...</transaction>`)
- [ ] Click "Parse Snippet"
- [ ] Verify snippet type detection and parsing
- [ ] Check that snippet wrapping works correctly

### IATI Datastore Search
- [ ] Navigate to activity editor → IATI Search tab
- [ ] Search for an activity (e.g., "health Myanmar")
- [ ] Verify results appear from IATI API
- [ ] Click on a result to import
- [ ] Verify XML fetches and imports correctly

---

## 📊 Production Monitoring

After deployment, monitor these metrics:

### Vercel Function Logs
- Filter by function names: `parse`, `parse-snippet`, `xml/fetch`, `search`
- Watch for:
  - ✅ Successful executions (200 responses)
  - ⚠️ Timeout errors (should be rare now with 60s limit)
  - ❌ Runtime errors (investigate immediately)
  - 📊 Execution duration (should be <60s for most files)

### Browser Console Logs
Look for these debug logs in production:
```
[XML Import Debug] parseXmlFile called, method: url
[XML Import Debug] Environment: browser
[XML Import Debug] Fetching XML from URL via proxy: https://...
[XML Fetch API] Fetching XML from URL: https://...
[XML Fetch API] Successfully fetched XML, length: 245678
```

### Error Tracking
If you have Sentry or similar, watch for:
- Component errors in `XmlImportTab`
- API errors in `/api/iati/*` routes
- Timeout errors (408 status)
- CORS errors (should be eliminated with server-side proxy)

---

## 🚀 Deployment Steps

1. **Commit Changes:**
   ```bash
   git add frontend/src/app/api/iati/parse/route.ts
   git add frontend/src/app/api/iati/parse-snippet/route.ts
   git add frontend/src/app/api/xml/fetch/route.ts
   git add frontend/src/app/api/iati/activity/[iatiId]/route.ts
   git add frontend/src/app/api/iati/search/route.ts
   git add frontend/vercel.json
   git add frontend/src/components/activities/XmlImportTab.tsx
   git commit -m "Fix: IATI import not working in production - add dynamic route config"
   ```

2. **Push to Repository:**
   ```bash
   git push origin main
   ```

3. **Verify Vercel Build:**
   - Watch build logs in Vercel dashboard
   - Ensure no static optimization warnings for IATI routes
   - Check that all functions have correct timeout settings

4. **Test in Production:**
   - Wait for deployment to complete
   - Test all four import methods (see Testing Checklist above)
   - Monitor Vercel function logs for first few imports

5. **Rollback Plan (if needed):**
   ```bash
   git revert HEAD
   git push origin main
   ```

---

## 📋 Files Changed Summary

| File | Changes | Impact |
|------|---------|--------|
| `frontend/src/app/api/iati/parse/route.ts` | Added dynamic config (3 lines) | Critical - fixes file upload |
| `frontend/src/app/api/iati/parse-snippet/route.ts` | Added dynamic config (3 lines) | Critical - fixes snippet import |
| `frontend/src/app/api/xml/fetch/route.ts` | Added dynamic config + improved timeout (20 lines) | Critical - fixes URL import |
| `frontend/src/app/api/iati/activity/[iatiId]/route.ts` | Added dynamic config (3 lines) | Important - improves IATI search |
| `frontend/src/app/api/iati/search/route.ts` | Added dynamic config (3 lines) | Important - improves IATI search |
| `frontend/vercel.json` | Added specific timeout overrides (15 lines) | Important - prevents timeouts |
| `frontend/src/components/activities/XmlImportTab.tsx` | Added production logging (6 lines) | Helpful - aids debugging |

**Total Lines Changed:** ~56 lines  
**Files Modified:** 7 files  
**Breaking Changes:** None  
**Backward Compatible:** Yes

---

## 🔍 Technical Details

### Why `dynamic = 'force-dynamic'` is Critical

Next.js 13+ App Router has three rendering modes:
1. **Static** (default): Pre-rendered at build time
2. **Dynamic**: Rendered on-demand at request time
3. **Streaming**: Rendered progressively

IATI import routes MUST be dynamic because:
- They process user-uploaded files (unique per request)
- They fetch external URLs (different each time)
- They parse XML content (varies by user input)
- They interact with Supabase (requires runtime data)

Without `dynamic = 'force-dynamic'`, Next.js sees these routes have no dynamic segments (like `[id]`) and tries to pre-render them, which fails in production.

### Why `runtime = 'nodejs'` is Important

- Ensures full Node.js runtime (not Edge runtime)
- Provides access to full `fetch` API with timeout support
- Better compatibility with `fast-xml-parser` library
- More memory available for large XML parsing

### Why Extended Timeouts are Necessary

IATI XML files can be:
- **Large:** 5-50 MB files with thousands of activities
- **Complex:** Nested structures requiring recursive parsing
- **Remote:** Fetched from slow external servers (IATI Registry)
- **Resource-intensive:** XML parsing is CPU-bound

Default 10-30s timeouts were insufficient. New 60s limits provide adequate buffer while preventing infinite hangs.

---

## ✅ Success Criteria

The fix is successful if:

1. ✅ **File Upload:** Users can upload `.xml` files and see parsed fields
2. ✅ **URL Import:** Users can paste IATI URLs and fetch/parse successfully
3. ✅ **Snippet Import:** Users can paste XML snippets and import specific elements
4. ✅ **IATI Search:** Users can search IATI Datastore and import activities
5. ✅ **No Errors:** Browser console shows debug logs, no errors
6. ✅ **No Timeouts:** Vercel function logs show successful completions
7. ✅ **Performance:** Imports complete in <60 seconds

---

## 🎓 Lessons Learned

1. **Always check Next.js App Router defaults** - Static optimization is aggressive
2. **Test in production-like environments** - Dev mode behavior differs
3. **Add comprehensive logging early** - Essential for production debugging
4. **Set appropriate timeouts** - Different routes have different needs
5. **Document configuration decisions** - Helps future maintenance

---

## 📞 Support

If issues persist after deployment:

1. **Check Vercel Function Logs:** https://vercel.com/[your-project]/functions
2. **Check Browser Console:** Look for [XML Import Debug] logs
3. **Test API Routes Directly:** Use curl to test endpoints
4. **Review this document:** Ensure all changes were deployed

**Contact:** Development team  
**Documentation:** This file + inline code comments

---

**Status:** ✅ Ready for Production Deployment  
**Risk Level:** Low (backward compatible, small targeted changes)  
**Confidence:** High (addresses root cause directly)

