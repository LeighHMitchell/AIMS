import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { LabelSaveIndicator } from '@/components/ui/save-indicator';

interface AutosaveInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  type?: 'text' | 'email' | 'tel' | 'url' | 'number';
  label: React.ReactNode;
  helpText?: React.ReactNode;
  required?: boolean;
  autosaveState: {
    isSaving: boolean;
    isPersistentlySaved?: boolean;
    error?: Error | null;
  };
  triggerSave?: (value: string) => void;
  saveOnBlur?: boolean;
  alwaysShowSaved?: boolean; // For fields that are always saved (like UUID)
  endAdornment?: React.ReactNode;
}

export function AutosaveInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  readOnly,
  className,
  type = 'text',
  label,
  helpText,
  required,
  autosaveState,
  triggerSave,
  saveOnBlur = true,
  alwaysShowSaved = false,
  endAdornment
}: AutosaveInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  
  // Update hasValue when value changes
  useEffect(() => {
    setHasValue(value.trim().length > 0);
  }, [value]);
  
  const handleFocus = () => {
    // Don't change focus state for read-only fields
    if (!readOnly) {
      setIsFocused(true);
    }
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (saveOnBlur && triggerSave && !readOnly) {
      triggerSave(e.target.value);
    }
    onBlur?.(e.target.value);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!readOnly) {
      onChange(e.target.value);
      if (!saveOnBlur && triggerSave) {
        triggerSave(e.target.value);
      }
    }
  };
  
  // For fields that are always saved (like UUID), always show as saved if has value
  const showSaved = alwaysShowSaved && hasValue ? true : (autosaveState.isPersistentlySaved || false);
  
  // Debug: Log the state for troubleshooting UUID field
  if (typeof window !== 'undefined' && id && id.includes('uuid')) {
    console.log(`[${id}] AutosaveInput state:`, {
      value,
      hasValue,
      alwaysShowSaved,
      showSaved,
      readOnly,
      isFocused,
      isPersistentlySaved: autosaveState.isPersistentlySaved,
    });
  }
  
  return (
    <div className="space-y-2">
      <LabelSaveIndicator
        isSaving={autosaveState.isSaving}
        isSaved={showSaved}
        hasValue={hasValue}
        isFocused={isFocused}
        className="text-gray-700"
      >
        <div className="flex items-center gap-2">
          <span>
            {label}
            {required && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" />}
          </span>
          {helpText}
        </div>
      </LabelSaveIndicator>
      <div className="relative">
        <Input
          id={id}
          type={type}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={endAdornment ? `${className || ''} pr-10`.trim() : className}
        />
        {endAdornment && (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
            {endAdornment}
          </div>
        )}
        {autosaveState.error && (
          <p className="text-xs text-red-600 mt-1">{autosaveState.error.toString()}</p>
        )}
      </div>
    </div>
  );
}

interface AutosaveTextareaProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  rows?: number;
  label: React.ReactNode;
  helpText?: React.ReactNode;
  required?: boolean;
  autosaveState: {
    isSaving: boolean;
    isPersistentlySaved?: boolean;
    error?: Error | null;
  };
  triggerSave?: (value: string) => void;
  saveOnBlur?: boolean;
}

export function AutosaveTextarea({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  className,
  rows = 4,
  label,
  helpText,
  required,
  autosaveState,
  triggerSave,
  saveOnBlur = true
}: AutosaveTextareaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(false);
  
  // Update hasValue when value changes
  useEffect(() => {
    setHasValue(value.trim().length > 0);
  }, [value]);
  
  const handleFocus = () => {
    setIsFocused(true);
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    if (saveOnBlur && triggerSave) {
      triggerSave(e.target.value);
    }
    onBlur?.(e.target.value);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    if (!saveOnBlur && triggerSave) {
      triggerSave(e.target.value);
    }
  };
  
  return (
    <div className="space-y-2">
      <LabelSaveIndicator
        isSaving={autosaveState.isSaving}
        isSaved={autosaveState.isPersistentlySaved || false}
        hasValue={hasValue}
        isFocused={isFocused}
        className="text-gray-700"
      >
        <div className="flex items-center gap-2">
          <span>
            {label}
            {required && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" />}
          </span>
          {helpText}
        </div>
      </LabelSaveIndicator>
      <div>
        <Textarea
          id={id}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
          rows={rows}
        />
        {autosaveState.error && (
          <p className="text-xs text-red-600 mt-1">{autosaveState.error.toString()}</p>
        )}
      </div>
    </div>
  );
}