'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface BudgetCurrencySelectProps {
  value?: string | null;
  onValueChange?: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

// Common currencies for budget tables
const BUDGET_CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "MMK", name: "Myanmar Kyat" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "INR", name: "Indian Rupee" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "TZS", name: "Tanzanian Shilling" },
  { code: "UGX", name: "Ugandan Shilling" },
  { code: "ETB", name: "Ethiopian Birr" },
];

export function BudgetCurrencySelect({
  value,
  onValueChange,
  placeholder = "Select currency",
  disabled = false,
  className,
  id,
}: BudgetCurrencySelectProps) {
  return (
    <Select
      value={value || undefined}
      onValueChange={(newValue) => onValueChange?.(newValue)}
      disabled={disabled}
    >
      <SelectTrigger 
        id={id}
        className={cn("h-10 text-xs", className)}
      >
        <SelectValue placeholder={placeholder}>
          {value && (
            <span className="font-medium">{value}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {BUDGET_CURRENCIES.map((currency) => (
          <SelectItem 
            key={currency.code} 
            value={currency.code}
            className="text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{currency.code}</span>
              <span className="text-muted-foreground">{currency.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}