# 🛠 AIMS Auto-Save Debugging Guide

## Quick Start Debugging

### 1. Enable Debug Mode
```javascript
// In browser console:
localStorage.setItem('DEBUG_AUTOSAVE', 'true');
// OR
window.enableAutosaveDebug();
// Then refresh the page
```

### 2. Check Current Status
```javascript
// In browser console:
window.autosaveDebugger.getStatusSummary(null);
window.getAutosaveLogs();
```

### 3. Force Manual Save Test
```javascript
// In browser console (when on Activity Editor page):
// This will attempt a manual save and log detailed information
window.autosaveDebugger.log('info', 'Manual save test triggered');
```

## Debug Panel Usage

The debug panel appears in the bottom-left corner when in development mode:

1. **Status Tab**: Shows current autosave state
2. **Issues Tab**: Lists detected problems and fixes
3. **Actions Tab**: Force save, refresh, export logs, clear logs

## Common Issues & Solutions

### Issue 1: "Saves: 0, Errors: 0, Unsaved: Yes"
**Symptoms**: Autosave indicator shows no saves happening, no errors, but changes remain unsaved.

**Debugging Steps**:
1. Check if title is present: `console.log(window.activityData?.general?.title)`
2. Check validation: `window.autosaveDebugger.validateActivityData(activityData)`
3. Check payload size: `window.autosaveDebugger.analyzePayload(activityData)`
4. Force manual save: Click "Force Save" in debug panel

**Common Causes**:
- Missing activity title (required field)
- Autosave disabled in configuration
- Circuit breaker activated after repeated failures
- Payload too large (>1MB for autosave)
- User context missing

### Issue 2: "Auto-saving: Yes" (Stuck)
**Symptoms**: Status shows "saving" permanently without completion.

**Debugging Steps**:
1. Check network tab for stuck requests
2. Look for JavaScript errors in console
3. Check server response time
4. Try manual save to test API connectivity

**Solutions**:
- Refresh the page to reset state
- Check network connectivity
- Verify server is running and responsive

### Issue 3: Transaction Dropdown Not Loading
**Symptoms**: Transaction type dropdown is empty, may be related to autosave issues.

**Debugging Steps**:
1. Check network requests to `/api/iati-reference-values`
2. Verify IATI reference data is loading
3. Check if autosave is blocking other API calls

### Issue 4: HTTP 413 "Payload Too Large"
**Symptoms**: Large activities failing to save with 413 errors.

**Debugging Steps**:
1. Check payload size: `window.autosaveDebugger.analyzePayload(activityData)`
2. Review payload breakdown to identify large sections
3. Check if minimal autosave payload is being used

**Solutions**:
- Reduce number of sectors, transactions, or contacts
- Use manual save instead of autosave for large activities
- Implement incremental saving for large datasets

## Debug Log Analysis

### Reading Network Logs
```javascript
// Filter network logs
const networkLogs = window.autosaveDebugger.logs.filter(log => log.type === 'network');
console.table(networkLogs);
```

### Reading Validation Logs
```javascript
// Check validation issues
const validationLogs = window.autosaveDebugger.logs.filter(log => log.type === 'validation');
console.table(validationLogs);
```

### Reading Error Logs
```javascript
// Check errors
const errorLogs = window.autosaveDebugger.logs.filter(log => log.type === 'error');
console.table(errorLogs);
```

## Advanced Debugging

### 1. Check Autosave Configuration
```javascript
console.log('Autosave Config:', {
  enabled: true, // Should be true
  intervalMs: 60000, // 60 seconds
  debounceMs: 10000, // 10 seconds
  maxRetries: 2
});
```

### 2. Monitor State Changes
The debugger automatically logs state changes. Look for:
- Data updates not triggering hasUnsavedChanges
- Save completion not clearing hasUnsavedChanges
- Validation failures preventing saves

