'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO, isValid, addMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, differenceInMonths, getQuarter, getYear } from 'date-fns';
import { Trash2, Copy, Loader2, Plus, CalendarIcon, Download, DollarSign, Users, Edit, Save, X, Check, MoreVertical, Calendar, ArrowUp, ArrowDown, AlertCircle, CheckCircle } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ButtonGroup } from '@/components/ui/button-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/hooks/useUser';
import { BUDGET_TYPES } from '@/data/budget-type';
import { OrganizationTypeSelect } from '@/components/forms/OrganizationTypeSelect';
import { Checkbox } from '@/components/ui/checkbox';

// Granularity removed - users can now create any period length they want
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
import { ActivityCombobox } from '@/components/ui/activity-combobox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronsUpDown } from 'lucide-react';

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
  onDisbursementsChange?: (disbursements: PlannedDisbursement[]) => void;
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
  readOnly = false,
  onDisbursementsChange
}: PlannedDisbursementsTabProps) {
  const [disbursements, setDisbursements] = useState<PlannedDisbursement[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const { user, isLoading: userLoading } = useUser();
  const isReadOnly = readOnly;
  const [aggregationMode, setAggregationMode] = useState<'monthly' | 'quarterly' | 'semi-annual' | 'annual'>('quarterly');

  // Add state for modal
  const [showModal, setShowModal] = useState(false);
  const [modalDisbursement, setModalDisbursement] = useState<PlannedDisbursement | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [isCalculatingUSD, setIsCalculatingUSD] = useState(false);
  const [typePopoverOpen, setTypePopoverOpen] = useState(false);
  const [currencyPopoverOpen, setCurrencyPopoverOpen] = useState(false);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Bulk selection state
  const [selectedDisbursementIds, setSelectedDisbursementIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Save status tracking
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});

  // USD conversion tracking
  const [usdValues, setUsdValues] = useState<Record<string, { 
    usd: number | null, 
    rate: number | null, 
    date: string, 
    loading: boolean, 
    error?: string 
  }>>({});

  // Sort handler
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  // Handler to open modal for add/edit
  const openModal = (disbursement?: PlannedDisbursement) => {
    const newDisbursement = disbursement ? { ...disbursement } : {
      activity_id: activityId,
      amount: 0,
      currency: defaultCurrency,
      period_start: startDate || format(new Date(), 'yyyy-MM-dd'),
      period_end: endDate || format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
      type: '1' as const,           // NEW - Default to Original
      status: 'original' as const,
      provider_org_name: '',
      provider_org_ref: '',
      provider_org_type: '',
      provider_activity_id: '',
      provider_activity_uuid: '',
      receiver_org_name: '',
      receiver_org_ref: '',
      receiver_org_type: '',
      receiver_activity_id: '',
      receiver_activity_uuid: '',
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
  // Granularity removed - users can now create any period length they want

  // Add planned disbursement period with smart period detection - opens modal with pre-populated dates
  const addPeriod = useCallback((periodType: 'month' | 'quarter' | 'half-year' | 'year') => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const lastDisbursement = disbursements[disbursements.length - 1];
    
    let periodStart: string;
    let periodEnd: string;
    
    if (lastDisbursement) {
      // Start from day AFTER last disbursement ends
      const lastEnd = parseISO(lastDisbursement.period_end);
      const nextStart = addMonths(lastEnd, 0); // This is the last end date
      const dayAfterLastEnd = new Date(nextStart);
      dayAfterLastEnd.setDate(dayAfterLastEnd.getDate() + 1); // Add 1 day
      
      periodStart = format(dayAfterLastEnd, 'yyyy-MM-dd');
      const start = parseISO(periodStart);
      
      // Calculate end date based on period type
      switch (periodType) {
        case 'month':
          // Add 1 month from start, then get end of that month
          periodEnd = format(endOfMonth(start), 'yyyy-MM-dd');
          break;
        case 'quarter':
          // Add 3 months from start, then get end of that month
          periodEnd = format(endOfMonth(addMonths(start, 2)), 'yyyy-MM-dd');
          break;
        case 'half-year':
          // Add 6 months from start, then get end of that month
          periodEnd = format(endOfMonth(addMonths(start, 5)), 'yyyy-MM-dd');
          break;
        case 'year':
          // Add 12 months from start, then get end of that month
          periodEnd = format(endOfMonth(addMonths(start, 11)), 'yyyy-MM-dd');
          break;
      }
    } else {
      // First disbursement - use activity start date or today
      periodStart = startDate || today;
      const start = parseISO(periodStart);
      
      switch (periodType) {
        case 'month':
          periodEnd = format(endOfMonth(start), 'yyyy-MM-dd');
          break;
        case 'quarter':
          periodEnd = format(endOfQuarter(start), 'yyyy-MM-dd');
          break;
        case 'half-year':
          periodEnd = format(endOfMonth(addMonths(start, 5)), 'yyyy-MM-dd');
          break;
        case 'year':
          periodEnd = format(endOfMonth(addMonths(start, 11)), 'yyyy-MM-dd');
          break;
      }
    }
    
    // Ensure end date doesn't exceed project end date
    const projectEnd = parseISO(endDate);
    if (isValid(projectEnd) && parseISO(periodEnd) > projectEnd) {
      periodEnd = endDate;
    }
    
    // Open modal with pre-populated dates
    const newDisbursement: PlannedDisbursement = {
      activity_id: activityId,
      amount: 0,
      currency: defaultCurrency,
      period_start: periodStart,
      period_end: periodEnd,
      type: '1' as const,
      status: 'original' as const,
      provider_org_name: '',
      provider_org_ref: '',
      provider_org_type: '',
      provider_activity_id: '',
      receiver_org_name: '',
      receiver_org_ref: '',
      receiver_org_type: '',
      receiver_activity_id: '',
      value_date: today,
      notes: '',
      usdAmount: 0
    };
    
    setModalDisbursement(newDisbursement);
    setFieldErrors({});
    setIsFormDirty(false);
    setShowModal(true);
  }, [disbursements, activityId, defaultCurrency, startDate, endDate]);

  // Fetch organizations for autocomplete
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, code, acronym, type, Organisation_Type_Code, Organisation_Type_Name, iati_org_id, logo, country')
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
          // Use real-time USD conversion (same logic as FinancialSummaryCards)
          const disbursementsWithUSD = await Promise.all(
            data.map(async (disbursement: any) => {
              let usdAmount = 0;
              
              if (disbursement.amount && disbursement.currency) {
                if (disbursement.currency === 'USD') {
                  usdAmount = disbursement.amount;
                } else {
                  try {
                    const conversionDate = disbursement.value_date ? new Date(disbursement.value_date) : new Date();
                    const result = await fixedCurrencyConverter.convertToUSD(
                      disbursement.amount,
                      disbursement.currency,
                      conversionDate
                    );
                    usdAmount = result.usd_amount || 0;
                    console.log(`[PlannedDisbursementsTab] ✅ Real-time conversion: ${disbursement.amount} ${disbursement.currency} → $${usdAmount} USD`);
                  } catch (err) {
                    console.error('Currency conversion error:', err);
                    usdAmount = 0;
                  }
                }
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

  // Notify parent component when disbursements change (only after initial load)
  useEffect(() => {
    // Only notify parent after initial data load is complete
    // This prevents the green tick from disappearing when switching tabs
    console.log('[PlannedDisbursementsTab] useEffect - Checking notification conditions:', {
      hasCallback: !!onDisbursementsChange,
      loading,
      disbursementsCount: disbursements.length,
      disbursementsWithIds: disbursements.filter(d => d.id).length
    });
    
    if (onDisbursementsChange && !loading) {
      // Filter out generated empty disbursements - only count actual saved disbursements with IDs
      const actualDisbursements = disbursements.filter(d => d.id);
      console.log('[PlannedDisbursementsTab] Notifying parent with disbursements:', actualDisbursements.length);
      onDisbursementsChange(actualDisbursements);
    } else {
      console.log('[PlannedDisbursementsTab] NOT notifying parent - loading:', loading);
    }
  }, [disbursements, onDisbursementsChange, loading]);

  // Convert all disbursements to USD when they change
  useEffect(() => {
    let cancelled = false;
    async function convertAll() {
      const newUsdValues: Record<string, { usd: number|null, rate: number|null, date: string, loading: boolean, error?: string }> = {};
      for (const disbursement of disbursements) {
        if (!disbursement.amount || !disbursement.currency || !disbursement.value_date) {
          newUsdValues[disbursement.id || `${disbursement.period_start}-${disbursement.period_end}`] = { 
            usd: null, 
            rate: null, 
            date: disbursement.value_date, 
            loading: false, 
            error: 'Missing data' 
          };
          continue;
        }
        newUsdValues[disbursement.id || `${disbursement.period_start}-${disbursement.period_end}`] = { 
          usd: null, 
          rate: null, 
          date: disbursement.value_date, 
          loading: true 
        };
        try {
          const result = await fixedCurrencyConverter.convertToUSD(
            disbursement.amount, 
            disbursement.currency, 
            new Date(disbursement.value_date)
          );
          if (!cancelled) {
            newUsdValues[disbursement.id || `${disbursement.period_start}-${disbursement.period_end}`] = {
              usd: result.usd_amount,
              rate: result.exchange_rate,
              date: result.conversion_date || disbursement.value_date,
              loading: false,
              error: result.success ? undefined : result.error || 'Conversion failed'
            };
          }
        } catch (err) {
          if (!cancelled) {
            newUsdValues[disbursement.id || `${disbursement.period_start}-${disbursement.period_end}`] = { 
              usd: null, 
              rate: null, 
              date: disbursement.value_date, 
              loading: false, 
              error: 'Conversion error' 
            };
          }
        }
      }
      if (!cancelled) setUsdValues(newUsdValues);
    }
    if (disbursements.length > 0) convertAll();
    return () => { cancelled = true; };
  }, [disbursements]);

  // No filtering - show all disbursements
  const filteredDisbursements = useMemo(() => {
    return disbursements;
  }, [disbursements]);

  // Sorted disbursements for table display
  const sortedFilteredDisbursements = useMemo(() => {
    if (!sortColumn) return filteredDisbursements;

    const sorted = [...filteredDisbursements].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'period':
          aValue = new Date(a.period_start).getTime();
          bValue = new Date(b.period_start).getTime();
          break;
        case 'status':
          aValue = (a.status || 'original').toLowerCase();
          bValue = (b.status || 'original').toLowerCase();
          break;
        case 'provider':
          aValue = (a.provider_org_name || '').toLowerCase();
          bValue = (b.provider_org_name || '').toLowerCase();
          break;
        case 'receiver':
          aValue = (a.receiver_org_name || '').toLowerCase();
          bValue = (b.receiver_org_name || '').toLowerCase();
          break;
        case 'amount':
          aValue = a.amount || 0;
          bValue = b.amount || 0;
          break;
        case 'usd_value':
          aValue = a.usdAmount || 0;
          bValue = b.usdAmount || 0;
          break;
        case 'value_date':
          aValue = new Date(a.value_date || '').getTime();
          bValue = new Date(b.value_date || '').getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredDisbursements, sortColumn, sortDirection]);

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

  // Calculate chart data with real-time USD conversion
  const chartData = useMemo(() => {
    const sortedDisbursements = [...filteredDisbursements].sort((a, b) => 
      parseISO(a.period_start).getTime() - parseISO(b.period_start).getTime()
    );

    // Group by period based on aggregation mode
    const periodMap = new Map<string, { amount: number, usdAmount: number }>();
    
    sortedDisbursements.forEach(disbursement => {
      const startDate = parseISO(disbursement.period_start);
      let periodLabel: string;
      
      switch (aggregationMode) {
        case 'monthly':
          periodLabel = format(startDate, 'MMM yyyy');
          break;
        case 'quarterly':
          periodLabel = `Q${getQuarter(startDate)} ${getYear(startDate)}`;
          break;
        case 'semi-annual':
          const half = getQuarter(startDate) <= 2 ? 'H1' : 'H2';
          periodLabel = `${half} ${getYear(startDate)}`;
          break;
        case 'annual':
          periodLabel = format(startDate, 'yyyy');
          break;
        default:
          periodLabel = `Q${getQuarter(startDate)} ${getYear(startDate)}`;
          break;
      }
      
      // Use real-time USD conversion (same as FinancialSummaryCards)
      // The disbursement.usdAmount is already calculated with real-time conversion
      // in the fetchDisbursements function above
      let realTimeUSD = disbursement.usdAmount || 0;
      
      const existing = periodMap.get(periodLabel) || { amount: 0, usdAmount: 0 };
      periodMap.set(periodLabel, {
        amount: existing.amount + Number(disbursement.amount),
        usdAmount: existing.usdAmount + realTimeUSD
      });
    });

    // Convert to array
    const aggregatedData = Array.from(periodMap.entries()).map(([period, values]) => ({
      period,
      amount: values.amount,
      usdAmount: values.usdAmount
    }));

    // Calculate cumulative
    let cumulative = 0;
    let cumulativeUSD = 0;
    const cumulativeData = aggregatedData.map(item => {
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
  }, [filteredDisbursements, aggregationMode]);

  // Save disbursement
  const saveDisbursement = async (disbursement: PlannedDisbursement) => {
    if (isReadOnly) {
      throw new Error('Cannot save in read-only mode.');
    }

    const statusKey = disbursement.id || 'new';
    setSavingId(statusKey);
    setSaveStatus(prev => ({ ...prev, [statusKey]: 'saving' }));
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
        usd_amount: usdAmount, // Save the USD conversion
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

      let savedId = statusKey;

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
        savedId = disbursement.id;
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
        savedId = data.id;
      }

      // Set saved status
      setSaveStatus(prev => ({ ...prev, [savedId]: 'saved' }));
      
      // Clear saved status after 3 seconds
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[savedId];
          return newStatus;
        });
      }, 3000);

      setSavingId(null);
    } catch (err: any) {
      // Update the disbursement with error
      setDisbursements(prev => prev.map(d => 
        d.id === disbursement.id
          ? { ...d, hasError: true, errorMessage: err.message }
          : d
      ));
      
      // Set error status
      setSaveStatus(prev => ({ ...prev, [statusKey]: 'error' }));
      
      // Clear error status after 5 seconds
      setTimeout(() => {
        setSaveStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[statusKey];
          return newStatus;
        });
      }, 5000);
      
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
  const handleDuplicate = async (disbursement: PlannedDisbursement) => {
    if (isReadOnly) return;

    // Detect period length
    const currentStart = parseISO(disbursement.period_start);
    const currentEnd = parseISO(disbursement.period_end);
    const periodLengthMonths = differenceInMonths(currentEnd, currentStart);

    // Start day after current period ends
    const dayAfterEnd = new Date(currentEnd);
    dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);
    const nextStart = parseISO(format(dayAfterEnd, 'yyyy-MM-dd'));

    // Calculate end date preserving period length
    const nextEnd = endOfMonth(addMonths(nextStart, Math.max(periodLengthMonths, 1) - 1));

    const newDisbursement: PlannedDisbursement = {
      ...disbursement,
      id: undefined,
      period_start: format(nextStart, 'yyyy-MM-dd'),
      period_end: format(nextEnd, 'yyyy-MM-dd'),
      usdAmount: 0
    };

    // Save to database
    try {
      // Prepare data for API - exclude frontend-only fields and use snake_case
      const { usdAmount, ...disbursementData } = newDisbursement;
      
      const response = await fetch('/api/planned-disbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...disbursementData,
          activity_id: activityId,
          usd_amount: 0 // Use snake_case for database
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to duplicate planned disbursement');
      }

      const result = await response.json();
      const createdDisbursement = result.data;
      
      // Add the USD amount to the created disbursement for display
      const disbursementWithUSD = {
        ...createdDisbursement,
        usdAmount: 0
      };
      
      setDisbursements(prev => [disbursementWithUSD, ...prev]);
      toast.success('Planned disbursement duplicated successfully');
    } catch (error) {
      console.error('Error duplicating planned disbursement:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate planned disbursement');
    }
  };

  // Check for overlapping periods
  const checkDisbursementOverlap = useCallback((disbursement: PlannedDisbursement, allDisbursements: PlannedDisbursement[]) => {
    const currentStart = parseISO(disbursement.period_start);
    const currentEnd = parseISO(disbursement.period_end);
    
    return allDisbursements.filter((other) => {
      if (other.id === disbursement.id) return false;
      
      const otherStart = parseISO(other.period_start);
      const otherEnd = parseISO(other.period_end);
      
      return (
        (currentStart >= otherStart && currentStart <= otherEnd) ||
        (currentEnd >= otherStart && currentEnd <= otherEnd) ||
        (currentStart <= otherStart && currentEnd >= otherEnd)
      );
    });
  }, []);

  const handleSelectDisbursement = useCallback((id: string, checked: boolean) => {
    const newSelected = new Set(selectedDisbursementIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedDisbursementIds(newSelected);
  }, [selectedDisbursementIds]);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      const allIds = new Set(sortedFilteredDisbursements.filter(d => d.id).map(d => d.id!));
      setSelectedDisbursementIds(allIds);
    } else {
      setSelectedDisbursementIds(new Set());
    }
  }, [sortedFilteredDisbursements]);

  const handleBulkDelete = useCallback(async () => {
    const selectedArray = Array.from(selectedDisbursementIds);
    if (selectedArray.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedArray.length} planned disbursement(s)?`)) return;
    
    setIsBulkDeleting(true);
    
    try {
      // Delete all selected disbursements
      await Promise.all(selectedArray.map(async (id) => {
        const response = await fetch(`/api/planned-disbursements?id=${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete planned disbursement');
        }
      }));
      
      // Remove deleted disbursements from state
      setDisbursements(prev => prev.filter(d => !selectedDisbursementIds.has(d.id!)));
      
      // Clear selection
      setSelectedDisbursementIds(new Set());
      
      toast.success(`Successfully deleted ${selectedArray.length} planned disbursement(s)`);
    } catch (error: any) {
      console.error('Error deleting planned disbursements:', error);
      toast.error('Failed to delete some planned disbursements');
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedDisbursementIds]);

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

  const getOrganizationAcronym = (orgId?: string, orgName?: string) => {
    if (!orgId && !orgName) return '-';
    
    // Try to find organization by ID to get acronym
    if (orgId) {
      const org = organizations.find(o => o.id === orgId);
      if (org && org.acronym) {
        return org.acronym;
      }
    }
    
    // If no acronym found but we have an orgName, extract potential acronym
    if (orgName) {
      // Check if orgName contains parentheses with potential acronym
      const match = orgName.match(/\(([A-Z]+)\)$/);
      if (match) {
        return match[1];
      }
      
      // If no parentheses, check if it's already an acronym (short and uppercase)
      if (orgName.length <= 6 && orgName === orgName.toUpperCase()) {
        return orgName;
      }
      
      // As fallback, create acronym from first letters of words
      const words = orgName.split(' ').filter(word => word.length > 0);
      if (words.length > 1) {
        return words.map(word => word.charAt(0).toUpperCase()).join('');
      }
      
      // If single word, return first 3-4 characters
      return orgName.substring(0, Math.min(4, orgName.length)).toUpperCase();
    }
    
    return '-';
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

      // Convert to USD before saving
      let usdAmount = 0;
      if (modalDisbursement.amount && modalDisbursement.currency && modalDisbursement.currency !== 'USD') {
        try {
          const conversionDate = modalDisbursement.value_date ? new Date(modalDisbursement.value_date) : new Date();
          const result = await fixedCurrencyConverter.convertToUSD(
            modalDisbursement.amount,
            modalDisbursement.currency,
            conversionDate
          );
          usdAmount = result.usd_amount || 0;
        } catch (err) {
          console.error('Currency conversion error:', err);
        }
      } else if (modalDisbursement.currency === 'USD') {
        usdAmount = modalDisbursement.amount;
      }

      const disbursementData = {
        activity_id: activityId,
        amount: modalDisbursement.amount,
        currency: modalDisbursement.currency,
        usd_amount: usdAmount, // Save the USD conversion
        period_start: periodStart,
        period_end: periodEnd,
        type: modalDisbursement.type || '1',
        provider_org_id: modalDisbursement.provider_org_id || null,
        provider_org_name: modalDisbursement.provider_org_name || null,
        provider_org_ref: modalDisbursement.provider_org_ref || null,
        provider_org_type: modalDisbursement.provider_org_type || null,
        provider_activity_id: modalDisbursement.provider_activity_id || null,
        provider_activity_uuid: modalDisbursement.provider_activity_uuid || null,  // NEW - Activity link
        receiver_org_id: modalDisbursement.receiver_org_id || null,
        receiver_org_name: modalDisbursement.receiver_org_name || null,
        receiver_org_ref: modalDisbursement.receiver_org_ref || null,
        receiver_org_type: modalDisbursement.receiver_org_type || null,
        receiver_activity_id: modalDisbursement.receiver_activity_id || null,
        receiver_activity_uuid: modalDisbursement.receiver_activity_uuid || null,  // NEW - Activity link
        status: modalDisbursement.status || 'original',
        value_date: modalDisbursement.value_date && modalDisbursement.value_date.trim() !== '' ? modalDisbursement.value_date : null,
        notes: modalDisbursement.notes || null,
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
          disbursement.id === modalDisbursement.id ? { ...data, usdAmount } : disbursement
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
        setDisbursements(prev => [...prev.filter(d => d.id !== undefined), { ...data, usdAmount }]);
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
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addPeriod('month')}
                disabled={isReadOnly}
              >
                + Monthly
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addPeriod('quarter')}
                disabled={isReadOnly}
              >
                + Quarterly
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addPeriod('half-year')}
                disabled={isReadOnly}
              >
                + Semi-Annual
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addPeriod('year')}
                disabled={isReadOnly}
              >
                + Annual
              </Button>
            </div>
            <div className="flex gap-2">
              {selectedDisbursementIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                >
                  {isBulkDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedDisbursementIds.size})
                    </>
                  )}
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

          {/* Table */}
          {disbursements.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No planned disbursements</h3>
              <p className="text-muted-foreground mb-4">
                Use the buttons above to add your first planned disbursement.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table aria-label="Planned disbursements table">
                  <TableHeader className="bg-muted/50 border-b border-border/70">
                    <TableRow>
                      <TableHead className="w-[50px] text-center">
                        <Checkbox
                          checked={selectedDisbursementIds.size === sortedFilteredDisbursements.length && sortedFilteredDisbursements.length > 0}
                          onCheckedChange={handleSelectAll}
                          disabled={isBulkDeleting || sortedFilteredDisbursements.length === 0}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4">
                        <div 
                          className="flex items-center gap-1 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => handleSort('period')}
                        >
                          Period
                          {sortColumn === 'period' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4">
                        <div 
                          className="flex items-center gap-1 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => handleSort('status')}
                        >
                          Status
                          {sortColumn === 'status' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4">
                        <div 
                          className="flex items-center gap-1 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => handleSort('provider')}
                        >
                          Provider → Receiver
                          {sortColumn === 'provider' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 text-right">
                        <div 
                          className="flex items-center gap-1 justify-end cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => handleSort('amount')}
                        >
                          Amount
                          {sortColumn === 'amount' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4">
                        <div 
                          className="flex items-center gap-1 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => handleSort('value_date')}
                        >
                          Value Date
                          {sortColumn === 'value_date' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 text-right">
                        <div 
                          className="flex items-center gap-1 justify-end cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => handleSort('usd_value')}
                        >
                          USD Value
                          {sortColumn === 'usd_value' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedFilteredDisbursements.map((disbursement: PlannedDisbursement) => {
                      const overlappingDisbursements = checkDisbursementOverlap(disbursement, sortedFilteredDisbursements);
                      const hasOverlapWarning = overlappingDisbursements && overlappingDisbursements.length > 0;
                      
                      return (
                        <TableRow 
                          key={disbursement.id || 'new'}
                          className={cn(
                            "border-b border-border/40 hover:bg-muted/30 transition-colors",
                            disbursement.hasError ? 'bg-red-50' : hasOverlapWarning ? 'bg-orange-50/30' : '',
                            selectedDisbursementIds.has(disbursement.id!) && "bg-blue-50 border-blue-200"
                          )}
                        >
                          {/* Checkbox */}
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedDisbursementIds.has(disbursement.id!)}
                              onCheckedChange={(checked) => handleSelectDisbursement(disbursement.id!, !!checked)}
                              disabled={isBulkDeleting || !disbursement.id}
                              aria-label={`Select disbursement ${disbursement.id}`}
                            />
                          </TableCell>
                          {/* Period */}
                          <TableCell className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <span className="font-medium">
                                {format(parseISO(disbursement.period_start), 'MMM yyyy')} - {format(parseISO(disbursement.period_end), 'MMM yyyy')}
                              </span>
                              {hasOverlapWarning && (
                                <TooltipProvider>
                                  <UITooltip>
                                    <TooltipTrigger asChild>
                                      <AlertCircle className="h-3 w-3 text-orange-500 flex-shrink-0" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <div className="text-xs">
                                        <div className="font-semibold mb-1">⚠️ Period Overlap Warning</div>
                                        <div className="mb-1">This disbursement period overlaps with:</div>
                                        {overlappingDisbursements.map((od, i) => (
                                          <div key={i} className="text-muted-foreground">
                                            • {format(parseISO(od.period_start), 'MMM d, yyyy')} - {format(parseISO(od.period_end), 'MMM d, yyyy')}
                                          </div>
                                        ))}
                                      </div>
                                    </TooltipContent>
                                  </UITooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-3 px-4">
                            <span className="rounded-md bg-muted/60 px-2 py-0.5 text-xs">
                                {disbursement.status || 'Original'}
                              </span>
                          </TableCell>

                          {/* Provider → Receiver */}
                          <TableCell className="py-3 px-4">
                            <div className="font-medium">
                              {getOrganizationAcronym(disbursement.provider_org_id, disbursement.provider_org_name)} → {getOrganizationAcronym(disbursement.receiver_org_id, disbursement.receiver_org_name)}
                            </div>
                          </TableCell>

                          {/* Amount (merged with currency) */}
                          <TableCell className="py-3 px-4 text-right">
                            <div className="font-medium">
                              {disbursement.amount > 0 
                                ? <><span className="text-muted-foreground">{disbursement.currency}</span> {disbursement.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                                : '-'
                              }
                            </div>
                          </TableCell>

                          {/* Value Date */}
                          <TableCell className="py-3 px-4">
                            <div>
                              {disbursement.value_date ? format(parseISO(disbursement.value_date), 'MMM dd, yyyy') : '-'}
                            </div>
                          </TableCell>

                          {/* USD Value */}
                          <TableCell className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {usdValues[disbursement.id || `${disbursement.period_start}-${disbursement.period_end}`]?.loading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                              ) : usdValues[disbursement.id || `${disbursement.period_start}-${disbursement.period_end}`]?.usd != null ? (
                                <TooltipProvider>
                                  <UITooltip>
                                    <TooltipTrigger asChild>
                                      <span className="font-medium cursor-help">
                                        ${usdValues[disbursement.id || `${disbursement.period_start}-${disbursement.period_end}`].usd?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div>
                                        <div>Original: {disbursement.amount} {disbursement.currency}</div>
                                        <div>Rate: {usdValues[disbursement.id || `${disbursement.period_start}-${disbursement.period_end}`].rate}</div>
                                        <div>Date: {usdValues[disbursement.id || `${disbursement.period_start}-${disbursement.period_end}`].date}</div>
                                      </div>
                                    </TooltipContent>
                                  </UITooltip>
                                </TooltipProvider>
                              ) : (
                                <div className="flex items-center gap-1">
                                  {disbursement.amount === 0 ? (
                                    <AlertCircle className="h-3 w-3 text-orange-500" />
                                  ) : (
                                    <span className="text-sm text-red-500">
                                      {usdValues[disbursement.id || `${disbursement.period_start}-${disbursement.period_end}`]?.error || '-'}
                                    </span>
                                  )}
                                </div>
                              )}
                              {saveStatus[disbursement.id || ''] === 'saving' && (
                                <Loader2 className="h-3 w-3 animate-spin text-orange-500" aria-label="Saving..." />
                              )}
                              {saveStatus[disbursement.id || ''] === 'saved' && (
                                <CheckCircle className="h-3 w-3 text-green-600" aria-label="Saved" />
                              )}
                              {saveStatus[disbursement.id || ''] === 'error' && (
                                <span className="text-xs text-red-500">Failed</span>
                              )}
                            </div>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-3 px-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0" disabled={isReadOnly}>
                                  <span className="sr-only">Open menu</span>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openModal(disbursement)} disabled={isReadOnly}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(disbursement)} disabled={isReadOnly}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(disbursement.id || '')} 
                                  disabled={isReadOnly || deleteLoading === disbursement.id}
                                  className="text-red-600"
                                >
                                  {deleteLoading === disbursement.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                  )}
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Popover open={typePopoverOpen} onOpenChange={setTypePopoverOpen}>
                <PopoverTrigger
                  className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
                    fieldErrors.type && "border-red-500",
                    !modalDisbursement?.type && "text-muted-foreground"
                  )}
                  disabled={savingId === modalDisbursement?.id}
                >
                  <span className="truncate">
                    {modalDisbursement?.type ? (() => {
                      const selectedType = BUDGET_TYPES.find(type => type.code === modalDisbursement.type);
                      return selectedType ? (
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{selectedType.code}</span>
                          <span className="font-medium">{selectedType.name}</span>
                        </span>
                      ) : (
                        "Select type"
                      );
                    })() : (
                      "Select type"
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {modalDisbursement?.type && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateFormField('type', '1');
                          setTypePopoverOpen(false);
                        }}
                        className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                        aria-label="Clear selection"
                      >
                        <span className="text-xs">×</span>
                      </button>
                    )}
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                  <div className="max-h-[200px] overflow-y-auto">
                    {BUDGET_TYPES.map(type => (
                      <button
                        key={type.code}
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                          modalDisbursement?.type === type.code && "bg-accent text-accent-foreground"
                        )}
                        onClick={() => {
                          updateFormField('type', type.code as '1' | '2');
                          setTypePopoverOpen(false);
                        }}
                      >
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{type.code}</span>
                        <span className="font-medium">{type.name}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              {fieldErrors.type && (
                <p className="text-xs text-red-500">{fieldErrors.type}</p>
              )}
            </div>

            {/* Period */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period-start">Period Start Date</Label>
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
                <Label htmlFor="period-end">Period End Date</Label>
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

            {/* Currency, Amount, Value Date */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Popover open={currencyPopoverOpen} onOpenChange={setCurrencyPopoverOpen}>
                  <PopoverTrigger
                    className={cn(
                      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors",
                      fieldErrors.currency && "border-red-500",
                      !modalDisbursement?.currency && "text-muted-foreground"
                    )}
                    disabled={savingId === modalDisbursement?.id}
                  >
                    <span className="truncate">
                      {modalDisbursement?.currency ? (() => {
                        const selectedCurrency = currencies.find(c => c.code === modalDisbursement.currency);
                        return selectedCurrency ? (
                          <span className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{selectedCurrency.code}</span>
                            <span className="font-medium">{selectedCurrency.name}</span>
                          </span>
                        ) : (
                          "Select currency"
                        );
                      })() : (
                        "Select currency"
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {modalDisbursement?.currency && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateFormField('currency', 'USD');
                            setCurrencyPopoverOpen(false);
                          }}
                          className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
                          aria-label="Clear selection"
                        >
                          <span className="text-xs">×</span>
                        </button>
                      )}
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <div className="max-h-[300px] overflow-y-auto">
                      {currencies.map(currency => (
                        <button
                          key={currency.code}
                          type="button"
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                            modalDisbursement?.currency === currency.code && "bg-accent text-accent-foreground"
                          )}
                          onClick={() => {
                            updateFormField('currency', currency.code);
                            setCurrencyPopoverOpen(false);
                          }}
                        >
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{currency.code}</span>
                          <span className="font-medium">{currency.name}</span>
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                {fieldErrors.currency && (
                  <p className="text-xs text-red-500">{fieldErrors.currency}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="text"
                  value={modalDisbursement?.amount ? modalDisbursement.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
                  onChange={(e) => {
                    // Remove formatting and parse the number
                    const rawValue = e.target.value.replace(/[^\d.-]/g, '');
                    const numericValue = parseFloat(rawValue) || 0;
                    updateFormField('amount', numericValue);
                  }}
                  onBlur={(e) => {
                    // Format on blur
                    if (modalDisbursement?.amount) {
                      const formatted = modalDisbursement.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      e.target.value = formatted;
                    }
                  }}
                  className={cn("h-10", fieldErrors.amount && "border-red-500")}
                  placeholder="0.00"
                  disabled={savingId === modalDisbursement?.id}
                />
                {fieldErrors.amount && (
                  <p className="text-xs text-red-500">{fieldErrors.amount}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="value-date">Value Date</Label>
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

            {/* USD Value */}
            <div className="space-y-2">
              <Label htmlFor="usd-value">USD Value</Label>
              <div className="relative">
                <Input
                  id="usd-value"
                  type="text"
                  value={modalDisbursement?.usdAmount ? `$${modalDisbursement.usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                  className="h-10 pr-8 bg-gray-50 font-medium"
                  disabled
                />
                {isCalculatingUSD && (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>
              <p className="text-xs text-gray-500">Auto-calculated based on currency, amount, and value date</p>
            </div>

            <div className="border-t pt-4" />

            {/* Provider Organisation */}
            <div className="space-y-2">
              <Label htmlFor="provider-org">Provider Organisation</Label>
              <OrganizationCombobox
                value={modalDisbursement?.provider_org_id || ''}
                onValueChange={(orgId) => {
                  const org = organizations.find(o => o.id === orgId);
                  if (org) {
                    updateFormField('provider_org_id', orgId);
                    updateFormField('provider_org_name', getOrganizationDisplayName(org));
                    // Auto-fill ref and type if available
                    if (org.iati_identifier) {
                      updateFormField('provider_org_ref', org.iati_identifier);
                    }
                    if (org.org_type) {
                      updateFormField('provider_org_type', org.org_type);
                    }
                  }
                }}
                placeholder="Search for provider organisation..."
                organizations={organizations}
              />
            </div>

            {/* Provider Activity */}
            <div className="space-y-2">
              <Label htmlFor="provider-activity">Provider Activity</Label>
              <ActivityCombobox
                value={modalDisbursement?.provider_activity_uuid || ''}
                onValueChange={async (activityId) => {
                  console.log('[PlannedDisbursement] Provider activity selected:', activityId);
                  // Update UUID immediately
                  updateFormField('provider_activity_uuid', activityId);
                  console.log('[PlannedDisbursement] Updated provider_activity_uuid to:', activityId);
                  
                  if (activityId) {
                    // Fetch activity details to get IATI identifier
                    try {
                      const response = await fetch(`/api/activities/${activityId}`);
                      if (response.ok) {
                        const activity = await response.json();
                        console.log('[PlannedDisbursement] Fetched activity IATI ID:', activity.iati_identifier);
                        updateFormField('provider_activity_id', activity.iati_identifier || '');
                      }
                    } catch (error) {
                      console.error('Error fetching activity:', error);
                    }
                  } else {
                    updateFormField('provider_activity_id', '');
                  }
                }}
                placeholder="Search for provider activity..."
                fallbackIatiId={modalDisbursement?.provider_activity_id}
                disabled={savingId === modalDisbursement?.id}
              />
              {modalDisbursement?.provider_activity_id && (
                <p className="text-xs text-gray-500">
                  IATI ID: {modalDisbursement.provider_activity_id}
                </p>
              )}
            </div>

            {/* Receiver Organisation */}
            <div className="space-y-2">
              <Label htmlFor="receiver-org">Receiver Organisation</Label>
              <OrganizationCombobox
                value={modalDisbursement?.receiver_org_id || ''}
                onValueChange={(orgId) => {
                  const org = organizations.find(o => o.id === orgId);
                  if (org) {
                    updateFormField('receiver_org_id', orgId);
                    updateFormField('receiver_org_name', getOrganizationDisplayName(org));
                    // Auto-fill ref and type if available
                    if (org.iati_identifier) {
                      updateFormField('receiver_org_ref', org.iati_identifier);
                    }
                    if (org.org_type) {
                      updateFormField('receiver_org_type', org.org_type);
                    }
                  }
                }}
                placeholder="Search for receiver organisation..."
                organizations={organizations}
              />
            </div>

            {/* Receiver Activity */}
            <div className="space-y-2">
              <Label htmlFor="receiver-activity">Receiver Activity</Label>
              <ActivityCombobox
                value={modalDisbursement?.receiver_activity_uuid || ''}
                onValueChange={async (activityId) => {
                  // Update UUID immediately
                  updateFormField('receiver_activity_uuid', activityId);
                  
                  if (activityId) {
                    // Fetch activity details to get IATI identifier
                    try {
                      const response = await fetch(`/api/activities/${activityId}`);
                      if (response.ok) {
                        const activity = await response.json();
                        updateFormField('receiver_activity_id', activity.iati_identifier || '');
                      }
                    } catch (error) {
                      console.error('Error fetching activity:', error);
                    }
                  } else {
                    updateFormField('receiver_activity_id', '');
                  }
                }}
                placeholder="Search for receiver activity..."
                fallbackIatiId={modalDisbursement?.receiver_activity_id}
                disabled={savingId === modalDisbursement?.id}
              />
              {modalDisbursement?.receiver_activity_id && (
                <p className="text-xs text-gray-500">
                  IATI ID: {modalDisbursement.receiver_activity_id}
                </p>
              )}
            </div>

            <div className="border-t pt-4" />

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={modalDisbursement?.notes || ''}
                onChange={(e) => updateFormField('notes', e.target.value)}
                className="min-h-[100px]"
                placeholder="Add any additional notes about this planned disbursement..."
                disabled={savingId === modalDisbursement?.id}
              />
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

      {/* Chart Aggregation Filters */}
      {disbursements.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2 items-center mb-4 mt-8">
            <Button
              variant={aggregationMode === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAggregationMode('monthly')}
            >
              Monthly
            </Button>
            <Button
              variant={aggregationMode === 'quarterly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAggregationMode('quarterly')}
            >
              Quarterly
            </Button>
            <Button
              variant={aggregationMode === 'semi-annual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAggregationMode('semi-annual')}
            >
              Semi-Annual
            </Button>
            <Button
              variant={aggregationMode === 'annual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAggregationMode('annual')}
            >
              Annual
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Planned Disbursements by Period</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 60, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#64748b" />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={12}
                      label={{
                        value: 'USD',
                        angle: -90,
                        position: 'insideLeft',
                        offset: -10,
                        style: { textAnchor: 'middle', fill: '#64748b', fontSize: 13, fontWeight: 600 }
                      }}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                              <p className="font-semibold text-gray-900 mb-1">{data.period}</p>
                              <p className="text-sm text-gray-600">Total Planned Disbursement</p>
                              <p className="text-lg font-bold text-gray-900">USD {Number(data.usdAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="usdAmount" fill="#64748b" barSize={32} />
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
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 60, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#64748b" />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={12}
                      label={{
                        value: 'USD',
                        angle: -90,
                        position: 'insideLeft',
                        offset: -10,
                        style: { textAnchor: 'middle', fill: '#64748b', fontSize: 13, fontWeight: 600 }
                      }}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                              <p className="font-semibold text-gray-900 mb-1">{data.period}</p>
                              <p className="text-sm text-gray-600">Cumulative Planned Disbursement</p>
                              <p className="text-lg font-bold text-gray-900">USD {Number(data.cumulativeUSD || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line type="monotone" dataKey="cumulativeUSD" stroke="#64748b" strokeWidth={3} dot={{ fill: "#64748b", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
