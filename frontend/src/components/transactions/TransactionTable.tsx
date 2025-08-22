import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  Banknote,
  CreditCard,
  Coins,
  TrendingUp,
  HandCoins,
  RefreshCw,
  PiggyBank,
  TrendingDown,
  AlertCircle,
  FileText,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  CheckCircle,
  FileClock,
  Edit,
  Trash2,
  Info,
  ArrowUpFromLine,
  ArrowDownToLine,
  DollarSign,
  Heart,
  ReceiptText,
  Handshake,
  Shuffle,
  Link2,
  Copy,
  MoreVertical,
  Check,
} from "lucide-react";
import { TransactionValueDisplay } from "@/components/currency/TransactionValueDisplay";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Transaction type to icon mapping
const TRANSACTION_TYPE_ICONS: Record<string, React.FC<any>> = {
  '1': ArrowDownToLine, // Incoming Commitment
  '2': HandCoins,       // Outgoing Commitment  
  '3': ArrowUpFromLine, // Disbursement
  '4': Banknote,        // Expenditure
  '5': TrendingDown,    // Interest Repayment
  '6': ArrowDownToLine, // Loan Repayment
  '7': RefreshCw,       // Reimbursement
  '8': ArrowUpFromLine, // Purchase of Equity
  '9': ArrowDownToLine, // Sale of Equity
  '11': FileText,       // Credit Guarantee
  '12': ArrowDownToLine,// Incoming Funds
  '13': AlertCircle,    // Commitment Cancellation
};

// Transaction type labels
const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  '1': 'Incoming Commitment',
  '2': 'Outgoing Commitment',
  '3': 'Disbursement',
  '4': 'Expenditure',
  '5': 'Interest Repayment',
  '6': 'Loan Repayment',
  '7': 'Reimbursement',
  '8': 'Purchase of Equity',
  '9': 'Sale of Equity',
  '11': 'Credit Guarantee',
  '12': 'Incoming Funds',
  '13': 'Commitment Cancellation'
};

// Aid Type mappings
const AID_TYPE_LABELS: Record<string, { short: string; full: string }> = {
  'A01': { short: 'Budget', full: 'General budget support' },
  'A02': { short: 'Sector', full: 'Sector budget support' },
  'B01': { short: 'NGO Core', full: 'Core support to NGOs' },
  'B02': { short: 'Multilateral', full: 'Core contributions to multilateral institutions' },
  'B03': { short: 'Programme', full: 'Contributions to pooled programmes and funds' },
  'B04': { short: 'Basket', full: 'Basket funds/pooled funding' },
  'C01': { short: 'Project', full: 'Project-type interventions' },
  'D01': { short: 'Personnel', full: 'Donor country personnel' },
  'D02': { short: 'Technical', full: 'Other technical assistance' },
  'E01': { short: 'Scholarship', full: 'Scholarships/training in donor country' },
  'E02': { short: 'Student', full: 'Imputed student costs' },
  'F01': { short: 'Debt', full: 'Debt relief' },
  'G01': { short: 'Admin', full: 'Administrative costs not included elsewhere' },
  'H01': { short: 'Awareness', full: 'Development awareness' },
  'H02': { short: 'Refugees', full: 'Refugees in donor countries' }
};

// Flow Type mappings
const FLOW_TYPE_LABELS: Record<string, string> = {
  '10': 'Official Development Assistance',
  '20': 'Other Official Flows',
  '21': 'Non-export credit OOF',
  '22': 'Officially supported export credits',
  '30': 'Private grants',
  '35': 'Private market',
  '36': 'Private Foreign Direct Investment',
  '37': 'Other private flows at market terms',
  '40': 'Non flow',
  '50': 'Other flows'
};

