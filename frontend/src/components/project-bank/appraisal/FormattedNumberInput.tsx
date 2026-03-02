"use client"

import { useState, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface FormattedNumberInputProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  /** Number of decimal places to show (default: 0) */
  decimals?: number;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Step size for up/down arrows — not used with text input, kept for API compat */
  step?: number | string;
  /** Prefix shown inside input (e.g. "$") */
  prefix?: string;
  disabled?: boolean;
}

/** Format a numeric string (no commas) into comma-separated display */
function addCommas(raw: string): string {
  if (!raw) return '';
  // Split on decimal point
  const parts = raw.split('.');
  const intPart = parts[0];
  const decPart = parts.length > 1 ? '.' + parts[1] : '';
  // Handle negative
  const isNeg = intPart.startsWith('-');
  const digits = isNeg ? intPart.slice(1) : intPart;
  // Add commas to integer part
  const withCommas = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (isNeg ? '-' : '') + withCommas + decPart;
}

/** Strip commas from display string */
function stripCommas(s: string): string {
  return s.replace(/,/g, '');
}

function formatDisplay(value: number | null | undefined, decimals: number): string {
  if (value === null || value === undefined) return '';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function FormattedNumberInput({
  value,
  onChange,
  placeholder,
  className,
  decimals = 0,
  min,
  max,
  prefix,
  disabled,
}: FormattedNumberInputProps) {
  const [display, setDisplay] = useState(() => formatDisplay(value, decimals));
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display when value changes externally and input is not focused
  const displayValue = focused ? display : formatDisplay(value, decimals);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    const cursorPos = e.target.selectionStart ?? rawInput.length;

    // Strip commas to get clean value
    const cleaned = stripCommas(rawInput);

    // Only allow valid numeric characters (digits, decimal point, negative sign)
    const validPattern = decimals > 0 ? /^-?\d*\.?\d*$/ : /^-?\d*$/;
    if (cleaned !== '' && cleaned !== '-' && cleaned !== '.' && cleaned !== '-.' && !validPattern.test(cleaned)) {
      return; // reject invalid input
    }

    // Format with commas
    const formatted = addCommas(cleaned);
    setDisplay(formatted);

    // Calculate new cursor position: count how many commas are before the cursor
    // in old vs new string to adjust
    const commasBefore = rawInput.slice(0, cursorPos).split(',').length - 1;
    const cleanCursorPos = cursorPos - commasBefore;
    // Count commas before the clean cursor position in the new formatted string
    let newCursor = 0;
    let digitsSeen = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (digitsSeen >= cleanCursorPos) break;
      newCursor = i + 1;
      if (formatted[i] !== ',') digitsSeen++;
    }

    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newCursor, newCursor);
      }
    });

    // Parse and emit numeric value
    if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') {
      onChange(null);
      return;
    }
    const parsed = decimals > 0 ? parseFloat(cleaned) : parseInt(cleaned, 10);
    if (!isNaN(parsed)) {
      let clamped = parsed;
      if (min !== undefined && clamped < min) clamped = min;
      if (max !== undefined && clamped > max) clamped = max;
      onChange(clamped);
    }
  }, [onChange, decimals, min, max]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    // Keep the formatted display (with commas) — don't strip them
    if (value !== null && value !== undefined) {
      setDisplay(formatDisplay(value, decimals));
    } else {
      setDisplay('');
    }
    setTimeout(() => e.target.select(), 0);
  }, [value, decimals]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    setDisplay(formatDisplay(value, decimals));
  }, [value, decimals]);

  return (
    <div className={cn('relative', prefix && 'flex-1')}>
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium pointer-events-none">
          {prefix}
        </span>
      )}
      <Input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn(prefix && 'pl-7', className)}
        disabled={disabled}
      />
    </div>
  );
}
