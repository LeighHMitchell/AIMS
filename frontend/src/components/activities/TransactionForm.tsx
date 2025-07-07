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
import { ChevronDown, Calendar, DollarSign, Building2, Globe, Tag, Info, X } from "lucide-react";
import { format } from "date-fns";
import { OrganizationCombobox } from "@/components/ui/organization-combobox";
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
  
  const [formData, setFormData] = useState<TransactionFormData>({
    transaction_type: transaction?.transaction_type || '3', // Default to Disbursement
    transaction_date: formatDateForInput(transaction?.transaction_date),
    value: transaction?.value ?? 0, // Use ?? to handle 0 values correctly
    currency: transaction?.currency || defaultCurrency,
    status: transaction?.status || 'draft',
    description: transaction?.description || '',
    
    // Provider
    provider_org_id: transaction?.provider_org_id || '',
    provider_org_name: transaction?.provider_org_name || '',
    provider_org_ref: transaction?.provider_org_ref || '',
    
    // Receiver
    receiver_org_id: transaction?.receiver_org_id || '',
    receiver_org_name: transaction?.receiver_org_name || '',
    receiver_org_ref: transaction?.receiver_org_ref || '',
    
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
        
        // Provider
        provider_org_id: transaction.provider_org_id || '',
        provider_org_name: transaction.provider_org_name || '',
        provider_org_ref: transaction.provider_org_ref || '',
        
        // Receiver
        receiver_org_id: transaction.receiver_org_id || '',
        receiver_org_name: transaction.receiver_org_name || '',
        receiver_org_ref: transaction.receiver_org_ref || '',
        
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
        is_humanitarian: transaction.is_humanitarian ?? false,
      });
    }
  }, [transaction, defaultCurrency]);

  // Update organization fields when selection changes
  const handleProviderOrgChange = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    setFormData(prev => ({
      ...prev,
      provider_org_id: orgId,
      provider_org_name: org?.name || '',
      provider_org_ref: org?.iati_org_id || org?.ref || ''
    }));
  };

  const handleReceiverOrgChange = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    setFormData(prev => ({
      ...prev,
      receiver_org_id: orgId,
      receiver_org_name: org?.name || '',
      receiver_org_ref: org?.iati_org_id || org?.ref || ''
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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
              <Select
                value={formData.transaction_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, transaction_type: value as TransactionType }))}
              >
                <SelectTrigger id="transaction_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRANSACTION_TYPE_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      <span className="font-mono text-xs mr-2">{code}</span>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  className="pl-10"
                  required
                />
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
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {/* Currency */}
            <div className="space-y-2">
              <Label htmlFor="currency">
                Currency <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
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
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">
                Status <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as TransactionStatus }))}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    <Badge variant="outline" className="mr-2">Draft</Badge>
                    Planning/Estimated
                  </SelectItem>
                  <SelectItem value="actual">
                    <Badge variant="default" className="mr-2">Actual</Badge>
                    Confirmed/Executed
                  </SelectItem>
                </SelectContent>
              </Select>
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
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description
              <span className="text-gray-500 text-xs ml-2">(optional)</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter transaction description..."
              rows={3}
            />
          </div>

          {/* Organizations Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Organizations
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Provider Organization */}
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Provider Organization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <OrganizationCombobox
                    organizations={organizations}
                    value={formData.provider_org_id}
                    onValueChange={handleProviderOrgChange}
                    placeholder="Select provider organization..."
                    allowManualEntry={true}
                  />
                  
                  {(!formData.provider_org_id || formData.provider_org_id === '') && (
                    <>
                      <Input
                        placeholder="Organization name"
                        value={formData.provider_org_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, provider_org_name: e.target.value }))}
                      />
                      <Input
                        placeholder="IATI identifier (optional)"
                        value={formData.provider_org_ref}
                        onChange={(e) => setFormData(prev => ({ ...prev, provider_org_ref: e.target.value }))}
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Receiver Organization */}
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Receiver Organization</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <OrganizationCombobox
                    organizations={organizations}
                    value={formData.receiver_org_id}
                    onValueChange={handleReceiverOrgChange}
                    placeholder="Select receiver organization..."
                    allowManualEntry={true}
                  />
                  
                  {(!formData.receiver_org_id || formData.receiver_org_id === '') && (
                    <>
                      <Input
                        placeholder="Organization name"
                        value={formData.receiver_org_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, receiver_org_name: e.target.value }))}
                      />
                      <Input
                        placeholder="IATI identifier (optional)"
                        value={formData.receiver_org_ref}
                        onChange={(e) => setFormData(prev => ({ ...prev, receiver_org_ref: e.target.value }))}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
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
                {/* Transaction Reference */}
                <div className="space-y-2">
                  <Label htmlFor="transaction_reference">
                    Transaction Reference
                  </Label>
                  <Input
                    id="transaction_reference"
                    value={formData.transaction_reference || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, transaction_reference: e.target.value }))}
                    placeholder="Internal reference number"
                  />
                </div>

                {/* Disbursement Channel */}
                <div className="space-y-2">
                  <Label htmlFor="disbursement_channel">
                    Disbursement Channel
                  </Label>
                  <Select
                    value={formData.disbursement_channel || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, disbursement_channel: value as any }))}
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
                    placeholder="DAC 5-digit code"
                  />
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
                    placeholder="ISO 3166-1 alpha-2 (e.g., KH)"
                  />
                </div>

                {/* Flow Type */}
                <div className="space-y-2">
                  <Label htmlFor="flow_type">
                    Flow Type
                  </Label>
                  <Select
                    value={formData.flow_type || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, flow_type: value as any }))}
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
                </div>

                {/* Finance Type */}
                <div className="space-y-2">
                  <Label htmlFor="finance_type">
                    Finance Type
                  </Label>
                  <Select
                    value={formData.finance_type || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, finance_type: value as any }))}
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
                </div>

                {/* Aid Type */}
                <div className="space-y-2">
                  <Label htmlFor="aid_type">
                    Aid Type
                  </Label>
                  <Select
                    value={formData.aid_type || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, aid_type: value }))}
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
                </div>

                {/* Tied Status */}
                <div className="space-y-2">
                  <Label htmlFor="tied_status">
                    Tied Status
                  </Label>
                  <Select
                    value={formData.tied_status || ''}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tied_status: value as any }))}
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
                </div>
              </div>

              {/* Humanitarian Flag */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_humanitarian"
                  checked={formData.is_humanitarian || false}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_humanitarian: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_humanitarian" className="font-normal cursor-pointer">
                  This is a humanitarian transaction
                </Label>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
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