"use client"

import { useState, useEffect, useMemo, Fragment } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, getSortIcon, sortableHeaderClasses } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  AlertCircle, 
  Search, 
  Filter, 
  Download,
  RefreshCw,
  Save,
  X,
  CalendarClock,
  Copy,
  Check,
  Unlink,
  Building2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUser } from "@/hooks/useUser";
import { AidTypeSelect } from "@/components/forms/AidTypeSelect";
import { DefaultFinanceTypeSelect } from "@/components/forms/DefaultFinanceTypeSelect";
import { FlowTypeSelect } from "@/components/forms/FlowTypeSelect";
import { apiFetch } from '@/lib/api-fetch';
import { renderMoney, formatClinicDate } from './formatters';
import { OrganizationCombobox, Organization as ComboboxOrg } from '@/components/ui/organization-combobox';

// Transaction Type mappings
const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  '1': 'Incoming Funds',
  '2': 'Outgoing Commitment',
  '3': 'Disbursement',
  '4': 'Expenditure',
  '5': 'Interest Payment',
  '6': 'Loan Repayment',
  '7': 'Reimbursement',
  '8': 'Purchase of Equity',
  '9': 'Sale of Equity',
  '10': 'Credit Guarantee',
  '11': 'Incoming Commitment',
  '12': 'Outgoing Pledge',
  '13': 'Incoming Pledge'
};

// Finance Type mappings
const FINANCE_TYPE_LABELS: Record<string, string> = {
  '110': 'Standard grant',
  '210': 'Interest subsidy',
  '310': 'Capital subscription on deposit basis',
  '311': 'Capital subscription on encashment basis',
  '410': 'Aid loan excluding debt reorganisation',
  '421': 'Reimbursable grant'
};

// Flow Type mappings
const FLOW_TYPE_LABELS: Record<string, string> = {
  '10': 'ODA',
  '20': 'OOF',
  '30': 'Private grants',
  '35': 'Private market',
  '40': 'Non flow',
  '50': 'Other flows'
};

// Aid Type mappings
const AID_TYPE_LABELS: Record<string, string> = {
  'A01': 'General budget support',
  'A02': 'Sector budget support',
  'B01': 'Core support to NGOs',
  'B02': 'Core contributions to multilateral institutions',
  'B03': 'Contributions to pooled programmes and funds',
  'B04': 'Basket funds/pooled funding',
  'C01': 'Project-type interventions',
  'D01': 'Donor country personnel',
  'D02': 'Other technical assistance',
  'E01': 'Scholarships/training in donor country',
  'E02': 'Imputed student costs',
  'F01': 'Debt relief',
  'G01': 'Administrative costs not included elsewhere',
  'H01': 'Development awareness',
  'H02': 'Refugees in donor countries'
};

// Render an IATI code + label as "[code] Label" with the code in a gray
// monospace badge. The badge sits inline with the label text so they stay on
// the same line and the label wraps naturally beside it when space is tight.
const renderCodeLabel = (code: string, label?: string) => (
  <span className="text-body">
    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap align-middle mr-1.5">{code}</span>
    {label}
  </span>
);

type Transaction = {
  id: string;
  activityId: string;
  activityTitle?: string;
  activityAcronym?: string;
  transactionType?: string;
  aidType?: string;
  financeType?: string;
  flowType?: string;
  transactionDate?: string;
  value?: number;
  currency?: string;
  valueUsd?: number;
  providerOrgId?: string;
  providerOrgName?: string;
  receiverOrgId?: string;
  receiverOrgName?: string;
  organizationId?: string;
  organizationName?: string;
  description?: string;
  [key: string]: any;
};


