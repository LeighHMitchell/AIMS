import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchBasicActivityWithCache, invalidateActivityCache } from '@/lib/activity-cache';
import { getSectorInfo, getCleanSectorName, getSectorInfoFlexible } from '@/lib/dac-sector-utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList, CommandInput, CommandEmpty } from '@/components/ui/command';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { IATIXMLParser, validateIATIXML } from '@/lib/xml-parser';
import { IATI_REGIONS } from '@/data/iati-regions';
import { IATI_COUNTRIES } from '@/data/iati-countries';
import { LANGUAGES } from '@/data/languages';
import { ExternalPublisherModal } from '@/components/import/ExternalPublisherModal';
import { ImportValidationReport } from './results/ImportValidationReport';
import { extractIatiMeta } from '@/lib/iati/parseMeta';
import { useUser } from '@/hooks/useUser';
import { setFieldSaved } from '@/utils/persistentSave';
import {
  Upload,
  FileText,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  FileCode,
  ArrowRight,
  Download,
  Eye,
  Database,
  Link,
  Globe,
  Settings,
  ChevronRight,
  ChevronsUpDown,
  Check,
  Lock,
  Plus,
  Trash2,
  Bug,
  Copy,
  ClipboardPaste,
  Loader2,
} from 'lucide-react';

interface XmlImportTabProps {
  activityId: string;
}

interface ActivityData {
  id?: string;
  title_narrative?: string;
  description_narrative?: string;
  description_objectives?: string;
  description_target_groups?: string;
  description_other?: string;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  activity_status?: string;
  collaboration_type?: string;
  activity_scope?: string;
  language?: string;
  iati_identifier?: string;
  default_currency?: string;
  defaultAidType?: string;
  defaultFinanceType?: string;
  defaultFlowType?: string;
  defaultTiedStatus?: string;
  sectors?: Array<{
    id: string;
    code: string;
    name: string;
    percentage: number;
    level?: string;
    categoryCode?: string;
    categoryName?: string;
    type?: string;
  }>;
  recipient_countries?: Array<{
    id: string;
    country: {
      code: string;
      name: string;
      iso2: string;
      withdrawn: boolean;
    };
    percentage: number;
    vocabulary: string;
    vocabularyUri?: string;
    narrative?: string;
  }>;
  recipient_regions?: Array<{
    id: string;
    region: {
      code: string;
      name: string;
      withdrawn: boolean;
    };
    percentage: number;
    vocabulary: string;
    vocabularyUri?: string;
    narrative?: string;
  }>;
  custom_geographies?: Array<{
    id: string;
    name: string;
    code: string;
    percentage: number;
    vocabulary: string;
    vocabularyUri: string;
    narrative?: string;
  }>;
  locations?: Array<{
    id: string;
    location_name: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    city?: string;
    country_code?: string;
    location_type?: string;
    location_reach?: string;
    exactness?: string;
    location_class?: string;
    feature_designation?: string;
    [key: string]: any;
  }>;
}

interface ParsedField {
  fieldName: string;
  iatiPath: string;
  currentValue: any;
  importValue: any;
  selected: boolean;
  hasConflict: boolean;
  tab: string; // Which Activity Editor tab this field belongs to
  description?: string; // Optional description of what this field contains
  isFinancialItem?: boolean; // True for budget/transaction/disbursement summary items
  itemType?: 'budget' | 'transaction' | 'plannedDisbursement'; // Type of financial item
  itemIndex?: number; // Index in the array
  itemData?: any; // The actual data object
  isPolicyMarker?: boolean; // True for policy marker items
  policyMarkerData?: any; // The actual policy marker data object
  hasNonDacSectors?: boolean; // True if sector field has non-DAC sectors
  nonDacSectors?: any[]; // Array of non-DAC sectors
  isTagField?: boolean; // True for tag import field
  tagData?: Array<{
    vocabulary?: string;
    vocabularyUri?: string;
    code?: string;
    narrative?: string;
  }>; // Array of tag data from XML
  existingTags?: any[]; // Existing tags on the activity
  isConditionsField?: boolean; // True for conditions import field
  conditionsData?: {
    attached: boolean;
    conditions: Array<{
      type?: string;
      narrative?: string;
      narrativeLang?: string;
    }>;
  }; // Conditions data from XML
  isLocationItem?: boolean; // True for location items
  isFssItem?: boolean; // True for FSS import field
  fssData?: any; // The actual FSS data object
}

interface TabSection {
  tabId: string;
  tabName: string;
  fields: ParsedField[];
}

interface ImportStatus {
  stage: 'idle' | 'uploading' | 'parsing' | 'previewing' | 'importing' | 'complete' | 'error';
  message?: string;
  progress?: number;
}

// Helper functions for converting codes to labels
const getActivityStatusLabel = (code: string): { code: string, name: string } | null => {
  if (!code) return null;
  const statusMap: Record<string, string> = {
    '1': 'Pipeline',
    '2': 'Implementation', 
    '3': 'Finalisation',
    '4': 'Closed',
    '5': 'Cancelled',
    '6': 'Suspended'
  };
  return { code, name: statusMap[code] || `Status ${code}` };
};

const getCollaborationTypeLabel = (code: string): { code: string, name: string } | null => {
  if (!code) return null;
  const collabMap: Record<string, string> = {
    '1': 'Bilateral',
    '2': 'Multilateral (inflows)',
    '3': 'Multilateral (outflows)', 
    '4': 'Bilateral, core contributions to NGOs',
    '6': 'Private sector outflows',
    '7': 'Bilateral, ex-post reporting on NGOs',
    '8': 'Bilateral, triangular co-operation'
  };
  return { code, name: collabMap[code] || `Type ${code}` };
};

const getFinanceTypeLabel = (code: string): { code: string, name: string } | null => {
  if (!code) return null;
  const financeMap: Record<string, string> = {
    '110': 'Standard grant',
    '111': 'Subsidies to national private investors',
    '210': 'Interest subsidy',
    '211': 'Interest subsidy to national private exporters',
    '310': 'Capital subscription on deposit basis',
    '311': 'Capital subscription on encashment basis',
    '410': 'Aid loan excluding debt reorganisation',
    '411': 'Investment-related loan to developing countries',
    '412': 'Loan in a joint venture with the recipient',
    '413': 'Loan to national private investor',
    '414': 'Loan to national private exporter',
    '421': 'Standard loan',
    '422': 'Reimbursable grant',
    '423': 'Bonds',
    '424': 'Asset-backed securities',
    '425': 'Other debt securities',
    '431': 'Subordinated loan',
    '432': 'Preferred equity',
    '433': 'Other hybrid instruments',
    '451': 'Non-bank guarantee',
    '452': 'Insurance',
    '453': 'Foreign exchange hedging',
    '454': 'Other unfunded contingent liabilities',
    '911': 'Debt forgiveness: OOF claims (P)',
    '912': 'Debt forgiveness: OOF claims (I)',
    '913': 'Debt forgiveness: Private claims (P)',
    '914': 'Debt forgiveness: Private claims (I)',
    '915': 'Debt forgiveness: OOF claims (DSR)',
    '916': 'Debt forgiveness: Private claims (DSR)',
    '917': 'Debt forgiveness: OOF claims (DSR-P)',
    '918': 'Debt forgiveness: OOF claims (DSR-I)',
    '919': 'Debt forgiveness: Private claims (DSR-P)',
    '920': 'Debt forgiveness: Private claims (DSR-I)'
  };
  return { code, name: financeMap[code] || 'Unknown finance type' };
};

const getFlowTypeLabel = (code: string): { code: string, name: string } | null => {
  if (!code) return null;
  const flowMap: Record<string, string> = {
    '10': 'ODA',
    '20': 'OOF', 
    '21': 'Non-export credit',
    '22': 'Officially supported export credits',
    '30': 'Private grants',
    '35': 'Private market',
    '40': 'Non flow',
    '50': 'Other flows'
  };
  return { code, name: flowMap[code] || 'Unknown flow type' };
};

const getAidTypeLabel = (code: string): { code: string, name: string } | null => {
  if (!code) return null;
  const aidMap: Record<string, string> = {
    'A01': 'General budget support',
    'A02': 'Sector budget support',
    'B01': 'Core support to NGOs, other private bodies, PPPs and research institutes',
    'B02': 'Core contributions to multilateral institutions',
    'B03': 'Contributions to specific-purpose programmes and funds managed by international organisations',
    'B04': 'Basket funds/pooled funding',
    'C01': 'Project-type interventions',
    'D01': 'Donor country personnel',
    'D02': 'Other technical assistance',
    'E01': 'Scholarships/training in donor country',
    'E02': 'Imputed student costs',
    'F01': 'Debt relief',
    'G01': 'Administrative costs not included elsewhere',
    'H01': 'Development awareness',
    'H02': 'Refugees/asylum seekers in donor countries',
    'H03': 'Refugees/asylum seekers in donor countries (food aid)',
    'H04': 'Refugees/asylum seekers in donor countries (other emergency assistance)'
  };
  return { code, name: aidMap[code] || 'Unknown aid type' };
};

const getTiedStatusLabel = (code: string): { code: string, name: string } | null => {
  if (!code) return null;
  const tiedMap: Record<string, string> = {
    '3': 'Partially tied',
    '4': 'Tied',
    '5': 'Untied'
  };
  return { code, name: tiedMap[code] || 'Unknown tied status' };
};

const getOrganizationTypeLabel = (code: string): { code: string, name: string } | null => {
  if (!code) return null;
  const typeMap: Record<string, string> = {
    '10': 'Government',
    '11': 'Local Government',
    '12': 'Other Public Sector',
    '15': 'Other Public Sector',
    '21': 'International NGO',
    '22': 'National NGO',
    '23': 'Partner Country based NGO',
    '24': 'Partner Country based NGO',
    '30': 'Public Private Partnership',
    '40': 'Multilateral',
    '60': 'Foundation',
    '70': 'Private Sector',
    '71': 'Private Sector in Provider Country',
    '72': 'Private Sector in Aid Recipient Country',
    '73': 'Private Sector in Third Country',
    '80': 'Academic, Training and Research',
    '90': 'Other'
  };
  return { code, name: typeMap[code] || 'Unknown organization type' };
};

const getOrganizationRoleLabel = (code: string): { code: string, name: string } | null => {
  if (!code) return null;
  const roleMap: Record<string, string> = {
    '1': 'Funding',
    '2': 'Accountable',
    '3': 'Extending',
    '4': 'Implementing'
  };
  return { code, name: roleMap[code] || 'Other' };
};

const getActivityScopeLabel = (code: string): { code: string, name: string } | null => {
  if (!code) return null;
  const scopeMap: Record<string, string> = {
    '1': 'Global',
    '2': 'Regional',
    '3': 'Multi-national',
    '4': 'National',
    '5': 'Sub-national: Multi-first-level administrative areas',
    '6': 'Sub-national: Single first-level administrative area',
    '7': 'Sub-national: Single second-level administrative area',
    '8': 'Single location'
  };
  return { code, name: scopeMap[code] || `Scope ${code}` };
};

const getLanguageLabel = (code: string): { code: string, name: string } | null => {
  if (!code) return null;
  
  // Use comprehensive language data from LANGUAGES
  const allLanguages = LANGUAGES[0]?.types || [];
  const languageData = allLanguages.find(lang => lang.code.toLowerCase() === code.toLowerCase());
  
  const languageName = languageData?.name || 'Unknown Language';
  const languageCode = code.toLowerCase();
  
  return { code: languageCode, name: `${languageCode} ${languageName}` };
};

// Create a singleton cache for parsed XML data per activity
const parsedXmlCache = new Map<string, {
  selectedFile: File | null;
  parsedFields: ParsedField[];
  xmlContent: string;
  importStatus: ImportStatus;
}>();

