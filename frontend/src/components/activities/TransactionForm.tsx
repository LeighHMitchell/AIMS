"use client"

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Calendar, DollarSign, Building2, Globe, Tag, Info, X, CheckCircle, Loader2, AlertTriangle, Lock, Unlock, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { fixedCurrencyConverter } from "@/lib/currency-converter-fixed";
import { format } from "date-fns";
import { OrganizationCombobox } from "@/components/ui/organization-combobox";
import { ActivityCombobox } from "@/components/ui/activity-combobox";
import { 
  Transaction, 
  TransactionType, 
  TRANSACTION_TYPE_LABELS,
  TransactionFormData,
  DISBURSEMENT_CHANNEL_LABELS,
  FLOW_TYPE_LABELS,
  TIED_STATUS_LABELS,
  TransactionStatus
} from '@/types/transaction';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from "sonner";
import { 
  showTransactionSuccess, 
  showTransactionError, 
  showValidationError, 
  showFieldSaveSuccess,
  TRANSACTION_TOAST_IDS 
} from '@/lib/toast-manager';
import { CopyField } from '@/components/ui/copy-field';

// Common currencies
const COMMON_CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'KHR', name: 'Cambodian Riel' },
  { code: 'MMK', name: 'Myanmar Kyat' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'VND', name: 'Vietnamese Dong' },
];

// Aid types (sample - should be loaded from a comprehensive list)
const AID_TYPES = [
  { code: 'A01', name: 'General budget support' },
  { code: 'A02', name: 'Sector budget support' },
  { code: 'B01', name: 'Core support to NGOs, other private bodies, PPPs' },
  { code: 'B02', name: 'Core contributions to multilateral institutions' },
  { code: 'C01', name: 'Project-type interventions' },
  { code: 'D01', name: 'Donor country personnel' },
  { code: 'D02', name: 'Other technical assistance' },
  { code: 'E01', name: 'Scholarships/training in donor country' },
  { code: 'F01', name: 'Debt relief' },
  { code: 'G01', name: 'Administrative costs' },
];

// Finance types (sample)
const FINANCE_TYPES = [
  { code: '110', name: 'Standard grant' },
  { code: '210', name: 'Interest subsidy' },
  { code: '410', name: 'Aid loan excluding debt reorganisation' },
  { code: '510', name: 'Debt forgiveness: ODA claims' },
  { code: '600', name: 'Debt rescheduling: ODA claims' },
];

interface Organization {
  id: string;
  name: string;
  type?: string;
  ref?: string; // IATI identifier
  iati_org_id?: string;
}

interface TransactionFormProps {
  transaction?: Transaction;
  organizations?: Organization[];
  onSubmit: (data: TransactionFormData) => void;
  onCancel: () => void;
  defaultCurrency?: string;
  defaultFinanceType?: string;
  defaultAidType?: string;
  defaultTiedStatus?: string;
  defaultFlowType?: string;
  activityId: string;
}

