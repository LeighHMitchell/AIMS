'use client';

import { RequiredDot } from "@/components/ui/required-dot";
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { CreateLoanStatusData } from '@/types/financing-terms';
import { DatePicker } from '@/components/ui/date-picker';
import { CurrencySelector } from '@/components/forms/CurrencySelector';

// Format a number with thousand separators (no decimals while editing)
const formatNumberWithCommas = (num: number | string | null | undefined, includeDecimals: boolean = false): string => {
  if (num === '' || num === null || num === undefined || (typeof num === 'number' && isNaN(num))) return '';
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numValue as number)) return '';
  if (includeDecimals) {
    return (numValue as number).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  const [integerPart, decimalPart] = String(numValue).split('.');
  const formattedInteger = Number(integerPart).toLocaleString('en-US');
  return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
};

const parseNumberFromFormatted = (formattedStr: string): number | null => {
  if (!formattedStr || formattedStr === '') return null;
  const cleanStr = formattedStr.replace(/,/g, '');
  if (cleanStr === '' || cleanStr === '.') return null;
  const n = Number(cleanStr);
  return isNaN(n) ? null : n;
};

interface MoneyInputProps {
  id?: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  placeholder?: string;
}

function MoneyInput({ id, value, onChange, placeholder = "0" }: MoneyInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const display = isFocused
    ? (value == null || value === 0 ? '' : formatNumberWithCommas(value, false))
    : (value == null ? '' : formatNumberWithCommas(value, true));
  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={display}
      placeholder={placeholder}
      onFocus={() => setIsFocused(true)}
      onChange={(e) => {
        const v = e.target.value;
        if (v === '' || /^[\d,]*\.?\d*$/.test(v)) {
          onChange(parseNumberFromFormatted(v));
        }
      }}
      onBlur={() => setIsFocused(false)}
      className="text-left"
    />
  );
}

interface AddLoanStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateLoanStatusData) => Promise<boolean>;
  onUpdate?: (id: string, data: Partial<CreateLoanStatusData>) => Promise<boolean>;
  activityId: string;
  editingId?: string | null;
  editingValues?: Partial<CreateLoanStatusData>;
}

export function AddLoanStatusModal({
  open,
  onOpenChange,
  onSubmit,
  onUpdate,
  activityId,
  editingId,
  editingValues
}: AddLoanStatusModalProps) {
  const isEditing = !!editingId;
  
  const [formData, setFormData] = useState<Partial<CreateLoanStatusData>>({
    year: new Date().getFullYear(),
    currency: 'USD'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form data when editing values change
  React.useEffect(() => {
    if (editingValues) {
      setFormData(editingValues);
    } else {
      setFormData({
        year: new Date().getFullYear(),
        currency: 'USD'
      });
    }
  }, [editingValues]);

  const handleSubmit = async () => {
    if (!formData.year || !formData.currency) {
      return;
    }

    setIsSubmitting(true);
    
    if (isEditing && editingId && onUpdate) {
      // Update existing loan status
      const success = await onUpdate(editingId, formData);
      if (success) {
        // Reset form
        setFormData({
          year: new Date().getFullYear(),
          currency: 'USD'
        });
        onOpenChange(false);
      }
    } else {
      // Create new loan status
      const data: CreateLoanStatusData = {
        activity_id: activityId,
        year: formData.year,
        currency: formData.currency,
        value_date: formData.value_date || null,
        interest_received: formData.interest_received || null,
        principal_outstanding: formData.principal_outstanding || null,
        principal_arrears: formData.principal_arrears || null,
        interest_arrears: formData.interest_arrears || null
      };

      const success = await onSubmit(data);
      
      if (success) {
        // Reset form
        setFormData({
          year: new Date().getFullYear(),
          currency: 'USD'
        });
        onOpenChange(false);
      }
    }
    
    setIsSubmitting(false);
  };

  const handleCancel = () => {
    // Reset form
    setFormData({
      year: new Date().getFullYear(),
      currency: 'USD'
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Loan Status' : 'Add Loan Status for Year'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update annual reporting data for loan principal, arrears, and interest received.' : 'Add annual reporting data for loan principal, arrears, and interest received.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year <RequiredDot /></Label>
              <Select
                value={formData.year?.toString() || ''}
                onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) })}
              >
                <SelectTrigger id="year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 101 }, (_, i) => {
                    const year = 2000 + i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency <RequiredDot /></Label>
              <CurrencySelector
                id="currency"
                value={formData.currency || undefined}
                onValueChange={(v) => setFormData({ ...formData, currency: v || '' })}
                placeholder="Select currency"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value-date">Value Date</Label>
            <DatePicker
              id="value-date"
              value={formData.value_date || ''}
              onChange={(value) => setFormData({ ...formData, value_date: value })}
              placeholder="Select value date"
            />
          </div>

          {/* Financial Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interest-received">Interest Received</Label>
              <MoneyInput
                id="interest-received"
                value={formData.interest_received}
                onChange={(v) => setFormData({ ...formData, interest_received: v })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="principal-outstanding">Principal Outstanding</Label>
              <MoneyInput
                id="principal-outstanding"
                value={formData.principal_outstanding}
                onChange={(v) => setFormData({ ...formData, principal_outstanding: v })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="principal-arrears">Principal Arrears</Label>
              <MoneyInput
                id="principal-arrears"
                value={formData.principal_arrears}
                onChange={(v) => setFormData({ ...formData, principal_arrears: v })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interest-arrears">Interest Arrears</Label>
              <MoneyInput
                id="interest-arrears"
                value={formData.interest_arrears}
                onChange={(v) => setFormData({ ...formData, interest_arrears: v })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.year || !formData.currency}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white" />
                {isEditing ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                {isEditing ? 'Update Loan Status' : 'Add Loan Status'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
