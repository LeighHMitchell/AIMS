import React, { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  CheckCircle,
  FileClock,
  Edit,
  Info,
  ArrowUpFromLine,
  ArrowDownToLine,
  DollarSign,
  Heart,
  Handshake,
  Shuffle,
  Link2,
  Copy,
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
  FileCode,
  Loader2,
} from "lucide-react";
import { TransactionValueDisplay } from "@/components/currency/TransactionValueDisplay";
import { OrganizationLogo } from "@/components/ui/organization-logo";
import { OrganizationHoverCard } from "@/components/ui/organization-hover-card";
import { TIED_STATUS_LABELS } from "@/types/transaction";
import { TransactionColumnId } from "@/app/transactions/page";
import { TransactionActionMenu } from "@/components/transactions/TransactionActionMenu";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  getSortIcon,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingText } from "@/components/ui/loading-text";

// Transaction type to icon mapping (IATI Standard v2.03)
const TRANSACTION_TYPE_ICONS: Record<string, React.FC<any>> = {
  '1': ArrowDownToLine, // Incoming Funds
  '2': HandCoins,       // Outgoing Commitment
  '3': ArrowUpFromLine, // Disbursement
  '4': Banknote,        // Expenditure
  '5': TrendingDown,    // Interest Payment
  '6': ArrowDownToLine, // Loan Repayment
  '7': RefreshCw,       // Reimbursement
  '8': ArrowUpFromLine, // Purchase of Equity
  '9': ArrowDownToLine, // Sale of Equity
  '10': FileText,       // Credit Guarantee
  '11': ArrowDownToLine,// Incoming Commitment
  '12': ArrowUpFromLine,// Outgoing Pledge
  '13': ArrowDownToLine,// Incoming Pledge
};

// Transaction type labels (IATI Standard v2.03)
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

// Pluralized labels for grouped headers
const TRANSACTION_TYPE_PLURAL_LABELS: Record<string, string> = {
  '1': 'Incoming Funds',
  '2': 'Outgoing Commitments',
  '3': 'Disbursements',
  '4': 'Expenditures',
  '5': 'Interest Payments',
  '6': 'Loan Repayments',
  '7': 'Reimbursements',
  '8': 'Purchases of Equity',
  '9': 'Sales of Equity',
  '10': 'Credit Guarantees',
  '11': 'Incoming Commitments',
  '12': 'Outgoing Pledges',
  '13': 'Incoming Pledges'
};

const getGroupedLabel = (type: string): string => {
  return TRANSACTION_TYPE_PLURAL_LABELS[type] || `${TRANSACTION_TYPE_LABELS[type] || type}s`;
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
  '1': { short: 'Central Ministry/Treasury', full: 'Money is disbursed through central Ministry of Finance or Treasury' },
  '2': { short: 'Direct to Institution', full: 'Money is disbursed directly to the implementing institution and managed through a separate bank account' },
  '3': { short: 'Aid in Kind (Third Party)', full: 'Aid in kind: Donors utilise third party agencies, e.g. NGOs or management companies' },
  '4': { short: 'Aid in Kind (Donor)', full: 'Aid in kind: Donors manage funds themselves' }
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
    iati_identifier?: string;
    created_by_org_name?: string;
    created_by_org_acronym?: string;
  };
  provider_org_name?: string;
  provider_org_ref?: string;
  provider_org_acronym?: string;
  provider_org_activity_id?: string;
  provider_org_logo?: string;
  receiver_org_name?: string;
  receiver_org_ref?: string;
  receiver_org_acronym?: string;
  receiver_org_activity_id?: string;
  receiver_org_logo?: string;
  from_org?: string;
  to_org?: string;
  transaction_type: string;
  aid_type?: string;
  flow_type?: string;
  finance_type?: string;
  tied_status?: string;
  disbursement_channel?: string;
  // Effective values (transaction value or inherited from activity default)
  effective_finance_type?: string;
  effective_aid_type?: string;
  effective_flow_type?: string;
  effective_tied_status?: string;
  // Inherited flags (true if value comes from activity default, not transaction)
  finance_type_inherited?: boolean;
  aid_type_inherited?: boolean;
  flow_type_inherited?: boolean;
  tied_status_inherited?: boolean;
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
  organizations?: any[]; // Organizations list for alias resolution
  loading: boolean;
  error: string | null;
  sortField: string;
  sortOrder: "asc" | "desc";
  onSort: (field: string) => void;
  onRowClick?: (transactionId: string) => void;
  onEdit?: (transaction: TransactionData) => void;
  onDelete?: (transactionId: string) => void;
  onConvertCurrency?: (transactionId: string) => void;
  onAcceptTransaction?: (transactionId: string, acceptingActivityId: string) => void;
  onRejectTransaction?: (transactionId: string, rejectionReason?: string) => void;
  currentActivityId?: string;
  variant?: "full" | "compact";
  selectedIds?: Set<string>;
  onSelectAll?: (checked: boolean) => void;
  onSelectTransaction?: (id: string, checked: boolean) => void;
  groupedView?: boolean;
  onGroupedViewChange?: (value: boolean) => void;
  visibleColumns?: TransactionColumnId[];
}

