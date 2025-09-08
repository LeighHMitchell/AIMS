import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetchBasicActivityWithCache } from '@/lib/activity-cache';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from 'sonner';
import { IATIXMLParser, validateIATIXML } from '@/lib/xml-parser';
import { ExternalPublisherModal } from '@/components/import/ExternalPublisherModal';
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
} from 'lucide-react';

interface XmlImportTabProps {
  activityId: string;
}

interface ActivityData {
  id?: string;
  title_narrative?: string;
  description_narrative?: string;
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
  const languageMap: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'it': 'Italian',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'no': 'Norwegian',
    'da': 'Danish',
    'fi': 'Finnish',
    'pl': 'Polish',
    'cs': 'Czech',
    'hu': 'Hungarian',
    'tr': 'Turkish'
  };
  return { code, name: languageMap[code] || `Language (${code})` };
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
  const [showXmlPreview, setShowXmlPreview] = useState(false);
  const [currentActivityData, setCurrentActivityData] = useState<ActivityData>({});
  const [activeImportTab, setActiveImportTab] = useState('basic');
  const [parsedActivity, setParsedActivity] = useState<any>(null);
  const [xmlUrl, setXmlUrl] = useState<string>('');
  const [importMethod, setImportMethod] = useState<'file' | 'url'>('file');
  const [showSectorRefinement, setShowSectorRefinement] = useState(false);
  const [sectorRefinementData, setSectorRefinementData] = useState<{
    originalSectors: any[];
    refinedSectors: any[];
  }>({ originalSectors: [], refinedSectors: [] });
  const [savedRefinedSectors, setSavedRefinedSectors] = useState<any[]>([]);
  const [xmlMetadata, setXmlMetadata] = useState<any>(null);
  
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
        // OPTIMIZATION: Use cached basic activity data
        console.log('[XmlImportTab] Fetching activity data for:', activityId);
        const data = await fetchBasicActivityWithCache(activityId);
        console.log('[XmlImportTab] Fetched activity data:', data);
        
        // Map the data correctly - the API returns both camelCase and snake_case versions
        setCurrentActivityData({
          id: data.id,
          title_narrative: data.title_narrative || data.title,
          description_narrative: data.description_narrative || data.description,
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
            setCurrentActivityData({
              id: data.id,
              title_narrative: data.title_narrative || data.title,
              description_narrative: data.description_narrative || data.description,
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
        throw new Error(errorData.error || `Failed to fetch XML: ${response.status} ${response.statusText}`);
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

  // Parse XML file or URL
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

    // Ensure we have the latest activity data before parsing
    if (!currentActivityData.id && activityId) {
      console.log('[XML Import Debug] Fetching activity data before parsing');
      try {
        const data = await fetchBasicActivityWithCache(activityId);
        setCurrentActivityData({
          id: data.id,
          title_narrative: data.title_narrative || data.title,
          description_narrative: data.description_narrative || data.description,
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
        });
      } catch (error) {
        console.error('[XML Import Debug] Failed to fetch activity data:', error);
      }
    }

    console.log('[XML Import Debug] Current activity data:', currentActivityData);
    console.log('[XML Import Debug] Setting status to uploading');
    setImportStatus({ stage: 'uploading', progress: 20 });

    try {
      let content: string;
      let fileToCheck: File | null = null;
      
      if (importMethod === 'file' && selectedFile) {
        // Read file content
        console.log('[XML Import Debug] Reading file content');
        content = await selectedFile.text();
        fileToCheck = selectedFile;
      } else {
        // Fetch from URL
        console.log('[XML Import Debug] Fetching from URL');
        content = await fetchXmlFromUrl(xmlUrl.trim());
        // Create a File object from the fetched content for metadata extraction
        fileToCheck = new File([content], 'fetched.xml', { type: 'text/xml' });
      }
      
      setXmlContent(content);
      
      console.log('[XML Import Debug] Setting status to parsing');
      setImportStatus({ stage: 'parsing', progress: 50 });
      
      // Validate XML structure first
      const validation = validateIATIXML(content);
      if (!validation.isValid) {
        throw new Error(`Invalid IATI XML: ${validation.errors.join(', ')}`);
      }

      // Parse the IATI XML
      console.log('[XML Import Debug] Parsing IATI XML with real parser');
      const parser = new IATIXMLParser(content);
      const parsedActivity = parser.parseActivity();
      
      // Store parsed activity data in state for use by import function
      setParsedActivity(parsedActivity);
      
      console.log('[XML Import Debug] Parsed activity data:', parsedActivity);

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

      // === BASIC INFO TAB ===
      
      if (parsedActivity.iatiIdentifier) {
        const currentValue = currentActivityData.iati_identifier || null;
        
        // Format current and import values like collaboration type IDs
        const formattedCurrentValue = currentValue ? {
          code: currentValue,
          name: ''
        } : null;
        
        const formattedImportValue = {
          code: parsedActivity.iatiIdentifier,
          name: ''
        };
        
        fields.push({
          fieldName: 'IATI Identifier',
          iatiPath: 'iati-activity/iati-identifier',
          currentValue: formattedCurrentValue,
          importValue: formattedImportValue,
          selected: shouldSelectField(currentValue, parsedActivity.iatiIdentifier),
          hasConflict: hasConflict(currentValue, parsedActivity.iatiIdentifier),
          tab: 'basic',
          description: 'Unique identifier for this activity'
        });
      }

      if (parsedActivity.title) {
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
          tab: 'basic',
          description: 'Main title/name of the activity'
        });
      }

      if (parsedActivity.description) {
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
          tab: 'basic',
          description: 'General activity description (IATI type="1")'
        });
      }

      if (parsedActivity.descriptionObjectives) {
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
          tab: 'basic',
          description: 'Objectives of the activity (IATI type="2")'
        });
      }

      if (parsedActivity.descriptionTargetGroups) {
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
          tab: 'basic',
          description: 'Target groups and beneficiaries (IATI type="3")'
        });
      }

      if (parsedActivity.descriptionOther) {
        const currentValue = currentActivityData.description_other || null;
        fields.push({
          fieldName: 'Activity Description - Other',
          iatiPath: 'iati-activity/description[@type="4"]/narrative',
          currentValue: currentValue,
          importValue: parsedActivity.descriptionOther,
          selected: shouldSelectField(currentValue, parsedActivity.descriptionOther),
          hasConflict: hasConflict(currentValue, parsedActivity.descriptionOther),
          tab: 'basic',
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
          tab: 'basic',
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
          tab: 'basic',
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
          tab: 'basic',
          description: 'Geographical scope of the activity'
        });
      }

      if (parsedActivity.language) {
        const currentLanguageLabel = currentActivityData.language ? getLanguageLabel(currentActivityData.language) : null;
        const importLanguageLabel = getLanguageLabel(parsedActivity.language);
        fields.push({
          fieldName: 'Language',
          iatiPath: 'iati-activity[@xml:lang]',
          currentValue: currentLanguageLabel,
          importValue: importLanguageLabel,
          selected: shouldSelectField(currentLanguageLabel, importLanguageLabel),
          hasConflict: hasConflict(currentLanguageLabel, importLanguageLabel),
          tab: 'basic',
          description: 'Primary language of the activity'
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
          tab: 'basic',
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
          tab: 'basic',
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
          tab: 'basic',
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
          tab: 'basic',
          description: 'When the activity actually ended'
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

      // === BUDGETS TAB ===
      
      if (parsedActivity.budgets && parsedActivity.budgets.length > 0) {
        parsedActivity.budgets.forEach((budget, budgetIndex) => {
          // Create budget summary
          const budgetSummary = [
            budget.type && `Type: ${budget.type}`,
            budget.status && `Status: ${budget.status}`,
            budget.period?.start && `Start: ${budget.period.start}`,
            budget.period?.end && `End: ${budget.period.end}`,
            budget.value && `Amount: ${budget.value.toLocaleString()} ${budget.currency || ''}`
          ].filter(Boolean).join(' | ');
          
          fields.push({
            fieldName: `Budget ${budgetIndex + 1}`,
            iatiPath: `iati-activity/budget[${budgetIndex + 1}]`,
            currentValue: null,
            importValue: budgetSummary,
            selected: false,
            hasConflict: false,
            tab: 'budgets',
            description: `Budget ${budgetIndex + 1} - Click to configure individual fields`,
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
          // Create disbursement summary
          const disbursementSummary = [
            disbursement.type && `Type: ${disbursement.type}`,
            disbursement.period?.start && `Start: ${disbursement.period.start}`,
            disbursement.period?.end && `End: ${disbursement.period.end}`,
            disbursement.value && `Amount: ${disbursement.value.toLocaleString()} ${disbursement.currency || ''}`,
            disbursement.providerOrg?.name && `Provider: ${disbursement.providerOrg.name}`,
            disbursement.receiverOrg?.name && `Receiver: ${disbursement.receiverOrg.name}`
          ].filter(Boolean).join(' | ');
          
          fields.push({
            fieldName: `Planned Disbursement ${disbIndex + 1}`,
            iatiPath: `iati-activity/planned-disbursement[${disbIndex + 1}]`,
            currentValue: null,
            importValue: disbursementSummary,
            selected: false,
            hasConflict: false,
            tab: 'planned_disbursements',
            description: `Planned Disbursement ${disbIndex + 1} - Click to configure individual fields`,
            isFinancialItem: true,
            itemType: 'plannedDisbursement',
            itemIndex: disbIndex,
            itemData: disbursement
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
      
      if (parsedActivity.recipientCountries && parsedActivity.recipientCountries.length > 0) {
        const countryNames = parsedActivity.recipientCountries.map(c => c.narrative || c.code).join(', ');
        fields.push({
          fieldName: 'Recipient Countries',
          iatiPath: 'iati-activity/recipient-country',
          currentValue: null,
          importValue: countryNames,
          selected: false, // Don't auto-select complex data
          hasConflict: false,
          tab: 'locations',
          description: 'Countries where activity takes place'
        });
      }

      if (parsedActivity.recipientRegions && parsedActivity.recipientRegions.length > 0) {
        const regionNames = parsedActivity.recipientRegions.map(r => r.narrative || r.code).join(', ');
        fields.push({
          fieldName: 'Recipient Regions',
          iatiPath: 'iati-activity/recipient-region',
          currentValue: null,
          importValue: regionNames,
          selected: false,
          hasConflict: false,
          tab: 'locations',
          description: 'Regions where activity takes place'
        });
      }

      // === SECTORS TAB ===
      
      if (parsedActivity.sectors && parsedActivity.sectors.length > 0) {
        const currentSectorsInfo = currentActivityData.sectors && currentActivityData.sectors.length > 0 
          ? currentActivityData.sectors.map(s => `${s.code}: ${s.name} (${s.percentage}%)`).join('; ')
          : null;
        const importSectorInfo = parsedActivity.sectors.map(s => 
          `${s.code}: ${s.narrative || 'Unnamed sector'} (${s.percentage || 0}%)`
        ).join('; ');
        
        // Check for 3-digit sectors that need refinement
        const has3DigitSectors = parsedActivity.sectors.some(s => 
          s.code && s.code.length === 3 && /^\d{3}$/.test(s.code)
        );
        console.log('[Sector Import Debug] Parsed sectors:', parsedActivity.sectors);
        console.log('[Sector Import Debug] 3-digit sectors detected:', has3DigitSectors);
        console.log('[Sector Import Debug] Sector codes:', parsedActivity.sectors.map(s => s.code));
        
        const hasConflict = !!currentActivityData.sectors?.length;
        const sectorField: ParsedField = {
          fieldName: 'Sectors',
          iatiPath: 'iati-activity/sector',
          currentValue: currentSectorsInfo,
          importValue: importSectorInfo,
          selected: shouldSelectField(currentSectorsInfo, importSectorInfo),
          hasConflict: hasConflict,
          tab: 'sectors',
          description: has3DigitSectors 
            ? 'Sector classifications and allocations (Contains 3-digit categories - refinement needed)'
            : 'Sector classifications and allocations'
        };
        
        // Add metadata to track sectors that need refinement
        if (has3DigitSectors) {
          (sectorField as any).needsRefinement = true;
          (sectorField as any).importedSectors = parsedActivity.sectors;
        }
        
        fields.push(sectorField);
      }

      if (parsedActivity.policyMarkers && parsedActivity.policyMarkers.length > 0) {
        fields.push({
          fieldName: 'Policy Markers',
          iatiPath: 'iati-activity/policy-marker',
          currentValue: null,
          importValue: `${parsedActivity.policyMarkers.length} policy markers found`,
          selected: false,
          hasConflict: false,
          tab: 'sectors',
          description: 'Policy significance markers'
        });
      }

      // === PARTNERS TAB ===
      
      if (parsedActivity.reportingOrg) {
        fields.push({
          fieldName: 'Reporting Organization',
          iatiPath: 'iati-activity/reporting-org',
          currentValue: null,
          importValue: parsedActivity.reportingOrg.narrative || parsedActivity.reportingOrg.ref,
          selected: false,
          hasConflict: false,
          tab: 'partners',
          description: 'Organization reporting this activity'
        });
      }

      if (parsedActivity.participatingOrgs && parsedActivity.participatingOrgs.length > 0) {
        const orgNames = parsedActivity.participatingOrgs.map(org => 
          `${org.narrative || org.ref} (Role: ${org.role})`
        ).join('; ');
        fields.push({
          fieldName: 'Participating Organizations',
          iatiPath: 'iati-activity/participating-org',
          currentValue: null,
          importValue: orgNames,
          selected: false,
          hasConflict: false,
          tab: 'partners',
          description: 'Organizations involved in activity implementation'
        });
      }

      if (parsedActivity.contactInfo && parsedActivity.contactInfo.length > 0) {
        fields.push({
          fieldName: 'Contact Information',
          iatiPath: 'iati-activity/contact-info',
          currentValue: null,
          importValue: `${parsedActivity.contactInfo.length} contact entries found`,
          selected: false,
          hasConflict: false,
          tab: 'partners',
          description: 'Contact details for activity coordination'
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
        
        // Show sector refinement modal immediately
        setSectorRefinementData({
          originalSectors: importedSectors,
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
    setSectorRefinementData({
      originalSectors: importedSectors,
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
          case 'Language':
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
          case 'Sectors':
            // Handle sector imports - this will be processed separately after main activity update
            updateData._importSectors = true;
            break;
          default:
            if (field.fieldName.startsWith('Budget ')) {
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
            } else if (field.fieldName.startsWith('Transaction ')) {
              // Collect transaction data for import
              if (!updateData.importedTransactions) updateData.importedTransactions = [];
              const transactionIndex = parseInt(field.fieldName.split(' ')[1]) - 1;
              if (parsedActivity.transactions && parsedActivity.transactions[transactionIndex]) {
                updateData.importedTransactions.push(parsedActivity.transactions[transactionIndex]);
              }
              console.log(`[XML Import] Adding transaction ${transactionIndex + 1} for import`);
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
            console.log('[XML Import] Using original sectors from field');
            // This would handle non-refined sector imports
          }

          if (sectorsToImport.length > 0) {
            console.log('[XML Import] Importing sectors to database:', sectorsToImport);
            
            // Validate sectors before sending to API
            const totalPercentage = sectorsToImport.reduce((sum, s) => sum + (s.percentage || 0), 0);
            if (Math.abs(totalPercentage - 100) > 0.01) {
              console.error('[XML Import] Invalid sector percentage total:', totalPercentage);
              toast.error('Sector import failed: Invalid percentages', {
                description: `Sector percentages total ${totalPercentage.toFixed(1)}% instead of 100%. Please use the sector refinement modal to fix this.`
              });
              return;
            }
            
            // Check for invalid sector codes
            const invalidSectors = sectorsToImport.filter(s => !s.sector_code || !/^\d{5}$/.test(s.sector_code));
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
            case 'Activity Scope':
              saveKey = 'activityScope';
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
      'dates': 'Dates', 
      'finances': 'Finances',
      'budgets': 'Budgets',
      'planned_disbursements': 'Planned Disbursements',
      'transactions': 'Transactions',
      'locations': 'Locations',
      'sectors': 'Sectors',
      'partners': 'Partners',
      'results': 'Results'
    };

    fields.forEach(field => {
      if (!tabMap.has(field.tab)) {
        tabMap.set(field.tab, {
          tabId: field.tab,
          tabName: tabNames[field.tab] || field.tab,
          fields: []
        });
      }
      tabMap.get(field.tab)!.fields.push(field);
    });

    return Array.from(tabMap.values()).sort((a, b) => {
      const order = ['basic', 'dates', 'finances', 'budgets', 'planned_disbursements', 'transactions', 'locations', 'sectors', 'partners', 'results'];
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
      <td className="px-4 py-3">
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
        </div>
      </td>
      <td className="px-4 py-3">
        {field.currentValue ? (
          typeof field.currentValue === 'object' && field.currentValue?.code ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.currentValue.code}</span>
              <span className="text-sm font-medium text-gray-900">{field.currentValue.name}</span>
            </div>
          ) : (
            <span className="text-sm font-medium text-gray-900">{field.currentValue}</span>
          )
        ) : (
          <span className="text-sm text-gray-400 italic">Empty</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="space-y-1">
          {typeof field.importValue === 'object' && field.importValue?.code ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.importValue.code}</span>
              <span className="text-sm font-medium text-gray-900">{field.importValue.name}</span>
            </div>
          ) : (
            <span className="text-sm font-medium text-gray-900">{field.importValue}</span>
          )}
          {(field as any).needsRefinement && (
            <div className="mt-1">
              <Badge variant="outline" className="text-xs border-yellow-400 text-yellow-700">
                <AlertCircle className="h-3 w-3 mr-1" />
                3-digit categories detected
              </Badge>
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        {field.hasConflict ? (
          <Badge variant="outline" className="text-xs border-orange-400 text-orange-700">
            <AlertCircle className="h-3 w-3 mr-1" />
            Conflict
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
      </td>
    </tr>
  );

  // Tab content component
  const TabFieldContent = ({ tabSection }: { tabSection: TabSection }) => {
    const tabFieldsSelected = tabSection.fields.filter(f => f.selected).length;
    const tabFieldsTotal = tabSection.fields.length;

    return (
      <div className="space-y-4">
        {/* Tab header with selection controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {/* Removed redundant badges */}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                tabSection.fields.forEach((field) => {
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
                tabSection.fields.forEach((field) => {
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Field
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Import Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center w-24">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tabSection.fields.map((field, index) => {
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

  return (
    <div className="space-y-6">

      {/* Import Method Selection and Input */}
      {importStatus.stage === 'idle' && !selectedFile && !xmlContent && (
        <div>
            {/* Method Selection */}
            <div className="mb-6">
              <Label className="text-base font-medium">Import Method</Label>
              <div className="flex gap-4 mt-2">
                <Button
                  variant={importMethod === 'file' ? 'default' : 'outline'}
                  onClick={() => setImportMethod('file')}
                  className="flex-1"
                >
                  <FileCode className="h-4 w-4 mr-2" />
                  Upload File
                </Button>
                <Button
                  variant={importMethod === 'url' ? 'default' : 'outline'}
                  onClick={() => setImportMethod('url')}
                  className="flex-1"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  From URL
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
                    <Input
                      type="url"
                      placeholder="https://example.com/iati-activity.xml"
                      value={xmlUrl}
                      onChange={(e) => setXmlUrl(e.target.value)}
                      className="text-center"
                    />
                    <Button 
                      onClick={parseXmlFile}
                      disabled={!xmlUrl.trim()}
                      className="w-full"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Fetch and Parse XML
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <div className="font-medium text-sm mb-2">Import Guidelines</div>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>{importMethod === 'file' ? 'File' : 'URL'} must be a valid IATI Activity XML document</li>
                    {importMethod === 'url' && <li>URL must be publicly accessible (no authentication required)</li>}
                    <li>You can review all fields before importing</li>
                    <li>Existing data will be highlighted if there are conflicts</li>
                    <li>You can choose which fields to import or skip</li>
                  </ul>
                </div>
              </div>
            </div>
        </div>
      )}

      {/* Selected File/URL Info */}
      {(selectedFile || (xmlUrl && importMethod === 'url')) && importStatus.stage !== 'complete' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {importMethod === 'file' ? (
                  <FileText className="h-8 w-8 text-gray-700" />
                ) : (
                  <Globe className="h-8 w-8 text-gray-700" />
                )}
                <div>
                  {importMethod === 'file' && selectedFile ? (
                    <>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">XML from URL</p>
                      <p className="text-sm text-gray-500 max-w-md truncate">
                        {xmlUrl}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {importStatus.stage === 'idle' && (
                  <>
                    {xmlContent && (
                      <Button variant="outline" size="sm" onClick={() => setShowXmlPreview(!showXmlPreview)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview XML
                      </Button>
                    )}
                    {!xmlContent && importMethod === 'file' && selectedFile && (
                      <Button onClick={parseXmlFile}>
                        <FileCode className="h-4 w-4 mr-2" />
                        Parse File
                      </Button>
                    )}
                    {!xmlContent && importMethod === 'url' && xmlUrl.trim() && (
                      <Button onClick={parseXmlFile}>
                        <Globe className="h-4 w-4 mr-2" />
                        Fetch and Parse
                      </Button>
                    )}
                    {xmlContent && parsedFields.length === 0 && (
                      <Button onClick={parseXmlFile}>
                        <FileCode className="h-4 w-4 mr-2" />
                        Parse XML
                      </Button>
                    )}
                  </>
                )}
                {importStatus.stage !== 'idle' && importStatus.stage !== 'importing' && (
                  <Button variant="outline" size="sm" onClick={resetImport}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {importStatus.progress !== undefined && importStatus.stage !== 'previewing' && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">
                    {importStatus.stage === 'uploading' && 'Reading file...'}
                    {importStatus.stage === 'parsing' && 'Parsing XML...'}
                    {importStatus.stage === 'importing' && importStatus.message}
                  </span>
                  <span className="text-sm text-gray-600">{importStatus.progress}%</span>
                </div>
                <Progress value={importStatus.progress} />
              </div>
            )}
          </CardContent>
        </Card>
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
              const refinedSectorInfo = refinedSectors.map(s => 
                `${s.code}: ${s.name} (${s.percentage}%)`
              ).join('; ');
              
              return {
                ...field,
                importValue: refinedSectorInfo,
                description: 'Sector classifications and allocations (Refined to 5-digit sub-sectors)',
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
                            {typeof field.importValue === 'object' && field.importValue?.code ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{field.importValue.code}</span>
                                <span className="text-sm font-medium text-gray-900">{field.importValue.name}</span>
                              </div>
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
                const updatedFields = [...allFields];
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
                
                setAllFields(updatedFields);
                setShowDetailModal(false);
              }}>
                Apply Selection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}

// Sector Refinement Modal Component
interface SectorRefinementModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalSectors: any[];
  onSave: (refinedSectors: any[]) => void;
}

const SectorRefinementModal = ({ isOpen, onClose, originalSectors, onSave }: SectorRefinementModalProps) => {
  const [refinedSectors, setRefinedSectors] = useState<any[]>([]);
  const [totalPercentage, setTotalPercentage] = useState(0);

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
    
    // Check for invalid codes
    const invalidCodes = sectors.filter(s => !isValidSectorCode(s.code));
    if (invalidCodes.length > 0) {
      issues.push(`Invalid sector codes: ${invalidCodes.map(s => s.code).join(', ')}`);
    }
    
    // Check percentage total
    const total = sectors.reduce((sum, s) => sum + (s.percentage || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      issues.push(`Sector percentages total ${total.toFixed(1)}% instead of 100%`);
    }
    
    // Check for zero percentages
    const zeroPercentages = sectors.filter(s => (s.percentage || 0) === 0);
    if (zeroPercentages.length > 0 && sectors.length > 1) {
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
            isValid: isValidSectorCode(sector.code)
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
          isValid: isValidSectorCode(sector.code)
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
    const total = sectors.reduce((sum, sector) => sum + (sector.percentage || 0), 0);
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

  const handleNormalizePercentages = () => {
    const normalized = normalizePercentages(refinedSectors);
    setRefinedSectors(normalized);
    calculateTotal(normalized);
  };

  const handleEqualDistribution = () => {
    const equalPercentage = Math.round((100 / refinedSectors.length) * 100) / 100;
    const updated = refinedSectors.map(s => ({ ...s, percentage: equalPercentage }));
    setRefinedSectors(updated);
    calculateTotal(updated);
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
                Total Percentage: 
              </span>
              <div className="flex items-center gap-3">
                <span className={`font-bold ${
                  Math.abs(totalPercentage - 100) < 0.01 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {totalPercentage.toFixed(1)}%
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEqualDistribution}
                    className="text-xs px-2 py-1"
                  >
                    Equal Split
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleNormalizePercentages}
                    className="text-xs px-2 py-1"
                    disabled={totalPercentage === 0}
                  >
                    Normalize
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  Math.abs(totalPercentage - 100) < 0.01 
                    ? 'bg-green-500' 
                    : totalPercentage > 100
                      ? 'bg-red-500'
                      : 'bg-yellow-500'
                }`}
                style={{ width: `${Math.min(totalPercentage, 100)}%` }}
              />
            </div>
            
            {/* Show validation issues */}
            {(() => {
              const issues = detectSectorIssues(refinedSectors);
              if (issues.length > 0) {
                return (
                  <div className="bg-amber-50 border border-amber-200 rounded p-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                      <div className="text-xs text-amber-800">
                        <div className="font-medium mb-1">Issues detected:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {issues.map((issue, index) => (
                            <li key={index}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
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
                {refinedSectors.map((sector, index) => (
                  <tr key={index} className="bg-white">
                    <td className="px-3 py-3">
                      <div className="text-sm">
                        <div className="font-mono text-xs text-gray-600">
                          {sector.originalCode}
                        </div>
                        <div className="text-gray-500 text-xs">
                          {sector.originalPercentage}% original
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {sector.availableSubsectors.length > 0 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent/50 transition-colors"
                            >
                              <span className="truncate">
                                <span className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{sector.code}</span>
                                  <span className="font-medium">{sector.name}</span>
                                </span>
                              </span>
                              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[320px] p-0 shadow-lg border">
                            <Command>
                              <CommandList>
                                <CommandGroup>
                                  {sector.availableSubsectors.map((sub: any) => (
                                    <CommandItem
                                      key={sub.code}
                                      onSelect={() => handleSectorChange(index, 'code', sub.code)}
                                      className="cursor-pointer py-3 hover:bg-accent/50 focus:bg-accent data-[selected]:bg-accent transition-colors"
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${sector.code === sub.code ? "opacity-100" : "opacity-0"}`}
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{sub.code}</span>
                                          <span className="font-medium text-foreground">{sub.name}</span>
                                        </div>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div className="text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{sector.code}</span>
                            <span className="font-medium text-foreground">{sector.name}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={sector.percentage}
                        onChange={(e) => handleSectorChange(index, 'percentage', parseFloat(e.target.value) || 0)}
                        className="w-full text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={Math.abs(totalPercentage - 100) > 0.01}
          >
            Save Refined Sectors
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};