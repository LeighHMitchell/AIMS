"use client"
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Info, CheckCircle2, DollarSign, Copy, Clipboard, SearchIcon, ChevronsUpDown, Siren } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { OrganizationCombobox, type Organization } from "@/components/ui/organization-combobox";
import { usePartners } from "@/hooks/usePartners";
import { useIATIReferenceValues } from "@/hooks/useIATIReferenceValues";
import { cn } from "@/lib/utils";
import {
  Transaction,
  TransactionType,
  DisbursementChannel,
  FlowType,
  FinanceType,
  TiedStatus,
  OrganizationType,
  TRANSACTION_TYPE_LABELS,
  DISBURSEMENT_CHANNEL_LABELS,
  FLOW_TYPE_LABELS,
  TIED_STATUS_LABELS,
  TransactionStatus,
} from "@/types/transaction";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyField } from "@/components/ui/copy-field";
import { CurrencyCombobox } from "@/components/ui/currency-combobox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TransactionDocumentUpload, TransactionDocument } from "@/components/TransactionDocumentUpload";
import { AidTypeSelect } from '@/components/forms/AidTypeSelect';
import { FlowTypeSelect } from '@/components/forms/FlowTypeSelect';
import { FinanceTypeSelect } from '@/components/forms/FinanceTypeSelect';
import { CurrencySelector } from '@/components/forms/CurrencySelector';
import { TiedStatusSelect } from '@/components/forms/TiedStatusSelect';
import { Switch } from '@/components/ui/switch';
import { LabelSaveIndicator } from '@/components/ui/save-indicator';
import { useTransactionFieldAutosave } from '@/hooks/use-transaction-field-autosave';
import { useUser } from '@/hooks/useUser';
// Remove lodash import (not used)
// import { uniqBy } from 'lodash';

// Constants for dropdowns
const TRANSACTION_TYPE_OPTIONS: { code: string; name: string; desc: string }[] = [
  { code: '1', name: 'Incoming Funds', desc: 'Funds recieved for use on the activity, which can be from an external or internal source.' },
  { code: '2', name: 'Outgoing Commitment', desc: 'A firm, written obligation from a donor or provider to provide a specified amount of funds, under particular terms and conditions, for specific purposes, for the benefit of the recipient.' },
  { code: '3', name: 'Disbursement', desc: '' }, // Removed description
  { code: '4', name: 'Expenditure', desc: 'Outgoing funds that are spent on goods and services for the activity.' },
  { code: '5', name: 'Interest Payment', desc: 'The actual amount of interest paid on a loan or line of credit, including fees.' },
  { code: '6', name: 'Loan Repayment', desc: 'The actual amount of principal (amortisation) repaid, including any arrears.' },
  { code: '7', name: 'Reimbursement', desc: 'A type of disbursement that covers funds that have already been spent by the recipient, as agreed in the terms of the grant or loan' },
  { code: '8', name: 'Purchase of Equity', desc: 'Outgoing funds that are used to purchase equity in a business' },
  { code: '9', name: 'Sale of Equity', desc: 'Incoming funds from the sale of equity.' },
  { code: '10', name: 'Credit Guarantee', desc: 'A commitment made by a funding organisation to underwrite a loan or line of credit entered into by a third party.' },
  { code: '11', name: 'Incoming Commitment', desc: 'A firm, written obligation from a donor or provider to provide a specified amount of funds, under particular terms and conditions, reported by a recipient for this activity.' },
  { code: '12', name: 'Outgoing Pledge', desc: 'Indicative, non-binding advice of an intended outgoing commitment.' },
  { code: '13', name: 'Incoming Pledge', desc: 'Indicative, non-binding advice of an intended incoming commitment.' },
];

const ORGANIZATION_TYPES = {
  '10': 'Government',
  '11': 'Local Government',
  '15': 'Other Public Sector',
  '21': 'International NGO',
  '22': 'National NGO',
  '23': 'Regional NGO',
  '24': 'Partner Country based NGO',
  '30': 'Public Private Partnership',
  '31': 'Private Sector',
  '40': 'Multilateral',
  '60': 'Foundation',
  '70': 'Academic, Training and Research',
  '80': 'Other'
};

const DISBURSEMENT_CHANNELS = {
  '1': 'Central Ministry of Finance / Treasury',
  '2': 'Direct to Implementing Institution (Separate Account)',
  '3': 'Aid in Kind via Third Party (NGOs, Management Companies)',
  '4': 'Aid in Kind Managed by Donor'
};

const FLOW_TYPES = {
  '10': 'ODA',
  '20': 'OOF',
  '21': 'Non-export credit OOF',
  '22': 'Officially supported export credits',
  '30': 'Private grants',
  '35': 'Private market',
  '36': 'Private Foreign Direct Investment',
  '37': 'Other private flows at market terms',
  '40': 'Non flow',
  '50': 'Other flows'
};

const FINANCE_TYPES_WITH_DESC = {
  'GRANTS': {
    '110': { label: 'Standard grant', desc: 'Transfer in cash or kind with no obligation to repay' },
    '111': { label: 'Subsidies to private investors', desc: 'Grants to stimulate private investment in recipient country' },
  },
  'LOANS': {
    '410': { label: 'Aid loan', desc: 'Loan for development purposes excluding debt reorganisation' },
    '411': { label: 'Investment loan', desc: 'Loan to developing country for investment purposes' },
    '412': { label: 'Joint venture loan', desc: 'Loan as part of joint venture with recipient' },
    '413': { label: 'Loan to private investor', desc: 'Loan to national private investor in recipient country' },
    '414': { label: 'Loan to private exporter', desc: 'Loan to national private exporter in recipient country' },
    '421': { label: 'Reimbursable grant', desc: 'Grant that may require repayment under certain conditions' },
  },
  'DEBT RELIEF': {
    '510': { label: 'Debt forgiveness (ODA)', desc: 'Cancellation of ODA loan debt' },
    '511': { label: 'Debt forgiveness (HIPCs)', desc: 'Debt relief under HIPC Initiative' },
    '512': { label: 'Debt forgiveness (MDRI)', desc: 'Debt relief under Multilateral Debt Relief Initiative' },
    '520': { label: 'Debt rescheduling', desc: 'Rescheduling or refinancing of ODA loans' },
    '600': { label: 'Debt reorganisation', desc: 'Any action altering terms of existing debt' },
  },
  'GUARANTEES': {
    '1100': { label: 'Guarantees/insurance', desc: 'Risk mitigation instruments and insurance' },
    '432': { label: 'Investment guarantees', desc: 'Guarantees for private investment' },
    '433': { label: 'Credit guarantees', desc: 'Guarantees for other credits' },
  },
  'OTHER': {
    '210': { label: 'Interest subsidy', desc: 'Subsidies to reduce interest paid by borrower' },
    '310': { label: 'Deposit basis', desc: 'Capital subscription paid into recipient institution' },
    '700': { label: 'Foreign direct investment', desc: 'Investment to acquire lasting interest in enterprises' },
    '810': { label: 'Bonds', desc: 'Fixed income debt securities' },
    '910': { label: 'Other securities', desc: 'Other securities and financial claims' },
  }
};

