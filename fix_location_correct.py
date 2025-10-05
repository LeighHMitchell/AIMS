#!/usr/bin/env python3
"""
Fix Location Current Value Issue - CORRECTED VERSION
This properly removes the IIFE while maintaining correct arrow function syntax
"""

import sys
import shutil
from pathlib import Path

# File path
file_path = Path('/Users/leighmitchell/aims_project/frontend/src/components/activities/XmlImportTab.tsx')
backup_path = file_path.with_suffix('.tsx.backup2')

print("🔧 Applying Location Current Value Fix (Corrected)...")

# Create new backup
shutil.copy(file_path, backup_path)
print(f"✅ Created backup: {backup_path.name}")

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Change 1: Line 1862 - Change the IIFE to a function reference
# FROM: currentValue: (() => { ... })(),
# TO:   currentValue: () => { ... },
# We need to remove the outer parentheses and the final ()

# Find the pattern and replace it
old_pattern = '''          }),
            importValue: locationSummary,'''

new_pattern = '''          },
            importValue: locationSummary,'''

if old_pattern in content:
    content = content.replace(old_pattern, new_pattern, 1)
    print("✅ Change 1: Removed immediate invocation (changed IIFE to function reference)")
else:
    print("⚠️  Warning: Could not find the exact pattern for Change 1")
    # Try to find what's actually there
    if '})(),' in content:
        print("   Found })(), pattern exists")
    if 'importValue: locationSummary,' in content:
        print("   Found importValue pattern exists")

# Change 2: Update FieldRow component to handle function evaluation
old_field_row = '''      <td className="px-4 py-3 w-40">
        <div className="space-y-1">
        {field.currentValue ? (
            Array.isArray(field.currentValue) ? ('''

new_field_row = '''      <td className="px-4 py-3 w-40">
        <div className="space-y-1">
        {(() => {
          const currentValue = typeof field.currentValue === 'function' ? field.currentValue() : field.currentValue;
          return currentValue ? (
            Array.isArray(currentValue) ? ('''

if old_field_row in content:
    content = content.replace(old_field_row, new_field_row, 1)
    print("✅ Change 2a: Added function wrapper to FieldRow component")
    
    # Now replace field.currentValue with currentValue in the rendering logic
    # Count how many we're going to replace
    count = content.count('field.currentValue', content.index(new_field_row))
    
    # Replace within a specific range (after the new pattern we just added)
    start_pos = content.index(new_field_row) + len(new_field_row)
    end_marker = '        ) : (\n          <span className="text-gray-400 italic">Empty</span>\n        )}'
    
    if end_marker in content[start_pos:]:
        end_pos = content.index(end_marker, start_pos)
        before = content[:start_pos]
        middle = content[start_pos:end_pos]
        after = content[end_pos:]
        
        # Replace field.currentValue with currentValue in the middle section
        middle_replaced = middle.replace('field.currentValue', 'currentValue')
        count = middle.count('field.currentValue')
        
        print(f"✅ Change 2b: Replaced {count} occurrences of field.currentValue")
        
        # Now fix the closing
        old_closing = '        ) : (\n          <span className="text-gray-400 italic">Empty</span>\n        )}'
        new_closing = '          ) : (\n            <span className="text-gray-400 italic">Empty</span>\n          );\n        })()}'
        
        after_replaced = after.replace(old_closing, new_closing, 1)
        
        content = before + middle_replaced + after_replaced
        print("✅ Change 2c: Added wrapper closing")
    else:
        print("⚠️  Warning: Could not find end marker for Change 2")
else:
    print("⚠️  Warning: Could not find the exact pattern for Change 2")

# Write the modified content back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("")
print("🎉 Fix applied successfully!")
print("")
print("📝 Next steps:")
print("1. Check that the build succeeds (it should auto-reload)")
print("2. Import IATI XML with locations")
print("3. Import the same XML again")
print("4. Location 1 and Location 2 should show actual data!")
print("")
print("💡 If there are issues, restore backup:")
print(f"   cp {backup_path} {file_path}")

