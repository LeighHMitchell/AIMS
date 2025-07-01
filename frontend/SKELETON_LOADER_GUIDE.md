# 🌸 Skeleton Loader Guide

## Overview

This guide explains how to use the elegant skeleton loaders in the AIMS project. Our skeleton loaders provide a subtle, visually appealing loading experience that aligns with modern UI aesthetics.

## Available Components

### Basic Skeleton
```tsx
import { Skeleton } from '@/components/ui/skeleton-loader';

// Text skeleton
<Skeleton variant="text" width="75%" height="1rem" />

// Circular skeleton (for avatars)
<Skeleton variant="circular" width="48px" height="48px" />

// Rectangular skeleton
<Skeleton variant="rectangular" width="100%" height="200px" />

// Rounded skeleton (for cards)
<Skeleton variant="rounded" width="100%" height="100px" />
```

### Animation Options
```tsx
// Default shimmer effect (subtle gray)
<Skeleton animation="shimmer" />

// Blush-toned shimmer (elegant rose tint)
<Skeleton animation="shimmer-blush" />

// Simple pulse animation
<Skeleton animation="pulse" />

// No animation
<Skeleton animation="none" />
```

### Pre-built Skeleton Components

#### Activity List Skeleton
```tsx
import { ActivityListSkeleton } from '@/components/ui/skeleton-loader';

// Shows 5 activity card skeletons
<ActivityListSkeleton />
```

#### Organization Card Skeleton
```tsx
import { OrganisationCardSkeleton } from '@/components/ui/skeleton-loader';

<OrganisationCardSkeleton />
```

#### Dashboard Stats Skeleton
```tsx
import { DashboardStatsSkeleton } from '@/components/ui/skeleton-loader';

// Shows 4 stat card skeletons
<DashboardStatsSkeleton />
```

#### Table Skeleton
```tsx
import { TableSkeleton } from '@/components/ui/skeleton-loader';

// Customizable rows and columns
<TableSkeleton rows={5} columns={5} />
```

#### Chart Skeleton
```tsx
import { ChartSkeleton } from '@/components/ui/skeleton-loader';

// With custom height
<ChartSkeleton height="400px" />
```

### New Full-Page Skeletons

#### Activity Profile Skeleton
```tsx
import { ActivityProfileSkeleton } from '@/components/skeletons/ActivityProfileSkeleton';

// Complete activity profile loading state
<ActivityProfileSkeleton />
```

Features:
- Banner image placeholder
- Activity title and metadata grid
- Status pills and contributor badges
- Tab navigation with content cards
- Transaction table skeleton

#### Validation Queue Skeleton
```tsx
import { ValidationQueueSkeleton } from '@/components/skeletons/ValidationQueueSkeleton';

// Complete validation queue loading state
<ValidationQueueSkeleton />
```

Features:
- Page header with description
- Stats cards (pending, validated, rejected)
- Search and filter controls
- Activity list with status badges

## Implementation Examples

### Basic Loading State
```tsx
function MyComponent() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  if (loading) {
    return <ActivityListSkeleton />;
  }

  return <div className="fade-in">{/* Your content */}</div>;
}
```

### Activity Profile with Skeleton
```tsx
export default function ActivityDetailPage() {
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState(null);

  useEffect(() => {
    fetchActivity();
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <ActivityProfileSkeleton />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="fade-in">
        {/* Actual activity content */}
      </div>
    </MainLayout>
  );
}
```

### Validation Queue with Skeleton
```tsx
export default function ValidationsPage() {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);

  if (loading) {
    return (
      <MainLayout>
        <ValidationQueueSkeleton />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="fade-in">
        {/* Actual validation queue */}
      </div>
    </MainLayout>
  );
}
```

### Tab Switching with Loading
```tsx
function TabComponent() {
  const [tabLoading, setTabLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const handleTabChange = async (tab: string) => {
    setTabLoading(true);
    setActiveTab(tab);
    
    // Fetch tab data
    await fetchTabData(tab);
    
    // Minimum loading time for smooth transition
    await new Promise(resolve => setTimeout(resolve, 200));
    setTabLoading(false);
  };

  return (
    <div>
      {tabLoading ? (
        <div className="space-y-4 fade-in">
          <Skeleton variant="text" width="200px" height="2rem" />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="fade-in">
          {/* Tab content */}
        </div>
      )}
    </div>
  );
}
```

### With Custom Hook
```tsx
import { useLoadingState } from '@/hooks/useLoadingState';

function MyComponent() {
  const { isLoading, withLoading } = useLoadingState({
    minimumLoadingTime: 300 // Ensures smooth transitions
  });

  const fetchData = async () => {
    await withLoading(async () => {
      const response = await fetch('/api/data');
      return response.json();
    });
  };

  if (isLoading) {
    return <TableSkeleton rows={10} columns={5} />;
  }

  return <div className="fade-in">{/* Your content */}</div>;
}
```

## Styling Guidelines

### Colors
- **Default**: Neutral gray (`bg-gray-200/50`)
- **Blush variant**: Soft rose (`bg-rose-100/50`)
- Use opacity for subtlety

### Animations
- **Duration**: 1.5s for shimmer effects
- **Fade-in**: 0.3s ease-out for content appearance
- **Minimum loading**: 200-300ms to prevent flashing

### Layout
- Match skeleton dimensions to actual content
- Use consistent spacing
- Prevent layout shift by maintaining heights

## Best Practices

1. **Match Content Structure**: Ensure skeleton loaders match the structure of the actual content to prevent jarring transitions.

2. **Use Fade Transitions**: Apply the `fade-in` class to content that appears after loading.

3. **Minimum Loading Time**: For quick operations, maintain a minimum loading time (200-300ms) to prevent skeleton flashing.

4. **Contextual Loading**: Use different skeleton types for different contexts:
   - Tables → `TableSkeleton`
   - Cards → `OrganisationCardSkeleton` or `SkeletonCard`
   - Stats → `DashboardStatsSkeleton`
   - Charts → `ChartSkeleton`

5. **Accessibility**: Skeletons are automatically marked with appropriate ARIA attributes for screen readers.

## CSS Classes

The skeleton loaders use these CSS animations (defined in `globals.css`):

```css
/* Default shimmer */
.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0.04) 0%,
    rgba(0, 0, 0, 0.08) 50%,
    rgba(0, 0, 0, 0.04) 100%
  );
  animation: shimmer 1.5s ease-in-out infinite;
}

/* Blush shimmer variant */
.skeleton-shimmer-blush {
  background: linear-gradient(
    90deg,
    rgba(255, 228, 225, 0.5) 0%,
    rgba(255, 228, 225, 0.8) 50%,
    rgba(255, 228, 225, 0.5) 100%
  );
  animation: shimmer 1.5s ease-in-out infinite;
}

/* Fade-in for content */
.fade-in {
  animation: fadeIn 0.3s ease-out;
}
```

## Demo Page

Visit `/demo/skeletons` to see all skeleton components in action:
- Interactive previews with 3-second loading simulations
- View Activity Profile and Validation Queue skeletons
- Code examples and implementation details

## Troubleshooting

- **Skeleton not showing**: Check if loading state is properly set
- **Layout shift**: Ensure skeleton dimensions match content
- **Animation not smooth**: Verify CSS animations are loaded
- **Too fast/slow**: Adjust `minimumLoadingTime` in `useLoadingState` hook 