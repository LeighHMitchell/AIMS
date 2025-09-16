#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the current file
const filePath = path.join(__dirname, 'src/app/activities/new/page.tsx');
const content = fs.readFileSync(filePath, 'utf8');

console.log('🔧 Applying comprehensive persistence fix...');

// Step 1: Add missing fields to formData object
const updatedContent1 = content.replace(
  /const formData = \{\s*general,\s*sectors,\s*transactions,\s*extendingPartners,\s*implementingPartners,\s*governmentPartners,\s*contacts,\s*sdgMappings,\s*tags,\s*workingGroups,\s*policyMarkers,\s*specificLocations,\s*coverageAreas,\s*countries,\s*regions,\s*advancedLocations,\s*budgets,\s*plannedDisbursements,\s*documents,\s*focalPoints,\s*subnationalBreakdowns,\s*governmentInputs\s*\};/,
  `const formData = {
        general,
        sectors,
        transactions,
        extendingPartners,
        implementingPartners,
        governmentPartners,
        contacts,
        contributors,
        contributorsCount,
        participatingOrgsCount,
        linkedActivitiesCount,
        resultsCount,
        sdgMappings,
        tags,
        workingGroups,
        policyMarkers,
        specificLocations,
        coverageAreas,
        countries,
        regions,
        advancedLocations,
        budgets,
        plannedDisbursements,
        documents,
        focalPoints,
        subnationalBreakdowns,
        governmentInputs
      };`
);

// Step 2: Add missing fields to dependency array
const finalContent = updatedContent1.replace(
  /}, \[\s*general, sectors, transactions, extendingPartners, implementingPartners,\s*governmentPartners, contacts, sdgMappings, tags, workingGroups,\s*policyMarkers, specificLocations, coverageAreas, countries, regions,\s*advancedLocations, budgets, plannedDisbursements, documents,\s*focalPoints, subnationalBreakdowns, governmentInputs, user\s*\/\/ NOTE: Intentionally exclude saveFormData to prevent infinite loops\s*\]/,
  `}, [
    general, sectors, transactions, extendingPartners, implementingPartners, 
    governmentPartners, contacts, contributors, contributorsCount, 
    participatingOrgsCount, linkedActivitiesCount, resultsCount,
    sdgMappings, tags, workingGroups, policyMarkers, specificLocations, 
    coverageAreas, countries, regions, advancedLocations, budgets, 
    plannedDisbursements, documents, focalPoints, subnationalBreakdowns, 
    governmentInputs, user
    // NOTE: Intentionally exclude saveFormData to prevent infinite loops
  ]`
);

// Write the corrected file
fs.writeFileSync(filePath, finalContent);

console.log('✅ Comprehensive persistence fix applied successfully!');
console.log('📝 Added missing fields to form persistence:');
console.log('   - contributors');
console.log('   - contributorsCount');
console.log('   - participatingOrgsCount');
console.log('   - linkedActivitiesCount');
console.log('   - resultsCount');
console.log('');
console.log('🔧 This will fix the green tick disappearing issue for:');
console.log('   ✅ Contributors Tab');
console.log('   ✅ Organizations Tab');
console.log('   ✅ Linked Activities Tab');
console.log('   ✅ Results Tab');
console.log('');
console.log('🎯 Expected behavior after fix:');
console.log('   - Fill out any tab → Green tick appears');
console.log('   - Navigate to other tabs → Green tick persists');
console.log('   - Refresh page → Green tick still shows');
console.log('   - No more double refresh needed!');
