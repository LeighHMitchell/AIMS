// ========================================
// Diagnose Tags UI Display Issue
// Run this in your browser console
// ========================================

async function diagnoseTagsUI(activityId) {
  console.log('========================================');
  console.log('🔍 DIAGNOSING TAGS UI DISPLAY ISSUE');
  console.log('Activity ID:', activityId);
  console.log('========================================\n');

  // === CHECK 1: Are tags in the database? ===
  console.log('📋 CHECK 1: Fetch tags via API');
  try {
    const response = await fetch(`/api/activities/${activityId}/tags`);
    console.log('GET /api/activities/.../tags status:', response.status);
    
    if (response.ok) {
      const tags = await response.json();
      console.log('✅ API returned tags:', tags);
      console.log('Tag count:', tags.length);
      
      if (tags.length === 0) {
        console.error('❌ PROBLEM: No tags returned - they may not be linked to the activity');
        console.log('\nRun this SQL to check if tags exist but are not linked:');
        console.log(`
SELECT t.* 
FROM tags t 
WHERE t.name = 'a description of the tag'
AND NOT EXISTS (
  SELECT 1 FROM activity_tags at 
  WHERE at.tag_id = t.id 
  AND at.activity_id = '${activityId}'
);
        `);
        return;
      }
      
      // Check structure
      tags.forEach((tag, i) => {
        console.log(`\nTag ${i + 1}:`, tag);
        if (!tag.id) console.warn('⚠️  Missing id');
        if (!tag.name) console.warn('⚠️  Missing name');
      });
    } else {
      console.error('❌ API call failed:', response.status, response.statusText);
      const error = await response.json();
      console.error('Error:', error);
      return;
    }
  } catch (e) {
    console.error('❌ Network error:', e);
    return;
  }

  // === CHECK 2: Inspect the Tags component ===
  console.log('\n📋 CHECK 2: Inspect TagsSection Component State');
  
  // Try to find the component in React DevTools
  console.log('Look for TagsSection component in React DevTools');
  console.log('Check its props:');
  console.log('  - tags: should be an array of tag objects');
  console.log('  - activityId: should match', activityId);
  console.log('  - onChange: should be a function');
  
  // === CHECK 3: Check if page needs refresh ===
  console.log('\n📋 CHECK 3: Check for State/Cache Issues');
  console.log('The TagsSection component may not auto-refresh after import');
  console.log('\nTry these:');
  console.log('1. Navigate away from the activity and back');
  console.log('2. Hard refresh the page (Cmd/Ctrl + Shift + R)');
  console.log('3. Check if tags appear after refresh');
  
  // === CHECK 4: Verify activity fetch includes tags ===
  console.log('\n📋 CHECK 4: Check Activity API Response');
  try {
    const response = await fetch(`/api/activities/${activityId}`);
    if (response.ok) {
      const activity = await response.json();
      console.log('Activity data includes tags?', !!activity.tags);
      
      if (activity.tags) {
        console.log('Tags in activity response:', activity.tags);
      } else {
        console.warn('⚠️  Activity response does not include tags field');
        console.log('This might be normal - tags may be fetched separately');
      }
    }
  } catch (e) {
    console.error('Error fetching activity:', e);
  }
  
  console.log('\n========================================');
  console.log('SUMMARY & NEXT STEPS');
  console.log('========================================');
  console.log('1. If tags returned from API: UI state issue - try refreshing page');
  console.log('2. If no tags returned: Tags not linked - check activity_tags table');
  console.log('3. If API fails: Backend issue - check server logs');
  console.log('========================================');
}

// Usage
console.log('To run diagnostic:');
console.log('diagnoseTagsUI("YOUR_ACTIVITY_ID")');
console.log('\nExample:');
console.log('diagnoseTagsUI("634c2682-a81a-4b66-aca2-eb229c0e9581")');