// Finance Type mappings
const FINANCE_TYPE_LABELS: Record<string, { short: string; full: string }> = {
  '110': { short: 'Grant', full: 'Standard grant' },
  '111': { short: 'Subsidy', full: 'Subsidies to national private investors' },
  '210': { short: 'Interest', full: 'Interest subsidy' },
  '211': { short: 'Export Sub', full: 'Interest subsidy to national private exporters' },
  '310': { short: 'Deposit', full: 'Deposit basis' },
  '311': { short: 'Encashment', full: 'Encashment basis' },
  '410': { short: 'Loan', full: 'Aid loan excluding debt reorganisation' },
  '411': { short: 'Inv Loan', full: 'Investment-related loan to developing countries' },
  '412': { short: 'Joint Loan', full: 'Loan in a joint venture with the recipient' },
  '413': { short: 'Private Loan', full: 'Loan to national private investor' },
  '414': { short: 'Export Loan', full: 'Loan to national private exporter' },
  '421': { short: 'Standard Loan', full: 'Standard loan' },
  '422': { short: 'Reimbursable Grant', full: 'Reimbursable grant' },
  '423': { short: 'Bonds', full: 'Bonds' },
  '424': { short: 'Asset-backed Securities', full: 'Asset-backed securities' },
  '425': { short: 'Other Debt Securities', full: 'Other debt securities' },
  '431': { short: 'Subordinated Loan', full: 'Subordinated loan' },
  '432': { short: 'Preferred Equity', full: 'Preferred equity' },
  '433': { short: 'Other Hybrid', full: 'Other hybrid instruments' },
  '451': { short: 'Export Credit', full: 'Non-banks guaranteed export credits' },
  '452': { short: 'Non-guaranteed', full: 'Non-banks non-guaranteed portions of guaranteed export credits' },
  '453': { short: 'Bank Credit', full: 'Bank export credits' },
  '510': { short: 'Common Equity', full: 'Common equity' },
  '520': { short: 'Collective Investment', full: 'Shares in collective investment vehicles' },
  '530': { short: 'Reinvested Earnings', full: 'Reinvested earnings' },
  '610': { short: 'Debt Forgiveness (ODA-P)', full: 'Debt forgiveness: ODA claims (P)' },
  '611': { short: 'Debt Forgiveness (ODA-I)', full: 'Debt forgiveness: ODA claims (I)' },
  '620': { short: 'Debt Rescheduling (ODA-P)', full: 'Debt rescheduling: ODA claims (P)' },
  '621': { short: 'Debt Rescheduling (ODA-I)', full: 'Debt rescheduling: ODA claims (I)' },
  '710': { short: 'FDI', full: 'Foreign direct investment' },
  '711': { short: 'Other FDI', full: 'Other foreign direct investment' },
  '810': { short: 'Bank Bonds', full: 'Bank bonds' },
  '811': { short: 'Non-bank Bonds', full: 'Non-bank bonds' },
  '910': { short: 'Securities', full: 'Other securities/claims' },
  '1100': { short: 'Guarantee', full: 'Guarantees for private investors' }
};

// Tied Status mappings
const TIED_STATUS_LABELS: Record<string, { short: string; full: string }> = {
  '1': { short: 'Tied', full: 'Aid is tied' },
  '2': { short: 'Partial', full: 'Partially tied' },
  '3': { short: 'Untied', full: 'Aid is untied' },
  '4': { short: 'Not reported', full: 'Tied status not reported' }
};

// Disbursement Channel mappings
const DISBURSEMENT_CHANNEL_LABELS: Record<string, { short: string; full: string }> = {
  '1': { short: 'Direct', full: 'Money is disbursed directly to the implementing institution' },
  '2': { short: 'Through', full: 'Money is disbursed through the implementing institution' },
  '3': { short: 'Not reported', full: 'Disbursement channel not reported' },
  '4': { short: 'Other', full: 'Other' }
};

interface TransactionData {
  id: string;
  uuid?: string;
  activity_id?: string;
  transaction_reference?: string;
  activity?: {
    id: string;
    title: string;
    iati_id?: string;
    title_narrative?: string;
  };
  provider_org_name?: string;
  provider_org_ref?: string;
  provider_org_acronym?: string;
  receiver_org_name?: string;
  receiver_org_ref?: string;
  receiver_org_acronym?: string;
  from_org?: string;
  to_org?: string;
  transaction_type: string;
  aid_type?: string;
  flow_type?: string;
  finance_type?: string;
  tied_status?: string;
  disbursement_channel?: string;
  is_humanitarian?: boolean;
  value: number;
  currency: string;
  transaction_date: string;
  created_by?: string;
  status?: string;
  transaction_status?: string;
  // Currency conversion fields
  value_usd?: number | null;
  usd_convertible?: boolean;
  usd_conversion_date?: string | null;
  exchange_rate_used?: number | null;
}

