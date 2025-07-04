import React, { useCallback } from 'react';
import { useAutosaveContext } from './AutosaveFormWrapper';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Enhanced Input with autosave
export const AutosaveInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    onValueChange?: (value: string) => void;
  }
>(({ onValueChange, onChange, ...props }, ref) => {
  const { triggerSave } = useAutosaveContext();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('[AutosaveInput] Value changed:', { field: props.name || props.id, value });
    
    onValueChange?.(value);
    onChange?.(e);
    triggerSave(); // Trigger autosave immediately
  }, [onValueChange, onChange, triggerSave, props.name, props.id]);

  return <Input {...props} ref={ref} onChange={handleChange} />;
});

AutosaveInput.displayName = 'AutosaveInput';

// Enhanced Textarea with autosave
export const AutosaveTextarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    onValueChange?: (value: string) => void;
  }
>(({ onValueChange, onChange, ...props }, ref) => {
  const { triggerSave } = useAutosaveContext();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    console.log('[AutosaveTextarea] Value changed:', { field: props.name || props.id, length: value.length });
    
    onValueChange?.(value);
    onChange?.(e);
    triggerSave(); // Trigger autosave immediately
  }, [onValueChange, onChange, triggerSave, props.name, props.id]);

  return <Textarea {...props} ref={ref} onChange={handleChange} />;
});

AutosaveTextarea.displayName = 'AutosaveTextarea';

// Enhanced Select with autosave
interface AutosaveSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  children: React.ReactNode;
  name?: string;
  id?: string;
}

export const AutosaveSelect = React.forwardRef<
  HTMLButtonElement,
  AutosaveSelectProps
>(({ onValueChange, value, name, id, ...props }, ref) => {
  const { triggerSave } = useAutosaveContext();

  const handleValueChange = useCallback((newValue: string) => {
    console.log('[AutosaveSelect] Value changed:', { 
      field: name || id, 
      from: value, 
      to: newValue 
    });
    
    onValueChange?.(newValue);
    triggerSave(); // Trigger autosave immediately
  }, [onValueChange, triggerSave, value, name, id]);

  return (
    <Select value={value} onValueChange={handleValueChange} {...props}>
      <SelectTrigger ref={ref}>
        <SelectValue placeholder={props.placeholder} />
      </SelectTrigger>
      <SelectContent>
        {props.children}
      </SelectContent>
    </Select>
  );
});

AutosaveSelect.displayName = 'AutosaveSelect';

// Enhanced Checkbox with autosave
interface AutosaveCheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  id?: string;
}

export const AutosaveCheckbox = React.forwardRef<
  HTMLButtonElement,
  AutosaveCheckboxProps
>(({ onCheckedChange, checked, name, id, ...props }, ref) => {
  const { triggerSave } = useAutosaveContext();

  const handleCheckedChange = useCallback((newChecked: boolean) => {
    console.log('[AutosaveCheckbox] Checked changed:', { 
      field: name || id, 
      from: checked, 
      to: newChecked 
    });
    
    onCheckedChange?.(newChecked);
    triggerSave(); // Trigger autosave immediately
  }, [onCheckedChange, triggerSave, checked, name, id]);

  return (
    <Checkbox 
      {...props} 
      ref={ref} 
      checked={checked} 
      onCheckedChange={handleCheckedChange} 
    />
  );
});

AutosaveCheckbox.displayName = 'AutosaveCheckbox';

// Enhanced Switch with autosave
interface AutosaveSwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  id?: string;
}

export const AutosaveSwitch = React.forwardRef<
  HTMLButtonElement,
  AutosaveSwitchProps
>(({ onCheckedChange, checked, name, id, ...props }, ref) => {
  const { triggerSave } = useAutosaveContext();

  const handleCheckedChange = useCallback((newChecked: boolean) => {
    console.log('[AutosaveSwitch] Checked changed:', { 
      field: name || id, 
      from: checked, 
      to: newChecked 
    });
    
    onCheckedChange?.(newChecked);
    triggerSave(); // Trigger autosave immediately
  }, [onCheckedChange, triggerSave, checked, name, id]);

  return (
    <Switch 
      {...props} 
      ref={ref} 
      checked={checked} 
      onCheckedChange={handleCheckedChange} 
    />
  );
});

