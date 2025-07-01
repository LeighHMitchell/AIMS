"use client"
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Info, CheckCircle2, DollarSign, Copy, Clipboard, SearchIcon } from "lucide-react";
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
} from "@/types/transaction";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyField } from "@/components/ui/copy-field";
import { CurrencyCombobox } from "@/components/ui/currency-combobox";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Constants for dropdowns
const TRANSACTION_TYPES = {
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

// Enhanced transaction types with descriptions
const TRANSACTION_TYPES_WITH_DESC = {
  '3': { label: 'Disbursement', desc: 'Funds placed at the recipient\'s disposal or transferred between IATI activities' },
  '4': { label: 'Expenditure', desc: 'Outgoing funds spent directly on goods and services' },
  '6': { label: 'Loan Repayment', desc: 'Principal repaid, including arrears' },
  '1': { label: 'Incoming Commitment', desc: 'Reported by recipient; firm promise of incoming funds' },
  '2': { label: 'Outgoing Commitment', desc: 'Reported by provider; firm promise of funds to be provided' },
  '12': { label: 'Incoming Funds', desc: 'Funds received from an external source' },
  '5': { label: 'Interest Repayment', desc: 'Interest paid on loans' },
  '7': { label: 'Reimbursement', desc: 'Funds reimbursed for expenses' },
  '8': { label: 'Purchase of Equity', desc: 'Purchase of equity/shares in an investment' },
  '9': { label: 'Sale of Equity', desc: 'Sale of equity/shares in an investment' },
  '11': { label: 'Credit Guarantee', desc: 'Guarantee of credit/loan' },
  '13': { label: 'Commitment Cancellation', desc: 'Cancellation of a previously reported commitment' }
};

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
  '1': 'Central MoF / Treasury',
  '2': 'Separate account for implementer',
  '3': 'Aid in kind via NGO/3rd party',
  '4': 'Aid in kind via donor agency'
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

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  activityId: string;
  onSubmit: (transaction: Partial<Transaction>) => void;
  defaultFinanceType?: string; // From activity settings
  isSubmitting?: boolean;
}

