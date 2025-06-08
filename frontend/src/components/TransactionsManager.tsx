"use client"
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Edit, Download, Filter, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { usePartners } from "@/hooks/usePartners";
import {
  Transaction,
  TRANSACTION_TYPES,
  TRANSACTION_ACRONYMS,
  LEGACY_TRANSACTION_TYPE_MAP,
  AID_TYPES,
  FLOW_TYPES,
  TIED_STATUS,
  TRANSACTION_STATUS
} from "@/types/transaction";

interface TransactionsManagerProps {
  activityId: string;
  activityTitle?: string;
  transactions: Transaction[];
  onTransactionsChange: (transactions: Transaction[]) => void;
}

export default function TransactionsManager({ 
  activityId, 
  activityTitle,
  transactions: initialTransactions = [], 
  onTransactionsChange 
}: TransactionsManagerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    dateFrom: "",
    dateTo: ""
  });

  // Form state
  const [formData, setFormData] = useState({
    type: "D" as keyof typeof TRANSACTION_TYPES, // Default to Disbursement
    value: 0,
    currency: "USD",
    transactionDate: format(new Date(), "yyyy-MM-dd"),
    providerOrg: "",
    receiverOrg: "",
    status: "actual" as keyof typeof TRANSACTION_STATUS, // Default to Actual instead of Draft
    tiedStatus: "3" as keyof typeof TIED_STATUS, // Default to Untied
    narrative: "",
    aidType: "C01" as keyof typeof AID_TYPES,
    flowType: "10" as keyof typeof FLOW_TYPES
  });

  const { partners, loading: partnersLoading } = usePartners();

  // Helper function to validate and convert activity ID (same logic as API)
  const validateActivityId = (activityId: string): string | null => {
    if (!activityId) return null;
    
    // Check if it's already a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(activityId)) {
        return activityId;
    }
    
    // If it's a malformed activity ID like "activity_123_abc", create a deterministic UUID from it
    if (activityId.startsWith('activity_')) {
        console.log('[TRANSACTION LOAD] Converting malformed activity ID to UUID:', activityId);
        
        // Create a deterministic UUID based on the activity ID string
        // Simple hash function that works in browser
        let hash = 0;
        for (let i = 0; i < activityId.length; i++) {
            const char = activityId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        // Convert to positive number and create different parts
        const hashNum = Math.abs(hash);
        const uuid = [
            hashNum.toString(16).padStart(8, '0').substring(0, 8),
            (hashNum >> 4).toString(16).padStart(4, '0').substring(0, 4),
            (hashNum >> 8).toString(16).padStart(4, '0').substring(0, 4),
            (hashNum >> 12).toString(16).padStart(4, '0').substring(0, 4),
            (hashNum * 31).toString(16).padStart(12, '0').substring(0, 12)
        ].join('-');
        
        console.log('[TRANSACTION LOAD] Converted', activityId, 'to UUID:', uuid);
        return uuid;
    }
    
    // For any other format, create a random UUID (not ideal but maintains consistency)
    console.log('[TRANSACTION LOAD] Creating new UUID for invalid activity ID:', activityId);
    return crypto.randomUUID();
  };

  const loadTransactions = async () => {
    if (!activityId) return;
    
    // Convert activity ID to the same format used when saving
    const validatedActivityId = validateActivityId(activityId);
    console.log('[TRANSACTION LOAD] Original activity ID:', activityId);
    console.log('[TRANSACTION LOAD] Validated activity ID for loading:', validatedActivityId);
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/activities/${validatedActivityId}/transactions`);
      if (response.ok) {
        const loadedTransactions = await response.json();
        console.log('[TRANSACTION LOAD] Loaded transactions:', loadedTransactions.length);
        const convertedTransactions = loadedTransactions.map(convertLegacyTransaction);
        setTransactions(convertedTransactions);
        onTransactionsChange(convertedTransactions);
      } else {
        console.warn('[TRANSACTION LOAD] Failed to load transactions:', response.status);
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
      // Fallback to initial transactions if API fails
      setTransactions(initialTransactions);
    } finally {
      setIsLoading(false);
    }
  };

  // Load transactions on mount or when activityId changes
  useEffect(() => {
    loadTransactions();
  }, [activityId]);

  // Convert legacy transaction types to new format
  const convertLegacyTransaction = (transaction: Transaction): Transaction => {
    // Check if the transaction type is a legacy numeric type
    if (LEGACY_TRANSACTION_TYPE_MAP[transaction.type]) {
      return {
        ...transaction,
        type: LEGACY_TRANSACTION_TYPE_MAP[transaction.type]
      };
    }
    return transaction;
  };

  useEffect(() => {
    // Convert any legacy transactions to new format and ensure all required fields
    const convertedTransactions = initialTransactions.map(transaction => {
      const converted = convertLegacyTransaction(transaction);
      // Ensure all required fields have default values
      return {
        ...converted,
        status: converted.status || 'actual',
        currency: converted.currency || 'USD',
        transactionDate: converted.transactionDate || format(new Date(), "yyyy-MM-dd"),
        providerOrg: converted.providerOrg || '',
        receiverOrg: converted.receiverOrg || '',
        narrative: converted.narrative || '',
        aidType: converted.aidType,
        flowType: converted.flowType,
        tiedStatus: converted.tiedStatus
      };
    });
    setTransactions(convertedTransactions);
  }, [initialTransactions]);

  const resetForm = () => {
    setFormData({
      type: "D",
      value: 0,
      currency: "USD",
      transactionDate: format(new Date(), "yyyy-MM-dd"),
      providerOrg: "",
      receiverOrg: "",
      status: "actual", // Default to Actual instead of Draft
      tiedStatus: "3",
      narrative: "",
      aidType: "C01",
      flowType: "10"
    });
    setEditingTransaction(null);
  };

  // Helper function to validate UUID format
  const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  // Helper function to get organization name by ID
  const getOrgNameById = (orgId: string): string => {
    if (!orgId) return '-';
    if (orgId === 'Other') return 'Other';
    
    // First try to find in partners list
    const partner = partners.find(p => p.id === orgId);
    
    if (partner) {
      // Use fullName (full organization name) with acronym in brackets
      const displayName = partner.fullName || partner.name || 'Unknown Organization';
      const result = partner.acronym && displayName !== partner.acronym 
        ? `${displayName} (${partner.acronym})`
        : displayName;
      return result;
    }
    
    // If not found and it's a UUID, show a truncated version
    if (isValidUUID(orgId)) {
      return `Organization (${orgId.substring(0, 8)}...)`;
    }
    
    // Otherwise return as is (might be a legacy name)
    return orgId;
  };

  const saveTransaction = async (transaction: Transaction) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/transactions', {
        method: editingTransaction ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save transaction');
      }

      const savedTransaction = await response.json();
      
      let updatedTransactions;
      if (editingTransaction) {
        updatedTransactions = transactions.map(t => 
          t.id === editingTransaction.id ? { ...t, ...savedTransaction } : t
        );
        toast.success("Transaction updated successfully");
      } else {
        updatedTransactions = [...transactions, savedTransaction];
        toast.success("Transaction added successfully");
      }
      setTransactions(updatedTransactions);
      onTransactionsChange(updatedTransactions);
      setShowAddDialog(false);
      resetForm();

    } catch (error) {
      console.error("Error saving transaction:", error);
      toast.error(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (isSubmitting) return; // Prevent double-submission

    if (!formData.value || formData.value <= 0) {
      toast.error("Transaction value must be greater than 0");
      return;
    }
    if (!formData.providerOrg.trim()) {
      toast.error("Provider organisation is required");
      return;
    }
    if (!formData.receiverOrg.trim()) {
      toast.error("Receiver organisation is required");
      return;
    }

    // Validate organization IDs if not "Other"
    if (formData.providerOrg !== 'Other' && !isValidUUID(formData.providerOrg)) {
      toast.error("Invalid provider organization ID. Please select from the dropdown.");
      console.error('[TRANSACTION] Invalid provider org UUID:', formData.providerOrg);
      return;
    }
    if (formData.receiverOrg !== 'Other' && !isValidUUID(formData.receiverOrg)) {
      toast.error("Invalid receiver organization ID. Please select from the dropdown.");
      console.error('[TRANSACTION] Invalid receiver org UUID:', formData.receiverOrg);
      return;
    }

    const transaction: Transaction = {
      id: editingTransaction?.id || crypto.randomUUID(),
      ...formData,
      activityId,
      createdAt: editingTransaction?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    saveTransaction(transaction);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);

    // Robustly parse and format the date for the input field
    const parseAndFormatDate = (dateStr: string): string => {
        if (!dateStr) return format(new Date(), 'yyyy-MM-dd');

        // Check for yyyy-MM-dd format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return dateStr;
        }

        // Check for dd/MM/yyyy format
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const [day, month, year] = parts;
            if (day.length === 2 && month.length === 2 && year.length === 4) {
                return `${year}-${month}-${day}`;
            }
        }
        
        // Fallback for other parsable JS date formats
        try {
            return format(new Date(dateStr), 'yyyy-MM-dd');
        } catch {
            // Final fallback to today's date if all else fails
            return format(new Date(), 'yyyy-MM-dd');
        }
    }
    
    setFormData({
      type: transaction.type,
      value: transaction.value,
      currency: transaction.currency,
      transactionDate: parseAndFormatDate(transaction.transactionDate),
      providerOrg: transaction.providerOrg,
      receiverOrg: transaction.receiverOrg,
      status: transaction.status,
      tiedStatus: transaction.tiedStatus || "3",
      narrative: transaction.narrative || "",
      aidType: transaction.aidType || "C01",
      flowType: transaction.flowType || "10"
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (transactionId: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/transactions?id=${transactionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete transaction');
      }

      const updatedTransactions = transactions.filter(t => t.id !== transactionId);
      setTransactions(updatedTransactions);
      onTransactionsChange(updatedTransactions);
      toast.success("Transaction deleted successfully");

    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = () => {
    const dataToExport = filteredTransactions.map(t => ({
      type: TRANSACTION_TYPES[t.type],
      value: t.value,
      currency: t.currency,
      transactionDate: t.transactionDate,
      providerOrg: t.providerOrg,
      receiverOrg: t.receiverOrg,
      status: TRANSACTION_STATUS[t.status],
      tiedStatus: t.tiedStatus ? TIED_STATUS[t.tiedStatus] : "",
      narrative: t.narrative,
      aidType: t.aidType ? AID_TYPES[t.aidType] : "",
      flowType: t.flowType ? FLOW_TYPES[t.flowType] : ""
    }));

    const csv = [
      Object.keys(dataToExport[0] || {}).join(","),
      ...dataToExport.map(row => Object.values(row).map(v => `"${v}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${activityId}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Transactions exported");
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    if (filters.type !== "all" && t.type !== filters.type) return false;
    if (filters.status !== "all" && t.status !== filters.status) return false;
    if (filters.dateFrom && t.transactionDate < filters.dateFrom) return false;
    if (filters.dateTo && t.transactionDate > filters.dateTo) return false;
    return true;
  });

  // Calculate totals (actual transactions only)
  const totalActual = filteredTransactions
    .filter(t => t.status === "actual")
    .reduce((sum, t) => sum + t.value, 0);

  const formatCurrency = (value: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Safe date formatter that handles invalid dates
  const formatTransactionDate = (dateString: string | undefined | null): string => {
    if (!dateString) return "No date";
    
    try {
      const date = new Date(dateString);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date value: ${dateString}`);
        return "Invalid date";
      }
      return format(date, "PPP");
    } catch (error) {
      console.error(`Error formatting date: ${dateString}`, error);
      return "Invalid date";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transactions</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage IATI-compliant financial transactions
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Transaction
              </Button>
              {transactions.length > 0 && (
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          {transactions.length > 0 && (
            <div className="mb-4 p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4" />
                Filters
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Select value={filters.type} onValueChange={v => setFilters({...filters, type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {Object.entries(TRANSACTION_TYPES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>{value} ({key})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.status} onValueChange={v => setFilters({...filters, status: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="actual">Actual</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  placeholder="From date"
                  value={filters.dateFrom}
                  onChange={e => setFilters({...filters, dateFrom: e.target.value})}
                />
                <Input
                  type="date"
                  placeholder="To date"
                  value={filters.dateTo}
                  onChange={e => setFilters({...filters, dateTo: e.target.value})}
                />
              </div>
            </div>
          )}

          {/* Transactions List */}
          {(isLoading || partnersLoading) ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="animate-pulse">
                {isLoading ? "Loading transactions..." : "Loading organizations..."}
              </div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {transactions.length === 0 
                ? "No transactions have been added yet." 
                : "No transactions match the current filters."}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => (
                  <div key={`${transaction.id}-${partners.length}`} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{TRANSACTION_ACRONYMS[transaction.type] || transaction.type}</span>
                          <Badge variant={transaction.status === "actual" ? "default" : "secondary"}>
                            {TRANSACTION_STATUS[transaction.status]}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatTransactionDate(transaction.transactionDate)}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">From:</span> {partnersLoading ? 'Loading organizations...' : getOrgNameById(transaction.providerOrg)}
                          </div>
                          <div>
                            <span className="text-muted-foreground">To:</span> {partnersLoading ? 'Loading organizations...' : getOrgNameById(transaction.receiverOrg)}
                          </div>
                        </div>
                        {transaction.narrative && (
                          <p className="text-sm text-muted-foreground">{transaction.narrative}</p>
                        )}
                      </div>
                      <div className="flex items-start gap-2 ml-4">
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {formatCurrency(transaction.value, transaction.currency)}
                          </p>
                          {transaction.aidType && (
                            <p className="text-xs text-muted-foreground">{AID_TYPES[transaction.aidType]}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(transaction)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(transaction.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total (Actual Transactions Only):</span>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-bold">{formatCurrency(totalActual, "USD")}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? "Edit Transaction" : "Add New Transaction"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Transaction Type</label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v as keyof typeof TRANSACTION_TYPES})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRANSACTION_TYPES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>{value} ({key})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v as keyof typeof TRANSACTION_STATUS})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="actual">Actual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Value</label>
                <Input
                  type="number"
                  value={formData.value}
                  onChange={e => setFormData({...formData, value: Number(e.target.value)})}
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Currency</label>
                <Select value={formData.currency} onValueChange={v => setFormData({...formData, currency: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="JPY">JPY</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Transaction Date</label>
              <Input
                type="date"
                value={formData.transactionDate}
                onChange={e => setFormData({...formData, transactionDate: e.target.value})}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Provider Organisation</label>
              <Select value={formData.providerOrg} onValueChange={v => setFormData({...formData, providerOrg: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider organisation" />
                </SelectTrigger>
                <SelectContent>
                  {partners.length === 0 ? (
                    <SelectItem value="other" disabled>No partners available</SelectItem>
                  ) : (
                    <>
                      {partners.map((partner) => {
                        // Use fullName (full organization name) with acronym in brackets
                        const displayName = partner.fullName || partner.name || 'Unknown Organization';
                        const fullDisplayName = partner.acronym && displayName !== partner.acronym 
                          ? `${displayName} (${partner.acronym})`
                          : displayName;
                        return (
                          <SelectItem key={partner.id} value={partner.id}>
                            {fullDisplayName}
                          </SelectItem>
                        );
                      })}
                      <SelectItem value="Other">Other (Not in system)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Receiver Organisation</label>
              <Select value={formData.receiverOrg} onValueChange={v => setFormData({...formData, receiverOrg: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select receiver organisation" />
                </SelectTrigger>
                <SelectContent>
                  {partners.length === 0 ? (
                    <SelectItem value="other" disabled>No partners available</SelectItem>
                  ) : (
                    <>
                      {partners.map((partner) => {
                        // Use fullName (full organization name) with acronym in brackets
                        const displayName = partner.fullName || partner.name || 'Unknown Organization';
                        const fullDisplayName = partner.acronym && displayName !== partner.acronym 
                          ? `${displayName} (${partner.acronym})`
                          : displayName;
                        return (
                          <SelectItem key={partner.id} value={partner.id}>
                            {fullDisplayName}
                          </SelectItem>
                        );
                      })}
                      <SelectItem value="Other">Other (Not in system)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Aid Type</label>
                <Select value={formData.aidType} onValueChange={v => setFormData({...formData, aidType: v as keyof typeof AID_TYPES})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AID_TYPES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>{key} - {value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Flow Type</label>
                <Select value={formData.flowType} onValueChange={v => setFormData({...formData, flowType: v as keyof typeof FLOW_TYPES})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FLOW_TYPES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>{value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Tied Status</label>
              <Select value={formData.tiedStatus} onValueChange={v => setFormData({...formData, tiedStatus: v as keyof typeof TIED_STATUS})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIED_STATUS).map(([key, value]) => (
                    <SelectItem key={key} value={key}>{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Narrative / Description</label>
              <Input
                value={formData.narrative}
                onChange={e => setFormData({...formData, narrative: e.target.value})}
                placeholder="Additional details about this transaction"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingTransaction ? "Update" : "Add"} Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 