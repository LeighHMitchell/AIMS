"use client"

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Download, ChevronUp, ChevronDown, ChevronsUpDown, Grid3X3, TableIcon } from "lucide-react";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { useTransactions } from "@/hooks/useTransactions";
import { TRANSACTION_TYPE_LABELS, Transaction } from "@/types/transaction";
import TransactionModal from "@/components/TransactionModal";
import { TransactionsListSkeleton } from "@/components/skeletons";
import { useCurrencyConverter } from "@/hooks/useCurrencyConverter";

type FilterState = {
  transactionType: string;
  aidType: string;
  flowType: string;
  financeType: string;
  organization: string;
  dateFrom: string;
  dateTo: string;
  status: string;
};

export default function TransactionsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [pageLimit, setPageLimit] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>("transaction_date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [organizations, setOrganizations] = useState<any[]>([]);
  
  const [filters, setFilters] = useState<FilterState>({
    transactionType: "all",
    aidType: "all",
    flowType: "all",
    financeType: "all",
    organization: "all",
    dateFrom: "",
    dateTo: "",
    status: "all",
  });

  // Use the custom hook to fetch transactions
  const { transactions, loading, error, refetch, deleteTransaction, addTransaction } = useTransactions({
    searchQuery,
    filters,
    sortField,
    sortOrder,
    page: currentPage,
    limit: pageLimit,
  });

  // Currency converter hook
  const { convertTransaction, isConverting, convertingIds, error: conversionError } = useCurrencyConverter();

  // Load saved page limit preference and fetch organizations on mount
  useEffect(() => {
    const saved = localStorage.getItem("transactions-page-limit");
    if (saved) {
      setPageLimit(Number(saved));
    }
    
    // Fetch organizations for filter dropdown
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || data);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters, sortField, sortOrder]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handlePageLimitChange = (newLimit: number) => {
    setPageLimit(newLimit);
    setCurrentPage(1);
    localStorage.setItem("transactions-page-limit", newLimit.toString());
  };

  const exportTransactions = () => {
    const dataToExport = transactions.data.map((transaction) => ({
      "Transaction ID": transaction.id,
      "Activity": transaction.activity?.title || transaction.activity_id,
      "From Organization": transaction.provider_org_name || transaction.from_org || "",
      "To Organization": transaction.receiver_org_name || transaction.to_org || "",
      "Transaction Type": TRANSACTION_TYPE_LABELS[transaction.transaction_type as keyof typeof TRANSACTION_TYPE_LABELS] || transaction.transaction_type,
      "Aid Type": transaction.aid_type || "",
      "Flow Type": transaction.flow_type || "",
      "Finance Type": transaction.finance_type || "",
      "Value": transaction.value,
      "Currency": transaction.currency,
      "Transaction Date": format(new Date(transaction.transaction_date), "yyyy-MM-dd"),
      "Status": transaction.status,
      "Created By": transaction.created_by || "",
    }));

    const headers = Object.keys(dataToExport[0] || {});
    const csv = [
      headers.join(","),
      ...dataToExport.map((row) =>
        headers
          .map((header) => {
            const value = row[header as keyof typeof row];
            return typeof value === "string" && value.includes(",")
              ? `"${value}"`
              : value;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Transactions exported successfully");
  };

  const handleRowClick = (transactionId: string) => {
    router.push(`/transactions/${transactionId}`);
  };

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction);
    setShowTransactionModal(true);
  };

  const handleDelete = async (transactionId: string) => {
    if (!transactionId || transactionId === 'undefined') {
      toast.error("Invalid transaction ID");
      return;
    }

    if (!confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    // Find the transaction to delete (for potential recovery)
    const transactionToDelete = transactions.data.find(t => (t.uuid || t.id) === transactionId);
    
    // Optimistic update - remove from UI immediately
    deleteTransaction(transactionId);

    try {
      const response = await fetch(`/api/transactions?uuid=${transactionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete transaction');
      }

      toast.success("Transaction deleted successfully");
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      toast.error(error.message || "Failed to delete transaction");
      
      // Revert the optimistic update on error
      if (transactionToDelete) {
        addTransaction(transactionToDelete);
      } else {
        refetch(); // Fallback: refresh the entire list
      }
    }
  };

  const handleConvertCurrency = async (transactionId: string) => {
    const transaction = transactions.data.find(t => (t.uuid || t.id) === transactionId);
    if (!transaction) {
      toast.error("Transaction not found");
      return;
    }

    try {
      const success = await convertTransaction(
        transactionId,
        transaction.value,
        transaction.currency,
        transaction.value_date || transaction.transaction_date
      );

      if (success) {
        toast.success(`Transaction converted to USD successfully`);
        refetch(); // Refresh to show updated USD values
      } else {
        toast.error(conversionError || "Failed to convert transaction");
      }
    } catch (error) {
      console.error('Currency conversion error:', error);
      toast.error("Currency conversion failed");
    }
  };

  const handleTransactionSubmit = async (formData: any) => {
    try {
      const response = await fetch('/api/transactions', {
        method: editingTransaction ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          id: editingTransaction?.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save transaction');
      }

      toast.success(editingTransaction ? "Transaction updated successfully" : "Transaction added successfully");
      setShowTransactionModal(false);
      setEditingTransaction(null);
      refetch(); // Refresh the transactions list
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      toast.error(error.message || "Failed to save transaction");
    }
  };

  // Show skeleton loader during initial load
  if (loading && transactions.data.length === 0 && !searchQuery) {
    return (
      <MainLayout>
        <TransactionsListSkeleton />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-screen-2xl mx-auto px-6 py-4 space-y-6">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">Transactions</h1>
            <p className="text-slate-500">View and manage all financial transactions</p>
          </div>
          <div className="flex items-center space-x-4">
            {transactions.data.length > 0 && (
              <Button
                variant="outline"
                onClick={exportTransactions}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>
            )}
          </div>
        </div>

        {/* Search, Filters, and View Controls - All in One Row */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 py-4 bg-slate-50 rounded-lg px-4">
          {/* Left Side: Search + Filters + Page Size */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="w-full sm:w-auto sm:min-w-[240px] lg:min-w-[300px]">
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            
            {/* Status Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={filters.transactionType} onValueChange={(value) => setFilters({...filters, transactionType: value})}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Transaction Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="1">Incoming Commitment</SelectItem>
                  <SelectItem value="2">Outgoing Commitment</SelectItem>
                  <SelectItem value="3">Disbursement</SelectItem>
                  <SelectItem value="4">Expenditure</SelectItem>
                  <SelectItem value="5">Interest Repayment</SelectItem>
                  <SelectItem value="6">Loan Repayment</SelectItem>
                  <SelectItem value="7">Reimbursement</SelectItem>
                  <SelectItem value="8">Purchase of Equity</SelectItem>
                  <SelectItem value="9">Sale of Equity</SelectItem>
                  <SelectItem value="11">Credit Guarantee</SelectItem>
                  <SelectItem value="12">Incoming Funds</SelectItem>
                  <SelectItem value="13">Commitment Cancellation</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="actual">Actual</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filters.organization} onValueChange={(value) => setFilters({...filters, organization: value})}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name && org.acronym && org.name !== org.acronym
                        ? `${org.name} (${org.acronym})`
                        : org.name || org.acronym}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Show:</span>
                <Select 
                  value={pageLimit.toString()} 
                  onValueChange={(value) => handlePageLimitChange(Number(value))}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="9999">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Right Side: View Toggle + Results Count */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-r-none"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'card' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('card')}
                className="rounded-l-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Results Summary */}
            <p className="text-sm text-slate-600 whitespace-nowrap">
              {transactions.total === 0 
                ? "No transactions" 
                : `Showing ${(currentPage - 1) * pageLimit + 1}–${Math.min(currentPage * pageLimit, transactions.total)} of ${transactions.total} transactions`}
            </p>
          </div>
        </div>
        
        {/* Performance Warning (if applicable) */}
        {transactions.total > 500 && pageLimit === 9999 && (
          <div className="text-xs text-amber-600 px-4">
            ⚠️ Showing {transactions.total} items may affect performance
          </div>
        )}

        {/* Transactions Table */}
        {loading ? (
          <TransactionsListSkeleton />
        ) : transactions.total === 0 ? (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-8 text-center">
            {error ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Unable to Load Transactions</h3>
                  <p className="text-slate-500 mb-4">{error}</p>
                  <Button onClick={() => window.location.reload()} variant="outline">
                    Try Again
                  </Button>
                </div>
              </div>
            ) : searchQuery || filters.transactionType !== "all" || filters.status !== "all" || filters.organization !== "all" ? (
              <div className="text-slate-500">No matching transactions found</div>
            ) : (
              <div className="space-y-4">
                <div className="text-slate-500">No transactions yet.<br/>Transactions are created from within an activity.</div>
              </div>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <TransactionTable
                transactions={transactions.data}
                loading={false}
                error={null}
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
                onRowClick={handleRowClick}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onConvertCurrency={handleConvertCurrency}
              />
            </div>
          </div>
        ) : (
          // Card View - Not implemented yet
          <div className="bg-white rounded-md shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-slate-500">Card view not implemented yet</div>
          </div>
        )}

        {/* Pagination */}
        {transactions.total > pageLimit && pageLimit !== 9999 && (
          <div className="flex justify-center items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {Math.ceil(transactions.total / pageLimit)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) =>
                  Math.min(Math.ceil(transactions.total / pageLimit), prev + 1)
                )
              }
              disabled={currentPage >= Math.ceil(transactions.total / pageLimit)}
            >
              Next
            </Button>
          </div>
        )}

        {/* Transaction Modal */}
        <TransactionModal
          open={showTransactionModal}
          onOpenChange={(open) => {
            setShowTransactionModal(open);
            if (!open) {
              setEditingTransaction(null);
            }
          }}
          onSubmit={handleTransactionSubmit}
          transaction={editingTransaction}
          activityId={editingTransaction?.activity_id || ''}
        />
      </div>
    </MainLayout>
  );
} 