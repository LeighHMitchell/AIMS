import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
}

interface IatiImportFieldsTableProps {
  fields: ParsedField[];
  onFieldToggle: (field: ParsedField) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

type SortColumn = 'fieldName' | 'category' | 'fieldType' | 'iatiPath' | 'currentValue' | 'importValue' | 'conflict';
type SortDirection = 'asc' | 'desc';

export function IatiImportFieldsTable({ fields, onFieldToggle, onSelectAll, onDeselectAll }: IatiImportFieldsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('fieldName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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
      'finances': 'Defaults',
      'country-budget': 'Budget Mapping',
      
      // Results tab
      'results': 'Results',
      
      // Docs tab
      'documents': 'Documents',
      
      // Links tab
      'linked_activities': 'Linked Activities'
    };
    return categoryMap[field.tab] || field.tab;
  };

  // Format value for display - returns object with code and name parts if applicable
  const formatValue = (value: any): { code?: string; name?: string; text?: string } => {
    if (value === null || value === undefined) return { text: '—' };
    
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return { text: `[${value.length} items]` };
      }
      if (value.code && value.name) {
        return { code: value.code, name: value.name };
      }
      return { text: JSON.stringify(value).substring(0, 50) + '...' };
    }
    
    const strValue = String(value);
    
    // Check if it's in "code: name" format (e.g., "2: Implementation")
    const codeNameMatch = strValue.match(/^([^:]+):\s*(.+)$/);
    if (codeNameMatch) {
      return { code: codeNameMatch[1].trim(), name: codeNameMatch[2].trim() };
    }
    
    return { text: strValue };
  };

  // Render formatted value
  const renderValue = (value: any) => {
    const formatted = formatValue(value);
    
    if (formatted.code && formatted.name) {
      return (
        <span>
          <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs border border-gray-300">
            {formatted.code}
          </code>
          <span className="ml-1.5">{formatted.name}</span>
        </span>
      );
    }
    
    return <span>{formatted.text}</span>;
  };

  // Filter fields based on search query and conflict filter
  const filteredFields = useMemo(() => {
    let result = fields;

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
  }, [fields, searchQuery, showConflictsOnly]);

  // Sort filtered fields
  const sortedFields = useMemo(() => {
    const sorted = [...filteredFields];
    
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'fieldName':
          aValue = a.fieldName;
          bValue = b.fieldName;
          break;
        case 'category':
          aValue = getCategory(a);
          bValue = getCategory(b);
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
      ? <ArrowUp className="ml-1 h-3 w-3 text-blue-600" />
      : <ArrowDown className="ml-1 h-3 w-3 text-blue-600" />;
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
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('fieldName')}
              >
                <div className="flex items-center">
                  Field Name
                  <SortIndicator column="fieldName" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('currentValue')}
              >
                <div className="flex items-center">
                  Current Value
                  <SortIndicator column="currentValue" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-gray-100 transition-colors"
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
            ) : (
              sortedFields.map((field, index) => {
                const rowId = getRowId(field, index);
                const isExpanded = expandedRows.has(rowId);
                
                return (
                  <React.Fragment key={rowId}>
                    <TableRow 
                      className={`
                        ${field.hasConflict && field.selected ? 'bg-orange-50' : ''}
                        ${field.selected ? 'bg-blue-50/50' : ''}
                        hover:bg-gray-100 transition-colors
                      `}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={field.selected}
                          onCheckedChange={() => onFieldToggle(field)}
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
                      <TableCell className="text-sm text-gray-700 break-words">
                        {renderValue(field.currentValue)}
                      </TableCell>
                      <TableCell className="text-sm text-gray-900 break-words font-medium">
                        {renderValue(field.importValue)}
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
                          <div className="grid grid-cols-2 gap-4 text-sm">
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
                            <div className="col-span-2">
                              <div className="font-semibold mb-2">Field Type</div>
                              <Badge variant="secondary">{getFieldType(field)}</Badge>
                            </div>
                            {field.description && (
                              <div className="col-span-2">
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
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

