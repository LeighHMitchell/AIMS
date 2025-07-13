'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO, isValid, addMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, differenceInMonths } from 'date-fns';
import { Trash2, Copy, Loader2, Plus, CalendarIcon, Download, Filter, DollarSign, Users, Edit, Save, X, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllCurrenciesWithPinned, type Currency } from '@/data/currencies';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { FinancialSummaryCards } from '@/components/FinancialSummaryCards';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/useUser';
import { generateBudgetPeriods } from './ActivityBudgetsTab';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { OrganizationCombobox } from '@/components/ui/organization-combobox';

// Types
interface PlannedDisbursement {
  id?: string;
  activity_id: string;
  amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  provider_org_id?: string;
  provider_org_name?: string;
  receiver_org_id?: string;
  receiver_org_name?: string;
  status?: 'original' | 'revised';
  value_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  isSaving?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  usdAmount?: number;
}

interface PlannedDisbursementsTabProps {
  activityId: string;
  startDate: string;
  endDate: string;
  defaultCurrency?: string;
  readOnly?: boolean;
}

interface Organization {
  id: string;
  name: string;
  code?: string;
  acronym?: string;
  type?: string;
  country?: string;
  iati_org_id?: string;
}

// Hero Card Component
interface HeroCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon?: React.ReactNode;
}

function HeroCard({ title, value, subtitle, icon }: HeroCardProps) {
  return (
    <div className="p-4 border rounded-xl bg-white shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
    </div>
  );
}

