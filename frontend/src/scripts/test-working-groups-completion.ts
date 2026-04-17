#!/usr/bin/env node

/**
 * Test script to demonstrate the Working Groups tab completion functionality
 * This shows how the green tick appears when working groups are assigned to an activity
 */

import { checkWorkingGroupsTabCompletion } from '@/utils/tab-completion'


// Test Case 1: No working groups assigned
const result1 = checkWorkingGroupsTabCompletion([])

// Test Case 2: Empty working groups array  
const result2 = checkWorkingGroupsTabCompletion([null, undefined])

// Test Case 3: One working group assigned with code
const result3 = checkWorkingGroupsTabCompletion([
  { code: 'TWG-Health', label: 'Health Technical Working Group' }
])

// Test Case 4: One working group assigned with ID
const result4 = checkWorkingGroupsTabCompletion([
  { id: 'twg-health', label: 'Health Technical Working Group' }
])

// Test Case 5: Multiple working groups assigned
const result5 = checkWorkingGroupsTabCompletion([
  { code: 'TWG-Health', label: 'Health Technical Working Group' },
  { code: 'TWG-Education', label: 'Education Technical Working Group' },
  { code: 'SWG-BasicEducation', label: 'Basic Education Sub-Working Group' }
])

// Test Case 6: Invalid working group (no code or ID)
const result6 = checkWorkingGroupsTabCompletion([
  { label: 'Health Technical Working Group' } // Missing code and id
])


export {}