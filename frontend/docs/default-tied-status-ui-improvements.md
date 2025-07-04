# Default Dropdowns UI Improvements

## Changes Made

### 1. Removed Helper Text
Removed the following descriptive text from all default value dropdowns in the Finances section:
- "IATI Aid Type (e.g., A01 - General budget support)"
- "IATI Finance Type (e.g., 110 - Grant, 420 - Loan)"
- "IATI Flow Type (e.g., 10 - ODA, 20 - OOF)"
- "ISO 4217 currency code (e.g., USD, EUR, GBP)"
- "IATI Tied Status (e.g., 5 - Untied)"

This creates a cleaner, less cluttered interface while the dropdown options themselves still contain all the necessary information.

### 2. Improved Dropdown Behavior
All dropdowns now properly close when clicking away:
- **Select components** (TiedStatusSelect, DefaultFinanceTypeSelect): Use Radix UI's Select primitive which handles click-outside by default
- **Popover components** (AidTypeSelect, FlowTypeSelect, CurrencySelector): Already have custom click-outside handling implemented

### 3. Enhanced Styling
- Added `cursor-pointer` class to make items clearly clickable
- Added `hover:bg-accent focus:bg-accent` for better visual feedback
- Set `w-[var(--radix-select-trigger-width)]` on SelectContent to ensure dropdowns match trigger width
- Set `max-h-[400px]` to prevent overly tall dropdowns

### 4. Component Details

#### TiedStatusSelect
- Simple Select component with three options
- Clear descriptions for each tied status option
- Improved hover states

#### DefaultFinanceTypeSelect  
- Categorized options (GRANTS, LOANS, DEBT RELIEF, GUARANTEES, OTHER)
- Code + label format for clarity
- Enhanced hover states

#### Other Components
- AidTypeSelect: Complex hierarchical search with Popover
- FlowTypeSelect: Searchable Popover with descriptions
- CurrencySelector: Searchable Popover with commonly used currencies

All components now provide a consistent, professional user experience with proper click-away behavior and visual feedback. 