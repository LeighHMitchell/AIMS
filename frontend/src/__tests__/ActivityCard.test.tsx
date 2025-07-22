import React from 'react';
import { render, screen } from '@testing-library/react';
import ActivityCard from '../components/activities/ActivityCard';
import { ActivityCardSkeleton } from '../components/activities/ActivityCardSkeleton';

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('ActivityCard', () => {
  const mockActivity = {
    id: '1',
    title: 'Test Activity Title',
    iati_id: 'TEST-001',
    description: 'Test activity description',
    activity_status: 'active',
    publication_status: 'published',
    planned_start_date: '2024-01-01',
    planned_end_date: '2024-12-31',
    updated_at: '2024-01-15T10:00:00Z'
  };

  test('renders activity card with title', () => {
    render(<ActivityCard activity={mockActivity} />);
    expect(screen.getByText('Test Activity Title')).toBeInTheDocument();
  });

  test('renders IATI ID when provided', () => {
    render(<ActivityCard activity={mockActivity} />);
    expect(screen.getByText('IATI: TEST-001')).toBeInTheDocument();
  });

  test('renders description when provided', () => {
    render(<ActivityCard activity={mockActivity} />);
    expect(screen.getByText('Test activity description')).toBeInTheDocument();
  });

  test('renders status badges', () => {
    render(<ActivityCard activity={mockActivity} />);
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('published')).toBeInTheDocument();
  });

  test('renders skeleton when loading', () => {
    render(<ActivityCard activity={mockActivity} isLoading={true} />);
    // The skeleton should be rendered instead of the actual card content
    expect(screen.queryByText('Test Activity Title')).not.toBeInTheDocument();
  });

  test('renders action menu when edit/delete handlers provided', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    
    render(
      <ActivityCard 
        activity={mockActivity} 
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
    
    // The menu button should be present (though it might be hidden until hover)
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

describe('ActivityCardSkeleton', () => {
  test('renders skeleton component', () => {
    render(<ActivityCardSkeleton />);
    // The skeleton should render without throwing errors
    expect(document.querySelector('.bg-white')).toBeInTheDocument();
  });
}); 