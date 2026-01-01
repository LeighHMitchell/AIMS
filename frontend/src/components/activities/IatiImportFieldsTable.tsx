import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronDown, ChevronRight, Copy, Check, ChevronUp, Calendar, DollarSign, Tag, FileText, ExternalLink, MapPin, Building2, Lock, Settings } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SafeHtml } from '@/components/ui/safe-html';
import { htmlToPlainText } from '@/lib/sanitize';
import { toast } from 'sonner';
import { getOrganizationRoleName } from '@/data/iati-organization-roles';

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
  itemType?: 'budget' | 'transaction' | 'plannedDisbursement' | 'countryBudgetItems' | 'result' | 'document';
  itemIndex?: number;
  itemData?: any;
  currentItemData?: any; // For storing current database values (e.g., current result object)
  isPolicyMarker?: boolean;
  policyMarkerData?: any;
  hasNonDacSectors?: boolean;
  nonDacSectors?: any[];
  needsRefinement?: boolean;
  importedSectors?: any[];
  isTagField?: boolean;
  tagData?: Array<{
    vocabulary?: string;
    vocabularyUri?: string;
    code?: string;
    narrative?: string;
  }>;
  existingTags?: any[];
  isConditionsField?: boolean;
  conditionsData?: any;
  isLocationItem?: boolean;
  locationData?: any;
  isRecipientCountryItem?: boolean;
  recipientCountryData?: {
    code: string;
    name: string;
    percentage?: number;
    narrative?: string;
  };
  isRecipientRegionItem?: boolean;
  recipientRegionData?: {
    code: string;
    name: string;
    percentage?: number;
    vocabulary?: string;
    vocabularyUri?: string;
    narrative?: string;
  };
  isFssItem?: boolean;
  fssData?: any;
  isCrsField?: boolean;
  crsData?: any;
  currentCrsData?: any;
  hasCrsSubComponents?: boolean; // Flag to indicate this field has sub-components
  crsSubComponents?: { [key: string]: boolean }; // Track which sub-components are selected
  isInherited?: boolean;
  inheritedFrom?: string;
  category?: string;
  documentData?: any[]; // Array of document objects
}

interface FieldSection {
  sectionName: string;
  fields: ParsedField[];
}

interface IatiImportFieldsTableProps {
  fields?: ParsedField[];
  sections?: FieldSection[];
  onFieldToggle: (field: ParsedField, checked: boolean) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  xmlContent?: string;
  reportingOrg?: { name?: string; ref?: string; acronym?: string };
  onSectorRefinement?: (importedSectors: any[]) => void;
}

type SortColumn = 'fieldName' | 'category' | 'fieldType' | 'iatiPath' | 'currentValue' | 'importValue' | 'conflict';
type SortDirection = 'asc' | 'desc';