### 3. Payload Analysis
```javascript
// Analyze what's taking up space in your payload
const analysis = window.autosaveDebugger.analyzePayload(activityData);
console.table(Object.entries(analysis.breakdown).map(([section, bytes]) => ({
  section,
  sizeKB: (bytes / 1024).toFixed(2),
  sizeMB: (bytes / 1024 / 1024).toFixed(3)
})));
```

### 4. Manual Save Testing
```javascript
// Test manual save with different payload sizes
window.autosaveDebugger.performManualSaveTest = async function() {
  const data = window.activityData;
  console.log('Testing manual save...');
  
  try {
    const response = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    console.log('Manual save response:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Manual save failed:', errorText);
    } else {
      const result = await response.json();
      console.log('Manual save successful:', result);
    }
  } catch (error) {
    console.error('Manual save error:', error);
  }
};
```

## Troubleshooting Checklist

### ✅ Pre-flight Checks
- [ ] Activity has a title
- [ ] User is logged in and has valid session
- [ ] Network connectivity is working
- [ ] Server is running and responsive
- [ ] No JavaScript errors in console

### ✅ Configuration Checks
- [ ] AutosaveFormWrapper is wrapping the form
- [ ] Autosave is enabled in configuration
- [ ] Required fields are present
- [ ] User context is available

### ✅ Data Validation Checks
- [ ] Activity data structure is valid
- [ ] No circular references in data
- [ ] Array sizes are reasonable (<100 items each)
- [ ] String fields are not excessively long

### ✅ Network Checks
- [ ] `/api/activities` endpoint is accessible
- [ ] API responses are successful (200-299 status codes)
- [ ] Request payload size is under limits
- [ ] Server processing time is reasonable

### ✅ State Management Checks
- [ ] hasUnsavedChanges updates when data changes
- [ ] isAutoSaving state clears after save completion
- [ ] Save count increments after successful saves
- [ ] Error count and messages are accurate

## Recovery Actions

### If Autosave is Completely Broken:
1. **Disable Autosave**: `window.disableAutosaveDebug()`
2. **Use Manual Save**: Click save buttons manually
3. **Export Current Data**: Use browser dev tools to copy activity data
4. **Check Server Health**: Verify API endpoints work independently

### If Large Activity Won't Save:
1. **Use Minimal Payload**: Let autosave use minimal payload mode
2. **Save in Sections**: Save different tabs separately
3. **Reduce Data**: Remove some transactions, sectors, or contacts temporarily
4. **Use Manual Save**: Manual saves allow larger payloads

### If State is Corrupted:
1. **Refresh Page**: Simple page refresh often fixes state issues
2. **Clear Local Storage**: `localStorage.clear()`
3. **Hard Refresh**: Ctrl+Shift+R (or Cmd+Shift+R on Mac)

## Production Debugging

For production debugging, autosave debug mode can be enabled with:
```javascript
localStorage.setItem('DEBUG_AUTOSAVE', 'true');
```

This enables:
- Detailed console logging
- Payload analysis
- Network request logging
- Validation checks
- Error diagnostics

## Performance Considerations

### Autosave Timing:
- **Debounce**: 10 seconds after last change
- **Interval**: 60 seconds if unsaved changes exist
- **Manual**: Immediate when user clicks save

### Payload Optimization:
- **Full Payload**: Manual saves and small activities
- **Reduced Payload**: Autosave with large datasets
- **Minimal Payload**: When reduced payload still too large

### Circuit Breaker:
- Activated after 3 consecutive failures
- Prevents spam of failed requests
- Reset on successful save
- Can be manually reset by refreshing page

## API Debugging

### Test Activity Save Endpoint:
```bash
curl -X POST http://localhost:3000/api/activities \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Activity",
    "description": "Test",
    "created_by_org_name": "Test Org"
  }'
```

### Check Server Logs:
Look for:
- Request size warnings
- Database connection issues
- Validation failures
- Processing timeouts

## Contact & Support

If debugging doesn't resolve the issue:
1. Export debug logs: Use "Export Logs" in debug panel
2. Note exact steps to reproduce
3. Include browser and OS information
4. Check server logs for additional context