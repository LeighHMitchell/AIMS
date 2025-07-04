import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

// Mock the activity editor page
jest.mock('@/hooks/useUser', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-id',
      name: 'Test User',
      role: 'admin',
      organizationId: 'test-org-id'
    }
  })
}));

// Mock fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Mock components
jest.mock('@/components/forms/CollaborationTypeSelect', () => ({
  CollaborationTypeSelect: ({ onValueChange, value, ...props }: any) => (
    <select 
      data-testid="collaboration-type-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      {...props}
    >
      <option value="">Select Collaboration Type</option>
      <option value="1">Donor</option>
      <option value="2">Recipient</option>
    </select>
  )
}));

jest.mock('@/components/forms/ActivityStatusSelect', () => ({
  ActivityStatusSelect: ({ onValueChange, value, ...props }: any) => (
    <select 
      data-testid="activity-status-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      {...props}
    >
      <option value="">Select Activity Status</option>
      <option value="1">Planning</option>
      <option value="2">Implementation</option>
      <option value="3">Completion</option>
    </select>
  )
}));

describe('Activity Editor Autosave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'test-activity-id', success: true })
    });
  });

  it('should trigger autosave when collaboration type changes', async () => {
    const user = userEvent.setup();
    
    // Mock console.log to capture debug messages
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Import the component after mocking
    const { default: ActivityEditor } = await import('@/app/activities/new/page');
    
    render(<ActivityEditor />);
    
    // Wait for component to initialize
    await waitFor(() => {
      expect(screen.getByTestId('collaboration-type-select')).toBeInTheDocument();
    });
    
    // Add a title first (required for autosave)
    const titleInput = screen.getByLabelText(/activity title/i);
    await user.type(titleInput, 'Test Activity');
    
    // Change collaboration type
    const collaborationSelect = screen.getByTestId('collaboration-type-select');
    await user.selectOptions(collaborationSelect, '1');
    
    // Wait for autosave to be triggered
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AIMS DEBUG] CollaborationType changed from'),
        expect.anything(),
        expect.stringContaining('to'),
        '1'
      );
    }, { timeout: 3000 });
    
    // Verify autosave was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"collaborationType":"1"')
      });
    }, { timeout: 3000 });
    
    consoleSpy.mockRestore();
  });

  it('should handle repeated changes to same field', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    const { default: ActivityEditor } = await import('@/app/activities/new/page');
    render(<ActivityEditor />);
    
    await waitFor(() => {
      expect(screen.getByTestId('activity-status-select')).toBeInTheDocument();
    });
    
    // Add title
    const titleInput = screen.getByLabelText(/activity title/i);
    await user.type(titleInput, 'Test Activity');
    
    // Change activity status multiple times
    const statusSelect = screen.getByTestId('activity-status-select');
    
    // First change
    await user.selectOptions(statusSelect, '1');
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AIMS DEBUG] ActivityStatus changed from'),
        expect.anything(),
        expect.stringContaining('to'),
        '1'
      );
    });
    
    // Second change
    await user.selectOptions(statusSelect, '2');
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AIMS DEBUG] ActivityStatus changed from'),
        '1',
        expect.stringContaining('to'),
        '2'
      );
    });
    
    // Third change
    await user.selectOptions(statusSelect, '3');
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AIMS DEBUG] ActivityStatus changed from'),
        '2',
        expect.stringContaining('to'),
        '3'
      );
    });
    
    // Verify all changes were saved
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3);
    }, { timeout: 5000 });
    
    consoleSpy.mockRestore();
  });

  it('should handle autosave failures gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock fetch to return error
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Database connection failed'
    });
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    const { default: ActivityEditor } = await import('@/app/activities/new/page');
    render(<ActivityEditor />);
    
    await waitFor(() => {
      expect(screen.getByTestId('collaboration-type-select')).toBeInTheDocument();
    });
    
    // Add title and trigger autosave
    const titleInput = screen.getByLabelText(/activity title/i);
    await user.type(titleInput, 'Test Activity');
    
    const collaborationSelect = screen.getByTestId('collaboration-type-select');
    await user.selectOptions(collaborationSelect, '1');
    
    // Wait for error to be logged
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AIMS DEBUG] Auto-save failed:'),
        expect.objectContaining({
          status: 500,
          statusText: 'Internal Server Error',
          error: 'Database connection failed'
        })
      );
    }, { timeout: 3000 });
    
    consoleSpy.mockRestore();
  });

  it('should debounce multiple rapid changes', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    const { default: ActivityEditor } = await import('@/app/activities/new/page');
    render(<ActivityEditor />);
    
    await waitFor(() => {
      expect(screen.getByTestId('activity-status-select')).toBeInTheDocument();
    });
    
    // Add title
    const titleInput = screen.getByLabelText(/activity title/i);
    await user.type(titleInput, 'Test Activity');
    
    // Make rapid changes
    const statusSelect = screen.getByTestId('activity-status-select');
    await user.selectOptions(statusSelect, '1');
    await user.selectOptions(statusSelect, '2');
    await user.selectOptions(statusSelect, '3');
    
    // Wait for debounce period
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"activityStatus":"3"')
      });
    }, { timeout: 3000 });
    
    // Should only save the final value
    expect(global.fetch).toHaveBeenCalledTimes(1);
    
    consoleSpy.mockRestore();
  });
});

describe('Autosave Hook', () => {
  it('should handle stale closures correctly', async () => {
    const { createActivityAutosave } = await import('@/components/activities/ActivityEditorFix');
    const { createStableSaveFunction, createTriggerFunction } = createActivityAutosave();
    
    let mockData = { general: { title: 'Test' } };
    let mockUser = { id: 'user1' };
    
    const setAutoSaving = jest.fn();
    const setLastSaved = jest.fn();
    const setHasUnsavedChanges = jest.fn();
    
    const saveFunction = createStableSaveFunction(
      () => mockData,
      () => mockUser,
      setAutoSaving,
      setLastSaved,
      setHasUnsavedChanges
    );
    
    const triggerFunction = createTriggerFunction(saveFunction);
    
    // Simulate data change
    mockData = { general: { title: 'Updated Test' } };
    
    // Trigger save
    triggerFunction();
    
    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 2100));
    
    // Verify save was called with updated data
    expect(global.fetch).toHaveBeenCalledWith('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"title":"Updated Test"')
    });
  });
});