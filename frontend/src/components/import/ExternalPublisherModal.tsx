'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  HelpCircle, 
  AlertTriangle, 
  Copy, 
  Merge,
  Info,
  Building2,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { USER_ROLES } from '@/types/user';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { IATIXMLParser, validateIATIXML } from '@/lib/xml-parser';
import { IatiImportFieldsTable } from '@/components/activities/IatiImportFieldsTable';
// Inline strings for demo - in production would come from i18n
const iatiImportStrings = {
  modalTitle: 'External Publisher Detected',
  'summary.reportingOrg': 'Source Publisher',
  'summary.yourOrg': 'Your Organisation', 
  'summary.iatiId': 'Source IATI Identifier',
  'summary.reportingOrg.help': 'The organisation listed in the imported XML file.',
  'summary.yourOrg.help': 'The organisation currently logged into the system.',
  'summary.iatiId.help': 'The activity identifier from the imported XML.',
  'summary.lastUpdated': 'Last Updated',
  'summary.notProvided': 'Not provided',
  'noPublisher.banner': 'You have no publisher identifiers set up. All activities will be treated as external.',
  duplicateWarning: 'Warning: An activity with this IATI identifier already exists in your system.',
  'option.merge.title': 'Merge into Current Activity',
  'option.merge.help': 'Link this external record to the activity you are currently editing.',
  'option.merge.tooltip': 'Attach the external activity record directly to the one you are editing. This creates a link between the two datasets, allowing you to maintain your own reporting while showing its connection to the external activity (for example, a donor\'s parent record or an implementing partner\'s sub-activity).',
  'option.reportingOrg.title': 'Import under Original Publisher',
  'option.reportingOrg.help': 'Import under the original reporting organisation to preserve source metadata.',
  'option.reportingOrg.tooltip': 'Import under the original reporting organisation to preserve source metadata. Only available to Super and Government users.',
  'merge.title': 'Select Activity to Merge',
  footnote: 'This decision affects data ownership and reporting. You can change it later if needed.',
  'btn.cancel': 'Cancel',
  'btn.continue': 'Continue',
  'btn.back': 'Back'
};

export interface ExternalPublisherModalProps {
  isOpen: boolean;
  onClose: () => void;
  meta: {
    iatiId: string;
    reportingOrgRef: string;
    reportingOrgName?: string;
    lastUpdated?: string;
  };
  userOrgName: string;
  userPublisherRefs: string[];
  userRole?: string; // User role for permission checking
  userId?: string; // User ID for API calls
  xmlContent?: string; // XML content for import_as_reporting_org option
  onChoose: (choice: 'merge' | 'import_as_reporting_org', targetActivityId?: string) => void;
  currentActivityId?: string; // The activity being edited
  currentActivityIatiId?: string; // The IATI ID of the current activity
  existingActivity?: {
    id: string;
    iatiId: string;
    reportingOrgRef: string;
  } | null;
}

type ImportOption = 'merge' | 'import_as_reporting_org';

interface ParsedField {
  fieldName: string;
  iatiPath: string;
  currentValue: any;
  importValue: any;
  selected: boolean;
  hasConflict: boolean;
  tab: string;
  description?: string;
  isFinancialItem?: boolean;
  itemType?: 'budget' | 'transaction' | 'plannedDisbursement' | 'countryBudgetItems';
  itemIndex?: number;
  itemData?: any;
  isPolicyMarker?: boolean;
  policyMarkerData?: any;
  hasNonDacSectors?: boolean;
  nonDacSectors?: any[];
  isTagField?: boolean;
  tagData?: Array<{
    vocabulary?: string;
    vocabularyUri?: string;
    code?: string;
    narrative?: string;
  }>;
  existingTags?: any[];
  isConditionsField?: boolean;
  conditionsData?: {
    attached: boolean;
    conditions: Array<{
      type: string;
      narrative: Record<string, string>;
    }>;
  };
  isLocationItem?: boolean;
  locationData?: any;
  isFssItem?: boolean;
  fssData?: any;
  category?: string;
  documentData?: any[];
}