export function TransactionTable({
  transactions,
  organizations = [],
  loading,
  error,
  sortField,
  sortOrder,
  onSort,
  onRowClick,
  onEdit,
  onDelete,
  onConvertCurrency,
  onAcceptTransaction,
  onRejectTransaction,
  currentActivityId,
  variant = "full",
  selectedIds,
  onSelectAll,
  onSelectTransaction,
  groupedView = false,
  onGroupedViewChange,
  visibleColumns,
}: TransactionTableProps) {
  const router = useRouter();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [activityDetails, setActivityDetails] = useState<Record<string, {title: string; iati_identifier: string; acronym?: string; reporting_org?: string} | null>>({});
  const [loadingActivities, setLoadingActivities] = useState<Set<string>>(new Set());
  const fetchedActivitiesRef = useRef<Set<string>>(new Set());

  // Helper function to check if a column is visible
  const isColumnVisible = (columnId: TransactionColumnId): boolean => {
    if (!visibleColumns) return true; // Show all if not provided (backward compat)
    return visibleColumns.includes(columnId);
  };

  // USD conversion tracking
  const [usdValues, setUsdValues] = useState<Record<string, { 
    usd: number | null, 
    rate: number | null, 
    date: string, 
    loading: boolean, 
    error?: string 
  }>>({});

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
  const fetchActivityDetails = useCallback(async (activityId: string) => {
    // Check if already fetched or currently fetching using ref (avoids dependency issues)
    if (fetchedActivitiesRef.current.has(activityId)) {
      return; // Already fetched or currently fetching
    }

    fetchedActivitiesRef.current.add(activityId);
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
        fetchedActivitiesRef.current.delete(activityId); // Allow retry on error
      }
    } catch (error) {
      console.error('Error fetching activity details:', error);
      setActivityDetails(prev => ({...prev, [activityId]: null}));
      fetchedActivitiesRef.current.delete(activityId); // Allow retry on error
    } finally {
      setLoadingActivities(prev => {
        const newSet = new Set(prev);
        newSet.delete(activityId);
        return newSet;
      });
    }
  }, []);

  // Fetch activities for all transactions (not just when expanded)
  React.useEffect(() => {
    transactions.forEach(transaction => {
      if (transaction.provider_org_activity_id) {
        fetchActivityDetails(transaction.provider_org_activity_id);
      }
      if (transaction.receiver_org_activity_id) {
        fetchActivityDetails(transaction.receiver_org_activity_id);
      }
    });
  }, [transactions, fetchActivityDetails]);

  // Read stored USD values from database (no real-time conversion)
  React.useEffect(() => {
    const newUsdValues: Record<string, { usd: number|null, rate: number|null, date: string, loading: boolean, error?: string }> = {};
    
    for (const transaction of transactions) {
      const transactionId = transaction.uuid || transaction.id;
      
      // Check if transaction already has USD value stored
      const existingUsdValue = (transaction as any).value_usd || (transaction as any).usd_value;
      if (existingUsdValue != null && !isNaN(existingUsdValue)) {
        newUsdValues[transactionId] = {
          usd: existingUsdValue,
          rate: (transaction as any).exchange_rate_used || null,
          date: (transaction as any).usd_conversion_date || transaction.transaction_date,
          loading: false
        };
        continue;
      }
      
      // If currency is already USD, just use the value
      if (transaction.currency === 'USD' && transaction.value != null && !isNaN(transaction.value)) {
        newUsdValues[transactionId] = {
          usd: transaction.value,
          rate: 1,
          date: transaction.transaction_date,
          loading: false
        };
        continue;
      }
      
      // Missing data or unconverted - show as not converted (no real-time API call)
      const isUnconvertible = (transaction as any).usd_convertible === false;
      newUsdValues[transactionId] = { 
        usd: null, 
        rate: null, 
        date: transaction.transaction_date || '', 
        loading: false,
        error: isUnconvertible ? 'Not converted' : undefined
      };
    }
    
    setUsdValues(newUsdValues);
  }, [transactions]);

  // Group transactions by type for grouped view
  const groupedTransactions = React.useMemo(() => {
    const groups: Record<string, TransactionData[]> = {};
    transactions.forEach(transaction => {
      const type = transaction.transaction_type || 'Unspecified';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(transaction);
    });
    return groups;
  }, [transactions]);

  // Calculate totals per group
  const groupTotals = React.useMemo(() => {
    return Object.entries(groupedTransactions).map(([type, txs]) => ({
      type,
      total: txs.reduce((sum, t) => {
        const transactionId = t.uuid || t.id;
        const usdValue = usdValues[transactionId]?.usd;
        return sum + (usdValue || 0);
      }, 0),
      count: txs.length
    }));
  }, [groupedTransactions, usdValues]);

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

      // Return as JSX with gray currency code
      return <><span className="text-muted-foreground">{safeCurrency}</span> {formattedValue}</>;
    } catch (error) {
      console.warn(`[TransactionTable] Invalid currency "${currency}", using USD:`, error);
      const formattedValue = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
      return <><span className="text-muted-foreground">USD</span> {formattedValue}</>;
    }
  };

  // String version of formatCurrency for group headers
  const formatCurrencyString = (value: number, currency: string = "USD") => {
    const safeCurrency = currency && currency.length === 3 && /^[A-Z]{3}$/.test(currency.toUpperCase())
      ? currency.toUpperCase()
      : "USD";

    const formattedValue = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

    return `${safeCurrency} ${formattedValue}`;
  };

  const getTransactionIcon = (type: string) => {
    const Icon = TRANSACTION_TYPE_ICONS[type] || FileText;
    return <Icon className="h-4 w-4" />;
  };


  const getStatusIcon = (status: string | undefined) => {
    const actualStatus = status === 'actual' || status === 'A';
    
    return (
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
        <div className="mt-4">
          <LoadingText>Loading transactions...</LoadingText>
        </div>
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
    <TooltipProvider>
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            {/* Checkbox - always visible */}
            <TableHead className="w-10 text-center">
              {onSelectAll && selectedIds && (
                <div className="flex items-center justify-center" key={`select-all-wrapper-${transactions.length}`}>
                  <Checkbox
                    checked={selectedIds.size === transactions.length && transactions.length > 0}
                    indeterminate={selectedIds.size > 0 && selectedIds.size < transactions.length}
                    onCheckedChange={(checked) => {
                      console.log('[TransactionTable] Select all clicked:', checked, 'transactions.length:', transactions.length);
                      onSelectAll(!!checked);
                    }}
                    aria-label="Select all transactions"
                  />
                </div>
              )}
            </TableHead>
            
            {/* Activity */}
            {isColumnVisible('activity') && variant === "full" && (
              <TableHead 
                className="cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => onSort("activity")}
              >
                <div className="flex items-center gap-1">
                  <span>Activity</span>
                  {getSortIcon("activity", sortField, sortOrder)}
                </div>
              </TableHead>
            )}
            
            {/* Activity ID */}
            {isColumnVisible('activityId') && (
              <TableHead>
                Activity ID
              </TableHead>
            )}
            
            {/* IATI Identifier */}
            {isColumnVisible('iatiIdentifier') && (
              <TableHead>
                IATI Identifier
              </TableHead>
            )}
            
            {/* Reporting Org */}
            {isColumnVisible('reportingOrg') && (
              <TableHead>
                Reporting Org
              </TableHead>
            )}
            
            {/* Transaction Date */}
            {isColumnVisible('transactionDate') && (
              <TableHead 
                className="cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => onSort("transaction_date")}
              >
                <div className="flex items-center gap-1">
                  <span>Date</span>
                  {getSortIcon("transaction_date", sortField, sortOrder)}
                </div>
              </TableHead>
            )}
            
            {/* Transaction Type */}
            {isColumnVisible('transactionType') && (
              <TableHead
                className="cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => onSort("transaction_type")}
              >
                <div className="flex items-center gap-1">
                  <span>Type</span>
                  {getSortIcon("transaction_type", sortField, sortOrder)}
                </div>
              </TableHead>
            )}
            
            {/* Linked Status */}
            {isColumnVisible('linkedStatus') && (
              <TableHead className="text-center">
                Linked
              </TableHead>
            )}
            
            {/* Acceptance Status */}
            {isColumnVisible('acceptanceStatus') && (
              <TableHead className="text-center">
                Acceptance
              </TableHead>
            )}

            {/* Provider → Receiver */}
            {isColumnVisible('organizations') && (
              <TableHead 
                className="cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => onSort("provider_org_name")}
              >
                <div className="flex items-center gap-1">
                  <span>Provider → Receiver</span>
                  {getSortIcon("provider_org_name", sortField, sortOrder)}
                </div>
              </TableHead>
            )}
            
            {/* Provider Activity */}
            {isColumnVisible('providerActivity') && (
              <TableHead>
                Provider Activity
              </TableHead>
            )}
            
            {/* Receiver Activity */}
            {isColumnVisible('receiverActivity') && (
              <TableHead>
                Receiver Activity
              </TableHead>
            )}
            
            {/* Amount */}
            {isColumnVisible('amount') && (
              <TableHead
                className="text-right cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => onSort("value")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Amount</span>
                  {getSortIcon("value", sortField, sortOrder)}
                </div>
              </TableHead>
            )}
            
            {/* Currency */}
            {isColumnVisible('currency') && (
              <TableHead className="text-center">
                Currency
              </TableHead>
            )}
            
            {/* Value Date */}
            {isColumnVisible('valueDate') && (
              <TableHead
                className="cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => onSort("value_date")}
              >
                <div className="flex items-center gap-1">
                  <span>Value Date</span>
                  {getSortIcon("value_date", sortField, sortOrder)}
                </div>
              </TableHead>
            )}
            
            {/* USD Value */}
            {isColumnVisible('usdValue') && (
              <TableHead
                className="text-right cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => onSort("value_usd")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>USD Value</span>
                  {getSortIcon("value_usd", sortField, sortOrder)}
                </div>
              </TableHead>
            )}
            
            {/* Finance Type - shown in both compact and full variants */}
            {isColumnVisible('financeType') && (
              <TableHead className="cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => onSort("finance_type")}>
                <div className="flex items-center gap-1">
                  <span>Finance Type</span>
                  {getSortIcon("finance_type", sortField, sortOrder)}
                </div>
              </TableHead>
            )}
            
            {/* Aid Type */}
            {isColumnVisible('aidType') && (
              <TableHead>
                Aid Type
              </TableHead>
            )}
            
            {/* Flow Type */}
            {isColumnVisible('flowType') && (
              <TableHead>
                Flow Type
              </TableHead>
            )}
            
            {/* Tied Status */}
            {isColumnVisible('tiedStatus') && (
              <TableHead>
                Tied Status
              </TableHead>
            )}
            
            {/* Humanitarian */}
            {isColumnVisible('humanitarian') && (
              <TableHead className="text-center">
                Humanitarian
              </TableHead>
            )}
            
            {/* Description */}
            {isColumnVisible('description') && (
              <TableHead>
                Description
              </TableHead>
            )}
            
            {/* Disbursement Channel */}
            {isColumnVisible('disbursementChannel') && (
              <TableHead>
                Channel
              </TableHead>
            )}
            
            {/* Validated Status */}
            {isColumnVisible('validatedStatus') && (
              <TableHead className="text-center">
                Validated
              </TableHead>
            )}
            
            {/* Transaction UUID */}
            {isColumnVisible('transactionUuid') && (
              <TableHead>
                UUID
              </TableHead>
            )}
            
            {/* Transaction Reference */}
            {isColumnVisible('transactionReference') && (
              <TableHead>
                Reference
              </TableHead>
            )}

            {/* Actions - always visible */}
            <TableHead className="text-right">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Smart approach: Use same rendering for both grouped and regular views */}
          {(groupedView
            ? Object.entries(groupedTransactions)
            : [[null, transactions]] as Array<[string | null, TransactionData[]]>
          ).map(([type, txs]) => {
            const groupTotal = type ? groupTotals.find(g => g.type === type) : null;
            return (
              <React.Fragment key={type ? `group-${type}` : 'regular'}>
                {/* Group Header Row - only show in grouped view */}
                {groupedView && type && (
                  <TableRow className="bg-muted hover:bg-muted">
                    <TableCell colSpan={100} className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-sm">
                            {getGroupedLabel(type)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({groupTotal?.count || 0} {(groupTotal?.count || 0) === 1 ? 'transaction' : 'transactions'})
                          </span>
                        </div>
                        <span className="font-semibold text-sm">
                          {formatCurrencyString(groupTotal?.total || 0, 'USD')}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {/* Transaction rows - same rendering for both views */}
                {txs.map((transaction, index) => {
            // Resolve organization names/logos using alias resolution
            const resolveOrgDisplay = (orgId?: string, orgName?: string, orgRef?: string, orgAcronym?: string) => {
              // Try to find by org ID or ref (including aliases)
              let resolvedOrg = null;
              if (orgId) {
                resolvedOrg = organizations.find((o: any) => o.id === orgId);
              }
              if (!resolvedOrg && orgRef) {
                // Try iati_org_id match
                resolvedOrg = organizations.find((o: any) => o.iati_org_id === orgRef);
                // Try alias_refs match
                if (!resolvedOrg) {
                  resolvedOrg = organizations.find((o: any) => 
                    o.alias_refs && Array.isArray(o.alias_refs) && o.alias_refs.includes(orgRef)
                  );
                }
              }
              
              if (resolvedOrg) {
                return {
                  name: resolvedOrg.name,
                  acronym: resolvedOrg.acronym || resolvedOrg.name,
                  logo: resolvedOrg.logo,
                  id: resolvedOrg.id,
                  type: resolvedOrg.Organisation_Type_Name || resolvedOrg.type,
                  country: resolvedOrg.country,
                  iati_org_id: resolvedOrg.iati_org_id,
                  description: resolvedOrg.description,
                  website: resolvedOrg.website
                };
              }
              
              return {
                name: orgName || "Unknown",
                acronym: orgAcronym || orgName || "Unknown",
                logo: null,
                id: null,
                type: null,
                country: null,
                iati_org_id: orgRef || null,
                description: null,
                website: null
              };
            };
            
            const provider = resolveOrgDisplay(
              transaction.provider_org_id,
              transaction.provider_org_name,
              transaction.provider_org_ref,
              transaction.provider_org_acronym
            );
            const receiver = resolveOrgDisplay(
              transaction.receiver_org_id,
              transaction.receiver_org_name,
              transaction.receiver_org_ref,
              transaction.receiver_org_acronym
            );
            
            const providerName = provider.name;
            const receiverName = receiver.name;
            const providerDisplay = provider.acronym;
            const receiverDisplay = receiver.acronym;
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
            
            const isSelected = selectedIds?.has(transactionId) || false;
            
            return (
            <React.Fragment key={transaction.id}>
            <TableRow
              className={cn(
                "border-b border-border/40 hover:bg-muted/30 transition-colors",
                isSelected && "bg-blue-50 border-blue-200",
                transaction.transaction_source === 'linked' && "border-l-4 border-l-orange-400 bg-orange-50/30",
                transaction.acceptance_status === 'rejected' && "opacity-60"
              )}
            >
                {/* Checkbox or Expand/Collapse Button - always visible */}
                <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                  {onSelectTransaction && selectedIds ? (
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelectTransaction(transactionId, !!checked)}
                        aria-label={`Select transaction ${transactionId}`}
                      />
                    </div>
                  ) : (
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
                  )}
                </td>
            
                {/* Activity */}
                {isColumnVisible('activity') && variant === "full" && (
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
                          {transaction.activityTitle || transaction.activity?.title || transaction.activity?.title_narrative || 'Untitled Activity'}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-3 w-3 p-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 inline-flex items-center justify-center align-text-top"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const activityTitle = transaction.activityTitle || transaction.activity?.title || transaction.activity?.title_narrative || 'Untitled Activity';
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
                        </div>
                      </div>
                    </div>
                  </td>
                )}
                
                {/* Activity ID */}
                {isColumnVisible('activityId') && (
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="text-xs font-mono text-muted-foreground">
                      {transaction.activity_id || '—'}
                    </span>
                  </td>
                )}
                
                {/* IATI Identifier */}
                {isColumnVisible('iatiIdentifier') && (
                  <td className="py-3 px-4 whitespace-nowrap">
                    {transaction.activity?.iati_identifier ? (
                      <span className="text-xs font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                        {transaction.activity.iati_identifier}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                )}
                
                {/* Reporting Org */}
                {isColumnVisible('reportingOrg') && (
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="text-sm">
                      {transaction.activity?.created_by_org_acronym || transaction.activity?.created_by_org_name || '—'}
                    </span>
                  </td>
                )}
                
                {/* Transaction Date */}
                {isColumnVisible('transactionDate') && (
                  <td className="py-3 px-4 whitespace-nowrap">
                    {formatTransactionDate(transaction.transaction_date)}
                  </td>
                )}
                
                {/* Transaction Type */}
                {isColumnVisible('transactionType') && (
                  <td className="py-3 px-4 whitespace-nowrap">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm font-medium text-foreground">
                          {TRANSACTION_TYPE_LABELS[transaction.transaction_type] || transaction.transaction_type}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p className="text-sm">{TRANSACTION_TYPE_LABELS[transaction.transaction_type] || 'Unknown Type'}</p>
                        <p className="text-xs text-muted-foreground mt-1">Code: {transaction.transaction_type}</p>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                )}
                
                {/* Linked Status */}
                {isColumnVisible('linkedStatus') && (
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {transaction.transaction_source === 'linked' ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs bg-orange-50 border-orange-200 text-orange-700 px-1 cursor-help">
                            <Link2 className="h-3 w-3" />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Linked Transaction</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                )}
                
                {/* Acceptance Status */}
                {isColumnVisible('acceptanceStatus') && (
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {transaction.acceptance_status === 'pending' && transaction.transaction_source === 'linked' ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-200 text-yellow-700 px-1 cursor-help">
                            <Clock className="h-3 w-3" />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Pending Acceptance</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : transaction.acceptance_status === 'accepted' ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700 px-1 cursor-help">
                            <CheckCircle className="h-3 w-3" />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Accepted Transaction</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : transaction.acceptance_status === 'rejected' ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs bg-red-50 border-red-200 text-red-700 px-1 cursor-help">
                            <UserX className="h-3 w-3" />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Rejected Transaction</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                )}

                {/* Provider → Receiver */}
                {isColumnVisible('organizations') && (
                  <td className="py-3 px-4">
                  <div className="text-sm font-medium text-foreground">
                    <div className="flex items-start gap-2">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          <OrganizationLogo 
                            logo={provider.logo || transaction.provider_org_logo}
                            name={providerDisplay}
                            size="sm"
                          />
                          <OrganizationHoverCard organization={provider} side="top" align="start">
                            {provider.id ? (
                              <Link 
                                href={`/organizations/${provider.id}`}
                                className="text-sm hover:text-gray-700 transition-colors cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {providerDisplay}
                              </Link>
                            ) : (
                              <span className="text-sm cursor-default">
                                {providerDisplay}
                              </span>
                            )}
                          </OrganizationHoverCard>
                        </div>
                        {transaction.provider_org_activity_id && activityDetails[transaction.provider_org_activity_id] && (
                          <div className="text-xs text-gray-500 ml-5">
                            <span>{activityDetails[transaction.provider_org_activity_id]?.title || activityDetails[transaction.provider_org_activity_id]?.acronym}</span>
                            {activityDetails[transaction.provider_org_activity_id]?.iati_identifier && (
                              <span className="ml-1">({activityDetails[transaction.provider_org_activity_id]?.iati_identifier})</span>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-muted-foreground mt-1">→</span>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1">
                          <OrganizationLogo 
                            logo={receiver.logo || transaction.receiver_org_logo}
                            name={receiverDisplay}
                            size="sm"
                          />
                          <OrganizationHoverCard organization={receiver} side="top" align="start">
                            {receiver.id ? (
                              <Link 
                                href={`/organizations/${receiver.id}`}
                                className="text-sm hover:text-gray-700 transition-colors cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {receiverDisplay}
                              </Link>
                            ) : (
                              <span className="text-sm cursor-default">
                                {receiverDisplay}
                              </span>
                            )}
                          </OrganizationHoverCard>
                        </div>
                        {transaction.receiver_org_activity_id && activityDetails[transaction.receiver_org_activity_id] && (
                          <div className="text-xs text-gray-500 ml-5">
                            <span>{activityDetails[transaction.receiver_org_activity_id]?.title || activityDetails[transaction.receiver_org_activity_id]?.acronym}</span>
                            {activityDetails[transaction.receiver_org_activity_id]?.iati_identifier && (
                              <span className="ml-1">({activityDetails[transaction.receiver_org_activity_id]?.iati_identifier})</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                )}
                
                {/* Provider Activity */}
                {isColumnVisible('providerActivity') && (
                  <td className="py-3 px-4 whitespace-nowrap">
                    {transaction.provider_org_activity_id ? (
                      <Link 
                        href={`/activities/${transaction.provider_org_activity_id}`}
                        className="text-xs text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {activityDetails[transaction.provider_org_activity_id]?.acronym || 
                         activityDetails[transaction.provider_org_activity_id]?.title || 
                         transaction.provider_org_activity_id.slice(0, 8) + '...'}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                )}
                
                {/* Receiver Activity */}
                {isColumnVisible('receiverActivity') && (
                  <td className="py-3 px-4 whitespace-nowrap">
                    {transaction.receiver_org_activity_id ? (
                      <Link 
                        href={`/activities/${transaction.receiver_org_activity_id}`}
                        className="text-xs text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {activityDetails[transaction.receiver_org_activity_id]?.acronym || 
                         activityDetails[transaction.receiver_org_activity_id]?.title || 
                         transaction.receiver_org_activity_id.slice(0, 8) + '...'}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                )}
                
                {/* Amount */}
                {isColumnVisible('amount') && (
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    {transaction.value != null && transaction.currency ? (
                      <div className="font-medium">
                        <span className="text-muted-foreground text-xs">{transaction.currency.toUpperCase()}</span>{' '}
                        {new Intl.NumberFormat("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(transaction.value)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                )}
                
                {/* Currency */}
                {isColumnVisible('currency') && (
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <span className="text-sm font-medium">{transaction.currency?.toUpperCase() || '—'}</span>
                  </td>
                )}
                
                {/* Value Date */}
                {isColumnVisible('valueDate') && (
                  <td className="py-3 px-4 whitespace-nowrap">
                    {formatTransactionDate(transaction.value_date || transaction.transaction_date)}
                  </td>
                )}
                
                {/* USD Value */}
                {isColumnVisible('usdValue') && (
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {usdValues[transactionId]?.loading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      ) : usdValues[transactionId]?.usd != null ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="font-medium cursor-help">
                                {formatCurrency(usdValues[transactionId].usd!, 'USD')}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div>
                                <div>Original: {formatCurrency(transaction.value, transaction.currency)}</div>
                                <div>Rate: {usdValues[transactionId].rate}</div>
                                <div>Date: {usdValues[transactionId].date}</div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </td>
                )}
                
                {/* Finance Type - shown in both compact and full variants, inherited values in gray */}
                {isColumnVisible('financeType') && (
                  <td className="py-3 px-4 whitespace-nowrap">
                    {(transaction.finance_type || transaction.effective_finance_type) ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`text-sm font-medium cursor-help ${transaction.finance_type_inherited ? 'text-gray-400 opacity-70' : 'text-foreground'}`}>
                              {FINANCE_TYPE_LABELS[transaction.effective_finance_type || transaction.finance_type]?.full || transaction.effective_finance_type || transaction.finance_type}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p className="text-sm">
                              {transaction.finance_type_inherited 
                                ? `Inherited from activity's default finance type (code ${transaction.effective_finance_type} – ${FINANCE_TYPE_LABELS[transaction.effective_finance_type || '']?.full || 'Unknown'})`
                                : `${transaction.finance_type} – ${FINANCE_TYPE_LABELS[transaction.finance_type || '']?.full || 'Unknown'}`
                              }
                            </p>
                          </TooltipContent>
                        </Tooltip>
                    ) : (
                      <span className="text-sm font-normal text-muted-foreground">—</span>
                    )}
                  </td>
                )}
                
                {/* Aid Type */}
                {isColumnVisible('aidType') && (
                  <td className="py-3 px-4 whitespace-nowrap">
                    {(transaction.aid_type || transaction.effective_aid_type) ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`text-sm font-medium cursor-help ${transaction.aid_type_inherited ? 'text-gray-400 opacity-70' : 'text-foreground'}`}>
                            {AID_TYPE_LABELS[transaction.effective_aid_type || transaction.aid_type]?.short || transaction.effective_aid_type || transaction.aid_type}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="text-sm">
                            {transaction.aid_type_inherited 
                              ? `Inherited from activity's default aid type`
                              : AID_TYPE_LABELS[transaction.aid_type || '']?.full || transaction.aid_type
                            }
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                )}
                
                {/* Flow Type */}
                {isColumnVisible('flowType') && (
                  <td className="py-3 px-4 whitespace-nowrap">
                    {(transaction.flow_type || transaction.effective_flow_type) ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`text-sm font-medium cursor-help ${transaction.flow_type_inherited ? 'text-gray-400 opacity-70' : 'text-foreground'}`}>
                            {FLOW_TYPE_LABELS[transaction.effective_flow_type || transaction.flow_type] || transaction.effective_flow_type || transaction.flow_type}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="text-sm">
                            {transaction.flow_type_inherited 
                              ? `Inherited from activity's default flow type`
                              : FLOW_TYPE_LABELS[transaction.flow_type || ''] || transaction.flow_type
                            }
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                )}
                
                {/* Tied Status */}
                {isColumnVisible('tiedStatus') && (
                  <td className="py-3 px-4 whitespace-nowrap">
                    {(transaction.tied_status || transaction.effective_tied_status) ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`text-sm font-medium cursor-help ${transaction.tied_status_inherited ? 'text-gray-400 opacity-70' : 'text-foreground'}`}>
                            {TIED_STATUS_LABELS[(transaction.effective_tied_status || transaction.tied_status) as keyof typeof TIED_STATUS_LABELS] || transaction.effective_tied_status || transaction.tied_status}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="text-sm">
                            {transaction.tied_status_inherited 
                              ? `Inherited from activity's default tied status`
                              : TIED_STATUS_LABELS[transaction.tied_status as keyof typeof TIED_STATUS_LABELS] || transaction.tied_status
                            }
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                )}
                
                {/* Humanitarian */}
                {isColumnVisible('humanitarian') && (
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {transaction.is_humanitarian ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Heart className="h-4 w-4 text-red-500 fill-red-500 inline" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Humanitarian</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                )}
                
                {/* Description */}
                {isColumnVisible('description') && (
                  <td className="py-3 px-4 max-w-[200px]">
                    {transaction.description ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm text-muted-foreground line-clamp-2 cursor-help">
                            {transaction.description}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-[300px]">
                          <p className="text-sm">{transaction.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                )}
                
                {/* Disbursement Channel */}
                {isColumnVisible('disbursementChannel') && (
                  <td className="py-3 px-4 whitespace-nowrap">
                    {transaction.disbursement_channel ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm font-medium cursor-help">
                            {DISBURSEMENT_CHANNEL_LABELS[transaction.disbursement_channel]?.short || transaction.disbursement_channel}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="text-sm">{DISBURSEMENT_CHANNEL_LABELS[transaction.disbursement_channel]?.full || transaction.disbursement_channel}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                )}
                
                {/* Validated Status */}
                {isColumnVisible('validatedStatus') && (
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    {transaction.validated_by ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CheckCircle className="h-4 w-4 text-green-500 inline" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-sm">Validated by {transaction.validated_by}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                )}
                
                {/* Transaction UUID */}
                {isColumnVisible('transactionUuid') && (
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="text-xs font-mono text-muted-foreground">
                      {(transaction.uuid || transaction.id).slice(0, 8)}...
                    </span>
                  </td>
                )}
                
                {/* Transaction Reference */}
                {isColumnVisible('transactionReference') && (
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="text-xs text-muted-foreground">
                      {transaction.transaction_reference || '—'}
                    </span>
                  </td>
                )}

              {/* Actions - always visible */}
              <td className="py-3 px-4 text-right">
                <TransactionActionMenu
                  transactionId={transaction.uuid || transaction.id}
                  isLinkedTransaction={transaction.transaction_source === 'linked'}
                  acceptanceStatus={transaction.acceptance_status}
                  linkedFromActivityId={transaction.linked_from_activity_id}
                  onEdit={transaction.transaction_source !== 'linked' ? () => {
                    if (onEdit) {
                      onEdit(transaction);
                    } else if (transaction.activity_id) {
                      router.push(`/activities/new?id=${transaction.activity_id}&section=finances`);
                    }
                  } : undefined}
                  onDelete={onDelete && transaction.transaction_source !== 'linked' ? () => onDelete(transaction.uuid || transaction.id) : undefined}
                  onAccept={onAcceptTransaction && currentActivityId ? () => onAcceptTransaction(transaction.uuid || transaction.id, currentActivityId) : undefined}
                  onReject={onRejectTransaction ? () => onRejectTransaction(transaction.uuid || transaction.id) : undefined}
                  onViewSourceActivity={transaction.linked_from_activity_id ? () => window.open(`/activities/${transaction.linked_from_activity_id}`, '_blank') : undefined}
                />
              </td>
            </TableRow>
            
            {/* Expanded Row Content - Data-Rich Card Dashboard */}
            {isExpanded && (
              <TableRow className="bg-slate-50/50">
                <td colSpan={100} className="p-6">
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
                          {(transaction.flow_type || transaction.effective_flow_type) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className={`bg-muted/50 cursor-help ${transaction.flow_type_inherited ? 'opacity-70' : ''}`}>
                                  <Shuffle className="h-3 w-3 mr-1" />
                                  {FLOW_TYPE_LABELS[transaction.effective_flow_type || transaction.flow_type] || transaction.effective_flow_type || transaction.flow_type}
                                </Badge>
                              </TooltipTrigger>
                              {transaction.flow_type_inherited && (
                                <TooltipContent>
                                  <p className="text-xs">Inherited from activity's default flow type</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          )}
                          {(transaction.finance_type || transaction.effective_finance_type) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className={`bg-muted/50 cursor-help ${transaction.finance_type_inherited ? 'opacity-70' : ''}`}>
                                  <Coins className="h-3 w-3 mr-1" />
                                  {FINANCE_TYPE_LABELS[transaction.effective_finance_type || transaction.finance_type]?.full || transaction.effective_finance_type || transaction.finance_type}
                                </Badge>
                              </TooltipTrigger>
                              {transaction.finance_type_inherited && (
                                <TooltipContent>
                                  <p className="text-xs">Inherited from activity's default finance type</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          )}
                          {(transaction.tied_status || transaction.effective_tied_status) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className={`bg-muted/50 cursor-help ${transaction.tied_status_inherited ? 'opacity-70' : ''}`}>
                                  <Link2 className="h-3 w-3 mr-1" />
                                  {TIED_STATUS_LABELS[(transaction.effective_tied_status || transaction.tied_status) as keyof typeof TIED_STATUS_LABELS] || transaction.effective_tied_status || transaction.tied_status}
                                </Badge>
                              </TooltipTrigger>
                              {transaction.tied_status_inherited && (
                                <TooltipContent>
                                  <p className="text-xs">Inherited from activity's default tied status</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
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
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <p className="text-xs text-muted-foreground truncate cursor-help">{transaction.provider_org_ref}</p>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">Provider Reference: {transaction.provider_org_ref}</p>
                                      </TooltipContent>
                                    </Tooltip>
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
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <p className="text-xs text-muted-foreground truncate cursor-help">{transaction.receiver_org_ref}</p>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">Receiver Reference: {transaction.receiver_org_ref}</p>
                                      </TooltipContent>
                                    </Tooltip>
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
                          {(transaction.aid_type || transaction.effective_aid_type) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={`flex items-center justify-between p-2 bg-muted/30 rounded border border-slate-200 cursor-help ${transaction.aid_type_inherited ? 'opacity-70' : ''}`}>
                                  <div className="flex items-center gap-2">
                                    <Handshake className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground">Aid Type</span>
                                    {transaction.aid_type_inherited && <span className="text-[10px] text-gray-400 italic">(inherited)</span>}
                                  </div>
                                  <span className={`text-sm font-medium ${transaction.aid_type_inherited ? 'text-gray-400' : ''}`}>
                                    {AID_TYPE_LABELS[transaction.effective_aid_type || transaction.aid_type]?.short || transaction.effective_aid_type || transaction.aid_type}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              {transaction.aid_type_inherited && (
                                <TooltipContent>
                                  <p className="text-xs">Inherited from activity's default aid type</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          )}
                          {(transaction.flow_type || transaction.effective_flow_type) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={`flex items-center justify-between p-2 bg-muted/30 rounded border border-slate-200 cursor-help ${transaction.flow_type_inherited ? 'opacity-70' : ''}`}>
                                  <div className="flex items-center gap-2">
                                    <Shuffle className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground">Flow Type</span>
                                    {transaction.flow_type_inherited && <span className="text-[10px] text-gray-400 italic">(inherited)</span>}
                                  </div>
                                  <span className={`text-sm font-medium ${transaction.flow_type_inherited ? 'text-gray-400' : ''}`}>
                                    {FLOW_TYPE_LABELS[transaction.effective_flow_type || transaction.flow_type] || transaction.effective_flow_type || transaction.flow_type}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              {transaction.flow_type_inherited && (
                                <TooltipContent>
                                  <p className="text-xs">Inherited from activity's default flow type</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          )}
                          {(transaction.finance_type || transaction.effective_finance_type) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={`flex items-center justify-between p-2 bg-muted/30 rounded border border-slate-200 cursor-help ${transaction.finance_type_inherited ? 'opacity-70' : ''}`}>
                                  <div className="flex items-center gap-2">
                                    <Coins className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground">Finance Type</span>
                                    {transaction.finance_type_inherited && <span className="text-[10px] text-gray-400 italic">(inherited)</span>}
                                  </div>
                                  <span className={`text-sm font-medium ${transaction.finance_type_inherited ? 'text-gray-400' : ''}`}>
                                    {FINANCE_TYPE_LABELS[transaction.effective_finance_type || transaction.finance_type]?.full || transaction.effective_finance_type || transaction.finance_type}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              {transaction.finance_type_inherited && (
                                <TooltipContent>
                                  <p className="text-xs">Inherited from activity's default finance type</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          )}
                          {(transaction.tied_status || transaction.effective_tied_status) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className={`flex items-center justify-between p-2 bg-muted/30 rounded border border-slate-200 cursor-help ${transaction.tied_status_inherited ? 'opacity-70' : ''}`}>
                                  <div className="flex items-center gap-2">
                                    <Link2 className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground">Tied Status</span>
                                    {transaction.tied_status_inherited && <span className="text-[10px] text-gray-400 italic">(inherited)</span>}
                                  </div>
                                  <span className={`text-sm font-medium ${transaction.tied_status_inherited ? 'text-gray-400' : ''}`}>
                                    {TIED_STATUS_LABELS[(transaction.effective_tied_status || transaction.tied_status) as keyof typeof TIED_STATUS_LABELS] || transaction.effective_tied_status || transaction.tied_status}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              {transaction.tied_status_inherited && (
                                <TooltipContent>
                                  <p className="text-xs">Inherited from activity's default tied status</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
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
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
    </TooltipProvider>
  );
}