export default function XmlImportTab({ activityId }: XmlImportTabProps) {
  console.log('🚨 XML IMPORT TAB IS RENDERING! ActivityId:', activityId);
  console.log('[XML Import Debug] XmlImportTab rendered with activityId:', activityId);
  
  // Get user data from useUser hook
  const { user } = useUser();
  
  // Check if we have cached data for this activity
  const cachedData = parsedXmlCache.get(activityId);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(cachedData?.selectedFile || null);
  const [parsedFields, setParsedFields] = useState<ParsedField[]>(cachedData?.parsedFields || []);
  const [importStatus, setImportStatus] = useState<ImportStatus>(cachedData?.importStatus || { stage: 'idle' });
  const [xmlContent, setXmlContent] = useState<string>(cachedData?.xmlContent || '');
  const [isParsing, setIsParsing] = useState(false);
  const [resultsImportSummary, setResultsImportSummary] = useState<any>(null);
  const [showXmlPreview, setShowXmlPreview] = useState(false);
  const [currentActivityData, setCurrentActivityData] = useState<ActivityData>({});
  const [activeImportTab, setActiveImportTab] = useState('basic');
  const [parsedActivity, setParsedActivity] = useState<any>(null);
  const [xmlUrl, setXmlUrl] = useState<string>('');
  const [importMethod, setImportMethod] = useState<'file' | 'url' | 'snippet'>('file');
  const [snippetContent, setSnippetContent] = useState<string>('');
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [isUsingPasteButton, setIsUsingPasteButton] = useState(false);
  const [showSectorRefinement, setShowSectorRefinement] = useState(false);
  const [sectorRefinementData, setSectorRefinementData] = useState<{
    originalSectors: any[];
    refinedSectors: any[];
  }>({ originalSectors: [], refinedSectors: [] });
  const [savedRefinedSectors, setSavedRefinedSectors] = useState<any[]>([]);
  const [xmlMetadata, setXmlMetadata] = useState<any>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugConsole, setShowDebugConsole] = useState(false);
  
  // Debug console capture
  const captureConsoleLog = (message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}${args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ') : ''}`;
    
    setDebugLogs(prev => [...prev, logMessage]);
    console.log(message, ...args);
  };

  const clearDebugLogs = () => {
    setDebugLogs([]);
  };

  const copyDebugLogs = () => {
    const logText = debugLogs.join('\n');
    navigator.clipboard.writeText(logText).then(() => {
      toast.success('Debug logs copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy debug logs');
    });
  };
  
  // External Publisher Detection States
  const [showExternalPublisherModal, setShowExternalPublisherModal] = useState(false);
  const [externalPublisherMeta, setExternalPublisherMeta] = useState<any>(null);
  const [userPublisherRefs, setUserPublisherRefs] = useState<string[]>([]);
  const [userOrgName, setUserOrgName] = useState<string>('');
  
  // Financial Detail Selection Modal States
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    type: 'budget' | 'transaction' | 'plannedDisbursement';
    index: number;
    data: any;
    fields: ParsedField[];
  } | null>(null);
  
  // Partners tab state
  const [activePartnerTab, setActivePartnerTab] = useState('reporting_org');
  
  // Basic tab state
  const [activeBasicTab, setActiveBasicTab] = useState('identifiers_ids');
  
  // Helper function to generate detailed fields for a specific financial item
  const generateDetailedFields = (itemType: 'budget' | 'transaction' | 'plannedDisbursement', itemData: any, itemIndex: number): ParsedField[] => {
    const detailFields: ParsedField[] = [];
    
    if (itemType === 'budget') {
      if (itemData.type) {
        detailFields.push({
          fieldName: 'Type',
          iatiPath: `@type`,
          currentValue: null,
          importValue: { code: itemData.type, name: 'Budget type classification' },
          selected: false,
          hasConflict: false,
          tab: 'budgets',
          description: `Budget type: ${itemData.type}`
        });
      }
      if (itemData.status) {
        detailFields.push({
          fieldName: 'Status',
          iatiPath: `@status`,
          currentValue: null,
          importValue: { code: itemData.status, name: 'Budget status (indicative/committed)' },
          selected: false,
          hasConflict: false,
          tab: 'budgets',
          description: `Budget status: ${itemData.status}`
        });
      }
      if (itemData.period?.start) {
        detailFields.push({
          fieldName: 'Period Start',
          iatiPath: `period/period-start/@iso-date`,
          currentValue: null,
          importValue: itemData.period.start,
          selected: false,
          hasConflict: false,
          tab: 'budgets',
          description: 'Budget period start date'
        });
      }
      if (itemData.period?.end) {
        detailFields.push({
          fieldName: 'Period End',
          iatiPath: `period/period-end/@iso-date`,
          currentValue: null,
          importValue: itemData.period.end,
          selected: false,
          hasConflict: false,
          tab: 'budgets',
          description: 'Budget period end date'
        });
      }
      if (itemData.value !== undefined) {
        detailFields.push({
          fieldName: 'Value',
          iatiPath: `value`,
          currentValue: null,
          importValue: { code: itemData.value?.toLocaleString() || '0', name: `Amount: ${itemData.value?.toLocaleString() || '0'}` },
          selected: false,
          hasConflict: false,
          tab: 'budgets',
          description: 'Budget monetary value'
        });
      }
      if (itemData.currency) {
        detailFields.push({
          fieldName: 'Currency',
          iatiPath: `value/@currency`,
          currentValue: null,
          importValue: { code: itemData.currency, name: 'ISO 4217 currency code' },
          selected: false,
          hasConflict: false,
          tab: 'budgets',
          description: `Budget currency: ${itemData.currency}`
        });
      }
      if (itemData.valueDate) {
        detailFields.push({
          fieldName: 'Value Date',
          iatiPath: `value/@value-date`,
          currentValue: null,
          importValue: itemData.valueDate,
          selected: false,
          hasConflict: false,
          tab: 'budgets',
          description: 'Budget value date'
        });
      }
    } else if (itemType === 'plannedDisbursement') {
      // Add planned disbursement detailed fields
      if (itemData.type) {
        detailFields.push({
          fieldName: 'Type',
          iatiPath: `@type`,
          currentValue: null,
          importValue: { code: itemData.type, name: 'Planned disbursement type' },
          selected: false,
          hasConflict: false,
          tab: 'planned_disbursements',
          description: `Planned disbursement type: ${itemData.type}`
        });
      }
      // Add more planned disbursement fields as needed...
    } else if (itemType === 'transaction') {
      // Add transaction detailed fields
      if (itemData.ref) {
        detailFields.push({
          fieldName: 'Transaction Reference',
          iatiPath: `transaction/@ref`,
          currentValue: null,
          importValue: itemData.ref,
          selected: false,
          hasConflict: false,
          tab: 'transactions',
          description: `Transaction reference identifier`
        });
      }
      
      if (itemData.type) {
        const transactionTypes: Record<string, string> = {
          '1': 'Incoming Funds',
          '2': 'Commitment',
          '3': 'Disbursement',
          '4': 'Expenditure',
          '5': 'Interest Repayment',
          '6': 'Loan Repayment',
          '7': 'Reimbursement',
          '8': 'Purchase of Equity',
          '9': 'Sale of Equity',
          '10': 'Credit Guarantee',
          '11': 'Incoming Commitment',
          '12': 'Outgoing Pledge',
          '13': 'Incoming Pledge'
        };
        
        detailFields.push({
          fieldName: 'Transaction Type',
          iatiPath: `transaction/@type`,
          currentValue: null,
          importValue: { code: itemData.type, name: transactionTypes[itemData.type] || 'Unknown' },
          selected: true,
          hasConflict: false,
          tab: 'transactions',
          description: 'Type of transaction'
        });
      }
      
      if (itemData.date) {
        detailFields.push({
          fieldName: 'Transaction Date',
          iatiPath: `transaction/transaction-date/@iso-date`,
          currentValue: null,
          importValue: itemData.date,
          selected: true,
          hasConflict: false,
          tab: 'transactions',
          description: 'Date of the transaction'
        });
      }
      
      if (itemData.value !== undefined) {
        detailFields.push({
          fieldName: 'Value',
          iatiPath: `transaction/value`,
          currentValue: null,
          importValue: itemData.value,
          selected: true,
          hasConflict: false,
          tab: 'transactions',
          description: `Transaction amount`
        });
      }
      
      if (itemData.currency) {
        detailFields.push({
          fieldName: 'Currency',
          iatiPath: `transaction/value/@currency`,
          currentValue: null,
          importValue: itemData.currency,
          selected: true,
          hasConflict: false,
          tab: 'transactions',
          description: 'Transaction currency'
        });
      }
      
      if (itemData.valueDate) {
        detailFields.push({
          fieldName: 'Value Date',
          iatiPath: `transaction/value/@value-date`,
          currentValue: null,
          importValue: itemData.valueDate,
          selected: false,
          hasConflict: false,
          tab: 'transactions',
          description: 'Date to be used for currency conversion'
        });
      }
      
      if (itemData.description) {
        detailFields.push({
          fieldName: 'Description',
          iatiPath: `transaction/description/narrative`,
          currentValue: null,
          importValue: itemData.description,
          selected: true,
          hasConflict: false,
          tab: 'transactions',
          description: 'Transaction description'
        });
      }
      
      if (itemData.providerOrg) {
        detailFields.push({
          fieldName: 'Provider Organization',
          iatiPath: `transaction/provider-org`,
          currentValue: null,
          importValue: itemData.providerOrg.name || itemData.providerOrg.ref || 'Unknown',
          selected: false,
          hasConflict: false,
          tab: 'transactions',
          description: 'Organization providing the funds'
        });
      }
      
      if (itemData.receiverOrg) {
        detailFields.push({
          fieldName: 'Receiver Organization',
          iatiPath: `transaction/receiver-org`,
          currentValue: null,
          importValue: itemData.receiverOrg.name || itemData.receiverOrg.ref || 'Unknown',
          selected: false,
          hasConflict: false,
          tab: 'transactions',
          description: 'Organization receiving the funds'
        });
      }
      
      if (itemData.disbursementChannel) {
        detailFields.push({
          fieldName: 'Disbursement Channel',
          iatiPath: `transaction/disbursement-channel/@code`,
          currentValue: null,
          importValue: itemData.disbursementChannel,
          selected: false,
          hasConflict: false,
          tab: 'transactions',
          description: 'Channel through which funds will be disbursed'
        });
      }
      
      if (itemData.flowType) {
        detailFields.push({
          fieldName: 'Flow Type',
          iatiPath: `transaction/flow-type/@code`,
          currentValue: null,
          importValue: itemData.flowType,
          selected: false,
          hasConflict: false,
          tab: 'transactions',
          description: 'Type of financial flow'
        });
      }
      
      if (itemData.financeType) {
        detailFields.push({
          fieldName: 'Finance Type',
          iatiPath: `transaction/finance-type/@code`,
          currentValue: null,
          importValue: itemData.financeType,
          selected: false,
          hasConflict: false,
          tab: 'transactions',
          description: 'Type of finance'
        });
      }
      
      if (itemData.aidType) {
        detailFields.push({
          fieldName: 'Aid Type',
          iatiPath: `transaction/aid-type/@code`,
          currentValue: null,
          importValue: itemData.aidType.code || itemData.aidType,
          selected: false,
          hasConflict: false,
          tab: 'transactions',
          description: 'Type of aid'
        });
      }
      
      if (itemData.tiedStatus) {
        detailFields.push({
          fieldName: 'Tied Status',
          iatiPath: `transaction/tied-status/@code`,
          currentValue: null,
          importValue: itemData.tiedStatus,
          selected: false,
          hasConflict: false,
          tab: 'transactions',
          description: 'Whether aid is tied to procurement from donor country'
        });
      }
      
      if (itemData.humanitarian !== undefined) {
        detailFields.push({
          fieldName: 'Humanitarian',
          iatiPath: `transaction/@humanitarian`,
          currentValue: null,
          importValue: itemData.humanitarian ? 'Yes' : 'No',
          selected: false,
          hasConflict: false,
          tab: 'transactions',
          description: 'Whether this is a humanitarian transaction'
        });
      }
    }
    
    return detailFields;
  };
  
  // Function to handle opening the financial detail modal
  const openFinancialDetailModal = (field: ParsedField) => {
    if (field.isFinancialItem && field.itemType && field.itemData !== undefined && field.itemIndex !== undefined) {
      const detailFields = generateDetailedFields(field.itemType, field.itemData, field.itemIndex);
      setSelectedItem({
        type: field.itemType,
        index: field.itemIndex,
        data: field.itemData,
        fields: detailFields
      });
      setShowDetailModal(true);
    }
  };
  
  const [existingActivity, setExistingActivity] = useState<any>(null);
  
  // Fetch user and organization data
  useEffect(() => {
    const fetchOrgData = async () => {
      console.log('[XML Import] User data from hook:', user);
      
      // First set user's organization name if available
      if (user?.organisation) {
        setUserOrgName(user.organisation);
      } else if (user?.organization?.name) {
        setUserOrgName(user.organization.name);
      }
      
      // Now fetch the organization's IATI org ID
      if (user?.organisation || user?.organization?.name) {
        try {
          // Query organizations table to get IATI org ID
          const orgName = user?.organisation || user?.organization?.name || '';
          const response = await fetch(`/api/organizations?search=${encodeURIComponent(orgName || '')}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log('[XML Import] Organizations response:', data);
            
            // Find the matching organization
            const orgs = Array.isArray(data) ? data : data.organizations || [];
            const matchingOrg = orgs.find((org: any) => 
              org.name?.toLowerCase() === orgName?.toLowerCase() ||
              org.acronym?.toLowerCase() === orgName?.toLowerCase()
            );
            
            if (matchingOrg) {
              console.log('[XML Import] Found matching org:', matchingOrg);
              
              // Set the organization name properly
              setUserOrgName(matchingOrg.name || orgName);
              
              // Set IATI publisher refs if available
              if (matchingOrg.iati_org_id) {
                // IATI org IDs can be comma-separated or single values
                const refs = matchingOrg.iati_org_id.split(',').map((ref: string) => ref.trim());
                setUserPublisherRefs(refs);
                console.log('[XML Import] Set publisher refs:', refs);
              } else if (matchingOrg.acronym === 'AFD' || matchingOrg.name?.includes('AFD')) {
                // Special case for AFD
                setUserPublisherRefs(['FR-AFD', 'FR-3']);
                console.log('[XML Import] Set AFD publisher refs');
              }
            } else {
              // If no exact match, but we know it's AFD
              if (orgName?.includes('AFD') || orgName?.includes('Agence Française')) {
                setUserOrgName('Agence Française de Développement');
                setUserPublisherRefs(['FR-AFD', 'FR-3']);
                console.log('[XML Import] Defaulting to AFD publisher refs');
              }
            }
          }
        } catch (error) {
          console.error('[XML Import] Error fetching organization data:', error);
          
          // Default to AFD if we know the user is from AFD
          if (user?.organisation?.includes('AFD') || user?.organisation?.includes('Agence Française')) {
            setUserOrgName('Agence Française de Développement');
            setUserPublisherRefs(['FR-AFD', 'FR-3']);
          }
        }
      }
    };
    
    if (user) {
      fetchOrgData();
    }
  }, [user]);
  
  // Save state to cache whenever it changes
  useEffect(() => {
    if (activityId && (selectedFile || parsedFields.length > 0)) {
      parsedXmlCache.set(activityId, {
        selectedFile,
        parsedFields,
        xmlContent,
        importStatus
      });
    }
  }, [activityId, selectedFile, parsedFields, xmlContent, importStatus]);

  // Debug logging
  console.log('[XML Import Debug] Component state:', {
    hasSelectedFile: !!selectedFile,
    parsedFieldsCount: parsedFields.length,
    selectedFieldsCount: parsedFields.filter(f => f.selected).length,
    importStage: importStatus.stage,
    activityId
  });

  // Fetch current activity data
  useEffect(() => {
    const fetchActivityData = async () => {
      if (!activityId) return;
      
      try {
        // Fetch full activity data to include location data
        console.log('[XmlImportTab] Fetching activity data for:', activityId);
        const data = await fetchBasicActivityWithCache(activityId);
        console.log('[XmlImportTab] Fetched activity data:', data);
        console.log('[XmlImportTab] Location data:', {
          recipient_countries: data.recipient_countries,
          recipient_regions: data.recipient_regions,
          custom_geographies: data.custom_geographies
        });

        
        // Also fetch current activity locations
        
        console.log('[XmlImportTab] Fetching current activity locations...');
        
        const locationsResponse = await fetch(`/api/activities/${activityId}/locations`);
        
        const locationsData = locationsResponse.ok ? await locationsResponse.json() : { locations: [] };
        const currentLocations = locationsData.locations || [];
        
        console.log('[XmlImportTab] Current locations:', currentLocations);

        // Fetch current participating organizations
        console.log('[XmlImportTab] Fetching current participating organizations...');
        
        const participatingOrgsResponse = await fetch(`/api/activities/${activityId}/participating-organizations`);
        
        const currentParticipatingOrgs = participatingOrgsResponse.ok ? await participatingOrgsResponse.json() : [];
        
        console.log('[XmlImportTab] Current participating organizations:', currentParticipatingOrgs);
        
        
        // Map the data correctly - the API returns both camelCase and snake_case versions
        setCurrentActivityData({
          id: data.id,
          title_narrative: data.title_narrative || data.title,
          description_narrative: data.description_narrative || data.description,
          description_objectives: data.description_objectives || data.descriptionObjectives,
          description_target_groups: data.description_target_groups || data.descriptionTargetGroups,
          description_other: data.description_other || data.descriptionOther,
          planned_start_date: data.planned_start_date || data.plannedStartDate,
          planned_end_date: data.planned_end_date || data.plannedEndDate,
          actual_start_date: data.actual_start_date || data.actualStartDate,
          actual_end_date: data.actual_end_date || data.actualEndDate,
          activity_status: data.activity_status || data.activityStatus,
          collaboration_type: data.collaboration_type || data.collaborationType,
          activity_scope: data.activity_scope || data.activityScope,
          language: data.language,
          iati_identifier: data.iati_identifier || data.iatiIdentifier || data.iatiId,
          default_currency: data.default_currency || data.defaultCurrency,
          defaultAidType: data.defaultAidType,
          defaultFinanceType: data.defaultFinanceType,
          defaultFlowType: data.defaultFlowType,
          defaultTiedStatus: data.defaultTiedStatus,
          sectors: data.sectors || [],
          recipient_countries: data.recipient_countries || [],
          recipient_regions: data.recipient_regions || [],
          custom_geographies: data.custom_geographies || [],
          locations: currentLocations || [],
          participatingOrgs: currentParticipatingOrgs || [],
        });
        console.log('[XmlImportTab] Set current activity data with title:', data.title_narrative || data.title);
      } catch (error) {
        console.error('[XmlImportTab] Error fetching activity data:', error);
        // If basic endpoint fails, try the full endpoint as fallback
        try {
          console.log('[XmlImportTab] Trying full endpoint as fallback');
          const response = await fetch(`/api/activities/${activityId}`);
          if (response.ok) {
            const data = await response.json();
            
            // Also try to fetch participating orgs in fallback
            const participatingOrgsResponse = await fetch(`/api/activities/${activityId}/participating-organizations`);
            const currentParticipatingOrgs = participatingOrgsResponse.ok ? await participatingOrgsResponse.json() : [];
            
            setCurrentActivityData({
              id: data.id,
              title_narrative: data.title_narrative || data.title,
              description_narrative: data.description_narrative || data.description,
          description_objectives: data.description_objectives || data.descriptionObjectives,
          description_target_groups: data.description_target_groups || data.descriptionTargetGroups,
          description_other: data.description_other || data.descriptionOther,
              planned_start_date: data.planned_start_date || data.plannedStartDate,
              planned_end_date: data.planned_end_date || data.plannedEndDate,
              actual_start_date: data.actual_start_date || data.actualStartDate,
              actual_end_date: data.actual_end_date || data.actualEndDate,
              activity_status: data.activity_status || data.activityStatus,
              collaboration_type: data.collaboration_type || data.collaborationType,
              activity_scope: data.activity_scope || data.activityScope,
              language: data.language,
              iati_identifier: data.iati_identifier || data.iatiIdentifier || data.iatiId,
              default_currency: data.default_currency || data.defaultCurrency,
              defaultAidType: data.defaultAidType,
              defaultFinanceType: data.defaultFinanceType,
              defaultFlowType: data.defaultFlowType,
              defaultTiedStatus: data.defaultTiedStatus,
              sectors: data.sectors || [],
              recipient_countries: data.recipient_countries || [],
              recipient_regions: data.recipient_regions || [],
              custom_geographies: data.custom_geographies || [],
              participatingOrgs: currentParticipatingOrgs || [],
            });
            console.log('[XmlImportTab] Fallback successful, got title:', data.title_narrative || data.title);
          }
        } catch (fallbackError) {
          console.error('[XmlImportTab] Fallback also failed:', fallbackError);
        }
      }
    };

    fetchActivityData();
  }, [activityId]);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('[XML Import Debug] File selected:', file?.name, 'Type:', file?.type);
    if (file) {
      if (file.type !== 'text/xml' && !file.name.endsWith('.xml')) {
        console.log('[XML Import Debug] Invalid file type:', file.type);
        toast.error('Please select a valid XML file');
        return;
      }
      console.log('[XML Import Debug] Setting selected file and resetting state');
      setSelectedFile(file);
      setImportStatus({ stage: 'idle' });
      setParsedFields([]);
      setXmlMetadata(null);
    }
  };

  // Handle paste from clipboard
  const handlePasteUrl = async (e?: React.MouseEvent) => {
    // Prevent event bubbling to avoid triggering onPaste on input
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Set flag to prevent onPaste handler from running
    setIsUsingPasteButton(true);
    
    try {
      // Check if clipboard API is available and supported
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        toast.error('Clipboard API not supported in this browser. Please paste manually (Ctrl+V)');
        return;
      }

      // Try to read clipboard with better error handling
      const text = await navigator.clipboard.readText();
      console.log('[XML Import Debug] Paste button - clipboard text:', text);
      if (text && text.trim()) {
        // Extract the clean URL by finding the first occurrence of the URL pattern
        const urlPattern = /https?:\/\/[^\s]+/;
        const match = text.match(urlPattern);
        const cleanUrl = match ? match[0] : text.trim();
        
        console.log('[XML Import Debug] Paste button - clean URL:', cleanUrl);
        setXmlUrl(cleanUrl);
        toast.success('URL pasted from clipboard');
      } else {
        toast.error('No text found in clipboard');
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error);
      
      // Handle specific error types
      if (error instanceof TypeError) {
        toast.error('Clipboard access not supported. Please paste manually (Ctrl+V)');
      } else if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          toast.error('Clipboard access denied. Please paste manually (Ctrl+V)');
        } else {
          toast.error('Clipboard access failed. Please paste manually (Ctrl+V)');
        }
      } else {
        toast.error('Clipboard access not available. Please paste manually (Ctrl+V)');
      }
    } finally {
      // Reset flag after a short delay
      setTimeout(() => setIsUsingPasteButton(false), 100);
    }
  };

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type !== 'text/xml' && !file.name.endsWith('.xml')) {
        toast.error('Please select a valid XML file');
        return;
      }
      setSelectedFile(file);
      setImportStatus({ stage: 'idle' });
      setParsedFields([]);
      setXmlMetadata(null);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  // Fetch XML from URL via server-side proxy to avoid CORS issues
  const fetchXmlFromUrl = async (url: string): Promise<string> => {
    try {
      console.log('[XML Import Debug] Fetching XML from URL via proxy:', url);
      console.log('[XML Import Debug] URL length:', url.length);
      console.log('[XML Import Debug] URL first 100 chars:', url.substring(0, 100));
      console.log('[XML Import Debug] URL last 100 chars:', url.substring(url.length - 100));
      
      // Use our server-side API to fetch the XML
      const response = await fetch('/api/xml/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || `Failed to fetch XML: ${response.status} ${response.statusText}`;
        
        // Provide more helpful error messages based on status code
        if (response.status === 404) {
          throw new Error(`XML file not found at this URL. Please check that the URL is correct and the file exists.`);
        } else if (response.status === 403) {
          throw new Error(`Access denied to XML file. The server may require authentication or block automated requests.`);
        } else if (response.status === 500) {
          throw new Error(`Server error while fetching XML. The remote server may be temporarily unavailable.`);
        } else {
          throw new Error(errorMessage);
        }
      }

      const data = await response.json();
      
      if (!data.content || !data.content.trim()) {
        throw new Error('Empty XML content received from URL');
      }

      console.log('[XML Import Debug] Successfully fetched XML via proxy, size:', data.size);
      return data.content;
    } catch (error) {
      console.error('[XML Import Debug] Error fetching XML from URL:', error);
      throw new Error(`Failed to fetch XML from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Helper function to detect snippet type
  const detectSnippetType = (content: string): string => {
    const trimmed = content.trim();
    if (trimmed.includes('<location')) return 'location';
    if (trimmed.includes('<transaction')) return 'transaction';
    if (trimmed.includes('<sector')) return 'sector';
    if (trimmed.includes('<recipient-country')) return 'recipient-country';
    if (trimmed.includes('<recipient-region')) return 'recipient-region';
    if (trimmed.includes('<participating-org') || trimmed.includes('<reporting-org')) return 'organization';
    if (trimmed.includes('<contact-info')) return 'contact';
    if (trimmed.includes('<policy-marker')) return 'policy-marker';
    if (trimmed.includes('<budget')) return 'budget';
    if (trimmed.includes('<iati-activity')) return 'full-activity';
    return 'unknown';
  };

  // Helper function to wrap snippet in proper IATI structure if needed
  const wrapSnippetIfNeeded = (content: string): string => {
    // If it already looks like a complete IATI XML, return as-is
    if (content.includes('<iati-activities') || content.includes('<iati-activity')) {
      // If it's just an activity without the root, wrap it
      if (!content.includes('<iati-activities')) {
        return `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03">
  ${content}
</iati-activities>`;
      }
      return content;
    }
    
    // Otherwise, wrap the snippet in a minimal activity structure
    // Use minimal required fields to avoid polluting the import
    return `<?xml version="1.0" encoding="UTF-8"?>
<iati-activities version="2.03">
  <iati-activity>
    <iati-identifier>SNIPPET-TEMP</iati-identifier>
    <title>
      <narrative>Snippet</narrative>
    </title>
    ${content}
  </iati-activity>
</iati-activities>`;
  };

  // Parse XML file or URL or Snippet
  const parseXmlFile = async () => {
    console.log('[XML Import Debug] parseXmlFile called, method:', importMethod);
    
    if (importMethod === 'file' && !selectedFile) {
      console.log('[XML Import Debug] No selected file, returning');
      return;
    }
    
    if (importMethod === 'url' && !xmlUrl.trim()) {
      console.log('[XML Import Debug] No URL provided, returning');
      toast.error('Please enter a valid XML URL');
      return;
    }
    
    if (importMethod === 'snippet' && !snippetContent.trim()) {
      console.log('[XML Import Debug] No snippet content, returning');
      toast.error('Please paste some XML content');
      return;
    }

    // Ensure we have the latest activity data before parsing
    if (!currentActivityData.id && activityId) {
      console.log('[XML Import Debug] Fetching activity data before parsing');
      try {
        const data = await fetchBasicActivityWithCache(activityId);
        setCurrentActivityData({
          id: data.id,
          title_narrative: data.title_narrative || data.title,
          description_narrative: data.description_narrative || data.description,
          description_objectives: data.description_objectives || data.descriptionObjectives,
          description_target_groups: data.description_target_groups || data.descriptionTargetGroups,
          description_other: data.description_other || data.descriptionOther,
          planned_start_date: data.planned_start_date || data.plannedStartDate,
          planned_end_date: data.planned_end_date || data.plannedEndDate,
          actual_start_date: data.actual_start_date || data.actualStartDate,
          actual_end_date: data.actual_end_date || data.actualEndDate,
          activity_status: data.activity_status || data.activityStatus,
          collaboration_type: data.collaboration_type || data.collaborationType,
          activity_scope: data.activity_scope || data.activityScope,
          language: data.language,
          iati_identifier: data.iati_identifier || data.iatiIdentifier || data.iatiId,
          default_currency: data.default_currency || data.defaultCurrency,
          defaultAidType: data.defaultAidType,
          defaultFinanceType: data.defaultFinanceType,
          defaultFlowType: data.defaultFlowType,
          defaultTiedStatus: data.defaultTiedStatus,
          sectors: data.sectors || [],
          recipient_countries: data.recipient_countries || [],
          recipient_regions: data.recipient_regions || [],
          custom_geographies: data.custom_geographies || [],
              locations: currentLocations || [],
        });
      } catch (error) {
        console.error('[XML Import Debug] Failed to fetch activity data:', error);
      }
    }

    console.log('[XML Import Debug] Current activity data:', currentActivityData);
    console.log('[XML Import Debug] Setting status to uploading');
    setImportStatus({ stage: 'uploading', progress: 10 });

    setIsParsing(true);
    try {
      let content: string;
      let fileToCheck: File | null = null;
      
      if (importMethod === 'file' && selectedFile) {
        // Check file size limit (50MB)
        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
        if (selectedFile.size > MAX_FILE_SIZE) {
          throw new Error(`File size (${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum allowed size of 50MB. Please use a smaller file or split it into multiple files.`);
        }
        
        // Read file content
        console.log('[XML Import Debug] Reading file content, size:', selectedFile.size);
        setImportStatus({ stage: 'uploading', progress: 30 });
        content = await selectedFile.text();
        fileToCheck = selectedFile;
      } else if (importMethod === 'url') {
        // Fetch from URL
        console.log('[XML Import Debug] Fetching from URL');
        setImportStatus({ stage: 'uploading', progress: 30 });
        content = await fetchXmlFromUrl(xmlUrl.trim());
        // Create a File object from the fetched content for metadata extraction
        fileToCheck = new File([content], 'fetched.xml', { type: 'text/xml' });
      } else {
        // Use snippet content
        console.log('[XML Import Debug] Using snippet content');
        setImportStatus({ stage: 'uploading', progress: 30 });
        
        // Detect snippet type BEFORE wrapping
        const snippetType = detectSnippetType(snippetContent.trim());
        console.log('[XML Import Debug] Detected snippet type:', snippetType);
        console.log('[XML Import Debug] Original snippet content:', snippetContent.trim().substring(0, 200));
        
        // Store snippet type in state for filtering later
        (window as any).__snippetType = snippetType;
        
        // Show toast with detected snippet type
        if (snippetType !== 'unknown') {
          toast.info(`Detected ${snippetType} snippet - showing only ${snippetType} fields`, {
            duration: 3000
          });
        }
        
        // Wrap snippet if needed to make it a valid IATI XML
        const wrappedContent = wrapSnippetIfNeeded(snippetContent.trim());
        console.log('[XML Import Debug] Wrapped content:', wrappedContent.substring(0, 500));
        content = wrappedContent;
        // Create a File object from the snippet for metadata extraction
        fileToCheck = new File([content], 'snippet.xml', { type: 'text/xml' });
      }
      
      setXmlContent(content);
      
      console.log('[XML Import Debug] Setting status to parsing');
      setImportStatus({ stage: 'parsing', progress: 40 });
      
      // Check if content is HTML instead of XML (common error response)
      if (content.trim().startsWith('<!DOCTYPE html') || content.trim().startsWith('<html')) {
        console.error('[XML Import] Received HTML instead of XML - likely an error page');
        throw new Error('The file appears to be an HTML page instead of XML. This can happen if the file is too large, the connection timed out, or there was a server error. Please try with a smaller file or check your internet connection.');
      }
      
      // Additional check for common HTML patterns
      if (content.includes('<meta') && content.includes('<head>') && content.includes('</head>')) {
        console.error('[XML Import] Detected HTML structure in response');
        throw new Error('Received an HTML error page instead of XML data. Please ensure the XML file is valid and not too large (max 50MB).');
      }
      
      // Validate XML structure first
      setImportStatus({ stage: 'parsing', progress: 50 });
      const validation = validateIATIXML(content);
      if (!validation.isValid) {
        throw new Error(`Invalid IATI XML: ${validation.errors.join(', ')}`);
      }

      // Parse the IATI XML
      console.log('[XML Import Debug] Parsing IATI XML with real parser');
      setImportStatus({ stage: 'parsing', progress: 60 });
      const parser = new IATIXMLParser(content);
      const parsedActivity = parser.parseActivity();
      
      // Store parsed activity data in state for use by import function
      setParsedActivity(parsedActivity);
      
      console.log('[XML Import Debug] Parsed activity data:', parsedActivity);
      
      // Update progress for field processing
      setImportStatus({ stage: 'parsing', progress: 80 });

      // Helper function to determine if a field should be selected by default
      const shouldSelectField = (currentValue: any, importValue: any): boolean => {
        // Select if current value is empty/null/undefined OR if values differ
        if (!currentValue) return true;
        
        // Handle object comparison (e.g., for coded fields that return {code, name})
        if (typeof currentValue === 'object' && typeof importValue === 'object') {
          if (currentValue === null || importValue === null) {
            return currentValue !== importValue;
          }
          // Compare by code if both have code property, otherwise deep compare
          if (currentValue.code !== undefined && importValue.code !== undefined) {
            return currentValue.code !== importValue.code;
          }
          // For other objects, compare by JSON serialization
          return JSON.stringify(currentValue) !== JSON.stringify(importValue);
        }
        
        // Handle primitive comparison
        return currentValue !== importValue;
      };

      const hasConflict = (currentValue: any, importValue: any): boolean => {
        // Only show conflict if current value exists and differs from import value
        if (!currentValue) return false;
        
        // Handle object comparison (e.g., for coded fields that return {code, name})
        if (typeof currentValue === 'object' && typeof importValue === 'object') {
          if (currentValue === null || importValue === null) {
            return currentValue !== importValue;
          }
          // Compare by code if both have code property, otherwise deep compare
          if (currentValue.code !== undefined && importValue.code !== undefined) {
            return currentValue.code !== importValue.code;
          }
          // For other objects, compare by JSON serialization
          return JSON.stringify(currentValue) !== JSON.stringify(importValue);
        }
        
        // Handle primitive comparison
        return currentValue !== importValue;
      };

      // Create fields from parsed data organized by tabs
      const fields: ParsedField[] = [];
      
      // Check if this is a snippet import and what type
      const snippetType = (window as any).__snippetType;
      const isSnippetImport = importMethod === 'snippet' && snippetType;
      console.log('[XML Import Debug] Is snippet import:', isSnippetImport, 'Type:', snippetType);

      // === BASIC INFO TAB ===
      
      // Skip wrapper fields if this is a snippet import (these come from the wrapper, not the user's snippet)
      if (parsedActivity.iatiIdentifier && (!isSnippetImport || parsedActivity.iatiIdentifier !== 'SNIPPET-TEMP')) {
        const currentValue = currentActivityData.iati_identifier || null;
        
        fields.push({
          fieldName: 'IATI Identifier',
          iatiPath: 'iati-activity/iati-identifier',
          currentValue: currentValue,
          importValue: parsedActivity.iatiIdentifier,
          selected: shouldSelectField(currentValue, parsedActivity.iatiIdentifier),
          hasConflict: hasConflict(currentValue, parsedActivity.iatiIdentifier),
          tab: 'identifiers_ids',
          description: 'Unique identifier for this activity'
        });
      }

      if (parsedActivity.otherIdentifier) {
        const currentValue = currentActivityData['other_identifier' as keyof typeof currentActivityData] || null;
        
        fields.push({
          fieldName: 'Activity ID',
          iatiPath: 'iati-activity/other-identifier',
          currentValue: currentValue,
          importValue: parsedActivity.otherIdentifier,
          selected: shouldSelectField(currentValue, parsedActivity.otherIdentifier),
          hasConflict: hasConflict(currentValue, parsedActivity.otherIdentifier),
          tab: 'identifiers_ids',
          description: 'Other identifier for this activity (e.g., internal project ID)'
        });
      }

      // Skip wrapper title if this is a snippet import
      if (parsedActivity.title && (!isSnippetImport || parsedActivity.title !== 'Snippet')) {
        const currentValue = currentActivityData.title_narrative || null;
        console.log('[XmlImportTab] Comparing titles:', {
          current: currentValue,
          import: parsedActivity.title,
          shouldSelect: shouldSelectField(currentValue, parsedActivity.title)
        });
        fields.push({
          fieldName: 'Activity Title',
          iatiPath: 'iati-activity/title/narrative',
          currentValue: currentValue,
          importValue: parsedActivity.title,
          selected: shouldSelectField(currentValue, parsedActivity.title),
          hasConflict: hasConflict(currentValue, parsedActivity.title),
          tab: 'other',
          description: 'Main title/name of the activity'
        });
      }

      // Skip description fields for snippet imports unless it's a full activity
      if (parsedActivity.description && (!isSnippetImport || snippetType === 'full-activity')) {
        const currentValue = currentActivityData.description_narrative || null;
        console.log('[Import Preview] Adding general description field:', {
          current: currentValue?.substring(0, 50),
          import: parsedActivity.description?.substring(0, 50)
        });
        fields.push({
          fieldName: 'Activity Description',
          iatiPath: 'iati-activity/description[@type="1"]/narrative',
          currentValue: currentValue,
          importValue: parsedActivity.description,
          selected: shouldSelectField(currentValue, parsedActivity.description),
          hasConflict: hasConflict(currentValue, parsedActivity.description),
          tab: 'descriptions',
          description: 'General activity description (IATI type="1")'
        });
      }

      if (parsedActivity.descriptionObjectives && (!isSnippetImport || snippetType === 'full-activity')) {
        const currentValue = currentActivityData.description_objectives || null;
        console.log('[Import Preview] Adding objectives description field:', {
          current: currentValue?.substring(0, 50),
          import: parsedActivity.descriptionObjectives?.substring(0, 50)
        });
        fields.push({
          fieldName: 'Activity Description - Objectives',
          iatiPath: 'iati-activity/description[@type="2"]/narrative',
          currentValue: currentValue,
          importValue: parsedActivity.descriptionObjectives,
          selected: shouldSelectField(currentValue, parsedActivity.descriptionObjectives),
          hasConflict: hasConflict(currentValue, parsedActivity.descriptionObjectives),
          tab: 'descriptions',
          description: 'Objectives of the activity (IATI type="2")'
        });
      }

      if (parsedActivity.descriptionTargetGroups && (!isSnippetImport || snippetType === 'full-activity')) {
        const currentValue = currentActivityData.description_target_groups || null;
        console.log('[Import Preview] Adding target groups description field:', {
          current: currentValue?.substring(0, 50),
          import: parsedActivity.descriptionTargetGroups?.substring(0, 50)
        });
        fields.push({
          fieldName: 'Activity Description - Target Groups',
          iatiPath: 'iati-activity/description[@type="3"]/narrative',
          currentValue: currentValue,
          importValue: parsedActivity.descriptionTargetGroups,
          selected: shouldSelectField(currentValue, parsedActivity.descriptionTargetGroups),
          hasConflict: hasConflict(currentValue, parsedActivity.descriptionTargetGroups),
          tab: 'descriptions',
          description: 'Target groups and beneficiaries (IATI type="3")'
        });
      }

      if (parsedActivity.descriptionOther && (!isSnippetImport || snippetType === 'full-activity')) {
        const currentValue = currentActivityData.description_other || null;
        fields.push({
          fieldName: 'Activity Description - Other',
          iatiPath: 'iati-activity/description[@type="4"]/narrative',
          currentValue: currentValue,
          importValue: parsedActivity.descriptionOther,
          selected: shouldSelectField(currentValue, parsedActivity.descriptionOther),
          hasConflict: hasConflict(currentValue, parsedActivity.descriptionOther),
          tab: 'descriptions',
          description: 'Other relevant information'
        });
      }

      if (parsedActivity.collaborationType) {
        const currentCollabLabel = currentActivityData.collaboration_type ? getCollaborationTypeLabel(currentActivityData.collaboration_type) : null;
        const importCollabLabel = getCollaborationTypeLabel(parsedActivity.collaborationType);
        fields.push({
          fieldName: 'Collaboration Type',
          iatiPath: 'iati-activity/collaboration-type',
          currentValue: currentCollabLabel,
          importValue: importCollabLabel,
          selected: shouldSelectField(currentCollabLabel, importCollabLabel),
          hasConflict: hasConflict(currentCollabLabel, importCollabLabel),
          tab: 'other',
          description: 'Type of collaboration arrangement'
        });
      }

      if (parsedActivity.activityStatus) {
        const currentStatusLabel = currentActivityData.activity_status ? getActivityStatusLabel(currentActivityData.activity_status) : null;
        const importStatusLabel = getActivityStatusLabel(parsedActivity.activityStatus);
        fields.push({
          fieldName: 'Activity Status',
          iatiPath: 'iati-activity/activity-status',
          currentValue: currentStatusLabel,
          importValue: importStatusLabel,
          selected: shouldSelectField(currentStatusLabel, importStatusLabel),
          hasConflict: hasConflict(currentStatusLabel, importStatusLabel),
          tab: 'other',
          description: 'Current implementation status'
        });
      }

      if (parsedActivity.activityScope) {
        const currentScopeLabel = currentActivityData.activity_scope ? getActivityScopeLabel(currentActivityData.activity_scope) : null;
        const importScopeLabel = getActivityScopeLabel(parsedActivity.activityScope);
        fields.push({
          fieldName: 'Activity Scope',
          iatiPath: 'iati-activity/activity-scope',
          currentValue: currentScopeLabel,
          importValue: importScopeLabel,
          selected: shouldSelectField(currentScopeLabel, importScopeLabel),
          hasConflict: hasConflict(currentScopeLabel, importScopeLabel),
          tab: 'other',
          description: 'Geographical scope of the activity'
        });
      }

      if (parsedActivity.language) {
        const currentLanguageLabel = currentActivityData.language ? getLanguageLabel(currentActivityData.language) : null;
        const importLanguageLabel = getLanguageLabel(parsedActivity.language);
        fields.push({
          fieldName: 'Narrative Language',
          iatiPath: 'iati-activity[@xml:lang]',
          currentValue: currentLanguageLabel,
          importValue: importLanguageLabel,
          selected: shouldSelectField(currentLanguageLabel, importLanguageLabel),
          hasConflict: hasConflict(currentLanguageLabel, importLanguageLabel),
          tab: 'basic',
          description: 'Primary language of the activity (if multilingual)'
        });
      }

      // === DATES TAB ===
      
      if (parsedActivity.plannedStartDate) {
        const currentValue = currentActivityData.planned_start_date || null;
        fields.push({
          fieldName: 'Planned Start Date',
          iatiPath: 'iati-activity/activity-date[@type="1"]',
          currentValue: currentValue,
          importValue: parsedActivity.plannedStartDate,
          selected: shouldSelectField(currentValue, parsedActivity.plannedStartDate),
          hasConflict: hasConflict(currentValue, parsedActivity.plannedStartDate),
          tab: 'dates',
          description: 'When the activity is planned to begin'
        });
      }

      if (parsedActivity.plannedEndDate) {
        fields.push({
          fieldName: 'Planned End Date',
          iatiPath: 'iati-activity/activity-date[@type="3"]',
          currentValue: currentActivityData.planned_end_date || null,
          importValue: parsedActivity.plannedEndDate,
          selected: shouldSelectField(currentActivityData.planned_end_date || null, parsedActivity.plannedEndDate),
          hasConflict: hasConflict(currentActivityData.planned_end_date || null, parsedActivity.plannedEndDate),
          tab: 'dates',
          description: 'When the activity is planned to end'
        });
      }

      if (parsedActivity.actualStartDate) {
        fields.push({
          fieldName: 'Actual Start Date',
          iatiPath: 'iati-activity/activity-date[@type="2"]',
          currentValue: currentActivityData.actual_start_date || null,
          importValue: parsedActivity.actualStartDate,
          selected: shouldSelectField(currentActivityData.actual_start_date || null, parsedActivity.actualStartDate),
          hasConflict: hasConflict(currentActivityData.actual_start_date || null, parsedActivity.actualStartDate),
          tab: 'dates',
          description: 'When the activity actually started'
        });
      }

      if (parsedActivity.actualEndDate) {
        fields.push({
          fieldName: 'Actual End Date',
          iatiPath: 'iati-activity/activity-date[@type="4"]',
          currentValue: currentActivityData.actual_end_date || null,
          importValue: parsedActivity.actualEndDate,
          selected: shouldSelectField(currentActivityData.actual_end_date || null, parsedActivity.actualEndDate),
          hasConflict: hasConflict(currentActivityData.actual_end_date || null, parsedActivity.actualEndDate),
          tab: 'dates',
          description: 'When the activity actually ended'
        });
      }

      // === OTHER IDENTIFIERS (in BASIC TAB) ===
      
      if (parsedActivity.otherIdentifiers && parsedActivity.otherIdentifiers.length > 0) {
        parsedActivity.otherIdentifiers.forEach((identifier: any, index: number) => {
          const identifierRef = identifier.ref || 'No identifier';
          
          // Get identifier type name for display
          const identifierTypeNames: { [key: string]: string } = {
            'A1': 'Reporting Organisation\'s internal activity identifier',
            'A2': 'CRS Activity identifier',
            'A3': 'Previous Activity Identifier',
            'A9': 'Other Activity Identifier',
            'B1': 'Previous Reporting Organisation Identifier',
            'B9': 'Other Organisation Identifier'
          };
          const typeName = identifier.type ? identifierTypeNames[identifier.type] || identifier.type : 'Unknown type';
          const typeCode = identifier.type || 'N/A';
          
          fields.push({
            fieldName: `Other Identifier ${index + 1}`,
            iatiPath: `iati-activity/other-identifier[${index}]`,
            currentValue: null,
            importValue: {
              code: identifierRef,
              type: typeCode,
              name: typeName,
              ownerOrg: identifier.ownerOrg,
              _rawData: identifier // Keep raw data for import processing
            },
            selected: false,
            hasConflict: false,
            tab: 'identifiers_ids',
            description: `${typeCode} - ${typeName}`
          });
        });
      }

      // === FINANCES TAB ===
      
      if (parsedActivity.defaultCurrency) {
        fields.push({
          fieldName: 'Default Currency',
          iatiPath: 'iati-activity[@default-currency]',
          currentValue: currentActivityData.default_currency || null,
          importValue: parsedActivity.defaultCurrency,
          selected: shouldSelectField(currentActivityData.default_currency || null, parsedActivity.defaultCurrency),
          hasConflict: hasConflict(currentActivityData.default_currency || null, parsedActivity.defaultCurrency),
          tab: 'finances',
          description: 'Default currency for financial values'
        });
      }

      if (parsedActivity.crsChannelCode) {
        fields.push({
          fieldName: 'CRS Channel Code',
          iatiPath: 'iati-activity/crs-add/channel-code',
          currentValue: null, // This field is not stored in the current system
          importValue: parsedActivity.crsChannelCode,
          selected: false, // Don't auto-select as it's optional
          hasConflict: false,
          tab: 'finances',
          description: 'CRS Channel Code (optional)'
        });
      }

      if (parsedActivity.defaultFinanceType) {
        const currentFinanceLabel = currentActivityData.defaultFinanceType ? getFinanceTypeLabel(currentActivityData.defaultFinanceType) : null;
        const importFinanceLabel = getFinanceTypeLabel(parsedActivity.defaultFinanceType);
        fields.push({
          fieldName: 'Default Finance Type',
          iatiPath: 'iati-activity/default-finance-type',
          currentValue: currentFinanceLabel,
          importValue: importFinanceLabel,
          selected: shouldSelectField(currentFinanceLabel, importFinanceLabel),
          hasConflict: hasConflict(currentFinanceLabel, importFinanceLabel),
          tab: 'finances',
          description: 'Default type of finance (grant, loan, etc.)'
        });
      }

      if (parsedActivity.defaultFlowType) {
        const currentFlowLabel = currentActivityData.defaultFlowType ? getFlowTypeLabel(currentActivityData.defaultFlowType) : null;
        const importFlowLabel = getFlowTypeLabel(parsedActivity.defaultFlowType);
        fields.push({
          fieldName: 'Default Flow Type',
          iatiPath: 'iati-activity/default-flow-type',
          currentValue: currentFlowLabel,
          importValue: importFlowLabel,
          selected: shouldSelectField(currentFlowLabel, importFlowLabel),
          hasConflict: hasConflict(currentFlowLabel, importFlowLabel),
          tab: 'finances',
          description: 'Default flow classification'
        });
      }

      if (parsedActivity.defaultAidType) {
        const currentAidLabel = currentActivityData.defaultAidType ? getAidTypeLabel(currentActivityData.defaultAidType) : null;
        const importAidLabel = getAidTypeLabel(parsedActivity.defaultAidType);
        fields.push({
          fieldName: 'Default Aid Type',
          iatiPath: 'iati-activity/default-aid-type',
          currentValue: currentAidLabel,
          importValue: importAidLabel,
          selected: shouldSelectField(currentAidLabel, importAidLabel),
          hasConflict: hasConflict(currentAidLabel, importAidLabel),
          tab: 'finances',
          description: 'Default aid type classification'
        });
      }

      if (parsedActivity.defaultTiedStatus) {
        const currentTiedLabel = currentActivityData.defaultTiedStatus ? getTiedStatusLabel(currentActivityData.defaultTiedStatus) : null;
        const importTiedLabel = getTiedStatusLabel(parsedActivity.defaultTiedStatus);
        fields.push({
          fieldName: 'Default Tied Status',
          iatiPath: 'iati-activity/default-tied-status',
          currentValue: currentTiedLabel,
          importValue: importTiedLabel,
          selected: shouldSelectField(currentTiedLabel, importTiedLabel),
          hasConflict: hasConflict(currentTiedLabel, importTiedLabel),
          tab: 'finances',
          description: 'Default tied aid status'
        });
      }

      if (parsedActivity.capitalSpendPercentage !== undefined && parsedActivity.capitalSpendPercentage !== null) {
        const currentCapitalSpend = currentActivityData.capital_spend_percentage;
        const importCapitalSpend = parsedActivity.capitalSpendPercentage;
        fields.push({
          fieldName: 'Capital Spend Percentage',
          iatiPath: 'iati-activity/capital-spend',
          currentValue: currentCapitalSpend !== null && currentCapitalSpend !== undefined ? `${currentCapitalSpend}%` : null,
          importValue: `${importCapitalSpend}%`,
          selected: shouldSelectField(currentCapitalSpend, importCapitalSpend),
          hasConflict: hasConflict(currentCapitalSpend, importCapitalSpend),
          tab: 'finances',
          description: 'Percentage of budget used for capital expenditure'
        });
      }

      // === FINANCING TERMS (CRS-ADD) ===
      
      if (parsedActivity.financingTerms) {
        const ft = parsedActivity.financingTerms;
        
        // Display loan terms if present
        if (ft.loanTerms) {
          const loanTermsSummary = [];
          if (ft.loanTerms.rate_1) loanTermsSummary.push(`Rate 1: ${ft.loanTerms.rate_1}%`);
          if (ft.loanTerms.rate_2) loanTermsSummary.push(`Rate 2: ${ft.loanTerms.rate_2}%`);
          if (ft.loanTerms.repayment_type_code) loanTermsSummary.push(`Repayment Type: ${ft.loanTerms.repayment_type_code}`);
          if (ft.loanTerms.commitment_date) loanTermsSummary.push(`Commitment: ${ft.loanTerms.commitment_date}`);
          
          if (loanTermsSummary.length > 0) {
            fields.push({
              fieldName: 'Loan Terms',
              iatiPath: 'iati-activity/crs-add/loan-terms',
              currentValue: null,
              importValue: loanTermsSummary.join(', '),
              selected: true,
              hasConflict: false,
              tab: 'finances',
              description: 'OECD CRS loan terms including interest rates and repayment schedule'
            });
          }
        }
        
        // Display loan statuses if present
        if (ft.loanStatuses && ft.loanStatuses.length > 0) {
          fields.push({
            fieldName: 'Loan Status (Yearly)',
            iatiPath: 'iati-activity/crs-add/loan-status',
            currentValue: null,
            importValue: `${ft.loanStatuses.length} year(s) of loan status data`,
            selected: true,
            hasConflict: false,
            tab: 'finances',
            description: 'Annual loan status including principal outstanding and arrears'
          });
        }
        
        // Display CRS flags if present
        if (ft.other_flags && ft.other_flags.length > 0) {
          fields.push({
            fieldName: 'OECD CRS Flags',
            iatiPath: 'iati-activity/crs-add/other-flags',
            currentValue: null,
            importValue: ft.other_flags.map(f => `Code ${f.code}`).join(', '),
            selected: true,
            hasConflict: false,
            tab: 'finances',
            description: 'OECD CRS reporting flags'
          });
        }
      }

      // === BUDGETS TAB ===
      
      if (parsedActivity.budgets && parsedActivity.budgets.length > 0) {
        parsedActivity.budgets.forEach((budget, budgetIndex) => {
          // Validation checks
          const warnings = [];
          
          if (!budget.period?.start) warnings.push('Missing period-start');
          if (!budget.period?.end) warnings.push('Missing period-end');
          if (!budget.value && budget.value !== 0) warnings.push('Missing value');
          if (!budget.valueDate) warnings.push('Missing value-date');
          
          // Check period length
          if (budget.period?.start && budget.period?.end) {
            const start = new Date(budget.period.start);
            const end = new Date(budget.period.end);
            const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
            
            if (start >= end) {
              warnings.push('⚠️ Period start must be before end');
            }
            if (daysDiff > 366) {
              warnings.push('⚠️ Period exceeds 1 year (not IATI compliant)');
            }
          }
          
          // Check type and status codes
          const type = parseInt(budget.type || '1');
          if (![1, 2].includes(type)) {
            warnings.push(`⚠️ Invalid type: ${type} (must be 1 or 2)`);
          }
          
          const status = parseInt(budget.status || '1');
          if (![1, 2].includes(status)) {
            warnings.push(`⚠️ Invalid status: ${status} (must be 1 or 2)`);
          }
          
          // Check value is non-negative
          if (budget.value !== undefined && budget.value < 0) {
            warnings.push('⚠️ Value must be >= 0');
          }
          
          // Type and status labels
          const typeLabel = type === 1 ? 'Original' : type === 2 ? 'Revised' : `Unknown (${type})`;
          const statusLabel = status === 1 ? 'Indicative' : status === 2 ? 'Committed' : `Unknown (${status})`;
          
          // Create budget summary with validation warnings
          const budgetSummary = [
            `Type: ${typeLabel}`,
            `Status: ${statusLabel}`,
            budget.period?.start && `Start: ${budget.period.start}`,
            budget.period?.end && `End: ${budget.period.end}`,
            budget.value !== undefined && `Amount: ${budget.value.toLocaleString()} ${budget.currency || parsedActivity.defaultCurrency || ''}`,
            budget.valueDate && `Value Date: ${budget.valueDate}`
          ].filter(Boolean).join(' | ');
          
          const description = warnings.length > 0
            ? `Budget ${budgetIndex + 1} - ${warnings.join(', ')}`
            : `Budget ${budgetIndex + 1} - IATI compliant ✓`;
          
          fields.push({
            fieldName: `Budget ${budgetIndex + 1}`,
            iatiPath: `iati-activity/budget[${budgetIndex + 1}]`,
            currentValue: null,
            importValue: budgetSummary,
            selected: warnings.length === 0, // Auto-select if valid
            hasConflict: warnings.length > 0,
            tab: 'budgets',
            description,
            isFinancialItem: true,
            itemType: 'budget',
            itemIndex: budgetIndex,
            itemData: budget
          });
        });
      }

      // === PLANNED DISBURSEMENTS TAB ===
      
      if (parsedActivity.plannedDisbursements && parsedActivity.plannedDisbursements.length > 0) {
        parsedActivity.plannedDisbursements.forEach((disbursement, disbIndex) => {
          // Validation checks
          const warnings = [];
          
          // Required field validation
          if (!disbursement.period?.start) warnings.push('Missing period-start');
          if (!disbursement.period?.end) warnings.push('Missing period-end');
          if (!disbursement.value && disbursement.value !== 0) warnings.push('Missing value');
          if (!disbursement.valueDate) warnings.push('Missing value-date');
          
          // Period validation
          if (disbursement.period?.start && disbursement.period?.end) {
            const start = new Date(disbursement.period.start);
            const end = new Date(disbursement.period.end);
            
            if (start >= end) {
              warnings.push('⚠️ Period start must be before end');
            }
          }
          
          // Type validation
          if (disbursement.type && !['1', '2'].includes(disbursement.type)) {
            warnings.push(`⚠️ Invalid type: ${disbursement.type} (must be 1 or 2)`);
          }
          
          // Value validation
          if (disbursement.value !== undefined && disbursement.value < 0) {
            warnings.push('⚠️ Value must be >= 0');
          }
          
          // Type label
          const typeLabel = disbursement.type === '1' ? 'Original' : 
                            disbursement.type === '2' ? 'Revised' : 
                            disbursement.type ? `Type ${disbursement.type}` : '';
          
          // Enhanced summary
          const disbursementSummary = [
            typeLabel && `Type: ${typeLabel}`,
            disbursement.period?.start && `Start: ${disbursement.period.start}`,
            disbursement.period?.end && `End: ${disbursement.period.end}`,
            disbursement.value !== undefined && `Amount: ${disbursement.value.toLocaleString()} ${disbursement.currency || parsedActivity.defaultCurrency || ''}`,
            disbursement.providerOrg?.name && `Provider: ${disbursement.providerOrg.name}`,
            disbursement.receiverOrg?.name && `Receiver: ${disbursement.receiverOrg.name}`
          ].filter(Boolean).join(' | ');
          
          const description = warnings.length > 0
            ? `Planned Disbursement ${disbIndex + 1} - ${warnings.join(', ')}`
            : `Planned Disbursement ${disbIndex + 1} - IATI compliant ✓`;
          
          fields.push({
            fieldName: `Planned Disbursement ${disbIndex + 1}`,
            iatiPath: `iati-activity/planned-disbursement[${disbIndex + 1}]`,
            currentValue: null,
            importValue: disbursementSummary,
            selected: warnings.length === 0, // Auto-select if valid
            hasConflict: warnings.length > 0,
            tab: 'planned_disbursements',
            description,
            isFinancialItem: true,
            itemType: 'plannedDisbursement',
            itemIndex: disbIndex,
            itemData: disbursement
          });
        });
      }

      // === FORWARD SPENDING SURVEY ===
      
      if (parsedActivity.fss) {
        const warnings = [];
        
        // Validation checks
        if (!parsedActivity.fss.extractionDate) {
          warnings.push('Missing extraction-date');
        }
        
        if (parsedActivity.fss.priority) {
          const priority = parseInt(parsedActivity.fss.priority.toString());
          if (isNaN(priority) || priority < 1 || priority > 5) {
            warnings.push(`⚠️ Invalid priority: ${parsedActivity.fss.priority} (must be 1-5)`);
          }
        }
        
        if (parsedActivity.fss.phaseoutYear) {
          const year = parseInt(parsedActivity.fss.phaseoutYear.toString());
          if (isNaN(year) || year < 2000 || year > 2100) {
            warnings.push(`⚠️ Invalid phaseout year: ${parsedActivity.fss.phaseoutYear}`);
          }
        }
        
        // Forecast validation
        if (!parsedActivity.fss.forecasts || parsedActivity.fss.forecasts.length === 0) {
          warnings.push('⚠️ No forecasts');
        } else {
          parsedActivity.fss.forecasts.forEach((forecast, idx) => {
            if (!forecast.year) warnings.push(`Forecast ${idx + 1}: Missing year`);
            if (!forecast.value && forecast.value !== 0) warnings.push(`Forecast ${idx + 1}: Missing value`);
            if (!forecast.currency) warnings.push(`Forecast ${idx + 1}: Missing currency`);
          });
        }
        
        // Priority label
        const priorityLabels: Record<number, string> = {
          1: 'High Priority',
          2: 'Medium Priority',
          3: 'Low Priority',
          4: 'Very Low Priority',
          5: 'Uncertain'
        };
        const priorityLabel = parsedActivity.fss.priority 
          ? priorityLabels[parsedActivity.fss.priority] || `Priority ${parsedActivity.fss.priority}`
          : '';
        
        // Create FSS summary
        const fssSummary = [
          parsedActivity.fss.extractionDate && `Extraction: ${parsedActivity.fss.extractionDate}`,
          priorityLabel && `Priority: ${priorityLabel}`,
          parsedActivity.fss.phaseoutYear && `Phaseout: ${parsedActivity.fss.phaseoutYear}`,
          parsedActivity.fss.forecasts?.length && `${parsedActivity.fss.forecasts.length} forecast(s)`
        ].filter(Boolean).join(' | ');
        
        const description = warnings.length > 0
          ? `Forward Spend - ${warnings.join(', ')}`
          : 'Forward Spend - IATI compliant ✓';
        
        fields.push({
          fieldName: 'Forward Spend',
          iatiPath: 'iati-activity/fss',
          currentValue: null,
          importValue: fssSummary,
          selected: warnings.length === 0,
          hasConflict: false,
          tab: 'forward-spending-survey',
          description: description,
          isFssItem: true,
          fssData: parsedActivity.fss
        });
      }

      // === COUNTRY BUDGET ITEMS TAB ===
      
      if (parsedActivity.countryBudgetItems && parsedActivity.countryBudgetItems.length > 0) {
        parsedActivity.countryBudgetItems.forEach((cbi, cbiIndex) => {
          // Validation checks
          const warnings = [];
          const vocabulary = cbi.vocabulary || '';
          
          // Vocabulary validation
          const validVocabularies = ['1', '2', '3', '4', '5'];
          if (!vocabulary) {
            warnings.push('Missing vocabulary');
          } else if (!validVocabularies.includes(vocabulary)) {
            warnings.push(`Invalid vocabulary: ${vocabulary}`);
          }
          
          // Budget items validation
          if (!cbi.budgetItems || cbi.budgetItems.length === 0) {
            warnings.push('No budget items');
          } else {
            cbi.budgetItems.forEach((item, itemIndex) => {
              if (!item.code) {
                warnings.push(`Item ${itemIndex + 1}: Missing code`);
              }
              if (item.percentage === undefined || item.percentage === null) {
                warnings.push(`Item ${itemIndex + 1}: Missing percentage`);
              } else {
                if (item.percentage < 0 || item.percentage > 100) {
                  warnings.push(`Item ${itemIndex + 1}: Invalid percentage (${item.percentage}%)`);
                }
              }
            });
          }
          
          // Vocabulary labels
          const vocabularyLabels: Record<string, string> = {
            '1': 'IATI (withdrawn)',
            '2': 'Country Chart of Accounts',
            '3': 'Other Country System',
            '4': 'Reporting Organisation',
            '5': 'Other'
          };
          
          const vocabularyLabel = vocabularyLabels[vocabulary] || `Vocabulary ${vocabulary}`;
          
          // Create summary
          const itemsCount = cbi.budgetItems?.length || 0;
          const percentageSum = cbi.budgetItems?.reduce((sum, item) => sum + (item.percentage || 0), 0) || 0;
          const itemsSummary = cbi.budgetItems?.map(item => 
            `${item.code} (${item.percentage}%)`
          ).join(', ') || '';
          
          const cbiSummary = [
            `Vocabulary: ${vocabularyLabel}`,
            `Items: ${itemsCount}`,
            `Total: ${percentageSum.toFixed(2)}%`,
            itemsSummary && `Codes: ${itemsSummary}`
          ].filter(Boolean).join(' | ');
          
          const description = warnings.length > 0
            ? `Budget Mapping ${cbiIndex + 1} - ${warnings.join(', ')}`
            : `Budget Mapping ${cbiIndex + 1} - Valid ✓`;
          
          fields.push({
            fieldName: `Budget Mapping ${cbiIndex + 1}`,
            iatiPath: `iati-activity/country-budget-items[${cbiIndex + 1}]`,
            currentValue: null,
            importValue: cbiSummary,
            selected: warnings.length === 0, // Auto-select if valid
            hasConflict: warnings.length > 0,
            tab: 'country-budget',
            description,
            itemType: 'countryBudgetItems',
            itemIndex: cbiIndex,
            itemData: cbi
          });
        });
      }

      // === TRANSACTIONS TAB ===
      
      if (parsedActivity.transactions && parsedActivity.transactions.length > 0) {
        parsedActivity.transactions.forEach((transaction, transIndex) => {
          // Create transaction summary with type mapping
          const transactionTypes: Record<string, string> = {
            '1': 'Incoming Funds',
            '2': 'Commitment',
            '3': 'Disbursement',
            '4': 'Expenditure',
            '5': 'Interest Repayment',
            '6': 'Loan Repayment',
            '7': 'Reimbursement',
            '8': 'Purchase of Equity',
            '9': 'Sale of Equity',
            '10': 'Credit Guarantee',
            '11': 'Incoming Commitment',
            '12': 'Outgoing Pledge',
            '13': 'Incoming Pledge'
          };
          
          const transactionType = transactionTypes[transaction.type || ''] || transaction.type || 'Unknown';
          
          const transactionSummary = [
            `Type: ${transactionType}`,
            transaction.date && `Date: ${transaction.date}`,
            transaction.value && `Amount: ${transaction.value.toLocaleString()} ${transaction.currency || parsedActivity.defaultCurrency || ''}`,
            transaction.description && `Description: ${transaction.description}`,
            transaction.providerOrg?.name && `Provider: ${transaction.providerOrg.name}`,
            transaction.receiverOrg?.name && `Receiver: ${transaction.receiverOrg.name}`
          ].filter(Boolean).join(' | ');
          
          fields.push({
            fieldName: `Transaction ${transIndex + 1}`,
            iatiPath: `iati-activity/transaction[${transIndex + 1}]`,
            currentValue: null,
            importValue: transactionSummary,
            selected: false,
            hasConflict: false,
            tab: 'transactions',
            description: `${transactionType} - Click to configure individual fields`,
            isFinancialItem: true,
            itemType: 'transaction',
            itemIndex: transIndex,
            itemData: transaction
          });
        });
      }

      // === LOCATIONS TAB ===
      
      // For snippet imports, only show fields related to the snippet type
      const shouldShowField = (fieldType: string): boolean => {
        if (!isSnippetImport) return true; // Show all fields for non-snippet imports
        
        // Map snippet types to their relevant fields
        const snippetFieldMap: Record<string, string[]> = {
          'location': ['location'],
          'transaction': ['transaction'],
          'sector': ['sector'],
          'recipient-country': ['recipient-country', 'country'],
          'recipient-region': ['recipient-region', 'region'],
          'organization': ['organization', 'partner'],
          'policy-marker': ['policy-marker'],
          'budget': ['budget'],
          'full-activity': [] // Show all for full activities
        };
        
        const allowedFields = snippetFieldMap[snippetType] || [];
        if (snippetType === 'full-activity') return true; // Show all for full activities
        
        return allowedFields.some(allowed => fieldType.toLowerCase().includes(allowed));
      };
      
      // Always show recipient countries field if there's current data or import data (but only if not filtered out)
      const countryInfo = shouldShowField('recipient-country') && parsedActivity.recipientCountries && parsedActivity.recipientCountries.length > 0
        ? parsedActivity.recipientCountries.map(c => ({
            code: c.code,
            name: `${(() => {
            const countryData = IATI_COUNTRIES.find(country => country.code === c.code);
            const countryName = countryData ? countryData.name : (c.narrative || c.code);
            return countryName;
          })()}${c.percentage ? ` (${c.percentage}%)` : ''}`,
            vocabulary: 'A4 ISO Country'
          }))
        : null;
      
      const currentCountryInfo = currentActivityData.recipient_countries && currentActivityData.recipient_countries.length > 0
        ? currentActivityData.recipient_countries.map(c => {
            const countryCode = c.country?.code;
            const countryData = IATI_COUNTRIES.find(country => country.code === countryCode);
            const countryName = countryData ? countryData.name : (c.country?.name || countryCode);
            return {
              code: countryCode,
              name: `${countryName}${c.percentage ? ` (${c.percentage}%)` : ''}`,
              vocabulary: 'A4 ISO Country'
            };
          })
        : null;
      
      console.log('[XML Import Debug] Current country info:', currentCountryInfo);
      console.log('[XML Import Debug] Current activity data recipient_countries:', currentActivityData.recipient_countries);
      
      // Only add the field if there's either current data or import data
      // For snippet imports, ONLY show if the import has this data (not just current data)
      if (currentCountryInfo || countryInfo) {
        // For snippet imports, skip this field if there's no import value
        if (isSnippetImport && !countryInfo) {
          // Skip - this field wasn't in the snippet
        } else {
          fields.push({
            fieldName: 'Recipient Countries',
            iatiPath: 'iati-activity/recipient-country',
            currentValue: currentCountryInfo,
            importValue: countryInfo,
            selected: shouldSelectField(currentCountryInfo, countryInfo),
            hasConflict: hasConflict(currentCountryInfo, countryInfo),
            tab: 'locations',
            description: 'Countries where activity takes place with percentage allocations (vocabulary: A4)'
          });
        }
      }

      // Always show recipient regions field if there's current data or import data (but only if not filtered out)
      const standardRegions = shouldShowField('recipient-region') && parsedActivity.recipientRegions ? parsedActivity.recipientRegions.filter(r => r.vocabulary !== '99') : [];
      const customRegions = shouldShowField('custom-geography') && parsedActivity.recipientRegions ? parsedActivity.recipientRegions.filter(r => r.vocabulary === '99') : [];
      
      // Standard regions
      const regionInfo = shouldShowField('recipient-region') && standardRegions.length > 0
        ? standardRegions.map(r => {
            // Look up the region name from our regions data
            const regionData = IATI_REGIONS.find(region => region.code === r.code);
            const regionName = regionData ? regionData.name : (r.narrative || r.code);
            const vocab = r.vocabulary || '1';
            const vocabName = vocab === '1' ? 'OECD DAC' : vocab === '2' ? 'UN' : 'Custom';
            return {
              code: r.code,
              name: `${regionName}${r.percentage ? ` (${r.percentage}%)` : ''}`,
              vocabulary: `${vocab} ${vocabName}`
            };
          })
        : null;
      
      const currentRegionInfo = currentActivityData.recipient_regions && currentActivityData.recipient_regions.length > 0
        ? currentActivityData.recipient_regions.map(r => {
            const regionCode = r.region?.code;
            const regionData = IATI_REGIONS.find(region => region.code === regionCode);
            const regionName = regionData ? regionData.name : (r.region?.name || regionCode);
            const vocab = r.vocabulary || '1';
            const vocabName = vocab === '1' ? 'OECD DAC' : vocab === '2' ? 'UN' : 'Custom';
            return {
              code: regionCode,
              name: `${regionName}${r.percentage ? ` (${r.percentage}%)` : ''}`,
              vocabulary: `${vocab} ${vocabName}`
            };
          })
        : null;
      
      if (currentRegionInfo || regionInfo) {
        // For snippet imports, skip this field if there's no import value
        if (isSnippetImport && !regionInfo) {
          // Skip - this field wasn't in the snippet
        } else {
          fields.push({
            fieldName: 'Recipient Regions',
            iatiPath: 'iati-activity/recipient-region',
            currentValue: currentRegionInfo,
            importValue: regionInfo,
            selected: shouldSelectField(currentRegionInfo, regionInfo),
            hasConflict: hasConflict(currentRegionInfo, regionInfo),
            tab: 'locations',
            description: 'Standard regions where activity takes place with percentage allocations'
          });
        }
      }
      
      // Custom geographies
      const customInfo = shouldShowField('custom-geography') && customRegions.length > 0
        ? customRegions.map(r => ({
            code: r.code,
            name: `${r.narrative || r.code}${r.percentage ? ` (${r.percentage}%)` : ''}`,
            vocabulary: `99 Custom`,
            vocabularyUri: r.vocabularyUri || null
          }))
        : null;
      
      const currentCustomInfo = currentActivityData.custom_geographies && currentActivityData.custom_geographies.length > 0
        ? currentActivityData.custom_geographies.map(c => ({
            code: c.code,
            name: `${c.name}${c.percentage ? ` (${c.percentage}%)` : ''}`,
            vocabulary: `99 Custom`,
            vocabularyUri: c.vocabularyUri || null
          }))
        : null;
      
      if (currentCustomInfo || customInfo) {
        // For snippet imports, skip this field if there's no import value
        if (isSnippetImport && !customInfo) {
          // Skip - this field wasn't in the snippet
        } else {
          fields.push({
            fieldName: 'Custom Geographies',
            iatiPath: 'iati-activity/recipient-region[@vocabulary="99"]',
            currentValue: currentCustomInfo,
            importValue: customInfo,
            selected: shouldSelectField(currentCustomInfo, customInfo),
            hasConflict: hasConflict(currentCustomInfo, customInfo),
            tab: 'locations',
            description: 'Custom geographies where activity takes place with percentage allocations'
          });
        }
      }

      // Detailed Location Elements (Activity Sites) - Always show for location snippets
      if (shouldShowField('location') && parsedActivity.locations && parsedActivity.locations.length > 0) {
        parsedActivity.locations.forEach((location: any, locIndex: number) => {
          const locationReachMap: Record<string, string> = {
            '1': 'Activity',
            '2': 'Intended Beneficiaries'
          };
          const exactnessMap: Record<string, string> = {
            '1': 'Exact',
            '2': 'Approximate',
            '3': 'Extrapolated'
          };
          const locationClassMap: Record<string, string> = {
            '1': 'Administrative Region',
            '2': 'Populated Place',
            '3': 'Structure',
            '4': 'Other Topographical Feature'
          };

          // Format location to match exact inline pattern of Recipient Countries
          // Pattern: [BADGE] [NAME] [COORDINATES_BADGE] - all inline on one line
          const locationName = location.name || 'Unnamed Location';
          const locationCode = location.ref || `LOC${locIndex + 1}`;
          const coordinates = location.point?.pos ? location.point.pos : '';
          
          // Create inline styled location display matching other geographical fields
          const locationSummary = (
            <div className="flex flex-wrap items-center gap-2">
              {/* Location code badge - matches AF/AG/489/A1 style */}
              <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                {locationCode}
              </span>
              
              {/* Location name - matches Afghanistan (25%) style */}
              <span className="text-sm font-medium text-gray-900">
                {locationName}
              </span>
              
              {/* Coordinates as gray pill badge - matches AF/AG style */}
              {coordinates && (
                <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {coordinates}
                </span>
              )}
            </div>
          );
          
          fields.push({
            fieldName: `Location ${locIndex + 1}`,
            iatiPath: `iati-activity/location[${locIndex + 1}]`,
            currentValue: (() => {
            // Get current location at this index - this will be evaluated when displayed
            console.log('[XmlImportTab] Debug - locIndex:', locIndex, 'currentActivityData.locations:', currentActivityData.locations);
            const currentLocation = currentActivityData.locations && currentActivityData.locations[locIndex];
            console.log('[XmlImportTab] Debug - currentLocation:', currentLocation);
            if (!currentLocation) return null;
            
            // Format current location to match the import value format
            const currentLocationName = currentLocation.location_name || 'Unnamed Location';
            const currentLocationCode = currentLocation.location_ref || currentLocation.country_code || `LOC${locIndex + 1}`;
            const currentCoordinates = currentLocation.latitude && currentLocation.longitude 
              ? `${currentLocation.latitude} ${currentLocation.longitude}` 
              : '';
            
            return (
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {currentLocationCode}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {currentLocationName}
                </span>
                {currentCoordinates && (
                  <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {currentCoordinates}
                  </span>
                )}
              </div>
            );
          })(),
            importValue: locationSummary,
            selected: false,
            hasConflict: false,
            tab: 'locations',
            description: location.description || location.activityDescription || 'Activity location with coordinates and metadata',
            isLocationItem: true,
            locationData: location
          });
        });
      }

      // === SECTORS TAB ===
      
      if (shouldShowField('sector') && parsedActivity.sectors && parsedActivity.sectors.length > 0) {
        const currentSectorsInfo = currentActivityData.sectors && currentActivityData.sectors.length > 0 
          ? currentActivityData.sectors.map(s => ({
              code: s.code,
              name: s.name,
              percentage: s.percentage
            }))
          : null;
        
        // Separate importable sectors from non-DAC sectors
        // vocabulary 1 = OECD DAC, vocabulary 2 = UN, both are importable
        // vocabulary 99 = Custom/Reporting organisation, not importable
        const importableSectors = parsedActivity.sectors.filter(s => !s.vocabulary || s.vocabulary === '1' || s.vocabulary === '2' || s.vocabulary === 'DAC');
        const nonDacSectors = parsedActivity.sectors.filter(s => s.vocabulary === '99');
        
        const importSectorInfo = importableSectors.map(s => {
          // Try to get sector name from DAC sectors data using flexible lookup
          const sectorInfo = s.code ? getSectorInfoFlexible(s.code) : null;
          const sectorName = sectorInfo ? getCleanSectorName(sectorInfo.name) : (s.narrative || 'Unnamed sector');
          
          return {
            code: s.code,
            name: sectorName,
            percentage: s.percentage || 0,
            isDac: true
          };
        });
        
        // Add non-DAC sectors as locked/unimportable
        const nonDacSectorInfo = nonDacSectors.map(s => ({
          code: s.code,
          name: s.narrative || 'Custom sector',
          percentage: s.percentage || 0,
          isDac: false,
          vocabulary: s.vocabulary,
          locked: true
        }));
        
        const allSectorInfo = [...importSectorInfo, ...nonDacSectorInfo];
        
        // Check for 3-digit sectors that need refinement
        const has3DigitSectors = parsedActivity.sectors.some(s => 
          s.code && s.code.length === 3 && /^\d{3}$/.test(s.code)
        );
        console.log('[Sector Import Debug] Parsed sectors:', parsedActivity.sectors);
        console.log('[Sector Import Debug] 3-digit sectors detected:', has3DigitSectors);
        console.log('[Sector Import Debug] Sector codes:', parsedActivity.sectors.map(s => s.code));
        
        const hasConflict = !!currentActivityData.sectors?.length;
        const hasNonDacSectors = nonDacSectors.length > 0;
        const sectorField: ParsedField = {
          fieldName: 'Sectors',
          iatiPath: 'iati-activity/sector',
          currentValue: currentSectorsInfo,
          importValue: allSectorInfo,
          selected: shouldSelectField(currentSectorsInfo, importSectorInfo), // Only select DAC sectors
          hasConflict: hasConflict,
          tab: 'sectors',
          description: hasNonDacSectors 
            ? `Sector classifications and allocations (${nonDacSectors.length} non-DAC sectors excluded)`
            : has3DigitSectors 
            ? 'Sector classifications and allocations (Contains 3-digit categories - refinement needed)'
            : 'Sector classifications and allocations',
          hasNonDacSectors: hasNonDacSectors,
          nonDacSectors: nonDacSectors
        };
        
        // Add metadata to track sectors that need refinement
        if (has3DigitSectors) {
          (sectorField as any).needsRefinement = true;
          // Only pass 3-digit DAC sectors that need refinement, not all sectors
          const sectorsNeedingRefinement = parsedActivity.sectors.filter(s => 
            s.code && s.code.length === 3 && /^\d{3}$/.test(s.code) && 
            (s.vocabulary === '1' || s.vocabulary === '2' || !s.vocabulary)
          );
          (sectorField as any).importedSectors = sectorsNeedingRefinement;
        }
        
        fields.push(sectorField);
      }

      if (parsedActivity.policyMarkers && parsedActivity.policyMarkers.length > 0) {
        // Fetch existing policy markers to populate current values
        let existingPolicyMarkers = [];
        try {
          const policyMarkersResponse = await fetch(`/api/activities/${activityId}/policy-markers`);
          if (policyMarkersResponse.ok) {
            existingPolicyMarkers = await policyMarkersResponse.json();
            console.log('[XML Import] Fetched existing policy markers:', existingPolicyMarkers);
          }
        } catch (error) {
          console.warn('[XML Import] Failed to fetch existing policy markers:', error);
        }

        // Create individual fields for each policy marker
        parsedActivity.policyMarkers.forEach((marker: any, index: number) => {
          // Find matching existing policy marker
          const existingMarker = existingPolicyMarkers.find((existing: any) => 
            existing.policy_marker_details?.code === marker.code && 
            existing.policy_marker_details?.vocabulary === marker.vocabulary
          );

          const currentValue = existingMarker ? {
            code: existingMarker.policy_marker_details?.code,
            significance: existingMarker.significance,
            vocabulary: existingMarker.policy_marker_details?.vocabulary,
            vocabulary_uri: existingMarker.policy_marker_details?.vocabulary_uri,
            rationale: existingMarker.rationale,
            name: existingMarker.policy_marker_details?.name
          } : null;

        fields.push({
            fieldName: `Policy Marker: ${marker.code || 'Unknown'}`,
            iatiPath: `iati-activity/policy-marker[${index}]`,
            currentValue: currentValue,
            importValue: {
              code: marker.code,
              significance: marker.significance,
              vocabulary: marker.vocabulary,
              vocabulary_uri: marker.vocabulary_uri,
              rationale: marker.rationale
            },
          selected: false,
            hasConflict: hasConflict(currentValue, {
              code: marker.code,
              significance: marker.significance,
              vocabulary: marker.vocabulary,
              vocabulary_uri: marker.vocabulary_uri,
              rationale: marker.rationale
            }),
            tab: 'policy-markers',
            description: `Policy marker: ${marker.code} (Significance: ${marker.significance})`,
            isPolicyMarker: true,
            policyMarkerData: marker
          });
        });
      }

      // === TAGS ===
      
      if (parsedActivity.tagClassifications && parsedActivity.tagClassifications.length > 0) {
        // Fetch existing tags on this activity
        let existingTags: any[] = [];
        try {
          const tagsResponse = await fetch(`/api/activities/${activityId}/tags`);
          if (tagsResponse.ok) {
            existingTags = await tagsResponse.json();
            console.log('[XML Import] Fetched existing tags:', existingTags);
          } else if (tagsResponse.status === 405) {
            console.warn('[XML Import] Tags GET endpoint not available (405), skipping conflict detection');
          } else {
            console.error('[XML Import] Failed to fetch tags:', tagsResponse.status, tagsResponse.statusText);
          }
        } catch (error) {
          console.warn('[XML Import] Error fetching existing tags:', error);
        }

        const currentTagsValue = existingTags.length > 0 
          ? existingTags.map(t => t.name).join(', ')
          : 'None';

        const importTagsValue = parsedActivity.tagClassifications.map((tag: any) => {
          const vocabLabel = tag.vocabulary === '1' ? '[Standard]' : 
                            tag.vocabulary === '99' ? '[Custom]' : 
                            tag.vocabulary ? `[Vocab ${tag.vocabulary}]` : '';
          const codeLabel = tag.code ? ` (${tag.code})` : '';
          return `${vocabLabel}${codeLabel} ${tag.narrative || 'Unnamed tag'}`;
        }).join(', ');

        fields.push({
          fieldName: 'Tags',
          iatiPath: 'iati-activity/tag',
          currentValue: currentTagsValue,
          importValue: importTagsValue,
          selected: false,
          hasConflict: existingTags.length > 0,
          tab: 'tags',
          description: `${parsedActivity.tagClassifications.length} tag(s) found in XML`,
          isTagField: true,
          tagData: parsedActivity.tagClassifications,
          existingTags: existingTags
        });
      }

      // === PARTNERS TAB ===
      
      if (parsedActivity.reportingOrg) {
        // Get current reporting org from activity data
        const currentReportingOrg = currentActivityData ? {
          name: currentActivityData['created_by_org_name' as keyof typeof currentActivityData] || null,
          acronym: currentActivityData['created_by_org_acronym' as keyof typeof currentActivityData] || null
        } : null;

        fields.push({
          fieldName: 'Reporting Organization',
          iatiPath: 'iati-activity/reporting-org',
          currentValue: currentReportingOrg,
          importValue: {
            name: parsedActivity.reportingOrg.narrative || parsedActivity.reportingOrg.ref,
            ref: parsedActivity.reportingOrg.ref || null,
            narrative: parsedActivity.reportingOrg.narrative || null,
            type: parsedActivity.reportingOrg.type || null
          },
          selected: false,
          hasConflict: false,
          tab: 'reporting_org',
          description: 'Organization reporting this activity'
        });
      }

      if (parsedActivity.participatingOrgs && parsedActivity.participatingOrgs.length > 0) {
        parsedActivity.participatingOrgs.forEach((org: any, index: number) => {
          const orgName = org.narrative || org.ref || 'Unknown Organization';
          const role = org.role || 'Unknown Role';
          
          // Try to find matching current participating organization
          const currentParticipatingOrgs = currentActivityData?.participatingOrgs || [];
          let currentValue = null;
          let hasConflict = false;

          // Match by IATI ref first, then by narrative/name and role
          const matchedOrg = currentParticipatingOrgs.find((current: any) => {
            const refMatch = org.ref && (
              current.iati_org_ref === org.ref || 
              current.organization?.iati_org_id === org.ref
            );
            const nameMatch = org.narrative && (
              current.narrative === org.narrative ||
              current.organization?.name === org.narrative
            );
            const roleMatch = org.role && String(current.iati_role_code) === String(org.role);
            
            return (refMatch || nameMatch) && roleMatch;
          });

          if (matchedOrg) {
            currentValue = {
              name: matchedOrg.narrative || matchedOrg.organization?.name || 'Unknown',
              ref: matchedOrg.iati_org_ref || matchedOrg.organization?.iati_org_id || null,
              role: matchedOrg.iati_role_code,
              narrative: matchedOrg.narrative,
              type: matchedOrg.org_type
            };

            // Check for conflicts in the data
            hasConflict = (
              (org.ref && matchedOrg.iati_org_ref && org.ref !== matchedOrg.iati_org_ref) ||
              (org.type && matchedOrg.org_type && org.type !== matchedOrg.org_type) ||
              (org.activityId && matchedOrg.activity_id_ref && org.activityId !== matchedOrg.activity_id_ref)
            );
          }
          
        fields.push({
            fieldName: `Participating Organization: ${orgName}`,
            iatiPath: `iati-activity/participating-org[${index}]`,
          currentValue: currentValue,
            importValue: {
              name: orgName,
              ref: org.ref || null,
              role: role,
              narrative: org.narrative || null,
              type: org.type || null,
              activityId: org.activityId || null,
              crsChannelCode: org.crsChannelCode || null,
              narrativeLang: org.narrativeLang || 'en',
              narratives: org.narratives || []
            },
          selected: false,
          hasConflict: hasConflict,
            tab: 'participating_orgs',
            description: `Participating organization: ${orgName} (Role: ${role})`
          });
        });
      }

      // === CONDITIONS ===
      
      if (parsedActivity.conditions && parsedActivity.conditions.conditions.length > 0) {
        // Fetch existing conditions
        let existingConditions: any[] = [];
        try {
          const { data, error } = await supabase
            .from('activity_conditions')
            .select('*')
            .eq('activity_id', activityId);
          
          if (!error && data) {
            existingConditions = data;
            console.log('[XML Import] Fetched existing conditions:', existingConditions);
          }
        } catch (error) {
          console.warn('[XML Import] Error fetching existing conditions:', error);
        }

        const currentConditionsValue = existingConditions.length > 0 
          ? `${existingConditions.length} condition(s) (Attached: ${existingConditions[0]?.attached ? 'Yes' : 'No'})`
          : 'None';

        const importConditionsValue = parsedActivity.conditions.conditions.map((cond: any) => {
          const typeLabel = cond.type === '1' ? 'Policy' : 
                           cond.type === '2' ? 'Performance' : 
                           cond.type === '3' ? 'Fiduciary' : 'Unknown';
          return `[${typeLabel}] ${cond.narrative || 'No description'}`;
        }).join('; ');

        fields.push({
          fieldName: 'Conditions',
          iatiPath: 'iati-activity/conditions',
          currentValue: currentConditionsValue,
          importValue: `${parsedActivity.conditions.conditions.length} condition(s) (Attached: ${parsedActivity.conditions.attached ? 'Yes' : 'No'})`,
          selected: false,
          hasConflict: existingConditions.length > 0,
          tab: 'conditions',
          description: importConditionsValue,
          isConditionsField: true,
          conditionsData: parsedActivity.conditions,
        });
      }

      // === LINKED ACTIVITIES TAB ===
      
      if (parsedActivity.relatedActivities && parsedActivity.relatedActivities.length > 0) {
        // Get relationship type labels for display
        const { getRelationshipTypeName } = await import('@/data/iati-relationship-types');
        
        parsedActivity.relatedActivities.forEach((relatedActivity: any, index: number) => {
          const relationshipTypeLabel = getRelationshipTypeName(relatedActivity.type);
          
          fields.push({
            fieldName: `Related Activity: ${relatedActivity.ref}`,
            iatiPath: `iati-activity/related-activity[${index}]`,
            currentValue: null, // Will be checked against existing linked activities during import
            importValue: {
              ref: relatedActivity.ref,
              type: relatedActivity.type,
              relationshipTypeLabel: relationshipTypeLabel
            },
            selected: true, // Default to selected since these are explicit relationships
            hasConflict: false, // Will be determined during actual matching
            tab: 'linked_activities',
            description: `Related activity (${relationshipTypeLabel}): ${relatedActivity.ref}`
          });
        });
        
        console.log(`[XML Import] Found ${parsedActivity.relatedActivities.length} related activities`);
      }

      // === CONTACTS TAB ===

      if (parsedActivity.contactInfo && parsedActivity.contactInfo.length > 0) {
        // Contact type labels for display
        const contactTypeLabels: Record<string, string> = {
          '1': 'General Enquiries',
          '2': 'Project Management',
          '3': 'Financial Management',
          '4': 'Communications'
        };

        parsedActivity.contactInfo.forEach((contact: any, index: number) => {
          const contactTypeCode = contact.type || '1';
          const contactTypeLabel = contactTypeLabels[contactTypeCode] || 'Contact';
          const contactName = contact.personName || contact.organization || 'Contact';
          
          console.log('[XML Import Debug] Processing contact:', contact);
          
        fields.push({
            fieldName: `Contact ${index + 1}: ${contactName}`,
            iatiPath: `iati-activity/contact-info[${index + 1}]`,
          currentValue: null,
            importValue: {
              type: contactTypeCode,
              organization: contact.organization || null,
              personName: contact.personName || null,
              jobTitle: contact.jobTitle || null,
              department: contact.department || null,
              email: contact.email || null,
              telephone: contact.telephone || null,
              website: contact.website || null,
              mailingAddress: contact.mailingAddress || null
            },
          selected: false,
          hasConflict: false,
            tab: 'contacts',
            description: `${contactTypeLabel} contact: ${contactName}`
          });
        });
      }

      // === RESULTS TAB ===
      
      if (parsedActivity.results && parsedActivity.results.length > 0) {
        const resultsInfo = parsedActivity.results.map(r => 
          r.title || 'Untitled result'
        ).join('; ');
        fields.push({
          fieldName: 'Results Framework',
          iatiPath: 'iati-activity/result',
          currentValue: null,
          importValue: resultsInfo,
          selected: false,
          hasConflict: false,
          tab: 'results',
          description: 'Results, indicators, and targets'
        });
      }

      if (fields.length === 0) {
        throw new Error('No importable fields found in the XML file. Please check that it contains valid IATI activity data.');
      }

      console.log('[XML Import Debug] Setting parsed fields:', fields.length, 'fields');
      setParsedFields(fields);
      
      // EXTERNAL PUBLISHER DETECTION - After parsing is complete
      console.log('[XML Import] Checking for external publisher...');
      if (fileToCheck) {
        try {
          const meta = await extractIatiMeta(fileToCheck);
          console.log('[XML Import] Extracted metadata:', meta);
          console.log('[XML Import] User publisher refs:', userPublisherRefs);
          
          // Store metadata for display in the modal
          setXmlMetadata(meta);
          
          // Check if reporting org matches user's publisher refs
          const isOwnedActivity = userPublisherRefs.some(ref => 
            ref && meta.reportingOrgRef && 
            ref.toLowerCase() === meta.reportingOrgRef.toLowerCase()
          );
          
          if (!isOwnedActivity) {
            console.log('[XML Import] EXTERNAL PUBLISHER DETECTED!');
            console.log('[XML Import] Reporting org:', meta.reportingOrgRef);
            console.log('[XML Import] User refs:', userPublisherRefs);
            
            // Check if this IATI ID already exists
            let existingAct = null;
            if (meta.iatiId) {
              try {
                const searchResponse = await fetch(`/api/activities/search?iatiId=${encodeURIComponent(meta.iatiId)}`);
                if (searchResponse.ok) {
                  const searchData = await searchResponse.json();
                  if (searchData.activities && searchData.activities.length > 0) {
                    existingAct = searchData.activities[0];
                  }
                }
              } catch (err) {
                console.error('[XML Import] Error checking for existing activity:', err);
              }
            }
            
            // Set up modal data
            setExternalPublisherMeta(meta);
            setExistingActivity(existingAct);
            setShowExternalPublisherModal(true);
            
            // Fields are already parsed and ready
            // Show the modal but also show the preview
            setImportStatus({ stage: 'previewing', progress: 100 });
            toast.info('External publisher detected', {
              description: `This activity is reported by ${meta.reportingOrgName || meta.reportingOrgRef}. Please choose how to handle it before importing.`
            });
            toast.success(`XML file parsed successfully! Found ${fields.length} importable fields.`);
            return; // Exit here, modal is shown and preview is visible
          } else {
            console.log('[XML Import] Activity is owned by user, proceeding with normal import');
          }
        } catch (metaError) {
          console.error('[XML Import] Error extracting metadata:', metaError);
          // Continue with normal import if metadata extraction fails
        }
      }
      
      console.log('[XML Import Debug] Setting status to previewing');
      setImportStatus({ stage: 'previewing', progress: 100 });
      
      // AUTO-TRIGGER SECTOR REFINEMENT for 3-digit sectors
      const sectorField = fields.find(f => f.fieldName === 'Sectors');
      if (sectorField && (sectorField as any).needsRefinement) {
        console.log('[XML Import] Auto-triggering sector refinement for 3-digit sectors');
        const importedSectors = (sectorField as any).importedSectors || [];
        
        // Filter to only include 3-digit DAC sectors that need refinement
        const sectorsNeedingRefinement = importedSectors.filter((s: any) => 
          s.code && s.code.length === 3 && /^\d{3}$/.test(s.code) && 
          (s.vocabulary === '1' || s.vocabulary === '2' || !s.vocabulary)
        );
        
        // Show sector refinement modal immediately
        setSectorRefinementData({
          originalSectors: sectorsNeedingRefinement,
          refinedSectors: []
        });
        setShowSectorRefinement(true);
        
        toast.info('3-digit sectors detected', {
          description: 'Please map these to specific 5-digit subsectors before importing.'
        });
      }
      
      toast.success(`XML file parsed successfully! Found ${fields.length} importable fields.`);
    } catch (error) {
      console.error('[XML Import Debug] Parsing error:', error);
      setImportStatus({ 
        stage: 'error', 
        message: error instanceof Error ? error.message : 'Failed to parse XML file. Please ensure it\'s a valid IATI XML document.' 
      });
      toast.error('Failed to parse XML file', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsParsing(false);
    }
  };

  // Toggle field selection
  const toggleFieldSelection = (index: number, checked?: boolean) => {
    setParsedFields(prev => {
      const updated = [...prev];
      updated[index].selected = checked !== undefined ? checked : !updated[index].selected;
      return updated;
    });
  };

  // Select all fields
  const selectAllFields = (select: boolean) => {
    setParsedFields(prev => prev.map(field => ({ ...field, selected: select })));
  };

  // Handle sector refinement
  const handleSectorRefinement = (importedSectors: any[]) => {
    console.log('[Sector Refinement] Opening refinement dialog for sectors:', importedSectors);
    console.log('[Sector Refinement] Sector count:', importedSectors.length);
    console.log('[Sector Refinement] Sector details:', importedSectors.map(s => ({
      code: s.code,
      narrative: s.narrative,
      percentage: s.percentage,
      codeLength: s.code?.length
    })));
    
    // Filter to only include 3-digit DAC sectors that need refinement
    const sectorsNeedingRefinement = importedSectors.filter(s => 
      s.code && s.code.length === 3 && /^\d{3}$/.test(s.code) && 
      (s.vocabulary === '1' || s.vocabulary === '2' || !s.vocabulary)
    );
    
    setSectorRefinementData({
      originalSectors: sectorsNeedingRefinement,
      refinedSectors: []
    });
    setShowSectorRefinement(true);
  };

  // Import selected fields
  const importSelectedFields = async () => {
    console.log('🚀 [XML Import] Starting import process...');
    const selectedFieldsList = parsedFields.filter(f => f.selected);
    console.log('📋 [XML Import] Selected fields:', selectedFieldsList);
    console.log('📋 [XML Import] Selected fields count:', selectedFieldsList.length);
    
    if (selectedFieldsList.length === 0) {
      toast.error('Please select at least one field to import');
      return;
    }

    setImportStatus({ stage: 'importing', progress: 0 });

    try {
      // Prepare the update data based on selected fields
      const updateData: any = {};
      
      selectedFieldsList.forEach(field => {
        setImportStatus({ 
          stage: 'importing', 
          progress: Math.round((selectedFieldsList.indexOf(field) / selectedFieldsList.length) * 50),
          message: `Preparing ${field.fieldName}...`
        });

        switch (field.fieldName) {
          case 'Activity Title':
            updateData.title_narrative = field.importValue;
            break;
          case 'Activity Description':
            console.log('[Import Update] Setting description_narrative:', field.importValue?.substring(0, 100));
            updateData.description_narrative = field.importValue;
            break;
          case 'Activity Description - Objectives':
            console.log('[Import Update] Setting description_objectives:', field.importValue?.substring(0, 100));
            updateData.description_objectives = field.importValue;
            break;
          case 'Activity Description - Target Groups':
            console.log('[Import Update] Setting description_target_groups:', field.importValue?.substring(0, 100));
            updateData.description_target_groups = field.importValue;
            break;
          case 'Activity Description - Other':
            console.log('[Import Update] Setting description_other:', field.importValue?.substring(0, 100));
            updateData.description_other = field.importValue;
            break;
          case 'Planned Start Date':
            updateData.planned_start_date = field.importValue;
            break;
          case 'Planned End Date':
            updateData.planned_end_date = field.importValue;
            break;
          case 'Actual Start Date':
            updateData.actual_start_date = field.importValue;
            break;
          case 'Actual End Date':
            updateData.actual_end_date = field.importValue;
            break;
          case 'Activity Status':
            updateData.activity_status = typeof field.importValue === 'object' ? field.importValue.code : field.importValue;
            break;
          case 'Collaboration Type':
            updateData.collaboration_type = typeof field.importValue === 'object' ? field.importValue.code : field.importValue;
            break;
          case 'IATI Identifier':
            updateData.iati_identifier = field.importValue;
            break;
          case 'Activity Scope':
            updateData.activity_scope = typeof field.importValue === 'object' ? field.importValue.code : field.importValue;
            break;
          case 'Narrative Language':
            updateData.language = typeof field.importValue === 'object' ? field.importValue.code : field.importValue;
            break;
          case 'Default Currency':
            updateData.default_currency = field.importValue;
            break;
          case 'Default Finance Type':
            updateData.default_finance_type = typeof field.importValue === 'object' ? field.importValue.code : field.importValue;
            break;
          case 'Default Flow Type':
            updateData.default_flow_type = typeof field.importValue === 'object' ? field.importValue.code : field.importValue;
            break;
          case 'Default Aid Type':
            updateData.default_aid_type = typeof field.importValue === 'object' ? field.importValue.code : field.importValue;
            break;
          case 'Default Tied Status':
            updateData.default_tied_status = typeof field.importValue === 'object' ? field.importValue.code : field.importValue;
            break;
          case 'Capital Spend Percentage':
            // Extract numeric value from string like "88.8%"
            const percentageStr = typeof field.importValue === 'string' ? field.importValue : String(field.importValue);
            const numericValue = parseFloat(percentageStr.replace('%', ''));
            console.log(`[XML Import] Processing Capital Spend Percentage: ${percentageStr} -> ${numericValue}`);
            // Validate range 0-100 and round to 2 decimal places
            if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 100) {
              updateData.capital_spend_percentage = Math.round(numericValue * 100) / 100;
              console.log(`[XML Import] ✅ Capital spend percentage set to: ${updateData.capital_spend_percentage}`);
            } else if (!isNaN(numericValue)) {
              console.warn(`[XML Import] Capital spend percentage ${numericValue} is out of range (0-100), skipping`);
            } else {
              updateData.capital_spend_percentage = null;
              console.warn(`[XML Import] Invalid capital spend percentage value: ${percentageStr}`);
            }
            break;
          case 'Sectors':
            // Handle sector imports - this will be processed separately after main activity update
            updateData._importSectors = true;
            break;
          case 'Recipient Countries':
            // Handle recipient countries import
            if (parsedActivity.recipientCountries && parsedActivity.recipientCountries.length > 0) {
              updateData.recipient_countries = parsedActivity.recipientCountries.map((country: any) => {
                const countryData = IATI_COUNTRIES.find(c => c.code === country.code);
                const countryName = countryData ? countryData.name : (country.narrative || country.code);
                
                return {
                id: `country-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                country: {
                  code: country.code,
                    name: countryName,
                  iso2: country.code,
                  withdrawn: false
                },
                  percentage: country.percentage || 0,
                  vocabulary: 'A4', // Default to ISO Country vocabulary
                  vocabularyUri: undefined,
                  narrative: country.narrative || undefined
                };
              });
            }
            break;
          case 'Recipient Regions':
            // Handle recipient regions import
            if (parsedActivity.recipientRegions && parsedActivity.recipientRegions.length > 0) {
              const regions: any[] = [];
              const customGeographies: any[] = [];
              
              parsedActivity.recipientRegions.forEach((region: any) => {
                const regionData = {
                id: `region-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                region: {
                  code: region.code,
                    name: (() => {
                      const regionLookup = IATI_REGIONS.find(r => r.code === region.code);
                      return regionLookup ? regionLookup.name : (region.narrative || region.code);
                    })(),
                  vocabulary: region.vocabulary || '1',
                  withdrawn: false
                },
                  percentage: region.percentage || 0,
                  vocabulary: region.vocabulary || '1',
                  vocabularyUri: undefined,
                  narrative: region.narrative || undefined
                };
                
                // Check if this is a custom geography (vocabulary="99")
                if (region.vocabulary === '99') {
                  customGeographies.push({
                    id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: region.narrative || region.code,
                    code: region.code,
                    percentage: region.percentage || 0,
                    vocabularyUri: region.vocabularyUri || null,
                    narrative: region.narrative || undefined
                  });
                } else {
                  // For standard regions, update vocabularyUri if present
                  regionData.vocabularyUri = region.vocabularyUri;
                  regions.push(regionData);
                }
              });
              
              if (regions.length > 0) {
                updateData.recipient_regions = regions;
              }
              if (customGeographies.length > 0) {
                updateData.custom_geographies = customGeographies;
              }
            }
            break;
          case 'Custom Geographies':
            // Handle custom geographies import (vocabulary="99" regions)
            if (parsedActivity.recipientRegions && parsedActivity.recipientRegions.length > 0) {
              const customRegions = parsedActivity.recipientRegions.filter((region: any) => region.vocabulary === '99');
              if (customRegions.length > 0) {
                updateData.custom_geographies = customRegions.map((region: any) => ({
                  id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  name: region.narrative || region.code,
                  code: region.code,
                  percentage: region.percentage || 0,
                  vocabularyUri: region.vocabularyUri || null,
                  narrative: region.narrative || undefined
                }));
              }
            }
            break;
          case 'Policy Markers':
            // Handle policy markers import - this will be processed separately after main activity update
              updateData._importPolicyMarkers = true;
            break;
          case 'Tags':
            // Handle tags import - will be processed separately after main activity update
            updateData._importTags = true;
            break;
          case 'Results Framework':
            // Handle results import - will be processed separately after main activity update
            updateData._importResults = true;
            break;
          default:
            if (field.fieldName.startsWith('Other Identifier ')) {
              // Collect other identifier data for import (use raw data if available)
              if (!updateData.importedOtherIdentifiers) updateData.importedOtherIdentifiers = [];
              const rawData = (field.importValue as any)?._rawData || field.importValue;
              updateData.importedOtherIdentifiers.push(rawData);
              console.log(`[XML Import] Adding other identifier for import:`, rawData);
            } else if (field.fieldName === 'Participating Organization' || field.fieldName.startsWith('Participating Organization:')) {
              // Collect participating organization data for import
              if (!updateData.importedParticipatingOrgs) updateData.importedParticipatingOrgs = [];
              updateData.importedParticipatingOrgs.push(field.importValue);
              console.log(`[XML Import] Adding participating organization for import:`, field.importValue);
            } else if (field.fieldName.startsWith('Related Activity:')) {
              // Collect related activity data for import
              if (!updateData.importedRelatedActivities) updateData.importedRelatedActivities = [];
              updateData.importedRelatedActivities.push(field.importValue);
              console.log(`[XML Import] Adding related activity for import:`, field.importValue);
            } else
            if (field.fieldName.startsWith('Policy Marker:')) {
              // Handle individual policy marker import
              if (!updateData._importPolicyMarkers) updateData._importPolicyMarkers = [];
              updateData._importPolicyMarkers.push(field.policyMarkerData);
            } else if (field.fieldName.startsWith('Budget Mapping ')) {
              // NOTE: This MUST come BEFORE 'Budget ' check since "Budget Mapping" starts with "Budget"
              // Collect country budget items data for import
              if (!updateData.importedCountryBudgetItems) updateData.importedCountryBudgetItems = [];
              const cbiIndex = parseInt(field.fieldName.split(' ')[2]) - 1;
              if (parsedActivity.countryBudgetItems && parsedActivity.countryBudgetItems[cbiIndex]) {
                const budgetMapping = parsedActivity.countryBudgetItems[cbiIndex];
                updateData.importedCountryBudgetItems.push(budgetMapping);
                console.log(`[XML Import] ✅ Adding budget mapping ${cbiIndex + 1} for import:`, {
                  vocabulary: budgetMapping.vocabulary,
                  budgetItemsCount: budgetMapping.budgetItems?.length || 0,
                  budgetMapping
                });
              } else {
                console.error(`[XML Import] ❌ Budget mapping ${cbiIndex + 1} not found in parsed activity!`, {
                  cbiIndex,
                  availableCount: parsedActivity.countryBudgetItems?.length || 0,
                  parsedActivity: parsedActivity.countryBudgetItems
                });
              }
              console.log(`[XML Import] Total budget mappings queued: ${updateData.importedCountryBudgetItems?.length || 0}`);
            } else if (field.fieldName.startsWith('Budget ')) {
              // Collect budget data for import
              if (!updateData.importedBudgets) updateData.importedBudgets = [];
              const budgetIndex = parseInt(field.fieldName.split(' ')[1]) - 1;
              if (parsedActivity.budgets && parsedActivity.budgets[budgetIndex]) {
                updateData.importedBudgets.push(parsedActivity.budgets[budgetIndex]);
              }
              console.log(`[XML Import] Adding budget ${budgetIndex + 1} for import`);
            } else if (field.fieldName.startsWith('Planned Disbursement ')) {
              // Collect planned disbursement data for import
              if (!updateData.importedPlannedDisbursements) updateData.importedPlannedDisbursements = [];
              const disbursementIndex = parseInt(field.fieldName.split(' ')[2]) - 1;
              if (parsedActivity.plannedDisbursements && parsedActivity.plannedDisbursements[disbursementIndex]) {
                updateData.importedPlannedDisbursements.push(parsedActivity.plannedDisbursements[disbursementIndex]);
              }
              console.log(`[XML Import] Adding planned disbursement ${disbursementIndex + 1} for import`);
            } else if (field.fieldName === 'Forward Spend') {
              // Collect FSS data for import
              if (field.fssData) {
                updateData.importedFss = field.fssData;
                console.log('[XML Import] Adding FSS for import');
              }
            } else if (field.fieldName.startsWith('Transaction ')) {
              // Collect transaction data for import
              if (!updateData.importedTransactions) updateData.importedTransactions = [];
              const transactionIndex = parseInt(field.fieldName.split(' ')[1]) - 1;
              if (parsedActivity.transactions && parsedActivity.transactions[transactionIndex]) {
                updateData.importedTransactions.push(parsedActivity.transactions[transactionIndex]);
              }
              console.log(`[XML Import] Adding transaction ${transactionIndex + 1} for import`);
            } else if (field.fieldName.startsWith('Location ')) {
              // Collect location data for import
              if (!updateData.importedLocations) updateData.importedLocations = [];
              const locationIndex = parseInt(field.fieldName.split(' ')[1]) - 1;
              if (parsedActivity.locations && parsedActivity.locations[locationIndex]) {
                updateData.importedLocations.push(parsedActivity.locations[locationIndex]);
              }
              console.log(`[XML Import] Adding location ${locationIndex + 1} for import`);
            } else if (field.tab === 'contacts' || field.fieldName.includes('Contact')) {
              // Collect contact data for import
              if (!updateData.importedContacts) updateData.importedContacts = [];
              updateData.importedContacts.push(field.importValue);
              console.log(`[XML Import] Adding contact for import:`, field.importValue);
            }
            break;
        }
      });

      setImportStatus({ 
        stage: 'importing', 
        progress: 75,
        message: 'Saving to database...'
      });

      // Make API call to update the activity
      console.log('[XML Import] Making API call with data:', updateData);
      console.log('[XML Import] API URL:', `/api/activities/${activityId}`);
      
      // Log budget mapping data specifically if present
      if (updateData.importedCountryBudgetItems) {
        console.log('[XML Import] 🎯 Budget Mapping Data Being Sent:', {
          count: updateData.importedCountryBudgetItems.length,
          items: updateData.importedCountryBudgetItems
        });
      }
      
      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      console.log('[XML Import] API Response status:', response.status);
      console.log('[XML Import] API Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[XML Import] API Error response:', errorText);
        throw new Error(`Failed to update activity: ${response.statusText}`);
      }

      // Handle other identifiers import if any
      if (updateData.importedOtherIdentifiers && updateData.importedOtherIdentifiers.length > 0) {
        console.log('[XML Import] Processing other identifiers import...');
        setImportStatus({ 
          stage: 'importing', 
          progress: 80,
          message: 'Importing other identifiers...'
        });

        try {
          // Transform the imported other identifiers to the format expected by the database
          const otherIdentifiersData = updateData.importedOtherIdentifiers.map((identifier: any) => ({
            type: identifier.type || identifier._rawData?.type,
            code: identifier.ref || identifier.code || identifier._rawData?.ref,
            ownerOrg: identifier.ownerOrg || identifier._rawData?.ownerOrg
          }));

          console.log('[XML Import] Saving other identifiers:', otherIdentifiersData);

          // Save using the field API
          const otherIdentifiersResponse = await fetch(`/api/activities/field`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              activityId: activityId,
              field: 'otherIdentifiers',
              value: otherIdentifiersData
            }),
          });

          if (!otherIdentifiersResponse.ok) {
            const errorData = await otherIdentifiersResponse.json();
            console.error('[XML Import] Other identifiers import API error:', errorData);
            toast.error('Failed to import other identifiers', {
              description: errorData.error || 'Could not import other identifier data. Main activity data was imported successfully.'
            });
          } else {
            const successData = await otherIdentifiersResponse.json();
            console.log('[XML Import] Other identifiers imported successfully:', successData);
            toast.success(`Other identifiers imported successfully`, {
              description: `${otherIdentifiersData.length} identifier(s) added to the activity`
            });
          }
        } catch (otherIdentifiersError) {
          console.error('[XML Import] Other identifiers import network error:', otherIdentifiersError);
          toast.error('Failed to import other identifiers', {
            description: 'Network error occurred while importing other identifiers. Please check your connection and try again.'
          });
        }
      }

      // Handle sector imports if any
      if (updateData._importSectors) {
        console.log('[XML Import] Processing sector imports...');
        setImportStatus({ 
          stage: 'importing', 
          progress: 85,
          message: 'Importing sectors...'
        });

        const sectorField = selectedFieldsList.find(f => f.fieldName === 'Sectors');
        if (sectorField) {
          let sectorsToImport = [];
          
          // Check if we have refined sectors
          if ((sectorField as any).refinedSectors && (sectorField as any).refinedSectors.length > 0) {
            console.log('[XML Import] Using refined sectors:', (sectorField as any).refinedSectors);
            sectorsToImport = (sectorField as any).refinedSectors.map((sector: any) => ({
              sector_code: sector.code,
              sector_name: sector.name,
              percentage: sector.percentage,
              type: 'secondary', // Default to secondary for imports
              level: 'subsector' // Refined sectors are always 5-digit subsectors
            }));
          } else if (savedRefinedSectors.length > 0) {
            console.log('[XML Import] Using saved refined sectors:', savedRefinedSectors);
            sectorsToImport = savedRefinedSectors.map((sector: any) => ({
              sector_code: sector.code,
              sector_name: sector.name,
              percentage: sector.percentage,
              type: 'secondary',
              level: 'subsector'
            }));
          } else {
            // Use original sectors from import if no refinement was done
            // Filter out locked (non-DAC) sectors
            console.log('[XML Import] Using original sectors from field');
            const importableSectors = (sectorField.importValue || []).filter((sector: any) => !sector.locked);
            sectorsToImport = importableSectors.map((sector: any) => ({
              sector_code: sector.code,
              sector_name: sector.name,
              percentage: sector.percentage,
              type: 'secondary',
              level: 'subsector'
            }));
          }

          if (sectorsToImport.length > 0) {
            console.log('[XML Import] Importing sectors to database:', sectorsToImport);
            
            // Validate sectors before sending to API
            const totalPercentage = sectorsToImport.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0);
            if (Math.abs(totalPercentage - 100) > 0.01) {
              console.error('[XML Import] Invalid sector percentage total:', totalPercentage);
              toast.error('Sector import failed: Invalid percentages', {
                description: `Sector percentages total ${totalPercentage.toFixed(1)}% instead of 100%. Please use the sector refinement modal to fix this.`
              });
              return;
            }
            
            // Check for invalid sector codes
            const invalidSectors = sectorsToImport.filter((s: any) => !s.sector_code || !/^\d{5}$/.test(s.sector_code));
            if (invalidSectors.length > 0) {
              console.error('[XML Import] Invalid sector codes found:', invalidSectors);
              toast.error('Sector import failed: Invalid codes', {
                description: `${invalidSectors.length} sectors have invalid codes. Valid sector codes must be 5-digit numbers.`
              });
              return;
            }
            
            try {
              const sectorResponse = await fetch(`/api/activities/${activityId}/sectors`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sectors: sectorsToImport, replace: true }),
              });

              if (!sectorResponse.ok) {
                const errorData = await sectorResponse.json();
                console.error('[XML Import] Sector import API error:', errorData);
                
                if (sectorResponse.status === 400 && errorData.error?.includes('percentage')) {
                  toast.error('Sector import failed: Percentage error', {
                    description: errorData.error || 'Sector percentages must total exactly 100%'
                  });
                } else {
                  toast.error('Failed to import sectors', {
                    description: `API Error: ${errorData.error || sectorResponse.statusText}. Main activity data was imported successfully.`
                  });
                }
              } else {
                const successData = await sectorResponse.json();
                console.log('[XML Import] Sectors imported successfully:', successData);
                toast.success(`Sectors imported successfully`, {
                  description: `${sectorsToImport.length} sector(s) added to the activity`
                });
              }
            } catch (sectorError) {
              console.error('[XML Import] Sector import network error:', sectorError);
              toast.error('Failed to import sectors', {
                description: 'Network error occurred while importing sectors. Please check your connection and try again.'
              });
            }
          } else {
            console.log('[XML Import] No sectors to import');
          }
        }
      }

      // Handle locations import if any
      if (updateData.importedLocations && updateData.importedLocations.length > 0) {
        console.log('[XML Import] Processing locations import...');
        setImportStatus({ 
          stage: 'importing', 
          progress: 87,
          message: 'Geocoding coordinates and importing locations...'
        });

        try {
          // Process locations and add reverse geocoding for coordinates
          const locationsToImport = await Promise.all(
            updateData.importedLocations.map(async (loc: any) => {
              // Parse coordinates if present
              let latitude = null;
              let longitude = null;
              if (loc.point?.pos) {
                const coords = loc.point.pos.split(' ');
                if (coords.length === 2) {
                  latitude = parseFloat(coords[0]);
                  longitude = parseFloat(coords[1]);
                }
              }
              
              // Determine location type
              const locationType = (latitude && longitude) ? 'site' : 'coverage';
              
              const locationData: any = {
                location_type: locationType,
                location_name: loc.name || 'Unnamed Location',
                description: loc.description,
                location_description: loc.description,
                activity_location_description: loc.activityDescription,
                srs_name: loc.point?.srsName || 'http://www.opengis.net/def/crs/EPSG/0/4326',
                location_reach: loc.locationReach || undefined,  // Keep as string
                exactness: loc.exactness || undefined,  // Keep as string
                location_class: loc.locationClass || undefined,  // Keep as string
                feature_designation: loc.featureDesignation,
                location_id_vocabulary: loc.locationId?.vocabulary,
                location_id_code: loc.locationId?.code,
                admin_vocabulary: loc.administrative?.vocabulary,
                admin_level: loc.administrative?.level,  // Keep as string
                admin_code: loc.administrative?.code,
                source: 'import',
                validation_status: 'valid'
              };

              // Add site-specific fields
              if (locationType === 'site' && latitude && longitude) {
                locationData.latitude = latitude;
                locationData.longitude = longitude;

                // Perform reverse geocoding to populate address fields
                try {
                  console.log(`[XML Import] Reverse geocoding coordinates: ${latitude}, ${longitude}`);
                  const geocodeResponse = await fetch(`/api/geocoding/reverse?lat=${latitude}&lon=${longitude}`);
                  
                  if (geocodeResponse.ok) {
                    const geocodeData = await geocodeResponse.json();
                    console.log('[XML Import] Geocoding result:', geocodeData);
                    
                    // Populate address fields from geocoding
                    if (geocodeData.address) {
                      locationData.address = geocodeData.display_name;
                      locationData.city = geocodeData.address.city || 
                                         geocodeData.address.town || 
                                         geocodeData.address.village;
                      locationData.postal_code = geocodeData.address.postcode;
                      locationData.country_code = geocodeData.address.country_code?.toUpperCase();
                      
                      // Myanmar-specific admin boundaries
                      locationData.state_region_name = geocodeData.address.state || 
                                                       geocodeData.address.province;
                      locationData.township_name = geocodeData.address.county || 
                                                  geocodeData.address.municipality;
                      locationData.district_name = geocodeData.address.district;
                      locationData.village_name = geocodeData.address.village || 
                                                 geocodeData.address.hamlet;
                      
                      console.log('[XML Import] Address fields populated from geocoding');
                    }
                  } else {
                    console.warn('[XML Import] Reverse geocoding failed, continuing without address data');
                  }
                } catch (geocodeError) {
                  console.error('[XML Import] Geocoding error:', geocodeError);
                  // Continue import even if geocoding fails
                }
              }

              // Add coverage-specific fields
              if (locationType === 'coverage') {
                locationData.coverage_scope = 'regional'; // Default for imported coverage areas
              }

              return locationData;
            })
          );

          console.log('[XML Import] Importing locations to database:', locationsToImport);
          
          const locationsResponse = await fetch(`/api/activities/${activityId}/locations`, {
            method: 'PUT',  // Changed from POST to PUT for batch import
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ locations: locationsToImport }),
          });

          if (!locationsResponse.ok) {
            const errorData = await locationsResponse.json();
            console.error('[XML Import] Locations import API error:', errorData);
            toast.error('Failed to import locations', {
              description: errorData.error || 'Could not import location data. Main activity data was imported successfully.'
            });
          } else {
            const successData = await locationsResponse.json();
            console.log('[XML Import] Locations imported successfully:', successData);
            toast.success(`Locations imported successfully`, {
              description: `${locationsToImport.length} location(s) added to the activity`
            });
          }
        } catch (locationError) {
          console.error('[XML Import] Locations import network error:', locationError);
          toast.error('Failed to import locations', {
            description: 'Network error occurred while importing locations. Please check your connection and try again.'
          });
        }
      }

      // Handle FSS import if any
      if (updateData.importedFss) {
        console.log('[XML Import] Processing FSS import...');
        setImportStatus({ 
          stage: 'importing', 
          progress: 85,
          message: 'Importing Forward Spending Survey...'
        });

        try {
          const fssResponse = await fetch(`/api/activities/${activityId}/import-fss`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fssData: updateData.importedFss }),
          });

          if (!fssResponse.ok) {
            const errorData = await fssResponse.json();
            console.error('[XML Import] FSS import API error:', errorData);
            toast.error('Failed to import Forward Spending Survey', {
              description: errorData.error || 'Could not import FSS data. Main activity data was imported successfully.'
            });
          } else {
            const successData = await fssResponse.json();
            console.log('[XML Import] FSS imported successfully:', successData);
            toast.success(`Forward Spending Survey imported successfully`, {
              description: `${successData.imported_forecasts} forecast(s) added to the activity`
            });
          }
        } catch (fssError) {
          console.error('[XML Import] FSS import network error:', fssError);
          toast.error('Failed to import FSS', {
            description: 'Network error occurred while importing FSS. Please check your connection and try again.'
          });
        }
      }

      // Handle contacts import if any
      if (updateData.importedContacts && updateData.importedContacts.length > 0) {
        console.log('[XML Import] Processing contacts import...');
        setImportStatus({ 
          stage: 'importing', 
          progress: 88,
          message: 'Importing contacts...'
        });

        try {
          // Import contact-utils for mapping IATI contacts and deduplication
          const { mapIatiContactToDb, deduplicateContacts, mergeContact } = await import('@/lib/contact-utils');
          
          // Transform IATI contact data to database format
          const newContacts = updateData.importedContacts.map((contact: any) => {
            return mapIatiContactToDb(contact);
          });

          console.log('[XML Import] Transformed contacts data:', newContacts);

          // Fetch existing contacts for deduplication
          let existingContacts: any[] = [];
          try {
            const existingResponse = await fetch(`/api/activities/${activityId}/contacts`);
            if (existingResponse.ok) {
              existingContacts = await existingResponse.json();
            }
          } catch (error) {
            console.warn('[XML Import] Could not fetch existing contacts for deduplication:', error);
          }

          // Merge new contacts with existing, using deduplication
          const allContacts = [...existingContacts, ...newContacts];
          const contactsData = deduplicateContacts(allContacts);

          console.log('[XML Import] After deduplication:', {
            existing: existingContacts.length,
            new: newContacts.length,
            deduplicated: contactsData.length
          });

          // Save using field API
          const contactsResponse = await fetch(`/api/activities/field`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              activityId: activityId,
              field: 'contacts',
              value: contactsData
            }),
          });

          if (!contactsResponse.ok) {
            const errorData = await contactsResponse.json();
            console.error('[XML Import] Contacts import API error:', errorData);
            toast.error('Failed to import contacts', {
              description: errorData.error || 'Could not import contact data. Main activity data was imported successfully.'
            });
          } else {
            const successData = await contactsResponse.json();
            console.log('[XML Import] Contacts imported successfully:', successData);
            toast.success(`Contacts imported successfully`, {
              description: `${contactsData.length} contact(s) added to the activity`
            });
          }
        } catch (contactError) {
          console.error('[XML Import] Contacts import network error:', contactError);
          toast.error('Failed to import contacts', {
            description: 'Network error occurred while importing contacts. Please check your connection and try again.'
          });
        }
      }

      // Handle policy markers import if any
      if (updateData._importPolicyMarkers) {
        captureConsoleLog('[XML Import] Processing policy markers import...');
        setImportStatus({ 
          stage: 'importing', 
          progress: 90,
          message: 'Importing policy markers...'
        });

        try {
          // First, fetch available policy markers from database to match IATI codes
          captureConsoleLog(`[XML Import] Fetching policy markers for activity: ${activityId}`);
          const policyMarkersResponse = await fetch(`/api/policy-markers?activity_id=${activityId}`);
          
          if (!policyMarkersResponse.ok) {
            const errorText = await policyMarkersResponse.text();
            captureConsoleLog(`[XML Import] Policy markers API error: ${policyMarkersResponse.status} - ${errorText}`);
            throw new Error(`Failed to fetch policy markers: ${policyMarkersResponse.status} ${errorText}`);
          }
          
            const availableMarkers = await policyMarkersResponse.json();
          captureConsoleLog(`[XML Import] Received ${availableMarkers.length} available markers from API`);
            
            const importedPolicyMarkers = [];
            
            // Determine which policy markers to process
            let markersToProcess = [];
            if (Array.isArray(updateData._importPolicyMarkers)) {
              // Individual selections
              markersToProcess = updateData._importPolicyMarkers;
              captureConsoleLog(`[XML Import] Processing ${markersToProcess.length} individually selected policy markers`);
            } else if (updateData._importPolicyMarkers === true) {
              // Bulk import all policy markers
              markersToProcess = parsedActivity.policyMarkers || [];
              captureConsoleLog(`[XML Import] Processing all ${markersToProcess.length} policy markers from XML`);
            }
            
            for (const xmlMarker of markersToProcess) {
            captureConsoleLog(`[XML Import DEBUG] Processing XML marker:`, xmlMarker);
            captureConsoleLog(`[XML Import DEBUG] Available markers:`, availableMarkers.map((m: any) => ({
                uuid: m.uuid,
                code: m.code,
                iati_code: m.iati_code,
                name: m.name,
                vocabulary: m.vocabulary,
                is_iati_standard: m.is_iati_standard
              })));
            captureConsoleLog(`[XML Import DEBUG] Standard IATI markers:`, availableMarkers.filter((m: any) => m.is_iati_standard).map((m: any) => ({
              code: m.code,
              iati_code: m.iati_code,
              name: m.name
            })));
            captureConsoleLog(`[XML Import DEBUG] XML marker details:`, {
                code: xmlMarker.code,
                vocabulary: xmlMarker.vocabulary,
                vocabulary_uri: xmlMarker.vocabulary_uri,
                significance: xmlMarker.significance,
                narrative: xmlMarker.narrative
              });

              // Determine lookup strategy based on vocabulary
              let matchingMarker = null;
              const markerVocabulary = xmlMarker.vocabulary || '1';

              if (markerVocabulary === '1') {
                // Standard IATI marker: match by vocabulary + iati_code
              captureConsoleLog(`[XML Import DEBUG] Looking for standard marker with iati_code="${xmlMarker.code}"`);
              matchingMarker = availableMarkers.find((marker: any) => {
                const matches = marker.is_iati_standard === true &&
                  marker.vocabulary === '1' &&
                  marker.iati_code === xmlMarker.code;
                if (matches) {
                  captureConsoleLog(`[XML Import DEBUG] Found matching standard marker:`, marker);
                }
                return matches;
              });
              } else if (markerVocabulary === '99') {
                // Custom marker: match by vocabulary + code + vocabulary_uri
                const vocabularyUri = xmlMarker.vocabulary_uri || '';
              captureConsoleLog(`[XML Import DEBUG] Looking for custom marker with code="${xmlMarker.code}", vocabulary_uri="${vocabularyUri}"`);
              matchingMarker = availableMarkers.find((marker: any) => {
                const matches = marker.is_iati_standard === false &&
                  marker.vocabulary === '99' &&
                  marker.code === xmlMarker.code &&
                  (marker.vocabulary_uri || '') === vocabularyUri;
                if (matches) {
                  captureConsoleLog(`[XML Import DEBUG] Found matching custom marker:`, marker);
                }
                return matches;
              });
            }

            captureConsoleLog(`[XML Import DEBUG] Matching result for code ${xmlMarker.code}:`,
                matchingMarker ? { uuid: matchingMarker.uuid, code: matchingMarker.code, name: matchingMarker.name, iati_code: matchingMarker.iati_code } : 'NO MATCH');

              if (matchingMarker) {
                // Convert significance from string to number
                const rawSignificance = parseInt(xmlMarker.significance || '0');

                // Normalize significance to IATI-compliant range
                const { validatePolicyMarkerSignificance } = await import('@/lib/policy-marker-validation');
                const validation = validatePolicyMarkerSignificance(matchingMarker, rawSignificance);
                
                let significance = rawSignificance;
                if (!validation.isValid) {
                  // Normalize to maximum allowed significance
                  significance = validation.maxAllowedSignificance;
                  captureConsoleLog(`[XML Import] Normalized significance for ${matchingMarker.name}: ${rawSignificance} -> ${significance} (IATI compliance)`);
                }

                captureConsoleLog(`✅ [XML Import FIELD] PROCESSED ${matchingMarker.name} (code: ${xmlMarker.code}) - significance: ${significance}`);

                importedPolicyMarkers.push({
                  policy_marker_id: matchingMarker.uuid, // Use UUID, not ID!
                  significance: significance,
                  rationale: xmlMarker.narrative || null
                });

              captureConsoleLog(`[XML Import] Mapped policy marker: ${xmlMarker.code} -> ${matchingMarker.name} (significance: ${significance})`);
            } else {
                // Create custom policy marker if not found
              captureConsoleLog(`[XML Import] Creating custom policy marker for code: ${xmlMarker.code}, vocabulary: 99`);

                try {
                  // Create custom policy marker
                  const createResponse = await fetch('/api/policy-markers', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  body: JSON.stringify({
                    name: `Policy Marker ${xmlMarker.code}`,
                    description: `Custom policy marker imported from XML (code: ${xmlMarker.code})`,
                    marker_type: 'custom',
                    code: xmlMarker.code,
                    vocabulary: '99',
                    vocabulary_uri: xmlMarker.vocabulary_uri || null
                  })
                  });

                  if (createResponse.ok) {
                    const newMarker = await createResponse.json();
                  captureConsoleLog(`[XML Import] Successfully created custom policy marker:`, newMarker);

                    // Convert significance from string to number
                    const rawSignificance = parseInt(xmlMarker.significance || '0');

                  // Validate significance according to IATI rules
                    const { validatePolicyMarkerSignificance } = await import('@/lib/policy-marker-validation');
                    const validation = validatePolicyMarkerSignificance(newMarker, rawSignificance);

                    let significance = rawSignificance;
                    if (!validation.isValid) {
                      // Normalize to maximum allowed significance
                      significance = validation.maxAllowedSignificance;
                      captureConsoleLog(`[XML Import] Normalized significance for custom marker ${xmlMarker.code}: ${rawSignificance} -> ${significance} (IATI compliance)`);
                    }

                    // Add the newly created marker to our import list
                    importedPolicyMarkers.push({
                      policy_marker_id: newMarker.uuid, // Use UUID!
                      significance: significance,
                      rationale: xmlMarker.narrative || null
                    });

                  captureConsoleLog(`[XML Import] Created and assigned custom policy marker: ${xmlMarker.code} -> ${newMarker.name} (significance: ${significance})`);
                    } else {
                      const errorData = await createResponse.json().catch(() => ({ error: 'Unknown error' }));
                  captureConsoleLog(`[XML Import] Failed to create custom policy marker:`, errorData);
                      toast.warning(`Failed to create custom policy marker "${xmlMarker.code}"`, {
                        description: errorData.error || 'Could not create custom policy marker during import.'
                      });
                    }
                  } catch (createError) {
                captureConsoleLog(`[XML Import] Error creating custom policy marker:`, createError);
                    toast.warning(`Failed to create custom policy marker "${xmlMarker.code}"`, {
                      description: 'Network error occurred while creating custom policy marker.'
                    });
                  }
              }
            }
            
            if (importedPolicyMarkers.length > 0) {
            captureConsoleLog(`\n📤 [XML Import] Sending ${importedPolicyMarkers.length} policy markers to API:`);
            importedPolicyMarkers.forEach((marker, index) => {
              captureConsoleLog(`  ${index + 1}. UUID: ${marker.policy_marker_id}, Significance: ${marker.significance}, Rationale: ${marker.rationale || 'none'}`);
            });
            
            captureConsoleLog(`[XML Import] Sending policy markers to API:`, importedPolicyMarkers);
              const importResponse = await fetch(`/api/activities/${activityId}/policy-markers`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                  policyMarkers: importedPolicyMarkers, 
                  replace: true 
                }),
              });

              if (!importResponse.ok) {
              const errorText = await importResponse.text();
              captureConsoleLog('[XML Import] Policy markers import failed:', {
                status: importResponse.status,
                statusText: importResponse.statusText,
                error: errorText
              });
              
              let errorMessage = 'Policy markers could not be imported. Main activity data was imported successfully.';
              try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error || errorData.details || errorMessage;
              } catch (e) {
                errorMessage = errorText || errorMessage;
              }
              
                toast.error('Failed to import policy markers', {
                description: errorMessage
                });
              } else {
                const successData = await importResponse.json();
              captureConsoleLog('[XML Import] Policy markers imported successfully:', successData);
                toast.success(`Policy markers imported successfully`, {
                  description: `${importedPolicyMarkers.length} policy marker(s) added to the activity`
                });
              }
            } else {
            captureConsoleLog('[XML Import] No policy markers could be matched for import');
            toast.warning('No policy markers imported', {
              description: 'No policy markers from the XML could be matched with available policy markers in the database.'
            });
          }
        } catch (policyMarkersError: any) {
          captureConsoleLog('[XML Import] Policy markers import error:', policyMarkersError);
          captureConsoleLog('[XML Import] Error details:', {
            message: policyMarkersError.message,
            stack: policyMarkersError.stack,
            name: policyMarkersError.name
          });
          toast.error('Failed to import policy markers', {
            description: `An error occurred while processing policy markers: ${policyMarkersError.message}`
          });
        }
      }

      // Handle tags import if any
      if (updateData._importTags) {
        console.log('[XML Import] Processing tags import...');
        setImportStatus({ 
          stage: 'importing', 
          progress: 91,
          message: 'Importing tags...'
        });

        try {
          // Get the tag field data
          const tagField = parsedFields.find(f => f.fieldName === 'Tags' && f.selected);
          
          if (tagField && tagField.tagData) {
            const tagsToImport = tagField.tagData;
            const existingTags = tagField.existingTags || [];
            
            console.log('[XML Import] Tags to import:', tagsToImport);
            console.log('[XML Import] Existing tags:', existingTags);
            
            // Track import results
            const importResults = {
              successful: [] as string[],
              failed: [] as { tag: string; error: string }[],
              skipped: [] as string[]
            };
            
            // Process each tag from XML
            for (const xmlTag of tagsToImport) {
              const tagName = xmlTag.narrative || xmlTag.code || 'Unnamed tag';
              
              try {
                // Create tag with IATI vocabulary info
                const tagResponse = await fetch('/api/tags', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: tagName,
                    vocabulary: xmlTag.vocabulary || '99',
                    code: xmlTag.code,
                    vocabulary_uri: xmlTag.vocabularyUri,
                    created_by: user?.id
                  })
                });

                if (!tagResponse.ok) {
                  const errorData = await tagResponse.json();
                  console.error('[XML Import] Tag creation error:', errorData);
                  importResults.failed.push({
                    tag: tagName,
                    error: errorData.error || 'Creation failed'
                  });
                  continue;
                }

                const tag = await tagResponse.json();
                console.log('[XML Import] Tag created/found:', tag);
                
                // Link tag to activity
                const linkResponse = await fetch(`/api/activities/${activityId}/tags`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tag_id: tag.id })
                });

                if (linkResponse.ok) {
                  importResults.successful.push(tag.name);
                  console.log('[XML Import] Tag linked to activity:', tag.name);
                } else {
                  const linkError = await linkResponse.json();
                  if (linkError.message === 'Tag already linked to activity') {
                    importResults.skipped.push(tag.name);
                  } else {
                    console.error('[XML Import] Tag linking error:', linkError);
                    importResults.failed.push({
                      tag: tag.name,
                      error: 'Failed to link to activity'
                    });
                  }
                }
              } catch (tagError: any) {
                console.error('[XML Import] Error processing tag:', xmlTag, tagError);
                importResults.failed.push({
                  tag: tagName,
                  error: tagError.message || 'Unknown error'
                });
              }
            }
            
            // Provide comprehensive feedback
            if (importResults.successful.length > 0) {
              console.log('[XML Import] Successfully imported tags:', importResults.successful);
              toast.success(`${importResults.successful.length} tag(s) imported successfully`);
              
              // Invalidate cache and trigger page reload to show tags
              invalidateActivityCache(activityId);
              
              // Trigger page reload after a short delay to show tags in UI
              setTimeout(() => {
                console.log('[XML Import] Reloading page to display imported tags...');
                window.location.reload();
              }, 1500);
            }
            
            if (importResults.skipped.length > 0) {
              console.log('[XML Import] Skipped tags:', importResults.skipped);
              toast.info(`${importResults.skipped.length} tag(s) already linked to activity`);
            }
            
            if (importResults.failed.length > 0) {
              console.error('[XML Import] Failed tags:', importResults.failed);
              const failedSummary = importResults.failed.slice(0, 3)
                .map(f => `${f.tag}: ${f.error}`)
                .join('; ');
              
              toast.error(`${importResults.failed.length} tag(s) failed to import`, {
                description: failedSummary + (importResults.failed.length > 3 ? '...' : '')
              });
            }
            
            if (importResults.successful.length === 0 && importResults.skipped.length === 0) {
              toast.warning('No tags could be imported', {
                description: 'All tags failed. Please check the console for details.'
              });
            }
          }
        } catch (tagsError: any) {
          console.error('[XML Import] Tags import error:', tagsError);
          toast.error('Failed to import tags', {
            description: `An error occurred while processing tags: ${tagsError.message}`
          });
        }
      }

      // Handle results import
      if (updateData._importResults) {
        console.log('[XML Import] Processing results import...');
        setImportStatus({ 
          stage: 'importing', 
          progress: 89,
          message: 'Importing results framework...'
        });

        try {
          if (parsedActivity.results && parsedActivity.results.length > 0) {
            console.log(`[XML Import] Importing ${parsedActivity.results.length} result(s)...`);
            
            const importResponse = await fetch(`/api/activities/${activityId}/results/import`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                results: parsedActivity.results,
                mode: 'create'
              }),
            });

            if (!importResponse.ok) {
              const errorText = await importResponse.text();
              console.error('[XML Import] Results import failed:', {
                status: importResponse.status,
                statusText: importResponse.statusText,
                error: errorText
              });
              
              let errorMessage = 'Results could not be imported. Main activity data was imported successfully.';
              try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error || errorData.details || errorMessage;
              } catch (e) {
                errorMessage = errorText || errorMessage;
              }
              
              toast.error('Failed to import results', {
                description: errorMessage
              });
            } else {
              const successData = await importResponse.json();
              const summary = successData.summary;
              console.log('[XML Import] Results imported successfully:', summary);
              
              // Store summary for detailed validation report
              setResultsImportSummary(summary);
              
              const successMessage = [
                `${summary.results_created} result(s)`,
                `${summary.indicators_created} indicator(s)`,
                `${summary.periods_created} period(s)`
              ].join(', ');
              
              toast.success('Results imported successfully', {
                description: successMessage
              });
              
              // Show warnings if there were any errors
              if (summary.errors && summary.errors.length > 0) {
                console.warn('[XML Import] Results import had some errors:', summary.errors);
                toast.warning(`${summary.errors.length} item(s) had issues`, {
                  description: summary.errors.slice(0, 2).map((e: any) => e.message).join('; ')
                });
              }
            }
          } else {
            console.log('[XML Import] No results found in parsed activity');
            toast.info('No results found in XML');
          }
        } catch (resultsError: any) {
          console.error('[XML Import] Results import error:', resultsError);
          toast.error('Failed to import results', {
            description: `An error occurred while processing results: ${resultsError.message}`
          });
        }
      }

      // Handle conditions import
      const conditionsField = parsedFields.find(f => f.fieldName === 'Conditions' && f.selected);
      if (conditionsField && (conditionsField as any).isConditionsField && (conditionsField as any).conditionsData) {
        console.log('[XML Import] Processing conditions import...');
        console.log('[XML Import] Conditions data:', (conditionsField as any).conditionsData);
        setImportStatus({ 
          stage: 'importing', 
          progress: 87,
          message: 'Importing conditions...'
        });

        try {
          const conditionsData = (conditionsField as any).conditionsData;
          const totalConditions = conditionsData.conditions.length;
          console.log('[XML Import] Total conditions to process:', totalConditions);
          
          // Delete existing conditions for this activity
          const { error: deleteError } = await supabase
            .from('activity_conditions')
            .delete()
            .eq('activity_id', activityId);
          
          if (deleteError) {
            console.error('[XML Import] Error deleting existing conditions:', deleteError);
            throw deleteError;
          }
          
          // Insert new conditions with validation
          const conditionsToInsert = conditionsData.conditions
            .filter((cond: any) => {
              // Validate condition type (must be '1', '2', or '3')
              const validTypes = ['1', '2', '3'];
              if (!validTypes.includes(cond.type)) {
                console.warn(`[XML Import] Invalid condition type: ${cond.type}, skipping...`);
                return false;
              }
              // Validate narrative is not empty
              if (!cond.narrative || !cond.narrative.trim()) {
                console.warn('[XML Import] Empty condition narrative, skipping...');
                return false;
              }
              return true;
            })
            .map((cond: any) => ({
              activity_id: activityId,
              type: cond.type,
              narrative: { [cond.narrativeLang || 'en']: cond.narrative },
              attached: conditionsData.attached
              // Note: created_by is nullable since app uses custom auth, not Supabase Auth
            }));
          
          console.log('[XML Import] Conditions to insert:', JSON.stringify(conditionsToInsert, null, 2));
          
          if (conditionsToInsert.length > 0) {
            const { data: insertedConditions, error: insertError } = await supabase
              .from('activity_conditions')
              .insert(conditionsToInsert)
              .select();
            
            if (insertError) {
              console.error('[XML Import] Error inserting conditions:', insertError);
              console.error('[XML Import] Insert error details:', JSON.stringify(insertError, null, 2));
              throw insertError;
            }
            
            console.log('[XML Import] Successfully imported conditions:', insertedConditions);
            
            const skippedCount = totalConditions - conditionsToInsert.length;
            if (skippedCount > 0) {
              toast.success(`${conditionsToInsert.length} condition(s) imported successfully`, {
                description: `${skippedCount} invalid condition(s) were skipped`
              });
            } else {
              toast.success(`${conditionsToInsert.length} condition(s) imported successfully`);
            }
            
            // Invalidate cache and trigger page reload to show conditions
            invalidateActivityCache(activityId);
          } else if (totalConditions > 0) {
            toast.warning('No valid conditions to import', {
              description: 'All conditions were invalid or had empty descriptions'
            });
          }
        } catch (conditionsError: any) {
          console.error('[XML Import] Conditions import error:', conditionsError);
          toast.error('Failed to import conditions', {
            description: `An error occurred while processing conditions: ${conditionsError.message}`
          });
        }
      }

      // Handle participating organizations import if any
      if (updateData.importedParticipatingOrgs && updateData.importedParticipatingOrgs.length > 0) {
        console.log('[XML Import] Processing participating organizations import...');
        setImportStatus({ 
          stage: 'importing', 
          progress: 92,
          message: 'Importing participating organizations...'
        });

        try {
          const { IATI_ORGANIZATION_ROLES } = await import('@/data/iati-organization-roles');
          const roleMap: Record<string, 'funding' | 'extending' | 'implementing' | 'government'> = {
            '1': 'funding',
            '2': 'government', // Accountable maps to government
            '3': 'extending',
            '4': 'implementing'
          };

          // Clear existing participating organizations to avoid duplicates
          console.log('[XML Import] Clearing existing participating organizations...');
          const clearResponse = await fetch(`/api/activities/${activityId}/participating-organizations`, {
            method: 'DELETE'
          });
          
          if (clearResponse.ok) {
            console.log('[XML Import] ✅ Cleared existing participating organizations');
          } else {
            console.log('[XML Import] ⚠️ Could not clear existing participating organizations (this is okay if none exist)');
          }

          let successCount = 0;
          let errorCount = 0;

          for (const orgData of updateData.importedParticipatingOrgs) {
            try {
              console.log('[XML Import] Processing org data:', {
                name: orgData.narrative,
                role: orgData.role,
                roleType: typeof orgData.role,
                ref: orgData.ref,
                type: orgData.type,
                crsChannelCode: orgData.crsChannelCode
              });
              
              // Determine role_type from IATI role code
              const roleType = roleMap[orgData.role] || 'implementing';
              console.log('[XML Import] Mapped role', orgData.role, 'to role_type:', roleType);
              
              // Try to find organization in database by IATI ref
              let organizationId = null;
              
              if (orgData.ref) {
                console.log(`[XML Import] Searching for organization with IATI ref: "${orgData.ref}"`);
                
                // Fetch ALL organizations and filter client-side for exact match
                // This is a workaround until the API properly supports iati_org_id filtering
                const searchResponse = await fetch(`/api/organizations`);
                console.log(`[XML Import] Organizations API response status:`, searchResponse.status);
                
                if (searchResponse.ok) {
                  const allOrgs = await searchResponse.json();
                  console.log(`[XML Import] Fetched ${allOrgs.length} total organizations`);
                  
                  // Filter client-side for EXACT IATI ID match
                  const matchedOrg = allOrgs.find((o: any) => 
                    o.iati_org_id && o.iati_org_id.trim() === orgData.ref.trim()
                  );
                  
                  if (matchedOrg) {
                    organizationId = matchedOrg.id;
                    console.log(`[XML Import] ⚠️ Found exact IATI ref match:`, {
                      ref: orgData.ref,
                      matched: matchedOrg.name,
                      matchedIatiId: matchedOrg.iati_org_id,
                      id: matchedOrg.id,
                      logo: matchedOrg.logo ? 'HAS LOGO' : 'NO LOGO'
                    });
                  } else {
                    console.log(`[XML Import] ✓ No organization found with exact IATI ref "${orgData.ref}"`);
                    console.log(`[XML Import] Checked ${allOrgs.length} organizations for match`);
                  }
                } else {
                  console.error(`[XML Import] Organizations API failed:`, searchResponse.status);
                }
              }

              // If not found by ref, try by name (EXACT match only)
              if (!organizationId && orgData.narrative) {
                console.log(`[XML Import] No IATI ref match. Searching by name: "${orgData.narrative}"`);
                
                // Fetch ALL organizations (we already have them from the previous call if ref was checked)
                // Use cached result if available
                const searchResponse = await fetch(`/api/organizations`);
                
                if (searchResponse.ok) {
                  const allOrgs = await searchResponse.json();
                  
                  // Find EXACT match (case-insensitive)
                  const exactMatch = allOrgs.find((org: any) => 
                    (org.name?.toLowerCase().trim() === orgData.narrative?.toLowerCase().trim()) ||
                    (org.acronym?.toLowerCase().trim() === orgData.narrative?.toLowerCase().trim())
                  );
                  
                  if (exactMatch) {
                    organizationId = exactMatch.id;
                    console.log(`[XML Import] ⚠️ Matched organization by exact name "${orgData.narrative}":`, {
                      matched: exactMatch.name,
                      id: exactMatch.id,
                      logo: exactMatch.logo ? 'HAS LOGO' : 'NO LOGO'
                    });
                  } else {
                    console.log(`[XML Import] ✓ No exact name match found for "${orgData.narrative}". Checked ${allOrgs.length} organizations.`);
                  }
                }
              }

              // If still not found, create a new organization
              if (!organizationId) {
                console.log(`[XML Import] Creating new organization: ${orgData.narrative || orgData.ref}`);
                console.log(`[XML Import] New org data:`, {
                  name: orgData.narrative || orgData.ref || 'Imported Organization',
                  iati_org_id: orgData.ref || null,
                  Organisation_Type_Code: orgData.type || null
                });
                
                const createResponse = await fetch('/api/organizations', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: orgData.narrative || orgData.ref || 'Imported Organization',
                    iati_org_id: orgData.ref || null,
                    Organisation_Type_Code: orgData.type || null
                  })
                });

                if (createResponse.ok) {
                  const newOrg = await createResponse.json();
                  organizationId = newOrg.id;
                  console.log(`[XML Import] Created new organization successfully:`, {
                    id: newOrg.id,
                    name: newOrg.name,
                    iati_org_id: newOrg.iati_org_id,
                    logo: newOrg.logo || 'NO LOGO'
                  });
                } else if (createResponse.status === 400) {
                  // Organization might already exist (created by previous import)
                  const errorData = await createResponse.json().catch(() => ({}));
                  console.log(`[XML Import] Organization already exists, searching again:`, errorData);
                  
                  // Try searching one more time (it might have been created moments ago)
                  const retryResponse = await fetch(`/api/organizations?search=${encodeURIComponent(orgData.narrative)}`);
                  if (retryResponse.ok) {
                    const orgs = await retryResponse.json();
                    const exactMatch = orgs.find((org: any) => 
                      org.name?.toLowerCase() === orgData.narrative?.toLowerCase()
                    );
                    
                    if (exactMatch) {
                      organizationId = exactMatch.id;
                      console.log(`[XML Import] Found organization on retry:`, exactMatch.name);
                    } else {
                      console.error(`[XML Import] Organization exists but couldn't find it:`, errorData);
                      errorCount++;
                      continue;
                    }
                  } else {
                    console.error(`[XML Import] Failed to create and retry failed:`, errorData);
                    errorCount++;
                    continue;
                  }
                } else {
                  const errorData = await createResponse.json().catch(() => ({}));
                  console.error(`[XML Import] Failed to create organization:`, errorData);
                  errorCount++;
                  continue;
                }
              }

              // Now create the participating organization record
              const requestBody = {
                organization_id: organizationId,
                role_type: roleType,
                iati_role_code: parseInt(orgData.role) || 4,
                iati_org_ref: orgData.ref || null,
                org_type: orgData.type || null,
                activity_id_ref: null, // Related activity (not used in basic import)
                crs_channel_code: orgData.crsChannelCode || null,
                narrative: orgData.narrative || null,
                narrative_lang: orgData.narrativeLang || 'en',
                narratives: orgData.narratives || [],
                org_activity_id: orgData.activityId || null, // Organization's own activity ID from @activity-id
                reporting_org_ref: null,
                secondary_reporter: false
              };
              
              console.log('[XML Import] Creating participating org with data:', requestBody);
              
              const participatingOrgResponse = await fetch(
                `/api/activities/${activityId}/participating-organizations`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(requestBody)
                }
              );

              console.log('[XML Import] API response status:', participatingOrgResponse.status);
              
              if (participatingOrgResponse.ok) {
                successCount++;
                const createdOrg = await participatingOrgResponse.json();
                console.log(`[XML Import] ✅ Successfully imported participating organization:`, {
                  name: orgData.narrative || orgData.ref,
                  role: roleType,
                  iati_role_code: createdOrg.iati_role_code,
                  crs_channel_code: createdOrg.crs_channel_code,
                  org_type: createdOrg.org_type,
                  id: createdOrg.id
                });
              } else {
                const errorData = await participatingOrgResponse.json().catch(e => ({ message: 'Could not parse error response' }));
                console.error(`[XML Import] ❌ Failed to import participating organization:`, {
                  name: orgData.narrative || orgData.ref,
                  role: orgData.role,
                  roleType: roleType,
                  status: participatingOrgResponse.status,
                  statusText: participatingOrgResponse.statusText,
                  error: errorData,
                  requestData: {
                    organization_id: organizationId,
                    role_type: roleType,
                    iati_role_code: parseInt(orgData.role) || 4,
                    org_type: orgData.type
                  }
                });
                
                // If it's a duplicate (409), it might be okay
                if (participatingOrgResponse.status === 409) {
                  console.warn('[XML Import] Organization already exists in this role - skipping');
                } else {
                  errorCount++;
                }
              }
            } catch (orgError) {
              console.error(`[XML Import] Error importing participating organization:`, orgError);
              errorCount++;
            }
          }

          if (successCount > 0) {
            toast.success(`Participating organizations imported successfully`, {
              description: `${successCount} organization(s) added to the activity${errorCount > 0 ? ` (${errorCount} failed)` : ''}`
            });
          }

          if (errorCount > 0 && successCount === 0) {
            toast.error('Failed to import participating organizations', {
              description: `${errorCount} organization(s) could not be imported`
            });
          }
        } catch (participatingOrgsError: any) {
          console.error('[XML Import] Participating organizations import error:', participatingOrgsError);
          toast.error('Failed to import participating organizations', {
            description: `An error occurred: ${participatingOrgsError.message}`
          });
        }
      }

      // Handle related activities import if any
      if (updateData.importedRelatedActivities && updateData.importedRelatedActivities.length > 0) {
        console.log('[XML Import] Processing related activities import...');
        setImportStatus({ 
          stage: 'importing', 
          progress: 95,
          message: 'Importing related activities...'
        });

        try {
          let successCount = 0;
          let errorCount = 0;
          let skippedCount = 0;

          for (const relatedActivityData of updateData.importedRelatedActivities) {
            try {
              console.log('[XML Import] Processing related activity:', {
                ref: relatedActivityData.ref,
                type: relatedActivityData.type,
                relationshipTypeLabel: relatedActivityData.relationshipTypeLabel
              });

              // First, try to find the activity by IATI identifier with comprehensive logging
              const searchUrl = `/api/activities/search?q=${encodeURIComponent(relatedActivityData.ref)}`;
              console.log(`[XML Import] Searching for activity with IATI ID: ${relatedActivityData.ref}`);
              console.log(`[XML Import] Search URL: ${searchUrl}`);
              
              const findActivityResponse = await fetch(searchUrl);
              
              console.log(`[XML Import] Search API response status: ${findActivityResponse.status} ${findActivityResponse.statusText}`);
              
              if (!findActivityResponse.ok) {
                console.error(`[XML Import] Search API failed for ${relatedActivityData.ref}:`, {
                  status: findActivityResponse.status,
                  statusText: findActivityResponse.statusText
                });
                skippedCount++;
                continue;
              }

              const searchData = await findActivityResponse.json();
              console.log(`[XML Import] Search response data:`, searchData);
              
              // Validate response structure
              if (!searchData || typeof searchData !== 'object') {
                console.error(`[XML Import] Invalid search response structure for ${relatedActivityData.ref}:`, searchData);
                errorCount++;
                continue;
              }
              
              if (!Array.isArray(searchData.activities)) {
                console.error(`[XML Import] Search response activities is not an array for ${relatedActivityData.ref}:`, searchData.activities);
                errorCount++;
                continue;
              }
              
              const searchResults = searchData.activities;
              console.log(`[XML Import] Found ${searchResults.length} matching activities`);
              
              if (searchResults.length > 0) {
                console.log(`[XML Import] First match:`, {
                  id: searchResults[0].id,
                  title: searchResults[0].title_narrative,
                  iatiId: searchResults[0].iati_identifier
                });
              }
              
              if (searchResults.length === 0) {
                console.warn(`[XML Import] No activities found with IATI ID: ${relatedActivityData.ref}`);
                skippedCount++;
                continue;
              }

              const targetActivity = searchResults[0];
              console.log(`[XML Import] Selected target activity:`, {
                id: targetActivity.id,
                title: targetActivity.title_narrative || 'Untitled'
              });

              // Create the relationship
              const relationshipData = {
                linkedActivityId: targetActivity.id,
                relationshipType: relatedActivityData.type,
                narrative: `Imported from XML - ${relatedActivityData.relationshipTypeLabel}`
              };

              const createResponse = await fetch(`/api/activities/${activityId}/linked`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(relationshipData)
              });

              if (createResponse.ok) {
                console.log(`[XML Import] ✅ Successfully linked activity: ${relatedActivityData.ref}`);
                successCount++;
              } else {
                const errorData = await createResponse.json().catch(() => ({}));
                console.error(`[XML Import] Failed to create relationship:`, errorData);
                errorCount++;
              }

            } catch (error) {
              console.error(`[XML Import] Exception while searching for activity ${relatedActivityData.ref}:`, error);
              errorCount++;
            }
          }

          // Show results
          if (successCount > 0) {
            toast.success(`Related activities imported successfully`, {
              description: `${successCount} relationship(s) created${skippedCount > 0 ? ` (${skippedCount} not found in database)` : ''}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`
            });
          }

          if (skippedCount > 0 && successCount === 0) {
            toast.warning('Some related activities were skipped', {
              description: `${skippedCount} related activities were not found in the database. They may need to be imported first.`
            });
          }

          if (errorCount > 0 && successCount === 0) {
            toast.error('Failed to import related activities', {
              description: `${errorCount} relationship(s) could not be created`
            });
          }

        } catch (relatedActivitiesError: any) {
          console.error('[XML Import] Related activities import error:', relatedActivitiesError);
          toast.error('Failed to import related activities', {
            description: `An error occurred: ${relatedActivitiesError.message}`
          });
        }
      }

      // Update local activity data to reflect changes
      setCurrentActivityData(prev => ({
        ...prev,
        ...updateData
      }));

      // Trigger autosave indicators for imported fields
      if (typeof window !== 'undefined' && user?.id) {
        selectedFieldsList.forEach(field => {
          // Map field names to their localStorage keys for autosave indicators
          let saveKey = '';
          switch (field.fieldName) {
            case 'Activity Title':
              saveKey = 'title';
              break;
            case 'Activity Description':
              saveKey = 'description';
              break;
            case 'Activity Description - Objectives':
              saveKey = 'descriptionObjectives';
              break;
            case 'Activity Description - Target Groups':
              saveKey = 'descriptionTargetGroups';
              break;
            case 'Activity Description - Other':
              saveKey = 'descriptionOther';
              break;
            case 'Activity Status':
              saveKey = 'activityStatus';
              break;
            case 'Collaboration Type':
              saveKey = 'collaborationType';
              break;
            case 'IATI Identifier':
              saveKey = 'iatiIdentifier';
              break;
            case 'Activity Scope':
              saveKey = 'activityScope';
              break;
            case 'Narrative Language':
              saveKey = 'language';
              break;
            case 'Default Currency':
              saveKey = 'defaultCurrency';
              break;
            case 'Default Aid Type':
              saveKey = 'defaultAidType';
              break;
            case 'Default Finance Type':
              saveKey = 'defaultFinanceType';
              break;
            case 'Default Flow Type':
              saveKey = 'defaultFlowType';
              break;
            case 'Default Tied Status':
              saveKey = 'defaultTiedStatus';
              break;
            case 'Capital Spend Percentage':
              saveKey = 'capitalSpendPercentage';
              break;
            case 'Planned Start Date':
              saveKey = 'plannedStartDate';
              console.log(`[XML Import] Date field mapping: ${field.fieldName} -> ${saveKey} with value: ${field.importValue}`);
              break;
            case 'Planned End Date':
              saveKey = 'plannedEndDate';
              console.log(`[XML Import] Date field mapping: ${field.fieldName} -> ${saveKey} with value: ${field.importValue}`);
              break;
            case 'Actual Start Date':
              saveKey = 'actualStartDate';
              console.log(`[XML Import] Date field mapping: ${field.fieldName} -> ${saveKey} with value: ${field.importValue}`);
              break;
            case 'Actual End Date':
              saveKey = 'actualEndDate';
              console.log(`[XML Import] Date field mapping: ${field.fieldName} -> ${saveKey} with value: ${field.importValue}`);
              break;
            case 'Recipient Countries':
              saveKey = 'recipient_countries';
              break;
            case 'Recipient Regions':
              saveKey = 'recipient_regions';
              break;
            default:
              // For other fields, use a generic key
              saveKey = field.fieldName.toLowerCase().replace(/\s+/g, '_');
          }
          
          if (saveKey) {
            console.log(`[XML Import] Marking field as saved: ${saveKey}`);
            setFieldSaved(activityId, user.id, saveKey);
          }
        });
        
        console.log('[XML Import] All imported fields marked as saved - green ticks should appear');
        
        // Trigger a gentle refresh to show the green ticks
        setTimeout(() => {
          window.dispatchEvent(new Event('storage'));
        }, 100);
      }

      setImportStatus({ stage: 'complete' });
      toast.success(`Successfully imported ${selectedFieldsList.length} fields from XML`, {
        description: 'Activity data has been updated and saved to the database.'
      });

      // Clear refined sectors after successful import
      setSavedRefinedSectors([]);

      // Trigger a page refresh after a short delay to ensure all components get fresh data
      setTimeout(() => {
        console.log('[XML Import] Refreshing page to show updated data');
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error('Import error:', error);
      setImportStatus({ 
        stage: 'error', 
        message: 'Import failed. Please try again.' 
      });
      toast.error('Import failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  // Reset import
  const resetImport = () => {
    setSelectedFile(null);
    setParsedFields([]);
    setImportStatus({ stage: 'idle' });
    setXmlContent('');
    setShowXmlPreview(false);
    setXmlUrl('');
    setImportMethod('file');
    setXmlMetadata(null);
    setResultsImportSummary(null);
    // Clear cache for this activity
    if (activityId) {
      parsedXmlCache.delete(activityId);
    }
  };

  // Helper function to organize fields by tabs
  const organizeFieldsByTabs = (fields: ParsedField[]): TabSection[] => {
    const tabMap = new Map<string, TabSection>();
    
    // Define tab display names
    const tabNames: Record<string, string> = {
      'basic': 'General',
      'policy-markers': 'Policy Markers',
      'finances': 'Finances', // This will be the main finances tab
      'locations': 'Locations',
      'sectors': 'Sectors',
      'partners': 'Partners',
      'contacts': 'Contacts',
      'results': 'Results',
      'country-budget': 'Budget Mapping'
    };

    // Basic tabs that should be grouped under main General tab
    const basicTabs = ['identifiers_ids', 'dates', 'descriptions', 'other'];
    
    // Financial tabs that should be grouped under main Finances tab
    const financialTabs = ['finances', 'budgets', 'planned_disbursements', 'transactions'];
    
    // Partner tabs that should be grouped under main Partners tab
    const partnerTabs = ['reporting_org', 'participating_orgs'];

    fields.forEach(field => {
      let tabKey = field.tab;
      
      // Group basic tabs under main 'basic' tab
      if (basicTabs.includes(field.tab)) {
        tabKey = 'basic';
      }
      
      // Group financial tabs under main 'finances' tab
      if (financialTabs.includes(field.tab)) {
        tabKey = 'finances';
      }
      
      // Group partner tabs under main 'partners' tab
      if (partnerTabs.includes(field.tab)) {
        tabKey = 'partners';
      }
      
      if (!tabMap.has(tabKey)) {
        tabMap.set(tabKey, {
          tabId: tabKey,
          tabName: tabNames[tabKey] || tabKey,
          fields: []
        });
      }
      tabMap.get(tabKey)!.fields.push(field);
    });

    return Array.from(tabMap.values()).sort((a, b) => {
      const order = ['basic', 'partners', 'contacts', 'sectors', 'policy-markers', 'locations', 'finances', 'country-budget', 'results'];
      return order.indexOf(a.tabId) - order.indexOf(b.tabId);
    });
  };

  // Individual field row component for table display
  const FieldRow = ({ field, globalIndex }: { field: ParsedField; globalIndex: number }) => (
    <tr className="bg-white hover:bg-gray-50">
      <td className="px-4 py-3 text-center">
        <Switch
          checked={field.selected}
          onCheckedChange={(checked) => toggleFieldSelection(globalIndex, checked)}
        />
      </td>
      <td className="px-4 py-3 w-32">
        <div>
          <p className="font-medium text-sm text-gray-900">{field.fieldName}</p>
          {(field as any).needsRefinement && (
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSectorRefinement((field as any).importedSectors)}
                className="text-xs"
              >
                <Settings className="h-3 w-3 mr-1" />
                Refine Sectors
              </Button>
            </div>
          )}
          {field.isFinancialItem && (
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => openFinancialDetailModal(field)}
                className="text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                Select Fields
              </Button>
            </div>
          )}
          {field.isTagField && (
            <div className="mt-1">
              <p className="text-xs text-gray-500">{(field as any).tagData?.length || 0} tag(s) from XML</p>
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3 w-40">
        <div className="space-y-1">
        {field.currentValue ? (
            Array.isArray(field.currentValue) ? (
              field.currentValue.map((item, index) => (
                <div key={index} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.code}</span>
                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    {item.percentage && (
                      <span className="text-xs text-gray-500 font-normal">({Number(item.percentage).toFixed(2)}%)</span>
                    )}
                    {item.vocabulary && (
                      <>
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.vocabulary.split(' ')[0]}</span>
                        <span className="text-xs text-gray-400 font-normal ml-1">{item.vocabulary.split(' ').slice(1).join(' ')}</span>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : field.isPolicyMarker ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.currentValue.code}</span>
                  <span className="text-sm font-medium text-gray-900">Policy Marker</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Significance:</span>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.currentValue.significance}</span>
                  {field.currentValue.vocabulary && (
                    <>
                      <span className="text-xs text-gray-500 ml-2">Vocabulary:</span>
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.currentValue.vocabulary}</span>
                    </>
                  )}
                </div>
                {field.currentValue.rationale && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Rationale:</span>
                    <span className="text-xs text-gray-600 truncate max-w-32">{field.currentValue.rationale}</span>
                  </div>
                )}
              </div>
            ) : field.tab === 'contacts' && typeof field.currentValue === 'object' ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.currentValue.type}</span>
                  <span className="text-sm font-medium text-gray-900">Contact</span>
                </div>
                {field.currentValue.personName && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Name:</span>
                    <span className="text-xs text-gray-600 truncate max-w-32">{field.currentValue.personName}</span>
                  </div>
                )}
                {field.currentValue.organization && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Organization:</span>
                    <span className="text-xs text-gray-600 truncate max-w-32">{field.currentValue.organization}</span>
                  </div>
                )}
                {field.currentValue.jobTitle && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Position:</span>
                    <span className="text-xs text-gray-600 truncate max-w-32">{field.currentValue.jobTitle}</span>
                  </div>
                )}
                {field.currentValue.email && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Email:</span>
                    <span className="text-xs text-gray-600 truncate max-w-32">{field.currentValue.email}</span>
                  </div>
                )}
                {field.currentValue.telephone && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Phone:</span>
                    <span className="text-xs text-gray-600 truncate max-w-32">{field.currentValue.telephone}</span>
                  </div>
                )}
              </div>
            ) : field.tab === 'participating_orgs' && typeof field.currentValue === 'object' ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.currentValue.role}</span>
                  <span className="text-sm font-medium text-gray-900">Participating Org</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Name:</span>
                  <span className="text-xs text-gray-600 truncate max-w-32">{field.currentValue.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Role:</span>
                  <span className="text-xs text-gray-600 truncate max-w-32">{field.currentValue.role}</span>
                </div>
                {field.currentValue.ref && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Ref:</span>
                    <span className="text-xs text-gray-600 truncate max-w-32">{field.currentValue.ref}</span>
                  </div>
                )}
                {field.currentValue.type && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Type:</span>
                    <span className="text-xs text-gray-600 truncate max-w-32">{field.currentValue.type}</span>
                  </div>
                )}
              </div>
            ) : field.tab === 'reporting_org' && typeof field.currentValue === 'object' ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Reporting</span>
                  <span className="text-sm font-medium text-gray-900">Organization</span>
                </div>
                {field.currentValue.name && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Name:</span>
                    <span className="text-xs text-gray-600 truncate max-w-32">{field.currentValue.name}</span>
                  </div>
                )}
                {field.currentValue.acronym && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">Acronym:</span>
                    <span className="text-xs text-gray-600 truncate max-w-32">{field.currentValue.acronym}</span>
                  </div>
                )}
              </div>
            ) : typeof field.currentValue === 'object' && field.currentValue?.code ? (
              <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.currentValue.code}</span>
              <span className="text-sm font-medium text-gray-900">{field.currentValue.name}</span>
                {field.currentValue.vocabulary && (
                  <>
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.currentValue.vocabulary.split(' ')[0]}</span>
                    <span className="text-xs text-gray-400 font-normal ml-1">{field.currentValue.vocabulary.split(' ').slice(1).join(' ')}</span>
                  </>
                )}
            </div>
          ) : field.fieldName === 'IATI Identifier' ? (
            <span className="text-sm font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.currentValue}</span>
          ) : (
            <span className="text-sm font-medium text-gray-900">{field.currentValue}</span>
          )
        ) : (
          <span className="text-sm text-gray-400 italic">Empty</span>
        )}
        </div>
      </td>
      <td className="px-4 py-3 w-40">
        <div className="space-y-1">
          {field.tab === 'identifiers_ids' && field.fieldName.startsWith('Other Identifier') && typeof field.importValue === 'object' ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.importValue.code}</span>
              </div>
              <div className="flex items-center gap-1 flex-nowrap">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.importValue.type}</span>
                <span className="text-sm text-gray-900 whitespace-nowrap">{field.importValue.name}</span>
              </div>
            </div>
          ) : field.isPolicyMarker ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.importValue.code}</span>
                <span className="text-sm font-medium text-gray-900">Policy Marker</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Significance:</span>
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.importValue.significance}</span>
                {field.importValue.vocabulary && (
                  <>
                    <span className="text-xs text-gray-500 ml-2">Vocabulary:</span>
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.importValue.vocabulary}</span>
                  </>
                )}
              </div>
              {field.importValue.rationale && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Rationale:</span>
                  <span className="text-xs text-gray-600 truncate max-w-32">{field.importValue.rationale}</span>
                </div>
              )}
            </div>
          ) : field.isTagField && (field as any).tagData ? (
            <div className="flex flex-col gap-2">
              {((field as any).tagData || []).slice(0, 3).map((tag: any, index: number) => (
                <div key={index} className="flex items-center gap-1 flex-wrap">
                  {tag.vocabulary && (
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                      tag.vocabulary === '1' ? 'bg-blue-100 text-blue-700' : 
                      tag.vocabulary === '99' ? 'bg-purple-100 text-purple-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {tag.vocabulary === '1' ? 'Standard' : tag.vocabulary === '99' ? 'Custom' : `Vocab ${tag.vocabulary}`}
                    </span>
                  )}
                  {tag.code && (
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{tag.code}</span>
                  )}
                  <span className="text-sm font-medium text-gray-900">{tag.narrative || 'Unnamed tag'}</span>
                  {tag.vocabularyUri && (
                    <span className="text-xs text-gray-500 italic truncate max-w-32" title={tag.vocabularyUri}>
                      {tag.vocabularyUri.substring(0, 30)}...
                    </span>
                  )}
                </div>
              ))}
              {((field as any).tagData || []).length > 3 && (
                <span className="text-xs text-gray-500 italic">
                  +{((field as any).tagData || []).length - 3} more tag(s)
                </span>
              )}
            </div>
          ) : field.tab === 'contacts' && typeof field.importValue === 'object' ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.importValue.type}</span>
                <span className="text-sm font-medium text-gray-900">Contact</span>
              </div>
              {field.importValue.personName && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Name:</span>
                  <span className="text-xs text-gray-600 truncate max-w-32">{field.importValue.personName}</span>
                </div>
              )}
              {field.importValue.jobTitle && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Position:</span>
                  <span className="text-xs text-gray-600 truncate max-w-32">{field.importValue.jobTitle}</span>
                </div>
              )}
              {field.importValue.organization && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Organization:</span>
                  <span className="text-xs text-gray-600 truncate max-w-32">{field.importValue.organization}</span>
                </div>
              )}
              {field.importValue.email && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Email:</span>
                  <span className="text-xs text-gray-600 truncate max-w-32">{field.importValue.email}</span>
                </div>
              )}
              {field.importValue.telephone && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Phone:</span>
                  <span className="text-xs text-gray-600 truncate max-w-32">{field.importValue.telephone}</span>
                </div>
              )}
            </div>
          ) : field.tab === 'participating_orgs' && typeof field.importValue === 'object' ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
                <span className="text-sm font-medium text-gray-900">Participating Org</span>
              </div>
              <div className="text-xs text-gray-900 truncate max-w-32">{field.importValue.name}</div>
              {field.importValue.role && (() => {
                const roleInfo = getOrganizationRoleLabel(field.importValue.role);
                return roleInfo ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{roleInfo.code}</span>
                    <span className="text-xs text-gray-600">{roleInfo.name}</span>
                  </div>
                ) : null;
              })()}
              {field.importValue.ref && (
                <div className="flex items-center">
                  <span className="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-48">{field.importValue.ref}</span>
                </div>
              )}
              {field.importValue.type && (() => {
                const typeInfo = getOrganizationTypeLabel(field.importValue.type);
                return typeInfo ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{typeInfo.code}</span>
                    <span className="text-xs text-gray-600">{typeInfo.name}</span>
                  </div>
                ) : null;
              })()}
            </div>
          ) : field.tab === 'reporting_org' && typeof field.importValue === 'object' ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Reporting</span>
                <span className="text-sm font-medium text-gray-900">Organization</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Name:</span>
                <span className="text-xs text-gray-600 truncate max-w-32">{field.importValue.name}</span>
              </div>
              {field.importValue.ref && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Ref:</span>
                  <span className="text-xs text-gray-600 truncate max-w-32">{field.importValue.ref}</span>
                </div>
              )}
              {field.importValue.type && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">Type:</span>
                  <span className="text-xs text-gray-600 truncate max-w-32">{field.importValue.type}</span>
                </div>
              )}
            </div>
          ) : Array.isArray(field.importValue) ? (
            field.importValue.map((item, index) => (
              <div key={index} className={`flex flex-col gap-1 ${item.locked ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.code}</span>
                  <span className={`text-sm font-medium ${item.locked ? 'text-gray-500' : 'text-gray-900'}`}>{item.name}</span>
                  {item.percentage && (
                    <span className="text-xs text-gray-500 font-normal">({Number(item.percentage).toFixed(2)}%)</span>
                  )}
                  {item.locked && (
                    <Lock className="h-3 w-3 text-gray-500" />
                  )}
                  {item.vocabulary && (
                    <>
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{item.vocabulary.split(' ')[0]}</span>
                      <span className="text-xs text-gray-400 font-normal ml-1">{item.vocabulary.split(' ').slice(1).join(' ')}</span>
                    </>
                  )}
                </div>
              </div>
            ))
          ) : field.tab === 'identifiers_ids' && field.fieldName.startsWith('Other Identifier') && typeof field.importValue === 'object' ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.importValue.code}</span>
              </div>
              <div className="flex items-center gap-1 flex-nowrap">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.importValue.type}</span>
                <span className="text-sm text-gray-900 whitespace-nowrap">{field.importValue.name}</span>
              </div>
            </div>
          ) : typeof field.importValue === 'object' && field.importValue?.code ? (
              <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.importValue.code}</span>
                <span className="text-sm font-medium text-gray-900">{field.importValue.name}</span>
                    {field.importValue.vocabulary && (
                <>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.importValue.vocabulary.split(' ')[0]}</span>
                  <span className="text-xs text-gray-400 font-normal ml-1">{field.importValue.vocabulary.split(' ').slice(1).join(' ')}</span>
                </>
              )}
            </div>
          ) : typeof field.importValue === 'object' ? (
            <span className="text-sm text-gray-600 italic">Complex data</span>
          ) : field.fieldName === 'IATI Identifier' ? (
            <span className="text-sm font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.importValue}</span>
          ) : (
            <span className="text-sm font-medium text-gray-900">{field.importValue}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-left w-40">
        <div className="space-y-1 text-left">
        {field.hasConflict ? (
          <Badge variant="outline" className="text-xs border-orange-400 text-orange-700">
            <AlertCircle className="h-3 w-3 mr-1" />
            Conflict
          </Badge>
        ) : (field as any).refinedSectors ? (
          <Badge variant="outline" className="text-xs border-green-400 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Resolved
          </Badge>
        ) : field.currentValue ? (
          <Badge variant="outline" className="text-xs border-green-400 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            Match
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs border-blue-400 text-blue-700">
            <Info className="h-3 w-3 mr-1" />
            New
          </Badge>
        )}
          {(field as any).needsRefinement && !(field as any).refinedSectors && (
            <Badge variant="outline" className="text-xs border-yellow-400 text-yellow-700">
              <AlertCircle className="h-3 w-3 mr-1" />
              3-digit categories detected
            </Badge>
          )}
          {(field as any).hasNonDacSectors && !(field as any).refinedSectors && (
            <Badge variant="outline" className="text-xs border-red-400 text-red-700">
              <AlertCircle className="h-3 w-3 mr-1" />
              {(field as any).nonDacSectors?.length || 0} non-DAC sectors excluded
            </Badge>
          )}
        </div>
      </td>
    </tr>
  );

  // Financial sub-tabs component
  const FinancialTabContent = ({ tabSection }: { tabSection: TabSection }) => {
    const [activeFinancialTab, setActiveFinancialTab] = useState('finances');
    
    // Group financial fields by their original tab
    const financialSubTabs = {
      'finances': { name: 'Finances', fields: tabSection.fields.filter(f => f.tab === 'finances') },
      'budgets': { name: 'Budgets', fields: tabSection.fields.filter(f => f.tab === 'budgets') },
      'planned_disbursements': { name: 'Planned Disbursements', fields: tabSection.fields.filter(f => f.tab === 'planned_disbursements') },
      'transactions': { name: 'Transactions', fields: tabSection.fields.filter(f => f.tab === 'transactions') }
    };
    
    const activeSubTab = financialSubTabs[activeFinancialTab as keyof typeof financialSubTabs];
    
    return (
      <div className="space-y-4">
        {/* Financial Sub-tabs */}
        <Tabs value={activeFinancialTab} onValueChange={setActiveFinancialTab}>
          <TabsList className="grid w-full grid-cols-4">
            {Object.entries(financialSubTabs).map(([key, subTab]) => (
              <TabsTrigger key={key} value={key} className="text-sm">
                {subTab.name}
                {subTab.fields.length > 0 && (
                  <span className="ml-1 text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full">
                    {subTab.fields.filter(f => f.selected).length}/{subTab.fields.length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {Object.entries(financialSubTabs).map(([key, subTab]) => (
            <TabsContent key={key} value={key} className="mt-4">
              <RegularTabContent fields={subTab.fields} tabName={subTab.name} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  };

  // Basic sub-tabs component
  const BasicTabContent = ({ tabSection }: { tabSection: TabSection }) => {
    // Group basic fields by their original tab
    const basicSubTabs = {
      'identifiers_ids': { name: 'Identifiers & IDs', fields: tabSection.fields.filter(f => f.tab === 'identifiers_ids') },
      'dates': { name: 'Dates', fields: tabSection.fields.filter(f => f.tab === 'dates') },
      'descriptions': { name: 'Descriptions', fields: tabSection.fields.filter(f => f.tab === 'descriptions') },
      'other': { name: 'Other', fields: tabSection.fields.filter(f => f.tab === 'other') }
    };
    
    return (
      <div className="space-y-4">
        {/* Basic Sub-tabs */}
        <Tabs value={activeBasicTab} onValueChange={setActiveBasicTab}>
          <TabsList className="grid w-full grid-cols-4">
            {Object.entries(basicSubTabs).map(([key, subTab]) => (
              <TabsTrigger key={key} value={key} className="text-sm">
                {subTab.name}
                {subTab.fields.length > 0 && (
                  <span className="ml-1 text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full">
                    {subTab.fields.filter(f => f.selected).length}/{subTab.fields.length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {Object.entries(basicSubTabs).map(([key, subTab]) => (
            <TabsContent key={key} value={key} className="mt-4">
              <RegularTabContent fields={subTab.fields} tabName={subTab.name} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  };

  // Partners sub-tabs component
  const PartnersTabContent = ({ tabSection }: { tabSection: TabSection }) => {
    // Group partner fields by their original tab
    const partnerSubTabs = {
      'reporting_org': { name: 'Reporting Organisation', fields: tabSection.fields.filter(f => f.tab === 'reporting_org') },
      'participating_orgs': { name: 'Participating Organisations', fields: tabSection.fields.filter(f => f.tab === 'participating_orgs') }
    };
    
    return (
      <div className="space-y-4">
        {/* Partners Sub-tabs */}
        <Tabs value={activePartnerTab} onValueChange={setActivePartnerTab}>
          <TabsList className="grid w-full grid-cols-2">
            {Object.entries(partnerSubTabs).map(([key, subTab]) => (
              <TabsTrigger key={key} value={key} className="text-sm">
                {subTab.name}
                {subTab.fields.length > 0 && (
                  <span className="ml-1 text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full">
                    {subTab.fields.filter(f => f.selected).length}/{subTab.fields.length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {Object.entries(partnerSubTabs).map(([key, subTab]) => (
            <TabsContent key={key} value={key} className="mt-4">
              <RegularTabContent fields={subTab.fields} tabName={subTab.name} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  };
  
  // Regular tab content component
  const RegularTabContent = ({ fields, tabName }: { fields: ParsedField[]; tabName: string }) => {
    const tabFieldsSelected = fields.filter(f => f.selected).length;
    const tabFieldsTotal = fields.length;

    return (
      <div className="space-y-4">
        {/* Tab header with selection controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
            {/* Removed redundant badges */}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fields.forEach((field) => {
                  const globalIndex = parsedFields.indexOf(field);
                  toggleFieldSelection(globalIndex, true);
                });
              }}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fields.forEach((field) => {
                  const globalIndex = parsedFields.indexOf(field);
                  toggleFieldSelection(globalIndex, false);
                });
              }}
            >
              Clear All
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center w-20">
                  Import
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Field
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  Current Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  Import Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {fields.map((field, index) => {
                const globalIndex = parsedFields.indexOf(field);
                return (
                  <FieldRow 
                    key={`${field.tab}-${index}`}
                    field={field}
                    globalIndex={globalIndex}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  // Policy markers tab content component with Select All/Clear All functionality
  const PolicyMarkersTabContent = ({ fields, tabName }: { fields: ParsedField[]; tabName: string }) => {
    const policyMarkerFields = fields.filter(f => f.isPolicyMarker);
    const selectedCount = policyMarkerFields.filter(f => f.selected).length;
    const totalCount = policyMarkerFields.length;

    const selectAllPolicyMarkers = () => {
      const newFields = [...parsedFields];
      policyMarkerFields.forEach(policyField => {
        const index = parsedFields.findIndex(f => f === policyField);
        if (index !== -1) {
          newFields[index] = { ...newFields[index], selected: true };
        }
      });
      setParsedFields(newFields);
    };

    const clearAllPolicyMarkers = () => {
      const newFields = [...parsedFields];
      policyMarkerFields.forEach(policyField => {
        const index = parsedFields.findIndex(f => f === policyField);
        if (index !== -1) {
          newFields[index] = { ...newFields[index], selected: false };
        }
      });
      setParsedFields(newFields);
    };

    return (
      <div className="space-y-4">
        {/* Policy markers header with selection controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-medium">{tabName}</h3>
            <div className="text-sm text-gray-600">
              {selectedCount} of {totalCount} policy markers selected
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllPolicyMarkers}
              disabled={selectedCount === 0}
            >
              Clear All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllPolicyMarkers}
              disabled={selectedCount === totalCount}
            >
              Select All
            </Button>
          </div>
        </div>

        {/* Policy markers table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  Import
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Policy Marker
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Import Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {policyMarkerFields.map((field, index) => {
                const globalIndex = parsedFields.findIndex(f => f === field);
                return (
                  <FieldRow key={globalIndex} field={field} globalIndex={globalIndex} />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  
  // Main tab content component that chooses between basic, financial, partners, and regular
  const TabFieldContent = ({ tabSection }: { tabSection: TabSection }) => {
    if (tabSection.tabId === 'basic') {
      return <BasicTabContent tabSection={tabSection} />;
    }
    if (tabSection.tabId === 'finances') {
      return <FinancialTabContent tabSection={tabSection} />;
    }
    if (tabSection.tabId === 'partners') {
      return <PartnersTabContent tabSection={tabSection} />;
    }
    if (tabSection.tabId === 'policy-markers') {
      return <PolicyMarkersTabContent fields={tabSection.fields} tabName={tabSection.tabName} />;
    }
    return <RegularTabContent fields={tabSection.fields} tabName={tabSection.tabName} />;
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar - Show during parsing */}
      {(importStatus.stage === 'uploading' || importStatus.stage === 'parsing' || importStatus.stage === 'importing') && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-medium">
                    {importStatus.stage === 'uploading' && 'Uploading XML file...'}
                    {importStatus.stage === 'parsing' && 'Parsing XML content...'}
                    {importStatus.stage === 'importing' && (importStatus.message || 'Importing data...')}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {importStatus.progress || 0}%
                </span>
              </div>
              <Progress 
                value={importStatus.progress || 0} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Method Selection and Input */}
      {importStatus.stage === 'idle' && !selectedFile && !xmlContent && (
        <div>
            {/* Method Selection */}
            <div className="mb-6">
              <Label className="text-base font-medium">Import Method</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  variant={importMethod === 'file' ? 'default' : 'outline'}
                  onClick={() => {
                    setImportMethod('file');
                    setXmlUrl('');
                    setSnippetContent('');
                  }}
                  className="flex-1"
                >
                  <FileCode className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
                <Button
                  variant={importMethod === 'url' ? 'default' : 'outline'}
                  onClick={() => {
                    setImportMethod('url');
                    setXmlUrl('');
                    setSnippetContent('');
                  }}
                  className="flex-1"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  From URL
                </Button>
                <Button
                  variant={importMethod === 'snippet' ? 'default' : 'outline'}
                  onClick={() => {
                    setImportMethod('snippet');
                    setXmlUrl('');
                  }}
                  className="flex-1"
                >
                  <ClipboardPaste className="h-4 w-4 mr-2" />
                  Paste Snippet
                </Button>
              </div>
            </div>

            {/* File Upload Section */}
            {importMethod === 'file' && (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                onClick={() => document.getElementById('xml-upload')?.click()}
              >
                <FileCode className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Drop your IATI XML file here, or click to browse</p>
                <p className="text-sm text-gray-500 mb-4">Supports standard IATI Activity XML format</p>
                <input
                  type="file"
                  accept=".xml,text/xml"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="xml-upload"
                />
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Select XML File
                </Button>
              </div>
            )}

            {/* URL Input Section */}
            {importMethod === 'url' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Link className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Enter the URL of an IATI XML file</p>
                  <p className="text-sm text-gray-500 mb-4">Must be a publicly accessible XML document</p>
                  
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="relative">
                      <Input
                        ref={urlInputRef}
                        type="url"
                        placeholder="https://example.com/iati-activity.xml"
                        value={xmlUrl}
                        onChange={(e) => {
                          console.log('[XML Import Debug] URL input onChange:', e.target.value);
                          setXmlUrl(e.target.value);
                        }}
                        onPaste={(e) => {
                          // Skip if we're using the paste button to avoid conflicts
                          if (isUsingPasteButton) {
                            return;
                          }
                          
                          // Prevent default to avoid duplication, then manually set the value
                          e.preventDefault();
                          const pastedText = e.clipboardData.getData('text');
                          console.log('[XML Import Debug] Manual paste - pasted text:', pastedText);
                          if (pastedText && pastedText.trim()) {
                            // Extract the clean URL by finding the first occurrence of the URL pattern
                            const urlPattern = /https?:\/\/[^\s]+/;
                            const match = pastedText.match(urlPattern);
                            const cleanUrl = match ? match[0] : pastedText.trim();
                            
                            console.log('[XML Import Debug] Manual paste - clean URL:', cleanUrl);
                            setXmlUrl(cleanUrl);
                          }
                        }}
                        className="text-center pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handlePasteUrl}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                        title="Paste from clipboard"
                      >
                        <ClipboardPaste className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button 
                      onClick={parseXmlFile}
                      disabled={!xmlUrl.trim() || isParsing}
                      className="w-full"
                    >
                      {isParsing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Parsing XML...
                        </>
                      ) : (
                        <>
                          <Globe className="h-4 w-4 mr-2" />
                          Fetch and Parse XML
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Snippet Input Section */}
            {importMethod === 'snippet' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="xml-snippet" className="text-sm font-medium">Paste IATI XML Snippet</Label>
                  <Textarea
                    id="xml-snippet"
                    placeholder="Paste any IATI XML snippet here (transactions, organizations, locations, sectors, etc.)..."
                    value={snippetContent}
                    onChange={(e) => setSnippetContent(e.target.value)}
                    className="font-mono text-sm min-h-[300px] mt-2"
                  />
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <span>{snippetContent.length} characters</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSnippetContent('')}
                      disabled={!snippetContent}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <Button 
                  onClick={parseXmlFile}
                  disabled={!snippetContent.trim() || isParsing}
                  className="w-full"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Parsing Snippet...
                    </>
                  ) : (
                    <>
                      <FileCode className="h-4 w-4 mr-2" />
                      Parse Snippet
                    </>
                  )}
                </Button>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-2">Snippet Import supports:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li><code className="text-xs bg-gray-100 px-1 rounded">&lt;transaction&gt;</code> - Financial transactions</li>
                      <li><code className="text-xs bg-gray-100 px-1 rounded">&lt;participating-org&gt;</code> / <code className="text-xs bg-gray-100 px-1 rounded">&lt;reporting-org&gt;</code> - Organizations</li>
                      <li><code className="text-xs bg-gray-100 px-1 rounded">&lt;location&gt;</code> - Location data</li>
                      <li><code className="text-xs bg-gray-100 px-1 rounded">&lt;sector&gt;</code> - Sector allocations</li>
                      <li><code className="text-xs bg-gray-100 px-1 rounded">&lt;recipient-country&gt;</code> / <code className="text-xs bg-gray-100 px-1 rounded">&lt;recipient-region&gt;</code> - Geographic data</li>
                      <li><code className="text-xs bg-gray-100 px-1 rounded">&lt;policy-marker&gt;</code> - Policy markers</li>
                      <li><code className="text-xs bg-gray-100 px-1 rounded">&lt;budget&gt;</code> - Budget information</li>
                      <li><code className="text-xs bg-gray-100 px-1 rounded">&lt;iati-activity&gt;</code> - Full or partial activities</li>
                    </ul>
                    <p className="mt-2 text-sm">
                      The system will automatically wrap your snippet in proper IATI XML structure.
                    </p>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div className="mt-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium text-sm mb-2">Import Guidelines</div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>
                      {importMethod === 'file' && 'File must be a valid IATI Activity XML document'}
                      {importMethod === 'url' && 'URL must be publicly accessible (no authentication required)'}
                      {importMethod === 'snippet' && 'Snippet can be any valid IATI XML element'}
                    </li>
                    <li>You can review all fields before importing</li>
                    <li>Existing data will be highlighted if there are conflicts</li>
                    <li>You can choose which fields to import or skip</li>
                  </ul>
                </div>
              </div>
            </div>
        </div>
      )}

      {/* XML Preview */}
      {showXmlPreview && xmlContent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">XML Content Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-64 text-xs">
              <code>{xmlContent.substring(0, 2000)}...</code>
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Parsed Fields Preview - Tabbed Interface */}
      {parsedFields.length > 0 && importStatus.stage === 'previewing' && (
        <div className="space-y-6">
          {/* Overview Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileCode className="h-5 w-5" />
                    Review Import Fields
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Fields are organized by Activity Editor tabs. Select which fields you want to import.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAllFields(true)}
                  >
                    Select All Fields
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectAllFields(false)}
                  >
                    Clear All Fields
                  </Button>
                </div>
              </div>
              
              {/* Summary Stats */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  <strong>{parsedFields.filter(f => f.selected).length}</strong> of <strong>{parsedFields.length}</strong> fields selected
                </div>
                {parsedFields.filter(f => f.selected && f.hasConflict).length > 0 && (
                  <div className="text-sm text-orange-700">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    <strong>{parsedFields.filter(f => f.selected && f.hasConflict).length}</strong> conflicts to resolve
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Tabbed Field Interface */}
          <Card>
            <CardContent className="pt-6">
              <Tabs value={activeImportTab} onValueChange={setActiveImportTab}>
                <TabsList className="grid w-full grid-cols-7">
                  {organizeFieldsByTabs(parsedFields).map((tabSection) => {
                    const selectedCount = tabSection.fields.filter(f => f.selected).length;
                    const totalCount = tabSection.fields.length;
                    const hasConflicts = tabSection.fields.some(f => f.hasConflict && f.selected);
                    
                    return (
                      <TabsTrigger 
                        key={tabSection.tabId} 
                        value={tabSection.tabId}
                        className="relative"
                      >
                        <span className="text-xs font-medium">{tabSection.tabName}</span>
                        {hasConflicts && (
                          <AlertCircle className="h-3 w-3 text-orange-500 ml-1" />
                        )}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {/* Tab Contents */}
                {organizeFieldsByTabs(parsedFields).map((tabSection) => (
                  <TabsContent key={tabSection.tabId} value={tabSection.tabId} className="mt-6">
                    <TabFieldContent tabSection={tabSection} />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Import Actions */}
          <div className="flex justify-end gap-2 pt-6">
            <Button variant="outline" onClick={resetImport}>
              Cancel Import
            </Button>
            <Button 
              onClick={() => {
                console.log('[XML Import] Button clicked!');
                importSelectedFields();
              }}
              disabled={parsedFields.filter(f => f.selected).length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Database className="h-4 w-4 mr-2" />
              Import Selected Fields
            </Button>
          </div>
        </div>
      )}

      {/* Import Complete */}
      {importStatus.stage === 'complete' && (
        <>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-gray-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Import Successful!</h3>
                <p className="text-gray-600 mb-6">
                  {parsedFields.filter(f => f.selected).length} fields have been imported from the XML file.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={resetImport}>
                    <FileCode className="h-4 w-4 mr-2" />
                    Import Another File
                  </Button>
                  <Button onClick={() => {
                    // Navigate to Basic Info tab to review imported changes
                    const basicTab = document.querySelector('[data-value="basic"]') as HTMLButtonElement;
                    if (basicTab) {
                      basicTab.click();
                    }
                    // Also scroll to top to show the imported data
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Review Changes
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Import Validation Report */}
          {resultsImportSummary && (
            <div className="mt-6">
              <ImportValidationReport summary={resultsImportSummary} />
            </div>
          )}
        </>
      )}

      {/* Error State */}
      {importStatus.stage === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <div className="font-medium">Import Error</div>
          <AlertDescription>
            {importStatus.message || 'An error occurred during import. Please try again.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Sector Refinement Modal */}
      <SectorRefinementModal
        isOpen={showSectorRefinement}
        onClose={() => setShowSectorRefinement(false)}
        originalSectors={sectorRefinementData.originalSectors}
        onSave={(refinedSectors) => {
          console.log('[Sector Refinement] Saving refined sectors:', refinedSectors);
          console.log('[Sector Refinement] Refined sectors count:', refinedSectors.length);
          console.log('[Sector Refinement] Refined sectors details:', refinedSectors.map(s => ({
            code: s.code,
            name: s.name,
            percentage: s.percentage,
            originalCode: s.originalCode,
            isValid: /^\d{5}$/.test(s.code)
          })));
          
          const totalPercentage = refinedSectors.reduce((sum, s) => sum + (s.percentage || 0), 0);
          console.log('[Sector Refinement] Total percentage:', totalPercentage);
          
          // Store the refined sectors for later import
          setSavedRefinedSectors(refinedSectors);
          
          // Update the parsed fields with refined sectors display
          const updatedFields = parsedFields.map(field => {
            if (field.fieldName === 'Sectors') {
              const refinedSectorInfo = refinedSectors.map(s => ({
                code: s.code,
                name: s.name,
                percentage: s.percentage
              }));
              
              return {
                ...field,
                importValue: refinedSectorInfo,
                description: 'Sector classifications and allocations - Refined successfully',
                hasConflict: false, // Conflict resolved after refinement
                refinedSectors: refinedSectors // Store refined sectors in field for import
              };
            }
            return field;
          });
          
          setParsedFields(updatedFields);
          setSectorRefinementData({ originalSectors: [], refinedSectors: [] });
          setShowSectorRefinement(false);
          toast.success('Sectors refined successfully - ready for import');
        }}
      />
      
      {/* External Publisher Modal */}
      {externalPublisherMeta && (
        <ExternalPublisherModal
          isOpen={showExternalPublisherModal}
          onClose={() => {
            setShowExternalPublisherModal(false);
            setExternalPublisherMeta(null);
            // Reset the import state if user cancels
            resetImport();
          }}
          meta={externalPublisherMeta}
          userOrgName={userOrgName}
          userPublisherRefs={userPublisherRefs}
          currentActivityId={activityId}
          currentActivityIatiId={currentActivityData.iati_identifier}
          existingActivity={existingActivity}
          onChoose={async (choice, targetActivityId) => {
            console.log('[XML Import] External publisher choice:', choice, targetActivityId);
            
            // Check if user is authenticated
            if (!user?.id) {
              toast.error('You must be logged in to import XML activities');
              return;
            }
            
            try {
              let response;
              
              switch (choice) {
                case 'reference':
                  // Create read-only reference
                  toast.info('Creating read-only reference...');
                  response = await fetch('/api/iati/reference', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      meta: externalPublisherMeta,
                      userId: user.id
                    })
                  });
                  
                  if (response.ok) {
                    const data = await response.json();
                    toast.success('Linked as reference', {
                      description: 'Read-only activity created. It will not count towards your totals.'
                    });
                    setShowExternalPublisherModal(false);
                    // Redirect to the new activity
                    window.location.href = `/activities/${data.id}`;
                  }
                  break;
                  
                case 'fork':
                  // Create editable copy
                  toast.info('Creating local draft copy...');
                  response = await fetch('/api/iati/fork', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      meta: externalPublisherMeta,
                      userId: user.id
                    })
                  });
                  
                  if (response.ok) {
                    const data = await response.json();
                    toast.success('Fork created', {
                      description: 'You can now edit this activity. Remember to assign your own IATI ID before publishing.'
                    });
                    setShowExternalPublisherModal(false);
                    // Continue with the field comparison that was already parsed
                    // The parsed fields are already set, just update the status
                    setImportStatus({ stage: 'previewing', progress: 100 });
                  }
                  break;
                  
                case 'merge':
                  // Link to existing activity
                  if (targetActivityId) {
                    toast.info('Linking to existing activity...');
                    response = await fetch('/api/iati/merge', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        meta: externalPublisherMeta,
                        targetActivityId,
                        userId: user.id
                      })
                    });
                    
                    if (response.ok) {
                      toast.success('Linked successfully', {
                        description: 'External record linked to your existing activity.'
                      });
                      setShowExternalPublisherModal(false);
                      // Continue with the field comparison that was already parsed
                      // The parsed fields are already set, just update the status
                      setImportStatus({ stage: 'previewing', progress: 100 });
                    }
                  }
                  break;
              }
              
              if (response && !response.ok) {
                const error = await response.json();
                toast.error(`Operation failed: ${error.error || error.message}`);
              }
            } catch (error) {
              console.error('[XML Import] Error handling external publisher choice:', error);
              toast.error('Operation failed', {
                description: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }}
        />
      )}

      {/* Financial Item Detail Modal */}
      {showDetailModal && selectedItem && (
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Select Fields for {selectedItem.type.charAt(0).toUpperCase() + selectedItem.type.slice(1)} {selectedItem.index + 1}
              </DialogTitle>
              <DialogDescription>
                Choose which specific fields from this {selectedItem.type} to import into your activity.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Item Summary:</h4>
                <div className="text-sm text-gray-600">
                  {selectedItem.type === 'budget' && selectedItem.data && (
                    <div className="space-y-1">
                      {selectedItem.data.type && <div><strong>Type:</strong> {selectedItem.data.type}</div>}
                      {selectedItem.data.status && <div><strong>Status:</strong> {selectedItem.data.status}</div>}
                      {selectedItem.data.period?.start && <div><strong>Start Date:</strong> {selectedItem.data.period.start}</div>}
                      {selectedItem.data.period?.end && <div><strong>End Date:</strong> {selectedItem.data.period.end}</div>}
                      {selectedItem.data.value && <div><strong>Amount:</strong> {selectedItem.data.value.toLocaleString()} {selectedItem.data.currency}</div>}
                    </div>
                  )}
                  {selectedItem.type === 'transaction' && selectedItem.data && (
                    <div className="space-y-1">
                      {selectedItem.data.type && (
                        <div><strong>Type:</strong> {(() => {
                          const transactionTypes: Record<string, string> = {
                            '1': 'Incoming Funds',
                            '2': 'Commitment',
                            '3': 'Disbursement',
                            '4': 'Expenditure',
                            '5': 'Interest Repayment',
                            '6': 'Loan Repayment',
                            '7': 'Reimbursement',
                            '8': 'Purchase of Equity',
                            '9': 'Sale of Equity',
                            '10': 'Credit Guarantee',
                            '11': 'Incoming Commitment',
                            '12': 'Outgoing Pledge',
                            '13': 'Incoming Pledge'
                          };
                          return transactionTypes[selectedItem.data.type] || selectedItem.data.type;
                        })()}</div>
                      )}
                      {selectedItem.data.date && <div><strong>Date:</strong> {selectedItem.data.date}</div>}
                      {selectedItem.data.value && <div><strong>Amount:</strong> {selectedItem.data.value.toLocaleString()} {selectedItem.data.currency || ''}</div>}
                      {selectedItem.data.description && <div><strong>Description:</strong> {selectedItem.data.description}</div>}
                      {selectedItem.data.providerOrg?.name && <div><strong>Provider:</strong> {selectedItem.data.providerOrg.name}</div>}
                      {selectedItem.data.receiverOrg?.name && <div><strong>Receiver:</strong> {selectedItem.data.receiverOrg.name}</div>}
                      {selectedItem.data.humanitarian && <div><strong>Humanitarian:</strong> Yes</div>}
                      {selectedItem.data.flowType && <div><strong>Flow Type:</strong> {selectedItem.data.flowType}</div>}
                      {selectedItem.data.financeType && <div><strong>Finance Type:</strong> {selectedItem.data.financeType}</div>}
                      {selectedItem.data.aidType && <div><strong>Aid Type:</strong> {selectedItem.data.aidType.code || selectedItem.data.aidType}</div>}
                      {selectedItem.data.tiedStatus && <div><strong>Tied Status:</strong> {selectedItem.data.tiedStatus}</div>}
                    </div>
                  )}
                  {selectedItem.type === 'plannedDisbursement' && selectedItem.data && (
                    <div className="space-y-1">
                      {selectedItem.data.type && <div><strong>Type:</strong> {selectedItem.data.type}</div>}
                      {selectedItem.data.periodStart && <div><strong>Period Start:</strong> {selectedItem.data.periodStart}</div>}
                      {selectedItem.data.periodEnd && <div><strong>Period End:</strong> {selectedItem.data.periodEnd}</div>}
                      {selectedItem.data.value && <div><strong>Amount:</strong> {selectedItem.data.value.toLocaleString()} {selectedItem.data.currency}</div>}
                    </div>
                  )}
                </div>
              </div>

              {/* Field Selection Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-700 w-12">Import</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-700">Field</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-700">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedItem.fields.map((field, index) => (
                      <tr key={index} className="bg-white hover:bg-gray-50">
                        <td className="px-4 py-3 text-center">
                          <Switch
                            checked={field.selected}
                            onCheckedChange={(checked) => {
                              const updatedFields = [...selectedItem.fields];
                              updatedFields[index].selected = checked;
                              setSelectedItem({
                                ...selectedItem,
                                fields: updatedFields
                              });
                            }}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-sm text-gray-900">{field.fieldName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {field.tab === 'identifiers_ids' && field.fieldName.startsWith('Other Identifier') && typeof field.importValue === 'object' ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
                                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.importValue.code}</span>
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.importValue.type}</span>
                                  <span className="text-sm text-gray-900">{field.importValue.name}</span>
                                </div>
                              </div>
                            ) : typeof field.importValue === 'object' && field.importValue?.code ? (
                              <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
                                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.importValue.code}</span>
                                <span className="text-sm font-medium text-gray-900">{field.importValue.name}</span>
                              </div>
                            ) : typeof field.importValue === 'object' ? (
                              <span className="text-sm text-gray-600 italic">Complex data</span>
                            ) : field.fieldName === 'IATI Identifier' ? (
                              <span className="text-sm font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.importValue || 'N/A'}</span>
                            ) : (
                              <span className="text-sm font-medium text-gray-900">{field.importValue || 'N/A'}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                // Update the main fields with the selected detail fields
                const updatedFields = [...parsedFields];
                const mainFieldIndex = updatedFields.findIndex(f => 
                  f.isFinancialItem && 
                  f.itemType === selectedItem.type && 
                  f.itemIndex === selectedItem.index
                );
                
                if (mainFieldIndex !== -1) {
                  // Update the summary to show selection status
                  const selectedCount = selectedItem.fields.filter(f => f.selected).length;
                  const totalCount = selectedItem.fields.length;
                  updatedFields[mainFieldIndex].importValue = `${selectedCount} of ${totalCount} fields selected`;
                }
                
                setParsedFields(updatedFields);
                setShowDetailModal(false);
              }}>
                Apply Selection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Debug Console Modal */}
      <Dialog open={showDebugConsole} onOpenChange={setShowDebugConsole}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Debug Console
              <Badge variant="secondary" className="ml-2">
                {debugLogs.length} logs
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Console logs captured during XML import process. Use this to debug import issues.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyDebugLogs}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy All Logs
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearDebugLogs}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
                Clear Logs
              </Button>
            </div>
            
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
              {debugLogs.length === 0 ? (
                <div className="text-gray-500">No debug logs captured yet. Try importing an XML file to see logs here.</div>
              ) : (
                debugLogs.map((log, index) => (
                  <div key={index} className="whitespace-pre-wrap break-words">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDebugConsole(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Sector Refinement Modal Component
interface PortalDropdownProps {
  sector: any;
  sectorsGroup: any[];
  originalIndex: number;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (code: string) => void;
}

const PortalDropdown = ({ sector, sectorsGroup, originalIndex, isOpen, onToggle, onSelect }: PortalDropdownProps) => {
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonRect(rect);
    }
  }, [isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && 
          buttonRef.current && 
          !buttonRef.current.contains(event.target as Node) &&
          dropdownRef.current && 
          !dropdownRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  const filteredSubsectors = sector.availableSubsectors.filter((subsector: any) => {
    const usedCodes = sectorsGroup.map((s: any) => s.code);
    return !usedCodes.includes(subsector.code) || sector.code === subsector.code;
  });

  const dropdownContent = isOpen && buttonRect && (
    <div 
      ref={dropdownRef}
      className="fixed bg-white border border-gray-200 rounded-md shadow-lg z-[9999] max-h-[200px] overflow-y-auto"
      style={{
        top: buttonRect.bottom + 4,
        left: buttonRect.left,
        width: buttonRect.width,
      }}
    >
      {filteredSubsectors.map((subsector: any) => (
        <div
          key={subsector.code}
          onClick={() => onSelect(subsector.code)}
          className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent border-b border-gray-100 last:border-b-0 whitespace-nowrap"
        >
          <span className="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded min-w-[50px]">
            {subsector.code}
          </span>
          <span className="font-medium text-gray-900 flex-1 truncate">
            {subsector.name}
          </span>
          {sector.code === subsector.code && (
            <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="outline"
        role="combobox"
        onClick={onToggle}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors"
      >
        <span className="truncate">
          <span className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{sector.code}</span>
            <span className="font-medium text-gray-900">{sector.name}</span>
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>
      
      {dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  );
};

interface SectorRefinementModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalSectors: any[];
  onSave: (refinedSectors: any[]) => void;
}

const SectorRefinementModal = ({ isOpen, onClose, originalSectors, onSave }: SectorRefinementModalProps) => {
  const [refinedSectors, setRefinedSectors] = useState<any[]>([]);
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  
  // Separate DAC and non-DAC sectors
  const dacSectors = refinedSectors.filter(sector => sector.isValid && /^\d{5}$/.test(sector.code));
  const nonDacSectors = refinedSectors.filter(sector => !sector.isValid || !/^\d{5}$/.test(sector.code));
  
  // Calculate total percentage only for DAC sectors
  const dacTotalPercentage = dacSectors.reduce((sum, s) => sum + (s.percentage || 0), 0);

  // IATI DAC sector reference data - comprehensive mapping
  const getSubsectorsFor3DigitCode = (threeDigitCode: string) => {
    const subsectorMap: Record<string, any[]> = {
      // SOCIAL INFRASTRUCTURE & SERVICES
      '111': [ // Education, Level Unspecified
        { code: '11110', name: 'Education policy and administrative management' },
        { code: '11120', name: 'Education facilities and training' },
        { code: '11130', name: 'Teacher training' },
        { code: '11182', name: 'Educational research' }
      ],
      '112': [ // Basic Education
        { code: '11220', name: 'Primary education' },
        { code: '11230', name: 'Basic life skills for adults' },
        { code: '11240', name: 'Early childhood education' }
      ],
      '113': [ // Secondary Education
        { code: '11320', name: 'Secondary education' },
        { code: '11330', name: 'Vocational training' }
      ],
      '114': [ // Post-Secondary Education
        { code: '11420', name: 'Higher education' },
        { code: '11430', name: 'Advanced technical and managerial training' }
      ],
      '121': [ // Health, General
        { code: '12110', name: 'Health policy and administrative management' },
        { code: '12181', name: 'Medical education/training' },
        { code: '12182', name: 'Medical research' },
        { code: '12191', name: 'Medical services' }
      ],
      '122': [ // Basic Health
        { code: '12220', name: 'Basic health care' },
        { code: '12230', name: 'Basic health infrastructure' },
        { code: '12240', name: 'Basic nutrition' },
        { code: '12250', name: 'Infectious disease control' },
        { code: '12261', name: 'Health education' },
        { code: '12281', name: 'Health personnel development' }
      ],
      '130': [ // Population Policies/Programmes & Reproductive Health
        { code: '13010', name: 'Population policy and administrative management' },
        { code: '13020', name: 'Reproductive health care' },
        { code: '13030', name: 'Family planning' },
        { code: '13040', name: 'STD control including HIV/AIDS' },
        { code: '13081', name: 'Personnel development for population and reproductive health' }
      ],
      '140': [ // Water Supply & Sanitation
        { code: '14010', name: 'Water sector policy and administrative management' },
        { code: '14015', name: 'Water resources conservation (including data collection)' },
        { code: '14020', name: 'Water supply and sanitation - large systems' },
        { code: '14030', name: 'Basic drinking water supply and basic sanitation' },
        { code: '14040', name: 'River development' },
        { code: '14050', name: 'Waste management/disposal' },
        { code: '14081', name: 'Education and training in water supply and sanitation' }
      ],
      '151': [ // Government & Civil Society-general
        { code: '15110', name: 'Public sector policy and administrative management' },
        { code: '15111', name: 'Public finance management (PFM)' },
        { code: '15112', name: 'Decentralisation and support to subnational government' },
        { code: '15113', name: 'Anti-corruption organisations and institutions' },
        { code: '15130', name: 'Legal and judicial development' },
        { code: '15150', name: 'Democratic participation and civil society' },
        { code: '15160', name: 'Human rights' },
        { code: '15170', name: "Women's rights organisations and movements" },
        { code: '15180', name: 'Ending violence against women and girls' }
      ],
      '152': [ // Conflict, Peace & Security
        { code: '15210', name: 'Security system management and reform' },
        { code: '15220', name: 'Civilian peace-building, conflict prevention and resolution' },
        { code: '15230', name: 'Participation in international peacekeeping operations' },
        { code: '15240', name: 'Reintegration and SALW control' },
        { code: '15250', name: 'Removal of land mines and explosive remnants of war' },
        { code: '15261', name: 'Child soldiers (prevention and demobilisation)' }
      ],
      '160': [ // Other Social Infrastructure & Services
        { code: '16010', name: 'Social Protection' },
        { code: '16020', name: 'Employment creation' },
        { code: '16030', name: 'Housing policy and administrative management' },
        { code: '16040', name: 'Low-cost housing' },
        { code: '16050', name: 'Multisector aid for basic social services' },
        { code: '16061', name: 'Culture and recreation' },
        { code: '16062', name: 'Statistical capacity building' },
        { code: '16063', name: 'Narcotics control' },
        { code: '16064', name: 'Social mitigation of HIV/AIDS' }
      ],
      
      // ECONOMIC INFRASTRUCTURE & SERVICES
      '210': [ // Transport & Storage
        { code: '21010', name: 'Transport policy and administrative management' },
        { code: '21020', name: 'Road transport' },
        { code: '21030', name: 'Rail transport' },
        { code: '21040', name: 'Water transport' },
        { code: '21050', name: 'Air transport' },
        { code: '21061', name: 'Storage' },
        { code: '21081', name: 'Education and training in transport and storage' }
      ],
      '220': [ // Communications
        { code: '22010', name: 'Communications policy and administrative management' },
        { code: '22020', name: 'Telecommunications' },
        { code: '22030', name: 'Radio/television/print media' },
        { code: '22040', name: 'Information and communication technology (ICT)' }
      ],
      '230': [ // Energy
        { code: '23010', name: 'Energy policy and administrative management' },
        { code: '23020', name: 'Power generation/non-renewable sources' },
        { code: '23030', name: 'Power generation/renewable sources' },
        { code: '23040', name: 'Electrical transmission/ distribution' },
        { code: '23050', name: 'Gas distribution' },
        { code: '23061', name: 'Oil-fired power plants' },
        { code: '23062', name: 'Gas-fired power plants' },
        { code: '23063', name: 'Coal-fired power plants' },
        { code: '23064', name: 'Nuclear power plants' },
        { code: '23065', name: 'Hydro-electric power plants' },
        { code: '23066', name: 'Geothermal energy' },
        { code: '23067', name: 'Solar energy' },
        { code: '23068', name: 'Wind power' },
        { code: '23069', name: 'Ocean power' },
        { code: '23070', name: 'Biomass' },
        { code: '23081', name: 'Energy education/training' },
        { code: '23082', name: 'Energy research' }
      ],
      '240': [ // Banking & Financial Services
        { code: '24010', name: 'Financial policy and administrative management' },
        { code: '24020', name: 'Monetary institutions' },
        { code: '24030', name: 'Formal sector financial intermediaries' },
        { code: '24040', name: 'Informal/semi-formal financial intermediaries' },
        { code: '24050', name: 'Remittance facilitation, promotion and optimisation' },
        { code: '24081', name: 'Education/training in banking and financial services' }
      ],
      '250': [ // Business & Other Services
        { code: '25010', name: 'Business support services and institutions' },
        { code: '25020', name: 'Privatisation' },
        { code: '25030', name: 'Business development services' },
        { code: '25040', name: 'Responsible business conduct' }
      ],
      
      // PRODUCTION SECTORS
      '311': [ // Agriculture
        { code: '31110', name: 'Agricultural policy and administrative management' },
        { code: '31120', name: 'Agricultural development' },
        { code: '31130', name: 'Agricultural land resources' },
        { code: '31140', name: 'Agricultural water resources' },
        { code: '31150', name: 'Agricultural inputs' },
        { code: '31161', name: 'Food crop production' },
        { code: '31162', name: 'Industrial crops/export crops' },
        { code: '31163', name: 'Livestock' },
        { code: '31164', name: 'Agrarian reform' },
        { code: '31165', name: 'Agricultural alternative development' },
        { code: '31166', name: 'Agricultural extension' },
        { code: '31181', name: 'Agricultural education/training' },
        { code: '31182', name: 'Agricultural research' },
        { code: '31191', name: 'Agricultural services' },
        { code: '31192', name: 'Plant and post-harvest protection and pest control' },
        { code: '31193', name: 'Agricultural financial services' },
        { code: '31194', name: 'Agricultural co-operatives' },
        { code: '31195', name: 'Livestock/veterinary services' }
      ],
      '312': [ // Forestry
        { code: '31210', name: 'Forestry policy and administrative management' },
        { code: '31220', name: 'Forestry development' },
        { code: '31261', name: 'Fuelwood/charcoal' },
        { code: '31281', name: 'Forestry education/training' },
        { code: '31282', name: 'Forestry research' },
        { code: '31291', name: 'Forestry services' }
      ],
      '313': [ // Fishing
        { code: '31310', name: 'Fishing policy and administrative management' },
        { code: '31320', name: 'Fishery development' },
        { code: '31381', name: 'Fishery education/training' },
        { code: '31382', name: 'Fishery research' },
        { code: '31391', name: 'Fishery services' }
      ],
      '321': [ // Industry
        { code: '32110', name: 'Industrial policy and administrative management' },
        { code: '32120', name: 'Industrial development' },
        { code: '32130', name: 'Small and medium-sized enterprises (SME) development' },
        { code: '32140', name: 'Cottage industries and handicraft' },
        { code: '32161', name: 'Agro-industries' },
        { code: '32162', name: 'Forest industries' },
        { code: '32163', name: 'Textiles, leather and substitutes' },
        { code: '32164', name: 'Chemicals' },
        { code: '32165', name: 'Fertilizer plants' },
        { code: '32166', name: 'Cement/lime/plaster' },
        { code: '32167', name: 'Energy manufacturing' },
        { code: '32168', name: 'Pharmaceutical production' },
        { code: '32169', name: 'Basic metal industries' },
        { code: '32170', name: 'Non-ferrous metal industries' },
        { code: '32171', name: 'Engineering' },
        { code: '32172', name: 'Transport equipment industry' },
        { code: '32182', name: 'Technological research and development' }
      ],
      '322': [ // Mineral Resources & Mining
        { code: '32210', name: 'Mineral/mining policy and administrative management' },
        { code: '32220', name: 'Mineral prospection and exploration' },
        { code: '32261', name: 'Coal' },
        { code: '32262', name: 'Oil and gas (upstream)' },
        { code: '32263', name: 'Ferrous metals' },
        { code: '32264', name: 'Nonferrous metals' },
        { code: '32265', name: 'Precious metals/materials' },
        { code: '32266', name: 'Industrial minerals' },
        { code: '32267', name: 'Fertilizer minerals' },
        { code: '32268', name: 'Offshore minerals' }
      ],
      '323': [ // Construction
        { code: '32310', name: 'Construction policy and administrative management' }
      ],
      '331': [ // Trade Policies & Regulations
        { code: '33110', name: 'Trade policy and administrative management' },
        { code: '33120', name: 'Trade facilitation' },
        { code: '33130', name: 'Regional trade agreements (RTAs)' },
        { code: '33140', name: 'Multilateral trade negotiations' },
        { code: '33150', name: 'Trade-related adjustment' },
        { code: '33181', name: 'Trade education/training' }
      ],
      '332': [ // Tourism
        { code: '33210', name: 'Tourism policy and administrative management' }
      ],
      
      // MULTI-SECTOR / CROSS-CUTTING
      '410': [ // General Environment Protection
        { code: '41010', name: 'Environmental policy and administrative management' },
        { code: '41020', name: 'Biosphere protection' },
        { code: '41030', name: 'Bio-diversity' },
        { code: '41040', name: 'Site preservation' },
        { code: '41050', name: 'Flood prevention/control' },
        { code: '41081', name: 'Environmental education/training' },
        { code: '41082', name: 'Environmental research' }
      ],
      '430': [ // Other Multisector
        { code: '43010', name: 'Multisector aid' },
        { code: '43030', name: 'Urban development and management' },
        { code: '43040', name: 'Rural development' },
        { code: '43050', name: 'Non-agricultural alternative development' },
        { code: '43081', name: 'Multisector education/training' },
        { code: '43082', name: 'Research/scientific institutions' }
      ],
      
      // COMMODITY AID / GENERAL PROGRAMME ASSISTANCE
      '520': [ // Development Food Assistance
        { code: '52010', name: 'Food assistance' }
      ],
      '530': [ // Other Commodity Assistance
        { code: '53030', name: 'Import support (capital goods)' },
        { code: '53040', name: 'Import support (commodities)' }
      ],
      
      // ACTION RELATING TO DEBT
      '600': [ // Action Relating to Debt
        { code: '60010', name: 'Action relating to debt' },
        { code: '60020', name: 'Debt forgiveness' },
        { code: '60030', name: 'Relief of multilateral debt' },
        { code: '60040', name: 'Rescheduling and refinancing' },
        { code: '60061', name: 'Debt for development swap' },
        { code: '60062', name: 'Other debt swap' },
        { code: '60063', name: 'Debt buy-back' }
      ],
      
      // HUMANITARIAN AID
      '720': [ // Emergency Response
        { code: '72010', name: 'Material relief assistance and services' },
        { code: '72040', name: 'Emergency food assistance' },
        { code: '72050', name: 'Relief co-ordination and support services' }
      ],
      '730': [ // Reconstruction Relief & Rehabilitation
        { code: '73010', name: 'Reconstruction relief and rehabilitation' }
      ],
      '740': [ // Disaster Prevention & Preparedness
        { code: '74010', name: 'Disaster prevention and preparedness' },
        { code: '74020', name: 'Multi-hazard response preparedness' }
      ],
      
      // UNALLOCATED / UNSPECIFIED
      '998': [ // Unallocated / Unspecified
        { code: '99810', name: 'Sectors not specified' },
        { code: '99820', name: 'Promotion of development awareness' }
      ]
    };
    
    // Return the subsectors for the given code, or create generic ones if not found
    if (subsectorMap[threeDigitCode]) {
      return subsectorMap[threeDigitCode];
    }
    
    // Create generic subsectors for unknown codes
    return [
      { code: `${threeDigitCode}10`, name: `${threeDigitCode} - Policy and administrative management` },
      { code: `${threeDigitCode}20`, name: `${threeDigitCode} - Development and implementation` },
      { code: `${threeDigitCode}30`, name: `${threeDigitCode} - Education and training` },
      { code: `${threeDigitCode}40`, name: `${threeDigitCode} - Research and development` }
    ];
  };

  // Sector validation functions
  const isValidSectorCode = (code: string): boolean => {
    if (!code) return false;
    // 3-digit codes should be numeric
    if (code.length === 3) return /^\d{3}$/.test(code);
    // 5-digit codes should be numeric
    if (code.length === 5) return /^\d{5}$/.test(code);
    return false;
  };

  const normalizePercentages = (sectors: any[]): any[] => {
    const totalPercentage = sectors.reduce((sum, s) => sum + (s.percentage || 0), 0);
    
    if (totalPercentage === 0) {
      // Equal distribution if no percentages provided
      const equalPercentage = Math.round((100 / sectors.length) * 100) / 100;
      return sectors.map(s => ({ ...s, percentage: equalPercentage }));
    }
    
    if (Math.abs(totalPercentage - 100) > 0.01) {
      // Normalize to 100%
      const factor = 100 / totalPercentage;
      return sectors.map(s => ({
        ...s,
        percentage: Math.round((s.percentage || 0) * factor * 100) / 100
      }));
    }
    
    return sectors;
  };

  const detectSectorIssues = (sectors: any[]): string[] => {
    const issues: string[] = [];
    
    // Only check percentage total for DAC sectors
    const dacSectors = sectors.filter(s => s.isValid && /^\d{5}$/.test(s.code));
    const total = dacSectors.reduce((sum, s) => sum + (s.percentage || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      issues.push(`Sector percentages total ${total.toFixed(1)}% instead of 100%`);
    }
    
    // Check for zero percentages in DAC sectors only
    const zeroPercentages = dacSectors.filter(s => (s.percentage || 0) === 0);
    if (zeroPercentages.length > 0 && dacSectors.length > 1) {
      issues.push(`${zeroPercentages.length} sector(s) have 0% allocation`);
    }
    
    return issues;
  };

  useEffect(() => {
    if (isOpen && originalSectors.length > 0) {
      console.log('[SectorRefinement] Initializing with original sectors:', originalSectors);
      
      // Process original sectors with validation
      const processedSectors = originalSectors.map(sector => {
        console.log('[SectorRefinement] Processing sector:', sector);
        
        if (!isValidSectorCode(sector.code)) {
          console.warn('[SectorRefinement] Invalid sector code detected:', sector.code);
        }
        
        if (sector.code && sector.code.length === 3) {
          const subsectors = getSubsectorsFor3DigitCode(sector.code);
          console.log('[SectorRefinement] Found', subsectors.length, 'subsectors for code:', sector.code);
          
          // Default to first subsector for this category
          return {
            originalCode: sector.code,
            originalPercentage: sector.percentage || 0,
            code: subsectors[0]?.code || `${sector.code}10`,
            name: subsectors[0]?.name || `${sector.code} - Default subsector`,
            percentage: sector.percentage || 0,
            availableSubsectors: subsectors,
            needsRefinement: true,
            isValid: isValidSectorCode(sector.code),
            id: crypto.randomUUID() // Add unique ID for React keys
          };
        }
        
        // If already 5-digit or other format, keep as is but validate
        return {
          originalCode: sector.code,
          originalPercentage: sector.percentage || 0,
          code: sector.code,
          name: sector.narrative || sector.name || `Unknown sector ${sector.code}`,
          percentage: sector.percentage || 0,
          availableSubsectors: [],
          needsRefinement: false,
          isValid: isValidSectorCode(sector.code),
          id: crypto.randomUUID() // Add unique ID for React keys
        };
      });
      
      // Normalize percentages if needed
      const normalizedSectors = normalizePercentages(processedSectors);
      console.log('[SectorRefinement] Normalized sectors:', normalizedSectors);
      
      setRefinedSectors(normalizedSectors);
      calculateTotal(normalizedSectors);
      
      // Detect and log issues
      const issues = detectSectorIssues(normalizedSectors);
      if (issues.length > 0) {
        console.warn('[SectorRefinement] Detected issues:', issues);
      }
    }
  }, [isOpen, originalSectors]);

  const calculateTotal = (sectors: any[]) => {
    // Only calculate total for DAC sectors (valid 5-digit codes)
    const dacSectors = sectors.filter(sector => sector.isValid && /^\d{5}$/.test(sector.code));
    const total = dacSectors.reduce((sum, sector) => sum + (sector.percentage || 0), 0);
    console.log('[Calculate Total] DAC sectors:', dacSectors.length, 'Total:', total);
    setTotalPercentage(total);
  };

  const handleSectorChange = (index: number, field: string, value: any) => {
    const updated = [...refinedSectors];
    if (field === 'code') {
      // When code changes, update the name too
      const selectedSubsector = updated[index].availableSubsectors.find((s: any) => s.code === value);
      updated[index].code = value;
      updated[index].name = selectedSubsector?.name || value;
      updated[index].isValid = isValidSectorCode(value);
    } else {
      updated[index][field] = value;
    }
    
    setRefinedSectors(updated);
    if (field === 'percentage') {
      calculateTotal(updated);
    }
  };

  const handleAddSubsector = (originalCode: string, originalPercentage: number) => {
    const availableSubsectors = getSubsectorsFor3DigitCode(originalCode);
    
    // Find an unused subsector (one that's not already selected for this original code)
    const existingSectorCodes = refinedSectors
      .filter(s => s.originalCode === originalCode)
      .map(s => s.code);
    
    const unusedSubsector = availableSubsectors.find(sub => !existingSectorCodes.includes(sub.code));
    
    if (unusedSubsector) {
      const newSector = {
        originalCode: originalCode,
        originalPercentage: originalPercentage,
        code: unusedSubsector.code,
        name: unusedSubsector.name,
        percentage: 0, // User will need to set this
        availableSubsectors: availableSubsectors,
        needsRefinement: true,
        isValid: isValidSectorCode(unusedSubsector.code),
        id: crypto.randomUUID() // Add unique ID for React keys
      };
      
      setRefinedSectors([...refinedSectors, newSector]);
    }
  };

  const handleRemoveSubsector = (index: number) => {
    const updated = refinedSectors.filter((_, i) => i !== index);
    setRefinedSectors(updated);
    calculateTotal(updated);
  };

  const handleDistributeEqually = (originalCode: string) => {
    const sectorsForOriginal = refinedSectors.filter(s => s.originalCode === originalCode && s.isValid);
    const originalSector = refinedSectors.find(s => s.originalCode === originalCode);
    
    if (sectorsForOriginal.length > 0 && originalSector) {
      const equalPercentage = Math.round((originalSector.originalPercentage / sectorsForOriginal.length) * 100) / 100;
      
      const updated = refinedSectors.map(s => {
        if (s.originalCode === originalCode && s.isValid) {
          return { ...s, percentage: equalPercentage };
        }
        return s;
      });
      
      setRefinedSectors(updated);
      calculateTotal(updated);
    }
  };

  const handleNormalizePercentages = () => {
    // Only normalize DAC sectors
    const dacSectors = refinedSectors.filter(sector => sector.isValid && /^\d{5}$/.test(sector.code));
    const nonDacSectors = refinedSectors.filter(sector => !sector.isValid || !/^\d{5}$/.test(sector.code));
    
    const normalizedDacSectors = normalizePercentages(dacSectors);
    const normalized = [...normalizedDacSectors, ...nonDacSectors];
    
    setRefinedSectors(normalized);
    calculateTotal(normalized);
  };

  const handleEqualDistribution = () => {
    // Only distribute equally among DAC sectors
    const dacSectors = refinedSectors.filter(sector => sector.isValid && /^\d{5}$/.test(sector.code));
    console.log('[Distribute Equally] DAC sectors found:', dacSectors.length, dacSectors);
    
    if (dacSectors.length === 0) return;
    
    // Calculate base percentage and remainder to ensure exact 100% total
    const basePercentage = Math.floor((100 / dacSectors.length) * 100) / 100; // Round down to 2 decimal places
    const remainder = 100 - (basePercentage * dacSectors.length);
    
    console.log('[Distribute Equally] Base percentage:', basePercentage, 'Remainder:', remainder);
    
    let dacSectorIndex = 0;
    const updated = refinedSectors.map(s => {
      // Only update percentage for DAC sectors
      if (s.isValid && /^\d{5}$/.test(s.code)) {
        // Add remainder to only the first sector to ensure exact 100%
        const extraAmount = dacSectorIndex === 0 ? remainder : 0;
        const finalPercentage = Math.round((basePercentage + extraAmount) * 100) / 100; // Round to 2 decimal places
        dacSectorIndex++;
        
        console.log('[Distribute Equally] Sector', s.code, 'gets percentage:', finalPercentage);
        return { ...s, percentage: finalPercentage };
      }
      return s; // Keep non-DAC sectors unchanged
    });
    
    console.log('[Distribute Equally] Updated sectors:', updated);
    setRefinedSectors(updated);
    
    // Use setTimeout to ensure state update happens before calculation
    setTimeout(() => {
      calculateTotal(updated);
    }, 0);
  };

  const handleSave = () => {
    if (Math.abs(totalPercentage - 100) > 0.01) {
      toast.error('Sector percentages must total 100%');
      return;
    }
    onSave(refinedSectors);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Refine Sector Classifications
          </DialogTitle>
          <DialogDescription>
            This activity has 3-digit sector categories from imported data. Please select specific 5-digit sub-sectors 
            and reallocate percentages. The total must equal 100%.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress indicator and controls */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Total Percentage (DAC Sectors Only): 
              </span>
              <div className="flex items-center gap-3">
                <span className={`font-bold ${
                  Math.abs(totalPercentage - 100) < 0.01 
                    ? 'text-gray-800' 
                    : 'text-gray-600'
                }`}>
                  {totalPercentage.toFixed(1)}%
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEqualDistribution}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                  >
                    Distribute Equally
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="w-full bg-gray-100 rounded-full h-1">
              <div 
                className={`h-1 rounded-full transition-all ${
                  Math.abs(totalPercentage - 100) < 0.01 
                    ? 'bg-gray-300' 
                    : 'bg-gray-400'
                }`}
                style={{ width: `${Math.min(totalPercentage, 100)}%` }}
              />
            </div>
            
          </div>

          {/* Refinement table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Original (3-digit)
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Refined (5-digit)
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">
                    %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Group sectors by original code */}
                {Object.entries(
                  dacSectors.reduce((groups: Record<string, any[]>, sector: any) => {
                    const originalCode = sector.originalCode;
                    if (!groups[originalCode]) groups[originalCode] = [];
                    groups[originalCode].push(sector);
                    return groups;
                  }, {} as Record<string, any[]>)
                ).map(([originalCode, sectorsGroup]: [string, any[]]) => (
                  <React.Fragment key={originalCode}>
                    {sectorsGroup.map((sector: any, groupIndex: number) => {
                      const originalIndex = refinedSectors.findIndex(s => s === sector);
                      const isFirstInGroup = groupIndex === 0;
                      const availableSubsectors = getSubsectorsFor3DigitCode(originalCode);
                      const usedCodes = sectorsGroup.map((s: any) => s.code);
                      const hasUnusedSubsectors = availableSubsectors.some(sub => !usedCodes.includes(sub.code));
                      
                      return (
                        <tr key={sector.id || originalIndex} className="bg-white">
                          {/* Original Code Column - only show for first row of each group */}
                          <td className="px-3 py-3">
                            {isFirstInGroup && (
                              <div className="text-sm">
                                <div className="font-mono text-xs text-gray-600">
                                  {sector.originalCode}
                                </div>
                                <div className="text-gray-500 text-xs">
                                  {sector.originalPercentage}% original
                                </div>
                              </div>
                            )}
                          </td>
                          
                          {/* Refined Sector Column */}
                          <td className="px-3 py-3">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  {sector.availableSubsectors.length > 0 ? (
                                    <PortalDropdown
                                      sector={sector}
                                      sectorsGroup={sectorsGroup}
                                      originalIndex={originalIndex}
                                      isOpen={openPopoverId === sector.id}
                                      onToggle={() => setOpenPopoverId(openPopoverId === sector.id ? null : sector.id)}
                                      onSelect={(code) => {
                                        handleSectorChange(originalIndex, 'code', code);
                                        setOpenPopoverId(null);
                                      }}
                                    />
                                  ) : (
                                    <div className="text-sm text-gray-500 italic">
                                      No subsectors available
                                    </div>
                                  )}
                                </div>
                                
                                {/* Remove button - only show if there are multiple subsectors for this original code */}
                                {sectorsGroup.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveSubsector(originalIndex)}
                                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              
                              {/* Add Subsector button - show for the last row of each group and if there are unused subsectors */}
                              {groupIndex === sectorsGroup.length - 1 && hasUnusedSubsectors && (
                                <div className="flex justify-start">
                                  <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleAddSubsector(originalCode, sector.originalPercentage)}
                                    className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Subsector
                                  </Button>
                                </div>
                              )}
                            </div>
                          </td>
                          
                          {/* Percentage Column */}
                          <td className="px-3 py-3">
                            <div className="space-y-2">
                              <div className="flex items-center h-10">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={sector.percentage || ''}
                                  onChange={(e) => handleSectorChange(originalIndex, 'percentage', parseFloat(e.target.value) || 0)}
                                  className="w-20 text-sm"
                                  placeholder="0"
                                />
                              </div>
                              {/* Empty space to match the Add Subsector button space */}
                              {groupIndex === sectorsGroup.length - 1 && hasUnusedSubsectors && (
                                <div className="h-8"></div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
                
                {/* Non-DAC Sectors (Locked) */}
                {nonDacSectors.length > 0 && (
                  <>
                    <tr className="bg-gray-100">
                      <td colSpan={3} className="px-3 py-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600 uppercase tracking-wide">
                          <Lock className="h-3 w-3" />
                          Non-DAC Sectors
                        </div>
                      </td>
                    </tr>
                    {nonDacSectors.map((sector, index) => {
                      const originalIndex = refinedSectors.findIndex(s => s === sector);
                      return (
                        <tr key={originalIndex} className="bg-gray-50">
                          <td className="px-3 py-3">
                            <div className="text-sm">
                              <div className="font-mono text-xs text-gray-500">
                                {sector.originalCode}
                              </div>
                              <div className="text-gray-400 text-xs">
                                {sector.originalPercentage}% original
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-sm">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">{sector.code}</span>
                                <span className="font-medium text-gray-500">{sector.name}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={sector.percentage}
                              disabled
                              className="w-full text-xs bg-gray-100 text-gray-500"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200">
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={Math.abs(totalPercentage - 100) > 0.01}
            className="bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            Save Refined Sectors
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};