export function ExternalPublisherModal({
  isOpen,
  onClose,
  meta,
  userOrgName,
  userPublisherRefs,
  userRole,
  userId,
  xmlContent,
  onChoose,
  currentActivityId,
  currentActivityIatiId,
  existingActivity
}: ExternalPublisherModalProps) {
  const [selectedOption, setSelectedOption] = useState<ImportOption | null>('merge');
  const [isLoading, setIsLoading] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [duplicatesToReplace, setDuplicatesToReplace] = useState<Array<{ iatiIdentifier: string; existingId: string; existingTitle: string }>>([]);
  const [reportingOrgRef, setReportingOrgRef] = useState<string>('');
  const [showFieldSelection, setShowFieldSelection] = useState(false);
  const [parsedFields, setParsedFields] = useState<ParsedField[]>([]);
  const [parsedActivityData, setParsedActivityData] = useState<any>(null);
  const [isParsing, setIsParsing] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedOption('merge');
      setShowFieldSelection(false);
      setParsedFields([]);
      setParsedActivityData(null);
    }
  }, [isOpen]);

  const handleOptionChange = (option: ImportOption) => {
    setSelectedOption(option);
  };

  // Parse IATI XML and extract fields
  const parseIatiXml = async () => {
    if (!xmlContent) {
      toast.error('XML content is missing');
      return;
    }

    setIsParsing(true);
    try {
      // Validate XML
      const validation = validateIATIXML(xmlContent);
      if (!validation.isValid) {
        throw new Error(`Invalid IATI XML: ${validation.errors.join(', ')}`);
      }

      // Parse the XML
      const parser = new IATIXMLParser(xmlContent);
      const parsedActivity = parser.parseActivity();
      setParsedActivityData(parsedActivity);

      // Extract fields (simplified version - can be expanded later)
      const fields: ParsedField[] = [];

      // Basic fields
      if (parsedActivity.title) {
        fields.push({
          fieldName: 'Activity Title',
          iatiPath: 'iati-activity/title/narrative',
          currentValue: null,
          importValue: parsedActivity.title,
          selected: true,
          hasConflict: false,
          tab: 'other',
          description: 'Main title/name of the activity'
        });
      }

      if (parsedActivity.description) {
        fields.push({
          fieldName: 'Activity Description',
          iatiPath: 'iati-activity/description[@type="1"]/narrative',
          currentValue: null,
          importValue: parsedActivity.description,
          selected: true,
          hasConflict: false,
          tab: 'descriptions',
          description: 'General activity description'
        });
      }

      if (parsedActivity.activityStatus) {
        fields.push({
          fieldName: 'Activity Status',
          iatiPath: 'iati-activity/activity-status',
          currentValue: null,
          importValue: parsedActivity.activityStatus,
          selected: true,
          hasConflict: false,
          tab: 'other',
          description: 'Current implementation status'
        });
      }

      // Dates
      if (parsedActivity.plannedStartDate) {
        fields.push({
          fieldName: 'Planned Start Date',
          iatiPath: 'iati-activity/activity-date[@type="1"]',
          currentValue: null,
          importValue: parsedActivity.plannedStartDate,
          selected: true,
          hasConflict: false,
          tab: 'dates',
          description: 'When the activity is planned to begin'
        });
      }

      if (parsedActivity.plannedEndDate) {
        fields.push({
          fieldName: 'Planned End Date',
          iatiPath: 'iati-activity/activity-date[@type="3"]',
          currentValue: null,
          importValue: parsedActivity.plannedEndDate,
          selected: true,
          hasConflict: false,
          tab: 'dates',
          description: 'When the activity is planned to end'
        });
      }

      if (parsedActivity.actualStartDate) {
        fields.push({
          fieldName: 'Actual Start Date',
          iatiPath: 'iati-activity/activity-date[@type="2"]',
          currentValue: null,
          importValue: parsedActivity.actualStartDate,
          selected: true,
          hasConflict: false,
          tab: 'dates',
          description: 'When the activity actually started'
        });
      }

      if (parsedActivity.actualEndDate) {
        fields.push({
          fieldName: 'Actual End Date',
          iatiPath: 'iati-activity/activity-date[@type="4"]',
          currentValue: null,
          importValue: parsedActivity.actualEndDate,
          selected: true,
          hasConflict: false,
          tab: 'dates',
          description: 'When the activity actually ended'
        });
      }

      // Financial
      if (parsedActivity.defaultCurrency) {
        fields.push({
          fieldName: 'Default Currency',
          iatiPath: 'iati-activity/default-currency',
          currentValue: null,
          importValue: parsedActivity.defaultCurrency,
          selected: true,
          hasConflict: false,
          tab: 'other',
          description: 'Default currency code'
        });
      }

      // Sectors
      if (parsedActivity.sectors && parsedActivity.sectors.length > 0) {
        fields.push({
          fieldName: 'Sectors',
          iatiPath: 'iati-activity/sector',
          currentValue: null,
          importValue: parsedActivity.sectors,
          selected: true,
          hasConflict: false,
          tab: 'sectors',
          description: `Sector classifications (${parsedActivity.sectors.length} sector(s))`
        });
      }

      // Participating Organizations
      if (parsedActivity.participatingOrgs && parsedActivity.participatingOrgs.length > 0) {
        fields.push({
          fieldName: 'Participating Organizations',
          iatiPath: 'iati-activity/participating-org',
          currentValue: null,
          importValue: parsedActivity.participatingOrgs,
          selected: true,
          hasConflict: false,
          tab: 'participating_orgs',
          description: `Participating organizations (${parsedActivity.participatingOrgs.length} org(s))`
        });
      }

      // Budgets - Individual fields for each budget
      if (parsedActivity.budgets && parsedActivity.budgets.length > 0) {
        parsedActivity.budgets.forEach((budget: any, budgetIndex: number) => {
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
          
          // Type and status labels
          const type = parseInt(budget.type || '1');
          const typeLabel = type === 1 ? 'Original' : type === 2 ? 'Revised' : `Unknown (${type})`;
          const status = parseInt(budget.status || '1');
          const statusLabel = status === 1 ? 'Indicative' : status === 2 ? 'Committed' : `Unknown (${status})`;
          
          // Create budget summary
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

      // Transactions - Individual fields for each transaction
      if (parsedActivity.transactions && parsedActivity.transactions.length > 0) {
        parsedActivity.transactions.forEach((transaction: any, transIndex: number) => {
          // Create transaction summary with type mapping (IATI Standard v2.03)
          const transactionTypes: Record<string, string> = {
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
          
          const transactionType = transactionTypes[transaction.type || ''] || transaction.type || 'Unknown';
          
          const transactionSummary = [
            `Type: ${transactionType}`,
            transaction.date && `Date: ${transaction.date}`,
            transaction.value !== undefined && `Amount: ${transaction.value.toLocaleString()} ${transaction.currency || parsedActivity.defaultCurrency || ''}`,
            transaction.description && `Description: ${transaction.description}`,
            transaction.providerOrg?.name && `Provider: ${transaction.providerOrg.name}`,
            transaction.receiverOrg?.name && `Receiver: ${transaction.receiverOrg.name}`
          ].filter(Boolean).join(' | ');
          
          fields.push({
            fieldName: `Transaction ${transIndex + 1}`,
            iatiPath: `iati-activity/transaction[${transIndex + 1}]`,
            currentValue: null,
            importValue: transactionSummary,
            selected: false, // Don't auto-select transactions
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

      // Locations
      if (parsedActivity.recipientCountries && parsedActivity.recipientCountries.length > 0) {
        fields.push({
          fieldName: 'Recipient Countries',
          iatiPath: 'iati-activity/recipient-country',
          currentValue: null,
          importValue: parsedActivity.recipientCountries,
          selected: true,
          hasConflict: false,
          tab: 'locations',
          description: `Recipient countries (${parsedActivity.recipientCountries.length} country/countries)`
        });
      }

      if (parsedActivity.recipientRegions && parsedActivity.recipientRegions.length > 0) {
        fields.push({
          fieldName: 'Recipient Regions',
          iatiPath: 'iati-activity/recipient-region',
          currentValue: null,
          importValue: parsedActivity.recipientRegions,
          selected: true,
          hasConflict: false,
          tab: 'locations',
          description: `Recipient regions (${parsedActivity.recipientRegions.length} region(s))`
        });
      }

      if (parsedActivity.locations && parsedActivity.locations.length > 0) {
        parsedActivity.locations.forEach((location: any, index: number) => {
          fields.push({
            fieldName: `Location ${index + 1}`,
            iatiPath: `iati-activity/location[${index + 1}]`,
            currentValue: null,
            importValue: location,
            selected: true,
            hasConflict: false,
            tab: 'locations',
            isLocationItem: true,
            locationData: location,
            description: `Location: ${location.name || location.ref || 'Unnamed'}`
          });
        });
      }

      // Other identifiers
      if (parsedActivity.otherIdentifier) {
        fields.push({
          fieldName: 'Other Identifier',
          iatiPath: 'iati-activity/other-identifier',
          currentValue: null,
          importValue: parsedActivity.otherIdentifier,
          selected: true,
          hasConflict: false,
          tab: 'identifiers_ids',
          description: 'Other activity identifier'
        });
      }

      if (parsedActivity.otherIdentifiers && parsedActivity.otherIdentifiers.length > 0) {
        parsedActivity.otherIdentifiers.forEach((identifier: any, index: number) => {
          fields.push({
            fieldName: `Other Identifier ${index + 1}`,
            iatiPath: `iati-activity/other-identifier[${index + 1}]`,
            currentValue: null,
            importValue: identifier,
            selected: true,
            hasConflict: false,
            tab: 'identifiers_ids',
            description: `Other identifier: ${identifier.ref || identifier.type || 'Unknown'}`
          });
        });
      }

      // Collaboration type
      if (parsedActivity.collaborationType) {
        fields.push({
          fieldName: 'Collaboration Type',
          iatiPath: 'iati-activity/collaboration-type',
          currentValue: null,
          importValue: parsedActivity.collaborationType,
          selected: true,
          hasConflict: false,
          tab: 'other',
          description: 'Type of collaboration arrangement'
        });
      }

      // Activity scope
      if (parsedActivity.activityScope) {
        fields.push({
          fieldName: 'Activity Scope',
          iatiPath: 'iati-activity/activity-scope',
          currentValue: null,
          importValue: parsedActivity.activityScope,
          selected: true,
          hasConflict: false,
          tab: 'other',
          description: 'Geographical scope of the activity'
        });
      }

      // Language
      if (parsedActivity.language) {
        fields.push({
          fieldName: 'Narrative Language',
          iatiPath: 'iati-activity[@xml:lang]',
          currentValue: null,
          importValue: parsedActivity.language,
          selected: true,
          hasConflict: false,
          tab: 'basic',
          description: 'Primary language of the activity'
        });
      }

      // Financial defaults
      if (parsedActivity.defaultAidType) {
        fields.push({
          fieldName: 'Default Aid Type',
          iatiPath: 'iati-activity/default-aid-type',
          currentValue: null,
          importValue: parsedActivity.defaultAidType,
          selected: true,
          hasConflict: false,
          tab: 'other',
          description: 'Default aid type code'
        });
      }

      if (parsedActivity.defaultFlowType) {
        fields.push({
          fieldName: 'Default Flow Type',
          iatiPath: 'iati-activity/default-flow-type',
          currentValue: null,
          importValue: parsedActivity.defaultFlowType,
          selected: true,
          hasConflict: false,
          tab: 'other',
          description: 'Default flow type code'
        });
      }

      if (parsedActivity.defaultFinanceType) {
        fields.push({
          fieldName: 'Default Finance Type',
          iatiPath: 'iati-activity/default-finance-type',
          currentValue: null,
          importValue: parsedActivity.defaultFinanceType,
          selected: true,
          hasConflict: false,
          tab: 'other',
          description: 'Default finance type code'
        });
      }

      if (parsedActivity.defaultTiedStatus) {
        fields.push({
          fieldName: 'Default Tied Status',
          iatiPath: 'iati-activity/default-tied-status',
          currentValue: null,
          importValue: parsedActivity.defaultTiedStatus,
          selected: true,
          hasConflict: false,
          tab: 'other',
          description: 'Default tied status code'
        });
      }

      if (parsedActivity.capitalSpendPercentage !== undefined && parsedActivity.capitalSpendPercentage !== null) {
        fields.push({
          fieldName: 'Capital Spend Percentage',
          iatiPath: 'iati-activity/capital-spend-percentage',
          currentValue: null,
          importValue: parsedActivity.capitalSpendPercentage,
          selected: true,
          hasConflict: false,
          tab: 'other',
          description: `Capital spend: ${parsedActivity.capitalSpendPercentage}%`
        });
      }

      // Humanitarian
      if (parsedActivity.humanitarian !== undefined) {
        fields.push({
          fieldName: 'Humanitarian',
          iatiPath: 'iati-activity[@humanitarian]',
          currentValue: null,
          importValue: parsedActivity.humanitarian,
          selected: true,
          hasConflict: false,
          tab: 'humanitarian',
          description: `Humanitarian activity: ${parsedActivity.humanitarian ? 'Yes' : 'No'}`
        });
      }

      if (parsedActivity.humanitarianScopes && parsedActivity.humanitarianScopes.length > 0) {
        parsedActivity.humanitarianScopes.forEach((scope: any, index: number) => {
          const typeLabel = scope.type === '1' ? 'Emergency' : scope.type === '2' ? 'Appeal' : scope.type;
          fields.push({
            fieldName: `Humanitarian Scope ${index + 1}`,
            iatiPath: `iati-activity/humanitarian-scope[${index + 1}]`,
            currentValue: null,
            importValue: scope,
            selected: true,
            hasConflict: false,
            tab: 'humanitarian',
            description: `${typeLabel}: ${scope.code || 'Unknown'}`
          });
        });
      }

      // Policy markers
      if (parsedActivity.policyMarkers && parsedActivity.policyMarkers.length > 0) {
        parsedActivity.policyMarkers.forEach((marker: any, index: number) => {
          fields.push({
            fieldName: `Policy Marker: ${marker.code || 'Unknown'}`,
            iatiPath: `iati-activity/policy-marker[${index + 1}]`,
            currentValue: null,
            importValue: marker,
            selected: true,
            hasConflict: false,
            tab: 'policy-markers',
            isPolicyMarker: true,
            policyMarkerData: marker,
            description: `Policy marker: ${marker.code} (Significance: ${marker.significance})`
          });
        });
      }

      // Tags
      if (parsedActivity.tags && parsedActivity.tags.length > 0) {
        fields.push({
          fieldName: 'Tags',
          iatiPath: 'iati-activity/tag',
          currentValue: null,
          importValue: parsedActivity.tags,
          selected: true,
          hasConflict: false,
          tab: 'tags',
          isTagField: true,
          tagData: parsedActivity.tags,
          description: `Tags (${parsedActivity.tags.length} tag(s))`
        });
      }

      // Conditions
      if (parsedActivity.conditions) {
        fields.push({
          fieldName: 'Conditions',
          iatiPath: 'iati-activity/conditions',
          currentValue: null,
          importValue: parsedActivity.conditions,
          selected: true,
          hasConflict: false,
          tab: 'conditions',
          isConditionsField: true,
          conditionsData: parsedActivity.conditions,
          description: `Conditions: ${parsedActivity.conditions.attached ? 'Attached' : 'Not attached'} (${parsedActivity.conditions.conditions?.length || 0} condition(s))`
        });
      }

      // Forward Spending Survey (FSS)
      if (parsedActivity.fss) {
        fields.push({
          fieldName: 'Forward Spend',
          iatiPath: 'iati-activity/fss',
          currentValue: null,
          importValue: parsedActivity.fss,
          selected: true,
          hasConflict: false,
          tab: 'forward-spending-survey',
          isFssItem: true,
          fssData: parsedActivity.fss,
          description: `Forward Spending Survey (${parsedActivity.fss.forecasts?.length || 0} forecast(s))`
        });
      }

      // Planned disbursements - Individual fields for each planned disbursement
      if (parsedActivity.plannedDisbursements && parsedActivity.plannedDisbursements.length > 0) {
        parsedActivity.plannedDisbursements.forEach((disbursement: any, disbIndex: number) => {
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

      // Country budget items
      if (parsedActivity.countryBudgetItems && parsedActivity.countryBudgetItems.length > 0) {
        parsedActivity.countryBudgetItems.forEach((cbi: any, index: number) => {
          fields.push({
            fieldName: `Budget Mapping ${index + 1}`,
            iatiPath: `iati-activity/country-budget-items[${index + 1}]`,
            currentValue: null,
            importValue: cbi,
            selected: true,
            hasConflict: false,
            tab: 'country-budget',
            isFinancialItem: true,
            itemType: 'countryBudgetItems',
            itemIndex: index,
            itemData: cbi,
            description: `Country budget items: Vocabulary ${cbi.vocabulary || 'Unknown'} (${cbi.budgetItems?.length || 0} item(s))`
          });
        });
      }

      // Document links
      if (parsedActivity.document_links && parsedActivity.document_links.length > 0) {
        fields.push({
          fieldName: 'Document Links',
          iatiPath: 'iati-activity/document-link',
          currentValue: null,
          importValue: parsedActivity.document_links,
          selected: true,
          hasConflict: false,
          tab: 'documents',
          documentData: parsedActivity.document_links,
          description: `Document links (${parsedActivity.document_links.length} document(s))`
        });
      }

      // Contact info
      if (parsedActivity.contactInfo && parsedActivity.contactInfo.length > 0) {
        fields.push({
          fieldName: 'Contact Information',
          iatiPath: 'iati-activity/contact-info',
          currentValue: null,
          importValue: parsedActivity.contactInfo,
          selected: true,
          hasConflict: false,
          tab: 'contacts',
          description: `Contact information (${parsedActivity.contactInfo.length} contact(s))`
        });
      }

      // Related activities
      if (parsedActivity.relatedActivities && parsedActivity.relatedActivities.length > 0) {
        fields.push({
          fieldName: 'Related Activities',
          iatiPath: 'iati-activity/related-activity',
          currentValue: null,
          importValue: parsedActivity.relatedActivities,
          selected: true,
          hasConflict: false,
          tab: 'linked_activities',
          description: `Related activities (${parsedActivity.relatedActivities.length} activity/activities)`
        });
      }

      setParsedFields(fields);
      setShowFieldSelection(true);
      setIsParsing(false);
    } catch (error) {
      setIsParsing(false);
      toast.error('Failed to parse XML', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleImport = async (action: string, replaceActivityIds?: string[], selectedFields?: Record<string, boolean>, iatiData?: any) => {
    if (action !== 'import_as_reporting_org' || !xmlContent || !userId) {
      if (!userId) {
        toast.error('User ID required for import');
      }
      if (!xmlContent) {
        toast.error('XML content is missing. Please try importing the file again.');
      }
      return;
    }

    // Validate xmlContent is a string and not empty
    if (typeof xmlContent !== 'string' || xmlContent.trim().length === 0) {
      toast.error('XML content is empty or invalid');
      return;
    }

    setIsLoading(true);
    try {
      const requestBody: any = { 
        xmlContent,
        userId,
        userRole,
        replaceActivityIds
      };

      // Add fields and iati_data if provided
      if (selectedFields) {
        requestBody.fields = selectedFields;
      }
      if (iatiData) {
        requestBody.iati_data = iatiData;
      }

      const response = await fetch('/api/iati/import-as-reporting-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      setIsLoading(false);

      if (data.success) {
        const skippedMsg = data.skippedCount > 0 
          ? ` ${data.skippedCount} duplicate(s) skipped.` 
          : '';
        const replacedMsg = replaceActivityIds && replaceActivityIds.length > 0
          ? ` ${replaceActivityIds.length} activit${replaceActivityIds.length === 1 ? 'y' : 'ies'} replaced.`
          : '';
        
        // Show errors if any occurred
        if (data.errors && data.errors.length > 0) {
          const errorList = data.errors.map((e: any) => `${e.iatiIdentifier}: ${e.error}`).join('; ');
          toast.error(`Import completed with errors`, {
            description: `${data.count} imported. Errors: ${errorList}`
          });
        } else {
          toast.success(`${data.count} activities imported under ${data.reporting_org_ref}${replacedMsg}${skippedMsg}`, {
            description: data.skippedIdentifiers?.length > 0 
              ? `Skipped: ${data.skippedIdentifiers.slice(0, 3).join(', ')}${data.skippedIdentifiers.length > 3 ? '...' : ''}`
              : undefined
          });
        }
        onClose();
      } else if (data.hasDuplicates) {
        // Show confirmation dialog for replacing duplicates
        setDuplicatesToReplace(data.duplicates);
        setReportingOrgRef(data.reporting_org_ref);
        setShowReplaceDialog(true);
      } else {
        // Show detailed error message if available
        const errorMsg = data.details 
          ? `${data.error}: ${data.details}`
          : data.error || 'Import failed';
        toast.error(errorMsg);
      }
    } catch (error) {
      setIsLoading(false);
      toast.error('Import failed', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleConfirmReplace = async () => {
    setShowReplaceDialog(false);
    const replaceIds = duplicatesToReplace.map(d => d.existingId);
    // Build fields object from selected fields if available
    const fields: Record<string, boolean> = {};
    const iatiData: Record<string, any> = {};
    if (parsedFields.length > 0) {
      parsedFields.forEach(field => {
        if (field.selected) {
          fields[field.iatiPath] = true;
          iatiData[field.iatiPath] = field.importValue;
        }
      });
    }
    // Also pass the full parsed activity data for complex field processing
    if (parsedActivityData) {
      iatiData._parsedActivity = parsedActivityData;
    }
    await handleImport('import_as_reporting_org', replaceIds, Object.keys(fields).length > 0 ? fields : undefined, Object.keys(iatiData).length > 0 ? iatiData : undefined);
  };

  const handleCancelReplace = () => {
    setShowReplaceDialog(false);
    setDuplicatesToReplace([]);
    toast.info('Import cancelled. No activities were modified.');
  };

  const handleContinue = async () => {
    if (!selectedOption) return;

    // All options now use the same flow - close modal and show inline field selection
    if (selectedOption === 'merge' && currentActivityId) {
      onChoose(selectedOption, currentActivityId);
    } else {
      onChoose(selectedOption);
    }
  };

  const handleFieldSelectionConfirm = async () => {
    // Build fields object from selected fields
    const fields: Record<string, boolean> = {};
    const iatiData: Record<string, any> = {};
    
    parsedFields.forEach(field => {
      if (field.selected) {
        fields[field.iatiPath] = true;
        iatiData[field.iatiPath] = field.importValue;
      }
    });

    // Also pass the full parsed activity data for complex field processing
    // The API route can use this to process sectors, organizations, etc.
    if (parsedActivityData) {
      iatiData._parsedActivity = parsedActivityData;
    }

    // Close field selection dialog
    setShowFieldSelection(false);

    // Call import with selected fields
    await handleImport('import_as_reporting_org', undefined, fields, iatiData);
  };

  const handleFieldToggle = (field: ParsedField) => {
    const index = parsedFields.findIndex(f => f.iatiPath === field.iatiPath && f.fieldName === field.fieldName);
    if (index !== -1) {
      const updatedFields = [...parsedFields];
      updatedFields[index].selected = !updatedFields[index].selected;
      setParsedFields(updatedFields);
    }
  };

  const handleSelectAllFields = () => {
    setParsedFields(parsedFields.map(f => ({ ...f, selected: true })));
  };

  const handleDeselectAllFields = () => {
    setParsedFields(parsedFields.map(f => ({ ...f, selected: false })));
  };


  const formatLastUpdated = (dateString?: string) => {
    if (!dateString) return iatiImportStrings['summary.notProvided'];
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return format(date, 'PPP');
    } catch {
      return dateString;
    }
  };

  const hasNoPublisherRef = !userPublisherRefs || userPublisherRefs.length === 0;
  const hasDuplicateIatiId = existingActivity?.iatiId === meta.iatiId;

  // No longer need MergePicker - merge now uses current activity automatically

  return (
    <TooltipProvider delayDuration={500}>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              {iatiImportStrings.modalTitle}
            </DialogTitle>
            <DialogDescription>
              This activity is reported by a different organisation. Choose how you'd like to handle it.
            </DialogDescription>
          </DialogHeader>

          {/* Summary Information - 2 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Your Organisation */}
            <Card className="p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {iatiImportStrings['summary.yourOrg']}
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 rounded-full hover:bg-gray-100 focus:bg-gray-100"
                        type="button"
                        aria-label="Help"
                        tabIndex={-1}
                      >
                        <HelpCircle className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center">
                      <p className="text-xs">{iatiImportStrings['summary.yourOrg.help']}</p>
                    </TooltipContent>
                  </Tooltip>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{userOrgName || 'Unknown Organisation'}</p>
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {userPublisherRefs.length > 0 ? userPublisherRefs[0] : 'No Ref'}
                </span>
              </div>
            </div>
          </Card>

            {/* Source Publisher */}
            <Card className="p-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {iatiImportStrings['summary.reportingOrg']}
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 rounded-full hover:bg-gray-100 focus:bg-gray-100"
                        type="button"
                        aria-label="Help"
                        tabIndex={-1}
                      >
                        <HelpCircle className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center">
                      <p className="text-xs">{iatiImportStrings['summary.reportingOrg.help']}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{meta.reportingOrgName || 'Unknown Organisation'}</p>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{meta.reportingOrgRef}</span>
                </div>
              </div>
            </Card>
        </div>

        {/* Warnings */}
        {hasNoPublisherRef && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {iatiImportStrings['noPublisher.banner']}
            </AlertDescription>
          </Alert>
        )}

        {hasDuplicateIatiId && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {iatiImportStrings.duplicateWarning}
            </AlertDescription>
          </Alert>
        )}

        {/* Options */}
        <div className="space-y-4">
          <RadioGroup value={selectedOption || ''} onValueChange={handleOptionChange}>
            
            {/* Option 1: Merge */}
            <div className="bg-background border border-border rounded-lg p-6 space-y-4 hover:border-gray-300 transition-colors relative">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="merge" id="merge" className="mt-1" />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="merge" className="text-base font-medium cursor-pointer flex items-center gap-2">
                    <Merge className="h-4 w-4" />
                    {iatiImportStrings['option.merge.title']}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 rounded-full hover:bg-gray-100 focus:bg-gray-100"
                          type="button"
                          aria-label="Show examples"
                        >
                          <HelpCircle className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="center" className="max-w-sm">
                        <p className="text-xs">
                          {iatiImportStrings['option.merge.tooltip']}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <p className="text-sm text-gray-600">
                    {iatiImportStrings['option.merge.help']}
                  </p>
                </div>
              </div>
            </div>

            {/* Option 2: Import as Reporting Org (Super/Government only) */}
            {(userRole === USER_ROLES.SUPER_USER || userRole === 'admin' || 
              userRole === USER_ROLES.GOV_PARTNER_TIER_1 || userRole === USER_ROLES.GOV_PARTNER_TIER_2) && (
              <div className="bg-background border border-border rounded-lg p-6 space-y-4 hover:border-gray-300 transition-colors relative">
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="import_as_reporting_org" id="import_as_reporting_org" className="mt-1" />
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="import_as_reporting_org" className="text-base font-medium cursor-pointer flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {iatiImportStrings['option.reportingOrg.title']}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 rounded-full hover:bg-gray-100 focus:bg-gray-100"
                            type="button"
                            aria-label="Show examples"
                          >
                            <HelpCircle className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center" className="max-w-sm">
                          <p className="text-xs">
                            {iatiImportStrings['option.reportingOrg.tooltip']}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <p className="text-sm text-gray-600">
                      {iatiImportStrings['option.reportingOrg.help']}
                    </p>
                  </div>
                </div>
              </div>
            )}

          </RadioGroup>
        </div>

        {/* Footnote */}
        <div className="text-xs text-gray-500 p-3">
          <Info className="h-3 w-3 inline mr-1" />
          {iatiImportStrings.footnote}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
          >
            {iatiImportStrings['btn.cancel']}
          </Button>
          
          <Button
            onClick={handleContinue}
            disabled={isLoading || isParsing || !selectedOption || (selectedOption === 'merge' && !currentActivityId) || (selectedOption === 'import_as_reporting_org' && (!xmlContent || !userId))}
            className="text-white"
            style={{ backgroundColor: '#135667' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0f4552'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#135667'}
          >
            {isParsing ? 'Parsing...' : isLoading ? 'Importing...' : iatiImportStrings['btn.continue']}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Replace Duplicates Confirmation Dialog */}
    <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Replace Existing Activities?
          </DialogTitle>
          <DialogDescription>
            The following {duplicatesToReplace.length} activit{duplicatesToReplace.length === 1 ? 'y' : 'ies'} already exist in the database:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {duplicatesToReplace.map((duplicate, index) => (
            <Card key={index} className="p-4">
              <div className="space-y-1">
                <p className="font-medium text-sm">{duplicate.existingTitle}</p>
                <p className="text-xs font-mono text-muted-foreground">{duplicate.iatiIdentifier}</p>
              </div>
            </Card>
          ))}
        </div>

        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> Replacing will permanently delete the existing activit{duplicatesToReplace.length === 1 ? 'y' : 'ies'} and import new data from {reportingOrgRef}. This action cannot be undone.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleCancelReplace}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmReplace}
            disabled={isLoading}
            className="text-white"
            style={{ backgroundColor: '#135667' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0f4552'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#135667'}
          >
            {isLoading ? 'Replacing...' : `Replace ${duplicatesToReplace.length} Activiti${duplicatesToReplace.length === 1 ? 'y' : 'es'}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Field Selection Dialog - REMOVED: Now handled inline in IatiImportTab for consistency */}
    {/* All import options (fork, reference, merge, import_as_reporting_org) now use the same inline field selection UI */}
    </TooltipProvider>
  );
}