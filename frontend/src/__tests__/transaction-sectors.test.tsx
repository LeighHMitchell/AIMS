import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TransactionSectorsTab from '@/components/transactions/TransactionSectorsTab';

// Mock the custom hook
vi.mock('@/hooks/use-transaction-sectors', () => ({
  useTransactionSectors: vi.fn(() => ({
    sectorLines: [],
    validation: {
      isValid: true,
      errors: [],
      totalPercentage: 0,
      remainingPercentage: 100,
      totalAmount: 0
    },
    isLoading: false,
    isSaving: false,
    error: null,
    addSectorLine: vi.fn(),
    updateSectorLine: vi.fn(),
    removeSectorLine: vi.fn(),
    copyFromActivity: vi.fn(),
    distributeEqually: vi.fn(),
    clearAllSectors: vi.fn(),
    canSave: false,
    hasUnsavedChanges: false
  }))
}));

// Mock the SectorSelect component
vi.mock('@/components/forms/SectorSelect', () => ({
  SectorSelect: ({ onSectorSelect }: { onSectorSelect: (sector: any) => void }) => (
    <div data-testid="sector-select">
      <button 
        onClick={() => onSectorSelect({ code: '11220', name: 'Primary education' })}
        data-testid="select-sector-button"
      >
        Select Sector
      </button>
    </div>
  )
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
  formatCurrency: (amount: number, currency: string) => `${currency} ${amount.toFixed(2)}`
}));

describe('TransactionSectorsTab', () => {
  const defaultProps = {
    transactionId: 'test-transaction-id',
    transactionValue: 100000,
    transactionCurrency: 'USD',
    activityId: 'test-activity-id',
    disabled: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state correctly', () => {
    render(<TransactionSectorsTab {...defaultProps} />);
    
    expect(screen.getByText('Transaction Sectors')).toBeInTheDocument();
    expect(screen.getByText('No sector allocations yet')).toBeInTheDocument();
    expect(screen.getByText('Add First Sector')).toBeInTheDocument();
    expect(screen.getByText('Copy from Activity')).toBeInTheDocument();
  });

  it('shows add sector form when Add First Sector is clicked', async () => {
    render(<TransactionSectorsTab {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Add First Sector'));
    
    await waitFor(() => {
      expect(screen.getByText('Add Sector Allocation')).toBeInTheDocument();
      expect(screen.getByTestId('sector-select')).toBeInTheDocument();
    });
  });

  it('handles sector selection', async () => {
    const mockAddSectorLine = vi.fn();
    const { useTransactionSectors } = await import('@/hooks/use-transaction-sectors');
    
    vi.mocked(useTransactionSectors).mockReturnValue({
      sectorLines: [],
      validation: {
        isValid: true,
        errors: [],
        totalPercentage: 0,
        remainingPercentage: 100,
        totalAmount: 0
      },
      isLoading: false,
      isSaving: false,
      error: null,
      addSectorLine: mockAddSectorLine,
      updateSectorLine: vi.fn(),
      removeSectorLine: vi.fn(),
      copyFromActivity: vi.fn(),
      distributeEqually: vi.fn(),
      clearAllSectors: vi.fn(),
      canSave: false,
      hasUnsavedChanges: false
    });

    render(<TransactionSectorsTab {...defaultProps} />);
    
    // Open sector selection
    fireEvent.click(screen.getByText('Add First Sector'));
    
    // Select a sector
    fireEvent.click(screen.getByTestId('select-sector-button'));
    
    await waitFor(() => {
      expect(mockAddSectorLine).toHaveBeenCalledWith('11220', 'Primary education', 100);
    });
  });

  it('displays loading state', () => {
    const { useTransactionSectors } = require('@/hooks/use-transaction-sectors');
    
    vi.mocked(useTransactionSectors).mockReturnValue({
      sectorLines: [],
      validation: null,
      isLoading: true,
      isSaving: false,
      error: null,
      addSectorLine: vi.fn(),
      updateSectorLine: vi.fn(),
      removeSectorLine: vi.fn(),
      copyFromActivity: vi.fn(),
      distributeEqually: vi.fn(),
      clearAllSectors: vi.fn(),
      canSave: false,
      hasUnsavedChanges: false
    });

    render(<TransactionSectorsTab {...defaultProps} />);
    
    expect(screen.getByText('Loading sector allocations...')).toBeInTheDocument();
  });

  it('displays error state', () => {
    const { useTransactionSectors } = require('@/hooks/use-transaction-sectors');
    
    vi.mocked(useTransactionSectors).mockReturnValue({
      sectorLines: [],
      validation: null,
      isLoading: false,
      isSaving: false,
      error: 'Failed to load sectors',
      addSectorLine: vi.fn(),
      updateSectorLine: vi.fn(),
      removeSectorLine: vi.fn(),
      copyFromActivity: vi.fn(),
      distributeEqually: vi.fn(),
      clearAllSectors: vi.fn(),
      canSave: false,
      hasUnsavedChanges: false
    });

    render(<TransactionSectorsTab {...defaultProps} />);
    
    expect(screen.getByText('Failed to load sectors')).toBeInTheDocument();
  });

  it('renders sector allocations table when sectors exist', () => {
    const { useTransactionSectors } = require('@/hooks/use-transaction-sectors');
    
    const mockSectorLines = [
      {
        id: '1',
        transaction_id: 'test-transaction-id',
        sector_vocabulary: '1',
        sector_code: '11220',
        sector_name: 'Primary education',
        percentage: 60,
        amount_minor: 6000000,
        sort_order: 0
      },
      {
        id: '2',
        transaction_id: 'test-transaction-id',
        sector_vocabulary: '1',
        sector_code: '12240',
        sector_name: 'Basic nutrition',
        percentage: 40,
        amount_minor: 4000000,
        sort_order: 1
      }
    ];

    vi.mocked(useTransactionSectors).mockReturnValue({
      sectorLines: mockSectorLines,
      validation: {
        isValid: true,
        errors: [],
        totalPercentage: 100,
        remainingPercentage: 0,
        totalAmount: 100000
      },
      isLoading: false,
      isSaving: false,
      error: null,
      addSectorLine: vi.fn(),
      updateSectorLine: vi.fn(),
      removeSectorLine: vi.fn(),
      copyFromActivity: vi.fn(),
      distributeEqually: vi.fn(),
      clearAllSectors: vi.fn(),
      canSave: false,
      hasUnsavedChanges: false
    });

    render(<TransactionSectorsTab {...defaultProps} />);
    
    expect(screen.getByText('Sector Allocations')).toBeInTheDocument();
    expect(screen.getByText('11220')).toBeInTheDocument();
    expect(screen.getByText('Primary education')).toBeInTheDocument();
    expect(screen.getByText('12240')).toBeInTheDocument();
    expect(screen.getByText('Basic nutrition')).toBeInTheDocument();
    expect(screen.getByText('Valid allocation (100%)')).toBeInTheDocument();
  });
});