// Aid Type categories
const AID_TYPES_CATEGORIZED = {
  'BUDGET SUPPORT': {
    'A01': 'General budget support',
    'A02': 'Sector budget support',
  },
  'CORE CONTRIBUTIONS': {
    'B01': 'Core support to NGOs, other private bodies, PPPs and research institutes',
    'B02': 'Core contributions to multilateral institutions',
    'B03': 'Contributions to specific-purpose programmes and funds managed by international organisations',
    'B04': 'Basket funds/pooled funding',
  },
  'PROJECT-TYPE': {
    'C01': 'Project-type interventions',
  },
  'TECHNICAL ASSISTANCE': {
    'D01': 'Donor country personnel',
    'D02': 'Other technical assistance',
  },
  'SCHOLARSHIPS': {
    'E01': 'Scholarships/training in donor country',
    'E02': 'Imputed student costs',
  },
  'DEBT': {
    'F01': 'Debt relief',
  },
  'ADMINISTRATIVE': {
    'G01': 'Administrative costs not included elsewhere',
  },
  'OTHER': {
    'H01': 'Development awareness',
    'H02': 'Refugees in donor countries',
  }
};

// TIED_STATUS with proper IATI codes
const TIED_STATUS = {
  '1': { label: 'Tied', desc: 'Funds must be used with suppliers from the donor country' },
  '2': { label: 'Partially tied', desc: 'Mixed procurement conditions' },
  '3': { label: 'Untied', desc: 'No restriction on supplier country' },
  '4': { label: 'Not reported', desc: 'Tied status not reported' }
};

const SECTOR_VOCABULARIES = {
  '1': 'DAC 5-digit',
  '2': 'DAC 3-digit',
  '3': 'COFOG',
  '4': 'NACE',
  '5': 'NTEE',
  '6': 'WB',
  '7': 'RO',
  '8': 'RO2',
  '9': 'SDG Goals',
  '10': 'SDG Targets',
  '98': 'Reporting Organisation',
  '99': 'Reporting Organisation 2'
};

const REGION_VOCABULARIES = {
  '1': 'UN M.49',
  '2': 'OECD DAC'
};

// Helper function to classify financing
function classifyFinance(flowType: string | undefined, aidType: string | undefined, financeType: string | undefined): string {
  if (!flowType || !financeType) return "Other";
  
  const odaFlows = ['10', '11', '30'];
  const oofFlows = ['20', '21', '22'];
  const odaAidPrefixes = ['A', 'B', 'C', 'D', 'E'];
  const odaGrants = ['110', '111', '210'];
  const odaLoans = ['410', '411', '412', '413', '414', '421'];
  
  const isODA = odaFlows.includes(flowType);
  const isOOF = oofFlows.includes(flowType);
  const isODAEligibleAid = aidType ? odaAidPrefixes.includes(aidType[0]) : true;
  
  if (isODA && isODAEligibleAid && odaGrants.includes(financeType)) {
    return "ODA Grant";
  }
  if (isODA && odaLoans.includes(financeType)) {
    return "ODA Loan";
  }
  if (isOOF && odaGrants.includes(financeType)) {
    return "OOF Grant";
  }
  if (isOOF && odaLoans.includes(financeType)) {
    return "OOF Loan";
  }
  return "Other";
}

// Helper type guards
const isFlowType = (v: any): v is FlowType => typeof v === 'string' && ['10','20','21','22','30','35','36','37','40','50'].includes(v);
const isFinanceType = (v: any): v is FinanceType => typeof v === 'string' && [
  '1','110','111','210','211','310','311','410','411','412','413','414','451','452','453','510','511','512','513','520','530','600','601','602','603','610','620','621','622','623','630','631','632','700','810','910','1100'
].includes(v);
const isTiedStatus = (v: any): v is TiedStatus => typeof v === 'string' && ['3','4','5'].includes(v);

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  activityId: string;
  onSubmit: (transaction: Partial<Transaction>) => void;
  defaultFinanceType?: string; // From activity settings
  defaultAidType?: string; // From activity settings
  defaultCurrency?: string; // From activity settings
  defaultTiedStatus?: string; // From activity settings
  defaultFlowType?: string; // From activity settings
  defaultModality?: string;
  defaultModalityOverride?: boolean;
  isSubmitting?: boolean;
}

