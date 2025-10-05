#!/usr/bin/env python3
"""
Apply fix for location currentValue status check
Changes line 3545 to evaluate the function before checking if it's truthy
"""

import shutil
from pathlib import Path

# File path
file_path = Path('/Users/leighmitchell/aims_project/frontend/src/components/activities/XmlImportTab.tsx')
backup_path = file_path.with_suffix('.tsx.backup_status_fix')

print("🔧 Applying Location Status Fix...")
print(f"📁 File: {file_path}")

# Create backup
shutil.copy(file_path, backup_path)
print(f"✅ Created backup: {backup_path.name}")

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# The exact string to find and replace
old_code = "        ) : field.currentValue ? ("

new_code = """        ) : (() => {
          const evaluatedCurrentValue = typeof field.currentValue === 'function' ? field.currentValue() : field.currentValue;
          return evaluatedCurrentValue;
        })() ? ("""

# Apply the fix
if old_code in content:
    content = content.replace(old_code, new_code, 1)
    print("✅ Applied fix: Changed status check to evaluate currentValue function")
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("")
    print("🎉 Fix applied successfully!")
    print("")
    print("📝 What changed:")
    print("   - Line 3545 now evaluates currentValue if it's a function")
    print("   - Status will show 'New' when currentValue returns null")
    print("   - Status will show 'Match' only when currentValue returns actual data")
    print("")
    print("✅ Expected behavior:")
    print("   First import: Status = 'New', Current Value = 'Empty'")
    print("   Second import: Status = 'Match', Current Value = actual location data")
    print("")
    print("💡 Next steps:")
    print("   1. The dev server should auto-reload")
    print("   2. Refresh your browser")
    print("   3. Test by importing the XML twice")
    print("")
    print("🔄 To rollback if needed:")
    print(f"   cp {backup_path} {file_path}")
else:
    print(f"❌ Error: Could not find the expected code pattern")
    print(f"   Looking for: {repr(old_code)}")
    print("")
    print("💡 The code may have already been modified or the line number changed.")
    print("   Please check line 3545 manually.")