export default function TransactionForm({
  transaction,
  organizations = [],
  onSubmit,
  onCancel,
  defaultCurrency = 'USD',
  defaultFinanceType,
  defaultAidType,
  defaultTiedStatus,
  defaultFlowType,
  activityId
}: TransactionFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [transactionTypePopoverOpen, setTransactionTypePopoverOpen] = useState(false);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  
  // Exchange rate state
  const [exchangeRateManual, setExchangeRateManual] = useState(transaction?.exchange_rate_manual ?? false);
  const [exchangeRateUsed, setExchangeRateUsed] = useState<number | null>(transaction?.exchange_rate_used ?? null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);
  
  // Debug logging to see what transaction data we're getting
  useEffect(() => {
    if (transaction) {
      console.log('[TransactionForm] Editing transaction:', transaction);
    }
  }, [transaction]);
  
  // Helper function to format date for input field
  const formatDateForInput = (dateString?: string | null): string => {
    if (!dateString) return format(new Date(), 'yyyy-MM-dd');
    try {
      const date = new Date(dateString);
      return format(date, 'yyyy-MM-dd');
    } catch {
      return format(new Date(), 'yyyy-MM-dd');
    }
  };

  // Fetch exchange rate from API
  const fetchExchangeRate = async () => {
    const currency = formData.currency;
    if (!currency || currency === 'USD') {
      setExchangeRateUsed(1);
      setRateError(null);
      return;
    }

    const valueDate = formData.value_date || formData.transaction_date;
    if (!valueDate) {
      setRateError('Please set a transaction date first');
      return;
    }

    setIsLoadingRate(true);
    setRateError(null);

    try {
      const result = await fixedCurrencyConverter.convertToUSD(
        1, // Just get the rate for 1 unit
        currency,
        new Date(valueDate)
      );

      if (result.success && result.exchange_rate) {
        setExchangeRateUsed(result.exchange_rate);
        setRateError(null);
        console.log(`[TransactionForm] Fetched exchange rate: 1 ${currency} = ${result.exchange_rate} USD`);
      } else {
        setRateError(result.error || 'Failed to fetch exchange rate');
        setExchangeRateUsed(null);
      }
    } catch (err) {
      console.error('[TransactionForm] Error fetching exchange rate:', err);
      setRateError('Failed to fetch exchange rate');
      setExchangeRateUsed(null);
    } finally {
      setIsLoadingRate(false);
    }
  };

  // Calculate USD value
  const calculatedUsdValue = formData.value && exchangeRateUsed 
    ? Math.round(formData.value * exchangeRateUsed * 100) / 100 
    : null;

  // Auto-fetch exchange rate when currency or date changes (only if not manual)
  useEffect(() => {
    if (!exchangeRateManual && formData.currency && formData.currency !== 'USD') {
      const valueDate = formData.value_date || formData.transaction_date;
      if (valueDate) {
        fetchExchangeRate();
      }
    } else if (formData.currency === 'USD') {
      setExchangeRateUsed(1);
      setRateError(null);
    }
  }, [formData.currency, formData.value_date, formData.transaction_date, exchangeRateManual]);

  // Initialize exchange rate from transaction when editing
  useEffect(() => {
    if (transaction) {
      setExchangeRateManual(transaction.exchange_rate_manual ?? false);
      setExchangeRateUsed(transaction.exchange_rate_used ?? null);
    }
  }, [transaction]);

  // Helper function to find organization ID by IATI reference
  const findOrgIdByRef = (ref: string) => {
    if (!ref) return '';
    const org = organizations.find(org => 
      org.iati_org_id === ref || 
      org.ref === ref
    );
    return org?.id || '';
  };
  
  const [formData, setFormData] = useState<TransactionFormData>({
    transaction_type: transaction?.transaction_type || '3', // Default to Disbursement
    transaction_date: formatDateForInput(transaction?.transaction_date),
    value: transaction?.value ?? 0, // Use ?? to handle 0 values correctly
    currency: transaction?.currency || defaultCurrency,
    status: transaction?.status || 'draft',
    description: transaction?.description || '',
    
    // Provider - map from ref to org id if needed
    provider_org_id: transaction?.provider_org_id || findOrgIdByRef(transaction?.provider_org_ref || ''),
    provider_org_name: transaction?.provider_org_name || '',
    provider_org_ref: transaction?.provider_org_ref || '',
    provider_org_type: transaction?.provider_org_type || undefined,
    provider_org_activity_id: transaction?.provider_org_activity_id || '',
    provider_activity_uuid: transaction?.provider_activity_uuid || '',
    
    // Receiver - map from ref to org id if needed
    receiver_org_id: transaction?.receiver_org_id || findOrgIdByRef(transaction?.receiver_org_ref || ''),
    receiver_org_name: transaction?.receiver_org_name || '',
    receiver_org_ref: transaction?.receiver_org_ref || '',
    receiver_org_type: transaction?.receiver_org_type || undefined,
    receiver_org_activity_id: transaction?.receiver_org_activity_id || '',
    receiver_activity_uuid: transaction?.receiver_activity_uuid || '',
    
    // Advanced fields
    value_date: transaction?.value_date ? formatDateForInput(transaction.value_date) : '',
    transaction_reference: transaction?.transaction_reference || '',
    disbursement_channel: transaction?.disbursement_channel || undefined,
    sector_code: transaction?.sector_code || '',
    recipient_country_code: transaction?.recipient_country_code || '',
    flow_type: (transaction?.flow_type || defaultFlowType || '') as any,
    finance_type: (transaction?.finance_type || defaultFinanceType || undefined) as any,
    aid_type: transaction?.aid_type || defaultAidType || '',
    tied_status: (transaction?.tied_status || defaultTiedStatus || undefined) as any,
    financing_classification: transaction?.financing_classification || '',
    is_humanitarian: transaction?.is_humanitarian ?? false,
  });

  // Update form data when transaction prop changes
  useEffect(() => {
    if (transaction) {
      console.log('[TransactionForm] Updating form with transaction:', {
        id: transaction.id,
        value: transaction.value,
        currency: transaction.currency,
        transaction_type: transaction.transaction_type,
        transaction_date: transaction.transaction_date,
        status: transaction.status,
        provider_org_name: transaction.provider_org_name,
        receiver_org_name: transaction.receiver_org_name
      });
      
      setFormData({
        transaction_type: transaction.transaction_type || '3',
        transaction_date: formatDateForInput(transaction.transaction_date),
        value: transaction.value ?? 0,
        currency: transaction.currency || defaultCurrency,
        status: transaction.status || 'draft',
        description: transaction.description || '',
        
        // Provider - map from ref to org id if needed
        provider_org_id: transaction.provider_org_id || findOrgIdByRef(transaction.provider_org_ref || ''),
        provider_org_name: transaction.provider_org_name || '',
        provider_org_ref: transaction.provider_org_ref || '',
        provider_org_type: transaction.provider_org_type || undefined,
        provider_org_activity_id: transaction.provider_org_activity_id || '',
        provider_activity_uuid: transaction.provider_activity_uuid || '',
        
        // Receiver - map from ref to org id if needed
        receiver_org_id: transaction.receiver_org_id || findOrgIdByRef(transaction.receiver_org_ref || ''),
        receiver_org_name: transaction.receiver_org_name || '',
        receiver_org_ref: transaction.receiver_org_ref || '',
        receiver_org_type: transaction.receiver_org_type || undefined,
        receiver_org_activity_id: transaction.receiver_org_activity_id || '',
        receiver_activity_uuid: transaction.receiver_activity_uuid || '',
        
        // Advanced fields
        value_date: transaction.value_date ? formatDateForInput(transaction.value_date) : '',
        transaction_reference: transaction.transaction_reference || '',
        disbursement_channel: transaction.disbursement_channel || undefined,
        sector_code: transaction.sector_code || '',
        recipient_country_code: transaction.recipient_country_code || '',
        flow_type: transaction.flow_type || undefined,
        finance_type: transaction.finance_type || undefined,
        aid_type: transaction.aid_type || '',
        tied_status: transaction.tied_status || undefined,
        financing_classification: transaction.financing_classification || '',
        is_humanitarian: transaction.is_humanitarian ?? false,
      });
    }
  }, [transaction, defaultCurrency]);

  // Add getTransactionPayload helper before handleSubmit
  const getTransactionPayload = (formData: Partial<TransactionFormData>, organizations: any[]) => {
    // List of allowed fields in the DB schema
    const allowed = [
      'id', 'uuid', 'activity_id', 'transaction_type', 'transaction_date', 'value', 'currency', 'status',
      'transaction_reference', 'value_date', 'description',
      'provider_org_id', 'provider_org_type', 'provider_org_ref', 'provider_org_name',
      'receiver_org_id', 'receiver_org_type', 'receiver_org_ref', 'receiver_org_name',
      'disbursement_channel', 'flow_type', 'finance_type', 'aid_type', 'tied_status',
      'sector_code', 'sector_vocabulary', 'recipient_country_code', 'recipient_region_code', 'recipient_region_vocab',
      'financing_classification', 'is_humanitarian'
    ];
    const payload: any = {};
    for (const key of allowed) {
      const value = formData[key as keyof TransactionFormData];
      // Include field if it exists and is not undefined (empty strings are valid)
      if (value !== undefined) {
        payload[key] = value;
      }
    }
    
    // Add exchange rate fields
    if (exchangeRateManual !== undefined) {
      payload.exchange_rate_manual = exchangeRateManual;
    }
    if (exchangeRateUsed !== null) {
      payload.exchange_rate_used = exchangeRateUsed;
      // Calculate and include the USD value
      if (formData.value && exchangeRateUsed) {
        payload.value_usd = Math.round(formData.value * exchangeRateUsed * 100) / 100;
      }
    }
    // Set organization details when org is selected
    if (payload.provider_org_id) {
      const org = organizations.find((o: any) => o.id === payload.provider_org_id);
      if (org) {
        payload.provider_org_name = org.acronym || org.name || '';
        payload.provider_org_type = org.type || '';
        payload.provider_org_ref = org.iati_org_id || '';
      }
    }
    if (payload.receiver_org_id) {
      const org = organizations.find((o: any) => o.id === payload.receiver_org_id);
      if (org) {
        payload.receiver_org_name = org.acronym || org.name || '';
        payload.receiver_org_type = org.type || '';
        payload.receiver_org_ref = org.iati_org_id || '';
      }
    }
    return payload;
  };

  // Add unique transaction_reference check (in-memory, for now)
  const [allTransactionReferences, setAllTransactionReferences] = useState<string[]>([]);

  useEffect(() => {
    // If you have access to all transactions, setAllTransactionReferences([...]) here
    // For now, this is a placeholder; ideally, pass as prop or fetch from parent
  }, []);

  const validateTransaction = (data: Partial<TransactionFormData>): string | null => {
    if (!data.transaction_type) return 'Transaction type is required.';
    if (!data.transaction_date) return 'Transaction date is required.';
    if (!data.value || isNaN(Number(data.value)) || Number(data.value) <= 0) return 'Transaction value must be greater than 0.';
    if (!data.currency) return 'Currency is required.';
    if (!data.provider_org_id) return 'Provider organization is required.';
    if (!data.receiver_org_id) return 'Receiver organization is required.';
    if (data.transaction_reference) {
      // Check for duplicate reference (case-insensitive)
      const ref = data.transaction_reference.trim().toLowerCase();
      if (allTransactionReferences.filter(r => r && r.trim().toLowerCase() === ref).length > (transaction ? 1 : 0)) {
        return 'Transaction reference must be unique.';
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submissionData = getTransactionPayload(formData, organizations);
    const validationError = validateTransaction(submissionData);
    
    if (validationError) {
      const isDuplicateReference = validationError.includes('reference must be unique');
      showValidationError(validationError, {
        isDuplicateReference,
        onClearReference: isDuplicateReference ? () => {
          setFormData(prev => ({ ...prev, transaction_reference: '' }));
        } : undefined
      });
      return;
    }
    
    try {
      let response;
      if (transaction && transaction.uuid) {
        // Update existing transaction
        response = await fetch(`/api/activities/${activityId}/transactions/${transaction.uuid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionData)
        });
      } else {
        // Create new transaction
        response = await fetch(`/api/activities/${activityId}/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionData)
        });
      }
      
      if (!response.ok) {
        const error = await response.json();
        
        if (error.error && error.error.includes('unique') && error.error.includes('transaction_reference')) {
          showValidationError('Transaction reference already exists. Please provide a unique reference or leave blank for auto-generation.', {
            isDuplicateReference: true,
            onClearReference: () => {
              setFormData(prev => ({ ...prev, transaction_reference: '' }));
            }
          });
        } else if (error.error && error.error.includes('required')) {
          showTransactionError('A required field is missing.');
        } else {
          showTransactionError(error.error || 'Failed to save transaction');
        }
        return;
      }
      
      showTransactionSuccess(transaction ? 'Transaction updated successfully' : 'Transaction added successfully');
      onSubmit(submissionData);
    } catch (e: any) {
      showTransactionError(e.message || 'Failed to save transaction');
    }
  };

  // Update organization fields when selection changes
  const handleProviderOrgChange = (orgId: string) => {
    const org = organizations.find((o: any) => o.id === orgId);
    setFormData(prev => ({
      ...prev,
      provider_org_id: orgId,
      provider_org_name: (org && (org as any).acronym) ? (org as any).acronym : org?.name || '',
      provider_org_ref: org?.iati_org_id || org?.ref || ''
    }));
  };

  const handleReceiverOrgChange = (orgId: string) => {
    const org = organizations.find((o: any) => o.id === orgId);
    setFormData(prev => ({
      ...prev,
      receiver_org_id: orgId,
      receiver_org_name: (org && (org as any).acronym) ? (org as any).acronym : org?.name || '',
      receiver_org_ref: org?.iati_org_id || org?.ref || ''
    }));
  };

  const saveField = async (field: string, value: any) => {
    setFieldStatus((prev) => ({ ...prev, [field]: "saving" }));
    if (!transaction || !transaction.id) {
      // New transaction: just update local state and show icons, do not call API
      setTimeout(() => {
        setFieldStatus((prev) => ({ ...prev, [field]: "saved" }));
        showFieldSaveSuccess(field, { debounceMs: 500 });
      }, 500);
      return;
    }
    try {
      // Existing transaction: call API
      await fetch(`/api/activities/${activityId}/transactions/${transaction.id}/field`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      setFieldStatus((prev) => ({ ...prev, [field]: "saved" }));
      showFieldSaveSuccess(field);
    } catch (e) {
      setFieldStatus((prev) => ({ ...prev, [field]: "error" }));
      // Don't show field-level errors as toasts - the visual indicator is enough
      console.error(`Failed to update ${field}:`, e);
    }
  };

  // Helper to render icon
  const renderFieldIcon = (field: string) => {
    if (fieldStatus[field] === "saving") return <Loader2 className="inline h-4 w-4 text-orange-500 animate-spin ml-2" />;
    if (fieldStatus[field] === "saved") return <CheckCircle className="inline h-4 w-4 text-green-500 ml-2" />;
    if (fieldStatus[field] === "error") return <AlertTriangle className="inline h-4 w-4 text-red-500 ml-2" />;
    return null;
  };

  // Get transaction type info for display
  const getTransactionTypeInfo = (type: TransactionType) => {
    const incomingTypes = ['1', '12']; // Incoming Commitment, Incoming Funds
    const isIncoming = incomingTypes.includes(type);
    return {
      label: TRANSACTION_TYPE_LABELS[type],
      isIncoming,
      color: isIncoming ? 'text-green-600' : 'text-blue-600',
      bgColor: isIncoming ? 'bg-green-50' : 'bg-blue-50'
    };
  };

  const typeInfo = getTransactionTypeInfo(formData.transaction_type);

  // Transaction type options for grouping
  const COMMONLY_USED_TRANSACTION_TYPES = [
    { code: '3', label: 'Disbursement' },
    { code: '2', label: 'Outgoing Commitment' },
    { code: '4', label: 'Expenditure' },
    { code: '12', label: 'Incoming Funds' },
  ];
  const ALL_TRANSACTION_TYPES = [
    { code: '1', label: 'Incoming Commitment' },
    { code: '2', label: 'Outgoing Commitment' },
    { code: '3', label: 'Disbursement' },
    { code: '4', label: 'Expenditure' },
    { code: '5', label: 'Interest Payment' },
    { code: '6', label: 'Loan Repayment' },
    { code: '7', label: 'Reimbursement' },
    { code: '8', label: 'Purchase of Equity' },
    { code: '9', label: 'Sale of Equity' },
    { code: '10', label: 'Credit Guarantee' },
    { code: '11', label: 'Incoming Commitment Adjustment' },
    { code: '12', label: 'Incoming Funds' },
    { code: '13', label: 'Outgoing Commitment Adjustment' },
    { code: '14', label: 'Disbursement Adjustment' },
    { code: '15', label: 'Expenditure Adjustment' },
    { code: '16', label: 'Interest Payment Adjustment' },
    { code: '17', label: 'Loan Repayment Adjustment' },
    { code: '18', label: 'Reimbursement Adjustment' },
    { code: '19', label: 'Purchase of Equity Adjustment' },
    { code: '20', label: 'Sale of Equity Adjustment' },
    { code: '21', label: 'Credit Guarantee Adjustment' },
  ];
  const OTHER_TRANSACTION_TYPES = ALL_TRANSACTION_TYPES.filter(
    t => !COMMONLY_USED_TRANSACTION_TYPES.some(cu => cu.code === t.code)
  );

  // Transaction status options
  const TRANSACTION_STATUS_OPTIONS = [
    { code: '1', status: 'draft', description: 'Initial state; not yet submitted' },
    { code: '2', status: 'submitted', description: 'Submitted for review; awaiting validation' },
    { code: '3', status: 'validated', description: 'Reviewed and confirmed by an authorised reviewer' },
    { code: '4', status: 'rejected', description: 'Returned with issues or corrections required' },
    { code: '5', status: 'published', description: 'Finalised and publicly available in the system' },
  ];

  // Field status state
  const [fieldStatus, setFieldStatus] = useState<{ [key: string]: "saving" | "saved" | "error" | undefined }>({});

  // Set green tick for all pre-populated fields on mount (new or existing transaction)
  useEffect(() => {
    // Set green tick for all pre-populated fields
    const initialStatus: { [key: string]: "saved" } = {};
    Object.entries(formData).forEach(([key, value]) => {
      if (value !== undefined && value !== "" && value !== null) {
        initialStatus[key] = "saved";
      }
    });
    setFieldStatus(initialStatus);
    // eslint-disable-next-line
  }, [transaction, formData]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {transaction ? 'Edit Transaction' : 'New Transaction'}
          </CardTitle>
          <CardDescription>
            Enter transaction details following IATI standards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Transaction Type */}
            <div className="space-y-2">
              <Label htmlFor="transaction_type">
                Transaction Type <span className="text-red-500">*</span>
              </Label>
              <Popover open={transactionTypePopoverOpen} onOpenChange={setTransactionTypePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={transactionTypePopoverOpen}
                    className="w-full justify-between font-normal"
                  >
                    {(() => {
                      const selected = [...COMMONLY_USED_TRANSACTION_TYPES, ...ALL_TRANSACTION_TYPES].find(
                        t => t.code === formData.transaction_type
                      );
                      return selected ? (
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-gray-100 px-1 rounded">{selected.code}</span>
                          <span>{selected.label}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">Select transaction type...</span>
                      );
                    })()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0">
                  <Command>
                    <CommandInput placeholder="Search transaction type..." autoFocus />
                    <CommandList>
                      <CommandGroup>
                        {COMMONLY_USED_TRANSACTION_TYPES.map(option => (
                          <CommandItem
                            key={option.code}
                            onSelect={() => {
                              setFormData({ ...formData, transaction_type: option.code as TransactionType });
                              setTransactionTypePopoverOpen(false);
                            }}
                            className="flex items-center gap-2"
                          >
                            <span className="font-mono text-xs bg-gray-100 px-1 rounded">{option.code}</span>
                            <span>{option.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandGroup>
                        {ALL_TRANSACTION_TYPES.filter(
                          t => !COMMONLY_USED_TRANSACTION_TYPES.some(cu => cu.code === t.code)
                        ).map(option => (
                          <CommandItem
                            key={option.code}
                            onSelect={() => {
                              setFormData({ ...formData, transaction_type: option.code as TransactionType });
                              setTransactionTypePopoverOpen(false);
                            }}
                            className="flex items-center gap-2"
                          >
                            <span className="font-mono text-xs bg-gray-100 px-1 rounded">{option.code}</span>
                            <span>{option.label}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Badge variant="outline" className={`w-fit ${typeInfo.bgColor} ${typeInfo.color}`}>
                {typeInfo.isIncoming ? 'Incoming' : 'Outgoing'} Transaction
              </Badge>
            </div>

            {/* Transaction Date */}
            <div className="space-y-2">
              <Label htmlFor="transaction_date">
                Transaction Date <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="transaction_date"
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                  onBlur={async (e) => {
                    if (transaction && formData.transaction_date !== transaction.transaction_date) {
                      await saveField("transaction_date", formData.transaction_date);
                    }
                  }}
                  className="pl-10"
                  required
                />
                {renderFieldIcon("transaction_date")}
              </div>
            </div>

            {/* Value */}
            <div className="space-y-2">
              <Label htmlFor="value">
                Value <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: parseFloat(e.target.value) || 0 }))}
                  onBlur={async (e) => {
                    if (transaction && formData.value !== transaction.value) {
                      await saveField("value", formData.value);
                    }
                  }}
                  className="pl-10"
                  required
                />
                {renderFieldIcon("value")}
              </div>
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label htmlFor="currency">
                Currency <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.currency}
                onValueChange={async (value) => {
                  setFormData(prev => ({ ...prev, currency: value }));
                  if (transaction && value !== transaction.currency) {
                    await saveField("currency", value);
                  }
                }}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_CURRENCIES.map(curr => (
                    <SelectItem key={curr.code} value={curr.code}>
                      <span className="font-mono text-xs mr-2">{curr.code}</span>
                      {curr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {renderFieldIcon("currency")}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">
                Transaction Status <span className="text-red-500">*</span>
              </Label>
              <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 bg-gray-100">
                <span className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {formData.status === 'actual' ? '1' : '2'}
                  </span>
                  <span className="font-medium">
                    {formData.status === 'actual' ? 'Validated' : 'Unvalidated'}
                  </span>
                </span>
              </div>
            </div>

            {/* Value Date (optional) */}
            <div className="space-y-2">
              <Label htmlFor="value_date">
                Value Date
                <span className="text-gray-500 text-xs ml-2">(optional)</span>
              </Label>
              <Input
                id="value_date"
                type="date"
                value={formData.value_date || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, value_date: e.target.value }))}
                onBlur={async (e) => {
                  if (transaction && formData.value_date !== transaction.value_date) {
                    await saveField("value_date", formData.value_date);
                  }
                }}
              />
              {renderFieldIcon("value_date")}
            </div>
          </div>

          {/* USD Conversion Section */}
          {formData.currency && formData.currency !== 'USD' && (
            <Card className="border border-green-200 bg-green-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    USD Conversion
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {exchangeRateManual ? 'Manual' : 'API Rate'}
                    </span>
                    <Switch 
                      checked={!exchangeRateManual}
                      onCheckedChange={(checked) => {
                        setExchangeRateManual(!checked);
                        if (checked) {
                          // Switching to API rate - fetch fresh rate
                          fetchExchangeRate();
                        }
                      }}
                    />
                    {exchangeRateManual ? (
                      <Unlock className="h-4 w-4 text-orange-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>
                <CardDescription className="text-xs">
                  {exchangeRateManual 
                    ? 'Enter your own exchange rate below'
                    : 'Exchange rate is automatically fetched based on value date'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Exchange Rate */}
                  <div className="space-y-2">
                    <Label htmlFor="exchange_rate" className="flex items-center gap-2">
                      Exchange Rate
                      {!exchangeRateManual && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={fetchExchangeRate}
                          disabled={isLoadingRate}
                        >
                          <RefreshCw className={`h-3 w-3 ${isLoadingRate ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        id="exchange_rate"
                        type="number"
                        step="0.000001"
                        value={exchangeRateUsed || ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          setExchangeRateUsed(isNaN(value) ? null : value);
                        }}
                        disabled={!exchangeRateManual || isLoadingRate}
                        className={!exchangeRateManual ? 'bg-gray-100' : ''}
                        placeholder={isLoadingRate ? 'Loading...' : 'Enter rate'}
                      />
                      {isLoadingRate && (
                        <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {exchangeRateUsed && (
                      <p className="text-xs text-muted-foreground">
                        1 {formData.currency} = {exchangeRateUsed.toFixed(6)} USD
                      </p>
                    )}
                    {rateError && (
                      <p className="text-xs text-red-500">{rateError}</p>
                    )}
                  </div>

                  {/* Calculated USD Value */}
                  <div className="space-y-2">
                    <Label>USD Value</Label>
                    <div className="h-10 px-3 py-2 border rounded-md bg-gray-100 flex items-center font-medium text-green-700">
                      {calculatedUsdValue !== null ? (
                        <>$ {calculatedUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Calculated from {formData.currency} {formData.value?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}



          {/* Organizations Section */}
          <div className="space-y-8"> {/* Add more whitespace between cards */}
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organizations
            </h3>
            
            {/* Provider Organization */}
            <Card className="border-dashed bg-gray-50">
              <CardHeader className="pb-3 border-b border-gray-200">
                <CardTitle className="text-sm">Provider Organization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <OrganizationCombobox
                  organizations={organizations}
                  value={formData.provider_org_id}
                  onValueChange={async (orgId: string) => {
                    handleProviderOrgChange(orgId);
                    if (transaction && orgId !== transaction.provider_org_id) {
                      await saveField("provider_org_id", orgId);
                    }
                  }}
                  placeholder="Select provider organization..."
                  allowManualEntry={false}
                  fallbackRef={formData.provider_org_ref}
                  className="px-4 py-4 text-base leading-relaxed h-auto min-h-[3.5rem]"
                />
                {renderFieldIcon("provider_org_id")}
              </CardContent>
            </Card>

            {/* Receiver Organization */}
            <Card className="border-dashed bg-gray-50">
              <CardHeader className="pb-3 border-b border-gray-200">
                <CardTitle className="text-sm">Receiver Organization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <OrganizationCombobox
                  organizations={organizations}
                  value={formData.receiver_org_id}
                  onValueChange={async (orgId: string) => {
                    handleReceiverOrgChange(orgId);
                    if (transaction && orgId !== transaction.receiver_org_id) {
                      await saveField("receiver_org_id", orgId);
                    }
                  }}
                  placeholder="Select receiver organization..."
                  allowManualEntry={false}
                  fallbackRef={formData.receiver_org_ref}
                  className="px-4 py-4 text-base leading-relaxed h-auto min-h-[3.5rem]"
                />
                {renderFieldIcon("receiver_org_id")}
              </CardContent>
            </Card>
          </div>

          {/* Activity Links Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Provider Activity */}
            <Card className="border-dashed bg-blue-50">
              <CardHeader className="pb-3 border-b border-blue-200">
                <CardTitle className="text-sm">Provider Activity</CardTitle>
                <CardDescription className="text-xs">Link to the activity providing these funds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ActivityCombobox
                  value={formData.provider_activity_uuid || ''}
                  onValueChange={async (activityId) => {
                    console.log('[TransactionForm] Provider activity selected:', activityId);
                    setFormData(prev => ({ ...prev, provider_activity_uuid: activityId }));
                    
                    if (activityId) {
                      try {
                        const response = await fetch(`/api/activities/${activityId}`);
                        if (response.ok) {
                          const activity = await response.json();
                          console.log('[TransactionForm] Fetched activity IATI ID:', activity.iati_identifier);
                          setFormData(prev => ({ 
                            ...prev, 
                            provider_org_activity_id: activity.iati_identifier || '' 
                          }));
                        }
                      } catch (error) {
                        console.error('Error fetching activity:', error);
                      }
                    } else {
                      setFormData(prev => ({ ...prev, provider_org_activity_id: '' }));
                    }

                    if (transaction && activityId !== transaction.provider_activity_uuid) {
                      await saveField("provider_activity_uuid", activityId);
                    }
                  }}
                  placeholder="Search for provider activity..."
                  fallbackIatiId={formData.provider_org_activity_id}
                />
                {formData.provider_org_activity_id && (
                  <p className="text-xs text-gray-500">
                    IATI ID: {formData.provider_org_activity_id}
                  </p>
                )}
                {renderFieldIcon("provider_activity_uuid")}
              </CardContent>
            </Card>

            {/* Receiver Activity */}
            <Card className="border-dashed bg-blue-50">
              <CardHeader className="pb-3 border-b border-blue-200">
                <CardTitle className="text-sm">Receiver Activity</CardTitle>
                <CardDescription className="text-xs">Link to the activity receiving these funds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ActivityCombobox
                  value={formData.receiver_activity_uuid || ''}
                  onValueChange={async (activityId) => {
                    console.log('[TransactionForm] Receiver activity selected:', activityId);
                    setFormData(prev => ({ ...prev, receiver_activity_uuid: activityId }));
                    
                    if (activityId) {
                      try {
                        const response = await fetch(`/api/activities/${activityId}`);
                        if (response.ok) {
                          const activity = await response.json();
                          console.log('[TransactionForm] Fetched activity IATI ID:', activity.iati_identifier);
                          setFormData(prev => ({ 
                            ...prev, 
                            receiver_org_activity_id: activity.iati_identifier || '' 
                          }));
                        }
                      } catch (error) {
                        console.error('Error fetching activity:', error);
                      }
                    } else {
                      setFormData(prev => ({ ...prev, receiver_org_activity_id: '' }));
                    }

                    if (transaction && activityId !== transaction.receiver_activity_uuid) {
                      await saveField("receiver_activity_uuid", activityId);
                    }
                  }}
                  placeholder="Search for receiver activity..."
                  fallbackIatiId={formData.receiver_org_activity_id}
                />
                {formData.receiver_org_activity_id && (
                  <p className="text-xs text-gray-500">
                    IATI ID: {formData.receiver_org_activity_id}
                  </p>
                )}
                {renderFieldIcon("receiver_activity_uuid")}
              </CardContent>
            </Card>
          </div>

          {/* Description Section */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description
              <span className="text-gray-500 text-xs ml-2">(optional)</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              onBlur={async (e) => {
                if (transaction && formData.description !== transaction.description) {
                  await saveField("description", formData.description);
                }
              }}
              placeholder="Enter transaction description..."
              rows={3}
            />
            {renderFieldIcon("description")}
          </div>

          {/* Advanced Fields */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full">
                <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                Advanced Options
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Disbursement Channel */}
                <div className="space-y-2">
                  <Label htmlFor="disbursement_channel">
                    Disbursement Channel
                  </Label>
                  <Select
                    value={formData.disbursement_channel || ''}
                    onValueChange={async (value) => {
                      setFormData(prev => ({ ...prev, disbursement_channel: value as any }));
                      if (transaction && value !== transaction.disbursement_channel) {
                        await saveField("disbursement_channel", value);
                      }
                    }}
                  >
                    <SelectTrigger id="disbursement_channel">
                      <SelectValue placeholder="Select channel..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DISBURSEMENT_CHANNEL_LABELS).map(([code, label]) => (
                        <SelectItem key={code} value={code}>
                          <span className="font-mono text-xs mr-2">{code}</span>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderFieldIcon("disbursement_channel")}
                </div>

                {/* Humanitarian Transaction */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_humanitarian"
                    checked={formData.is_humanitarian || false}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_humanitarian: e.target.checked }))}
                    onBlur={async (e) => {
                      if (transaction && formData.is_humanitarian !== transaction.is_humanitarian) {
                        await saveField("is_humanitarian", formData.is_humanitarian);
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="is_humanitarian" className="font-normal cursor-pointer">
                    This is a humanitarian transaction
                  </Label>
                  {renderFieldIcon("is_humanitarian")}
                </div>

                {/* Sector Code */}
                <div className="space-y-2">
                  <Label htmlFor="sector_code">
                    Sector Code
                  </Label>
                  <Input
                    id="sector_code"
                    value={formData.sector_code || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, sector_code: e.target.value }))}
                    onBlur={async (e) => {
                      if (transaction && formData.sector_code !== transaction.sector_code) {
                        await saveField("sector_code", formData.sector_code);
                      }
                    }}
                    placeholder="DAC 5-digit code"
                  />
                  {renderFieldIcon("sector_code")}
                </div>

                {/* Recipient Country */}
                <div className="space-y-2">
                  <Label htmlFor="recipient_country_code">
                    Recipient Country
                  </Label>
                  <Input
                    id="recipient_country_code"
                    value={formData.recipient_country_code || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, recipient_country_code: e.target.value }))}
                    onBlur={async (e) => {
                      if (transaction && formData.recipient_country_code !== transaction.recipient_country_code) {
                        await saveField("recipient_country_code", formData.recipient_country_code);
                      }
                    }}
                    placeholder="ISO 3166-1 alpha-2 (e.g., KH)"
                  />
                  {renderFieldIcon("recipient_country_code")}
                </div>

                {/* Flow Type */}
                <div className="space-y-2">
                  <Label htmlFor="flow_type">
                    Flow Type
                  </Label>
                  <Select
                    value={formData.flow_type || ''}
                    onValueChange={async (value) => {
                      setFormData(prev => ({ ...prev, flow_type: value as any }));
                      if (transaction && value !== transaction.flow_type) {
                        await saveField("flow_type", value);
                      }
                    }}
                  >
                    <SelectTrigger id="flow_type">
                      <SelectValue placeholder="Select flow type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FLOW_TYPE_LABELS).map(([code, label]) => (
                        <SelectItem key={code} value={code}>
                          <span className="font-mono text-xs mr-2">{code}</span>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderFieldIcon("flow_type")}
                </div>

                {/* Finance Type */}
                <div className="space-y-2">
                  <Label htmlFor="finance_type">
                    Finance Type
                  </Label>
                  <Select
                    value={formData.finance_type || ''}
                    onValueChange={async (value) => {
                      setFormData(prev => ({ ...prev, finance_type: value as any }));
                      if (transaction && value !== transaction.finance_type) {
                        await saveField("finance_type", value);
                      }
                    }}
                  >
                    <SelectTrigger id="finance_type">
                      <SelectValue placeholder="Select finance type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FINANCE_TYPES.map(type => (
                        <SelectItem key={type.code} value={type.code}>
                          <span className="font-mono text-xs mr-2">{type.code}</span>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderFieldIcon("finance_type")}
                </div>

                {/* Aid Type */}
                <div className="space-y-2">
                  <Label htmlFor="aid_type">
                    Aid Type
                  </Label>
                  <Select
                    value={formData.aid_type || ''}
                    onValueChange={async (value) => {
                      setFormData(prev => ({ ...prev, aid_type: value }));
                      if (transaction && value !== transaction.aid_type) {
                        await saveField("aid_type", value);
                      }
                    }}
                  >
                    <SelectTrigger id="aid_type">
                      <SelectValue placeholder="Select aid type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {AID_TYPES.map(type => (
                        <SelectItem key={type.code} value={type.code}>
                          <span className="font-mono text-xs mr-2">{type.code}</span>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderFieldIcon("aid_type")}
                </div>

                {/* Tied Status */}
                <div className="space-y-2">
                  <Label htmlFor="tied_status">
                    Tied Status
                  </Label>
                  <Select
                    value={formData.tied_status || ''}
                    onValueChange={async (value) => {
                      setFormData(prev => ({ ...prev, tied_status: value as any }));
                      if (transaction && value !== transaction.tied_status) {
                        await saveField("tied_status", value);
                      }
                    }}
                  >
                    <SelectTrigger id="tied_status">
                      <SelectValue placeholder="Select tied status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIED_STATUS_LABELS).map(([code, label]) => (
                        <SelectItem key={code} value={code}>
                          <span className="font-mono text-xs mr-2">{code}</span>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {renderFieldIcon("tied_status")}
                </div>
              </div>

              {/* Financing Classification */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2">
                  <Label htmlFor="financing_classification">
                    Financing Classification
                  </Label>
                  <Input
                    id="financing_classification"
                    type="text"
                    value={formData.financing_classification || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, financing_classification: e.target.value }))}
                    onBlur={async (e) => {
                      if (transaction && formData.financing_classification !== transaction.financing_classification) {
                        await saveField("financing_classification", formData.financing_classification);
                      }
                    }}
                    placeholder="e.g., ODA Grant, ODA Loan, OOF Grant"
                  />
                  {renderFieldIcon("financing_classification")}
                </div>
              </div>


            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* System Information - at bottom */}
      <Card className="bg-gray-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-600">System Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Activity UUID */}
            <CopyField
              label="Activity ID"
              value={activityId}
              placeholder="System generated"
              fieldClassName="bg-white border-gray-200"
              toastMessage="Activity ID copied!"
            />
            
            {/* Transaction UUID - only show for existing transactions */}
            {transaction?.uuid && (
              <CopyField
                label="Transaction ID"
                value={transaction.uuid}
                placeholder="System generated"
                fieldClassName="bg-white border-gray-200"
                toastMessage="Transaction ID copied!"
              />
            )}
          </div>
          
          {/* Transaction Reference */}
          <div className="space-y-2">
            <Label htmlFor="transaction_reference_bottom">
              Transaction Reference
              <span className="text-gray-500 text-xs ml-2">(optional internal reference)</span>
            </Label>
            <Input
              id="transaction_reference_bottom"
              value={formData.transaction_reference || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, transaction_reference: e.target.value }))}
              onBlur={async (e) => {
                if (transaction && formData.transaction_reference !== transaction.transaction_reference) {
                  await saveField("transaction_reference", formData.transaction_reference);
                }
              }}
              placeholder="Internal reference number"
              className="bg-white border-gray-200 h-10"
            />
            {renderFieldIcon("transaction_reference")}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3 mb-6">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {transaction ? 'Update Transaction' : 'Add Transaction'}
        </Button>
      </div>
    </form>
  );
} 