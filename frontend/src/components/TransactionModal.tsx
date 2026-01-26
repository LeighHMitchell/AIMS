"use client"
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Info, CheckCircle2, DollarSign, Copy, Clipboard, SearchIcon, ChevronsUpDown, Siren, Globe, ChevronDown, AlertTriangle, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";
import { 
  showTransactionSuccess, 
  showTransactionError, 
  showValidationError, 
  showAutoCreateSuccess,
  clearAllTransactionToasts,
  TRANSACTION_TOAST_IDS 
} from '@/lib/toast-manager';
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { OrganizationSearchableSelect } from "@/components/ui/organization-searchable-select";
import { OrganizationCombobox } from "@/components/ui/organization-combobox";
import { ActivityCombobox } from "@/components/ui/activity-combobox";
import { type Organization } from "@/components/ui/organization-combobox";
import { usePartners } from "@/hooks/usePartners";
import { useIATIReferenceValues } from "@/hooks/useIATIReferenceValues";
import { useUser } from "@/hooks/useUser";
import { getUserPermissions } from "@/types/user";
import { 
  TransactionSectorManager,
  TransactionAidTypeManager
} from '@/components/transaction/TransactionMultiElementManager';

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
import { IATI_FIELD_HELP } from '@/components/ActivityFieldHelpers';
import { IATI_COUNTRIES } from '@/data/iati-countries';
import { IATI_REGIONS } from '@/data/iati-regions';
import dacSectorsData from '@/data/dac-sectors.json';
import { apiFetch } from '@/lib/api-fetch';

// Helper to get full sector info from DAC sectors data
interface DacSectorInfo {
  code: string;
  name: string;
  description: string;
  category?: string;
  categoryName?: string;
}

const getDacSectorInfo = (code: string): DacSectorInfo => {
  const sectors = dacSectorsData as { [key: string]: Array<{ code: string; name: string; description: string }> };
  for (const [category, sectorList] of Object.entries(sectors)) {
    const sector = sectorList.find(s => s.code === code);
    if (sector) {
      // Extract category code and name from the category key (e.g., "110 - Education")
      const categoryMatch = category.match(/^(\d+)\s*[-–]\s*(.+)$/);
      const categoryCode = categoryMatch ? categoryMatch[1] : category.substring(0, 3);
      const categoryName = categoryMatch ? categoryMatch[2] : category;
      return { ...sector, category, categoryName, categoryCode };
    }
  }
  return { code, name: `Sector ${code}`, description: '', category: 'Unknown', categoryName: 'Unknown' };
};
import { InfoTooltipWithSaveIndicator, LabelWithInfoAndSave } from '@/components/ui/info-tooltip-with-save-indicator';
import { OrgTypeMappingModal, useOrgTypeMappingModal } from '@/components/organizations/OrgTypeMappingModal';
// Remove lodash import (not used)
// import { uniqBy } from 'lodash';

// Constants for dropdowns
const TRANSACTION_TYPE_OPTIONS: { code: string; name: string; desc: string }[] = [
  // Most commonly used transaction types first
  { code: '3', name: 'Disbursement', desc: 'Actual payment of funds to recipients' },
  { code: '2', name: 'Outgoing Commitment', desc: 'Firm obligation to provide specified funds' },
  { code: '11', name: 'Incoming Commitment', desc: 'Firm obligation received from donor' },
  { code: '4', name: 'Expenditure', desc: 'Funds spent on goods and services' },
  { code: '1', name: 'Incoming Funds', desc: 'Funds received for activity use' },
  // Other transaction types
  { code: '5', name: 'Interest Payment', desc: 'Interest paid on loans or credit' },
  { code: '6', name: 'Loan Repayment', desc: 'Principal repayment including arrears' },
  { code: '7', name: 'Reimbursement', desc: 'Covers funds already spent by recipient' },
  { code: '8', name: 'Purchase of Equity', desc: 'Funds used to purchase business equity' },
  { code: '9', name: 'Sale of Equity', desc: 'Income from equity sales' },
  { code: '10', name: 'Credit Guarantee', desc: 'Commitment to underwrite loans' },
  { code: '12', name: 'Outgoing Pledge', desc: 'Non-binding intended commitment' },
  { code: '13', name: 'Incoming Pledge', desc: 'Non-binding intended incoming commitment' },
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

interface ActivitySector {
  id?: string;
  sector_code?: string;
  sector_name?: string;
  // Alternative property names used in some contexts
  code?: string;
  name?: string;
  percentage?: number;
}

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  activityId: string;
  activityPartnerId?: string; // User-reported Activity ID from General tab
  onSubmit: (transaction: Partial<Transaction>) => void;
  defaultFinanceType?: string; // From activity settings
  defaultAidType?: string; // From activity settings
  defaultCurrency?: string; // From activity settings
  defaultTiedStatus?: string; // From activity settings
  defaultFlowType?: string; // From activity settings
  defaultDisbursementChannel?: string; // From activity settings
  defaultModality?: string;
  defaultModalityOverride?: boolean;
  isSubmitting?: boolean;
  geographyLevel?: 'activity' | 'transaction'; // Whether geography is set at activity or transaction level
  activitySectors?: ActivitySector[]; // Sectors defined at activity level
}