export default function PlannedDisbursementsTab({ 
  activityId, 
  startDate, 
  endDate, 
  defaultCurrency = 'USD',
  readOnly = false 
}: PlannedDisbursementsTabProps) {
  const [disbursements, setDisbursements] = useState<PlannedDisbursement[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const { user, isLoading: userLoading } = useUser();
  const isReadOnly = readOnly;

  // Add state for modal
  const [showModal, setShowModal] = useState(false);
  const [modalDisbursement, setModalDisbursement] = useState<PlannedDisbursement | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isCalculatingUSD, setIsCalculatingUSD] = useState(false);

  // Handler to open modal for add/edit
  const openModal = (disbursement?: PlannedDisbursement) => {
    const newDisbursement = disbursement ? { ...disbursement } : {
      activity_id: activityId,
      amount: 0,
      currency: defaultCurrency,
      period_start: startDate || format(new Date(), 'yyyy-MM-dd'),
      period_end: endDate || format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
      status: 'original' as const,
      provider_org_name: '',
      receiver_org_name: '',
      value_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      usdAmount: 0
    };
    setModalDisbursement(newDisbursement);
    setFieldErrors({});
    setIsFormDirty(false);
    setShowModal(true);
  };

  const closeModal = () => {
    if (isFormDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        setShowModal(false);
        setModalDisbursement(null);
        setFieldErrors({});
        setIsFormDirty(false);
      }
    } else {
      setShowModal(false);
      setModalDisbursement(null);
      setFieldErrors({});
      setIsFormDirty(false);
    }
  };

  // Real-time field validation
  const validateField = (field: string, value: any) => {
    const errors = { ...fieldErrors };
    
    switch (field) {
      case 'amount':
        if (!value || value <= 0) {
          errors.amount = 'Amount must be greater than 0';
        } else {
          delete errors.amount;
        }
        break;
      case 'period_start':
        if (!value) {
          errors.period_start = 'Start date is required';
        } else if (modalDisbursement?.period_end && value >= modalDisbursement.period_end) {
          errors.period_start = 'Start date must be before end date';
        } else {
          delete errors.period_start;
        }
        break;
      case 'period_end':
        if (!value) {
          errors.period_end = 'End date is required';
        } else if (modalDisbursement?.period_start && value <= modalDisbursement.period_start) {
          errors.period_end = 'End date must be after start date';
        } else {
          delete errors.period_end;
        }
        break;
      case 'currency':
        if (!value) {
          errors.currency = 'Currency is required';
        } else {
          delete errors.currency;
        }
        break;
      case 'value_date':
        if (!value) {
          errors.value_date = 'Value date is required';
        } else {
          delete errors.value_date;
        }
        break;
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Enhanced form validation
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!modalDisbursement?.amount || modalDisbursement.amount <= 0) {
      errors.amount = 'Please enter a valid amount';
    }
    
    if (!modalDisbursement?.period_start) {
      errors.period_start = 'Start date is required';
    }
    
    if (!modalDisbursement?.period_end) {
      errors.period_end = 'End date is required';
    }
    
    if (modalDisbursement?.period_start && modalDisbursement?.period_end) {
      if (modalDisbursement.period_start >= modalDisbursement.period_end) {
        errors.period_end = 'End date must be after start date';
      }
    }
    
    // Check for overlapping periods
    const overlapping = disbursements.some((disbursement: PlannedDisbursement) => 
      disbursement.id !== modalDisbursement?.id &&
      modalDisbursement?.period_end && modalDisbursement?.period_start &&
      disbursement.period_start < modalDisbursement.period_end &&
      disbursement.period_end > modalDisbursement.period_start
    );
    
    if (overlapping) {
      errors.period = 'This period overlaps with an existing disbursement';
    }
    
    return errors;
  };

  // Auto-calculate USD value
  useEffect(() => {
    const calculateUSD = async () => {
      if (modalDisbursement?.amount && modalDisbursement?.currency && modalDisbursement?.value_date) {
        setIsCalculatingUSD(true);
        try {
          if (modalDisbursement.currency === 'USD') {
            setModalDisbursement(prev => prev ? { ...prev, usdAmount: modalDisbursement.amount } : null);
          } else {
            const result = await fixedCurrencyConverter.convertToUSD(
              modalDisbursement.amount,
              modalDisbursement.currency,
              new Date(modalDisbursement.value_date)
            );
            setModalDisbursement(prev => prev ? { ...prev, usdAmount: result.usd_amount || 0 } : null);
          }
        } catch (err) {
          console.error('Currency conversion error:', err);
          toast.error('Failed to convert currency. Please check your values.');
        } finally {
          setIsCalculatingUSD(false);
        }
      }
    };
    
    calculateUSD();
  }, [modalDisbursement?.amount, modalDisbursement?.currency, modalDisbursement?.value_date]);

  // Update form field with validation and dirty tracking
  const updateFormField = (field: string, value: any) => {
    setModalDisbursement(prev => prev ? { ...prev, [field]: value } : null);
    setIsFormDirty(true);
    validateField(field, value);
  };

  // Focus management
  useEffect(() => {
    if (showModal) {
      const firstInput = document.querySelector('#period-start') as HTMLInputElement;
      firstInput?.focus();
    }
  }, [showModal]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showModal) {
        if (e.key === 'Escape') {
          closeModal();
        }
        if (e.key === 'Enter' && e.ctrlKey) {
          handleModalSave();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showModal, isFormDirty]);

  // Get all currencies
  const currencies = useMemo(() => getAllCurrenciesWithPinned(), []);

  // Add granularity state and handler
  const [granularity, setGranularity] = useState<'monthly' | 'quarterly' | 'annual'>('quarterly');
  const granularityOrder = ['monthly', 'quarterly', 'annual'];

  // Generate periods based on granularity
  const generatedPeriods = useMemo(() => {
    if (!startDate || !endDate) return [];
    return generateBudgetPeriods(startDate, endDate, granularity);
  }, [startDate, endDate, granularity]);

  // Add handler for granularity change
  const handleGranularityChange = (newGranularity: 'monthly' | 'quarterly' | 'annual') => {
    if (!confirm('Changing granularity will regenerate the planned disbursement table. Any unsaved changes may be lost. Continue?')) return;
    setGranularity(newGranularity);
    // Regenerate disbursements based on new granularity
    const newPeriods = generateBudgetPeriods(startDate, endDate, newGranularity);
    const newDisbursements = newPeriods.map(period => ({
      activity_id: activityId,
      amount: 0,
      currency: defaultCurrency,
      period_start: period.start,
      period_end: period.end,
      status: 'original' as const,
      provider_org_name: '',
      receiver_org_name: '',
      value_date: period.start,
      notes: '',
      usdAmount: 0
    }));
    setDisbursements(newDisbursements);
  };

  // Add custom period handler
  const addCustomPeriod = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const lastDisbursement = disbursements[disbursements.length - 1];
    const start = lastDisbursement ? format(addMonths(parseISO(lastDisbursement.period_end), 1), 'yyyy-MM-dd') : today;
    const newDisbursement: PlannedDisbursement = {
      activity_id: activityId,
      amount: 0,
      currency: defaultCurrency,
      period_start: start,
      period_end: format(addMonths(parseISO(start), 3), 'yyyy-MM-dd'),
      status: 'original' as const,
      provider_org_name: '',
      receiver_org_name: '',
      value_date: today,
      notes: '',
      usdAmount: 0
    };
    setDisbursements(prev => [...prev, newDisbursement]);
  };

  // Fetch organizations for autocomplete
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, code, acronym, type')
          .order('name');

        if (error) throw error;

        setOrganizations(data || []);
      } catch (err) {
        console.error('Error fetching organizations:', err);
      }
    };

    fetchOrganizations();
  }, []);

  // Fetch disbursements for this activity
  useEffect(() => {
    const fetchDisbursements = async () => {
      if (!activityId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('planned_disbursements')
          .select('*')
          .eq('activity_id', activityId)
          .order('period_start', { ascending: true });

        if (error) throw error;

        // If no disbursements exist, generate default periods
        if (!data || data.length === 0) {
          const defaultPeriods = generateBudgetPeriods(startDate, endDate, granularity);
          const generatedDisbursements = defaultPeriods.map(period => ({
            activity_id: activityId,
            amount: 0,
            currency: defaultCurrency,
            period_start: period.start,
            period_end: period.end,
            status: 'original' as const,
            provider_org_name: '',
            receiver_org_name: '',
            value_date: period.start,
            notes: '',
            usdAmount: 0
          }));
          setDisbursements(generatedDisbursements);
        } else {
          // Convert to USD and add to disbursements
          const disbursementsWithUSD = await Promise.all(
            data.map(async (disbursement: any) => {
              let usdAmount = 0;
              if (disbursement.amount && disbursement.currency && disbursement.currency !== 'USD') {
                try {
                  const conversionDate = disbursement.value_date ? new Date(disbursement.value_date) : new Date();
                  const result = await fixedCurrencyConverter.convertToUSD(
                    disbursement.amount,
                    disbursement.currency,
                    conversionDate
                  );
                  usdAmount = result.usd_amount || 0;
                } catch (err) {
                  console.error('Currency conversion error:', err);
                }
              } else if (disbursement.currency === 'USD') {
                usdAmount = disbursement.amount;
              }
              return { ...disbursement, usdAmount };
            })
          );
          setDisbursements(disbursementsWithUSD);
        }
      } catch (err) {
        console.error('Error fetching planned disbursements:', err);
        setError('Failed to load planned disbursements');
      } finally {
        setLoading(false);
      }
    };

    fetchDisbursements();
  }, [activityId]);

  // Filter disbursements
  const filteredDisbursements = useMemo(() => {
    return disbursements.filter(d => {
      if (filters.status !== 'all' && d.status !== filters.status) return false;
      if (filters.dateFrom && d.period_start < filters.dateFrom) return false;
      if (filters.dateTo && d.period_end > filters.dateTo) return false;
      return true;
    });
  }, [disbursements, filters]);

  // Calculate total planned disbursements
  const totalPlanned = useMemo(() => {
    return filteredDisbursements.reduce((sum, d) => sum + Number(d.amount), 0);
  }, [filteredDisbursements]);

  // Calculate total USD
  const totalUSD = useMemo(() => {
    return filteredDisbursements.reduce((sum, d) => sum + (d.usdAmount || 0), 0);
  }, [filteredDisbursements]);

  // Calculate hero card statistics
  const heroStats = useMemo(() => {
    const sortedDisbursements = [...filteredDisbursements].sort((a, b) => 
      parseISO(a.period_start).getTime() - parseISO(b.period_start).getTime()
    );

    // Time coverage
    const firstDisbursement = sortedDisbursements[0];
    const lastDisbursement = sortedDisbursements[sortedDisbursements.length - 1];
    const timeCoverage = firstDisbursement && lastDisbursement
      ? `${format(parseISO(firstDisbursement.period_start), 'MMM yyyy')} – ${format(parseISO(lastDisbursement.period_end), 'MMM yyyy')}`
      : 'No periods';

    // Status breakdown
    const originalCount = filteredDisbursements.filter(d => d.status === 'original').length;
    const revisedCount = filteredDisbursements.filter(d => d.status === 'revised').length;
    const statusText = [];
    if (originalCount > 0) statusText.push(`${originalCount} Original`);
    if (revisedCount > 0) statusText.push(`${revisedCount} Revised`);

    // Organizations involved
    const providerOrgs = Array.from(new Set(filteredDisbursements.map(d => d.provider_org_name).filter(Boolean)));
    const receiverOrgs = Array.from(new Set(filteredDisbursements.map(d => d.receiver_org_name).filter(Boolean)));

    return {
      totalPlanned: totalPlanned.toLocaleString(),
      totalUSD: totalUSD.toLocaleString(),
      timeCoverage,
      statusText: statusText.join(' • ') || 'No disbursements',
      providerCount: providerOrgs.length,
      receiverCount: receiverOrgs.length,
      mainCurrency: filteredDisbursements[0]?.currency || defaultCurrency
    };
  }, [filteredDisbursements, totalPlanned, totalUSD, defaultCurrency]);

  // Calculate chart data
  const chartData = useMemo(() => {
    const sortedDisbursements = [...filteredDisbursements].sort((a, b) => 
      parseISO(a.period_start).getTime() - parseISO(b.period_start).getTime()
    );

    // Group by quarter
    const quarterlyData = sortedDisbursements.map(d => ({
      period: format(parseISO(d.period_start), 'MMM yyyy'),
      amount: Number(d.amount),
      usdAmount: d.usdAmount || 0
    }));

    // Calculate cumulative
    let cumulative = 0;
    let cumulativeUSD = 0;
    const cumulativeData = quarterlyData.map(item => {
      cumulative += item.amount;
      cumulativeUSD += item.usdAmount;
      return {
        period: item.period,
        amount: item.amount,
        usdAmount: item.usdAmount,
        cumulative,
        cumulativeUSD
      };
    });

    return cumulativeData;
  }, [filteredDisbursements]);

  // Save disbursement
  const saveDisbursement = async (disbursement: PlannedDisbursement) => {
    if (isReadOnly) {
      throw new Error('Cannot save in read-only mode.');
    }

    setSavingId(disbursement.id || 'new');
    try {
      // Validation
      if (!disbursement.amount || disbursement.amount <= 0) {
        throw new Error('Please enter a valid amount');
      }
      if (!disbursement.period_start || !disbursement.period_end) {
        throw new Error('Please enter valid period dates');
      }

      // Ensure valid ISO date strings
      const periodStart = new Date(disbursement.period_start).toISOString().slice(0, 10);
      const periodEnd = new Date(disbursement.period_end).toISOString().slice(0, 10);

      // Check for duplicate period (excluding current item)
      const duplicate = disbursements.some(d =>
        d.id !== disbursement.id &&
        d.period_start === periodStart &&
        d.period_end === periodEnd
      );
      if (duplicate) {
        throw new Error('Duplicate period for this activity');
      }

      // Convert to USD
      let usdAmount = 0;
      if (disbursement.amount && disbursement.currency && disbursement.currency !== 'USD') {
        try {
          const conversionDate = disbursement.value_date ? new Date(disbursement.value_date) : new Date();
          const result = await fixedCurrencyConverter.convertToUSD(
            disbursement.amount,
            disbursement.currency,
            conversionDate
          );
          usdAmount = result.usd_amount || 0;
        } catch (err) {
          console.error('Currency conversion error:', err);
        }
      } else if (disbursement.currency === 'USD') {
        usdAmount = disbursement.amount;
      }

      const disbursementData = {
        activity_id: activityId,
        amount: disbursement.amount,
        currency: disbursement.currency,
        period_start: periodStart,
        period_end: periodEnd,
        provider_org_id: disbursement.provider_org_id || null,
        provider_org_name: disbursement.provider_org_name || null,
        receiver_org_id: disbursement.receiver_org_id || null,
        receiver_org_name: disbursement.receiver_org_name || null,
        status: disbursement.status || 'original',
        value_date: disbursement.value_date && disbursement.value_date.trim() !== '' ? disbursement.value_date : null,
        notes: disbursement.notes || null,
        ...(user?.id && { created_by: user.id, updated_by: user.id }),
      };

      if (disbursement.id && disbursement.id !== 'new') {
        // Update existing
        const updateData = {
          ...disbursementData,
          created_by: undefined,
          ...(user?.id && { updated_by: user.id }),
        };
        
        const response = await fetch('/api/planned-disbursements', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: disbursement.id, ...updateData }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update planned disbursement');
        }

        const { data } = await response.json();
        setDisbursements(prev => prev.map(d => 
          d.id === disbursement.id ? { ...data, usdAmount } : d
        ));
      } else {
        // Insert new
        const response = await fetch('/api/planned-disbursements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(disbursementData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create planned disbursement');
        }

        const { data } = await response.json();
        setDisbursements(prev => [...prev.filter(d => d.id !== undefined), { ...data, usdAmount }]);
      }

      setSavingId(null);
    } catch (err: any) {
      // Update the disbursement with error
      setDisbursements(prev => prev.map(d => 
        d.id === disbursement.id
          ? { ...d, hasError: true, errorMessage: err.message }
          : d
      ));
      throw err;
    } finally {
      setSavingId(null);
    }
  };

  // Delete disbursement
  const handleDelete = async (id: string) => {
    if (isReadOnly) return;

    if (!confirm('Are you sure you want to delete this planned disbursement?')) return;

    setDeleteLoading(id);
    try {
      const response = await fetch(`/api/planned-disbursements?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete planned disbursement');
      }

      setDisbursements(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
      console.error('Error deleting planned disbursement:', err);
      setError(err.message || 'Failed to delete planned disbursement');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Duplicate disbursement
  const handleDuplicate = (disbursement: PlannedDisbursement) => {
    if (isReadOnly) return;

    const newDisbursement: PlannedDisbursement = {
      ...disbursement,
      id: undefined,
      period_start: format(addMonths(parseISO(disbursement.period_start), 3), 'yyyy-MM-dd'),
      period_end: format(addMonths(parseISO(disbursement.period_end), 3), 'yyyy-MM-dd'),
      usdAmount: 0
    };

    setDisbursements(prev => [newDisbursement, ...prev]);
  };

  // Export to CSV
  const handleExport = () => {
    const dataToExport = filteredDisbursements.map(d => ({
      amount: d.amount,
      currency: d.currency,
      usd_amount: d.usdAmount || 0,
      period_start: d.period_start,
      period_end: d.period_end,
      provider_org: d.provider_org_name || '',
      receiver_org: d.receiver_org_name || '',
      status: d.status || 'original',
      value_date: d.value_date || '',
      notes: d.notes || ''
    }));

    const csv = [
      Object.keys(dataToExport[0] || {}).join(","),
      ...dataToExport.map(row => Object.values(row).map(v => `"${v}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planned-disbursements-${activityId}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getOrganizationDisplayName = (org: Organization | null) => {
    if (!org) return 'Unknown';
    if (org.name && org.acronym && org.name !== org.acronym) {
      return `${org.name} (${org.acronym})`;
    }
    return org.name || 'Unknown';
  };

  // Enhanced modal save handler
  const handleModalSave = async () => {
    if (isReadOnly || !modalDisbursement) return;

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fix the validation errors');
      return;
    }

    setSavingId(modalDisbursement.id || 'new');
    try {
      // Ensure valid ISO date strings
      const periodStart = new Date(modalDisbursement.period_start).toISOString().slice(0, 10);
      const periodEnd = new Date(modalDisbursement.period_end).toISOString().slice(0, 10);

      const disbursementData = {
        activity_id: activityId,
        amount: modalDisbursement.amount,
        currency: modalDisbursement.currency,
        period_start: periodStart,
        period_end: periodEnd,
        provider_org_id: modalDisbursement.provider_org_id || null,
        provider_org_name: modalDisbursement.provider_org_name || null,
        receiver_org_id: modalDisbursement.receiver_org_id || null,
        receiver_org_name: modalDisbursement.receiver_org_name || null,
        status: modalDisbursement.status || 'original',
        value_date: modalDisbursement.value_date && modalDisbursement.value_date.trim() !== '' ? modalDisbursement.value_date : null,
        notes: modalDisbursement.notes || null,
        usd_amount: modalDisbursement.usdAmount || 0,
        ...(user?.id && { created_by: user.id, updated_by: user.id }),
      };

      if (modalDisbursement.id && modalDisbursement.id !== 'new') {
        // Update existing
        const updateData = {
          ...disbursementData,
          created_by: undefined,
          ...(user?.id && { updated_by: user.id }),
        };
        
        const response = await fetch('/api/planned-disbursements', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: modalDisbursement.id, ...updateData }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update planned disbursement');
        }

        const { data } = await response.json();
        setDisbursements(prev => prev.map((disbursement: PlannedDisbursement) => 
          disbursement.id === modalDisbursement.id ? { ...data, usdAmount: modalDisbursement.usdAmount || 0 } : disbursement
        ));
        toast.success('Planned disbursement updated successfully');
      } else {
        // Insert new
        const response = await fetch('/api/planned-disbursements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(disbursementData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create planned disbursement');
        }

        const { data } = await response.json();
        setDisbursements(prev => [...prev.filter(d => d.id !== undefined), { ...data, usdAmount: modalDisbursement.usdAmount || 0 }]);
        toast.success('Planned disbursement added successfully');
      }

      closeModal();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save planned disbursement');
      console.error('Error saving planned disbursement:', err);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Financial Summary Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 border rounded-xl bg-white shadow-sm">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chart Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Show message if activity hasn't been saved yet
  if (!activityId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-2">Please save the activity first before adding planned disbursements.</p>
        <p className="text-sm text-gray-400">Planned disbursements can only be added to saved activities.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Financial Summary Cards - Unified component */}
      {activityId && (
        <FinancialSummaryCards activityId={activityId} className="mb-6" />
      )}

      {/* Planned Disbursements Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Planned Disbursements</CardTitle>
            </div>
            <div className="flex gap-2">
              {!isReadOnly && (
                <Button onClick={() => openModal()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Planned Disbursement
                </Button>
              )}
              {disbursements.length > 0 && !loading && (
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Granularity Controls */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Time Periods</h3>
            </div>
            <div className="flex space-x-1">
              <Button
                variant={granularity === 'monthly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleGranularityChange('monthly')}
                disabled={isReadOnly}
              >
                Monthly
              </Button>
              <Button
                variant={granularity === 'quarterly' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleGranularityChange('quarterly')}
                disabled={isReadOnly}
              >
                Quarterly
              </Button>
              <Button
                variant={granularity === 'annual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleGranularityChange('annual')}
                disabled={isReadOnly}
              >
                Annual
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={addCustomPeriod}
                disabled={isReadOnly}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Custom
              </Button>
            </div>
          </div>

          {/* Filters */}
          {disbursements.length > 0 && (
            <div className="mb-4 p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4" />
                Filters
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select value={filters.status} onValueChange={v => setFilters({...filters, status: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="original">Original</SelectItem>
                    <SelectItem value="revised">Revised</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Input
                    type="date"
                    placeholder="From date"
                    value={filters.dateFrom}
                    onChange={e => setFilters({...filters, dateFrom: e.target.value})}
                    className="pl-8"
                    aria-label="Filter from date"
                  />
                  <label className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">From</label>
                </div>
                <div className="relative">
                  <Input
                    type="date"
                    placeholder="To date"
                    value={filters.dateTo}
                    onChange={e => setFilters({...filters, dateTo: e.target.value})}
                    className="pl-8"
                    aria-label="Filter to date"
                  />
                  <label className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">To</label>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          {disbursements.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No planned disbursements</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first planned disbursement.
              </p>
              {!isReadOnly && (
                <Button onClick={() => openModal()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add First Planned Disbursement
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Provider → Receiver</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>USD Value</TableHead>
                      <TableHead>Value Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDisbursements.map((disbursement: PlannedDisbursement) => {
                      
                      return (
                        <TableRow 
                          key={disbursement.id || 'new'}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            disbursement.hasError && "border-red-200 bg-red-50"
                          )}
                        >
                          {/* Period */}
                          <TableCell>
                            <div className="font-medium">
                                {format(parseISO(disbursement.period_start), 'MMM yyyy')} - {format(parseISO(disbursement.period_end), 'MMM yyyy')}
                              </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <Badge variant={disbursement.status === 'revised' ? 'default' : 'secondary'}>
                                {disbursement.status || 'Original'}
                              </Badge>
                          </TableCell>

                          {/* Provider → Receiver */}
                          <TableCell>
                            <div className="text-sm">
                              {disbursement.provider_org_name || '-'} → {disbursement.receiver_org_name || '-'}
                            </div>
                          </TableCell>

                          {/* Amount (merged with currency) */}
                          <TableCell>
                            <div className="font-medium">
                              {disbursement.amount > 0 
                                ? `${disbursement.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${disbursement.currency}`
                                : '-'
                              }
                            </div>
                          </TableCell>

                          {/* USD Value */}
                          <TableCell>
                            <div className="font-medium">
                              {disbursement.usdAmount ? `$${disbursement.usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                            </div>
                          </TableCell>

                          {/* Value Date */}
                          <TableCell>
                            <div className="text-sm">
                              {disbursement.value_date ? format(parseISO(disbursement.value_date), 'MMM dd, yyyy') : '-'}
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openModal(disbursement)}
                                disabled={isReadOnly}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                {disbursement.amount > 0 ? 'Edit' : 'Add'}
                              </Button>
                                <TooltipProvider>
                                  <UITooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDuplicate(disbursement)}
                                        disabled={isReadOnly}
                                        aria-label="Duplicate planned disbursement"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Duplicate</TooltipContent>
                                  </UITooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <UITooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(disbursement.id || '')}
                                        className="text-red-600 hover:text-red-700"
                                        disabled={isReadOnly || deleteLoading === disbursement.id}
                                        aria-label="Delete planned disbursement"
                                      >
                                        {deleteLoading === disbursement.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete</TooltipContent>
                                  </UITooltip>
                                </TooltipProvider>
                              </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Error Display */}
              {filteredDisbursements.some(d => d.hasError) && (
                <div className="mt-4">
                  {filteredDisbursements.map(disbursement => 
                    disbursement.hasError && disbursement.errorMessage ? (
                      <Alert key={disbursement.id || 'new'} variant="destructive" className="mb-2">
                        <AlertDescription>{disbursement.errorMessage}</AlertDescription>
                      </Alert>
                    ) : null
                  )}
                </div>
              )}


            </>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Modal for Add/Edit Planned Disbursement */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalDisbursement?.id ? 'Edit Planned Disbursement' : 'Add Planned Disbursement'}</DialogTitle>
            <DialogDescription>
              Fill in all required fields. USD Value is auto-calculated based on the value date.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Period Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Period</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period-start">Start Date *</Label>
                  <Input
                    id="period-start"
                    type="date"
                    value={modalDisbursement?.period_start || ''}
                    onChange={(e) => updateFormField('period_start', e.target.value)}
                    className={cn("h-10", fieldErrors.period_start && "border-red-500")}
                    disabled={savingId === modalDisbursement?.id}
                  />
                  {fieldErrors.period_start && (
                    <p className="text-xs text-red-500">{fieldErrors.period_start}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period-end">End Date *</Label>
                  <Input
                    id="period-end"
                    type="date"
                    value={modalDisbursement?.period_end || ''}
                    onChange={(e) => updateFormField('period_end', e.target.value)}
                    className={cn("h-10", fieldErrors.period_end && "border-red-500")}
                    disabled={savingId === modalDisbursement?.id}
                  />
                  {fieldErrors.period_end && (
                    <p className="text-xs text-red-500">{fieldErrors.period_end}</p>
                  )}
                </div>
              </div>
              {fieldErrors.period && (
                <p className="text-xs text-red-500">{fieldErrors.period}</p>
              )}
            </div>

            {/* Status Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Status</h3>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={modalDisbursement?.status || 'original'}
                  onValueChange={(value) => updateFormField('status', value)}
                  disabled={savingId === modalDisbursement?.id}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Original</SelectItem>
                    <SelectItem value="revised">Revised</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Organizations Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Organizations</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider-org">Provider Organization</Label>
                  <OrganizationCombobox
                    value={modalDisbursement?.provider_org_id || ''}
                    onValueChange={(orgId) => {
                      const org = organizations.find(o => o.id === orgId);
                      updateFormField('provider_org_id', orgId);
                      updateFormField('provider_org_name', org ? getOrganizationDisplayName(org) : '');
                    }}
                    placeholder="Search for provider organization..."
                    organizations={organizations}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receiver-org">Receiver Organization</Label>
                  <OrganizationCombobox
                    value={modalDisbursement?.receiver_org_id || ''}
                    onValueChange={(orgId) => {
                      const org = organizations.find(o => o.id === orgId);
                      updateFormField('receiver_org_id', orgId);
                      updateFormField('receiver_org_name', org ? getOrganizationDisplayName(org) : '');
                    }}
                    placeholder="Search for receiver organization..."
                    organizations={organizations}
                  />
                </div>
              </div>
            </div>

            {/* Financial Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Financial Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={modalDisbursement?.amount || ''}
                    onChange={(e) => updateFormField('amount', parseFloat(e.target.value) || 0)}
                    className={cn("h-10", fieldErrors.amount && "border-red-500")}
                    step="0.01"
                    min="0"
                    disabled={savingId === modalDisbursement?.id}
                  />
                  {fieldErrors.amount && (
                    <p className="text-xs text-red-500">{fieldErrors.amount}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    value={modalDisbursement?.currency}
                    onValueChange={(value) => updateFormField('currency', value)}
                    disabled={savingId === modalDisbursement?.id}
                  >
                    <SelectTrigger className={cn("h-10", fieldErrors.currency && "border-red-500")}>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(currency => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.currency && (
                    <p className="text-xs text-red-500">{fieldErrors.currency}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value-date">Value Date *</Label>
                  <Input
                    id="value-date"
                    type="date"
                    value={modalDisbursement?.value_date || ''}
                    onChange={(e) => updateFormField('value_date', e.target.value)}
                    className={cn("h-10", fieldErrors.value_date && "border-red-500")}
                    disabled={savingId === modalDisbursement?.id}
                  />
                  {fieldErrors.value_date && (
                    <p className="text-xs text-red-500">{fieldErrors.value_date}</p>
                  )}
                </div>
              </div>
              
              {/* USD Value Display */}
              <div className="space-y-2">
                <Label htmlFor="usd-value">USD Value (Auto-calculated)</Label>
                <div className="relative">
                  <Input
                    id="usd-value"
                    type="text"
                    value={modalDisbursement?.usdAmount ? `$${modalDisbursement.usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                    className="h-10 pr-8 bg-gray-50"
                    disabled
                  />
                  {isCalculatingUSD && (
                    <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Additional Information</h3>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={modalDisbursement?.notes || ''}
                  onChange={(e) => updateFormField('notes', e.target.value)}
                  className="min-h-[80px]"
                  placeholder="Add any additional notes about this planned disbursement..."
                  disabled={savingId === modalDisbursement?.id}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button 
              onClick={handleModalSave}
              disabled={savingId === modalDisbursement?.id || Object.keys(fieldErrors).length > 0}
            >
              {savingId === modalDisbursement?.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Disbursement'
              )}
            </Button>
            <Button variant="outline" onClick={closeModal} disabled={savingId === modalDisbursement?.id}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Planned Disbursements by Period</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="usdAmount" fill="#222" barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cumulative Planned Disbursements</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="cumulativeUSD" stroke="#222" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