export function DataClinicTransactions() {
  const { user } = useUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<{ transactionId: string; field: string } | null>(null);
  const [bulkEditField, setBulkEditField] = useState<string>('');
  const [bulkEditValue, setBulkEditValue] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'activity' | 'type' | 'date' | 'value' | 'usdValue' | 'financeType' | 'aidType' | 'flowType' | 'provider' | 'receiver'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [organizations, setOrganizations] = useState<ComboboxOrg[]>([]);
  const [linking, setLinking] = useState<{ id: string; side: 'provider' | 'receiver' } | null>(null);
  const [grouped, setGrouped] = useState(false);

  // Org list for the "link organisation" dropdown on unlinked transactions
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/organizations?limit=1000');
        if (!res.ok) return;
        const data = await res.json();
        const list = (data.organizations || data || []).map((o: any) => ({
          id: o.id,
          name: o.name || o.reporting_org_name || 'Unknown',
          acronym: o.acronym,
          iati_org_id: o.iati_org_id,
          country: o.country_represented,
          organisation_type: o.type,
          logo: o.logo,
        }));
        setOrganizations(list);
      } catch (e) {
        console.error('[DataClinic] org list fetch failed', e);
      }
    })();
  }, []);

  // Link an unlinked transaction organisation: set the org id + canonical name.
  const handleLinkOrg = async (transaction: Transaction, side: 'provider' | 'receiver', orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (!org) return;
    try {
      await apiFetch(`/api/data-clinic/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: `${side}_org_id`, value: orgId, userId: user?.id }),
      });
      await apiFetch(`/api/data-clinic/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field: `${side}_org_name`, value: org.name, userId: user?.id }),
      });
      setTransactions((prev) => prev.map((t) =>
        t.id === transaction.id
          ? { ...t, [`${side}OrgId`]: orgId, [`${side}OrgName`]: org.name }
          : t
      ));
      setLinking(null);
      toast.success('Organisation linked');
    } catch (e) {
      console.error(e);
      toast.error('Failed to link organisation');
    }
  };

  // Provider/Receiver cell showing the org name + linked/unlinked status, with
  // a click-to-link organisation picker. side = 'provider' | 'receiver'.
  const renderOrgCell = (transaction: Transaction, side: 'provider' | 'receiver') => {
    const orgId = side === 'provider' ? transaction.providerOrgId : transaction.receiverOrgId;
    const orgName = side === 'provider' ? transaction.providerOrgName : transaction.receiverOrgName;
    const isLinkingThis = linking?.id === transaction.id && linking?.side === side;

    if (isLinkingThis) {
      return (
        <div className="flex items-center gap-2 min-w-[260px]">
          <OrganizationCombobox
            organizations={organizations}
            value={orgId || undefined}
            onValueChange={(id) => id && handleLinkOrg(transaction, side, id)}
            placeholder={orgName ? `Link “${orgName}”…` : 'Select organisation…'}
            contentAlign="end"
            defaultOpen
          />
          <Button size="sm" variant="ghost" onClick={() => setLinking(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    const linkClick = isSuperUser ? () => setLinking({ id: transaction.id, side }) : undefined;

    // Linked — show the org's logo + acronym (no badge); click to change.
    if (orgId) {
      const org = organizations.find((o) => o.id === orgId);
      const label = org?.acronym || org?.name || orgName || '(linked org)';
      return (
        <button
          type="button"
          onClick={linkClick}
          disabled={!isSuperUser}
          title={isSuperUser ? 'Linked. Click to change' : 'Linked to an organisation record'}
          className="flex items-center gap-2 rounded px-1 py-0.5 -mx-1 hover:bg-muted/60 transition-colors text-left disabled:cursor-default disabled:hover:bg-transparent"
        >
          {org?.logo ? (
            <img src={org.logo} alt="" className="h-5 w-5 rounded object-contain flex-shrink-0" />
          ) : (
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className="text-body font-medium break-words">{label}</span>
        </button>
      );
    }
    // Named but not linked
    if (orgName) {
      return (
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-body break-words">{orgName}</span>
          <Badge
            variant="outline"
            className={`text-helper border border-amber-500 text-amber-600 bg-transparent whitespace-nowrap ${isSuperUser ? 'cursor-pointer hover:bg-amber-50' : ''}`}
            title="Named but not linked to an organisation record. Click to link"
            onClick={linkClick}
          >
            <Unlink className="h-3 w-3 mr-1" />
            Unlinked
          </Badge>
        </div>
      );
    }
    // Neither — missing
    return (
      <Badge
        variant="outline"
        className={`text-helper border border-red-500 text-red-600 bg-transparent ${isSuperUser ? 'cursor-pointer hover:bg-red-50' : ''}`}
        title={isSuperUser ? 'No organisation. Click to link' : undefined}
        onClick={linkClick}
      >
        <AlertCircle className="h-3 w-3 mr-1" />
        Missing
      </Badge>
    );
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'activity':
          return (a.activityTitle || '').localeCompare(b.activityTitle || '') * dir;
        case 'type':
          return (a.transactionType || '').localeCompare(b.transactionType || '') * dir;
        case 'date':
          return ((a.transactionDate || '') < (b.transactionDate || '') ? -1 : 1) * dir;
        case 'value':
          return ((a.value || 0) - (b.value || 0)) * dir;
        case 'usdValue':
          return ((a.valueUsd || 0) - (b.valueUsd || 0)) * dir;
        case 'financeType':
          return (a.financeType || '').localeCompare(b.financeType || '') * dir;
        case 'aidType':
          return (a.aidType || '').localeCompare(b.aidType || '') * dir;
        case 'flowType':
          return (a.flowType || '').localeCompare(b.flowType || '') * dir;
        case 'provider':
          return (a.providerOrgName || '').localeCompare(b.providerOrgName || '') * dir;
        case 'receiver':
          return (a.receiverOrgName || '').localeCompare(b.receiverOrgName || '') * dir;
        default:
          return 0;
      }
    });
  }, [filteredTransactions, sortField, sortDirection]);

  // Transactions grouped by their activity (preserving sort order of groups)
  const txGroups = useMemo(() => {
    const map = new Map<string, { activityId: string; title: string; acronym?: string; rows: Transaction[] }>();
    for (const t of sortedTransactions) {
      const key = t.activityId || t.activityTitle || 'unknown';
      if (!map.has(key)) {
        map.set(key, { activityId: t.activityId, title: t.activityTitle || 'Unknown Activity', acronym: t.activityAcronym, rows: [] });
      }
      map.get(key)!.rows.push(t);
    }
    return Array.from(map.values());
  }, [sortedTransactions]);

  const isSuperUser = user?.role === 'super_user';

  const copyToClipboard = async (text: string, type: string, transactionId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(`${transactionId}-${type}`);
      toast.success(`${type} copied to clipboard`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  useEffect(() => {
    fetchTransactionsWithGaps();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, selectedFilter, searchQuery]);

  const fetchTransactionsWithGaps = async () => {
    try {
      const res = await apiFetch('/api/data-clinic/transactions?missing_fields=true');
      if (!res.ok) throw new Error('Failed to fetch transactions');
      
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    // Apply field filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(transaction => {
        switch (selectedFilter) {
          case 'missing_finance_type':
            return !transaction.financeType;
          case 'missing_aid_type':
            return !transaction.aidType;
          case 'missing_flow_type':
            return !transaction.flowType;
          case 'missing_transaction_type':
            return !transaction.transactionType;
          case 'missing_date':
            return !transaction.transactionDate;
          case 'future_disbursements':
            return transaction.transactionType === '3' && 
                   transaction.transactionDate && 
                   new Date(transaction.transactionDate) > new Date();
          case 'missing_organization':
            return !transaction.providerOrgId && !transaction.receiverOrgId && !transaction.organizationId;
          case 'missing_value':
            return !transaction.value || transaction.value === 0;
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(transaction => 
        transaction.activityTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
  };

  const handleInlineEdit = async (transactionId: string, field: string, value: string) => {
    try {
      const res = await apiFetch(`/api/data-clinic/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value, userId: user?.id })
      });

      if (!res.ok) throw new Error('Failed to update transaction');

      // Update local state
      setTransactions(prev => prev.map(transaction => 
        transaction.id === transactionId ? { ...transaction, [field]: value } : transaction
      ));

      toast.success('Transaction updated successfully');
      setEditingField(null);
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkEditField || !bulkEditValue || selectedTransactions.size === 0) {
      toast.error('Please select transactions and provide a field and value');
      return;
    }

    try {
      const res = await apiFetch('/api/data-clinic/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: 'transaction',
          field: bulkEditField,
          value: bulkEditValue,
          ids: Array.from(selectedTransactions),
          user_id: user?.id
        })
      });

      if (!res.ok) throw new Error('Failed to bulk update');

      toast.success(`Updated ${selectedTransactions.size} transactions`);
      setSelectedTransactions(new Set());
      setBulkEditField('');
      setBulkEditValue('');
      fetchTransactionsWithGaps(); // Refresh data
    } catch (error) {
      console.error('Error bulk updating:', error);
      toast.error('Failed to bulk update transactions');
    }
  };

  const renderFieldValue = (transaction: Transaction, field: string) => {
    const value = transaction[field];
    
    if (editingField?.transactionId === transaction.id && editingField?.field === field) {
      switch (field) {
        case 'aidType':
          return (
            <div className="flex items-center gap-2">
              <AidTypeSelect
                defaultOpen
                value={value || ''}
                onValueChange={(newValue) => handleInlineEdit(transaction.id, field, newValue || '')}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingField(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        case 'financeType':
          return (
            <div className="flex items-center gap-2">
              <DefaultFinanceTypeSelect
                defaultOpen
                value={value || ''}
                onValueChange={(newValue) => handleInlineEdit(transaction.id, field, newValue || '')}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingField(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        case 'flowType':
          return (
            <div className="flex items-center gap-2">
              <FlowTypeSelect
                defaultOpen
                value={value || ''}
                onValueChange={(newValue) => handleInlineEdit(transaction.id, field, newValue || '')}
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingField(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        case 'transactionType':
          return (
            <div className="flex items-center gap-2">
              <Select
                defaultOpen
                value={value || ''}
                onValueChange={(newValue) => handleInlineEdit(transaction.id, field, newValue || '')}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRANSACTION_TYPE_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingField(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        default:
          return (
            <div className="flex items-center gap-2">
              <Input
                value={value || ''}
                onChange={(e) => handleInlineEdit(transaction.id, field, e.target.value)}
                className="w-32"
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingField(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
      }
    }

    // Display value with edit button for super users
    return (
      <div className="flex items-center gap-2">
        {value ? (
          field === 'transactionType' ? renderCodeLabel(value, TRANSACTION_TYPE_LABELS[value]) :
          field === 'financeType' ? renderCodeLabel(value, FINANCE_TYPE_LABELS[value]) :
          field === 'aidType' ? renderCodeLabel(value, AID_TYPE_LABELS[value]) :
          field === 'flowType' ? renderCodeLabel(value, FLOW_TYPE_LABELS[value]) :
          <span className="text-body">{value}</span>
        ) : (
          <Badge
            variant="outline"
            className={`text-helper border border-red-500 text-red-600 bg-transparent ${isSuperUser ? 'cursor-pointer hover:bg-red-50' : ''}`}
            onClick={isSuperUser ? () => setEditingField({ transactionId: transaction.id, field }) : undefined}
          >
            <AlertCircle className="h-3 w-3 mr-1" />
            Missing
          </Badge>
        )}
      </div>
    );
  };

  const isFutureDisbursement = (transaction: Transaction) => {
    return transaction.transactionType === '3' && 
           transaction.transactionDate && 
           new Date(transaction.transactionDate) > new Date();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filter by missing field" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All transactions</SelectItem>
                <SelectItem value="missing_finance_type">Missing Finance Type</SelectItem>
                <SelectItem value="missing_aid_type">Missing Aid Type</SelectItem>
                <SelectItem value="missing_flow_type">Missing Flow Type</SelectItem>
                <SelectItem value="missing_transaction_type">Missing Transaction Type</SelectItem>
                <SelectItem value="missing_date">Missing Date</SelectItem>
                <SelectItem value="future_disbursements">Future-dated Disbursements</SelectItem>
                <SelectItem value="missing_organization">Missing Organisation</SelectItem>
                <SelectItem value="missing_value">Missing Value</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 px-3 py-1.5 border rounded-md bg-background">
              <Switch id="tx-group-by-activity" checked={grouped} onCheckedChange={setGrouped} />
              <Label htmlFor="tx-group-by-activity" className="text-body cursor-pointer whitespace-nowrap">
                Group by Activity
              </Label>
            </div>
            <Button
              variant="outline"
              onClick={() => fetchTransactionsWithGaps()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Bulk Actions for Super Users */}
          {isSuperUser && selectedTransactions.size > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-4">
                <p className="text-body font-medium">
                  {selectedTransactions.size} transactions selected
                </p>
                <Select value={bulkEditField} onValueChange={setBulkEditField}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select field" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financeType">Finance Type</SelectItem>
                    <SelectItem value="aidType">Aid Type</SelectItem>
                    <SelectItem value="flowType">Flow Type</SelectItem>
                    <SelectItem value="transactionType">Transaction Type</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Enter value"
                  value={bulkEditValue}
                  onChange={(e) => setBulkEditValue(e.target.value)}
                  className="w-[200px]"
                />
                <Button onClick={handleBulkUpdate}>
                  <Save className="h-4 w-4 mr-2" />
                  Apply to Selected
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <Table className="border-0 min-w-[1120px]">
              <TableHeader>
                <TableRow>
                  {isSuperUser && (
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedTransactions.size === filteredTransactions.length && filteredTransactions.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)));
                          } else {
                            setSelectedTransactions(new Set());
                          }
                        }}
                      />
                    </TableHead>
                  )}
                  <TableHead className={`align-top min-w-[240px] ${sortableHeaderClasses}`} onClick={() => handleSort('activity')}>
                    <div className="flex items-center gap-1 whitespace-nowrap">Activity Title {getSortIcon('activity', sortField, sortDirection)}</div>
                  </TableHead>
                  <TableHead className={`align-top min-w-[140px] ${sortableHeaderClasses}`} onClick={() => handleSort('type')}>
                    <div className="flex items-center gap-1 whitespace-nowrap">Type {getSortIcon('type', sortField, sortDirection)}</div>
                  </TableHead>
                  <TableHead className={`align-top min-w-[120px] ${sortableHeaderClasses}`} onClick={() => handleSort('date')}>
                    <div className="flex items-center gap-1 whitespace-nowrap">Date {getSortIcon('date', sortField, sortDirection)}</div>
                  </TableHead>
                  <TableHead className={`text-right align-top min-w-[140px] ${sortableHeaderClasses}`} onClick={() => handleSort('value')}>
                    <div className="flex items-center justify-end gap-1 whitespace-nowrap">Original Value {getSortIcon('value', sortField, sortDirection)}</div>
                  </TableHead>
                  <TableHead className={`text-right align-top min-w-[140px] ${sortableHeaderClasses}`} onClick={() => handleSort('usdValue')}>
                    <div className="flex items-center justify-end gap-1 whitespace-nowrap">USD Value {getSortIcon('usdValue', sortField, sortDirection)}</div>
                  </TableHead>
                  <TableHead className={`align-top min-w-[170px] ${sortableHeaderClasses}`} onClick={() => handleSort('financeType')}>
                    <div className="flex items-center gap-1 whitespace-nowrap">Finance Type {getSortIcon('financeType', sortField, sortDirection)}</div>
                  </TableHead>
                  <TableHead className={`align-top min-w-[190px] ${sortableHeaderClasses}`} onClick={() => handleSort('aidType')}>
                    <div className="flex items-center gap-1 whitespace-nowrap">Aid Type {getSortIcon('aidType', sortField, sortDirection)}</div>
                  </TableHead>
                  <TableHead className={`align-top min-w-[120px] ${sortableHeaderClasses}`} onClick={() => handleSort('flowType')}>
                    <div className="flex items-center gap-1 whitespace-nowrap">Flow Type {getSortIcon('flowType', sortField, sortDirection)}</div>
                  </TableHead>
                  <TableHead className={`align-top min-w-[200px] ${sortableHeaderClasses}`} onClick={() => handleSort('provider')}>
                    <div className="flex items-center gap-1 whitespace-nowrap">Provider {getSortIcon('provider', sortField, sortDirection)}</div>
                  </TableHead>
                  <TableHead className={`align-top min-w-[200px] ${sortableHeaderClasses}`} onClick={() => handleSort('receiver')}>
                    <div className="flex items-center gap-1 whitespace-nowrap">Receiver {getSortIcon('receiver', sortField, sortDirection)}</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isSuperUser ? 11 : 10} className="p-8 text-center text-muted-foreground">
                      No transactions found with data gaps
                    </TableCell>
                  </TableRow>
                ) : (
                  (grouped
                    ? txGroups.flatMap((g) => [{ _header: g } as any, ...g.rows.map((t) => ({ _tx: t } as any))])
                    : sortedTransactions.map((t) => ({ _tx: t } as any))
                  ).map((item: any) => item._header ? (
                    <TableRow key={`grp-${item._header.activityId || item._header.title}`} className="bg-surface-muted/60">
                      <TableCell colSpan={isSuperUser ? 11 : 10}>
                        <Link
                          href={`/activities/${item._header.activityId}`}
                          className="font-medium no-underline hover:opacity-70 transition-opacity"
                        >
                          {item._header.title}{item._header.acronym ? ` (${item._header.acronym})` : ''}
                        </Link>
                        <span className="ml-2 text-helper text-muted-foreground">({item._header.rows.length})</span>
                      </TableCell>
                    </TableRow>
                  ) : (() => { const transaction = item._tx; return (
                    <TableRow key={transaction.id}>
                      {isSuperUser && (
                        <TableCell className="align-top">
                          <Checkbox
                            checked={selectedTransactions.has(transaction.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedTransactions);
                              if (checked) {
                                newSelected.add(transaction.id);
                              } else {
                                newSelected.delete(transaction.id);
                              }
                              setSelectedTransactions(newSelected);
                            }}
                          />
                        </TableCell>
                      )}
                      <TableCell className="align-top group">
                        {!grouped && (
                          <Link
                            href={`/activities/${transaction.activityId}`}
                            className="font-medium break-words no-underline hover:opacity-70 transition-opacity"
                          >
                            {transaction.activityTitle || 'Unknown Activity'}
                            {transaction.activityAcronym ? ` (${transaction.activityAcronym})` : ''}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {renderFieldValue(transaction, 'transactionType')}
                      </TableCell>
                      <TableCell className="align-top">
                        {transaction.transactionDate ? (
                          <div className="flex items-center gap-2">
                            <span className="text-body whitespace-nowrap">
                              {formatClinicDate(transaction.transactionDate)}
                            </span>
                            {isFutureDisbursement(transaction) && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <CalendarClock className="h-4 w-4 text-orange-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Future-dated disbursement</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-helper border border-red-500 text-red-600 bg-transparent">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Missing
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-right">
                        {transaction.value && transaction.currency ? (
                          <span className="text-body font-medium">
                            {renderMoney(transaction.value, transaction.currency)}
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-helper border border-red-500 text-red-600 bg-transparent">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Missing
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-right">
                        {transaction.valueUsd != null ? (
                          <span className="text-body font-medium">
                            {renderMoney(transaction.valueUsd, 'USD')}
                          </span>
                        ) : (
                          <Badge variant="outline" className="text-helper border border-red-500 text-red-600 bg-transparent">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Missing
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        {renderFieldValue(transaction, 'financeType')}
                      </TableCell>
                      <TableCell className="align-top">
                        {renderFieldValue(transaction, 'aidType')}
                      </TableCell>
                      <TableCell className="align-top">
                        {renderFieldValue(transaction, 'flowType')}
                      </TableCell>
                      <TableCell className="align-top">
                        {renderOrgCell(transaction, 'provider')}
                      </TableCell>
                      <TableCell className="align-top">
                        {renderOrgCell(transaction, 'receiver')}
                      </TableCell>
                    </TableRow>
                  ); })())
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
} 