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
    partner_id: 'ACT-2024-001',
    title: 'Test Activity Title',
    iati_id: 'TEST-001',
    description: 'Test activity description',
    activity_status: 'active',
    publication_status: 'published',
    planned_start_date: '2024-01-01',
    planned_end_date: '2024-12-31',
    updated_at: '2024-01-15T10:00:00Z',
    default_aid_type: 'C01',
    default_flow_type: '10',
    default_tied_status: '3',
    created_by_org_name: 'Test Organization',
    totalBudget: 100000,
    totalDisbursed: 50000
  };

  test('renders activity card with title', () => {
    render(<ActivityCard activity={mockActivity} />);
    expect(screen.getByText('Test Activity Title')).toBeInTheDocument();
  });

  test('renders Activity ID when provided', () => {
    render(<ActivityCard activity={mockActivity} />);
    expect(screen.getByText('Activity ID:')).toBeInTheDocument();
    expect(screen.getByText('ACT-2024-001')).toBeInTheDocument();
  });

  test('renders IATI ID when provided', () => {
    render(<ActivityCard activity={mockActivity} />);
    expect(screen.getByText('IATI Identifier:')).toBeInTheDocument();
    expect(screen.getByText('TEST-001')).toBeInTheDocument();
  });

  test('renders description when provided', () => {
    render(<ActivityCard activity={mockActivity} />);
    expect(screen.getByText('Test activity description')).toBeInTheDocument();
  });

  test('renders aid modality information when provided', () => {
    render(<ActivityCard activity={mockActivity} />);
    expect(screen.getByText('Activity Details')).toBeInTheDocument();
    expect(screen.getByText('Project-type interventions')).toBeInTheDocument();
    expect(screen.getByText('ODA')).toBeInTheDocument();
    expect(screen.getByText('Untied')).toBeInTheDocument();
  });

  test('renders financial and reporting information when provided', () => {
    render(<ActivityCard activity={mockActivity} />);
    expect(screen.getByText('Financial Summary')).toBeInTheDocument();
    expect(screen.getByText('Test Organization')).toBeInTheDocument();
    expect(screen.getByText('$100,000')).toBeInTheDocument();
    expect(screen.getByText('$50,000')).toBeInTheDocument();
    expect(screen.getByText('Activity Details')).toBeInTheDocument();
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