export default function TransactionModal({
  open,
  onOpenChange,
  transaction,
  activityId,
  activityPartnerId,
  onSubmit,
  defaultFinanceType,
  defaultAidType,
  defaultCurrency,
  defaultTiedStatus,
  defaultFlowType,
  defaultDisbursementChannel,
  defaultModality = '',
  defaultModalityOverride = false,
  isSubmitting,
  geographyLevel = 'activity',
  activitySectors = []
}: TransactionModalProps) {
  const { partners } = usePartners();
  const { data: iatiValues, loading: iatiLoading, getFieldValues, error: iatiError } = useIATIReferenceValues();
  const { user } = useUser();
  const isEditing = !!transaction;
  
  // Fallback transaction types if IATI values fail to load (IATI Standard v2.03)
  const fallbackTransactionTypes = [
    { code: '1', name: 'Incoming Funds' },
    { code: '2', name: 'Outgoing Commitment' },
    { code: '3', name: 'Disbursement' },
    { code: '4', name: 'Expenditure' },
    { code: '5', name: 'Interest Payment' },
    { code: '6', name: 'Loan Repayment' },
    { code: '7', name: 'Reimbursement' },
    { code: '8', name: 'Purchase of Equity' },
    { code: '9', name: 'Sale of Equity' },
    { code: '10', name: 'Credit Guarantee' },
    { code: '11', name: 'Incoming Commitment' },
    { code: '12', name: 'Outgoing Pledge' },
    { code: '13', name: 'Incoming Pledge' }
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
  
  // Individual collapsible states for Advanced IATI Fields sections
  const [showMultipleSectors, setShowMultipleSectors] = useState(false);
  const [showMultipleAidTypes, setShowMultipleAidTypes] = useState(false);
  const [showGeographicTargeting, setShowGeographicTargeting] = useState(false);
  
  // Sector inheritance choice: true = use activity sectors, false = specify custom
  const [useActivitySectorChoice, setUseActivitySectorChoice] = useState<boolean>(() => {
    // Default based on transaction's use_activity_sectors flag
    // If editing and transaction has custom sectors, default to custom
    if (transaction?.use_activity_sectors === false) return false;
    if (transaction?.sectors && transaction.sectors.length > 0) return false;
    // Default to inheriting from activity
    return true;
  });
  
  // Popover states for country and region selects
  const [countryPopoverOpen, setCountryPopoverOpen] = useState(false);
  const [regionPopoverOpen, setRegionPopoverOpen] = useState(false);
  
  // Document upload state
  const [documents, setDocuments] = useState<TransactionDocument[]>([]);
  
  // Add state to track if transaction is created (moved here to fix temporal dead zone)
  const [createdTransactionId, setCreatedTransactionId] = useState<string | null>(() => transaction?.id || null);

  // Load existing documents when editing or when a transaction is created
  useEffect(() => {
    const transactionId = transaction?.uuid || transaction?.id || createdTransactionId;
    if (transactionId && open) {
      const fetchDocuments = async () => {
        try {
          const response = await apiFetch(`/api/transactions/documents?transactionId=${transactionId}`);
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
  }, [transaction?.uuid, transaction?.id, createdTransactionId, open]);

  // Transform partners to organizations format for OrganizationSearchableSelect
  const organizations: Organization[] = React.useMemo(() => {
    const orgs = partners.map(partner => ({
      id: partner.id,
      name: partner.fullName || partner.name || '',
      acronym: partner.acronym,
      iati_org_id: partner.iatiOrgId,
      iati_identifier: partner.iatiOrgId,
      type: partner.type,
      Organisation_Type_Code: partner.type,
      Organisation_Type_Name: partner.typeName,
      country: partner.countryRepresented,
      logo: partner.logo // Include logo field for displaying organization logos
    }));
    
    return orgs;
  }, [partners]);

  // Org type mapping modal for handling legacy organization type codes
  const orgTypeMappingModal = useOrgTypeMappingModal();

  // Handler to update organization type via API
  const handleOrgTypeUpdate = async (orgId: string, newTypeCode: string) => {
    const response = await apiFetch(`/api/organizations/${orgId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Organisation_Type_Code: newTypeCode })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update organization type');
    }
    
    // Refresh partners to get updated organization data
    // Note: usePartners hook should handle refetching
  };

  // Form state with all IATI fields - using lazy initializer with safe defaults
  const [formData, setFormData] = useState<Partial<Transaction>>(() => {
    const safeDefaultCurrency = defaultCurrency || 'USD';
    const safeDefaultFlowType = defaultFlowType || undefined;
    const safeDefaultFinanceType = defaultFinanceType || undefined;
    const safeDefaultAidType = defaultAidType || undefined;
    const safeDefaultTiedStatus = defaultTiedStatus || undefined;
    
    return {
      // Core fields
      transaction_type: transaction?.transaction_type || '3',
      transaction_date: transaction?.transaction_date || format(new Date(), "yyyy-MM-dd"),
      value: transaction?.value || 0,
      currency: transaction?.currency || safeDefaultCurrency,
      status: transaction?.status || 'draft',
      
      // Optional core fields
      transaction_reference: transaction?.transaction_reference || '',
      value_date: transaction?.value_date || '',
      description: transaction?.description || '',
      
      // Provider organization - fallback to resolving by IATI ref if UUID is missing
      provider_org_id: transaction?.provider_org_id 
        || organizations.find(o => o.iati_org_id === transaction?.provider_org_ref)?.id 
        || undefined,
      provider_org_type: transaction?.provider_org_type || undefined,
      provider_org_ref: transaction?.provider_org_ref || '',
      provider_org_name: transaction?.provider_org_name || '',
      provider_org_activity_id: transaction?.provider_org_activity_id || '',
      provider_activity_uuid: transaction?.provider_activity_uuid || undefined,
      
      // Receiver organization - fallback to resolving by IATI ref if UUID is missing
      receiver_org_id: transaction?.receiver_org_id 
        || organizations.find(o => o.iati_org_id === transaction?.receiver_org_ref)?.id 
        || undefined,
      receiver_org_type: transaction?.receiver_org_type || undefined,
      receiver_org_ref: transaction?.receiver_org_ref || '',
      receiver_org_name: transaction?.receiver_org_name || '',
      receiver_org_activity_id: transaction?.receiver_org_activity_id || '',
      receiver_activity_uuid: transaction?.receiver_activity_uuid || undefined,
      
      // Classifications - Use effective values (which include inherited) for display, fall back to activity defaults
      disbursement_channel: transaction?.disbursement_channel || (defaultDisbursementChannel as DisbursementChannel) || undefined,
      flow_type: transaction?.effective_flow_type || transaction?.flow_type || (safeDefaultFlowType as FlowType) || undefined,
      finance_type: transaction?.effective_finance_type || transaction?.finance_type || (safeDefaultFinanceType as FinanceType) || undefined,
      aid_type: transaction?.effective_aid_type || transaction?.aid_type || safeDefaultAidType || undefined,
      tied_status: transaction?.effective_tied_status || transaction?.tied_status || (safeDefaultTiedStatus as TiedStatus) || undefined,
      
      // Sector & Geography (single values - IATI allows ONE country OR region per transaction)
      sector_code: transaction?.sector_code || '',
      sector_vocabulary: transaction?.sector_vocabulary || undefined,
      recipient_country_code: transaction?.recipient_country_code || '',
      recipient_region_code: transaction?.recipient_region_code || '',
      recipient_region_vocab: transaction?.recipient_region_vocab || undefined,
      
      // Multiple element arrays (sectors and aid types only - countries/regions are single value per IATI)
      sectors: transaction?.sectors || [],
      aid_types: transaction?.aid_types || [],
      use_activity_sectors: transaction?.use_activity_sectors ?? true, // Default to inheriting from activity
      
      // Other
      is_humanitarian: transaction?.is_humanitarian || false,
    };
  });

  // Initialize showValueDate based on whether value_date exists and is different
  useEffect(() => {
    if (transaction?.value_date && transaction.value_date !== transaction.transaction_date) {
      setShowValueDate(true);
    }
  }, [transaction]);

  // Keep Advanced IATI Fields collapsed by default
  // Auto-open logic removed - user preference is to keep it collapsed
  useEffect(() => {
    // Reset all collapsible sections to collapsed when modal opens
    if (open) {
      setShowMultipleSectors(false);
      setShowMultipleAidTypes(false);
      setShowGeographicTargeting(false);
      
      // Reset sector choice based on transaction data
      if (transaction?.use_activity_sectors === false) {
        setUseActivitySectorChoice(false);
      } else if (transaction?.sectors && transaction.sectors.length > 0) {
        setUseActivitySectorChoice(false);
      } else {
        setUseActivitySectorChoice(true);
      }
    }
  }, [open, transaction]);

  // Reset submission flag when modal opens/closes
  useEffect(() => {
    if (!open) {
      isSubmittingRef.current = false;
    }
  }, [open]);

  // Count items for each Advanced IATI Fields section
  // Transaction level: only ONE country OR ONE region allowed per IATI standard
  const hasGeographicTargeting = !!(formData.recipient_country_code || formData.recipient_region_code);
  
  // State for selected geography type (separate from computed value)
  const [selectedGeoType, setSelectedGeoType] = useState<'none' | 'country' | 'region'>(() => {
    if (formData.recipient_country_code) return 'country';
    if (formData.recipient_region_code) return 'region';
    return 'none';
  });
  
  // Update selectedGeoType when formData changes (e.g., when editing existing transaction)
  useEffect(() => {
    if (formData.recipient_country_code) {
      setSelectedGeoType('country');
    } else if (formData.recipient_region_code) {
      setSelectedGeoType('region');
    }
  }, [formData.recipient_country_code, formData.recipient_region_code]);
  
  const multipleSectorsCount = useMemo(() => {
    return formData.sectors?.length || 0;
  }, [formData.sectors]);
  
  const multipleAidTypesCount = useMemo(() => {
    return formData.aid_types?.length || 0;
  }, [formData.aid_types]);
  

  // Autosave hooks for field-level saving
  const transactionId = transaction?.uuid || transaction?.id || '';
  const currencyAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'currency', userId: user?.id });
  const financeTypeAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'finance_type', userId: user?.id });
  const aidTypeAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'aid_type', userId: user?.id });
  const tiedStatusAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'tied_status', userId: user?.id });
  const flowTypeAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'flow_type', userId: user?.id });
  
  // Additional autosave hooks for other fields
  const descriptionAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'description', userId: user?.id });
  const disbursementChannelAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'disbursement_channel', userId: user?.id });
  const valueAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'value', userId: user?.id });
  const transactionDateAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'transaction_date', userId: user?.id });
  const transactionTypeAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'transaction_type', userId: user?.id });
  const transactionReferenceAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'transaction_reference', userId: user?.id });
  const valueDateAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'value_date', userId: user?.id });
  const providerOrgAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'provider_org_id', userId: user?.id });
  const receiverOrgAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'receiver_org_id', userId: user?.id });
  const humanitarianAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'is_humanitarian', userId: user?.id });
  
  // NEW: Autosave hooks for IATI fields
  const providerActivityAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'provider_org_activity_id', userId: user?.id });
  const receiverActivityAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'receiver_org_activity_id', userId: user?.id });
  const recipientCountryAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'recipient_country_code', userId: user?.id });
  const recipientRegionAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'recipient_region_code', userId: user?.id });
  const useActivitySectorsAutosave = useTransactionFieldAutosave({ transactionId, fieldName: 'use_activity_sectors', userId: user?.id });
  
  // Handler for switching sector source choice
  const handleSectorChoiceChange = (useActivitySectors: boolean) => {
    setUseActivitySectorChoice(useActivitySectors);
    
    if (useActivitySectors) {
      // Switching to activity sectors - clear custom sectors
      setFormData({ ...formData, sectors: [], use_activity_sectors: true });
    } else {
      // Switching to custom sectors - pre-populate from activity sectors
      const prePopulatedSectors = activitySectors.map(s => ({
        code: s.code || s.sector_code || '',
        vocabulary: '1', // Default to DAC 5-digit
        percentage: s.percentage || undefined,
        narrative: s.name || s.sector_name || undefined
      }));
      setFormData({ ...formData, sectors: prePopulatedSectors, use_activity_sectors: false });
    }
    
    // Autosave the choice if editing an existing transaction
    if (transactionId) {
      useActivitySectorsAutosave.saveField(useActivitySectors);
    }
  };

  // Helper function to check if field should show as "saved" due to default value
  const hasDefaultValue = (fieldName: string, currentValue: any) => {
    if (!currentValue) return false;
    
    switch (fieldName) {
      case 'currency':
        return currentValue === defaultCurrency;
      case 'finance_type':
        return currentValue === defaultFinanceType;
      case 'aid_type':
        return currentValue === defaultAidType;
      case 'tied_status':
        return currentValue === defaultTiedStatus;
      case 'flow_type':
        return currentValue === defaultFlowType;
      default:
        return false;
    }
  };





  // Compute classification when relevant fields change
  useEffect(() => {
    if (formData) {
      const classification = classifyFinance(formData.flow_type, formData.aid_type, formData.finance_type);
      setComputedClassification(classification);
    }
  }, [formData?.flow_type, formData?.aid_type, formData?.finance_type]);

  // State to track reference generation
  const [isGeneratingReference, setIsGeneratingReference] = useState(false);

  // Function to generate transaction reference immediately
  const generateTransactionReference = async () => {
    setIsGeneratingReference(true);
    try {
      console.log('[TransactionModal] Generating transaction reference for activity:', activityId);
      
      // Generate a highly unique reference using multiple factors
      const timestamp = Date.now();
      const microseconds = performance.now().toString().replace('.', '').slice(-6);
      const random = Math.floor(Math.random() * 100000);
      const userSuffix = user?.id ? user.id.slice(-4) : '0000';
      
      const reference = `${activityPartnerId || 'TXN'}-TRANS-${timestamp}-${microseconds}-${random}-${userSuffix}`;
      
      console.log('[TransactionModal] Generated reference:', reference);
      return reference;
    } catch (error) {
      console.error('[TransactionModal] Error generating transaction reference:', error);
      // Fallback: generate with maximum uniqueness
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000000);
      const fallback = Math.floor(Math.random() * 1000000);
      return `${activityPartnerId || 'TXN'}-TRANS-${timestamp}-${random}-${fallback}`;
    } finally {
      setIsGeneratingReference(false);
    }
  };

  // Update form data when transaction prop changes OR when defaults change
  useEffect(() => {
    console.log('[TransactionModal] Form data update triggered:', {
      isEditing,
      transaction: transaction?.id,
      defaultFinanceType,
      defaultAidType,
      defaultCurrency,
      defaultTiedStatus,
      defaultFlowType,
      // Debug: show effective values from transaction
      effective_finance_type: transaction?.effective_finance_type,
      effective_flow_type: transaction?.effective_flow_type,
      effective_aid_type: transaction?.effective_aid_type,
      effective_tied_status: transaction?.effective_tied_status,
      // Debug: show raw transaction values
      raw_finance_type: transaction?.finance_type,
      raw_flow_type: transaction?.flow_type,
      raw_aid_type: transaction?.aid_type,
      raw_tied_status: transaction?.tied_status
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
        
        // Provider organization - fallback to resolving by IATI ref if UUID is missing
        provider_org_id: transaction.provider_org_id 
          || organizations.find(o => o.iati_org_id === transaction.provider_org_ref)?.id 
          || undefined,
        provider_org_type: transaction.provider_org_type || undefined,
        provider_org_ref: transaction.provider_org_ref || '',
        provider_org_name: transaction.provider_org_name || '',
        provider_org_activity_id: transaction.provider_org_activity_id || '',
        provider_activity_uuid: transaction.provider_activity_uuid || undefined,
        
        // Receiver organization - fallback to resolving by IATI ref if UUID is missing
        receiver_org_id: transaction.receiver_org_id 
          || organizations.find(o => o.iati_org_id === transaction.receiver_org_ref)?.id 
          || undefined,
        receiver_org_type: transaction.receiver_org_type || undefined,
        receiver_org_ref: transaction.receiver_org_ref || '',
        receiver_org_name: transaction.receiver_org_name || '',
        receiver_org_activity_id: transaction.receiver_org_activity_id || '',
        receiver_activity_uuid: transaction.receiver_activity_uuid || undefined,
        
        // Classifications - use effective values (which include inherited), fall back to activity defaults
        disbursement_channel: transaction.disbursement_channel || undefined,
        flow_type: transaction.effective_flow_type || transaction.flow_type || (defaultFlowType as FlowType) || undefined,
        finance_type: transaction.effective_finance_type || transaction.finance_type || (defaultFinanceType as FinanceType) || undefined,
        aid_type: transaction.effective_aid_type || transaction.aid_type || defaultAidType || undefined,
        tied_status: transaction.effective_tied_status || transaction.tied_status || (defaultTiedStatus as TiedStatus) || undefined,
        
        // Sector & Geography (single values)
        sector_code: transaction.sector_code || '',
        sector_vocabulary: transaction.sector_vocabulary || undefined,
        recipient_country_code: transaction.recipient_country_code || '',
        recipient_region_code: transaction.recipient_region_code || '',
        recipient_region_vocab: transaction.recipient_region_vocab || undefined,
        
        // Multiple element arrays (sectors and aid types only)
        sectors: transaction.sectors || [],
        aid_types: transaction.aid_types || [],
        use_activity_sectors: transaction.use_activity_sectors ?? true,
        
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
        defaultFlowType,
        defaultDisbursementChannel
      });
      
      setFormData({
        transaction_type: '3',
        transaction_date: format(new Date(), "yyyy-MM-dd"),
        value: 0,
        currency: defaultCurrency || 'USD',
        status: 'draft',
        transaction_reference: '', // Leave blank for backend auto-generation
        value_date: '',
        description: '',
        provider_org_id: user?.organizationId || undefined,
        provider_org_type: undefined,
        provider_org_ref: '',
        provider_org_name: user?.organizationId ? (organizations.find(o => o.id === user.organizationId)?.acronym || organizations.find(o => o.id === user.organizationId)?.name || '') : '',
        provider_org_activity_id: '',
        provider_activity_uuid: undefined,
        receiver_org_id: undefined,
        receiver_org_type: undefined,
        receiver_org_ref: '',
        receiver_org_name: '',
        receiver_org_activity_id: '',
        receiver_activity_uuid: undefined,
        disbursement_channel: (defaultDisbursementChannel as DisbursementChannel) || undefined,
        flow_type: (defaultFlowType as FlowType) || undefined,
        finance_type: (defaultFinanceType as FinanceType) || undefined,
        aid_type: defaultAidType || undefined,
        tied_status: (defaultTiedStatus as TiedStatus) || undefined,
        sector_code: '',
        sector_vocabulary: undefined,
        recipient_country_code: '',
        recipient_region_code: '',
        recipient_region_vocab: undefined,
        sectors: [],
        aid_types: [],
        use_activity_sectors: true, // Default to inheriting from activity
        is_humanitarian: false,
      });
      setShowValueDate(false);
      setUseActivitySectorChoice(true); // Reset to inherit from activity
    }
  }, [transaction, defaultFinanceType, defaultAidType, defaultCurrency, defaultTiedStatus, defaultFlowType, organizations, user, open, activityId, activityPartnerId]);

  // Add missing state for Disbursement Channel popover
  const [disbursementPopoverOpen, setDisbursementPopoverOpen] = useState(false);
  const [disbursementSearch, setDisbursementSearch] = useState('');

  const validateTransaction = (data: Partial<Transaction>): string | null => {
    if (!data.transaction_type) return 'Transaction type is required.';
    if (!data.transaction_date) return 'Transaction date is required.';
    if (!data.value || isNaN(Number(data.value)) || Number(data.value) <= 0) return 'Transaction value must be greater than 0.';
    if (!data.currency) return 'Currency is required.';
    if (!data.provider_org_id) return 'Provider organization is required.';
    if (!data.receiver_org_id) return 'Receiver organization is required.';
    // Remove frontend duplicate check - let the backend handle this with proper database validation
    return null;
  };

  const getTransactionPayload = (formData: Partial<Transaction>) => {
    // List of allowed fields in the DB schema
    const allowed = [
      'id', 'uuid', 'activity_id', 'transaction_type', 'transaction_date', 'value', 'currency', 'status',
      'transaction_reference', 'value_date', 'description',
      'provider_org_id', 'provider_org_type', 'provider_org_ref', 'provider_org_name', 'provider_org_activity_id', 'provider_activity_uuid',
      'receiver_org_id', 'receiver_org_type', 'receiver_org_ref', 'receiver_org_name', 'receiver_org_activity_id', 'receiver_activity_uuid',
      'disbursement_channel', 'flow_type', 'finance_type', 'aid_type', 'tied_status',
      'sector_code', 'sector_vocabulary', 'recipient_country_code', 'recipient_region_code', 'recipient_region_vocab',
      'sectors', 'aid_types', 'use_activity_sectors',
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
    // Prevent concurrent submissions using ref to avoid race conditions
    if (isSubmittingRef.current || isSubmitting || isInternallySubmitting) {
      console.log('[TransactionModal] Submission already in progress, ignoring duplicate call');
      return;
    }

    // Cancel any pending autosave to prevent duplicate creation
    if (createTransactionTimeoutRef.current) {
      clearTimeout(createTransactionTimeoutRef.current);
      createTransactionTimeoutRef.current = null;
    }

    // Wait for any in-progress autosave creation to complete
    if (isCreatingRef.current) {
      console.log('[TransactionModal] Waiting for autosave to complete...');
      // Wait a bit for the autosave to finish
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    // Mark as submitting
    isSubmittingRef.current = true;

    const submissionData = getTransactionPayload({
      ...formData,
      activity_id: activityId,
      provider_org_name: organizations.find(o => o.id === formData.provider_org_id)?.acronym || organizations.find(o => o.id === formData.provider_org_id)?.name || '',
      receiver_org_name: organizations.find(o => o.id === formData.receiver_org_id)?.acronym || organizations.find(o => o.id === formData.receiver_org_id)?.name || '',
      financing_classification: isClassificationOverridden ? manualClassification : computedClassification
    });

    // Debug: Log what's being submitted for sectors and aid_types
    console.log('[TransactionModal] Submission payload debug:', {
      sectors: submissionData.sectors,
      aid_types: submissionData.aid_types,
      use_activity_sectors: submissionData.use_activity_sectors,
      formData_sectors: formData.sectors,
      formData_aid_types: formData.aid_types,
      formData_use_activity_sectors: formData.use_activity_sectors
    });

    const validationError = validateTransaction(submissionData);
    // Let the backend handle duplicate reference validation
    if (validationError) {
      const missingFields = getMissingRequiredFields(formData);
      if (missingFields.length > 0) {
        showValidationError(`Missing required fields: ${missingFields.join(', ')}`);
      } else {
        showValidationError(validationError);
      }
      // Reset the flag before returning
      isSubmittingRef.current = false;
      return;
    }
    try {
      let response;
      
      console.log('[TransactionModal] handleSubmit - Transaction state:', {
        createdTransactionId,
        isEditing,
        transactionUuid: transaction?.uuid,
        transactionId: transaction?.id,
        transactionReference: submissionData.transaction_reference
      });
      
      // If we have an autosaved transaction, update it instead of creating a new one
      if (createdTransactionId) {
        console.log('[TransactionModal] Updating autosaved transaction:', createdTransactionId);
        response = await apiFetch('/api/transactions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...submissionData, id: createdTransactionId })
        });
      } else if (isEditing && (transaction?.uuid || transaction?.id)) {
        console.log('[TransactionModal] Updating existing transaction:', transaction.uuid || transaction.id);
        // Update existing transaction (edit mode)
        response = await apiFetch('/api/transactions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...submissionData, id: transaction.uuid || transaction.id })
        });
      } else {
        console.log('[TransactionModal] Creating new transaction');
        // Create new transaction
        response = await apiFetch('/api/transactions', {
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
      const saved = await response.json();
      setCreatedTransactionId(saved.id || saved.uuid);
      
      // Update form data with the auto-generated transaction reference
      if (saved.transaction_reference && (!formData.transaction_reference || formData.transaction_reference === '')) {
        setFormData(prev => ({ 
          ...prev, 
          transaction_reference: saved.transaction_reference 
        }));
      }
      
      showTransactionSuccess((isEditing || createdTransactionId) ? 'Transaction updated successfully' : 'Transaction added successfully');
      
      // Call onSubmit callback to notify parent component
      if (onSubmit) {
        onSubmit(saved);
      }
      
      onOpenChange(false);
    } catch (e: any) {
      showTransactionError(e.message || 'Failed to save transaction');
    } finally {
      // Always reset the submission flag
      isSubmittingRef.current = false;
    }
  };

  // InfoTooltip component replaced with InfoTooltipWithSaveIndicator for most fields
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

  // Add missing states for isInternallySubmitting and validation toasts
  const [isInternallySubmitting, setIsInternallySubmitting] = useState(false);

  // Dropdown coordination - track which dropdown is currently open
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isCheckingProviderActivity, setIsCheckingProviderActivity] = useState(false);
  const [isCheckingReceiverActivity, setIsCheckingReceiverActivity] = useState(false);

  // Helper functions for number formatting
  const formatNumberWithCommas = (num: number | string, includeDecimals: boolean = true): string => {
    if (num === 0 || num === '' || num === null || num === undefined) return '';
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (includeDecimals) {
      return numValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } else {
      // Format without decimals for typing
      const [integerPart, decimalPart] = String(numValue).split('.');
      const formattedInteger = Number(integerPart).toLocaleString('en-US');
      return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
    }
  };

  const parseNumberFromFormatted = (formattedStr: string): number => {
    if (!formattedStr || formattedStr === '') return 0;
    // Remove commas and convert to number
    const cleanStr = formattedStr.replace(/,/g, '');
    return cleanStr === '' ? 0 : Number(cleanStr);
  };

  // Track if the value field is focused to avoid formatting while typing
  const [isValueFocused, setIsValueFocused] = useState(false);

  // Use ref to track submission state to prevent race conditions
  const isSubmittingRef = useRef(false);

  // Add missing imports and components needed
  const LabelSaveIndicator = ({ children, isSaving, isSaved }: { children: React.ReactNode; isSaving?: boolean; isSaved?: boolean }) => (
    <Label className="text-sm font-medium flex items-center gap-2">
      {children}
      {isSaving && <span className="text-xs text-blue-500">(saving...)</span>}
      {isSaved && <CheckCircle2 className="h-4 w-4 text-green-500" />}
    </Label>
  );

  // Removed local component overrides - using proper imported dropdown components

  const CopyField = ({ label, value, placeholder }: any) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Input value={value} placeholder={placeholder} readOnly />
    </div>
  );



  // Add missing handler for internal submission
  const handleInternalSubmit = async () => {
    setIsInternallySubmitting(true);
    try {
      await handleSubmit();
    } finally {
      setIsInternallySubmitting(false);
    }
  };

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
      'C01': { label: 'Project-type interventions', desc: '' },
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

  // Debounced timeout ref for create transaction
  const createTransactionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Debounced autosave for creating transaction - WITH REQUEST DEDUPLICATION
  const debouncedCreateTransaction = React.useCallback(async (data: Partial<Transaction>) => {
    // Clear any existing timeout
    if (createTransactionTimeoutRef.current) {
      clearTimeout(createTransactionTimeoutRef.current);
    }
    
    // Set new timeout
    createTransactionTimeoutRef.current = setTimeout(async () => {
      // Prevent concurrent requests
      if (isCreatingRef.current) {
        console.log('[TransactionModal] Skipping concurrent autosave request');
        return;
      }
      
      if (!hasAllRequiredFields(data)) {
        const missingFields = getMissingRequiredFields(data);
        showValidationError(`Missing required fields: ${missingFields.join(', ')}`);
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
        const response = await apiFetch('/api/transactions', {
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
        
        // Update form data with the auto-generated transaction reference
        if (saved.transaction_reference) {
          setFormData(prev => ({ 
            ...prev, 
            transaction_reference: saved.transaction_reference 
          }));
        }
        
        showAutoCreateSuccess('Transaction saved! You can now upload documents.');
        
        // Save any pending fields (with same abort controller)
        if (Object.keys(pendingFields).length > 0) {
          await apiFetch('/api/transactions', {
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
  }, [activityId, pendingFields]);

  // Cleanup on unmount to prevent crashes
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (createTransactionTimeoutRef.current) {
        clearTimeout(createTransactionTimeoutRef.current);
      }
      isCreatingRef.current = false;
    };
  }, []);

  // DISABLED: Auto-create transaction when required fields are filled
  // This was causing duplicate transactions. Users should explicitly click "Add Transaction" to save.
  // useEffect(() => {
  //   if (!isEditing && !createdTransactionId && hasAllRequiredFields(formData) && !isSubmittingRef.current && !isInternallySubmitting) {
  //     debouncedCreateTransaction(formData);
  //   }
  // }, [formData.transaction_type, formData.transaction_date, formData.value, formData.currency, activityId, isEditing, isInternallySubmitting]);

  // Clear toasts when modal closes
  useEffect(() => {
    if (!open) {
      clearAllTransactionToasts();
    }
  }, [open]);

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
    } else if (field === 'description') {
      descriptionAutosave.triggerFieldSave(value);
    } else if (field === 'disbursement_channel') {
      disbursementChannelAutosave.triggerFieldSave(value);
    } else if (field === 'transaction_reference') {
      transactionReferenceAutosave.triggerFieldSave(value);
    }
    
    if (!createdTransactionId && !REQUIRED_FIELDS.includes(field)) {
      setPendingFields(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-8 py-5 border-b flex-shrink-0">
          <DialogTitle className="text-xl">
            {isEditing ? "Edit Transaction" : "Add New Transaction"}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="px-8 py-6 space-y-8">
            {/* Transaction Details Section */}
            <div className="space-y-4">
              <SectionHeader title="Transaction Details" />

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
                  <LabelWithInfoAndSave 
                    helpText="IATI transaction type code, name, and description."
                    isSaving={transactionTypeAutosave.isSaving}
                    isSaved={transactionTypeAutosave.isSaved}
                    hasValue={!!formData.transaction_type}
                  >
                    Transaction Type
                  </LabelWithInfoAndSave>
                  <Popover open={transactionTypePopoverOpen} onOpenChange={setTransactionTypePopoverOpen}>
                    <PopoverTrigger asChild className="w-full">
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
                                  transactionTypeAutosave.triggerFieldSave(opt.code);
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">
                    Validation Status
                    <InfoTooltip text="Indicates whether this transaction has been reviewed and validated by an authorized user" />
                  </Label>
                  {user && (user.role === 'super_user' || user.role === 'gov_partner_tier_1' || user.role === 'gov_partner_tier_2') ? (
                    // Validation toggle for users with permission
                    <div className="flex items-center justify-between h-12 w-full rounded-md border border-input bg-background px-4 py-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="validated"
                          checked={formData.status === 'actual'}
                          onCheckedChange={(checked) => {
                            setFormData({
                              ...formData,
                              status: checked ? 'actual' : 'draft'
                            });
                          }}
                          className="h-5 w-5"
                        />
                        <div className="flex flex-col">
                          <Label htmlFor="validated" className="text-sm font-medium cursor-pointer">
                            Mark as Validated
                            <InfoTooltip text="Check this box to mark the transaction as validated and approved" />
                          </Label>
                        </div>
                      </div>
                      <div className={`text-sm font-medium px-2 py-1 rounded-md ${
                        formData.status === 'actual' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {formData.status === 'actual' ? 'Validated' : 'Unvalidated'}
                      </div>
                    </div>
                  ) : (
                    // Read-only status display for users without permission
                    <div className="flex h-12 w-full items-center justify-between rounded-md border border-input bg-gray-50 px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-500">
                          {formData.status === 'actual' ? 'Validated Transaction' : 'Pending Validation'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Transaction is pending validation by relevant government focal points
                        </span>
                      </div>
                      <div className={`text-sm font-medium px-2 py-1 rounded-md ${
                        formData.status === 'actual' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {formData.status === 'actual' ? 'Validated' : 'Pending'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Value and Currency Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <LabelWithInfoAndSave 
                    helpText="The monetary amount of this transaction in the specified currency"
                    isSaving={valueAutosave.isSaving}
                    isSaved={valueAutosave.isSaved}
                    hasValue={!!formData.value && formData.value > 0}
                  >
                    Transaction Value
                  </LabelWithInfoAndSave>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={
                      isValueFocused 
                        ? (formData.value === 0 ? '' : formatNumberWithCommas(formData.value, false)) // Show commas but no decimals while typing
                        : formatNumberWithCommas(formData.value || 0, true)  // Show commas and decimals when not focused
                    }
                    onFocus={() => setIsValueFocused(true)}
                    onChange={e => {
                      const inputValue = e.target.value;
                      // Allow empty string, numbers, decimal point, and commas
                      if (inputValue === '' || /^[\d,]*\.?\d*$/.test(inputValue)) {
                        const numericValue = parseNumberFromFormatted(inputValue);
                        setFormData({...formData, value: numericValue});
                        valueAutosave.triggerFieldSave(numericValue);
                      }
                    }}
                    onBlur={e => {
                      setIsValueFocused(false);
                      // Ensure proper formatting on blur
                      const inputValue = e.target.value;
                      if (inputValue === '') {
                        setFormData({...formData, value: 0});
                      } else {
                        // Parse the number to ensure it's stored correctly
                        const numericValue = parseNumberFromFormatted(inputValue);
                        setFormData({...formData, value: numericValue});
                      }
                    }}
                    placeholder="0.00"
                    className="w-full text-left"
                  />
                </div>

                <div className="space-y-2">
                  <LabelWithInfoAndSave 
                    helpText={IATI_FIELD_HELP.currency}
                    isSaving={currencyAutosave.isSaving}
                    isSaved={currencyAutosave.isSaved || hasDefaultValue('currency', formData.currency)}
                    hasValue={!!formData.currency}
                  >
                    Currency
                  </LabelWithInfoAndSave>
                  <CurrencySelector
                    value={formData.currency || undefined}
                    onValueChange={(v: string | null) => {
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
                  <div className="flex items-center min-h-[24px]">
                    <LabelWithInfoAndSave 
                      helpText="The date the transaction took place (legal or accounting event)"
                      isSaving={transactionDateAutosave.isSaving}
                      isSaved={transactionDateAutosave.isSaved}
                      hasValue={!!formData.transaction_date}
                    >
                      Transaction Date
                    </LabelWithInfoAndSave>
                  </div>
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
                      transactionDateAutosave.triggerFieldSave(newDate);
                    }}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between min-h-[24px]">
                    <LabelWithInfoAndSave 
                      helpText="Use only if the value was exchanged on a different date (e.g., FX settlement). Otherwise, leave blank."
                      isSaving={valueDateAutosave.isSaving}
                      isSaved={valueDateAutosave.isSaved}
                      hasValue={!!formData.value_date}
                      className="text-sm font-medium"
                    >
                      Value Date
                    </LabelWithInfoAndSave>
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
                  <Input
                    type="date"
                    value={showValueDate ? formData.value_date || '' : formData.transaction_date || ''}
                    onChange={e => {
                      const newValue = e.target.value;
                      setFormData({...formData, value_date: newValue});
                      valueDateAutosave.triggerFieldSave(newValue);
                    }}
                    disabled={!showValueDate}
                    className={cn(
                      "w-full",
                      !showValueDate && "bg-muted cursor-not-allowed",
                      showValueDate && "text-black"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Parties Involved Section */}
            <div className="space-y-4">
              <SectionHeader title="Parties Involved" />
              
              {/* Provider Organization */}
              <div className="space-y-2">
                <LabelWithInfoAndSave
                  helpText="The organization providing or disbursing the funds for this transaction"
                  isSaving={providerOrgAutosave.isSaving}
                  isSaved={providerOrgAutosave.isSaved}
                  hasValue={!!formData.provider_org_id}
                >
                  Provider Organization
                </LabelWithInfoAndSave>
                <OrganizationCombobox
                  value={formData.provider_org_id || ''}
                  onValueChange={(orgId) => {
                    const org = organizations.find(o => o.id === orgId);
                    if (org) {
                      setFormData({
                        ...formData,
                        provider_org_id: orgId,
                        provider_org_name: org?.acronym || org?.name || '',
                        provider_org_ref: org?.iati_identifier || org?.iati_org_id || ''
                      });
                      providerOrgAutosave.triggerFieldSave(orgId);
                    } else {
                      setFormData({
                        ...formData,
                        provider_org_id: '',
                        provider_org_name: '',
                        provider_org_ref: ''
                      });
                      providerOrgAutosave.triggerFieldSave('');
                    }
                  }}
                  placeholder="Search for provider organization..."
                  organizations={organizations}
                  fallbackRef={formData.provider_org_ref}
                  onLegacyTypeDetected={orgTypeMappingModal.openModal}
                  open={openDropdown === 'provider-org'}
                  onOpenChange={(isOpen) => setOpenDropdown(isOpen ? 'provider-org' : null)}
                />
              </div>

              {/* Provider Organization Activity ID */}
              <div className="space-y-2">
                <LabelWithInfoAndSave 
                  helpText="Link to the IATI activity of the provider organization (optional)"
                  isSaving={providerActivityAutosave.isSaving}
                  isSaved={providerActivityAutosave.isSaved}
                  hasValue={!!formData.provider_org_activity_id || !!formData.provider_activity_uuid}
                >
                  Provider Activity
                </LabelWithInfoAndSave>
                
                {/* Show warning UI if IATI reference exists but not linked to database */}
                {formData.provider_org_activity_id && !formData.provider_activity_uuid ? (
                  <div className="space-y-2">
                    {/* IATI Reference Display with Warning */}
                    <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-amber-800 truncate">
                            {formData.provider_org_activity_id}
                          </div>
                          <div className="text-xs text-amber-600">
                            IATI reference - not linked to database
                          </div>
                        </div>
                      </div>
                      
                      {/* Check & Link Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-amber-700 border-amber-300 hover:bg-amber-100 ml-2 flex-shrink-0"
                        onClick={async () => {
                          setIsCheckingProviderActivity(true);
                          try {
                            const response = await apiFetch(`/api/activities?iati_identifier=${encodeURIComponent(formData.provider_org_activity_id || '')}`
                            );
                            if (response.ok) {
                              const activities = await response.json();
                              const matchedActivity = activities.find(
                                (a: any) => a.iati_identifier === formData.provider_org_activity_id
                              );
                              
                              if (matchedActivity) {
                                // Save to database using activity-specific endpoint
                                // Send current form data with updated UUID to avoid null constraint issues
                                const updatePayload = {
                                  ...formData,
                                  provider_activity_uuid: matchedActivity.id
                                };
                                const updateResponse = await apiFetch(`/api/activities/${activityId}/transactions/${transactionId}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(updatePayload)
                                });
                                
                                if (updateResponse.ok) {
                                  // Update local state
                                  setFormData({
                                    ...formData, 
                                    provider_activity_uuid: matchedActivity.id
                                  });
                                  
                                  toast.success(`Linked to activity: ${matchedActivity.title_narrative || matchedActivity.title || 'Untitled'}`);
                                  providerActivityAutosave.triggerFieldSave(matchedActivity.id);
                                } else {
                                  const errorData = await updateResponse.json().catch(() => ({}));
                                  console.error('Failed to save activity link:', errorData);
                                  toast.error('Failed to save activity link', {
                                    description: errorData.error || 'Please try again'
                                  });
                                }
                              } else {
                                toast.info('Activity not found in database', {
                                  description: 'The referenced activity may not be imported yet'
                                });
                              }
                            } else {
                              toast.error('Failed to check for activity');
                            }
                          } catch (error) {
                            console.error('Error checking for activity:', error);
                            toast.error('Failed to check for activity');
                          } finally {
                            setIsCheckingProviderActivity(false);
                          }
                        }}
                        disabled={isSubmitting || isCheckingProviderActivity}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${isCheckingProviderActivity ? 'animate-spin' : ''}`} />
                        {isCheckingProviderActivity ? 'Checking...' : 'Check & Link'}
                      </Button>
                    </div>
                    
                    {/* Clear Reference Button */}
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm" 
                      className="text-gray-500 hover:text-gray-700 w-full"
                      onClick={() => {
                        setFormData({...formData, provider_org_activity_id: ''});
                        providerActivityAutosave.triggerFieldSave('');
                      }}
                      disabled={isSubmitting}
                    >
                      Clear Reference
                    </Button>
                  </div>
                ) : (
                  /* Normal ActivityCombobox when linked or no reference */
                  <ActivityCombobox
                    value={formData.provider_activity_uuid || ''}
                    onValueChange={async (activityUuid) => {
                      if (!activityUuid) {
                        // Clear both fields
                        setFormData({
                          ...formData, 
                          provider_activity_uuid: undefined,
                          provider_org_activity_id: ''
                        });
                        providerActivityAutosave.triggerFieldSave('');
                      } else {
                        // Fetch the activity to get its IATI identifier
                        try {
                          const response = await apiFetch(`/api/activities/${activityUuid}`);
                          if (response.ok) {
                            const activity = await response.json();
                            setFormData({
                              ...formData, 
                              provider_activity_uuid: activityUuid,
                              provider_org_activity_id: activity.iati_identifier || activity.iatiId || ''
                            });
                            providerActivityAutosave.triggerFieldSave(activityUuid);
                          } else {
                            // Fallback if fetch fails
                            setFormData({
                              ...formData, 
                              provider_activity_uuid: activityUuid
                            });
                            providerActivityAutosave.triggerFieldSave(activityUuid);
                          }
                        } catch (error) {
                          console.error('Error fetching activity:', error);
                          // Fallback if fetch fails
                          setFormData({
                            ...formData, 
                            provider_activity_uuid: activityUuid
                          });
                          providerActivityAutosave.triggerFieldSave(activityUuid);
                        }
                      }
                    }}
                    placeholder="Search for provider activity..."
                    disabled={isSubmitting}
                    open={openDropdown === 'provider-activity'}
                    onOpenChange={(isOpen) => setOpenDropdown(isOpen ? 'provider-activity' : null)}
                  />
                )}
              </div>

              {/* Receiver Organization */}
              <div className="space-y-2">
                <LabelWithInfoAndSave
                  helpText="The organization receiving the funds from this transaction"
                  isSaving={receiverOrgAutosave.isSaving}
                  isSaved={receiverOrgAutosave.isSaved}
                  hasValue={!!formData.receiver_org_id}
                >
                  Receiver Organization
                </LabelWithInfoAndSave>
                <OrganizationCombobox
                  value={formData.receiver_org_id || ''}
                  onValueChange={(orgId) => {
                    const org = organizations.find(o => o.id === orgId);
                    if (org) {
                      setFormData({
                        ...formData,
                        receiver_org_id: orgId,
                        receiver_org_name: org?.acronym || org?.name || '',
                        receiver_org_ref: org?.iati_identifier || org?.iati_org_id || ''
                      });
                      receiverOrgAutosave.triggerFieldSave(orgId);
                    } else {
                      setFormData({
                        ...formData,
                        receiver_org_id: '',
                        receiver_org_name: '',
                        receiver_org_ref: ''
                      });
                      receiverOrgAutosave.triggerFieldSave('');
                    }
                  }}
                  placeholder="Search for receiver organization..."
                  organizations={organizations}
                  fallbackRef={formData.receiver_org_ref}
                  onLegacyTypeDetected={orgTypeMappingModal.openModal}
                  open={openDropdown === 'receiver-org'}
                  onOpenChange={(isOpen) => setOpenDropdown(isOpen ? 'receiver-org' : null)}
                />
              </div>

              {/* Receiver Organization Activity ID */}
              <div className="space-y-2">
                <LabelWithInfoAndSave 
                  helpText="Link to the IATI activity of the receiver organization (optional)"
                  isSaving={receiverActivityAutosave.isSaving}
                  isSaved={receiverActivityAutosave.isSaved}
                  hasValue={!!formData.receiver_org_activity_id || !!formData.receiver_activity_uuid}
                >
                  Receiver Activity
                </LabelWithInfoAndSave>
                
                {/* Show warning UI if IATI reference exists but not linked to database */}
                {formData.receiver_org_activity_id && !formData.receiver_activity_uuid ? (
                  <div className="space-y-2">
                    {/* IATI Reference Display with Warning */}
                    <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-amber-800 truncate">
                            {formData.receiver_org_activity_id}
                          </div>
                          <div className="text-xs text-amber-600">
                            IATI reference - not linked to database
                          </div>
                        </div>
                      </div>
                      
                      {/* Check & Link Button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-amber-700 border-amber-300 hover:bg-amber-100 ml-2 flex-shrink-0"
                        onClick={async () => {
                          setIsCheckingReceiverActivity(true);
                          try {
                            const response = await apiFetch(`/api/activities?iati_identifier=${encodeURIComponent(formData.receiver_org_activity_id || '')}`
                            );
                            if (response.ok) {
                              const activities = await response.json();
                              const matchedActivity = activities.find(
                                (a: any) => a.iati_identifier === formData.receiver_org_activity_id
                              );
                              
                              if (matchedActivity) {
                                // Save to database using activity-specific endpoint
                                // Send current form data with updated UUID to avoid null constraint issues
                                const updatePayload = {
                                  ...formData,
                                  receiver_activity_uuid: matchedActivity.id
                                };
                                const updateResponse = await apiFetch(`/api/activities/${activityId}/transactions/${transactionId}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(updatePayload)
                                });
                                
                                if (updateResponse.ok) {
                                  // Update local state
                                  setFormData({
                                    ...formData, 
                                    receiver_activity_uuid: matchedActivity.id
                                  });
                                  
                                  toast.success(`Linked to activity: ${matchedActivity.title_narrative || matchedActivity.title || 'Untitled'}`);
                                  receiverActivityAutosave.triggerFieldSave(matchedActivity.id);
                                } else {
                                  const errorData = await updateResponse.json().catch(() => ({}));
                                  console.error('Failed to save activity link:', errorData);
                                  toast.error('Failed to save activity link', {
                                    description: errorData.error || 'Please try again'
                                  });
                                }
                              } else {
                                toast.info('Activity not found in database', {
                                  description: 'The referenced activity may not be imported yet'
                                });
                              }
                            } else {
                              toast.error('Failed to check for activity');
                            }
                          } catch (error) {
                            console.error('Error checking for activity:', error);
                            toast.error('Failed to check for activity');
                          } finally {
                            setIsCheckingReceiverActivity(false);
                          }
                        }}
                        disabled={isSubmitting || isCheckingReceiverActivity}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${isCheckingReceiverActivity ? 'animate-spin' : ''}`} />
                        {isCheckingReceiverActivity ? 'Checking...' : 'Check & Link'}
                      </Button>
                    </div>
                    
                    {/* Clear Reference Button */}
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm" 
                      className="text-gray-500 hover:text-gray-700 w-full"
                      onClick={() => {
                        setFormData({...formData, receiver_org_activity_id: ''});
                        receiverActivityAutosave.triggerFieldSave('');
                      }}
                      disabled={isSubmitting}
                    >
                      Clear Reference
                    </Button>
                  </div>
                ) : (
                  /* Normal ActivityCombobox when linked or no reference */
                  <ActivityCombobox
                    value={formData.receiver_activity_uuid || ''}
                    onValueChange={async (activityUuid) => {
                      if (!activityUuid) {
                        // Clear both fields
                        setFormData({
                          ...formData, 
                          receiver_activity_uuid: undefined,
                          receiver_org_activity_id: ''
                        });
                        receiverActivityAutosave.triggerFieldSave('');
                      } else {
                        // Fetch the activity to get its IATI identifier
                        try {
                          const response = await apiFetch(`/api/activities/${activityUuid}`);
                          if (response.ok) {
                            const activity = await response.json();
                            setFormData({
                              ...formData, 
                              receiver_activity_uuid: activityUuid,
                              receiver_org_activity_id: activity.iati_identifier || activity.iatiId || ''
                            });
                            receiverActivityAutosave.triggerFieldSave(activityUuid);
                          } else {
                            // Fallback if fetch fails
                            setFormData({
                              ...formData, 
                              receiver_activity_uuid: activityUuid
                            });
                            receiverActivityAutosave.triggerFieldSave(activityUuid);
                          }
                        } catch (error) {
                          console.error('Error fetching activity:', error);
                          // Fallback if fetch fails
                          setFormData({
                            ...formData, 
                            receiver_activity_uuid: activityUuid
                          });
                          receiverActivityAutosave.triggerFieldSave(activityUuid);
                        }
                      }
                    }}
                    placeholder="Search for receiver activity..."
                    disabled={isSubmitting}
                    open={openDropdown === 'receiver-activity'}
                    onOpenChange={(isOpen) => setOpenDropdown(isOpen ? 'receiver-activity' : null)}
                  />
                )}
              </div>
            </div>

            {/* Description Section */}
            <div className="space-y-4">
              <SectionHeader title="Description" />
              <div className="space-y-2">
                <LabelWithInfoAndSave 
                  helpText="Additional details, notes, or context about this transaction"
                  isSaving={descriptionAutosave.isSaving}
                  isSaved={descriptionAutosave.isSaved}
                  hasValue={!!formData.description}
                >
                  Transaction Description
                </LabelWithInfoAndSave>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={e => handleFieldChange('description', e.target.value)}
                  placeholder="Additional details about this transaction..."
                  className="min-h-[80px] resize-vertical w-full"
                />
              </div>
            </div>

            {/* Funding Modality & Aid Classification Section */}
            <div className="space-y-4">
              <SectionHeader title="Funding Modality & Aid Classification" />

              {/* Aid Type and Flow Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <LabelWithInfoAndSave 
                    helpText={IATI_FIELD_HELP.aidType}
                    isSaving={aidTypeAutosave.isSaving}
                    isSaved={aidTypeAutosave.isSaved || hasDefaultValue('aid_type', formData.aid_type)}
                    hasValue={!!formData.aid_type}
                  >
                    Aid Type
                  </LabelWithInfoAndSave>
                  <AidTypeSelect
                    value={formData.aid_type || undefined}
                    onValueChange={(v: string | null) => {
                      const newValue = v || undefined;
                      setFormData({...formData, aid_type: newValue});
                      aidTypeAutosave.triggerFieldSave(newValue);
                    }}
                    placeholder="Select aid type"
                    id="aid_type"
                    open={openDropdown === 'aid-type'}
                    onOpenChange={(isOpen) => setOpenDropdown(isOpen ? 'aid-type' : null)}
                  />
                  {formData.aid_type && (
                    <FieldDescription>
                      {getSelectedDescription('aid', formData.aid_type)}
                    </FieldDescription>
                  )}
                </div>

                <div className="space-y-2">
                  <LabelWithInfoAndSave 
                    helpText="Origin and concessionality of the financial flow"
                    isSaving={flowTypeAutosave.isSaving}
                    isSaved={flowTypeAutosave.isSaved || hasDefaultValue('flow_type', formData.flow_type)}
                    hasValue={!!formData.flow_type}
                  >
                    Flow Type
                  </LabelWithInfoAndSave>
                  <FlowTypeSelect
                    value={formData.flow_type as string | undefined}
                    onValueChange={(v: string | null) => {
                      const newValue = v as FlowType || undefined;
                      setFormData({...formData, flow_type: newValue});
                      flowTypeAutosave.triggerFieldSave(newValue);
                    }}
                    placeholder="Select flow type"
                    open={openDropdown === 'flow-type'}
                    onOpenChange={(isOpen) => setOpenDropdown(isOpen ? 'flow-type' : null)}
                  />
                </div>
              </div>

              {/* Finance Type and Tied Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <LabelWithInfoAndSave 
                    helpText="Financial instrument used"
                    isSaving={financeTypeAutosave.isSaving}
                    isSaved={financeTypeAutosave.isSaved || hasDefaultValue('finance_type', formData.finance_type)}
                    hasValue={!!formData.finance_type}
                  >
                    Finance Type
                  </LabelWithInfoAndSave>
                  <FinanceTypeSelect
                    value={formData.finance_type as string | undefined}
                    onChange={(v: string) => {
                      const newValue = v as FinanceType || undefined;
                      setFormData({...formData, finance_type: newValue});
                      financeTypeAutosave.triggerFieldSave(newValue);
                    }}
                    placeholder="Select finance type"
                    open={openDropdown === 'finance-type'}
                    onOpenChange={(isOpen) => setOpenDropdown(isOpen ? 'finance-type' : null)}
                  />
                </div>

                <div className="space-y-2">
                  <LabelWithInfoAndSave 
                    helpText={IATI_FIELD_HELP.tiedStatus}
                    isSaving={tiedStatusAutosave.isSaving}
                    isSaved={tiedStatusAutosave.isSaved || hasDefaultValue('tied_status', formData.tied_status)}
                    hasValue={!!formData.tied_status}
                  >
                    Tied Status
                  </LabelWithInfoAndSave>
                  <TiedStatusSelect
                    value={(formData.tied_status as any) as string | undefined}
                    onValueChange={(v: string | null) => {
                      const newValue = v as TiedStatus || undefined;
                      setFormData({...formData, tied_status: newValue});
                      tiedStatusAutosave.triggerFieldSave(newValue);
                    }}
                    placeholder="Select tied status"
                    open={openDropdown === 'tied-status'}
                    onOpenChange={(isOpen) => setOpenDropdown(isOpen ? 'tied-status' : null)}
                  />
                </div>
              </div>

              {/* Disbursement Channel */}
              <div className="space-y-2">
                <LabelWithInfoAndSave 
                  helpText="Specifies the channel through which funds are delivered, such as government ministries, non-governmental organisations, or multilateral agencies."
                  isSaving={disbursementChannelAutosave.isSaving}
                  isSaved={disbursementChannelAutosave.isSaved}
                  hasValue={!!formData.disbursement_channel}
                >
                  Disbursement Channel
                </LabelWithInfoAndSave>
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
                                  const newValue = code as DisbursementChannel;
                                  setFormData({ ...formData, disbursement_channel: newValue });
                                  disbursementChannelAutosave.triggerFieldSave(newValue);
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
              </div>

              {/* Humanitarian Transaction - Separate Red Card */}
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Siren className="h-5 w-5 text-red-500" />
                      <div>
                        <LabelWithInfoAndSave 
                          helpText="Tick this if the transaction qualifies as humanitarian assistance under IATI or OCHA guidelines, including emergency response, disaster relief, or protection activities."
                          isSaving={humanitarianAutosave.isSaving}
                          isSaved={humanitarianAutosave.isSaved}
                          hasValue={!!formData.is_humanitarian}
                          className="text-sm font-medium cursor-pointer text-red-900"
                        >
                          Humanitarian Transaction
                        </LabelWithInfoAndSave>
                        <p className="text-xs text-red-700 mt-1">
                          Mark if this transaction is for emergency response or disaster relief
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="is_humanitarian"
                      checked={formData.is_humanitarian}
                      onCheckedChange={checked => {
                        setFormData({ ...formData, is_humanitarian: checked });
                        humanitarianAutosave.triggerFieldSave(checked);
                      }}
                      className="data-[state=checked]:bg-red-600 data-[state=unchecked]:bg-red-200"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Supporting Documents Section */}
            <div className="space-y-4">
              <SectionHeader title="Supporting Documents" />
              <div className="text-sm text-muted-foreground mb-4">
                Upload receipts, invoices, contracts, or other evidence to support this transaction.
                You can also add links to documents hosted elsewhere.
                You must complete the required fields before uploading documents.
              </div>
              {!(createdTransactionId || (isEditing && (transaction?.uuid || transaction?.id))) ? (
                <div className="opacity-40 pointer-events-none select-none">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                    <div className="text-center space-y-4">
                      <div className="rounded-full bg-muted p-4 w-fit mx-auto">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Upload Transaction Evidence</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Drag and drop documents here, or click to browse
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p>Supported: PDF, Images, Excel, Word, CSV (Max 50MB each)</p>
                        <p>Maximum 10 documents per transaction</p>
                      </div>
                      <Button variant="outline" disabled>
                        Browse Files
                      </Button>
                    </div>
                  </div>
                  {creationError && <p className="text-red-500 text-sm text-center mt-2">{creationError}</p>}
                </div>
              ) : (
                <TransactionDocumentUpload
                  transactionId={createdTransactionId || transaction?.uuid || transaction?.id}
                  activityId={activityId}
                  documents={documents}
                  onDocumentsChange={setDocuments}
                  disabled={isSubmitting}
                  maxFiles={10}
                  maxFileSize={50}
                />
              )}
            </div>

            {/* Advanced IATI Fields Section - Individual Collapsibles */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Advanced IATI Fields</h3>
              
              {/* Geographic Targeting - Simplified for IATI Transaction Level */}
              <Collapsible open={showGeographicTargeting} onOpenChange={setShowGeographicTargeting}>
                <CollapsibleTrigger asChild>
                  <button
                    className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border transition-colors text-left"
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", showGeographicTargeting && "rotate-180")} />
                      <span className="text-sm font-medium text-gray-700">Geographic Targeting</span>
                      {hasGeographicTargeting && (
                        <Badge variant="secondary" className="text-xs">
                          {formData.recipient_country_code 
                            ? IATI_COUNTRIES.find(c => c.code === formData.recipient_country_code)?.name || formData.recipient_country_code
                            : IATI_REGIONS.find(r => r.code === formData.recipient_region_code)?.name || formData.recipient_region_code
                          }
                        </Badge>
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="space-y-4 p-4 bg-gray-50/50 rounded-lg border">
                    {/* Activity-level geography message */}
                    {geographyLevel === 'activity' && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Geography is set at the activity level. Transaction-level geographic targeting is disabled.
                          To enable, change the geography level setting in the Countries &amp; Regions Allocation section.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* Transaction-level geography form */}
                    {geographyLevel === 'transaction' && (
                      <>
                      <p className="text-xs text-gray-600">
                          Per IATI standard, each transaction can have one country OR one region (not both).
                        </p>

                        {/* Type selection */}
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="geoType"
                              checked={selectedGeoType === 'none'}
                              onChange={() => {
                                setSelectedGeoType('none');
                                setFormData({
                                  ...formData, 
                                  recipient_country_code: '', 
                                  recipient_region_code: '',
                                  recipient_region_vocab: undefined
                                });
                              }}
                              className="h-4 w-4 text-blue-600"
                              disabled={isSubmitting}
                            />
                            <span className="text-sm text-gray-600">Activity-level default</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="geoType"
                              checked={selectedGeoType === 'country'}
                              onChange={() => {
                                setSelectedGeoType('country');
                                setFormData({
                                  ...formData, 
                                  recipient_region_code: '',
                                  recipient_region_vocab: undefined
                                });
                              }}
                              className="h-4 w-4 text-blue-600"
                              disabled={isSubmitting}
                            />
                            <span className="text-sm">Country</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="geoType"
                              checked={selectedGeoType === 'region'}
                              onChange={() => {
                                setSelectedGeoType('region');
                                setFormData({
                                  ...formData, 
                                  recipient_country_code: ''
                                });
                              }}
                              className="h-4 w-4 text-blue-600"
                              disabled={isSubmitting}
                            />
                            <span className="text-sm">Region</span>
                          </label>
                        </div>

                        {/* Country dropdown */}
                        {selectedGeoType === 'country' && (
                        <div className="space-y-2">
                          <LabelWithInfoAndSave 
                              helpText="ISO 3166-1 alpha-2 country code"
                            isSaving={recipientCountryAutosave.isSaving}
                            isSaved={recipientCountryAutosave.isSaved}
                            hasValue={!!formData.recipient_country_code}
                          >
                            Recipient Country
                          </LabelWithInfoAndSave>
                            <Popover open={countryPopoverOpen} onOpenChange={setCountryPopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between font-normal"
                                  disabled={isSubmitting}
                              >
                                {formData.recipient_country_code ? (
                                  <span className="flex items-center gap-2">
                                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                      {formData.recipient_country_code}
                                    </span>
                                    <span className="truncate">
                                      {IATI_COUNTRIES.find(c => c.code === formData.recipient_country_code)?.name || formData.recipient_country_code}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">Select country...</span>
                                )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[350px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search countries..." />
                                <CommandList className="max-h-[300px]">
                                  <CommandEmpty>No country found.</CommandEmpty>
                                  <CommandGroup>
                                    {IATI_COUNTRIES.filter(c => !c.withdrawn).map((country) => (
                                      <CommandItem
                                        key={country.code}
                                        value={`${country.code} ${country.name}`}
                                        onSelect={() => {
                                          setFormData({...formData, recipient_country_code: country.code});
                                          recipientCountryAutosave.triggerFieldSave(country.code);
                                          setCountryPopoverOpen(false);
                                        }}
                                      >
                                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded mr-2">
                                          {country.code}
                                        </span>
                                        <span className="truncate">{country.name}</span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        )}
                        
                        {/* Region dropdown */}
                        {selectedGeoType === 'region' && (
                        <div className="space-y-2">
                          <LabelWithInfoAndSave 
                              helpText="IATI region code (e.g., 298 for Africa)"
                            isSaving={recipientRegionAutosave.isSaving}
                            isSaved={recipientRegionAutosave.isSaved}
                            hasValue={!!formData.recipient_region_code}
                          >
                            Recipient Region
                          </LabelWithInfoAndSave>
                            <Popover open={regionPopoverOpen} onOpenChange={setRegionPopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between font-normal"
                                  disabled={isSubmitting}
                              >
                                {formData.recipient_region_code ? (
                                  <span className="flex items-center gap-2">
                                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                      {formData.recipient_region_code}
                                    </span>
                                    <span className="truncate">
                                      {IATI_REGIONS.find(r => r.code === formData.recipient_region_code)?.name || formData.recipient_region_code}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">Select region...</span>
                                )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[350px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search regions..." />
                                <CommandList className="max-h-[300px]">
                                  <CommandEmpty>No region found.</CommandEmpty>
                                  <CommandGroup>
                                    {IATI_REGIONS.filter(r => !r.withdrawn).map((region) => (
                                      <CommandItem
                                        key={region.code}
                                        value={`${region.code} ${region.name}`}
                                        onSelect={() => {
                                            setFormData({
                                              ...formData, 
                                              recipient_region_code: region.code,
                                              recipient_region_vocab: '1'
                                            });
                                          recipientRegionAutosave.triggerFieldSave(region.code);
                                          setRegionPopoverOpen(false);
                                        }}
                                      >
                                        <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded mr-2">
                                          {region.code}
                                        </span>
                                        <span className="truncate">{region.name}</span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        )}
                      </>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Transaction Level Sector Classifications */}
              <Collapsible open={showMultipleSectors} onOpenChange={setShowMultipleSectors}>
                <CollapsibleTrigger asChild>
                  <button
                    className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border transition-colors text-left"
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", showMultipleSectors && "rotate-180")} />
                      <span className="text-sm font-medium text-gray-700">Transaction Level Sector Classifications</span>
                      {!useActivitySectorChoice && multipleSectorsCount > 0 && (
                        <Badge variant="secondary" className="text-xs">{multipleSectorsCount}</Badge>
                      )}
                      {useActivitySectorChoice && activitySectors.length > 0 && (
                        <Badge variant="outline" className="text-xs text-gray-500">Using activity sectors</Badge>
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="space-y-4 p-4 bg-gray-50/50 rounded-lg border">
                    {/* Radio group for sector source selection */}
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          id="sector-activity"
                          name="sector-source"
                          checked={useActivitySectorChoice}
                          onChange={() => handleSectorChoiceChange(true)}
                          className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="sector-activity" className="flex-1 cursor-pointer">
                          <span className="text-sm font-medium text-gray-700">Use activity sectors</span>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Inherit sector allocations from the activity level
                          </p>
                        </label>
                      </div>
                      
                      {/* Show activity sectors preview when "Use activity sectors" is selected */}
                      {useActivitySectorChoice && activitySectors.length > 0 && (
                        <div className="ml-7 p-3 bg-white rounded-md border border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-2">Activity sectors:</p>
                          <div className="space-y-2">
                            {(() => {
                              // Group sectors by category
                              const grouped = activitySectors.reduce((acc, sector) => {
                                const categoryCode = (sector as any).categoryCode || '';
                                const rawCategoryName = (sector as any).categoryName || (sector as any).category || '';
                                // Strip the code prefix from category name (e.g., "250 - Business" -> "Business")
                                const categoryName = rawCategoryName.replace(/^\d+\s*[-–]\s*/, '');
                                const categoryKey = categoryCode || 'uncategorized';
                                if (!acc[categoryKey]) {
                                  acc[categoryKey] = { categoryCode, categoryName, sectors: [] };
                                }
                                acc[categoryKey].sectors.push(sector);
                                return acc;
                              }, {} as Record<string, { categoryCode: string; categoryName: string; sectors: typeof activitySectors }>);

                              const groupEntries = Object.entries(grouped);
                              return groupEntries.map(([key, group], groupIdx) => (
                                <div key={key} className="space-y-1">
                                  {/* Category header - only show if there's a category */}
                                  {group.categoryCode && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                                      <span className="font-mono bg-gray-50 px-1 py-0.5 rounded">
                                        {group.categoryCode}
                                      </span>
                                      <span>{group.categoryName}</span>
                                    </div>
                                  )}
                                  {/* Sectors in this category */}
                                  <div className={cn("space-y-1", group.categoryCode && "ml-3")}>
                                    {group.sectors.map((sector, idx) => {
                                      const sectorCode = (sector as any).code || sector.sector_code;
                                      const rawSectorName = (sector as any).name || sector.sector_name || '';
                                      // Strip the code prefix from sector name (e.g., "11220 - Primary education" -> "Primary education")
                                      const sectorName = rawSectorName.replace(/^\d+\s*[-–]\s*/, '');
                                      return (
                                        <div key={idx} className="flex items-center justify-between text-xs text-gray-600 gap-2">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            {sectorCode && (
                                              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 shrink-0">
                                                {sectorCode}
                                              </span>
                                            )}
                                            <span className="truncate">{sectorName || sectorCode}</span>
                                          </div>
                                          {sector.percentage !== undefined && sector.percentage > 0 && (
                                            <span className="text-gray-500 shrink-0">{sector.percentage}%</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {/* Divider line between categories */}
                                  {groupIdx < groupEntries.length - 1 && (
                                    <div className="border-b border-gray-200 mt-2" />
                                  )}
                                </div>
                              ));
                            })()}
                            {activitySectors.reduce((sum, s) => sum + (s.percentage || 0), 0) > 0 && (
                              <div className="flex justify-between text-xs font-medium text-gray-700 pt-1 border-t">
                                <span>Total</span>
                                <span>{activitySectors.reduce((sum, s) => sum + (s.percentage || 0), 0)}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {useActivitySectorChoice && activitySectors.length === 0 && (
                        <div className="ml-7 p-3 bg-amber-50 rounded-md border border-amber-200">
                          <p className="text-xs text-amber-700">
                            No sectors defined at the activity level. Add sectors in the Sectors tab, or specify custom sectors for this transaction.
                          </p>
                        </div>
                      )}
                      
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          id="sector-custom"
                          name="sector-source"
                          checked={!useActivitySectorChoice}
                          onChange={() => handleSectorChoiceChange(false)}
                          className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="sector-custom" className="flex-1 cursor-pointer">
                          <span className="text-sm font-medium text-gray-700">Specify for this transaction</span>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Define custom sector allocations for this transaction
                          </p>
                        </label>
                      </div>

                      {/* Show custom sectors preview table when custom sectors is selected */}
                      {!useActivitySectorChoice && formData.sectors && formData.sectors.length > 0 && (
                        <div className="ml-7 p-3 bg-white rounded-md border border-gray-200">
                          <p className="text-xs font-medium text-gray-600 mb-2">Transaction sectors:</p>
                          <div className="space-y-2">
                            {(() => {
                              // Group sectors by category using DAC sector data lookup
                              const grouped = (formData.sectors || []).reduce((acc, sector) => {
                                const sectorInfo = getDacSectorInfo(sector.code);
                                const categoryCode = sectorInfo.category?.match(/^(\d+)/)?.[1] || sector.code?.substring(0, 3) || '';
                                const categoryName = sectorInfo.categoryName || '';
                                const categoryKey = categoryCode || 'uncategorized';
                                if (!acc[categoryKey]) {
                                  acc[categoryKey] = { categoryCode, categoryName, sectors: [] };
                                }
                                acc[categoryKey].sectors.push({ ...sector, sectorInfo });
                                return acc;
                              }, {} as Record<string, { categoryCode: string; categoryName: string; sectors: Array<typeof formData.sectors[0] & { sectorInfo: DacSectorInfo }> }>);

                              const groupEntries = Object.entries(grouped);
                              return groupEntries.map(([key, group], groupIdx) => (
                                <div key={key} className="space-y-1">
                                  {/* Category header with code and name */}
                                  {group.categoryCode && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                                      <span className="font-mono bg-gray-50 px-1 py-0.5 rounded">
                                        {group.categoryCode}
                                      </span>
                                      <span>{group.categoryName}</span>
                                    </div>
                                  )}
                                  {/* Sectors in this category */}
                                  <div className={cn("space-y-1", group.categoryCode && "ml-3")}>
                                    {group.sectors.map((sector, idx) => {
                                      const sectorCode = sector.code;
                                      // Use DAC sector name, fallback to narrative, strip code prefix
                                      const rawName = sector.sectorInfo?.name || sector.narrative || '';
                                      const cleanName = rawName.replace(/^\d+\s*[-–]\s*/, '');
                                      return (
                                        <div key={idx} className="flex items-center justify-between text-xs text-gray-600 gap-2">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            {sectorCode && (
                                              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 shrink-0">
                                                {sectorCode}
                                              </span>
                                            )}
                                            <span className="truncate">{cleanName || sectorCode}</span>
                                          </div>
                                          {sector.percentage !== undefined && sector.percentage > 0 && (
                                            <span className="text-gray-500 shrink-0">{sector.percentage}%</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {/* Divider line between categories */}
                                  {groupIdx < groupEntries.length - 1 && (
                                    <div className="border-b border-gray-200 mt-2" />
                                  )}
                                </div>
                              ));
                            })()}
                            {(formData.sectors || []).reduce((sum, s) => sum + (s.percentage || 0), 0) > 0 && (
                              <div className="flex justify-between text-xs font-medium text-gray-700 pt-1 border-t">
                                <span>Total</span>
                                <span>{(formData.sectors || []).reduce((sum, s) => sum + (s.percentage || 0), 0)}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {!useActivitySectorChoice && (!formData.sectors || formData.sectors.length === 0) && (
                        <div className="ml-7 p-3 bg-amber-50 rounded-md border border-amber-200">
                          <p className="text-xs text-amber-700">
                            No custom sectors defined yet. Use the sector editor below to add sectors.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Show TransactionSectorManager only when custom sectors is selected */}
                    {!useActivitySectorChoice && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-600 mb-3">
                      Add multiple sectors with percentage allocations. Percentages must sum to 100%.
                    </p>
                    <TransactionSectorManager
                      sectors={formData.sectors || []}
                      onSectorsChange={(sectors) => {
                        setFormData({ ...formData, sectors });
                      }}
                      allowPercentages={true}
                    />
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Multiple Aid Types */}
              <Collapsible open={showMultipleAidTypes} onOpenChange={setShowMultipleAidTypes}>
                <CollapsibleTrigger asChild>
                  <button
                    className="flex items-center justify-between w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border transition-colors text-left"
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", showMultipleAidTypes && "rotate-180")} />
                      <span className="text-sm font-medium text-gray-700">Multiple Aid Types</span>
                      {multipleAidTypesCount > 0 && (
                        <Badge variant="secondary" className="text-xs">{multipleAidTypesCount}</Badge>
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <div className="space-y-4 p-4 bg-gray-50/50 rounded-lg border">
                    <p className="text-xs text-gray-600">
                      Specify multiple aid type classifications with different vocabularies.
                    </p>
                    <TransactionAidTypeManager
                      aidTypes={formData.aid_types || []}
                      onAidTypesChange={(aid_types) => {
                        setFormData({ ...formData, aid_types });
                      }}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

            </div>

            {/* System Identifiers - Always shown at bottom */}
            <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-semibold text-gray-900">System Identifiers</h3>
                <InfoTooltipWithSaveIndicator 
                  text="These identifiers are automatically generated by the system and cannot be edited."
                  className="ml-1"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Activity ID */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Activity ID</label>
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
                    <span className="flex-1 text-gray-600 font-mono truncate min-w-0">
                      {activityPartnerId || 'Not reported'}
                    </span>
                    {activityPartnerId && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(activityPartnerId);
                            toast.success("Activity ID copied to clipboard!");
                          } catch (error) {
                            toast.error("Failed to copy to clipboard");
                          }
                        }}
                        className="ml-2 p-1 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors flex-shrink-0"
                        aria-label="Copy Activity ID to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Activity UUID */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Activity UUID</label>
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
                    <span className="flex-1 text-gray-600 font-mono truncate min-w-0">
                      {activityId || 'Not available'}
                    </span>
                    {activityId && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(activityId);
                            toast.success("Activity UUID copied to clipboard!");
                          } catch (error) {
                            toast.error("Failed to copy to clipboard");
                          }
                        }}
                        className="ml-2 p-1 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors flex-shrink-0"
                        aria-label="Copy Activity UUID to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Transaction ID */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Transaction ID</label>
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
                    <input
                      value={formData.transaction_reference || ''}
                      onChange={e => handleFieldChange('transaction_reference', e.target.value)}
                      placeholder="Will be auto-generated on save"
                      className="border-0 bg-transparent p-0 text-sm text-gray-600 placeholder-gray-400 focus:ring-0 focus:outline-none flex-1 min-w-0 font-mono"
                    />
                    {formData.transaction_reference && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(formData.transaction_reference || '');
                            toast.success("Transaction ID copied to clipboard!");
                          } catch (error) {
                            toast.error("Failed to copy to clipboard");
                          }
                        }}
                        className="ml-2 p-1 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors flex-shrink-0"
                        aria-label="Copy Transaction ID to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Transaction UUID */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Transaction UUID</label>
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
                    <span className="flex-1 text-gray-600 font-mono truncate min-w-0">
                      {transaction?.uuid || 'Generated after save'}
                    </span>
                    {transaction?.uuid && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(transaction.uuid);
                            toast.success("Transaction UUID copied to clipboard!");
                          } catch (error) {
                            toast.error("Failed to copy to clipboard");
                          }
                        }}
                        className="ml-2 p-1 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors flex-shrink-0"
                        aria-label="Copy Transaction UUID to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-8 py-6 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInternalSubmit} className="min-w-[100px]" disabled={isSubmitting || isInternallySubmitting}>
            {isEditing ? "Update" : "Add"} Transaction
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Organization Type Mapping Modal for legacy type codes */}
      <OrgTypeMappingModal
        isOpen={orgTypeMappingModal.isOpen}
        onClose={orgTypeMappingModal.closeModal}
        organization={orgTypeMappingModal.targetOrg}
        onSave={handleOrgTypeUpdate}
      />
    </Dialog>
  );
} 