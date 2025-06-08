# Debugging Contributors Not Saving

## Quick Diagnostic Steps

### 1. Verify Code is Updated
In browser console, run:
```javascript
// This should show the debug version
console.log(window.location.href);
```

### 2. Manual State Check
After adding a contributor, in browser console run:
```javascript
// Check if React DevTools is available
if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  console.log("React DevTools detected - check Components tab for state");
}
```

### 3. Check for JavaScript Errors
- Open Console tab
- Clear console (Ctrl+L)
- Try adding a contributor
- Look for any red error messages

### 4. Verify Organization Dropdown
When you open the contributor dropdown:
- Are there organizations listed?
- Can you select one?
- Does the "Nominate" button become enabled?

## Common Issues and Fixes

### Issue: "No organizations in dropdown"
**Fix:** Organizations haven't loaded. Check:
- Are you logged in?
- Network tab: Is `/api/partners` returning data?

### Issue: "Nominate button doesn't work"
**Fix:** Check for:
- JavaScript errors in console
- Button might be disabled (no organization selected)

### Issue: "Contributor appears then disappears"
**Fix:** State update is failing. Look for:
- `[CONTRIBUTORS DEBUG]` messages in console
- Any errors when clicking "Nominate"

## What Working Logs Look Like

When everything works correctly:
```
[CONTRIBUTORS DEBUG] Nominating contributor: {
  id: "contrib_1234567890_abc",
  organizationId: "uuid-here",
  organizationName: "Partner Name",
  status: "nominated",
  ...
}
[CONTRIBUTORS DEBUG] Current contributors before: []
[CONTRIBUTORS DEBUG] Updated contributors: [{...}]
[CONTRIBUTORS DEBUG] onChange called with 1 contributors
[AIMS DEBUG] updateContributors called
[AIMS DEBUG] New contributors count: 1
[AIMS DEBUG] Contributors state changed: Array(1)
```

## Emergency Workaround

If contributors still won't save, as a temporary workaround:
1. Save the activity first without contributors
2. Note the Activity ID from the success message
3. Report the issue with:
   - Activity ID
   - Browser console screenshot
   - Network tab screenshot of the save request

## Data to Collect for Bug Report

Please provide:
1. **Browser Console** - Full screenshot after attempting to add contributor
2. **Network Tab** - Screenshot of POST /api/activities request
3. **Request Payload** - Click on the request → Request tab → Show the contributors array
4. **Response** - Click on the request → Response tab → Show contributors section 