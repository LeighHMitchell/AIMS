'use client';

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

// Common currencies for loan status
const CURRENCIES = [
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
              <Label htmlFor="year">Year *</Label>
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
              <Label htmlFor="currency">Currency *</Label>
              <Select
                value={formData.currency || ''}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{currency.code}</span>
                        <span>{currency.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value-date">Value Date</Label>
            <Input
              id="value-date"
              type="date"
              value={formData.value_date || ''}
              onChange={(e) => setFormData({ ...formData, value_date: e.target.value })}
            />
          </div>

          {/* Financial Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interest-received">Interest Received</Label>
              <Input
                id="interest-received"
                type="number"
                step="0.01"
                value={formData.interest_received || ''}
                onChange={(e) => setFormData({ ...formData, interest_received: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="principal-outstanding">Principal Outstanding</Label>
              <Input
                id="principal-outstanding"
                type="number"
                step="0.01"
                value={formData.principal_outstanding || ''}
                onChange={(e) => setFormData({ ...formData, principal_outstanding: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="principal-arrears">Principal Arrears</Label>
              <Input
                id="principal-arrears"
                type="number"
                step="0.01"
                value={formData.principal_arrears || ''}
                onChange={(e) => setFormData({ ...formData, principal_arrears: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="interest-arrears">Interest Arrears</Label>
              <Input
                id="interest-arrears"
                type="number"
                step="0.01"
                value={formData.interest_arrears || ''}
                onChange={(e) => setFormData({ ...formData, interest_arrears: parseFloat(e.target.value) })}
                placeholder="0.00"
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
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
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