export default function TransactionModal({
  open,
  onOpenChange,
  transaction,
  activityId,
  onSubmit,
  defaultFinanceType,
  defaultAidType,
  defaultCurrency,
  defaultTiedStatus,
  defaultFlowType,
  defaultModality = '',
  defaultModalityOverride = false,
  isSubmitting
}: TransactionModalProps) {
  const { partners } = usePartners();
  const { data: iatiValues, loading: iatiLoading, getFieldValues, error: iatiError } = useIATIReferenceValues();
  const { user } = useUser();
  const isEditing = !!transaction;
  
  // Fallback transaction types if IATI values fail to load
  const fallbackTransactionTypes = [
    { code: '1', name: 'Incoming Commitment' },
    { code: '2', name: 'Outgoing Commitment' },
    { code: '3', name: 'Disbursement' },
    { code: '4', name: 'Expenditure' },
    { code: '5', name: 'Interest Repayment' },
    { code: '6', name: 'Loan Repayment' },
    { code: '7', name: 'Reimbursement' },
    { code: '8', name: 'Purchase of Equity' },
    { code: '9', name: 'Sale of Equity' },
    { code: '11', name: 'Credit Guarantee' },
    { code: '12', name: 'Incoming Funds' },
    { code: '13', name: 'Commitment Cancellation' }
  ];
  
  // Fallback aid types
  const fallbackAidTypes = [
    { code: 'A01', name: 'General budget support' },
    { code: 'A02', name: 'Sector budget support' },
    { code: 'B01', name: 'Core support to NGOs, other private bodies, PPPs and research institutes' },
    { code: 'B02', name: 'Core contributions to multilateral institutions' },
    { code: 'B03', name: 'Contributions to specific-purpose programmes and funds managed by implementing partners' },
    { code: 'B04', name: 'Basket funds/pooled funding' },
    { code: 'C01', name: 'Project-type interventions' },
    { code: 'D01', name: 'Donor country personnel' },
    { code: 'D02', name: 'Other technical assistance' },
    { code: 'E01', name: 'Scholarships/training in donor country' },
    { code: 'E02', name: 'Imputed student costs' },
    { code: 'F01', name: 'Debt relief' },
    { code: 'G01', name: 'Administrative costs not included elsewhere' },
    { code: 'H01', name: 'Development awareness' },
    { code: 'H02', name: 'Refugees/asylum seekers in donor countries' }
  ];
  
  // Get transaction types with fallback
  const getTransactionTypes = () => {
    if (iatiError || !iatiValues) {
      console.warn('[TransactionModal] Using fallback transaction types due to IATI loading error:', iatiError);
      return fallbackTransactionTypes;
    }
    
    const types = getFieldValues('transaction_type')
      .filter((type): type is { code: string; name: string } => 
        type && typeof type.code === 'string' && typeof type.name === 'string'
      );
    
    // If no types loaded from IATI, use fallback
    if (types.length === 0) {
      console.warn('[TransactionModal] No transaction types loaded from IATI, using fallback');
      return fallbackTransactionTypes;
    }
    
    return types;
  };
  
  // Get aid types with fallback
  const getAidTypes = () => {
    if (iatiError || !iatiValues) {
      console.warn('[TransactionModal] Using fallback aid types due to IATI loading error:', iatiError);
      return fallbackAidTypes;
    }
    
    const types = getFieldValues('aid_type')
      .filter((type): type is { code: string; name: string } => 
        type && typeof type.code === 'string' && typeof type.name === 'string'
      );
    
    // If no types loaded from IATI, use fallback
    if (types.length === 0) {
      console.warn('[TransactionModal] No aid types loaded from IATI, using fallback');
      return fallbackAidTypes;
    }
    
    return types;
  };
  
  const [isClassificationOverridden, setIsClassificationOverridden] = useState(false);
  const [computedClassification, setComputedClassification] = useState("");
  const [manualClassification, setManualClassification] = useState("");
  const [showValueDate, setShowValueDate] = useState(false);
  
  // Document upload state
  const [documents, setDocuments] = useState<TransactionDocument[]>([]);

  // Load existing documents when editing
  useEffect(() => {
    if (isEditing && (transaction?.uuid || transaction?.id) && open) {
      const fetchDocuments = async () => {
        try {
          const response = await fetch(`/api/transactions/documents?transactionId=${transaction.uuid || transaction.id}`);
          if (response.ok) {
            const data = await response.json();
            setDocuments(data.documents || []);
          }
        } catch (error) {
          console.error('Error fetching transaction documents:', error);
        }
      };
      fetchDocuments();
    } else if (!open) {
      // Reset documents when modal closes
      setDocuments([]);
    }
  }, [isEditing, transaction?.id, open]);

  // Transform partners to organizations format for OrganizationCombobox
  const organizations: Organization[] = React.useMemo(() => {
    return partners.map(partner => ({
      id: partner.id,
      name: partner.fullName || partner.name || '',
      acronym: partner.acronym,
      iati_org_id: partner.iatiOrgId,
      type: partner.type,
      country: partner.countryRepresented
    }));
  }, [partners]);

  // Form state with all IATI fields
  const [formData, setFormData] = useState<Partial<Transaction>>({
    // Core fields
    transaction_type: transaction?.transaction_type || '3',
    transaction_date: transaction?.transaction_date || format(new Date(), "yyyy-MM-dd"),
    value: transaction?.value || 0,
    currency: transaction?.currency || defaultCurrency || 'USD',
    status: transaction?.status || 'draft',
    
    // Optional core fields
    transaction_reference: transaction?.transaction_reference || '',
    value_date: transaction?.value_date || '',
    description: transaction?.description || '',
    
    // Provider organization
    provider_org_id: transaction?.provider_org_id || undefined,
    provider_org_type: transaction?.provider_org_type || undefined,
    provider_org_ref: transaction?.provider_org_ref || '',
    provider_org_name: transaction?.provider_org_name || '',
    
    // Receiver organization
    receiver_org_id: transaction?.receiver_org_id || undefined,
    receiver_org_type: transaction?.receiver_org_type || undefined,
    receiver_org_ref: transaction?.receiver_org_ref || '',
    receiver_org_name: transaction?.receiver_org_name || '',
    
    // Classifications - Use activity defaults when creating new transactions
    disbursement_channel: transaction?.disbursement_channel || undefined,
    flow_type: transaction?.flow_type || (defaultFlowType as FlowType) || undefined,
    finance_type: transaction?.finance_type || (defaultFinanceType as FinanceType) || undefined,
    aid_type: transaction?.aid_type || defaultAidType || undefined,
    tied_status: transaction?.tied_status || (defaultTiedStatus as TiedStatus) || undefined,
    
    // Sector & Geography
    sector_code: transaction?.sector_code || '',
    sector_vocabulary: transaction?.sector_vocabulary || undefined,
    recipient_country_code: transaction?.recipient_country_code || '',
    recipient_region_code: transaction?.recipient_region_code || '',
    recipient_region_vocab: transaction?.recipient_region_vocab || undefined,
    
    // Other
    is_humanitarian: transaction?.is_humanitarian || false,
  });

  // Initialize showValueDate based on whether value_date exists and is different
  useEffect(() => {
    if (transaction?.value_date && transaction.value_date !== transaction.transaction_date) {
      setShowValueDate(true);
    }
  }, [transaction]);

  // Autosave hooks for key fields
  const transactionId = transaction?.uuid || transaction?.id || '';
  const currencyAutosave = useTransactionFieldAutosave({
    transactionId,
    fieldName: 'currency',
    userId: user?.id,
    initialValue: formData.currency,
    debounceMs: 1000
  });
  const financeTypeAutosave = useTransactionFieldAutosave({
    transactionId,
    fieldName: 'finance_type',
    userId: user?.id,
    initialValue: formData.finance_type,
    debounceMs: 1000
  });
  const aidTypeAutosave = useTransactionFieldAutosave({
    transactionId,
    fieldName: 'aid_type',
    userId: user?.id,
    initialValue: formData.aid_type,
    debounceMs: 1000
  });
  const tiedStatusAutosave = useTransactionFieldAutosave({
    transactionId,
    fieldName: 'tied_status',
    userId: user?.id,
    initialValue: formData.tied_status,
    debounceMs: 1000
  });
  const flowTypeAutosave = useTransactionFieldAutosave({
    transactionId,
    fieldName: 'flow_type',
    userId: user?.id,
    initialValue: formData.flow_type,
    debounceMs: 1000
  });

  // Compute classification when relevant fields change
  useEffect(() => {
    const classification = classifyFinance(formData.flow_type, formData.aid_type, formData.finance_type);
    setComputedClassification(classification);
  }, [formData.flow_type, formData.aid_type, formData.finance_type]);

  // Update form data when transaction prop changes OR when defaults change
  useEffect(() => {
    console.log('[TransactionModal] Form data update triggered:', {
      isEditing,
      transaction: transaction?.id,
      defaultFinanceType,
      defaultAidType,
      defaultCurrency,
      defaultTiedStatus,
      defaultFlowType
    });
    
    if (transaction) {
      // Set the created transaction ID when editing an existing transaction
      setCreatedTransactionId(transaction.id || transaction.uuid || null);
      // Editing existing transaction
      setFormData({
        // Core fields
        transaction_type: transaction.transaction_type || '3',
        transaction_date: transaction.transaction_date || format(new Date(), "yyyy-MM-dd"),
        value: transaction.value || 0,
        currency: transaction.currency || defaultCurrency || 'USD',
        status: transaction.status || 'draft',
        
        // Optional core fields
        transaction_reference: transaction.transaction_reference || '',
        value_date: transaction.value_date || '',
        description: transaction.description || '',
        
        // Provider organization
        provider_org_id: transaction.provider_org_id || undefined,
        provider_org_type: transaction.provider_org_type || undefined,
        provider_org_ref: transaction.provider_org_ref || '',
        provider_org_name: transaction.provider_org_name || '',
        
        // Receiver organization
        receiver_org_id: transaction.receiver_org_id || undefined,
        receiver_org_type: transaction.receiver_org_type || undefined,
        receiver_org_ref: transaction.receiver_org_ref || '',
        receiver_org_name: transaction.receiver_org_name || '',
        
        // Classifications - keep existing values when editing
        disbursement_channel: transaction.disbursement_channel || undefined,
        flow_type: transaction.flow_type || undefined,
        finance_type: transaction.finance_type || undefined,
        aid_type: transaction.aid_type || undefined,
        tied_status: transaction.tied_status || undefined,
        
        // Sector & Geography
        sector_code: transaction.sector_code || '',
        sector_vocabulary: transaction.sector_vocabulary || undefined,
        recipient_country_code: transaction.recipient_country_code || '',
        recipient_region_code: transaction.recipient_region_code || '',
        recipient_region_vocab: transaction.recipient_region_vocab || undefined,
        
        // Other
        is_humanitarian: transaction.is_humanitarian || false,
      });
      // Check if value_date is different from transaction_date
      if (transaction.value_date && transaction.value_date !== transaction.transaction_date) {
        setShowValueDate(true);
      }
    } else {
      // Creating new transaction - reset the created transaction ID and use activity defaults
      setCreatedTransactionId(null);
      console.log('[TransactionModal] Setting form data for new transaction with defaults:', {
        defaultFinanceType,
        defaultAidType,
        defaultCurrency,
        defaultTiedStatus,
        defaultFlowType
      });
      
      setFormData({
        transaction_type: '3',
        transaction_date: format(new Date(), "yyyy-MM-dd"),
        value: 0,
        currency: defaultCurrency || 'USD',
        status: 'draft',
        transaction_reference: '',
        value_date: '',
        description: '',
        provider_org_id: undefined,
        provider_org_type: undefined,
        provider_org_ref: '',
        provider_org_name: '',
        receiver_org_id: undefined,
        receiver_org_type: undefined,
        receiver_org_ref: '',
        receiver_org_name: '',
        disbursement_channel: undefined,
        flow_type: (defaultFlowType as FlowType) || undefined,
        finance_type: (defaultFinanceType as FinanceType) || undefined,
        aid_type: defaultAidType || undefined,
        tied_status: (defaultTiedStatus as TiedStatus) || undefined,
        sector_code: '',
        sector_vocabulary: undefined,
        recipient_country_code: '',
        recipient_region_code: '',
        recipient_region_vocab: undefined,
        is_humanitarian: false,
      });
      setShowValueDate(false);
    }
  }, [transaction, defaultFinanceType, defaultAidType, defaultCurrency, defaultTiedStatus, defaultFlowType]);

  // Add missing state for Disbursement Channel popover
  const [disbursementPopoverOpen, setDisbursementPopoverOpen] = useState(false);
  const [disbursementSearch, setDisbursementSearch] = useState('');

  // Add unique transaction_reference check (in-memory, for now)
  const [allTransactionReferences, setAllTransactionReferences] = useState<string[]>([]);

  useEffect(() => {
    // If you have access to all transactions, setAllTransactionReferences([...]) here
    // For now, this is a placeholder; ideally, pass as prop or fetch from parent
  }, []);

  const validateTransaction = (data: Partial<Transaction>): string | null => {
    if (!data.transaction_type) return 'Transaction type is required.';
    if (!data.transaction_date) return 'Transaction date is required.';
    if (!data.value || isNaN(Number(data.value)) || Number(data.value) <= 0) return 'Transaction value must be greater than 0.';
    if (!data.currency) return 'Currency is required.';
    if (!data.provider_org_id) return 'Provider organization is required.';
    if (!data.receiver_org_id) return 'Receiver organization is required.';
    if (data.transaction_reference) {
      // Check for duplicate reference (case-insensitive)
      const ref = data.transaction_reference.trim().toLowerCase();
      if (allTransactionReferences.filter(r => r && r.trim().toLowerCase() === ref).length > (isEditing ? 1 : 0)) {
        return 'Transaction reference must be unique.';
      }
    }
    return null;
  };

  const getTransactionPayload = (formData: Partial<Transaction>) => {
    // List of allowed fields in the DB schema
    const allowed = [
      'id', 'uuid', 'activity_id', 'transaction_type', 'transaction_date', 'value', 'currency', 'status',
      'transaction_reference', 'value_date', 'description',
      'provider_org_id', 'provider_org_type', 'provider_org_ref', 'provider_org_name',
      'receiver_org_id', 'receiver_org_type', 'receiver_org_ref', 'receiver_org_name',
      'disbursement_channel', 'flow_type', 'finance_type', 'aid_type', 'tied_status',
      'sector_code', 'sector_vocabulary', 'recipient_country_code', 'recipient_region_code', 'recipient_region_vocab',
      'is_humanitarian'
    ];
    const payload: any = {};
    for (const key of allowed) {
      if (formData[key as keyof Transaction] !== undefined) {
        payload[key] = formData[key as keyof Transaction];
      }
    }
    return payload;
  };

  const handleSubmit = async () => {
    const submissionData = getTransactionPayload({
      ...formData,
      activity_id: activityId,
      provider_org_name: organizations.find(o => o.id === formData.provider_org_id)?.acronym || organizations.find(o => o.id === formData.provider_org_id)?.name || '',
      receiver_org_name: organizations.find(o => o.id === formData.receiver_org_id)?.acronym || organizations.find(o => o.id === formData.receiver_org_id)?.name || '',
      financing_classification: isClassificationOverridden ? manualClassification : computedClassification
    });
    const validationError = validateTransaction(submissionData);
    // Check for duplicate transaction reference in the current list (frontend validation)
    if (submissionData.transaction_reference) {
      const ref = submissionData.transaction_reference.trim().toLowerCase();
      const isDuplicate = allTransactionReferences.filter(r => r && r.trim().toLowerCase() === ref).length > (createdTransactionId || (isEditing && transaction?.id) ? 1 : 0);
      if (isDuplicate) {
        toast.error('Transaction reference must be unique.');
        return;
      }
    }
    if (validationError) {
      const missingFields = getMissingRequiredFields(formData);
      if (missingFields.length > 0) {
        toast.error(`Missing required fields: ${missingFields.join(', ')}`);
      } else {
        toast.error(validationError);
      }
      return;
    }
    try {
      let response;
      // If we have an autosaved transaction, update it instead of creating a new one
      if (createdTransactionId) {
        response = await fetch('/api/transactions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...submissionData, id: createdTransactionId })
        });
      } else if (isEditing && (transaction?.uuid || transaction?.id)) {
        // Update existing transaction (edit mode)
        response = await fetch('/api/transactions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...submissionData, id: transaction.uuid || transaction.id })
        });
      } else {
        // Create new transaction
        response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionData)
        });
      }
      if (!response.ok) {
        const error = await response.json();
        if (error.error && error.error.includes('unique') && error.error.includes('transaction_reference')) {
          toast.error('Transaction reference must be unique.');
        } else if (error.error && error.error.includes('required')) {
          toast.error('A required field is missing.');
        } else {
          toast.error(error.error || 'Failed to save transaction');
        }
        return;
      }
      const saved = await response.json();
      setCreatedTransactionId(saved.id || saved.uuid);
      toast.success((isEditing || createdTransactionId) ? 'Transaction updated successfully' : 'Transaction added successfully');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to save transaction');
    }
  };

  const InfoTooltip = ({ text }: { text: string }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3 w-3 text-muted-foreground inline-block ml-1" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
    </div>
  );

  const FieldDescription = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs text-muted-foreground mt-1">{children}</p>
  );

  // Enhanced constants with descriptions
  const AID_TYPES_WITH_DESC = {
    'BUDGET SUPPORT': {
      'A01': { label: 'General budget support', desc: 'Unearmarked contributions to the government budget' },
      'A02': { label: 'Sector budget support', desc: 'Contributions to a specific sector\'s budget' },
    },
    'CORE CONTRIBUTIONS': {
      'B01': { label: 'Core support to NGOs', desc: 'Core contributions to NGOs for operational or programme activities' },
      'B02': { label: 'Core contributions to multilateral institutions', desc: 'Unearmarked contributions to multilateral organizations' },
      'B03': { label: 'Contributions to specific programmes', desc: 'Earmarked contributions managed by international organizations' },
      'B04': { label: 'Basket funds/pooled funding', desc: 'Pooled contributions for joint programmes' },
    },
    'PROJECT-TYPE': {
      'C01': { label: 'Project-type interventions', desc: 'Specific inputs, activities and outputs for development objectives' },
    },
    'TECHNICAL ASSISTANCE': {
      'D01': { label: 'Donor country personnel', desc: 'Experts from donor countries working in recipient countries' },
      'D02': { label: 'Other technical assistance', desc: 'Consultancies, training and research not elsewhere specified' },
    },
    'SCHOLARSHIPS': {
      'E01': { label: 'Scholarships/training in donor country', desc: 'Financial aid for studies in the donor country' },
      'E02': { label: 'Imputed student costs', desc: 'Indirect costs of educating students from recipient countries' },
    },
    'DEBT': {
      'F01': { label: 'Debt relief', desc: 'Relief of debt including forgiveness and rescheduling' },
    },
    'ADMINISTRATIVE': {
      'G01': { label: 'Administrative costs', desc: 'Administrative costs not included elsewhere' },
    },
    'OTHER': {
      'H01': { label: 'Development awareness', desc: 'Spending to increase public support for development cooperation' },
      'H02': { label: 'Refugees in donor countries', desc: 'Support to refugees in donor countries during first year' },
    }
  };

  const FLOW_TYPES_WITH_DESC = {
    '10': { label: 'ODA', desc: 'Official Development Assistance: concessional support from public funds' },
    '20': { label: 'OOF', desc: 'Other Official Flows: non-concessional developmental flows' },
    '21': { label: 'Non-export credit OOF', desc: 'OOF excluding officially supported export credits' },
    '22': { label: 'Officially supported export credits', desc: 'Export credits with official support' },
    '30': { label: 'Private grants', desc: 'Grants from private organizations and individuals' },
    '35': { label: 'Private market', desc: 'Private flows at market terms' },
    '36': { label: 'Private Foreign Direct Investment', desc: 'Private investment for lasting interest in enterprises' },
    '37': { label: 'Other private flows', desc: 'Other private flows at market terms' },
    '40': { label: 'Non flow', desc: 'Resources provided without cross-border flows' },
    '50': { label: 'Other flows', desc: 'Flows not elsewhere classified' }
  };

  const TIED_STATUS_WITH_DESC = {
    '1': { label: 'Tied', desc: 'Aid tied to procurement from donor country suppliers' },
    '2': { label: 'Partially tied', desc: 'Aid with limited procurement restrictions' },
    '3': { label: 'Untied', desc: 'Aid not restricted to suppliers from specific countries' },
    '4': { label: 'Not reported', desc: 'Tied status not reported' }
  };

  const DISBURSEMENT_CHANNELS_WITH_DESC = {
    '1': { label: 'Central Ministry of Finance / Treasury', desc: 'Money is disbursed through central Ministry of Finance or Treasury' },
    '2': { label: 'Direct to Implementing Institution (Separate Account)', desc: 'Money is disbursed directly to the implementing institution and managed through a separate bank account' },
    '3': { label: 'Aid in Kind via Third Party (NGOs, Management Companies)', desc: 'Donors utilise third party agencies, e.g. NGOs or management companies' },
    '4': { label: 'Aid in Kind Managed by Donor', desc: 'Donors manage funds themselves' }
  };

  // Helper to get current descriptions for selected values
  const getSelectedDescription = (type: string, value: string | undefined) => {
    if (!value) return null;
    
    switch (type) {
      case 'transaction':
        return TRANSACTION_TYPE_OPTIONS.find(opt => opt.code === value)?.desc;
      case 'aid':
        for (const category of Object.values(AID_TYPES_WITH_DESC)) {
          if (value in category) {
            const item = (category as any)[value];
            if (item && typeof item === 'object' && 'desc' in item) {
              return item.desc;
            }
          }
        }
        return null;
      case 'flow':
        return FLOW_TYPES_WITH_DESC[value as keyof typeof FLOW_TYPES_WITH_DESC]?.desc;
      case 'finance':
        for (const category of Object.values(FINANCE_TYPES_WITH_DESC)) {
          if (value in category) {
            const item = (category as any)[value];
            if (item && typeof item === 'object' && 'desc' in item) {
              return item.desc;
            }
          }
        }
        return null;
      case 'tied':
        return TIED_STATUS_WITH_DESC[value as keyof typeof TIED_STATUS_WITH_DESC]?.desc;
      case 'disbursement':
        return DISBURSEMENT_CHANNELS_WITH_DESC[value as keyof typeof DISBURSEMENT_CHANNELS_WITH_DESC]?.desc;
      default:
        return null;
    }
  };

  const [transactionTypePopoverOpen, setTransactionTypePopoverOpen] = useState(false);
  const [transactionTypeSearch, setTransactionTypeSearch] = useState('');

  // Add required fields array
  const REQUIRED_FIELDS = ['transaction_type', 'transaction_date', 'value', 'currency', 'activity_id'];

  // Add state to track if transaction is created
  const [createdTransactionId, setCreatedTransactionId] = useState<string | null>(transaction?.id || null);
  const [pendingFields, setPendingFields] = useState<Partial<Transaction>>({});
  const [creationError, setCreationError] = useState<string | null>(null);

  // Helper to check if all required fields are present
  const hasAllRequiredFields = (data: Partial<Transaction>) => {
    return REQUIRED_FIELDS.every(field => {
      if (field === 'activity_id') {
        return !!activityId; // Check the prop instead of formData
      }
      return !!data[field as keyof Transaction];
    });
  };

  // Helper to get missing required fields
  const getMissingRequiredFields = (data: Partial<Transaction>) => {
    const missing: string[] = [];
    REQUIRED_FIELDS.forEach(field => {
      if (field === 'activity_id') {
        if (!activityId) missing.push('Activity ID');
      } else if (!data[field as keyof Transaction]) {
        missing.push(field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
      }
    });
    return missing;
  };

  // Prevent concurrent autosave requests that can crash the server
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const isCreatingRef = React.useRef(false);

  // Move useDebouncedCallback definition above its first usage
  function useDebouncedCallback(callback: (...args: any[]) => void, delay: number) {
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    
    // Cleanup function
    const cleanup = React.useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }, []);
    
    const debouncedFn = React.useCallback((...args: any[]) => {
      cleanup();
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    }, [callback, delay, cleanup]);
    
    // Cleanup on unmount
    React.useEffect(() => {
      return cleanup;
    }, [cleanup]);
    
    return debouncedFn;
  }

  // Debounced autosave for creating transaction - WITH REQUEST DEDUPLICATION
  const debouncedCreateTransaction = useDebouncedCallback(async (data: Partial<Transaction>) => {
    // Prevent concurrent requests
    if (isCreatingRef.current) {
      console.log('[TransactionModal] Skipping concurrent autosave request');
      return;
    }
    
    if (!hasAllRequiredFields(data)) {
      const missingFields = getMissingRequiredFields(data);
      toast.error(`Missing required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    isCreatingRef.current = true;
    
    try {
      const payload = getTransactionPayload({ ...data, activity_id: activityId });
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        const error = await response.json();
        setCreationError(error.error || 'Failed to create transaction');
        return;
      }
      
      const saved = await response.json();
      setCreatedTransactionId(saved.id || saved.uuid);
      setCreationError(null);
      toast.success('Transaction saved! You can now upload documents.');
      
      // Save any pending fields (with same abort controller)
      if (Object.keys(pendingFields).length > 0) {
        await fetch('/api/transactions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...pendingFields, id: saved.id || saved.uuid }),
          signal: abortControllerRef.current.signal
        });
        setPendingFields({});
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setCreationError(e.message || 'Failed to create transaction');
      }
    } finally {
      isCreatingRef.current = false;
    }
  }, 500);

  // Cleanup on unmount to prevent crashes
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      isCreatingRef.current = false;
    };
  }, []);

  // Watch required fields and trigger autosave creation (only for new transactions, not when editing)
  useEffect(() => {
    if (!isEditing && !createdTransactionId && hasAllRequiredFields(formData)) {
      debouncedCreateTransaction(formData);
    }
  }, [formData.transaction_type, formData.transaction_date, formData.value, formData.currency, activityId, isEditing]);

  // When editing fields before transaction is created, store them as pending
  const handleFieldChange = (field: keyof Transaction, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Trigger autosave for specific fields
    if (field === 'currency') {
      currencyAutosave.triggerFieldSave(value);
    } else if (field === 'finance_type') {
      financeTypeAutosave.triggerFieldSave(value);
    } else if (field === 'aid_type') {
      aidTypeAutosave.triggerFieldSave(value);
    } else if (field === 'tied_status') {
      tiedStatusAutosave.triggerFieldSave(value);
    } else if (field === 'flow_type') {
      flowTypeAutosave.triggerFieldSave(value);
    }
    
    if (!createdTransactionId && !REQUIRED_FIELDS.includes(field)) {
      setPendingFields(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-8 py-5 border-b">
          <DialogTitle className="text-xl">
            {isEditing ? "Edit Transaction" : "Add New Transaction"}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(90vh-10rem)]">
          <div className="px-8 py-6 space-y-8">
            {/* Transaction Details Section */}
            <div className="space-y-4">
              <SectionHeader title="Transaction Details" />
              
              {/* Transaction Identifiers (Edit mode only) */}
              {isEditing && (
                <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CopyField
                      label="Transaction UUID"
                      value={transaction?.id || ''}
                      placeholder="System generated"
                    />
                    <CopyField
                      label="Activity UUID"
                      value={activityId}
                      placeholder="Parent activity ID"
                    />
                  </div>
                </div>
              )}

              {/* Error alert for IATI loading issues */}
              {(iatiError || (!iatiLoading && (!iatiValues || getFieldValues('transaction_type').length === 0))) && (
                <Alert className="mb-4">
                  <AlertDescription>
                    Unable to load IATI reference values from server. Using fallback values. 
                    {iatiError && ` Error: ${iatiError}`}
                  </AlertDescription>
                </Alert>
              )}

              {/* Type and Status Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transaction_type" className="text-sm font-medium">
                    Transaction Type
                    <InfoTooltip text="IATI transaction type code, name, and description." />
                  </Label>
                  <Popover open={transactionTypePopoverOpen} onOpenChange={setTransactionTypePopoverOpen}>
                    <PopoverTrigger className="w-full">
                      <Button
                        variant="outline"
                        className="w-full flex justify-between items-center"
                        aria-haspopup="listbox"
                      >
                        {formData.transaction_type ? (
                          <span className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {formData.transaction_type}
                            </span>
                            <span className="font-medium">
                              {TRANSACTION_TYPE_OPTIONS.find(opt => opt.code === formData.transaction_type)?.name || 'Select transaction type'}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Select transaction type</span>
                        )}
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[320px] max-w-xl p-0 shadow-lg border" align="start" sideOffset={4}>
                      <Command>
                        <CommandInput
                          placeholder="Search transaction types..."
                          value={transactionTypeSearch}
                          onChange={e => setTransactionTypeSearch(e.target.value)}
                          className="w-full px-3 py-2 border-none focus:ring-0 focus:border-none"
                          autoFocus
                        />
                        <CommandList>
                          {TRANSACTION_TYPE_OPTIONS.filter((opt: { code: string; name: string; desc: string }) => {
                            const q = transactionTypeSearch.toLowerCase();
                            return (
                              opt.code.toLowerCase().includes(q) ||
                              opt.name.toLowerCase().includes(q) ||
                              opt.desc.toLowerCase().includes(q)
                            );
                          }).map((opt: { code: string; name: string; desc: string }, idx: number, arr: typeof TRANSACTION_TYPE_OPTIONS) => (
                            <React.Fragment key={opt.code}>
                              <CommandItem
                                onSelect={() => {
                                  setFormData({ ...formData, transaction_type: opt.code as TransactionType });
                                  // Field-level autosave for transaction_type
                                  if (transactionId) {
                                    // Use the same pattern as other autosave fields
                                    // You may want to create a transactionTypeAutosave hook for consistency
                                    // For now, do a direct PATCH
                                    fetch(`/api/data-clinic/transactions/${transactionId}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ field: 'transaction_type', value: opt.code, userId: user?.id })
                                    });
                                  }
                                  setTransactionTypePopoverOpen(false);
                                  setTransactionTypeSearch("");
                                }}
                                className="flex flex-col items-start px-4 py-3 gap-1 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded min-w-[28px] text-center">
                                    {opt.code}
                                  </span>
                                  <span className="font-semibold text-foreground flex-1 truncate">
                                    {opt.name}
                                  </span>
                                </div>
                                <div className="text-sm text-muted-foreground pl-10 leading-relaxed w-full">
                                  {opt.desc}
                                </div>
                              </CommandItem>
                              {idx < arr.length - 1 && (
                                <div className="border-b border-muted mx-2" />
                              )}
                            </React.Fragment>
                          ))}
                          {TRANSACTION_TYPE_OPTIONS.filter((opt: { code: string; name: string; desc: string }) => {
                            const q = transactionTypeSearch.toLowerCase();
                            return (
                              opt.code.toLowerCase().includes(q) ||
                              opt.name.toLowerCase().includes(q) ||
                              opt.desc.toLowerCase().includes(q)
                            );
                          }).length === 0 && (
                            <div className="py-8 text-center">
                              <div className="text-sm text-muted-foreground">
                                No transaction types found.
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                Try adjusting your search terms
                              </div>
                            </div>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {formData.transaction_type && (
                    <FieldDescription>
                      {TRANSACTION_TYPE_OPTIONS.find(opt => opt.code === formData.transaction_type)?.desc}
                    </FieldDescription>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">
                    Transaction Status
                  </Label>
                  <Input
                    id="status"
                    value={formData.status === 'validated' ? '1 Validated' : '2 Unvalidated'}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Value and Currency Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="value" className="text-sm font-medium">
                    Transaction Value
                  </Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*\.?[0-9]*"
                    value={formData.value === 0 ? '' : formData.value}
                    onChange={e => {
                      const value = e.target.value;
                      // Allow empty string, numbers, and decimal point
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setFormData({...formData, value: value === '' ? 0 : Number(value)});
                      }
                    }}
                    onBlur={e => {
                      // Format on blur if needed
                      const value = e.target.value;
                      if (value === '') {
                        setFormData({...formData, value: 0});
                      }
                    }}
                    placeholder="0.00"
                    className="w-full text-left"
                  />
                </div>

                <div className="space-y-2">
                  <LabelSaveIndicator 
                    isSaving={currencyAutosave.isSaving}
                    isSaved={currencyAutosave.isSaved}
                  >
                    Currency
                    <InfoTooltip text="Currency of the transaction value" />
                  </LabelSaveIndicator>
                  <CurrencySelector
                    value={formData.currency || undefined}
                    onValueChange={v => {
                      const newValue = v || undefined;
                      setFormData({...formData, currency: newValue});
                      currencyAutosave.triggerFieldSave(newValue);
                    }}
                    placeholder="Select currency"
                    id="currency"
                  />
                </div>
              </div>

              {/* Dates Row - Transaction Date and Value Date aligned */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transaction_date" className="text-sm font-medium">
                    Transaction Date
                    <InfoTooltip text="The date the transaction took place (legal or accounting event)" />
                  </Label>
                  <Input
                    type="date"
                    value={formData.transaction_date || ''}
                    onChange={e => {
                      const newDate = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        transaction_date: newDate,
                        value_date: showValueDate ? prev.value_date : newDate
                      }));
                    }}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="value_date" className="text-sm font-medium">
                    Value Date
                    <InfoTooltip text="Use only if the value was exchanged on a different date (e.g., FX settlement). Otherwise, leave blank." />
                  </Label>
                  <Input
                    type="date"
                    value={showValueDate ? formData.value_date || '' : formData.transaction_date || ''}
                    onChange={e => setFormData({...formData, value_date: e.target.value})}
                    disabled={!showValueDate}
                    className={cn(
                      "w-full",
                      !showValueDate && "bg-muted cursor-not-allowed"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      id="fx_date_different"
                      checked={showValueDate}
                      onCheckedChange={(checked) => {
                        setShowValueDate(!!checked);
                        if (!checked) {
                          setFormData(prev => ({
                            ...prev,
                            value_date: prev.transaction_date
                          }));
                        }
                      }}
                    />
                    <Label 
                      htmlFor="fx_date_different" 
                      className="text-sm font-normal cursor-pointer"
                    >
                      FX settlement date is different
                    </Label>
                  </div>
                </div>
              </div>

              {/* Reference and Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transaction_reference" className="text-sm font-medium">
                    Transaction Reference
                    <InfoTooltip text="Internal grant, contract, or payment system reference" />
                  </Label>
                  <Input
                    value={formData.transaction_reference || ''}
                    onChange={e => handleFieldChange('transaction_reference', e.target.value)}
                    placeholder="Internal reference number"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={e => handleFieldChange('description', e.target.value)}
                    placeholder="Additional details about this transaction..."
                    className="min-h-[80px] resize-vertical w-full"
                  />
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Parties Involved Section */}
            <div className="space-y-4">
              <SectionHeader title="Parties Involved" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Provider Organization */}
                <div className="space-y-4 border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900">Provider Organization</h4>
                  <div className="space-y-3">
                    <OrganizationCombobox
                      organizations={organizations}
                      value={formData.provider_org_id || ''}
                      onValueChange={(v) => {
                        if (v === 'none' || v === 'clear' || v === '') {
                          setFormData({
                            ...formData, 
                            provider_org_id: '',
                            provider_org_name: '',
                            provider_org_ref: ''
                          });
                        } else {
                          const org = organizations.find(o => o.id === v);
                          setFormData({
                            ...formData, 
                            provider_org_id: v,
                            provider_org_name: org?.acronym || org?.name || '',
                          });
                        }
                      }}
                      placeholder="Select provider organization"
                      className="w-full rounded-md border px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Receiver Organization */}
                <div className="space-y-4 border rounded-lg p-4">
                  <h4 className="font-medium text-gray-900">Receiver Organization</h4>
                  <div className="space-y-3">
                    <OrganizationCombobox
                      organizations={organizations}
                      value={formData.receiver_org_id || ''}
                      onValueChange={(v) => {
                        if (v === 'none' || v === 'clear' || v === '') {
                          setFormData({
                            ...formData, 
                            receiver_org_id: '',
                            receiver_org_name: '',
                            receiver_org_ref: ''
                          });
                        } else {
                          const org = organizations.find(o => o.id === v);
                          setFormData({
                            ...formData, 
                            receiver_org_id: v,
                            receiver_org_name: org?.acronym || org?.name || '',
                            receiver_org_ref: org?.iati_org_id || ''
                          });
                        }
                      }}
                      placeholder="Select receiver organization"
                      className="w-full rounded-md border px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Funding Modality & Aid Classification Section */}
            <div className="space-y-4">
              <SectionHeader title="Funding Modality & Aid Classification" />

              {/* Aid Type and Flow Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <LabelSaveIndicator 
                    isSaving={aidTypeAutosave.isSaving}
                    isSaved={aidTypeAutosave.isSaved}
                  >
                    Aid Type
                    <InfoTooltip text="IATI aid type classification" />
                  </LabelSaveIndicator>
                  <AidTypeSelect
                    value={formData.aid_type || undefined}
                    onValueChange={v => {
                      const newValue = v || undefined;
                      setFormData({...formData, aid_type: newValue});
                      aidTypeAutosave.triggerFieldSave(newValue);
                    }}
                    placeholder="Select aid type"
                    id="aid_type"
                  />
                  {formData.aid_type && (
                    <FieldDescription>
                      {getSelectedDescription('aid', formData.aid_type)}
                    </FieldDescription>
                  )}
                </div>

                <div className="space-y-2">
                  <LabelSaveIndicator 
                    isSaving={flowTypeAutosave.isSaving}
                    isSaved={flowTypeAutosave.isSaved}
                  >
                    Flow Type
                    <InfoTooltip text="Origin and concessionality of the financial flow" />
                  </LabelSaveIndicator>
                  <FlowTypeSelect
                    value={formData.flow_type as string | undefined}
                    onValueChange={v => {
                      const newValue = v as FlowType || undefined;
                      setFormData({...formData, flow_type: newValue});
                      flowTypeAutosave.triggerFieldSave(newValue);
                    }}
                    placeholder="Select flow type"
                  />
                </div>
              </div>

              {/* Finance Type and Tied Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <LabelSaveIndicator 
                    isSaving={financeTypeAutosave.isSaving}
                    isSaved={financeTypeAutosave.isSaved}
                  >
                    Finance Type
                    <InfoTooltip text="Financial instrument used" />
                  </LabelSaveIndicator>
                  <FinanceTypeSelect
                    value={(formData.finance_type as any) as string | undefined}
                    onChange={v => {
                      const newValue = v as FinanceType || undefined;
                      setFormData({...formData, finance_type: newValue});
                      financeTypeAutosave.triggerFieldSave(newValue);
                    }}
                    placeholder="Select finance type"
                  />
                </div>

                <div className="space-y-2">
                  <LabelSaveIndicator 
                    isSaving={tiedStatusAutosave.isSaving}
                    isSaved={tiedStatusAutosave.isSaved}
                  >
                    Tied Status
                    <InfoTooltip text="Procurement restrictions on the aid" />
                  </LabelSaveIndicator>
                  <TiedStatusSelect
                    value={(formData.tied_status as any) as string | undefined}
                    onValueChange={v => {
                      const newValue = v as TiedStatus || undefined;
                      setFormData({...formData, tied_status: newValue});
                      tiedStatusAutosave.triggerFieldSave(newValue);
                    }}
                    placeholder="Select tied status"
                  />
                </div>
              </div>

              {/* Disbursement Channel */}
              <div className="space-y-2">
                <Label htmlFor="disbursement_channel" className="text-sm font-medium">
                  Disbursement Channel
                  <InfoTooltip text="How funds are disbursed" />
                </Label>
                {/* Modern popover/command UI for Disbursement Channel */}
                <Popover open={disbursementPopoverOpen} onOpenChange={setDisbursementPopoverOpen}>
                  <PopoverTrigger
                    className="w-full"
                  >
                    <Button
                      variant="outline"
                      className="w-full flex justify-between items-center"
                      aria-haspopup="listbox"
                    >
                      {formData.disbursement_channel ? (
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {formData.disbursement_channel}
                          </span>
                          <span className="font-medium">
                            {DISBURSEMENT_CHANNELS_WITH_DESC[formData.disbursement_channel]?.label}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Select disbursement channel</span>
                      )}
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[320px] max-w-xl p-0 shadow-lg border" align="start" sideOffset={4}>
                    <Command>
                      <CommandInput
                        placeholder="Search disbursement channels..."
                        value={disbursementSearch}
                        onChange={e => setDisbursementSearch(e.target.value)}
                        className="border-none focus:ring-0 focus:border-none"
                        autoFocus
                      />
                      <CommandList>
                        {Object.entries(DISBURSEMENT_CHANNELS_WITH_DESC)
                          .filter(([code, option]) => {
                            const q = disbursementSearch.toLowerCase();
                            return (
                              code.toLowerCase().includes(q) ||
                              option.label.toLowerCase().includes(q) ||
                              option.desc.toLowerCase().includes(q)
                            );
                          })
                          .map(([code, option], idx, arr) => (
                            <React.Fragment key={code}>
                              <CommandItem
                                onSelect={() => {
                                  setFormData({ ...formData, disbursement_channel: code as DisbursementChannel });
                                  setDisbursementPopoverOpen(false);
                                  setDisbursementSearch("");
                                }}
                                className="flex flex-col items-start px-4 py-3 gap-1 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                              >
                                <div className="flex items-center gap-3 w-full">
                                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded min-w-[28px] text-center">
                                    {code}
                                  </span>
                                  <span className="font-semibold text-foreground flex-1 truncate">
                                    {option.label}
                                  </span>
                                </div>
                                <div className="text-sm text-muted-foreground pl-10 leading-relaxed w-full">
                                  {option.desc}
                                </div>
                              </CommandItem>
                              {idx < arr.length - 1 && (
                                <div className="border-b border-muted mx-2" />
                              )}
                            </React.Fragment>
                          ))}
                        {Object.entries(DISBURSEMENT_CHANNELS_WITH_DESC).filter(([code, option]) => {
                          const q = disbursementSearch.toLowerCase();
                          return (
                            code.toLowerCase().includes(q) ||
                            option.label.toLowerCase().includes(q) ||
                            option.desc.toLowerCase().includes(q)
                          );
                        }).length === 0 && (
                          <div className="py-8 text-center">
                            <div className="text-sm text-muted-foreground">
                              No disbursement channels found.
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Try adjusting your search terms
                            </div>
                          </div>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {formData.disbursement_channel && (
                  <FieldDescription>
                    {getSelectedDescription('disbursement', formData.disbursement_channel)}
                  </FieldDescription>
                )}
              </div>

              {/* Humanitarian Transaction */}
              <div className="flex items-center h-full p-4 border rounded-lg bg-white">
                <Switch
                  id="is_humanitarian"
                  checked={formData.is_humanitarian}
                  onCheckedChange={checked => setFormData({ ...formData, is_humanitarian: checked })}
                />
                <Label htmlFor="is_humanitarian" className="text-sm font-normal cursor-pointer ml-3 flex items-center gap-2">
                  <Siren className="h-4 w-4 text-red-500" />
                  Humanitarian Transaction
                  <InfoTooltip text="Tick this if the transaction qualifies as humanitarian assistance under IATI or OCHA guidelines, including emergency response, disaster relief, or protection activities." />
                </Label>
              </div>
            </div>

            {/* Supporting Documents Section */}
            <Separator className="my-6" />
            <div className="space-y-4">
              <SectionHeader title="Supporting Documents" />
              <div className="text-sm text-muted-foreground mb-4">
                Upload receipts, invoices, contracts, or other evidence to support this transaction. 
                You can also add links to documents hosted elsewhere.
              </div>
              {!createdTransactionId ? (
                <div className="text-sm text-gray-500 bg-amber-50 border border-amber-200 rounded p-3 my-2">
                  You must complete the required fields before uploading documents.<br />
                  <strong>Required:</strong> Transaction Type, Date, Value, Currency, Activity ID.<br />
                  {creationError && <span className="text-red-500">{creationError}</span>}
                </div>
              ) : (
                <TransactionDocumentUpload
                  transactionId={createdTransactionId}
                  activityId={activityId}
                  documents={documents}
                  onDocumentsChange={setDocuments}
                  disabled={isSubmitting}
                  maxFiles={10}
                  maxFileSize={50}
                />
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-8 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="min-w-[100px]" disabled={isSubmitting}>
            {isEditing ? "Update" : "Add"} Transaction
          </Button>
        </DialogFooter>
        <div className="pb-8" />
      </DialogContent>
    </Dialog>
  );
} 