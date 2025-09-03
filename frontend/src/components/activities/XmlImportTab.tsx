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
import { toast } from 'sonner';
import { IATIXMLParser, validateIATIXML } from '@/lib/xml-parser';
import { ExternalPublisherModal } from '@/components/import/ExternalPublisherModal';
import { extractIatiMeta } from '@/lib/iati/parseMeta';
import { useUser } from '@/hooks/useUser';
import {
  Upload,
  FileText,
  AlertCircle,
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
  const [xmlUrl, setXmlUrl] = useState<string>('');
  const [importMethod, setImportMethod] = useState<'file' | 'url'>('file');
  const [showSectorRefinement, setShowSectorRefinement] = useState(false);
  const [sectorRefinementData, setSectorRefinementData] = useState<{
    originalSectors: any[];
    refinedSectors: any[];
  }>({ originalSectors: [], refinedSectors: [] });
  const [savedRefinedSectors, setSavedRefinedSectors] = useState<any[]>([]);
  
  // External Publisher Detection States
  const [showExternalPublisherModal, setShowExternalPublisherModal] = useState(false);
  const [externalPublisherMeta, setExternalPublisherMeta] = useState<any>(null);
  const [userPublisherRefs, setUserPublisherRefs] = useState<string[]>([]);
  const [userOrgName, setUserOrgName] = useState<string>('');
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
        const data = await fetchBasicActivityWithCache(activityId);
        setCurrentActivityData({
          id: data.id,
          title_narrative: data.title_narrative || data.title,
          description_narrative: data.description_narrative || data.description,
          planned_start_date: data.planned_start_date,
          planned_end_date: data.planned_end_date,
          actual_start_date: data.actual_start_date,
          actual_end_date: data.actual_end_date,
          activity_status: data.activity_status,
          collaboration_type: data.collaboration_type,
          activity_scope: data.activityScope || data.activity_scope,
          language: data.language,
          iati_identifier: data.iati_identifier,
          default_currency: data.default_currency,
          defaultAidType: data.defaultAidType,
          defaultFinanceType: data.defaultFinanceType,
          defaultFlowType: data.defaultFlowType,
          defaultTiedStatus: data.defaultTiedStatus,
          sectors: data.sectors || [],
        });
      } catch (error) {
        console.error('Error fetching activity data:', error);
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
      
      // EXTERNAL PUBLISHER DETECTION
      console.log('[XML Import] Checking for external publisher...');
      if (fileToCheck) {
        try {
          const meta = await extractIatiMeta(fileToCheck);
          console.log('[XML Import] Extracted metadata:', meta);
          console.log('[XML Import] User publisher refs:', userPublisherRefs);
          
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
            
            // Stop here - let the modal handle the choice
            setImportStatus({ stage: 'idle' });
            toast.info('External publisher detected', {
              description: `This activity is reported by ${meta.reportingOrgName || meta.reportingOrgRef}`
            });
            return;
          } else {
            console.log('[XML Import] Activity is owned by user, proceeding with normal import');
          }
        } catch (metaError) {
          console.error('[XML Import] Error extracting metadata:', metaError);
          // Continue with normal import if metadata extraction fails
        }
      }
      
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
      
      console.log('[XML Import Debug] Parsed activity data:', parsedActivity);

      // Create fields from parsed data organized by tabs
      const fields: ParsedField[] = [];

      // === BASIC INFO TAB ===
      
      if (parsedActivity.iatiIdentifier) {
        fields.push({
          fieldName: 'IATI Identifier',
          iatiPath: 'iati-activity/iati-identifier',
          currentValue: currentActivityData.iati_identifier || null,
          importValue: parsedActivity.iatiIdentifier,
          selected: !!currentActivityData.iati_identifier && currentActivityData.iati_identifier !== parsedActivity.iatiIdentifier,
          hasConflict: !!currentActivityData.iati_identifier && currentActivityData.iati_identifier !== parsedActivity.iatiIdentifier,
          tab: 'basic',
          description: 'Unique identifier for this activity'
        });
      }

      if (parsedActivity.title) {
        fields.push({
          fieldName: 'Activity Title',
          iatiPath: 'iati-activity/title/narrative',
          currentValue: currentActivityData.title_narrative || null,
          importValue: parsedActivity.title,
          selected: !!currentActivityData.title_narrative && currentActivityData.title_narrative !== parsedActivity.title,
          hasConflict: !!currentActivityData.title_narrative && currentActivityData.title_narrative !== parsedActivity.title,
          tab: 'basic',
          description: 'Main title/name of the activity'
        });
      }

      if (parsedActivity.description) {
        fields.push({
          fieldName: 'Activity Description',
          iatiPath: 'iati-activity/description/narrative',
          currentValue: currentActivityData.description_narrative || null,
          importValue: parsedActivity.description,
          selected: !!currentActivityData.description_narrative && currentActivityData.description_narrative !== parsedActivity.description,
          hasConflict: !!currentActivityData.description_narrative && currentActivityData.description_narrative !== parsedActivity.description,
          tab: 'basic',
          description: 'Detailed description of activity objectives and scope'
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
          selected: !!currentActivityData.collaboration_type && currentActivityData.collaboration_type !== parsedActivity.collaborationType,
          hasConflict: !!currentActivityData.collaboration_type && currentActivityData.collaboration_type !== parsedActivity.collaborationType,
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
          selected: !!currentActivityData.activity_status && currentActivityData.activity_status !== parsedActivity.activityStatus,
          hasConflict: !!currentActivityData.activity_status && currentActivityData.activity_status !== parsedActivity.activityStatus,
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
          selected: !!currentActivityData.activity_scope && currentActivityData.activity_scope !== parsedActivity.activityScope,
          hasConflict: !!currentActivityData.activity_scope && currentActivityData.activity_scope !== parsedActivity.activityScope,
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
          selected: !!currentActivityData.language && currentActivityData.language !== parsedActivity.language,
          hasConflict: !!currentActivityData.language && currentActivityData.language !== parsedActivity.language,
          tab: 'basic',
          description: 'Primary language of the activity'
        });
      }

      // === DATES TAB ===
      
      if (parsedActivity.plannedStartDate) {
        fields.push({
          fieldName: 'Planned Start Date',
          iatiPath: 'iati-activity/activity-date[@type="1"]',
          currentValue: currentActivityData.planned_start_date || null,
          importValue: parsedActivity.plannedStartDate,
          selected: !!currentActivityData.planned_start_date && currentActivityData.planned_start_date !== parsedActivity.plannedStartDate,
          hasConflict: !!currentActivityData.planned_start_date && currentActivityData.planned_start_date !== parsedActivity.plannedStartDate,
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
          selected: !!currentActivityData.planned_end_date && currentActivityData.planned_end_date !== parsedActivity.plannedEndDate,
          hasConflict: !!currentActivityData.planned_end_date && currentActivityData.planned_end_date !== parsedActivity.plannedEndDate,
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
          selected: !!currentActivityData.actual_start_date && currentActivityData.actual_start_date !== parsedActivity.actualStartDate,
          hasConflict: !!currentActivityData.actual_start_date && currentActivityData.actual_start_date !== parsedActivity.actualStartDate,
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
          selected: !!currentActivityData.actual_end_date && currentActivityData.actual_end_date !== parsedActivity.actualEndDate,
          hasConflict: !!currentActivityData.actual_end_date && currentActivityData.actual_end_date !== parsedActivity.actualEndDate,
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
          selected: !!currentActivityData.default_currency && currentActivityData.default_currency !== parsedActivity.defaultCurrency,
          hasConflict: !!currentActivityData.default_currency && currentActivityData.default_currency !== parsedActivity.defaultCurrency,
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
          selected: !!currentActivityData.defaultFinanceType && currentActivityData.defaultFinanceType !== parsedActivity.defaultFinanceType,
          hasConflict: !!currentActivityData.defaultFinanceType && currentActivityData.defaultFinanceType !== parsedActivity.defaultFinanceType,
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
          selected: !!currentActivityData.defaultFlowType && currentActivityData.defaultFlowType !== parsedActivity.defaultFlowType,
          hasConflict: !!currentActivityData.defaultFlowType && currentActivityData.defaultFlowType !== parsedActivity.defaultFlowType,
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
          selected: !!currentActivityData.defaultAidType && currentActivityData.defaultAidType !== parsedActivity.defaultAidType,
          hasConflict: !!currentActivityData.defaultAidType && currentActivityData.defaultAidType !== parsedActivity.defaultAidType,
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
          selected: !!currentActivityData.defaultTiedStatus && currentActivityData.defaultTiedStatus !== parsedActivity.defaultTiedStatus,
          hasConflict: !!currentActivityData.defaultTiedStatus && currentActivityData.defaultTiedStatus !== parsedActivity.defaultTiedStatus,
          tab: 'finances',
          description: 'Default tied aid status'
        });
      }

      // Add budget information
      if (parsedActivity.budgets && parsedActivity.budgets.length > 0) {
        fields.push({
          fieldName: 'Budgets',
          iatiPath: 'iati-activity/budget',
          currentValue: null,
          importValue: `${parsedActivity.budgets.length} budget entries found`,
          selected: false, // Don't auto-select complex data
          hasConflict: false,
          tab: 'finances',
          description: 'Budget allocations and periods'
        });
      }

      // Add transaction information
      if (parsedActivity.transactions && parsedActivity.transactions.length > 0) {
        fields.push({
          fieldName: 'Transactions',
          iatiPath: 'iati-activity/transaction',
          currentValue: null,
          importValue: `${parsedActivity.transactions.length} transactions found`,
          selected: false, // Don't auto-select complex data
          hasConflict: false,
          tab: 'finances',
          description: 'Financial transactions and disbursements'
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
        
        const hasConflict = !!currentActivityData.sectors?.length;
        const sectorField: ParsedField = {
          fieldName: 'Sectors',
          iatiPath: 'iati-activity/sector',
          currentValue: currentSectorsInfo,
          importValue: importSectorInfo,
          selected: hasConflict, // Auto-select if there are existing sectors
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
      console.log('[XML Import Debug] Setting status to previewing');
      setImportStatus({ stage: 'previewing', progress: 100 });
      
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
            updateData.description_narrative = field.importValue;
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
            try {
              const sectorResponse = await fetch(`/api/activities/${activityId}/sectors`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sectors: sectorsToImport, replace: true }),
              });

              if (!sectorResponse.ok) {
                console.error('[XML Import] Sector import failed:', await sectorResponse.text());
                toast.error('Failed to import sectors', {
                  description: 'Main activity data was imported successfully, but sectors failed.'
                });
              } else {
                console.log('[XML Import] Sectors imported successfully');
                toast.success('Sectors imported successfully');
              }
            } catch (sectorError) {
              console.error('[XML Import] Sector import error:', sectorError);
              toast.error('Failed to import sectors');
            }
          }
        }
      }

      // Update local activity data to reflect changes
      setCurrentActivityData(prev => ({
        ...prev,
        ...updateData
      }));

      setImportStatus({ stage: 'complete' });
      toast.success(`Successfully imported ${selectedFieldsList.length} fields from XML`, {
        description: 'Activity data has been updated and saved to the database.'
      });

      // Clear refined sectors after successful import
      setSavedRefinedSectors([]);

      // Refresh the page or trigger a data refetch if needed
      setTimeout(() => {
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
      const order = ['basic', 'dates', 'finances', 'locations', 'sectors', 'partners', 'results'];
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
          <p className="text-xs text-gray-500">{field.description}</p>
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
        {field.hasConflict && (
          <Badge variant="outline" className="text-xs border-orange-400 text-orange-700">
            <AlertCircle className="h-3 w-3 mr-1" />
            Conflict
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
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5" />
            XML Import
          </CardTitle>
          <CardDescription>
            Import activity data from an IATI-compliant XML file. You can review and select which fields to import.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Import Method Selection and Input */}
      {importStatus.stage === 'idle' && !selectedFile && !xmlContent && (
        <Card>
          <CardContent className="pt-6">
            {/* Method Selection */}
            <div className="mb-6">
              <Label className="text-base font-medium">Import Method</Label>
              <div className="flex gap-4 mt-2">
                <Button
                  variant={importMethod === 'file' ? 'default' : 'outline'}
                  onClick={() => setImportMethod('file')}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
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
                <Upload className="h-12 w-12 text-gray-500 mx-auto mb-4" />
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
              <Alert>
                <Info className="h-4 w-4" />
                <div className="font-medium">Import Guidelines</div>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>{importMethod === 'file' ? 'File' : 'URL'} must be a valid IATI Activity XML document</li>
                    {importMethod === 'url' && <li>URL must be publicly accessible (no authentication required)</li>}
                    <li>You can review all fields before importing</li>
                    <li>Existing data will be highlighted if there are conflicts</li>
                    <li>You can choose which fields to import or skip</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
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
                        <Upload className="h-4 w-4 mr-2" />
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
                  <div className="text-sm text-orange-600">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    <strong>{parsedFields.filter(f => f.selected && f.hasConflict).length}</strong> conflicts to resolve
                  </div>
                )}
                <div className="text-sm text-blue-600">
                  <strong>{organizeFieldsByTabs(parsedFields).length}</strong> activity tabs affected
                </div>
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
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Ready to import <strong>{parsedFields.filter(f => f.selected).length}</strong> fields into the Activity Editor
                  {parsedFields.filter(f => f.selected && f.hasConflict).length > 0 && (
                    <div className="text-orange-600 mt-1">
                      ⚠️ {parsedFields.filter(f => f.selected && f.hasConflict).length} fields will overwrite existing data
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
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
            </CardContent>
          </Card>
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
                  <Upload className="h-4 w-4 mr-2" />
                  Import Another File
                </Button>
                <Button>
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
          existingActivity={existingActivity}
          onChoose={async (choice, targetActivityId) => {
            console.log('[XML Import] External publisher choice:', choice, targetActivityId);
            
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
                      userId: user?.id || 'current-user'
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
                      userId: user?.id || 'current-user'
                    })
                  });
                  
                  if (response.ok) {
                    const data = await response.json();
                    toast.success('Fork created', {
                      description: 'You can now edit this activity. Remember to assign your own IATI ID before publishing.'
                    });
                    setShowExternalPublisherModal(false);
                    // Continue with normal import flow for the forked activity
                    parseXmlFile(); // Re-run parsing after fork
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
                        userId: 'current-user'
                      })
                    });
                    
                    if (response.ok) {
                      toast.success('Linked successfully', {
                        description: 'External record linked to your existing activity.'
                      });
                      setShowExternalPublisherModal(false);
                      // Continue with import to merge fields
                      parseXmlFile(); // Re-run parsing after merge
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

  // Mock subsector data - in real implementation, this would come from your IATI reference data
  const getSubsectorsFor3DigitCode = (threeDigitCode: string) => {
    const subsectorMap: Record<string, any[]> = {
      '111': [
        { code: '11110', name: 'Education policy and administrative management' },
        { code: '11120', name: 'Education facilities and training' },
        { code: '11130', name: 'Teacher training' },
        { code: '11182', name: 'Educational research' },
      ],
      '112': [
        { code: '11220', name: 'Primary education' },
        { code: '11230', name: 'Basic life skills for adults' },
        { code: '11240', name: 'Early childhood education' },
      ],
      '113': [
        { code: '11320', name: 'Secondary education' },
        { code: '11330', name: 'Vocational training' },
      ],
      '110': [
        { code: '11010', name: 'Education policy and administrative management' },
        { code: '11020', name: 'Education facilities and training' },
      ]
    };
    
    return subsectorMap[threeDigitCode] || [
      { code: `${threeDigitCode}10`, name: `${threeDigitCode} - Policy and administrative management` },
      { code: `${threeDigitCode}20`, name: `${threeDigitCode} - Facilities and training` },
    ];
  };

  useEffect(() => {
    if (isOpen && originalSectors.length > 0) {
      // Initialize refined sectors based on original sectors
      const initialRefinedSectors = originalSectors.map(sector => {
        if (sector.code && sector.code.length === 3) {
          const subsectors = getSubsectorsFor3DigitCode(sector.code);
          // Default to first subsector for this category
          return {
            originalCode: sector.code,
            originalPercentage: sector.percentage || 0,
            code: subsectors[0]?.code || `${sector.code}10`,
            name: subsectors[0]?.name || `${sector.code} - Default subsector`,
            percentage: sector.percentage || 0,
            availableSubsectors: subsectors
          };
        }
        return {
          originalCode: sector.code,
          originalPercentage: sector.percentage || 0,
          code: sector.code,
          name: sector.narrative || sector.name,
          percentage: sector.percentage || 0,
          availableSubsectors: []
        };
      });
      
      setRefinedSectors(initialRefinedSectors);
      calculateTotal(initialRefinedSectors);
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
    } else {
      updated[index][field] = value;
    }
    
    setRefinedSectors(updated);
    if (field === 'percentage') {
      calculateTotal(updated);
    }
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
          {/* Progress indicator */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Total Percentage: 
              </span>
              <span className={`font-bold ${
                Math.abs(totalPercentage - 100) < 0.01 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {totalPercentage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
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
                        <select
                          value={sector.code}
                          onChange={(e) => handleSectorChange(index, 'code', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                        >
                          {sector.availableSubsectors.map((sub: any) => (
                            <option key={sub.code} value={sub.code}>
                              {sub.code}: {sub.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm">
                          <div className="font-mono text-xs">
                            {sector.code}
                          </div>
                          <div className="text-gray-600 text-xs">
                            {sector.name}
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