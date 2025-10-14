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
  Handshake,
  Shuffle,
  Link2,
  Copy,
  MoreVertical,
  Check,
  Globe,
  MapPin,
  Target,
  Building2,
  ArrowRight,
  Code,
  Calendar,
  ShieldCheck,
  Shield,
  User,
  Clock,
  UserCheck,
  UserX,
  FileText,
} from "lucide-react";
import { TransactionValueDisplay } from "@/components/currency/TransactionValueDisplay";
import { TIED_STATUS_LABELS } from "@/types/transaction";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
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

// Tied Status mappings - imported from types
// Using centralized TIED_STATUS_LABELS from @/types/transaction

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
  description?: string;
  activity?: {
    id: string;
    title: string;
    iati_id?: string;
    title_narrative?: string;
  };
  provider_org_name?: string;
  provider_org_ref?: string;
  provider_org_acronym?: string;
  provider_org_activity_id?: string;
  receiver_org_name?: string;
  receiver_org_ref?: string;
  receiver_org_acronym?: string;
  receiver_org_activity_id?: string;
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
  // IATI Geographic & Sector fields
  sector_code?: string;
  sector_vocabulary?: string;
  recipient_country_code?: string;
  recipient_region_code?: string;
  recipient_region_vocab?: string;
  // IATI Multiple elements
  sectors?: Array<{code: string; vocabulary?: string; percentage?: number; narrative?: string}>;
  aid_types?: Array<{code: string; vocabulary?: string}>;
  recipient_countries?: Array<{code: string; percentage?: number}>;
  recipient_regions?: Array<{code: string; vocabulary?: string; percentage?: number; narrative?: string}>;
  // Metadata fields
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
  validated_by?: string;
  validated_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  validation_comments?: string;
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activityDetails, setActivityDetails] = useState<Record<string, {title: string; iati_identifier: string; acronym?: string; reporting_org?: string} | null>>({});
  const [loadingActivities, setLoadingActivities] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (transactionId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(transactionId)) {
        newSet.delete(transactionId);
      } else {
        newSet.add(transactionId);
      }
      return newSet;
    });
  };

  // Fetch activity details by UUID
  const fetchActivityDetails = async (activityId: string) => {
    if (activityDetails[activityId] !== undefined || loadingActivities.has(activityId)) {
      return; // Already fetched or currently fetching
    }

    setLoadingActivities(prev => new Set(prev).add(activityId));
    
    try {
      const response = await fetch(`/api/activities/${activityId}`);
      if (response.ok) {
        const activity = await response.json();
        setActivityDetails(prev => ({
          ...prev,
          [activityId]: {
            title: activity.title_narrative || activity.title || 'Untitled Activity',
            iati_identifier: activity.iati_identifier || '',
            acronym: activity.acronym,
            reporting_org: activity.created_by_org_name || activity.created_by_org_acronym || undefined
          }
        }));
      } else {
        setActivityDetails(prev => ({...prev, [activityId]: null}));
      }
    } catch (error) {
      console.error('Error fetching activity details:', error);
      setActivityDetails(prev => ({...prev, [activityId]: null}));
    } finally {
      setLoadingActivities(prev => {
        const newSet = new Set(prev);
        newSet.delete(activityId);
        return newSet;
      });
    }
  };

  // Fetch activities when rows are expanded
  React.useEffect(() => {
    transactions.forEach(transaction => {
      const transactionId = transaction.uuid || transaction.id;
      if (expandedRows.has(transactionId)) {
        if (transaction.provider_org_activity_id) {
          fetchActivityDetails(transaction.provider_org_activity_id);
        }
        if (transaction.receiver_org_activity_id) {
          fetchActivityDetails(transaction.receiver_org_activity_id);
        }
      }
    });
  }, [expandedRows, transactions]);

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
      // Format number with commas
      const formattedValue = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
      
      // Return format: "EUR 3,000"
      return `${safeCurrency} ${formattedValue}`;
    } catch (error) {
      console.warn(`[TransactionTable] Invalid currency "${currency}", using USD:`, error);
      const formattedValue = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
      return `USD ${formattedValue}`;
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
        <TableHeader className="bg-muted/50 border-b border-border/70">
          <TableRow>
            <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 w-10 text-center">
              
            </TableHead>
            {variant === "full" && (
              <TableHead 
                className="text-sm font-medium text-foreground/90 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => onSort("activity")}
              >
                <div className="flex items-center gap-1">
                  <span>Activity</span>
                  {getSortIcon("activity")}
                </div>
              </TableHead>
            )}
            <TableHead 
              className="text-sm font-medium text-foreground/90 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => onSort("transaction_date")}
            >
              <div className="flex items-center gap-1">
                <span>Date</span>
                {getSortIcon("transaction_date")}
              </div>
            </TableHead>
            <TableHead
              className="text-sm font-medium text-foreground/90 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => onSort("transaction_type")}
            >
              <div className="flex items-center gap-1">
                <span>Type</span>
                {getSortIcon("transaction_type")}
              </div>
            </TableHead>

            <TableHead 
              className="text-sm font-medium text-foreground/90 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => onSort("provider_org_name")}
            >
              <div className="flex items-center gap-1">
                <span>Provider → Receiver</span>
                {getSortIcon("provider_org_name")}
              </div>
            </TableHead>
            <TableHead
              className="text-sm font-medium text-foreground/90 py-3 px-4 text-right cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => onSort("value")}
            >
              <div className="flex items-center justify-end gap-1">
                <span>Reported Value</span>
                {getSortIcon("value")}
              </div>
            </TableHead>
            <TableHead
              className="text-sm font-medium text-foreground/90 py-3 px-4 text-right cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => onSort("value_usd")}
            >
              <div className="flex items-center justify-end gap-1">
                <span>USD Value</span>
                {getSortIcon("value_usd")}
              </div>
            </TableHead>
            {variant === "full" && (
              <TableHead className="hidden xl:table-cell text-sm font-medium text-foreground/90 py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => onSort("finance_type")}>
                <div className="flex items-center gap-1">
                  <span>Finance Type</span>
                  {getSortIcon("finance_type")}
                </div>
              </TableHead>
            )}

            <TableHead className="text-sm font-medium text-foreground/90 py-3 px-4 text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction, index) => {
            const providerName = transaction.provider_org_name || transaction.from_org || "Unknown";
            const receiverName = transaction.receiver_org_name || transaction.to_org || "Unknown";
            const providerDisplay = transaction.provider_org_acronym || providerName;
            const receiverDisplay = transaction.receiver_org_acronym || receiverName;
            const orgFlow = `${providerName} → ${receiverName}`;
            const transactionId = transaction.uuid || transaction.id;
            const isExpanded = expandedRows.has(transactionId);
            
            // Check if transaction has IATI advanced fields
            const hasAdvancedFields = !!(
              transaction.sector_code || 
              transaction.sectors?.length ||
              transaction.recipient_country_code ||
              transaction.recipient_countries?.length ||
              transaction.recipient_region_code ||
              transaction.recipient_regions?.length ||
              transaction.aid_types?.length ||
              transaction.provider_org_activity_id ||
              transaction.receiver_org_activity_id ||
              transaction.description
            );
            
            return (
            <React.Fragment key={transaction.id}>
            <TableRow
              className={cn(
                "border-b border-border/40 hover:bg-muted/30 transition-colors"
              )}
            >
                {/* Expand/Collapse Button */}
                <td className="py-3 px-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRowExpansion(transactionId);
                    }}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </td>
            
                {variant === "full" && (
                  <td className="py-3 px-4">
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
                        <div className="text-sm font-medium text-foreground line-clamp-2 flex-1">
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
                <td className="py-3 px-4 whitespace-nowrap">
                  {formatTransactionDate(transaction.transaction_date)}
                </td>
                <td className="py-3 px-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="text-sm font-medium text-foreground break-words cursor-help">
                              {TRANSACTION_TYPE_LABELS[transaction.transaction_type] || transaction.transaction_type}
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="text-sm">{TRANSACTION_TYPE_LABELS[transaction.transaction_type] || 'Unknown Type'}</p>
                            <p className="text-xs text-muted-foreground mt-1">Code: {transaction.transaction_type}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      {/* Icons in order: Link → Heart → Shield (validated) */}
                      {(transaction.provider_org_activity_id || transaction.receiver_org_activity_id) && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger 
                              asChild
                              onMouseEnter={() => {
                                if (transaction.provider_org_activity_id) {
                                  fetchActivityDetails(transaction.provider_org_activity_id);
                                }
                                if (transaction.receiver_org_activity_id) {
                                  fetchActivityDetails(transaction.receiver_org_activity_id);
                                }
                              }}
                            >
                              <Link2 className="h-3 w-3 text-purple-600" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-md">
                              <div className="space-y-3">
                                <p className="text-sm font-semibold text-foreground">Linked Activities</p>
                                
                                {transaction.provider_org_activity_id && (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-3 w-3 text-gray-500" />
                                      <p className="text-xs font-medium text-gray-600">Provider Activity</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Target className="h-3 w-3 text-gray-500" />
                                      <p className="text-sm text-gray-800">{activityDetails[transaction.provider_org_activity_id]?.title || 'Unknown Activity'}</p>
                                    </div>
                                    {activityDetails[transaction.provider_org_activity_id]?.reporting_org && (
                                      <p className="text-xs text-gray-600">{activityDetails[transaction.provider_org_activity_id]?.reporting_org}</p>
                                    )}
                                    {activityDetails[transaction.provider_org_activity_id]?.iati_identifier && (
                                      <p className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                        {activityDetails[transaction.provider_org_activity_id]?.iati_identifier}
                                      </p>
                                    )}
                                  </div>
                                )}
                                
                                {transaction.receiver_org_activity_id && (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-3 w-3 text-gray-500" />
                                      <p className="text-xs font-medium text-gray-600">Receiver Activity</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Target className="h-3 w-3 text-gray-500" />
                                      <p className="text-sm text-gray-800">{activityDetails[transaction.receiver_org_activity_id]?.title || 'Unknown Activity'}</p>
                                    </div>
                                    {activityDetails[transaction.receiver_org_activity_id]?.reporting_org && (
                                      <p className="text-xs text-gray-600">{activityDetails[transaction.receiver_org_activity_id]?.reporting_org}</p>
                                    )}
                                    {activityDetails[transaction.receiver_org_activity_id]?.iati_identifier && (
                                      <p className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                                        {activityDetails[transaction.receiver_org_activity_id]?.iati_identifier}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                      )}
                    
                      {transaction.is_humanitarian && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Heart className="h-3 w-3 text-red-500 fill-red-500" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-sm">
                              <p className="text-xs leading-relaxed">
                                A humanitarian transaction is money that supports urgent relief work — such as saving lives, reducing suffering, or protecting people's dignity during or after a crisis (like a natural disaster or conflict).
                              </p>
                              <p className="text-xs leading-relaxed mt-2">
                                If the whole project is humanitarian, it is marked as humanitarian at the activity level.
                              </p>
                              <p className="text-xs leading-relaxed mt-1">
                                If only part of the project is humanitarian, those specific payments or transfers are marked as humanitarian at the transaction level.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      {transaction.status === 'actual' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="bg-white text-foreground border border-gray-200 shadow-xl p-3 max-w-[200px] rounded-lg">
                              <div className="space-y-1">
                                <p className="font-semibold text-gray-800 text-sm">Validated Transaction</p>
                                <p className="text-xs text-gray-600">
                                  This transaction has been verified and approved by your organisation.
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    
                    {/* IATI Indicator Badges */}
                    <div className="flex flex-wrap gap-1">
                      {(transaction.sectors?.length || 0) > 0 && (
                        <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                          <Target className="h-3 w-3 mr-1" />
                          {transaction.sectors?.length} Sector{(transaction.sectors?.length || 0) > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {(transaction.sector_code) && (
                        <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                          <Target className="h-3 w-3 mr-1" />
                          Sector
                        </Badge>
                      )}
                      {((transaction.recipient_countries?.length || 0) + (transaction.recipient_regions?.length || 0) + (transaction.recipient_country_code ? 1 : 0) + (transaction.recipient_region_code ? 1 : 0)) > 0 && (
                        <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                          <Globe className="h-3 w-3 mr-1" />
                          {((transaction.recipient_countries?.length || 0) + (transaction.recipient_regions?.length || 0) + (transaction.recipient_country_code ? 1 : 0) + (transaction.recipient_region_code ? 1 : 0))} Location{((transaction.recipient_countries?.length || 0) + (transaction.recipient_regions?.length || 0) + (transaction.recipient_country_code ? 1 : 0) + (transaction.recipient_region_code ? 1 : 0)) > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                </td>

                <td className="py-3 px-4">
                  <div className="text-sm font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm cursor-help">
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
                            <span className="text-sm cursor-help">
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
                <td className="py-3 px-4 text-right whitespace-nowrap">
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
                <td className="py-3 px-4 text-right whitespace-nowrap">
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
                  <td className="hidden xl:table-cell py-3 px-4 whitespace-nowrap">
                    {transaction.finance_type ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm font-medium text-foreground cursor-help">
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

              <td className="py-3 px-4 text-right">
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
            
            {/* Expanded Row Content - Data-Rich Card Dashboard */}
            {isExpanded && (
              <TableRow className="bg-slate-50/50">
                <td colSpan={variant === "full" ? 9 : 8} className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* LEFT COLUMN */}
                  <div className="space-y-4">
                      
                      {/* Transaction Summary Header */}
                      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-slate-600" />
                            <span className="text-lg font-semibold text-foreground">
                              {TRANSACTION_TYPE_LABELS[transaction.transaction_type]}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              — {format(new Date(transaction.transaction_date), 'dd MMM yyyy')}
                            </span>
                          </div>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Code className="h-3 w-3" />
                            View XML
                          </Button>
                        </div>
                        
                        {/* Organization Flow */}
                        <div className="flex items-center gap-2 mb-3 text-sm">
                          <span className="font-medium">{providerDisplay}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{receiverDisplay}</span>
                        </div>
                        
                        {/* Amount Display */}
                        <div className="text-2xl font-bold text-foreground mb-3">
                          {formatCurrency(transaction.value, transaction.currency)}
                        </div>
                        
                        {/* Mini Badges */}
                        <div className="flex flex-wrap gap-2">
                          {transaction.flow_type && (
                            <Badge variant="outline" className="bg-muted/50">
                              <Shuffle className="h-3 w-3 mr-1" />
                              {FLOW_TYPE_LABELS[transaction.flow_type] || transaction.flow_type}
                            </Badge>
                          )}
                          {transaction.finance_type && (
                            <Badge variant="outline" className="bg-muted/50">
                              <Coins className="h-3 w-3 mr-1" />
                              {FINANCE_TYPE_LABELS[transaction.finance_type]?.short || transaction.finance_type}
                            </Badge>
                          )}
                          {transaction.tied_status && (
                            <Badge variant="outline" className="bg-muted/50">
                              <Link2 className="h-3 w-3 mr-1" />
                              {TIED_STATUS_LABELS[transaction.tied_status as keyof typeof TIED_STATUS_LABELS] || transaction.tied_status}
                            </Badge>
                          )}
                          {transaction.disbursement_channel && (
                            <Badge variant="outline" className="bg-muted/50">
                              <Building2 className="h-3 w-3 mr-1" />
                              {DISBURSEMENT_CHANNEL_LABELS[transaction.disbursement_channel]?.short || transaction.disbursement_channel}
                            </Badge>
                          )}
                          {transaction.is_humanitarian && (
                            <Badge variant="outline" className="bg-muted/50">
                              <Heart className="h-3 w-3 mr-1 fill-current" />
                              Humanitarian
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Parties Involved Flowcard */}
                      <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Parties Involved</h3>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 p-3 bg-muted/30 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{providerDisplay}</p>
                                {transaction.provider_org_ref && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <p className="text-xs text-muted-foreground truncate cursor-help">{transaction.provider_org_ref}</p>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">Provider Reference: {transaction.provider_org_ref}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          
                          <div className="flex-1 p-3 bg-muted/30 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{receiverDisplay}</p>
                                {transaction.receiver_org_ref && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <p className="text-xs text-muted-foreground truncate cursor-help">{transaction.receiver_org_ref}</p>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">Receiver Reference: {transaction.receiver_org_ref}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Description Section */}
                    {transaction.description && (
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs uppercase tracking-wide text-muted-foreground">Description</h3>
                            {onEdit && (
                              <button className="text-muted-foreground hover:text-foreground transition-colors">
                                <Edit className="h-3 w-3" />
                              </button>
                            )}
                        </div>
                          <p className="text-sm text-slate-700 leading-relaxed">{transaction.description}</p>
                        </div>
                      )}
                      
                      {!transaction.description && (
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                          <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Description</h3>
                          <p className="text-sm text-muted-foreground italic">No additional details provided.</p>
                      </div>
                    )}
                    
                      {/* Humanitarian & Validation Status */}
                      <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Status Indicators</h3>
                        <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Heart className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Humanitarian</span>
                        </div>
                            <p className="text-xs text-muted-foreground pl-6">
                              {transaction.is_humanitarian ? 'Emergency response or disaster relief' : 'Not humanitarian'}
                            </p>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Validation</span>
                            </div>
                            <p className="text-xs text-muted-foreground pl-6">
                              {transaction.status === 'actual' ? 'Verified by organisation' : 'Not yet validated'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* RIGHT COLUMN */}
                    <div className="space-y-4">
                      
                      {/* Linked Activities */}
                      {(transaction.provider_org_activity_id || transaction.receiver_org_activity_id) && (
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                          <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Linked Activities</h3>
                          <div className="space-y-3">
                            {transaction.provider_org_activity_id && (
                              <div className="p-3 bg-muted/30 rounded-lg border border-slate-200">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Provider Activity</span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(transaction.provider_org_activity_id || '');
                                      toast.success('Activity ID copied');
                                    }}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                                {loadingActivities.has(transaction.provider_org_activity_id) ? (
                                  <p className="text-sm text-muted-foreground">Loading...</p>
                                ) : activityDetails[transaction.provider_org_activity_id] ? (
                                  <div className="space-y-1">
                                    <p className="font-medium text-sm">{activityDetails[transaction.provider_org_activity_id]?.acronym || activityDetails[transaction.provider_org_activity_id]?.title}</p>
                                    {activityDetails[transaction.provider_org_activity_id]?.iati_identifier && (
                                      <p className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded inline-block">
                                        {activityDetails[transaction.provider_org_activity_id]?.iati_identifier}
                                      </p>
                                    )}
                                    {activityDetails[transaction.provider_org_activity_id]?.reporting_org && (
                                      <p className="text-xs text-muted-foreground">
                                        Org: {activityDetails[transaction.provider_org_activity_id]?.reporting_org}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">Activity not found</p>
                                )}
                      </div>
                    )}
                    
                            {transaction.receiver_org_activity_id && (
                              <div className="p-3 bg-muted/30 rounded-lg border border-slate-200">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Receiver Activity</span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(transaction.receiver_org_activity_id || '');
                                      toast.success('Activity ID copied');
                                    }}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                          </div>
                                {loadingActivities.has(transaction.receiver_org_activity_id) ? (
                                  <p className="text-sm text-muted-foreground">Loading...</p>
                                ) : activityDetails[transaction.receiver_org_activity_id] ? (
                                  <div className="space-y-1">
                                    <p className="font-medium text-sm">{activityDetails[transaction.receiver_org_activity_id]?.acronym || activityDetails[transaction.receiver_org_activity_id]?.title}</p>
                                    {activityDetails[transaction.receiver_org_activity_id]?.iati_identifier && (
                                      <p className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded inline-block">
                                        {activityDetails[transaction.receiver_org_activity_id]?.iati_identifier}
                                      </p>
                                    )}
                                    {activityDetails[transaction.receiver_org_activity_id]?.reporting_org && (
                                      <p className="text-xs text-muted-foreground">
                                        Org: {activityDetails[transaction.receiver_org_activity_id]?.reporting_org}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">Activity not found</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Classifications Grid */}
                      <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">IATI Classifications</h3>
                        <div className="grid grid-cols-1 gap-2">
                          {transaction.aid_type && (
                            <div className="flex items-center justify-between p-2 bg-muted/30 rounded border border-slate-200">
                              <div className="flex items-center gap-2">
                                <Handshake className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">Aid Type</span>
                              </div>
                              <span className="text-sm font-medium">{AID_TYPE_LABELS[transaction.aid_type]?.short || transaction.aid_type}</span>
                            </div>
                          )}
                          {transaction.flow_type && (
                            <div className="flex items-center justify-between p-2 bg-muted/30 rounded border border-slate-200">
                              <div className="flex items-center gap-2">
                                <Shuffle className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">Flow Type</span>
                              </div>
                              <span className="text-sm font-medium">{FLOW_TYPE_LABELS[transaction.flow_type] || transaction.flow_type}</span>
                            </div>
                          )}
                          {transaction.finance_type && (
                            <div className="flex items-center justify-between p-2 bg-muted/30 rounded border border-slate-200">
                              <div className="flex items-center gap-2">
                                <Coins className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">Finance Type</span>
                              </div>
                              <span className="text-sm font-medium">{FINANCE_TYPE_LABELS[transaction.finance_type]?.short || transaction.finance_type}</span>
                            </div>
                          )}
                          {transaction.tied_status && (
                            <div className="flex items-center justify-between p-2 bg-muted/30 rounded border border-slate-200">
                              <div className="flex items-center gap-2">
                                <Link2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">Tied Status</span>
                              </div>
                              <span className="text-sm font-medium">{TIED_STATUS_LABELS[transaction.tied_status as keyof typeof TIED_STATUS_LABELS] || transaction.tied_status}</span>
                            </div>
                          )}
                          {transaction.disbursement_channel && (
                            <div className="flex items-center justify-between p-2 bg-muted/30 rounded border border-slate-200">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">Channel</span>
                              </div>
                              <span className="text-sm font-medium">{DISBURSEMENT_CHANNEL_LABELS[transaction.disbursement_channel]?.short || transaction.disbursement_channel}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Geographic & Sector Targeting */}
                      {(transaction.sector_code || transaction.sectors?.length || transaction.recipient_country_code || transaction.recipient_countries?.length || transaction.recipient_region_code || transaction.recipient_regions?.length) && (
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                          <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Geographic & Sector Targeting</h3>
                          <div className="space-y-2">
                          {transaction.sector_code && (
                              <div className="flex items-center gap-2">
                                <Target className="h-3 w-3 text-muted-foreground" />
                                <Badge variant="outline">{transaction.sector_code}</Badge>
                                {transaction.sector_vocabulary && <span className="text-xs text-muted-foreground">Vocab: {transaction.sector_vocabulary}</span>}
                            </div>
                          )}
                          
                          {transaction.sectors && transaction.sectors.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Sectors:</p>
                                <div className="flex flex-wrap gap-2">
                              {transaction.sectors.map((sector, idx) => (
                                    <div key={idx} className="flex items-center gap-1">
                                  <Badge variant="outline">{sector.code}</Badge>
                                      {sector.percentage && <span className="text-xs text-muted-foreground">{sector.percentage}%</span>}
                                </div>
                              ))}
                                </div>
                            </div>
                          )}
                          
                          {transaction.recipient_country_code && (
                              <div className="flex items-center gap-2">
                                <Globe className="h-3 w-3 text-muted-foreground" />
                                <Badge variant="outline">{transaction.recipient_country_code}</Badge>
                            </div>
                          )}
                          
                          {transaction.recipient_countries && transaction.recipient_countries.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Countries:</p>
                                <div className="flex flex-wrap gap-2">
                              {transaction.recipient_countries.map((country, idx) => (
                                    <div key={idx} className="flex items-center gap-1">
                                  <Badge variant="outline">{country.code}</Badge>
                                      {country.percentage && <span className="text-xs text-muted-foreground">{country.percentage}%</span>}
                                </div>
                              ))}
                                </div>
                            </div>
                          )}
                          
                          {transaction.recipient_region_code && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                <Badge variant="outline">{transaction.recipient_region_code}</Badge>
                                {transaction.recipient_region_vocab && <span className="text-xs text-muted-foreground">Vocab: {transaction.recipient_region_vocab}</span>}
                            </div>
                          )}
                          
                          {transaction.recipient_regions && transaction.recipient_regions.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Regions:</p>
                                <div className="flex flex-wrap gap-2">
                              {transaction.recipient_regions.map((region, idx) => (
                                    <div key={idx} className="flex items-center gap-1">
                                  <Badge variant="outline">{region.code}</Badge>
                                      {region.percentage && <span className="text-xs text-muted-foreground">{region.percentage}%</span>}
                                </div>
                              ))}
                            </div>
                            </div>
                          )}
                        </div>
                        </div>
                      )}
                      
                      {/* Aid Types (Multiple) */}
                        {transaction.aid_types && transaction.aid_types.length > 0 && (
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                          <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Aid Types</h3>
                          <div className="flex flex-wrap gap-2">
                            {transaction.aid_types.map((aidType, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <Badge variant="outline">{aidType.code}</Badge>
                                {aidType.vocabulary && <span className="text-xs text-muted-foreground">Vocab: {aidType.vocabulary}</span>}
                        </div>
                            ))}
                          </div>
                          </div>
                        )}
                        
                      {/* System Identifiers */}
                      {transaction.transaction_reference && (
                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                          <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">System Identifiers</h3>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Transaction Reference</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{transaction.transaction_reference}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(transaction.transaction_reference || '');
                                    toast.success('Reference copied');
                                  }}
                                  className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                        </div>
                      </div>
                          </div>
                          </div>
                        )}
                        
                      {/* Transaction Metadata */}
                      <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Transaction Metadata</h3>
                        <div className="space-y-3">
                          {/* Created By */}
                          {transaction.created_by && (
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Created by:</span>
                              <span className="text-xs font-medium">{transaction.created_by}</span>
                          </div>
                        )}
                        
                          {/* Created At */}
                          {transaction.created_at && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Created:</span>
                              <span className="text-xs font-medium">{format(new Date(transaction.created_at), 'dd MMM yyyy, HH:mm')}</span>
                              </div>
                          )}
                          
                          {/* Last Updated */}
                          {transaction.updated_at && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Last updated:</span>
                              <span className="text-xs font-medium">{format(new Date(transaction.updated_at), 'dd MMM yyyy, HH:mm')}</span>
                          </div>
                        )}
                        
                          {/* Updated By */}
                          {transaction.updated_by && (
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">Updated by:</span>
                              <span className="text-xs font-medium">{transaction.updated_by}</span>
                            </div>
                          )}
                          
                          {/* Validated By */}
                          {transaction.validated_by && (
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-3 w-3 text-green-600" />
                              <span className="text-xs text-muted-foreground">Validated by:</span>
                              <span className="text-xs font-medium text-green-700">{transaction.validated_by}</span>
                              {transaction.validated_at && (
                                <span className="text-xs text-muted-foreground">
                                  on {format(new Date(transaction.validated_at), 'dd MMM yyyy, HH:mm')}
                                </span>
                              )}
                            </div>
                          )}
                          
                          {/* Rejected By */}
                          {transaction.rejected_by && (
                            <div className="flex items-center gap-2">
                              <UserX className="h-3 w-3 text-red-600" />
                              <span className="text-xs text-muted-foreground">Rejected by:</span>
                              <span className="text-xs font-medium text-red-700">{transaction.rejected_by}</span>
                              {transaction.rejected_at && (
                                <span className="text-xs text-muted-foreground">
                                  on {format(new Date(transaction.rejected_at), 'dd MMM yyyy, HH:mm')}
                                </span>
                          )}
                        </div>
                          )}
                          
                          {/* Validation Comments */}
                          {transaction.validation_comments && (
                            <div className="flex items-start gap-2">
                              <FileText className="h-3 w-3 text-muted-foreground mt-0.5" />
                              <div className="flex-1">
                                <span className="text-xs text-muted-foreground">Validation comments:</span>
                                <p className="text-xs font-medium mt-1 p-2 bg-muted/50 rounded border">
                                  {transaction.validation_comments}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {/* Import Indicator */}
                          {!transaction.created_by && (
                            <div className="flex items-center gap-2">
                              <FileText className="h-3 w-3 text-blue-600" />
                              <span className="text-xs text-muted-foreground">Source:</span>
                              <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                                Imported Transaction
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </TableRow>
            )}
            </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}