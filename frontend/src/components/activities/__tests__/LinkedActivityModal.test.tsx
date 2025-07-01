import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import LinkedActivityModal from '../LinkedActivityModal';

describe('LinkedActivityModal', () => {
  const mockActivity = {
    id: 'test-123',
    title: 'Test Activity',
    iati_id: 'XM-DAC-12345',
    activity_status: 'active'
  };
  
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders modal with activity details', () => {
    render(
      <LinkedActivityModal
        activity={mockActivity}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    expect(screen.getByText('Link Activity')).toBeInTheDocument();
    expect(screen.getByText('Test Activity')).toBeInTheDocument();
    expect(screen.getByText('IATI ID: XM-DAC-12345')).toBeInTheDocument();
    expect(screen.getByText('Status: active')).toBeInTheDocument();
  });
  
  it('displays all relationship types with descriptions', () => {
    render(
      <LinkedActivityModal
        activity={mockActivity}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    expect(screen.getByText('Parent')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
    expect(screen.getByText('Sibling')).toBeInTheDocument();
    expect(screen.getByText('Co-funded')).toBeInTheDocument();
    expect(screen.getByText('Third-party report')).toBeInTheDocument();
    
    // Check for example text
    expect(screen.getByText(/National Health Programme/)).toBeInTheDocument();
  });
  
  it('requires both relationship type and confirmation toggle', () => {
    render(
      <LinkedActivityModal
        activity={mockActivity}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    const createButton = screen.getByText('Create Link');
    expect(createButton).toBeDisabled();
    
    // Select relationship type
    const parentRadio = screen.getByLabelText(/Parent/);
    fireEvent.click(parentRadio);
    expect(createButton).toBeDisabled();
    
    // Check confirmation toggle
    const confirmToggle = screen.getByRole('checkbox');
    fireEvent.click(confirmToggle);
    expect(createButton).toBeEnabled();
  });
  
  it('calls onConfirm with selected relationship type', () => {
    render(
      <LinkedActivityModal
        activity={mockActivity}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    // Select relationship type
    const coFundedRadio = screen.getByLabelText(/Co-funded/);
    fireEvent.click(coFundedRadio);
    
    // Check confirmation
    const confirmToggle = screen.getByRole('checkbox');
    fireEvent.click(confirmToggle);
    
    // Click create
    const createButton = screen.getByText('Create Link');
    fireEvent.click(createButton);
    
    expect(mockOnConfirm).toHaveBeenCalledWith('4');
  });
  
  it('calls onCancel when cancel button is clicked', () => {
    render(
      <LinkedActivityModal
        activity={mockActivity}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });
  
  it('calls onCancel when X button is clicked', () => {
    render(
      <LinkedActivityModal
        activity={mockActivity}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );
    
    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);
    
    expect(mockOnCancel).toHaveBeenCalled();
  });
}); 