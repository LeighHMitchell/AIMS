# Color Mapping Documentation

## Gray/Slate Color Palette

The AIMS application uses a consistent gray/slate color palette across all sector visualization components to ensure visual consistency and accessibility.

### Color Palette

```javascript
const GRAY_SLATE_COLORS = [
  '#1e293b', // slate-800
  '#334155', // slate-700  
  '#475569', // slate-600
  '#64748b', // slate-500
  '#94a3b8', // slate-400 (light - requires dark text)
  '#0f172a', // slate-900
  '#374151', // gray-700
  '#4b5563', // gray-600
  '#6b7280', // gray-500
  '#9ca3af', // gray-400 (light - requires dark text)
  '#d1d5db', // gray-300 (light - requires dark text)
  '#111827', // gray-900
  '#1f2937', // gray-800
  '#374151', // gray-700
  '#6b7280'  // gray-500
];
```

### Components Using This Palette

1. **SectorSunburstVisualization** (`/components/charts/SectorSunburstVisualization.tsx`)
   - Inner ring: `#1e293b`
   - Middle ring: `#475569`
   - Outer ring: `#64748b`

2. **ImprovedSectorAllocationForm** (`/components/activities/ImprovedSectorAllocationForm.tsx`)
   - Allocation percentage pills
   - Progress bar colors
   - Category color mapping

### Text Contrast Rules

For accessibility, text color is determined based on background color:

- **Light colors** (`#94a3b8`, `#9ca3af`, `#d1d5db`): Use dark text (`#1f2937`)
- **Dark colors** (all others): Use white text (`#ffffff`)

### Category Code Mapping

| Category Code | Description | Color Index |
|---------------|-------------|-------------|
| 111 | Education | 0 (`#1e293b`) |
| 121 | Health | 1 (`#334155`) |
| 130 | Population | 2 (`#475569`) |
| 140 | Water Supply & Sanitation | 3 (`#64748b`) |
| 150 | Government & Civil Society | 4 (`#94a3b8`) |
| 160 | Other Social Infrastructure | 5 (`#0f172a`) |
| 210 | Transport & Storage | 6 (`#374151`) |
| 220 | Communications | 7 (`#4b5563`) |
| 230 | Energy | 8 (`#6b7280`) |
| 240 | Banking & Financial Services | 9 (`#9ca3af`) |
| 250 | Business & Other Services | 10 (`#d1d5db`) |
| 310 | Agriculture, Forestry, Fishing | 11 (`#111827`) |
| 320 | Industry, Mining, Construction | 12 (`#1f2937`) |
| 330 | Trade Policies & Regulations | 13 (`#374151`) |
| 410 | General Environmental Protection | 14 (`#6b7280`) |
| 430+ | Other (wrap around) | 0+ |

### Usage Guidelines

1. **Consistency**: Always use the same color for the same category code across all components
2. **Accessibility**: Always use the `getTextColor()` helper for dynamic text color
3. **Fallback**: Default to `GRAY_SLATE_COLORS[0]` for unknown category codes
4. **Styling**: Use `rounded-md` for pills and badges for modern appearance

### Helper Functions

```javascript
// Get color for category code
const getCategoryColor = (categoryCode: string): string => {
  // Implementation in ImprovedSectorAllocationForm.tsx
}

// Get appropriate text color for background
const getTextColor = (backgroundColor: string): string => {
  const lightColors = ['#94a3b8', '#9ca3af', '#d1d5db'];
  return lightColors.includes(backgroundColor) ? '#1f2937' : '#ffffff';
}
```

### Design Rationale

- **Professional Appearance**: Gray/slate palette provides a sophisticated, professional look
- **Accessibility**: Ensures proper contrast ratios for readability
- **Consistency**: Same colors across all visualizations reduce cognitive load
- **Future-Proof**: Easy to extend with additional shades from the same palette 