AutosaveSwitch.displayName = 'AutosaveSwitch';

// HOC to add autosave to any existing component
export function withAutosaveTrigger<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  triggerOnProps: string[] = []
) {
  return React.forwardRef<any, P & { autosaveEnabled?: boolean }>((props: any, ref) => {
    const { autosaveEnabled = true, ...componentProps } = props;
    const { triggerSave } = useAutosaveContext();

    // Create wrapped handlers for specified props
    const wrappedProps = React.useMemo(() => {
      if (!autosaveEnabled) return componentProps;

      const wrapped = { ...componentProps };
      
      triggerOnProps.forEach(propName => {
        const originalHandler = wrapped[propName] as any;
        if (typeof originalHandler === 'function') {
          wrapped[propName] = ((...args: any[]) => {
            console.log(`[withAutosaveTrigger] ${String(propName)} called on`, Component.displayName || Component.name);
            
            const result = originalHandler(...args);
            triggerSave(); // Trigger autosave after original handler
            return result;
          }) as any;
        }
      });

      return wrapped;
    }, [componentProps, autosaveEnabled, triggerSave]);

    return <Component {...wrappedProps} ref={ref} />;
  });
}

// Specific enhanced components for existing AIMS components
export const AutosaveAidTypeSelect = withAutosaveTrigger(
  React.lazy(() => import('./AidTypeSelect').then(m => ({ default: m.AidTypeSelect }))),
  ['onValueChange']
);

export const AutosaveDefaultFinanceTypeSelect = withAutosaveTrigger(
  React.lazy(() => import('./DefaultFinanceTypeSelect').then(m => ({ default: m.DefaultFinanceTypeSelect }))),
  ['onValueChange']
);

export const AutosaveFlowTypeSelect = withAutosaveTrigger(
  React.lazy(() => import('./FlowTypeSelect').then(m => ({ default: m.FlowTypeSelect }))),
  ['onValueChange']
);

export const AutosaveCurrencySelector = withAutosaveTrigger(
  React.lazy(() => import('./CurrencySelector').then(m => ({ default: m.CurrencySelector }))),
  ['onValueChange']
);

export const AutosaveTiedStatusSelect = withAutosaveTrigger(
  React.lazy(() => import('./TiedStatusSelect').then(m => ({ default: m.TiedStatusSelect }))),
  ['onValueChange']
);

// Date picker with autosave
export function AutosaveDatePicker({
  value,
  onChange,
  name,
  id,
  ...props
}: {
  value?: string;
  onChange?: (date: string) => void;
  name?: string;
  id?: string;
  [key: string]: any;
}) {
  const { triggerSave } = useAutosaveContext();

  const handleDateChange = useCallback((date: string) => {
    console.log('[AutosaveDatePicker] Date changed:', { 
      field: name || id, 
      value: date 
    });
    
    onChange?.(date);
    triggerSave(); // Trigger autosave immediately
  }, [onChange, triggerSave, name, id]);

  return (
    <AutosaveInput
      type="date"
      value={value}
      onValueChange={handleDateChange}
      name={name}
      id={id}
      {...props}
    />
  );
}

// Multi-select with autosave
export function AutosaveMultiSelect({
  value = [],
  onChange,
  options,
  name,
  id,
  placeholder = "Select options...",
  ...props
}: {
  value?: string[];
  onChange?: (values: string[]) => void;
  options: { value: string; label: string }[];
  name?: string;
  id?: string;
  placeholder?: string;
  [key: string]: any;
}) {
  const { triggerSave } = useAutosaveContext();

  const handleSelectionChange = useCallback((selectedValues: string[]) => {
    console.log('[AutosaveMultiSelect] Selection changed:', { 
      field: name || id, 
      values: selectedValues 
    });
    
    onChange?.(selectedValues);
    triggerSave(); // Trigger autosave immediately
  }, [onChange, triggerSave, name, id]);

  // Implementation would depend on your multi-select component
  // This is a placeholder structure
  return (
    <div className="autosave-multi-select" {...props}>
      {/* Your multi-select implementation here */}
      {/* Make sure to call handleSelectionChange when selection changes */}
    </div>
  );
}