export default function TransactionModal({
  open,
  onOpenChange,
  transaction,
  activityId,
  onSubmit,
  defaultFinanceType,
  isSubmitting
}: TransactionModalProps) {
  const { partners } = usePartners();
  const { data: iatiValues, loading: iatiLoading, getFieldValues } = useIATIReferenceValues();
  const isEditing = !!transaction;
  const [isClassificationOverridden, setIsClassificationOverridden] = useState(false);
  const [computedClassification, setComputedClassification] = useState("");
  const [manualClassification, setManualClassification] = useState("");
  const [showValueDate, setShowValueDate] = useState(false);

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
    currency: transaction?.currency || 'USD',
    status: transaction?.status || 'actual',
    
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
    
    // Classifications
    disbursement_channel: transaction?.disbursement_channel || undefined,
    flow_type: transaction?.flow_type || undefined,
    finance_type: transaction?.finance_type || (defaultFinanceType as FinanceType) || undefined,
    aid_type: transaction?.aid_type || undefined,
    tied_status: transaction?.tied_status || undefined,
    
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

  // Compute classification when relevant fields change
  useEffect(() => {
    const classification = classifyFinance(formData.flow_type, formData.aid_type, formData.finance_type);
    setComputedClassification(classification);
  }, [formData.flow_type, formData.aid_type, formData.finance_type]);

  // Update form data when transaction prop changes
  useEffect(() => {
    if (transaction) {
      setFormData({
        // Core fields
        transaction_type: transaction.transaction_type || '3',
        transaction_date: transaction.transaction_date || format(new Date(), "yyyy-MM-dd"),
        value: transaction.value || 0,
        currency: transaction.currency || 'USD',
        status: transaction.status || 'actual',
        
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
        
        // Classifications
        disbursement_channel: transaction.disbursement_channel || undefined,
        flow_type: transaction.flow_type || undefined,
        finance_type: transaction.finance_type || (defaultFinanceType as FinanceType) || undefined,
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
      // Reset form for new transaction
      setFormData({
        transaction_type: '3',
        transaction_date: format(new Date(), "yyyy-MM-dd"),
        value: 0,
        currency: 'USD',
        status: 'actual',
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
        flow_type: undefined,
        finance_type: (defaultFinanceType as FinanceType) || undefined,
        aid_type: undefined,
        tied_status: undefined,
        sector_code: '',
        sector_vocabulary: undefined,
        recipient_country_code: '',
        recipient_region_code: '',
        recipient_region_vocab: undefined,
        is_humanitarian: false,
      });
    }
  }, [transaction, defaultFinanceType]);

  const handleSubmit = () => {
    const submissionData: any = {
      ...formData,
      financing_classification: isClassificationOverridden 
        ? manualClassification 
        : computedClassification
    };
    onSubmit(submissionData);
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
    '1': { label: 'Central MoF / Treasury', desc: 'Direct to recipient government central treasury' },
    '2': { label: 'Separate account', desc: 'Separate account managed by implementing partner' },
    '3': { label: 'Aid in kind (NGO)', desc: 'Goods/services provided through NGO or third party' },
    '4': { label: 'Aid in kind (donor)', desc: 'Goods/services provided directly by donor' }
  };

  // Helper to get current descriptions for selected values
  const getSelectedDescription = (type: string, value: string | undefined) => {
    if (!value) return null;
    
    switch (type) {
      case 'transaction':
        return TRANSACTION_TYPES_WITH_DESC[value as keyof typeof TRANSACTION_TYPES_WITH_DESC]?.desc;
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

              {/* Type and Status Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transaction_type" className="text-sm font-medium">
                    Transaction Type
                    <InfoTooltip text="Type of financial transaction being recorded" />
                  </Label>
                  <Select 
                    value={formData.transaction_type} 
                    onValueChange={v => setFormData({...formData, transaction_type: v as TransactionType})}
                  >
                    <SelectTrigger className="w-full text-left">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      {iatiLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading transaction types...
                        </SelectItem>
                      ) : (
                        getFieldValues('transaction_type').map((type) => (
                          <SelectItem key={type.code} value={type.code} className="py-3">
                            <div className="flex items-start gap-3">
                              <span className="text-xs font-mono text-muted-foreground mt-0.5">{type.code}</span>
                              <div className="flex-1">
                                <div className="font-medium">{type.name}</div>
                                {TRANSACTION_TYPES_WITH_DESC[type.code as keyof typeof TRANSACTION_TYPES_WITH_DESC] && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {TRANSACTION_TYPES_WITH_DESC[type.code as keyof typeof TRANSACTION_TYPES_WITH_DESC].desc}
                                  </div>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {formData.transaction_type && (
                    <FieldDescription>
                      {getSelectedDescription('transaction', formData.transaction_type)}
                    </FieldDescription>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">
                    Transaction Status
                  </Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={v => setFormData({...formData, status: v as 'draft' | 'actual'})}
                  >
                    <SelectTrigger className="w-full text-left">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="actual">Actual</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="currency" className="text-sm font-medium">
                    Currency
                    <InfoTooltip text="Currency of the transaction value" />
                  </Label>
                  <CurrencyCombobox
                    value={formData.currency}
                    onValueChange={v => setFormData({...formData, currency: v})}
                    placeholder="Select currency..."
                    className="w-full text-left"
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
                    <Checkbox
                      id="fx_date_different"
                      checked={showValueDate}
                      onCheckedChange={(checked) => {
                        setShowValueDate(checked as boolean);
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
                    onChange={e => setFormData({...formData, transaction_reference: e.target.value})}
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
                    onChange={e => setFormData({...formData, description: e.target.value})}
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
                  <h4 className="font-medium flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50">Provider</Badge>
                    Organization
                  </h4>
                  
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
                            provider_org_name: org?.name || '',
                            provider_org_ref: org?.iati_org_id || ''
                          });
                        }
                      }}
                      placeholder="Select provider organization"
                    />

                    {formData.provider_org_ref && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">IATI Identifier</Label>
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                          <code className="text-xs flex-1">{formData.provider_org_ref}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              navigator.clipboard.writeText(formData.provider_org_ref || '');
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {!formData.provider_org_id && (
                      <>
                        <Input
                          placeholder="Organization name (if not in list)"
                          value={formData.provider_org_name || ''}
                          onChange={e => setFormData({...formData, provider_org_name: e.target.value})}
                          className="w-full"
                        />
                        <Input
                          placeholder="IATI identifier (optional)"
                          value={formData.provider_org_ref || ''}
                          onChange={e => setFormData({...formData, provider_org_ref: e.target.value})}
                          className="w-full"
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Receiver Organization */}
                <div className="space-y-4 border rounded-lg p-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50">Receiver</Badge>
                    Organization
                  </h4>
                  
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
                            receiver_org_name: org?.name || '',
                            receiver_org_ref: org?.iati_org_id || ''
                          });
                        }
                      }}
                      placeholder="Select receiver organization"
                    />

                    {formData.receiver_org_ref && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">IATI Identifier</Label>
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                          <code className="text-xs flex-1">{formData.receiver_org_ref}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              navigator.clipboard.writeText(formData.receiver_org_ref || '');
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {!formData.receiver_org_id && (
                      <>
                        <Input
                          placeholder="Organization name (if not in list)"
                          value={formData.receiver_org_name || ''}
                          onChange={e => setFormData({...formData, receiver_org_name: e.target.value})}
                          className="w-full"
                        />
                        <Input
                          placeholder="IATI identifier (optional)"
                          value={formData.receiver_org_ref || ''}
                          onChange={e => setFormData({...formData, receiver_org_ref: e.target.value})}
                          className="w-full"
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Classification & Compliance Section */}
            <div className="space-y-4">
              <SectionHeader title="Classification & Compliance" />

              {/* Aid Type and Flow Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="aid_type" className="text-sm font-medium">
                    Aid Type
                    <InfoTooltip text="IATI aid type classification" />
                  </Label>
                  <Select 
                    value={formData.aid_type || 'none'} 
                    onValueChange={v => setFormData({...formData, aid_type: v === 'none' ? undefined : v as string})}
                  >
                    <SelectTrigger className="w-full text-left">
                      <SelectValue placeholder="Select aid type" />
                    </SelectTrigger>
                    <SelectContent className="z-[9999]">
                      {iatiLoading ? (
                        <SelectItem value="loading" disabled>
                          Loading aid types...
                        </SelectItem>
                      ) : (
                        <>
                          <SelectItem value="none">
                            <span className="text-muted-foreground">No aid type selected</span>
                          </SelectItem>
                          {getFieldValues('aid_type').map((type) => {
                            // Get the category from the code prefix
                            const getCategory = (code: string) => {
                              if (code.startsWith('A')) return 'BUDGET SUPPORT';
                              if (code.startsWith('B')) return 'CORE CONTRIBUTIONS';
                              if (code.startsWith('C')) return 'PROJECT-TYPE';
                              if (code.startsWith('D')) return 'TECHNICAL ASSISTANCE';
                              if (code.startsWith('E')) return 'SCHOLARSHIPS';
                              if (code.startsWith('F')) return 'DEBT';
                              if (code.startsWith('G')) return 'ADMINISTRATIVE';
                              if (code.startsWith('H')) return 'OTHER';
                              return 'OTHER';
                            };
                            
                            const category = getCategory(type.code);
                            // Use getSelectedDescription helper to get the description
                            const description = getSelectedDescription('aid', type.code);
                            
                            return (
                              <SelectItem key={type.code} value={type.code} className="py-3">
                                <div className="flex items-start gap-3">
                                  <span className="text-xs font-mono text-muted-foreground mt-0.5">{type.code}</span>
                                  <div className="flex-1">
                                    <div className="font-medium">{type.name}</div>
                                    {description && (
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        {description}
                                      </div>
                                    )}
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {category}
                                    </div>
                                  </div>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  {formData.aid_type && (
                    <FieldDescription>
                      {getSelectedDescription('aid', formData.aid_type)}
                    </FieldDescription>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flow_type" className="text-sm font-medium">
                    Flow Type
                    <InfoTooltip text="Origin and concessionality of the financial flow" />
                  </Label>
                  <SearchableSelect
                    options={Object.entries(FLOW_TYPES_WITH_DESC).map(([key, value]) => ({
                      value: key,
                      label: value.label,
                      description: value.desc
                    }))}
                    value={formData.flow_type}
                    onValueChange={v => setFormData({...formData, flow_type: v as FlowType})}
                    placeholder="Select flow type"
                    searchPlaceholder="Search by code or name..."
                    className="w-full"
                  />
                </div>
              </div>

              {/* Finance Type and Tied Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="finance_type" className="text-sm font-medium">
                    Finance Type
                    <InfoTooltip text="Financial instrument used" />
                  </Label>
                  <SearchableSelect
                    options={Object.entries(FINANCE_TYPES_WITH_DESC).flatMap(([category, types]) =>
                      Object.entries(types).map(([key, value]) => ({
                        value: key,
                        label: value.label,
                        description: value.desc,
                        category
                      }))
                    )}
                    value={formData.finance_type}
                    onValueChange={v => setFormData({...formData, finance_type: v as FinanceType})}
                    placeholder="Select finance type"
                    searchPlaceholder="Search by code or name..."
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tied_status" className="text-sm font-medium">
                    Tied Status
                    <InfoTooltip text="Procurement restrictions on the aid" />
                  </Label>
                  <SearchableSelect
                    options={Object.entries(TIED_STATUS_WITH_DESC).map(([key, value]) => ({
                      value: key,
                      label: value.label,
                      description: value.desc
                    }))}
                    value={formData.tied_status}
                    onValueChange={v => setFormData({...formData, tied_status: v as TiedStatus})}
                    placeholder="Select tied status"
                    searchPlaceholder="Search by code or status..."
                    className="w-full"
                  />
                </div>
              </div>

              {/* Disbursement Channel */}
              <div className="space-y-2">
                <Label htmlFor="disbursement_channel" className="text-sm font-medium">
                  Disbursement Channel
                  <InfoTooltip text="How funds are disbursed" />
                </Label>
                <SearchableSelect
                  options={Object.entries(DISBURSEMENT_CHANNELS_WITH_DESC).map(([key, value]) => ({
                    value: key,
                    label: value.label,
                    description: value.desc
                  }))}
                  value={formData.disbursement_channel}
                  onValueChange={v => setFormData({...formData, disbursement_channel: v as DisbursementChannel})}
                  placeholder="Select disbursement channel"
                  searchPlaceholder="Search by code or channel..."
                  className="w-full"
                />
              </div>

              {/* Financing Classification */}
              <div className="space-y-2 p-4 bg-slate-50 rounded-lg">
                <Label htmlFor="financing_classification" className="text-sm font-medium">
                  Financing Classification (auto-computed)
                  <InfoTooltip text="This classification is auto-generated based on Flow Type, Aid Type, and Finance Type. You may override it if needed." />
                </Label>
                <Input
                  id="financing_classification"
                  value={isClassificationOverridden ? manualClassification : computedClassification}
                  onChange={e => setManualClassification(e.target.value)}
                  disabled={!isClassificationOverridden}
                  className={cn(
                    "bg-white",
                    !isClassificationOverridden && "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                  placeholder="Auto-computed based on selections"
                />
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox
                    id="override_classification"
                    checked={isClassificationOverridden}
                    onCheckedChange={(checked) => setIsClassificationOverridden(checked as boolean)}
                  />
                  <Label htmlFor="override_classification" className="text-sm font-normal cursor-pointer">
                    Override classification manually
                  </Label>
                </div>
              </div>

              {/* Humanitarian Transaction */}
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <Checkbox
                  id="is_humanitarian"
                  checked={formData.is_humanitarian}
                  onCheckedChange={(checked) => setFormData({...formData, is_humanitarian: checked as boolean})}
                />
                <Label htmlFor="is_humanitarian" className="text-sm font-normal cursor-pointer">
                  Humanitarian Transaction
                  <InfoTooltip text="Tick this if the transaction qualifies as humanitarian assistance under IATI or OCHA guidelines, including emergency response, disaster relief, or protection activities." />
                </Label>
              </div>
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
      </DialogContent>
    </Dialog>
  );
} 