interface TransactionTableProps {
  transactions: TransactionData[];
  loading: boolean;
  error: string | null;
  sortField: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
  onRowClick?: (transactionId: string) => void;
  onEdit?: (transaction: TransactionData) => void;
  onDelete?: (transactionId: string) => void;
  onConvertCurrency?: (transactionId: string) => void;
  variant?: "full" | "compact";
}

export function TransactionTable({
  transactions,
  loading,
  error,
  sortField,
  sortOrder,
  onSort,
  onRowClick,
  onEdit,
  onDelete,
  onConvertCurrency,
  variant = "full",
}: TransactionTableProps) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (text: string, type: string, transactionId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(`${transactionId}-${type}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const formatCurrency = (value: number, currency: string = "USD") => {
    // Ensure currency is a valid 3-letter code, fallback to USD
    const safeCurrency = currency && currency.length === 3 && /^[A-Z]{3}$/.test(currency.toUpperCase()) 
      ? currency.toUpperCase() 
      : "USD";
    
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: safeCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    } catch (error) {
      console.warn(`[TransactionTable] Invalid currency "${currency}", using USD:`, error);
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
  };

  const getTransactionIcon = (type: string) => {
    const Icon = TRANSACTION_TYPE_ICONS[type] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-3 w-3 text-gray-400" />;
    }
    return sortOrder === "asc" ? (
      <ChevronUp className="h-3 w-3 text-gray-700" />
    ) : (
      <ChevronDown className="h-3 w-3 text-gray-700" />
    );
  };

  const getStatusIcon = (status: string | undefined) => {
    const actualStatus = status === 'actual' || status === 'A';
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center">
              {actualStatus ? (
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              ) : (
                <FileClock className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="text-sm">{actualStatus ? 'Actual' : 'Draft'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const formatTransactionDate = (dateString: string | null | undefined) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '—';
      return format(date, "dd MMM yyyy");
    } catch (error) {
      return '—';
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading transactions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Error loading transactions: {error}</p>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">No transactions found</p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader className="bg-muted/50 border-b border-border">
          <TableRow>
            {variant === "full" && (
              <TableHead 
                className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => onSort("activity")}
              >
                <div className="flex items-center gap-1">
                  <span>Activity</span>
                  {getSortIcon("activity")}
                </div>
              </TableHead>
            )}
            <TableHead 
              className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => onSort("transaction_date")}
            >
              <div className="flex items-center gap-1">
                <span>Date</span>
                {getSortIcon("transaction_date")}
              </div>
            </TableHead>
            <TableHead
              className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => onSort("transaction_type")}
            >
              <div className="flex items-center gap-1">
                <span>Type</span>
                {getSortIcon("transaction_type")}
              </div>
            </TableHead>

            <TableHead 
              className="h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => onSort("provider_org_name")}
            >
              <div className="flex items-center gap-1">
                <span>Provider → Receiver</span>
                {getSortIcon("provider_org_name")}
              </div>
            </TableHead>
            <TableHead
              className="h-12 px-4 py-3 text-right align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => onSort("value")}
            >
              <div className="flex items-center justify-end gap-1">
                <span>Reported Value</span>
                {getSortIcon("value")}
              </div>
            </TableHead>
            <TableHead
              className="h-12 px-4 py-3 text-right align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => onSort("value_usd")}
            >
              <div className="flex items-center justify-end gap-1">
                <span>USD Value</span>
                {getSortIcon("value_usd")}
              </div>
            </TableHead>
            {variant === "full" && (
              <TableHead className="hidden xl:table-cell h-12 px-4 py-3 text-left align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => onSort("finance_type")}>
                <div className="flex items-center gap-1">
                  <span>Finance Type</span>
                  {getSortIcon("finance_type")}
                </div>
              </TableHead>
            )}
            <TableHead className="h-12 px-4 py-3 text-center align-middle text-sm font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => onSort("aid_type")}>
              <div className="flex items-center gap-1">
                <span>Modality & Classification</span>
                {getSortIcon("aid_type")}
              </div>
            </TableHead>

            <TableHead className="h-12 px-4 py-3 text-right align-middle text-sm font-medium text-muted-foreground">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction, index) => {
            const providerName = transaction.provider_org_name || transaction.from_org || "Unknown Provider";
            const receiverName = transaction.receiver_org_name || transaction.to_org || "Unknown Receiver";
            const providerDisplay = transaction.provider_org_acronym || providerName;
            const receiverDisplay = transaction.receiver_org_acronym || receiverName;
            const orgFlow = `${providerName} → ${receiverName}`;
            
            return (
            <TableRow
              key={transaction.id}
              className={cn(
                "hover:bg-muted/10 transition-colors",
                onRowClick && "cursor-pointer",
                index % 2 === 1 && "bg-muted/5"
              )}
              onClick={(e) => {
                // Don't trigger row click if clicking on action buttons
                if ((e.target as HTMLElement).closest('.actions-cell')) return;
                onRowClick?.(transaction.uuid || transaction.id);
              }}
            >
                {variant === "full" && (
                  <td className="px-4 py-3">
                    <div 
                      className="space-y-0.5 cursor-pointer hover:opacity-75 group"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (transaction.activity_id) {
                          window.location.href = `/activities/${transaction.activity_id}`;
                        }
                      }}
                    >
                      <div className="flex items-start gap-1">
                        <div className="text-sm font-normal text-foreground line-clamp-2 flex-1">
                          {transaction.activity?.title || transaction.activity?.title_narrative || 'Untitled Activity'}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-3 w-3 p-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 inline-flex items-center justify-center align-text-top"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const activityTitle = transaction.activity?.title || transaction.activity?.title_narrative || 'Untitled Activity';
                                    copyToClipboard(activityTitle, 'title', transaction.uuid || transaction.id);
                                  }}
                                >
                                  {copiedId === `${transaction.uuid || transaction.id}-title` ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p className="text-sm">Copy activity title</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      {/* Transaction Reference (if exists) */}
                      {transaction.transaction_reference && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <span>
                            {transaction.transaction_reference}
                          </span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-4 w-4 p-0 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(
                                      transaction.transaction_reference || '',
                                      'reference',
                                      transaction.uuid || transaction.id
                                    );
                                  }}
                                >
                                  {copiedId === `${transaction.uuid || transaction.id}-reference` ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p className="text-sm">Copy transaction reference</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                  </td>
                )}
                <td className="px-4 py-3 whitespace-nowrap text-sm font-normal text-foreground">
                  {formatTransactionDate(transaction.transaction_date)}
                </td>
                <td className="px-4 py-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {getTransactionIcon(transaction.transaction_type)}
                          </div>
                          <span className="text-sm font-normal text-foreground break-words">
                            {TRANSACTION_TYPE_LABELS[transaction.transaction_type] || transaction.transaction_type}
                          </span>
                          {transaction.is_humanitarian && (
                            <Heart className="h-3 w-3 text-red-500 fill-red-500" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="text-sm">{TRANSACTION_TYPE_LABELS[transaction.transaction_type] || 'Unknown Type'}</p>
                        {transaction.is_humanitarian ? (
                          <p className="text-xs text-red-500 mt-1">❤️ Humanitarian Transaction</p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">Code: {transaction.transaction_type}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>

                <td className="px-4 py-3">
                  <div className="text-sm font-normal text-foreground">
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-base cursor-help">
                              {providerDisplay}
                            </span>
                          </TooltipTrigger>
                          {transaction.provider_org_ref && (
                            <TooltipContent side="top">
                              <p className="text-xs">{transaction.provider_org_ref}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                      <span className="text-muted-foreground">→</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-base cursor-help">
                              {receiverDisplay}
                            </span>
                          </TooltipTrigger>
                          {transaction.receiver_org_ref && (
                            <TooltipContent side="top">
                              <p className="text-xs">{transaction.receiver_org_ref}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-normal text-foreground text-right">
                  <TransactionValueDisplay
                    transaction={transaction}
                    onConvert={onConvertCurrency}
                    showConvertButton={!!onConvertCurrency}
                    compact={true}
                    variant="original-only"
                    decimalPlaces={2}
                    monotone={true}
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-normal text-foreground text-right">
                  {transaction.value_usd !== null && transaction.value_usd !== undefined ? (
                    <TransactionValueDisplay
                      transaction={transaction}
                      onConvert={onConvertCurrency}
                      showConvertButton={!!onConvertCurrency}
                      compact={true}
                      variant="usd-only"
                      decimalPlaces={2}
                      monotone={true}
                    />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                {variant === "full" && (
                  <td className="hidden xl:table-cell px-4 py-3 whitespace-nowrap">
                    {transaction.finance_type ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm font-normal text-foreground cursor-help">
                              {FINANCE_TYPE_LABELS[transaction.finance_type]?.short || transaction.finance_type}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p className="text-sm">{transaction.finance_type} – {FINANCE_TYPE_LABELS[transaction.finance_type]?.full || 'Unknown'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-sm font-normal text-muted-foreground">—</span>
                    )}
                  </td>
                )}
                {/* Modality & Classification column with tooltip, triggered by ReceiptText icon */}
                <td className="px-4 py-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center cursor-pointer">
                          <ReceiptText className="h-5 w-5 text-gray-500 hover:text-primary" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-white text-foreground border border-gray-200 shadow-xl p-4 min-w-[280px] max-w-[320px] rounded-lg">
                        <div className="space-y-3">
                          {/* Flow Type */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Shuffle className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold text-gray-800">Flow Type:</span>
                            </div>
                            <span className="block text-sm text-gray-600 pl-6">
                              {transaction.flow_type ? (FLOW_TYPE_LABELS[transaction.flow_type] || transaction.flow_type) : 'Not specified'}
                            </span>
                          </div>
                          
                          {/* Aid Type */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Handshake className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold text-gray-800">Aid Type:</span>
                            </div>
                            <span className="block text-sm text-gray-600 pl-6">
                              {transaction.aid_type ? (AID_TYPE_LABELS[transaction.aid_type]?.full || transaction.aid_type) : 'Not specified'}
                            </span>
                          </div>
                          
                          {/* Tied Status */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Link2 className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold text-gray-800">Tied Status:</span>
                            </div>
                            <span className="block text-sm text-gray-600 pl-6">
                              {transaction.tied_status ? (TIED_STATUS_LABELS[transaction.tied_status]?.full || transaction.tied_status) : 'Not specified'}
                            </span>
                          </div>
                          
                          {/* Disbursement Channel */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold text-gray-800">Disbursement Channel:</span>
                            </div>
                            <span className="block text-sm text-gray-600 pl-6">
                              {transaction.disbursement_channel ? (DISBURSEMENT_CHANNEL_LABELS[transaction.disbursement_channel]?.full || transaction.disbursement_channel) : 'Not specified'}
                            </span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>

              <td className="px-4 py-3 whitespace-nowrap text-right actions-cell">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      aria-label="Open menu"
                    >
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
                    <DropdownMenuItem onSelect={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (onEdit) {
                        // If onEdit is provided, use it (for modal editing)
                        onEdit(transaction);
                      } else if (transaction.activity_id) {
                        // Fallback to navigation if no onEdit handler
                        router.push(`/activities/new?id=${transaction.activity_id}&section=finances`);
                      } else {
                        console.error('No activity_id found for transaction:', transaction);
                      }
                    }}>
                      <Edit className="mr-2 h-4 w-4" />
                      {onEdit ? 'Edit' : 'Edit in Activity Editor'}
                    </DropdownMenuItem>
                    {onDelete && (
                      <DropdownMenuItem onSelect={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete(transaction.uuid || transaction.id);
                      }} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}