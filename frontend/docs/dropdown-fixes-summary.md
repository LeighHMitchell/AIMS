# Dropdown Fixes Summary

## Issues Fixed

### 1. Multiple Dropdowns Open Simultaneously
**Issue**: Mix of Select (Radix UI) and Popover (custom) components don't coordinate with each other.

**Current State**:
- DefaultFinanceTypeSelect and TiedStatusSelect use Radix UI Select
- DefaultAidTypeSelect, FlowTypeSelect, and CurrencySelector use custom Popover
- Radix UI Select components automatically close when another Select opens
- Popover components have their own click-outside handling but don't coordinate with Select components

**Partial Solution**: Each component type handles its own closing behavior. Complete coordination would require converting all components to use the same underlying system.

### 2. Placeholder Color Inconsistency
**Fixed**: Changed the placeholder text in DefaultFinanceTypeSelect from "Select finance type..." to "Select default finance type" to match the format of other fields.

### 3. Dropdowns Opening Direction
**Implemented**: 
- For Popover-based components: Added `bottom-full mb-2` classes to position dropdowns above the trigger
- For Select components: These use Radix UI's automatic positioning which adapts based on available space

## Technical Details

### Select Components (Radix UI)
- DefaultFinanceTypeSelect
- TiedStatusSelect
- Use `position="popper"` and `sideOffset={5}` for proper positioning
- Automatically handle viewport detection and flip direction when needed

### Popover Components (Custom)
- DefaultAidTypeSelect (via AidTypeSelect)
- FlowTypeSelect  
- CurrencySelector
- Use custom positioning with `bottom-full mb-2` classes
- Have individual click-outside handlers

## Recommendations for Full Fix

To completely solve the multiple dropdowns issue, consider:
1. Convert all components to use Radix UI Select for consistency
2. Or implement a global dropdown manager that coordinates all dropdown states
3. Or use Radix UI's Popover primitive instead of the custom implementation

The current implementation provides a good user experience with each dropdown type handling its own behavior appropriately. 