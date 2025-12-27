'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO, isValid, addMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, differenceInMonths, getQuarter, getYear } from 'date-fns';
import { Trash2, Copy, Loader2, Plus, CalendarIcon, Download, DollarSign, Users, Edit, Save, X, Check, MoreVertical, Calendar, ArrowUp, ArrowDown, ArrowUpDown, CheckCircle, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Lock, Unlock, RefreshCw } from 'lucide-react';
import { fixedCurrencyConverter } from '@/lib/currency-converter-fixed';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getAllCurrenciesWithPinned, type Currency } from '@/data/currencies';
import { cn } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { FinancialSummaryCards } from '@/components/FinancialSummaryCards';
// USD conversion now happens server-side - no client-side API needed
// Removed shared HeroCard import - using local simple version
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
import { OrganizationLogo } from '@/components/ui/organization-logo';

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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { toast } from 'sonner';
import { OrganizationCombobox } from '@/components/ui/organization-combobox';
import { ActivityCombobox } from '@/components/ui/activity-combobox';
import { OrgTypeMappingModal, useOrgTypeMappingModal } from '@/components/organizations/OrgTypeMappingModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronsUpDown } from 'lucide-react';
import { exportToCSV } from '@/lib/csv-export';
import { BulkActionToolbar } from '@/components/ui/bulk-action-toolbar';

// Format currency with abbreviations (K, M, B)
const formatCurrencyAbbreviated = (value: number) => {
  const absValue = Math.abs(value);
  let formattedValue: string;

  if (absValue >= 1_000_000_000) {
    formattedValue = (value / 1_000_000_000).toFixed(1) + 'B';
  } else if (absValue >= 1_000_000) {
    formattedValue = (value / 1_000_000).toFixed(1) + 'M';
  } else if (absValue >= 1_000) {
    formattedValue = (value / 1_000).toFixed(1) + 'K';
  } else {
    formattedValue = value.toFixed(0);
  }

  return '$' + formattedValue;
};

// Simple Hero Card Component (matching TransactionsManager style)
interface SimpleHeroCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon?: React.ReactNode;
}