export function IatiImportFieldsTable({ fields, sections, onFieldToggle, onSelectAll, onDeselectAll, xmlContent, reportingOrg, onSectorRefinement }: IatiImportFieldsTableProps) {
  // Use sections if provided, otherwise use fields (backward compatibility)
  const allFields = sections ? sections.flatMap(s => s.fields) : (fields || []);
  const hasSections = sections && sections.length > 0;
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('fieldName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [copiedValues, setCopiedValues] = useState<Set<string>>(new Set());
  const [expandedTexts, setExpandedTexts] = useState<Set<string>>(new Set());

  // Extract raw XML snippet for a given IATI path - preserves exact original formatting including comments
  const extractXmlSnippet = (iatiPath: string, index?: number): string | null => {
    if (!xmlContent) return null;

    try {
      // Special handling for bracket notation attribute paths (e.g., iati-activity[@hierarchy])
      const bracketAttributeMatch = iatiPath.match(/^([^[]+)\[@([^\]]+)\]$/);
      if (bracketAttributeMatch) {
        const parentElement = bracketAttributeMatch[1].replace('iati-activity/', '');
        const attributeName = bracketAttributeMatch[2];
        
        // Find the parent element with this attribute
        const parentPattern = new RegExp(
          `(<${parentElement}[^>]*>)`,
          'i'
        );
        
        const parentMatch = xmlContent.match(parentPattern);
        if (parentMatch) {
          // Extract the opening tag with the attribute
          const openingTag = parentMatch[1];
          // Check if the attribute exists in this tag
          const attributePattern = new RegExp(
            `${attributeName}="([^"]*)"`,
            'i'
          );
          const attrMatch = openingTag.match(attributePattern);
          
          if (attrMatch) {
            // Return just the opening tag showing the attribute
            return openingTag;
          }
        }
        return null;
      }

      // Special handling for attribute paths (e.g., iati-activity/@humanitarian)
      if (iatiPath.includes('/@') || iatiPath.startsWith('@')) {
        // Extract the attribute name and parent element
        const attributeMatch = iatiPath.match(/(?:iati-activity\/)?@([^\/]+)$/);
        if (attributeMatch) {
          const attributeName = attributeMatch[1];
          const parentElement = 'iati-activity';
          
          // Find the parent element with this attribute
          const parentPattern = new RegExp(
            `(<${parentElement}[^>]*>)`,
            'i'
          );
          
          const parentMatch = xmlContent.match(parentPattern);
          if (parentMatch) {
            // Extract the opening tag with the attribute
            const openingTag = parentMatch[1];
            // Check if the attribute exists in this tag
            const attributePattern = new RegExp(
              `${attributeName}="([^"]*)"`,
              'i'
            );
            const attrMatch = openingTag.match(attributePattern);
            
            if (attrMatch) {
              // Return just the opening tag showing the attribute
              return openingTag;
            }
          }
        }
        return null;
      }

      // Remove array indices from path for searching
      const cleanPath = iatiPath.replace('iati-activity/', '').replace(/\[\d+\]/g, '');
      const pathParts = cleanPath.split('/');
      let elementName = pathParts[pathParts.length - 1];

      // Special handling: if the path ends with 'narrative', we want the parent element instead
      // because narrative is just a child element and we want to show the whole parent structure
      // (e.g., for title/narrative, show the full <title> block; for description/narrative, show <description>)
      if (elementName === 'narrative' && pathParts.length > 1) {
        elementName = pathParts[pathParts.length - 2].replace(/\[@type="\d+"\]/, '');
      }

      // Remove any attribute selectors from element name (e.g., activity-date[@type="1"] -> activity-date)
      elementName = elementName.replace(/\[@[^\]]+\]/g, '');

      // Check if this is a description or activity-date field with type attribute
      // Match both bracket notation [@type="1"] and slash notation /@type="1"
      const typeMatch = iatiPath.match(/(?:\[@|@)type="(\d+)"/);
      const expectedType = typeMatch ? typeMatch[1] : null;

      // First, try to match individual elements without comments (more reliable for multiple elements)
      const elementPattern = new RegExp(
        `(<${elementName}[^>]*>.*?<\\/${elementName}>|<${elementName}[^>]*\\s*\\/>)`,
        'gs'
      );

      const elementMatches = Array.from(xmlContent.matchAll(elementPattern));

      if (elementMatches.length === 0) return null;

      // For description or activity-date elements with type attribute, find the one with matching type
      let elementMatch;
      if ((elementName === 'description' || elementName === 'activity-date') && expectedType) {
        for (const match of elementMatches) {
          const typeAttrMatch = match[0].match(/type="(\d+)"/);
          if (typeAttrMatch && typeAttrMatch[1] === expectedType) {
            elementMatch = match;
            break;
          }
        }
      } else {
        // Determine which match to use (based on index if multiple)
        const targetIndex = index !== undefined ? index : 0;
        elementMatch = elementMatches[targetIndex] || elementMatches[0];
      }

      if (!elementMatch) return null;

      let xmlString = elementMatch[0];

      // Extract just this element's content, trim leading/trailing whitespace but preserve internal formatting
      xmlString = xmlString.trim();

      // If it's a multi-line element, try to normalize indentation
      if (xmlString.includes('\n')) {
        const lines = xmlString.split('\n');
        // Find minimum indentation (excluding empty lines)
        const minIndent = Math.min(
          ...lines
            .filter(line => line.trim().length > 0)
            .map(line => line.match(/^\s*/)?.[0].length || 0)
        );
        // Remove that minimum indentation from all lines
        xmlString = lines
          .map(line => line.substring(minIndent))
          .join('\n')
          .trim();
      }

      return xmlString;
    } catch (error) {
      console.error('Error extracting XML snippet:', error);
      return null;
    }
  };

  // Derive field type from field properties
  const getFieldType = (field: ParsedField): string => {
    if (field.isFinancialItem) {
      return field.itemType || 'Financial';
    }
    if (field.isPolicyMarker) {
      return 'Policy Marker';
    }
    if (field.isTagField) {
      return 'Tag';
    }
    if (field.isConditionsField) {
      return 'Condition';
    }
    if (field.hasNonDacSectors) {
      return 'Sector (Non-DAC)';
    }
    return 'Standard';
  };

  // Get category (sub-category within consolidated tabs) from the tab field
  const getCategory = (field: ParsedField): string => {
    const categoryMap: Record<string, string> = {
      // Overview tab sub-categories
      'identifiers_ids': 'Identifiers',
      'dates': 'Dates',
      'descriptions': 'Descriptions',
      'other': 'General',
      'basic': 'General',
      'tags': 'Tags',
      'conditions': 'Conditions',
      
      // Partners tab sub-categories
      'reporting_org': 'Reporting Org',
      'participating_orgs': 'Participating Orgs',
      'partners': 'Partners',
      'contacts': 'Contacts',
      
      // Sectors tab sub-categories
      'sectors': 'Sectors',
      'locations': 'Locations',
      
      // Policy tab sub-categories
      'policy-markers': 'Policy Markers',
      'humanitarian': 'Humanitarian',
      
      // Finance tab sub-categories
      'budgets': 'Budgets',
      'transactions': 'Transactions',
      'planned_disbursements': 'Planned Disbursements',
      'planned-disbursements': 'Planned Disbursements',
      'country-budget': 'Budget Mapping',
      'finances': 'Defaults', // Put Defaults below General
      
      // Results tab
      'results': 'Results',
      
      // Docs tab
      'documents': 'Documents',
      
      // Links tab
      'linked_activities': 'Linked Activities'
    };
    return categoryMap[field.tab] || field.tab;
  };

  // Detect code patterns in plain text
  const detectCodePattern = (str: string): boolean => {
    // IATI identifier pattern: alphanumeric with dashes (e.g., XI-IA-12345)
    if (/^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+/.test(str)) return true;
    // Numeric codes (1-3 digits)
    if (/^\d{1,3}$/.test(str)) return true;
    // Uppercase codes (2-4 chars)
    if (/^[A-Z]{2,4}$/.test(str)) return true;
    return false;
  };

  // Format value for display - returns object with code and name parts if applicable
  const formatValue = (value: any, fieldName?: string): { code?: string; name?: string; text?: string; isCode?: boolean; isEmpty?: boolean; isObject?: boolean; objectData?: any; isPipeSeparated?: boolean } => {
    // For blank/null values, return empty (not "—") so they show as blank lines
    if (value === null || value === undefined || value === '') {
      return { text: '', isEmpty: true };
    }

    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return { text: `[${value.length} items]` };
      }
      // Handle financial item objects (budgets, transactions, planned disbursements) - show only currency and value
      // For transactions, value.value can be undefined/null/0/string, so check currency first and also check for amount property
      // Check for currency in multiple possible locations
      const currency = value.currency || value['@_currency'] || value.currencyCode;
      if (currency) {
        // Check for value or amount property (transactions may use either, and may be 0 or string which are valid)
        // First check if 'value' property exists (using 'in' operator handles 0 correctly)
        let amount: any = undefined;
        if ('value' in value) {
          amount = value.value;
        } else if ('amount' in value) {
          amount = value.amount;
        }
        
        // Handle string values (from XML parsing) - convert to number
        if (typeof amount === 'string' && amount.trim() !== '') {
          const parsed = parseFloat(amount);
          amount = isNaN(parsed) ? undefined : parsed;
        }
        
        // 0 is a valid value, so check if it's a number (including 0) or a valid non-empty string
        // Also allow 0 explicitly
        if (typeof amount === 'number' || (typeof amount === 'string' && amount.trim() !== '')) {
          // Has both currency and value (budgets, transactions with value)
          const formattedValue = typeof amount === 'number' ? amount.toLocaleString() : String(amount);
          return { text: `${currency} ${formattedValue}`, isCode: false };
        } else if (value.transaction_type !== undefined || value.transaction_date !== undefined || value.transaction_type_name !== undefined) {
          // Transaction object with currency but no value - show just currency
          return { text: currency, isCode: false };
        }
      }
      // Handle structured date objects (date + narratives)
      if (value.date) {
        return { text: value.date, isCode: false };
      }
      // Handle structured conditions objects
      if (value.conditions && Array.isArray(value.conditions)) {
        const conditionCount = value.conditions.length;
        const attached = value.attached ? 'Attached' : 'Not Attached';
        return { text: `${conditionCount} condition(s), ${attached}`, isCode: false };
      }
      if (value.code && value.name) {
        return { code: value.code, name: value.name, isCode: true };
      }
      // Return object data for special formatting
      return { isObject: true, objectData: value, text: JSON.stringify(value) };
    }
    
    const strValue = String(value);
    
    // Check if it's a pipe-separated string FIRST (e.g., "Original | Status: Indicative | Start: 2025-12-01")
    // This should be checked before other patterns to ensure proper detection
    const pipeSeparatedMatch = strValue.match(/\|/);
    if (pipeSeparatedMatch) {
      return { text: strValue, isPipeSeparated: true };
    }
    
    // Special handling for narrative language - extract just the language name (e.g., "en English" -> "English")
    if (fieldName && fieldName.includes('Narrative Language')) {
      // Trim the value first
      const trimmedValue = strValue.trim();
      
      // Match patterns like "EN en English" (uppercase code + lowercase code + name)
      const langCleanupMatch = trimmedValue.match(/^[A-Z]{2}\s+[a-z]{2}\s+(.+)$/i);
      if (langCleanupMatch) {
        const name = langCleanupMatch[1].trim();
        return { text: name.charAt(0).toUpperCase() + name.slice(1), isCode: false };
      }
      // Match patterns like "en English", "EN English", "fr French", etc. (2-char code (any case) followed by space and name)
      // Match: 2 letters, whitespace, then the rest
      const langMatch = trimmedValue.match(/^[a-zA-Z]{2}[\s]+(.+)$/);
      if (langMatch) {
        const name = langMatch[1].trim();
        if (name) {
          return { text: name.charAt(0).toUpperCase() + name.slice(1), isCode: false };
        }
      }
      // Fallback: if it contains "English", "French", etc. after a language code, extract it
      const fallbackMatch = trimmedValue.match(/^[a-zA-Z]{2}[\s]+([A-Z][a-zA-Z]+.*)$/);
      if (fallbackMatch) {
        const name = fallbackMatch[1].trim();
        return { text: name, isCode: false };
      }
    }
    
    // Check if it's in "code: name" format (e.g., "2: Implementation")
    // Only match if it's a single-line format (no pipes)
    // Skip IATI identifiers which may contain colons (e.g., "NL-KVK-27108436-A-06801-02:KH")
    const codeNameMatch = strValue.match(/^([^:]+):\s*(.+)$/);
    if (codeNameMatch && !strValue.includes('|') && fieldName !== 'IATI Identifier') {
      return { code: codeNameMatch[1].trim(), name: codeNameMatch[2].trim(), isCode: true };
    }
    
    // Check if it's a date (YYYY-MM-DD format) - don't treat dates as code
    const isDate = /^\d{4}-\d{2}-\d{2}$/.test(strValue);
    if (isDate) {
      return { text: strValue, isCode: false };
    }
    
    // Check if plain text looks like a code
    const isCode = detectCodePattern(strValue);
    
    return { text: strValue, isCode };
  };

  // Generate unique ID for value cell
  const getValueCellId = (rowId: string, column: 'current' | 'import') => {
    return `${rowId}-${column}`;
  };

  // Copy button component - removed per user request

  // Toggle text expansion
  const toggleTextExpansion = (cellId: string) => {
    setExpandedTexts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cellId)) {
        newSet.delete(cellId);
      } else {
        newSet.add(cellId);
      }
      return newSet;
    });
  };

  // Render expandable text - for descriptions, use ~1-2 lines (approximately 10-12 words), otherwise 100 chars
  const MAX_TEXT_LENGTH = 100;
  const MAX_DESCRIPTION_WORDS = 10;
  
  // Helper to get first N words from text
  const getFirstNWords = (text: string, n: number): string => {
    const words = text.trim().split(/\s+/);
    if (words.length <= n) return text;
    return words.slice(0, n).join(' ') + '...';
  };
  
  const renderExpandableText = (text: string, cellId: string, isDescription: boolean = false) => {
    const isExpanded = expandedTexts.has(cellId);

    if (isDescription) {
      // Convert HTML to plain text for word counting
      const plainText = htmlToPlainText(text);
      const words = plainText.trim().split(/\s+/);
      const shouldTruncate = words.length > MAX_DESCRIPTION_WORDS;

      if (!shouldTruncate) {
        // Short text - render as HTML
        return <SafeHtml html={text} className="whitespace-pre-wrap" as="span" />;
      }

      return (
        <span>
          {isExpanded ? (
            <>
              <SafeHtml html={text} as="span" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTextExpansion(cellId);
                }}
                className="ml-2 text-xs inline-flex items-center gap-1"
                style={{ color: '#135667' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#0f4552'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#135667'}
              >
                <ChevronUp className="h-3 w-3" />
                Show less
              </button>
            </>
          ) : (
            <>
              <span className="whitespace-pre-wrap">{getFirstNWords(plainText, MAX_DESCRIPTION_WORDS)}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTextExpansion(cellId);
                }}
                className="ml-2 text-xs inline-flex items-center gap-1"
                style={{ color: '#135667' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#0f4552'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#135667'}
              >
                <ChevronDown className="h-3 w-3" />
                Show more
              </button>
            </>
          )}
        </span>
      );
    }
    
    // For non-descriptions, use character count
    const shouldTruncate = text.length > MAX_TEXT_LENGTH;

    if (!shouldTruncate) {
      return <span>{text}</span>;
    }

    return (
      <span>
        {isExpanded ? (
          <>
            {text}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleTextExpansion(cellId);
              }}
              className="ml-2 text-xs flex items-center gap-1"
              style={{ color: '#135667' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#0f4552'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#135667'}
            >
              <ChevronUp className="h-3 w-3" />
              Show less
            </button>
          </>
        ) : (
          <>
            {text.substring(0, MAX_TEXT_LENGTH)}...
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleTextExpansion(cellId);
              }}
              className="ml-2 text-xs flex items-center gap-1"
              style={{ color: '#135667' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#0f4552'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#135667'}
            >
              <ChevronDown className="h-3 w-3" />
              Show more
            </button>
          </>
        )}
      </span>
    );
  };

  // Render formatted JSON object with styled codes
  const renderObjectValue = (obj: any, cellId: string) => {
    const entries = Object.entries(obj);
    
    return (
      <span className="group inline-flex items-center flex-wrap gap-1">
        {entries.map(([key, val], index) => {
          const valueStr = String(val);
          // Check if it's a date (YYYY-MM-DD format) - don't treat dates as code
          const isDate = /^\d{4}-\d{2}-\d{2}$/.test(valueStr);
          const isCodeValue = !isDate && (detectCodePattern(valueStr) || /^\d+$/.test(valueStr));
          
          return (
            <span key={index} className="inline-flex items-center gap-1">
              {index > 0 && <span className="text-gray-400">|</span>}
              <span className="text-xs text-gray-600">{key}:</span>
              {isDate ? (
                <span className="text-xs">{formatDateDisplay(valueStr)}</span>
              ) : isCodeValue ? (
                <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {valueStr}
                </code>
              ) : (
                <span className="text-xs">{valueStr}</span>
              )}
            </span>
          );
        })}
      </span>
    );
  };

  // Parse pipe-separated string into structured data
  const parsePipeSeparatedData = (text: string) => {
    const parts = text.split('|').map(p => p.trim()).filter(p => p);
    const data: Record<string, string> = {};
    let type: string | null = null;
    
    parts.forEach(part => {
      const colonIndex = part.indexOf(':');
      if (colonIndex > 0) {
        const key = part.substring(0, colonIndex).trim();
        const value = part.substring(colonIndex + 1).trim();
        data[key] = value;
      } else {
        // Plain text without colon (like "Original")
        type = part;
      }
    });
    
    return { type, data };
  };

  // Check if content is date-heavy (has Start, End, Value Date)
  const isDateHeavyContent = (text: string): boolean => {
    const dateKeywords = ['Start:', 'End:', 'Value Date:', 'Period Start:', 'Period End:'];
    return dateKeywords.some(keyword => text.includes(keyword));
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string): string => {
    // If it's already in YYYY-MM-DD format, format it nicely
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return dateStr;
  };

  // Render pipe-separated string in structured layout
  const renderPipeSeparatedValue = (text: string, cellId: string, fieldName?: string, field?: ParsedField) => {
    const fullText = text;
    const isDateHeavy = isDateHeavyContent(text);
    
    // If it's date-heavy, use a structured card layout
    if (isDateHeavy) {
      const { type, data } = parsePipeSeparatedData(text);
      
      return (
        <div className="group relative">
          <div className="bg-gray-50/50 rounded-md p-2 border border-gray-200 space-y-2">
            {/* Type badge */}
            {type && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3 text-gray-500" />
                <Badge variant="outline" className="text-xs">
                  {type}
                </Badge>
              </div>
            )}
            
            {/* Dates section */}
            {(data['Start'] || data['End'] || data['Period Start'] || data['Period End']) && (
              <div className="space-y-1">
                {(data['Start'] || data['Period Start']) && (
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3 w-3 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-600 font-medium">Start:</span>
                    <span className="text-sm text-gray-900">
                      {formatDateDisplay(data['Start'] || data['Period Start'] || '')}
                    </span>
                  </div>
                )}
                {(data['End'] || data['Period End']) && (
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3 w-3 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-600 font-medium">End:</span>
                    <span className="text-sm text-gray-900">
                      {formatDateDisplay(data['End'] || data['Period End'] || '')}
                    </span>
                  </div>
                )}
                {data['Value Date'] && (
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3 w-3 text-gray-500 flex-shrink-0" />
                    <span className="text-gray-600 font-medium">Value Date:</span>
                    <span className="text-sm text-gray-900">
                      {formatDateDisplay(data['Value Date'])}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Other fields */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {data['Status'] && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant="outline" className="text-xs">
                    {data['Status']}
                  </Badge>
                </div>
              )}
              {data['Amount'] && (
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-gray-500" />
                  <span className="text-gray-600">Amount:</span>
                  {(() => {
                    // Parse amount to show currency before value (e.g., "0 EUR" -> "EUR 0")
                    const amountStr = data['Amount'];
                    // Check if it matches pattern like "123 EUR" or "1,234.56 USD"
                    const currencyMatch = amountStr.match(/^([\d,.\s]+)\s+([A-Z]{3})$/);
                    if (currencyMatch) {
                      const value = currencyMatch[1].trim();
                      const currency = currencyMatch[2];
                      return (
                        <>
                          <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{currency}</code> {value}
                        </>
                      );
                    }
                    // If no currency pattern, display as-is
                    return (
                      <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {amountStr}
                      </code>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    // Fallback to 3-column layout for non-date content
    const parts = text.split('|').map(p => p.trim()).filter(p => p);
    const columns: string[][] = [[], [], []];
    
    // Distribute parts across 3 columns
    parts.forEach((part, index) => {
      columns[index % 3].push(part);
    });
    
    return (
      <div className="group relative">
        <div className="grid grid-cols-3 gap-6 text-xs">
          {columns.map((column, colIndex) => (
            <div key={colIndex} className="space-y-1.5">
              {column.map((part, partIndex) => {
                // Check if part has a colon (key: value format)
                const colonIndex = part.indexOf(':');
                if (colonIndex > 0) {
                  const key = part.substring(0, colonIndex).trim();
                  const value = part.substring(colonIndex + 1).trim();
                  // Check if it's a date (YYYY-MM-DD format)
                  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
                  // For dates, format nicely; otherwise check if it's a code pattern
                  const isCodeValue = !isDate && (detectCodePattern(value) || /^\d+/.test(value));
                  
                  return (
                    <div key={partIndex} className="flex items-start">
                      <span className="text-gray-600 font-medium min-w-[100px] flex-shrink-0 tabular-nums">{key}:</span>
                      <span className="ml-4 flex-1">
                        {isDate ? (
                          <span className="text-xs text-gray-900">{formatDateDisplay(value)}</span>
                        ) : isCodeValue ? (
                          <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {value}
                          </code>
                        ) : (
                          <span className="text-xs text-gray-900">{value}</span>
                        )}
                      </span>
                    </div>
                  );
                }
                
                // Plain text without colon
                const isCode = detectCodePattern(part);
                return (
                  <div key={partIndex} className="text-xs text-gray-900">
                    {isCode ? (
                      <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {part}
                      </code>
                    ) : (
                      <span>{part}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render formatted value with all enhancements
  const renderValue = (value: any, rowId: string, column: 'current' | 'import', fieldName?: string, field?: ParsedField) => {
    // Check if value is a React element and render it directly
    if (value && typeof value === 'object' && value.$$typeof === Symbol.for('react.element')) {
      return value;
    }

    // Special handling for date fields with structured format (date + narratives)
    const isDateField = fieldName && (
      fieldName === 'Planned Start Date' ||
      fieldName === 'Actual Start Date' ||
      fieldName === 'Planned End Date' ||
      fieldName === 'Actual End Date'
    );

    if (isDateField && typeof value === 'object' && value !== null && value.date) {
      const dateValue = value.date;
      const narratives = value.narratives || [];

      // Show date with narrative inline (if exists) in smaller gray font
      return (
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-gray-900">{formatDateDisplay(dateValue)}</span>
          {narratives.length > 0 && narratives[0].text && (
            <span className="text-xs text-gray-500">{narratives[0].text}</span>
          )}
        </div>
      );
    }

    // Special handling for Conditions field - show inline like dates
    if (fieldName === 'Conditions' && typeof value === 'object' && value !== null && value.conditions) {
      const conditions = value.conditions || [];

      return (
        <div className="space-y-1">
          {conditions.map((condition: any, idx: number) => {
            const typeLabel = condition.type === '1' ? 'Policy' :
                             condition.type === '2' ? 'Performance' :
                             condition.type === '3' ? 'Fiduciary' : 'Unknown';

            // Extract narrative text from JSONB object or string
            let narrativeText = 'No description';
            if (condition.narrative) {
              if (typeof condition.narrative === 'object') {
                // JSONB format: {"en": "text", "fr": "texte"}
                narrativeText = condition.narrative.en || condition.narrative[Object.keys(condition.narrative)[0]] || 'No description';
              } else if (typeof condition.narrative === 'string') {
                narrativeText = condition.narrative;
              }
            }

            return (
              <div key={idx} className="flex items-baseline gap-2">
                <span className="text-sm text-gray-900">{typeLabel}</span>
                <span className="text-xs text-gray-500">{narrativeText}</span>
              </div>
            );
          })}
        </div>
      );
    }

    // Special handling for Sectors field - show all sectors
    if (fieldName && fieldName.includes('Sectors')) {
      if (Array.isArray(value) && value.length > 0) {
        // Check if there are any 3-digit numeric DAC sector codes that could be mapped to subsectors
        const has3DigitDacCodes = value.some((sector: any) => {
          const code = sector.code || '';
          return code.length === 3 && /^\d{3}$/.test(code);
        });
        
        // Check if there are any numeric DAC sector codes (3 or 5 digit)
        const hasDacCodes = value.some((sector: any) => {
          const code = sector.code || '';
          return /^\d{3,5}$/.test(code);
        });
        
        return (
          <div className="flex flex-col gap-1.5">
            {value.map((sector: any, idx: number) => {
              const sectorCode = sector.code || '';
              const sectorName = sector.name || '';
              const percentage = sector.percentage !== undefined && sector.percentage !== null ? sector.percentage : '';
              
              return (
                <div key={idx} className="flex items-center gap-2 flex-wrap text-xs">
                  {sectorCode && (
                    <code className="font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {sectorCode}
                    </code>
                  )}
                  {sectorName && (
                    <span className="text-gray-900">{sectorName}</span>
                  )}
                  {percentage !== '' && (
                    <span className="text-gray-600">({percentage}%)</span>
                  )}
                </div>
              );
            })}
            {/* Map/Edit Subsectors button - always show in import column when there are DAC codes */}
            {column === 'import' && hasDacCodes && onSectorRefinement && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSectorRefinement(value)}
                className="mt-2 text-xs"
              >
                <Settings className="h-3 w-3 mr-1" />
                {has3DigitDacCodes ? 'Map to Subsectors' : 'Edit Sector Mapping'}
              </Button>
            )}
          </div>
        );
      }
    }
    
    // Special handling for Document Links field - show all documents
    if (fieldName && fieldName.includes('Document Links')) {
      if (Array.isArray(value) && value.length > 0) {
        return (
          <div className="flex flex-col gap-1.5">
            {value.map((doc: any, idx: number) => {
              const docTitle = doc.title || doc.title?.[0]?.text || 'Untitled';
              
              return (
                <div key={idx} className="text-xs text-gray-900">
                  {docTitle}
                </div>
              );
            })}
          </div>
        );
      }
    }

    // Special handling for individual Document Link fields
    // Collapsed view: just show the title
    if (fieldName && (fieldName === 'Document Link' || fieldName.match(/^Document Link \d+$/))) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const docTitle = value.title || 'Untitled';
        
        if (!docTitle || docTitle === 'Untitled') {
          return <span className="text-gray-400 italic">—</span>;
        }
        
        return (
          <span className="text-sm text-gray-900">{docTitle}</span>
        );
      }
    }
    
    // Special handling for Recipient Countries field - show only country names
    if (fieldName && fieldName.includes('Recipient Countries')) {
      if (Array.isArray(value) && value.length > 0) {
        const countryNames = value
          .map((item: any) => item.name || item.narrative || item.code || '')
          .filter((name: string) => name)
          .join(', ');
        
        if (!countryNames) {
          return <span className="text-gray-400 italic">—</span>;
        }
        
        return <span className="text-sm text-gray-900">{countryNames}</span>;
      }
    }

    // Special handling for Forward Spend (FSS) field - show forecasts in collapsed view
    if (field?.isFssItem || fieldName === 'Forward Spend') {
      if (column === 'import' && field?.fssData?.forecasts && field.fssData.forecasts.length > 0) {
        return (
          <div className="flex flex-col gap-1">
            {field.fssData.forecasts.map((f: any, idx: number) => (
              <span key={idx} className="text-sm text-gray-900">
                {f.year} · <span className="text-xs text-muted-foreground">{f.currency}</span> {f.value?.toLocaleString()}
              </span>
            ))}
          </div>
        );
      }
      if (column === 'current' && typeof value === 'object' && value !== null && value.forecasts && value.forecasts.length > 0) {
        return (
          <div className="flex flex-col gap-1">
            {value.forecasts.map((f: any, idx: number) => (
              <span key={idx} className="text-sm text-gray-900">
                {f.year} · <span className="text-xs text-muted-foreground">{f.currency}</span> {f.value?.toLocaleString()}
              </span>
            ))}
          </div>
        );
      }
    }
    
    // Special handling for Reporting Org fields - show simplified view (only name and ref)
    if ((fieldName && fieldName.includes('Reporting Organization')) || field?.tab === 'reporting_org') {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // In summary view, show only: organization name and ref (ID)
        const orgName = value.name || value.narrative || '';
        const orgRef = value.ref || value.validated_ref || value.original_ref || '';
        
        if (!orgName && !orgRef) {
          return <span className="text-gray-400 italic">—</span>;
        }
        
        return (
          <div className="flex flex-col gap-1 text-xs">
            {orgName && (
              <div className="text-gray-900 font-medium">{orgName}</div>
            )}
            {orgRef && (
              <code className="inline-block text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded w-fit">
                {orgRef}
              </code>
            )}
          </div>
        );
      }
    }
    
    // Special handling for Participating Org fields - show simplified view in summary
    if ((fieldName && fieldName.includes('Participating Organization')) || field?.tab === 'participating_orgs') {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // In summary view, show only: organization name, ref (registration/ID), and role on same line
        const orgName = value.name || value.narrative || '';
        const orgRef = value.ref || value.validated_ref || value.original_ref || '';
        const roleCode = value.role || '';
        const roleLabel = roleCode ? getOrganizationRoleName(roleCode) : '';
        
        if (!orgName && !orgRef && !roleLabel) {
          return <span className="text-gray-400 italic">—</span>;
        }
        
        const parts = [];
        if (orgName) parts.push({ type: 'name', content: orgName });
        if (orgRef) parts.push({ type: 'ref', content: orgRef });
        if (roleLabel) parts.push({ type: 'role', content: roleLabel });
        
        return (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {parts.map((part, index) => (
              <React.Fragment key={index}>
                {index > 0 && <span className="text-gray-400">•</span>}
                {part.type === 'ref' ? (
                  <code className="inline-block text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded w-fit">
                    {part.content}
                  </code>
                ) : (
                  <span className={part.type === 'name' ? 'text-gray-900 font-medium' : 'text-gray-600'}>
                    {part.content}
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        );
      }
    }
    
    // Special handling for Related Activity fields - show simplified view in summary
    if ((fieldName && fieldName.includes('Related Activity')) || field?.tab === 'linked_activities') {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // In summary view, show only: relationshipTypeLabel and ref (ID)
        const relationshipType = value.relationshipTypeLabel || '';
        const ref = value.ref || '';

        if (!relationshipType && !ref) {
          return <span className="text-gray-400 italic">—</span>;
        }

        return (
          <span className="text-sm">
            {relationshipType && <span className="text-gray-900">{relationshipType}</span>}
            {relationshipType && ref && <span className="mx-2 text-gray-400">•</span>}
            {ref && (
              <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {ref}
              </code>
            )}
          </span>
        );
      }
    }

    // Special handling for Policy Marker fields - show vocabulary, code, and significance with names in collapsed view
    if (field?.isPolicyMarker && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const vocabularyCode = value.vocabulary || '';
      const code = value.code || '';
      const significance = value.significance || '';

      // Helper function to get vocabulary name
      const getVocabularyName = (vocabCode: string): string => {
        const vocabularyNames: Record<string, string> = {
          '1': 'OECD DAC CRS',
          '99': 'Reporting Organisation'
        };
        return vocabularyNames[vocabCode] || vocabCode;
      };

      // Helper function to get policy marker name
      const getPolicyMarkerName = (markerCode: string): string => {
        const policyMarkerNames: Record<string, string> = {
          '1': 'Gender Equality',
          '2': 'Aid to Environment',
          '3': 'Participatory Development/Good Governance',
          '4': 'Trade Development',
          '5': 'Aid Targeting the Objectives of the Convention on Biological Diversity',
          '6': 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Mitigation',
          '7': 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Adaptation',
          '8': 'Aid Targeting the Objectives of the Convention to Combat Desertification',
          '9': 'Reproductive, Maternal, Newborn and Child Health (RMNCH)',
          '10': 'Disaster Risk Reduction (DRR)',
          '11': 'Disability',
          '12': 'Nutrition'
        };
        return policyMarkerNames[markerCode] || 'Unknown Policy Marker';
      };

      // Helper function to get significance name
      const getSignificanceName = (sigCode: string): string => {
        const significanceNames: Record<string, string> = {
          '0': 'Not targeted',
          '1': 'Significant objective',
          '2': 'Principal objective',
          '3': 'Principal objective AND in support of an action programme',
          '4': 'Explicit primary objective'
        };
        return significanceNames[sigCode] || sigCode;
      };

      if (!code && !vocabularyCode) {
        return <span className="text-gray-400 italic">—</span>;
      }

      return (
        <div className="flex flex-col gap-0.5 text-sm">
          {/* Vocabulary not shown in collapsed view - only in expanded view */}
          {code && (
            <div className="flex items-start gap-2">
              <code className="font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0">
                {code}
              </code>
              <span className="text-gray-900">{getPolicyMarkerName(code)}</span>
            </div>
          )}
          {significance && (
            <div className="flex items-start gap-2">
              <code className="font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0">
                {significance}
              </code>
              <span className="text-gray-700">{getSignificanceName(significance)}</span>
            </div>
          )}
        </div>
      );
    }

    // Special handling for Contact fields - show simplified view in summary
    if ((fieldName && fieldName.includes('Contact')) || field?.tab === 'contacts') {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // In summary view, show only: Person Name and Organization (no labels)
        const parts: string[] = [];
        
        if (value.personName) {
          parts.push(value.personName);
        }
        if (value.organization) {
          parts.push(value.organization);
        }
        
        if (parts.length === 0) {
          return <span className="text-gray-400 italic">—</span>;
        }
        
        return (
          <span className="text-xs text-gray-900">
            {parts.join(' • ')}
          </span>
        );
      }
    }
    
    // Special handling for Location fields - show badge format in collapsed view
    if (field?.isLocationItem && field.locationData) {
      // For import column, use locationData; for current column, use the value object
      const locData = column === 'import' ? field.locationData : value;
      
      if (!locData || typeof locData !== 'object') {
        return <span className="text-gray-400 italic">—</span>;
      }
      
      const locationCode = locData.country_code || locData.ref || locData.location_ref || '';
      const locationName = locData.name || locData.location_name || 'Unnamed Location';
      const lat = locData.latitude;
      const lon = locData.longitude;
      const coordinates = lat && lon ? `${lat} ${lon}` : '';
      
      return (
        <div className="flex flex-wrap items-center gap-2">
          {locationCode && (
            <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {locationCode}
            </span>
          )}
          <span className="text-sm font-medium text-gray-900">
            {locationName}
          </span>
          {coordinates && (
            <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {coordinates}
            </span>
          )}
        </div>
      );
    }
    
    // Special handling for Humanitarian Scope fields - show only narrative title in summary
    if (fieldName && fieldName.startsWith('Humanitarian Scope') && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Extract narrative text from the scope
      const narratives = value.narratives || [];
      const narrativeText = narratives.length > 0 
        ? narratives.map((n: any) => n.text || n.narrative || '').filter(Boolean).join('; ')
        : value.code || '';
      
      if (!narrativeText) {
        return <span className="text-gray-400 italic">—</span>;
      }
      
      return <span className="text-sm text-gray-900">{narrativeText}</span>;
    }
    
    // Special handling for Tags field - render as badges
    if (field?.isTagField && (field.tagData || field.existingTags)) {
      const importTags = field.tagData || [];
      const existingTagsAll = field.existingTags || [];
      
      // For current column, only show tags that match import tags (by vocabulary + code)
      let tags: any[];
      if (column === 'import') {
        tags = importTags;
      } else {
        // Filter existing tags to only show ones matching import tags
        tags = importTags.map((importTag: any) => {
          return existingTagsAll.find((existingTag: any) => 
            String(existingTag.vocabulary) === String(importTag.vocabulary) &&
            String(existingTag.code) === String(importTag.code)
          );
        }).filter(Boolean);
      }

      // Helper to get badge color variant based on vocabulary or code
      // All tags use shades of IATI color #135667
      const getTagBadgeColor = (tag: any, index: number) => {
        const vocab = String(tag.vocabulary || '');
        const code = String(tag.code || '');

        // IATI color shades palette based on #135667
        const iatiShades = [
          'bg-[#e6f0f2] text-[#0f4552] border-[#99c3cb]',
          'bg-[#cce1e5] text-[#0f4552] border-[#66a5b1]',
          'bg-[#b3d2d8] text-[#0b3440] border-[#66a5b1]',
          'bg-[#99c3cb] text-[#0b3440] border-[#135667]',
          'bg-[#80b4be] text-white border-[#135667]',
          'bg-[#66a5b1] text-white border-[#0f4552]',
          'bg-[#4d96a4] text-white border-[#0f4552]',
          'bg-[#338797] text-white border-[#0b3440]',
          'bg-[#1a788a] text-white border-[#0b3440]',
          'bg-[#135667] text-white border-[#0f4552]',
          'bg-[#0f4552] text-white border-[#0b3440]',
          'bg-[#0b3440] text-white border-[#071f26]',
          'bg-[#e6f0f2] text-[#135667] border-[#99c3cb]',
          'bg-[#cce1e5] text-[#135667] border-[#66a5b1]'
        ];

        // Color based on hash of code for consistency
        if (code) {
          const hash = code.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
          return iatiShades[hash % iatiShades.length];
        }

        // Fallback based on index
        return iatiShades[index % iatiShades.length];
      };

      if (tags.length === 0) {
        return <span className="text-gray-400 italic">—</span>;
      }

      return (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag: any, idx: number) => (
            <Badge
              key={idx}
              variant="outline"
              className={`${getTagBadgeColor(tag, idx)} border px-2 py-0.5 rounded-md text-xs font-medium`}
            >
              {column === 'import' ? (tag.narrative || 'Unnamed tag') : (tag.name || tag.narrative || 'Unnamed tag')}
            </Badge>
          ))}
        </div>
      );
    }

    // Special handling for Country Budget Items - show vocabulary label, code, and percentage
    // Works for both import and current value columns with consistent formatting
    if (field?.itemType === 'countryBudgetItems') {
      // For import column, use itemData; for current column, use currentValue
      let itemData: any = null;
      let budgetItem: any = null;
      
      if (column === 'import' && field?.itemData) {
        itemData = field.itemData;
        budgetItem = itemData.budget_items?.[0];
      } else if (column === 'current' && field?.currentValue && typeof field.currentValue === 'object' && field.currentValue.budget_items) {
        itemData = field.currentValue;
        budgetItem = itemData.budget_items?.[0];
      }

      if (!budgetItem) {
        return <span className="text-gray-400 italic">—</span>;
      }

      // Get vocabulary label
      const vocabLabel = itemData.vocabularyLabel || 
                        (itemData.vocabulary === '1' ? 'IATI' :
                        itemData.vocabulary === '2' ? 'COFOG' :
                        itemData.vocabulary === '3' ? 'COFOG (2014)' :
                        itemData.vocabulary === '4' ? 'COFOG' :
                        itemData.vocabulary === '5' ? 'Other' :
                        itemData.vocabulary === '99' ? 'Reporting Organisation' : '');

      return (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">{vocabLabel}</span>
          <code className="font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {budgetItem.code}
          </code>
          {budgetItem.percentage !== undefined && (
            <span className="text-gray-900">{budgetItem.percentage}%</span>
          )}
        </div>
      );
    }

    const formatted = formatValue(value, fieldName);
    const cellId = getValueCellId(rowId, column);
    
    // Empty state - show blank (not "Empty") for blank fields
    if (formatted.isEmpty) {
      return <span className="text-gray-400 italic">—</span>;
    }
    
    // Special handling for Other Identifier fields - show just the identifier code
    if (fieldName && fieldName.startsWith('Other Identifier') && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const identifierCode = value.code || '';
      if (identifierCode) {
        return (
          <span className="text-sm">
            <code className="text-sm font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {identifierCode}
            </code>
          </span>
        );
      }
    }
    
    // JSON object with formatted codes
    if (formatted.isObject && formatted.objectData) {
      return renderObjectValue(formatted.objectData, cellId);
    }
    
    // Code with name
    if (formatted.code && formatted.name) {
      // Check if this is a description field
      const isActivityDescription = fieldName === 'Activity Description' ||
                                   fieldName === 'Activity Description - Objectives' ||
                                   fieldName === 'Activity Description - Target Groups' ||
                                   fieldName === 'Activity Description - Other' ||
                                   fieldName === 'Description';

      // For descriptions, apply 75-word limit with "Show more"
      // Ensure nameText is a string (it might be an object in some cases)
      const nameText = typeof formatted.name === 'string' ? formatted.name : String(formatted.name);
      const words = nameText.trim().split(/\s+/);
      const needsTruncation = isActivityDescription && words.length > MAX_DESCRIPTION_WORDS;

      return (
        <span>
          {needsTruncation ? renderExpandableText(nameText, cellId, true) : nameText}
        </span>
      );
    }
    
    // Special handling for transaction objects - show only currency and amount
    const isTransactionField = field?.itemType === 'transaction' || (fieldName && fieldName.includes('Transaction'));
    // Also check if object has transaction-like properties (transaction_type, transaction_date, etc.)
    const looksLikeTransaction = typeof value === 'object' && value !== null && !Array.isArray(value) && 
      (value.transaction_type !== undefined || value.transaction_date !== undefined || value.transaction_type_name !== undefined);
    
    if ((isTransactionField || looksLikeTransaction) && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // For transactions, show only currency and amount (no other fields)
      // Check for various possible property names
      const currency = value.currency;
      const amount = value.value !== undefined ? value.value : (value.amount !== undefined ? value.amount : undefined);
      
      // Always show something for transaction objects, even if values are missing
      return (
        <span className="text-sm">
          {currency && (
            <span className="text-xs text-muted-foreground">{currency}</span>
          )}
          {amount !== undefined && (
            <span className={currency ? "ml-2" : ""}>{typeof amount === 'number' ? amount.toLocaleString() : amount}</span>
          )}
          {!currency && amount === undefined && (
            <span className="text-gray-400 italic">—</span>
          )}
        </span>
      );
    }
    
    // Special handling for financial items when currentValue is an object (budgets, planned disbursements)
    const isFinancialItem = (field?.isFinancialItem) || (fieldName && (
      fieldName.includes('Budget') || 
      fieldName.includes('Transaction') || 
      fieldName.includes('Planned Disbursement')
    ));
    
    // Special handling for financial items when importValue is an object (budgets, planned disbursements)
    if (isFinancialItem && typeof value === 'object' && value !== null && !Array.isArray(value) && column === 'import') {
      // For importValue objects (budgets, planned disbursements), show currency and value
      if (value.value !== undefined && value.currency) {
        return (
          <span className="text-sm">
            <span className="text-xs text-muted-foreground">{value.currency}</span>
            <span className="ml-2">{value.value?.toLocaleString()}</span>
          </span>
        );
      }
    }
    
    if (isFinancialItem && typeof value === 'object' && value !== null && !Array.isArray(value) && column === 'current') {
      // For currentValue objects (budgets, planned disbursements, transactions), show currency and value
      const currency = value.currency || value['@_currency'] || value.currencyCode;
      if (currency) {
        // Check for value or amount property (transactions may use either, and may be 0 which is valid)
        // First check if 'value' property exists (using 'in' operator handles 0 correctly)
        let amount: any = undefined;
        if ('value' in value) {
          amount = value.value;
        } else if ('amount' in value) {
          amount = value.amount;
        }
        
        // Handle string values (from XML parsing) - convert to number
        if (typeof amount === 'string' && amount.trim() !== '') {
          const parsed = parseFloat(amount);
          amount = isNaN(parsed) ? undefined : parsed;
        }
        
        // 0 is a valid value, so check if it's a number (including 0) or a valid non-empty string
        if (typeof amount === 'number' || (typeof amount === 'string' && amount.trim() !== '')) {
          // Has both currency and value
          const formattedValue = typeof amount === 'number' ? amount.toLocaleString() : String(amount);
          return (
            <span className="text-sm">
              <span className="text-xs text-muted-foreground">{currency}</span>
              <span className="ml-2">{formattedValue}</span>
            </span>
          );
        } else if (value.transaction_type !== undefined || value.transaction_date !== undefined || value.transaction_type_name !== undefined) {
          // Transaction object with currency but no value - show just currency
          return (
            <span className="text-sm">
              <span className="text-xs text-muted-foreground">{currency}</span>
            </span>
          );
        }
      }
    }
    
    // Plain text - check if it's code-like or pipe-separated
    if (formatted.text) {
      const text = formatted.text;
      const isCode = formatted.isCode || false;
      const isPipeSeparated = formatted.isPipeSeparated || false;
      
      // Check if text matches currency + value pattern (e.g., "EUR 3,000") - do this early for financial items
      if (isFinancialItem && typeof text === 'string' && text.trim()) {
        const currencyMatch = text.match(/^([A-Z]{3})\s+([\d,.\s]+)$/);
        if (currencyMatch) {
          const currency = currencyMatch[1];
          const value = currencyMatch[2].trim();
          return (
            <span className="text-sm">
              <span className="text-xs text-muted-foreground">{currency}</span>
              <span className="ml-2">{value}</span>
            </span>
          );
        }
      }
      
      // Handle pipe-separated strings in 3-column layout
      // For financial items (Budgets, Transactions, Planned Disbursements) in import column, always use 3-column layout
      
      // Check if text contains pipes (as fallback detection)
      const hasPipes = text.includes('|');
      
      // For financial items in summary view, show only currency and value
      if (isFinancialItem && hasPipes) {
        const { data } = parsePipeSeparatedData(text);
        
        // For transactions, show only currency and amount (no type)
        if (fieldName && fieldName.includes('Transaction') && data['Amount']) {
            // Parse amount to show currency before value (e.g., "0 EUR" -> "EUR 0")
            const amountStr = data['Amount'];
            const currencyMatch = amountStr.match(/^([\d,.\s]+)\s+([A-Z]{3})$/);
            if (currencyMatch) {
              const value = currencyMatch[1].trim();
              const currency = currencyMatch[2];
              return (
                <span className="text-sm text-gray-900">
                  <span className="text-xs text-muted-foreground">{currency}</span> {value}
                </span>
              );
            }
            // If no currency pattern, display as-is
            return (
              <span className="text-sm text-gray-900">
                <span className="text-gray-600">{amountStr}</span>
              </span>
          );
        }
        
        // For other financial items (budgets, planned disbursements), show only currency and value
        if (data['Amount']) {
          // Parse amount to show currency before value (e.g., "0 EUR" -> "EUR 0")
          const amountStr = data['Amount'];
          const currencyMatch = amountStr.match(/^([\d,.\s]+)\s+([A-Z]{3})$/);
          if (currencyMatch) {
            const value = currencyMatch[1].trim();
            const currency = currencyMatch[2];
            return (
              <span className="text-sm">
                <span className="text-xs text-muted-foreground">{currency}</span>
                <span className="ml-2">{value}</span>
              </span>
            );
          }
          // If no currency pattern, display as-is
          return <span className="text-sm">{amountStr}</span>;
        }
      }
      
      if (isPipeSeparated || hasPipes || (isFinancialItem && column === 'import')) {
        return renderPipeSeparatedValue(text, cellId, fieldName, field);
      }
      
      // Check if this is a date field by name OR if the text itself is a date (YYYY-MM-DD format)
      const isDateField = fieldName === 'Actual Start Date' || 
                         fieldName === 'Planned Start Date' || 
                         fieldName === 'Planned End Date' ||
                         fieldName === 'Actual End Date';
      const isDateText = /^\d{4}-\d{2}-\d{2}$/.test(text);
      
      // For date fields or date text, don't treat as code - format normally
      if (isDateField || isDateText) {
        // Format the date nicely
        const formattedDate = formatDateDisplay(text);
        return <span className="text-sm">{formattedDate}</span>;
      }
      
      if (isCode) {
        // Check if this is a currency code (3 uppercase letters) and field name contains "Currency"
        const isCurrencyCode = /^[A-Z]{3}$/.test(text) && fieldName && (
          fieldName.includes('Currency') || fieldName.includes('currency')
        );
        
        if (isCurrencyCode) {
          // Style currency like in budget card - gray text, no code tag
          return (
            <span className="text-xs text-muted-foreground">{text}</span>
          );
        }
        
        return (
          <span className="group inline-flex items-center">
            <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {text}
            </code>
          </span>
        );
      }
      
      // Check if this is Activity Description - both current and import should show 75 words
      const isActivityDescription = fieldName === 'Activity Description' || 
                                   fieldName === 'Activity Description - Objectives' ||
                                   fieldName === 'Activity Description - Target Groups' ||
                                   fieldName === 'Activity Description - Other' ||
                                   fieldName === 'Description';
      
      // Check if this is Activity Title - always show full, no truncation
      const isActivityTitle = fieldName === 'Activity Title';
      
      // For Activity Title, always show full text
      if (isActivityTitle) {
        return <span>{text}</span>;
      }
      
      // For Activity Description (both current and import), show 75 words
      // Only apply 75 word limit to description fields, not all import values
      const isDescription = isActivityDescription;
      
      // For descriptions, convert to plain text for accurate word counting
      const plainText = isDescription ? htmlToPlainText(text) : text;
      const words = plainText.trim().split(/\s+/);
      const isLongText = isDescription ? words.length > MAX_DESCRIPTION_WORDS : text.length > MAX_TEXT_LENGTH;
      const textContent = renderExpandableText(text, cellId, isDescription);
      
      if (isLongText) {
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help">
                  {textContent}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-md">
                <p className="break-words whitespace-pre-wrap">{plainText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }

      return <span className={isDescription ? '' : ''}>{textContent}</span>;
    }
    
    // Check if text matches currency + value pattern (e.g., "EUR 3,000")
    const text = formatted.text || '';
    if (text && typeof text === 'string') {
      const currencyMatch = text.match(/^([A-Z]{3})\s+([\d,.\s]+)$/);
      if (currencyMatch) {
        const currency = currencyMatch[1];
        const value = currencyMatch[2].trim();
        return (
          <span className="text-sm">
            <span className="text-xs text-muted-foreground">{currency}</span>
            <span className="ml-2">{value}</span>
          </span>
        );
      }
      
      // Check if text is a standalone currency code (3 uppercase letters)
      if (/^[A-Z]{3}$/.test(text)) {
        return (
          <span className="text-sm">
            <span className="text-xs text-muted-foreground">{text}</span>
          </span>
        );
      }
    }
    
    return <span>{formatted.text || '—'}</span>;
  };

  // Filter fields based on search query and conflict filter
  const filteredFields = useMemo(() => {
    let result = allFields;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(field => 
        field.fieldName.toLowerCase().includes(query) ||
        field.iatiPath.toLowerCase().includes(query) ||
        (field.description && field.description.toLowerCase().includes(query)) ||
        getCategory(field).toLowerCase().includes(query)
      );
    }

    // Apply conflict filter
    if (showConflictsOnly) {
      result = result.filter(field => field.hasConflict && field.selected);
    }

    // Apply missing current value filter
    if (showMissingOnly) {
      result = result.filter(field => {
        // Check if current value is null, undefined, empty string, or empty array
        const isEmpty = field.currentValue === null ||
                       field.currentValue === undefined ||
                       field.currentValue === '' ||
                       (Array.isArray(field.currentValue) && field.currentValue.length === 0);
        return isEmpty && field.selected;
      });
    }

    return result;
  }, [allFields, searchQuery, showConflictsOnly, showMissingOnly]);

  // Helper function to check if current and import values match
  const valuesMatch = (field: ParsedField): boolean => {
    const { currentValue, importValue } = field;

    // Special handling for Tags field
    if (field.isTagField) {
      const importTags = field.tagData || [];
      const existingTags = field.existingTags || [];
      
      // No import tags = no match
      if (importTags.length === 0) return false;
      
      // Check if ALL import tags have a matching existing tag (by vocabulary + code)
      const allTagsMatch = importTags.every((importTag: any) => {
        const matchingExisting = existingTags.find((existingTag: any) => 
          String(existingTag.vocabulary) === String(importTag.vocabulary) &&
          String(existingTag.code) === String(importTag.code)
        );
        return !!matchingExisting;
      });
      
      return allTagsMatch;
    }

    // Special handling for CRS fields - compare summary strings
    if (field.isCrsField) {
      // If current value doesn't exist, it's not a match
      if (!currentValue) return false;
      
      // If import value doesn't exist, it's not a match
      if (!importValue) return false;
      
      // Compare the summary strings directly
      return String(currentValue).trim() === String(importValue).trim();
    }

    // Special handling for Humanitarian Scope fields - compare by code, type, and vocabulary
    if (field.fieldName?.startsWith('Humanitarian Scope') && 
        typeof currentValue === 'object' && currentValue !== null &&
        typeof importValue === 'object' && importValue !== null) {
      // Compare using normalized strings to handle type differences and whitespace
      const codeMatch = String(currentValue.code || '').trim() === String(importValue.code || '').trim();
      const typeMatch = String(currentValue.type || '1').trim() === String(importValue.type || '1').trim();
      const vocabMatch = String(currentValue.vocabulary || '1-2').trim() === String(importValue.vocabulary || '1-2').trim();
      
      return codeMatch && typeMatch && vocabMatch;
    }

    // Special handling for individual Location items
    if (field.isLocationItem && field.locationData) {
      // If no current value, it's not a match
      if (!currentValue || typeof currentValue !== 'object') return false;
      
      // Compare using the locationData
      const importData = field.locationData;
      
      // Primary match: coordinates (most reliable)
      const currentLat = parseFloat(currentValue.latitude);
      const currentLon = parseFloat(currentValue.longitude);
      const importLat = parseFloat(importData.latitude);
      const importLon = parseFloat(importData.longitude);
      
      if (!isNaN(currentLat) && !isNaN(currentLon) && !isNaN(importLat) && !isNaN(importLon)) {
        // Allow small floating-point tolerance
        const coordsMatch = Math.abs(currentLat - importLat) < 0.0001 && 
                            Math.abs(currentLon - importLon) < 0.0001;
        if (coordsMatch) return true;
      }
      
      // Fallback: ref match only (don't require name match as well)
      const currentRef = String(currentValue.country_code || currentValue.ref || currentValue.location_ref || '').trim();
      const importRef = String(importData.country_code || importData.ref || '').trim();
      return currentRef !== '' && currentRef === importRef;
    }

    // Special handling for individual Recipient Country items
    if (field.isRecipientCountryItem && field.recipientCountryData) {
      // If no current value, it's not a match
      if (!currentValue || typeof currentValue !== 'object') return false;
      
      // Compare using the recipientCountryData
      const importData = field.recipientCountryData;
      const codeMatch = String(currentValue.code || '').trim() === String(importData.code || '').trim();
      const percentageMatch = Math.abs((currentValue.percentage || 0) - (importData.percentage || 0)) < 0.01;
      
      return codeMatch && percentageMatch;
    }

    // Special handling for individual Recipient Region items
    if (field.isRecipientRegionItem && field.recipientRegionData) {
      // If no current value, it's not a match
      if (!currentValue || typeof currentValue !== 'object') return false;
      
      // Compare using the recipientRegionData
      const importData = field.recipientRegionData;
      const codeMatch = String(currentValue.code || '').trim() === String(importData.code || '').trim();
      const vocabMatch = String(currentValue.vocabulary || '1').trim() === String(importData.vocabulary || '1').trim();
      const percentageMatch = Math.abs((currentValue.percentage || 0) - (importData.percentage || 0)) < 0.01;
      
      return codeMatch && vocabMatch && percentageMatch;
    }

    // Special handling for FSS (Forward Spending Survey) fields
    if (field.isFssItem) {
      // If no current FSS data, it's not a match
      if (!currentValue || typeof currentValue !== 'object') return false;
      
      // Get the import FSS data from field.fssData
      const importFss = field.fssData;
      if (!importFss) return false;
      
      // Compare FSS attributes
      const extractionMatch = String(currentValue.extractionDate || '').trim() === String(importFss.extractionDate || '').trim();
      const priorityMatch = String(currentValue.priority || '') === String(importFss.priority || '');
      const phaseoutMatch = String(currentValue.phaseoutYear || '') === String(importFss.phaseoutYear || '');
      
      // Compare forecasts
      const currentForecasts = currentValue.forecasts || [];
      const importForecasts = importFss.forecasts || [];
      
      if (currentForecasts.length !== importForecasts.length) return false;
      
      // Sort forecasts by year for comparison
      const sortByYear = (a: any, b: any) => String(a.year || '').localeCompare(String(b.year || ''));
      const sortedCurrentForecasts = [...currentForecasts].sort(sortByYear);
      const sortedImportForecasts = [...importForecasts].sort(sortByYear);
      
      const forecastsMatch = sortedCurrentForecasts.every((current: any, idx: number) => {
        const imp = sortedImportForecasts[idx];
        const yearMatch = String(current.year || '') === String(imp.year || '');
        const valueMatch = Math.abs(Number(current.value || 0) - Number(imp.value || 0)) < 0.01;
        const currencyMatch = String(current.currency || '').toUpperCase() === String(imp.currency || '').toUpperCase();
        const valueDateMatch = String(current.valueDate || '').trim() === String(imp.valueDate || '').trim();
        return yearMatch && valueMatch && currencyMatch && valueDateMatch;
      });
      
      return extractionMatch && priorityMatch && phaseoutMatch && forecastsMatch;
    }

    // If current value doesn't exist, it's not a match
    if (!currentValue && currentValue !== 0) return false;

    // If import value doesn't exist, it's not a match
    if (!importValue && importValue !== 0) return false;

    // Special handling for Recipient Countries, Recipient Regions, and Custom Geographies (arrays)
    if ((field.fieldName === 'Recipient Countries' || 
         field.fieldName === 'Recipient Regions' || 
         field.fieldName === 'Custom Geographies') &&
        Array.isArray(currentValue) && Array.isArray(importValue)) {
      
      if (currentValue.length !== importValue.length) return false;
      
      // Compare each item - normalize for comparison
      const normalizeItem = (item: any) => ({
        code: String(item.code || '').trim(),
        name: String(item.name || '').trim(),
        percentage: item.percentage || 0,
        vocabulary: String(item.vocabulary || '').trim()
      });
      
      const normalizedCurrent = currentValue.map(normalizeItem).sort((a, b) => a.code.localeCompare(b.code));
      const normalizedImport = importValue.map(normalizeItem).sort((a, b) => a.code.localeCompare(b.code));
      
      return JSON.stringify(normalizedCurrent) === JSON.stringify(normalizedImport);
    }

    // Special handling for budget objects
    if (field?.itemType === 'budget' && typeof currentValue === 'object' && typeof importValue === 'object' && currentValue !== null && importValue !== null) {
      // Normalize type and status with defaults ('1' is the default for both)
      const typeMatch = String(currentValue.type || '1') === String(importValue.type || '1');
      const statusMatch = String(currentValue.status || '1') === String(importValue.status || '1');
      const startMatch = (currentValue.period?.start || currentValue.start) === (importValue.period?.start || importValue.start);
      const endMatch = (currentValue.period?.end || currentValue.end) === (importValue.period?.end || importValue.end);
      const valueMatch = currentValue.value !== undefined && importValue.value !== undefined &&
        Math.abs(Number(currentValue.value) - Number(importValue.value)) < 0.01;
      const currencyMatch = (currentValue.currency || '').toUpperCase() === (importValue.currency || '').toUpperCase();
      
      return typeMatch && statusMatch && startMatch && endMatch && valueMatch && currencyMatch;
    }

    // Special handling for transaction objects
    if (field?.itemType === 'transaction' && typeof currentValue === 'object' && typeof importValue === 'object' && currentValue !== null && importValue !== null) {
      const typeMatch = String(currentValue.transaction_type) === String(importValue.transaction_type);
      const dateMatch = currentValue.transaction_date === importValue.transaction_date;
      const valueMatch = currentValue.value !== undefined && importValue.value !== undefined &&
        Math.abs(Number(currentValue.value) - Number(importValue.value)) < 0.01;
      const currencyMatch = (currentValue.currency || '').toUpperCase() === (importValue.currency || '').toUpperCase();
      
      return typeMatch && dateMatch && valueMatch && currencyMatch;
    }

    // Special handling for planned disbursement objects
    if (field?.itemType === 'plannedDisbursement' && typeof currentValue === 'object' && currentValue !== null && field.itemData) {
      const itemData = field.itemData;
      const normalizeOrgRef = (ref: any) => {
        if (!ref || ref === '') return null;
        return String(ref).trim() || null;
      };

      const typeMatch = String(currentValue.type || '1') === String(itemData.type || '1');
      const startMatch = (currentValue.period?.start || currentValue.start) === (itemData.period?.start || itemData.start);
      const endMatch = (currentValue.period?.end || currentValue.end) === (itemData.period?.end || itemData.end);
      const valueMatch = currentValue.value !== undefined && itemData.value !== undefined &&
        Math.abs(Number(currentValue.value) - Number(itemData.value)) < 0.01;
      const currencyMatch = (currentValue.currency || 'USD').toUpperCase() === (itemData.currency || 'USD').toUpperCase();
      
      // Org ref matching - be lenient: if both are null/empty, match; if both have values, compare
      const currProviderRef = normalizeOrgRef(currentValue.provider_org_ref);
      const impProviderRef = normalizeOrgRef(itemData.providerOrg?.ref);
      const providerRefMatch = (currProviderRef === null && impProviderRef === null) || 
                               (currProviderRef === impProviderRef) ||
                               (currProviderRef === null || impProviderRef === null); // Allow match if one is empty
      
      const currReceiverRef = normalizeOrgRef(currentValue.receiver_org_ref);
      const impReceiverRef = normalizeOrgRef(itemData.receiverOrg?.ref);
      const receiverRefMatch = (currReceiverRef === null && impReceiverRef === null) || 
                               (currReceiverRef === impReceiverRef) ||
                               (currReceiverRef === null || impReceiverRef === null); // Allow match if one is empty
      
      return typeMatch && startMatch && endMatch && valueMatch && currencyMatch && providerRefMatch && receiverRefMatch;
    }

    // Special handling for country budget items
    if (field?.itemType === 'countryBudgetItems' && typeof currentValue === 'object' && currentValue !== null && field.itemData) {
      const itemData = field.itemData;
      const currentBI = currentValue.budget_items?.[0];
      const importBI = itemData.budget_items?.[0];

      if (!currentBI || !importBI) return false;

      // Compare vocabulary
      const vocabMatch = String(currentValue.vocabulary) === String(itemData.vocabulary);
      // Compare code
      const codeMatch = String(currentBI.code) === String(importBI.code);
      // Compare percentage (allow small floating point differences)
      const percentageMatch = Math.abs((currentBI.percentage || 0) - (importBI.percentage || 0)) < 0.01;
      // Compare description (normalize whitespace)
      const currentDesc = (currentBI.description || '').trim();
      const importDesc = (importBI.description || '').trim();
      const descMatch = currentDesc === importDesc;

      return vocabMatch && codeMatch && percentageMatch && descMatch;
    }

    // Special handling for document link fields
    // importValue is the title string, currentValue is an object with url, title, etc.
    if (field?.itemType === 'document' && typeof currentValue === 'object' && currentValue !== null) {
      // Primary match: URL (most reliable identifier)
      const currentUrl = String(currentValue.url || '').trim().toLowerCase();
      const importUrl = String(field.itemData?.url || '').trim().toLowerCase();
      
      if (currentUrl && importUrl && currentUrl === importUrl) return true;
      
      // Fallback: match by title (case-insensitive)
      const currentTitle = String(currentValue.title || '').trim().toLowerCase();
      const importTitle = String(typeof importValue === 'string' ? importValue : '').trim().toLowerCase();
      return currentTitle !== '' && importTitle !== '' && currentTitle === importTitle;
    }

    // Special handling for Contact fields - relaxed matching for better results
    if ((field.fieldName && field.fieldName.includes('Contact')) || field?.tab === 'contacts') {
      if (typeof currentValue === 'object' && typeof importValue === 'object' && currentValue !== null && importValue !== null) {
        // Normalize values for comparison (handle null, undefined, empty strings)
        const normalize = (val: any) => {
          if (val === null || val === undefined || val === '') return '';
          return String(val).trim().toLowerCase();
        };
        
        // Compare fields - allow partial data matches (empty fields are treated as matching)
        const compareField = (currVal: any, impVal: any) => {
          const curr = normalize(currVal);
          const imp = normalize(impVal);
          // If both empty, it's a match
          if (curr === '' && imp === '') return true;
          // If only one is empty, still consider it a match (allow partial data)
          if (curr === '' || imp === '') return true;
          return curr === imp;
        };
        
        // Type must match (or both be empty/default)
        const typeMatch = normalize(currentValue.type) === normalize(importValue.type) ||
                          (normalize(currentValue.type) === '' || normalize(currentValue.type) === '1') &&
                          (normalize(importValue.type) === '' || normalize(importValue.type) === '1');
        
        // Check key identifying fields
        const emailMatch = compareField(currentValue.email, importValue.email);
        const personMatch = compareField(currentValue.personName, importValue.personName);
        const orgMatch = compareField(currentValue.organization, importValue.organization);
        
        // Type and at least one identifier must match for it to be considered a match
        // This is more lenient than requiring ALL fields to match exactly
        const currEmail = normalize(currentValue.email);
        const impEmail = normalize(importValue.email);
        const currPerson = normalize(currentValue.personName);
        const impPerson = normalize(importValue.personName);
        const currOrg = normalize(currentValue.organization);
        const impOrg = normalize(importValue.organization);
        
        // If we have matching non-empty identifiers, it's a match
        const hasMatchingEmail = currEmail !== '' && impEmail !== '' && currEmail === impEmail;
        const hasMatchingPerson = currPerson !== '' && impPerson !== '' && currPerson === impPerson;
        const hasMatchingOrg = currOrg !== '' && impOrg !== '' && currOrg === impOrg;
        
        return typeMatch && (hasMatchingEmail || hasMatchingPerson || hasMatchingOrg);
      }
      return false;
    }

    // Handle object comparison (e.g., for coded fields that return {code, name})
    if (typeof currentValue === 'object' && typeof importValue === 'object') {
      if (currentValue === null || importValue === null) {
        return currentValue === importValue;
      }

      // Special handling for Related Activity fields - compare ref and type
      if ('ref' in currentValue && 'ref' in importValue) {
        const refMatch = String(currentValue.ref || '').trim() === String(importValue.ref || '').trim();
        const typeMatch = String(currentValue.type || '').trim() === String(importValue.type || '').trim();
        return refMatch && typeMatch;
      }

      // Special handling for Conditions - compare attached and conditions array
      if ('conditions' in currentValue && 'conditions' in importValue && 
          Array.isArray(currentValue.conditions) && Array.isArray(importValue.conditions)) {
        // Compare attached flag
        const attachedMatch = Boolean(currentValue.attached) === Boolean(importValue.attached);
        
        // Compare conditions count
        if (currentValue.conditions.length !== importValue.conditions.length) {
          return false;
        }
        
        // Compare each condition (type and narrative)
        for (let i = 0; i < currentValue.conditions.length; i++) {
          const curr = currentValue.conditions[i];
          const imp = importValue.conditions[i];
          
          // Compare type
          if (String(curr.type || '1') !== String(imp.type || '1')) {
            return false;
          }
          
          // Compare narrative (handle JSONB vs string)
          let currNarrative = '';
          let impNarrative = '';
          
          if (typeof curr.narrative === 'object' && curr.narrative !== null) {
            currNarrative = Object.values(curr.narrative)[0] as string || '';
          } else {
            currNarrative = String(curr.narrative || '');
          }
          
          if (typeof imp.narrative === 'object' && imp.narrative !== null) {
            impNarrative = Object.values(imp.narrative)[0] as string || '';
          } else {
            impNarrative = String(imp.narrative || '');
          }
          
          if (currNarrative.trim() !== impNarrative.trim()) {
            return false;
          }
        }
        
        return attachedMatch;
      }

      // For objects with code property (common in IATI fields like activity status, collaboration type, etc.)
      if ('code' in currentValue && 'code' in importValue) {
        return String(currentValue.code) === String(importValue.code);
      }

      // For structured date objects (with date property)
      if ('date' in currentValue && 'date' in importValue) {
        return String(currentValue.date) === String(importValue.date);
      }

      // Deep comparison for other objects
      return JSON.stringify(currentValue) === JSON.stringify(importValue);
    }

    // Handle mixed types: one is object, one is string
    // Extract the relevant value from objects for comparison
    if (typeof currentValue === 'object' && currentValue !== null) {
      // If currentValue is an object with code, compare code with importValue string
      if ('code' in currentValue) {
        return String(currentValue.code) === String(importValue).trim();
      }
      // If currentValue is an object with date, compare date with importValue string
      if ('date' in currentValue) {
        return String(currentValue.date) === String(importValue).trim();
      }
    }
    
    if (typeof importValue === 'object' && importValue !== null) {
      // If importValue is an object with code, compare code with currentValue string
      if ('code' in importValue) {
        return String(currentValue).trim() === String(importValue.code);
      }
      // If importValue is an object with date, compare date with currentValue string
      if ('date' in importValue) {
        return String(currentValue).trim() === String(importValue.date);
      }
    }

    // String comparison (normalize whitespace and case for flexibility)
    return String(currentValue).trim() === String(importValue).trim();
  };

  // Sort filtered fields
  const sortedFields = useMemo(() => {
    const sorted = [...filteredFields];
    
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'fieldName':
          // Special ordering: Activity Title should come before Activity Description
          if (a.fieldName === 'Activity Title' && b.fieldName === 'Activity Description') {
            return sortDirection === 'asc' ? -1 : 1;
          }
          if (a.fieldName === 'Activity Description' && b.fieldName === 'Activity Title') {
            return sortDirection === 'asc' ? 1 : -1;
          }
          
          // Numeric sorting for financial items (Budget, Transaction, Planned Disbursement, Budget Mapping)
          // If both fields are financial items with the same type and have itemIndex, sort numerically
          if (a.isFinancialItem && b.isFinancialItem && a.itemType === b.itemType && a.itemIndex !== undefined && b.itemIndex !== undefined) {
            const aNum = a.itemIndex;
            const bNum = b.itemIndex;
            return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
          }
          
          // Try to extract numbers from field names for numeric sorting (e.g., "Budget 1" vs "Budget 10")
          const aMatch = a.fieldName.match(/^(.+?)\s+(\d+)$/);
          const bMatch = b.fieldName.match(/^(.+?)\s+(\d+)$/);
          if (aMatch && bMatch && aMatch[1] === bMatch[1]) {
            // Same prefix, extract numbers and compare numerically
            const aNum = parseInt(aMatch[2], 10);
            const bNum = parseInt(bMatch[2], 10);
            if (!isNaN(aNum) && !isNaN(bNum)) {
              return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
            }
          }
          
          aValue = a.fieldName;
          bValue = b.fieldName;
          break;
        case 'category':
          // Special ordering: General should come before Descriptions
          const aCategory = getCategory(a);
          const bCategory = getCategory(b);
          if (aCategory === 'General' && bCategory === 'Descriptions') {
            return sortDirection === 'asc' ? -1 : 1;
          }
          if (aCategory === 'Descriptions' && bCategory === 'General') {
            return sortDirection === 'asc' ? 1 : -1;
          }
          aValue = aCategory;
          bValue = bCategory;
          break;
        case 'fieldType':
          aValue = getFieldType(a);
          bValue = getFieldType(b);
          break;
        case 'iatiPath':
          aValue = a.iatiPath;
          bValue = b.iatiPath;
          break;
        case 'currentValue':
          {
            const aFormatted = formatValue(a.currentValue);
            const bFormatted = formatValue(b.currentValue);
            aValue = aFormatted.text || `${aFormatted.code || ''} ${aFormatted.name || ''}`;
            bValue = bFormatted.text || `${bFormatted.code || ''} ${bFormatted.name || ''}`;
          }
          break;
        case 'importValue':
          {
            const aFormatted = formatValue(a.importValue);
            const bFormatted = formatValue(b.importValue);
            aValue = aFormatted.text || `${aFormatted.code || ''} ${aFormatted.name || ''}`;
            bValue = bFormatted.text || `${bFormatted.code || ''} ${bFormatted.name || ''}`;
          }
          break;
        case 'conflict':
          aValue = a.hasConflict ? 1 : 0;
          bValue = b.hasConflict ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredFields, sortColumn, sortDirection]);

  // Handle column header click for sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Toggle row expansion
  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  };

  // Get unique row identifier
  const getRowId = (field: ParsedField, index: number): string => {
    return `${field.iatiPath}-${field.fieldName}-${index}`;
  };

  // Render sort indicator
  const SortIndicator = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-1 h-3 w-3 text-gray-400" />
      : <ArrowDown className="ml-1 h-3 w-3 text-gray-400" />;
  };

  const selectedCount = sortedFields.filter(f => f.selected).length;
  const totalCount = sortedFields.length;

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search fields by name, path, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="conflicts-only"
            checked={showConflictsOnly}
            onCheckedChange={setShowConflictsOnly}
          />
          <label htmlFor="conflicts-only" className="text-sm font-medium cursor-pointer">
            Conflicts only
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="missing-only"
            checked={showMissingOnly}
            onCheckedChange={setShowMissingOnly}
          />
          <label htmlFor="missing-only" className="text-sm font-medium cursor-pointer">
            Missing only
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onSelectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={onDeselectAll}>
            Deselect All
          </Button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {totalCount} field{totalCount !== 1 ? 's' : ''} ({selectedCount} selected)
        {searchQuery && ` matching "${searchQuery}"`}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-12"></TableHead>
              <TableHead className="w-12"></TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors w-[30%]"
                onClick={() => handleSort('fieldName')}
              >
                <div className="flex items-center">
                  Field Name
                  <SortIndicator column="fieldName" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 transition-colors w-[35%]"
                onClick={() => handleSort('importValue')}
              >
                <div className="flex items-center">
                  Import Value
                  <SortIndicator column="importValue" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-gray-100 transition-colors w-[35%]"
                onClick={() => handleSort('currentValue')}
              >
                <div className="flex items-center">
                  Current Value
                  <SortIndicator column="currentValue" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors w-24"
                onClick={() => handleSort('conflict')}
              >
                <div className="flex items-center justify-center">
                  Status
                  <SortIndicator column="conflict" />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedFields.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No fields found matching your criteria
                </TableCell>
              </TableRow>
            ) : (hasSections ? (() => {
              // Group sorted fields by section
              const sectionGroups: { sectionName: string; fields: typeof sortedFields }[] = [];
              const fieldToSection = new Map<ParsedField, string>();
              
              sections!.forEach(section => {
                section.fields.forEach(field => {
                  fieldToSection.set(field, section.sectionName);
                });
              });
              
              const sectionMap = new Map<string, typeof sortedFields>();
              sortedFields.forEach(field => {
                const sectionName = fieldToSection.get(field) || 'Other';
                if (!sectionMap.has(sectionName)) {
                  sectionMap.set(sectionName, []);
                }
                sectionMap.get(sectionName)!.push(field);
              });
              
              // Maintain section order
              sections!.forEach(section => {
                if (sectionMap.has(section.sectionName) && sectionMap.get(section.sectionName)!.length > 0) {
                  sectionGroups.push({
                    sectionName: section.sectionName,
                    fields: sectionMap.get(section.sectionName)!
                  });
                }
              });
              
              return sectionGroups.map((sectionGroup) => {
                // Group fields by category (sub-section) within this section
                const categoryGroups = new Map<string, typeof sortedFields>();
                sectionGroup.fields.forEach(field => {
                  const category = getCategory(field);
                  if (!categoryGroups.has(category)) {
                    categoryGroups.set(category, []);
                  }
                  categoryGroups.get(category)!.push(field);
                });
                
                const categoryArray = Array.from(categoryGroups.entries());
                
                return (
                  <React.Fragment key={sectionGroup.sectionName}>
                    {/* Section Header */}
                    <TableRow className="bg-gray-100 hover:bg-gray-100 sticky top-0 z-10">
                      <TableCell colSpan={6} className="py-2 px-4 border-b-2 border-gray-300">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm text-gray-900">{sectionGroup.sectionName}</h3>
                          <span className="text-xs text-gray-600">
                            {sectionGroup.fields.length} field{sectionGroup.fields.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Sub-sections within this section */}
                    {categoryArray.map(([categoryName, categoryFields]) => (
                      <React.Fragment key={`${sectionGroup.sectionName}-${categoryName}`}>
                        {/* Sub-section Header (only show if there's more than one category in the section) */}
                        {categoryArray.length > 1 && (
                          <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableCell colSpan={6} className="py-1.5 px-4 pl-8 border-b border-gray-200">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-xs text-gray-700">{categoryName}</h4>
                                <span className="text-xs text-gray-500">
                                  {categoryFields.length} field{categoryFields.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                        
                        {/* Category Fields */}
                        {categoryFields.map((field, index) => {
                  const rowId = getRowId(field, index);
                  const isExpanded = expandedRows.has(rowId);
                  // For tag fields, check existingTags instead of currentValue
                  const isMissing = field.isTagField 
                    ? (!field.existingTags || field.existingTags.length === 0)
                    : (field.currentValue === null ||
                       field.currentValue === undefined ||
                       field.currentValue === '' ||
                       (Array.isArray(field.currentValue) && field.currentValue.length === 0));

                  return (
                    <React.Fragment key={rowId}>
                      <TableRow
                        className="group hover:bg-gray-100 transition-colors"
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={field.selected}
                            onCheckedChange={(checked) => onFieldToggle(field, checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpansion(rowId);
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {field.fieldName}
                        </TableCell>
                        <TableCell className={`text-sm text-gray-700 break-words ${field.fieldName === 'Activity Title' ? '[vertical-align:top]' : ''}`}>
                          {renderValue(field.importValue, rowId, 'import', field.fieldName, field)}
                        </TableCell>
                        <TableCell className={`text-sm text-gray-700 break-words ${field.fieldName === 'Activity Title' ? '[vertical-align:top]' : ''}`}>
                          {renderValue(field.currentValue, rowId, 'current', field.fieldName, field)}
                        </TableCell>
                        <TableCell className="text-center">
                          {field.hasConflict && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#f1f4f8', color: '#dc2625', border: '1px solid #dc2625' }}>
                              Conflict
                            </span>
                          )}
                          {!field.hasConflict && field.fieldName === 'Sectors' && field.description?.includes('Refined successfully') && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#f1f4f8', color: '#7b95a7', border: '1px solid #7b95a7' }}>
                              Ready
                            </span>
                          )}
                          {!field.hasConflict && !(field.fieldName === 'Sectors' && field.description?.includes('Refined successfully')) && isMissing && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#f1f4f8', color: '#4c5568', border: '1px solid #4c5568' }}>
                              New
                            </span>
                          )}
                          {!field.hasConflict && !(field.fieldName === 'Sectors' && field.description?.includes('Refined successfully')) && !isMissing && valuesMatch(field) && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#f1f4f8', color: '#7b95a7', border: '1px solid #7b95a7' }}>
                              Match
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded details row */}
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={6} className="bg-gray-50 p-4">
                            {/* Detailed Data Display */}
                            {(() => {
                              // Individual Recipient Country items
                              if (field.isRecipientCountryItem && field.recipientCountryData) {
                                const country = field.recipientCountryData;
                                const xmlSnippet = `<recipient-country code="${country.code || ''}"${country.percentage !== undefined ? ` percentage="${country.percentage}"` : ''} />`;
                                
                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      Recipient Country Details
                                    </div>

                                    {/* 3-column layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      {/* Column 1: Raw XML */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                        <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all bg-gray-100 p-2 rounded">
{xmlSnippet}
                                        </pre>
                                      </div>

                                      {/* Column 2: Import Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                        <table className="w-full text-xs">
                                          <tbody>
                                            <tr className="border-b border-gray-100 align-top">
                                              <td className="py-1.5 pr-2 font-medium text-gray-600">Code:</td>
                                              <td className="py-1.5 text-gray-900">
                                                <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{country.code}</code>
                                              </td>
                                            </tr>
                                            <tr className="border-b border-gray-100 align-top">
                                              <td className="py-1.5 pr-2 font-medium text-gray-600">Country:</td>
                                              <td className="py-1.5 text-gray-900">{country.name}</td>
                                            </tr>
                                            {country.percentage !== undefined && (
                                              <tr className="align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Percentage:</td>
                                                <td className="py-1.5 text-gray-900">{country.percentage}%</td>
                                              </tr>
                                            )}
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* Column 3: Current Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                        {field.currentValue ? (
                                          <table className="w-full text-xs">
                                            <tbody>
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Code:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{field.currentValue.code || '—'}</code>
                                                </td>
                                              </tr>
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Country:</td>
                                                <td className="py-1.5 text-gray-900">{field.currentValue.name || '—'}</td>
                                              </tr>
                                              {field.currentValue.percentage !== undefined && (
                                                <tr className="align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Percentage:</td>
                                                  <td className="py-1.5 text-gray-900">{field.currentValue.percentage}%</td>
                                                </tr>
                                              )}
                                            </tbody>
                                          </table>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No existing value</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              // Individual Recipient Region items
                              if (field.isRecipientRegionItem && field.recipientRegionData) {
                                const region = field.recipientRegionData;
                                const vocabUri = region.vocabularyUri ? ` vocabulary-uri="${region.vocabularyUri}"` : '';
                                const xmlSnippet = `<recipient-region code="${region.code || ''}" vocabulary="${region.vocabulary || '1'}"${vocabUri}${region.percentage !== undefined ? ` percentage="${region.percentage}"` : ''} />`;
                                const vocabName = region.vocabulary === '1' ? 'OECD DAC' : region.vocabulary === '2' ? 'UN' : region.vocabulary === '99' ? 'Custom' : `Vocabulary ${region.vocabulary}`;
                                
                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      Recipient Region Details
                                    </div>

                                    {/* 3-column layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      {/* Column 1: Raw XML */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                        <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all bg-gray-100 p-2 rounded">
{xmlSnippet}
                                        </pre>
                                      </div>

                                      {/* Column 2: Import Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                        <table className="w-full text-xs">
                                          <tbody>
                                            <tr className="border-b border-gray-100 align-top">
                                              <td className="py-1.5 pr-2 font-medium text-gray-600">Code:</td>
                                              <td className="py-1.5 text-gray-900">
                                                <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{region.code}</code>
                                              </td>
                                            </tr>
                                            <tr className="border-b border-gray-100 align-top">
                                              <td className="py-1.5 pr-2 font-medium text-gray-600">Region:</td>
                                              <td className="py-1.5 text-gray-900">{region.name}</td>
                                            </tr>
                                            <tr className="border-b border-gray-100 align-top">
                                              <td className="py-1.5 pr-2 font-medium text-gray-600">Vocabulary:</td>
                                              <td className="py-1.5 text-gray-900">{vocabName}</td>
                                            </tr>
                                            {region.percentage !== undefined && (
                                              <tr className="align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Percentage:</td>
                                                <td className="py-1.5 text-gray-900">{region.percentage}%</td>
                                              </tr>
                                            )}
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* Column 3: Current Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                        {field.currentValue ? (
                                          <table className="w-full text-xs">
                                            <tbody>
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Code:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{field.currentValue.code || '—'}</code>
                                                </td>
                                              </tr>
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Region:</td>
                                                <td className="py-1.5 text-gray-900">{field.currentValue.name || '—'}</td>
                                              </tr>
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Vocabulary:</td>
                                                <td className="py-1.5 text-gray-900">{field.currentValue.vocabularyName || field.currentValue.vocabulary || '—'}</td>
                                              </tr>
                                              {field.currentValue.percentage !== undefined && (
                                                <tr className="align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Percentage:</td>
                                                  <td className="py-1.5 text-gray-900">{field.currentValue.percentage}%</td>
                                                </tr>
                                              )}
                                            </tbody>
                                          </table>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No existing value</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              // Recipient Countries, Recipient Regions, and Custom Geographies - handle arrays (legacy/grouped)
                              if (field.fieldName === 'Recipient Countries' || 
                                  field.fieldName === 'Recipient Regions' || 
                                  field.fieldName === 'Custom Geographies') {
                                
                                const importData = Array.isArray(field.importValue) ? field.importValue : [];
                                const currentData = Array.isArray(field.currentValue) ? field.currentValue : [];
                                
                                // Generate XML snippet
                                let xmlSnippet = '';
                                if (field.fieldName === 'Recipient Countries') {
                                  xmlSnippet = importData.map((item: any) => 
                                    `<recipient-country code="${item.code || ''}"${item.percentage ? ` percentage="${item.percentage}"` : ''} />`
                                  ).join('\n');
                                } else if (field.fieldName === 'Recipient Regions') {
                                  xmlSnippet = importData.map((item: any) => {
                                    const vocab = item.vocabulary?.split(' ')[0] || '1';
                                    return `<recipient-region code="${item.code || ''}" vocabulary="${vocab}"${item.percentage ? ` percentage="${item.percentage}"` : ''} />`;
                                  }).join('\n');
                                } else if (field.fieldName === 'Custom Geographies') {
                                  xmlSnippet = importData.map((item: any) => {
                                    const vocabUri = item.vocabularyUri ? ` vocabulary-uri="${item.vocabularyUri}"` : '';
                                    return `<recipient-region code="${item.code || ''}" vocabulary="99"${vocabUri}${item.percentage ? ` percentage="${item.percentage}"` : ''} />`;
                                  }).join('\n');
                                }
                                
                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      {field.fieldName} Details
                                    </div>

                                    {/* 3-column layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      {/* Column 1: Raw XML */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                        <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
{xmlSnippet || '—'}
                                        </pre>
                                      </div>

                                      {/* Column 2: Import Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                        {importData.length > 0 ? (
                                          <table className="w-full text-xs">
                                            <tbody>
                                              {importData.map((item: any, idx: number) => (
                                                <React.Fragment key={idx}>
                                                  {item.code && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Code:</td>
                                                      <td className="py-1.5 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {item.code}
                                                        </code>
                                                      </td>
                                                    </tr>
                                                  )}
                                                  {item.name && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Name:</td>
                                                      <td className="py-1.5 text-gray-900">{item.name}</td>
                                                    </tr>
                                                  )}
                                                  {item.vocabulary && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Vocabulary:</td>
                                                      <td className="py-1.5 text-gray-900">{item.vocabulary}</td>
                                                    </tr>
                                                  )}
                                                  {item.percentage !== undefined && (
                                                    <tr className={idx < importData.length - 1 ? "border-b-2 border-gray-300 align-top" : "align-top"}>
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Percentage:</td>
                                                      <td className="py-1.5 text-gray-900">{item.percentage}%</td>
                                                    </tr>
                                                  )}
                                                </React.Fragment>
                                              ))}
                                            </tbody>
                                          </table>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No import value</div>
                                        )}
                                      </div>

                                      {/* Column 3: Current Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                        {currentData.length > 0 ? (
                                          <table className="w-full text-xs">
                                            <tbody>
                                              {currentData.map((item: any, idx: number) => (
                                                <React.Fragment key={idx}>
                                                  {item.code && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Code:</td>
                                                      <td className="py-1.5 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {item.code}
                                                        </code>
                                                      </td>
                                                    </tr>
                                                  )}
                                                  {item.name && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Name:</td>
                                                      <td className="py-1.5 text-gray-900">{item.name}</td>
                                                    </tr>
                                                  )}
                                                  {item.vocabulary && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Vocabulary:</td>
                                                      <td className="py-1.5 text-gray-900">{item.vocabulary}</td>
                                                    </tr>
                                                  )}
                                                  {item.percentage !== undefined && (
                                                    <tr className={idx < currentData.length - 1 ? "border-b-2 border-gray-300 align-top" : "align-top"}>
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Percentage:</td>
                                                      <td className="py-1.5 text-gray-900">{item.percentage}%</td>
                                                    </tr>
                                                  )}
                                                </React.Fragment>
                                              ))}
                                            </tbody>
                                          </table>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No existing value</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              // Forward Spend (FSS) fields - show all details in expanded view
                              if (field.isFssItem || field.fieldName === 'Forward Spend') {
                                const fssData = field.fssData;
                                const currentFss = field.currentValue;
                                
                                // Priority labels
                                const priorityLabels: Record<number, string> = {
                                  1: 'High Priority',
                                  2: 'Medium Priority',
                                  3: 'Low Priority',
                                  4: 'Very Low Priority',
                                  5: 'Uncertain'
                                };
                                
                                // Generate XML snippet
                                let xmlSnippet = '';
                                if (fssData) {
                                  xmlSnippet = `<fss extraction-date="${fssData.extractionDate || ''}"${fssData.priority ? ` priority="${fssData.priority}"` : ''}${fssData.phaseoutYear ? ` phaseout-year="${fssData.phaseoutYear}"` : ''}>`;
                                  if (fssData.forecasts && fssData.forecasts.length > 0) {
                                    fssData.forecasts.forEach((f: any) => {
                                      xmlSnippet += `\n  <forecast year="${f.year}"${f.valueDate ? ` value-date="${f.valueDate}"` : ''} currency="${f.currency || 'USD'}">${f.value}</forecast>`;
                                    });
                                  }
                                  xmlSnippet += '\n</fss>';
                                }
                                
                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <DollarSign className="h-4 w-4" />
                                      Forward Spending Survey Details
                                    </div>

                                    {/* 3-column layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      {/* Column 1: Raw XML */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                        <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
{xmlSnippet || '—'}
                                        </pre>
                                      </div>

                                      {/* Column 2: Import Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                        {fssData ? (
                                          <div className="space-y-4">
                                            {/* FSS Attributes Table */}
                                            <div>
                                              <div className="text-xs font-semibold text-gray-700 mb-2">FSS Attributes</div>
                                              <table className="w-full text-xs">
                                                <tbody>
                                                  {fssData.extractionDate && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Extraction Date</td>
                                                      <td className="py-1.5 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {fssData.extractionDate}
                                                        </code>
                                                      </td>
                                                    </tr>
                                                  )}
                                                  {fssData.priority && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Priority</td>
                                                      <td className="py-1.5 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded mr-2">
                                                          {fssData.priority}
                                                        </code>
                                                        {priorityLabels[fssData.priority] || ''}
                                                      </td>
                                                    </tr>
                                                  )}
                                                  {fssData.phaseoutYear && (
                                                    <tr className="align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Phaseout Year</td>
                                                      <td className="py-1.5 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {fssData.phaseoutYear}
                                                        </code>
                                                      </td>
                                                    </tr>
                                                  )}
                                                </tbody>
                                              </table>
                                            </div>

                                            {/* Forecast Tables */}
                                            {fssData.forecasts && fssData.forecasts.length > 0 && fssData.forecasts.map((f: any, idx: number) => (
                                              <div key={idx}>
                                                <div className="text-xs font-semibold text-gray-700 mb-2">Forecast</div>
                                                <table className="w-full text-xs">
                                                  <tbody>
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Year</td>
                                                      <td className="py-1.5 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {f.year}
                                                        </code>
                                                      </td>
                                                    </tr>
                                                    {f.valueDate && (
                                                      <tr className="border-b border-gray-100 align-top">
                                                        <td className="py-1.5 pr-2 font-medium text-gray-600">Value Date</td>
                                                        <td className="py-1.5 text-gray-900">
                                                          <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                            {f.valueDate}
                                                          </code>
                                                        </td>
                                                      </tr>
                                                    )}
                                                    <tr className="align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Currency and Amount</td>
                                                      <td className="py-1.5 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded mr-2">
                                                          {f.currency}
                                                        </code>
                                                        {f.value?.toLocaleString()}
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No import value</div>
                                        )}
                                      </div>

                                      {/* Column 3: Current Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                        {currentFss ? (
                                          <div className="space-y-4">
                                            {/* FSS Attributes Table */}
                                            <div>
                                              <div className="text-xs font-semibold text-gray-700 mb-2">FSS Attributes</div>
                                              <table className="w-full text-xs">
                                                <tbody>
                                                  {currentFss.extractionDate && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Extraction Date</td>
                                                      <td className="py-1.5 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {currentFss.extractionDate}
                                                        </code>
                                                      </td>
                                                    </tr>
                                                  )}
                                                  {currentFss.priority && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Priority</td>
                                                      <td className="py-1.5 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded mr-2">
                                                          {currentFss.priority}
                                                        </code>
                                                        {priorityLabels[currentFss.priority] || ''}
                                                      </td>
                                                    </tr>
                                                  )}
                                                  {currentFss.phaseoutYear && (
                                                    <tr className="align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Phaseout Year</td>
                                                      <td className="py-1.5 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {currentFss.phaseoutYear}
                                                        </code>
                                                      </td>
                                                    </tr>
                                                  )}
                                                </tbody>
                                              </table>
                                            </div>

                                            {/* Forecast Tables */}
                                            {currentFss.forecasts && currentFss.forecasts.length > 0 && currentFss.forecasts.map((f: any, idx: number) => (
                                              <div key={idx}>
                                                <div className="text-xs font-semibold text-gray-700 mb-2">Forecast</div>
                                                <table className="w-full text-xs">
                                                  <tbody>
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Year</td>
                                                      <td className="py-1.5 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {f.year}
                                                        </code>
                                                      </td>
                                                    </tr>
                                                    {f.valueDate && (
                                                      <tr className="border-b border-gray-100 align-top">
                                                        <td className="py-1.5 pr-2 font-medium text-gray-600">Value Date</td>
                                                        <td className="py-1.5 text-gray-900">
                                                          <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                            {f.valueDate}
                                                          </code>
                                                        </td>
                                                      </tr>
                                                    )}
                                                    <tr className="align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Currency and Amount</td>
                                                      <td className="py-1.5 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded mr-2">
                                                          {f.currency}
                                                        </code>
                                                        {f.value?.toLocaleString()}
                                                      </td>
                                                    </tr>
                                                  </tbody>
                                                </table>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No existing value</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              // Humanitarian Scope fields - show all details in table format
                              if (field.fieldName && field.fieldName.startsWith('Humanitarian Scope')) {
                                const importScope = typeof field.importValue === 'object' ? field.importValue : null;
                                const currentScope = typeof field.currentValue === 'object' ? field.currentValue : null;
                                
                                // Helper to get type label
                                const getTypeLabel = (type: string) => {
                                  return type === '1' ? 'Emergency' : type === '2' ? 'Appeal' : type || '—';
                                };
                                
                                // Helper to get vocabulary label
                                const getVocabLabel = (vocab: string) => {
                                  const vocabLabels: Record<string, string> = {
                                    '1-1': 'Glide',
                                    '1-2': 'Humanitarian Plan',
                                    '2-1': 'Humanitarian Cluster',
                                    '99': 'Reporting Organisation'
                                  };
                                  return vocabLabels[vocab] || vocab || '—';
                                };
                                
                                // Generate XML snippet
                                let xmlSnippet = '';
                                if (importScope) {
                                  const narrativeXml = importScope.narratives?.map((n: any) => 
                                    `  <narrative${n.language ? ` xml:lang="${n.language}"` : ''}>${n.text || n.narrative || ''}</narrative>`
                                  ).join('\n') || '';
                                  xmlSnippet = `<humanitarian-scope type="${importScope.type || ''}" vocabulary="${importScope.vocabulary || '1-2'}" code="${importScope.code || ''}">${narrativeXml ? '\n' + narrativeXml + '\n' : ''}</humanitarian-scope>`;
                                }
                                
                                // Helper to render scope details as table
                                const renderScopeTable = (scope: any) => {
                                  if (!scope) {
                                    return <div className="text-xs text-gray-500 italic">No value</div>;
                                  }
                                  
                                  const narrativeText = scope.narratives?.map((n: any) => n.text || n.narrative || '').filter(Boolean).join('; ') || scope.code || '—';
                                  
                                  return (
                                    <table className="w-full text-xs">
                                      <tbody>
                                        <tr className="border-b border-gray-100 align-top">
                                          <td className="py-1.5 pr-2 font-medium text-gray-600">Type:</td>
                                          <td className="py-1.5 text-gray-900">{getTypeLabel(scope.type)}</td>
                                        </tr>
                                        <tr className="border-b border-gray-100 align-top">
                                          <td className="py-1.5 pr-2 font-medium text-gray-600">Vocabulary:</td>
                                          <td className="py-1.5 text-gray-900">{getVocabLabel(scope.vocabulary)}</td>
                                        </tr>
                                        <tr className="border-b border-gray-100 align-top">
                                          <td className="py-1.5 pr-2 font-medium text-gray-600">Code:</td>
                                          <td className="py-1.5 text-gray-900">
                                            <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                              {scope.code || '—'}
                                            </code>
                                          </td>
                                        </tr>
                                        <tr className="align-top">
                                          <td className="py-1.5 pr-2 font-medium text-gray-600">Narrative:</td>
                                          <td className="py-1.5 text-gray-900">{narrativeText}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  );
                                };
                                
                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <AlertCircle className="h-4 w-4" />
                                      Humanitarian Scope Details
                                    </div>

                                    {/* 3-column layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      {/* Column 1: Raw XML */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                        <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
{xmlSnippet || '—'}
                                        </pre>
                                      </div>

                                      {/* Column 2: Import Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                        {renderScopeTable(importScope)}
                                      </div>

                                      {/* Column 3: Current Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                        {renderScopeTable(currentScope)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              // Participating Org fields - show all details in expanded view
                              if ((field.fieldName && field.fieldName.includes('Participating Organization')) || field?.tab === 'participating_orgs') {
                                const orgData = typeof field.importValue === 'object' && field.importValue !== null && !Array.isArray(field.importValue)
                                  ? field.importValue
                                  : null;

                                if (orgData) {
                                  // Generate XML snippet for display
                                  const xmlSnippet = `<participating-org${orgData.ref ? ` ref="${orgData.ref}"` : ''}${orgData.role ? ` role="${orgData.role}"` : ''}${orgData.type ? ` type="${orgData.type}"` : ''}${orgData.activityId ? ` activity-id="${orgData.activityId}"` : ''}${orgData.crsChannelCode ? ` crs-channel-code="${orgData.crsChannelCode}"` : ''}>
  ${orgData.narrative || orgData.name ? `<narrative>${orgData.narrative || orgData.name}</narrative>` : ''}
</participating-org>`;

                                  return (
                                    <div className="mb-6 border-b border-gray-200 pb-6">
                                      <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                        <Building2 className="h-4 w-4" />
                                        Participating Organization Details
                                      </div>

                                      {/* 3-column layout */}
                                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        {/* Column 1: Raw XML */}
                                        <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                          <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                          <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
{xmlSnippet}
                                          </pre>
                                        </div>

                                        {/* Column 2: Import Value */}
                                        <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                          <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                          <table className="w-full text-xs">
                                            <tbody>
                                              {orgData.name && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Name:</td>
                                                  <td className="py-1.5 text-gray-900">{orgData.name}</td>
                                                </tr>
                                              )}
                                              {orgData.ref && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Ref:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {orgData.ref}
                                                    </code>
                                                  </td>
                                                </tr>
                                              )}
                                              {orgData.validated_ref && orgData.validated_ref !== orgData.ref && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Validated Ref:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {orgData.validated_ref}
                                                    </code>
                                                  </td>
                                                </tr>
                                              )}
                                              {orgData.role && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Role:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {orgData.role}
                                                    </code>
                                                    <span className="ml-2">{getOrganizationRoleName(orgData.role)}</span>
                                                  </td>
                                                </tr>
                                              )}
                                              {orgData.type && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Type:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {orgData.type}
                                                    </code>
                                                  </td>
                                                </tr>
                                              )}
                                              {orgData.activityId && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Activity ID:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {orgData.activityId}
                                                    </code>
                                                  </td>
                                                </tr>
                                              )}
                                              {orgData.crsChannelCode && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">DAC CRS Reporting:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {orgData.crsChannelCode}
                                                    </code>
                                                  </td>
                                                </tr>
                                              )}
                                              {orgData.narrative && orgData.narrative !== orgData.name && (
                                                <tr className="align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Narrative:</td>
                                                  <td className="py-1.5 text-gray-900">{orgData.narrative}</td>
                                                </tr>
                                              )}
                                            </tbody>
                                          </table>
                                        </div>

                                        {/* Column 3: Current Value */}
                                        <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                          <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                          {field.currentValue ? (
                                            <table className="w-full text-xs">
                                              <tbody>
                                                {field.currentValue.name && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Name:</td>
                                                    <td className="py-1.5 text-gray-900">{field.currentValue.name}</td>
                                                  </tr>
                                                )}
                                                {field.currentValue.ref && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Ref:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {field.currentValue.ref}
                                                      </code>
                                                    </td>
                                                  </tr>
                                                )}
                                                {field.currentValue.role && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Role:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {field.currentValue.role}
                                                      </code>
                                                      <span className="ml-2">{getOrganizationRoleName(field.currentValue.role)}</span>
                                                    </td>
                                                  </tr>
                                                )}
                                                {field.currentValue.type && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Type:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {field.currentValue.type}
                                                      </code>
                                                    </td>
                                                  </tr>
                                                )}
                                              </tbody>
                                            </table>
                                          ) : (
                                            <div className="text-xs text-gray-500 italic">No existing value</div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                              }
                              
                              // Related Activity fields - show all details in expanded view
                              if ((field.fieldName && field.fieldName.includes('Related Activity')) || field?.tab === 'linked_activities') {
                                const relatedActivityData = typeof field.importValue === 'object' && field.importValue !== null && !Array.isArray(field.importValue)
                                  ? field.importValue
                                  : null;

                                if (relatedActivityData) {
                                  // Generate XML snippet for display
                                  const xmlSnippet = `<related-activity ref="${relatedActivityData.ref || ''}" type="${relatedActivityData.type || ''}" />`;

                                  return (
                                    <div className="mb-6 border-b border-gray-200 pb-6">
                                      <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                        <ExternalLink className="h-4 w-4" />
                                        Related Activity Details
                                      </div>

                                      {/* 3-column layout */}
                                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        {/* Column 1: Raw XML */}
                                        <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                          <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                          <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
{xmlSnippet}
                                          </pre>
                                        </div>

                                        {/* Column 2: Import Value */}
                                        <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                          <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                          <table className="w-full text-xs">
                                            <tbody>
                                              {relatedActivityData.ref && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Ref:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {relatedActivityData.ref}
                                                    </code>
                                                  </td>
                                                </tr>
                                              )}
                                              {relatedActivityData.type && (
                                                <tr className="align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Type & Relationship:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {relatedActivityData.type}
                                                    </code>
                                                    {relatedActivityData.relationshipTypeLabel && (
                                                      <span className="ml-2 text-gray-700">({relatedActivityData.relationshipTypeLabel})</span>
                                                    )}
                                                  </td>
                                                </tr>
                                              )}
                                            </tbody>
                                          </table>
                                        </div>

                                        {/* Column 3: Current Value */}
                                        <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                          <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                          {field.currentValue ? (
                                            <table className="w-full text-xs">
                                              <tbody>
                                                {field.currentValue.ref && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Ref:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {field.currentValue.ref}
                                                      </code>
                                                    </td>
                                                  </tr>
                                                )}
                                                {field.currentValue.type && (
                                                  <tr className="align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Type & Relationship:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {field.currentValue.type}
                                                      </code>
                                                      {field.currentValue.relationshipTypeLabel && (
                                                        <span className="ml-2 text-gray-700">({field.currentValue.relationshipTypeLabel})</span>
                                                      )}
                                                    </td>
                                                  </tr>
                                                )}
                                              </tbody>
                                            </table>
                                          ) : (
                                            <div className="text-xs text-gray-500 italic">No existing value</div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                              }
                              
                              // Contact fields - show all contact details in expanded view
                              if ((field.fieldName && field.fieldName.includes('Contact')) || field?.tab === 'contacts') {
                                const contactData = typeof field.importValue === 'object' && field.importValue !== null && !Array.isArray(field.importValue)
                                  ? field.importValue
                                  : null;

                                if (contactData) {
                                  // Generate XML snippet for display
                                  const xmlSnippet = `<contact-info${contactData.type ? ` type="${contactData.type}"` : ''}>
  ${contactData.organization ? `<organisation>
    <narrative>${contactData.organization}</narrative>
  </organisation>` : ''}
  ${contactData.personName ? `<person-name>
    <narrative>${contactData.personName}</narrative>
  </person-name>` : ''}
  ${contactData.jobTitle ? `<job-title>
    <narrative>${contactData.jobTitle}</narrative>
  </job-title>` : ''}
  ${contactData.department ? `<department>
    <narrative>${contactData.department}</narrative>
  </department>` : ''}
  ${contactData.email ? `<email>${contactData.email}</email>` : ''}
  ${contactData.telephone ? `<telephone>${contactData.telephone}</telephone>` : ''}
  ${contactData.website ? `<website>${contactData.website}</website>` : ''}
  ${contactData.mailingAddress ? `<mailing-address>
    <narrative>${contactData.mailingAddress}</narrative>
  </mailing-address>` : ''}
</contact-info>`;

                                  return (
                                    <div className="mb-6 border-b border-gray-200 pb-6">
                                      <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                        <Building2 className="h-4 w-4" />
                                        Contact Details
                                      </div>

                                      {/* 3-column layout */}
                                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                        {/* Column 1: Raw XML */}
                                        <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                          <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                          <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
{xmlSnippet}
                                          </pre>
                                        </div>

                                        {/* Column 2: Import Value */}
                                        <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                          <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                          <table className="w-full text-xs">
                                            <tbody>
                                              {contactData.type && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Type:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {contactData.type}
                                                    </code>
                                                  </td>
                                                </tr>
                                              )}
                                              {contactData.organization && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Organization:</td>
                                                  <td className="py-1.5 text-gray-900">{contactData.organization}</td>
                                                </tr>
                                              )}
                                              {contactData.personName && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Person Name:</td>
                                                  <td className="py-1.5 text-gray-900">{contactData.personName}</td>
                                                </tr>
                                              )}
                                              {contactData.jobTitle && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Job Title:</td>
                                                  <td className="py-1.5 text-gray-900">{contactData.jobTitle}</td>
                                                </tr>
                                              )}
                                              {contactData.department && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Department:</td>
                                                  <td className="py-1.5 text-gray-900">{contactData.department}</td>
                                                </tr>
                                              )}
                                              {contactData.email && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Email:</td>
                                                  <td className="py-1.5 text-gray-900">{contactData.email}</td>
                                                </tr>
                                              )}
                                              {contactData.telephone && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Telephone:</td>
                                                  <td className="py-1.5 text-gray-900">{contactData.telephone}</td>
                                                </tr>
                                              )}
                                              {contactData.website && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Website:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <a href={contactData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline break-all">
                                                      {contactData.website}
                                                    </a>
                                                  </td>
                                                </tr>
                                              )}
                                              {contactData.mailingAddress && (
                                                <tr className="align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Mailing Address:</td>
                                                  <td className="py-1.5 text-gray-900">{contactData.mailingAddress}</td>
                                                </tr>
                                              )}
                                            </tbody>
                                          </table>
                                        </div>

                                        {/* Column 3: Current Value */}
                                        <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                          <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                          {field.currentValue ? (
                                            <table className="w-full text-xs">
                                              <tbody>
                                                {field.currentValue.type && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Type:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {field.currentValue.type}
                                                      </code>
                                                    </td>
                                                  </tr>
                                                )}
                                                {field.currentValue.organization && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Organization:</td>
                                                    <td className="py-1.5 text-gray-900">{field.currentValue.organization}</td>
                                                  </tr>
                                                )}
                                                {field.currentValue.personName && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Person Name:</td>
                                                    <td className="py-1.5 text-gray-900">{field.currentValue.personName}</td>
                                                  </tr>
                                                )}
                                                {field.currentValue.jobTitle && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Job Title:</td>
                                                    <td className="py-1.5 text-gray-900">{field.currentValue.jobTitle}</td>
                                                  </tr>
                                                )}
                                                {field.currentValue.email && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Email:</td>
                                                    <td className="py-1.5 text-gray-900">{field.currentValue.email}</td>
                                                  </tr>
                                                )}
                                                {field.currentValue.telephone && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Telephone:</td>
                                                    <td className="py-1.5 text-gray-900">{field.currentValue.telephone}</td>
                                                  </tr>
                                                )}
                                                {field.currentValue.department && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Department:</td>
                                                    <td className="py-1.5 text-gray-900">{field.currentValue.department}</td>
                                                  </tr>
                                                )}
                                                {field.currentValue.website && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Website:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <a href={field.currentValue.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline break-all">
                                                        {field.currentValue.website}
                                                      </a>
                                                    </td>
                                                  </tr>
                                                )}
                                                {field.currentValue.mailingAddress && (
                                                  <tr className="align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Mailing Address:</td>
                                                    <td className="py-1.5 text-gray-900">{field.currentValue.mailingAddress}</td>
                                                  </tr>
                                                )}
                                              </tbody>
                                            </table>
                                          ) : (
                                            <div className="text-xs text-gray-500 italic">No existing value</div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                              }
                              
                              // Documents
                              if (field.fieldName.includes('Document') && field.documentData && Array.isArray(field.documentData)) {
                                // Document category code to name mapping
                                const getDocumentCategoryName = (code: string): string => {
                                  const categories: Record<string, string> = {
                                    'A01': 'Pre- and post-project impact appraisal',
                                    'A02': 'Objectives / Purpose of activity',
                                    'A03': 'Intended ultimate beneficiaries',
                                    'A04': 'Conditions',
                                    'A05': 'Budget',
                                    'A06': 'Summary information about contract',
                                    'A07': 'Review of project performance and evaluation',
                                    'A08': 'Results, outcomes and outputs',
                                    'A09': 'Memorandum of understanding (If agreed by all parties)',
                                    'A10': 'Tender',
                                    'A11': 'Contract',
                                    'A12': 'Activity web page',
                                    'B01': 'Annual report',
                                    'B02': 'Institutional Strategy paper',
                                    'B03': 'Country strategy paper',
                                    'B04': 'Aid Allocation Policy',
                                    'B05': 'Procurement Policy and Procedure',
                                    'B06': 'Institutional Audit Report',
                                    'B07': 'Country Audit Report',
                                    'B08': 'Exclusions Policy',
                                    'B09': 'Institutional Evaluation Report',
                                    'B10': 'Country Evaluation Report',
                                    'B11': 'Sector strategy',
                                    'B12': 'Thematic strategy',
                                    'B13': 'Country-level Memorandum of Understanding',
                                    'B14': 'Evaluations policy',
                                    'B15': 'General Terms and Conditions',
                                    'B16': 'Organisation web page',
                                    'B17': 'Country/Region web page',
                                    'B18': 'Sector web page',
                                  };
                                  return categories[code] || '';
                                };

                                // Generate XML snippet for first document (representative)
                                const firstDoc = field.documentData[0];
                                const xmlSnippet = `<document-link url="${firstDoc?.url || ''}" format="${firstDoc?.format || ''}">
  ${firstDoc?.title ? `<title>
    <narrative>${firstDoc.title}</narrative>
  </title>` : ''}
  ${firstDoc?.category_code ? `<category code="${firstDoc.category_code}" />` : ''}
  ${firstDoc?.language_code ? `<language code="${firstDoc.language_code}" />` : ''}
  ${firstDoc?.document_date ? `<document-date iso-date="${firstDoc.document_date}" />` : ''}
</document-link>${field.documentData.length > 1 ? `\n... and ${field.documentData.length - 1} more document${field.documentData.length - 1 !== 1 ? 's' : ''}` : ''}`;

                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <FileText className="h-4 w-4" />
                                      Document Details
                                    </div>

                                    {/* 3-column layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      {/* Column 1: Raw XML */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                        <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
{xmlSnippet}
                                        </pre>
                                      </div>

                                      {/* Column 2: Import Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                        <div className="space-y-3">
                                          {field.documentData.map((doc: any, docIndex: number) => (
                                            <div key={docIndex} className="border-b border-gray-100 pb-2 last:border-b-0">
                                              <table className="w-full text-xs">
                                                <tbody>
                                                  <tr className="align-top">
                                                    <td className="py-1 pr-2 font-medium text-gray-600">Title:</td>
                                                    <td className="py-1 text-gray-900">{doc.title || doc.title?.[0]?.text || 'Untitled'}</td>
                                                  </tr>
                                                  {doc.category_code && (
                                                    <tr className="align-top">
                                                      <td className="py-1 pr-2 font-medium text-gray-600">Category:</td>
                                                      <td className="py-1 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {doc.category_code}
                                                        </code>
                                                        {getDocumentCategoryName(doc.category_code) && (
                                                          <span className="ml-1.5 text-gray-600">{getDocumentCategoryName(doc.category_code)}</span>
                                                        )}
                                                      </td>
                                                    </tr>
                                                  )}
                                                  {doc.url && (
                                                    <tr className="align-top">
                                                      <td className="py-1 pr-2 font-medium text-gray-600">URL:</td>
                                                      <td className="py-1 text-gray-900 break-all">
                                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline text-xs break-all">
                                                          {doc.url}
                                                        </a>
                                                      </td>
                                                    </tr>
                                                  )}
                                                  {doc.format && (
                                                    <tr className="align-top">
                                                      <td className="py-1 pr-2 font-medium text-gray-600">Format:</td>
                                                      <td className="py-1 text-gray-900 break-all">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded break-all whitespace-normal">
                                                          {doc.format}
                                                        </code>
                                                      </td>
                                                    </tr>
                                                  )}
                                                </tbody>
                                              </table>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Column 3: Current Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                        {field.currentValue ? (
                                          <div className="space-y-3">
                                            {/* Handle both array (Document Links plural) and object (Document Link 1, 2, etc.) */}
                                            {(Array.isArray(field.currentValue) ? field.currentValue : [field.currentValue]).map((doc: any, docIndex: number) => (
                                              <div key={docIndex} className="border-b border-gray-100 pb-2 last:border-b-0">
                                                <table className="w-full text-xs">
                                                  <tbody>
                                                    <tr className="align-top">
                                                      <td className="py-1 pr-2 font-medium text-gray-600">Title:</td>
                                                      <td className="py-1 text-gray-900">{doc.title || 'Untitled'}</td>
                                                    </tr>
                                                    {doc.category_code && (
                                                      <tr className="align-top">
                                                        <td className="py-1 pr-2 font-medium text-gray-600">Category:</td>
                                                        <td className="py-1 text-gray-900">
                                                          <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                            {doc.category_code}
                                                          </code>
                                                          {getDocumentCategoryName(doc.category_code) && (
                                                            <span className="ml-1.5 text-gray-600">{getDocumentCategoryName(doc.category_code)}</span>
                                                          )}
                                                        </td>
                                                      </tr>
                                                    )}
                                                    {doc.url && (
                                                      <tr className="align-top">
                                                        <td className="py-1 pr-2 font-medium text-gray-600">URL:</td>
                                                        <td className="py-1 text-gray-900 break-all">
                                                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline text-xs break-all">
                                                            {doc.url}
                                                          </a>
                                                        </td>
                                                      </tr>
                                                    )}
                                                    {doc.format && (
                                                      <tr className="align-top">
                                                        <td className="py-1 pr-2 font-medium text-gray-600">Format:</td>
                                                        <td className="py-1 text-gray-900 break-all">
                                                          <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded break-all whitespace-normal">
                                                            {doc.format}
                                                          </code>
                                                        </td>
                                                      </tr>
                                                    )}
                                                  </tbody>
                                                </table>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No existing documents</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Tags - show both current and import tags clearly
                              if (field.isTagField) {
                                const existingTags = field.existingTags || [];
                                const importTags = field.tagData || [];

                                // Helper to format vocabulary label (IATI Tag Vocabulary codes)
                                const getVocabLabel = (vocab: string) => {
                                  if (vocab === '1') return 'Agrovoc';
                                  if (vocab === '2') return 'UN Sustainable Development Goals (SDG)';
                                  if (vocab === '3') return 'UN Sustainable Development Goals (SDG) Targets';
                                  if (vocab === '4') return 'Team Europe Initiatives';
                                  if (vocab === '99') return 'Reporting Organisation';
                                  return vocab ? `Vocabulary ${vocab}` : '';
                                };

                                // Helper to get badge color variant based on vocabulary or code
                                // All tags use shades of IATI color #135667
                                const getTagBadgeColor = (tag: any, index: number) => {
                                  const vocab = String(tag.vocabulary || '');
                                  const code = String(tag.code || '');

                                  // IATI color shades palette based on #135667
                                  const iatiShades = [
                                    'bg-[#e6f0f2] text-[#0f4552] border-[#99c3cb]',
                                    'bg-[#cce1e5] text-[#0f4552] border-[#66a5b1]',
                                    'bg-[#b3d2d8] text-[#0b3440] border-[#66a5b1]',
                                    'bg-[#99c3cb] text-[#0b3440] border-[#135667]',
                                    'bg-[#80b4be] text-white border-[#135667]',
                                    'bg-[#66a5b1] text-white border-[#0f4552]',
                                    'bg-[#4d96a4] text-white border-[#0f4552]',
                                    'bg-[#338797] text-white border-[#0b3440]',
                                    'bg-[#1a788a] text-white border-[#0b3440]',
                                    'bg-[#135667] text-white border-[#0f4552]',
                                    'bg-[#0f4552] text-white border-[#0b3440]',
                                    'bg-[#0b3440] text-white border-[#071f26]',
                                    'bg-[#e6f0f2] text-[#135667] border-[#99c3cb]',
                                    'bg-[#cce1e5] text-[#135667] border-[#66a5b1]'
                                  ];

                                  // Color based on hash of code for consistency
                                  if (code) {
                                    const hash = code.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
                                    return iatiShades[hash % iatiShades.length];
                                  }

                                  // Fallback based on index
                                  return iatiShades[index % iatiShades.length];
                                };

                                // Generate XML snippet for all tags
                                const xmlSnippet = importTags.length > 0 ? `<!--tag starts-->
${importTags.map((tag: any) => {
  const vocabularyAttr = tag.vocabulary ? ` vocabulary="${tag.vocabulary}"` : '';
  const vocabularyUriAttr = tag.vocabularyUri ? ` vocabulary-uri="${tag.vocabularyUri}"` : '';
  const codeAttr = tag.code ? ` code="${tag.code}"` : '';
  return `<tag${vocabularyAttr}${vocabularyUriAttr}${codeAttr}>
  ${tag.narrative ? `<narrative>${tag.narrative}</narrative>` : ''}
</tag>`;
}).join('\n')}
<!--tag ends-->` : '<tag />';

                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <Tag className="h-4 w-4" />
                                      Tag Details
                                    </div>

                                    {/* 3-column layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      {/* Column 1: Raw XML */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                        <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
{xmlSnippet}
                                        </pre>
                                      </div>

                                      {/* Column 2: Import Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                        {importTags.length > 0 ? (
                                          <>
                                            <table className="w-full text-xs">
                                              <tbody>
                                                {importTags.map((tag: any, idx: number) => (
                                                  <React.Fragment key={idx}>
                                                    {tag.vocabulary && (
                                                      <tr className="border-b border-gray-100 align-top">
                                                        <td className="py-1.5 pr-2 font-medium text-gray-400">Vocabulary:</td>
                                                        <td className="py-1.5 text-gray-400">
                                                          <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                            {tag.vocabulary}
                                                          </code>
                                                          <span className="ml-2">{getVocabLabel(String(tag.vocabulary))}</span>
                                                        </td>
                                                      </tr>
                                                    )}
                                                    {tag.vocabularyUri && (
                                                      <tr className="border-b border-gray-100 align-top">
                                                        <td className="py-1.5 pr-2 font-medium text-gray-600">Vocabulary URI:</td>
                                                        <td className="py-1.5 text-gray-900 break-all">{tag.vocabularyUri}</td>
                                                      </tr>
                                                    )}
                                                    {tag.code && (
                                                      <tr className="border-b border-gray-100 align-top">
                                                        <td className="py-1.5 pr-2 font-medium text-gray-400">Code:</td>
                                                        <td className="py-1.5 text-gray-400">
                                                          <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                            {tag.code}
                                                          </code>
                                                        </td>
                                                      </tr>
                                                    )}
                                                    <tr className={idx < importTags.length - 1 ? "border-b-2 border-gray-300 align-top" : "align-top"}>
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Narrative:</td>
                                                      <td className="py-1.5 text-gray-900">{tag.narrative || '—'}</td>
                                                    </tr>
                                                  </React.Fragment>
                                                ))}
                                              </tbody>
                                            </table>
                                            <div className="mt-2 text-xs text-gray-500 italic">
                                              Note: Grayed-out fields are recognized but not currently imported by the system
                                            </div>
                                          </>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No tags to import</div>
                                        )}
                                      </div>

                                      {/* Column 3: Current Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                        {(() => {
                                          // Find matching existing tag based on import tag's vocabulary and code
                                          const importTag = importTags[0]; // The tag being imported for this row
                                          const matchingTag = importTag ? existingTags.find((t: any) => 
                                            String(t.vocabulary) === String(importTag.vocabulary) && 
                                            String(t.code) === String(importTag.code)
                                          ) : null;
                                          
                                          if (matchingTag) {
                                            return (
                                              <table className="w-full text-xs">
                                                <tbody>
                                                  {matchingTag.vocabulary && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-400">Vocabulary:</td>
                                                      <td className="py-1.5 text-gray-400">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {matchingTag.vocabulary}
                                                        </code>
                                                        <span className="ml-2">{getVocabLabel(String(matchingTag.vocabulary))}</span>
                                                      </td>
                                                    </tr>
                                                  )}
                                                  {matchingTag.vocabulary_uri && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Vocabulary URI:</td>
                                                      <td className="py-1.5 text-gray-900 break-all">{matchingTag.vocabulary_uri}</td>
                                                    </tr>
                                                  )}
                                                  {matchingTag.code && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-400">Code:</td>
                                                      <td className="py-1.5 text-gray-400">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {matchingTag.code}
                                                        </code>
                                                      </td>
                                                    </tr>
                                                  )}
                                                  <tr className="align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Narrative:</td>
                                                    <td className="py-1.5 text-gray-900">{matchingTag.name || matchingTag.narrative || '—'}</td>
                                                  </tr>
                                                </tbody>
                                              </table>
                                            );
                                          } else {
                                            return <div className="text-xs text-gray-500 italic">No matching existing tag</div>;
                                          }
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Locations
                              if (field.isLocationItem && field.locationData) {
                                const loc = field.locationData;

                                // Generate XML snippet for display
                                const xmlSnippet = `<location>
  ${loc.name ? `<name>
    <narrative>${loc.name}</narrative>
  </name>` : ''}
  ${loc.latitude && loc.longitude ? `<point srsName="http://www.opengis.net/def/crs/EPSG/0/4326">
    <pos>${loc.latitude} ${loc.longitude}</pos>
  </point>` : ''}
  ${loc.country_code ? `<location-reach code="${loc.country_code}" />` : ''}
  ${loc.location_type_code ? `<location-class code="${loc.location_type_code}" />` : ''}
</location>`;

                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      Location Details
                                    </div>

                                    {/* 3-column layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      {/* Column 1: Raw XML */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                        <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
{xmlSnippet}
                                        </pre>
                                      </div>

                                      {/* Column 2: Import Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                        <table className="w-full text-xs">
                                          <tbody>
                                            {loc.name && (
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Name:</td>
                                                <td className="py-1.5 text-gray-900">{loc.name}</td>
                                              </tr>
                                            )}
                                            {loc.latitude && (
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Latitude:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {loc.latitude}
                                                  </code>
                                                </td>
                                              </tr>
                                            )}
                                            {loc.longitude && (
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Longitude:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {loc.longitude}
                                                  </code>
                                                </td>
                                              </tr>
                                            )}
                                            {loc.country_code && (
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Country:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {loc.country_code}
                                                  </code>
                                                </td>
                                              </tr>
                                            )}
                                            {loc.location_type_code && (
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Type:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {loc.location_type_code}
                                                  </code>
                                                </td>
                                              </tr>
                                            )}
                                            {loc.address && (
                                              <tr className="align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Address:</td>
                                                <td className="py-1.5 text-gray-900">{loc.address}</td>
                                              </tr>
                                            )}
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* Column 3: Current Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                        {field.currentValue ? (
                                          <table className="w-full text-xs">
                                            <tbody>
                                              {field.currentValue.name && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Name:</td>
                                                  <td className="py-1.5 text-gray-900">{field.currentValue.name}</td>
                                                </tr>
                                              )}
                                              {field.currentValue.latitude && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Latitude:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {field.currentValue.latitude}
                                                    </code>
                                                  </td>
                                                </tr>
                                              )}
                                              {field.currentValue.longitude && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Longitude:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {field.currentValue.longitude}
                                                    </code>
                                                  </td>
                                                </tr>
                                              )}
                                              {field.currentValue.country_code && (
                                                <tr className="align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Country:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {field.currentValue.country_code}
                                                    </code>
                                                  </td>
                                                </tr>
                                              )}
                                            </tbody>
                                          </table>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No existing value</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Financial Items (Budgets, Transactions, Planned Disbursements, Country Budget Items)
                              if (field.itemData && field.isFinancialItem) {
                                const item = field.itemData;
                                const itemLabel = field.itemType === 'budget' ? 'Budget' :
                                                 field.itemType === 'transaction' ? 'Transaction' :
                                                 field.itemType === 'plannedDisbursement' ? 'Planned Disbursement' :
                                                 field.itemType === 'countryBudgetItems' ? 'Country Budget Items' :
                                                 'Financial Item';

                                // Generate XML snippet based on item type
                                // Use stored rawXml if available (preserves exact XML fragment), otherwise generate
                                let xmlSnippet = '';

                                // Check if item has rawXml property (from parser)
                                if (item.rawXml) {
                                  xmlSnippet = item.rawXml;
                                } else if (field.itemType === 'budget') {
                                  xmlSnippet = `<budget type="${item.type || ''}" status="${item.status || ''}">
  <period-start iso-date="${item.period?.start || item.start || ''}" />
  <period-end iso-date="${item.period?.end || item.end || ''}" />
  <value currency="${item.currency || ''}" value-date="${item.value_date || ''}">${item.value || ''}</value>
</budget>`;
                                } else if (field.itemType === 'countryBudgetItems') {
                                  // Generate XML for country budget items
                                  const budgetItems = item.budget_items || [];
                                  xmlSnippet = `<!--country-budget-items starts-->
<country-budget-items vocabulary="${item.vocabulary || ''}">
${budgetItems.map((bi: any) => `  <budget-item code="${bi.code || ''}"${bi.percentage ? ` percentage="${bi.percentage}"` : ''}>
    <description>
      <narrative>${bi.description || ''}</narrative>
    </description>
  </budget-item>`).join('\n')}
</country-budget-items>
<!--country-budget-items ends-->`;
                                } else if (field.itemType === 'transaction') {
                                  xmlSnippet = `<transaction>
  <transaction-type code="${item.transaction_type || item.type || ''}" />
  <transaction-date iso-date="${item.transaction_date || item.date || ''}" />
  <value currency="${item.currency || ''}" value-date="${item.value_date || item.valueDate || ''}">${item.value || ''}</value>
</transaction>`;
                                } else if (field.itemType === 'plannedDisbursement') {
                                  xmlSnippet = `<planned-disbursement type="${item.type || ''}">
  <period-start iso-date="${item.period?.start || item.start || ''}" />
  <period-end iso-date="${item.period?.end || item.end || ''}" />
  <value currency="${item.currency || ''}" value-date="${item.value_date || ''}">${item.value || ''}</value>
</planned-disbursement>`;
                                }

                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <DollarSign className="h-4 w-4" />
                                      {itemLabel} Details
                                    </div>

                                    {/* 3-column layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      {/* Column 1: Raw XML */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                        <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
{xmlSnippet}
                                        </pre>
                                      </div>

                                      {/* Column 2: Import Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                        {field.itemType === 'countryBudgetItems' ? (
                                          // Special display for country budget items - show each mapping as a complete row
                                          <table className="w-full text-xs">
                                            <tbody>
                                              {item.budget_items && item.budget_items.map((bi: any, biIdx: number) => (
                                                <React.Fragment key={biIdx}>
                                                  {item.vocabulary && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Vocabulary:</td>
                                                      <td className="py-1.5 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {item.vocabulary}
                                                        </code>
                                                        <span className="ml-2">
                                                          {item.vocabulary === '1' ? 'IATI' :
                                                           item.vocabulary === '2' ? 'COFOG' :
                                                           item.vocabulary === '3' ? 'COFOG (2014)' :
                                                           item.vocabulary === '4' ? 'COFOG' :
                                                           item.vocabulary === '99' ? 'Reporting Organisation' : ''}
                                                        </span>
                                                      </td>
                                                    </tr>
                                                  )}
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Item Code:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {bi.code}
                                                      </code>
                                                    </td>
                                                  </tr>
                                                  {bi.percentage !== undefined && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">% of Activity Budget:</td>
                                                      <td className="py-1.5 text-gray-900">{bi.percentage}%</td>
                                                    </tr>
                                                  )}
                                                  <tr className={biIdx < item.budget_items.length - 1 ? "border-b-2 border-gray-300 align-top" : "align-top"}>
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Description:</td>
                                                    <td className="py-1.5 text-gray-900">{bi.description || '—'}</td>
                                                  </tr>
                                                </React.Fragment>
                                              ))}
                                            </tbody>
                                          </table>
                                        ) : (
                                          // Transaction-specific display: Amount, Transaction Date, Value Date, Type, Provider Org, Receiver Org
                                          field.itemType === 'transaction' ? (
                                            <table className="w-full text-xs">
                                              <tbody>
                                                {item.value !== undefined && item.currency && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Amount:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {item.currency}
                                                      </code>
                                                      <span className="ml-2">{item.value?.toLocaleString()}</span>
                                                    </td>
                                                  </tr>
                                                )}
                                                {(item.transaction_date || item.date) && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Transaction Date:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {item.transaction_date || item.date}
                                                      </code>
                                                    </td>
                                                  </tr>
                                                )}
                                                {(item.value_date || item.valueDate) && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Value Date:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {item.value_date || item.valueDate}
                                                      </code>
                                                    </td>
                                                  </tr>
                                                )}
                                                {(item.transaction_type || item.type) && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Type:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {item.transaction_type || item.type}
                                                      </code>
                                                      {(item.transaction_type_name || item.typeName) && (
                                                        <span className="ml-2">{item.transaction_type_name || item.typeName}</span>
                                                      )}
                                                    </td>
                                                  </tr>
                                                )}
                                                {(item.providerOrg?.ref || item.providerOrg?.name) && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Provider organisation:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      {item.providerOrg?.ref ? (
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {item.providerOrg.ref}
                                                        </code>
                                                      ) : (
                                                        <span className="text-gray-500 italic">No ref</span>
                                                      )}
                                                    </td>
                                                  </tr>
                                                )}
                                                {(item.receiverOrg?.ref || item.receiverOrg?.name) && (
                                                  <tr className="align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Receiver organisation:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      {item.receiverOrg?.ref ? (
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {item.receiverOrg.ref}
                                                        </code>
                                                      ) : (
                                                        <span className="text-gray-500 italic">No ref</span>
                                                      )}
                                                    </td>
                                                  </tr>
                                                )}
                                              </tbody>
                                            </table>
                                          ) : (
                                            // Regular display for budgets, planned disbursements
                                          <table className="w-full text-xs">
                                          <tbody>
                                            {item.value !== undefined && item.currency && (
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Amount:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {item.currency}
                                                  </code>
                                                  <span className="ml-2">{item.value?.toLocaleString()}</span>
                                                </td>
                                              </tr>
                                            )}
                                            {(item.period?.start || item.start) && (
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Start:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {item.period?.start || item.start}
                                                  </code>
                                                </td>
                                              </tr>
                                            )}
                                            {(item.period?.end || item.end) && (
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">End:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {item.period?.end || item.end}
                                                  </code>
                                                </td>
                                              </tr>
                                            )}
                                            {(item.transaction_date || item.date) && (
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Transaction Date:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {item.transaction_date || item.date}
                                                  </code>
                                                </td>
                                              </tr>
                                            )}
                                            {(item.value_date || item.valueDate) && (
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Value Date:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {item.value_date || item.valueDate}
                                                  </code>
                                                </td>
                                              </tr>
                                            )}
                                            {item.status && (
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Status:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {item.status}
                                                  </code>
                                                  {item.statusName && (
                                                    <span className="ml-2">{item.statusName}</span>
                                                  )}
                                                </td>
                                              </tr>
                                            )}
                                            {item.type && (
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Type:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {item.type}
                                                  </code>
                                                  {item.typeName && (
                                                    <span className="ml-2">{item.typeName}</span>
                                                  )}
                                                </td>
                                              </tr>
                                            )}
                                            {item.transaction_type && (
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Transaction Type:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {item.transaction_type}
                                                  </code>
                                                  {item.transaction_type_name && (
                                                    <span className="ml-2">{item.transaction_type_name}</span>
                                                  )}
                                                </td>
                                              </tr>
                                            )}
                                            {(item.providerOrg?.ref || item.providerOrg?.name) && (
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Provider organisation:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  {item.providerOrg?.ref ? (
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {item.providerOrg.ref}
                                                    </code>
                                                  ) : (
                                                    <span className="text-gray-500 italic">No ref</span>
                                                  )}
                                                </td>
                                              </tr>
                                            )}
                                            {(item.receiverOrg?.ref || item.receiverOrg?.name) && (
                                              <tr className="align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Receiver organisation:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  {item.receiverOrg?.ref ? (
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {item.receiverOrg.ref}
                                                    </code>
                                                  ) : (
                                                    <span className="text-gray-500 italic">No ref</span>
                                                  )}
                                                </td>
                                              </tr>
                                            )}
                                          </tbody>
                                        </table>
                                          )
                                        )}
                                      </div>

                                      {/* Column 3: Current Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                        {field.currentValue ? (
                                          // Country Budget Items-specific display
                                          field.itemType === 'countryBudgetItems' && field.currentValue.budget_items ? (
                                            <table className="w-full text-xs">
                                              <tbody>
                                                {field.currentValue.budget_items && field.currentValue.budget_items.map((bi: any, biIdx: number) => (
                                                  <React.Fragment key={biIdx}>
                                                    {field.currentValue.vocabulary && (
                                                      <tr className="border-b border-gray-100 align-top">
                                                        <td className="py-1.5 pr-2 font-medium text-gray-600">Vocabulary:</td>
                                                        <td className="py-1.5 text-gray-900">
                                                          <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                            {field.currentValue.vocabulary}
                                                          </code>
                                                          <span className="ml-2">
                                                            {field.currentValue.vocabularyLabel || 
                                                             (field.currentValue.vocabulary === '1' ? 'IATI' :
                                                              field.currentValue.vocabulary === '2' ? 'COFOG' :
                                                              field.currentValue.vocabulary === '3' ? 'COFOG (2014)' :
                                                              field.currentValue.vocabulary === '4' ? 'COFOG' :
                                                              field.currentValue.vocabulary === '99' ? 'Reporting Organisation' : '')}
                                                          </span>
                                                        </td>
                                                      </tr>
                                                    )}
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Item Code:</td>
                                                      <td className="py-1.5 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {bi.code}
                                                        </code>
                                                      </td>
                                                    </tr>
                                                    {bi.percentage !== undefined && (
                                                      <tr className="border-b border-gray-100 align-top">
                                                        <td className="py-1.5 pr-2 font-medium text-gray-600">% of Activity Budget:</td>
                                                        <td className="py-1.5 text-gray-900">{bi.percentage}%</td>
                                                      </tr>
                                                    )}
                                                    <tr className={biIdx < field.currentValue.budget_items.length - 1 ? "border-b-2 border-gray-300 align-top" : "align-top"}>
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Description:</td>
                                                      <td className="py-1.5 text-gray-900">{bi.description || '—'}</td>
                                                    </tr>
                                                  </React.Fragment>
                                                ))}
                                              </tbody>
                                            </table>
                                          ) :
                                          // Transaction-specific display: Amount, Transaction Date, Value Date, Type, Provider Org, Receiver Org
                                          field.itemType === 'transaction' ? (
                                            <table className="w-full text-xs">
                                              <tbody>
                                                {(field.currentValue.value !== undefined || field.currentValue.currency) && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Amount:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      {field.currentValue.currency && (
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {field.currentValue.currency}
                                                        </code>
                                                      )}
                                                      {field.currentValue.value !== undefined && (
                                                        <span className={field.currentValue.currency ? "ml-2" : ""}>
                                                          {field.currentValue.value?.toLocaleString()}
                                                        </span>
                                                      )}
                                                      {field.currentValue.value === undefined && !field.currentValue.currency && (
                                                        <span className="text-gray-500 italic">No value</span>
                                                      )}
                                                    </td>
                                                  </tr>
                                                )}
                                                {field.currentValue.transaction_date && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Transaction Date:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {field.currentValue.transaction_date}
                                                      </code>
                                                    </td>
                                                  </tr>
                                                )}
                                                {field.currentValue.value_date && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Value Date:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {field.currentValue.value_date}
                                                      </code>
                                                    </td>
                                                  </tr>
                                                )}
                                                {(field.currentValue.transaction_type || field.currentValue.type) && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Type:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {field.currentValue.transaction_type || field.currentValue.type}
                                                      </code>
                                                      {(field.currentValue.transaction_type_name || field.currentValue.typeName) && (
                                                        <span className="ml-2">{field.currentValue.transaction_type_name || field.currentValue.typeName}</span>
                                                      )}
                                                    </td>
                                                  </tr>
                                                )}
                                                {(field.currentValue.provider_org_ref || field.currentValue.provider_org_name) && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Provider organisation:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      {field.currentValue.provider_org_ref ? (
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {field.currentValue.provider_org_ref}
                                                        </code>
                                                      ) : (
                                                        <span className="text-gray-500 italic">No ref</span>
                                                      )}
                                                    </td>
                                                  </tr>
                                                )}
                                                {(field.currentValue.receiver_org_ref || field.currentValue.receiver_org_name) && (
                                                  <tr className="align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Receiver organisation:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      {field.currentValue.receiver_org_ref ? (
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {field.currentValue.receiver_org_ref}
                                                        </code>
                                                      ) : (
                                                        <span className="text-gray-500 italic">No ref</span>
                                                      )}
                                                    </td>
                                                  </tr>
                                                )}
                                              </tbody>
                                            </table>
                                          ) : (
                                            // Regular display for budgets, planned disbursements
                                          <table className="w-full text-xs">
                                            <tbody>
                                              {field.currentValue.value !== undefined && field.currentValue.currency && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Amount:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {field.currentValue.currency}
                                                    </code>
                                                    <span className="ml-2">{field.currentValue.value?.toLocaleString()}</span>
                                                  </td>
                                                </tr>
                                              )}
                                              {(field.currentValue.period?.start || field.currentValue.start) && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Start:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {field.currentValue.period?.start || field.currentValue.start}
                                                    </code>
                                                  </td>
                                                </tr>
                                              )}
                                              {(field.currentValue.period?.end || field.currentValue.end) && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">End:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {field.currentValue.period?.end || field.currentValue.end}
                                                    </code>
                                                  </td>
                                                </tr>
                                              )}
                                              {field.currentValue.transaction_date && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Transaction Date:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {field.currentValue.transaction_date}
                                                    </code>
                                                  </td>
                                                </tr>
                                              )}
                                              {field.currentValue.value_date && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Value Date:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {field.currentValue.value_date}
                                                    </code>
                                                  </td>
                                                </tr>
                                              )}
                                              {field.currentValue.status !== undefined && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Status:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {field.currentValue.status}
                                                    </code>
                                                    {field.currentValue.statusName && (
                                                      <span className="ml-2">{field.currentValue.statusName}</span>
                                                    )}
                                                  </td>
                                                </tr>
                                              )}
                                              {field.currentValue.transaction_type !== undefined && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Transaction Type:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {field.currentValue.transaction_type}
                                                    </code>
                                                    {field.currentValue.transaction_type_name && (
                                                      <span className="ml-2">{field.currentValue.transaction_type_name}</span>
                                                    )}
                                                  </td>
                                                </tr>
                                              )}
                                              {(field.currentValue.type || field.currentValue.typeName) && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Type:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {field.currentValue.type}
                                                    </code>
                                                    {field.currentValue.typeName && (
                                                      <span className="ml-2">{field.currentValue.typeName}</span>
                                                    )}
                                                  </td>
                                                </tr>
                                              )}
                                              {(field.currentValue.provider_org_ref || field.currentValue.provider_org_name) && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Provider organisation:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    {field.currentValue.provider_org_ref ? (
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {field.currentValue.provider_org_ref}
                                                      </code>
                                                    ) : (
                                                      <span className="text-gray-500 italic">No ref</span>
                                                    )}
                                                  </td>
                                                </tr>
                                              )}
                                              {(field.currentValue.receiver_org_ref || field.currentValue.receiver_org_name) && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Receiver organisation:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    {field.currentValue.receiver_org_ref ? (
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {field.currentValue.receiver_org_ref}
                                                      </code>
                                                    ) : (
                                                      <span className="text-gray-500 italic">No ref</span>
                                                    )}
                                                  </td>
                                                </tr>
                                              )}
                                            </tbody>
                                          </table>
                                          )
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No existing value</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Policy Markers
                              if (field.isPolicyMarker && field.policyMarkerData) {
                                const pm = field.policyMarkerData;

                                // Helper function to get vocabulary name from code
                                const getVocabularyName = (vocabCode: string): string => {
                                  const vocabularyNames: Record<string, string> = {
                                    '1': 'OECD DAC CRS',
                                    '99': 'Reporting Organisation'
                                  };
                                  return vocabularyNames[vocabCode] || vocabCode;
                                };

                                // Helper function to get policy marker name
                                const getPolicyMarkerName = (code: string): string => {
                                  const policyMarkerNames: Record<string, string> = {
                                    '1': 'Gender Equality',
                                    '2': 'Aid to Environment',
                                    '3': 'Participatory Development/Good Governance',
                                    '4': 'Trade Development',
                                    '5': 'Aid Targeting the Objectives of the Convention on Biological Diversity',
                                    '6': 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Mitigation',
                                    '7': 'Aid Targeting the Objectives of the Framework Convention on Climate Change - Adaptation',
                                    '8': 'Aid Targeting the Objectives of the Convention to Combat Desertification',
                                    '9': 'Reproductive, Maternal, Newborn and Child Health (RMNCH)',
                                    '10': 'Disaster Risk Reduction (DRR)',
                                    '11': 'Disability',
                                    '12': 'Nutrition'
                                  };
                                  return policyMarkerNames[code] || 'Unknown';
                                };

                                // Helper function to get significance name
                                const getSignificanceName = (sigCode: string): string => {
                                  const significanceNames: Record<string, string> = {
                                    '0': 'Not targeted',
                                    '1': 'Significant objective',
                                    '2': 'Principal objective',
                                    '3': 'Principal objective AND in support of an action programme',
                                    '4': 'Explicit primary objective'
                                  };
                                  return significanceNames[sigCode] || sigCode;
                                };

                                // Generate XML snippet for display
                                const xmlSnippet = `<policy-marker vocabulary="${pm.vocabulary || '1'}" code="${pm.code || ''}" significance="${pm.significance || ''}" />`;

                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <Tag className="h-4 w-4" />
                                      Policy Marker Details
                                    </div>

                                    {/* 3-column layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      {/* Column 1: Raw XML */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                        <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
{xmlSnippet}
                                        </pre>
                                      </div>

                                      {/* Column 2: Import Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                        <table className="w-full text-xs">
                                          <tbody>
                                            <tr className="border-b border-gray-100 align-top">
                                              <td className="py-1.5 pr-2 font-medium text-gray-600">Vocabulary:</td>
                                              <td className="py-1.5 text-gray-900">
                                                <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded mr-2">
                                                  {pm.vocabulary || '1'}
                                                </code>
                                                <span className="text-gray-700">{getVocabularyName(pm.vocabulary || '1')}</span>
                                              </td>
                                            </tr>
                                            {pm.code && (
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Code:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded mr-2">
                                                    {pm.code}
                                                  </code>
                                                  <span className="text-gray-700">{getPolicyMarkerName(pm.code)}</span>
                                                </td>
                                              </tr>
                                            )}
                                            {pm.significance && (
                                              <tr className="align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Significance:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded mr-2">
                                                    {pm.significance}
                                                  </code>
                                                  <span className="text-gray-700">{getSignificanceName(pm.significance)}</span>
                                                </td>
                                              </tr>
                                            )}
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* Column 3: Current Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                        {field.currentValue ? (
                                          <table className="w-full text-xs">
                                            <tbody>
                                              {field.currentValue.vocabulary && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Vocabulary:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded mr-2">
                                                      {field.currentValue.vocabulary}
                                                    </code>
                                                    <span className="text-gray-700">{getVocabularyName(field.currentValue.vocabulary)}</span>
                                                  </td>
                                                </tr>
                                              )}
                                              {field.currentValue.code && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Code:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded mr-2">
                                                      {field.currentValue.code}
                                                    </code>
                                                    <span className="text-gray-700">{getPolicyMarkerName(field.currentValue.code)}</span>
                                                  </td>
                                                </tr>
                                              )}
                                              {field.currentValue.significance && (
                                                <tr className="align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Significance:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded mr-2">
                                                      {field.currentValue.significance}
                                                    </code>
                                                    <span className="text-gray-700">{getSignificanceName(field.currentValue.significance)}</span>
                                                  </td>
                                                </tr>
                                              )}
                                            </tbody>
                                          </table>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No existing value</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Conditions
                              if (field.isConditionsField && field.conditionsData) {
                                const cond = field.conditionsData;
                                const conditionCount = cond.conditions && Array.isArray(cond.conditions) ? cond.conditions.length : 0;

                                // Helper to get condition type label
                                const getTypeLabel = (type: string) => {
                                  if (type === '1') return 'Policy';
                                  if (type === '2') return 'Performance';
                                  if (type === '3') return 'Fiduciary';
                                  return `Type ${type}`;
                                };

                                // Generate XML snippet for conditions
                                const xmlSnippet = `<!--conditions starts-->
<conditions attached="${cond.attached ? '1' : '0'}">
${cond.conditions && cond.conditions.map((condition: any, idx: number) => {
  // Handle multiple narratives with languages
  const narratives = condition.narrative || {};
  const narrativeLines = Object.entries(narratives).map(([lang, text]) => {
    if (lang === 'en' || !lang) {
      return `   <narrative>${text}</narrative>`;
    }
    return `   <narrative xml:lang="${lang}">${text}</narrative>`;
  }).join('\n');

  return ` <condition type="${condition.type}">
${narrativeLines}
 </condition>`;
}).join('\n')}
</conditions>
<!--conditions ends-->`;

                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <AlertCircle className="h-4 w-4" />
                                      Conditions Details
                                    </div>

                                    {/* 3-column layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      {/* Column 1: Raw XML */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                        <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
{xmlSnippet}
                                        </pre>
                                      </div>

                                      {/* Column 2: Import Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                        <table className="w-full text-xs">
                                          <tbody>
                                            <tr className="border-b border-gray-100 align-top">
                                              <td className="py-1.5 pr-2 font-medium text-gray-600">Conditions:</td>
                                              <td className="py-1.5 text-gray-900">
                                                <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                  {cond.attached ? '1' : '0'}
                                                </code>
                                                <span className="ml-2">{cond.attached ? 'Yes' : 'No'}</span>
                                              </td>
                                            </tr>
                                            {conditionCount > 0 && cond.conditions.map((condition: any, idx: number) => {
                                              // Get all narratives with their languages
                                              const narratives = condition.narrative || {};
                                              const narrativeEntries = Object.entries(narratives);

                                              return (
                                                <tr key={idx} className={idx < conditionCount - 1 ? "border-b border-gray-100 align-top" : "align-top"}>
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">
                                                    Condition Type:
                                                  </td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {condition.type}
                                                    </code>
                                                    <span className="ml-2">{getTypeLabel(condition.type)}</span>
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                            {conditionCount > 0 && cond.conditions.map((condition: any, idx: number) => {
                                              // Get all narratives with their languages
                                              const narratives = condition.narrative || {};
                                              const narrativeEntries = Object.entries(narratives);

                                              // Return separate rows for each narrative language
                                              return narrativeEntries.map(([lang, text], nIdx) => {
                                                // Gray out non-English narratives as system can't accept them yet
                                                const isNonEnglish = lang && lang !== 'en';
                                                const isLastNarrative = idx === conditionCount - 1 && nIdx === narrativeEntries.length - 1;

                                                return (
                                                  <tr key={`narrative-${idx}-${lang}`} className={isLastNarrative ? "align-top" : "border-b border-gray-100 align-top"}>
                                                    <td className={`py-1.5 pr-2 font-medium ${isNonEnglish ? 'text-gray-400' : 'text-gray-600'}`}>
                                                      {isNonEnglish ? `Narrative (${lang.toUpperCase()}):` : 'Narrative:'}
                                                    </td>
                                                    <td className={`py-1.5 ${isNonEnglish ? 'text-gray-400' : 'text-gray-900'}`}>
                                                      {text || <span className="text-gray-500 italic">No description</span>}
                                                    </td>
                                                  </tr>
                                                );
                                              });
                                            })}
                                          </tbody>
                                        </table>
                                        {/* Check if there are any non-English narratives to show the note */}
                                        {conditionCount > 0 && cond.conditions.some((condition: any) => {
                                          const narratives = condition.narrative || {};
                                          return Object.keys(narratives).some(lang => lang && lang !== 'en');
                                        }) && (
                                          <div className="mt-2 text-xs text-gray-500 italic">
                                            Note: Grayed-out languages are recognized but not currently imported by the system
                                          </div>
                                        )}
                                      </div>

                                      {/* Column 3: Current Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                        {field.currentConditionsData ? (
                                          <table className="w-full text-xs">
                                            <tbody>
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Conditions:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {field.currentConditionsData.attached ? '1' : '0'}
                                                  </code>
                                                  <span className="ml-2">{field.currentConditionsData.attached ? 'Yes' : 'No'}</span>
                                                </td>
                                              </tr>
                                              {field.currentConditionsData.conditions.map((condition: any, idx: number) => (
                                                <tr key={idx} className={idx < field.currentConditionsData.conditions.length - 1 ? "border-b border-gray-100 align-top" : "align-top"}>
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">
                                                    Condition Type:
                                                  </td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {condition.type}
                                                    </code>
                                                    <span className="ml-2">{getTypeLabel(condition.type)}</span>
                                                  </td>
                                                </tr>
                                              ))}
                                              {field.currentConditionsData.conditions.map((condition: any, idx: number) => {
                                                // Get all narratives with their languages from JSONB
                                                const narratives = condition.narrative || {};
                                                const narrativeEntries = Object.entries(narratives);

                                                // Return separate rows for each narrative language
                                                return narrativeEntries.map(([lang, text], nIdx) => {
                                                  const isNonEnglish = lang && lang !== 'en';
                                                  const isLastNarrative = idx === field.currentConditionsData.conditions.length - 1 && nIdx === narrativeEntries.length - 1;

                                                  return (
                                                    <tr key={`current-narrative-${idx}-${lang}`} className={isLastNarrative ? "align-top" : "border-b border-gray-100 align-top"}>
                                                      <td className={`py-1.5 pr-2 font-medium ${isNonEnglish ? 'text-gray-400' : 'text-gray-600'}`}>
                                                        {isNonEnglish ? `Narrative (${lang.toUpperCase()}):` : 'Narrative:'}
                                                      </td>
                                                      <td className={`py-1.5 ${isNonEnglish ? 'text-gray-400' : 'text-gray-900'}`}>
                                                        {text || <span className="text-gray-500 italic">No description</span>}
                                                      </td>
                                                    </tr>
                                                  );
                                                });
                                              })}
                                            </tbody>
                                          </table>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No existing conditions</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              // DAC CRS Reporting - show all CRS data in table
                              if (field.isCrsField && field.crsData) {
                                const crsData = field.crsData;
                                const xmlSnippet = extractXmlSnippet(field.iatiPath);
                                const sectionTitle = field.fieldName === 'Financing Terms' ? 'Financing Terms' : 'DAC CRS Reporting Details';

                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <DollarSign className="h-4 w-4" />
                                      {sectionTitle}
                                    </div>

                                    {/* 3-column layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      {/* Column 1: Raw XML */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                        <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
{xmlSnippet}
                                        </pre>
                                      </div>

                                      {/* Column 2: Import Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                        <table className="w-full text-xs">
                                          <tbody>
                                            {crsData.channel_code && (
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Channel Code:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {crsData.channel_code}
                                                  </code>
                                                </td>
                                              </tr>
                                            )}
                                            {crsData.loanTerms && (
                                              <React.Fragment>
                                                {crsData.loanTerms.rate_1 !== undefined && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Rate 1:</td>
                                                    <td className="py-1.5 text-gray-900">{crsData.loanTerms.rate_1}%</td>
                                                  </tr>
                                                )}
                                                {crsData.loanTerms.rate_2 !== undefined && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Rate 2:</td>
                                                    <td className="py-1.5 text-gray-900">{crsData.loanTerms.rate_2}%</td>
                                                  </tr>
                                                )}
                                                {crsData.loanTerms.repayment_type_code && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Repayment Type:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {crsData.loanTerms.repayment_type_code}
                                                      </code>
                                                    </td>
                                                  </tr>
                                                )}
                                                {crsData.loanTerms.repayment_plan_code && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Repayment Plan:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {crsData.loanTerms.repayment_plan_code}
                                                      </code>
                                                    </td>
                                                  </tr>
                                                )}
                                                {crsData.loanTerms.commitment_date && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Commitment Date:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {crsData.loanTerms.commitment_date}
                                                      </code>
                                                    </td>
                                                  </tr>
                                                )}
                                                {crsData.loanTerms.repayment_first_date && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Repayment First Date:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {crsData.loanTerms.repayment_first_date}
                                                      </code>
                                                    </td>
                                                  </tr>
                                                )}
                                                {crsData.loanTerms.repayment_final_date && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Repayment Final Date:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {crsData.loanTerms.repayment_final_date}
                                                      </code>
                                                    </td>
                                                  </tr>
                                                )}
                                              </React.Fragment>
                                            )}
                                            {crsData.loanStatuses && crsData.loanStatuses.length > 0 && (
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Loan Statuses:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  {crsData.loanStatuses.length} year(s) of loan status data
                                                </td>
                                              </tr>
                                            )}
                                            {crsData.other_flags && crsData.other_flags.length > 0 && crsData.other_flags.map((flag: any, idx: number) => (
                                              <React.Fragment key={idx}>
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Other Flags Code:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {flag.code}
                                                    </code>
                                                  </td>
                                                </tr>
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Significance:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {flag.significance}
                                                    </code>
                                                  </td>
                                                </tr>
                                              </React.Fragment>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* Column 3: Current Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                        {field.currentCrsData ? (
                                          <table className="w-full text-xs">
                                            <tbody>
                                              {field.currentCrsData.channel_code && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Channel Code:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {field.currentCrsData.channel_code}
                                                    </code>
                                                  </td>
                                                </tr>
                                              )}
                                              {field.currentCrsData.loanTerms && (
                                                <React.Fragment>
                                                  {field.currentCrsData.loanTerms.rate_1 !== null && field.currentCrsData.loanTerms.rate_1 !== undefined && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Rate 1:</td>
                                                      <td className="py-1.5 text-gray-900">{field.currentCrsData.loanTerms.rate_1}%</td>
                                                    </tr>
                                                  )}
                                                  {field.currentCrsData.loanTerms.rate_2 !== null && field.currentCrsData.loanTerms.rate_2 !== undefined && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Rate 2:</td>
                                                      <td className="py-1.5 text-gray-900">{field.currentCrsData.loanTerms.rate_2}%</td>
                                                    </tr>
                                                  )}
                                                  {field.currentCrsData.loanTerms.repayment_type_code && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Repayment Type:</td>
                                                      <td className="py-1.5 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {field.currentCrsData.loanTerms.repayment_type_code}
                                                        </code>
                                                      </td>
                                                    </tr>
                                                  )}
                                                  {field.currentCrsData.loanTerms.repayment_plan_code && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Repayment Plan:</td>
                                                      <td className="py-1.5 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {field.currentCrsData.loanTerms.repayment_plan_code}
                                                        </code>
                                                      </td>
                                                    </tr>
                                                  )}
                                                  {field.currentCrsData.loanTerms.commitment_date && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Commitment Date:</td>
                                                      <td className="py-1.5 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {field.currentCrsData.loanTerms.commitment_date}
                                                        </code>
                                                      </td>
                                                    </tr>
                                                  )}
                                                  {field.currentCrsData.loanTerms.repayment_first_date && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Repayment First Date:</td>
                                                      <td className="py-1.5 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {field.currentCrsData.loanTerms.repayment_first_date}
                                                        </code>
                                                      </td>
                                                    </tr>
                                                  )}
                                                  {field.currentCrsData.loanTerms.repayment_final_date && (
                                                    <tr className="border-b border-gray-100 align-top">
                                                      <td className="py-1.5 pr-2 font-medium text-gray-600">Repayment Final Date:</td>
                                                      <td className="py-1.5 text-gray-900">
                                                        <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                          {field.currentCrsData.loanTerms.repayment_final_date}
                                                        </code>
                                                      </td>
                                                    </tr>
                                                  )}
                                                </React.Fragment>
                                              )}
                                              {field.currentCrsData.loanStatuses && field.currentCrsData.loanStatuses.length > 0 && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600">Loan Statuses:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    {field.currentCrsData.loanStatuses.length} year(s) of loan status data
                                                  </td>
                                                </tr>
                                              )}
                                              {field.currentCrsData.otherFlags && field.currentCrsData.otherFlags.length > 0 && field.currentCrsData.otherFlags.map((flag: any, idx: number) => (
                                                <React.Fragment key={idx}>
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Other Flags Code:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {flag.code}
                                                      </code>
                                                    </td>
                                                  </tr>
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600">Significance:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {flag.significance}
                                                      </code>
                                                    </td>
                                                  </tr>
                                                </React.Fragment>
                                              ))}
                                            </tbody>
                                          </table>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No CRS data saved</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              // Other Identifier - show detailed table
                              if (field.fieldName && field.fieldName.startsWith('Other Identifier') && typeof field.importValue === 'object' && field.importValue !== null && !Array.isArray(field.importValue)) {
                                const identifier = field.importValue;

                                // Extract raw XML snippet from the imported XML
                                const xmlSnippet = extractXmlSnippet(field.iatiPath, field.itemIndex);

                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <Tag className="h-4 w-4" />
                                      Other Identifier Details
                                    </div>

                                    {/* 3-column layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      {/* Column 1: Raw XML */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                        <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
{xmlSnippet}
                                        </pre>
                                      </div>

                                      {/* Column 2: Import Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                        <table className="w-full text-xs">
                                          <tbody>
                                            <tr className="border-b border-gray-100 align-top">
                                              <td className="py-1.5 pr-2 font-medium text-gray-600">Identifier Code:</td>
                                              <td className="py-1.5 text-gray-900">
                                                <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                  {identifier.code || '—'}
                                                </code>
                                              </td>
                                            </tr>
                                            <tr className="border-b border-gray-100 align-top">
                                              <td className="py-1.5 pr-2 font-medium text-gray-600">Identifier Type:</td>
                                              <td className="py-1.5 text-gray-900">
                                                <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                  {identifier.type || '—'}
                                                </code>
                                                {identifier.name && (
                                                  <span className="text-xs text-gray-500 ml-2">{identifier.name}</span>
                                                )}
                                              </td>
                                            </tr>
                                            <tr className="border-b border-gray-100 align-top">
                                              <td className="py-1.5 pr-2 font-medium text-gray-600">Owner Org Name:</td>
                                              <td className="py-1.5 text-gray-900">{identifier.ownerOrg?.narrative || '—'}</td>
                                            </tr>
                                            <tr className="align-top">
                                              <td className="py-1.5 pr-2 font-medium text-gray-600">Owner Org Ref:</td>
                                              <td className="py-1.5 text-gray-900">
                                                {identifier.ownerOrg?.ref ? (
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {identifier.ownerOrg.ref}
                                                  </code>
                                                ) : (
                                                  '—'
                                                )}
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* Column 3: Current Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                        {field.currentValue ? (
                                          <table className="w-full text-xs">
                                            <tbody>
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Identifier Code:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {field.currentValue.code || '—'}
                                                  </code>
                                                </td>
                                              </tr>
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Identifier Type:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {field.currentValue.type || '—'}
                                                  </code>
                                                  {field.currentValue.name && (
                                                    <span className="text-xs text-gray-500 ml-2">{field.currentValue.name}</span>
                                                  )}
                                                </td>
                                              </tr>
                                              <tr className="border-b border-gray-100 align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Owner Org Name:</td>
                                                <td className="py-1.5 text-gray-900">{field.currentValue.ownerOrg?.narrative || '—'}</td>
                                              </tr>
                                              <tr className="align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Owner Org Ref:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  {field.currentValue.ownerOrg?.ref ? (
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {field.currentValue.ownerOrg.ref}
                                                    </code>
                                                  ) : (
                                                    '—'
                                                  )}
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No existing value</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Non-DAC Sectors (Custom Vocabulary)
                              if (field.hasNonDacSectors && field.nonDacSectors && Array.isArray(field.nonDacSectors) && field.nonDacSectors.length > 0) {
                                // Generate XML snippet for first sector (representative)
                                const firstSector = field.nonDacSectors[0];
                                const vocabularyUri = firstSector.vocabularyUri || firstSector['vocabulary-uri'] || '';
                                const xmlSnippet = `<sector vocabulary="${firstSector.vocabulary || ''}"${vocabularyUri ? ` vocabulary-uri="${vocabularyUri}"` : ''} code="${firstSector.code || ''}">
  ${firstSector.name ? `<narrative>${firstSector.name}</narrative>` : ''}
</sector>${field.nonDacSectors.length > 1 ? `\n... and ${field.nonDacSectors.length - 1} more sector${field.nonDacSectors.length - 1 !== 1 ? 's' : ''}` : ''}`;

                                return (
                                  <div className="mb-6 border-b border-amber-200 pb-6">
                                    {/* Explanatory Header */}
                                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
                                      <div className="flex items-center gap-2 text-amber-800">
                                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                        <span className="font-medium">Custom Vocabulary Sectors (Not Importable)</span>
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Lock className="h-3.5 w-3.5 text-amber-600 cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                              <p>These sectors use vocabulary 99 (custom codes defined by the reporting organization) and cannot be automatically mapped to standard DAC sector codes.</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                      <p className="text-xs text-amber-700 mt-1.5">
                                        These sectors use vocabulary 99 (reporting organization&apos;s custom codes) and cannot be automatically mapped to standard DAC sector codes. They are shown for reference only.
                                      </p>
                                      <p className="text-xs text-amber-600 mt-1 italic">
                                        Tip: To include these sectors, manually select equivalent DAC sectors in the Sectors tab after import.
                                      </p>
                                    </div>

                                    <div className="text-sm font-semibold mb-3 text-amber-900 flex items-center gap-2">
                                      <Tag className="h-4 w-4" />
                                      Non-DAC Sectors ({field.nonDacSectors.length})
                                    </div>

                                    {/* 3-column layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      {/* Column 1: Raw XML */}
                                      <div className="bg-amber-50/50 rounded-md p-3 border border-amber-200">
                                        <div className="text-xs font-semibold text-amber-800 mb-2">Raw XML</div>
                                        <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
{xmlSnippet}
                                        </pre>
                                      </div>

                                      {/* Column 2: Import Value */}
                                      <div className="bg-amber-50/50 rounded-md p-3 border border-amber-200">
                                        <div className="text-xs font-semibold text-amber-800 mb-2">Import Value ({field.nonDacSectors.length})</div>
                                        <div className="space-y-2">
                                          {field.nonDacSectors.map((sector: any, idx: number) => (
                                            <div key={idx} className="border-b border-amber-100 pb-2 last:border-b-0">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                {sector.code && (
                                                  <code className="text-xs font-mono bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                                                    {sector.code}
                                                  </code>
                                                )}
                                                {sector.name && (
                                                  <span className="text-xs text-gray-900">{sector.name}</span>
                                                )}
                                                {sector.vocabulary && (
                                                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                                                    vocab {sector.vocabulary}
                                                  </Badge>
                                                )}
                                              </div>
                                              {(sector.vocabularyUri || sector['vocabulary-uri']) && (
                                                <div className="text-xs text-amber-600 mt-1 truncate">
                                                  URI: {sector.vocabularyUri || sector['vocabulary-uri']}
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Column 3: Current Value */}
                                      <div className="bg-amber-50/50 rounded-md p-3 border border-amber-200">
                                        <div className="text-xs font-semibold text-amber-800 mb-2">Current Value</div>
                                        {field.currentValue && Array.isArray(field.currentValue) && field.currentValue.length > 0 ? (
                                          <div className="space-y-2">
                                            {field.currentValue.map((sector: any, idx: number) => (
                                              <div key={idx} className="border-b border-amber-100 pb-2 last:border-b-0">
                                                <div className="flex items-center gap-2">
                                                  {sector.code && (
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {sector.code}
                                                    </code>
                                                  )}
                                                  {sector.name && (
                                                    <span className="text-xs text-gray-900">{sector.name}</span>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-xs text-amber-600 italic">No existing sectors</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              // Activity Scope - show code and name in table format
                              if (field.fieldName === 'Activity Scope' && (typeof field.importValue === 'string' || typeof field.importValue === 'object')) {
                                const xmlSnippet = extractXmlSnippet(field.iatiPath, field.itemIndex);

                                // Extract code and name from import value
                                let importCode = '';
                                let importName = '';
                                if (typeof field.importValue === 'string') {
                                  importCode = field.importValue;
                                } else if (field.importValue && typeof field.importValue === 'object') {
                                  importCode = (field.importValue as any).code || '';
                                  importName = (field.importValue as any).name || '';
                                }

                                // Extract code and name from current value
                                let currentCode = '';
                                let currentName = '';
                                if (typeof field.currentValue === 'string') {
                                  currentCode = field.currentValue;
                                } else if (field.currentValue && typeof field.currentValue === 'object') {
                                  currentCode = (field.currentValue as any).code || '';
                                  currentName = (field.currentValue as any).name || '';
                                }

                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900">
                                      Activity Scope Details
                                    </div>

                                    {/* 3-column layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      {/* Column 1: Raw XML */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                        {xmlSnippet ? (
                                          <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
{xmlSnippet}
                                          </pre>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">
                                            See IATI Path below for XML structure
                                          </div>
                                        )}
                                      </div>

                                      {/* Column 2: Import Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                        {importCode ? (
                                          <table className="w-full text-xs">
                                            <tbody>
                                              <tr className="align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Value:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {importCode}
                                                  </code>
                                                  {importName && (
                                                    <span className="ml-2 text-gray-600">{importName}</span>
                                                  )}
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No import value</div>
                                        )}
                                      </div>

                                      {/* Column 3: Current Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                        {currentCode ? (
                                          <table className="w-full text-xs">
                                            <tbody>
                                              <tr className="align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600">Value:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {currentCode}
                                                  </code>
                                                  {currentName && (
                                                    <span className="ml-2 text-gray-600">{currentName}</span>
                                                  )}
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No existing value</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              // Activity Dates - show type, iso-date, and narratives in table format
                              if ((field.fieldName === 'Planned Start Date' ||
                                   field.fieldName === 'Actual Start Date' ||
                                   field.fieldName === 'Planned End Date' ||
                                   field.fieldName === 'Actual End Date')) {

                                const xmlSnippet = extractXmlSnippet(field.iatiPath, field.itemIndex);

                                // Extract date type info and iso-date from IATI path and XML
                                let dateType = '';
                                let dateTypeName = '';
                                let isoDate = '';

                                // Extract type attribute from IATI path if present (e.g., activity-date[@type="1"])
                                const typeMatch = field.iatiPath.match(/@type="(\d+)"/);
                                const expectedType = typeMatch ? typeMatch[1] : null;

                                // Extract ALL data from the raw XML
                                let allXmlNarratives: Array<{ text: string; lang?: string; isImported: boolean }> = [];
                                if (xmlContent && field.iatiPath) {
                                  try {
                                    const parser = new DOMParser();
                                    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
                                    const elements = xmlDoc.querySelectorAll('activity-date');

                                    // Find the activity-date element with matching type attribute
                                    let targetElement: Element | null = null;
                                    if (expectedType) {
                                      for (let i = 0; i < elements.length; i++) {
                                        if (elements[i].getAttribute('type') === expectedType) {
                                          targetElement = elements[i];
                                          break;
                                        }
                                      }
                                    } else {
                                      targetElement = elements[field.itemIndex || 0] || elements[0];
                                    }

                                    if (targetElement) {
                                      // Extract type attribute
                                      dateType = targetElement.getAttribute('type') || '';
                                      // Map type codes to names
                                      const typeNames: Record<string, string> = {
                                        '1': 'Planned start',
                                        '2': 'Actual start',
                                        '3': 'Planned end',
                                        '4': 'Actual end'
                                      };
                                      dateTypeName = typeNames[dateType] || '';

                                      // Extract iso-date attribute
                                      isoDate = targetElement.getAttribute('iso-date') || '';

                                      // Extract narratives if they exist
                                      const narratives = targetElement.querySelectorAll('narrative');
                                      narratives.forEach((narrative, idx) => {
                                        const lang = narrative.getAttribute('xml:lang');
                                        const text = narrative.textContent?.trim() || '';
                                        // First narrative (usually English/default) is imported, others are not
                                        const isImported = idx === 0 || (!lang || lang === 'en');
                                        allXmlNarratives.push({ text, lang, isImported });
                                      });
                                    }
                                  } catch (error) {
                                    console.error('Error parsing activity-date from XML:', error);
                                  }
                                }

                                // Get current value data if exists
                                let currentIsoDate = '';

                                if (field.currentValue) {
                                  // Current value might be just a date string or an object
                                  if (typeof field.currentValue === 'string') {
                                    currentIsoDate = field.currentValue;
                                  } else if (typeof field.currentValue === 'object') {
                                    currentIsoDate = field.currentValue.date || field.currentValue.isoDate || '';
                                  }
                                }

                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900">
                                      Field Details
                                    </div>

                                    {/* 3-column layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      {/* Column 1: Raw XML */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                        {xmlSnippet ? (
                                          <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
{xmlSnippet}
                                          </pre>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">
                                            See IATI Path below for XML structure
                                          </div>
                                        )}
                                      </div>

                                      {/* Column 2: Import Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                        {(dateType || isoDate || allXmlNarratives.length > 0) ? (
                                          <table className="w-full text-xs">
                                            <tbody>
                                              {/* Show date type (grayed out - redundant with field name) */}
                                              {dateType && (
                                                <tr className="border-b border-gray-100 align-top" style={{ opacity: 0.4 }}>
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600 whitespace-nowrap">Date Type:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {dateType}
                                                    </code>
                                                    {dateTypeName && (
                                                      <span className="ml-2 text-gray-600">{dateTypeName}</span>
                                                    )}
                                                  </td>
                                                </tr>
                                              )}
                                              {/* Show iso-date */}
                                              {isoDate && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600 whitespace-nowrap">ISO Date:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {isoDate}
                                                    </code>
                                                  </td>
                                                </tr>
                                              )}
                                              {/* Show narratives if they exist - show first one normal (imported), others grayed out */}
                                              {allXmlNarratives.map((narrative, idx) => (
                                                <tr
                                                  key={idx}
                                                  className="border-b border-gray-100 align-top last:border-b-0"
                                                  style={{ opacity: idx === 0 ? 1 : 0.4 }}
                                                >
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600 whitespace-nowrap">
                                                    {narrative.lang ? `Narrative (${narrative.lang.toUpperCase()}):` : 'Narrative (Default):'}
                                                  </td>
                                                  <td className="py-1.5 text-gray-900">{narrative.text}</td>
                                                </tr>
                                              ))}
                                              {(dateType || allXmlNarratives.length > 1) && (
                                                <tr>
                                                  <td colSpan={2} className="pt-2">
                                                    <div className="text-xs text-gray-500 italic">
                                                      Note: Grayed out items are {dateType && allXmlNarratives.length > 1 ? 'redundant or ' : dateType ? 'redundant' : ''}not imported by default
                                                    </div>
                                                  </td>
                                                </tr>
                                              )}
                                            </tbody>
                                          </table>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No import value</div>
                                        )}
                                      </div>

                                      {/* Column 3: Current Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                        {currentIsoDate ? (
                                          <table className="w-full text-xs">
                                            <tbody>
                                              {/* Show iso-date */}
                                              <tr className="align-top">
                                                <td className="py-1.5 pr-2 font-medium text-gray-600 whitespace-nowrap">ISO Date:</td>
                                                <td className="py-1.5 text-gray-900">
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {currentIsoDate}
                                                  </code>
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No existing value</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              // Activity Title and Description - show narratives in table format
                              if ((field.fieldName === 'Activity Title' || field.fieldName?.includes('Description')) &&
                                  (Array.isArray(field.importValue) || typeof field.importValue === 'string')) {

                                const xmlSnippet = extractXmlSnippet(field.iatiPath, field.itemIndex);
                                const isDescription = field.fieldName?.includes('Description');

                                // Extract description type info if this is a description field
                                let descriptionType = '';
                                let descriptionTypeName = '';

                                // Extract type attribute from IATI path if present (e.g., description[@type="2"])
                                const typeMatch = field.iatiPath.match(/@type="(\d+)"/);
                                const expectedType = typeMatch ? typeMatch[1] : null;

                                // Extract ALL narratives from the raw XML to show what's available
                                let allXmlNarratives: Array<{ text: string; lang?: string; isImported: boolean }> = [];
                                if (xmlContent && field.iatiPath) {
                                  try {
                                    const parser = new DOMParser();
                                    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
                                    const cleanPath = field.iatiPath.replace('iati-activity/', '').replace(/\[\d+\]/g, '').split('/');
                                    const parentElement = cleanPath.length > 1 ? cleanPath[cleanPath.length - 2].replace(/\[@type="\d+"\]/, '') : null;

                                    if (parentElement) {
                                      const elements = xmlDoc.querySelectorAll(parentElement);

                                      // For descriptions, find the element with matching type attribute
                                      let targetElement: Element | null = null;
                                      if (isDescription && parentElement === 'description' && expectedType) {
                                        // Find the description element with the matching type
                                        for (let i = 0; i < elements.length; i++) {
                                          if (elements[i].getAttribute('type') === expectedType) {
                                            targetElement = elements[i];
                                            break;
                                          }
                                        }
                                      } else {
                                        // Use itemIndex for other elements
                                        targetElement = elements[field.itemIndex || 0] || elements[0];
                                      }

                                      if (targetElement) {
                                        // Extract type attribute for descriptions
                                        if (isDescription && parentElement === 'description') {
                                          descriptionType = targetElement.getAttribute('type') || '';
                                          // Map type codes to names
                                          const typeNames: Record<string, string> = {
                                            '1': 'General',
                                            '2': 'Objectives',
                                            '3': 'Target Groups',
                                            '4': 'Other'
                                          };
                                          descriptionTypeName = typeNames[descriptionType] || '';
                                        }

                                        const narratives = targetElement.querySelectorAll('narrative');
                                        narratives.forEach((narrative, idx) => {
                                          const lang = narrative.getAttribute('xml:lang');
                                          const text = narrative.textContent?.trim() || '';
                                          // First narrative (usually English/default) is imported, others are not
                                          const isImported = idx === 0 || (!lang || lang === 'en');
                                          allXmlNarratives.push({ text, lang, isImported });
                                        });
                                      }
                                    }
                                  } catch (error) {
                                    console.error('Error parsing narratives from XML:', error);
                                  }
                                }

                                // Convert import value to array of narratives (what's actually being imported)
                                let importNarratives: Array<{ text: string; lang?: string }> = [];
                                if (Array.isArray(field.importValue)) {
                                  importNarratives = field.importValue.map(v => ({
                                    text: typeof v === 'string' ? v : (v.text || v.narrative || ''),
                                    lang: v.lang || v['xml:lang']
                                  }));
                                } else if (typeof field.importValue === 'string') {
                                  importNarratives = [{ text: field.importValue }];
                                }

                                // If we found narratives in XML, use those for display (they show what's available)
                                // Otherwise fall back to import value
                                const displayNarratives = allXmlNarratives.length > 0 ? allXmlNarratives : importNarratives.map(n => ({ ...n, isImported: true }));

                                // Convert current value to array of narratives
                                let currentNarratives: Array<{ text: string; lang?: string }> = [];
                                let currentDescriptionType = '';
                                let currentDescriptionTypeName = '';

                                if (field.currentValue) {
                                  if (Array.isArray(field.currentValue)) {
                                    currentNarratives = field.currentValue.map(v => ({
                                      text: typeof v === 'string' ? v : (v.text || v.narrative || ''),
                                      lang: v.lang || v['xml:lang']
                                    }));
                                  } else if (typeof field.currentValue === 'string') {
                                    currentNarratives = [{ text: field.currentValue }];
                                  }

                                  // Extract current description type from field name
                                  if (isDescription) {
                                    const typeNames: Record<string, string> = {
                                      '1': 'General',
                                      '2': 'Objectives',
                                      '3': 'Target Groups',
                                      '4': 'Other'
                                    };
                                    if (field.fieldName?.includes('General')) {
                                      currentDescriptionType = '1';
                                      currentDescriptionTypeName = 'General';
                                    } else if (field.fieldName?.includes('Objectives')) {
                                      currentDescriptionType = '2';
                                      currentDescriptionTypeName = 'Objectives';
                                    } else if (field.fieldName?.includes('Target Groups')) {
                                      currentDescriptionType = '3';
                                      currentDescriptionTypeName = 'Target Groups';
                                    } else if (field.fieldName?.includes('Other')) {
                                      currentDescriptionType = '4';
                                      currentDescriptionTypeName = 'Other';
                                    }
                                  }
                                }

                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900">
                                      {field.fieldName} Details
                                    </div>

                                    {/* 3-column layout */}
                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                      {/* Column 1: Raw XML */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                        {xmlSnippet ? (
                                          <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
{xmlSnippet}
                                          </pre>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">
                                            See IATI Path below for XML structure
                                          </div>
                                        )}
                                      </div>

                                      {/* Column 2: Import Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                        {displayNarratives.length > 0 || (isDescription && descriptionType) ? (
                                          <div className="space-y-2">
                                            <table className="w-full text-xs">
                                              <tbody>
                                                {/* Show description type for description fields */}
                                                {isDescription && descriptionType && (
                                                  <tr className="border-b border-gray-100 align-top">
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600 whitespace-nowrap">Description Type:</td>
                                                    <td className="py-1.5 text-gray-900">
                                                      <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {descriptionType}
                                                      </code>
                                                      {descriptionTypeName && (
                                                        <span className="ml-2 text-gray-600">{descriptionTypeName}</span>
                                                      )}
                                                    </td>
                                                  </tr>
                                                )}
                                                {/* Show narratives */}
                                                {displayNarratives.map((narrative, idx) => (
                                                  <tr key={idx} className={`border-b border-gray-100 align-top last:border-b-0 ${!narrative.isImported ? 'opacity-50' : ''}`}>
                                                    <td className="py-1.5 pr-2 font-medium text-gray-600 whitespace-nowrap">
                                                      {narrative.lang ? `Narrative (${narrative.lang.toUpperCase()}):` : 'Narrative (Default):'}
                                                    </td>
                                                    <td className="py-1.5 text-gray-900">{narrative.text}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                            {displayNarratives.some(n => !n.isImported) && (
                                              <div className="text-xs text-gray-500 italic mt-2 pt-2 border-t border-gray-200">
                                                Note: Grayed-out languages are recognized but not currently imported by the system
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No import value</div>
                                        )}
                                      </div>

                                      {/* Column 3: Current Value */}
                                      <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                        <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                        {currentNarratives.length > 0 || (isDescription && currentDescriptionType) ? (
                                          <table className="w-full text-xs">
                                            <tbody>
                                              {/* Show description type for description fields */}
                                              {isDescription && currentDescriptionType && (
                                                <tr className="border-b border-gray-100 align-top">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600 whitespace-nowrap">Description Type:</td>
                                                  <td className="py-1.5 text-gray-900">
                                                    <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                      {currentDescriptionType}
                                                    </code>
                                                    {currentDescriptionTypeName && (
                                                      <span className="ml-2 text-gray-600">{currentDescriptionTypeName}</span>
                                                    )}
                                                  </td>
                                                </tr>
                                              )}
                                              {/* Show narratives */}
                                              {currentNarratives.map((narrative, idx) => (
                                                <tr key={idx} className="border-b border-gray-100 align-top last:border-b-0">
                                                  <td className="py-1.5 pr-2 font-medium text-gray-600 whitespace-nowrap">
                                                    {narrative.lang ? `Narrative (${narrative.lang.toUpperCase()}):` : 'Narrative (Default):'}
                                                  </td>
                                                  <td className="py-1.5 text-gray-900">{narrative.text}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        ) : (
                                          <div className="text-xs text-gray-500 italic">No existing value</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              // Default: Show 3-column layout for all other fields
                              // This ensures ALL fields have consistent expanded view

                              // Extract raw XML snippet from the imported XML
                              const xmlSnippet = extractXmlSnippet(field.iatiPath, field.itemIndex);

                              // Helper function to extract text from JSONB multilingual fields
                              const extractTextFromJsonb = (obj: any): string => {
                                if (!obj) return '';
                                if (typeof obj === 'string') return obj;
                                if (typeof obj === 'object') {
                                  if (obj.en) return obj.en;
                                  const firstKey = Object.keys(obj)[0];
                                  if (firstKey) return obj[firstKey];
                                }
                                return '';
                              };

                              // Helper function to render result details
                              const renderResultDetails = (resultData: any) => {
                                if (!resultData) {
                                  return <div className="text-xs text-gray-500 italic">No value</div>;
                                }

                                const rows: Array<{ label: string; value: string }> = [];

                                // Result Title
                                const resultTitle = extractTextFromJsonb(resultData.title);
                                if (resultTitle) {
                                  rows.push({ label: 'Result Title', value: resultTitle });
                                }

                                // Aggregation Status (Result) - show early
                                if (resultData.aggregation_status !== undefined && resultData.aggregation_status !== null) {
                                  rows.push({ label: 'Aggregation Status (Result)', value: String(resultData.aggregation_status) });
                                }

                                // Get first indicator (if exists)
                                const indicator = resultData.indicators?.[0];
                                if (indicator) {
                                  // Indicator Title
                                  const indicatorTitle = extractTextFromJsonb(indicator.title);
                                  if (indicatorTitle) {
                                    rows.push({ label: 'Indicator Title', value: indicatorTitle });
                                  }

                                  // Aggregation Status (Indicator)
                                  if (indicator.aggregation_status !== undefined && indicator.aggregation_status !== null) {
                                    rows.push({ label: 'Aggregation Status (Indicator)', value: String(indicator.aggregation_status) });
                                  }

                                  // Ascending
                                  if (indicator.ascending !== undefined && indicator.ascending !== null) {
                                    rows.push({ label: 'Ascending', value: String(indicator.ascending) });
                                  }

                                  // Measure
                                  if (indicator.measure) {
                                    rows.push({ label: 'Measure', value: String(indicator.measure) });
                                  }

                                  // Get first period (if exists)
                                  const period = indicator.periods?.[0];
                                  if (period) {
                                    // Period Start - handle both period_start and period-start formats
                                    const periodStart = period.period_start || period['period-start'];
                                    if (periodStart) {
                                      rows.push({ label: 'Period Start', value: periodStart });
                                    }
                                    
                                    // Period End - handle both period_end and period-end formats
                                    const periodEnd = period.period_end || period['period-end'];
                                    if (periodEnd) {
                                      rows.push({ label: 'Period End', value: periodEnd });
                                    }
                                    
                                    // Actual Value - handle both actual_value and actual.value formats
                                    const actualValue = period.actual_value !== undefined 
                                      ? period.actual_value 
                                      : (period.actual?.value !== undefined ? period.actual.value : undefined);
                                    if (actualValue !== undefined && actualValue !== null) {
                                      rows.push({ label: 'Actual Value', value: String(actualValue) });
                                    }
                                    
                                    // Dimension Name - handle both actual_dimensions array and actual.dimensions
                                    const actualDimensions = period.actual_dimensions || period.actual?.dimensions || [];
                                    if (actualDimensions.length > 0 && actualDimensions[0]?.name) {
                                      rows.push({ label: 'Dimension Name', value: actualDimensions[0].name });
                                    }
                                    
                                    // Comment - handle both actual_comment and actual.comment
                                    const actualComment = period.actual_comment || period.actual?.comment;
                                    if (actualComment) {
                                      const commentText = extractTextFromJsonb(actualComment);
                                      if (commentText) {
                                        rows.push({ label: 'Comment', value: commentText });
                                      }
                                    }
                                  }
                                }

                                if (rows.length === 0) {
                                  return <div className="text-xs text-gray-500 italic">No value</div>;
                                }

                                return (
                                  <table className="w-full text-xs">
                                    <tbody>
                                      {rows.map((row, idx) => (
                                        <tr key={idx} className={`align-top ${idx < rows.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                          <td className="py-1.5 pr-2 font-medium text-gray-600 whitespace-nowrap">
                                            {row.label}:
                                          </td>
                                          <td className="py-1.5 text-gray-900 break-words">
                                            {row.value}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                );
                              };

                              // Helper function to render a value in table format
                              const renderValueInTable = (value: any, fieldName: string, isCurrentValue = false) => {
                                // Special handling for result fields
                                if (field.itemType === 'result') {
                                  if (isCurrentValue) {
                                    return renderResultDetails(field.currentItemData);
                                  } else {
                                    return renderResultDetails(field.itemData);
                                  }
                                }

                                if (value === undefined || value === null || value === '') {
                                  return <div className="text-xs text-gray-500 italic">No value</div>;
                                }

                                // If it's a simple string or number, show as single row
                                if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                                  return (
                                    <table className="w-full text-xs">
                                      <tbody>
                                        <tr className="align-top">
                                          <td className="py-1.5 pr-2 font-medium text-gray-600">Value:</td>
                                          <td className="py-1.5 text-gray-900">
                                            {typeof value === 'string' && value.length > 100 ? (
                                              <div className="break-words">{value}</div>
                                            ) : (
                                              <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                {String(value)}
                                              </code>
                                            )}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  );
                                }

                                // If it's an object, show key-value pairs
                                if (typeof value === 'object' && !Array.isArray(value)) {
                                  const entries = Object.entries(value).filter(([k, v]) => v !== null && v !== undefined && v !== '');
                                  if (entries.length === 0) {
                                    return <div className="text-xs text-gray-500 italic">No value</div>;
                                  }

                                  // Check if this is a code/name pair - if so, display on same line
                                  const hasCode = entries.some(([k]) => k.toLowerCase() === 'code');
                                  const hasName = entries.some(([k]) => k.toLowerCase() === 'name');

                                  if (hasCode && hasName && entries.length === 2) {
                                    const code = entries.find(([k]) => k.toLowerCase() === 'code')?.[1];
                                    const name = entries.find(([k]) => k.toLowerCase() === 'name')?.[1];

                                    return (
                                      <table className="w-full text-xs">
                                        <tbody>
                                          <tr className="align-top">
                                            <td className="py-1.5 pr-2 font-medium text-gray-600">Value:</td>
                                            <td className="py-1.5 text-gray-900">
                                              <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                {String(code)}
                                              </code>
                                              <span className="ml-2 text-gray-600">{String(name)}</span>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    );
                                  }

                                  return (
                                    <table className="w-full text-xs">
                                      <tbody>
                                        {entries.map(([key, val], idx) => {
                                          // Special handling for narratives array
                                          if (key === 'narratives' && Array.isArray(val) && val.length > 0) {
                                            return val.map((narrative: any, nIdx: number) => (
                                              <tr 
                                                key={`${idx}-narrative-${nIdx}`} 
                                                className={`align-top ${nIdx < val.length - 1 || idx < entries.length - 1 ? 'border-b border-gray-100' : ''}`}
                                              >
                                                <td className="py-1.5 pr-2 font-medium text-gray-600 whitespace-nowrap">
                                                  {narrative.language ? `Narrative (${narrative.language.toUpperCase()}):` : 'Narrative:'}
                                                </td>
                                                <td className="py-1.5 text-gray-900">
                                                  {narrative.text || narrative.narrative || ''}
                                                </td>
                                              </tr>
                                            ));
                                          }

                                          // Handle other arrays
                                          if (Array.isArray(val)) {
                                            const arrayText = val.map(v => {
                                              if (typeof v === 'object' && v !== null) {
                                                return v.text || v.narrative || v.name || JSON.stringify(v);
                                              }
                                              return String(v);
                                            }).join(', ');

                                            return (
                                              <tr key={idx} className={`align-top ${idx < entries.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                                <td className="py-1.5 pr-2 font-medium text-gray-600 capitalize whitespace-nowrap">
                                                  {key.replace(/_/g, ' ')}:
                                                </td>
                                                <td className="py-1.5 text-gray-900">
                                                  <div className="break-words">{arrayText || '—'}</div>
                                                </td>
                                              </tr>
                                            );
                                          }

                                          // Default handling for non-array values
                                          return (
                                            <tr key={idx} className={`align-top ${idx < entries.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                              <td className="py-1.5 pr-2 font-medium text-gray-600 capitalize whitespace-nowrap">
                                                {key.replace(/_/g, ' ')}:
                                              </td>
                                              <td className="py-1.5 text-gray-900">
                                                {typeof val === 'string' && val.length > 100 ? (
                                                  <div className="break-words">{val}</div>
                                                ) : (
                                                  <code className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {String(val)}
                                                  </code>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  );
                                }

                                // For arrays or other complex types, fall back to renderValue
                                return (
                                  <div className="text-sm text-gray-900 break-words">
                                    {renderValue(value, `${rowId}-default-fallback`, 'import', fieldName, field)}
                                  </div>
                                );
                              };

                              return (
                                <div className="mb-6 border-b border-gray-200 pb-6">
                                  <div className="text-sm font-semibold mb-3 text-gray-900">
                                    Field Details
                                  </div>

                                  {/* 3-column layout */}
                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    {/* Column 1: Raw XML */}
                                    <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                      <div className="text-xs font-semibold text-gray-700 mb-2">Raw XML</div>
                                      {xmlSnippet ? (
                                        <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-all">
{xmlSnippet}
                                        </pre>
                                      ) : (
                                        <div className="text-xs text-gray-500 italic">
                                          See IATI Path below for XML structure
                                        </div>
                                      )}
                                    </div>

                                    {/* Column 2: Import Value */}
                                    <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                      <div className="text-xs font-semibold text-gray-700 mb-2">Import Value</div>
                                      {renderValueInTable(field.importValue, field.fieldName, false)}
                                    </div>

                                    {/* Column 3: Current Value */}
                                    <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
                                      <div className="text-xs font-semibold text-gray-700 mb-2">Current Value</div>
                                      {renderValueInTable(field.currentValue, field.fieldName, true)}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Field metadata */}
                            <div className="mt-4 text-sm flex items-center gap-2">
                              <span className="font-semibold">IATI Standard Reference:</span>
                              <a
                                href={`https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/${field.iatiPath.replace('iati-activity/', '').replace(/\[\d+\]/g, '').replace(/\[@[^\]]+\]/g, '').replace(/\/narrative$/, '')}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-mono text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {field.iatiPath
                                  .replace('iati-activity/', 'iati-activities/iati-activity/')
                                  .replace(/\[\d+\]/g, '')
                                  .replace(/\[@[^\]]+\]/g, '')
                                  .replace(/\/narrative$/, '')}
                              </a>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                  })}
                    </React.Fragment>
                  ))}
                  </React.Fragment>
                );
              });
            })() : (
              sortedFields.map((field, index) => {
                const rowId = getRowId(field, index);
                const isExpanded = expandedRows.has(rowId);
                
                return (
                  <React.Fragment key={rowId}>
                    <TableRow 
                      className={`
                        group
                        ${field.hasConflict && field.selected ? 'bg-orange-50' : ''}
                        ${field.selected ? 'bg-white' : ''}
                        hover:bg-gray-100 transition-colors
                      `}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={field.selected}
                          onCheckedChange={(checked) => onFieldToggle(field, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRowExpansion(rowId);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="font-medium w-[30%]">
                        {field.fieldName}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 break-words w-[35%]">
                        {renderValue(field.currentValue, rowId, 'current', field.fieldName, field)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-700 break-words w-[35%]">
                        {renderValue(field.importValue, rowId, 'import', field.fieldName, field)}
                      </TableCell>
                      <TableCell className="text-center">
                        {field.hasConflict && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertCircle className="h-4 w-4 text-orange-500 mx-auto" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>This field has conflicting values</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded details row */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-gray-50 p-4">
                          {/* Field metadata */}
                          <div className="mt-4 text-sm flex items-center gap-2">
                            <span className="font-semibold">IATI Standard Reference:</span>
                            <code className="text-xs font-mono text-gray-700 bg-white px-2 py-1 rounded border">
                              {field.iatiPath}
                            </code>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )
          )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
