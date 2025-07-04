import { renderHook, act } from '@testing-library/react';
import { useSupabaseFieldUpdate } from '@/hooks/use-supabase-field-update';
import { useActivityDefaults } from '@/hooks/use-activity-defaults';
import { jest } from '@jest/globals';

// Mock Supabase
const mockUpdate = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockEq = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom
  }
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

describe('useSupabaseFieldUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock chain
    mockFrom.mockReturnValue({
      update: mockUpdate
    });
    
    mockUpdate.mockReturnValue({
      eq: mockEq
    });
    
    mockEq.mockReturnValue({
      select: mockSelect
    });
    
    mockSelect.mockReturnValue({
      single: mockSingle
    });
  });

  it('should update a field successfully', async () => {
    const mockData = { id: 'test-id', default_currency: 'USD' };
    mockSingle.mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHook(() =>
      useSupabaseFieldUpdate('test-activity-id', {
        tableName: 'activities'
      })
    );

    let updateResult: boolean = false;
    await act(async () => {
      updateResult = await result.current.updateField('default_currency', 'USD');
    });

    expect(updateResult).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('activities');
    expect(mockUpdate).toHaveBeenCalledWith({ default_currency: 'USD' });
    expect(mockEq).toHaveBeenCalledWith('id', 'test-activity-id');
    expect(mockSelect).toHaveBeenCalled();
    expect(mockSingle).toHaveBeenCalled();
  });

  it('should handle update errors gracefully', async () => {
    const mockError = { message: 'Database connection failed' };
    mockSingle.mockResolvedValue({ data: null, error: mockError });

    const onError = jest.fn();
    const { result } = renderHook(() =>
      useSupabaseFieldUpdate('test-activity-id', {
        tableName: 'activities',
        onError
      })
    );

    let updateResult: boolean = true;
    await act(async () => {
      updateResult = await result.current.updateField('default_currency', 'EUR');
    });

    expect(updateResult).toBe(false);
    expect(onError).toHaveBeenCalledWith('default_currency', expect.any(Error));
    expect(result.current.state.error).toContain('Database update failed');
  });

  it('should update multiple fields in batch', async () => {
    const mockData = { 
      id: 'test-id', 
      default_currency: 'USD',
      default_aid_type: 'C01'
    };
    mockSingle.mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHook(() =>
      useSupabaseFieldUpdate('test-activity-id', {
        tableName: 'activities'
      })
    );

    const updates = {
      default_currency: 'USD',
      default_aid_type: 'C01'
    };

    let updateResult: boolean = false;
    await act(async () => {
      updateResult = await result.current.updateMultipleFields(updates);
    });

    expect(updateResult).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(updates);
  });

  it('should handle missing record ID', async () => {
    const onError = jest.fn();
    const { result } = renderHook(() =>
      useSupabaseFieldUpdate(null, {
        tableName: 'activities',
        onError
      })
    );

    let updateResult: boolean = true;
    await act(async () => {
      updateResult = await result.current.updateField('default_currency', 'USD');
    });

    expect(updateResult).toBe(false);
    expect(onError).toHaveBeenCalledWith('default_currency', expect.any(Error));
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('useActivityDefaults', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    const mockData = { id: 'test-id', default_currency: 'USD' };
    mockSingle.mockResolvedValue({ data: mockData, error: null });
  });

  it('should update default aid type', async () => {
    const onFieldUpdate = jest.fn();
    const { result } = renderHook(() =>
      useActivityDefaults({
        activityId: 'test-activity-id',
        initialValues: { default_aid_type: null },
        onFieldUpdate
      })
    );

    await act(async () => {
      await result.current.updateDefaultAidType('C01');
    });

    expect(result.current.values.default_aid_type).toBe('C01');
    expect(mockUpdate).toHaveBeenCalledWith({ default_aid_type: 'C01' });
  });

  it('should handle optimistic updates', async () => {
    const { result } = renderHook(() =>
      useActivityDefaults({
        activityId: 'test-activity-id',
        initialValues: { default_currency: 'MMK' }
      })
    );

    // Before update
    expect(result.current.values.default_currency).toBe('MMK');

    // Trigger update (optimistic)
    act(() => {
      result.current.updateDefaultCurrency('USD');
    });

    // Should show optimistic value immediately
    expect(result.current.values.default_currency).toBe('USD');
  });

  it('should track unsaved changes', async () => {
    const { result } = renderHook(() =>
      useActivityDefaults({
        activityId: 'test-activity-id',
        initialValues: { default_currency: 'MMK' }
      })
    );

    // Initially no unsaved changes
    expect(result.current.hasUnsavedChanges).toBe(false);

    // After optimistic update, should have unsaved changes
    act(() => {
      result.current.updateDefaultCurrency('USD');
    });

    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('should update multiple defaults at once', async () => {
    const { result } = renderHook(() =>
      useActivityDefaults({
        activityId: 'test-activity-id',
        initialValues: {}
      })
    );

    const updates = {
      default_currency: 'USD',
      default_aid_type: 'C01',
      default_tied_status: '5'
    };

    await act(async () => {
      await result.current.updateMultipleDefaults(updates);
    });

    expect(result.current.values.default_currency).toBe('USD');
    expect(result.current.values.default_aid_type).toBe('C01');
    expect(result.current.values.default_tied_status).toBe('5');
    expect(mockUpdate).toHaveBeenCalledWith(updates);
  });

  it('should reset to initial values', () => {
    const initialValues = {
      default_currency: 'MMK',
      default_aid_type: 'B01'
    };

    const { result } = renderHook(() =>
      useActivityDefaults({
        activityId: 'test-activity-id',
        initialValues
      })
    );

    // Change values
    act(() => {
      result.current.updateDefaultCurrency('USD');
    });

    expect(result.current.values.default_currency).toBe('USD');

    // Reset
    act(() => {
      result.current.resetToInitial();
    });

    expect(result.current.values.default_currency).toBe('MMK');
    expect(result.current.values.default_aid_type).toBe('B01');
  });
});