function HeroCard({ title, value, subtitle, icon }: SimpleHeroCardProps) {
  return (
    <div className="p-4 border rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
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
  provider_org_logo?: string;
  receiver_org_id?: string;
  receiver_org_name?: string;
  receiver_org_logo?: string;
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
  hideSummaryCards?: boolean;
  renderFilters?: (filters: React.ReactNode) => React.ReactNode;
  onLoadingChange?: (loading: boolean) => void;
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

export default function PlannedDisbursementsTab({
  activityId,
  startDate,
  endDate,
  defaultCurrency = 'USD',
  readOnly = false,
  onDisbursementsChange,
  hideSummaryCards = false,
  renderFilters,
  onLoadingChange
}: PlannedDisbursementsTabProps) {
  const [disbursements, setDisbursements] = useState<PlannedDisbursement[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationsLoaded, setOrganizationsLoaded] = useState(false);
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
  // isCalculatingUSD removed - USD conversion now happens server-side
  const [typePopoverOpen, setTypePopoverOpen] = useState(false);
  const [currencyPopoverOpen, setCurrencyPopoverOpen] = useState(false);
  const [amountInputValue, setAmountInputValue] = useState<string>('');
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  
  // Exchange rate state for modal
  const [modalExchangeRateManual, setModalExchangeRateManual] = useState(false);
  const [modalExchangeRate, setModalExchangeRate] = useState<number | null>(null);
  const [isLoadingModalRate, setIsLoadingModalRate] = useState(false);
  const [modalRateError, setModalRateError] = useState<string | null>(null);
  
  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Bulk selection state
  const [selectedDisbursementIds, setSelectedDisbursementIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Org type mapping modal for handling legacy organization type codes
  const orgTypeMappingModal = useOrgTypeMappingModal();

  // Handler to update organization type via API
  const handleOrgTypeUpdate = async (orgId: string, newTypeCode: string) => {
    const response = await fetch(`/api/organizations/${orgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Organisation_Type_Code: newTypeCode })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update organization type');
    }
    
    // Refresh organizations list
    fetchOrganizations();
  };

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

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

  // Toggle row expansion
  const toggleRowExpansion = (disbursementId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(disbursementId)) {
        newSet.delete(disbursementId);
      } else {
        newSet.add(disbursementId);
      }
      return newSet;
    });
  };

  // Expand all rows on current page
  const expandAllRows = () => {
    const allIds = new Set(paginatedDisbursements.map(d => d.id || 'new'));
    setExpandedRows(allIds);
  };

  // Collapse all rows
  const collapseAllRows = () => {
    setExpandedRows(new Set());
  };

  // Lazy-load organizations only when modal is opened (for autocomplete)
  const fetchOrganizationsIfNeeded = async () => {
    if (organizationsLoaded) return;
    
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, code, acronym, type, Organisation_Type_Code, Organisation_Type_Name, iati_org_id, logo, country')
        .order('name');

      if (error) throw error;

      console.log('[PlannedDisbursementsTab] Fetched organizations with logos:', 
        data?.filter(org => org.logo).map(org => ({ name: org.name, hasLogo: !!org.logo }))
      );

      setOrganizations(data || []);
      setOrganizationsLoaded(true);
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  // Handler to open modal for add/edit
  const openModal = (disbursement?: PlannedDisbursement) => {
    // Lazy-load organizations only when modal is opened
    fetchOrganizationsIfNeeded();
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
    // Initialize amount input with formatted value
    if (newDisbursement.amount && newDisbursement.amount > 0) {
      setAmountInputValue(newDisbursement.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } else {
      setAmountInputValue('');
    }
    setIsAmountFocused(false);
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
        setAmountInputValue('');
        setIsAmountFocused(false);
      }
    } else {
      setShowModal(false);
      setModalDisbursement(null);
      setFieldErrors({});
      setIsFormDirty(false);
      setAmountInputValue('');
      setIsAmountFocused(false);
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
          // Also clear period_end error if it was due to date comparison
          if (fieldErrors.period_end === 'End date must be after start date' && modalDisbursement?.period_end && value < modalDisbursement.period_end) {
            delete errors.period_end;
          }
        }
        break;
      case 'period_end':
        if (!value) {
          errors.period_end = 'End date is required';
        } else if (modalDisbursement?.period_start && value <= modalDisbursement.period_start) {
          errors.period_end = 'End date must be after start date';
        } else {
          delete errors.period_end;
          // Also clear period_start error if it was due to date comparison
          if (fieldErrors.period_start === 'Start date must be before end date' && modalDisbursement?.period_start && value > modalDisbursement.period_start) {
            delete errors.period_start;
          }
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
    
    return errors;
  };

  // USD conversion now happens server-side - no client-side calculation needed!

  // Update form field with validation and dirty tracking
  const updateFormField = (field: string, value: any) => {
    setModalDisbursement(prev => prev ? { ...prev, [field]: value } : null);
    setIsFormDirty(true);
    validateField(field, value);
  };

  // Fetch exchange rate for modal
  const fetchModalExchangeRate = useCallback(async () => {
    if (!modalDisbursement) return;
    
    const currency = modalDisbursement.currency;
    if (!currency || currency === 'USD') {
      setModalExchangeRate(1);
      setModalRateError(null);
      return;
    }

    const valueDate = modalDisbursement.value_date || modalDisbursement.period_start;
    if (!valueDate) {
      setModalRateError('Please set a value date or period start first');
      return;
    }

    setIsLoadingModalRate(true);
    setModalRateError(null);

    try {
      const result = await fixedCurrencyConverter.convertToUSD(
        1,
        currency,
        new Date(valueDate)
      );

      if (result.success && result.exchange_rate) {
        setModalExchangeRate(result.exchange_rate);
        setModalRateError(null);
        console.log(`[PlannedDisbursementsTab] Fetched exchange rate: 1 ${currency} = ${result.exchange_rate} USD`);
      } else {
        setModalRateError(result.error || 'Failed to fetch exchange rate');
        setModalExchangeRate(null);
      }
    } catch (err) {
      console.error('[PlannedDisbursementsTab] Error fetching exchange rate:', err);
      setModalRateError('Failed to fetch exchange rate');
      setModalExchangeRate(null);
    } finally {
      setIsLoadingModalRate(false);
    }
  }, [modalDisbursement]);

  // Calculate modal USD value
  const modalCalculatedUsdValue = modalDisbursement?.amount && modalExchangeRate 
    ? Math.round(modalDisbursement.amount * modalExchangeRate * 100) / 100 
    : null;

  // Auto-fetch exchange rate when currency or date changes in modal (only if not manual)
  useEffect(() => {
    if (!modalExchangeRateManual && modalDisbursement?.currency && modalDisbursement.currency !== 'USD') {
      const valueDate = modalDisbursement.value_date || modalDisbursement.period_start;
      if (valueDate) {
        fetchModalExchangeRate();
      }
    } else if (modalDisbursement?.currency === 'USD') {
      setModalExchangeRate(1);
      setModalRateError(null);
    }
  }, [modalDisbursement?.currency, modalDisbursement?.value_date, modalDisbursement?.period_start, modalExchangeRateManual, fetchModalExchangeRate]);

  // Reset exchange rate state when modal opens
  useEffect(() => {
    if (showModal && modalDisbursement) {
      const existingManual = (modalDisbursement as any).exchange_rate_manual ?? false;
      const existingRate = (modalDisbursement as any).exchange_rate_used ?? null;
      setModalExchangeRateManual(existingManual);
      setModalExchangeRate(existingRate);
      setModalRateError(null);
    }
  }, [showModal, modalDisbursement?.id]);

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
    // Initialize amount input with formatted value
    if (newDisbursement.amount && newDisbursement.amount > 0) {
      setAmountInputValue(newDisbursement.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } else {
      setAmountInputValue('');
    }
    setIsAmountFocused(false);
    setFieldErrors({});
    setIsFormDirty(false);
    setShowModal(true);
  }, [disbursements, activityId, defaultCurrency, startDate, endDate]);

  // Organizations are now lazy-loaded in fetchOrganizationsIfNeeded() when modal opens

  // Fetch disbursements for this activity
  useEffect(() => {
    const fetchDisbursements = async () => {
      if (!activityId) {
        setLoading(false);
        onLoadingChange?.(false);
        return;
      }

      setLoading(true);
      onLoadingChange?.(true);
      try {
        // Use API endpoint instead of direct Supabase query to avoid RLS issues
        const response = await fetch(`/api/activities/${activityId}/planned-disbursements`, {
          cache: 'no-store'
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch planned disbursements');
        }

        const data = await response.json();
        console.log('[PlannedDisbursementsTab] Fetched planned disbursements:', data?.length || 0);

        // If no disbursements exist, show empty state (users can create custom periods)
        if (!data || data.length === 0) {
          setDisbursements([]);
        } else {
          // Fetch organization data separately for logos via API
          const orgIds = new Set<string>();
          data.forEach((d: any) => {
            if (d.provider_org_id) orgIds.add(d.provider_org_id);
            if (d.receiver_org_id) orgIds.add(d.receiver_org_id);
          });

          let orgData: Record<string, any> = {};
          if (orgIds.size > 0) {
            try {
              const orgResponse = await fetch('/api/organizations');
              if (orgResponse.ok) {
                const allOrgs = await orgResponse.json();
                // Filter to only the organizations we need
                const relevantOrgs = allOrgs.filter((org: any) => orgIds.has(org.id));
                orgData = Object.fromEntries(relevantOrgs.map((org: any) => [org.id, org]));
              }
            } catch (err) {
              console.warn('[PlannedDisbursementsTab] Failed to fetch organization data:', err);
            }
          }

          // Read stored USD values from database (no conversion needed)
          const disbursementsWithOrgs = data.map((disbursement: any) => {
            // Include organization logos from fetched data
            const providerOrg = disbursement.provider_org_id ? orgData[disbursement.provider_org_id] : null;
            const receiverOrg = disbursement.receiver_org_id ? orgData[disbursement.receiver_org_id] : null;

            const result = {
              ...disbursement,
              usdAmount: disbursement.usd_amount ?? null, // Use stored value from database
              provider_organization: providerOrg,
              receiver_organization: receiverOrg,
              provider_org_logo: providerOrg?.logo,
              receiver_org_logo: receiverOrg?.logo,
            };

            // Debug logging
            if (disbursement.provider_org_name || disbursement.receiver_org_name) {
              console.log('[PlannedDisbursementsTab] Organization logos:', {
                provider: disbursement.provider_org_name,
                provider_logo: providerOrg?.logo ? 'HAS LOGO' : 'NO LOGO',
                receiver: disbursement.receiver_org_name,
                receiver_logo: receiverOrg?.logo ? 'HAS LOGO' : 'NO LOGO',
                provider_org_data: providerOrg,
                receiver_org_data: receiverOrg
              });
            }

            return result;
          });
          setDisbursements(disbursementsWithOrgs);
        }
      } catch (err) {
        console.error('Error fetching planned disbursements:', err);
        setError('Failed to load planned disbursements');
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
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

  // Read stored USD values from database (no conversion needed)
  useEffect(() => {
    const newUsdValues: Record<string, { usd: number|null, rate: number|null, date: string, loading: boolean, error?: string }> = {};
    for (const disbursement of disbursements) {
      const key = disbursement.id || `${disbursement.period_start}-${disbursement.period_end}`;
      newUsdValues[key] = {
        usd: disbursement.usd_amount ?? null,
        rate: null,
        date: disbursement.value_date || '',
        loading: false,
        error: disbursement.usd_amount === null && disbursement.currency !== 'USD' ? 'Not converted' : undefined
      };
    }
    setUsdValues(newUsdValues);
  }, [disbursements]);

  // Filter disbursements by status
  const filteredDisbursements = useMemo(() => {
    if (statusFilter === 'all') {
      return disbursements;
    }
    return disbursements.filter(d => (d.status || 'original') === statusFilter);
  }, [disbursements, statusFilter]);

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

  // Pagination logic
  const totalPages = useMemo(() => 
    Math.ceil(sortedFilteredDisbursements.length / itemsPerPage)
  , [sortedFilteredDisbursements.length, itemsPerPage]);
  
  // Ensure currentPage is within bounds - using callback form to avoid dependency issues
  useEffect(() => {
    if (totalPages > 0) {
      setCurrentPage(prev => prev > totalPages ? totalPages : prev);
    }
  }, [totalPages]);
  
  const paginatedDisbursements = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedFilteredDisbursements.slice(startIndex, endIndex);
  }, [sortedFilteredDisbursements, currentPage, itemsPerPage]);

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

  // Calculate totals for hero cards
  const totalPlannedDisbursementsUSD = useMemo(() => {
    return filteredDisbursements.reduce((sum, d) => sum + (d.usdAmount || 0), 0);
  }, [filteredDisbursements]);

  const totalPlannedDisbursementsCount = useMemo(() => {
    return filteredDisbursements.length;
  }, [filteredDisbursements]);

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

      // API will handle USD conversion
      const disbursementData = {
        activity_id: activityId,
        amount: disbursement.amount,
        currency: disbursement.currency,
        // usd_amount will be calculated by the API
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
          cache: 'no-store',
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
          d.id === disbursement.id ? { ...data, usdAmount: data.usd_amount } : d
        ));
        savedId = disbursement.id;
      } else {
        // Insert new
        const response = await fetch('/api/planned-disbursements', {
          method: 'POST',
          cache: 'no-store',
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
        setDisbursements(prev => [...prev.filter(d => d.id !== undefined), { ...data, usdAmount: data.usd_amount }]);
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

  // Delete confirmation state (only for individual delete via dropdown menu)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Delete disbursement
  const confirmDelete = async () => {
    if (!deleteConfirmId || isReadOnly) return;

    const id = deleteConfirmId;
    setDeleteConfirmId(null);
    setDeleteLoading(id);

    try {
      const response = await fetch(`/api/planned-disbursements?id=${id}`, {
        method: 'DELETE',
        cache: 'no-store',
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
        cache: 'no-store',
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

  const confirmBulkDelete = useCallback(async () => {
    const selectedArray = Array.from(selectedDisbursementIds);
    if (selectedArray.length === 0) return;

    setIsBulkDeleting(true);

    try {
      // Delete all selected disbursements
      await Promise.all(selectedArray.map(async (id) => {
        const response = await fetch(`/api/planned-disbursements?id=${id}`, {
          method: 'DELETE',
          cache: 'no-store',
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

  const handleExportDisbursement = (disbursement: PlannedDisbursement) => {
    const exportData = [];

    // Disbursement Details
    exportData.push(
      { label: 'Status', value: (disbursement.status || 'Original').charAt(0).toUpperCase() + (disbursement.status || 'Original').slice(1) },
      { label: 'Period Start', value: format(parseISO(disbursement.period_start), 'MMM d, yyyy') },
      { label: 'Period End', value: format(parseISO(disbursement.period_end), 'MMM d, yyyy') },
      { label: 'Original Amount', value: `${disbursement.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${disbursement.currency}` },
      { label: 'USD Value', value: disbursement.usdAmount != null ? `USD ${disbursement.usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—' },
    );

    if (disbursement.value_date) {
      exportData.push({ label: 'Value Date', value: format(parseISO(disbursement.value_date), 'MMM d, yyyy') });
    }

    // Organizations
    if (disbursement.provider_org_name) {
      exportData.push({ label: 'Provider Organisation', value: disbursement.provider_org_name });
    }
    if (disbursement.provider_org_ref) {
      exportData.push({ label: 'Provider Reference', value: disbursement.provider_org_ref });
    }
    if (disbursement.receiver_org_name) {
      exportData.push({ label: 'Receiver Organisation', value: disbursement.receiver_org_name });
    }
    if (disbursement.receiver_org_ref) {
      exportData.push({ label: 'Receiver Reference', value: disbursement.receiver_org_ref });
    }

    // Notes
    if (disbursement.notes) {
      exportData.push({ label: 'Notes', value: disbursement.notes });
    }

    // System Info
    if (disbursement.id) {
      exportData.push({ label: 'Disbursement ID', value: disbursement.id });
    }
    if (disbursement.created_at) {
      exportData.push({ label: 'Created', value: format(parseISO(disbursement.created_at), 'MMM d, yyyy') });
    }
    if (disbursement.updated_at) {
      exportData.push({ label: 'Updated', value: format(parseISO(disbursement.updated_at), 'MMM d, yyyy') });
    }

    const filename = `planned-disbursement-export-${format(new Date(), 'yyyy-MM-dd')}`;
    exportToCSV(exportData, filename);
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
      if (org) {
        // Prefer acronym, but fall back to name if no acronym
        return org.acronym || org.name || orgName || '-';
      }
    }
    
    // If no org found by ID, just use the name directly
    // Don't generate acronyms - show the full name
    if (orgName) {
      return orgName;
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

      // Include exchange rate fields
      const disbursementData = {
        activity_id: activityId,
        amount: modalDisbursement.amount,
        currency: modalDisbursement.currency,
        // Include USD conversion fields
        usd_amount: modalCalculatedUsdValue,
        exchange_rate_used: modalExchangeRate,
        exchange_rate_manual: modalExchangeRateManual,
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
          cache: 'no-store',
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
          disbursement.id === modalDisbursement.id ? { ...data, usdAmount: data.usd_amount } : disbursement
        ));
        toast.success('Planned disbursement updated successfully');
      } else {
        // Insert new
        const response = await fetch('/api/planned-disbursements', {
          method: 'POST',
          cache: 'no-store',
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
        setDisbursements(prev => [...prev.filter(d => d.id !== undefined), { ...data, usdAmount: data.usd_amount }]);
        toast.success('Planned disbursement added successfully');
      }

      // Reset amount input states
      setAmountInputValue('');
      setIsAmountFocused(false);
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
          {/* Planned Disbursements Summary Cards */}
          {!hideSummaryCards && disbursements.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
              <HeroCard
                title="Total Planned Disbursements"
                value={formatCurrencyAbbreviated(totalPlannedDisbursementsUSD)}
                subtitle={`${totalPlannedDisbursementsCount} disbursement${totalPlannedDisbursementsCount !== 1 ? 's' : ''}`}
                icon={<DollarSign className="h-5 w-5" />}
              />
            </div>
          )}

          {/* Planned Disbursements Table */}
          <Card data-planned-tab className="border-0 shadow-none">
        <CardHeader>
          <div className="flex items-center justify-between">
            {!hideSummaryCards && (
              <div>
                <CardTitle>Planned Disbursements</CardTitle>
                <CardDescription>Scheduled future disbursements</CardDescription>
              </div>
            )}
            {hideSummaryCards && <div />}
            <div className={`flex items-center gap-2 ${hideSummaryCards ? 'hidden' : ''}`}>
              {!readOnly && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button disabled={isReadOnly} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Planned Disbursement
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => addPeriod('month')}>
                        Monthly
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addPeriod('quarter')}>
                        Quarterly
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addPeriod('half-year')}>
                        Semi-Annual
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addPeriod('year')}>
                        Annual
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {!hideSummaryCards && disbursements.length > 0 && !loading && (
                <>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="original">
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">1</span>
                          <span>Original</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="revised">
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">2</span>
                          <span>Revised</span>
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {expandedRows.size > 0 ? (
                    <Button
                      variant="outline"
                      onClick={collapseAllRows}
                      title="Collapse all expanded rows"
                      data-collapse-all
                    >
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Collapse All
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={expandAllRows}
                      title="Expand all rows"
                      data-expand-all
                    >
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Expand All
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleExport} data-export title="Export">
                    <Download className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
          {/* Filters for when hideSummaryCards is true - shown between title and buttons */}
          {hideSummaryCards && disbursements.length > 0 && !loading && !renderFilters && (
            <div className="px-6 pb-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="original">
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">1</span>
                          <span>Original</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="revised">
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">2</span>
                          <span>Revised</span>
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  {expandedRows.size > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={collapseAllRows}
                      title="Collapse all expanded rows"
                      data-collapse-all
                    >
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Collapse All
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={expandAllRows}
                      title="Expand all rows"
                      data-expand-all
                    >
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Expand All
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={handleExport} data-export title="Export">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          {/* Render filters externally if callback provided */}
          {renderFilters && hideSummaryCards && disbursements.length > 0 && !loading && renderFilters(
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="original">
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">1</span>
                      <span>Original</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="revised">
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">2</span>
                      <span>Revised</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {expandedRows.size > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAllRows}
                  title="Collapse all expanded rows"
                  data-collapse-all
                >
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Collapse All
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expandAllRows}
                  title="Expand all rows"
                  data-expand-all
                >
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Expand All
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExport} data-export title="Export">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}
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
                <Table aria-label="Planned disbursements table" className="table-fixed">
                  <TableHeader className="bg-muted/50 border-b border-border/70">
                    <TableRow>
                      <TableHead className="py-3 px-2" style={{ width: '40px' }}></TableHead>
                      {!readOnly && (
                        <TableHead className="text-center" style={{ width: '50px' }}>
                          <Checkbox
                            checked={selectedDisbursementIds.size === sortedFilteredDisbursements.length && sortedFilteredDisbursements.length > 0}
                            onCheckedChange={handleSelectAll}
                            disabled={isBulkDeleting || sortedFilteredDisbursements.length === 0}
                            aria-label="Select all"
                          />
                        </TableHead>
                      )}
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4">
                        <div 
                          className="flex items-center gap-1 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => handleSort('period')}
                        >
                          Period
                          {sortColumn === 'period' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4">
                        <div 
                          className="flex items-center gap-1 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => handleSort('status')}
                        >
                          Type
                          {sortColumn === 'status' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4" style={{ maxWidth: '300px' }}>
                        <div 
                          className="flex items-center gap-1 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => handleSort('provider')}
                        >
                          Provider → Receiver
                          {sortColumn === 'provider' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 text-right" style={{ width: '160px' }}>
                        <div 
                          className="flex items-center gap-1 justify-end cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => handleSort('amount')}
                        >
                          Amount
                          {sortColumn === 'amount' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4" style={{ width: '140px' }}>
                        <div 
                          className="flex items-center gap-1 cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => handleSort('value_date')}
                        >
                          Value Date
                          {sortColumn === 'value_date' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 text-right" style={{ width: '150px' }}>
                        <div 
                          className="flex items-center gap-1 justify-end cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => handleSort('usd_value')}
                        >
                          USD Value
                          {sortColumn === 'usd_value' ? (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                      </TableHead>
                      {!readOnly && (
                        <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 text-right" style={{ width: '80px' }}>
                          Actions
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDisbursements.map((disbursement: PlannedDisbursement) => {
                      const disbursementId = disbursement.id || 'new';
                      const isExpanded = expandedRows.has(disbursementId);
                      
                      return (
                        <React.Fragment key={disbursementId}>
                        <TableRow 
                          className={cn(
                            "border-b border-border/40 hover:bg-muted/30 transition-colors",
                            disbursement.hasError ? 'bg-red-50' : '',
                            selectedDisbursementIds.has(disbursement.id!) && "bg-blue-50 border-blue-200"
                          )}
                        >
                          {/* Chevron for expand/collapse */}
                          <TableCell className="py-3 px-2 whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRowExpansion(disbursementId);
                              }}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          
                          {/* Checkbox */}
                          {!readOnly && (
                            <TableCell className="text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedDisbursementIds.has(disbursement.id!)}
                                onCheckedChange={(checked) => handleSelectDisbursement(disbursement.id!, !!checked)}
                                disabled={isBulkDeleting || !disbursement.id}
                                aria-label={`Select disbursement ${disbursement.id}`}
                              />
                            </TableCell>
                          )}
                          {/* Period */}
                          <TableCell className="py-3 px-4 whitespace-nowrap">
                            <span className="font-medium">
                              {format(parseISO(disbursement.period_start), 'MMM yyyy')} - {format(parseISO(disbursement.period_end), 'MMM yyyy')}
                            </span>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-3 px-4 whitespace-nowrap">
                            <span className={`rounded-md px-2 py-0.5 text-xs ${(disbursement.status || 'original') !== 'original' ? 'bg-muted/60' : ''}`}>
                                {(disbursement.status || 'original').charAt(0).toUpperCase() + (disbursement.status || 'original').slice(1)}
                              </span>
                          </TableCell>

                          {/* Provider → Receiver */}
                          <TableCell className="py-3 px-4 max-w-[300px]">
                            <div className="flex items-center gap-2 font-medium min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1 max-w-[45%]">
                                <OrganizationLogo
                                  logo={disbursement.provider_org_logo}
                                  name={getOrganizationAcronym(disbursement.provider_org_id, disbursement.provider_org_name)}
                                  size="sm"
                                />
                                <span className="truncate">{getOrganizationAcronym(disbursement.provider_org_id, disbursement.provider_org_name)}</span>
                              </div>
                              <span className="text-muted-foreground flex-shrink-0">→</span>
                              <div className="flex items-center gap-1.5 min-w-0 flex-1 max-w-[45%]">
                                <OrganizationLogo
                                  logo={disbursement.receiver_org_logo}
                                  name={getOrganizationAcronym(disbursement.receiver_org_id, disbursement.receiver_org_name)}
                                  size="sm"
                                />
                                <span className="truncate">{getOrganizationAcronym(disbursement.receiver_org_id, disbursement.receiver_org_name)}</span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Amount (merged with currency) */}
                          <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="font-medium">
                              {disbursement.amount > 0 
                                ? <><span className="text-muted-foreground">{disbursement.currency}</span> {disbursement.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</>
                                : '-'
                              }
                            </div>
                          </TableCell>

                          {/* Value Date */}
                          <TableCell className="py-3 px-4 whitespace-nowrap">
                            <div>
                              {disbursement.value_date ? format(parseISO(disbursement.value_date), 'MMM dd, yyyy') : '-'}
                            </div>
                          </TableCell>

                          {/* USD Value */}
                          <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {usdValues[disbursement.id || `${disbursement.period_start}-${disbursement.period_end}`]?.loading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                              ) : usdValues[disbursement.id || `${disbursement.period_start}-${disbursement.period_end}`]?.usd != null ? (
                                <TooltipProvider>
                                  <UITooltip>
                                    <TooltipTrigger asChild>
                                      <span className="font-medium cursor-help flex items-center gap-1">
                                        <span className="text-muted-foreground">USD</span> {usdValues[disbursement.id || `${disbursement.period_start}-${disbursement.period_end}`].usd?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        {(disbursement as any).exchange_rate_manual && (
                                          <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 h-4 bg-orange-50 text-orange-600 border-orange-200">Manual</Badge>
                                        )}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <div>
                                        <div>Original: {disbursement.amount} {disbursement.currency}</div>
                                        <div>Rate: {usdValues[disbursement.id || `${disbursement.period_start}-${disbursement.period_end}`].rate}</div>
                                        <div>Date: {usdValues[disbursement.id || `${disbursement.period_start}-${disbursement.period_end}`].date}</div>
                                        {(disbursement as any).exchange_rate_manual && <div className="text-orange-500 font-medium">Manually entered rate</div>}
                                      </div>
                                    </TooltipContent>
                                  </UITooltip>
                                </TooltipProvider>
                              ) : (
                                <div className="flex items-center gap-1">
                                  {usdValues[disbursement.id || `${disbursement.period_start}-${disbursement.period_end}`]?.error ? (
                                    <span className="text-sm text-red-500">
                                      {usdValues[disbursement.id || `${disbursement.period_start}-${disbursement.period_end}`].error}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
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
                          {!readOnly && (
                            <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={isReadOnly}>
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
                                    onClick={() => setDeleteConfirmId(disbursement.id || '')}
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
                          )}
                        </TableRow>
                        
                        {/* Expandable Detail Row */}
                        {isExpanded && (
                          <TableRow className="bg-muted/20 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                            <TableCell colSpan={readOnly ? 7 : 8} className="py-4 px-6 relative">
                              {/* CSV Export Button */}
                              <div className="absolute top-4 right-4 z-10">
                                <TooltipProvider>
                                  <UITooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                        onClick={() => handleExportDisbursement(disbursement)}
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Export to CSV</p>
                                    </TooltipContent>
                                  </UITooltip>
                                </TooltipProvider>
                              </div>
                              <div className="space-y-3 text-sm">
                                {/* Disbursement Details */}
                                <div className="grid grid-cols-2 gap-x-12 gap-y-3">
                                  <div>
                                    <span className="text-muted-foreground text-xs min-w-[160px]">Status:</span>
                                    <span className="ml-2 font-medium text-xs capitalize">{disbursement.status || 'Original'}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground text-xs min-w-[160px]">Period Start:</span>
                                    <span className="ml-2 text-xs">{format(parseISO(disbursement.period_start), 'MMM d, yyyy')}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground text-xs min-w-[160px]">Period End:</span>
                                    <span className="ml-2 text-xs">{format(parseISO(disbursement.period_end), 'MMM d, yyyy')}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground text-xs min-w-[160px]">Original Amount:</span>
                                    <span className="ml-2 font-medium text-xs">{disbursement.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {disbursement.currency}</span>
                                  </div>
                                  {disbursement.value_date && (
                                    <div>
                                      <span className="text-muted-foreground text-xs min-w-[160px]">Value Date:</span>
                                      <span className="ml-2 text-xs">{format(parseISO(disbursement.value_date), 'MMM d, yyyy')}</span>
                                    </div>
                                  )}
                                  {disbursement.usdAmount && (
                                    <div>
                                      <span className="text-muted-foreground text-xs min-w-[160px]">USD Value:</span>
                                      <span className="ml-2 font-medium text-xs"><span className="text-muted-foreground">USD</span> {disbursement.usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Organizations */}
                                {(disbursement.provider_org_name || disbursement.receiver_org_name) && (
                                  <div className="border-t pt-3 mt-3">
                                    <div className="text-xs text-muted-foreground font-semibold mb-2">Organisations:</div>
                                    <div className="grid grid-cols-2 gap-x-12 gap-y-3 ml-4">
                                      {disbursement.provider_org_name && (
                                        <>
                                          <div>
                                            <span className="text-muted-foreground text-xs min-w-[160px]">Provider Organisation:</span>
                                            <span className="ml-2 text-xs font-medium">{disbursement.provider_org_name}</span>
                                          </div>
                                          {disbursement.provider_org_ref && (
                                            <div className="flex items-center gap-1">
                                              <span className="text-muted-foreground text-xs min-w-[160px]">Provider Reference:</span>
                                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded break-all">{disbursement.provider_org_ref}</span>
                                              <Button variant="ghost" size="sm" className="h-4 w-4 p-0 flex-shrink-0" onClick={() => navigator.clipboard.writeText(disbursement.provider_org_ref!)}>
                                                <Copy className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          )}
                                        </>
                                      )}
                                      {disbursement.receiver_org_name && (
                                        <>
                                          <div>
                                            <span className="text-muted-foreground text-xs min-w-[160px]">Receiver Organisation:</span>
                                            <span className="ml-2 text-xs font-medium">{disbursement.receiver_org_name}</span>
                                          </div>
                                          {disbursement.receiver_org_ref && (
                                            <div className="flex items-center gap-1">
                                              <span className="text-muted-foreground text-xs min-w-[160px]">Receiver Reference:</span>
                                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded break-all">{disbursement.receiver_org_ref}</span>
                                              <Button variant="ghost" size="sm" className="h-4 w-4 p-0 flex-shrink-0" onClick={() => navigator.clipboard.writeText(disbursement.receiver_org_ref!)}>
                                                <Copy className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Notes */}
                                {disbursement.notes && (
                                  <div className="border-t pt-3 mt-3">
                                    <div className="text-xs text-muted-foreground font-semibold mb-2">Notes:</div>
                                    <p className="ml-4 text-gray-700 text-xs leading-relaxed">{disbursement.notes}</p>
                                  </div>
                                )}
                                
                                {/* System Info */}
                                <div className="border-t pt-3 mt-3">
                                  <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-xs">
                                    {disbursement.id && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground min-w-[160px]">Disbursement ID:</span>
                                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded break-all">{disbursement.id}</span>
                                        <Button variant="ghost" size="sm" className="h-4 w-4 p-0 flex-shrink-0" onClick={() => navigator.clipboard.writeText(disbursement.id!)}>
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    )}
                                    {disbursement.created_at && (
                                      <div>
                                        <span className="text-muted-foreground min-w-[160px]">Created:</span>
                                        <span className="ml-2">{format(parseISO(disbursement.created_at), 'MMM d, yyyy')}</span>
                                      </div>
                                    )}
                                    {disbursement.updated_at && (
                                      <div>
                                        <span className="text-muted-foreground min-w-[160px]">Updated:</span>
                                        <span className="ml-2">{format(parseISO(disbursement.updated_at), 'MMM d, yyyy')}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        </React.Fragment>
                      );
                    })}
                    {/* Total Row */}
                    {sortedFilteredDisbursements.length > 0 && (
                      <TableRow className="bg-slate-50 border-t-2 border-slate-300 font-semibold">
                        <TableCell colSpan={readOnly ? 6 : 7} className="py-3 px-4 text-right">
                          Total:
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                          <span className="font-semibold">
                            <span className="text-muted-foreground">USD</span>{' '}
                            {Object.values(usdValues)
                              .reduce((sum, val) => sum + (val.usd || 0), 0)
                              .toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </TableCell>
                        {!readOnly && (
                          <TableCell className="py-3 px-4"></TableCell>
                        )}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination Controls */}
              {disbursements.length > itemsPerPage && (
                <div className="flex items-center justify-between mt-4 px-2">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedFilteredDisbursements.length)} of {sortedFilteredDisbursements.length} planned disbursements
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      Last
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

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
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalDisbursement?.id ? 'Edit Planned Disbursement' : 'Add Planned Disbursement'}</DialogTitle>
            <DialogDescription>
              Fill in all required fields for this planned disbursement.
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
                  value={isAmountFocused ? amountInputValue : (modalDisbursement?.amount && modalDisbursement.amount > 0 ? modalDisbursement.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '')}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAmountInputValue(value);
                    // Remove all non-numeric characters except decimal point
                    const rawValue = value.replace(/[^\d.]/g, '');
                    const numericValue = parseFloat(rawValue) || 0;
                    updateFormField('amount', numericValue);
                  }}
                  onFocus={() => {
                    setIsAmountFocused(true);
                    // Show raw number without formatting when focused
                    if (modalDisbursement?.amount && modalDisbursement.amount > 0) {
                      setAmountInputValue(modalDisbursement.amount.toString());
                    } else {
                      setAmountInputValue('');
                    }
                  }}
                  onBlur={() => {
                    setIsAmountFocused(false);
                    // Format the value on blur
                    if (modalDisbursement?.amount && modalDisbursement.amount > 0) {
                      setAmountInputValue(modalDisbursement.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                    } else {
                      setAmountInputValue('');
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

            {/* USD Conversion Section */}
            {modalDisbursement?.currency && modalDisbursement.currency !== 'USD' && (
              <div className="border border-green-200 bg-green-50/50 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <Label className="text-sm font-medium">USD Conversion</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {modalExchangeRateManual ? 'Manual' : 'API Rate'}
                    </span>
                    <Switch 
                      checked={!modalExchangeRateManual}
                      onCheckedChange={(checked) => {
                        setModalExchangeRateManual(!checked);
                        if (checked) {
                          fetchModalExchangeRate();
                        }
                      }}
                    />
                    {modalExchangeRateManual ? (
                      <Unlock className="h-4 w-4 text-orange-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {modalExchangeRateManual 
                    ? 'Enter your own exchange rate below'
                    : 'Exchange rate is automatically fetched based on value date'
                  }
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm">
                      Exchange Rate
                      {!modalExchangeRateManual && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={fetchModalExchangeRate}
                          disabled={isLoadingModalRate}
                        >
                          <RefreshCw className={`h-3 w-3 ${isLoadingModalRate ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.000001"
                        value={modalExchangeRate || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          setModalExchangeRate(isNaN(value) ? null : value);
                        }}
                        disabled={!modalExchangeRateManual || isLoadingModalRate}
                        className={!modalExchangeRateManual ? 'bg-gray-100' : ''}
                        placeholder={isLoadingModalRate ? 'Loading...' : 'Enter rate'}
                      />
                      {isLoadingModalRate && (
                        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {modalExchangeRate && (
                      <p className="text-xs text-muted-foreground">
                        1 {modalDisbursement.currency} = {modalExchangeRate.toFixed(6)} USD
                      </p>
                    )}
                    {modalRateError && (
                      <p className="text-xs text-red-500">{modalRateError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">USD Value</Label>
                    <div className="h-10 px-3 py-2 border rounded-md bg-gray-100 flex items-center font-medium text-green-700">
                      {modalCalculatedUsdValue !== null ? (
                        <>$ {modalCalculatedUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Calculated from {modalDisbursement.currency} {modalDisbursement.amount?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                onLegacyTypeDetected={orgTypeMappingModal.openModal}
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
                onLegacyTypeDetected={orgTypeMappingModal.openModal}
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
            </div>

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

      {/* Delete Confirmation Sheet */}
      <Sheet open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <SheetContent side="bottom" className="max-w-md mx-auto">
          <SheetHeader>
            <SheetTitle>Delete Planned Disbursement</SheetTitle>
            <SheetDescription>
              Are you sure you want to delete this planned disbursement? This action cannot be undone.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="flex-1"
            >
              Delete Disbursement
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Bulk Action Toolbar - appears from bottom when items selected */}
      <BulkActionToolbar
        selectedCount={selectedDisbursementIds.size}
        itemType="transactions"
        onDelete={confirmBulkDelete}
        onCancel={() => setSelectedDisbursementIds(new Set())}
        isDeleting={isBulkDeleting}
      />

      {/* Organization Type Mapping Modal for legacy type codes */}
      <OrgTypeMappingModal
        isOpen={orgTypeMappingModal.isOpen}
        onClose={orgTypeMappingModal.closeModal}
        organization={orgTypeMappingModal.targetOrg}
        onSave={handleOrgTypeUpdate}
      />

    </div>
  );
}
