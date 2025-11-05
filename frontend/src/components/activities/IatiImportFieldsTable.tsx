import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronDown, ChevronRight, Copy, Check, ChevronUp, Calendar, DollarSign, Tag, FileText, ExternalLink, MapPin, Building2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  conditionsData?: any;
  isLocationItem?: boolean;
  locationData?: any;
  isFssItem?: boolean;
  fssData?: any;
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
  onFieldToggle: (field: ParsedField) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

type SortColumn = 'fieldName' | 'category' | 'fieldType' | 'iatiPath' | 'currentValue' | 'importValue' | 'conflict';
type SortDirection = 'asc' | 'desc';

export function IatiImportFieldsTable({ fields, sections, onFieldToggle, onSelectAll, onDeselectAll }: IatiImportFieldsTableProps) {
  // Use sections if provided, otherwise use fields (backward compatibility)
  const allFields = sections ? sections.flatMap(s => s.fields) : (fields || []);
  const hasSections = sections && sections.length > 0;
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('fieldName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [copiedValues, setCopiedValues] = useState<Set<string>>(new Set());
  const [expandedTexts, setExpandedTexts] = useState<Set<string>>(new Set());

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
    const codeNameMatch = strValue.match(/^([^:]+):\s*(.+)$/);
    if (codeNameMatch && !strValue.includes('|')) {
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

  // Render expandable text - for descriptions, use 75 words, otherwise 100 chars
  const MAX_TEXT_LENGTH = 100;
  const MAX_DESCRIPTION_WORDS = 75;
  
  // Helper to get first N words from text
  const getFirstNWords = (text: string, n: number): string => {
    const words = text.trim().split(/\s+/);
    if (words.length <= n) return text;
    return words.slice(0, n).join(' ') + '...';
  };
  
  const renderExpandableText = (text: string, cellId: string, isDescription: boolean = false) => {
    const isExpanded = expandedTexts.has(cellId);
    
    if (isDescription) {
      // For descriptions, use word count (75 words)
      const words = text.trim().split(/\s+/);
      const shouldTruncate = words.length > MAX_DESCRIPTION_WORDS;
      
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
              {getFirstNWords(text, MAX_DESCRIPTION_WORDS)}
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
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
                          <span className="text-xs text-muted-foreground">{currency}</span> {value}
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
    // Special handling for Sectors field - show all sectors
    if (fieldName && fieldName.includes('Sectors')) {
      if (Array.isArray(value) && value.length > 0) {
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
    
    // Special handling for Contact fields - show simplified view in summary
    if ((fieldName && fieldName.includes('Contact')) || field?.tab === 'contacts') {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // In summary view, show only: department, email, telephone, mailingAddress
        const parts: JSX.Element[] = [];
        
        if (value.department) {
          parts.push(
            <div key="department" className="flex items-start">
              <span className="text-gray-600 font-medium min-w-[120px] flex-shrink-0">Department:</span>
              <span className="ml-2 text-gray-900">{value.department}</span>
            </div>
          );
        }
        if (value.email) {
          parts.push(
            <div key="email" className="flex items-start">
              <span className="text-gray-600 font-medium min-w-[120px] flex-shrink-0">Email:</span>
              <span className="ml-2 text-gray-900">{value.email}</span>
            </div>
          );
        }
        if (value.telephone) {
          parts.push(
            <div key="telephone" className="flex items-start">
              <span className="text-gray-600 font-medium min-w-[120px] flex-shrink-0">Telephone:</span>
              <span className="ml-2 text-gray-900">{value.telephone}</span>
            </div>
          );
        }
        if (value.mailingAddress) {
          parts.push(
            <div key="mailingAddress" className="flex items-start">
              <span className="text-gray-600 font-medium min-w-[120px] flex-shrink-0">Mailing Address:</span>
              <span className="ml-2 text-gray-900">{value.mailingAddress}</span>
            </div>
          );
        }
        
        if (parts.length === 0) {
          return <span className="text-gray-400 italic">—</span>;
        }
        
        return (
          <div className="flex flex-col gap-1 text-xs">
            {parts}
          </div>
        );
      }
    }
    
    // Special handling for Tags field - render as badges
    if (field?.isTagField && (field.tagData || field.existingTags)) {
      const tags = column === 'import' ? (field.tagData || []) : (field.existingTags || []);
      
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
      const nameText = formatted.name;
      const words = nameText.trim().split(/\s+/);
      const needsTruncation = isActivityDescription && words.length > MAX_DESCRIPTION_WORDS;
      
      return (
        <span>
          {needsTruncation ? renderExpandableText(nameText, cellId, true) : nameText}
        </span>
      );
    }
    
    // Plain text - check if it's code-like or pipe-separated
    if (formatted.text) {
      const text = formatted.text;
      const isCode = formatted.isCode || false;
      const isPipeSeparated = formatted.isPipeSeparated || false;
      
      // Handle pipe-separated strings in 3-column layout
      // For financial items (Budgets, Transactions, Planned Disbursements) in import column, always use 3-column layout
      const isFinancialItem = (field?.isFinancialItem) || (fieldName && (
        fieldName.includes('Budget') || 
        fieldName.includes('Transaction') || 
        fieldName.includes('Planned Disbursement')
      ));
      
      // Check if text contains pipes (as fallback detection)
      const hasPipes = text.includes('|');
      
      // For financial items in summary view, show transaction type (for transactions) and currency/value
      if (isFinancialItem && hasPipes) {
        const { data } = parsePipeSeparatedData(text);
        
        // For transactions, show type and amount on same line
        if (fieldName && fieldName.includes('Transaction') && data['Type']) {
          const transactionType = data['Type'];
          if (data['Amount']) {
            // Parse amount to show currency before value (e.g., "0 EUR" -> "EUR 0")
            const amountStr = data['Amount'];
            const currencyMatch = amountStr.match(/^([\d,.\s]+)\s+([A-Z]{3})$/);
            if (currencyMatch) {
              const value = currencyMatch[1].trim();
              const currency = currencyMatch[2];
              return (
                <span className="text-sm text-gray-900">
                  <span className="font-medium">{transactionType}</span>
                  <span className="mx-1.5 text-gray-400">•</span>
                  <span className="text-muted-foreground">{currency}</span> {value}
                </span>
              );
            }
            // If no currency pattern, display as-is
            return (
              <span className="text-sm text-gray-900">
                <span className="font-medium">{transactionType}</span>
                <span className="mx-1.5 text-gray-400">•</span>
                <span className="text-gray-600">{amountStr}</span>
              </span>
            );
          }
          // If no amount, just show type
          return (
            <span className="text-sm text-gray-900 font-medium">{transactionType}</span>
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
                <span className="text-muted-foreground">{currency}</span> {value}
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
      
      // Regular text with expansion and tooltip (only if truncated)
      const words = text.trim().split(/\s+/);
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
                <p className="break-words">{text}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      
      return <span>{textContent}</span>;
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

    return result;
  }, [allFields, searchQuery, showConflictsOnly]);

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
            className="pl-10"
          />
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
                onClick={() => handleSort('currentValue')}
              >
                <div className="flex items-center">
                  Current Value
                  <SortIndicator column="currentValue" />
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
                className="cursor-pointer hover:bg-gray-100 transition-colors w-24"
                onClick={() => handleSort('conflict')}
              >
                <div className="flex items-center justify-center">
                  Conflict
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
                        <TableCell className="font-medium">
                          {field.fieldName}
                        </TableCell>
                        <TableCell className={`text-sm text-gray-700 break-words ${field.fieldName === 'Activity Title' ? '[vertical-align:top]' : ''}`}>
                          {renderValue(field.currentValue, rowId, 'current', field.fieldName, field)}
                        </TableCell>
                        <TableCell className={`text-sm text-gray-700 break-words ${field.fieldName === 'Activity Title' ? '[vertical-align:top]' : ''}`}>
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
                            {/* Side-by-side comparison for conflicts */}
                            {field.hasConflict && (
                              <div className="mb-6 border-b border-gray-200 pb-6">
                                <div className="text-sm font-semibold mb-3 text-orange-700">Value Comparison</div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-white rounded-md p-3 border border-gray-200">
                                    <div className="font-medium text-xs text-gray-600 mb-2 uppercase tracking-wide">Current Value</div>
                                    <div className="text-sm text-gray-900 break-words">
                                      {renderValue(field.currentValue, `${rowId}-compare`, 'current', field.fieldName, field)}
                                    </div>
                                  </div>
                                  <div className="bg-blue-50/30 rounded-md p-3 border border-blue-200">
                                    <div className="font-medium text-xs text-blue-700 mb-2 uppercase tracking-wide">Import Value</div>
                                    <div className="text-sm text-gray-900 break-words">
                                      {renderValue(field.importValue, `${rowId}-compare`, 'import', field.fieldName, field)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Detailed Data Display */}
                            {(() => {
                              // Participating Org fields - show all details in expanded view
                              if ((field.fieldName && field.fieldName.includes('Participating Organization')) || field?.tab === 'participating_orgs') {
                                const orgData = typeof field.importValue === 'object' && field.importValue !== null && !Array.isArray(field.importValue) 
                                  ? field.importValue 
                                  : null;
                                
                                if (orgData) {
                                  return (
                                    <div className="mb-6 border-b border-gray-200 pb-6">
                                      <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                        <Building2 className="h-4 w-4" />
                                        Participating Organization Details
                                      </div>
                                      <div className="bg-white rounded-md p-3 border border-gray-200">
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                          {orgData.name && (
                                            <div className="col-span-2">
                                              <span className="text-gray-600 font-medium">Name:</span>
                                              <div className="mt-1 text-gray-900">{orgData.name}</div>
                                            </div>
                                          )}
                                          {orgData.ref && (
                                            <div>
                                              <span className="text-gray-600 font-medium">Ref:</span>
                                              <div className="mt-1">
                                                <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                  {orgData.ref}
                                                </code>
                                              </div>
                                            </div>
                                          )}
                                          {orgData.validated_ref && orgData.validated_ref !== orgData.ref && (
                                            <div>
                                              <span className="text-gray-600 font-medium">Validated Ref:</span>
                                              <div className="mt-1">
                                                <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                  {orgData.validated_ref}
                                                </code>
                                              </div>
                                            </div>
                                          )}
                                          {orgData.role && (
                                            <div>
                                              <span className="text-gray-600 font-medium">Role:</span>
                                              <div className="mt-1">
                                                <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                  {orgData.role}
                                                </code>
                                                <span className="ml-2 text-gray-900">{getOrganizationRoleName(orgData.role)}</span>
                                              </div>
                                            </div>
                                          )}
                                          {orgData.type && (
                                            <div>
                                              <span className="text-gray-600 font-medium">Type:</span>
                                              <div className="mt-1">
                                                <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                  {orgData.type}
                                                </code>
                                              </div>
                                            </div>
                                          )}
                                          {orgData.activityId && (
                                            <div>
                                              <span className="text-gray-600 font-medium">Activity ID:</span>
                                              <div className="mt-1">
                                                <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                  {orgData.activityId}
                                                </code>
                                              </div>
                                            </div>
                                          )}
                                          {orgData.crsChannelCode && (
                                            <div>
                                              <span className="text-gray-600 font-medium">CRS Channel Code:</span>
                                              <div className="mt-1">
                                                <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                  {orgData.crsChannelCode}
                                                </code>
                                              </div>
                                            </div>
                                          )}
                                          {orgData.narrative && orgData.narrative !== orgData.name && (
                                            <div className="col-span-2">
                                              <span className="text-gray-600 font-medium">Narrative:</span>
                                              <div className="mt-1 text-gray-900">{orgData.narrative}</div>
                                            </div>
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
                                  return (
                                    <div className="mb-6 border-b border-gray-200 pb-6">
                                      <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                        <ExternalLink className="h-4 w-4" />
                                        Related Activity Details
                                      </div>
                                      <div className="bg-white rounded-md p-3 border border-gray-200">
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                          {relatedActivityData.ref && (
                                            <div>
                                              <span className="text-gray-600 font-medium">ref:</span>
                                              <div className="mt-1">
                                                <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                  {relatedActivityData.ref}
                                                </code>
                                              </div>
                                            </div>
                                          )}
                                          {relatedActivityData.type && (
                                            <div>
                                              <span className="text-gray-600 font-medium">type:</span>
                                              <div className="mt-1">
                                                <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                  {relatedActivityData.type}
                                                </code>
                                              </div>
                                            </div>
                                          )}
                                          {relatedActivityData.relationshipTypeLabel && (
                                            <div className="col-span-2">
                                              <span className="text-gray-600 font-medium">relationshipTypeLabel:</span>
                                              <div className="mt-1 text-gray-900">{relatedActivityData.relationshipTypeLabel}</div>
                                            </div>
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
                                  return (
                                    <div className="mb-6 border-b border-gray-200 pb-6">
                                      <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                        <Building2 className="h-4 w-4" />
                                        Contact Details
                                      </div>
                                      <div className="bg-white rounded-md p-3 border border-gray-200">
                                        <div className="grid grid-cols-2 gap-3 text-xs">
                                          {contactData.type && (
                                            <div>
                                              <span className="text-gray-600 font-medium">Type:</span>
                                              <div className="mt-1">
                                                <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                  {contactData.type}
                                                </code>
                                              </div>
                                            </div>
                                          )}
                                          {contactData.organization && (
                                            <div>
                                              <span className="text-gray-600 font-medium">Organization:</span>
                                              <div className="mt-1 text-gray-900">{contactData.organization}</div>
                                            </div>
                                          )}
                                          {contactData.personName && (
                                            <div>
                                              <span className="text-gray-600 font-medium">Person Name:</span>
                                              <div className="mt-1 text-gray-900">{contactData.personName}</div>
                                            </div>
                                          )}
                                          {contactData.jobTitle && (
                                            <div>
                                              <span className="text-gray-600 font-medium">Job Title:</span>
                                              <div className="mt-1 text-gray-900">{contactData.jobTitle}</div>
                                            </div>
                                          )}
                                          {contactData.department && (
                                            <div>
                                              <span className="text-gray-600 font-medium">Department:</span>
                                              <div className="mt-1 text-gray-900">{contactData.department}</div>
                                            </div>
                                          )}
                                          {contactData.email && (
                                            <div>
                                              <span className="text-gray-600 font-medium">Email:</span>
                                              <div className="mt-1 text-gray-900">{contactData.email}</div>
                                            </div>
                                          )}
                                          {contactData.telephone && (
                                            <div>
                                              <span className="text-gray-600 font-medium">Telephone:</span>
                                              <div className="mt-1 text-gray-900">{contactData.telephone}</div>
                                            </div>
                                          )}
                                          {contactData.website && (
                                            <div>
                                              <span className="text-gray-600 font-medium">Website:</span>
                                              <div className="mt-1">
                                                <a href={contactData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline break-all">
                                                  {contactData.website}
                                                </a>
                                              </div>
                                            </div>
                                          )}
                                          {contactData.mailingAddress && (
                                            <div className="col-span-2">
                                              <span className="text-gray-600 font-medium">Mailing Address:</span>
                                              <div className="mt-1 text-gray-900">{contactData.mailingAddress}</div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                              }
                              
                              // Documents
                              if (field.fieldName.includes('Document') && field.documentData && Array.isArray(field.documentData)) {
                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <FileText className="h-4 w-4" />
                                      Document Details ({field.documentData.length} document{field.documentData.length !== 1 ? 's' : ''})
                                    </div>
                                    <div className="space-y-3">
                                      {field.documentData.map((doc: any, docIndex: number) => (
                                        <div key={docIndex} className="bg-white rounded-md p-3 border border-gray-200">
                                          <div className="grid grid-cols-2 gap-3 text-xs">
                                            <div>
                                              <span className="text-gray-600 font-medium">Title:</span>
                                              <div className="mt-1 text-gray-900">{doc.title || doc.title?.[0]?.text || 'Untitled'}</div>
                                            </div>
                                            {doc.category_code && (
                                              <div>
                                                <span className="text-gray-600 font-medium">Category:</span>
                                                <div className="mt-1">
                                                  <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                    {doc.category_code}
                                                  </code>
                                                </div>
                                              </div>
                                            )}
                                            {doc.url && (
                                              <div className="col-span-2">
                                                <span className="text-gray-600 font-medium">URL:</span>
                                                <div className="mt-1 flex items-center gap-2">
                                                  <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded break-all flex-1">
                                                    {doc.url}
                                                  </code>
                                                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                                                    <ExternalLink className="h-3 w-3" />
                                                  </a>
                                                </div>
                                              </div>
                                            )}
                                            {doc.format && (
                                              <div>
                                                <span className="text-gray-600 font-medium">Format:</span>
                                                <div className="mt-1">
                                                  <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                    {doc.format}
                                                  </code>
                                                </div>
                                              </div>
                                            )}
                                            {doc.language_code && (
                                              <div>
                                                <span className="text-gray-600 font-medium">Language:</span>
                                                <div className="mt-1">
                                                  <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                    {doc.language_code}
                                                  </code>
                                                </div>
                                              </div>
                                            )}
                                            {doc.document_date && (
                                              <div>
                                                <span className="text-gray-600 font-medium">Date:</span>
                                                <div className="mt-1">
                                                  <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                    {doc.document_date}
                                                  </code>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Tags - show both current and import tags clearly
                              if (field.isTagField) {
                                const existingTags = field.existingTags || [];
                                const importTags = field.tagData || [];
                                
                                // Helper to format vocabulary label
                                const getVocabLabel = (vocab: string) => {
                                  if (vocab === '1') return 'Standard';
                                  if (vocab === '99') return 'Custom';
                                  return vocab ? `Vocab ${vocab}` : '';
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
                                
                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-4 text-gray-900 flex items-center gap-2">
                                      <Tag className="h-4 w-4" />
                                      Tag Details
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {/* Current Tags */}
                                      <div className="bg-white rounded-md p-3 border border-gray-200">
                                        <div className="font-medium text-xs text-gray-600 mb-3 uppercase tracking-wide">Current Tags</div>
                                        {existingTags.length > 0 ? (
                                          <div className="flex flex-wrap gap-2">
                                            {existingTags.map((tag: any, idx: number) => (
                                              <Badge 
                                                key={idx} 
                                                variant="outline" 
                                                className={`${getTagBadgeColor(tag, idx)} border px-2.5 py-1 rounded-md text-xs font-medium`}
                                              >
                                                {tag.name || tag.narrative || 'Unnamed tag'}
                                                {tag.vocabulary && (
                                                  <span className="ml-1.5 text-xs opacity-75">
                                                    ({getVocabLabel(String(tag.vocabulary))})
                                                  </span>
                                                )}
                                              </Badge>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-sm text-gray-400 italic">No tags currently</div>
                                        )}
                                      </div>
                                      
                                      {/* Import Tags */}
                                      <div className="bg-blue-50/30 rounded-md p-3 border border-blue-200">
                                        <div className="font-medium text-xs text-blue-700 mb-3 uppercase tracking-wide">
                                          Import Tags ({importTags.length})
                                        </div>
                                        {importTags.length > 0 ? (
                                          <div className="flex flex-wrap gap-2">
                                            {importTags.map((tag: any, idx: number) => (
                                              <Badge 
                                                key={idx} 
                                                variant="outline" 
                                                className={`${getTagBadgeColor(tag, idx)} border px-2.5 py-1 rounded-md text-xs font-medium`}
                                              >
                                                {tag.narrative || 'Unnamed tag'}
                                                {tag.vocabulary && (
                                                  <span className="ml-1.5 text-xs opacity-75">
                                                    ({getVocabLabel(String(tag.vocabulary))})
                                                  </span>
                                                )}
                                              </Badge>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="text-sm text-gray-400 italic">No tags to import</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Locations
                              if (field.isLocationItem && field.locationData) {
                                const loc = field.locationData;
                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      Location Details
                                    </div>
                                    <div className="bg-white rounded-md p-3 border border-gray-200">
                                      <div className="grid grid-cols-2 gap-3 text-xs">
                                        {loc.name && (
                                          <div className="col-span-2">
                                            <span className="text-gray-600 font-medium">Name:</span>
                                            <div className="mt-1 text-gray-900">{loc.name}</div>
                                          </div>
                                        )}
                                        {(loc.latitude && loc.longitude) && (
                                          <>
                                            <div>
                                              <span className="text-gray-600 font-medium">Latitude:</span>
                                              <div className="mt-1">
                                                <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                  {loc.latitude}
                                                </code>
                                              </div>
                                            </div>
                                            <div>
                                              <span className="text-gray-600 font-medium">Longitude:</span>
                                              <div className="mt-1">
                                                <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                  {loc.longitude}
                                                </code>
                                              </div>
                                            </div>
                                          </>
                                        )}
                                        {loc.country_code && (
                                          <div>
                                            <span className="text-gray-600 font-medium">Country:</span>
                                            <div className="mt-1">
                                              <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {loc.country_code}
                                              </code>
                                            </div>
                                          </div>
                                        )}
                                        {loc.location_type_code && (
                                          <div>
                                            <span className="text-gray-600 font-medium">Type:</span>
                                            <div className="mt-1">
                                              <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {loc.location_type_code}
                                              </code>
                                            </div>
                                          </div>
                                        )}
                                        {loc.address && (
                                          <div className="col-span-2">
                                            <span className="text-gray-600 font-medium">Address:</span>
                                            <div className="mt-1 text-gray-900">{loc.address}</div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Financial Items (Budgets, Transactions, Planned Disbursements)
                              if (field.itemData && field.isFinancialItem) {
                                const item = field.itemData;
                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <DollarSign className="h-4 w-4" />
                                      {field.itemType === 'budget' ? 'Budget' : field.itemType === 'transaction' ? 'Transaction' : field.itemType === 'plannedDisbursement' ? 'Planned Disbursement' : 'Financial Item'} Details
                                    </div>
                                    <div className="bg-white rounded-md p-3 border border-gray-200">
                                      <div className="grid grid-cols-2 gap-3 text-xs">
                                        {item.value !== undefined && item.currency && (
                                          <div className="col-span-2">
                                            <span className="text-gray-600 font-medium">Amount:</span>
                                            <div className="mt-1">
                                              <span className="text-muted-foreground">{item.currency}</span> {item.value?.toLocaleString()}
                                            </div>
                                          </div>
                                        )}
                                        {(item.period?.start || item.start) && (
                                          <div>
                                            <span className="text-gray-600 font-medium">Start:</span>
                                            <div className="mt-1 text-sm text-gray-900">
                                              {formatDateDisplay(item.period?.start || item.start)}
                                            </div>
                                          </div>
                                        )}
                                        {(item.period?.end || item.end) && (
                                          <div>
                                            <span className="text-gray-600 font-medium">End:</span>
                                            <div className="mt-1 text-sm text-gray-900">
                                              {formatDateDisplay(item.period?.end || item.end)}
                                            </div>
                                          </div>
                                        )}
                                        {item.value_date && (
                                          <div>
                                            <span className="text-gray-600 font-medium">Value Date:</span>
                                            <div className="mt-1 text-sm text-gray-900">
                                              {formatDateDisplay(item.value_date)}
                                            </div>
                                          </div>
                                        )}
                                        {item.status && (
                                          <div>
                                            <span className="text-gray-600 font-medium">Status:</span>
                                            <div className="mt-1">
                                              <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {item.status}
                                              </code>
                                            </div>
                                          </div>
                                        )}
                                        {item.type && (
                                          <div>
                                            <span className="text-gray-600 font-medium">Type:</span>
                                            <div className="mt-1">
                                              <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {item.type}
                                              </code>
                                            </div>
                                          </div>
                                        )}
                                        {item.transaction_type && (
                                          <div>
                                            <span className="text-gray-600 font-medium">Transaction Type:</span>
                                            <div className="mt-1">
                                              <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {item.transaction_type}
                                              </code>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Policy Markers
                              if (field.isPolicyMarker && field.policyMarkerData) {
                                const pm = field.policyMarkerData;
                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <Tag className="h-4 w-4" />
                                      Policy Marker Details
                                    </div>
                                    <div className="bg-white rounded-md p-3 border border-gray-200">
                                      <div className="grid grid-cols-2 gap-3 text-xs">
                                        {pm.code && (
                                          <div>
                                            <span className="text-gray-600 font-medium">Code:</span>
                                            <div className="mt-1">
                                              <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {pm.code}
                                              </code>
                                            </div>
                                          </div>
                                        )}
                                        {pm.significance && (
                                          <div>
                                            <span className="text-gray-600 font-medium">Significance:</span>
                                            <div className="mt-1">
                                              <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {pm.significance}
                                              </code>
                                            </div>
                                          </div>
                                        )}
                                        {pm.vocabulary && (
                                          <div>
                                            <span className="text-gray-600 font-medium">Vocabulary:</span>
                                            <div className="mt-1">
                                              <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {pm.vocabulary}
                                              </code>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Conditions - only show if there's no conflict (conflicts are handled in Value Comparison)
                              if (field.isConditionsField && field.conditionsData && !field.hasConflict) {
                                const cond = field.conditionsData;
                                const conditionCount = cond.conditions && Array.isArray(cond.conditions) ? cond.conditions.length : 0;
                                
                                // Helper to get condition type label
                                const getTypeLabel = (type: string) => {
                                  if (type === '1') return 'Policy';
                                  if (type === '2') return 'Performance';
                                  if (type === '3') return 'Fiduciary';
                                  return `Type ${type}`;
                                };
                                
                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <AlertCircle className="h-4 w-4" />
                                      Import Value Conditions Details
                                    </div>
                                    <div className="bg-white rounded-md p-3 border border-gray-200">
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium text-gray-700">Attached:</span>
                                          <Badge variant={cond.attached ? "default" : "outline"}>
                                            {cond.attached ? 'Yes' : 'No'}
                                          </Badge>
                                        </div>
                                        {conditionCount > 0 && (
                                          <div className="space-y-3">
                                            {cond.conditions.map((condition: any, idx: number) => {
                                              // Get the first available narrative text (prefer English, then any)
                                              const narrativeText = condition.narrative?.['en'] || 
                                                                   (condition.narrative && Object.values(condition.narrative)[0]) || 
                                                                   '';
                                              const narrativeLang = condition.narrative?.['en'] ? 'en' : 
                                                                     (condition.narrative ? Object.keys(condition.narrative)[0] : '');
                                              
                                              return (
                                                <div key={idx} className="border-l-2 border-blue-200 pl-3 py-2 bg-gray-50 rounded-r">
                                                  <div className="grid grid-cols-3 gap-3 text-xs">
                                                    <div>
                                                      <span className="text-gray-600 font-medium">Type:</span>
                                                      <div className="mt-1">
                                                        <Badge variant="outline" className="text-xs">
                                                          {getTypeLabel(condition.type)}
                                                        </Badge>
                                                      </div>
                                                    </div>
                                                    <div className="col-span-2">
                                                      <span className="text-gray-600 font-medium">Condition Narrative:</span>
                                                      <div className="text-sm text-gray-900 mt-1">
                                                        {narrativeLang && narrativeLang !== 'en' && (
                                                          <span className="text-xs text-gray-500 italic mr-1">({narrativeLang})</span>
                                                        )}
                                                        {narrativeText || 'No description'}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Other Identifier - show detailed table
                              if (field.fieldName && field.fieldName.startsWith('Other Identifier') && typeof field.importValue === 'object' && field.importValue !== null && !Array.isArray(field.importValue)) {
                                const identifier = field.importValue;
                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <Tag className="h-4 w-4" />
                                      Other Identifier Details
                                    </div>
                                    <div className="bg-white rounded-md p-3 border border-gray-200">
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="border-b border-gray-200">
                                              <th className="text-left py-2 px-3 font-medium text-gray-700">Reference Identifier</th>
                                              <th className="text-left py-2 px-3 font-medium text-gray-700">Owner Org Identifier</th>
                                              <th className="text-left py-2 px-3 font-medium text-gray-700">Type</th>
                                              <th className="text-left py-2 px-3 font-medium text-gray-700">Description</th>
                                              <th className="text-left py-2 px-3 font-medium text-gray-700">Code</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            <tr>
                                              <td className="py-2 px-3 text-gray-900">{identifier.code || '—'}</td>
                                              <td className="py-2 px-3 text-gray-900">{identifier.ownerOrg || '—'}</td>
                                              <td className="py-2 px-3 text-gray-900">{identifier.name || '—'}</td>
                                              <td className="py-2 px-3 text-gray-900">{field.description || 'No description provided'}</td>
                                              <td className="py-2 px-3">
                                                {identifier.type ? (
                                                  <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                    {identifier.type}
                                                  </code>
                                                ) : (
                                                  '—'
                                                )}
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Non-DAC Sectors
                              if (field.hasNonDacSectors && field.nonDacSectors && Array.isArray(field.nonDacSectors) && field.nonDacSectors.length > 0) {
                                return (
                                  <div className="mb-6 border-b border-gray-200 pb-6">
                                    <div className="text-sm font-semibold mb-3 text-gray-900 flex items-center gap-2">
                                      <Tag className="h-4 w-4" />
                                      Non-DAC Sectors ({field.nonDacSectors.length})
                                    </div>
                                    <div className="space-y-2">
                                      {field.nonDacSectors.map((sector: any, idx: number) => (
                                        <div key={idx} className="bg-white rounded-md p-2 border border-gray-200">
                                          <div className="flex items-center gap-2">
                                            {sector.code && (
                                              <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                {sector.code}
                                              </code>
                                            )}
                                            {sector.name && (
                                              <span className="text-xs text-gray-900">{sector.name}</span>
                                            )}
                                            {sector.vocabulary && (
                                              <Badge variant="outline" className="text-xs">
                                                {sector.vocabulary}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                              
                              return null;
                            })()}
                            
                            {/* Field metadata */}
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="font-semibold mb-2">IATI Path</div>
                                <a 
                                  href={`https://iatistandard.org/en/iati-standard/203/activity-standard/iati-activities/iati-activity/${field.iatiPath.replace('iati-activity/', '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-mono text-blue-600 hover:text-blue-800 hover:underline break-all"
                                >
                                  {field.iatiPath}
                                </a>
                              </div>
                              <div>
                                <div className="font-semibold mb-2">Category</div>
                                <Badge variant="outline">{getCategory(field)}</Badge>
                              </div>
                              <div>
                                <div className="font-semibold mb-2">Field Type</div>
                                <Badge variant="secondary">{getFieldType(field)}</Badge>
                              </div>
                              {field.description && (
                                <div>
                                  <div className="font-semibold mb-2">Description</div>
                                  <div className="text-gray-600 text-xs">{field.description}</div>
                                </div>
                              )}
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
                          {/* Side-by-side comparison for conflicts */}
                          {field.hasConflict && (
                            <div className="mb-6 border-b border-gray-200 pb-6">
                              <div className="text-sm font-semibold mb-3 text-orange-700">Value Comparison</div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white rounded-md p-3 border border-gray-200">
                                  <div className="font-medium text-xs text-gray-600 mb-2 uppercase tracking-wide">Current Value</div>
                                  <div className="text-sm text-gray-900 break-words">
                                    {renderValue(field.currentValue, `${rowId}-compare`, 'current', field.fieldName, field)}
                                    </div>
                                  </div>
                                  <div className="bg-blue-50/30 rounded-md p-3 border border-blue-200">
                                    <div className="font-medium text-xs text-blue-700 mb-2 uppercase tracking-wide">Import Value</div>
                                    <div className="text-sm text-gray-900 break-words">
                                      {renderValue(field.importValue, `${rowId}-compare`, 'import', field.fieldName, field)}
                                    </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Field metadata */}
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="font-semibold mb-2">IATI Path</div>
                              <code className="text-xs font-mono text-gray-700 bg-white px-2 py-1 rounded border">
                                {field.iatiPath}
                              </code>
                            </div>
                            <div>
                              <div className="font-semibold mb-2">Category</div>
                              <Badge variant="outline">{getCategory(field)}</Badge>
                            </div>
                            <div>
                              <div className="font-semibold mb-2">Field Type</div>
                              <Badge variant="secondary">{getFieldType(field)}</Badge>
                            </div>
                            {field.description && (
                              <div className="col-span-3">
                                <div className="font-semibold mb-2">Description</div>
                                <div className="text-gray-600">{field.description}</div>
                              </div>
                            )}
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
