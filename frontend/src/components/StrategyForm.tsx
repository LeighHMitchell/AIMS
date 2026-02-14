"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Loader2, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api-fetch';

// Document types for strategies
const DOCUMENT_TYPES = [
  'Bilateral Partnership Plan',
  'Regional Strategy',
  'Country Strategy',
  'Sector Strategy',
  'Thematic Strategy',
  'Annual Report',
  'Multi-year Plan',
  'Policy Document',
  'Other',
];

// Status options
const STATUS_OPTIONS = [
  { value: 'Published', label: 'Published' },
  { value: 'Active', label: 'Active' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Draft – Internal Only', label: 'Draft – Internal Only' },
  { value: 'Under Government Consultation', label: 'Under Government Consultation' },
  { value: 'Pending Publication / Approval', label: 'Pending Publication / Approval' },
];

interface Strategy {
  id?: string;
  title: string;
  document_type: string;
  status: string;
  start_date?: string;
  end_date?: string;
  start_year?: number;
  end_year?: number;
  start_month?: number;
  end_month?: number;
  thematic_pillars?: string[];
  languages?: string[];
  public_link?: string;
  notes?: string;
  government_counterparts?: string[];
  expected_publication_date?: string;
  has_file?: boolean;
  file_name?: string;
  file_url?: string;
}

interface StrategyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  userId: string;
  strategy?: Strategy | null;
  onSuccess?: () => void;
}

export function StrategyForm({
  open,
  onOpenChange,
  organizationId,
  userId,
  strategy,
  onSuccess,
}: StrategyFormProps) {
  const isEditing = !!strategy?.id;
  const [loading, setLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [status, setStatus] = useState('Draft – Internal Only');
  const [startYear, setStartYear] = useState<string>('');
  const [endYear, setEndYear] = useState<string>('');
  const [startMonth, setStartMonth] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');
  const [thematicPillars, setThematicPillars] = useState<string[]>([]);
  const [newPillar, setNewPillar] = useState('');
  const [languages, setLanguages] = useState<string[]>(['English']);
  const [publicLink, setPublicLink] = useState('');
  const [notes, setNotes] = useState('');
  const [governmentCounterparts, setGovernmentCounterparts] = useState<string[]>([]);
  const [newCounterpart, setNewCounterpart] = useState('');
  const [expectedPublicationDate, setExpectedPublicationDate] = useState<Date | undefined>();
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  // Initialize form with strategy data when editing
  useEffect(() => {
    if (strategy) {
      setTitle(strategy.title || '');
      setDocumentType(strategy.document_type || '');
      setStatus(strategy.status || 'Draft – Internal Only');
      setStartYear(strategy.start_year?.toString() || '');
      setEndYear(strategy.end_year?.toString() || '');
      setStartMonth(strategy.start_month?.toString() || '');
      setEndMonth(strategy.end_month?.toString() || '');
      setThematicPillars(strategy.thematic_pillars || []);
      setLanguages(strategy.languages || ['English']);
      setPublicLink(strategy.public_link || '');
      setNotes(strategy.notes || '');
      setGovernmentCounterparts(strategy.government_counterparts || []);
      setExpectedPublicationDate(
        strategy.expected_publication_date ? new Date(strategy.expected_publication_date) : undefined
      );
    } else {
      resetForm();
    }
  }, [strategy, open]);

  const resetForm = () => {
    setTitle('');
    setDocumentType('');
    setStatus('Draft – Internal Only');
    setStartYear('');
    setEndYear('');
    setStartMonth('');
    setEndMonth('');
    setThematicPillars([]);
    setNewPillar('');
    setLanguages(['English']);
    setPublicLink('');
    setNotes('');
    setGovernmentCounterparts([]);
    setNewCounterpart('');
    setExpectedPublicationDate(undefined);
  };

  const handleAddPillar = () => {
    if (newPillar.trim() && !thematicPillars.includes(newPillar.trim())) {
      setThematicPillars([...thematicPillars, newPillar.trim()]);
      setNewPillar('');
    }
  };

  const handleRemovePillar = (pillar: string) => {
    setThematicPillars(thematicPillars.filter(p => p !== pillar));
  };

  const handleAddCounterpart = () => {
    if (newCounterpart.trim() && !governmentCounterparts.includes(newCounterpart.trim())) {
      setGovernmentCounterparts([...governmentCounterparts, newCounterpart.trim()]);
      setNewCounterpart('');
    }
  };

  const handleRemoveCounterpart = (counterpart: string) => {
    setGovernmentCounterparts(governmentCounterparts.filter(c => c !== counterpart));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !documentType || !status) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        organizationId,
        userId,
        title: title.trim(),
        documentType,
        status,
        startYear: startYear ? parseInt(startYear) : undefined,
        endYear: endYear ? parseInt(endYear) : undefined,
        startMonth: startMonth ? parseInt(startMonth) : undefined,
        endMonth: endMonth ? parseInt(endMonth) : undefined,
        thematicPillars,
        languages,
        publicLink: publicLink.trim() || undefined,
        notes: notes.trim() || undefined,
        governmentCounterparts,
        expectedPublicationDate: expectedPublicationDate?.toISOString().split('T')[0],
        ...(isEditing && { id: strategy?.id }),
      };

      const response = await apiFetch('/api/strategies', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save strategy');
      }

      toast.success(isEditing ? 'Strategy updated successfully' : 'Strategy created successfully');
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving strategy:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save strategy');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = title.trim() && documentType && status && !loading;

  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  // Generate year options (current year - 10 to current year + 20)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 31 }, (_, i) => currentYear - 10 + i);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Strategy' : 'Add New Strategy'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the strategy details below.'
              : 'Create a new development strategy for this organization.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter strategy title..."
              required
            />
          </div>

          {/* Document Type & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Document Type <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1 align-middle" aria-hidden="true" /></Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time Period */}
          <div className="space-y-2">
            <Label>Time Period</Label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Start Year</Label>
                <Select value={startYear} onValueChange={setStartYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Start Month</Label>
                <Select value={startMonth} onValueChange={setStartMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">End Year</Label>
                <Select value={endYear} onValueChange={setEndYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">End Month</Label>
                <Select value={endMonth} onValueChange={setEndMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Thematic Pillars */}
          <div className="space-y-2">
            <Label>Thematic Pillars</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {thematicPillars.map((pillar) => (
                <Badge key={pillar} variant="secondary" className="gap-1">
                  {pillar}
                  <button
                    type="button"
                    onClick={() => handleRemovePillar(pillar)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newPillar}
                onChange={(e) => setNewPillar(e.target.value)}
                placeholder="Add a thematic pillar..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPillar();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddPillar}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Government Counterparts */}
          <div className="space-y-2">
            <Label>Government Counterparts</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {governmentCounterparts.map((counterpart) => (
                <Badge key={counterpart} variant="outline" className="gap-1">
                  {counterpart}
                  <button
                    type="button"
                    onClick={() => handleRemoveCounterpart(counterpart)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newCounterpart}
                onChange={(e) => setNewCounterpart(e.target.value)}
                placeholder="Add a government counterpart..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCounterpart();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddCounterpart}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Public Link */}
          <div className="space-y-2">
            <Label htmlFor="publicLink">Public Link</Label>
            <Input
              id="publicLink"
              type="url"
              value={publicLink}
              onChange={(e) => setPublicLink(e.target.value)}
              placeholder="https://example.com/strategy-document"
            />
          </div>

          {/* Expected Publication Date */}
          <div className="space-y-2">
            <Label>Expected Publication Date</Label>
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !expectedPublicationDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {expectedPublicationDate
                    ? format(expectedPublicationDate, 'PPP')
                    : 'Select date...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expectedPublicationDate}
                  onSelect={(date) => {
                    setExpectedPublicationDate(date);
                    setDatePopoverOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Internal Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Private notes about this strategy..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              These notes are for internal use only and will not be publicly visible.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : isEditing ? (
                'Update Strategy'
              ) : (
                'Create Strategy'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default StrategyForm;
